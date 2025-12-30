/**
 * RelationScorer - Relation confidence scoring
 *
 * Calculates final confidence scores using weighted average:
 * - Co-occurrence score (0.3)
 * - LLM confidence (0.3)
 * - Source reliability (0.2)
 * - Graph consistency (0.2)
 */

import type {
  ExtractedRelation,
  ScoredRelation,
  ReviewStatus,
} from '../types.js';

/**
 * Score weights configuration
 */
export interface ScoreWeights {
  /** Weight for co-occurrence score */
  cooccurrence: number;
  /** Weight for LLM confidence */
  llm: number;
  /** Weight for source reliability */
  source: number;
  /** Weight for graph consistency */
  graph: number;
}

/**
 * HITL thresholds
 */
export interface HITLThresholds {
  /** Auto-approve threshold (>= this score) */
  autoApprove: number;
  /** Review threshold (>= this but < autoApprove) */
  review: number;
  /** Below review threshold -> reject */
}

/**
 * Scorer configuration
 */
export interface ScorerConfig {
  /** Score weights (must sum to 1.0) */
  weights: ScoreWeights;
  /** HITL thresholds */
  thresholds: HITLThresholds;
}

/**
 * Default score weights (per DES-003)
 */
export const DEFAULT_WEIGHTS: ScoreWeights = {
  cooccurrence: 0.3,
  llm: 0.3,
  source: 0.2,
  graph: 0.2,
};

/**
 * Default HITL thresholds (per DES-003)
 */
export const DEFAULT_THRESHOLDS: HITLThresholds = {
  autoApprove: 0.7,
  review: 0.5,
};

/**
 * Default configuration
 */
export const DEFAULT_SCORER_CONFIG: ScorerConfig = {
  weights: DEFAULT_WEIGHTS,
  thresholds: DEFAULT_THRESHOLDS,
};

/**
 * Score components for a relation
 */
export interface ScoreComponents {
  cooccurrenceScore: number;
  llmConfidence: number;
  sourceReliability: number;
  graphConsistency: number;
}

/**
 * Validate score components are in valid range
 */
function validateScoreComponents(components: ScoreComponents): void {
  const values = [
    components.cooccurrenceScore,
    components.llmConfidence,
    components.sourceReliability,
    components.graphConsistency,
  ];

  for (const value of values) {
    if (value < 0 || value > 1) {
      throw new Error(`Score component must be between 0 and 1, got ${value}`);
    }
  }
}

/**
 * Generate unique key for a relation (for deduplication)
 */
function getRelationKey(relation: ExtractedRelation): string {
  return `${relation.sourceId}:${relation.relationType}:${relation.targetId}`;
}

/**
 * RelationScorer class
 * Calculates confidence scores and determines review status
 */
export class RelationScorer {
  private config: ScorerConfig;

  constructor(config: Partial<ScorerConfig> = {}) {
    this.config = {
      weights: { ...DEFAULT_WEIGHTS, ...config.weights },
      thresholds: { ...DEFAULT_THRESHOLDS, ...config.thresholds },
    };
    this.validateWeights();
  }

  /**
   * Validate that weights sum to 1.0
   */
  private validateWeights(): void {
    const sum =
      this.config.weights.cooccurrence +
      this.config.weights.llm +
      this.config.weights.source +
      this.config.weights.graph;
    if (Math.abs(sum - 1.0) > 0.001) {
      throw new Error(`Score weights must sum to 1.0, got ${sum}`);
    }
  }

  /**
   * Score a single relation
   */
  score(
    relation: ExtractedRelation,
    components: ScoreComponents
  ): ScoredRelation {
    validateScoreComponents(components);

    const confidence = this.calculateConfidence(components);
    const reviewStatus = this.determineReviewStatus(confidence);

    return {
      ...relation,
      confidence,
      scoreComponents: { ...components },
      reviewStatus,
      needsReview: this.needsReview(confidence),
    };
  }

