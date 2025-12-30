/**
 * ClaimExtractor - LazyGraphRAG Claim Extraction and Ranking
 *
 * Extracts query-relevant claims from text chunks and ranks them
 * for context window fitting.
 *
 * Features:
 * - Extracts specific claims from relevant chunks
 * - Groups claims by concept communities
 * - Ranks and filters to fit context window
 */

import type { BaseLLMClient } from '../llm/BaseLLMClient.js';
import type { ChatMessage } from '../llm/types.js';
import type { RankedChunk } from './IterativeSearch.js';

/**
 * Extracted claim from text
 */
export interface Claim {
  /** Unique claim ID */
  id: string;
  /** Claim text */
  text: string;
  /** Source chunk ID */
  sourceChunkId: string;
  /** Source chunk content (for context) */
  sourceContent: string;
  /** Relevance score to query */
  relevanceScore: number;
  /** Concepts mentioned in claim */
  concepts: string[];
  /** Community ID (for grouping) */
  communityId?: string;
}

/**
 * Grouped claims by community
 */
export interface ClaimGroup {
  /** Community ID */
  communityId: string;
  /** Claims in this group */
  claims: Claim[];
  /** Group relevance score */
  groupScore: number;
  /** Top concepts in group */
  topConcepts: string[];
}

/**
 * Claim extraction result
 */
export interface ClaimExtractionResult {
  /** All extracted claims */
  claims: Claim[];
  /** Claims grouped by community */
  groups: ClaimGroup[];
  /** Filtered claims for context */
  filteredClaims: Claim[];
  /** Total token estimate */
  tokenEstimate: number;
  /** Processing metadata */
  metadata: {
    processingTimeMs: number;
    totalClaims: number;
    filteredClaims: number;
    groupCount: number;
  };
}

/**
 * Options for claim extraction
 */
export interface ClaimExtractorOptions {
  /** Maximum claims to extract per chunk */
  maxClaimsPerChunk?: number;
  /** Context window size (tokens) */
  contextWindowSize?: number;
  /** Average tokens per claim estimate */
  avgTokensPerClaim?: number;
  /** Minimum claim relevance score */
  minRelevanceScore?: number;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<ClaimExtractorOptions> = {
  maxClaimsPerChunk: 5,
  contextWindowSize: 4000,
  avgTokensPerClaim: 50,
  minRelevanceScore: 0.3,
};

/**
 * ClaimExtractor
 *
 * Extracts and ranks claims for LazyGraphRAG answer generation.
 *
 * @example
 * ```typescript
 * const extractor = new ClaimExtractor(llmClient);
 *
 * const result = await extractor.extract(
 *   'What are the benefits of transformers?',
 *   relevantChunks
 * );
 *
 * console.log(result.filteredClaims);
 * ```
 */
export class ClaimExtractor {
  private readonly llmClient: BaseLLMClient;
  private readonly options: Required<ClaimExtractorOptions>;

