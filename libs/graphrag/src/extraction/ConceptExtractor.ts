/**
 * ConceptExtractor - LazyGraphRAG NLP-based Concept Extraction
 *
 * Extracts concepts from text using NLP-based noun phrase extraction
 * instead of LLM-based entity extraction for cost efficiency.
 *
 * Key differences from EntityExtractor:
 * - No LLM calls during indexing (0.1% of GraphRAG cost)
 * - Uses NLP for noun phrase extraction
 * - Builds concept co-occurrence graph
 * - Defers LLM usage to query time
 *
 * @see https://www.microsoft.com/en-us/research/blog/lazygraphrag-setting-a-new-standard-for-quality-and-cost/
 */

import nlp from 'compromise';
import type { TextChunk } from './types.js';

/**
 * Extracted concept from text
 */
export interface Concept {
  /** Unique concept ID */
  id: string;
  /** Concept text (normalized) */
  text: string;
  /** Original text forms found */
  variants: string[];
  /** Frequency in source text */
  frequency: number;
  /** TF-IDF or importance score */
  importance: number;
  /** Source chunk IDs where concept appears */
  sourceChunks: string[];
  /** Part of speech info */
  pos?: 'noun' | 'proper-noun' | 'noun-phrase';
}

/**
 * Co-occurrence relation between concepts
 */
export interface ConceptCooccurrence {
  /** Source concept ID */
  sourceId: string;
  /** Target concept ID */
  targetId: string;
  /** Co-occurrence count */
  count: number;
  /** Co-occurrence strength (normalized) */
  strength: number;
  /** Chunk IDs where co-occurrence appears */
  chunks: string[];
}

/**
 * Options for concept extraction
 */
export interface ConceptExtractionOptions {
  /** Minimum frequency threshold */
  minFrequency?: number;
  /** Maximum concepts to extract */
  maxConcepts?: number;
  /** Include single-word nouns */
  includeSingleWords?: boolean;
  /** Include proper nouns (names) */
  includeProperNouns?: boolean;
  /** Custom stopwords to exclude */
  stopwords?: string[];
  /** Co-occurrence window size (sentences) */
  cooccurrenceWindow?: number;
}

/**
 * Result of concept extraction
 */
export interface ConceptExtractionResult {
  /** Extracted concepts */
  concepts: Concept[];
  /** Co-occurrence relations */
  cooccurrences: ConceptCooccurrence[];
  /** Processing metadata */
  metadata: {
    processingTimeMs: number;
    totalChunks: number;
    totalConcepts: number;
    totalCooccurrences: number;
  };
}

/**
 * Default extraction options
 */
const DEFAULT_OPTIONS: Required<ConceptExtractionOptions> = {
  minFrequency: 2,
  maxConcepts: 1000,
  includeSingleWords: true,
  includeProperNouns: true,
  stopwords: [
    'the', 'a', 'an', 'this', 'that', 'these', 'those',
    'it', 'its', 'they', 'them', 'their',
    'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might',
    'can', 'must', 'shall',
    'and', 'or', 'but', 'if', 'then', 'else',
    'when', 'where', 'why', 'how', 'what', 'which', 'who',
    'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'not', 'only', 'same',
    'so', 'than', 'too', 'very', 'just', 'also',
    'one', 'two', 'first', 'new', 'use', 'used', 'using',
  ],
  cooccurrenceWindow: 1,
};

/**
 * ConceptExtractor
 *
 * NLP-based concept extraction for LazyGraphRAG.
 * Uses compromise library for noun phrase extraction.
 *
 * @example
 * ```typescript
 * const extractor = new ConceptExtractor();
 *
 * const chunks = [
 *   { id: '1', content: 'GPT-4 is a large language model by OpenAI.' },
 *   { id: '2', content: 'OpenAI developed GPT-4 using transformer architecture.' },
 * ];
 *
 * const result = await extractor.extract(chunks);
 * console.log(result.concepts);
 * // [
 * //   { text: 'gpt-4', frequency: 2, importance: 0.8, ... },
 * //   { text: 'openai', frequency: 2, importance: 0.7, ... },
 * //   { text: 'large language model', frequency: 1, ... },
 * // ]
 * ```
 */
