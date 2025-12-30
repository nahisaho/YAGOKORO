/**
 * LazyQueryEngine - LazyGraphRAG Main Query Engine
 *
 * Integrates all LazyGraphRAG components for efficient query processing:
 * - QueryExpander: Subquery generation and concept matching
 * - RelevanceAssessor: Budget-controlled relevance testing
 * - IterativeSearch: Best-first + breadth-first search
 * - ClaimExtractor: Query-relevant claim extraction
 * - ResponseGenerator: Final answer generation
 *
 * @see https://www.microsoft.com/en-us/research/blog/lazygraphrag-setting-a-new-standard-for-quality-and-cost/
 */

import type { BaseLLMClient } from '../llm/BaseLLMClient.js';
import type { ChatMessage } from '../llm/types.js';
import type { ConceptGraph } from '../extraction/ConceptGraphBuilder.js';
import type { TextChunk } from '../extraction/types.js';
import { QueryExpander } from './QueryExpander.js';
import { RelevanceAssessor } from './RelevanceAssessor.js';
import { IterativeSearch, KeywordSimilarityScorer, type IterativeSearchResult, type SimilarityScorer } from './IterativeSearch.js';
import { ClaimExtractor, type Claim } from './ClaimExtractor.js';

/**
 * LazyGraphRAG query response
 */
export interface LazyQueryResponse {
  /** Generated answer */
  answer: string;
  /** Original query */
  query: string;
  /** Expanded query with concepts */
  expandedQuery: string;
  /** Claims used for answer */
  claims: Claim[];
  /** Sources cited */
  sources: Array<{
    chunkId: string;
    relevanceScore: number;
  }>;
  /** Query metrics */
  metrics: LazyQueryMetrics;
}

/**
 * Query processing metrics
 */
export interface LazyQueryMetrics {
  /** Total processing time */
  totalTimeMs: number;
  /** Query expansion time */
  expansionTimeMs: number;
  /** Search time */
  searchTimeMs: number;
  /** Claim extraction time */
  extractionTimeMs: number;
  /** Answer generation time */
  generationTimeMs: number;
  /** Relevance tests used */
  relevanceTestsUsed: number;
  /** Budget remaining */
  budgetRemaining: number;
  /** Communities explored */
  communitiesExplored: number;
  /** Relevant chunks found */
  relevantChunksFound: number;
  /** Claims extracted */
  claimsExtracted: number;
}

/**
 * LazyGraphRAG configuration
 */
export interface LazyQueryEngineConfig {
  /** Relevance test budget (100, 500, 1500 typical) */
  budget: number;
  /** Number of subqueries to generate */
  numSubqueries?: number;
  /** Zero-relevance threshold for deepening */
  zeroRelevanceThreshold?: number;
  /** Context window size for claims */
  contextWindowSize?: number;
  /** Whether to include rationale in assessment */
  includeRationale?: boolean;
  /** Maximum results to return */
  maxResults?: number;
}

/**
 * Default configuration (Z100_Lite equivalent)
 */
const DEFAULT_CONFIG: Required<LazyQueryEngineConfig> = {
  budget: 100,
  numSubqueries: 4,
  zeroRelevanceThreshold: 3,
  contextWindowSize: 4000,
  includeRationale: false,
  maxResults: 50,
};

/**
 * Preset configurations matching LazyGraphRAG paper
 */
export const LazyQueryPresets = {
  /** Z100_Lite: Low cost, good quality */
  Z100_LITE: {
    budget: 100,
    numSubqueries: 3,
    zeroRelevanceThreshold: 3,
    contextWindowSize: 4000,
  } as LazyQueryEngineConfig,

  /** Z500: Medium cost, high quality */
  Z500: {
    budget: 500,
    numSubqueries: 4,
    zeroRelevanceThreshold: 4,
    contextWindowSize: 8000,
  } as LazyQueryEngineConfig,

  /** Z1500: Higher cost, best quality */
  Z1500: {
    budget: 1500,
    numSubqueries: 5,
    zeroRelevanceThreshold: 5,
    contextWindowSize: 16000,
  } as LazyQueryEngineConfig,
};

