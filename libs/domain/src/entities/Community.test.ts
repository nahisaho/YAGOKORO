import { describe, expect, it } from 'vitest';
import { EntityId } from '../value-objects/EntityId.js';
import { Community } from './Community.js';

describe('Community', () => {
  const createValidProps = () => ({
    name: 'Transformer Architecture Community',
    summary: 'Group of AI models based on Transformer architecture',
    level: 1,
    memberCount: 15,
    keyEntities: ['model_gpt4', 'model_claude', 'model_llama'],
  });

  describe('create', () => {
    it('should create a valid Community', () => {
      const community = Community.create(createValidProps());

      expect(community.name).toBe('Transformer Architecture Community');
      expect(community.level).toBe(1);
      expect(community.id.prefix).toBe('comm');
    });

    it('should require name', () => {
      const props = createValidProps();
      props.name = '';
      expect(() => Community.create(props)).toThrow();
    });

    it('should require non-negative level', () => {
      const props = createValidProps();
      props.level = -1;
      expect(() => Community.create(props)).toThrow();
    });
  });

  describe('restore', () => {
    it('should restore a Community from stored data', () => {
      const id = EntityId.create('comm');
      const community = Community.restore(id, createValidProps());

      expect(community.id.equals(id)).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const community = Community.create(createValidProps());
      const json = community.toJSON();

      expect(json.entityType).toBe('Community');
      expect(json.name).toBe('Transformer Architecture Community');
    });
  });
});
