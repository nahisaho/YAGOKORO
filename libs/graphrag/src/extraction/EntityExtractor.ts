import type { BaseLLMClient } from '../llm/BaseLLMClient.js';
import type { ChatMessage } from '../llm/types.js';
import type {
  EntityExtractionOptions,
  ExtractableEntityType,
  ExtractedEntity,
  ExtractionResult,
  TextChunk,
} from './types.js';

/**
 * Default entity types to extract
 */
const DEFAULT_ENTITY_TYPES: ExtractableEntityType[] = [
  'AIModel',
  'Organization',
  'Person',
  'Technique',
  'Publication',
  'Benchmark',
  'Concept',
];

/**
 * Default extraction options
 */
const DEFAULT_OPTIONS: Required<Omit<EntityExtractionOptions, 'customPrompt'>> = {
  entityTypes: DEFAULT_ENTITY_TYPES,
  minConfidence: 0.7,
  maxEntities: 50,
  includeSourceSpans: false,
};

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
 * Entity Extractor
 *
 * Extracts named entities from text using LLMs.
 * Designed for GraphRAG knowledge graph construction.
 *
 * @example
 * ```typescript
 * const extractor = new EntityExtractor(llmClient);
 *
 * const result = await extractor.extract(
 *   'GPT-4 is a large language model developed by OpenAI.',
 *   { entityTypes: ['AIModel', 'Organization'] }
 * );
 *
 * console.log(result.entities);
 * // [
 * //   { name: 'GPT-4', type: 'AIModel', confidence: 0.95 },
 * //   { name: 'OpenAI', type: 'Organization', confidence: 0.98 }
 * // ]
 * ```
 */
export class EntityExtractor {
  constructor(private readonly llmClient: BaseLLMClient) {}

  /**
   * Extract entities from text
   *
   * @param text - Text to extract entities from
   * @param options - Extraction options
   * @returns Extraction result with entities and metadata
   */
  async extract(text: string, options?: EntityExtractionOptions): Promise<ExtractionResult> {
    const startTime = Date.now();
    const mergedOptions = this.mergeOptions(options);

    const messages = this.buildPrompt(text, mergedOptions);
    const response = await this.llmClient.chat(messages, {
      temperature: 0.1,
      structured: { type: 'json' },
    });

    const content = response.content;
    if (!content) {
      throw new Error('Empty response from LLM');
    }

    let parsed: { entities: ExtractedEntity[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(`Failed to parse LLM response as JSON: ${content.slice(0, 100)}`);
    }

    let entities = parsed.entities ?? [];

    // Filter by entity types if specified
    if (mergedOptions.entityTypes.length > 0) {
      entities = entities.filter((e) => mergedOptions.entityTypes.includes(e.type));
    }

    // Filter by confidence
    entities = entities.filter((e) => e.confidence >= mergedOptions.minConfidence);

    // Sort by confidence and limit
    entities = entities
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, mergedOptions.maxEntities);

    const metadata: ExtractionResult['metadata'] = {
      processingTimeMs: Date.now() - startTime,
      model: this.llmClient.getModelName(),
    };
    if (response.usage?.totalTokens !== undefined) {
      metadata.tokenCount = response.usage.totalTokens;
    }

    return {
      entities,
      relations: [],
      sourceText: text,
      metadata,
    };
  }

  /**
   * Extract entities from multiple text chunks
   *
   * @param chunks - Text chunks to process
   * @param options - Extraction options
   * @param batchOptions - Batch processing options
   * @returns Array of extraction results
   */
  async extractBatch(
    chunks: TextChunk[],
    options?: EntityExtractionOptions,
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
    chunk: TextChunk,
    options?: EntityExtractionOptions,
    continueOnError?: boolean
  ): Promise<ExtractionResult | null> {
    try {
      return await this.extract(chunk.content, options);
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
    options: Required<Omit<EntityExtractionOptions, 'customPrompt'>> & {
      customPrompt?: string;
    }
  ): ChatMessage[] {
    const entityTypesStr = options.entityTypes.join(', ');

    const systemPrompt = `You are an expert entity extraction system for AI/ML domain knowledge graphs.
Your task is to extract named entities from the given text.

Entity types to extract: ${entityTypesStr}

For each entity, provide:
- tempId: A unique temporary identifier (e.g., "e1", "e2")
- type: One of the specified entity types
- name: The canonical name of the entity
- description: A brief description based on the text context
- confidence: Your confidence score (0.0 to 1.0)

Output JSON format:
{
  "entities": [
    {
      "tempId": "e1",
      "type": "AIModel",
      "name": "GPT-4",
      "description": "Large language model",
      "confidence": 0.95
    }
  ]
}

Rules:
- Only extract entities that clearly appear in the text
- Use canonical/official names when possible
- Assign confidence based on how clearly the entity is identified
- Do not hallucinate entities not present in the text`;

    const userPrompt =
      options.customPrompt ??
      `Extract entities from the following text:

---
${text}
---

Return the extracted entities as JSON.`;

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  /**
   * Merge options with defaults
   */
  private mergeOptions(options?: EntityExtractionOptions): Required<
    Omit<EntityExtractionOptions, 'customPrompt'>
  > & {
    customPrompt?: string;
  } {
    const result: Required<Omit<EntityExtractionOptions, 'customPrompt'>> & {
      customPrompt?: string;
    } = {
      entityTypes: options?.entityTypes ?? DEFAULT_OPTIONS.entityTypes,
      minConfidence: options?.minConfidence ?? DEFAULT_OPTIONS.minConfidence,
      maxEntities: options?.maxEntities ?? DEFAULT_OPTIONS.maxEntities,
      includeSourceSpans: options?.includeSourceSpans ?? DEFAULT_OPTIONS.includeSourceSpans,
    };
    if (options?.customPrompt !== undefined) {
      result.customPrompt = options.customPrompt;
    }
    return result;
  }
}
