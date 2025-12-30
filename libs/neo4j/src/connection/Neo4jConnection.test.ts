import { describe, expect, it } from 'vitest';
import { Neo4jConnection } from './Neo4jConnection.js';

describe('Neo4jConnection', () => {
  describe('constructor', () => {
    it('should create instance with required config', () => {
      const connection = new Neo4jConnection({
        uri: 'bolt://localhost:7687',
        username: 'neo4j',
        password: 'password',
      });

      expect(connection).toBeDefined();
    });

    it('should create instance with optional database', () => {
      const connection = new Neo4jConnection({
        uri: 'bolt://localhost:7687',
        username: 'neo4j',
        password: 'password',
        database: 'testdb',
      });

      expect(connection).toBeDefined();
    });
  });

  describe('factory methods', () => {
    it('should create from URI string', () => {
      const connection = Neo4jConnection.fromUri('bolt://localhost:7687', 'neo4j', 'password');

      expect(connection).toBeDefined();
    });

    it('should create from environment variables', () => {
      const originalEnv = { ...process.env };
      process.env.NEO4J_URI = 'bolt://localhost:7687';
      process.env.NEO4J_USERNAME = 'neo4j';
      process.env.NEO4J_PASSWORD = 'password';

      const connection = Neo4jConnection.fromEnv();
      expect(connection).toBeDefined();

      // Restore env
      process.env = originalEnv;
    });

    it('should throw if env variables missing', () => {
      const originalEnv = { ...process.env };
      process.env.NEO4J_URI = undefined;
      process.env.NEO4J_USERNAME = undefined;
      process.env.NEO4J_PASSWORD = undefined;

      expect(() => Neo4jConnection.fromEnv()).toThrow();

      process.env = originalEnv;
    });
  });

  describe('isConnected', () => {
    it('should return false before connect', () => {
      const connection = new Neo4jConnection({
        uri: 'bolt://localhost:7687',
        username: 'neo4j',
        password: 'password',
      });

      expect(connection.isConnected()).toBe(false);
    });
  });
});
