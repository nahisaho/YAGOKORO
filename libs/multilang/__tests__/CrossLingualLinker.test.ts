import { describe, it, expect, beforeEach } from 'vitest';
import { CrossLingualLinker } from '../src/services/CrossLingualLinker.js';
import { TermNormalizer } from '../src/services/TermNormalizer.js';
import type { NEREntity } from '../src/types.js';

describe('CrossLingualLinker', () => {
  let linker: CrossLingualLinker;
  let normalizer: TermNormalizer;

  beforeEach(() => {
    normalizer = new TermNormalizer();
    linker = new CrossLingualLinker({
      termNormalizer: normalizer,
      similarityThreshold: 0.8,
    });
  });

  describe('linkEntities (REQ-008-05)', () => {
    it('should link exact match entities', async () => {
      const entity: NEREntity = {
        text: 'Transformer',
        type: 'TECH',
        start: 0,
        end: 11,
        confidence: 0.95,
        language: 'en',
      };

      const existingIds = new Map<string, string>([
        ['transformer', 'entity-transformer-001'],
        ['attention', 'entity-attention-001'],
      ]);

      const links = await linker.linkEntities([entity], existingIds);

      expect(links).toHaveLength(1);
      expect(links[0]?.targetEntityId).toBe('entity-transformer-001');
      expect(links[0]?.similarity).toBe(1.0);
      expect(links[0]?.linkType).toBe('exact');
    });

    it('should link normalized entities', async () => {
      const entity: NEREntity = {
        text: 'llm',
        type: 'TECH',
        start: 0,
        end: 3,
        confidence: 0.9,
        language: 'en',
      };

      const existingIds = new Map<string, string>([
        ['large language model', 'entity-llm-001'],
      ]);

      const links = await linker.linkEntities([entity], existingIds);

      expect(links).toHaveLength(1);
      expect(links[0]?.targetEntityId).toBe('entity-llm-001');
      expect(links[0]?.similarity).toBe(1.0);
    });

    it('should not link dissimilar entities', async () => {
      const entity: NEREntity = {
        text: 'quantum computing',
        type: 'TECH',
        start: 0,
        end: 17,
        confidence: 0.9,
        language: 'en',
      };

      const existingIds = new Map<string, string>([
        ['deep learning', 'entity-dl-001'],
        ['machine learning', 'entity-ml-001'],
      ]);

      const links = await linker.linkEntities([entity], existingIds);
      expect(links).toHaveLength(0);
    });

    it('should handle empty entities array', async () => {
      const existingIds = new Map<string, string>([
        ['transformer', 'entity-001'],
      ]);

      const links = await linker.linkEntities([], existingIds);
      expect(links).toHaveLength(0);
    });

    it('should handle empty existing IDs map', async () => {
      const entity: NEREntity = {
        text: 'Transformer',
        type: 'TECH',
        start: 0,
        end: 11,
        confidence: 0.95,
        language: 'en',
      };

      const links = await linker.linkEntities([entity], new Map());
      expect(links).toHaveLength(0);
    });

    it('should set autoLinked based on similarity threshold', async () => {
      const entity: NEREntity = {
        text: 'transformer',
        type: 'TECH',
        start: 0,
        end: 11,
        confidence: 0.95,
        language: 'en',
      };

      const existingIds = new Map<string, string>([
        ['transformer', 'entity-transformer'],
      ]);

      const links = await linker.linkEntities([entity], existingIds);

      expect(links).toHaveLength(1);
      expect(links[0]?.autoLinked).toBe(true);
    });
  });

  describe('similarity calculation', () => {
    it('should calculate perfect similarity for identical strings', () => {
      const similarity = (linker as any).calculateSimilarity('transformer', 'transformer');
      expect(similarity).toBe(1.0);
    });

    it('should calculate low similarity for different strings', () => {
      const similarity = (linker as any).calculateSimilarity('transformer', 'quantum');
      expect(similarity).toBeLessThan(0.5);
    });
  });

  describe('findBestLink', () => {
    it('should return best matching link', async () => {
      const entity: NEREntity = {
        text: 'GPT',
        type: 'MODEL',
        start: 0,
        end: 3,
        confidence: 0.95,
        language: 'en',
      };

      const existingIds = new Map<string, string>([
        ['gpt', 'entity-gpt'],
        ['bert', 'entity-bert'],
      ]);

      const link = await (linker as any).findBestLink(entity, existingIds);
      expect(link).not.toBeNull();
      expect(link?.targetEntityId).toBe('entity-gpt');
    });

    it('should return null when no match above threshold', async () => {
      const entity: NEREntity = {
        text: 'completely unique term xyz',
        type: 'TECH',
        start: 0,
        end: 25,
        confidence: 0.9,
        language: 'en',
      };

      const existingIds = new Map<string, string>([
        ['transformer', 'entity-123'],
      ]);

      const link = await (linker as any).findBestLink(entity, existingIds);
      expect(link).toBeNull();
    });
  });
});

describe('TermNormalizer', () => {
  let normalizer: TermNormalizer;

  beforeEach(() => {
    normalizer = new TermNormalizer();
  });

  describe('normalize', () => {
    it('should normalize common AI/ML abbreviations (returns canonical form)', () => {
      // TermNormalizer returns the canonical form, which preserves case
      expect(normalizer.normalize('llm', 'en')).toBe('Large Language Model');
      expect(normalizer.normalize('nlp', 'en')).toBe('Natural Language Processing');
    });

    it('should handle case variations', () => {
      expect(normalizer.normalize('LLM', 'en')).toBe('Large Language Model');
      expect(normalizer.normalize('Llm', 'en')).toBe('Large Language Model');
    });

    it('should return original for unknown terms', () => {
      expect(normalizer.normalize('unknown-term', 'en')).toBe('unknown-term');
    });

    it('should normalize Transformer variants', () => {
      expect(normalizer.normalize('transformer', 'en')).toBe('Transformer');
      expect(normalizer.normalize('transformers', 'en')).toBe('Transformer');
    });

    it('should normalize deep learning terms', () => {
      expect(normalizer.normalize('dl', 'en')).toBe('Deep Learning');
      expect(normalizer.normalize('ml', 'en')).toBe('Machine Learning');
    });

    it('should normalize terms from different languages', () => {
      expect(normalizer.normalize('大语言模型', 'zh')).toBe('Large Language Model');
      expect(normalizer.normalize('大規模言語モデル', 'ja')).toBe('Large Language Model');
    });
  });

  describe('getVariants', () => {
    it('should return variants for known term', () => {
      const variants = normalizer.getVariants('Large Language Model');
      expect(variants).not.toBeNull();
      expect(variants?.en).toContain('llm');
    });

    it('should return null for unknown term', () => {
      const variants = normalizer.getVariants('UNKNOWN_TERM_12345');
      expect(variants).toBeNull();
    });
  });

  describe('addMapping', () => {
    it('should add new mapping', () => {
      normalizer.addMapping('Custom Term', {
        en: ['custom', 'cust'],
      });
      expect(normalizer.normalize('custom', 'en')).toBe('Custom Term');
    });

    it('should support multiple language variants', () => {
      normalizer.addMapping('Test Term', {
        en: ['test'],
        zh: ['测试'],
      });
      expect(normalizer.normalize('test', 'en')).toBe('Test Term');
      expect(normalizer.normalize('测试', 'zh')).toBe('Test Term');
    });
  });
});
