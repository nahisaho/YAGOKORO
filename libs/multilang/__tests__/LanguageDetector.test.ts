import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { LanguageDetector } from '../src/services/LanguageDetector.js';
import { execSync } from 'node:child_process';

// Check if Python and langdetect are available
let pythonAvailable = false;
try {
  execSync('python3 -c "import langdetect"', { stdio: 'ignore' });
  pythonAvailable = true;
} catch {
  pythonAvailable = false;
}

describe('LanguageDetector', () => {
  let detector: LanguageDetector;

  beforeEach(() => {
    detector = new LanguageDetector({
      confidenceThreshold: 0.7,
    });
  });

  describe('isSupported', () => {
    it('should return true for English', () => {
      expect(detector.isSupported('en')).toBe(true);
    });

    it('should return true for Chinese', () => {
      expect(detector.isSupported('zh')).toBe(true);
    });

    it('should return true for Japanese', () => {
      expect(detector.isSupported('ja')).toBe(true);
    });

    it('should return true for Korean', () => {
      expect(detector.isSupported('ko')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(detector.isSupported('fr')).toBe(false);
      expect(detector.isSupported('de')).toBe(false);
      expect(detector.isSupported('unknown')).toBe(false);
    });
  });

  describe('requiresManualReview', () => {
    it('should return true when confidence is below threshold (REQ-008-09)', () => {
      const result = {
        language: 'en' as const,
        confidence: 0.5,
        requiresManualReview: true,
        alternatives: [],
      };
      expect(detector.requiresManualReview(result)).toBe(true);
    });

    it('should return false when confidence is above threshold', () => {
      const result = {
        language: 'en' as const,
        confidence: 0.9,
        requiresManualReview: false,
        alternatives: [],
      };
      expect(detector.requiresManualReview(result)).toBe(false);
    });

    it('should return true when requiresManualReview flag is set', () => {
      const result = {
        language: 'en' as const,
        confidence: 0.8,
        requiresManualReview: true,
        alternatives: [],
      };
      expect(detector.requiresManualReview(result)).toBe(true);
    });
  });

  describe('detect', () => {
    it.skipIf(!pythonAvailable)('should detect English text', async () => {
      const text =
        'This is a sample English text about machine learning and artificial intelligence.';
      const result = await detector.detect(text);

      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.requiresManualReview).toBe(false);
    });

    it.skipIf(!pythonAvailable)('should detect Chinese text (REQ-008-01)', async () => {
      const text = '这是一篇关于机器学习和人工智能的中文论文摘要。深度学习在自然语言处理中有广泛应用。';
      const result = await detector.detect(text);

      expect(result.language).toBe('zh');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it.skipIf(!pythonAvailable)('should detect Japanese text (REQ-008-01)', async () => {
      const text =
        'これは機械学習と人工知能に関する日本語の論文要旨です。深層学習は自然言語処理において広く応用されています。';
      const result = await detector.detect(text);

      expect(result.language).toBe('ja');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it.skipIf(!pythonAvailable)('should detect Korean text (REQ-008-01)', async () => {
      const text =
        '이것은 기계 학습과 인공 지능에 관한 한국어 논문 초록입니다. 딥러닝은 자연어 처리에 널리 활용되고 있습니다.';
      const result = await detector.detect(text);

      expect(result.language).toBe('ko');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should flag low confidence results for manual review (REQ-008-09)', async () => {
      // Very short or ambiguous text
      const text = 'AI ML';
      const result = await detector.detect(text);

      // Short text may have low confidence
      if (result.confidence < 0.7) {
        expect(result.requiresManualReview).toBe(true);
      }
    });

    it('should return unknown for empty text', async () => {
      const result = await detector.detect('');
      expect(result.language).toBe('unknown');
      expect(result.requiresManualReview).toBe(true);
    });
  });

  describe('detectBatch', () => {
    it.skipIf(!pythonAvailable)('should detect multiple texts in batch', async () => {
      const texts = [
        'This is English text about deep learning.',
        '这是关于深度学习的中文文本。',
        'これは深層学習に関する日本語のテキストです。',
      ];

      const results = await detector.detectBatch(texts);

      expect(results).toHaveLength(3);
      expect(results[0]?.language).toBe('en');
      expect(results[1]?.language).toBe('zh');
      expect(results[2]?.language).toBe('ja');
    });

    it('should return empty array for empty input', async () => {
      const results = await detector.detectBatch([]);
      expect(results).toHaveLength(0);
    });

    it.skipIf(!pythonAvailable)('should handle mixed confidence results', async () => {
      const texts = [
        'This is a long English text that should have high confidence for language detection.',
        'X', // Very short, may have low confidence
      ];

      const results = await detector.detectBatch(texts);

      expect(results).toHaveLength(2);
      expect(results[0]?.confidence).toBeGreaterThan(results[1]?.confidence ?? 1);
    });
  });

  describe('alternatives', () => {
    it.skipIf(!pythonAvailable)('should provide alternative language candidates', async () => {
      // Text that might have multiple possible languages
      const text = 'Neural network transformer attention mechanism deep learning';
      const result = await detector.detect(text);

      // Result should have language detected
      expect(result.language).not.toBe('unknown');
      // Alternatives array should exist (may be empty for high-confidence detections)
      expect(Array.isArray(result.alternatives)).toBe(true);
    });
  });
});
