/**
 * ResponseGenerator
 *
 * Generates natural language answers from query context
 * using LLM with citations and source attribution.
 */

import type { LLMClient } from '@yagokoro/domain';
import type {
  Citation,
  QueryContext,
  QueryMetrics,
  QueryResponse,
} from './types.js';

/**
 * Response generator options
 */
export interface ResponseGeneratorOptions {
  /** Maximum context length in characters */
  maxContextLength?: number;
  /** Whether to include citations in response */
  includeCitations?: boolean;
  /** System prompt for the LLM */
  systemPrompt?: string;
}

/**
 * Default response generator options
 */
const DEFAULT_OPTIONS: Required<ResponseGeneratorOptions> = {
  maxContextLength: 8000,
  includeCitations: true,
  systemPrompt: `You are a knowledgeable assistant that answers questions based on the provided context.
Always base your answers on the given context. If the context doesn't contain enough information,
say so clearly. Cite specific entities and facts when possible.`,
};

/**
 * Dependencies for ResponseGenerator
 */
export interface ResponseGeneratorDeps {
  /** LLM client for answer generation */
  llmClient: LLMClient;
  /** Function to generate answer from prompt */
  generateAnswer: (prompt: string) => Promise<string>;
}

/**
 * Response Generator
 *
 * Takes query context (entities, relations, community summaries)
 * and generates a coherent natural language answer using an LLM.
 *
 * Features:
 * - Context formatting for optimal LLM understanding
 * - Citation extraction and attribution
 * - Configurable context length limits
 *
 * @example
 * ```typescript
 * const generator = new ResponseGenerator({
 *   llmClient,
 *   generateAnswer: async (prompt) => llm.chat([{ role: 'user', content: prompt }]),
 * });
 *
 * const result = await generator.generate(queryResponse);
 * console.log(result.answer);
 * console.log(result.citations);
 * ```
 */
export class ResponseGenerator {
  private readonly deps: ResponseGeneratorDeps;
  private readonly options: Required<ResponseGeneratorOptions>;

  constructor(deps: ResponseGeneratorDeps, options: ResponseGeneratorOptions = {}) {
    this.deps = deps;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate answer from query response
   *
   * @param queryResponse - Query response with context
   * @returns Updated query response with generated answer
   */
  async generate(queryResponse: QueryResponse): Promise<QueryResponse> {
    const startTime = performance.now();

    try {
      // Format context for LLM
      const contextPrompt = this.formatContext(queryResponse.context, queryResponse.query);

      // Generate answer
      const answer = await this.deps.generateAnswer(contextPrompt);

      const generationTimeMs = performance.now() - startTime;

      // Build citations
      const citations = this.options.includeCitations
        ? this.buildCitations(queryResponse.context)
        : [];

      // Update metrics
      const metrics: QueryMetrics = {
        ...queryResponse.metrics,
        generationTimeMs,
        totalTimeMs: queryResponse.metrics.retrievalTimeMs + generationTimeMs,
      };

      return {
        ...queryResponse,
        answer,
        citations,
        metrics,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const generationTimeMs = performance.now() - startTime;

      return {
        ...queryResponse,
        answer: '',
        metrics: {
          ...queryResponse.metrics,
          generationTimeMs,
          totalTimeMs: queryResponse.metrics.retrievalTimeMs + generationTimeMs,
        },
        success: false,
        error: `Response generation failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Format query context for LLM prompt
   */
  private formatContext(context: QueryContext, query: string): string {
    const sections: string[] = [];

    // System prompt
    sections.push(this.options.systemPrompt);
    sections.push('');

    // Query
    sections.push(`## Question`);
    sections.push(query);
    sections.push('');

    // Entities
    if (context.entities.length > 0) {
      sections.push('## Relevant Entities');
      for (const entity of context.entities) {
        sections.push(`- **${entity.name}** (${entity.type})`);
        if (entity.description) {
          sections.push(`  ${entity.description}`);
        }
      }
      sections.push('');
    }

    // Relations
    if (context.relations.length > 0) {
      sections.push('## Relationships');
      for (const relation of context.relations) {
        const relationType = relation.type.toLowerCase().replace(/_/g, ' ');
        sections.push(`- ${relation.sourceName} ${relationType} ${relation.targetName}`);
      }
      sections.push('');
    }

    // Community summaries
    if (context.communitySummaries.length > 0) {
      sections.push('## Topic Summaries');
      for (const community of context.communitySummaries) {
        sections.push(`### Community ${community.communityId} (Level ${community.level})`);
        sections.push(community.summary);
        sections.push('');
      }
    }

    // Additional text chunks
    if (context.textChunks.length > 0) {
      sections.push('## Additional Context');
      for (const chunk of context.textChunks) {
        sections.push(chunk);
      }
      sections.push('');
    }

    // Instruction
    sections.push('## Instructions');
    sections.push(
      'Based on the above context, provide a comprehensive answer to the question. ' +
        'If the context does not contain enough information, acknowledge this limitation.'
    );

    // Combine and truncate if needed
    let prompt = sections.join('\n');

    if (prompt.length > this.options.maxContextLength) {
      prompt = this.truncateContext(prompt, this.options.maxContextLength);
    }

    return prompt;
  }

  /**
   * Truncate context to fit within max length
   */
  private truncateContext(prompt: string, maxLength: number): string {
    if (prompt.length <= maxLength) {
      return prompt;
    }

    // Find a good breaking point
    const truncationPoint = prompt.lastIndexOf('\n', maxLength - 100);
    const cutPoint = truncationPoint > maxLength / 2 ? truncationPoint : maxLength - 100;

    return (
      prompt.slice(0, cutPoint) +
      '\n\n[Context truncated due to length limits]'
    );
  }

  /**
   * Build citations from context
   */
  private buildCitations(context: QueryContext): Citation[] {
    const citations: Citation[] = [];

    // Entity citations
    for (const entity of context.entities) {
      const citation: Citation = {
        entityId: entity.id,
        entityName: entity.name,
        sourceType: 'entity',
        relevance: entity.relevance,
      };
      if (entity.description !== undefined) {
        citation.excerpt = entity.description;
      }
      citations.push(citation);
    }

    // Community citations
    for (const community of context.communitySummaries) {
      citations.push({
        entityId: community.communityId,
        entityName: `Community ${community.communityId}`,
        sourceType: 'community',
        relevance: community.relevance,
        excerpt: community.summary.slice(0, 200),
      });
    }

    // Sort by relevance (highest first)
    citations.sort((a, b) => b.relevance - a.relevance);

    return citations;
  }
}
