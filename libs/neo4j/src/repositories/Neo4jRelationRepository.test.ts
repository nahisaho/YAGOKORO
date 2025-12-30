import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Neo4jConnection } from '../connection/Neo4jConnection.js';
import { Neo4jRelationRepository } from './Neo4jRelationRepository.js';

// Mock Neo4jConnection
vi.mock('../connection/Neo4jConnection.js', () => ({
  Neo4jConnection: vi.fn().mockImplementation(() => ({
    executeWrite: vi.fn(),
    executeRead: vi.fn(),
  })),
}));

describe('Neo4jRelationRepository', () => {
  let connection: Neo4jConnection;
  let repository: Neo4jRelationRepository;

  beforeEach(() => {
    connection = new Neo4jConnection({
      uri: 'bolt://localhost:7687',
      username: 'neo4j',
      password: 'password',
    });
    repository = new Neo4jRelationRepository(connection);
  });

  describe('create', () => {
    it('should create a relation between entities', async () => {
      const mockRelation = {
        r: {
          identity: { toString: () => '1' },
          type: 'DEVELOPED_BY',
          properties: {
            id: 'rel_123',
            confidence: 0.9,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
        sourceId: 'model_123',
        targetId: 'org_456',
      };

      vi.mocked(connection.executeWrite).mockResolvedValueOnce([mockRelation]);

      const result = await repository.create({
        type: 'DEVELOPED_BY',
        sourceId: 'model_123',
        targetId: 'org_456',
        confidence: 0.9,
      });

      expect(result.type).toBe('DEVELOPED_BY');
      expect(result.sourceId).toBe('model_123');
      expect(result.targetId).toBe('org_456');
    });
  });

  describe('findBySource', () => {
    it('should find relations by source entity', async () => {
      const mockRelations = [
        {
          r: {
            properties: {
              id: 'rel_1',
              confidence: 0.9,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            type: 'DEVELOPED_BY',
          },
          sourceId: 'model_123',
          targetId: 'org_456',
        },
      ];

      vi.mocked(connection.executeRead).mockResolvedValueOnce(mockRelations);

      const results = await repository.findBySource('model_123');

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('DEVELOPED_BY');
    });
  });

  describe('findByTarget', () => {
    it('should find relations by target entity', async () => {
      const mockRelations = [
        {
          r: {
            properties: {
              id: 'rel_1',
              confidence: 0.9,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            type: 'DEVELOPED_BY',
          },
          sourceId: 'model_123',
          targetId: 'org_456',
        },
      ];

      vi.mocked(connection.executeRead).mockResolvedValueOnce(mockRelations);

      const results = await repository.findByTarget('org_456');

      expect(results).toHaveLength(1);
    });
  });

  describe('getNeighbors', () => {
    it('should return neighbors of an entity', async () => {
      vi.mocked(connection.executeRead).mockResolvedValueOnce([
        { neighborId: 'org_456' },
        { neighborId: 'tech_789' },
      ]);

      const neighbors = await repository.getNeighbors('model_123');

      expect(neighbors).toHaveLength(2);
      expect(neighbors).toContain('org_456');
    });
  });

  describe('findShortestPath', () => {
    it('should find shortest path between entities', async () => {
      vi.mocked(connection.executeRead).mockResolvedValueOnce([
        {
          path: {
            segments: [
              {
                start: { properties: { id: 'model_123' } },
                end: { properties: { id: 'org_456' } },
                relationship: {
                  type: 'DEVELOPED_BY',
                  properties: { id: 'rel_1', confidence: 0.9 },
                },
              },
            ],
          },
        },
      ]);

      const path = await repository.findShortestPath('model_123', 'org_456');

      expect(path).not.toBeNull();
      expect(path?.nodes).toContain('model_123');
      expect(path?.nodes).toContain('org_456');
    });

    it('should return null if no path exists', async () => {
      vi.mocked(connection.executeRead).mockResolvedValueOnce([]);

      const path = await repository.findShortestPath('model_123', 'isolated_node');

      expect(path).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete relation and return true', async () => {
      vi.mocked(connection.executeWrite).mockResolvedValueOnce([{ deleted: 1 }]);

      const result = await repository.delete('rel_123');

      expect(result).toBe(true);
    });

    it('should return false if relation not found', async () => {
      vi.mocked(connection.executeWrite).mockResolvedValueOnce([{ deleted: 0 }]);

      const result = await repository.delete('nonexistent_rel');

      expect(result).toBe(false);
    });
  });
});
