/**
 * PatternMatcher tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PatternMatcher,
  DEFAULT_PATTERNS,
  DEFAULT_PATTERN_CONFIG,
  type Pattern,
} from './pattern-matcher.js';
import type { DocumentEntity } from '../types.js';

describe('PatternMatcher', () => {
  let matcher: PatternMatcher;

  beforeEach(() => {
    matcher = new PatternMatcher();
  });

  describe('constructor', () => {
    it('should use default config when no config provided', () => {
      expect(matcher.getConfig()).toEqual(DEFAULT_PATTERN_CONFIG);
    });

    it('should initialize with default patterns', () => {
      const patterns = matcher.getPatterns();
      expect(patterns.length).toBe(DEFAULT_PATTERNS.length);
    });

    it('should merge custom config', () => {
      const customMatcher = new PatternMatcher({ minConfidence: 0.5 });
      expect(customMatcher.getConfig().minConfidence).toBe(0.5);
    });

    it('should add custom patterns', () => {
      const customPattern: Pattern = {
        name: 'custom-pattern',
        regex: /custom\s+test/gi,
        relationType: 'DEVELOPED_BY',
        confidence: 0.9,
        sourcePosition: 'before',
        targetPosition: 'after',
      };
      const customMatcher = new PatternMatcher({ customPatterns: [customPattern] });
      const patterns = customMatcher.getPatterns();
      expect(patterns.some((p) => p.name === 'custom-pattern')).toBe(true);
    });

    it('should not use default patterns when disabled', () => {
      const customMatcher = new PatternMatcher({ useDefaultPatterns: false });
      expect(customMatcher.getPatterns()).toHaveLength(0);
    });
  });

  describe('matchPattern', () => {
    it('should match "developed by" pattern', () => {
      const pattern = DEFAULT_PATTERNS.find((p) => p.name === 'developed-by-passive')!;
      const text = 'GPT-4 was developed by OpenAI.';
      const result = matcher.matchPattern(text, pattern);

      expect(result).not.toBeNull();
      expect(result?.relationType).toBe('DEVELOPED_BY');
      expect(result?.matchedText).toContain('developed by');
    });

    it('should match "trained on" pattern', () => {
      const pattern = DEFAULT_PATTERNS.find((p) => p.name === 'trained-on')!;
      const text = 'The model was trained on Wikipedia data.';
      const result = matcher.matchPattern(text, pattern);

      expect(result).not.toBeNull();
      expect(result?.relationType).toBe('TRAINED_ON');
    });

    it('should return null for no match', () => {
      const pattern = DEFAULT_PATTERNS.find((p) => p.name === 'developed-by-passive')!;
      const text = 'This text has no patterns.';
      const result = matcher.matchPattern(text, pattern);

      expect(result).toBeNull();
    });

    it('should be case insensitive', () => {
      const pattern = DEFAULT_PATTERNS.find((p) => p.name === 'developed-by-passive')!;
      const text = 'GPT-4 was DEVELOPED BY OpenAI.';
      const result = matcher.matchPattern(text, pattern);

      expect(result).not.toBeNull();
    });
  });

  describe('match', () => {
    const entities: DocumentEntity[] = [
      { name: 'GPT-4', type: 'MODEL', positions: [0] },
      { name: 'OpenAI', type: 'ORG', positions: [20] },
      { name: 'Wikipedia', type: 'DATASET', positions: [50] },
    ];

    it('should match multiple patterns in text', () => {
      const text = 'GPT-4 was developed by OpenAI and trained on Wikipedia.';
      const results = matcher.match(text, entities);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.relationType === 'DEVELOPED_BY')).toBe(true);
      expect(results.some((r) => r.relationType === 'TRAINED_ON')).toBe(true);
    });

    it('should respect minConfidence threshold', () => {
      const highConfMatcher = new PatternMatcher({ minConfidence: 0.9 });
      const text = 'GPT-4 was developed by OpenAI.';
      const results = highConfMatcher.match(text, entities);

      // Only high confidence patterns should match
      for (const result of results) {
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      }
    });

    it('should return empty array for text with no patterns', () => {
      const text = 'This is a simple text without any relation patterns.';
      const results = matcher.match(text, []);

      expect(results).toHaveLength(0);
    });

    it('should match collaboration patterns', () => {
      const text = 'Google collaborated with DeepMind on this project.';
      const collabEntities: DocumentEntity[] = [
        { name: 'Google', type: 'ORG', positions: [0] },
        { name: 'DeepMind', type: 'ORG', positions: [25] },
      ];
      const results = matcher.match(text, collabEntities);

      expect(results.some((r) => r.relationType === 'COLLABORATED_WITH')).toBe(true);
    });

    it('should match influence patterns', () => {
      const text = 'BERT was influenced by the Transformer architecture.';
      const influenceEntities: DocumentEntity[] = [
        { name: 'BERT', type: 'MODEL', positions: [0] },
        { name: 'Transformer', type: 'TECHNIQUE', positions: [27] },
      ];
      const results = matcher.match(text, influenceEntities);

      expect(results.some((r) => r.relationType === 'INFLUENCED_BY')).toBe(true);
    });

    it('should match based-on patterns', () => {
      const text = 'LLaMA is based on the GPT architecture.';
      const basedOnEntities: DocumentEntity[] = [
        { name: 'LLaMA', type: 'MODEL', positions: [0] },
        { name: 'GPT', type: 'MODEL', positions: [22] },
      ];
      const results = matcher.match(text, basedOnEntities);

      expect(results.some((r) => r.relationType === 'BASED_ON')).toBe(true);
    });

    it('should match evaluation patterns', () => {
      const text = 'The model was evaluated on GLUE benchmark.';
      const evalEntities: DocumentEntity[] = [
        { name: 'model', type: 'MODEL', positions: [4] },
        { name: 'GLUE', type: 'BENCHMARK', positions: [27] },
      ];
      const results = matcher.match(text, evalEntities);

      expect(results.some((r) => r.relationType === 'EVALUATED_ON')).toBe(true);
    });
  });

  describe('addPattern', () => {
    it('should add a new pattern', () => {
      const customPattern: Pattern = {
        name: 'new-pattern',
        regex: /new\s+pattern/gi,
        relationType: 'DEVELOPED_BY',
        confidence: 0.8,
        sourcePosition: 'before',
        targetPosition: 'after',
      };

      const initialCount = matcher.getPatterns().length;
      matcher.addPattern(customPattern);
      expect(matcher.getPatterns()).toHaveLength(initialCount + 1);
    });
  });

  describe('removePattern', () => {
    it('should remove pattern by name', () => {
      const initialCount = matcher.getPatterns().length;
      const removed = matcher.removePattern('developed-by-passive');
      
      expect(removed).toBe(true);
      expect(matcher.getPatterns()).toHaveLength(initialCount - 1);
    });

    it('should return false for non-existent pattern', () => {
      const removed = matcher.removePattern('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('pattern coverage', () => {
    it('should have patterns for all v3 relation types', () => {
      const patterns = matcher.getPatterns();
      const coveredTypes = new Set(patterns.map((p) => p.relationType));

      // Check v3 relation types
      expect(coveredTypes.has('DEVELOPED_BY')).toBe(true);
      expect(coveredTypes.has('TRAINED_ON')).toBe(true);
      expect(coveredTypes.has('USES_TECHNIQUE')).toBe(true);
      expect(coveredTypes.has('EVALUATED_ON')).toBe(true);
      expect(coveredTypes.has('CITES')).toBe(true);
      expect(coveredTypes.has('AFFILIATED_WITH')).toBe(true);
      expect(coveredTypes.has('INFLUENCED_BY')).toBe(true);
      expect(coveredTypes.has('COLLABORATED_WITH')).toBe(true);
      expect(coveredTypes.has('EVOLVED_INTO')).toBe(true);
      expect(coveredTypes.has('COMPETES_WITH')).toBe(true);
      expect(coveredTypes.has('BASED_ON')).toBe(true);
    });
  });

  describe('confidence scoring', () => {
    it('should return confidence between 0 and 1', () => {
      const text = 'GPT-4 was developed by OpenAI.';
      const entities: DocumentEntity[] = [
        { name: 'GPT-4', type: 'MODEL', positions: [0] },
        { name: 'OpenAI', type: 'ORG', positions: [23] },
      ];
      const results = matcher.match(text, entities);

      for (const result of results) {
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('getConfig', () => {
    it('should return a copy of config', () => {
      const config1 = matcher.getConfig();
      const config2 = matcher.getConfig();
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different object references
    });
  });
});
