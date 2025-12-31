/**
 * AffiliationTracker Unit Tests
 *
 * @description 所属機関追跡のテスト
 * @since v4.0.0
 * @see REQ-005-02
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AffiliationTracker,
  type AffiliationTrackerConfig,
  type AffiliationRecord,
  type AffiliationTimeline,
} from './AffiliationTracker.js';
import type { Affiliation } from '@yagokoro/domain';

describe('AffiliationTracker', () => {
  let tracker: AffiliationTracker;
  const defaultConfig: AffiliationTrackerConfig = {
    normalizeOrganizations: true,
    trackHistory: true,
    inferMissingDates: true,
  };

  beforeEach(() => {
    tracker = new AffiliationTracker(defaultConfig);
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const t = new AffiliationTracker();
      expect(t).toBeInstanceOf(AffiliationTracker);
    });

    it('should create instance with custom config', () => {
      const config: AffiliationTrackerConfig = {
        normalizeOrganizations: false,
        trackHistory: false,
        inferMissingDates: false,
      };
      const t = new AffiliationTracker(config);
      expect(t).toBeInstanceOf(AffiliationTracker);
    });
  });

  describe('trackAffiliation()', () => {
    it('should track a single affiliation', () => {
      const researcherId = 'r1';
      const affiliation: Affiliation = {
        organization: 'MIT',
        department: 'CSAIL',
        isPrimary: true,
        startDate: new Date('2020-01-01'),
      };

      const result = tracker.trackAffiliation(researcherId, affiliation);

      expect(result.researcherId).toBe(researcherId);
      expect(result.affiliations).toHaveLength(1);
      // Organization name is preserved (not normalized)
      expect(result.affiliations[0]!.organization).toBe('MIT');
    });

    it('should add new affiliations without duplicating', () => {
      const researcherId = 'r1';
      const aff1: Affiliation = {
        organization: 'MIT',
        isPrimary: true,
        startDate: new Date('2020-01-01'),
      };
      const aff2: Affiliation = {
        organization: 'Stanford',
        isPrimary: false,
        startDate: new Date('2022-01-01'),
      };

      tracker.trackAffiliation(researcherId, aff1);
      const result = tracker.trackAffiliation(researcherId, aff2);

      expect(result.affiliations).toHaveLength(2);
    });

    it('should update existing affiliation with new dates', () => {
      const researcherId = 'r1';
      const aff1: Affiliation = {
        organization: 'MIT',
        isPrimary: true,
        startDate: new Date('2020-01-01'),
      };
      const aff1Updated: Affiliation = {
        organization: 'MIT',
        isPrimary: true,
        startDate: new Date('2020-01-01'),
        endDate: new Date('2023-06-30'),
      };

      tracker.trackAffiliation(researcherId, aff1);
      const result = tracker.trackAffiliation(researcherId, aff1Updated);

      expect(result.affiliations).toHaveLength(1);
      expect(result.affiliations[0]!.endDate).toEqual(new Date('2023-06-30'));
    });

    it('should normalize organization names', () => {
      const researcherId = 'r1';
      const aff1: Affiliation = {
        organization: 'Massachusetts Institute of Technology',
        isPrimary: true,
      };
      const aff2: Affiliation = {
        organization: 'MIT',
        isPrimary: true,
      };

      tracker.trackAffiliation(researcherId, aff1);
      const result = tracker.trackAffiliation(researcherId, aff2);

      // Should be merged into one affiliation
      expect(result.affiliations).toHaveLength(1);
    });

    it('should track department changes within same organization', () => {
      const researcherId = 'r1';
      const aff1: Affiliation = {
        organization: 'MIT',
        department: 'Physics',
        isPrimary: true,
        startDate: new Date('2015-01-01'),
        endDate: new Date('2020-12-31'),
      };
      const aff2: Affiliation = {
        organization: 'MIT',
        department: 'CSAIL',
        isPrimary: true,
        startDate: new Date('2021-01-01'),
      };

      tracker.trackAffiliation(researcherId, aff1);
      const result = tracker.trackAffiliation(researcherId, aff2);

      // Should track as separate affiliations (different departments)
      expect(result.affiliations).toHaveLength(2);
    });
  });

  describe('trackAffiliationsFromPaper()', () => {
    it('should extract affiliations from paper authors', () => {
      const paper = {
        id: 'p1',
        publishedAt: new Date('2023-01-01'),
        authors: [
          {
            id: 'r1',
            name: 'Alice',
            affiliations: ['MIT'],
          },
          {
            id: 'r2',
            name: 'Bob',
            affiliations: ['Stanford'],
          },
        ],
      };

      const records = tracker.trackAffiliationsFromPaper(paper);

      expect(records).toHaveLength(2);
      expect(records.find((r) => r.researcherId === 'r1')).toBeDefined();
      expect(records.find((r) => r.researcherId === 'r2')).toBeDefined();
    });

    it('should use paper date as affiliation date hint', () => {
      const paperDate = new Date('2022-06-15');
      const paper = {
        id: 'p1',
        publishedAt: paperDate,
        authors: [
          {
            id: 'r1',
            name: 'Alice',
            affiliations: ['MIT'],
          },
        ],
      };

      const records = tracker.trackAffiliationsFromPaper(paper);

      // Should infer that affiliation was active at paper date
      expect(records[0]!.affiliations[0]!.startDate).toBeDefined();
    });

    it('should handle authors with multiple affiliations', () => {
      const paper = {
        id: 'p1',
        publishedAt: new Date('2023-01-01'),
        authors: [
          {
            id: 'r1',
            name: 'Alice',
            affiliations: ['MIT', 'Harvard Medical School'],
          },
        ],
      };

      const records = tracker.trackAffiliationsFromPaper(paper);

      expect(records[0]!.affiliations).toHaveLength(2);
    });

    it('should handle authors with no affiliations', () => {
      const paper = {
        id: 'p1',
        publishedAt: new Date('2023-01-01'),
        authors: [
          {
            id: 'r1',
            name: 'Alice',
            affiliations: [],
          },
        ],
      };

      const records = tracker.trackAffiliationsFromPaper(paper);

      // No affiliations = no records returned (author not tracked)
      expect(records).toHaveLength(0);
    });
  });

  describe('getTimeline()', () => {
    it('should return chronological affiliation timeline', () => {
      const researcherId = 'r1';
      tracker.trackAffiliation(researcherId, {
        organization: 'MIT',
        isPrimary: true,
        startDate: new Date('2015-01-01'),
        endDate: new Date('2018-12-31'),
      });
      tracker.trackAffiliation(researcherId, {
        organization: 'Google',
        isPrimary: true,
        startDate: new Date('2019-01-01'),
        endDate: new Date('2021-12-31'),
      });
      tracker.trackAffiliation(researcherId, {
        organization: 'OpenAI',
        isPrimary: true,
        startDate: new Date('2022-01-01'),
      });

      const timeline = tracker.getTimeline(researcherId);

      expect(timeline.entries).toHaveLength(3);
      expect(timeline.entries[0]!.organization).toBe('MIT');
      expect(timeline.entries[1]!.organization).toBe('Google');
      expect(timeline.entries[2]!.organization).toBe('OpenAI');
    });

    it('should identify current affiliation', () => {
      const researcherId = 'r1';
      tracker.trackAffiliation(researcherId, {
        organization: 'MIT',
        isPrimary: true,
        startDate: new Date('2020-01-01'),
        endDate: new Date('2022-12-31'),
      });
      tracker.trackAffiliation(researcherId, {
        organization: 'Stanford',
        isPrimary: true,
        startDate: new Date('2023-01-01'),
      });

      const timeline = tracker.getTimeline(researcherId);

      expect(timeline.currentAffiliation).toBeDefined();
      expect(timeline.currentAffiliation!.organization).toBe('Stanford');
    });

    it('should return empty timeline for unknown researcher', () => {
      const timeline = tracker.getTimeline('unknown-researcher');

      expect(timeline.entries).toHaveLength(0);
      expect(timeline.currentAffiliation).toBeUndefined();
    });

    it('should handle overlapping affiliations', () => {
      const researcherId = 'r1';
      // Primary and visiting positions at the same time
      tracker.trackAffiliation(researcherId, {
        organization: 'MIT',
        isPrimary: true,
        startDate: new Date('2020-01-01'),
      });
      tracker.trackAffiliation(researcherId, {
        organization: 'Stanford',
        isPrimary: false,
        position: 'Visiting Scholar',
        startDate: new Date('2022-06-01'),
        endDate: new Date('2022-08-31'),
      });

      const timeline = tracker.getTimeline(researcherId);

      expect(timeline.entries).toHaveLength(2);
      expect(timeline.hasOverlappingAffiliations).toBe(true);
    });
  });

  describe('getCurrentAffiliation()', () => {
    it('should return current primary affiliation', () => {
      const researcherId = 'r1';
      tracker.trackAffiliation(researcherId, {
        organization: 'MIT',
        isPrimary: true,
        startDate: new Date('2020-01-01'),
      });

      const current = tracker.getCurrentAffiliation(researcherId);

      expect(current).toBeDefined();
      expect(current!.organization).toBe('MIT');
    });

    it('should return undefined if no current affiliation', () => {
      const researcherId = 'r1';
      tracker.trackAffiliation(researcherId, {
        organization: 'MIT',
        isPrimary: true,
        startDate: new Date('2015-01-01'),
        endDate: new Date('2018-12-31'),
      });

      const current = tracker.getCurrentAffiliation(researcherId);

      expect(current).toBeUndefined();
    });

    it('should prefer primary affiliation over secondary', () => {
      const researcherId = 'r1';
      tracker.trackAffiliation(researcherId, {
        organization: 'Harvard',
        isPrimary: false,
        startDate: new Date('2020-01-01'),
      });
      tracker.trackAffiliation(researcherId, {
        organization: 'MIT',
        isPrimary: true,
        startDate: new Date('2020-01-01'),
      });

      const current = tracker.getCurrentAffiliation(researcherId);

      expect(current!.organization).toBe('MIT');
    });
  });

  describe('findResearchersByAffiliation()', () => {
    it('should find all researchers at an organization', () => {
      tracker.trackAffiliation('r1', {
        organization: 'MIT',
        isPrimary: true,
        startDate: new Date('2020-01-01'),
      });
      tracker.trackAffiliation('r2', {
        organization: 'MIT',
        isPrimary: true,
        startDate: new Date('2021-01-01'),
      });
      tracker.trackAffiliation('r3', {
        organization: 'Stanford',
        isPrimary: true,
        startDate: new Date('2020-01-01'),
      });

      const mitResearchers = tracker.findResearchersByAffiliation('MIT');

      expect(mitResearchers).toHaveLength(2);
      expect(mitResearchers).toContain('r1');
      expect(mitResearchers).toContain('r2');
    });

    it('should support partial organization name matching', () => {
      tracker.trackAffiliation('r1', {
        organization: 'Massachusetts Institute of Technology',
        isPrimary: true,
      });

      const results = tracker.findResearchersByAffiliation('Massachusetts');

      expect(results).toHaveLength(1);
      expect(results).toContain('r1');
    });

    it('should filter by time range when specified', () => {
      tracker.trackAffiliation('r1', {
        organization: 'MIT',
        isPrimary: true,
        startDate: new Date('2015-01-01'),
        endDate: new Date('2018-12-31'),
      });
      tracker.trackAffiliation('r2', {
        organization: 'MIT',
        isPrimary: true,
        startDate: new Date('2020-01-01'),
      });

      const currentMit = tracker.findResearchersByAffiliation('MIT', {
        asOf: new Date('2023-01-01'),
      });

      expect(currentMit).toHaveLength(1);
      expect(currentMit).toContain('r2');
    });
  });

  describe('normalizeOrganization()', () => {
    it('should normalize common abbreviations', () => {
      const mit1 = tracker.normalizeOrganization('MIT');
      const mit2 = tracker.normalizeOrganization('Massachusetts Institute of Technology');
      const mit3 = tracker.normalizeOrganization('M.I.T.');

      expect(mit1).toBe(mit2);
      expect(mit2).toBe(mit3);
    });

    it('should handle case insensitivity', () => {
      const org1 = tracker.normalizeOrganization('Stanford University');
      const org2 = tracker.normalizeOrganization('STANFORD UNIVERSITY');
      const org3 = tracker.normalizeOrganization('stanford university');

      expect(org1).toBe(org2);
      expect(org2).toBe(org3);
    });

    it('should trim whitespace and normalize spacing', () => {
      const org1 = tracker.normalizeOrganization('  Stanford   University  ');
      const org2 = tracker.normalizeOrganization('Stanford University');

      expect(org1).toBe(org2);
    });

    it('should preserve distinguishing details', () => {
      const berkeley = tracker.normalizeOrganization('UC Berkeley');
      const ucla = tracker.normalizeOrganization('UCLA');

      expect(berkeley).not.toBe(ucla);
    });
  });

  describe('inferAffiliationDates()', () => {
    it('should infer start date from first paper', () => {
      const paper1 = {
        id: 'p1',
        publishedAt: new Date('2020-01-01'),
        authors: [{ id: 'r1', name: 'Alice', affiliations: ['MIT'] }],
      };
      const paper2 = {
        id: 'p2',
        publishedAt: new Date('2022-01-01'),
        authors: [{ id: 'r1', name: 'Alice', affiliations: ['MIT'] }],
      };

      tracker.trackAffiliationsFromPaper(paper1);
      tracker.trackAffiliationsFromPaper(paper2);

      const timeline = tracker.getTimeline('r1');
      const mitAff = timeline.entries.find((e) => e.organization.includes('MIT'));

      expect(mitAff!.startDate!.getTime()).toBeLessThanOrEqual(new Date('2020-01-01').getTime());
    });

    it('should infer end date from affiliation change', () => {
      const paper1 = {
        id: 'p1',
        publishedAt: new Date('2020-01-01'),
        authors: [{ id: 'r1', name: 'Alice', affiliations: ['MIT'] }],
      };
      const paper2 = {
        id: 'p2',
        publishedAt: new Date('2023-01-01'),
        authors: [{ id: 'r1', name: 'Alice', affiliations: ['Stanford'] }],
      };

      tracker.trackAffiliationsFromPaper(paper1);
      tracker.trackAffiliationsFromPaper(paper2);
      tracker.inferAffiliationDates('r1');

      const timeline = tracker.getTimeline('r1');
      const mitAff = timeline.entries.find((e) => e.organization.includes('MIT'));

      // MIT affiliation should have inferred end date before Stanford start
      expect(mitAff!.endDate).toBeDefined();
    });
  });

  describe('getAffiliationStats()', () => {
    it('should calculate total tenure at organization', () => {
      tracker.trackAffiliation('r1', {
        organization: 'MIT',
        isPrimary: true,
        startDate: new Date('2015-01-01'),
        endDate: new Date('2020-12-31'),
      });

      const stats = tracker.getAffiliationStats('r1', 'MIT');

      expect(stats.tenureYears).toBeCloseTo(6, 0);
    });

    it('should count multiple stints at same organization', () => {
      // Use different departments to distinguish stints
      tracker.trackAffiliation('r1', {
        organization: 'MIT',
        department: 'Physics',
        isPrimary: true,
        startDate: new Date('2010-01-01'),
        endDate: new Date('2015-12-31'),
      });
      tracker.trackAffiliation('r1', {
        organization: 'MIT',
        department: 'CSAIL',
        isPrimary: true,
        startDate: new Date('2020-01-01'),
      });

      const stats = tracker.getAffiliationStats('r1', 'MIT');

      expect(stats.stintCount).toBe(2);
    });

    it('should return null stats for no affiliation', () => {
      const stats = tracker.getAffiliationStats('r1', 'Unknown Org');

      expect(stats.tenureYears).toBe(0);
      expect(stats.stintCount).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle affiliations with no dates', () => {
      tracker.trackAffiliation('r1', {
        organization: 'MIT',
        isPrimary: true,
      });

      const timeline = tracker.getTimeline('r1');

      expect(timeline.entries).toHaveLength(1);
    });

    it('should handle empty organization name', () => {
      tracker.trackAffiliation('r1', {
        organization: '',
        isPrimary: true,
      });

      const timeline = tracker.getTimeline('r1');

      // Should filter out empty organizations
      expect(timeline.entries).toHaveLength(0);
    });

    it('should handle very long organization names', () => {
      const longName = 'A'.repeat(500);

      tracker.trackAffiliation('r1', {
        organization: longName,
        isPrimary: true,
      });

      const timeline = tracker.getTimeline('r1');

      expect(timeline.entries).toHaveLength(1);
    });

    it('should handle special characters in organization names', () => {
      tracker.trackAffiliation('r1', {
        organization: 'INRIA - Sophia Antipolis',
        isPrimary: true,
      });
      tracker.trackAffiliation('r2', {
        organization: "King's College London",
        isPrimary: true,
      });

      const timeline1 = tracker.getTimeline('r1');
      const timeline2 = tracker.getTimeline('r2');

      expect(timeline1.entries).toHaveLength(1);
      expect(timeline2.entries).toHaveLength(1);
    });
  });
});
