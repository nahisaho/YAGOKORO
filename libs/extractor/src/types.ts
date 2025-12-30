/**
 * Types for relation extraction
 */

import { z } from 'zod';

/**
 * Extended relation types for v3
 */
export type RelationType =
  // v2 existing types
  | 'DEVELOPED_BY'
  | 'TRAINED_ON'
  | 'USES_TECHNIQUE'
  | 'EVALUATED_ON'
  | 'CITES'
  | 'AFFILIATED_WITH'
  | 'CONTRIBUTED_TO'
  | 'SPECIALIZES_IN'
  // v3 new types
  | 'INFLUENCED_BY'
  | 'COLLABORATED_WITH'
  | 'EVOLVED_INTO'
  | 'COMPETES_WITH'
  | 'BASED_ON';

/**
 * Review status for extracted relations
 */
export type ReviewStatus =
  | 'pending'      // Awaiting review
  | 'approved'     // Auto or human approved
  | 'rejected'     // Rejected by human
  | 'modified';    // Human modified

/**
 * Extraction method used
 */
export type ExtractionMethod =
  | 'cooccurrence'   // Co-occurrence analysis
  | 'pattern'        // Pattern matching
  | 'llm'            // LLM inference
  | 'hybrid';        // Combined methods

/**
 * Evidence for extracted relation
 */
export interface Evidence {
  /** Source document ID */
  documentId: string;
  /** Position in document (sentence/paragraph index) */
  position?: number;
  /** Context snippet */
  context: string;
  /** Method used to extract */
  method: ExtractionMethod;
  /** Raw confidence from method */
  rawConfidence: number;
}

/**
 * Co-occurrence pair
 */
export interface CooccurrencePair {
  /** Source entity ID */
  sourceId: string;
  /** Source entity name */
  sourceName: string;
  /** Source entity type */
  sourceType: string;
  /** Target entity ID */
  targetId: string;
  /** Target entity name */
  targetName: string;
  /** Target entity type */
  targetType: string;
  /** Co-occurrence count */
  count: number;
  /** Document IDs where co-occurrence was found */
  documentIds: string[];
  /** Co-occurrence level (document, paragraph, sentence) */
  level: 'document' | 'paragraph' | 'sentence';
}

/**
 * Pattern match result
 */
export interface PatternMatch {
  /** Matched pattern */
  pattern: string;
  /** Inferred relation type */
  relationType: RelationType;
  /** Confidence of match */
  confidence: number;
  /** Matched text */
  matchedText: string;
}

/**
 * Extracted relation (before scoring)
 */
export interface ExtractedRelation {
  /** Source entity ID */
  sourceId: string;
  /** Target entity ID */
  targetId: string;
  /** Relation type */
  relationType: RelationType;
  /** Extraction method */
  method: ExtractionMethod;
  /** Evidence list */
  evidence: Evidence[];
  /** Raw confidence before scoring */
  rawConfidence: number;
}

/**
 * Scored relation (after scoring, ready for HITL)
 */
export interface ScoredRelation extends ExtractedRelation {
  /** Final confidence score (0.0-1.0) */
  confidence: number;
  /** Score components */
  scoreComponents: {
    cooccurrenceScore: number;
    llmConfidence: number;
    sourceReliability: number;
    graphConsistency: number;
  };
  /** Review status */
  reviewStatus: ReviewStatus;
  /** Whether needs human review */
  needsReview: boolean;
}

/**
 * Document for extraction
 */
export interface ExtractionDocument {
  /** Document ID */
  id: string;
  /** Title */
  title: string;
  /** Abstract/content */
  content: string;
  /** Source (arxiv, semantic_scholar, etc.) */
  source: string;
  /** Entities already identified in document */
  entities?: DocumentEntity[];
}

/**
 * Entity found in document
 */
export interface DocumentEntity {
  /** Entity ID (if known) */
  id?: string;
  /** Entity name as appears in text */
  name: string;
  /** Entity type */
  type: string;
  /** Positions in text */
  positions: number[];
  /** Normalized name */
  normalizedName?: string;
}

/**
 * Extraction result
 */
export interface ExtractionResult {
  /** Document ID */
  documentId: string;
  /** Extracted relations */
  relations: ScoredRelation[];
  /** Detected entities */
  entities: DocumentEntity[];
  /** Processing time (ms) */
  processingTime: number;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Batch extraction result
 */
export interface BatchExtractionResult {
  /** Total documents processed */
  totalDocuments: number;
  /** Successful extractions */
  successCount: number;
  /** Failed extractions */
  failureCount: number;
  /** Results per document */
  results: ExtractionResult[];
  /** Total processing time (ms) */
  totalProcessingTime: number;
  /** Errors encountered */
  errors: Array<{ documentId: string; error: string }>;
}

// Zod schemas for validation
export const RelationTypeSchema = z.enum([
  'DEVELOPED_BY',
  'TRAINED_ON',
  'USES_TECHNIQUE',
  'EVALUATED_ON',
  'CITES',
  'AFFILIATED_WITH',
  'CONTRIBUTED_TO',
  'SPECIALIZES_IN',
  'INFLUENCED_BY',
  'COLLABORATED_WITH',
  'EVOLVED_INTO',
  'COMPETES_WITH',
  'BASED_ON',
]);

export const ReviewStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'modified',
]);

export const ExtractionMethodSchema = z.enum([
  'cooccurrence',
  'pattern',
  'llm',
  'hybrid',
]);

export const EvidenceSchema = z.object({
  documentId: z.string(),
  position: z.number().optional(),
  context: z.string(),
  method: ExtractionMethodSchema,
  rawConfidence: z.number().min(0).max(1),
});

export const CooccurrencePairSchema = z.object({
  sourceId: z.string(),
  sourceName: z.string(),
  sourceType: z.string(),
  targetId: z.string(),
  targetName: z.string(),
  targetType: z.string(),
  count: z.number().int().positive(),
  documentIds: z.array(z.string()),
  level: z.enum(['document', 'paragraph', 'sentence']),
});
