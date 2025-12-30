/**
 * RelationExtractorService - Orchestrates the extraction pipeline
 *
 * Coordinates:
 * - CooccurrenceAnalyzer
 * - PatternMatcher
 * - RelationScorer
 * - ContradictionDetector
 * - LLMRelationInferrer
 */

import type {
  ExtractionDocument,
  ExtractionResult,
  BatchExtractionResult,
  ScoredRelation,
  ExtractedRelation,
} from '../types.js';
import { CooccurrenceAnalyzer, type CooccurrenceConfig } from '../cooccurrence/cooccurrence-analyzer.js';
import { PatternMatcher, type PatternMatcherConfig } from '../pattern/pattern-matcher.js';
import { RelationScorer, type ScorerConfig } from '../scorer/relation-scorer.js';
import { ContradictionDetector, type ContradictionConfig } from '../contradiction/contradiction-detector.js';
import { LLMRelationInferrer, type LLMInferrerConfig, type LLMProvider } from '../llm/llm-relation-inferrer.js';

/**
 * Service configuration
 */
export interface RelationExtractorServiceConfig {
  /** Co-occurrence analyzer config */
  cooccurrence?: Partial<CooccurrenceConfig>;
  /** Pattern matcher config */
  pattern?: Partial<PatternMatcherConfig>;
  /** Scorer config */
  scorer?: Partial<ScorerConfig>;
  /** Contradiction detector config */
  contradiction?: Partial<ContradictionConfig>;
  /** LLM inferrer config */
  llm?: Partial<LLMInferrerConfig>;
  /** Whether to use LLM (can be disabled) */
  useLLM: boolean;
  /** Whether to detect contradictions */
  detectContradictions: boolean;
  /** Maximum concurrent documents */
  maxConcurrency: number;
}

/**
 * Default service configuration
 */
export const DEFAULT_SERVICE_CONFIG: RelationExtractorServiceConfig = {
  useLLM: true,
  detectContradictions: true,
  maxConcurrency: 10,
};

/**
 * RelationExtractorService class
 * Main orchestrator for relation extraction
 */
export class RelationExtractorService {
  private config: RelationExtractorServiceConfig;
  private cooccurrenceAnalyzer: CooccurrenceAnalyzer;
  private patternMatcher: PatternMatcher;
  private scorer: RelationScorer;
  private contradictionDetector: ContradictionDetector;
  private llmInferrer: LLMRelationInferrer;

  // Statistics tracking
  private stats = {
    totalProcessed: 0,
    totalRelations: 0,
    totalConfidence: 0,
    reviewRequired: 0,
    autoApproved: 0,
    rejected: 0,
  };

  constructor(config: Partial<RelationExtractorServiceConfig> = {}) {
    this.config = { ...DEFAULT_SERVICE_CONFIG, ...config };

    // Initialize components
    this.cooccurrenceAnalyzer = new CooccurrenceAnalyzer(config.cooccurrence);
    this.patternMatcher = new PatternMatcher(config.pattern);
    this.scorer = new RelationScorer(config.scorer);
    this.contradictionDetector = new ContradictionDetector(config.contradiction);
    this.llmInferrer = new LLMRelationInferrer(config.llm);
  }

  /**
   * Set LLM provider
   */
  setLLMProvider(provider: LLMProvider): void {
    this.llmInferrer.setProvider(provider);
  }

