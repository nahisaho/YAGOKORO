import { describe, expect, it } from 'vitest';
import { EntityId } from '../value-objects/EntityId.js';
import { Publication, type PublicationType } from './Publication.js';

describe('Publication', () => {
  const createValidProps = () => ({
    title: 'Attention Is All You Need',
    type: 'paper' as PublicationType,
    venue: 'NeurIPS 2017',
    year: '2017',
    url: 'https://arxiv.org/abs/1706.03762',
    abstract: 'The dominant sequence transduction models...',
    citations: 50000,
  });

  describe('create', () => {
    it('should create a valid Publication', () => {
      const pub = Publication.create(createValidProps());

      expect(pub.title).toBe('Attention Is All You Need');
      expect(pub.type).toBe('paper');
      expect(pub.citations).toBe(50000);
      expect(pub.id.prefix).toBe('pub');
    });

    it('should require title', () => {
      const props = createValidProps();
      props.title = '';
      expect(() => Publication.create(props)).toThrow();
    });
  });

  describe('restore', () => {
    it('should restore a Publication from stored data', () => {
      const id = EntityId.create('pub');
      const pub = Publication.restore(id, createValidProps());

      expect(pub.id.equals(id)).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const pub = Publication.create(createValidProps());
      const json = pub.toJSON();

      expect(json.entityType).toBe('Publication');
      expect(json.title).toBe('Attention Is All You Need');
    });
  });
});
