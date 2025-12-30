/**
 * HybridSearchEngine Tests
 *
 * Test suite for hybrid search engine that combines local and global
 * search strategies for comprehensive query results.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HybridSearchEngine } from './HybridSearchEngine.js';
import type {
  QueryContext,
  QueryEntity,
  QueryMetrics,
  QueryRelation,
  QueryResponse,
  QueryCommunitySummary,
} from './types.js';

// Helper to create mock local response
function createMockLocalResponse(
  entities: QueryEntity[] = [],
  success = true
): QueryResponse {
  return {
    query: 'test query',
    answer: '',
    queryType: 'local',
    citations: entities.map((e) => ({
      entityId: e.id,
      entityName: e.name,
      sourceType: 'entity',
      relevance: e.relevance,
    })),
    context: {
      entities,
      relations: [],
      communitySummaries: [],
      textChunks: entities.map((e) => e.description || ''),
    },
    metrics: {
      totalTimeMs: 100,
      retrievalTimeMs: 80,
      generationTimeMs: 0,
      entitiesRetrieved: entities.length,
      relationsRetrieved: 0,
      communitiesConsulted: 0,
    },
    success,
    error: success ? undefined : 'Local search failed',
  };
}

// Helper to create mock global response
function createMockGlobalResponse(
  communities: QueryCommunitySummary[] = [],
  success = true
): QueryResponse {
  return {
    query: 'test query',
    answer: '',
    queryType: 'global',
    citations: communities.map((c) => ({
      entityId: c.communityId,
      entityName: `Community ${c.communityId}`,
      sourceType: 'community',
      relevance: c.relevance,
    })),
    context: {
      entities: [],
      relations: [],
      communitySummaries: communities,
      textChunks: communities.map((c) => c.summary),
    },
    metrics: {
      totalTimeMs: 150,
      retrievalTimeMs: 100,
      generationTimeMs: 50,
      entitiesRetrieved: 0,
      relationsRetrieved: 0,
      communitiesConsulted: communities.length,
    },
    success,
    error: success ? undefined : 'Global search failed',
  };
}

// Helper to create mock entity
function createMockEntity(id: string, name: string, relevance = 0.8): QueryEntity {
  return {
    id,
    name,
    type: 'AIModel',
    description: `${name} description`,
    relevance,
  };
}

// Helper to create mock community
function createMockCommunity(
  id: string,
  summary: string,
  relevance = 0.8
): QueryCommunitySummary {
  return {
    communityId: id,
    level: 0,
    summary,
    keyEntities: [],
    relevance,
  };
}

describe('HybridSearchEngine', () => {
  let engine: HybridSearchEngine;
  let mockLocalQuery: (query: string) => Promise<QueryResponse>;
  let mockGlobalQuery: (query: string) => Promise<QueryResponse>;

  beforeEach(() => {
    mockLocalQuery = vi.fn().mockResolvedValue(createMockLocalResponse());
    mockGlobalQuery = vi.fn().mockResolvedValue(createMockGlobalResponse());

    engine = new HybridSearchEngine({
      localQuery: mockLocalQuery,
      globalQuery: mockGlobalQuery,
    });
  });

  describe('constructor', () => {
    it('should create instance with required dependencies', () => {
      expect(engine).toBeDefined();
    });

    it('should accept custom weights', () => {
      const customEngine = new HybridSearchEngine(
        {
          localQuery: mockLocalQuery,
          globalQuery: mockGlobalQuery,
        },
        { localWeight: 0.7, globalWeight: 0.3 }
      );
      expect(customEngine).toBeDefined();
    });
  });

  describe('search', () => {
    it('should combine local and global search results', async () => {
      const mockEntities = [createMockEntity('e1', 'GPT-4', 0.9)];
      const mockCommunities = [createMockCommunity('c1', 'AI overview', 0.8)];

      vi.mocked(mockLocalQuery).mockResolvedValue(createMockLocalResponse(mockEntities));
      vi.mocked(mockGlobalQuery).mockResolvedValue(createMockGlobalResponse(mockCommunities));

      const result = await engine.search('What is GPT-4?');

      expect(result.success).toBe(true);
      expect(result.queryType).toBe('hybrid');
      expect(result.context.entities.length).toBeGreaterThan(0);
      expect(result.context.communitySummaries.length).toBeGreaterThan(0);
    });

    it('should run local and global queries in parallel', async () => {
      const localDelay = new Promise<QueryResponse>((resolve) =>
        setTimeout(() => resolve(createMockLocalResponse()), 50)
      );
      const globalDelay = new Promise<QueryResponse>((resolve) =>
        setTimeout(() => resolve(createMockGlobalResponse()), 50)
      );

      vi.mocked(mockLocalQuery).mockReturnValue(localDelay);
      vi.mocked(mockGlobalQuery).mockReturnValue(globalDelay);

      const startTime = performance.now();
      await engine.search('Test query');
      const elapsedTime = performance.now() - startTime;

      // Should complete in ~50ms (parallel) not ~100ms (sequential)
      expect(elapsedTime).toBeLessThan(100);
    });

    it('should merge citations from both sources', async () => {
      const mockEntities = [createMockEntity('e1', 'GPT-4', 0.9)];
      const mockCommunities = [createMockCommunity('c1', 'AI overview', 0.8)];

      vi.mocked(mockLocalQuery).mockResolvedValue(createMockLocalResponse(mockEntities));
      vi.mocked(mockGlobalQuery).mockResolvedValue(createMockGlobalResponse(mockCommunities));

      const result = await engine.search('Test query');

      expect(result.citations.length).toBe(2);
      expect(result.citations.some((c) => c.sourceType === 'entity')).toBe(true);
      expect(result.citations.some((c) => c.sourceType === 'community')).toBe(true);
    });

    it('should combine metrics from both engines', async () => {
      vi.mocked(mockLocalQuery).mockResolvedValue(
        createMockLocalResponse([createMockEntity('e1', 'Entity')])
      );
      vi.mocked(mockGlobalQuery).mockResolvedValue(
        createMockGlobalResponse([createMockCommunity('c1', 'Community')])
      );

      const result = await engine.search('Test query');

      expect(result.metrics.entitiesRetrieved).toBe(1);
      expect(result.metrics.communitiesConsulted).toBe(1);
    });

    it('should succeed if local search succeeds but global fails', async () => {
      vi.mocked(mockLocalQuery).mockResolvedValue(
        createMockLocalResponse([createMockEntity('e1', 'GPT-4')])
      );
      vi.mocked(mockGlobalQuery).mockResolvedValue(createMockGlobalResponse([], false));

      const result = await engine.search('Test query');

      expect(result.success).toBe(true);
      expect(result.context.entities.length).toBeGreaterThan(0);
    });

    it('should succeed if global search succeeds but local fails', async () => {
      vi.mocked(mockLocalQuery).mockResolvedValue(createMockLocalResponse([], false));
      vi.mocked(mockGlobalQuery).mockResolvedValue(
        createMockGlobalResponse([createMockCommunity('c1', 'Overview')])
      );

      const result = await engine.search('Test query');

      expect(result.success).toBe(true);
      expect(result.context.communitySummaries.length).toBeGreaterThan(0);
    });

    it('should fail if both searches fail', async () => {
      vi.mocked(mockLocalQuery).mockResolvedValue(createMockLocalResponse([], false));
      vi.mocked(mockGlobalQuery).mockResolvedValue(createMockGlobalResponse([], false));

      const result = await engine.search('Test query');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle exceptions gracefully', async () => {
      vi.mocked(mockLocalQuery).mockRejectedValue(new Error('Local error'));
      vi.mocked(mockGlobalQuery).mockRejectedValue(new Error('Global error'));

      const result = await engine.search('Test query');

      expect(result.success).toBe(false);
    });
  });

  describe('search modes', () => {
    it('should support keyword search mode', async () => {
      vi.mocked(mockLocalQuery).mockResolvedValue(createMockLocalResponse());
      vi.mocked(mockGlobalQuery).mockResolvedValue(createMockGlobalResponse());

      await engine.search('Test query', { searchMode: 'keyword' });

      // Both engines should still be called
      expect(mockLocalQuery).toHaveBeenCalled();
      expect(mockGlobalQuery).toHaveBeenCalled();
    });

    it('should support semantic search mode', async () => {
      vi.mocked(mockLocalQuery).mockResolvedValue(createMockLocalResponse());
      vi.mocked(mockGlobalQuery).mockResolvedValue(createMockGlobalResponse());

      await engine.search('Test query', { searchMode: 'semantic' });

      expect(mockLocalQuery).toHaveBeenCalled();
    });

    it('should support hybrid search mode (default)', async () => {
      vi.mocked(mockLocalQuery).mockResolvedValue(createMockLocalResponse());
      vi.mocked(mockGlobalQuery).mockResolvedValue(createMockGlobalResponse());

      await engine.search('Test query', { searchMode: 'hybrid' });

      expect(mockLocalQuery).toHaveBeenCalled();
      expect(mockGlobalQuery).toHaveBeenCalled();
    });
  });

  describe('weighting', () => {
    it('should apply local weight to entity relevance', async () => {
      const mockEntities = [createMockEntity('e1', 'GPT-4', 1.0)];

      vi.mocked(mockLocalQuery).mockResolvedValue(createMockLocalResponse(mockEntities));
      vi.mocked(mockGlobalQuery).mockResolvedValue(createMockGlobalResponse());

      const customEngine = new HybridSearchEngine(
        {
          localQuery: mockLocalQuery,
          globalQuery: mockGlobalQuery,
        },
        { localWeight: 0.5, globalWeight: 0.5 }
      );

      const result = await customEngine.search('Test query');

      // Entity relevance should be adjusted by local weight
      expect(result.context.entities[0].relevance).toBe(0.5);
    });

    it('should apply global weight to community relevance', async () => {
      const mockCommunities = [createMockCommunity('c1', 'Overview', 1.0)];

      vi.mocked(mockLocalQuery).mockResolvedValue(createMockLocalResponse());
      vi.mocked(mockGlobalQuery).mockResolvedValue(createMockGlobalResponse(mockCommunities));

      const customEngine = new HybridSearchEngine(
        {
          localQuery: mockLocalQuery,
          globalQuery: mockGlobalQuery,
        },
        { localWeight: 0.5, globalWeight: 0.5 }
      );

      const result = await customEngine.search('Test query');

      // Community relevance should be adjusted by global weight
      expect(result.context.communitySummaries[0].relevance).toBe(0.5);
    });
  });

  describe('text chunks', () => {
    it('should merge text chunks from both sources', async () => {
      const mockEntities = [createMockEntity('e1', 'GPT-4')];
      const mockCommunities = [createMockCommunity('c1', 'AI Community Summary')];

      vi.mocked(mockLocalQuery).mockResolvedValue(createMockLocalResponse(mockEntities));
      vi.mocked(mockGlobalQuery).mockResolvedValue(createMockGlobalResponse(mockCommunities));

      const result = await engine.search('Test query');

      expect(result.context.textChunks.length).toBeGreaterThan(0);
    });
  });
});
