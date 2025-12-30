/**
 * GapDetector Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GapDetector } from './GapDetector.js';
import type {
  Neo4jConnectionInterface,
  Neo4jRecord,
  CitationAnalyzerInterface,
  ClusterAnalyzerInterface,
  LLMClientInterface,
  ResearchCluster,
} from '../types.js';

// Mock Neo4j record
const createMockRecord = (data: Record<string, unknown>): Neo4jRecord => ({
  get: (key: string) => data[key],
  toObject: () => data,
});

// Mock Neo4j connection
const createMockConnection = (): Neo4jConnectionInterface => ({
  run: vi.fn().mockResolvedValue({ records: [] }),
  close: vi.fn().mockResolvedValue(undefined),
});

// Mock Citation analyzer
const createMockCitationAnalyzer = (): CitationAnalyzerInterface => ({
  analyzeCitationNetwork: vi.fn().mockResolvedValue({
    nodes: [],
    edges: [],
    clusters: [],
    totalCitations: 0,
    density: 0,
  }),
  getTopCited: vi.fn().mockResolvedValue([]),
  findCitationIslands: vi.fn().mockResolvedValue([]),
  getCitationMetrics: vi.fn().mockResolvedValue(null),
});

// Create mock cluster for tests
const createMockCluster = (id: string, name: string): ResearchCluster => ({
  id,
  name,
  keywords: [],
  entities: [],
  publicationCount: 0,
  avgPublicationYear: 2023,
  growthRate: 0,
  connectionStrength: new Map(),
});

// Mock Cluster analyzer
const createMockClusterAnalyzer = (): ClusterAnalyzerInterface => ({
  analyzeExistingClusters: vi.fn().mockResolvedValue([]),
  findClusterGaps: vi.fn().mockResolvedValue([]),
  measureConnection: vi.fn().mockResolvedValue(0),
  suggestBridgeTopics: vi.fn().mockResolvedValue([]),
});

// Mock LLM client
const createMockLLMClient = (): LLMClientInterface => ({
  generate: vi.fn().mockResolvedValue('[]'),
  generateWithSchema: vi.fn().mockResolvedValue({}),
});

describe('GapDetector', () => {
  let detector: GapDetector;
  let mockConnection: Neo4jConnectionInterface;
  let mockCitationAnalyzer: CitationAnalyzerInterface;
  let mockClusterAnalyzer: ClusterAnalyzerInterface;
  let mockLLMClient: LLMClientInterface;

  beforeEach(() => {
    mockConnection = createMockConnection();
    mockCitationAnalyzer = createMockCitationAnalyzer();
    mockClusterAnalyzer = createMockClusterAnalyzer();
    mockLLMClient = createMockLLMClient();

    detector = new GapDetector({
      neo4jConnection: mockConnection,
      citationAnalyzer: mockCitationAnalyzer,
      clusterAnalyzer: mockClusterAnalyzer,
      llmClient: mockLLMClient,
    });
  });

  describe('detectGaps', () => {
    it('should return empty array when no gaps found', async () => {
      const result = await detector.detectGaps();

      expect(result).toEqual([]);
    });

    it('should detect all gap types by default', async () => {
      const mockRun = mockConnection.run as ReturnType<typeof vi.fn>;

      // Combination queries
      mockRun.mockResolvedValueOnce({ records: [] }); // existing combinations
      mockRun.mockResolvedValueOnce({ records: [] }); // models
      mockRun.mockResolvedValueOnce({ records: [] }); // techniques

      // Isolated - handled by cluster analyzer mock
      // Stale research areas
      mockRun.mockResolvedValueOnce({ records: [] });

      // Underexplored
      mockRun.mockResolvedValueOnce({ records: [] });

      await detector.detectGaps();

      // Should query for multiple gap types
      expect(mockRun).toHaveBeenCalled();
      expect(mockClusterAnalyzer.findClusterGaps).toHaveBeenCalled();
    });

    it('should filter by specific gap types', async () => {
      const mockRun = mockConnection.run as ReturnType<typeof vi.fn>;
      mockRun.mockResolvedValue({ records: [] });

      await detector.detectGaps({ types: ['stale_research_area'] });

      // Should NOT call cluster analyzer since we only want stale areas
      expect(mockClusterAnalyzer.findClusterGaps).not.toHaveBeenCalled();
    });

    it('should respect limit option', async () => {
      const mockRun = mockConnection.run as ReturnType<typeof vi.fn>;

      // Return many stale areas
      mockRun.mockResolvedValueOnce({
        records: Array.from({ length: 30 }, (_, i) =>
          createMockRecord({
            technique: `Tech${i}`,
            techniqueId: `t${i}`,
            lastYear: 2020,
            totalPubs: 10,
          })
        ),
      });

      const result = await detector.detectGaps({
        types: ['stale_research_area'],
        limit: 5,
      });

      expect(result).toHaveLength(5);
    });

    it('should filter by minimum severity', async () => {
      const mockRun = mockConnection.run as ReturnType<typeof vi.fn>;
      const currentYear = new Date().getFullYear();

      mockRun.mockResolvedValueOnce({
        records: [
          // High severity (4+ years, many pubs)
          createMockRecord({
            technique: 'HighSeverityTech',
            techniqueId: 't1',
            lastYear: currentYear - 5,
            totalPubs: 15,
          }),
          // Low severity
          createMockRecord({
            technique: 'LowSeverityTech',
            techniqueId: 't2',
            lastYear: currentYear - 2,
            totalPubs: 5,
          }),
        ],
      });

      const result = await detector.detectGaps({
        types: ['stale_research_area'],
        minSeverity: 'high',
      });

      expect(result.every((g) => g.severity === 'high')).toBe(true);
    });

    it('should use LLM when useLLM is true', async () => {
      const mockRun = mockConnection.run as ReturnType<typeof vi.fn>;
      mockRun.mockResolvedValue({ records: [] });

      (mockLLMClient.generate as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        '[{"description": "LLM detected gap", "type": "unexplored_application", "severity": "medium", "suggestedActions": ["action"]}]'
      );

      const result = await detector.detectGaps({ useLLM: true });

      expect(mockLLMClient.generate).toHaveBeenCalled();
      expect(result.some((g) => g.description === 'LLM detected gap')).toBe(true);
    });
  });

  describe('findUnexploredCombinations', () => {
    it('should return empty when all combinations exist', async () => {
      const mockRun = mockConnection.run as ReturnType<typeof vi.fn>;

      // Existing combinations
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({ model: 'GPT-4', technique: 'RAG' }),
        ],
      });

      // Models
      mockRun.mockResolvedValueOnce({
        records: [createMockRecord({ name: 'GPT-4', importance: 10 })],
      });

      // Techniques
      mockRun.mockResolvedValueOnce({
        records: [createMockRecord({ name: 'RAG', usage: 5 })],
      });

      const result = await detector.findUnexploredCombinations();

      expect(result).toHaveLength(0);
    });

    it('should find unexplored combinations', async () => {
      const mockRun = mockConnection.run as ReturnType<typeof vi.fn>;

      // No existing combinations
      mockRun.mockResolvedValueOnce({ records: [] });

      // Models
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({ name: 'GPT-4', importance: 10 }),
          createMockRecord({ name: 'Claude', importance: 8 }),
        ],
      });

      // Techniques
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({ name: 'RAG', usage: 5 }),
          createMockRecord({ name: 'CoT', usage: 3 }),
        ],
      });

      const result = await detector.findUnexploredCombinations();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('missing_combination');
      expect(result[0].relatedEntities).toHaveLength(2);
    });

    it('should calculate severity based on potential score', async () => {
      const mockRun = mockConnection.run as ReturnType<typeof vi.fn>;

      mockRun.mockResolvedValueOnce({ records: [] });
      mockRun.mockResolvedValueOnce({
        records: [createMockRecord({ name: 'HighImpact', importance: 100 })],
      });
      mockRun.mockResolvedValueOnce({
        records: [createMockRecord({ name: 'HighUsage', usage: 100 })],
      });

      const result = await detector.findUnexploredCombinations();

      // High importance + high usage should result in higher severity
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('findStaleResearchAreas', () => {
    it('should return empty when no stale areas', async () => {
      const result = await detector.findStaleResearchAreas();

      expect(result).toEqual([]);
    });

    it('should find stale research areas', async () => {
      const currentYear = new Date().getFullYear();

      (mockConnection.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        records: [
          createMockRecord({
            technique: 'Old Technique',
            techniqueId: 't1',
            lastYear: currentYear - 4,
            totalPubs: 10,
          }),
        ],
      });

      const result = await detector.findStaleResearchAreas();

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('stale_research_area');
      expect(result[0].description).toContain('Old Technique');
      expect(result[0].severity).toBe('high'); // 4+ years stale with 10+ pubs
    });

    it('should calculate severity correctly', async () => {
      const currentYear = new Date().getFullYear();

      (mockConnection.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        records: [
          createMockRecord({
            technique: 'Medium Stale',
            techniqueId: 't1',
            lastYear: currentYear - 3,
            totalPubs: 8,
          }),
        ],
      });

      const result = await detector.findStaleResearchAreas();

      expect(result[0].severity).toBe('medium');
    });
  });

  describe('findIsolatedResearchAreas', () => {
    it('should return empty when no isolated clusters', async () => {
      const result = await detector.findIsolatedResearchAreas();

      expect(result).toEqual([]);
    });

    it('should find isolated clusters from cluster analyzer', async () => {
      (mockClusterAnalyzer.findClusterGaps as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          cluster1: createMockCluster('c1', 'Cluster 1'),
          cluster2: createMockCluster('c2', 'Cluster 2'),
          connectionStrength: 0.02,
          potentialBridgeTopics: ['bridging topic'],
        },
      ]);

      const result = await detector.findIsolatedResearchAreas();

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('isolated_cluster');
      expect(result[0].severity).toBe('high'); // connectionStrength < 0.05
    });

    it('should set medium severity for moderately connected clusters', async () => {
      (mockClusterAnalyzer.findClusterGaps as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          cluster1: createMockCluster('c1', 'Cluster 1'),
          cluster2: createMockCluster('c2', 'Cluster 2'),
          connectionStrength: 0.08,
          potentialBridgeTopics: [],
        },
      ]);

      const result = await detector.findIsolatedResearchAreas();

      expect(result[0].severity).toBe('medium');
    });
  });

  describe('findUnderexploredTechniques', () => {
    it('should return empty when no underexplored techniques', async () => {
      const result = await detector.findUnderexploredTechniques();

      expect(result).toEqual([]);
    });

    it('should find underexplored techniques', async () => {
      (mockConnection.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        records: [
          createMockRecord({
            technique: 'Rare Technique',
            techniqueId: 't1',
            pubCount: 2,
            modelCount: 1,
          }),
        ],
      });

      const result = await detector.findUnderexploredTechniques();

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('underexplored_technique');
      expect(result[0].description).toContain('Rare Technique');
    });

    it('should set high severity for very underexplored techniques', async () => {
      (mockConnection.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        records: [
          createMockRecord({
            technique: 'Very Rare',
            techniqueId: 't1',
            pubCount: 1,
            modelCount: 0,
          }),
        ],
      });

      const result = await detector.findUnderexploredTechniques();

      expect(result[0].severity).toBe('high');
    });
  });

  describe('prioritizeGaps', () => {
    it('should sort by severity first', () => {
      const gaps = [
        { id: '1', type: 'stale_research_area', severity: 'low', score: 0.9 },
        { id: '2', type: 'stale_research_area', severity: 'high', score: 0.1 },
        { id: '3', type: 'stale_research_area', severity: 'medium', score: 0.5 },
      ] as any[];

      const result = detector.prioritizeGaps(gaps);

      expect(result[0].severity).toBe('high');
      expect(result[1].severity).toBe('medium');
      expect(result[2].severity).toBe('low');
    });

    it('should sort by score within same severity', () => {
      const gaps = [
        { id: '1', type: 'stale_research_area', severity: 'high', score: 0.3 },
        { id: '2', type: 'stale_research_area', severity: 'high', score: 0.9 },
        { id: '3', type: 'stale_research_area', severity: 'high', score: 0.6 },
      ] as any[];

      const result = detector.prioritizeGaps(gaps);

      expect(result[0].score).toBe(0.9);
      expect(result[1].score).toBe(0.6);
      expect(result[2].score).toBe(0.3);
    });
  });

  describe('LLM analysis', () => {
    it('should handle LLM parsing errors gracefully', async () => {
      const mockRun = mockConnection.run as ReturnType<typeof vi.fn>;
      mockRun.mockResolvedValue({ records: [] });

      (mockLLMClient.generate as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        'Invalid JSON response'
      );

      const result = await detector.detectGaps({ useLLM: true });

      // Should not throw, should return results without LLM gaps
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle LLM errors gracefully', async () => {
      const mockRun = mockConnection.run as ReturnType<typeof vi.fn>;
      mockRun.mockResolvedValue({ records: [] });

      (mockLLMClient.generate as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('LLM error')
      );

      const result = await detector.detectGaps({ useLLM: true });

      expect(Array.isArray(result)).toBe(true);
    });

    it('should not call LLM when useLLM is false', async () => {
      const mockRun = mockConnection.run as ReturnType<typeof vi.fn>;
      mockRun.mockResolvedValue({ records: [] });

      await detector.detectGaps({ useLLM: false });

      expect(mockLLMClient.generate).not.toHaveBeenCalled();
    });
  });

  describe('gap evidence', () => {
    it('should include proper evidence for each gap type', async () => {
      (mockConnection.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        records: [
          createMockRecord({
            technique: 'Test Tech',
            techniqueId: 't1',
            lastYear: 2020,
            totalPubs: 10,
          }),
        ],
      });

      const result = await detector.findStaleResearchAreas();

      expect(result[0].evidence).toHaveLength(1);
      expect(result[0].evidence[0].type).toBe('publication_gap');
      expect(result[0].evidence[0].source).toBe('temporal_analysis');
    });
  });

  describe('ID generation', () => {
    it('should generate unique IDs for gaps', async () => {
      (mockConnection.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        records: [
          createMockRecord({
            technique: 'Tech1',
            techniqueId: 't1',
            lastYear: 2020,
            totalPubs: 10,
          }),
          createMockRecord({
            technique: 'Tech2',
            techniqueId: 't2',
            lastYear: 2019,
            totalPubs: 8,
          }),
        ],
      });

      const result = await detector.findStaleResearchAreas();

      const ids = result.map((g) => g.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
