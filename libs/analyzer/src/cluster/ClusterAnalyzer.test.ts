/**
 * ClusterAnalyzer Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClusterAnalyzer } from './ClusterAnalyzer.js';
import type {
  Neo4jConnectionInterface,
  Neo4jRecord,
  VectorStoreInterface,
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

// Mock vector store
const createMockVectorStore = (): VectorStoreInterface => ({
  search: vi.fn().mockResolvedValue([]),
  similarity: vi.fn().mockResolvedValue(0.5),
});

describe('ClusterAnalyzer', () => {
  let analyzer: ClusterAnalyzer;
  let mockConnection: Neo4jConnectionInterface;
  let mockVectorStore: VectorStoreInterface;

  beforeEach(() => {
    mockConnection = createMockConnection();
    mockVectorStore = createMockVectorStore();
    analyzer = new ClusterAnalyzer({
      neo4jConnection: mockConnection,
      vectorStore: mockVectorStore,
    });
  });

  describe('analyzeExistingClusters', () => {
    it('should return empty array when no clusters', async () => {
      const result = await analyzer.analyzeExistingClusters();

      expect(result).toEqual([]);
    });

    it('should return clusters with members', async () => {
      const mockRun = vi.fn();

      // Main cluster query
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({
            id: 'cluster1',
            name: 'AI Cluster',
            keywords: ['machine learning', 'deep learning'],
            members: [
              { id: 'e1', name: 'Entity 1', type: 'Technique', centrality: 0.8 },
              { id: 'e2', name: 'Entity 2', type: 'Concept', centrality: 0.5 },
            ],
            memberCount: 2,
            avgYear: 2022,
            pubCount: 10,
          }),
        ],
      });

      // Connection strengths query
      mockRun.mockResolvedValueOnce({ records: [] });

      // Growth rate query
      mockRun.mockResolvedValueOnce({ records: [] });

      mockConnection.run = mockRun;

      const result = await analyzer.analyzeExistingClusters();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cluster1');
      expect(result[0].name).toBe('AI Cluster');
      expect(result[0].keywords).toEqual(['machine learning', 'deep learning']);
      expect(result[0].entities).toHaveLength(2);
    });

    it('should respect minClusterSize option', async () => {
      await analyzer.analyzeExistingClusters({ minClusterSize: 5 });

      expect(mockConnection.run).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ minClusterSize: 5 })
      );
    });

    it('should respect maxClusters option', async () => {
      await analyzer.analyzeExistingClusters({ maxClusters: 10 });

      expect(mockConnection.run).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ maxClusters: 10 })
      );
    });

    it('should skip connection calculation when includeConnections is false', async () => {
      const mockRun = vi.fn();
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({
            id: 'c1',
            name: 'Cluster 1',
            keywords: [],
            members: [],
            memberCount: 5,
            avgYear: 2023,
            pubCount: 3,
          }),
        ],
      });
      // Growth rate query only (no connection query)
      mockRun.mockResolvedValueOnce({ records: [] });

      mockConnection.run = mockRun;

      await analyzer.analyzeExistingClusters({ includeConnections: false });

      // Should be called twice (main query + growth rate), not three times
      expect(mockRun).toHaveBeenCalledTimes(2);
    });
  });

  describe('findClusterGaps', () => {
    it('should return empty array when no clusters', async () => {
      const result = await analyzer.findClusterGaps();

      expect(result).toEqual([]);
    });

    it('should find gaps between weakly connected clusters', async () => {
      const mockRun = vi.fn();

      // First: analyzeExistingClusters
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({
            id: 'c1',
            name: 'Cluster 1',
            keywords: ['keyword1'],
            members: [{ id: 'e1', name: 'E1' }],
            memberCount: 1,
            avgYear: 2023,
            pubCount: 5,
          }),
          createMockRecord({
            id: 'c2',
            name: 'Cluster 2',
            keywords: ['keyword2'],
            members: [{ id: 'e2', name: 'E2' }],
            memberCount: 1,
            avgYear: 2023,
            pubCount: 3,
          }),
        ],
      });

      // Connection strengths for c1 and c2
      mockRun.mockResolvedValueOnce({ records: [] });
      mockRun.mockResolvedValueOnce({ records: [] });

      // Growth rates
      mockRun.mockResolvedValueOnce({ records: [] });
      mockRun.mockResolvedValueOnce({ records: [] });

      // measureConnection for gap detection
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({
            pathCount: 0,
            c1Size: 5,
            c2Size: 5,
          }),
        ],
      });

      // suggestBridgeTopics - shared entities query
      mockRun.mockResolvedValueOnce({ records: [] });

      mockConnection.run = mockRun;

      const result = await analyzer.findClusterGaps();

      expect(result).toHaveLength(1);
      expect(result[0].connectionStrength).toBe(0);
      expect(result[0].cluster1.id).toBe('c1');
      expect(result[0].cluster2.id).toBe('c2');
    });

    it('should not return gaps for well-connected clusters', async () => {
      const mockRun = vi.fn();

      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({
            id: 'c1',
            name: 'Cluster 1',
            keywords: [],
            members: [],
            memberCount: 5,
            avgYear: 2023,
            pubCount: 5,
          }),
          createMockRecord({
            id: 'c2',
            name: 'Cluster 2',
            keywords: [],
            members: [],
            memberCount: 5,
            avgYear: 2023,
            pubCount: 3,
          }),
        ],
      });

      // Connection strengths
      mockRun.mockResolvedValueOnce({ records: [] });
      mockRun.mockResolvedValueOnce({ records: [] });

      // Growth rates
      mockRun.mockResolvedValueOnce({ records: [] });
      mockRun.mockResolvedValueOnce({ records: [] });

      // measureConnection - strongly connected
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({
            pathCount: 100,
            c1Size: 10,
            c2Size: 10,
          }),
        ],
      });

      mockConnection.run = mockRun;

      const result = await analyzer.findClusterGaps();

      expect(result).toHaveLength(0);
    });
  });

  describe('measureConnection', () => {
    it('should return 0 when no connections', async () => {
      (mockConnection.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        records: [
          createMockRecord({ pathCount: 0, c1Size: 5, c2Size: 5 }),
        ],
      });

      const result = await analyzer.measureConnection('c1', 'c2');

      expect(result).toBe(0);
    });

    it('should return normalized connection strength', async () => {
      (mockConnection.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        records: [
          createMockRecord({ pathCount: 10, c1Size: 5, c2Size: 5 }),
        ],
      });

      const result = await analyzer.measureConnection('c1', 'c2');

      // 10 / (5 * 5) = 0.4
      expect(result).toBe(0.4);
    });

    it('should cap at 1.0', async () => {
      (mockConnection.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        records: [
          createMockRecord({ pathCount: 1000, c1Size: 5, c2Size: 5 }),
        ],
      });

      const result = await analyzer.measureConnection('c1', 'c2');

      expect(result).toBe(1);
    });

    it('should return 0 when clusters are empty', async () => {
      (mockConnection.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        records: [
          createMockRecord({ pathCount: 0, c1Size: 0, c2Size: 0 }),
        ],
      });

      const result = await analyzer.measureConnection('c1', 'c2');

      expect(result).toBe(0);
    });
  });

  describe('suggestBridgeTopics', () => {
    it('should return common keywords first', async () => {
      const cluster1 = {
        id: 'c1',
        name: 'Cluster 1',
        keywords: ['AI', 'machine learning', 'data'],
        entities: [],
        publicationCount: 0,
        avgPublicationYear: 2023,
        growthRate: 0,
        connectionStrength: new Map(),
      };

      const cluster2 = {
        id: 'c2',
        name: 'Cluster 2',
        keywords: ['machine learning', 'statistics', 'data'],
        entities: [],
        publicationCount: 0,
        avgPublicationYear: 2023,
        growthRate: 0,
        connectionStrength: new Map(),
      };

      const result = await analyzer.suggestBridgeTopics(cluster1, cluster2);

      expect(result).toContain('machine learning');
      expect(result).toContain('data');
    });

    it('should use vector similarity when no common keywords', async () => {
      const cluster1 = {
        id: 'c1',
        name: 'Cluster 1',
        keywords: ['neural networks'],
        entities: [],
        publicationCount: 0,
        avgPublicationYear: 2023,
        growthRate: 0,
        connectionStrength: new Map(),
      };

      const cluster2 = {
        id: 'c2',
        name: 'Cluster 2',
        keywords: ['deep learning'],
        entities: [],
        publicationCount: 0,
        avgPublicationYear: 2023,
        growthRate: 0,
        connectionStrength: new Map(),
      };

      (mockVectorStore.similarity as ReturnType<typeof vi.fn>).mockResolvedValueOnce(0.8);

      const result = await analyzer.suggestBridgeTopics(cluster1, cluster2);

      expect(result).toContain('neural networks ↔ deep learning');
    });

    it('should fall back to interdisciplinary research', async () => {
      const analyzerNoVector = new ClusterAnalyzer({
        neo4jConnection: mockConnection,
      });

      const cluster1 = {
        id: 'c1',
        name: 'Cluster 1',
        keywords: ['unique1'],
        entities: [],
        publicationCount: 0,
        avgPublicationYear: 2023,
        growthRate: 0,
        connectionStrength: new Map(),
      };

      const cluster2 = {
        id: 'c2',
        name: 'Cluster 2',
        keywords: ['unique2'],
        entities: [],
        publicationCount: 0,
        avgPublicationYear: 2023,
        growthRate: 0,
        connectionStrength: new Map(),
      };

      const result = await analyzerNoVector.suggestBridgeTopics(cluster1, cluster2);

      expect(result).toContain('interdisciplinary research');
    });
  });

  describe('growth rate calculation', () => {
    it('should calculate positive growth rate', async () => {
      const mockRun = vi.fn();

      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({
            id: 'c1',
            name: 'Growing Cluster',
            keywords: [],
            members: [],
            memberCount: 10,
            avgYear: 2023,
            pubCount: 20,
          }),
        ],
      });

      // Connection strengths
      mockRun.mockResolvedValueOnce({ records: [] });

      // Growth rate - recent years have more publications
      const currentYear = new Date().getFullYear();
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({ year: currentYear - 5, count: 2 }),
          createMockRecord({ year: currentYear - 4, count: 3 }),
          createMockRecord({ year: currentYear - 2, count: 8 }),
          createMockRecord({ year: currentYear - 1, count: 10 }),
          createMockRecord({ year: currentYear, count: 12 }),
        ],
      });

      mockConnection.run = mockRun;

      const result = await analyzer.analyzeExistingClusters();

      expect(result[0].growthRate).toBeGreaterThan(0);
    });

    it('should calculate negative growth rate for declining clusters', async () => {
      const mockRun = vi.fn();

      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({
            id: 'c1',
            name: 'Declining Cluster',
            keywords: [],
            members: [],
            memberCount: 10,
            avgYear: 2020,
            pubCount: 15,
          }),
        ],
      });

      // Connection strengths
      mockRun.mockResolvedValueOnce({ records: [] });

      // Growth rate - older years have more publications
      const currentYear = new Date().getFullYear();
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({ year: currentYear - 5, count: 10 }),
          createMockRecord({ year: currentYear - 4, count: 8 }),
          createMockRecord({ year: currentYear - 2, count: 2 }),
          createMockRecord({ year: currentYear - 1, count: 1 }),
        ],
      });

      mockConnection.run = mockRun;

      const result = await analyzer.analyzeExistingClusters();

      expect(result[0].growthRate).toBeLessThan(0);
    });
  });

  describe('entity processing', () => {
    it('should handle empty members array', async () => {
      const mockRun = vi.fn();
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({
            id: 'c1',
            name: 'Empty Cluster',
            keywords: [],
            members: [],
            memberCount: 0,
            avgYear: null,
            pubCount: 0,
          }),
        ],
      });
      mockRun.mockResolvedValueOnce({ records: [] });
      mockRun.mockResolvedValueOnce({ records: [] });

      mockConnection.run = mockRun;

      const result = await analyzer.analyzeExistingClusters();

      expect(result[0].entities).toEqual([]);
    });

    it('should limit entities to 100', async () => {
      const manyMembers = Array.from({ length: 150 }, (_, i) => ({
        id: `e${i}`,
        name: `Entity ${i}`,
        type: 'Concept',
      }));

      const mockRun = vi.fn();
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({
            id: 'c1',
            name: 'Large Cluster',
            keywords: [],
            members: manyMembers,
            memberCount: 150,
            avgYear: 2023,
            pubCount: 50,
          }),
        ],
      });
      mockRun.mockResolvedValueOnce({ records: [] });
      mockRun.mockResolvedValueOnce({ records: [] });

      mockConnection.run = mockRun;

      const result = await analyzer.analyzeExistingClusters();

      expect(result[0].entities).toHaveLength(100);
    });
  });

  describe('keyword handling', () => {
    it('should handle string keyword', async () => {
      const mockRun = vi.fn();
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({
            id: 'c1',
            name: 'Cluster',
            keywords: 'single keyword',
            members: [],
            memberCount: 5,
            avgYear: 2023,
            pubCount: 3,
          }),
        ],
      });
      mockRun.mockResolvedValueOnce({ records: [] });
      mockRun.mockResolvedValueOnce({ records: [] });

      mockConnection.run = mockRun;

      const result = await analyzer.analyzeExistingClusters();

      expect(result[0].keywords).toEqual(['single keyword']);
    });

    it('should handle null keywords', async () => {
      const mockRun = vi.fn();
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({
            id: 'c1',
            name: 'Cluster',
            keywords: null,
            members: [],
            memberCount: 5,
            avgYear: 2023,
            pubCount: 3,
          }),
        ],
      });
      mockRun.mockResolvedValueOnce({ records: [] });
      mockRun.mockResolvedValueOnce({ records: [] });

      mockConnection.run = mockRun;

      const result = await analyzer.analyzeExistingClusters();

      expect(result[0].keywords).toEqual([]);
    });
  });
});
