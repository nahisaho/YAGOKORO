/**
 * CooccurrenceAnalyzer - Entity co-occurrence analysis
 *
 * Analyzes documents to find entity co-occurrences at different levels:
 * - Document level: entities appearing in same document
 * - Paragraph level: entities appearing in same paragraph
 * - Sentence level: entities appearing in same sentence
 */

import type {
  CooccurrencePair,
  ExtractionDocument,
  DocumentEntity,
} from '../types.js';

/**
 * Co-occurrence analysis configuration
 */
export interface CooccurrenceConfig {
  /** Minimum count to be considered significant */
  minCount: number;
  /** Levels to analyze */
  levels: Array<'document' | 'paragraph' | 'sentence'>;
  /** Whether to normalize entity names */
  normalizeNames: boolean;
  /** Case sensitivity for entity matching */
  caseSensitive: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_COOCCURRENCE_CONFIG: CooccurrenceConfig = {
  minCount: 2,
  levels: ['document', 'paragraph', 'sentence'],
  normalizeNames: true,
  caseSensitive: false,
};

/**
 * Internal co-occurrence map key
 */
type CooccurrenceKey = string;

/**
 * Build key for co-occurrence pair
 */
function buildKey(sourceId: string, targetId: string): CooccurrenceKey {
  // Ensure consistent ordering for bidirectional relationships
  return sourceId < targetId ? `${sourceId}::${targetId}` : `${targetId}::${sourceId}`;
}

/**
 * CooccurrenceAnalyzer class
 * Detects entity co-occurrences in documents
 */
export class CooccurrenceAnalyzer {
  private config: CooccurrenceConfig;

  constructor(config: Partial<CooccurrenceConfig> = {}) {
    this.config = { ...DEFAULT_COOCCURRENCE_CONFIG, ...config };
  }

  /**
   * Analyze a single document for entity co-occurrences
   */
  analyze(document: ExtractionDocument): CooccurrencePair[] {
    const entities = document.entities ?? this.extractEntities(document.content);
    if (entities.length < 2) {
      return [];
    }

    const cooccurrences = new Map<CooccurrenceKey, CooccurrencePair>();

    for (const level of this.config.levels) {
      this.analyzeLevel(document, entities, level, cooccurrences);
    }

    return Array.from(cooccurrences.values()).filter(
      (pair) => pair.count >= this.config.minCount
    );
  }

  /**
   * Analyze multiple documents for entity co-occurrences
   */
  analyzeMultiple(documents: ExtractionDocument[]): CooccurrencePair[] {
    const globalCooccurrences = new Map<CooccurrenceKey, CooccurrencePair>();

    for (const document of documents) {
      const docCooccurrences = this.analyze(document);
      
      for (const pair of docCooccurrences) {
        const key = buildKey(pair.sourceId, pair.targetId);
        const existing = globalCooccurrences.get(key);

        if (existing) {
          existing.count += pair.count;
          existing.documentIds = [...new Set([...existing.documentIds, ...pair.documentIds])];
        } else {
          globalCooccurrences.set(key, { ...pair });
        }
      }
    }

    return Array.from(globalCooccurrences.values()).filter(
      (pair) => pair.count >= this.config.minCount
    );
  }

  /**
   * Analyze co-occurrences at a specific level
   */
  private analyzeLevel(
    document: ExtractionDocument,
    entities: DocumentEntity[],
    level: 'document' | 'paragraph' | 'sentence',
    cooccurrences: Map<CooccurrenceKey, CooccurrencePair>
  ): void {
    if (level === 'document') {
      // All entities in the document co-occur at document level
      this.recordCooccurrences(entities, document.id, level, cooccurrences);
    } else if (level === 'paragraph') {
      const paragraphs = this.splitIntoParagraphs(document.content);
      for (const paragraph of paragraphs) {
        const paragraphEntities = this.findEntitiesInText(entities, paragraph);
        if (paragraphEntities.length >= 2) {
          this.recordCooccurrences(paragraphEntities, document.id, level, cooccurrences);
        }
      }
    } else if (level === 'sentence') {
      const sentences = this.splitIntoSentences(document.content);
      for (const sentence of sentences) {
        const sentenceEntities = this.findEntitiesInText(entities, sentence);
        if (sentenceEntities.length >= 2) {
          this.recordCooccurrences(sentenceEntities, document.id, level, cooccurrences);
        }
      }
    }
  }

