import { describe, it, expect, beforeEach } from 'vitest';
import { MultilingualNER } from '../src/services/MultilingualNER.js';
import { SUPPORTED_LANGUAGES } from '../src/constants.js';
import { execSync } from 'node:child_process';

// Check if Python and spaCy are available
let pythonAvailable = false;
try {
  execSync('python3 -c "import spacy"', { stdio: 'ignore' });
  pythonAvailable = true;
} catch {
  pythonAvailable = false;
}

describe('MultilingualNER', () => {
  let ner: MultilingualNER;

  beforeEach(() => {
    ner = new MultilingualNER();
  });

  describe('extract', () => {
    it.skipIf(!pythonAvailable)('should extract entities from English text', async () => {
      const text = 'Geoffrey Hinton from Google developed deep learning at the University of Toronto.';
      const result = await ner.extract(text, 'en');

      expect(result.language).toBe('en');
      expect(result.model).toBe('en_core_web_sm');
      expect(result.entities.length).toBeGreaterThan(0);

      // Should find at least one PERSON entity
      const persons = result.entities.filter(e => e.type === 'PERSON');
      expect(persons.length).toBeGreaterThan(0);
    });

    it.skipIf(!pythonAvailable)('should extract entities from Chinese text', async () => {
      const text = '谷歌的人工智能研究员在深度学习领域取得了重大突破。';
      const result = await ner.extract(text, 'zh');

      expect(result.language).toBe('zh');
      expect(result.model).toBe('zh_core_web_sm');
    });

    it.skipIf(!pythonAvailable)('should extract entities from Japanese text', async () => {
      const text = '東京大学の研究チームが機械学習の新しい手法を発表しました。';
      const result = await ner.extract(text, 'ja');

      expect(result.language).toBe('ja');
      expect(result.model).toBe('ja_core_news_sm');
    });

    it.skipIf(!pythonAvailable)('should extract entities from Korean text', async () => {
      const text = '서울대학교 연구팀이 인공지능 분야에서 새로운 발견을 했습니다.';
      const result = await ner.extract(text, 'ko');

      expect(result.language).toBe('ko');
      expect(result.model).toBe('ko_core_news_sm');
    });

    it('should return empty entities for empty text', async () => {
      const result = await ner.extract('', 'en');
      expect(result.entities).toHaveLength(0);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should include processing time', async () => {
      const result = await ner.extract('Test text', 'en');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('extractBatch', () => {
    it.skipIf(!pythonAvailable)('should extract entities from multiple texts', async () => {
      const texts = [
        { text: 'Apple Inc. is based in California.', language: 'en' as const },
        { text: 'Microsoft was founded by Bill Gates.', language: 'en' as const },
      ];

      const results = await ner.extractBatch(texts);

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.language).toBe('en');
      });
    });

    it('should return empty array for empty input', async () => {
      const results = await ner.extractBatch([]);
      expect(results).toHaveLength(0);
    });

    it.skipIf(!pythonAvailable)('should handle mixed languages', async () => {
      const texts = [
        { text: 'Google is an American company.', language: 'en' as const },
        { text: '谷歌是一家美国公司。', language: 'zh' as const },
      ];

      const results = await ner.extractBatch(texts);

      expect(results).toHaveLength(2);
      expect(results[0]?.language).toBe('en');
      expect(results[1]?.language).toBe('zh');
    });
  });

  describe('supported languages', () => {
    it('should support English (en)', () => {
      expect(SUPPORTED_LANGUAGES.en).toBeDefined();
      expect(SUPPORTED_LANGUAGES.en.spaCyModel).toBe('en_core_web_sm');
    });

    it('should support Chinese (zh)', () => {
      expect(SUPPORTED_LANGUAGES.zh).toBeDefined();
      expect(SUPPORTED_LANGUAGES.zh.spaCyModel).toBe('zh_core_web_sm');
    });

    it('should support Japanese (ja)', () => {
      expect(SUPPORTED_LANGUAGES.ja).toBeDefined();
      expect(SUPPORTED_LANGUAGES.ja.spaCyModel).toBe('ja_core_news_sm');
    });

    it('should support Korean (ko)', () => {
      expect(SUPPORTED_LANGUAGES.ko).toBeDefined();
      expect(SUPPORTED_LANGUAGES.ko.spaCyModel).toBe('ko_core_news_sm');
    });
  });

  describe('entity types', () => {
    it.skipIf(!pythonAvailable)('should identify PERSON entities', async () => {
      const result = await ner.extract('Yann LeCun works at Meta.', 'en');
      const persons = result.entities.filter(e => e.type === 'PERSON');
      expect(persons.length).toBeGreaterThan(0);
    });

    it.skipIf(!pythonAvailable)('should identify ORG entities', async () => {
      const result = await ner.extract('OpenAI developed GPT models.', 'en');
      const orgs = result.entities.filter(e => e.type === 'ORG');
      expect(orgs.length).toBeGreaterThan(0);
    });

    it.skipIf(!pythonAvailable)('should include confidence scores', async () => {
      const result = await ner.extract('Elon Musk is the CEO of Tesla.', 'en');
      if (result.entities.length > 0) {
        const entity = result.entities[0];
        expect(entity?.confidence).toBeGreaterThanOrEqual(0);
        expect(entity?.confidence).toBeLessThanOrEqual(1);
      }
    });
  });
});
