/**
 * IterativeSearch - LazyGraphRAG Iterative Deepening Search
 *
 * Combines best-first and breadth-first search strategies
 * with iterative deepening for efficient retrieval.
 *
 * Algorithm:
 * 1. Rank chunks by query similarity (best-first)
 * 2. Rank communities by top-k chunk ranks
 * 3. Assess chunk relevance in community order (breadth-first)
 * 4. Recurse into sub-communities after z zero-relevance communities
 * 5. Terminate at budget or exhaustion
 */

import type { ConceptGraph, ConceptCommunity } from '../extraction/ConceptGraphBuilder.js';
import type { TextChunk } from '../extraction/types.js';
import type { RelevanceAssessor, AssessmentChunk, RelevanceAssessment } from './RelevanceAssessor.js';

/**
 * Chunk with ranking information
 */
export interface RankedChunk {
  /** Chunk data */
  chunk: TextChunk;
  /** Similarity rank (lower = more similar) */
  similarityRank: number;
  /** Similarity score (0-1) */
  similarityScore: number;
  /** Community IDs this chunk belongs to */
  communityIds: string[];
  /** Relevance assessment (after testing) */
  relevanceAssessment?: RelevanceAssessment;
}

/**
 * Community with ranking information
 */
export interface RankedCommunity {
  /** Community data */
  community: ConceptCommunity;
  /** Rank score based on top-k chunks */
  rankScore: number;
  /** Top chunks from this community */
  topChunks: RankedChunk[];
  /** Number of relevant chunks found */
  relevantChunkCount: number;
  /** Has been fully explored */
  explored: boolean;
}

/**
 * Search state for iterative deepening
 */
export interface SearchState {
  /** Current community level being searched */
  currentLevel: number;
  /** Communities at current level */
  communities: RankedCommunity[];
  /** Relevance tests used */
  testsUsed: number;
  /** Consecutive zero-relevance communities */
  consecutiveZeroRelevance: number;
  /** All relevant chunks found */
  relevantChunks: RankedChunk[];
  /** Search complete */
  complete: boolean;
}

/**
 * Search result
 */
export interface IterativeSearchResult {
  /** Relevant chunks found */
  relevantChunks: RankedChunk[];
  /** Communities explored */
  communitiesExplored: RankedCommunity[];
  /** Total relevance tests used */
  testsUsed: number;
  /** Search depth reached */
  maxLevelReached: number;
  /** Processing metadata */
  metadata: {
    processingTimeMs: number;
    totalChunksConsidered: number;
    totalCommunitiesConsidered: number;
    relevantChunkCount: number;
  };
}

/**
 * Options for iterative search
 */
export interface IterativeSearchOptions {
  /** Relevance test budget */
  budget?: number;
  /** Top-k chunks per community for ranking */
  topKPerCommunity?: number;
  /** Zero-relevance threshold for deepening */
  zeroRelevanceThreshold?: number;
  /** Starting community level */
  startLevel?: number;
  /** Maximum chunks to return */
  maxResults?: number;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<IterativeSearchOptions> = {
  budget: 100,
  topKPerCommunity: 5,
  zeroRelevanceThreshold: 3,
  startLevel: 0,
  maxResults: 50,
};

/**
 * Similarity scorer interface
 */
export interface SimilarityScorer {
  /**
   * Score similarity between query and chunk
   * @returns Score between 0 and 1
   */
  score(query: string, chunk: TextChunk): Promise<number>;

  /**
   * Batch score multiple chunks
   */
  scoreBatch(query: string, chunks: TextChunk[]): Promise<Map<string, number>>;
}

/**
 * Simple keyword-based similarity scorer
 */
export class KeywordSimilarityScorer implements SimilarityScorer {
  async score(query: string, chunk: TextChunk): Promise<number> {
    const queryTerms = this.extractTerms(query);
    const chunkTerms = this.extractTerms(chunk.content);

    if (queryTerms.length === 0) return 0;

    const matchingTerms = queryTerms.filter((qt) =>
      chunkTerms.some((ct) => ct.includes(qt) || qt.includes(ct))
    );

    return matchingTerms.length / queryTerms.length;
  }

