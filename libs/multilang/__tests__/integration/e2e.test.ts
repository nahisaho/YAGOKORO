import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MultilingualService } from '../../src/services/MultilingualService.js';
import { execSync } from 'node:child_process';

// Check if Python and langdetect are available
let pythonAvailable = false;
try {
  execSync('python3 -c "import langdetect"', { stdio: 'ignore' });
  pythonAvailable = true;
} catch {
  pythonAvailable = false;
}

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('MultilingualService E2E Integration', () => {
  let service: MultilingualService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MultilingualService({
      cacheType: 'memory',
      deeplApiKey: 'test-deepl-key',
      googleApiKey: 'test-google-key',
      confidenceThreshold: 0.8,
      linkingThreshold: 0.8,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Paper Ingestion Pipeline (REQ-008-01)', () => {
    it('should process English paper without translation', async () => {
      const paper = {
        id: 'paper-001',
        title: 'Attention Is All You Need',
        abstract: 'We propose a new simple network architecture, the Transformer.',
        language: 'en' as const,
      };

      const metadata = await service.ingestPaper(paper);

      expect(metadata.paperId).toBe('paper-001');
      expect(metadata.originalLanguage).toBe('en');
      // English papers should not have translation for title/abstract
      expect(metadata.translatedTitle).toBeFalsy();
    });

    it('should process Chinese paper with translation (REQ-008-01)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          translations: [{ text: 'Translated Title' }],
        }),
      });

      const paper = {
        id: 'paper-002',
        title: '基于Transformer的机器翻译研究',
        abstract: '本文研究了Transformer模型在机器翻译中的应用。',
        language: 'zh' as const,
      };

      const metadata = await service.ingestPaper(paper);

      expect(metadata.paperId).toBe('paper-002');
      expect(metadata.originalLanguage).toBe('zh');
    });

    it('should process Japanese paper with translation (REQ-008-01)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          translations: [{ text: 'Translated Title' }],
        }),
      });

      const paper = {
        id: 'paper-003',
        title: '深層学習を用いた自然言語処理',
        abstract: '本研究では、深層学習技術を用いた自然言語処理の手法を提案する。',
        language: 'ja' as const,
      };

      const metadata = await service.ingestPaper(paper);

      expect(metadata.paperId).toBe('paper-003');
      expect(metadata.originalLanguage).toBe('ja');
    });

    it('should process Korean paper with translation (REQ-008-01)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          translations: [{ text: 'Translated Title' }],
        }),
      });

      const paper = {
        id: 'paper-004',
        title: '딥러닝 기반 언어 모델 연구',
        abstract: '본 연구에서는 딥러닝을 활용한 대규모 언어 모델을 제안합니다.',
        language: 'ko' as const,
      };

      const metadata = await service.ingestPaper(paper);

      expect(metadata.paperId).toBe('paper-004');
      expect(metadata.originalLanguage).toBe('ko');
    });
  });

  describe('Language Detection Flow (REQ-008-02)', () => {
    it.skipIf(!pythonAvailable)('should detect English text', async () => {
      const result = await service.detectLanguage('This is an English sentence about machine learning.');

      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it.skipIf(!pythonAvailable)('should detect Chinese text', async () => {
      const result = await service.detectLanguage('这是一篇关于机器学习的中文文章。');

      expect(result.language).toBe('zh');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Translation Flow (REQ-008-03)', () => {
    it('should translate text using DeepL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          translations: [{ text: 'Hello World' }],
        }),
      });

      const result = await service.translate('你好世界', {
        sourceLanguage: 'zh',
        targetLanguage: 'en',
      });

      expect(result.original).toBe('你好世界');
      expect(result.translated).toBe('Hello World');
      expect(result.sourceLanguage).toBe('zh');
    });

    it('should use cache for repeated translations', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          translations: [{ text: 'Hello World' }],
        }),
      });

      // First call
      await service.translate('你好世界', {
        sourceLanguage: 'zh',
        targetLanguage: 'en',
      });

      // Second call - should use cache
      const result = await service.translate('你好世界', {
        sourceLanguage: 'zh',
        targetLanguage: 'en',
      });

      expect(result.cached).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Entity Extraction Flow (REQ-008-06)', () => {
    it('should extract entities from text', async () => {
      // NER may fail without Python, but should not throw
      const result = await service.extractEntities(
        'Geoffrey Hinton developed deep learning at Google.',
        'en'
      );

      expect(result.language).toBe('en');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Term Normalization', () => {
    it('should normalize technical terms (returns canonical form)', () => {
      // TermNormalizer returns canonical form with original casing
      const normalized = service.normalizeTerm('llm', 'en');
      expect(normalized).toBe('Large Language Model');
    });

    it('should normalize multiple abbreviations', () => {
      expect(service.normalizeTerm('nlp', 'en')).toBe('Natural Language Processing');
      expect(service.normalizeTerm('ml', 'en')).toBe('Machine Learning');
      expect(service.normalizeTerm('dl', 'en')).toBe('Deep Learning');
    });
  });

  describe('Service Statistics', () => {
    it('should track and report statistics', async () => {
      const stats = await service.getStats();

      expect(stats).toHaveProperty('totalPapers');
      expect(stats).toHaveProperty('papersByLanguage');
      expect(stats).toHaveProperty('totalTranslations');
      expect(stats).toHaveProperty('cacheHitRate');
      expect(stats).toHaveProperty('totalEntities');
    });
  });

  describe('Cross-lingual Search (REQ-008-05)', () => {
    it('should handle cross-lingual entity linking', async () => {
      const existingEntities = new Map<string, string>([
        ['transformer', 'entity-transformer'],
        ['attention mechanism', 'entity-attention'],
      ]);

      const paper = {
        id: 'paper-search-001',
        title: 'Transformer Research',
        abstract: 'A study on transformer architectures.',
        language: 'en' as const,
      };

      const metadata = await service.ingestPaper(paper, existingEntities);

      expect(metadata.paperId).toBe('paper-search-001');
      // Cross links should be generated if entities match
      expect(metadata.crossLinks).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle translation API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      await expect(
        service.translate('Test', {
          sourceLanguage: 'zh',
          targetLanguage: 'en',
        })
      ).rejects.toThrow();
    });

    it('should handle empty text gracefully', async () => {
      const result = await service.extractEntities('', 'en');
      expect(result.entities).toHaveLength(0);
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple papers in batch', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          translations: [{ text: 'Translated' }],
        }),
      });

      const papers = [
        { id: 'batch-001', title: 'English Paper', abstract: 'English abstract', language: 'en' as const },
        { id: 'batch-002', title: '中文论文', abstract: '中文摘要', language: 'zh' as const },
      ];

      const results = await Promise.all(
        papers.map(paper => service.ingestPaper(paper))
      );

      expect(results).toHaveLength(2);
      expect(results[0]?.paperId).toBe('batch-001');
      expect(results[1]?.paperId).toBe('batch-002');
    });
  });
});

describe('Complete Paper Processing Flow', () => {
  let service: MultilingualService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        translations: [{ text: 'Translated text' }],
      }),
    });

    service = new MultilingualService({
      cacheType: 'memory',
      deeplApiKey: 'test-deepl-key',
    });
  });

  it('should process a complete multilingual paper workflow', async () => {
    // Step 1: Ingest a paper
    const paper = {
      id: 'workflow-001',
      title: 'Test Paper on Machine Learning',
      abstract: 'This paper discusses ML techniques.',
      language: 'en' as const,
    };

    const metadata = await service.ingestPaper(paper);
    expect(metadata.paperId).toBe('workflow-001');

    // Step 2: Normalize terms (returns canonical form)
    const normalized = service.normalizeTerm('ml', 'en');
    expect(normalized).toBe('Machine Learning');

    // Step 3: Statistics
    const stats = await service.getStats();
    expect(stats.totalPapers).toBe(1);
  });
});
