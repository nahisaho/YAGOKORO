import { describe, expect, it } from 'vitest';
import { EntityId } from '../value-objects/EntityId.js';
import { Concept } from './Concept.js';

describe('Concept', () => {
  const createValidProps = () => ({
    name: 'Attention Mechanism',
    category: 'architecture' as const,
    description: 'A mechanism to focus on relevant parts of input',
    relatedTerms: ['self-attention', 'cross-attention', 'multi-head attention'],
  });

  describe('create', () => {
    it('should create a valid Concept', () => {
      const concept = Concept.create(createValidProps());

      expect(concept.name).toBe('Attention Mechanism');
      expect(concept.category).toBe('architecture');
      expect(concept.id.prefix).toBe('concept');
    });

    it('should require name', () => {
      const props = createValidProps();
      props.name = '';
      expect(() => Concept.create(props)).toThrow();
    });
  });

  describe('restore', () => {
    it('should restore a Concept from stored data', () => {
      const id = EntityId.create('concept');
      const concept = Concept.restore(id, createValidProps());

      expect(concept.id.equals(id)).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const concept = Concept.create(createValidProps());
      const json = concept.toJSON();

      expect(json.entityType).toBe('Concept');
      expect(json.name).toBe('Attention Mechanism');
    });
  });
});
