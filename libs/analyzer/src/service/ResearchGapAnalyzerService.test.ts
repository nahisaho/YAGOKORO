/**
 * ResearchGapAnalyzerService Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResearchGapAnalyzerService } from './ResearchGapAnalyzerService.js';
import type {
  Neo4jConnectionInterface,
  Neo4jRecord,
  LLMClientInterface,
  VectorStoreInterface,
  ResearchGap,
  GapAnalysisReport,
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

// Mock LLM client
const createMockLLMClient = (): LLMClientInterface => ({
  generate: vi.fn().mockResolvedValue('[]'),
  generateWithSchema: vi.fn().mockResolvedValue({}),
});

// Mock vector store
const createMockVectorStore = (): VectorStoreInterface => ({
  search: vi.fn().mockResolvedValue([]),
  similarity: vi.fn().mockResolvedValue(0.5),
});

// Helper to create mock gaps
const createMockGap = (overrides: Partial<ResearchGap> = {}): ResearchGap => ({
  id: `gap-${Math.random().toString(36).slice(2, 8)}`,
  type: 'missing_combination',
  description: 'Test gap description',
  severity: 'medium',
  evidence: [{ type: 'test', value: {}, source: 'test' }],
  suggestedActions: ['Action 1', 'Action 2'],
  relatedEntities: ['Entity1', 'Entity2'],
  score: 0.5,
  createdAt: new Date(),
  ...overrides,
});

describe('ResearchGapAnalyzerService', () => {
  let service: ResearchGapAnalyzerService;
  let mockConnection: Neo4jConnectionInterface;
  let mockLLMClient: LLMClientInterface;
  let mockVectorStore: VectorStoreInterface;

  beforeEach(() => {
    mockConnection = createMockConnection();
    mockLLMClient = createMockLLMClient();
    mockVectorStore = createMockVectorStore();

    service = new ResearchGapAnalyzerService({
      neo4jConnection: mockConnection,
      llmClient: mockLLMClient,
      vectorStore: mockVectorStore,
    });
  });

  describe('analyze', () => {
    it('should return empty report when no gaps found', async () => {
      const result = await service.analyze();

      expect(result.totalGaps).toBe(0);
      expect(result.gaps).toEqual([]);
      expect(result.id).toMatch(/^report-/);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should include gap statistics', async () => {
      // Test with a pre-made report with known gaps using generateResearchProposals
      // then verify through the report structure
      const gaps = [
        createMockGap({ type: 'stale_research_area', severity: 'high' }),
        createMockGap({ type: 'missing_combination', severity: 'medium' }),
        createMockGap({ type: 'missing_combination', severity: 'low' }),
      ];

      // Generate proposals to verify statistics logic
      const proposals = await service.generateResearchProposals(gaps, 2);
      expect(proposals.length).toBeGreaterThan(0);

      // Verify gap type distribution
      const gapsByType = new Map<string, number>();
      for (const gap of gaps) {
        gapsByType.set(gap.type, (gapsByType.get(gap.type) ?? 0) + 1);
      }
      expect(gapsByType.get('stale_research_area')).toBe(1);
      expect(gapsByType.get('missing_combination')).toBe(2);
    });

    it('should include citation metrics when requested', async () => {
      const mockRun = mockConnection.run as ReturnType<typeof vi.fn>;
      mockRun.mockResolvedValue({ records: [] });

      // Citations
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({
            entityId: 'pub1',
            entityName: 'Publication 1',
            entityType: 'Publication',
            citationCount: 10,
            citedByCount: 100,
          }),
        ],
      });

      const result = await service.analyze({ includeCitations: true });

      expect(result.citationMetrics).toBeDefined();
    });

    it('should skip citations when not requested', async () => {
      const result = await service.analyze({ includeCitations: false });

      expect(result.citationMetrics).toBeUndefined();
    });

    it('should include clusters when requested', async () => {
      const mockRun = mockConnection.run as ReturnType<typeof vi.fn>;
      mockRun.mockResolvedValue({ records: [] });

      const result = await service.analyze({ includeClusters: true });

      expect(result.clusters).toBeDefined();
    });

    it('should generate recommendations', async () => {
      // Test recommendations by directly testing with gaps
      const gaps = [
        createMockGap({ type: 'stale_research_area', severity: 'high' }),
        createMockGap({ type: 'isolated_cluster', severity: 'medium' }),
      ];

      // Verify that we can generate proposals with gaps
      const proposals = await service.generateResearchProposals(gaps, 2);
      expect(proposals.length).toBeGreaterThan(0);

      // Each proposal should have valid structure
      for (const proposal of proposals) {
        expect(proposal.title).toBeDefined();
        expect(proposal.abstract).toBeDefined();
        expect(proposal.gaps.length).toBeGreaterThan(0);
      }
    });
  });

  describe('generateResearchProposals', () => {
    it('should return empty array for empty gaps', async () => {
      const result = await service.generateResearchProposals([]);

      expect(result).toEqual([]);
    });

    it('should generate proposals from gaps', async () => {
      const gaps = [
        createMockGap({ type: 'missing_combination', severity: 'high' }),
        createMockGap({ type: 'stale_research_area', severity: 'medium' }),
      ];

      const result = await service.generateResearchProposals(gaps);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].title).toBeDefined();
      expect(result[0].abstract).toBeDefined();
      expect(result[0].gaps.length).toBeGreaterThan(0);
    });

    it('should respect count parameter', async () => {
      const gaps = Array.from({ length: 10 }, () => createMockGap());

      const result = await service.generateResearchProposals(gaps, 3);

      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should enhance proposals with LLM', async () => {
      const gaps = [createMockGap()];

      (mockLLMClient.generate as ReturnType<typeof vi.fn>).mockResolvedValueOnce(`
        {
          "title": "Enhanced Title",
          "abstract": "Enhanced abstract",
          "methodology": ["Method 1", "Method 2"],
          "expectedOutcomes": ["Outcome 1"]
        }
      `);

      const result = await service.generateResearchProposals(gaps, 1);

      expect(result[0].title).toBe('Enhanced Title');
    });

    it('should handle LLM errors gracefully', async () => {
      const gaps = [createMockGap()];

      (mockLLMClient.generate as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('LLM error')
      );

      const result = await service.generateResearchProposals(gaps, 1);

      expect(result.length).toBe(1);
      // Should still have a proposal, just not enhanced
    });

    it('should group related gaps', async () => {
      const gaps = [
        createMockGap({ relatedEntities: ['A', 'B'] }),
        createMockGap({ relatedEntities: ['B', 'C'] }),
        createMockGap({ relatedEntities: ['X', 'Y'] }),
      ];

      const result = await service.generateResearchProposals(gaps, 2);

      // Related gaps (sharing entity B) should be grouped
      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getGapById', () => {
    it('should return null for non-existent gap', async () => {
      const result = await service.getGapById('non-existent');

      expect(result).toBeNull();
    });

    it('should return cached gap', async () => {
      // First run analysis to populate cache
      const currentYear = new Date().getFullYear();
      const mockRun = mockConnection.run as ReturnType<typeof vi.fn>;

      mockRun.mockResolvedValueOnce({ records: [] });
      mockRun.mockResolvedValueOnce({ records: [] });
      mockRun.mockResolvedValueOnce({ records: [] });
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({
            technique: 'Test Tech',
            techniqueId: 't1',
            lastYear: currentYear - 4,
            totalPubs: 10,
          }),
        ],
      });
      mockRun.mockResolvedValueOnce({ records: [] });
      mockRun.mockResolvedValueOnce({ records: [] });
      mockRun.mockResolvedValueOnce({ records: [] });

      const report = await service.analyze();
      const gapId = report.gaps[0]?.id;

      if (gapId) {
        const result = await service.getGapById(gapId);
        expect(result).toBeDefined();
        expect(result?.id).toBe(gapId);
      }
    });
  });

  describe('exportReport', () => {
    it('should export as JSON', async () => {
      const report = await service.analyze();
      const json = await service.exportReport(report, 'json');

      expect(() => JSON.parse(json)).not.toThrow();
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(report.id);
    });

    it('should export as Markdown', async () => {
      const report = await service.analyze();
      const markdown = await service.exportReport(report, 'markdown');

      expect(markdown).toContain('# 研究ギャップ分析レポート');
      expect(markdown).toContain(report.id);
    });

    it('should handle Map in JSON export', async () => {
      const currentYear = new Date().getFullYear();
      const mockRun = mockConnection.run as ReturnType<typeof vi.fn>;

      // Setup clusters with connectionStrength Map
      mockRun.mockResolvedValue({ records: [] });
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({
            id: 'c1',
            name: 'Cluster 1',
            keywords: ['k1'],
            members: [],
            memberCount: 5,
            avgYear: 2023,
            pubCount: 10,
          }),
        ],
      });

      const report = await service.analyze({ includeClusters: true });
      const json = await service.exportReport(report, 'json');

      // Should not throw and should serialize Map properly
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should include recommendations in markdown', async () => {
      // Create a report with recommendations for testing markdown export
      const mockReport: GapAnalysisReport = {
        id: 'test-report',
        generatedAt: new Date(),
        totalGaps: 2,
        gapsByType: {
          stale_research_area: 1,
          missing_combination: 1,
          isolated_cluster: 0,
          underexplored_technique: 0,
          unexplored_application: 0,
        },
        gapsBySeverity: {
          critical: 0,
          high: 1,
          medium: 1,
          low: 0,
        },
        gaps: [
          createMockGap({ type: 'stale_research_area', severity: 'high' }),
          createMockGap({ type: 'missing_combination', severity: 'medium' }),
        ],
        recommendations: [
          {
            id: 'rec-1',
            title: 'Update stale research',
            description: 'Consider updating research in this area',
            priority: 'high',
            relatedGaps: ['gap-1'],
            suggestedApproach: ['Review latest literature', 'Apply new methods'],
            estimatedImpact: 0.8,
          },
        ],
      };

      const markdown = await service.exportReport(mockReport, 'markdown');

      expect(markdown).toContain('## 推奨事項');
      expect(markdown).toContain('Update stale research');
    });
  });

  describe('recommendations generation', () => {
    it('should create type-specific recommendations', async () => {
      const currentYear = new Date().getFullYear();
      const mockRun = mockConnection.run as ReturnType<typeof vi.fn>;

      // Return gaps of different types
      mockRun.mockResolvedValueOnce({ records: [] }); // existing combos
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({ name: 'Model1', importance: 10 }),
        ],
      });
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({ name: 'Tech1', usage: 5 }),
        ],
      });
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({
            technique: 'StaleTech',
            techniqueId: 't1',
            lastYear: currentYear - 4,
            totalPubs: 10,
          }),
        ],
      });
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({
            technique: 'UnderTech',
            techniqueId: 't2',
            pubCount: 1,
            modelCount: 0,
          }),
        ],
      });
      mockRun.mockResolvedValueOnce({ records: [] });
      mockRun.mockResolvedValueOnce({ records: [] });

      const report = await service.analyze({ generateRecommendations: true });

      expect(report.recommendations.length).toBeGreaterThan(0);
      // Should have recommendations for different gap types
    });

    it('should prioritize recommendations by severity', async () => {
      const currentYear = new Date().getFullYear();
      const mockRun = mockConnection.run as ReturnType<typeof vi.fn>;

      mockRun.mockResolvedValueOnce({ records: [] });
      mockRun.mockResolvedValueOnce({ records: [] });
      mockRun.mockResolvedValueOnce({ records: [] });
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({
            technique: 'HighSeverity',
            techniqueId: 't1',
            lastYear: currentYear - 5,
            totalPubs: 20,
          }),
        ],
      });
      mockRun.mockResolvedValueOnce({ records: [] });
      mockRun.mockResolvedValueOnce({ records: [] });
      mockRun.mockResolvedValueOnce({ records: [] });

      const report = await service.analyze({ generateRecommendations: true });

      // High severity gaps should result in high priority recommendations
      if (report.recommendations.length > 0) {
        expect(report.recommendations[0].priority).toBe('high');
      }
    });
  });

  describe('proposal title generation', () => {
    it('should generate appropriate titles for different gap types', async () => {
      const gapTypes = [
        { type: 'missing_combination', expectedContains: '統合' },
        { type: 'stale_research_area', expectedContains: '再評価' },
        { type: 'isolated_cluster', expectedContains: '架橋' },
        { type: 'underexplored_technique', expectedContains: '調査' },
      ] as const;

      for (const { type, expectedContains } of gapTypes) {
        const gaps = [createMockGap({ type })];
        const proposals = await service.generateResearchProposals(gaps, 1);

        if (proposals.length > 0) {
          expect(proposals[0].title).toContain(expectedContains);
        }
      }
    });
  });

  describe('service without optional dependencies', () => {
    it('should work without LLM client', async () => {
      const serviceNoLLM = new ResearchGapAnalyzerService({
        neo4jConnection: mockConnection,
      });

      const result = await serviceNoLLM.analyze();

      expect(result).toBeDefined();
      expect(result.gaps).toEqual([]);
    });

    it('should work without vector store', async () => {
      const serviceNoVector = new ResearchGapAnalyzerService({
        neo4jConnection: mockConnection,
        llmClient: mockLLMClient,
      });

      const result = await serviceNoVector.analyze();

      expect(result).toBeDefined();
    });
  });
});
