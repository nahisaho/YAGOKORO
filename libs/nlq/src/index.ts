/**
 * @fileoverview NLQ (Natural Language Query) Module
 * @description Natural language to Cypher query conversion for YAGOKORO GraphRAG
 * @module @yagokoro/nlq
 */

// ============================================================================
// Type Exports
// ============================================================================
export {
  // Query Intent
  QueryIntentType,
  QueryIntentSchema,
  type QueryIntent,
  // Cypher Query
  CypherQuerySchema,
  type CypherQuery,
  // NLQ Result
  NLQErrorCode,
  NLQErrorSchema,
  type NLQError,
  NLQResultSchema,
  type NLQResult,
  // Options
  NLQOptionsSchema,
  type NLQOptions,
  // Graph Schema
  GraphSchemaSchema,
  type GraphSchema,
  // Refinement
  QueryRefinementSchema,
  type QueryRefinement,
  // Interfaces
  type LLMClient,
  type LLMCompletionOptions,
  type CypherExecutor,
  type VectorSearchClient,
  type VectorSearchResult,
} from './types.js';

// ============================================================================
// Service Exports
// ============================================================================
export {
  SchemaProvider,
  type SchemaProviderConfig,
  type Neo4jConnectionPort,
} from './schema-provider.js';

export {
  IntentClassifier,
  type IntentClassifierConfig,
} from './intent-classifier.js';

export {
  CypherGenerator,
  type CypherGeneratorConfig,
  type CypherGenerationResult,
} from './cypher-generator.js';

export {
  NLQService,
  type NLQServiceConfig,
} from './nlq-service.js';

// ============================================================================
// Service Exports (to be implemented)
// ============================================================================
// export { QueryRefiner } from './query-refiner.js';
