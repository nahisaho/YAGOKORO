/**
 * @yagokoro/normalizer
 * 
 * Entity normalization pipeline for YAGOKORO GraphRAG system.
 * Provides multi-stage normalization: Rule-based → Similarity → LLM confirmation
 */

// ============================================================================
// Rules Module
// ============================================================================
export {
  RuleNormalizer,
  type NormalizationRule,
  type NormalizationResult,
  type RuleConfig,
} from './rules/RuleNormalizer.js';

// ============================================================================
// Similarity Module
// ============================================================================
export {
  SimilarityMatcher,
  type SimilarityResult,
  type SimilarityConfig,
  type MatchCandidate,
} from './similarity/SimilarityMatcher.js';

// ============================================================================
// Alias Module
// ============================================================================
export {
  AliasTableManager,
  type AliasEntry,
  type AliasTableConfig,
} from './alias/AliasTableManager.js';

// ============================================================================
// Service Module
// ============================================================================
export {
  EntityNormalizerService,
  type NormalizationPipelineResult,
  type NormalizationOptions,
  type EntityNormalizerConfig,
} from './service/EntityNormalizerService.js';

// ============================================================================
// Types
// ============================================================================
export type {
  NormalizationStage,
  NormalizationConfidence,
} from './types.js';
