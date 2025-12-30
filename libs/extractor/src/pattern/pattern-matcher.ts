/**
 * PatternMatcher - Verb pattern matching for relation type inference
 *
 * Uses linguistic patterns to infer relation types from text:
 * - Verb patterns (e.g., "developed by", "trained on")
 * - Dependency structures
 * - Template matching
 */

import type { PatternMatch, RelationType, DocumentEntity } from '../types.js';

/**
 * Entity position in relation to pattern match
 */
export type EntityPosition = 'before' | 'after' | 'subject' | 'object';

/**
 * Pattern definition
 */
export interface Pattern {
  /** Pattern name */
  name: string;
  /** Regular expression pattern */
  regex: RegExp;
  /** Inferred relation type */
  relationType: RelationType;
  /** Base confidence for this pattern */
  confidence: number;
  /** Source entity position relative to match */
  sourcePosition: EntityPosition;
  /** Target entity position relative to match */
  targetPosition: EntityPosition;
}

/**
 * Pattern matching configuration
 */
export interface PatternMatcherConfig {
  /** Custom patterns to add */
  customPatterns?: Pattern[] | undefined;
  /** Minimum confidence threshold */
  minConfidence: number;
  /** Whether to use default patterns */
  useDefaultPatterns: boolean;
  /** Window size (characters) to search for entities around pattern */
  entityWindowSize: number;
}

/**
 * Default configuration
 */
export const DEFAULT_PATTERN_CONFIG: PatternMatcherConfig = {
  minConfidence: 0.3,
  useDefaultPatterns: true,
  entityWindowSize: 100,
};

/**
 * Default patterns for relation types
 */
