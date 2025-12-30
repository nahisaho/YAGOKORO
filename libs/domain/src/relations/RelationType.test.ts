import { describe, expect, it } from 'vitest';
import {
  type RelationType,
  isValidRelationType,
  isValidReviewStatus,
  isValidExtractionMethod,
} from './RelationType.js';

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
        'SPECIALIZES_IN',
        'COLLABORATED_WITH',
        'ACQUIRED',
        'FUNDED',
        'COMPETES_WITH',
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
        'INFLUENCED_BY',
        'EVOLVED_INTO',
        'BASED_ON',
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

  describe('isValidReviewStatus', () => {
    it('should return true for valid review statuses', () => {
      expect(isValidReviewStatus('pending')).toBe(true);
      expect(isValidReviewStatus('approved')).toBe(true);
      expect(isValidReviewStatus('rejected')).toBe(true);
      expect(isValidReviewStatus('modified')).toBe(true);
    });

    it('should return false for invalid review statuses', () => {
      expect(isValidReviewStatus('INVALID')).toBe(false);
      expect(isValidReviewStatus('')).toBe(false);
    });
  });

  describe('isValidExtractionMethod', () => {
    it('should return true for valid extraction methods', () => {
      expect(isValidExtractionMethod('manual')).toBe(true);
      expect(isValidExtractionMethod('cooccurrence')).toBe(true);
      expect(isValidExtractionMethod('pattern')).toBe(true);
      expect(isValidExtractionMethod('llm')).toBe(true);
      expect(isValidExtractionMethod('hybrid')).toBe(true);
    });

    it('should return false for invalid extraction methods', () => {
      expect(isValidExtractionMethod('INVALID')).toBe(false);
      expect(isValidExtractionMethod('')).toBe(false);
    });
  });
});