export class ConceptExtractor {
  private readonly options: Required<ConceptExtractionOptions>;
  private readonly stopwordSet: Set<string>;

  constructor(options?: ConceptExtractionOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.stopwordSet = new Set(this.options.stopwords.map((w) => w.toLowerCase()));
  }

  /**
   * Extract concepts from text chunks
   *
   * @param chunks - Text chunks to process
   * @param options - Override options for this extraction
   * @returns Extraction result with concepts and co-occurrences
   */
  async extract(
    chunks: TextChunk[],
    options?: ConceptExtractionOptions
  ): Promise<ConceptExtractionResult> {
    const startTime = Date.now();
    const mergedOptions = { ...this.options, ...options };

    // Step 1: Extract noun phrases from all chunks
    const conceptMap = new Map<string, Concept>();
    const chunkConcepts = new Map<string, string[]>(); // chunkId -> conceptIds

    for (const chunk of chunks) {
      const extracted = this.extractFromChunk(chunk, mergedOptions);
      chunkConcepts.set(chunk.id, []);

      for (const { normalized, original, pos } of extracted) {
        const existingConcept = conceptMap.get(normalized);
        if (existingConcept) {
          existingConcept.frequency += 1;
          if (!existingConcept.variants.includes(original)) {
            existingConcept.variants.push(original);
          }
          if (!existingConcept.sourceChunks.includes(chunk.id)) {
            existingConcept.sourceChunks.push(chunk.id);
          }
        } else {
          conceptMap.set(normalized, {
            id: `concept-${normalized.replace(/\s+/g, '-')}`,
            text: normalized,
            variants: [original],
            frequency: 1,
            importance: 0, // Will be calculated later
            sourceChunks: [chunk.id],
            pos,
          });
        }
        const chunkConceptList = chunkConcepts.get(chunk.id);
        if (chunkConceptList && !chunkConceptList.includes(normalized)) {
          chunkConceptList.push(normalized);
        }
      }
    }

    // Step 2: Filter by minimum frequency
    const filteredConcepts = Array.from(conceptMap.values()).filter(
      (c) => c.frequency >= mergedOptions.minFrequency
    );

    // Step 3: Calculate importance (TF-IDF-like score)
    const totalChunks = chunks.length;
    for (const concept of filteredConcepts) {
      const tf = concept.frequency;
      const df = concept.sourceChunks.length;
      const idf = Math.log((totalChunks + 1) / (df + 1)) + 1;
      concept.importance = tf * idf;
    }

    // Step 4: Sort by importance and limit
    const sortedConcepts = filteredConcepts
      .sort((a, b) => b.importance - a.importance)
      .slice(0, mergedOptions.maxConcepts);

    // Normalize importance scores to 0-1
    const maxImportance = sortedConcepts[0]?.importance ?? 1;
    for (const concept of sortedConcepts) {
      concept.importance = concept.importance / maxImportance;
    }

    // Step 5: Build co-occurrence relations
    const conceptIdSet = new Set(sortedConcepts.map((c) => c.text));
    const cooccurrences = this.buildCooccurrences(
      chunkConcepts,
      conceptIdSet,
      mergedOptions.cooccurrenceWindow
    );

    return {
      concepts: sortedConcepts,
      cooccurrences,
      metadata: {
        processingTimeMs: Date.now() - startTime,
        totalChunks: chunks.length,
        totalConcepts: sortedConcepts.length,
        totalCooccurrences: cooccurrences.length,
      },
    };
  }