export const DEFAULT_PATTERNS: Pattern[] = [
  // DEVELOPED_BY patterns
  {
    name: 'developed-by-passive',
    regex: /(?:was\s+)?developed\s+by/gi,
    relationType: 'DEVELOPED_BY',
    confidence: 0.85,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  {
    name: 'created-by',
    regex: /(?:was\s+)?created\s+by/gi,
    relationType: 'DEVELOPED_BY',
    confidence: 0.85,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  {
    name: 'built-by',
    regex: /(?:was\s+)?built\s+by/gi,
    relationType: 'DEVELOPED_BY',
    confidence: 0.8,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  {
    name: 'introduced-by',
    regex: /(?:was\s+)?introduced\s+by/gi,
    relationType: 'DEVELOPED_BY',
    confidence: 0.8,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  // TRAINED_ON patterns
  {
    name: 'trained-on',
    regex: /trained\s+(?:on|using|with)/gi,
    relationType: 'TRAINED_ON',
    confidence: 0.85,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  {
    name: 'fine-tuned-on',
    regex: /fine[- ]?tuned\s+(?:on|using|with)/gi,
    relationType: 'TRAINED_ON',
    confidence: 0.85,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  // USES_TECHNIQUE patterns
  {
    name: 'uses-technique',
    regex: /(?:uses?|utilizes?|employs?|leverages?|applies?)/gi,
    relationType: 'USES_TECHNIQUE',
    confidence: 0.7,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  {
    name: 'based-on-technique',
    regex: /(?:is\s+)?based\s+on\s+(?:the\s+)?(?:technique|method|approach)/gi,
    relationType: 'USES_TECHNIQUE',
    confidence: 0.75,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  // EVALUATED_ON patterns
  {
    name: 'evaluated-on',
    regex: /(?:was\s+)?evaluated\s+(?:on|using)/gi,
    relationType: 'EVALUATED_ON',
    confidence: 0.85,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  {
    name: 'tested-on',
    regex: /(?:was\s+)?tested\s+(?:on|using|with)/gi,
    relationType: 'EVALUATED_ON',
    confidence: 0.8,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  {
    name: 'benchmarked-on',
    regex: /(?:was\s+)?benchmarked\s+(?:on|using|against)/gi,
    relationType: 'EVALUATED_ON',
    confidence: 0.85,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  // CITES patterns
  {
    name: 'cites-work',
    regex: /(?:cites?|references?|builds\s+(?:on|upon))/gi,
    relationType: 'CITES',
    confidence: 0.75,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  // AFFILIATED_WITH patterns
  {
    name: 'affiliated-with',
    regex: /(?:is\s+)?affiliated\s+with/gi,
    relationType: 'AFFILIATED_WITH',
    confidence: 0.9,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  {
    name: 'works-at',
    regex: /works?\s+(?:at|for)/gi,
    relationType: 'AFFILIATED_WITH',
    confidence: 0.85,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  // INFLUENCED_BY patterns
  {
    name: 'influenced-by',
    regex: /(?:was\s+)?influenced\s+by/gi,
    relationType: 'INFLUENCED_BY',
    confidence: 0.8,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  {
    name: 'inspired-by',
    regex: /(?:was\s+)?inspired\s+by/gi,
    relationType: 'INFLUENCED_BY',
    confidence: 0.8,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  // COLLABORATED_WITH patterns
  {
    name: 'collaborated-with',
    regex: /collaborat(?:ed|ing|es?)\s+with/gi,
    relationType: 'COLLABORATED_WITH',
    confidence: 0.9,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  {
    name: 'partnered-with',
    regex: /partner(?:ed|ing|s)?\s+with/gi,
    relationType: 'COLLABORATED_WITH',
    confidence: 0.85,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  // EVOLVED_INTO patterns
  {
    name: 'evolved-into',
    regex: /evolved\s+into/gi,
    relationType: 'EVOLVED_INTO',
    confidence: 0.8,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  {
    name: 'transformed-into',
    regex: /transformed\s+into/gi,
    relationType: 'EVOLVED_INTO',
    confidence: 0.75,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  {
    name: 'became',
    regex: /became/gi,
    relationType: 'EVOLVED_INTO',
    confidence: 0.6,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  // COMPETES_WITH patterns
  {
    name: 'competes-with',
    regex: /compet(?:es?|ing)\s+with/gi,
    relationType: 'COMPETES_WITH',
    confidence: 0.85,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  {
    name: 'rivals',
    regex: /(?:is\s+a\s+)?rival(?:s)?\s+(?:of|to)/gi,
    relationType: 'COMPETES_WITH',
    confidence: 0.8,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  // BASED_ON patterns
  {
    name: 'based-on',
    regex: /(?:is\s+)?based\s+on/gi,
    relationType: 'BASED_ON',
    confidence: 0.8,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  {
    name: 'derived-from',
    regex: /(?:is\s+)?derived\s+from/gi,
    relationType: 'BASED_ON',
    confidence: 0.85,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
  {
    name: 'extends',
    regex: /extends/gi,
    relationType: 'BASED_ON',
    confidence: 0.75,
    sourcePosition: 'before',
    targetPosition: 'after',
  },
];

/**
 * Internal match result with position information
 */
interface InternalMatch {
  pattern: Pattern;
  matchedText: string;
  startIndex: number;
  endIndex: number;
}

/**
 * PatternMatcher class
 * Matches linguistic patterns to infer relation types
 */
export class PatternMatcher {
  private config: PatternMatcherConfig;
  private patterns: Pattern[] = [];

  constructor(config: Partial<PatternMatcherConfig> = {}) {
    this.config = { ...DEFAULT_PATTERN_CONFIG, ...config };
    this.initializePatterns();
  }

  /**
   * Initialize patterns (default + custom)
   */
  private initializePatterns(): void {
    if (this.config.useDefaultPatterns) {
      this.patterns = [...DEFAULT_PATTERNS];
    }
    if (this.config.customPatterns) {
      this.patterns.push(...this.config.customPatterns);
    }
  }

  /**
   * Match patterns in text and find related entities
   */
  match(text: string, entities: DocumentEntity[]): PatternMatch[] {
    const results: PatternMatch[] = [];
    const internalMatches: InternalMatch[] = [];

    // Find all pattern matches in the text
    for (const pattern of this.patterns) {
      const matches = this.findPatternMatches(text, pattern);
      internalMatches.push(...matches);
    }

    // For each pattern match, find entities in the window
    for (const internalMatch of internalMatches) {
      const nearbyEntities = this.findEntitiesNearMatch(
        text,
        entities,
        internalMatch.startIndex,
        internalMatch.endIndex
      );

      // Generate relation candidates from nearby entities
      const { beforeEntities, afterEntities } = nearbyEntities;

      // Match source and target based on pattern positions
      const sourceEntities =
        internalMatch.pattern.sourcePosition === 'before' ||
        internalMatch.pattern.sourcePosition === 'subject'
          ? beforeEntities
          : afterEntities;

      const targetEntities =
        internalMatch.pattern.targetPosition === 'after' ||
        internalMatch.pattern.targetPosition === 'object'
          ? afterEntities
          : beforeEntities;

      // Create pattern matches for each source-target pair
      for (const source of sourceEntities) {
        for (const target of targetEntities) {
          if (source.name === target.name) continue; // Skip self-relations

          // Adjust confidence based on entity proximity
          const proximityBonus = this.calculateProximityBonus(
            internalMatch,
            source,
            target,
            text
          );
          const finalConfidence = Math.min(
            1.0,
            internalMatch.pattern.confidence + proximityBonus
          );

          if (finalConfidence >= this.config.minConfidence) {
            results.push({
              pattern: internalMatch.pattern.name,
              relationType: internalMatch.pattern.relationType,
              confidence: finalConfidence,
              matchedText: internalMatch.matchedText,
            });
          }
        }
      }
    }

    // Remove duplicates and keep highest confidence
    return this.deduplicateMatches(results);
  }

  /**
   * Find all occurrences of a pattern in text
   */
  private findPatternMatches(text: string, pattern: Pattern): InternalMatch[] {
    const matches: InternalMatch[] = [];

    // Reset regex lastIndex for global patterns
    pattern.regex.lastIndex = 0;

    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      matches.push({
        pattern,
        matchedText: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    return matches;
  }

  /**
   * Find entities near a pattern match
   */
  private findEntitiesNearMatch(
    text: string,
    entities: DocumentEntity[],
    matchStart: number,
    matchEnd: number
  ): { beforeEntities: DocumentEntity[]; afterEntities: DocumentEntity[] } {
    const windowSize = this.config.entityWindowSize;
    const beforeStart = Math.max(0, matchStart - windowSize);
    const afterEnd = Math.min(text.length, matchEnd + windowSize);

    const beforeText = text.substring(beforeStart, matchStart).toLowerCase();
    const afterText = text.substring(matchEnd, afterEnd).toLowerCase();

    const beforeEntities: DocumentEntity[] = [];
    const afterEntities: DocumentEntity[] = [];

    for (const entity of entities) {
      const entityLower = entity.name.toLowerCase();

      if (beforeText.includes(entityLower)) {
        beforeEntities.push(entity);
      }

      if (afterText.includes(entityLower)) {
        afterEntities.push(entity);
      }
    }

    return { beforeEntities, afterEntities };
  }

  /**
   * Calculate proximity bonus for confidence
   */
  private calculateProximityBonus(
    match: InternalMatch,
    source: DocumentEntity,
    target: DocumentEntity,
    text: string
  ): number {
    // Find actual positions of entities closest to the match
    const sourcePos = this.findClosestPosition(
      text,
      source.name,
      match.startIndex
    );
    const targetPos = this.findClosestPosition(
      text,
      target.name,
      match.endIndex
    );

    if (sourcePos === -1 || targetPos === -1) {
      return 0;
    }

    // Calculate distance (closer = higher bonus)
    const sourceDistance = Math.abs(sourcePos - match.startIndex);
    const targetDistance = Math.abs(targetPos - match.endIndex);
    const totalDistance = sourceDistance + targetDistance;

    // Max bonus of 0.1 for very close entities
    return Math.max(0, 0.1 * (1 - totalDistance / (2 * this.config.entityWindowSize)));
  }

  /**
   * Find position of entity text closest to reference position
   */
  private findClosestPosition(
    text: string,
    entityName: string,
    referencePos: number
  ): number {
    const lowerText = text.toLowerCase();
    const lowerEntity = entityName.toLowerCase();

    let closestPos = -1;
    let closestDistance = Infinity;

    let pos = 0;
    while ((pos = lowerText.indexOf(lowerEntity, pos)) !== -1) {
      const distance = Math.abs(pos - referencePos);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPos = pos;
      }
      pos += 1;
    }

    return closestPos;
  }

  /**
   * Deduplicate matches, keeping highest confidence per pattern/relation
   */
  private deduplicateMatches(matches: PatternMatch[]): PatternMatch[] {
    const uniqueMap = new Map<string, PatternMatch>();

    for (const match of matches) {
      const key = `${match.relationType}:${match.matchedText}`;
      const existing = uniqueMap.get(key);

      if (!existing || match.confidence > existing.confidence) {
        uniqueMap.set(key, match);
      }
    }

    return Array.from(uniqueMap.values());
  }

  /**
   * Match a single pattern against text
   */
  matchPattern(text: string, pattern: Pattern): PatternMatch | null {
    const internalMatches = this.findPatternMatches(text, pattern);

    if (internalMatches.length === 0) {
      return null;
    }

    const firstMatch = internalMatches[0];
    if (!firstMatch) {
      return null;
    }

    return {
      pattern: pattern.name,
      relationType: pattern.relationType,
      confidence: pattern.confidence,
      matchedText: firstMatch.matchedText,
    };
  }

  /**
   * Get all registered patterns
   */
  getPatterns(): Pattern[] {
    return [...this.patterns];
  }

  /**
   * Add custom pattern
   */
  addPattern(pattern: Pattern): void {
    this.patterns.push(pattern);
  }

  /**
   * Remove pattern by name
   */
  removePattern(name: string): boolean {
    const index = this.patterns.findIndex((p) => p.name === name);
    if (index !== -1) {
      this.patterns.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get current configuration
   */
  getConfig(): PatternMatcherConfig {
    return { ...this.config };
  }
}
