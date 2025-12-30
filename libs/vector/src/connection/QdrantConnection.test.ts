import { describe, expect, it } from 'vitest';
import { QdrantConnection } from './QdrantConnection.js';

describe('QdrantConnection', () => {
  describe('constructor', () => {
    it('should create instance with required config', () => {
      const connection = new QdrantConnection({
        url: 'http://localhost:6333',
      });

      expect(connection).toBeDefined();
    });

    it('should create instance with optional apiKey', () => {
      const connection = new QdrantConnection({
        url: 'http://localhost:6333',
        apiKey: 'test-api-key',
      });

      expect(connection).toBeDefined();
    });
  });

  describe('factory methods', () => {
    it('should create from URL string', () => {
      const connection = QdrantConnection.fromUrl('http://localhost:6333');

      expect(connection).toBeDefined();
    });

    it('should create from environment variables', () => {
      const originalEnv = { ...process.env };
      process.env.QDRANT_URL = 'http://localhost:6333';

      const connection = QdrantConnection.fromEnv();
      expect(connection).toBeDefined();

      // Restore env
      process.env = originalEnv;
    });

    it('should throw if env variables missing', () => {
      const originalEnv = { ...process.env };
      process.env.QDRANT_URL = undefined;

      expect(() => QdrantConnection.fromEnv()).toThrow();

      process.env = originalEnv;
    });
  });

  describe('getUrl', () => {
    it('should return the configured URL', () => {
      const connection = new QdrantConnection({
        url: 'http://localhost:6333',
      });

      expect(connection.getUrl()).toBe('http://localhost:6333');
    });
  });
});
