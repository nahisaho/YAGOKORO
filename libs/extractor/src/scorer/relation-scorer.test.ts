/**
 * RelationScorer tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RelationScorer,
  DEFAULT_WEIGHTS,
  DEFAULT_THRESHOLDS,
  type ScoreComponents,
  type ScorerConfig,
} from './relation-scorer.js';
import type { ExtractedRelation, ScoredRelation } from '../types.js';

describe('RelationScorer', () => {
  let scorer: RelationScorer;

  beforeEach(() => {
    scorer = new RelationScorer();
  });

  describe('constructor', () => {
    it('should use default config', () => {
      const config = scorer.getConfig();
      expect(config.weights).toEqual(DEFAULT_WEIGHTS);
      expect(config.thresholds).toEqual(DEFAULT_THRESHOLDS);
    });

    it('should merge custom weights', () => {
      const customScorer = new RelationScorer({
        weights: { cooccurrence: 0.4, llm: 0.4, source: 0.1, graph: 0.1 },
      });
      expect(customScorer.getConfig().weights.cooccurrence).toBe(0.4);
    });

    it('should throw if weights do not sum to 1', () => {
      expect(() => {
        new RelationScorer({
          weights: { cooccurrence: 0.5, llm: 0.5, source: 0.5, graph: 0.5 },
        });
      }).toThrow('Score weights must sum to 1.0');
    });

    it('should merge custom thresholds', () => {
      const customScorer = new RelationScorer({
        thresholds: { autoApprove: 0.8, review: 0.6 },
      });
      expect(customScorer.getConfig().thresholds.autoApprove).toBe(0.8);
    });
  });

  describe('calculateConfidence', () => {
    it('should calculate weighted average correctly', () => {
      const components: ScoreComponents = {
        cooccurrenceScore: 0.8,
        llmConfidence: 0.9,
        sourceReliability: 0.7,
        graphConsistency: 0.6,
      };

      // Expected: 0.8*0.3 + 0.9*0.3 + 0.7*0.2 + 0.6*0.2 = 0.24 + 0.27 + 0.14 + 0.12 = 0.77
      const confidence = scorer.calculateConfidence(components);
      expect(confidence).toBeCloseTo(0.77, 2);
    });

    it('should return 0 for all zero components', () => {
      const components: ScoreComponents = {
        cooccurrenceScore: 0,
        llmConfidence: 0,
        sourceReliability: 0,
        graphConsistency: 0,
      };

      expect(scorer.calculateConfidence(components)).toBe(0);
    });

    it('should return 1 for all max components', () => {
      const components: ScoreComponents = {
        cooccurrenceScore: 1,
        llmConfidence: 1,
        sourceReliability: 1,
        graphConsistency: 1,
      };

      expect(scorer.calculateConfidence(components)).toBe(1);
    });

    it('should throw for invalid component values', () => {
      expect(() => {
        scorer.calculateConfidence({
          cooccurrenceScore: 1.5, // Invalid
          llmConfidence: 0.5,
          sourceReliability: 0.5,
          graphConsistency: 0.5,
        });
      }).toThrow('Score component must be between 0 and 1');

      expect(() => {
        scorer.calculateConfidence({
          cooccurrenceScore: -0.1, // Invalid
          llmConfidence: 0.5,
          sourceReliability: 0.5,
          graphConsistency: 0.5,
        });
      }).toThrow('Score component must be between 0 and 1');
    });
  });

  describe('determineReviewStatus', () => {
    it('should return approved for high confidence', () => {
      expect(scorer.determineReviewStatus(0.8)).toBe('approved');
      expect(scorer.determineReviewStatus(0.7)).toBe('approved');
      expect(scorer.determineReviewStatus(1.0)).toBe('approved');
    });

    it('should return pending for medium confidence', () => {
      expect(scorer.determineReviewStatus(0.6)).toBe('pending');
      expect(scorer.determineReviewStatus(0.5)).toBe('pending');
      expect(scorer.determineReviewStatus(0.69)).toBe('pending');
    });

    it('should return rejected for low confidence', () => {
      expect(scorer.determineReviewStatus(0.4)).toBe('rejected');
      expect(scorer.determineReviewStatus(0.0)).toBe('rejected');
      expect(scorer.determineReviewStatus(0.49)).toBe('rejected');
    });
  });

  describe('needsReview', () => {
    it('should return true for relations needing review', () => {
      expect(scorer.needsReview(0.5)).toBe(true);
      expect(scorer.needsReview(0.6)).toBe(true);
    });

    it('should return false for auto-approved relations', () => {
      expect(scorer.needsReview(0.7)).toBe(false);
      expect(scorer.needsReview(0.9)).toBe(false);
    });

    it('should return false for rejected relations', () => {
      expect(scorer.needsReview(0.4)).toBe(false);
      expect(scorer.needsReview(0.1)).toBe(false);
    });
  });

  describe('score', () => {
    const baseRelation: ExtractedRelation = {
      sourceId: 'entity1',
      targetId: 'entity2',
      relationType: 'DEVELOPED_BY',
      method: 'cooccurrence',
      evidence: [],
      rawConfidence: 0.8,
    };

    it('should score a single relation', () => {
      const components: ScoreComponents = {
        cooccurrenceScore: 0.8,
        llmConfidence: 0.8,
        sourceReliability: 0.8,
        graphConsistency: 0.8,
      };

      const scored = scorer.score(baseRelation, components);

      expect(scored.confidence).toBeCloseTo(0.8, 2);
      expect(scored.scoreComponents).toEqual(components);
      expect(scored.reviewStatus).toBe('approved');
      expect(scored.needsReview).toBe(false);
    });

    it('should mark relations needing review', () => {
      const components: ScoreComponents = {
        cooccurrenceScore: 0.6,
        llmConfidence: 0.6,
        sourceReliability: 0.6,
        graphConsistency: 0.6,
      };

      const scored = scorer.score(baseRelation, components);

      expect(scored.confidence).toBeCloseTo(0.6, 2);
      expect(scored.reviewStatus).toBe('pending');
      expect(scored.needsReview).toBe(true);
    });

    it('should preserve original relation properties', () => {
      const components: ScoreComponents = {
        cooccurrenceScore: 0.5,
        llmConfidence: 0.5,
        sourceReliability: 0.5,
        graphConsistency: 0.5,
      };

      const scored = scorer.score(baseRelation, components);

      expect(scored.sourceId).toBe(baseRelation.sourceId);
      expect(scored.targetId).toBe(baseRelation.targetId);
      expect(scored.relationType).toBe(baseRelation.relationType);
      expect(scored.method).toBe(baseRelation.method);
    });
  });

  describe('scoreMultiple', () => {
    const relations: ExtractedRelation[] = [
      {
        sourceId: 'entity1',
        targetId: 'entity2',
        relationType: 'DEVELOPED_BY',
        method: 'cooccurrence',
        evidence: [],
        rawConfidence: 0.8,
      },
      {
        sourceId: 'entity3',
        targetId: 'entity4',
        relationType: 'TRAINED_ON',
        method: 'pattern',
        evidence: [],
        rawConfidence: 0.6,
      },
    ];

    it('should score multiple relations', () => {
      const componentsMap = new Map<string, ScoreComponents>();
      componentsMap.set('entity1:DEVELOPED_BY:entity2', {
        cooccurrenceScore: 0.9,
        llmConfidence: 0.9,
        sourceReliability: 0.9,
        graphConsistency: 0.9,
      });
      componentsMap.set('entity3:TRAINED_ON:entity4', {
        cooccurrenceScore: 0.5,
        llmConfidence: 0.5,
        sourceReliability: 0.5,
        graphConsistency: 0.5,
      });

      const scored = scorer.scoreMultiple(relations, componentsMap);

      expect(scored).toHaveLength(2);
      expect(scored[0]?.confidence).toBeCloseTo(0.9, 2);
      expect(scored[1]?.confidence).toBeCloseTo(0.5, 2);
    });

    it('should use default scores when components not provided', () => {
      const scored = scorer.scoreMultiple(relations, new Map());

      expect(scored).toHaveLength(2);
      // Should use rawConfidence for cooccurrence, 0.5 for others
      for (const relation of scored) {
        expect(relation.confidence).toBeGreaterThan(0);
      }
    });
  });

  describe('updateWeights', () => {
    it('should update weights', () => {
      scorer.updateWeights({ cooccurrence: 0.4, llm: 0.4, source: 0.1, graph: 0.1 });
      expect(scorer.getConfig().weights.cooccurrence).toBe(0.4);
    });

    it('should throw if new weights do not sum to 1', () => {
      expect(() => {
        scorer.updateWeights({ cooccurrence: 0.9 }); // Would make sum > 1
      }).toThrow('Score weights must sum to 1.0');
    });
  });

  describe('updateThresholds', () => {
    it('should update thresholds', () => {
      scorer.updateThresholds({ autoApprove: 0.8, review: 0.6 });
      const config = scorer.getConfig();
      expect(config.thresholds.autoApprove).toBe(0.8);
      expect(config.thresholds.review).toBe(0.6);
    });

    it('should throw if review >= autoApprove', () => {
      expect(() => {
        scorer.updateThresholds({ autoApprove: 0.5, review: 0.6 });
      }).toThrow('Review threshold must be less than auto-approve threshold');
    });
  });

  describe('getStatistics', () => {
    it('should calculate statistics for scored relations', () => {
      const scoredRelations: ScoredRelation[] = [
        {
          sourceId: 'e1',
          targetId: 'e2',
          relationType: 'DEVELOPED_BY',
          method: 'cooccurrence',
          evidence: [],
          rawConfidence: 0.8,
          confidence: 0.8,
          scoreComponents: {
            cooccurrenceScore: 0.8,
            llmConfidence: 0.8,
            sourceReliability: 0.8,
            graphConsistency: 0.8,
          },
          reviewStatus: 'approved',
          needsReview: false,
        },
        {
          sourceId: 'e3',
          targetId: 'e4',
          relationType: 'TRAINED_ON',
          method: 'pattern',
          evidence: [],
          rawConfidence: 0.6,
          confidence: 0.6,
          scoreComponents: {
            cooccurrenceScore: 0.6,
            llmConfidence: 0.6,
            sourceReliability: 0.6,
            graphConsistency: 0.6,
          },
          reviewStatus: 'pending',
          needsReview: true,
        },
        {
          sourceId: 'e5',
          targetId: 'e6',
          relationType: 'USES_TECHNIQUE',
          method: 'llm',
          evidence: [],
          rawConfidence: 0.3,
          confidence: 0.3,
          scoreComponents: {
            cooccurrenceScore: 0.3,
            llmConfidence: 0.3,
            sourceReliability: 0.3,
            graphConsistency: 0.3,
          },
          reviewStatus: 'rejected',
          needsReview: false,
        },
      ];

      const stats = scorer.getStatistics(scoredRelations);

      expect(stats.total).toBe(3);
      expect(stats.autoApproved).toBe(1);
      expect(stats.needsReview).toBe(1);
      expect(stats.rejected).toBe(1);
      expect(stats.averageConfidence).toBeCloseTo(0.567, 2);
      expect(stats.minConfidence).toBe(0.3);
      expect(stats.maxConfidence).toBe(0.8);
    });

    it('should handle empty relations array', () => {
      const stats = scorer.getStatistics([]);

      expect(stats.total).toBe(0);
      expect(stats.autoApproved).toBe(0);
      expect(stats.needsReview).toBe(0);
      expect(stats.rejected).toBe(0);
      expect(stats.averageConfidence).toBe(0);
    });
  });

  describe('getConfig', () => {
    it('should return a copy of config', () => {
      const config1 = scorer.getConfig();
      const config2 = scorer.getConfig();
      
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
      expect(config1.weights).not.toBe(config2.weights);
    });
  });
});
