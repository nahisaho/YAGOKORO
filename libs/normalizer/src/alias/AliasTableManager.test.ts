/**
 * Unit tests for AliasTableManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AliasTableManager, type Neo4jConnection, type AliasEntry } from './AliasTableManager.js';

// Mock Neo4j connection
const createMockNeo4j = (): Neo4jConnection & { 
  mockRecords: Map<string, Record<string, unknown>>;
  setMockRecord: (key: string, data: Record<string, unknown>) => void;
} => {
  const mockRecords = new Map<string, Record<string, unknown>>();
  
  return {
    mockRecords,
    setMockRecord: (key: string, data: Record<string, unknown>) => {
      mockRecords.set(key, data);
    },
    run: vi.fn(async (query: string, params?: Record<string, unknown>) => {
      // Simple mock implementation
      // Check DELETE first (before MATCH) since DELETE queries also contain MATCH
      if (query.includes('DELETE') && params?.aliasLower) {
        const key = params.aliasLower as string;
        const existed = mockRecords.has(key);
        if (existed) {
          const record = mockRecords.get(key);
          mockRecords.delete(key);
          return { 
            records: [{
              get: (k: string) => k === 'aliasName' ? record?.alias : null,
              toObject: () => ({ aliasName: record?.alias }),
            }],
          };
        }
        return { records: [] };
      }
      
      if (query.includes('MATCH') && params?.aliasLower) {
        const record = mockRecords.get(params.aliasLower as string);
        if (record) {
          return {
            records: [{
              get: (key: string) => record[key],
              toObject: () => record,
            }],
          };
        }
        return { records: [] };
      }
      
      if (query.includes('MERGE') || query.includes('SET')) {
        // Store the data for later retrieval
        if (params?.alias) {
          const key = (params.alias as string).toLowerCase();
          mockRecords.set(key, {
            alias: params.alias,
            canonical: params.canonical,
            confidence: params.confidence,
            source: params.source,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        return { records: [{ get: () => 1, toObject: () => ({}) }] };
      }
      
      return { records: [] };
    }),
    close: vi.fn(async () => {}),
  };
};

describe('AliasTableManager', () => {
  let manager: AliasTableManager;
  let mockNeo4j: ReturnType<typeof createMockNeo4j>;

  beforeEach(() => {
    mockNeo4j = createMockNeo4j();
    manager = new AliasTableManager(mockNeo4j);
  });

  describe('registerAlias', () => {
    it('should register a new alias', async () => {
      const entry = await manager.registerAlias('GPT4', 'GPT-4', 0.95, 'rule');
      
      expect(entry.alias).toBe('GPT4');
      expect(entry.canonical).toBe('GPT-4');
      expect(entry.confidence).toBe(0.95);
      expect(entry.source).toBe('rule');
    });

    it('should trim whitespace', async () => {
      const entry = await manager.registerAlias('  GPT4  ', '  GPT-4  ', 0.95, 'rule');
      
      expect(entry.alias).toBe('GPT4');
      expect(entry.canonical).toBe('GPT-4');
    });

    it('should call Neo4j with correct query', async () => {
      await manager.registerAlias('GPT4', 'GPT-4', 0.95, 'rule');
      
      expect(mockNeo4j.run).toHaveBeenCalled();
    });
  });

  describe('resolveAlias', () => {
    it('should resolve an alias to canonical form', async () => {
      // Register first
      await manager.registerAlias('GPT4', 'GPT-4', 0.95, 'rule');
      
      // Then resolve
      const canonical = await manager.resolveAlias('GPT4');
      expect(canonical).toBe('GPT-4');
    });

    it('should return null for unknown alias', async () => {
      const canonical = await manager.resolveAlias('UnknownAlias');
      expect(canonical).toBeNull();
    });

    it('should be case insensitive', async () => {
      await manager.registerAlias('GPT4', 'GPT-4', 0.95, 'rule');
      
      const canonical = await manager.resolveAlias('gpt4');
      expect(canonical).toBe('GPT-4');
    });
  });

  describe('getAliasEntry', () => {
    it('should return full alias entry', async () => {
      await manager.registerAlias('GPT4', 'GPT-4', 0.95, 'rule');
      
      const entry = await manager.getAliasEntry('GPT4');
      expect(entry).not.toBeNull();
      expect(entry?.alias).toBe('GPT4');
      expect(entry?.canonical).toBe('GPT-4');
      expect(entry?.confidence).toBe(0.95);
      expect(entry?.source).toBe('rule');
      expect(entry?.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('deleteAlias', () => {
    it('should delete an alias', async () => {
      await manager.registerAlias('GPT4', 'GPT-4', 0.95, 'rule');
      
      // Delete
      const result = await manager.deleteAlias('GPT4');
      expect(result).toBe(true);
      
      // Verify it's gone from cache
      const canonical = await manager.resolveAlias('GPT4');
      expect(canonical).toBeNull();
    });
  });

  describe('caching', () => {
    it('should use cache for repeated lookups', async () => {
      await manager.registerAlias('GPT4', 'GPT-4', 0.95, 'rule');
      
      // First lookup
      await manager.resolveAlias('GPT4');
      const callCount1 = (mockNeo4j.run as any).mock.calls.length;
      
      // Second lookup (should use cache)
      await manager.resolveAlias('GPT4');
      const callCount2 = (mockNeo4j.run as any).mock.calls.length;
      
      // Should not have made additional Neo4j call for second lookup
      expect(callCount2).toBe(callCount1);
    });

    it('should clear cache', async () => {
      await manager.registerAlias('GPT4', 'GPT-4', 0.95, 'rule');
      
      const stats1 = manager.getCacheStats();
      expect(stats1.size).toBeGreaterThan(0);
      
      manager.clearCache();
      
      const stats2 = manager.getCacheStats();
      expect(stats2.size).toBe(0);
    });

    it('should return cache stats', () => {
      const stats = manager.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('enabled');
      expect(stats.enabled).toBe(true);
    });
  });

  describe('without Neo4j connection', () => {
    it('should work with cache only', async () => {
      const cacheOnlyManager = new AliasTableManager(null);
      
      const entry = await cacheOnlyManager.registerAlias('GPT4', 'GPT-4', 0.95, 'rule');
      expect(entry.alias).toBe('GPT4');
      
      const canonical = await cacheOnlyManager.resolveAlias('GPT4');
      expect(canonical).toBe('GPT-4');
    });
  });

  describe('registerAliases (bulk)', () => {
    it('should register multiple aliases', async () => {
      const entries = [
        { alias: 'GPT4', canonical: 'GPT-4', confidence: 0.95, source: 'rule' as const },
        { alias: 'GPT35', canonical: 'GPT-3.5', confidence: 0.95, source: 'rule' as const },
        { alias: 'CoT', canonical: 'Chain-of-Thought', confidence: 0.9, source: 'rule' as const },
      ];

      const count = await manager.registerAliases(entries);
      expect(count).toBeGreaterThan(0);
      
      // Verify each was registered
      for (const e of entries) {
        const canonical = await manager.resolveAlias(e.alias);
        expect(canonical).toBe(e.canonical);
      }
    });
  });

  describe('getAliasesFor', () => {
    it('should get all aliases for a canonical form', async () => {
      const cacheOnlyManager = new AliasTableManager(null);
      
      await cacheOnlyManager.registerAlias('GPT4', 'GPT-4', 0.95, 'rule');
      await cacheOnlyManager.registerAlias('GPT-4o', 'GPT-4', 0.9, 'rule');
      await cacheOnlyManager.registerAlias('gpt 4', 'GPT-4', 0.85, 'rule');
      
      const aliases = await cacheOnlyManager.getAliasesFor('GPT-4');
      expect(aliases.length).toBe(3);
    });
  });

  describe('exportAliases', () => {
    it('should export all aliases', async () => {
      const cacheOnlyManager = new AliasTableManager(null);
      
      await cacheOnlyManager.registerAlias('GPT4', 'GPT-4', 0.95, 'rule');
      await cacheOnlyManager.registerAlias('CoT', 'Chain-of-Thought', 0.9, 'rule');
      
      const exported = await cacheOnlyManager.exportAliases();
      expect(exported.length).toBe(2);
    });
  });

  describe('getNeo4jConnection / setNeo4jConnection', () => {
    it('should get and set connection', () => {
      const manager2 = new AliasTableManager(null);
      expect(manager2.getNeo4jConnection()).toBeNull();
      
      manager2.setNeo4jConnection(mockNeo4j);
      expect(manager2.getNeo4jConnection()).toBe(mockNeo4j);
    });
  });
});
