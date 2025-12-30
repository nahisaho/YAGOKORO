import { describe, expect, it } from 'vitest';
import { EntityId } from '../value-objects/EntityId.js';
import { Technique } from './Technique.js';

describe('Technique', () => {
  const createValidProps = () => ({
    name: 'Transformer',
    category: 'architecture' as const,
    description: 'Attention-based neural network architecture',
    paperUrl: 'https://arxiv.org/abs/1706.03762',
    year: '2017',
  });

  describe('create', () => {
    it('should create a valid Technique', () => {
      const tech = Technique.create(createValidProps());

      expect(tech.name).toBe('Transformer');
      expect(tech.category).toBe('architecture');
      expect(tech.id.prefix).toBe('tech');
    });

    it('should require name', () => {
      const props = createValidProps();
      props.name = '';
      expect(() => Technique.create(props)).toThrow();
    });
  });

  describe('restore', () => {
    it('should restore a Technique from stored data', () => {
      const id = EntityId.create('tech');
      const tech = Technique.restore(id, createValidProps());

      expect(tech.id.equals(id)).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const tech = Technique.create(createValidProps());
      const json = tech.toJSON();

      expect(json.entityType).toBe('Technique');
      expect(json.name).toBe('Transformer');
    });
  });
});
