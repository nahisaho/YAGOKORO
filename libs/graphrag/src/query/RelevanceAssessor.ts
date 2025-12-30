/**
 * RelevanceAssessor - LazyGraphRAG Sentence-Level Relevance Assessment
 *
 * Assesses relevance of text chunks/sentences to queries using LLM.
 * Uses low-cost models for efficiency (GPT-4o-mini, Claude-3-haiku).
 *
 * Key features:
 * - Sentence-level relevance scoring
 * - Batch processing for efficiency
 * - Budget-aware processing
 */

import type { BaseLLMClient } from '../llm/BaseLLMClient.js';
import type { ChatMessage } from '../llm/types.js';

/**
 * Text chunk for relevance assessment
 */
export interface AssessmentChunk {
  /** Chunk ID */
  id: string;
  /** Chunk content */
  content: string;
  /** Source community ID */
  communityId?: string;
  /** Pre-computed embedding similarity (optional) */
  embeddingSimilarity?: number;
}

/**
 * Relevance assessment result for a chunk
 */
export interface RelevanceAssessment {
  /** Chunk ID */
  chunkId: string;
  /** Relevance score (0-1) */
  score: number;
  /** Is chunk relevant (above threshold) */
  isRelevant: boolean;
  /** Relevant sentences extracted */
  relevantSentences: string[];
  /** Assessment rationale */
  rationale?: string;
}

/**
 * Batch assessment result
 */
export interface BatchAssessmentResult {
  /** Individual assessments */
  assessments: RelevanceAssessment[];
  /** Relevant chunks only */
  relevantChunks: AssessmentChunk[];
  /** Number of relevance tests used */
  testsUsed: number;
  /** Processing metadata */
  metadata: {
    processingTimeMs: number;
    totalChunks: number;
    relevantCount: number;
    avgScore: number;
  };
}

/**
 * Options for relevance assessment
 */
export interface RelevanceAssessorOptions {
  /** Relevance threshold (0-1) */
  relevanceThreshold?: number;
  /** Batch size for LLM calls */
  batchSize?: number;
  /** Include rationale in results */
  includeRationale?: boolean;
  /** Maximum sentences to extract per chunk */
  maxSentencesPerChunk?: number;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<RelevanceAssessorOptions> = {
  relevanceThreshold: 0.5,
  batchSize: 10,
  includeRationale: false,
  maxSentencesPerChunk: 5,
};

/**
 * RelevanceAssessor
 *
 * Assesses text chunk relevance for LazyGraphRAG.
 *
 * @example
 * ```typescript
 * const assessor = new RelevanceAssessor(llmClient);
 *
 * const result = await assessor.assessBatch(
 *   'What are transformer architectures?',
 *   chunks,
 *   { budget: 100 }
 * );
 *
 * console.log(result.relevantChunks);
 * ```
 */
export class RelevanceAssessor {
  private readonly llmClient: BaseLLMClient;
  private readonly options: Required<RelevanceAssessorOptions>;

