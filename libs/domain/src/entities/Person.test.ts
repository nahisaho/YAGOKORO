import { describe, expect, it } from 'vitest';
import { EntityId } from '../value-objects/EntityId.js';
import { Person } from './Person.js';

describe('Person', () => {
  const createValidProps = () => ({
    name: 'Ashish Vaswani',
    affiliation: 'Google Brain',
    country: 'USA',
    hIndex: 50,
    orcid: '0000-0001-2345-6789',
  });

  describe('create', () => {
    it('should create a valid Person', () => {
      const person = Person.create(createValidProps());

      expect(person.name).toBe('Ashish Vaswani');
      expect(person.affiliation).toBe('Google Brain');
      expect(person.id.prefix).toBe('person');
    });

    it('should require name', () => {
      const props = createValidProps();
      props.name = '';
      expect(() => Person.create(props)).toThrow();
    });
  });

  describe('restore', () => {
    it('should restore a Person from stored data', () => {
      const id = EntityId.create('person');
      const person = Person.restore(id, createValidProps());

      expect(person.id.equals(id)).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const person = Person.create(createValidProps());
      const json = person.toJSON();

      expect(json.entityType).toBe('Person');
      expect(json.name).toBe('Ashish Vaswani');
    });
  });
});
