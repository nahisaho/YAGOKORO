/**
 * @fileoverview NLQ Service - Main orchestrator
 * @description Integrates all NLQ components for end-to-end query processing
 * @module @yagokoro/nlq/nlq-service
 */

import {
  type NLQResult,
  type NLQOptions,
  type NLQError,
  type LLMClient,
  type CypherExecutor,
  type VectorSearchClient,
  type QueryIntent,
  NLQOptionsSchema,
  NLQErrorCode,
} from './types.js';
import { SchemaProvider, type Neo4jConnectionPort } from './schema-provider.js';
import { IntentClassifier } from './intent-classifier.js';
import { CypherGenerator } from './cypher-generator.js';

/**
 * Configuration for NLQService
 */
export interface NLQServiceConfig {
  /** LLM client for query processing */
  llm: LLMClient;
  /** Neo4j connection for schema and query execution */
  neo4j: Neo4jConnectionPort & CypherExecutor;
  /** Optional vector search client for fallback */
  vectorSearch?: VectorSearchClient;
  /** Default language */
  defaultLang?: 'ja' | 'en';
  /** Enable fallback to vector search */
  enableFallback?: boolean;
}

/**
 * NLQService - Main entry point for Natural Language Query processing
 *
 * Orchestrates the full NLQ pipeline:
 * 1. Intent classification
 * 2. Cypher generation
 * 3. Query execution
 * 4. Fallback to vector search (if enabled)
 *
 * @example
 * ```typescript
 * const nlq = new NLQService({
 *   llm: ollamaClient,
 *   neo4j: neo4jConnection,
 *   vectorSearch: qdrantClient,
 * });
 *
 * const result = await nlq.query("Transformerを開発した研究者は？");
 * if (result.success) {
 *   console.log(result.data);
 * }
 * ```
 */
export class NLQService {
  private readonly schemaProvider: SchemaProvider;
  private readonly intentClassifier: IntentClassifier;
  private readonly cypherGenerator: CypherGenerator;
  private readonly defaultLang: 'ja' | 'en';
  private readonly enableFallback: boolean;

  constructor(private readonly config: NLQServiceConfig) {
    this.defaultLang = config.defaultLang ?? 'ja';
    this.enableFallback = config.enableFallback ?? true;

    // Initialize components
    this.schemaProvider = new SchemaProvider(config.neo4j);
    this.intentClassifier = new IntentClassifier(config.llm, {
      defaultLang: this.defaultLang,
    });
    this.cypherGenerator = new CypherGenerator(
      config.llm,
      this.schemaProvider,
      config.neo4j
    );
  }

  /**
   * Process a natural language query
   *
   * @param queryText The user's natural language query
   * @param options Query options
   * @returns NLQResult with data or error
   */
  async query(queryText: string, options?: Partial<NLQOptions>): Promise<NLQResult> {
    const startTime = Date.now();
    const opts = NLQOptionsSchema.parse(options ?? {});
    const lang = opts.lang ?? this.defaultLang;

    try {
      // Step 1: Classify intent
      const intent = await this.intentClassifier.classify(queryText, lang);

      // Check for ambiguous queries
      if (intent.isAmbiguous && intent.clarificationNeeded) {
        return this.createClarificationResult(intent, startTime);
      }

      // Step 2: Generate Cypher
      const cypherResult = await this.cypherGenerator.generate(queryText, intent, lang);

      if (!cypherResult.success || !cypherResult.query) {
        // Try fallback if enabled
        if (this.enableFallback && opts.fallback && this.config.vectorSearch) {
          return this.executeFallback(queryText, intent, startTime);
        }

        return this.createErrorResult(
          cypherResult.error ?? {
            code: NLQErrorCode.CYPHER_GENERATION_ERROR,
            message: 'Failed to generate Cypher query',
          },
          startTime
        );
      }

      // Step 3: Execute Cypher
      try {
        const data = await this.config.neo4j.execute<Record<string, unknown>>(
          cypherResult.query.cypher
        );

        return {
          success: true,
          data,
          cypher: cypherResult.query.cypher,
          intent,
          fallbackUsed: false,
          executionTimeMs: Date.now() - startTime,
        };
      } catch (executionError) {
        // Cypher execution failed - try fallback
        if (this.enableFallback && opts.fallback && this.config.vectorSearch) {
          return this.executeFallback(queryText, intent, startTime);
        }

        return this.createErrorResult(
          {
            code: NLQErrorCode.EXECUTION_ERROR,
            message: executionError instanceof Error
              ? executionError.message
              : 'Query execution failed',
          },
          startTime
        );
      }
    } catch (error) {
      // Unexpected error
      return this.createErrorResult(
        {
          code: NLQErrorCode.PARSE_ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        startTime
      );
    }
  }

  /**
   * Execute fallback vector search
   */
  private async executeFallback(
    queryText: string,
    intent: QueryIntent,
    startTime: number
  ): Promise<NLQResult> {
    if (!this.config.vectorSearch) {
      return this.createErrorResult(
        {
          code: NLQErrorCode.EXECUTION_ERROR,
          message: 'Fallback not available',
        },
        startTime
      );
    }

    try {
      const searchResults = await this.config.vectorSearch.search(queryText, 10);

      const data = searchResults.map((r) => ({
        id: r.id,
        score: r.score,
        ...r.payload,
      }));

      return {
        success: true,
        data,
        intent,
        fallbackUsed: true,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return this.createErrorResult(
        {
          code: NLQErrorCode.EXECUTION_ERROR,
          message: 'Fallback search failed',
        },
        startTime
      );
    }
  }

  /**
   * Create result for ambiguous queries needing clarification
   */
  private createClarificationResult(intent: QueryIntent, startTime: number): NLQResult {
    return {
      success: false,
      intent,
      fallbackUsed: false,
      executionTimeMs: Date.now() - startTime,
      error: {
        code: NLQErrorCode.PARSE_ERROR,
        message: intent.clarificationNeeded ?? 'Query is ambiguous',
        suggestions: [intent.clarificationNeeded ?? ''].filter(Boolean),
      },
    };
  }

  /**
   * Create error result
   */
  private createErrorResult(
    error: { code: string; message: string; suggestions?: string[] },
    startTime: number
  ): NLQResult {
    return {
      success: false,
      fallbackUsed: false,
      executionTimeMs: Date.now() - startTime,
      error: error as NLQError,
    };
  }

  /**
   * Get the schema provider for direct access
   */
  getSchemaProvider(): SchemaProvider {
    return this.schemaProvider;
  }

  /**
   * Get the intent classifier for direct access
   */
  getIntentClassifier(): IntentClassifier {
    return this.intentClassifier;
  }

  /**
   * Get the cypher generator for direct access
   */
  getCypherGenerator(): CypherGenerator {
    return this.cypherGenerator;
  }
}
