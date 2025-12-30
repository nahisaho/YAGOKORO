import type { BaseLLMClient } from '../llm/BaseLLMClient.js';
import type { ChatMessage } from '../llm/types.js';
import type {
  ExtractableRelationType,
  ExtractedEntity,
  ExtractedRelation,
  ExtractionResult,
  RelationExtractionOptions,
} from './types.js';

/**
 * Default relation types to extract
 */
const DEFAULT_RELATION_TYPES: ExtractableRelationType[] = [
  'DEVELOPED_BY',
  'TRAINED_ON',
  'USES_TECHNIQUE',
  'DERIVED_FROM',
  'EVALUATED_ON',
  'PUBLISHED_IN',
  'AFFILIATED_WITH',
  'AUTHORED_BY',
  'CITES',
  'PART_OF',
  'RELATED_TO',
];

/**
 * Default extraction options
 */
const DEFAULT_OPTIONS: Required<Omit<RelationExtractionOptions, 'customPrompt'>> = {
  relationTypes: DEFAULT_RELATION_TYPES,
  minConfidence: 0.7,
  maxRelations: 100,
};

/**
 * Chunk with entities for batch processing
 */
export interface ChunkWithEntities {
  id: string;
  content: string;
  entities: ExtractedEntity[];
}

/**
 * Batch processing options
 */
export interface BatchOptions {
  /** Maximum concurrent extractions */
  concurrency?: number;
  /** Continue on error */
  continueOnError?: boolean;
}

/**
 * Relation Extractor
 *
 * Extracts relationships between entities from text using LLMs.
 * Designed for GraphRAG knowledge graph construction.
 *
 * @example
 * ```typescript
 * const extractor = new RelationExtractor(llmClient);
 *
 * const entities = [
 *   { tempId: 'e1', type: 'AIModel', name: 'GPT-4', confidence: 0.95 },
 *   { tempId: 'e2', type: 'Organization', name: 'OpenAI', confidence: 0.98 }
 * ];
 *
 * const result = await extractor.extract(
 *   'GPT-4 is developed by OpenAI.',
 *   entities
 * );
 *
 * console.log(result.relations);
 * // [{ type: 'DEVELOPED_BY', sourceTempId: 'e1', targetTempId: 'e2', confidence: 0.95 }]
 * ```
 */
export class RelationExtractor {
  constructor(private readonly llmClient: BaseLLMClient) {}

  /**
   * Extract relations from text given known entities
   *
   * @param text - Text to extract relations from
   * @param entities - Entities already extracted from the text
   * @param options - Extraction options
   * @returns Extraction result with relations and metadata
   */
  async extract(
    text: string,
    entities: ExtractedEntity[],
    options?: RelationExtractionOptions
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    const mergedOptions = this.mergeOptions(options);

    const messages = this.buildPrompt(text, entities, mergedOptions);
    const response = await this.llmClient.chat(messages, {
      temperature: 0.1,
      structured: { type: 'json' },
    });

    const content = response.content;
    if (!content) {
      throw new Error('Empty response from LLM');
    }

    let parsed: { relations: ExtractedRelation[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(`Failed to parse LLM response as JSON: ${content.slice(0, 100)}`);
    }

    let relations = parsed.relations ?? [];

    // Build set of valid entity IDs for validation
    const validEntityIds = new Set(entities.map((e) => e.tempId));

    // Filter relations with invalid entity references
    relations = relations.filter(
      (r) => validEntityIds.has(r.sourceTempId) && validEntityIds.has(r.targetTempId)
    );

    // Filter by relation types if specified
    if (mergedOptions.relationTypes.length > 0) {
      relations = relations.filter((r) => mergedOptions.relationTypes.includes(r.type));
    }

    // Filter by confidence
    relations = relations.filter((r) => r.confidence >= mergedOptions.minConfidence);

    // Sort by confidence and limit
    relations = relations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, mergedOptions.maxRelations);

    const metadata: ExtractionResult['metadata'] = {
      processingTimeMs: Date.now() - startTime,
      model: this.llmClient.getModelName(),
    };
    if (response.usage?.totalTokens !== undefined) {
      metadata.tokenCount = response.usage.totalTokens;
    }

    return {
      entities: [],
      relations,
      sourceText: text,
      metadata,
    };
  }

