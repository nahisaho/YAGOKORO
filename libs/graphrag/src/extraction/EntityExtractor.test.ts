import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BaseLLMClient } from '../llm/BaseLLMClient.js';
import type { LLMCompletionResponse } from '../llm/types.js';
import { EntityExtractor } from './EntityExtractor.js';
import type { ExtractedEntity } from './types.js';

// Mock LLM client
const createMockLLMClient = (): BaseLLMClient => {
  return {
    chat: vi.fn(),
    chatStream: vi.fn(),
    embed: vi.fn(),
    embedMany: vi.fn(),
    getModelName: () => 'test-model',
    getEmbeddingDimension: () => 1536,
    provider: 'openai',
  } as unknown as BaseLLMClient;
};

const createMockResponse = (content: string): LLMCompletionResponse => ({
  id: 'test-id',
  model: 'test-model',
  created: Date.now(),
  choices: [
    {
      index: 0,
      message: { role: 'assistant', content },
      finishReason: 'stop',
    },
  ],
  get content() {
    return content;
  },
});

describe('EntityExtractor', () => {
  let extractor: EntityExtractor;
  let mockLLMClient: BaseLLMClient;

  beforeEach(() => {
    mockLLMClient = createMockLLMClient();
    extractor = new EntityExtractor(mockLLMClient);
  });

  describe('extract', () => {
    it('should extract entities from text', async () => {
      const mockEntities: ExtractedEntity[] = [
        {
          tempId: 'e1',
          type: 'AIModel',
          name: 'GPT-4',
          description: 'Large language model by OpenAI',
          confidence: 0.95,
        },
        {
          tempId: 'e2',
          type: 'Organization',
          name: 'OpenAI',
          description: 'AI research company',
          confidence: 0.98,
        },
      ];

      vi.mocked(mockLLMClient.chat).mockResolvedValueOnce(
        createMockResponse(JSON.stringify({ entities: mockEntities }))
      );

      const result = await extractor.extract(
        'GPT-4 is a large language model developed by OpenAI.'
      );

      expect(mockLLMClient.chat).toHaveBeenCalledOnce();
      expect(result.entities).toHaveLength(2);
      // Sorted by confidence (0.98 > 0.95)
      expect(result.entities[0].name).toBe('OpenAI');
      expect(result.entities[0].type).toBe('Organization');
      expect(result.entities[1].name).toBe('GPT-4');
      expect(result.entities[1].type).toBe('AIModel');
    });

    it('should filter entities by type', async () => {
      const mockEntities: ExtractedEntity[] = [
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

      vi.mocked(mockLLMClient.chat).mockResolvedValueOnce(
        createMockResponse(JSON.stringify({ entities: mockEntities }))
      );

      const result = await extractor.extract('GPT-4 is developed by OpenAI.', {
        entityTypes: ['AIModel'],
      });

      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].type).toBe('AIModel');
    });

    it('should filter entities by confidence threshold', async () => {
      const mockEntities: ExtractedEntity[] = [
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
          confidence: 0.6,
        },
      ];

      vi.mocked(mockLLMClient.chat).mockResolvedValueOnce(
        createMockResponse(JSON.stringify({ entities: mockEntities }))
      );

      const result = await extractor.extract('GPT-4 is developed by OpenAI.', {
        minConfidence: 0.8,
      });

      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].name).toBe('GPT-4');
    });

    it('should handle empty extraction result', async () => {
      vi.mocked(mockLLMClient.chat).mockResolvedValueOnce(
        createMockResponse(JSON.stringify({ entities: [] }))
      );

      const result = await extractor.extract('This text has no entities.');

      expect(result.entities).toHaveLength(0);
    });

    it('should handle malformed LLM response', async () => {
      vi.mocked(mockLLMClient.chat).mockResolvedValueOnce(createMockResponse('not valid json'));

      await expect(extractor.extract('Some text')).rejects.toThrow();
    });

    it('should include processing metadata', async () => {
      vi.mocked(mockLLMClient.chat).mockResolvedValueOnce(
        createMockResponse(JSON.stringify({ entities: [] }))
      );

      const result = await extractor.extract('Test text');

      expect(result.metadata).toBeDefined();
      expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.model).toBe('test-model');
    });

    it('should limit max entities', async () => {
      const mockEntities: ExtractedEntity[] = [
        { tempId: 'e1', type: 'AIModel', name: 'Model1', confidence: 0.9 },
        { tempId: 'e2', type: 'AIModel', name: 'Model2', confidence: 0.85 },
        { tempId: 'e3', type: 'AIModel', name: 'Model3', confidence: 0.8 },
      ];

      vi.mocked(mockLLMClient.chat).mockResolvedValueOnce(
        createMockResponse(JSON.stringify({ entities: mockEntities }))
      );

      const result = await extractor.extract('Multiple models', {
        maxEntities: 2,
      });

      expect(result.entities).toHaveLength(2);
      // Should keep highest confidence entities
      expect(result.entities[0].confidence).toBeGreaterThanOrEqual(result.entities[1].confidence);
    });
  });

  describe('extractBatch', () => {
    it('should extract entities from multiple chunks', async () => {
      vi.mocked(mockLLMClient.chat)
        .mockResolvedValueOnce(
          createMockResponse(
            JSON.stringify({
              entities: [{ tempId: 'e1', type: 'AIModel', name: 'GPT-4', confidence: 0.9 }],
            })
          )
        )
        .mockResolvedValueOnce(
          createMockResponse(
            JSON.stringify({
              entities: [{ tempId: 'e2', type: 'AIModel', name: 'Claude', confidence: 0.9 }],
            })
          )
        );

      const chunks = [
        { id: 'chunk1', content: 'GPT-4 is great' },
        { id: 'chunk2', content: 'Claude is also good' },
      ];

      const results = await extractor.extractBatch(chunks);

      expect(results).toHaveLength(2);
      expect(results[0].entities[0].name).toBe('GPT-4');
      expect(results[1].entities[0].name).toBe('Claude');
    });

    it('should process chunks with concurrency limit', async () => {
      const callOrder: number[] = [];
      let concurrentCalls = 0;
      let maxConcurrentCalls = 0;

      vi.mocked(mockLLMClient.chat).mockImplementation(async () => {
        concurrentCalls++;
        maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);
        callOrder.push(concurrentCalls);
        await new Promise((resolve) => setTimeout(resolve, 10));
        concurrentCalls--;
        return createMockResponse(JSON.stringify({ entities: [] }));
      });

      const chunks = Array.from({ length: 5 }, (_, i) => ({
        id: `chunk${i}`,
        content: `Text ${i}`,
      }));

      await extractor.extractBatch(chunks, {}, { concurrency: 2 });

      expect(maxConcurrentCalls).toBeLessThanOrEqual(2);
    });
  });

  describe('buildPrompt', () => {
    it('should include entity types in prompt when specified', async () => {
      vi.mocked(mockLLMClient.chat).mockResolvedValueOnce(
        createMockResponse(JSON.stringify({ entities: [] }))
      );

      await extractor.extract('Test', { entityTypes: ['AIModel', 'Person'] });

      const callArgs = vi.mocked(mockLLMClient.chat).mock.calls[0];
      const systemMessage = callArgs[0].find((m) => m.role === 'system');
      expect(systemMessage?.content).toContain('AIModel');
      expect(systemMessage?.content).toContain('Person');
    });
  });
});
