import { describe, it, expect } from 'vitest';
import {
  normalizeName,
  calculateCoauthorWeight,
  calculateAuthorSimilarity,
  determineMatchAction,
  type ResearcherProfile,
  type ResearcherMetrics,
  type CoauthorEdge,
  type ResearcherCommunity,
  type ResearcherPath,
  type ResearcherMatchResult,
  type Affiliation,
} from './researcher.js';

describe('Researcher Domain Types', () => {
  describe('Affiliation', () => {
    it('should create valid affiliation', () => {
      const affiliation: Affiliation = {
        organization: 'OpenAI',
        department: 'Research',
        position: 'Research Scientist',
        startDate: new Date('2020-01-01'),
        isPrimary: true,
      };

      expect(affiliation.organization).toBe('OpenAI');
      expect(affiliation.isPrimary).toBe(true);
    });
  });

  describe('ResearcherMetrics', () => {
    it('should create valid researcher metrics', () => {
      const metrics: ResearcherMetrics = {
        hIndex: 45,
        citationCount: 12000,
        paperCount: 120,
        coauthorCount: 85,
        pageRank: 0.85,
        i10Index: 80,
        avgCitationsPerPaper: 100,
        updatedAt: new Date(),
      };

      expect(metrics.hIndex).toBe(45);
      expect(metrics.pageRank).toBe(0.85);
    });
  });

  describe('ResearcherProfile', () => {
    it('should create valid researcher profile', () => {
      const profile: ResearcherProfile = {
        id: 'researcher-123',
        name: 'Ilya Sutskever',
        normalizedName: 'ilya sutskever',
        orcid: '0000-0001-2345-6789',
        affiliations: [
          {
            organization: 'OpenAI',
            isPrimary: true,
            startDate: new Date('2015-01-01'),
          },
        ],
        currentAffiliation: {
          organization: 'OpenAI',
          isPrimary: true,
        },
        metrics: {
          hIndex: 75,
          citationCount: 250000,
          paperCount: 80,
          coauthorCount: 150,
          pageRank: 0.95,
          updatedAt: new Date(),
        },
        communities: ['comm-1', 'comm-2'],
        researchFields: ['Deep Learning', 'Neural Networks'],
        updatedAt: new Date(),
        isVerified: true,
      };

      expect(profile.name).toBe('Ilya Sutskever');
      expect(profile.isVerified).toBe(true);
    });
  });

  describe('CoauthorEdge', () => {
    it('should create valid coauthor edge', () => {
      const edge: CoauthorEdge = {
        researcher1Id: 'r1',
        researcher1Name: 'Alice',
        researcher2Id: 'r2',
        researcher2Name: 'Bob',
        paperCount: 5,
        paperIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
        firstCollaboration: new Date('2018-01-01'),
        lastCollaboration: new Date('2024-06-01'),
        weight: 4.5,
      };

      expect(edge.paperCount).toBe(5);
      expect(edge.weight).toBe(4.5);
    });
  });

  describe('ResearcherCommunity', () => {
    it('should create valid researcher community', () => {
      const community: ResearcherCommunity = {
        id: 'comm-1',
        name: 'Deep Learning Pioneers',
        field: 'Deep Learning',
        members: ['r1', 'r2', 'r3', 'r4', 'r5'],
        coreMembers: ['r1', 'r2'],
        size: 5,
        modularity: 0.72,
        avgInfluence: 65.3,
        detectedAt: new Date(),
        algorithm: 'leiden',
        resolution: 1.0,
      };

      expect(community.algorithm).toBe('leiden');
      expect(community.modularity).toBe(0.72);
    });
  });

  describe('ResearcherPath', () => {
    it('should create valid researcher path', () => {
      const path: ResearcherPath = {
        fromId: 'r1',
        fromName: 'Alice',
        toId: 'r3',
        toName: 'Charlie',
        length: 2,
        path: [
          { researcherId: 'r1', researcherName: 'Alice', affiliations: ['MIT'] },
          { researcherId: 'r2', researcherName: 'Bob', affiliations: ['Stanford'] },
          { researcherId: 'r3', researcherName: 'Charlie', affiliations: ['Google'] },
        ],
        edges: [],
        foundAt: new Date(),
      };

      expect(path.length).toBe(2);
      expect(path.path).toHaveLength(3);
    });
  });

  describe('ResearcherMatchResult', () => {
    it('should create valid match result for ORCID match', () => {
      const result: ResearcherMatchResult = {
        matchedId: 'researcher-123',
        confidence: 1.0,
        matchMethod: 'orcid',
        needsReview: false,
      };

      expect(result.matchMethod).toBe('orcid');
      expect(result.confidence).toBe(1.0);
    });

    it('should create valid match result for similarity match', () => {
      const result: ResearcherMatchResult = {
        matchedId: 'researcher-456',
        confidence: 0.75,
        matchMethod: 'similarity',
        candidates: [
          { researcherId: 'r1', researcherName: 'J. Smith', similarity: 0.75 },
          { researcherId: 'r2', researcherName: 'John Smith', similarity: 0.72 },
        ],
        needsReview: true,
      };

      expect(result.needsReview).toBe(true);
      expect(result.candidates).toHaveLength(2);
    });
  });

  describe('normalizeName()', () => {
    it('should lowercase and trim', () => {
      expect(normalizeName('  John Smith  ')).toBe('john smith');
    });

    it('should remove accents', () => {
      expect(normalizeName('José García')).toBe('jose garcia');
    });

    it('should remove special characters', () => {
      expect(normalizeName("John O'Brien")).toBe('john obrien');
    });

    it('should handle multiple spaces', () => {
      expect(normalizeName('John    Smith')).toBe('john smith');
    });

    it('should handle unicode characters', () => {
      expect(normalizeName('Müller')).toBe('muller');
    });
  });

  describe('calculateCoauthorWeight()', () => {
    it('should calculate weight for recent collaboration', () => {
      const lastCollab = new Date();
      lastCollab.setDate(lastCollab.getDate() - 30); // 30日前

      const weight = calculateCoauthorWeight(5, lastCollab);

      // recencyFactor ≈ 1 / (1 + 30/365) ≈ 0.924
      // weight ≈ 5 * 0.924 ≈ 4.62
      expect(weight).toBeGreaterThan(4.5);
      expect(weight).toBeLessThan(5);
    });

    it('should calculate lower weight for old collaboration', () => {
      const lastCollab = new Date();
      lastCollab.setFullYear(lastCollab.getFullYear() - 3); // 3年前

      const weight = calculateCoauthorWeight(5, lastCollab);

      // recencyFactor ≈ 1 / (1 + 1095/365) = 1/4 = 0.25
      // weight ≈ 5 * 0.25 ≈ 1.25
      expect(weight).toBeGreaterThan(1);
      expect(weight).toBeLessThan(2);
    });

    it('should scale with paper count', () => {
      const lastCollab = new Date();

      const weight1 = calculateCoauthorWeight(1, lastCollab);
      const weight5 = calculateCoauthorWeight(5, lastCollab);

      expect(weight5).toBeCloseTo(weight1 * 5, 1);
    });
  });

  describe('calculateAuthorSimilarity()', () => {
    it('should return 1.0 for identical authors', () => {
      const author = {
        name: 'John Smith',
        affiliations: ['MIT', 'Stanford'],
        coauthors: ['Alice', 'Bob'],
      };

      const similarity = calculateAuthorSimilarity(author, author);
      expect(similarity).toBe(1.0);
    });

    it('should return high similarity for similar names', () => {
      const author1 = {
        name: 'John Smith',
        affiliations: ['MIT'],
        coauthors: ['Alice'],
      };
      const author2 = {
        name: 'J. Smith',
        affiliations: ['MIT'],
        coauthors: ['Alice'],
      };

      const similarity = calculateAuthorSimilarity(author1, author2);
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should return low similarity for different authors', () => {
      const author1 = {
        name: 'John Smith',
        affiliations: ['MIT'],
        coauthors: ['Alice'],
      };
      const author2 = {
        name: 'Mary Johnson',
        affiliations: ['Stanford'],
        coauthors: ['Charlie'],
      };

      const similarity = calculateAuthorSimilarity(author1, author2);
      expect(similarity).toBeLessThan(0.3);
    });

    it('should consider affiliations in similarity', () => {
      const author1 = {
        name: 'John Smith',
        affiliations: ['MIT', 'Stanford'],
        coauthors: [],
      };
      const author2 = {
        name: 'John Smith',
        affiliations: ['MIT'],
        coauthors: [],
      };

      const similarityWithShared = calculateAuthorSimilarity(author1, author2);

      const author3 = {
        name: 'John Smith',
        affiliations: ['Harvard'],
        coauthors: [],
      };

      const similarityWithoutShared = calculateAuthorSimilarity(author1, author3);

      expect(similarityWithShared).toBeGreaterThan(similarityWithoutShared);
    });
  });

  describe('determineMatchAction()', () => {
    it('should auto-approve for high similarity (>= 0.8)', () => {
      expect(determineMatchAction(0.95)).toBe('auto_approve');
      expect(determineMatchAction(0.8)).toBe('auto_approve');
    });

    it('should require HITL review for medium similarity (0.5-0.8)', () => {
      expect(determineMatchAction(0.75)).toBe('hitl_review');
      expect(determineMatchAction(0.5)).toBe('hitl_review');
    });

    it('should auto-reject for low similarity (< 0.5)', () => {
      expect(determineMatchAction(0.49)).toBe('auto_reject');
      expect(determineMatchAction(0.1)).toBe('auto_reject');
    });

    it('should handle boundary values correctly', () => {
      expect(determineMatchAction(0.8)).toBe('auto_approve');
      expect(determineMatchAction(0.79)).toBe('hitl_review');
      expect(determineMatchAction(0.5)).toBe('hitl_review');
      expect(determineMatchAction(0.49)).toBe('auto_reject');
    });
  });
});
