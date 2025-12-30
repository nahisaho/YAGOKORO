/**
 * CitationAnalyzer Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CitationAnalyzer } from './CitationAnalyzer.js';
import type { Neo4jConnectionInterface, Neo4jRecord } from '../types.js';

// Mock Neo4j record
const createMockRecord = (data: Record<string, unknown>): Neo4jRecord => ({
  get: (key: string) => data[key],
  toObject: () => data,
});

// Mock Neo4j connection
const createMockConnection = (): Neo4jConnectionInterface => ({
  run: vi.fn().mockResolvedValue({ records: [] }),
  close: vi.fn().mockResolvedValue(undefined),
});

describe('CitationAnalyzer', () => {
  let analyzer: CitationAnalyzer;
  let mockConnection: Neo4jConnectionInterface;

  beforeEach(() => {
    mockConnection = createMockConnection();
    analyzer = new CitationAnalyzer({ neo4jConnection: mockConnection });
  });

  describe('analyzeCitationNetwork', () => {
    it('should return empty network when no data', async () => {
      const result = await analyzer.analyzeCitationNetwork();

      expect(result).toEqual({
        nodes: [],
        edges: [],
        clusters: [],
        totalCitations: 0,
        density: 0,
      });
    });

    it('should return network with nodes and edges', async () => {
      const mockRun = vi.fn();
      
      // First call: nodes
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({
            id: 'pub1',
            name: 'Publication 1',
            type: 'Publication',
            year: 2023,
            domain: 'AI',
            citationCount: 10,
          }),
          createMockRecord({
            id: 'pub2',
            name: 'Publication 2',
            type: 'Publication',
            year: 2024,
            domain: 'AI',
            citationCount: 5,
          }),
        ],
      });

      // Second call: edges
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({
            source: 'pub2',
            target: 'pub1',
            weight: 1,
            year: 2024,
          }),
        ],
      });

      // Third call: clusters
      mockRun.mockResolvedValueOnce({
        records: [],
      });

      mockConnection.run = mockRun;

      const result = await analyzer.analyzeCitationNetwork();

      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(result.totalCitations).toBe(1);
    });

    it('should filter by domain', async () => {
      await analyzer.analyzeCitationNetwork({ domain: 'AI' });

      expect(mockConnection.run).toHaveBeenCalledWith(
        expect.stringContaining('domain'),
        expect.objectContaining({ domain: 'AI' })
      );
    });

    it('should filter by year range', async () => {
      await analyzer.analyzeCitationNetwork({ minYear: 2020, maxYear: 2024 });

      expect(mockConnection.run).toHaveBeenCalledWith(
        expect.stringContaining('year'),
        expect.objectContaining({ minYear: 2020, maxYear: 2024 })
      );
    });

    it('should skip edges when includeEdges is false', async () => {
      const mockRun = vi.fn().mockResolvedValue({ records: [] });
      mockConnection.run = mockRun;

      await analyzer.analyzeCitationNetwork({ includeEdges: false });

      // Should only be called twice (nodes + clusters), not three times
      expect(mockRun).toHaveBeenCalledTimes(2);
    });
  });

  describe('getTopCited', () => {
    it('should return empty array when no publications', async () => {
      const result = await analyzer.getTopCited();

      expect(result).toEqual([]);
    });

    it('should return top cited publications', async () => {
      (mockConnection.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        records: [
          createMockRecord({
            entityId: 'pub1',
            entityName: 'Top Publication',
            entityType: 'Publication',
            citationCount: 5,
            citedByCount: 100,
          }),
          createMockRecord({
            entityId: 'pub2',
            entityName: 'Second Publication',
            entityType: 'Publication',
            citationCount: 3,
            citedByCount: 50,
          }),
        ],
      });

      const result = await analyzer.getTopCited(10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        entityId: 'pub1',
        entityName: 'Top Publication',
        entityType: 'Publication',
        citationCount: 5,
        citedByCount: 100,
        hIndex: 0,
        recentCitationGrowth: 0,
        crossDomainCitations: 0,
      });
    });

    it('should respect limit parameter', async () => {
      await analyzer.getTopCited(5);

      expect(mockConnection.run).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ limit: 5 })
      );
    });
  });

  describe('findCitationIslands', () => {
    it('should return empty array when no islands', async () => {
      const result = await analyzer.findCitationIslands();

      expect(result).toEqual([]);
    });

    it('should fall back to simple query when GDS unavailable', async () => {
      // First call fails (GDS not available)
      (mockConnection.run as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('GDS not available'))
        .mockResolvedValueOnce({
          records: [
            createMockRecord({ componentId: 0, size: 10 }),
          ],
        });

      const result = await analyzer.findCitationIslands();

      expect(result).toHaveLength(1);
      expect(result[0].size).toBe(10);
    });

    it('should return islands from GDS when available', async () => {
      (mockConnection.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        records: [
          createMockRecord({ componentId: 1, size: 3 }),
          createMockRecord({ componentId: 2, size: 2 }),
        ],
      });

      const result = await analyzer.findCitationIslands();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ componentId: 1, size: 3 });
    });
  });

  describe('getCitationMetrics', () => {
    it('should return null when entity not found', async () => {
      const result = await analyzer.getCitationMetrics('nonexistent');

      expect(result).toBeNull();
    });

    it('should return citation metrics for entity', async () => {
      const mockRun = vi.fn();
      
      // Main query
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({
            entityId: 'pub1',
            entityName: 'Test Publication',
            entityType: 'Publication',
            citationCount: 10,
            citedByCount: 50,
            recentCitations: 5,
            crossDomainCitations: 3,
          }),
        ],
      });

      // h-index query
      mockRun.mockResolvedValueOnce({
        records: [createMockRecord({ hIndex: 8 })],
      });

      mockConnection.run = mockRun;

      const result = await analyzer.getCitationMetrics('pub1');

      expect(result).toBeDefined();
      expect(result!.entityId).toBe('pub1');
      expect(result!.citedByCount).toBe(50);
      expect(result!.hIndex).toBe(8);
      expect(result!.recentCitationGrowth).toBe(0.1); // 5/50
    });
  });

  describe('calculateHIndex', () => {
    it('should return 0 when no citations', async () => {
      const result = await analyzer.calculateHIndex('pub1');

      expect(result).toBe(0);
    });

    it('should calculate h-index correctly', async () => {
      (mockConnection.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        records: [createMockRecord({ hIndex: 12 })],
      });

      const result = await analyzer.calculateHIndex('pub1');

      expect(result).toBe(12);
    });
  });

  describe('network density calculation', () => {
    it('should calculate density correctly', async () => {
      const mockRun = vi.fn();

      // 3 nodes
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({ id: 'p1', name: 'P1', type: 'Publication', citationCount: 1 }),
          createMockRecord({ id: 'p2', name: 'P2', type: 'Publication', citationCount: 1 }),
          createMockRecord({ id: 'p3', name: 'P3', type: 'Publication', citationCount: 1 }),
        ],
      });

      // 2 edges (out of possible 6 = 3*2)
      mockRun.mockResolvedValueOnce({
        records: [
          createMockRecord({ source: 'p1', target: 'p2', weight: 1 }),
          createMockRecord({ source: 'p2', target: 'p3', weight: 1 }),
        ],
      });

      // No clusters
      mockRun.mockResolvedValueOnce({ records: [] });

      mockConnection.run = mockRun;

      const result = await analyzer.analyzeCitationNetwork();

      // density = 2 / (3 * 2) = 2/6 ≈ 0.333
      expect(result.density).toBeCloseTo(0.333, 2);
    });

    it('should handle empty network', async () => {
      const result = await analyzer.analyzeCitationNetwork();

      expect(result.density).toBe(0);
    });
  });

  describe('Neo4j value conversion', () => {
    it('should handle Neo4j Integer objects', async () => {
      const neo4jInteger = {
        toNumber: () => 42,
      };

      (mockConnection.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        records: [
          createMockRecord({
            entityId: 'pub1',
            entityName: 'Test',
            entityType: 'Publication',
            citationCount: neo4jInteger,
            citedByCount: neo4jInteger,
          }),
        ],
      });

      const result = await analyzer.getTopCited();

      expect(result[0].citationCount).toBe(42);
    });

    it('should handle null values', async () => {
      (mockConnection.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        records: [
          createMockRecord({
            entityId: 'pub1',
            entityName: 'Test',
            entityType: 'Publication',
            citationCount: null,
            citedByCount: undefined,
          }),
        ],
      });

      const result = await analyzer.getTopCited();

      expect(result[0].citationCount).toBe(0);
      expect(result[0].citedByCount).toBe(0);
    });
  });
});
