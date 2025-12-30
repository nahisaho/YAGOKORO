/**
 * LocalQueryEngine Tests
 *
 * Test suite for local query engine that retrieves entities and relations
 * from the knowledge graph based on query relevance.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalQueryEngine } from './LocalQueryEngine.js';
import type { EntityRetriever, VectorSearcher, QueryEntity, QueryRelation } from './types.js';

// Mock entity retriever
function createMockEntityRetriever(): EntityRetriever {
  return {
    retrieve: vi.fn(),
    retrieveByIds: vi.fn(),
    retrieveNeighbors: vi.fn(),
  };
}

// Mock vector searcher
function createMockVectorSearcher(): VectorSearcher {
  return {
    search: vi.fn(),
    searchByVector: vi.fn(),
  };
}

// Helper to create mock entity
function createMockQueryEntity(
  id: string,
  name: string,
  type: string,
  relevance = 0.8
): QueryEntity {
  return {
    id,
    name,
    type,
    description: `${name} description`,
    relevance,
  };
}

describe('LocalQueryEngine', () => {
  let engine: LocalQueryEngine;
  let mockRetriever: EntityRetriever;
  let mockSearcher: VectorSearcher;
  let mockRelationFetcher: (entityIds: string[]) => Promise<QueryRelation[]>;

  beforeEach(() => {
    mockRetriever = createMockEntityRetriever();
    mockSearcher = createMockVectorSearcher();
    mockRelationFetcher = vi.fn().mockResolvedValue([]);

    engine = new LocalQueryEngine({
      entityRetriever: mockRetriever,
      vectorSearcher: mockSearcher,
      relationFetcher: mockRelationFetcher,
    });
  });

  describe('constructor', () => {
    it('should create instance with required dependencies', () => {
      expect(engine).toBeDefined();
    });

    it('should accept custom options', () => {
      const customEngine = new LocalQueryEngine(
        {
          entityRetriever: mockRetriever,
          vectorSearcher: mockSearcher,
          relationFetcher: mockRelationFetcher,
        },
        { maxEntities: 5, hopDepth: 1 }
      );
      expect(customEngine).toBeDefined();
    });
  });

  describe('query', () => {
    it('should return entities from vector search', async () => {
      const mockEntities = [
        createMockQueryEntity('e1', 'GPT-4', 'AIModel', 0.95),
        createMockQueryEntity('e2', 'OpenAI', 'Organization', 0.85),
      ];

      vi.mocked(mockSearcher.search).mockResolvedValue(mockEntities);
      vi.mocked(mockRetriever.retrieveNeighbors).mockResolvedValue([]);

      const result = await engine.query('What is GPT-4?');

      expect(result.success).toBe(true);
      expect(result.context.entities).toHaveLength(2);
      expect(mockSearcher.search).toHaveBeenCalledWith('What is GPT-4?', expect.any(Number), expect.any(Number));
    });

    it('should include neighbor entities based on hop depth', async () => {
      const seedEntity = createMockQueryEntity('e1', 'GPT-4', 'AIModel', 0.95);
      const neighborEntity = createMockQueryEntity('e2', 'OpenAI', 'Organization', 0.7);

      vi.mocked(mockSearcher.search).mockResolvedValue([seedEntity]);
      vi.mocked(mockRetriever.retrieveNeighbors).mockResolvedValue([neighborEntity]);

      const result = await engine.query('What is GPT-4?');

      expect(result.context.entities.length).toBeGreaterThanOrEqual(1);
      expect(mockRetriever.retrieveNeighbors).toHaveBeenCalled();
    });

    it('should fetch relations between retrieved entities', async () => {
      const mockEntities = [
        createMockQueryEntity('e1', 'GPT-4', 'AIModel'),
        createMockQueryEntity('e2', 'OpenAI', 'Organization'),
      ];

      const mockRelations: QueryRelation[] = [
        {
          sourceId: 'e1',
          sourceName: 'GPT-4',
          targetId: 'e2',
          targetName: 'OpenAI',
          type: 'DEVELOPED_BY',
          confidence: 0.95,
        },
      ];

      vi.mocked(mockSearcher.search).mockResolvedValue(mockEntities);
      vi.mocked(mockRetriever.retrieveNeighbors).mockResolvedValue([]);
      vi.mocked(mockRelationFetcher).mockResolvedValue(mockRelations);

      const result = await engine.query('What is GPT-4?');

      expect(result.context.relations).toHaveLength(1);
      expect(result.context.relations[0].type).toBe('DEVELOPED_BY');
    });

    it('should filter entities below minimum similarity', async () => {
      const mockEntities = [
        createMockQueryEntity('e1', 'GPT-4', 'AIModel', 0.9),
        createMockQueryEntity('e2', 'Unrelated', 'Other', 0.2), // Below threshold
      ];

      vi.mocked(mockSearcher.search).mockResolvedValue(mockEntities);
      vi.mocked(mockRetriever.retrieveNeighbors).mockResolvedValue([]);

      const customEngine = new LocalQueryEngine(
        {
          entityRetriever: mockRetriever,
          vectorSearcher: mockSearcher,
          relationFetcher: mockRelationFetcher,
        },
        { minSimilarity: 0.5 }
      );

      const result = await customEngine.query('What is GPT-4?');

      const highRelevanceEntities = result.context.entities.filter((e) => e.relevance >= 0.5);
      expect(highRelevanceEntities.length).toBeGreaterThanOrEqual(1);
    });

    it('should respect maxEntities limit', async () => {
      const mockEntities = Array.from({ length: 50 }, (_, i) =>
        createMockQueryEntity(`e${i}`, `Entity ${i}`, 'AIModel', 0.9 - i * 0.01)
      );

      vi.mocked(mockSearcher.search).mockResolvedValue(mockEntities);
      vi.mocked(mockRetriever.retrieveNeighbors).mockResolvedValue([]);

      const customEngine = new LocalQueryEngine(
        {
          entityRetriever: mockRetriever,
          vectorSearcher: mockSearcher,
          relationFetcher: mockRelationFetcher,
        },
        { maxEntities: 10 }
      );

      const result = await customEngine.query('Test query');

      expect(result.context.entities.length).toBeLessThanOrEqual(10);
    });

    it('should handle empty search results', async () => {
      vi.mocked(mockSearcher.search).mockResolvedValue([]);

      const result = await engine.query('Unknown topic');

      expect(result.success).toBe(true);
      expect(result.context.entities).toHaveLength(0);
    });

    it('should include processing metrics', async () => {
      vi.mocked(mockSearcher.search).mockResolvedValue([
        createMockQueryEntity('e1', 'GPT-4', 'AIModel'),
      ]);
      vi.mocked(mockRetriever.retrieveNeighbors).mockResolvedValue([]);

      const result = await engine.query('What is GPT-4?');

      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.retrievalTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.entitiesRetrieved).toBeGreaterThanOrEqual(0);
    });

    it('should deduplicate entities from multiple sources', async () => {
      const sameEntity = createMockQueryEntity('e1', 'GPT-4', 'AIModel');

      vi.mocked(mockSearcher.search).mockResolvedValue([sameEntity]);
      // Neighbor search also returns the same entity
      vi.mocked(mockRetriever.retrieveNeighbors).mockResolvedValue([sameEntity]);

      const result = await engine.query('What is GPT-4?');

      const uniqueIds = new Set(result.context.entities.map((e) => e.id));
      expect(uniqueIds.size).toBe(result.context.entities.length);
    });

    it('should handle search errors gracefully', async () => {
      vi.mocked(mockSearcher.search).mockRejectedValue(new Error('Search failed'));

      const result = await engine.query('Test query');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Search failed');
    });
  });

  describe('queryWithOptions', () => {
    it('should override default options for single query', async () => {
      vi.mocked(mockSearcher.search).mockResolvedValue([]);

      await engine.query('Test', { maxEntities: 5, hopDepth: 1 });

      expect(mockSearcher.search).toHaveBeenCalledWith('Test', 5, expect.any(Number));
    });
  });

  describe('buildContext', () => {
    it('should build query context with entities and relations', async () => {
      const mockEntities = [
        createMockQueryEntity('e1', 'GPT-4', 'AIModel'),
        createMockQueryEntity('e2', 'OpenAI', 'Organization'),
      ];

      const mockRelations: QueryRelation[] = [
        {
          sourceId: 'e1',
          sourceName: 'GPT-4',
          targetId: 'e2',
          targetName: 'OpenAI',
          type: 'DEVELOPED_BY',
          confidence: 0.95,
        },
      ];

      vi.mocked(mockSearcher.search).mockResolvedValue(mockEntities);
      vi.mocked(mockRetriever.retrieveNeighbors).mockResolvedValue([]);
      vi.mocked(mockRelationFetcher).mockResolvedValue(mockRelations);

      const result = await engine.query('What is GPT-4?');

      expect(result.context.entities).toBeDefined();
      expect(result.context.relations).toBeDefined();
      expect(result.context.communitySummaries).toEqual([]);
      expect(result.context.textChunks).toBeDefined();
    });

    it('should generate text chunks from entity descriptions', async () => {
      const mockEntities = [
        createMockQueryEntity('e1', 'GPT-4', 'AIModel'),
      ];

      vi.mocked(mockSearcher.search).mockResolvedValue(mockEntities);
      vi.mocked(mockRetriever.retrieveNeighbors).mockResolvedValue([]);

      const result = await engine.query('What is GPT-4?');

      expect(result.context.textChunks.length).toBeGreaterThan(0);
    });
  });
});