  /**
   * Score multiple relations
   */
  scoreMultiple(
    relations: ExtractedRelation[],
    componentsMap: Map<string, ScoreComponents>
  ): ScoredRelation[] {
    const results: ScoredRelation[] = [];

    for (const relation of relations) {
      const key = getRelationKey(relation);
      const components = componentsMap.get(key);

      if (!components) {
        // Use default scores if not provided
        const defaultComponents: ScoreComponents = {
          cooccurrenceScore: relation.rawConfidence,
          llmConfidence: 0.5,
          sourceReliability: 0.5,
          graphConsistency: 0.5,
        };
        results.push(this.score(relation, defaultComponents));
      } else {
        results.push(this.score(relation, components));
      }
    }

    return results;
  }

  /**
   * Calculate final confidence score using weighted average
   */
  calculateConfidence(components: ScoreComponents): number {
    validateScoreComponents(components);

    const { weights } = this.config;

    const confidence =
      components.cooccurrenceScore * weights.cooccurrence +
      components.llmConfidence * weights.llm +
      components.sourceReliability * weights.source +
      components.graphConsistency * weights.graph;

    // Ensure result is within bounds (floating point safety)
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Determine review status based on confidence
   */
  determineReviewStatus(confidence: number): ReviewStatus {
    const { thresholds } = this.config;

    if (confidence >= thresholds.autoApprove) {
      return 'approved';
    } else if (confidence >= thresholds.review) {
      return 'pending';
    } else {
      return 'rejected';
    }
  }

  /**
   * Check if relation needs human review
   */
  needsReview(confidence: number): boolean {
    const { thresholds } = this.config;
    return confidence >= thresholds.review && confidence < thresholds.autoApprove;
  }

  /**
   * Get current configuration
   */
  getConfig(): ScorerConfig {
    return {
      weights: { ...this.config.weights },
      thresholds: { ...this.config.thresholds },
    };
  }

  /**
   * Update weights (re-validates sum)
   */
  updateWeights(weights: Partial<ScoreWeights>): void {
    this.config.weights = { ...this.config.weights, ...weights };
    this.validateWeights();
  }

  /**
   * Update thresholds
   */
  updateThresholds(thresholds: Partial<HITLThresholds>): void {
    this.config.thresholds = { ...this.config.thresholds, ...thresholds };

    // Validate thresholds
    if (this.config.thresholds.review >= this.config.thresholds.autoApprove) {
      throw new Error('Review threshold must be less than auto-approve threshold');
    }
    if (this.config.thresholds.review < 0 || this.config.thresholds.autoApprove > 1) {
      throw new Error('Thresholds must be between 0 and 1');
    }
  }

  /**
   * Update full configuration
   */
  updateConfig(config: Partial<ScorerConfig>): void {
    if (config.weights) {
      this.config.weights = { ...this.config.weights, ...config.weights };
      this.validateWeights();
    }
    if (config.thresholds) {
      this.config.thresholds = { ...this.config.thresholds, ...config.thresholds };
      // Validate thresholds
      if (this.config.thresholds.review >= this.config.thresholds.autoApprove) {
        throw new Error('Review threshold must be less than auto-approve threshold');
      }
    }
  }

  /**
   * Get statistics about a batch of scored relations
   */
  getStatistics(relations: ScoredRelation[]): {
    total: number;
    autoApproved: number;
    needsReview: number;
    rejected: number;
    averageConfidence: number;
    minConfidence: number;
    maxConfidence: number;
  } {
    if (relations.length === 0) {
      return {
        total: 0,
        autoApproved: 0,
        needsReview: 0,
        rejected: 0,
        averageConfidence: 0,
        minConfidence: 0,
        maxConfidence: 0,
      };
    }

    let autoApproved = 0;
    let needsReview = 0;
    let rejected = 0;
    let totalConfidence = 0;
    let minConfidence = 1;
    let maxConfidence = 0;

    for (const relation of relations) {
      totalConfidence += relation.confidence;
      minConfidence = Math.min(minConfidence, relation.confidence);
      maxConfidence = Math.max(maxConfidence, relation.confidence);

      switch (relation.reviewStatus) {
        case 'approved':
          autoApproved++;
          break;
        case 'pending':
          needsReview++;
          break;
        case 'rejected':
          rejected++;
          break;
      }
    }

    return {
      total: relations.length,
      autoApproved,
      needsReview,
      rejected,
      averageConfidence: totalConfidence / relations.length,
      minConfidence,
      maxConfidence,
    };
  }
}
