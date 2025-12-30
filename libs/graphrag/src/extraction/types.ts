/**
 * Entity types that can be extracted
 */
export type ExtractableEntityType =
  | 'AIModel'
  | 'Organization'
  | 'Person'
  | 'Technique'
  | 'Publication'
  | 'Benchmark'
  | 'Concept'
  | 'Community';

/**
 * Extracted entity from text (before domain entity creation)
 */
export interface ExtractedEntity {
  /** Temporary ID for linking within extraction context */
  tempId: string;
  /** Entity type */
  type: ExtractableEntityType;
  /** Entity name */
  name: string;
  /** Entity description */
  description?: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Source text span */
  sourceSpan?: {
    start: number;
    end: number;
    text: string;
  };
  /** Additional attributes */
  attributes?: Record<string, unknown>;
}

/**
 * Relation types that can be extracted
 */
export type ExtractableRelationType =
  | 'DEVELOPED_BY'
  | 'TRAINED_ON'
  | 'USES_TECHNIQUE'
  | 'DERIVED_FROM'
  | 'EVALUATED_ON'
  | 'PUBLISHED_IN'
  | 'AFFILIATED_WITH'
  | 'AUTHORED_BY'
  | 'CITES'
  | 'PART_OF'
  | 'RELATED_TO';

/**
 * Extracted relation between entities
 */
export interface ExtractedRelation {
  /** Source entity temp ID */
  sourceTempId: string;
  /** Target entity temp ID */
  targetTempId: string;
  /** Relation type */
  type: ExtractableRelationType;
  /** Confidence score (0-1) */
  confidence: number;
  /** Additional properties */
  properties?: Record<string, unknown>;
}

/**
 * Result of extraction from a single text chunk
 */
export interface ExtractionResult {
  /** Extracted entities */
  entities: ExtractedEntity[];
  /** Extracted relations */
  relations: ExtractedRelation[];
  /** Source text */
  sourceText: string;
  /** Processing metadata */
  metadata: {
    processingTimeMs: number;
    tokenCount?: number;
    model?: string;
  };
}

/**
 * Options for entity extraction
 */
export interface EntityExtractionOptions {
  /** Entity types to extract (empty = all types) */
  entityTypes?: ExtractableEntityType[];
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;
  /** Maximum entities to extract per chunk */
  maxEntities?: number;
  /** Include source spans in results */
  includeSourceSpans?: boolean;
  /** Custom extraction prompt */
  customPrompt?: string;
}

/**
 * Options for relation extraction
 */
export interface RelationExtractionOptions {
  /** Relation types to extract (empty = all types) */
  relationTypes?: ExtractableRelationType[];
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;
  /** Maximum relations to extract per chunk */
  maxRelations?: number;
  /** Custom extraction prompt */
  customPrompt?: string;
}

/**
 * Text chunk for processing
 */
export interface TextChunk {
  /** Unique chunk ID */
  id: string;
  /** Chunk content */
  content: string;
  /** Chunk metadata */
  metadata?: {
    source?: string;
    page?: number;
    section?: string;
    [key: string]: unknown;
  };
}

/**
 * Entity extraction prompt template
 */
export interface ExtractionPromptTemplate {
  /** System prompt */
  system: string;
  /** User prompt template (with placeholders) */
  user: string;
  /** Output format instructions */
  outputFormat: string;
}