  /**
   * Record co-occurrences for a set of entities
   */
  private recordCooccurrences(
    entities: DocumentEntity[],
    documentId: string,
    level: 'document' | 'paragraph' | 'sentence',
    cooccurrences: Map<CooccurrenceKey, CooccurrencePair>
  ): void {
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const source = entities[i];
        const target = entities[j];
        
        if (!source || !target) continue;
        
        const sourceId = source.id ?? this.normalizeName(source.name);
        const targetId = target.id ?? this.normalizeName(target.name);
        const key = buildKey(sourceId, targetId);

        const existing = cooccurrences.get(key);
        if (existing) {
          existing.count += 1;
          if (!existing.documentIds.includes(documentId)) {
            existing.documentIds.push(documentId);
          }
          // Keep the most specific level (sentence > paragraph > document)
          if (this.levelPriority(level) > this.levelPriority(existing.level)) {
            existing.level = level;
          }
        } else {
          cooccurrences.set(key, {
            sourceId,
            sourceName: source.name,
            sourceType: source.type,
            targetId,
            targetName: target.name,
            targetType: target.type,
            count: 1,
            documentIds: [documentId],
            level,
          });
        }
      }
    }
  }

  /**
   * Get priority for co-occurrence level (higher = more specific)
   */
  private levelPriority(level: 'document' | 'paragraph' | 'sentence'): number {
    switch (level) {
      case 'sentence':
        return 3;
      case 'paragraph':
        return 2;
      case 'document':
        return 1;
    }
  }

  /**
   * Find entities that appear in a text segment
   */
  private findEntitiesInText(entities: DocumentEntity[], text: string): DocumentEntity[] {
    const normalizedText = this.config.caseSensitive ? text : text.toLowerCase();
    
    return entities.filter((entity) => {
      const searchName = this.config.caseSensitive
        ? entity.name
        : entity.name.toLowerCase();
      return normalizedText.includes(searchName);
    });
  }

  /**
   * Extract entities from text using simple NER patterns
   * This is a basic implementation - production should use proper NER
   */
  extractEntities(text: string): DocumentEntity[] {
    const entities: DocumentEntity[] = [];
    const seen = new Set<string>();

    // Pattern for capitalized words (including single word like "OpenAI" or multi-word like "Google DeepMind")
    // Also matches camelCase like "DeepMind" and PascalCase like "OpenAI"
    const patterns = [
      // Multi-word capitalized names (e.g., "Google DeepMind", "New York")
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g,
      // Single capitalized words with possible camelCase (e.g., "OpenAI", "DeepMind", "Google")
      /\b([A-Z][a-zA-Z]*[a-z][a-zA-Z]*)\b/g,
      // All-caps acronyms (e.g., "GPT", "BERT", "NLP")
      /\b([A-Z]{2,}(?:-[A-Z0-9]+)?)\b/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1];
        if (!name) continue;
        const normalized = this.normalizeName(name);

        // Skip common words and short matches
        if (normalized.length < 2 || this.isCommonWord(name)) {
          continue;
        }

        if (!seen.has(normalized)) {
          seen.add(normalized);
          entities.push({
            name,
            type: 'UNKNOWN',
            positions: [match.index],
            normalizedName: normalized,
          });
        } else {
          // Update positions for existing entity
          const existing = entities.find((e) => e.normalizedName === normalized);
          if (existing && !existing.positions.includes(match.index)) {
            existing.positions.push(match.index);
          }
        }
      }
    }

    return entities;
  }

  /**
   * Check if word is a common word to filter out
   */
  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'The', 'This', 'That', 'These', 'Those', 'However', 'Therefore',
      'Moreover', 'Furthermore', 'Although', 'While', 'When', 'Where',
      'Which', 'What', 'How', 'Why', 'Who', 'Abstract', 'Introduction',
      'Conclusion', 'Results', 'Methods', 'Discussion', 'References',
      'Figure', 'Table', 'Section', 'Chapter', 'Appendix',
    ]);
    return commonWords.has(word);
  }

  /**
   * Normalize entity name
   */
  normalizeName(name: string): string {
    if (!this.config.normalizeNames) {
      return name;
    }

    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  /**
   * Split text into paragraphs
   */
  splitIntoParagraphs(text: string): string[] {
    return text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  /**
   * Split text into sentences
   */
  splitIntoSentences(text: string): string[] {
    // Simple sentence splitter - handles common abbreviations
    return text
      .replace(/([.!?])\s+/g, '$1|SPLIT|')
      .split('|SPLIT|')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /**
   * Get current configuration
   */
  getConfig(): CooccurrenceConfig {
    return { ...this.config };
  }
}