  constructor(llmClient: BaseLLMClient, options?: ClaimExtractorOptions) {
    this.llmClient = llmClient;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Extract claims from relevant chunks
   *
   * @param query - Original query (or subquery)
   * @param chunks - Relevant chunks from search
   * @param options - Override options
   * @returns Claim extraction result
   */
  async extract(
    query: string,
    chunks: RankedChunk[],
    options?: ClaimExtractorOptions
  ): Promise<ClaimExtractionResult> {
    const startTime = Date.now();
    const mergedOptions = { ...this.options, ...options };

    // Step 1: Extract claims from each chunk
    const allClaims: Claim[] = [];
    for (const rankedChunk of chunks) {
      const chunkClaims = await this.extractFromChunk(query, rankedChunk, mergedOptions);
      allClaims.push(...chunkClaims);
    }

    // Step 2: Group claims by community
    const groups = this.groupClaims(allClaims);

    // Step 3: Rank and filter claims to fit context window
    const filteredClaims = this.rankAndFilter(allClaims, mergedOptions);

    // Step 4: Estimate tokens
    const tokenEstimate = this.estimateTokens(filteredClaims, mergedOptions.avgTokensPerClaim);

    return {
      claims: allClaims,
      groups,
      filteredClaims,
      tokenEstimate,
      metadata: {
        processingTimeMs: Date.now() - startTime,
        totalClaims: allClaims.length,
        filteredClaims: filteredClaims.length,
        groupCount: groups.length,
      },
    };
  }

  /**
   * Extract claims from a single chunk
   */
  private async extractFromChunk(
    query: string,
    rankedChunk: RankedChunk,
    options: Required<ClaimExtractorOptions>
  ): Promise<Claim[]> {
    const systemPrompt = `You are a claim extraction expert. Extract specific, factual claims from the text that are relevant to the query.

Rules:
1. Extract up to ${options.maxClaimsPerChunk} claims per text
2. Each claim should be a single, self-contained statement
3. Focus on claims that answer or relate to the query
4. Include key concepts/terms mentioned in each claim
5. Rate relevance to query (0.0 to 1.0)

Output as JSON:
{
  "claims": [
    {
      "text": "claim text",
      "relevance": 0.8,
      "concepts": ["concept1", "concept2"]
    }
  ]
}`;

    const userPrompt = `Query: "${query}"

Text:
${rankedChunk.chunk.content}

Extract relevant claims as JSON.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      const response = await this.llmClient.chat(messages, {
        temperature: 0.1,
        structured: { type: 'json' },
      });

      const content = response.content ?? '';
      const parsed = JSON.parse(content);

      if (parsed.claims && Array.isArray(parsed.claims)) {
        return parsed.claims
          .filter((c: { relevance?: number }) => (c.relevance ?? 0) >= options.minRelevanceScore)
          .slice(0, options.maxClaimsPerChunk)
          .map((c: { text?: string; relevance?: number; concepts?: string[] }, index: number) => ({
            id: `claim-${rankedChunk.chunk.id}-${index}`,
            text: c.text ?? '',
            sourceChunkId: rankedChunk.chunk.id,
            sourceContent: rankedChunk.chunk.content,
            relevanceScore: c.relevance ?? 0.5,
            concepts: c.concepts ?? [],
            communityId: rankedChunk.communityIds[0],
          }));
      }

      return this.fallbackExtraction(rankedChunk, options);
    } catch {
      return this.fallbackExtraction(rankedChunk, options);
    }
  }

  /**
   * Fallback claim extraction (sentence splitting)
   */
  private fallbackExtraction(
    rankedChunk: RankedChunk,
    options: Required<ClaimExtractorOptions>
  ): Claim[] {
    // Simple sentence splitting
    const sentences = rankedChunk.chunk.content
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);

    return sentences.slice(0, options.maxClaimsPerChunk).map((sentence, index) => {
      const communityId = rankedChunk.communityIds[0];
      return {
        id: `claim-${rankedChunk.chunk.id}-${index}`,
        text: sentence,
        sourceChunkId: rankedChunk.chunk.id,
        sourceContent: rankedChunk.chunk.content,
        relevanceScore: rankedChunk.relevanceAssessment?.score ?? 0.5,
        concepts: this.extractSimpleConcepts(sentence),
        ...(communityId !== undefined && { communityId }),
      };
    });
  }

  /**
   * Extract simple concepts from text
   */
  private extractSimpleConcepts(text: string): string[] {
    // Extract capitalized terms and multi-word phrases
    const words = text.split(/\s+/);
    const concepts: string[] = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (!word) continue;

      // Check for capitalized words (potential proper nouns)
      if (/^[A-Z][a-z]+/.test(word)) {
        // Check if next word is also capitalized (multi-word term)
        const nextWord = words[i + 1];
        if (nextWord && /^[A-Z][a-z]+/.test(nextWord)) {
          concepts.push(`${word} ${nextWord}`);
          i++;
        } else {
          concepts.push(word);
        }
      }
    }

    return [...new Set(concepts)].slice(0, 5);
  }

  /**
   * Group claims by community
   */
  private groupClaims(claims: Claim[]): ClaimGroup[] {
    const groupMap = new Map<string, Claim[]>();

    for (const claim of claims) {
      const communityId = claim.communityId ?? 'uncategorized';
      const existing = groupMap.get(communityId);
      if (existing) {
        existing.push(claim);
      } else {
        groupMap.set(communityId, [claim]);
      }
    }

    const groups: ClaimGroup[] = [];
    for (const [communityId, groupClaims] of groupMap) {
      // Calculate group score (average of claim scores)
      const groupScore =
        groupClaims.length > 0
          ? groupClaims.reduce((sum, c) => sum + c.relevanceScore, 0) / groupClaims.length
          : 0;

      // Get top concepts across claims
      const conceptCounts = new Map<string, number>();
      for (const claim of groupClaims) {
        for (const concept of claim.concepts) {
          conceptCounts.set(concept, (conceptCounts.get(concept) ?? 0) + 1);
        }
      }
      const topConcepts = [...conceptCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([concept]) => concept);

      groups.push({
        communityId,
        claims: groupClaims.sort((a, b) => b.relevanceScore - a.relevanceScore),
        groupScore,
        topConcepts,
      });
    }

    return groups.sort((a, b) => b.groupScore - a.groupScore);
  }

  /**
   * Rank and filter claims to fit context window
   */
  private rankAndFilter(
    claims: Claim[],
    options: Required<ClaimExtractorOptions>
  ): Claim[] {
    // Sort by relevance score
    const sortedClaims = [...claims].sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Calculate how many claims fit in context window
    const maxClaims = Math.floor(options.contextWindowSize / options.avgTokensPerClaim);

    // Filter to fit
    return sortedClaims.slice(0, maxClaims);
  }

  /**
   * Estimate token count for claims
   */
  private estimateTokens(claims: Claim[], avgTokensPerClaim: number): number {
    return claims.length * avgTokensPerClaim;
  }

  /**
   * Format claims for LLM context
   *
   * @param claims - Claims to format
   * @returns Formatted string for LLM prompt
   */
  formatForContext(claims: Claim[]): string {
    const formatted = claims.map((claim, index) => {
      const concepts = claim.concepts.length > 0 ? ` [${claim.concepts.join(', ')}]` : '';
      return `[${index + 1}] ${claim.text}${concepts}`;
    });

    return formatted.join('\n');
  }

  /**
   * Format claims with sources for citation
   */
  formatWithSources(claims: Claim[]): string {
    const formatted = claims.map((claim, index) => {
      return `[${index + 1}] ${claim.text}\n    Source: ${claim.sourceChunkId}`;
    });

    return formatted.join('\n\n');
  }
}
