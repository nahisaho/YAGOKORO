import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QdrantConnection } from '../connection/QdrantConnection.js';
import { QdrantVectorStore } from './QdrantVectorStore.js';

// Mock QdrantConnection and client
vi.mock('../connection/QdrantConnection.js', () => ({
  QdrantConnection: vi.fn().mockImplementation(() => ({
    getClient: vi.fn().mockReturnValue({
      upsert: vi.fn(),
      search: vi.fn(),
      retrieve: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      collectionExists: vi.fn(),
      createCollection: vi.fn(),
    }),
  })),
}));

describe('QdrantVectorStore', () => {
  let connection: QdrantConnection;
  let store: QdrantVectorStore;
  const collectionName = 'test_collection';

  beforeEach(() => {
    connection = new QdrantConnection({ url: 'http://localhost:6333' });
    store = new QdrantVectorStore(connection, collectionName);
  });

  describe('upsert', () => {
    it('should upsert a single vector', async () => {
      const client = connection.getClient();
      vi.mocked(client.upsert).mockResolvedValueOnce({ status: 'completed', operation_id: 1 });

      await store.upsert({
        id: 'vec_123',
        vector: [0.1, 0.2, 0.3],
        payload: { name: 'test' },
      });

      expect(client.upsert).toHaveBeenCalledWith(collectionName, {
        wait: true,
        points: [
          {
            id: 'vec_123',
            vector: [0.1, 0.2, 0.3],
            payload: { name: 'test' },
          },
        ],
      });
    });
  });

  describe('upsertMany', () => {
    it('should upsert multiple vectors', async () => {
      const client = connection.getClient();
      vi.mocked(client.upsert).mockResolvedValueOnce({ status: 'completed', operation_id: 1 });

      await store.upsertMany([
        { id: 'vec_1', vector: [0.1, 0.2], payload: { name: 'a' } },
        { id: 'vec_2', vector: [0.3, 0.4], payload: { name: 'b' } },
      ]);

      expect(client.upsert).toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should search for similar vectors', async () => {
      const client = connection.getClient();
      vi.mocked(client.search).mockResolvedValueOnce([
        { id: 'vec_1', score: 0.95, payload: { name: 'result1' } },
        { id: 'vec_2', score: 0.85, payload: { name: 'result2' } },
      ]);

      const results = await store.search([0.1, 0.2, 0.3], { limit: 10 });

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('vec_1');
      expect(results[0].score).toBe(0.95);
    });

    it('should apply score threshold filter', async () => {
      const client = connection.getClient();
      vi.mocked(client.search).mockResolvedValueOnce([
        { id: 'vec_1', score: 0.95, payload: {} },
        { id: 'vec_2', score: 0.65, payload: {} },
      ]);

      const results = await store.search([0.1, 0.2], { limit: 10, scoreThreshold: 0.8 });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('vec_1');
    });
  });

  describe('getById', () => {
    it('should return vector if found', async () => {
      const client = connection.getClient();
      vi.mocked(client.retrieve).mockResolvedValueOnce([
        { id: 'vec_123', vector: [0.1, 0.2, 0.3], payload: { name: 'test' } },
      ]);

      const result = await store.getById('vec_123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('vec_123');
      expect(result?.vector).toEqual([0.1, 0.2, 0.3]);
    });

    it('should return null if not found', async () => {
      const client = connection.getClient();
      vi.mocked(client.retrieve).mockResolvedValueOnce([]);

      const result = await store.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete vector and return true', async () => {
      const client = connection.getClient();
      vi.mocked(client.delete).mockResolvedValueOnce({ status: 'completed', operation_id: 1 });

      const result = await store.delete('vec_123');

      expect(result).toBe(true);
    });
  });

  describe('deleteMany', () => {
    it('should delete multiple vectors', async () => {
      const client = connection.getClient();
      vi.mocked(client.delete).mockResolvedValueOnce({ status: 'completed', operation_id: 1 });

      const result = await store.deleteMany(['vec_1', 'vec_2', 'vec_3']);

      expect(result).toBe(3);
    });
  });

  describe('count', () => {
    it('should return vector count', async () => {
      const client = connection.getClient();
      vi.mocked(client.count).mockResolvedValueOnce({ count: 42 });

      const count = await store.count();

      expect(count).toBe(42);
    });
  });

  describe('ensureCollection', () => {
    it('should create collection if not exists', async () => {
      const client = connection.getClient();
      vi.mocked(client.collectionExists).mockResolvedValueOnce({ exists: false });
      vi.mocked(client.createCollection).mockResolvedValueOnce(true);

      await store.ensureCollection(1536);

      expect(client.createCollection).toHaveBeenCalledWith(collectionName, {
        vectors: {
          size: 1536,
          distance: 'Cosine',
        },
      });
    });

    it('should not create collection if already exists', async () => {
      const client = connection.getClient();
      vi.mocked(client.collectionExists).mockResolvedValueOnce({ exists: true });

      await store.ensureCollection(1536);

      expect(client.createCollection).not.toHaveBeenCalled();
    });
  });
});
