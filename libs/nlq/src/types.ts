/**
 * @fileoverview NLQ (Natural Language Query) Type Definitions
 * @description Types for natural language query processing in YAGOKORO GraphRAG
 * @module @yagokoro/nlq/types
 */

import { z } from 'zod';

// ============================================================================
// Query Intent Types
// ============================================================================

/**
 * Query intent types for classification
 */
export const QueryIntentType = {
  /** Looking up a specific entity (e.g., "What is GPT-4?") */
  ENTITY_LOOKUP: 'ENTITY_LOOKUP',
  /** Querying relationships (e.g., "Who developed Transformer?") */
  RELATIONSHIP_QUERY: 'RELATIONSHIP_QUERY',
  /** Finding paths between entities (e.g., "How are BERT and GPT related?") */
  PATH_FINDING: 'PATH_FINDING',
  /** Aggregation queries (e.g., "How many AI models were released in 2023?") */
  AGGREGATION: 'AGGREGATION',
  /** Global summaries (e.g., "What are the main trends in NLP?") */
  GLOBAL_SUMMARY: 'GLOBAL_SUMMARY',
  /** Comparison queries (e.g., "Compare GPT-4 and Claude 3") */
  COMPARISON: 'COMPARISON',
} as const;

export type QueryIntentType = (typeof QueryIntentType)[keyof typeof QueryIntentType];

/**
 * Schema for query intent classification result
 */
export const QueryIntentSchema = z.object({
  type: z.enum([
    'ENTITY_LOOKUP',
    'RELATIONSHIP_QUERY',
    'PATH_FINDING',
    'AGGREGATION',
    'GLOBAL_SUMMARY',
    'COMPARISON',
  ]),
  confidence: z.number().min(0).max(1),
  entities: z.array(z.string()),
  relations: z.array(z.string()).optional(),
  isAmbiguous: z.boolean(),
  clarificationNeeded: z.string().optional(),
});

export type QueryIntent = z.infer<typeof QueryIntentSchema>;

// ============================================================================
// Cypher Query Types
// ============================================================================

/**
 * Generated Cypher query with metadata
 */
export const CypherQuerySchema = z.object({
  cypher: z.string(),
  parameters: z.record(z.unknown()).optional(),
  isValid: z.boolean(),
  validationError: z.string().optional(),
});

export type CypherQuery = z.infer<typeof CypherQuerySchema>;

// ============================================================================
// NLQ Result Types
// ============================================================================

/**
 * NLQ error codes following Article IX (Error Code Convention)
 */
export const NLQErrorCode = {
  /** Failed to parse natural language query */
  PARSE_ERROR: 'E-NLQ-001',
  /** Failed to generate valid Cypher */
  CYPHER_GENERATION_ERROR: 'E-NLQ-002',
  /** Generated Cypher failed validation */
  CYPHER_VALIDATION_ERROR: 'E-NLQ-003',
  /** Query execution failed */
  EXECUTION_ERROR: 'E-NLQ-004',
  /** LLM service unavailable */
  LLM_UNAVAILABLE: 'E-NLQ-005',
} as const;

export type NLQErrorCode = (typeof NLQErrorCode)[keyof typeof NLQErrorCode];

/**
 * Schema for NLQ error
 */
export const NLQErrorSchema = z.object({
  code: z.enum(['E-NLQ-001', 'E-NLQ-002', 'E-NLQ-003', 'E-NLQ-004', 'E-NLQ-005']),
  message: z.string(),
  suggestions: z.array(z.string()).optional(),
  details: z.record(z.unknown()).optional(),
});

export type NLQError = z.infer<typeof NLQErrorSchema>;

/**
 * Schema for NLQ result
 */
export const NLQResultSchema = z.object({
  success: z.boolean(),
  data: z.array(z.record(z.unknown())).optional(),
  cypher: z.string().optional(),
  intent: QueryIntentSchema.optional(),
  fallbackUsed: z.boolean().default(false),
  executionTimeMs: z.number(),
  error: NLQErrorSchema.optional(),
});

export type NLQResult = z.infer<typeof NLQResultSchema>;

// ============================================================================
// Query Options Types
// ============================================================================

/**
 * Schema for NLQ query options
 */
export const NLQOptionsSchema = z.object({
  lang: z.enum(['ja', 'en']).default('ja'),
  fallback: z.boolean().default(true),
  maxRetries: z.number().default(3),
  timeout: z.number().default(30000),
  includeEvidence: z.boolean().default(true),
});

export type NLQOptions = z.infer<typeof NLQOptionsSchema>;

// ============================================================================
// Graph Schema Types
// ============================================================================

/**
 * Schema for Neo4j graph schema information
 */
export const GraphSchemaSchema = z.object({
  nodeLabels: z.array(z.string()),
  relationTypes: z.array(z.string()),
  propertyKeys: z.record(z.array(z.string())),
});

export type GraphSchema = z.infer<typeof GraphSchemaSchema>;

// ============================================================================
// Refinement Types
// ============================================================================

/**
 * Schema for query refinement (interactive clarification)
 */
export const QueryRefinementSchema = z.object({
  originalQuery: z.string(),
  clarificationQuestion: z.string(),
  suggestions: z.array(z.string()),
  refinedQuery: z.string().optional(),
});

export type QueryRefinement = z.infer<typeof QueryRefinementSchema>;

// ============================================================================
// Service Interface Types
// ============================================================================

/**
 * LLM client interface for NLQ operations
 */
export interface LLMClient {
  complete(prompt: string, options?: LLMCompletionOptions): Promise<string>;
}

export interface LLMCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

/**
 * Cypher executor interface (port)
 */
export interface CypherExecutor {
  execute<T = Record<string, unknown>>(
    cypher: string,
    parameters?: Record<string, unknown>
  ): Promise<T[]>;
  validate(cypher: string): Promise<{ valid: boolean; error?: string }>;
}

/**
 * Vector search interface (port)
 */
export interface VectorSearchClient {
  search(query: string, limit?: number): Promise<VectorSearchResult[]>;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}