  /**
   * Extract noun phrases from a single chunk
   */
  private extractFromChunk(
    chunk: TextChunk,
    options: Required<ConceptExtractionOptions>
  ): Array<{ normalized: string; original: string; pos: 'noun' | 'proper-noun' | 'noun-phrase' }> {
    const doc = nlp(chunk.content);
    const results: Array<{
      normalized: string;
      original: string;
      pos: 'noun' | 'proper-noun' | 'noun-phrase';
    }> = [];

    // Extract noun phrases
    const nounPhrases = doc.nouns().out('array') as string[];
    for (const phrase of nounPhrases) {
      const normalized = this.normalize(phrase);
      if (this.isValidConcept(normalized, options)) {
        results.push({ normalized, original: phrase, pos: 'noun-phrase' });
      }
    }

    // Extract proper nouns (names, organizations)
    if (options.includeProperNouns) {
      // Match capitalized words and common AI/tech terms
      const properNouns = doc.match('#ProperNoun+').out('array') as string[];
      for (const name of properNouns) {
        const normalized = this.normalize(name);
        if (this.isValidConcept(normalized, options) && !results.some((r) => r.normalized === normalized)) {
          results.push({ normalized, original: name, pos: 'proper-noun' });
        }
      }
    }

    // Extract single nouns if enabled
    if (options.includeSingleWords) {
      const nouns = doc.match('#Noun').out('array') as string[];
      for (const noun of nouns) {
        const normalized = this.normalize(noun);
        if (this.isValidConcept(normalized, options) && !results.some((r) => r.normalized === normalized)) {
          results.push({ normalized, original: noun, pos: 'noun' });
        }
      }
    }

    return results;
  }

  /**
   * Normalize concept text
   */
  private normalize(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/['']/g, "'")
      .replace(/[""]/g, '"')
      .replace(/\s+/g, ' ');
  }

  /**
   * Check if concept is valid
   */
  private isValidConcept(
    normalized: string,
    options: Required<ConceptExtractionOptions>
  ): boolean {
    // Check minimum length
    if (normalized.length < 2) return false;

    // Check if it's a stopword
    if (this.stopwordSet.has(normalized)) return false;

    // Check if it's only numbers or punctuation
    if (/^[\d\s\W]+$/.test(normalized)) return false;

    // Check single word constraint
    if (!options.includeSingleWords && !normalized.includes(' ')) {
      return false;
    }

    return true;
  }

  /**
   * Build co-occurrence relations between concepts
   */
  private buildCooccurrences(
    chunkConcepts: Map<string, string[]>,
    validConcepts: Set<string>,
    _window: number
  ): ConceptCooccurrence[] {
    const cooccurrenceMap = new Map<string, ConceptCooccurrence>();

    for (const [chunkId, concepts] of chunkConcepts) {
      // Filter to valid concepts only
      const validChunkConcepts = concepts.filter((c) => validConcepts.has(c));

      // Create pairwise co-occurrences within chunk
      for (let i = 0; i < validChunkConcepts.length; i++) {
        for (let j = i + 1; j < validChunkConcepts.length; j++) {
          const concept1 = validChunkConcepts[i];
          const concept2 = validChunkConcepts[j];
          if (!concept1 || !concept2) continue;

          // Ensure consistent ordering
          const [source, target] = concept1 < concept2 ? [concept1, concept2] : [concept2, concept1];
          const key = `${source}::${target}`;

          const existing = cooccurrenceMap.get(key);
          if (existing) {
            existing.count += 1;
            if (!existing.chunks.includes(chunkId)) {
              existing.chunks.push(chunkId);
            }
          } else {
            cooccurrenceMap.set(key, {
              sourceId: `concept-${source.replace(/\s+/g, '-')}`,
              targetId: `concept-${target.replace(/\s+/g, '-')}`,
              count: 1,
              strength: 0, // Will be normalized later
              chunks: [chunkId],
            });
          }
        }
      }
    }

    // Normalize strength scores
    const cooccurrences = Array.from(cooccurrenceMap.values());
    const maxCount = Math.max(...cooccurrences.map((c) => c.count), 1);
    for (const cooc of cooccurrences) {
      cooc.strength = cooc.count / maxCount;
    }

    // Sort by strength and return
    return cooccurrences.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Extract concepts from a single text string
   *
   * Convenience method for extracting from a single text
   */
  async extractFromText(
    text: string,
    options?: ConceptExtractionOptions
  ): Promise<ConceptExtractionResult> {
    const chunk: TextChunk = {
      id: 'single-text',
      content: text,
    };
    return this.extract([chunk], options);
  }
}
