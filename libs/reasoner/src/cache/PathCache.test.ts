/**
 * PathCache Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PathCache } from './PathCache.js';
import type { PathQuery, PathResult } from '../types.js';

describe('PathCache', () => {
  let cache: PathCache;

  const createQuery = (startName?: string, endName?: string): PathQuery => ({
    startEntityType: 'AIModel',
    startEntityName: startName,
    endEntityType: 'Technique',
    endEntityName: endName,
    maxHops: 4,
  });

  const createResult = (pathCount: number): PathResult => ({
    paths: Array.from({ length: pathCount }, (_, i) => ({
      nodes: [
        { id: `${i}`, type: 'AIModel', name: `Model${i}`, properties: {} },
        { id: `${i + 100}`, type: 'Technique', name: `Tech${i}`, properties: {} },
      ],
      relations: [
        { type: 'USES', direction: 'outgoing', properties: {} },
      ],
      score: 1.0,
      hops: 1,
    })),
    statistics: {
      totalPaths: pathCount,
      averageHops: 1,
      minHops: 1,
      maxHops: 1,
      pathsByHops: { 1: pathCount },
    },
    executionTime: 100,
  });

  beforeEach(() => {
    cache = new PathCache({ maxSize: 100, ttlMs: 60000 });
  });

  describe('generateKey', () => {
    it('should generate consistent keys', () => {
      const query1 = createQuery('GPT4', 'CoT');
      const query2 = createQuery('GPT4', 'CoT');

      expect(cache.generateKey(query1)).toBe(cache.generateKey(query2));
    });

    it('should generate different keys for different queries', () => {
      const query1 = createQuery('GPT4', 'CoT');
      const query2 = createQuery('BERT', 'NER');

      expect(cache.generateKey(query1)).not.toBe(cache.generateKey(query2));
    });

    it('should handle queries without names', () => {
      const query = createQuery();

      const key = cache.generateKey(query);

      expect(key).toContain('*');
    });

    it('should sort relation types for consistent keys', () => {
      const query1: PathQuery = {
        ...createQuery(),
        relationTypes: ['USES', 'IMPROVES'],
      };
      const query2: PathQuery = {
        ...createQuery(),
        relationTypes: ['IMPROVES', 'USES'],
      };

      expect(cache.generateKey(query1)).toBe(cache.generateKey(query2));
    });
  });

  describe('get/set', () => {
    it('should store and retrieve results', () => {
      const query = createQuery('GPT4', 'CoT');
      const result = createResult(3);

      cache.set(query, result);
      const cached = cache.get(query);

      expect(cached).toBeDefined();
      expect(cached?.paths).toHaveLength(3);
      expect(cached?.fromCache).toBe(true);
      expect(cached?.cachedAt).toBeInstanceOf(Date);
    });

    it('should return undefined for cache miss', () => {
      const query = createQuery('NonExistent', 'Missing');

      const cached = cache.get(query);

      expect(cached).toBeUndefined();
    });

    it('should update hit/miss counters', () => {
      const query = createQuery('GPT4', 'CoT');
      const result = createResult(1);

      cache.get(query); // miss
      cache.get(query); // miss
      cache.set(query, result);
      cache.get(query); // hit
      cache.get(query); // hit

      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0.5); // 2 hits / 4 total
    });
  });

  describe('has', () => {
    it('should return true for cached query', () => {
      const query = createQuery('GPT4', 'CoT');
      cache.set(query, createResult(1));

      expect(cache.has(query)).toBe(true);
    });

    it('should return false for uncached query', () => {
      const query = createQuery('NonExistent');

      expect(cache.has(query)).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete cached entry', () => {
      const query = createQuery('GPT4', 'CoT');
      cache.set(query, createResult(1));

      expect(cache.delete(query)).toBe(true);
      expect(cache.has(query)).toBe(false);
    });

    it('should return false when entry does not exist', () => {
      const query = createQuery('NonExistent');

      expect(cache.delete(query)).toBe(false);
    });
  });

  describe('invalidate', () => {
    it('should clear all entries when no pattern provided', () => {
      cache.set(createQuery('GPT4', 'CoT'), createResult(1));
      cache.set(createQuery('BERT', 'NER'), createResult(1));

      const count = cache.invalidate();

      expect(count).toBe(2);
      expect(cache.getStats().size).toBe(0);
    });

    it('should invalidate entries matching pattern', () => {
      cache.set(createQuery('GPT4', 'CoT'), createResult(1));
      cache.set(createQuery('GPT4', 'NER'), createResult(1));
      cache.set(createQuery('BERT', 'NER'), createResult(1));

      const count = cache.invalidate('GPT4');

      expect(count).toBe(2);
      expect(cache.getStats().size).toBe(1);
    });
  });

  describe('invalidateByEntity', () => {
    it('should invalidate entries containing entity name', () => {
      cache.set(createQuery('GPT4', 'CoT'), createResult(1));
      cache.set(createQuery('BERT', 'CoT'), createResult(1));
      cache.set(createQuery('BERT', 'NER'), createResult(1));

      const count = cache.invalidateByEntity('CoT');

      expect(count).toBe(2);
    });
  });

  describe('invalidateByEntityType', () => {
    it('should invalidate entries with entity type', () => {
      cache.set(createQuery('GPT4', 'CoT'), createResult(1));
      cache.set(createQuery('BERT', 'NER'), createResult(1));

      const count = cache.invalidateByEntityType('AIModel');

      expect(count).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all entries and reset counters', () => {
      cache.set(createQuery('GPT4', 'CoT'), createResult(1));
      cache.get(createQuery('GPT4', 'CoT'));
      cache.get(createQuery('Missing'));

      cache.clear();

      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const stats = cache.getStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('hitRate');
      expect(stats.maxSize).toBe(100);
    });
  });

  describe('getKeys', () => {
    it('should return all cached keys', () => {
      cache.set(createQuery('GPT4', 'CoT'), createResult(1));
      cache.set(createQuery('BERT', 'NER'), createResult(1));

      const keys = cache.getKeys();

      expect(keys).toHaveLength(2);
    });
  });

  describe('getEntriesByEntityType', () => {
    it('should count entries by entity type', () => {
      cache.set(createQuery('GPT4', 'CoT'), createResult(1));
      cache.set(createQuery('BERT', 'NER'), createResult(1));

      const counts = cache.getEntriesByEntityType();

      expect(counts['AIModel']).toBe(2);
      expect(counts['Technique']).toBe(2);
    });
  });

  describe('warmUp', () => {
    it('should populate cache with fetched results', async () => {
      const queries = [
        createQuery('GPT4', 'CoT'),
        createQuery('BERT', 'NER'),
      ];
      const fetcher = vi.fn().mockResolvedValue(createResult(1));

      const count = await cache.warmUp(queries, fetcher);

      expect(count).toBe(2);
      expect(cache.getStats().size).toBe(2);
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('should skip already cached queries', async () => {
      const query = createQuery('GPT4', 'CoT');
      cache.set(query, createResult(1));

      const fetcher = vi.fn().mockResolvedValue(createResult(1));

      const count = await cache.warmUp([query], fetcher);

      expect(count).toBe(0);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should continue on fetch errors', async () => {
      const queries = [
        createQuery('GPT4', 'CoT'),
        createQuery('Error', 'Case'),
        createQuery('BERT', 'NER'),
      ];
      const fetcher = vi.fn()
        .mockResolvedValueOnce(createResult(1))
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(createResult(1));

      const count = await cache.warmUp(queries, fetcher);

      expect(count).toBe(2);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entries', () => {
      const smallCache = new PathCache({ maxSize: 2, ttlMs: 60000 });

      smallCache.set(createQuery('A'), createResult(1));
      smallCache.set(createQuery('B'), createResult(1));
      smallCache.get(createQuery('A')); // Access A to make B least recently used
      smallCache.set(createQuery('C'), createResult(1)); // Should evict B

      expect(smallCache.has(createQuery('A'))).toBe(true);
      expect(smallCache.has(createQuery('B'))).toBe(false);
      expect(smallCache.has(createQuery('C'))).toBe(true);
    });
  });
});