  /**
   * Extract relations from a single document
   */
  async extract(document: ExtractionDocument): Promise<ExtractionResult> {
    const startTime = Date.now();
    const relations: ScoredRelation[] = [];

    try {
      // 1. Co-occurrence analysis
      const cooccurrencePairs = this.cooccurrenceAnalyzer.analyze([document]);
      const cooccurrenceRelations = this.cooccurrencesToRelations(
        cooccurrencePairs,
        document.id
      );

      // 2. Pattern matching
      const patternRelations = this.patternMatcher.extractRelations(
        document.content,
        document.id,
        document.entities || []
      );

      // 3. LLM inference (if enabled and provider available)
      let llmRelations: ExtractedRelation[] = [];
      if (this.config.useLLM && (await this.llmInferrer.isAvailable())) {
        try {
          llmRelations = await this.llmInferrer.inferFromDocument(document);
        } catch {
          // Continue without LLM results if inference fails
        }
      }

      // 4. Merge relations from different sources
      const mergedRelations = this.mergeRelations(
        cooccurrenceRelations,
        patternRelations,
        llmRelations
      );

      // 5. Score all relations
      for (const relation of mergedRelations) {
        const scored = this.scorer.score(relation, {
          cooccurrenceScore:
            relation.method === 'cooccurrence' ? relation.rawConfidence : 0.5,
          llmConfidence:
            relation.method === 'llm' ? relation.rawConfidence : 0.5,
          sourceReliability: 0.7, // Default based on source
          graphConsistency: 0.5, // Default, would be computed from existing graph
        });
        relations.push(scored);
      }

      // 6. Check for contradictions
      if (this.config.detectContradictions) {
        const contradictions = this.contradictionDetector.detect(relations);
        // Mark relations involved in contradictions as needing review
        for (const contradiction of contradictions) {
          for (const involved of contradiction.relations) {
            const idx = relations.findIndex(
              (r) =>
                r.sourceId === involved.sourceId &&
                r.targetId === involved.targetId &&
                r.relationType === involved.relationType
            );
            if (idx !== -1) {
              relations[idx] = {
                ...relations[idx],
                reviewStatus: 'pending',
                needsReview: true,
              };
            }
          }
        }
      }

      // 7. Update statistics
      this.updateStats(relations);

      return {
        documentId: document.id,
        relations,
        entities: document.entities || [],
        processingTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (_error) {
      // Still track that we processed a document
      this.stats.totalProcessed++;
      
      return {
        documentId: document.id,
        relations: [],
        entities: document.entities || [],
        processingTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Convert co-occurrence pairs to extracted relations
   */
  private cooccurrencesToRelations(
    pairs: import('../types.js').CooccurrencePair[],
    documentId: string
  ): ExtractedRelation[] {
    // Co-occurrence only indicates entities appear together,
    // not the specific relation type. Use a neutral type.
    return pairs.map((pair) => ({
      sourceId: pair.sourceId,
      targetId: pair.targetId,
      relationType: this.inferTypeFromCooccurrence(pair),
      method: 'cooccurrence' as const,
      evidence: [
        {
          documentId,
          context: `Co-occurred ${pair.count} times at ${pair.level} level`,
          method: 'cooccurrence' as const,
          rawConfidence: this.calculateCooccurrenceConfidence(pair),
        },
      ],
      rawConfidence: this.calculateCooccurrenceConfidence(pair),
    }));
  }

  /**
   * Infer relation type from co-occurrence (basic heuristics)
   */
  private inferTypeFromCooccurrence(
    pair: import('../types.js').CooccurrencePair
  ): import('../types.js').RelationType {
    // Use entity types to make basic inference
    const sourceType = pair.sourceType.toLowerCase();
    const targetType = pair.targetType.toLowerCase();

    if (sourceType === 'model' && targetType === 'organization') {
      return 'DEVELOPED_BY';
    }
    if (sourceType === 'model' && targetType === 'dataset') {
      return 'TRAINED_ON';
    }
    if (sourceType === 'model' && targetType === 'technique') {
      return 'USES_TECHNIQUE';
    }
    if (sourceType === 'model' && targetType === 'benchmark') {
      return 'EVALUATED_ON';
    }
    if (sourceType === 'paper' && targetType === 'paper') {
      return 'CITES';
    }
    if (sourceType === 'person' && targetType === 'organization') {
      return 'AFFILIATED_WITH';
    }
    if (sourceType === 'person' && targetType === 'model') {
      return 'CONTRIBUTED_TO';
    }
    if (sourceType === 'researcher' && targetType === 'field') {
      return 'SPECIALIZES_IN';
    }

    // Default to CITES as most common relation
    return 'CITES';
  }

  /**
   * Calculate confidence from co-occurrence data
   */
  private calculateCooccurrenceConfidence(
    pair: import('../types.js').CooccurrencePair
  ): number {
    // Higher confidence for:
    // - More co-occurrences
    // - Sentence-level (more specific) over document-level
    const countFactor = Math.min(1, pair.count / 5);
    const levelFactor =
      pair.level === 'sentence' ? 1 : pair.level === 'paragraph' ? 0.8 : 0.6;
    return Math.min(1, countFactor * levelFactor);
  }

  /**
   * Extract relations from multiple documents (batch)
   */
  async extractBatch(documents: ExtractionDocument[]): Promise<BatchExtractionResult> {
    const startTime = Date.now();
    const results: ExtractionResult[] = [];
    const errors: Array<{ documentId: string; error: string }> = [];

    // Process in chunks based on maxConcurrency
    const chunks = this.chunkArray(documents, this.config.maxConcurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(async (doc) => {
        try {
          const result = await this.extract(doc);
          return { success: true, result };
        } catch (error) {
          return {
            success: false,
            documentId: doc.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      const chunkResults = await Promise.all(promises);

      for (const res of chunkResults) {
        if (res.success && 'result' in res) {
          results.push(res.result);
        } else if ('documentId' in res && 'error' in res) {
          errors.push({ documentId: res.documentId, error: res.error });
        }
      }
    }

    return {
      totalDocuments: documents.length,
      successCount: results.length,
      failureCount: errors.length,
      results,
      totalProcessingTime: Date.now() - startTime,
      errors,
    };
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Merge relations from different sources (deduplication)
   */
  mergeRelations(
    cooccurrenceRelations: ExtractedRelation[],
    patternRelations: ExtractedRelation[],
    llmRelations: ExtractedRelation[]
  ): ExtractedRelation[] {
    const merged = new Map<string, ExtractedRelation>();

    const processRelation = (relation: ExtractedRelation) => {
      const key = `${relation.sourceId}::${relation.targetId}::${relation.relationType}`;
      const existing = merged.get(key);

      if (existing) {
        // Merge evidence and take higher confidence
        merged.set(key, {
          ...existing,
          method: 'hybrid',
          evidence: [...existing.evidence, ...relation.evidence],
          rawConfidence: Math.max(existing.rawConfidence, relation.rawConfidence),
        });
      } else {
        merged.set(key, relation);
      }
    };

    // Process in order of increasing reliability
    cooccurrenceRelations.forEach(processRelation);
    patternRelations.forEach(processRelation);
    llmRelations.forEach(processRelation);

    return Array.from(merged.values());
  }

  /**
   * Check for contradictions in extracted relations
   */
  checkContradictions(relations: ScoredRelation[]): ScoredRelation[] {
    const contradictions = this.contradictionDetector.detect(relations);

    if (contradictions.length === 0) {
      return relations;
    }

    // Mark contradicting relations
    const contradictingIds = new Set<string>();
    for (const c of contradictions) {
      for (const r of c.relations) {
        contradictingIds.add(`${r.sourceId}::${r.targetId}::${r.relationType}`);
      }
    }

    return relations.map((r) => {
      const id = `${r.sourceId}::${r.targetId}::${r.relationType}`;
      if (contradictingIds.has(id)) {
        return {
          ...r,
          reviewStatus: 'pending' as const,
          needsReview: true,
        };
      }
      return r;
    });
  }

  /**
   * Update internal statistics
   */
  private updateStats(relations: ScoredRelation[]): void {
    this.stats.totalProcessed++;
    this.stats.totalRelations += relations.length;
    this.stats.totalConfidence += relations.reduce((sum, r) => sum + r.confidence, 0);

    for (const r of relations) {
      if (r.reviewStatus === 'approved') {
        this.stats.autoApproved++;
      } else if (r.reviewStatus === 'pending') {
        this.stats.reviewRequired++;
      } else if (r.reviewStatus === 'rejected') {
        this.stats.rejected++;
      }
    }
  }

  /**
   * Get statistics about extraction
   */
  getStatistics(): {
    totalProcessed: number;
    totalRelations: number;
    averageConfidence: number;
    reviewRequired: number;
    autoApproved: number;
    rejected: number;
  } {
    return {
      totalProcessed: this.stats.totalProcessed,
      totalRelations: this.stats.totalRelations,
      averageConfidence:
        this.stats.totalRelations > 0
          ? this.stats.totalConfidence / this.stats.totalRelations
          : 0,
      reviewRequired: this.stats.reviewRequired,
      autoApproved: this.stats.autoApproved,
      rejected: this.stats.rejected,
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.stats = {
      totalProcessed: 0,
      totalRelations: 0,
      totalConfidence: 0,
      reviewRequired: 0,
      autoApproved: 0,
      rejected: 0,
    };
  }

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<RelationExtractorServiceConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.cooccurrence) {
      this.cooccurrenceAnalyzer = new CooccurrenceAnalyzer(config.cooccurrence);
    }
    if (config.pattern) {
      this.patternMatcher.updateConfig(config.pattern);
    }
    if (config.scorer) {
      this.scorer.updateConfig(config.scorer);
    }
    if (config.contradiction) {
      this.contradictionDetector.updateConfig(config.contradiction);
    }
    if (config.llm) {
      this.llmInferrer.updateConfig(config.llm);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): RelationExtractorServiceConfig {
    return { ...this.config };
  }

  /**
   * Get component instances for testing
   */
  getComponents() {
    return {
      cooccurrenceAnalyzer: this.cooccurrenceAnalyzer,
      patternMatcher: this.patternMatcher,
      scorer: this.scorer,
      contradictionDetector: this.contradictionDetector,
      llmInferrer: this.llmInferrer,
    };
  }
}
