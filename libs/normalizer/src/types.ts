/**
 * Common types for the normalizer module
 */

/**
 * Normalization pipeline stages
 */
export type NormalizationStage = 
  | 'rule'       // Rule-based normalization
  | 'similarity' // Similarity matching
  | 'llm'        // LLM confirmation
  | 'manual';    // Manual override

/**
 * Confidence levels for normalization results
 */
export interface NormalizationConfidence {
  /** Overall confidence score (0.0 - 1.0) */
  score: number;
  /** Stage that produced this result */
  stage: NormalizationStage;
  /** Explanation of how confidence was calculated */
  explanation?: string;
}

/**
 * Entity types supported by the normalizer
 */
export type NormalizableEntityType = 
  | 'AIModel'
  | 'Technique'
  | 'Organization'
  | 'Person'
  | 'Concept'
  | 'Publication'
  | 'Benchmark';
