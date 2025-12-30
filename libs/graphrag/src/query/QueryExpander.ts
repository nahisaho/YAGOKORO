/**
 * QueryExpander - LazyGraphRAG Query Expansion
 *
 * Expands queries into subqueries and matches with concept graph.
 * Key part of LazyGraphRAG's query-time optimization.
 *
 * Features:
 * - Generates 3-5 subqueries from original query
 * - Matches subqueries with concepts from graph
 * - Creates expanded query with matched concepts
 */

import type { BaseLLMClient } from '../llm/BaseLLMClient.js';
import type { ChatMessage } from '../llm/types.js';
import type { ConceptGraph, ConceptNode } from '../extraction/ConceptGraphBuilder.js';

/**
 * Subquery generated from original query
 */
export interface Subquery {
  /** Unique subquery ID */
  id: string;
  /** Subquery text */
  text: string;
  /** Original query this was derived from */
  originalQuery: string;
  /** Matched concepts from graph */
  matchedConcepts: MatchedConcept[];
  /** Refined subquery (after concept matching) */
  refinedText?: string;
}

/**
 * Concept matched to a query
 */
export interface MatchedConcept {
  /** Concept ID */
  conceptId: string;
  /** Concept text */
  text: string;
  /** Match score (0-1) */
  score: number;
  /** Match type */
  matchType: 'exact' | 'partial' | 'semantic';
}

/**
 * Query expansion result
 */
export interface QueryExpansionResult {
  /** Original query */
  originalQuery: string;
  /** Generated subqueries */
  subqueries: Subquery[];
  /** Expanded/combined query */
  expandedQuery: string;
  /** All matched concepts */
  allMatchedConcepts: MatchedConcept[];
  /** Processing metadata */
  metadata: {
    processingTimeMs: number;
    subqueryCount: number;
    matchedConceptCount: number;
  };
}

/**
 * Options for query expansion
 */
export interface QueryExpanderOptions {
  /** Number of subqueries to generate (3-5) */
  numSubqueries?: number;
  /** Minimum concept match score */
  minMatchScore?: number;
  /** Maximum concepts per subquery */
  maxConceptsPerSubquery?: number;
  /** Whether to use LLM for semantic matching */
  useSemanticMatching?: boolean;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<QueryExpanderOptions> = {
  numSubqueries: 4,
  minMatchScore: 0.3,
  maxConceptsPerSubquery: 10,
  useSemanticMatching: false,
};

/**
 * QueryExpander
 *
 * Expands queries for LazyGraphRAG search.
 *
 * @example
 * ```typescript
 * const expander = new QueryExpander(llmClient);
 *
 * const result = await expander.expand(
 *   'What are the main advances in language models?',
 *   conceptGraph
 * );
 *
 * console.log(result.subqueries);
 * // [
 * //   { text: 'language model advances', matchedConcepts: [...] },
 * //   { text: 'transformer improvements', matchedConcepts: [...] },
 * //   ...
 * // ]
 * ```
 */
export class QueryExpander {
  private readonly llmClient: BaseLLMClient;
  private readonly options: Required<QueryExpanderOptions>;

  constructor(llmClient: BaseLLMClient, options?: QueryExpanderOptions) {
    this.llmClient = llmClient;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Expand a query into subqueries with concept matching
   *
   * @param query - Original query
   * @param conceptGraph - Concept graph for matching
   * @param options - Override options
   * @returns Query expansion result
   */
  async expand(
    query: string,
    conceptGraph: ConceptGraph,
    options?: QueryExpanderOptions
  ): Promise<QueryExpansionResult> {
    const startTime = Date.now();
    const mergedOptions = { ...this.options, ...options };

    // Step 1: Generate subqueries using LLM
    const subqueryTexts = await this.generateSubqueries(query, mergedOptions.numSubqueries);

    // Step 2: Match each subquery with concepts
    const subqueries: Subquery[] = [];
    const allMatchedConcepts: MatchedConcept[] = [];

    for (let i = 0; i < subqueryTexts.length; i++) {
      const subqueryText = subqueryTexts[i];
      if (!subqueryText) continue;

      const matchedConcepts = this.matchConcepts(
        subqueryText,
        conceptGraph.nodes,
        mergedOptions
      );

      // Deduplicate concepts
      for (const concept of matchedConcepts) {
        if (!allMatchedConcepts.some((c) => c.conceptId === concept.conceptId)) {
          allMatchedConcepts.push(concept);
        }
      }

      // Refine subquery with matched concepts
      const refinedText = this.refineSubquery(subqueryText, matchedConcepts);

      subqueries.push({
        id: `subquery-${i}`,
        text: subqueryText,
        originalQuery: query,
        matchedConcepts,
        refinedText,
      });
    }

    // Step 3: Create expanded query
    const expandedQuery = this.createExpandedQuery(query, subqueries, allMatchedConcepts);

    return {
      originalQuery: query,
      subqueries,
      expandedQuery,
      allMatchedConcepts,
      metadata: {
        processingTimeMs: Date.now() - startTime,
        subqueryCount: subqueries.length,
        matchedConceptCount: allMatchedConcepts.length,
      },
    };
  }

  /**
   * Generate subqueries from original query using LLM
   */
  private async generateSubqueries(query: string, numSubqueries: number): Promise<string[]> {
    const systemPrompt = `You are a query decomposition expert. Your task is to break down a complex question into simpler, focused subqueries that together cover all aspects of the original question.

Rules:
1. Generate exactly ${numSubqueries} subqueries
2. Each subquery should be self-contained and focused
3. Together, the subqueries should cover the full scope of the original question
4. Subqueries should be phrased as search queries (not questions)
5. Output as JSON array of strings`;

    const userPrompt = `Decompose this query into ${numSubqueries} focused subqueries:

Query: "${query}"

Output format: ["subquery1", "subquery2", ...]`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      const response = await this.llmClient.chat(messages, {
        temperature: 0.3,
        structured: { type: 'json' },
      });

      const content = response.content ?? '';
      const parsed = JSON.parse(content);
      
      if (Array.isArray(parsed)) {
        return parsed.slice(0, numSubqueries);
      }
      
      // Fallback: split original query
      return this.fallbackSubqueries(query, numSubqueries);
    } catch {
      return this.fallbackSubqueries(query, numSubqueries);
    }
  }

