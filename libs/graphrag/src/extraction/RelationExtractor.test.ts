import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BaseLLMClient } from '../llm/BaseLLMClient.js';
import type { LLMCompletionResponse } from '../llm/types.js';
import { RelationExtractor } from './RelationExtractor.js';
import type { ExtractedEntity, ExtractedRelation } from './types.js';

// Mock LLM client
const mockLLMClient = {
  chat: vi.fn(),
  chatStream: vi.fn(),
  embed: vi.fn(),
  embedMany: vi.fn(),
  getModelName: vi.fn().mockReturnValue('gpt-4o'),
} as unknown as BaseLLMClient;

// Helper to create mock responses
const createMockResponse = (content: string): LLMCompletionResponse => ({
  content,
  model: 'gpt-4o',
  finishReason: 'stop',
  usage: {
    promptTokens: 100,
    completionTokens: 50,
    totalTokens: 150,
  },
});

describe('RelationExtractor', () => {
  let extractor: RelationExtractor;

  beforeEach(() => {
    vi.clearAllMocks();
    extractor = new RelationExtractor(mockLLMClient);
  });

  describe('extract', () => {
    it('should extract relations between entities', async () => {
      const entities: ExtractedEntity[] = [
        {
          tempId: 'e1',
          type: 'AIModel',
          name: 'GPT-4',
          confidence: 0.95,
        },
        {
          tempId: 'e2',
          type: 'Organization',
          name: 'OpenAI',
          confidence: 0.98,
        },
      ];

      const mockRelations: ExtractedRelation[] = [
        {
          tempId: 'r1',
          type: 'DEVELOPED_BY',
          sourceTempId: 'e1',
          targetTempId: 'e2',
          confidence: 0.95,
        },
      ];

      vi.mocked(mockLLMClient.chat).mockResolvedValueOnce(
        createMockResponse(JSON.stringify({ relations: mockRelations }))
      );

      const result = await extractor.extract(
        'GPT-4 is a large language model developed by OpenAI.',
        entities
      );

      expect(mockLLMClient.chat).toHaveBeenCalledOnce();
      expect(result.relations).toHaveLength(1);
      expect(result.relations[0].type).toBe('DEVELOPED_BY');
      expect(result.relations[0].sourceTempId).toBe('e1');
      expect(result.relations[0].targetTempId).toBe('e2');
    });

    it('should filter relations by type', async () => {
      const entities: ExtractedEntity[] = [
        { tempId: 'e1', type: 'AIModel', name: 'GPT-4', confidence: 0.95 },
        { tempId: 'e2', type: 'Organization', name: 'OpenAI', confidence: 0.98 },
        { tempId: 'e3', type: 'Technique', name: 'RLHF', confidence: 0.9 },
      ];

      const mockRelations: ExtractedRelation[] = [
        {
          tempId: 'r1',
          type: 'DEVELOPED_BY',
          sourceTempId: 'e1',
          targetTempId: 'e2',
          confidence: 0.95,
        },
        {
          tempId: 'r2',
          type: 'USES_TECHNIQUE',
          sourceTempId: 'e1',
          targetTempId: 'e3',
          confidence: 0.9,
        },
      ];

      vi.mocked(mockLLMClient.chat).mockResolvedValueOnce(
        createMockResponse(JSON.stringify({ relations: mockRelations }))
      );

      const result = await extractor.extract('GPT-4, developed by OpenAI, uses RLHF.', entities, {
        relationTypes: ['DEVELOPED_BY'],
      });

      expect(result.relations).toHaveLength(1);
      expect(result.relations[0].type).toBe('DEVELOPED_BY');
    });

    it('should filter relations by confidence threshold', async () => {
      const entities: ExtractedEntity[] = [
        { tempId: 'e1', type: 'AIModel', name: 'GPT-4', confidence: 0.95 },
        { tempId: 'e2', type: 'Organization', name: 'OpenAI', confidence: 0.98 },
        { tempId: 'e3', type: 'Technique', name: 'RLHF', confidence: 0.9 },
      ];

      const mockRelations: ExtractedRelation[] = [
        {
          tempId: 'r1',
          type: 'DEVELOPED_BY',
          sourceTempId: 'e1',
          targetTempId: 'e2',
          confidence: 0.95,
        },
        {
          tempId: 'r2',
          type: 'USES_TECHNIQUE',
          sourceTempId: 'e1',
          targetTempId: 'e3',
          confidence: 0.6,
        },
      ];

      vi.mocked(mockLLMClient.chat).mockResolvedValueOnce(
        createMockResponse(JSON.stringify({ relations: mockRelations }))
      );

      const result = await extractor.extract('GPT-4, developed by OpenAI, uses RLHF.', entities, {
        minConfidence: 0.8,
      });

      expect(result.relations).toHaveLength(1);
      expect(result.relations[0].type).toBe('DEVELOPED_BY');
    });

    it('should handle empty relations result', async () => {
      const entities: ExtractedEntity[] = [
        { tempId: 'e1', type: 'AIModel', name: 'GPT-4', confidence: 0.95 },
      ];

      vi.mocked(mockLLMClient.chat).mockResolvedValueOnce(
        createMockResponse(JSON.stringify({ relations: [] }))
      );

      const result = await extractor.extract('GPT-4 is an AI model.', entities);

      expect(result.relations).toHaveLength(0);
    });

    it('should handle malformed LLM response', async () => {
      const entities: ExtractedEntity[] = [
        { tempId: 'e1', type: 'AIModel', name: 'GPT-4', confidence: 0.95 },
      ];

      vi.mocked(mockLLMClient.chat).mockResolvedValueOnce(createMockResponse('invalid json {'));

      await expect(extractor.extract('Test', entities)).rejects.toThrow(
        'Failed to parse LLM response'
      );
    });

    it('should include processing metadata', async () => {
      const entities: ExtractedEntity[] = [
        { tempId: 'e1', type: 'AIModel', name: 'GPT-4', confidence: 0.95 },
      ];

      vi.mocked(mockLLMClient.chat).mockResolvedValueOnce(
        createMockResponse(JSON.stringify({ relations: [] }))
      );

      const result = await extractor.extract('Test text.', entities);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.model).toBe('gpt-4o');
      expect(result.metadata.tokenCount).toBe(150);
    });

    it('should validate entity references exist', async () => {
      const entities: ExtractedEntity[] = [
        { tempId: 'e1', type: 'AIModel', name: 'GPT-4', confidence: 0.95 },
        { tempId: 'e2', type: 'Organization', name: 'OpenAI', confidence: 0.98 },
      ];

      const mockRelations: ExtractedRelation[] = [
        {
          tempId: 'r1',
          type: 'DEVELOPED_BY',
          sourceTempId: 'e1',
          targetTempId: 'e2',
          confidence: 0.95,
        },
        {
          tempId: 'r2',
          type: 'UNKNOWN',
          sourceTempId: 'e1',
          targetTempId: 'e999',
          confidence: 0.8,
        }, // Invalid reference
      ];

      vi.mocked(mockLLMClient.chat).mockResolvedValueOnce(
        createMockResponse(JSON.stringify({ relations: mockRelations }))
      );

      const result = await extractor.extract('GPT-4 is developed by OpenAI.', entities);

      // Only valid relations should be returned
      expect(result.relations).toHaveLength(1);
      expect(result.relations[0].sourceTempId).toBe('e1');
      expect(result.relations[0].targetTempId).toBe('e2');
    });
  });

  describe('extractBatch', () => {
    it('should extract relations from multiple chunks', async () => {
      const chunks = [
        {
          id: 'chunk1',
          content: 'GPT-4 is developed by OpenAI.',
          entities: [
            { tempId: 'e1', type: 'AIModel', name: 'GPT-4', confidence: 0.95 } as ExtractedEntity,
            {
              tempId: 'e2',
              type: 'Organization',
              name: 'OpenAI',
              confidence: 0.98,
            } as ExtractedEntity,
          ],
        },
        {
          id: 'chunk2',
          content: 'Claude is developed by Anthropic.',
          entities: [
            { tempId: 'e3', type: 'AIModel', name: 'Claude', confidence: 0.95 } as ExtractedEntity,
            {
              tempId: 'e4',
              type: 'Organization',
              name: 'Anthropic',
              confidence: 0.98,
            } as ExtractedEntity,
          ],
        },
      ];

      const mockRelations1: ExtractedRelation[] = [
        {
          tempId: 'r1',
          type: 'DEVELOPED_BY',
          sourceTempId: 'e1',
          targetTempId: 'e2',
          confidence: 0.95,
        },
      ];
      const mockRelations2: ExtractedRelation[] = [
        {
          tempId: 'r2',
          type: 'DEVELOPED_BY',
          sourceTempId: 'e3',
          targetTempId: 'e4',
          confidence: 0.95,
        },
      ];

      vi.mocked(mockLLMClient.chat)
        .mockResolvedValueOnce(createMockResponse(JSON.stringify({ relations: mockRelations1 })))
        .mockResolvedValueOnce(createMockResponse(JSON.stringify({ relations: mockRelations2 })));

      const results = await extractor.extractBatch(chunks);

      expect(results).toHaveLength(2);
      expect(results[0].relations).toHaveLength(1);
      expect(results[1].relations).toHaveLength(1);
    });
  });

  describe('buildPrompt', () => {
    it('should include relation types in prompt when specified', async () => {
      const entities: ExtractedEntity[] = [
        { tempId: 'e1', type: 'AIModel', name: 'GPT-4', confidence: 0.95 },
      ];

      vi.mocked(mockLLMClient.chat).mockResolvedValueOnce(
        createMockResponse(JSON.stringify({ relations: [] }))
      );

      await extractor.extract('Test', entities, {
        relationTypes: ['DEVELOPED_BY', 'USES_TECHNIQUE'],
      });

      const callArgs = vi.mocked(mockLLMClient.chat).mock.calls[0];
      const systemMessage = callArgs[0].find((m) => m.role === 'system');
      expect(systemMessage?.content).toContain('DEVELOPED_BY');
      expect(systemMessage?.content).toContain('USES_TECHNIQUE');
    });

    it('should include entity context in prompt', async () => {
      const entities: ExtractedEntity[] = [
        { tempId: 'e1', type: 'AIModel', name: 'GPT-4', confidence: 0.95 },
        { tempId: 'e2', type: 'Organization', name: 'OpenAI', confidence: 0.98 },
      ];

      vi.mocked(mockLLMClient.chat).mockResolvedValueOnce(
        createMockResponse(JSON.stringify({ relations: [] }))
      );

      await extractor.extract('Test', entities);

      const callArgs = vi.mocked(mockLLMClient.chat).mock.calls[0];
      const userMessage = callArgs[0].find((m) => m.role === 'user');
      expect(userMessage?.content).toContain('GPT-4');
      expect(userMessage?.content).toContain('OpenAI');
      expect(userMessage?.content).toContain('e1');
      expect(userMessage?.content).toContain('e2');
    });
  });
});
