import { describe, expect, it } from 'vitest';
import { EntityId } from './EntityId.js';

describe('EntityId', () => {
  describe('create', () => {
    it('should create a valid EntityId with prefix and UUID', () => {
      const id = EntityId.create('model');
      expect(id.value).toMatch(/^model_[a-f0-9-]{36}$/);
    });

    it('should create different IDs for each call', () => {
      const id1 = EntityId.create('model');
      const id2 = EntityId.create('model');
      expect(id1.value).not.toBe(id2.value);
    });

    it('should support different prefixes', () => {
      const modelId = EntityId.create('model');
      const orgId = EntityId.create('org');
      const techId = EntityId.create('tech');

      expect(modelId.value).toMatch(/^model_/);
      expect(orgId.value).toMatch(/^org_/);
      expect(techId.value).toMatch(/^tech_/);
    });
  });

  describe('fromString', () => {
    it('should create EntityId from valid string', () => {
      const idStr = 'model_550e8400-e29b-41d4-a716-446655440000';
      const id = EntityId.fromString(idStr);
      expect(id.value).toBe(idStr);
    });

    it('should throw error for invalid format', () => {
      expect(() => EntityId.fromString('invalid')).toThrow();
      expect(() => EntityId.fromString('')).toThrow();
      expect(() => EntityId.fromString('model_invalid-uuid')).toThrow();
    });
  });

  describe('equals', () => {
    it('should return true for same ID', () => {
      const idStr = 'model_550e8400-e29b-41d4-a716-446655440000';
      const id1 = EntityId.fromString(idStr);
      const id2 = EntityId.fromString(idStr);
      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for different IDs', () => {
      const id1 = EntityId.create('model');
      const id2 = EntityId.create('model');
      expect(id1.equals(id2)).toBe(false);
    });
  });

  describe('prefix', () => {
    it('should extract prefix correctly', () => {
      const id = EntityId.create('model');
      expect(id.prefix).toBe('model');
    });
  });

  describe('uuid', () => {
    it('should extract UUID correctly', () => {
      const id = EntityId.create('model');
      expect(id.uuid).toMatch(/^[a-f0-9-]{36}$/);
    });
  });
});
