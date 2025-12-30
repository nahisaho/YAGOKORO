/**
 * ResponseGenerator Tests
 *
 * Test suite for response generation from query context.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResponseGenerator } from './ResponseGenerator.js';
import type { QueryContext, QueryResponse, Citation } from './types.js';
import type { LLMClient } from '@yagokoro/domain';

// Mock LLM client
function createMockLLMClient(): LLMClient {
  return {
    getModelName: vi.fn().mockReturnValue('test-model'),
    getEmbeddingDimension: vi.fn().mockReturnValue(1536),
    embed: vi.fn().mockResolvedValue({ embedding: [], dimension: 1536 }),
  };
}

// Helper to create mock context
function createMockContext(
  entityCount = 2,
  communityCount = 0
): QueryContext {
  const entities = Array.from({ length: entityCount }, (_, i) => ({
    id: `e${i}`,
    name: `Entity ${i}`,
    type: 'AIModel',
    description: `Description of Entity ${i}`,
    relevance: 0.9 - i * 0.1,
  }));

  const communitySummaries = Array.from({ length: communityCount }, (_, i) => ({
    communityId: `c${i}`,
    level: 0,
    summary: `Summary of Community ${i}`,
    keyEntities: [],
    relevance: 0.8 - i * 0.1,
  }));

  return {
    entities,
    relations: [],
    communitySummaries,
    textChunks: [
      ...entities.map((e) => `${e.name}: ${e.description}`),
      ...communitySummaries.map((c) => c.summary),
    ],
  };
}

// Helper to create mock query response
function createMockQueryResponse(context: QueryContext): QueryResponse {
  return {
    query: 'Test query',
    answer: '',
    queryType: 'local',
    citations: [],
    context,
    metrics: {
      totalTimeMs: 100,
      retrievalTimeMs: 80,
      generationTimeMs: 0,
      entitiesRetrieved: context.entities.length,
      relationsRetrieved: 0,
      communitiesConsulted: context.communitySummaries.length,
    },
    success: true,
  };
}

describe('ResponseGenerator', () => {
  let generator: ResponseGenerator;
  let mockLLM: LLMClient;
  let mockGenerateAnswer: (prompt: string) => Promise<string>;

  beforeEach(() => {
    mockLLM = createMockLLMClient();
    mockGenerateAnswer = vi.fn().mockResolvedValue('Generated answer based on context');

    generator = new ResponseGenerator({
      llmClient: mockLLM,
      generateAnswer: mockGenerateAnswer,
    });
  });

  describe('constructor', () => {
    it('should create instance with required dependencies', () => {
      expect(generator).toBeDefined();
    });

    it('should accept custom options', () => {
      const customGenerator = new ResponseGenerator(
        {
          llmClient: mockLLM,
          generateAnswer: mockGenerateAnswer,
        },
        { maxContextLength: 2000, includeCitations: false }
      );
      expect(customGenerator).toBeDefined();
    });
  });

  describe('generate', () => {
    it('should generate answer from query response', async () => {
      const context = createMockContext(2, 1);
      const queryResponse = createMockQueryResponse(context);

      const result = await generator.generate(queryResponse);

      expect(result.answer).toBe('Generated answer based on context');
      expect(result.success).toBe(true);
    });

    it('should pass context to answer generator', async () => {
      const context = createMockContext(2, 0);
      const queryResponse = createMockQueryResponse(context);

      await generator.generate(queryResponse);

      expect(mockGenerateAnswer).toHaveBeenCalled();
      const prompt = vi.mocked(mockGenerateAnswer).mock.calls[0][0];
      expect(prompt).toContain('Entity 0');
      expect(prompt).toContain('Entity 1');
    });

    it('should include citations in response', async () => {
      const context = createMockContext(2, 0);
      const queryResponse = createMockQueryResponse(context);

      const result = await generator.generate(queryResponse);

      expect(result.citations.length).toBeGreaterThan(0);
    });

    it('should handle empty context', async () => {
      const context = createMockContext(0, 0);
      const queryResponse = createMockQueryResponse(context);

      vi.mocked(mockGenerateAnswer).mockResolvedValue(
        'I don\'t have enough information to answer this question.'
      );

      const result = await generator.generate(queryResponse);

      expect(result.success).toBe(true);
      expect(result.answer).toContain('don\'t have enough information');
    });

    it('should handle generation errors', async () => {
      const context = createMockContext(2, 0);
      const queryResponse = createMockQueryResponse(context);

      vi.mocked(mockGenerateAnswer).mockRejectedValue(new Error('LLM error'));

      const result = await generator.generate(queryResponse);

      expect(result.success).toBe(false);
      expect(result.error).toContain('LLM error');
    });

    it('should track generation time in metrics', async () => {
      const context = createMockContext(2, 0);
      const queryResponse = createMockQueryResponse(context);

      // Simulate some delay
      vi.mocked(mockGenerateAnswer).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('Answer'), 10))
      );

      const result = await generator.generate(queryResponse);

      expect(result.metrics.generationTimeMs).toBeGreaterThan(0);
    });

    it('should preserve original metrics', async () => {
      const context = createMockContext(2, 0);
      const queryResponse = createMockQueryResponse(context);

      const result = await generator.generate(queryResponse);

      expect(result.metrics.entitiesRetrieved).toBe(2);
      expect(result.metrics.retrievalTimeMs).toBe(80);
    });
  });

  describe('context formatting', () => {
    it('should format entities in context', async () => {
      const context = createMockContext(3, 0);
      const queryResponse = createMockQueryResponse(context);

      await generator.generate(queryResponse);

      const prompt = vi.mocked(mockGenerateAnswer).mock.calls[0][0];
      expect(prompt).toContain('Entity 0');
      expect(prompt).toContain('Entity 1');
      expect(prompt).toContain('Entity 2');
    });

    it('should format community summaries in context', async () => {
      const context = createMockContext(0, 2);
      const queryResponse = createMockQueryResponse(context);

      await generator.generate(queryResponse);

      const prompt = vi.mocked(mockGenerateAnswer).mock.calls[0][0];
      expect(prompt).toContain('Community');
      expect(prompt).toContain('Summary');
    });

    it('should include relations in context', async () => {
      const context = createMockContext(2, 0);
      context.relations = [
        {
          sourceId: 'e0',
          sourceName: 'Entity 0',
          targetId: 'e1',
          targetName: 'Entity 1',
          type: 'RELATED_TO',
          confidence: 0.9,
        },
      ];
      const queryResponse = createMockQueryResponse(context);

      await generator.generate(queryResponse);

      const prompt = vi.mocked(mockGenerateAnswer).mock.calls[0][0];
      expect(prompt).toContain('Entity 0');
      expect(prompt).toContain('Entity 1');
    });

    it('should respect maxContextLength', async () => {
      // Create context with many entities
      const context = createMockContext(100, 0);
      const queryResponse = createMockQueryResponse(context);

      const customGenerator = new ResponseGenerator(
        {
          llmClient: mockLLM,
          generateAnswer: mockGenerateAnswer,
        },
        { maxContextLength: 500 }
      );

      await customGenerator.generate(queryResponse);

      const prompt = vi.mocked(mockGenerateAnswer).mock.calls[0][0];
      // Prompt should be truncated to respect maxContextLength
      expect(prompt.length).toBeLessThan(1000); // Some buffer for system prompt
    });
  });

  describe('citation building', () => {
    it('should build citations from entities', async () => {
      const context = createMockContext(3, 0);
      const queryResponse = createMockQueryResponse(context);

      const result = await generator.generate(queryResponse);

      const entityCitations = result.citations.filter((c) => c.sourceType === 'entity');
      expect(entityCitations.length).toBe(3);
    });

    it('should build citations from communities', async () => {
      const context = createMockContext(0, 2);
      const queryResponse = createMockQueryResponse(context);

      const result = await generator.generate(queryResponse);

      const communityCitations = result.citations.filter(
        (c) => c.sourceType === 'community'
      );
      expect(communityCitations.length).toBe(2);
    });

    it('should sort citations by relevance', async () => {
      const context = createMockContext(3, 0);
      const queryResponse = createMockQueryResponse(context);

      const result = await generator.generate(queryResponse);

      for (let i = 0; i < result.citations.length - 1; i++) {
        expect(result.citations[i].relevance).toBeGreaterThanOrEqual(
          result.citations[i + 1].relevance
        );
      }
    });
  });

  describe('options', () => {
    it('should exclude citations when includeCitations is false', async () => {
      const context = createMockContext(3, 0);
      const queryResponse = createMockQueryResponse(context);

      const customGenerator = new ResponseGenerator(
        {
          llmClient: mockLLM,
          generateAnswer: mockGenerateAnswer,
        },
        { includeCitations: false }
      );

      const result = await customGenerator.generate(queryResponse);

      expect(result.citations).toHaveLength(0);
    });
  });
});
