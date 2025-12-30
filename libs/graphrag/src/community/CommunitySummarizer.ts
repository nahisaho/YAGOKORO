import type { BaseLLMClient } from '../llm/BaseLLMClient.js';
import type { ChatMessage } from '../llm/types.js';
import type { Community } from './types.js';

/**
 * Node data for summarization
 */
export interface NodeInfo {
  name: string;
  type: string;
  description?: string;
  properties?: Record<string, unknown>;
}

/**
 * Edge data for summarization context
 */
export interface EdgeInfo {
  source: string;
  target: string;
  type: string;
  description?: string;
}

/**
 * Community summary result
 */
export interface CommunitySummary {
  /** Community ID */
  communityId: string;
  /** Community level */
  level: number;
  /** Short title for the community */
  title: string;
  /** Detailed summary */
  summary: string;
  /** Key entities in the community */
  keyEntities: string[];
  /** Main themes or topics */
  themes: string[];
  /** Processing metadata */
  metadata?: {
    processingTimeMs: number;
    model: string;
    tokenCount?: number;
  };
}

/**
 * Summarization options
 */
export interface SummarizationOptions {
  /** Maximum summary length in characters */
  maxLength?: number;
  /** Edge data for context */
  edgeData?: EdgeInfo[];
  /** Custom prompt template */
  customPrompt?: string;
  /** Focus areas for summarization */
  focusAreas?: string[];
}

/**
 * Batch processing options
 */
export interface BatchOptions {
  /** Maximum concurrent summarizations */
  concurrency?: number;
  /** Continue on error */
  continueOnError?: boolean;
}

/**
 * Community Summarizer
 *
 * Generates natural language summaries of graph communities using LLMs.
 * Supports hierarchical summarization for multi-level community structures.
 *
 * @example
 * ```typescript
 * const summarizer = new CommunitySummarizer(llmClient);
 *
 * const summary = await summarizer.summarize(community, nodeData);
 * console.log(summary.title);
 * console.log(summary.summary);
 * ```
 */
export class CommunitySummarizer {
  constructor(private readonly llmClient: BaseLLMClient) {}

  /**
   * Generate summary for a single community
   *
   * @param community - Community to summarize
   * @param nodeData - Map of node ID to node information
   * @param options - Summarization options
   * @returns Community summary
   */
  async summarize(
    community: Community,
    nodeData: Map<string, NodeInfo>,
    options?: SummarizationOptions
  ): Promise<CommunitySummary> {
    const startTime = Date.now();

    const messages = this.buildPrompt(community, nodeData, options);
    const response = await this.llmClient.chat(messages, {
      temperature: 0.3,
      structured: { type: 'json' },
    });

    const content = response.content;
    if (!content) {
      throw new Error('Empty response from LLM');
    }

    let parsed: {
      title: string;
      summary: string;
      keyEntities: string[];
      themes: string[];
    };

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(`Failed to parse LLM response as JSON: ${content.slice(0, 100)}`);
    }

    const metadata: CommunitySummary['metadata'] = {
      processingTimeMs: Date.now() - startTime,
      model: this.llmClient.getModelName(),
    };
    if (response.usage?.totalTokens !== undefined) {
      metadata.tokenCount = response.usage.totalTokens;
    }

