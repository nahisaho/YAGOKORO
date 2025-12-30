/**
 * GlobalQueryEngine Tests
 *
 * Test suite for global query engine that uses community summaries
 * and map-reduce approach for broad knowledge queries.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GlobalQueryEngine } from './GlobalQueryEngine.js';
import type { CommunityRetriever, QueryCommunitySummary, QueryRelation } from './types.js';
import type { LLMClient } from '@yagokoro/domain';

// Mock community retriever
function createMockCommunityRetriever(): CommunityRetriever {
  return {
    retrieveByLevel: vi.fn(),
    retrieveRelevant: vi.fn(),
    retrieveById: vi.fn(),
  };
}

// Mock LLM client
function createMockLLMClient(): LLMClient {
  return {
    getModelName: vi.fn().mockReturnValue('test-model'),
    getEmbeddingDimension: vi.fn().mockReturnValue(1536),
    embed: vi.fn().mockResolvedValue({ embedding: [], dimension: 1536 }),
  };
}

// Helper to create mock community summary
function createMockCommunity(
  id: string,
  summary: string,
  level = 0,
  relevance = 0.8
): QueryCommunitySummary {
  return {
    communityId: id,
    level,
    summary,
    keyEntities: ['entity-1', 'entity-2'],
    relevance,
  };
}

describe('GlobalQueryEngine', () => {
  let engine: GlobalQueryEngine;
  let mockRetriever: CommunityRetriever;
  let mockLLM: LLMClient;
  let mockMapReducer: (query: string, summaries: string[]) => Promise<string>;

  beforeEach(() => {
    mockRetriever = createMockCommunityRetriever();
    mockLLM = createMockLLMClient();
    mockMapReducer = vi.fn().mockResolvedValue('Combined summary');

    engine = new GlobalQueryEngine({
      communityRetriever: mockRetriever,
      llmClient: mockLLM,
      mapReducer: mockMapReducer,
    });
  });

  describe('constructor', () => {
    it('should create instance with required dependencies', () => {
      expect(engine).toBeDefined();
    });

    it('should accept custom options', () => {
      const customEngine = new GlobalQueryEngine(
        {
          communityRetriever: mockRetriever,
          llmClient: mockLLM,
          mapReducer: mockMapReducer,
        },
        { communityLevel: 1, maxCommunities: 5 }
      );
      expect(customEngine).toBeDefined();
    });
  });

  describe('query', () => {
    it('should retrieve communities at specified level', async () => {
      const mockCommunities = [
        createMockCommunity('c1', 'AI Models overview', 0, 0.9),
        createMockCommunity('c2', 'Research organizations', 0, 0.8),
      ];

      vi.mocked(mockRetriever.retrieveRelevant).mockResolvedValue(mockCommunities);

      const result = await engine.query('What are the main AI models?');

      expect(result.success).toBe(true);
      expect(result.context.communitySummaries).toHaveLength(2);
      expect(mockRetriever.retrieveRelevant).toHaveBeenCalled();
    });

    it('should use map-reduce for combining community summaries', async () => {
      const mockCommunities = [
        createMockCommunity('c1', 'Summary 1'),
        createMockCommunity('c2', 'Summary 2'),
        createMockCommunity('c3', 'Summary 3'),
      ];

      vi.mocked(mockRetriever.retrieveRelevant).mockResolvedValue(mockCommunities);
      vi.mocked(mockMapReducer).mockResolvedValue('Combined insights');

      const result = await engine.query('Overview of AI');

      expect(mockMapReducer).toHaveBeenCalled();
      expect(result.context.textChunks).toContain('Combined insights');
    });

    it('should filter communities by minimum relevance', async () => {
      const mockCommunities = [
        createMockCommunity('c1', 'Relevant community', 0, 0.9),
        createMockCommunity('c2', 'Low relevance', 0, 0.1),
      ];

      vi.mocked(mockRetriever.retrieveRelevant).mockResolvedValue(mockCommunities);

      const customEngine = new GlobalQueryEngine(
        {
          communityRetriever: mockRetriever,
          llmClient: mockLLM,
          mapReducer: mockMapReducer,
        },
        { minRelevance: 0.5 }
      );

      const result = await customEngine.query('Test query');

      const highRelevance = result.context.communitySummaries.filter(
        (c) => c.relevance >= 0.5
      );
      expect(highRelevance.length).toBeGreaterThanOrEqual(1);
    });

    it('should respect maxCommunities limit', async () => {
      const mockCommunities = Array.from({ length: 20 }, (_, i) =>
        createMockCommunity(`c${i}`, `Community ${i}`, 0, 0.9 - i * 0.02)
      );

      vi.mocked(mockRetriever.retrieveRelevant).mockResolvedValue(mockCommunities);

      const customEngine = new GlobalQueryEngine(
        {
          communityRetriever: mockRetriever,
          llmClient: mockLLM,
          mapReducer: mockMapReducer,
        },
        { maxCommunities: 5 }
      );

      const result = await customEngine.query('Test query');

      expect(result.context.communitySummaries.length).toBeLessThanOrEqual(5);
    });

    it('should handle empty community results', async () => {
      vi.mocked(mockRetriever.retrieveRelevant).mockResolvedValue([]);

      const result = await engine.query('Unknown topic');

      expect(result.success).toBe(true);
      expect(result.context.communitySummaries).toHaveLength(0);
    });

    it('should include processing metrics', async () => {
      vi.mocked(mockRetriever.retrieveRelevant).mockResolvedValue([
        createMockCommunity('c1', 'Test community'),
      ]);

      const result = await engine.query('Test query');

      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.communitiesConsulted).toBeGreaterThanOrEqual(0);
    });

    it('should handle retrieval errors gracefully', async () => {
      vi.mocked(mockRetriever.retrieveRelevant).mockRejectedValue(
        new Error('Retrieval failed')
      );

      const result = await engine.query('Test query');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Retrieval failed');
    });

    it('should build citations from communities', async () => {
      const mockCommunities = [
        createMockCommunity('c1', 'AI Models community', 0, 0.9),
      ];

      vi.mocked(mockRetriever.retrieveRelevant).mockResolvedValue(mockCommunities);

      const result = await engine.query('Test query');

      expect(result.citations).toHaveLength(1);
      expect(result.citations[0].sourceType).toBe('community');
    });
  });

  describe('queryAtLevel', () => {
    it('should query communities at specific level', async () => {
      const level2Communities = [
        createMockCommunity('c1', 'High level overview', 2, 0.9),
      ];

      vi.mocked(mockRetriever.retrieveRelevant).mockResolvedValue(level2Communities);

      const result = await engine.query('Broad overview', { communityLevel: 2 });

      expect(mockRetriever.retrieveRelevant).toHaveBeenCalledWith(
        'Broad overview',
        2
      );
    });
  });

  describe('batch processing', () => {
    it('should process communities in batches', async () => {
      const mockCommunities = Array.from({ length: 15 }, (_, i) =>
        createMockCommunity(`c${i}`, `Community ${i}`)
      );

      vi.mocked(mockRetriever.retrieveRelevant).mockResolvedValue(mockCommunities);

      const customEngine = new GlobalQueryEngine(
        {
          communityRetriever: mockRetriever,
          llmClient: mockLLM,
          mapReducer: mockMapReducer,
        },
        { batchSize: 5, maxCommunities: 15 }
      );

      await customEngine.query('Test query');

      // Map-reducer should be called for batches
      expect(mockMapReducer).toHaveBeenCalled();
    });
  });
});