  /**
   * Fallback subquery generation without LLM
   */
  private fallbackSubqueries(query: string, numSubqueries: number): string[] {
    // Simple word-based decomposition
    const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const subqueries: string[] = [query]; // Always include original

    // Add partial queries
    if (words.length >= 4) {
      const mid = Math.floor(words.length / 2);
      subqueries.push(words.slice(0, mid).join(' '));
      subqueries.push(words.slice(mid).join(' '));
    }

    // Add key term queries
    const keyTerms = words.filter((w) => !this.isStopword(w));
    for (const term of keyTerms.slice(0, numSubqueries - subqueries.length)) {
      subqueries.push(term);
    }

    return subqueries.slice(0, numSubqueries);
  }

  /**
   * Match subquery with concepts from graph
   */
  private matchConcepts(
    subquery: string,
    nodes: ConceptNode[],
    options: Required<QueryExpanderOptions>
  ): MatchedConcept[] {
    const queryLower = subquery.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter((w) => !this.isStopword(w));
    const matches: MatchedConcept[] = [];

    for (const node of nodes) {
      const conceptLower = node.text.toLowerCase();
      let score = 0;
      let matchType: 'exact' | 'partial' | 'semantic' = 'partial';

      // Exact match
      if (queryLower.includes(conceptLower) || conceptLower.includes(queryLower)) {
        score = 1.0;
        matchType = 'exact';
      } else {
        // Partial match (term overlap)
        const conceptTerms = conceptLower.split(/\s+/);
        const overlappingTerms = queryTerms.filter((t) =>
          conceptTerms.some((ct) => ct.includes(t) || t.includes(ct))
        );

        if (overlappingTerms.length > 0) {
          score = overlappingTerms.length / Math.max(queryTerms.length, conceptTerms.length);
          matchType = 'partial';
        }
      }

      // Boost by concept importance
      score *= 0.5 + 0.5 * node.importance;

      if (score >= options.minMatchScore) {
        matches.push({
          conceptId: node.id,
          text: node.text,
          score,
          matchType,
        });
      }
    }

    // Sort by score and limit
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, options.maxConceptsPerSubquery);
  }

  /**
   * Refine subquery with matched concepts
   */
  private refineSubquery(subquery: string, matchedConcepts: MatchedConcept[]): string {
    if (matchedConcepts.length === 0) {
      return subquery;
    }

    // Add top matched concepts to subquery
    const topConcepts = matchedConcepts.slice(0, 3).map((c) => c.text);
    const conceptAddition = topConcepts.filter(
      (c) => !subquery.toLowerCase().includes(c.toLowerCase())
    );

    if (conceptAddition.length > 0) {
      return `${subquery} (${conceptAddition.join(', ')})`;
    }

    return subquery;
  }

  /**
   * Create expanded query combining all information
   */
  private createExpandedQuery(
    originalQuery: string,
    _subqueries: Subquery[],
    matchedConcepts: MatchedConcept[]
  ): string {
    // Combine original query with top matched concepts
    const topConceptTexts = matchedConcepts
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((c) => c.text);

    const uniqueConcepts = topConceptTexts.filter(
      (c) => !originalQuery.toLowerCase().includes(c.toLowerCase())
    );

    if (uniqueConcepts.length > 0) {
      return `${originalQuery}\n\nRelated concepts: ${uniqueConcepts.join(', ')}`;
    }

    return originalQuery;
  }

  /**
   * Check if word is a stopword
   */
  private isStopword(word: string): boolean {
    const stopwords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'can', 'must',
      'and', 'or', 'but', 'if', 'then', 'than', 'that', 'this',
      'what', 'which', 'who', 'how', 'when', 'where', 'why',
      'all', 'each', 'every', 'both', 'few', 'more', 'most',
      'other', 'some', 'such', 'no', 'not', 'only', 'same',
      'so', 'too', 'very', 'just', 'also', 'of', 'in', 'on',
      'at', 'to', 'for', 'with', 'by', 'from', 'about',
    ]);
    return stopwords.has(word.toLowerCase());
  }

  /**
   * Get subquery budget for relevance testing
   *
   * Calculates how many relevance tests each subquery gets
   * based on total budget.
   */
  getSubqueryBudget(totalBudget: number, numSubqueries: number): number {
    return Math.floor(totalBudget / numSubqueries);
  }
}
