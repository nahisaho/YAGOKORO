import type {
  NEREntity,
  CrossLingualLink,
} from '../types.js';
import { DEFAULT_CONFIG } from '../constants.js';
import { TermNormalizer } from './TermNormalizer.js';
import { TranslationService } from './TranslationService.js';

/**
 * CrossLingualLinker - Link entities across languages
 *
 * REQ-008-05: Cross-lingual entity linking
 * REQ-008-11: Linking threshold 0.8
 * ADR-011: NFR specifications for linking precision
 */
export class CrossLingualLinker {
  private readonly termNormalizer: TermNormalizer;
  private readonly translationService: TranslationService | null;
  private readonly similarityThreshold: number;

  constructor(options: {
    termNormalizer?: TermNormalizer;
    translationService?: TranslationService;
    similarityThreshold?: number;
  } = {}) {
    this.termNormalizer = options.termNormalizer ?? new TermNormalizer();
    this.translationService = options.translationService ?? null;
    this.similarityThreshold = options.similarityThreshold ?? DEFAULT_CONFIG.LINKING_THRESHOLD;
  }

  /**
   * Link entities to existing knowledge graph entities
   *
   * @param entities - Entities to link
   * @param existingEntityIds - Map of canonical names to entity IDs
   * @returns Cross-lingual links
   */
  async linkEntities(
    entities: NEREntity[],
    existingEntityIds: Map<string, string>
  ): Promise<CrossLingualLink[]> {
    const links: CrossLingualLink[] = [];

    for (const entity of entities) {
      const link = await this.findBestLink(entity, existingEntityIds);
      if (link) {
        links.push(link);
      }
    }

    return links;
  }

  /**
   * Find the best link for an entity
   */
  private async findBestLink(
    entity: NEREntity,
    existingEntityIds: Map<string, string>
  ): Promise<CrossLingualLink | null> {
    // Step 1: Try exact match after normalization
    const normalizedTerm = this.termNormalizer.normalize(entity.text, entity.language);
    const exactMatch = existingEntityIds.get(normalizedTerm.toLowerCase());

    if (exactMatch) {
      return {
        sourceEntity: entity,
        targetEntityId: exactMatch,
        similarity: 1.0,
        linkType: 'exact',
        autoLinked: true,
      };
    }

    // Step 2: Try translation-based matching (if translation service available)
    if (this.translationService && entity.language !== 'en') {
      try {
        const translation = await this.translationService.translate(entity.text, {
          sourceLanguage: entity.language,
          targetLanguage: 'en',
        });

        const translatedMatch = existingEntityIds.get(translation.translated.toLowerCase());
        if (translatedMatch) {
          return {
            sourceEntity: entity,
            targetEntityId: translatedMatch,
            similarity: 0.95, // High confidence for direct translation match
            linkType: 'exact',
            autoLinked: true,
          };
        }
      } catch (error) {
        console.warn('[CrossLingualLinker] Translation failed:', error);
      }
    }

    // Step 3: Try semantic similarity matching
    const semanticMatch = await this.findSemanticMatch(entity, existingEntityIds);
    if (semanticMatch && semanticMatch.similarity >= this.similarityThreshold) {
      return semanticMatch;
    }

    // Step 4: Return partial match if above lower threshold
    if (semanticMatch && semanticMatch.similarity >= 0.6) {
      return {
        ...semanticMatch,
        linkType: 'partial',
        autoLinked: false, // Needs manual review
      };
    }

    return null;
  }

  /**
   * Find semantic match using string similarity
   */
  private async findSemanticMatch(
    entity: NEREntity,
    existingEntityIds: Map<string, string>
  ): Promise<CrossLingualLink | null> {
    let bestMatch: CrossLingualLink | null = null;
    let bestSimilarity = 0;

    for (const [canonicalName, entityId] of existingEntityIds.entries()) {
      // Calculate similarity (simplified Levenshtein-based)
      const similarity = this.calculateSimilarity(
        entity.text.toLowerCase(),
        canonicalName.toLowerCase()
      );

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = {
          sourceEntity: entity,
          targetEntityId: entityId,
          similarity,
          linkType: 'semantic',
          autoLinked: similarity >= this.similarityThreshold,
        };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate string similarity (normalized Levenshtein distance)
   */
  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;
    if (a.length === 0 || b.length === 0) return 0.0;

    // Check if one contains the other
    if (a.includes(b) || b.includes(a)) {
      return Math.min(a.length, b.length) / Math.max(a.length, b.length);
    }

    // Levenshtein distance
    const matrix: number[][] = [];

    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= b.length; j++) {
      matrix[0]![j] = j;
    }

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j - 1]! + cost
        );
      }
    }

    const distance = matrix[a.length]![b.length]!;
    return 1 - distance / Math.max(a.length, b.length);
  }
}