    return {
      communityId: community.id,
      level: community.level,
      title: parsed.title,
      summary: parsed.summary,
      keyEntities: parsed.keyEntities ?? [],
      themes: parsed.themes ?? [],
      metadata,
    };
  }

  /**
   * Summarize multiple communities in batch
   *
   * @param communities - Communities to summarize
   * @param nodeData - Map of node ID to node information
   * @param options - Summarization options
   * @param batchOptions - Batch processing options
   * @returns Array of community summaries
   */
  async summarizeBatch(
    communities: Community[],
    nodeData: Map<string, NodeInfo>,
    options?: SummarizationOptions,
    batchOptions?: BatchOptions
  ): Promise<CommunitySummary[]> {
    const concurrency = batchOptions?.concurrency ?? 3;
    const continueOnError = batchOptions?.continueOnError ?? false;

    const results: CommunitySummary[] = [];
    const queue = [...communities];
    const inProgress: Promise<void>[] = [];

    while (queue.length > 0 || inProgress.length > 0) {
      while (inProgress.length < concurrency && queue.length > 0) {
        const community = queue.shift()!;
        const task = this.summarize(community, nodeData, options)
          .then((result) => {
            results.push(result);
          })
          .catch((error) => {
            if (!continueOnError) throw error;
            console.warn(`Failed to summarize community ${community.id}:`, error);
          })
          .finally(() => {
            const index = inProgress.indexOf(task);
            if (index > -1) {
              inProgress.splice(index, 1);
            }
          });
        inProgress.push(task);
      }

      if (inProgress.length > 0) {
        await Promise.race(inProgress);
      }
    }

    return results;
  }

  /**
   * Summarize hierarchical communities level by level
   *
   * @param communities - All communities (multiple levels)
   * @param nodeData - Map of node ID to node information
   * @param options - Summarization options
   * @param batchOptions - Batch processing options
   * @returns Array of community summaries for all levels
   */
  async summarizeHierarchy(
    communities: Community[],
    nodeData: Map<string, NodeInfo>,
    options?: SummarizationOptions,
    _batchOptions?: BatchOptions
  ): Promise<CommunitySummary[]> {
    // Group communities by level
    const byLevel = new Map<number, Community[]>();
    for (const community of communities) {
      const level = byLevel.get(community.level) ?? [];
      level.push(community);
      byLevel.set(community.level, level);
    }

    // Sort levels (process lower levels first)
    const levels = [...byLevel.keys()].sort((a, b) => a - b);

    const allSummaries: CommunitySummary[] = [];
    const summaryMap = new Map<string, CommunitySummary>();

    for (const level of levels) {
      const levelCommunities = byLevel.get(level) ?? [];

      // For higher levels, include child summaries in context
      const levelOptions = { ...options };

      for (const community of levelCommunities) {
        let childContext = '';
        if (community.childIds && community.childIds.length > 0) {
          const childSummaries = community.childIds
            .map((id) => summaryMap.get(id))
            .filter((s): s is CommunitySummary => s !== undefined);

          if (childSummaries.length > 0) {
            childContext = `\n\nChild community summaries:\n${childSummaries.map((s) => `- ${s.title}: ${s.summary}`).join('\n')}`;
          }
        }

        const augmentedOptions: SummarizationOptions = {
          ...levelOptions,
        };
        if (levelOptions.customPrompt) {
          augmentedOptions.customPrompt = levelOptions.customPrompt + childContext;
        } else if (childContext) {
          augmentedOptions.customPrompt = childContext;
        }

        const summary = await this.summarize(community, nodeData, augmentedOptions);
        allSummaries.push(summary);
        summaryMap.set(community.id, summary);
      }
    }

    return allSummaries;
  }

  /**
   * Build summarization prompt
   */
  private buildPrompt(
    community: Community,
    nodeData: Map<string, NodeInfo>,
    options?: SummarizationOptions
  ): ChatMessage[] {
    const maxLength = options?.maxLength ?? 500;

    // Build entity list
    const entities: NodeInfo[] = [];
    for (const nodeId of community.memberIds) {
      const info = nodeData.get(nodeId);
      if (info) {
        entities.push(info);
      }
    }

    const entityListStr = entities
      .map((e) => `- ${e.name} (${e.type})${e.description ? `: ${e.description}` : ''}`)
      .join('\n');

    // Build edge context if provided
    let edgeContext = '';
    if (options?.edgeData && options.edgeData.length > 0) {
      edgeContext = `\n\nRelationships:\n${options.edgeData
        .map(
          (e) =>
            `- ${e.source} --[${e.type}]--> ${e.target}${e.description ? `: ${e.description}` : ''}`
        )
        .join('\n')}`;
    }

    const systemPrompt = `You are an expert at summarizing knowledge graph communities for AI/ML domains.
Your task is to generate a concise, informative summary of a community of related entities.

Output JSON format:
{
  "title": "Short descriptive title (max 10 words)",
  "summary": "Detailed summary of the community (max ${maxLength} characters)",
  "keyEntities": ["List of most important entity names"],
  "themes": ["Main themes or topics covered"]
}

Guidelines:
- Focus on the relationships and significance of entities
- Highlight key patterns or insights
- Be concise but comprehensive
- Use domain-specific terminology appropriately`;

    let userPrompt = `Summarize this community of ${community.memberIds.length} entities:

Entities:
${entityListStr}${edgeContext}`;

    if (options?.customPrompt) {
      userPrompt += `\n${options.customPrompt}`;
    }

    if (options?.focusAreas && options.focusAreas.length > 0) {
      userPrompt += `\n\nFocus areas: ${options.focusAreas.join(', ')}`;
    }

    userPrompt += '\n\nReturn the summary as JSON.';

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }
}
