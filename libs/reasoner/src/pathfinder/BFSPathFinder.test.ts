/**
 * BFSPathFinder Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BFSPathFinder } from './BFSPathFinder.js';
import type { Neo4jConnection, Neo4jRecord, PathQuery } from '../types.js';

describe('BFSPathFinder', () => {
  let finder: BFSPathFinder;
  let mockConnection: Neo4jConnection;

  const createMockRecord = (nodes: string[], hops: number): Neo4jRecord => ({
    get: vi.fn((key: string) => {
      if (key === 'path') {
        const segments = [];
        for (let i = 0; i < nodes.length - 1; i++) {
          segments.push({
            start: {
              identity: { toString: () => nodes[i] },
              labels: ['AIModel'],
              properties: { name: `Node ${nodes[i]}` },
            },
            end: {
              identity: { toString: () => nodes[i + 1] },
              labels: ['Technique'],
              properties: { name: `Node ${nodes[i + 1]}` },
            },
            relationship: {
              type: 'USES',
              properties: { confidence: 0.8 },
            },
          });
        }
        return { segments };
      }
      if (key === 'hops') return hops;
      if (key === 'totalWeight') return hops * 0.8;
      return null;
    }),
    has: vi.fn(() => true),
  });

  beforeEach(() => {
    mockConnection = {
      run: vi.fn().mockResolvedValue({ records: [] }),
    };
    finder = new BFSPathFinder(mockConnection);
  });

  describe('findPaths', () => {
    it('should find paths between two entities', async () => {
      const mockRecords = [
        createMockRecord(['1', '2', '3'], 2),
        createMockRecord(['1', '4', '5', '3'], 3),
      ];
      vi.mocked(mockConnection.run).mockResolvedValue({ records: mockRecords });

      const query: PathQuery = {
        startEntityType: 'AIModel',
        startEntityName: 'GPT4',
        endEntityType: 'Technique',
        endEntityName: 'CoT',
        maxHops: 4,
      };

      const result = await finder.findPaths(query);

      expect(result.paths).toHaveLength(2);
      expect(result.statistics.totalPaths).toBe(2);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should build correct Cypher query with relation filter', async () => {
      const query: PathQuery = {
        startEntityType: 'AIModel',
        startEntityName: 'GPT4',
        endEntityType: 'Technique',
        maxHops: 3,
        relationTypes: ['USES', 'IMPROVES'],
      };

      await finder.findPaths(query);

      const [cypher] = vi.mocked(mockConnection.run).mock.calls[0];
      expect(cypher).toContain(':USES|IMPROVES');
    });

    it('should build query with exclude relations', async () => {
      const query: PathQuery = {
        startEntityType: 'AIModel',
        endEntityType: 'Technique',
        maxHops: 3,
        excludeRelations: ['CITES'],
      };

      await finder.findPaths(query);

      const [cypher, params] = vi.mocked(mockConnection.run).mock.calls[0];
      expect(cypher).toContain('excludeRelations');
      expect(params?.excludeRelations).toEqual(['CITES']);
    });

    it('should filter out cyclic paths', async () => {
      // Path with cycle: 1 -> 2 -> 1
      const cyclicRecord = createMockRecord(['1', '2', '1'], 2);
      const acyclicRecord = createMockRecord(['1', '2', '3'], 2);
      vi.mocked(mockConnection.run).mockResolvedValue({
        records: [cyclicRecord, acyclicRecord],
      });

      const query: PathQuery = {
        startEntityType: 'Entity',
        endEntityType: 'Entity',
        maxHops: 3,
      };

      const result = await finder.findPaths(query);

      // Only non-cyclic path should remain
      expect(result.paths).toHaveLength(1);
    });

    it('should return empty result when no paths found', async () => {
      vi.mocked(mockConnection.run).mockResolvedValue({ records: [] });

      const query: PathQuery = {
        startEntityType: 'AIModel',
        startEntityName: 'NonExistent',
        endEntityType: 'Technique',
        maxHops: 4,
      };

      const result = await finder.findPaths(query);

      expect(result.paths).toHaveLength(0);
      expect(result.statistics.totalPaths).toBe(0);
    });

    it('should calculate statistics correctly', async () => {
      const mockRecords = [
        createMockRecord(['1', '2'], 1),
        createMockRecord(['1', '2', '3'], 2),
        createMockRecord(['1', '2', '3'], 2),
        createMockRecord(['1', '2', '3', '4'], 3),
      ];
      vi.mocked(mockConnection.run).mockResolvedValue({ records: mockRecords });

      const query: PathQuery = {
        startEntityType: 'Entity',
        endEntityType: 'Entity',
        maxHops: 5,
      };

      const result = await finder.findPaths(query);

      expect(result.statistics.totalPaths).toBe(4);
      expect(result.statistics.minHops).toBe(1);
      expect(result.statistics.maxHops).toBe(3);
      expect(result.statistics.averageHops).toBe(2);
      expect(result.statistics.pathsByHops).toEqual({ 1: 1, 2: 2, 3: 1 });
    });
  });

  describe('findWeightedPaths', () => {
    it('should find weighted paths with default weight function', async () => {
      const mockRecords = [
        createMockRecord(['1', '2', '3'], 2),
      ];
      vi.mocked(mockConnection.run).mockResolvedValue({ records: mockRecords });

      const query: PathQuery = {
        startEntityType: 'AIModel',
        endEntityType: 'Technique',
        maxHops: 3,
      };

      const result = await finder.findWeightedPaths(query);

      expect(result.paths).toHaveLength(1);
      expect(result.paths[0].totalWeight).toBeGreaterThan(0);
    });

    it('should use custom weight function', async () => {
      const mockRecords = [
        createMockRecord(['1', '2', '3'], 2),
      ];
      vi.mocked(mockConnection.run).mockResolvedValue({ records: mockRecords });

      const query: PathQuery = {
        startEntityType: 'AIModel',
        endEntityType: 'Technique',
        maxHops: 3,
      };

      const customWeight = () => 1.0;
      const result = await finder.findWeightedPaths(query, customWeight);

      // 2 relations with weight 1.0 each = 2.0
      expect(result.paths[0].totalWeight).toBe(2.0);
    });

    it('should sort paths by weight descending', async () => {
      const mockRecords = [
        createMockRecord(['1', '2'], 1),
        createMockRecord(['1', '2', '3'], 2),
      ];
      vi.mocked(mockConnection.run).mockResolvedValue({ records: mockRecords });

      const query: PathQuery = {
        startEntityType: 'Entity',
        endEntityType: 'Entity',
        maxHops: 3,
      };

      const result = await finder.findWeightedPaths(query);

      // More relations = higher weight
      expect(result.paths[0].hops).toBe(2);
      expect(result.paths[1].hops).toBe(1);
    });
  });

  describe('batchFindPaths', () => {
    it('should process multiple pairs', async () => {
      const mockRecords = [createMockRecord(['1', '2'], 1)];
      vi.mocked(mockConnection.run).mockResolvedValue({ records: mockRecords });

      const pairs = [
        { source: 'GPT4', target: 'CoT' },
        { source: 'BERT', target: 'NER' },
      ];

      const result = await finder.batchFindPaths(pairs);

      expect(result.totalPairs).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(result.results.size).toBe(2);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(mockConnection.run)
        .mockResolvedValueOnce({ records: [createMockRecord(['1', '2'], 1)] })
        .mockRejectedValueOnce(new Error('Connection failed'));

      const pairs = [
        { source: 'GPT4', target: 'CoT' },
        { source: 'Error', target: 'Case' },
      ];

      const result = await finder.batchFindPaths(pairs);

      expect(result.totalPairs).toBe(2);
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(1);
      expect(result.errors[0].error).toContain('Connection failed');
    });

    it('should respect maxConcurrency option', async () => {
      vi.mocked(mockConnection.run).mockResolvedValue({ records: [] });

      const pairs = Array.from({ length: 10 }, (_, i) => ({
        source: `S${i}`,
        target: `T${i}`,
      }));

      await finder.batchFindPaths(pairs, { maxConcurrency: 3 });

      // Should have been called 10 times
      expect(mockConnection.run).toHaveBeenCalledTimes(10);
    });

    it('should use provided maxHops option', async () => {
      vi.mocked(mockConnection.run).mockResolvedValue({ records: [] });

      const pairs = [{ source: 'A', target: 'B' }];

      await finder.batchFindPaths(pairs, { maxHops: 2 });

      const [cypher] = vi.mocked(mockConnection.run).mock.calls[0];
      expect(cypher).toContain('*1..2');
    });
  });

  describe('query building', () => {
    it('should handle Entity type without label', async () => {
      const query: PathQuery = {
        startEntityType: 'Entity',
        endEntityType: 'Entity',
        maxHops: 3,
      };

      await finder.findPaths(query);

      const [cypher] = vi.mocked(mockConnection.run).mock.calls[0];
      expect(cypher).not.toContain(':Entity');
    });

    it('should handle queries without names', async () => {
      const query: PathQuery = {
        startEntityType: 'AIModel',
        endEntityType: 'Technique',
        maxHops: 3,
      };

      await finder.findPaths(query);

      const [cypher, params] = vi.mocked(mockConnection.run).mock.calls[0];
      expect(cypher).not.toContain('$startName');
      expect(cypher).not.toContain('$endName');
      expect(params?.startName).toBeUndefined();
      expect(params?.endName).toBeUndefined();
    });
  });
});
