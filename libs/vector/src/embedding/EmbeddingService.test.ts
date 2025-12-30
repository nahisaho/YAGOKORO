import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmbeddingService } from './EmbeddingService.js';
import type { LLMClient, EmbeddingResponse } from '@yagokoro/domain';

// Mock LLMClient
const createMockLLMClient = () => ({
  chat: vi.fn(),
  embed: vi.fn(),
  embedMany: vi.fn(),
  getModelName: vi.fn().mockReturnValue('text-embedding-3-large'),
  getEmbeddingDimension: vi.fn().mockReturnValue(3072),
});

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let mockLLMClient: ReturnType<typeof createMockLLMClient>;

  beforeEach(() => {
    mockLLMClient = createMockLLMClient();
    service = new EmbeddingService(mockLLMClient as unknown as LLMClient);
    vi.clearAllMocks();
  });

  describe('embed', () => {
    it('should generate embedding for a text', async () => {
      const mockEmbedding: EmbeddingResponse = {
        embedding: new Array(3072).fill(0).map(() => Math.random()),
        dimension: 3072,
      };
      mockLLMClient.embed.mockResolvedValue(mockEmbedding);

      const result = await service.embed('Hello, world!');

      expect(result).toHaveLength(3072);
      expect(mockLLMClient.embed).toHaveBeenCalledWith('Hello, world!');
    });

    it('should use cache for repeated requests', async () => {
      const mockEmbedding: EmbeddingResponse = {
        embedding: new Array(3072).fill(0.5),
        dimension: 3072,
      };
      mockLLMClient.embed.mockResolvedValue(mockEmbedding);

      // Enable caching
      const cachedService = new EmbeddingService(mockLLMClient as unknown as LLMClient, {
        cacheEnabled: true,
      });

      const result1 = await cachedService.embed('Hello, world!');
      const result2 = await cachedService.embed('Hello, world!');

      expect(result1).toEqual(result2);
      expect(mockLLMClient.embed).toHaveBeenCalledTimes(1);
    });

    it('should not use cache when disabled', async () => {
      const mockEmbedding: EmbeddingResponse = {
        embedding: new Array(3072).fill(0.5),
        dimension: 3072,
      };
      mockLLMClient.embed.mockResolvedValue(mockEmbedding);

      const uncachedService = new EmbeddingService(mockLLMClient as unknown as LLMClient, {
        cacheEnabled: false,
      });

      await uncachedService.embed('Hello, world!');
      await uncachedService.embed('Hello, world!');

      expect(mockLLMClient.embed).toHaveBeenCalledTimes(2);
    });

    it('should handle empty text', async () => {
      const mockEmbedding: EmbeddingResponse = {
        embedding: new Array(3072).fill(0),
        dimension: 3072,
      };
      mockLLMClient.embed.mockResolvedValue(mockEmbedding);

      const result = await service.embed('');

      expect(result).toHaveLength(3072);
    });

    it('should throw on LLM error', async () => {
      mockLLMClient.embed.mockRejectedValue(new Error('API Error'));

      await expect(service.embed('test')).rejects.toThrow('API Error');
    });
  });

  describe('embedMany', () => {
    it('should generate embeddings for multiple texts', async () => {
      const mockEmbeddings: EmbeddingResponse[] = [
        { embedding: new Array(3072).fill(0.1), dimension: 3072 },
        { embedding: new Array(3072).fill(0.2), dimension: 3072 },
        { embedding: new Array(3072).fill(0.3), dimension: 3072 },
      ];
      mockLLMClient.embedMany.mockResolvedValue(mockEmbeddings);

      const texts = ['Text 1', 'Text 2', 'Text 3'];
      const results = await service.embedMany(texts);

      expect(results).toHaveLength(3);
      expect(results[0]).toHaveLength(3072);
      expect(mockLLMClient.embedMany).toHaveBeenCalledWith(texts);
    });

    it('should return empty array for empty input', async () => {
      const results = await service.embedMany([]);

      expect(results).toHaveLength(0);
      expect(mockLLMClient.embedMany).not.toHaveBeenCalled();
    });

    it('should batch large requests', async () => {
      const batchSize = 100;
      const texts = new Array(250).fill(0).map((_, i) => `Text ${i}`);

      // Mock responses for each batch
      mockLLMClient.embedMany.mockImplementation((batch: string[]) => {
        return Promise.resolve(
          batch.map(() => ({
            embedding: new Array(3072).fill(0.1),
            dimension: 3072,
          }))
        );
      });

      const batchedService = new EmbeddingService(mockLLMClient as unknown as LLMClient, {
        batchSize,
      });

      const results = await batchedService.embedMany(texts);

      expect(results).toHaveLength(250);
      // Should have made 3 batches: 100 + 100 + 50
      expect(mockLLMClient.embedMany).toHaveBeenCalledTimes(3);
    });
  });

  describe('getDimension', () => {
    it('should return the embedding dimension', () => {
      expect(service.getDimension()).toBe(3072);
      expect(mockLLMClient.getEmbeddingDimension).toHaveBeenCalled();
    });
  });

  describe('getModelName', () => {
    it('should return the model name', () => {
      expect(service.getModelName()).toBe('text-embedding-3-large');
      expect(mockLLMClient.getModelName).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear the embedding cache', async () => {
      const mockEmbedding: EmbeddingResponse = {
        embedding: new Array(3072).fill(0.5),
        dimension: 3072,
      };
      mockLLMClient.embed.mockResolvedValue(mockEmbedding);

      const cachedService = new EmbeddingService(mockLLMClient as unknown as LLMClient, {
        cacheEnabled: true,
      });

      await cachedService.embed('Hello');
      expect(mockLLMClient.embed).toHaveBeenCalledTimes(1);

      cachedService.clearCache();

      await cachedService.embed('Hello');
      expect(mockLLMClient.embed).toHaveBeenCalledTimes(2);
    });
  });

  describe('normalizeEmbedding', () => {
    it('should normalize embedding to unit vector', () => {
      const embedding = [3, 4]; // 3-4-5 right triangle
      const normalized = service.normalizeEmbedding(embedding);

      expect(normalized[0]).toBeCloseTo(0.6);
      expect(normalized[1]).toBeCloseTo(0.8);

      // Check unit length
      const length = Math.sqrt(normalized[0] ** 2 + normalized[1] ** 2);
      expect(length).toBeCloseTo(1);
    });

    it('should handle zero vector', () => {
      const embedding = [0, 0, 0];
      const normalized = service.normalizeEmbedding(embedding);

      expect(normalized).toEqual([0, 0, 0]);
    });
  });

  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity between two embeddings', () => {
      const a = [1, 0, 0];
      const b = [1, 0, 0];

      const similarity = service.cosineSimilarity(a, b);

      expect(similarity).toBeCloseTo(1);
    });

    it('should return 0 for orthogonal vectors', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];

      const similarity = service.cosineSimilarity(a, b);

      expect(similarity).toBeCloseTo(0);
    });

    it('should return -1 for opposite vectors', () => {
      const a = [1, 0, 0];
      const b = [-1, 0, 0];

      const similarity = service.cosineSimilarity(a, b);

      expect(similarity).toBeCloseTo(-1);
    });

    it('should throw for vectors of different lengths', () => {
      const a = [1, 0, 0];
      const b = [1, 0];

      expect(() => service.cosineSimilarity(a, b)).toThrow('must have the same length');
    });
  });
});