  /**
   * Extract relations from multiple chunks with their entities
   *
   * @param chunks - Text chunks with entities to process
   * @param options - Extraction options
   * @param batchOptions - Batch processing options
   * @returns Array of extraction results
   */
  async extractBatch(
    chunks: ChunkWithEntities[],
    options?: RelationExtractionOptions,
    batchOptions?: BatchOptions
  ): Promise<ExtractionResult[]> {
    const concurrency = batchOptions?.concurrency ?? 3;
    const continueOnError = batchOptions?.continueOnError ?? false;

    const results: ExtractionResult[] = [];
    const queue = [...chunks];
    const inProgress: Promise<void>[] = [];

    while (queue.length > 0 || inProgress.length > 0) {
      // Start new tasks up to concurrency limit
      while (inProgress.length < concurrency && queue.length > 0) {
        const chunk = queue.shift()!;
        const task = this.processChunk(chunk, options, continueOnError)
          .then((result) => {
            if (result) {
              results.push(result);
            }
          })
          .finally(() => {
            const index = inProgress.indexOf(task);
            if (index > -1) {
              inProgress.splice(index, 1);
            }
          });
        inProgress.push(task);
      }

      // Wait for at least one task to complete
      if (inProgress.length > 0) {
        await Promise.race(inProgress);
      }
    }

    return results;
  }

  /**
   * Process a single chunk
   */
  private async processChunk(
    chunk: ChunkWithEntities,
    options?: RelationExtractionOptions,
    continueOnError?: boolean
  ): Promise<ExtractionResult | null> {
    try {
      return await this.extract(chunk.content, chunk.entities, options);
    } catch (error) {
      if (continueOnError) {
        console.warn(`Failed to process chunk ${chunk.id}:`, error);
        return null;
      }
      throw error;
    }
  }

  /**
   * Build extraction prompt
   */
  private buildPrompt(
    text: string,
    entities: ExtractedEntity[],
    options: Required<Omit<RelationExtractionOptions, 'customPrompt'>> & {
      customPrompt?: string;
    }
  ): ChatMessage[] {
    const relationTypesStr = options.relationTypes.join(', ');

    const entityListStr = entities.map((e) => `- ${e.tempId}: ${e.name} (${e.type})`).join('\n');

    const systemPrompt = `You are an expert relation extraction system for AI/ML domain knowledge graphs.
Your task is to extract relationships between the given entities based on the text.

Relation types to extract: ${relationTypesStr}

For each relation, provide:
- tempId: A unique temporary identifier (e.g., "r1", "r2")
- type: One of the specified relation types
- sourceTempId: The tempId of the source entity
- targetTempId: The tempId of the target entity
- description: A brief description of the relationship
- confidence: Your confidence score (0.0 to 1.0)

Output JSON format:
{
  "relations": [
    {
      "tempId": "r1",
      "type": "DEVELOPED_BY",
      "sourceTempId": "e1",
      "targetTempId": "e2",
      "description": "GPT-4 was developed by OpenAI",
      "confidence": 0.95
    }
  ]
}

Rules:
- Only extract relations that are explicitly or clearly implied in the text
- Use only the provided entity tempIds for sourceTempId and targetTempId
- Assign confidence based on how clearly the relationship is stated
- Do not hallucinate relations not supported by the text`;

    const userPrompt =
      options.customPrompt ??
      `Extract relations from the following text, using the provided entities:

Entities:
${entityListStr}

Text:
---
${text}
---

Return the extracted relations as JSON.`;

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  /**
   * Merge options with defaults
   */
  private mergeOptions(options?: RelationExtractionOptions): Required<
    Omit<RelationExtractionOptions, 'customPrompt'>
  > & {
    customPrompt?: string;
  } {
    const result: Required<Omit<RelationExtractionOptions, 'customPrompt'>> & {
      customPrompt?: string;
    } = {
      relationTypes: options?.relationTypes ?? DEFAULT_OPTIONS.relationTypes,
      minConfidence: options?.minConfidence ?? DEFAULT_OPTIONS.minConfidence,
      maxRelations: options?.maxRelations ?? DEFAULT_OPTIONS.maxRelations,
    };
    if (options?.customPrompt !== undefined) {
      result.customPrompt = options.customPrompt;
    }
    return result;
  }
}
