import { AIModel, EntityId, Organization } from '@yagokoro/domain';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Neo4jConnection } from '../connection/Neo4jConnection.js';
import { Neo4jEntityRepository } from './Neo4jEntityRepository.js';

// Mock Neo4jConnection
vi.mock('../connection/Neo4jConnection.js', () => ({
  Neo4jConnection: vi.fn().mockImplementation(() => ({
    executeWrite: vi.fn(),
    executeRead: vi.fn(),
  })),
}));

// Helper to create valid EntityId strings
const createValidId = (prefix: string) => `${prefix}_12345678-1234-1234-1234-123456789abc`;

describe('Neo4jEntityRepository', () => {
  let connection: Neo4jConnection;
  let repository: Neo4jEntityRepository;

  beforeEach(() => {
    connection = new Neo4jConnection({
      uri: 'bolt://localhost:7687',
      username: 'neo4j',
      password: 'password',
    });
    repository = new Neo4jEntityRepository(connection);
  });

  describe('save', () => {
    it('should save an AIModel entity', async () => {
      const model = AIModel.create({
        name: 'GPT-4',
        category: 'llm',
        releaseYear: '2023',
        developer: 'OpenAI',
      });

      vi.mocked(connection.executeWrite).mockResolvedValueOnce([]);

      await repository.save(model);

      expect(connection.executeWrite).toHaveBeenCalled();
    });

    it('should save an Organization entity', async () => {
      const org = Organization.create({
        name: 'OpenAI',
        type: 'company',
        country: 'USA',
      });

      vi.mocked(connection.executeWrite).mockResolvedValueOnce([]);

      await repository.save(org);

      expect(connection.executeWrite).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return entity if found', async () => {
      const validId = createValidId('model');
      const mockRecord = {
        n: {
          properties: {
            id: validId,
            entityType: 'AIModel',
            name: 'GPT-4',
            category: 'llm',
            releaseYear: '2023',
            developer: 'OpenAI',
          },
        },
      };

      vi.mocked(connection.executeRead).mockResolvedValueOnce([mockRecord]);

      const id = EntityId.fromString(validId);
      const result = await repository.findById(id);

      expect(result).not.toBeNull();
      expect(result?.toJSON().name).toBe('GPT-4');
    });

    it('should return null if not found', async () => {
      vi.mocked(connection.executeRead).mockResolvedValueOnce([]);

      const id = EntityId.fromString(createValidId('model'));
      const result = await repository.findById(id);

      expect(result).toBeNull();
    });
  });

  describe('findByType', () => {
    it('should return entities of specified type', async () => {
      const mockRecords = [
        {
          n: {
            properties: {
              id: createValidId('model'),
              entityType: 'AIModel',
              name: 'GPT-4',
              category: 'llm',
            },
          },
        },
        {
          n: {
            properties: {
              id: createValidId('model'),
              entityType: 'AIModel',
              name: 'Claude',
              category: 'llm',
            },
          },
        },
      ];

      vi.mocked(connection.executeRead).mockResolvedValueOnce(mockRecords);

      const results = await repository.findByType('AIModel', 10, 0);

      expect(results).toHaveLength(2);
    });
  });

  describe('delete', () => {
    it('should delete entity and return true', async () => {
      vi.mocked(connection.executeWrite).mockResolvedValueOnce([{ deleted: 1 }]);

      const id = EntityId.fromString(createValidId('model'));
      const result = await repository.delete(id);

      expect(result).toBe(true);
    });

    it('should return false if entity not found', async () => {
      vi.mocked(connection.executeWrite).mockResolvedValueOnce([{ deleted: 0 }]);

      const id = EntityId.fromString(createValidId('model'));
      const result = await repository.delete(id);

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should return total count', async () => {
      vi.mocked(connection.executeRead).mockResolvedValueOnce([{ count: 42 }]);

      const count = await repository.count();

      expect(count).toBe(42);
    });

    it('should return count by entity type', async () => {
      vi.mocked(connection.executeRead).mockResolvedValueOnce([{ count: 10 }]);

      const count = await repository.count('AIModel');

      expect(count).toBe(10);
    });
  });
});