  async scoreBatch(query: string, chunks: TextChunk[]): Promise<Map<string, number>> {
    const scores = new Map<string, number>();
    for (const chunk of chunks) {
      scores.set(chunk.id, await this.score(query, chunk));
    }
    return scores;
  }

  private extractTerms(text: string): string[] {
    const stopwords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'and', 'or', 'but', 'if', 'of', 'in', 'on', 'at', 'to', 'for',
    ]);

    return text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2 && !stopwords.has(w));
  }
}

/**
 * IterativeSearch
 *
 * Implements LazyGraphRAG's iterative deepening search strategy.
 *
 * @example
 * ```typescript
 * const search = new IterativeSearch(relevanceAssessor, similarityScorer);
 *
 * const result = await search.search(
 *   'What are transformer models?',
 *   conceptGraph,
 *   chunks,
 *   { budget: 100 }
 * );
 *
 * console.log(result.relevantChunks);
 * ```
 */
export class IterativeSearch {
  private readonly relevanceAssessor: RelevanceAssessor;
  private readonly similarityScorer: SimilarityScorer;
  private readonly options: Required<IterativeSearchOptions>;

  constructor(
    relevanceAssessor: RelevanceAssessor,
    similarityScorer?: SimilarityScorer,
    options?: IterativeSearchOptions
  ) {
    this.relevanceAssessor = relevanceAssessor;
    this.similarityScorer = similarityScorer ?? new KeywordSimilarityScorer();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Execute iterative deepening search
   *
   * @param query - Search query
   * @param conceptGraph - Concept graph with communities
   * @param chunks - All text chunks
   * @param options - Override options
   * @returns Search result
   */
  async search(
    query: string,
    conceptGraph: ConceptGraph,
    chunks: TextChunk[],
    options?: IterativeSearchOptions
  ): Promise<IterativeSearchResult> {
    const startTime = Date.now();
    const mergedOptions = { ...this.options, ...options };

    // Step 1: Score all chunks by similarity
    const chunkScores = await this.similarityScorer.scoreBatch(query, chunks);

    // Step 2: Create ranked chunks with community assignments
    const rankedChunks = this.createRankedChunks(chunks, chunkScores, conceptGraph);

    // Step 3: Initialize search state
    const state: SearchState = {
      currentLevel: mergedOptions.startLevel,
      communities: [],
      testsUsed: 0,
      consecutiveZeroRelevance: 0,
      relevantChunks: [],
      complete: false,
    };

    const exploredCommunities: RankedCommunity[] = [];

    // Step 4: Iterative deepening loop
    while (!state.complete && state.testsUsed < mergedOptions.budget) {
      // Get communities at current level
      const levelCommunities = conceptGraph.communities.filter(
        (c) => c.level === state.currentLevel
      );

      if (levelCommunities.length === 0) {
        // No more levels to explore
        state.complete = true;
        break;
      }

      // Rank communities by their top-k chunk scores
      const rankedCommunities = this.rankCommunities(
        levelCommunities,
        rankedChunks,
        mergedOptions.topKPerCommunity
      );

      // Process communities in rank order
      for (const rankedComm of rankedCommunities) {
        if (state.testsUsed >= mergedOptions.budget) {
          state.complete = true;
          break;
        }

        // Get untested chunks from this community
        const untestedChunks = rankedComm.topChunks.filter(
          (rc) => !rc.relevanceAssessment
        );

        if (untestedChunks.length === 0) {
          rankedComm.explored = true;
          continue;
        }

        // Assess relevance of top chunks
        const assessmentChunks: AssessmentChunk[] = untestedChunks.map((rc) => ({
          id: rc.chunk.id,
          content: rc.chunk.content,
          communityId: rankedComm.community.id,
          embeddingSimilarity: rc.similarityScore,
        }));

        const budgetRemaining = mergedOptions.budget - state.testsUsed;
        const assessResult = await this.relevanceAssessor.assessBatch(
          query,
          assessmentChunks,
          { budget: Math.min(budgetRemaining, assessmentChunks.length) }
        );

        state.testsUsed += assessResult.testsUsed;

        // Update ranked chunks with assessments
        let relevantFound = 0;
        for (const assessment of assessResult.assessments) {
          const rankedChunk = untestedChunks.find((rc) => rc.chunk.id === assessment.chunkId);
          if (rankedChunk) {
            rankedChunk.relevanceAssessment = assessment;
            if (assessment.isRelevant) {
              relevantFound++;
              state.relevantChunks.push(rankedChunk);
            }
          }
        }

        rankedComm.relevantChunkCount = relevantFound;
        rankedComm.explored = true;
        exploredCommunities.push(rankedComm);

        // Update consecutive zero-relevance counter
        if (relevantFound === 0) {
          state.consecutiveZeroRelevance++;
        } else {
          state.consecutiveZeroRelevance = 0;
        }

        // Check if we should deepen
        if (state.consecutiveZeroRelevance >= mergedOptions.zeroRelevanceThreshold) {
          // Move to next level (sub-communities)
          state.currentLevel++;
          state.consecutiveZeroRelevance = 0;
          break;
        }
      }

      // Check if all communities at this level are explored
      const allExplored = rankedCommunities.every((rc) => rc.explored);
      if (allExplored) {
        state.currentLevel++;
        state.consecutiveZeroRelevance = 0;
      }

      // Check max level
      if (state.currentLevel >= conceptGraph.hierarchyLevels) {
        state.complete = true;
      }
    }

    // Sort and limit results
    const sortedResults = state.relevantChunks
      .sort((a, b) => {
        const scoreA = a.relevanceAssessment?.score ?? 0;
        const scoreB = b.relevanceAssessment?.score ?? 0;
        return scoreB - scoreA;
      })
      .slice(0, mergedOptions.maxResults);

    return {
      relevantChunks: sortedResults,
      communitiesExplored: exploredCommunities,
      testsUsed: state.testsUsed,
      maxLevelReached: state.currentLevel,
      metadata: {
        processingTimeMs: Date.now() - startTime,
        totalChunksConsidered: rankedChunks.length,
        totalCommunitiesConsidered: exploredCommunities.length,
        relevantChunkCount: sortedResults.length,
      },
    };
  }

  /**
   * Create ranked chunks with community assignments
   */
  private createRankedChunks(
    chunks: TextChunk[],
    scores: Map<string, number>,
    conceptGraph: ConceptGraph
  ): RankedChunk[] {
    // Sort chunks by score
    const sortedChunks = [...chunks].sort((a, b) => {
      const scoreA = scores.get(a.id) ?? 0;
      const scoreB = scores.get(b.id) ?? 0;
      return scoreB - scoreA;
    });

    return sortedChunks.map((chunk, index) => {
      // Find communities this chunk belongs to
      const communityIds = conceptGraph.communities
        .filter((c) => c.chunkIds.includes(chunk.id))
        .map((c) => c.id);

      return {
        chunk,
        similarityRank: index,
        similarityScore: scores.get(chunk.id) ?? 0,
        communityIds,
      };
    });
  }

  /**
   * Rank communities by their top-k chunk scores
   */
  private rankCommunities(
    communities: ConceptCommunity[],
    rankedChunks: RankedChunk[],
    topK: number
  ): RankedCommunity[] {
    const rankedCommunities: RankedCommunity[] = [];

    for (const community of communities) {
      // Get chunks belonging to this community
      const communityChunks = rankedChunks.filter((rc) =>
        rc.communityIds.includes(community.id)
      );

      // Get top-k chunks
      const topChunks = communityChunks.slice(0, topK);

      // Calculate rank score (average of top-k similarity scores)
      const rankScore =
        topChunks.length > 0
          ? topChunks.reduce((sum, rc) => sum + rc.similarityScore, 0) / topChunks.length
          : 0;

      rankedCommunities.push({
        community,
        rankScore,
        topChunks,
        relevantChunkCount: 0,
        explored: false,
      });
    }

    // Sort by rank score (descending)
    return rankedCommunities.sort((a, b) => b.rankScore - a.rankScore);
  }

  /**
   * Get budget allocation for subqueries
   */
  allocateBudget(totalBudget: number, numSubqueries: number): number[] {
    const perSubquery = Math.floor(totalBudget / numSubqueries);
    const remainder = totalBudget % numSubqueries;

    return Array.from({ length: numSubqueries }, (_, i) =>
      i < remainder ? perSubquery + 1 : perSubquery
    );
  }
}