  constructor(llmClient: BaseLLMClient, options?: RelevanceAssessorOptions) {
    this.llmClient = llmClient;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Assess relevance of a single chunk
   *
   * @param query - Query to assess against
   * @param chunk - Chunk to assess
   * @param options - Override options
   * @returns Relevance assessment
   */
  async assess(
    query: string,
    chunk: AssessmentChunk,
    options?: RelevanceAssessorOptions
  ): Promise<RelevanceAssessment> {
    const mergedOptions = { ...this.options, ...options };
    
    const result = await this.assessWithLLM(query, [chunk], mergedOptions);
    
    return result[0] ?? {
      chunkId: chunk.id,
      score: 0,
      isRelevant: false,
      relevantSentences: [],
    };
  }

  /**
   * Assess relevance of multiple chunks with budget control
   *
   * @param query - Query to assess against
   * @param chunks - Chunks to assess
   * @param budgetOptions - Budget and options
   * @returns Batch assessment result
   */
  async assessBatch(
    query: string,
    chunks: AssessmentChunk[],
    budgetOptions: { budget: number } & RelevanceAssessorOptions
  ): Promise<BatchAssessmentResult> {
    const startTime = Date.now();
    const { budget, ...options } = budgetOptions;
    const mergedOptions = { ...this.options, ...options };

    // Limit chunks to budget
    const chunksToAssess = chunks.slice(0, budget);
    const assessments: RelevanceAssessment[] = [];

    // Process in batches
    for (let i = 0; i < chunksToAssess.length; i += mergedOptions.batchSize) {
      const batch = chunksToAssess.slice(i, i + mergedOptions.batchSize);
      const batchResults = await this.assessWithLLM(query, batch, mergedOptions);
      assessments.push(...batchResults);
    }

    // Filter relevant chunks
    const relevantChunks = chunks.filter((chunk) => {
      const assessment = assessments.find((a) => a.chunkId === chunk.id);
      return assessment?.isRelevant ?? false;
    });

    // Calculate statistics
    const relevantCount = assessments.filter((a) => a.isRelevant).length;
    const avgScore =
      assessments.length > 0
        ? assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length
        : 0;

    return {
      assessments,
      relevantChunks,
      testsUsed: chunksToAssess.length,
      metadata: {
        processingTimeMs: Date.now() - startTime,
        totalChunks: chunks.length,
        relevantCount,
        avgScore,
      },
    };
  }

  /**
   * Assess chunks using LLM
   */
  private async assessWithLLM(
    query: string,
    chunks: AssessmentChunk[],
    options: Required<RelevanceAssessorOptions>
  ): Promise<RelevanceAssessment[]> {
    if (chunks.length === 0) {
      return [];
    }

    const systemPrompt = `You are a relevance assessment expert. Evaluate how relevant each text chunk is to the given query.

For each chunk, provide:
1. A relevance score from 0.0 to 1.0 (0 = not relevant, 1 = highly relevant)
2. Extract the most relevant sentences (up to ${options.maxSentencesPerChunk})
${options.includeRationale ? '3. A brief rationale for the score' : ''}

Output as JSON array with format:
[
  {
    "chunkId": "id",
    "score": 0.8,
    "relevantSentences": ["sentence1", "sentence2"],
    ${options.includeRationale ? '"rationale": "explanation"' : ''}
  }
]`;

    const chunksText = chunks
      .map((c, i) => `[Chunk ${i + 1} - ID: ${c.id}]\n${c.content}`)
      .join('\n\n---\n\n');

    const userPrompt = `Query: "${query}"

Evaluate the relevance of these ${chunks.length} chunks:

${chunksText}

Output JSON array with assessments for each chunk.`;

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

      if (Array.isArray(parsed)) {
        return parsed.map((item: {
          chunkId?: string;
          score?: number;
          relevantSentences?: string[];
          rationale?: string;
        }, index: number) => {
          const rationale = options.includeRationale ? item.rationale : undefined;
          return {
            chunkId: item.chunkId ?? chunks[index]?.id ?? `unknown-${index}`,
            score: typeof item.score === 'number' ? item.score : 0,
            isRelevant: (item.score ?? 0) >= options.relevanceThreshold,
            relevantSentences: Array.isArray(item.relevantSentences)
              ? item.relevantSentences.slice(0, options.maxSentencesPerChunk)
              : [],
            ...(rationale !== undefined && { rationale }),
          };
        });
      }

      return this.fallbackAssessments(chunks, options);
    } catch {
      return this.fallbackAssessments(chunks, options);
    }
  }

  /**
   * Fallback assessment using simple keyword matching
   */
  private fallbackAssessments(
    chunks: AssessmentChunk[],
    options: Required<RelevanceAssessorOptions>
  ): RelevanceAssessment[] {
    return chunks.map((chunk) => {
      // Use embedding similarity if available
      const score = chunk.embeddingSimilarity ?? 0.3;
      
      return {
        chunkId: chunk.id,
        score,
        isRelevant: score >= options.relevanceThreshold,
        relevantSentences: [],
      };
    });
  }

  /**
   * Quick relevance check without LLM (keyword-based)
   *
   * Useful for pre-filtering before LLM assessment
   */
  quickCheck(query: string, chunk: AssessmentChunk): number {
    const queryTerms = this.extractTerms(query);
    const chunkTerms = this.extractTerms(chunk.content);

    if (queryTerms.length === 0) return 0;

    const matchingTerms = queryTerms.filter((qt) =>
      chunkTerms.some((ct) => ct.includes(qt) || qt.includes(ct))
    );

    return matchingTerms.length / queryTerms.length;
  }

  /**
   * Extract meaningful terms from text
   */
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

  /**
   * Get remaining budget after assessments
   */
  getRemainingBudget(totalBudget: number, testsUsed: number): number {
    return Math.max(0, totalBudget - testsUsed);
  }
}
