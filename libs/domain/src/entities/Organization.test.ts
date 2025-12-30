import { describe, expect, it } from 'vitest';
import { EntityId } from '../value-objects/EntityId.js';
import { Organization, type OrganizationType } from './Organization.js';

describe('Organization', () => {
  const createValidProps = () => ({
    name: 'OpenAI',
    type: 'company' as OrganizationType,
    country: 'USA',
    founded: '2015',
    description: 'AI research and deployment company',
    websiteUrl: 'https://openai.com',
  });

  describe('create', () => {
    it('should create a valid Organization', () => {
      const org = Organization.create(createValidProps());

      expect(org.name).toBe('OpenAI');
      expect(org.type).toBe('company');
      expect(org.country).toBe('USA');
      expect(org.id.prefix).toBe('org');
    });

    it('should require name', () => {
      const props = createValidProps();
      props.name = '';
      expect(() => Organization.create(props)).toThrow();
    });
  });

  describe('restore', () => {
    it('should restore an Organization from stored data', () => {
      const id = EntityId.create('org');
      const org = Organization.restore(id, createValidProps());

      expect(org.id.equals(id)).toBe(true);
      expect(org.name).toBe('OpenAI');
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const org = Organization.create(createValidProps());
      const json = org.toJSON();

      expect(json.entityType).toBe('Organization');
      expect(json.name).toBe('OpenAI');
    });
  });
});
