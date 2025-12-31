/**
 * CareerAnalyzer Unit Tests
 *
 * @description 研究者キャリア分析のテスト
 * @since v4.0.0
 * @see REQ-005-02
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CareerAnalyzer,
  type CareerAnalyzerConfig,
  type CareerTimeline,
  type CareerMilestone,
  type CareerPhase,
} from './CareerAnalyzer.js';
import type { AffiliationTimeline } from './AffiliationTracker.js';
import type { ResearcherCitations } from './InfluenceCalculator.js';

describe('CareerAnalyzer', () => {
  let analyzer: CareerAnalyzer;
  const defaultConfig: CareerAnalyzerConfig = {
    earlyCareerYears: 5,
    midCareerYears: 15,
    seniorCareerYears: 25,
  };

  beforeEach(() => {
    analyzer = new CareerAnalyzer(defaultConfig);
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const a = new CareerAnalyzer();
      expect(a).toBeInstanceOf(CareerAnalyzer);
    });

    it('should create instance with custom config', () => {
      const config: CareerAnalyzerConfig = {
        earlyCareerYears: 3,
        midCareerYears: 10,
        seniorCareerYears: 20,
      };
      const a = new CareerAnalyzer(config);
      expect(a).toBeInstanceOf(CareerAnalyzer);
    });
  });

  describe('analyzeCareer()', () => {
    it('should analyze career from affiliations and citations', () => {
      const affiliations: AffiliationTimeline = {
        researcherId: 'r1',
        researcherName: 'John Doe',
        entries: [
          {
            organization: 'Stanford',
            normalizedOrganization: 'stanford university',
            startDate: new Date('2010-09-01'),
            endDate: new Date('2015-08-31'),
            department: 'CS',
            isCurrent: false,
          },
          {
            organization: 'MIT',
            normalizedOrganization: 'mit',
            startDate: new Date('2015-09-01'),
            isCurrent: true,
          },
        ],
        totalOrganizations: 2,
        currentOrganization: 'MIT',
      };

      const citations: ResearcherCitations = {
        researcherId: 'r1',
        papers: [
          { paperId: 'p1', citations: 100 },
          { paperId: 'p2', citations: 50 },
        ],
      };

      const career = analyzer.analyzeCareer(affiliations, citations);

      expect(career.researcherId).toBe('r1');
      expect(career.careerStartDate).toEqual(new Date('2010-09-01'));
      expect(career.totalYears).toBeGreaterThan(0);
      expect(career.currentPhase).toBeDefined();
    });

    it('should handle researcher with single affiliation', () => {
      const affiliations: AffiliationTimeline = {
        researcherId: 'r1',
        researcherName: 'Jane Doe',
        entries: [
          {
            organization: 'Harvard',
            normalizedOrganization: 'harvard university',
            startDate: new Date('2020-01-01'),
            isCurrent: true,
          },
        ],
        totalOrganizations: 1,
        currentOrganization: 'Harvard',
      };

      const citations: ResearcherCitations = {
        researcherId: 'r1',
        papers: [],
      };

      const career = analyzer.analyzeCareer(affiliations, citations);

      expect(career.totalYears).toBeGreaterThanOrEqual(0);
      expect(career.transitions).toHaveLength(0);
    });
  });

  describe('determinePhase()', () => {
    it('should determine early career phase', () => {
      const phase = analyzer.determinePhase(3);
      expect(phase).toBe('early');
    });

    it('should determine mid career phase', () => {
      const phase = analyzer.determinePhase(10);
      expect(phase).toBe('mid');
    });

    it('should determine senior career phase', () => {
      const phase = analyzer.determinePhase(20);
      expect(phase).toBe('senior');
    });

    it('should determine emeritus career phase', () => {
      const phase = analyzer.determinePhase(30);
      expect(phase).toBe('emeritus');
    });
  });

  describe('detectMilestones()', () => {
    it('should detect first publication milestone', () => {
      const citations: ResearcherCitations = {
        researcherId: 'r1',
        papers: [
          { paperId: 'p1', citations: 10 },
        ],
      };

      const milestones = analyzer.detectMilestones(
        citations,
        new Date('2020-01-01'),
        [{ paperId: 'p1', publishedDate: new Date('2021-01-01') }],
      );

      const firstPub = milestones.find((m) => m.type === 'first_publication');
      expect(firstPub).toBeDefined();
    });

    it('should detect high citation milestone', () => {
      const citations: ResearcherCitations = {
        researcherId: 'r1',
        papers: [
          { paperId: 'p1', citations: 150 },
        ],
      };

      const milestones = analyzer.detectMilestones(
        citations,
        new Date('2020-01-01'),
        [{ paperId: 'p1', publishedDate: new Date('2021-01-01') }],
      );

      const highCitation = milestones.find((m) => m.type === 'high_citation_paper');
      expect(highCitation).toBeDefined();
    });

    it('should detect h-index milestones', () => {
      const citations: ResearcherCitations = {
        researcherId: 'r1',
        papers: Array.from({ length: 15 }, (_, i) => ({
          paperId: `p${i}`,
          citations: 20 - i,
        })),
      };

      const milestones = analyzer.detectMilestones(
        citations,
        new Date('2020-01-01'),
        [],
      );

      const hIndex10 = milestones.find((m) => m.type === 'h_index_10');
      expect(hIndex10).toBeDefined();
    });
  });

  describe('detectTransitions()', () => {
    it('should detect career transitions between organizations', () => {
      const affiliations: AffiliationTimeline = {
        researcherId: 'r1',
        researcherName: 'Test',
        entries: [
          {
            organization: 'University A',
            normalizedOrganization: 'university a',
            startDate: new Date('2010-01-01'),
            endDate: new Date('2015-12-31'),
            isCurrent: false,
          },
          {
            organization: 'University B',
            normalizedOrganization: 'university b',
            startDate: new Date('2016-01-01'),
            endDate: new Date('2020-12-31'),
            isCurrent: false,
          },
          {
            organization: 'Industry Corp',
            normalizedOrganization: 'industry corp',
            startDate: new Date('2021-01-01'),
            isCurrent: true,
          },
        ],
        totalOrganizations: 3,
        currentOrganization: 'Industry Corp',
      };

      const transitions = analyzer.detectTransitions(affiliations);

      expect(transitions).toHaveLength(2);
      expect(transitions[0]!.fromOrganization).toBe('University A');
      expect(transitions[0]!.toOrganization).toBe('University B');
      expect(transitions[1]!.fromOrganization).toBe('University B');
      expect(transitions[1]!.toOrganization).toBe('Industry Corp');
    });

    it('should detect transition types', () => {
      const affiliations: AffiliationTimeline = {
        researcherId: 'r1',
        researcherName: 'Test',
        entries: [
          {
            organization: 'MIT',
            normalizedOrganization: 'mit',
            startDate: new Date('2015-01-01'),
            endDate: new Date('2020-12-31'),
            isCurrent: false,
          },
          {
            organization: 'Google',
            normalizedOrganization: 'google',
            startDate: new Date('2021-01-01'),
            isCurrent: true,
          },
        ],
        totalOrganizations: 2,
        currentOrganization: 'Google',
      };

      const transitions = analyzer.detectTransitions(affiliations);

      expect(transitions).toHaveLength(1);
      expect(transitions[0]!.type).toBe('academia_to_industry');
    });

    it('should return empty array for single affiliation', () => {
      const affiliations: AffiliationTimeline = {
        researcherId: 'r1',
        researcherName: 'Test',
        entries: [
          {
            organization: 'MIT',
            normalizedOrganization: 'mit',
            startDate: new Date('2020-01-01'),
            isCurrent: true,
          },
        ],
        totalOrganizations: 1,
        currentOrganization: 'MIT',
      };

      const transitions = analyzer.detectTransitions(affiliations);

      expect(transitions).toEqual([]);
    });
  });

  describe('calculateProductivity()', () => {
    it('should calculate papers per year', () => {
      const citations: ResearcherCitations = {
        researcherId: 'r1',
        papers: Array.from({ length: 20 }, (_, i) => ({
          paperId: `p${i}`,
          citations: 10,
        })),
      };

      const productivity = analyzer.calculateProductivity(citations, 10);

      expect(productivity.papersPerYear).toBe(2);
      expect(productivity.totalPapers).toBe(20);
    });

    it('should calculate citations per year', () => {
      const citations: ResearcherCitations = {
        researcherId: 'r1',
        papers: [
          { paperId: 'p1', citations: 100 },
          { paperId: 'p2', citations: 50 },
        ],
      };

      const productivity = analyzer.calculateProductivity(citations, 5);

      expect(productivity.citationsPerYear).toBe(30);
      expect(productivity.totalCitations).toBe(150);
    });

    it('should handle zero years gracefully', () => {
      const citations: ResearcherCitations = {
        researcherId: 'r1',
        papers: [{ paperId: 'p1', citations: 10 }],
      };

      const productivity = analyzer.calculateProductivity(citations, 0);

      expect(productivity.papersPerYear).toBe(0);
    });
  });

  describe('compareCareer()', () => {
    it('should compare two researchers careers', () => {
      const career1: CareerTimeline = {
        researcherId: 'r1',
        researcherName: 'Senior Prof',
        careerStartDate: new Date('2000-01-01'),
        totalYears: 24,
        currentPhase: 'senior',
        currentOrganization: 'MIT',
        milestones: [],
        transitions: [],
        productivity: {
          totalPapers: 100,
          totalCitations: 5000,
          papersPerYear: 4.2,
          citationsPerYear: 208,
          hIndex: 40,
          i10Index: 80,
        },
      };

      const career2: CareerTimeline = {
        researcherId: 'r2',
        researcherName: 'Junior Prof',
        careerStartDate: new Date('2018-01-01'),
        totalYears: 6,
        currentPhase: 'early',
        currentOrganization: 'Stanford',
        milestones: [],
        transitions: [],
        productivity: {
          totalPapers: 15,
          totalCitations: 200,
          papersPerYear: 2.5,
          citationsPerYear: 33,
          hIndex: 8,
          i10Index: 5,
        },
      };

      const comparison = analyzer.compareCareer(career1, career2);

      expect(comparison.experienceDelta).toBeGreaterThan(0);
      expect(comparison.productivityRatio).toBeGreaterThan(1);
      expect(comparison.hIndexDelta).toBe(32);
    });
  });

  describe('predictCareerTrajectory()', () => {
    it('should predict future career trajectory', () => {
      const career: CareerTimeline = {
        researcherId: 'r1',
        researcherName: 'Rising Star',
        careerStartDate: new Date('2018-01-01'),
        totalYears: 6,
        currentPhase: 'early',
        currentOrganization: 'MIT',
        milestones: [],
        transitions: [],
        productivity: {
          totalPapers: 20,
          totalCitations: 500,
          papersPerYear: 3.3,
          citationsPerYear: 83,
          hIndex: 12,
          i10Index: 15,
        },
      };

      const prediction = analyzer.predictCareerTrajectory(career, 5);

      expect(prediction.predictedPhase).toBeDefined();
      expect(prediction.predictedHIndex).toBeGreaterThan(career.productivity.hIndex);
      expect(prediction.predictedTotalPapers).toBeGreaterThan(career.productivity.totalPapers);
    });
  });
});
