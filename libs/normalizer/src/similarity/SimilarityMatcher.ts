/**
 * SimilarityMatcher - Similarity-based entity matching
 * 
 * Uses Levenshtein distance and vector similarity for fuzzy matching.
 * Second stage of the normalization pipeline.
 */

import { distance as levenshtein } from 'fastest-levenshtein';
import type { NormalizationStage } from '../types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for SimilarityMatcher
 */
export interface SimilarityConfig {
  /** Minimum similarity threshold (0.0 - 1.0) */
  threshold?: number;
  /** Weight for edit distance similarity (0.0 - 1.0) */
  editDistanceWeight?: number;
  /** Weight for vector similarity (0.0 - 1.0) */
  vectorWeight?: number;
  /** Maximum candidates to return */
  maxCandidates?: number;
}

/**
 * A candidate match with similarity score
 */
export interface MatchCandidate {
  /** Canonical entity name */
  canonical: string;
  /** Similarity score (0.0 - 1.0) */
  similarity: number;
  /** Edit distance similarity component */
  editSimilarity: number;
  /** Vector similarity component (if available) */
  vectorSimilarity?: number;
}

/**
 * Result of similarity matching
 */
export interface SimilarityResult {
  /** Original input */
  original: string;
  /** Best matching canonical form (if found) */
  canonical: string | null;
  /** All candidate matches */
  candidates: MatchCandidate[];
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  /** Stage identifier */
  stage: NormalizationStage;
}

/**
 * Interface for vector store client (optional integration)
 */
export interface VectorStoreClient {
  search(query: string, limit: number): Promise<Array<{ name: string; score: number }>>;
}

// ============================================================================
// SimilarityMatcher Class
// ============================================================================

/**
 * Similarity-based entity matcher
 * 
 * Combines edit distance and optional vector similarity for fuzzy matching.
 * 
 * @example
 * ```typescript
 * const matcher = new SimilarityMatcher(existingEntities);
 * const result = await matcher.findMatches('GPT4');
 * console.log(result.canonical); // 'GPT-4' (if in existing entities)
 * ```
 */
export class SimilarityMatcher {
  private existingEntities: Set<string>;
  private config: Required<SimilarityConfig>;
  private vectorStore: VectorStoreClient | undefined;

  constructor(
    existingEntities: string[] = [],
    config: SimilarityConfig = {},
    vectorStore?: VectorStoreClient
  ) {
    this.existingEntities = new Set(existingEntities);
    this.config = {
      threshold: config.threshold ?? 0.8,
      editDistanceWeight: config.editDistanceWeight ?? 0.6,
      vectorWeight: config.vectorWeight ?? 0.4,
      maxCandidates: config.maxCandidates ?? 5,
    };
    this.vectorStore = vectorStore;
  }

  /**
   * Find matching entities by similarity
   */
  async findMatches(input: string): Promise<SimilarityResult> {
    const inputLower = input.toLowerCase().trim();
    const candidates: MatchCandidate[] = [];

    // Calculate edit distance similarity for all existing entities
    for (const entity of this.existingEntities) {
      const entityLower = entity.toLowerCase();
      const editSimilarity = this.calculateEditSimilarity(inputLower, entityLower);
      
      if (editSimilarity >= this.config.threshold * 0.7) { // Pre-filter
        candidates.push({
          canonical: entity,
          similarity: editSimilarity,
          editSimilarity,
        });
      }
    }

    // Add vector similarity if available
    if (this.vectorStore) {
      const vectorResults = await this.vectorStore.search(input, this.config.maxCandidates * 2);
      
      for (const vr of vectorResults) {
        const existing = candidates.find(c => c.canonical.toLowerCase() === vr.name.toLowerCase());
        if (existing) {
          existing.vectorSimilarity = vr.score;
          existing.similarity = this.combineScores(existing.editSimilarity, vr.score);
        } else if (vr.score >= this.config.threshold * 0.7) {
          candidates.push({
            canonical: vr.name,
            similarity: vr.score,
            editSimilarity: this.calculateEditSimilarity(inputLower, vr.name.toLowerCase()),
            vectorSimilarity: vr.score,
          });
        }
      }
    }

    // Sort by similarity and filter by threshold
    const filteredCandidates = candidates
      .filter(c => c.similarity >= this.config.threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, this.config.maxCandidates);

    // Determine best match
    const bestMatch = filteredCandidates[0];
    const confidence = bestMatch 
      ? Math.min(0.95, bestMatch.similarity)
      : 0;

    return {
      original: input,
      canonical: bestMatch?.canonical ?? null,
      candidates: filteredCandidates,
      confidence,
      stage: 'similarity',
    };
  }

  /**
   * Add entities to the existing set
   */
  addEntities(entities: string[]): void {
    for (const entity of entities) {
      this.existingEntities.add(entity);
    }
  }

  /**
   * Remove an entity from the existing set
   */
  removeEntity(entity: string): boolean {
    return this.existingEntities.delete(entity);
  }

  /**
   * Get all existing entities
   */
  getEntities(): string[] {
    return Array.from(this.existingEntities);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SimilarityConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Calculate edit distance similarity (0.0 - 1.0)
   */
  private calculateEditSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;
    if (a.length === 0 || b.length === 0) return 0;

    const dist = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    
    // Normalize to 0-1 range (higher is better)
    return 1 - dist / maxLen;
  }

  /**
   * Combine edit distance and vector similarity scores
   */
  private combineScores(editSim: number, vectorSim: number): number {
    return (
      editSim * this.config.editDistanceWeight +
      vectorSim * this.config.vectorWeight
    );
  }
}
