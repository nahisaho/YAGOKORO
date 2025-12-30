/**
 * @fileoverview Tests for SchemaProvider
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SchemaProvider, type Neo4jConnectionPort } from '../src/schema-provider.js';
import type { GraphSchema } from '../src/types.js';

// Mock Neo4j connection
const createMockNeo4j = (
  overrides: Partial<Neo4jConnectionPort> = {}
): Neo4jConnectionPort => ({
  isConnected: vi.fn().mockReturnValue(true),
  executeRead: vi.fn().mockResolvedValue([]),
  ...overrides,
});

describe('SchemaProvider', () => {
  let mockNeo4j: Neo4jConnectionPort;
  let provider: SchemaProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNeo4j = createMockNeo4j();
    provider = new SchemaProvider(mockNeo4j);
  });

  describe('getSchema', () => {
    it('should fetch schema from Neo4j', async () => {
      const executeRead = vi.fn()
        .mockResolvedValueOnce([{ label: 'AIModel' }, { label: 'Person' }]) // labels
        .mockResolvedValueOnce([{ relationshipType: 'DEVELOPED_BY' }]) // relations
        .mockResolvedValueOnce([{ key: 'name' }, { key: 'releaseDate' }]) // AIModel properties
        .mockResolvedValueOnce([{ key: 'name' }, { key: 'affiliation' }]); // Person properties

      mockNeo4j = createMockNeo4j({ executeRead });
      provider = new SchemaProvider(mockNeo4j);

      const schema = await provider.getSchema();

      expect(schema.nodeLabels).toEqual(['AIModel', 'Person']);
      expect(schema.relationTypes).toEqual(['DEVELOPED_BY']);
      expect(schema.propertyKeys).toHaveProperty('AIModel');
      expect(schema.propertyKeys).toHaveProperty('Person');
    });

    it('should return cached schema on subsequent calls', async () => {
      const executeRead = vi.fn()
        .mockResolvedValueOnce([{ label: 'AIModel' }])
        .mockResolvedValueOnce([{ relationshipType: 'DEVELOPED_BY' }])
        .mockResolvedValueOnce([{ key: 'name' }]);

      mockNeo4j = createMockNeo4j({ executeRead });
      provider = new SchemaProvider(mockNeo4j);

      await provider.getSchema();
      await provider.getSchema();

      // Should only call Neo4j once (3 queries for first call)
      expect(executeRead).toHaveBeenCalledTimes(3);
    });

    it('should refresh cache after TTL expires', async () => {
      const executeRead = vi.fn()
        .mockResolvedValueOnce([]) // labels (first call)
        .mockResolvedValueOnce([]) // relations (first call)
        .mockResolvedValueOnce([]) // labels (second call)
        .mockResolvedValueOnce([]); // relations (second call)

      mockNeo4j = createMockNeo4j({ executeRead });
      provider = new SchemaProvider(mockNeo4j, { cacheTTL: 100 }); // 100ms TTL

      await provider.getSchema();

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      await provider.getSchema();

      // Should call Neo4j twice (2 queries each time when no labels)
      expect(executeRead).toHaveBeenCalledTimes(4);
    });

    it('should throw if not connected', async () => {
      mockNeo4j = createMockNeo4j({ isConnected: vi.fn().mockReturnValue(false) });
      provider = new SchemaProvider(mockNeo4j);

      await expect(provider.getSchema()).rejects.toThrow('Not connected to Neo4j');
    });
  });

  describe('invalidateCache', () => {
    it('should force re-fetch on next getSchema call', async () => {
      const executeRead = vi.fn()
        .mockResolvedValueOnce([]) // labels (first call)
        .mockResolvedValueOnce([]) // relations (first call)
        .mockResolvedValueOnce([]) // labels (second call)
        .mockResolvedValueOnce([]); // relations (second call)
      mockNeo4j = createMockNeo4j({ executeRead });
      provider = new SchemaProvider(mockNeo4j);

      await provider.getSchema();
      provider.invalidateCache();
      await provider.getSchema();

      // Should call Neo4j twice (2 queries each time when no labels)
      expect(executeRead).toHaveBeenCalledTimes(4);
    });
  });

  describe('isCacheValid', () => {
    it('should return false when cache is empty', () => {
      expect(provider.isCacheValid()).toBe(false);
    });

    it('should return true after getSchema', async () => {
      const executeRead = vi.fn().mockResolvedValue([]);
      mockNeo4j = createMockNeo4j({ executeRead });
      provider = new SchemaProvider(mockNeo4j);

      await provider.getSchema();
      expect(provider.isCacheValid()).toBe(true);
    });

    it('should return false after invalidateCache', async () => {
      const executeRead = vi.fn().mockResolvedValue([]);
      mockNeo4j = createMockNeo4j({ executeRead });
      provider = new SchemaProvider(mockNeo4j);

      await provider.getSchema();
      provider.invalidateCache();
      expect(provider.isCacheValid()).toBe(false);
    });
  });

  describe('formatForPrompt', () => {
    it('should format schema as readable text', () => {
      const schema: GraphSchema = {
        nodeLabels: ['AIModel', 'Person'],
        relationTypes: ['DEVELOPED_BY', 'PUBLISHED_BY'],
        propertyKeys: {
          AIModel: ['name', 'releaseDate', 'parameters'],
          Person: ['name', 'affiliation'],
        },
      };

      const formatted = provider.formatForPrompt(schema);

      expect(formatted).toContain('## ノードラベル (Node Labels)');
      expect(formatted).toContain('AIModel: [name, releaseDate, parameters]');
      expect(formatted).toContain('Person: [name, affiliation]');
      expect(formatted).toContain('## リレーションタイプ (Relation Types)');
      expect(formatted).toContain('DEVELOPED_BY');
      expect(formatted).toContain('PUBLISHED_BY');
    });

    it('should handle labels without properties', () => {
      const schema: GraphSchema = {
        nodeLabels: ['Unknown'],
        relationTypes: [],
        propertyKeys: {},
      };

      const formatted = provider.formatForPrompt(schema);

      expect(formatted).toContain('- Unknown');
      expect(formatted).not.toContain('Unknown:');
    });
  });

  describe('formatAsJson', () => {
    it('should return valid JSON', () => {
      const schema: GraphSchema = {
        nodeLabels: ['AIModel'],
        relationTypes: ['DEVELOPED_BY'],
        propertyKeys: { AIModel: ['name'] },
      };

      const json = provider.formatAsJson(schema);
      const parsed = JSON.parse(json);

      expect(parsed).toEqual(schema);
    });
  });
});
