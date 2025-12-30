/**
 * Path Cache
 *
 * LRU cache for path finding results with TTL support.
 * Implements ADR-002: Path Caching Strategy.
 */

import { LRUCache } from 'lru-cache';
import type {
  PathQuery,
  PathResult,
  CacheOptions,
  CacheStats,
  PathCacheInterface,
} from '../types.js';

/**
 * Cached path result with timestamp
 */
interface CachedPathResult {
  result: PathResult;
  timestamp: Date;
}

/**
 * LRU-based path cache with TTL
 */
export class PathCache implements PathCacheInterface {
  private cache: LRUCache<string, CachedPathResult>;
  private hits: number = 0;
  private misses: number = 0;

  constructor(options: CacheOptions = { maxSize: 1000, ttlMs: 3600000 }) {
    this.cache = new LRUCache({
      max: options.maxSize,
      ttl: options.ttlMs,
    });
  }

  /**
   * Generate a unique cache key from a query
   */
  generateKey(query: PathQuery): string {
    return JSON.stringify({
      start: `${query.startEntityType}:${query.startEntityName ?? '*'}`,
      end: `${query.endEntityType}:${query.endEntityName ?? '*'}`,
      maxHops: query.maxHops,
      relations: query.relationTypes?.slice().sort(),
      exclude: query.excludeRelations?.slice().sort(),
    });
  }

  /**
   * Get cached result for a query
   */
  get(query: PathQuery): PathResult | undefined {
    const key = this.generateKey(query);
    const cached = this.cache.get(key);

    if (cached) {
      this.hits++;
      return {
        ...cached.result,
        fromCache: true,
        cachedAt: cached.timestamp,
      };
    }

    this.misses++;
    return undefined;
  }

  /**
   * Store a result in the cache
   */
  set(query: PathQuery, result: PathResult): void {
    const key = this.generateKey(query);
    this.cache.set(key, {
      result,
      timestamp: new Date(),
    });
  }

  /**
   * Check if a query result is cached
   */
  has(query: PathQuery): boolean {
    const key = this.generateKey(query);
    return this.cache.has(key);
  }

  /**
   * Delete a specific cached result
   */
  delete(query: PathQuery): boolean {
    const key = this.generateKey(query);
    return this.cache.delete(key);
  }

  /**
   * Invalidate cache entries matching a pattern
   * @param pattern - Pattern to match against cache keys
   * @returns Number of entries invalidated
   */
  invalidate(pattern?: string): number {
    if (!pattern) {
      const size = this.cache.size;
      this.cache.clear();
      return size;
    }

    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Invalidate all entries containing a specific entity
   */
  invalidateByEntity(entityName: string): number {
    return this.invalidate(entityName);
  }

  /**
   * Invalidate all entries with a specific entity type
   */
  invalidateByEntityType(entityType: string): number {
    return this.invalidate(entityType);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Get detailed cache statistics
   */
  getDetailedStats(): DetailedCacheStats {
    return {
      ...this.getStats(),
      hits: this.hits,
      misses: this.misses,
      remainingTTL: this.cache.getRemainingTTL,
    };
  }

  /**
   * Get all cached keys (for debugging)
   */
  getKeys(): string[] {
    return [...this.cache.keys()];
  }

  /**
   * Get cached entries count by entity type
   */
  getEntriesByEntityType(): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const key of this.cache.keys()) {
      try {
        const parsed = JSON.parse(key) as { start: string; end: string };
        const startType = parsed.start.split(':')[0];
        const endType = parsed.end.split(':')[0];

        if (startType) {
          counts[startType] = (counts[startType] ?? 0) + 1;
        }
        if (endType && startType !== endType) {
          counts[endType] = (counts[endType] ?? 0) + 1;
        }
      } catch {
        // Ignore invalid keys
      }
    }

    return counts;
  }

  /**
   * Warm up cache with common queries
   */
  async warmUp(
    queries: PathQuery[],
    fetcher: (query: PathQuery) => Promise<PathResult>
  ): Promise<number> {
    let warmedCount = 0;

    for (const query of queries) {
      if (!this.has(query)) {
        try {
          const result = await fetcher(query);
          this.set(query, result);
          warmedCount++;
        } catch {
          // Ignore errors during warm-up
        }
      }
    }

    return warmedCount;
  }
}

/**
 * Extended cache statistics
 */
interface DetailedCacheStats extends CacheStats {
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Function to get remaining TTL */
  remainingTTL: LRUCache<string, CachedPathResult>['getRemainingTTL'];
}
