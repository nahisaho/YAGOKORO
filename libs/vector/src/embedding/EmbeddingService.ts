import type { LLMClient } from '@yagokoro/domain';
import { ValidationError } from '@yagokoro/domain';

/**
 * Embedding service configuration
 */
export interface EmbeddingServiceConfig {
  /**
   * Whether to cache embeddings (default: true)
   */
  cacheEnabled?: boolean;

  /**
   * Maximum cache size (default: 10000)
   */
  maxCacheSize?: number;

  /**
   * Batch size for embedMany (default: 100)
   */
  batchSize?: number;
}

/**
 * Embedding Service
 *
 * Provides text embedding functionality using an LLM client.
 * Includes caching, batching, and utility functions for embedding operations.
 */
export class EmbeddingService {
  private readonly cache: Map<string, number[]>;
  private readonly cacheEnabled: boolean;
  private readonly maxCacheSize: number;
  private readonly batchSize: number;

  constructor(
    private readonly llmClient: LLMClient,
    config?: EmbeddingServiceConfig
  ) {
    this.cacheEnabled = config?.cacheEnabled ?? true;
    this.maxCacheSize = config?.maxCacheSize ?? 10000;
    this.batchSize = config?.batchSize ?? 100;
    this.cache = new Map();
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    // Check cache first
    if (this.cacheEnabled) {
      const cacheKey = this.getCacheKey(text);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Generate embedding
    const response = await this.llmClient.embed(text);
    const embedding = response.embedding;

    // Store in cache
    if (this.cacheEnabled) {
      this.addToCache(text, embedding);
    }

    return embedding;
  }

  /**
   * Generate embeddings for multiple texts
   */
  async embedMany(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    // Check cache for existing embeddings
    const results: (number[] | null)[] = new Array(texts.length).fill(null);
    const uncachedTexts: { index: number; text: string }[] = [];

    if (this.cacheEnabled) {
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        if (text !== undefined) {
          const cacheKey = this.getCacheKey(text);
          const cached = this.cache.get(cacheKey);
          if (cached) {
            results[i] = cached;
          } else {
            uncachedTexts.push({ index: i, text });
          }
        }
      }
    } else {
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        if (text !== undefined) {
          uncachedTexts.push({ index: i, text });
        }
      }
    }

    // Generate embeddings for uncached texts in batches
    if (uncachedTexts.length > 0) {
      for (let i = 0; i < uncachedTexts.length; i += this.batchSize) {
        const batch = uncachedTexts.slice(i, i + this.batchSize);
        const batchTexts = batch.map((item) => item.text);

        const responses = await this.llmClient.embedMany(batchTexts);

        for (let j = 0; j < batch.length; j++) {
          const response = responses[j];
          const batchItem = batch[j];
          if (response && batchItem) {
            const embedding = response.embedding;
            results[batchItem.index] = embedding;

            // Store in cache
            if (this.cacheEnabled) {
              this.addToCache(batchItem.text, embedding);
            }
          }
        }
      }
    }

    return results as number[][];
  }

  /**
   * Get the embedding dimension
   */
  getDimension(): number {
    return this.llmClient.getEmbeddingDimension();
  }

  /**
   * Get the model name
   */
  getModelName(): string {
    return this.llmClient.getModelName();
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get current cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Normalize an embedding to unit length
   */
  normalizeEmbedding(embedding: number[]): number[] {
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));

    if (magnitude === 0) {
      return embedding;
    }

    return embedding.map((val) => val / magnitude);
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new ValidationError('Embeddings must have the same length', {
        aLength: a.length,
        bLength: b.length,
      });
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      const aVal = a[i];
      const bVal = b[i];
      if (aVal !== undefined && bVal !== undefined) {
        dotProduct += aVal * bVal;
        magnitudeA += aVal * aVal;
        magnitudeB += bVal * bVal;
      }
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Calculate euclidean distance between two embeddings
   */
  euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new ValidationError('Embeddings must have the same length', {
        aLength: a.length,
        bLength: b.length,
      });
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const aVal = a[i];
      const bVal = b[i];
      if (aVal !== undefined && bVal !== undefined) {
        const diff = aVal - bVal;
        sum += diff * diff;
      }
    }

    return Math.sqrt(sum);
  }

  /**
   * Get cache key for a text
   */
  private getCacheKey(text: string): string {
    // Simple hash-like key using text content
    return text.substring(0, 200);
  }

  /**
   * Add embedding to cache with LRU eviction
   */
  private addToCache(text: string, embedding: number[]): void {
    const cacheKey = this.getCacheKey(text);

    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(cacheKey, embedding);
  }
}