/**
 * LazyQueryEngine
 *
 * Main entry point for LazyGraphRAG queries.
 *
 * @example
 * ```typescript
 * const engine = new LazyQueryEngine({
 *   assessorClient: gpt4oMiniClient,  // Low-cost LLM
 *   generatorClient: gpt4oClient,      // High-quality LLM
 * });
 *
 * const response = await engine.query(
 *   'What are the main advances in language models?',
 *   conceptGraph,
 *   chunks,
 *   LazyQueryPresets.Z500
 * );
 *
 * console.log(response.answer);
 * ```
 */
export class LazyQueryEngine {
  private readonly assessorClient: BaseLLMClient;
  private readonly generatorClient: BaseLLMClient;
  private readonly similarityScorer: SimilarityScorer;
  private readonly config: Required<LazyQueryEngineConfig>;

  // Components (lazily initialized)
  private queryExpander?: QueryExpander;
  private relevanceAssessor?: RelevanceAssessor;
  private iterativeSearch?: IterativeSearch;
  private claimExtractor?: ClaimExtractor;

  constructor(deps: {
    /** LLM client for relevance assessment (low-cost recommended) */
    assessorClient: BaseLLMClient;
    /** LLM client for answer generation (high-quality recommended) */
    generatorClient: BaseLLMClient;
    /** Optional custom similarity scorer */
    similarityScorer?: SimilarityScorer;
  }, config?: LazyQueryEngineConfig) {
    this.assessorClient = deps.assessorClient;
    this.generatorClient = deps.generatorClient;
    this.similarityScorer = deps.similarityScorer ?? new KeywordSimilarityScorer();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute a LazyGraphRAG query
   *
   * @param query - Natural language query
   * @param conceptGraph - Pre-built concept graph
   * @param chunks - Source text chunks
   * @param config - Override configuration
   * @returns Query response with answer and metrics
   */
  async query(
    query: string,
    conceptGraph: ConceptGraph,
    chunks: TextChunk[],
    config?: LazyQueryEngineConfig
  ): Promise<LazyQueryResponse> {
    const startTime = Date.now();
    const mergedConfig = { ...this.config, ...config };

    // Initialize components
    this.initializeComponents(mergedConfig);

    const metrics: Partial<LazyQueryMetrics> = {
      relevanceTestsUsed: 0,
      budgetRemaining: mergedConfig.budget,
    };

    // Step 1: Query Expansion
    const expansionStart = Date.now();
    const expansionResult = await this.queryExpander!.expand(
      query,
      conceptGraph,
      { numSubqueries: mergedConfig.numSubqueries }
    );
    metrics.expansionTimeMs = Date.now() - expansionStart;

    // Step 2: Iterative Search (for each subquery)
    const searchStart = Date.now();
    let totalTestsUsed = 0;
    const allSearchResults: IterativeSearchResult[] = [];

    const budgetPerSubquery = Math.floor(mergedConfig.budget / expansionResult.subqueries.length);

    for (const subquery of expansionResult.subqueries) {
      const searchResult = await this.iterativeSearch!.search(
        subquery.refinedText ?? subquery.text,
        conceptGraph,
        chunks,
        {
          budget: budgetPerSubquery,
          zeroRelevanceThreshold: mergedConfig.zeroRelevanceThreshold,
          maxResults: mergedConfig.maxResults,
        }
      );
      allSearchResults.push(searchResult);
      totalTestsUsed += searchResult.testsUsed;
    }
    metrics.searchTimeMs = Date.now() - searchStart;
    metrics.relevanceTestsUsed = totalTestsUsed;
    metrics.budgetRemaining = mergedConfig.budget - totalTestsUsed;

    // Combine relevant chunks from all subqueries
    const combinedChunks = this.combineSearchResults(allSearchResults);
    metrics.relevantChunksFound = combinedChunks.length;
    metrics.communitiesExplored = allSearchResults.reduce(
      (sum, r) => sum + r.communitiesExplored.length,
      0
    );

    // Step 3: Claim Extraction
    const extractionStart = Date.now();
    const claimResult = await this.claimExtractor!.extract(
      expansionResult.expandedQuery,
      combinedChunks,
      { contextWindowSize: mergedConfig.contextWindowSize }
    );
    metrics.extractionTimeMs = Date.now() - extractionStart;
    metrics.claimsExtracted = claimResult.filteredClaims.length;

    // Step 4: Answer Generation
    const generationStart = Date.now();
    const answer = await this.generateAnswer(
      expansionResult.expandedQuery,
      claimResult.filteredClaims
    );
    metrics.generationTimeMs = Date.now() - generationStart;

    metrics.totalTimeMs = Date.now() - startTime;

    // Build sources list
    const sources = claimResult.filteredClaims.map((claim) => ({
      chunkId: claim.sourceChunkId,
      relevanceScore: claim.relevanceScore,
    }));

    // Deduplicate sources
    const uniqueSources = [...new Map(sources.map((s) => [s.chunkId, s])).values()];

    return {
      answer,
      query,
      expandedQuery: expansionResult.expandedQuery,
      claims: claimResult.filteredClaims,
      sources: uniqueSources,
      metrics: metrics as LazyQueryMetrics,
    };
  }

  /**
   * Initialize components with config
   */
  private initializeComponents(config: Required<LazyQueryEngineConfig>): void {
    this.queryExpander = new QueryExpander(this.assessorClient, {
      numSubqueries: config.numSubqueries,
    });

    this.relevanceAssessor = new RelevanceAssessor(this.assessorClient, {
      includeRationale: config.includeRationale,
    });

    this.iterativeSearch = new IterativeSearch(
      this.relevanceAssessor,
      this.similarityScorer,
      {
        budget: config.budget,
        zeroRelevanceThreshold: config.zeroRelevanceThreshold,
        maxResults: config.maxResults,
      }
    );

    this.claimExtractor = new ClaimExtractor(this.assessorClient, {
      contextWindowSize: config.contextWindowSize,
    });
  }

  /**
   * Combine search results from multiple subqueries
   */
  private combineSearchResults(results: IterativeSearchResult[]) {
    const chunkMap = new Map<string, (typeof results)[0]['relevantChunks'][0]>();

    for (const result of results) {
      for (const chunk of result.relevantChunks) {
        const existing = chunkMap.get(chunk.chunk.id);
        if (!existing || (chunk.relevanceAssessment?.score ?? 0) > (existing.relevanceAssessment?.score ?? 0)) {
          chunkMap.set(chunk.chunk.id, chunk);
        }
      }
    }

    // Sort by relevance and return
    return [...chunkMap.values()].sort((a, b) => {
      const scoreA = a.relevanceAssessment?.score ?? 0;
      const scoreB = b.relevanceAssessment?.score ?? 0;
      return scoreB - scoreA;
    });
  }

  /**
   * Generate final answer from claims
   */
  private async generateAnswer(expandedQuery: string, claims: Claim[]): Promise<string> {
    if (claims.length === 0) {
      return 'I could not find relevant information to answer this query.';
    }

    const claimsText = this.claimExtractor!.formatForContext(claims);

    const systemPrompt = `You are a knowledgeable assistant. Answer the user's question based ONLY on the provided claims/facts. Be comprehensive and cite specific claims when relevant.

Rules:
1. Only use information from the provided claims
2. If claims don't fully answer the question, acknowledge limitations
3. Organize your response clearly
4. Reference claim numbers when citing information`;

    const userPrompt = `Question: ${expandedQuery}

Relevant Claims:
${claimsText}

Please provide a comprehensive answer based on these claims.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await this.generatorClient.chat(messages, {
      temperature: 0.3,
    });

    return response.content ?? 'Unable to generate answer.';
  }

  /**
   * Get estimated cost for a query configuration
   *
   * Returns relative cost compared to full GraphRAG global search
   */
  estimateCost(config: LazyQueryEngineConfig): {
    relativeCost: number;
    description: string;
  } {
    const budget = config.budget ?? DEFAULT_CONFIG.budget;

    // Based on LazyGraphRAG paper metrics
    if (budget <= 100) {
      return {
        relativeCost: 0.001, // ~0.1% of GraphRAG
        description: 'Very low cost (Z100_Lite equivalent)',
      };
    } else if (budget <= 500) {
      return {
        relativeCost: 0.04, // ~4% of GraphRAG C2
        description: 'Low cost (Z500 equivalent)',
      };
    } else {
      return {
        relativeCost: 0.1, // ~10% of GraphRAG
        description: 'Medium cost (Z1500 equivalent)',
      };
    }
  }

  /**
   * Get configuration for specific use case
   */
  static getConfigForUseCase(useCase: 'exploration' | 'production' | 'benchmark'): LazyQueryEngineConfig {
    switch (useCase) {
      case 'exploration':
        return LazyQueryPresets.Z100_LITE;
      case 'production':
        return LazyQueryPresets.Z500;
      case 'benchmark':
        return LazyQueryPresets.Z1500;
    }
  }
}
