import { describe, expect, it } from 'vitest';
import { type RelationType, isValidRelationType } from './RelationType.js';

describe('RelationType', () => {
  describe('isValidRelationType', () => {
    it('should return true for valid relation types', () => {
      const validTypes: RelationType[] = [
        'DEVELOPED_BY',
        'TRAINED_ON',
        'USES_TECHNIQUE',
        'SUCCESSOR_OF',
        'VARIANT_OF',
        'FINE_TUNED_FROM',
        'EVALUATED_ON',
        'DESCRIBED_IN',
        'AUTHORED',
        'INVENTED',
        'AFFILIATED_WITH',
        'CONTRIBUTED_TO',
        'COLLABORATED_WITH',
        'ACQUIRED',
        'FUNDED',
        'IMPROVES_UPON',
        'DERIVED_FROM',
        'APPLIED_IN',
        'INTRODUCED_IN',
        'RELATED_TO',
        'SUBCONCEPT_OF',
        'EXEMPLIFIED_BY',
        'CITES',
        'EXTENDS',
        'MEMBER_OF',
        'PARENT_COMMUNITY',
      ];

      for (const type of validTypes) {
        expect(isValidRelationType(type)).toBe(true);
      }
    });

    it('should return false for invalid relation types', () => {
      expect(isValidRelationType('INVALID_TYPE')).toBe(false);
      expect(isValidRelationType('')).toBe(false);
      expect(isValidRelationType('random')).toBe(false);
    });
  });
});
