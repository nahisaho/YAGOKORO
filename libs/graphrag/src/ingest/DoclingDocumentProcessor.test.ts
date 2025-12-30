/**
 * DoclingDocumentProcessor Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DoclingDocumentProcessor, createDoclingProcessor } from './DoclingDocumentProcessor.js';
import type { DoclingExtractionResult } from './DoclingExtractor.js';
import type { ArxivPaper } from './ArxivClient.js';

// モック: DoclingExtractor
vi.mock('./DoclingExtractor.js', () => {
  return {
    DoclingExtractor: vi.fn().mockImplementation(() => ({
      extractFromBuffer: vi.fn(),
      extractFromUrl: vi.fn(),
    })),
  };
});

// モック: ArxivClient
vi.mock('./ArxivClient.js', () => {
  return {
    ArxivClient: vi.fn().mockImplementation(() => ({
      getPaper: vi.fn(),
      downloadPdfBuffer: vi.fn(),
    })),
  };
});

import { DoclingExtractor } from './DoclingExtractor.js';
import { ArxivClient } from './ArxivClient.js';

describe('DoclingDocumentProcessor', () => {
  let mockArxivClient: {
    getPaper: ReturnType<typeof vi.fn>;
    downloadPdfBuffer: ReturnType<typeof vi.fn>;
  };
  let mockDoclingExtractor: {
    extractFromBuffer: ReturnType<typeof vi.fn>;
    extractFromUrl: ReturnType<typeof vi.fn>;
  };

  const mockPaper: ArxivPaper = {
    id: '1706.03762',
    title: 'Attention Is All You Need',
    authors: ['Vaswani, A.', 'Shazeer, N.'],
    summary: 'The Transformer architecture...',
    published: '2017-06-12T00:00:00Z',
    updated: '2017-06-12T00:00:00Z',
    pdfUrl: 'https://arxiv.org/pdf/1706.03762',
    categories: ['cs.CL', 'cs.LG'],
  };

  const mockExtractionResult: DoclingExtractionResult = {
    text: `# Attention Is All You Need

## Abstract

The dominant sequence transduction models...

## 1 Introduction

Recurrent neural networks...

## 2 Background

The goal of reducing sequential computation...`,
    metadata: {
      title: 'Attention Is All You Need',
      num_pages: 15,
      source: '/tmp/test.pdf',
    },
    pages: [],
    tables: [
      { index: 0, markdown: '| Model | BLEU |\n|---|---|\n| Transformer | 28.4 |' },
    ],
    stats: {
      total_characters: 1500,
      total_words: 250,
      num_tables: 1,
    },
    extracted_at: '2025-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // ArxivClient モック設定
    mockArxivClient = {
      getPaper: vi.fn().mockResolvedValue(mockPaper),
      downloadPdfBuffer: vi.fn().mockResolvedValue(Buffer.from('PDF content')),
    };
    (ArxivClient as ReturnType<typeof vi.fn>).mockImplementation(() => mockArxivClient);

    // DoclingExtractor モック設定
    mockDoclingExtractor = {
      extractFromBuffer: vi.fn().mockResolvedValue(mockExtractionResult),
      extractFromUrl: vi.fn().mockResolvedValue(mockExtractionResult),
    };
    (DoclingExtractor as ReturnType<typeof vi.fn>).mockImplementation(
      () => mockDoclingExtractor
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const processor = new DoclingDocumentProcessor();
      expect(processor).toBeInstanceOf(DoclingDocumentProcessor);
    });

    it('should accept custom options', () => {
      const processor = new DoclingDocumentProcessor({
        chunkSize: 500,
        chunkOverlap: 100,
        minChunkSize: 50,
        includeMetadata: false,
      });
      expect(processor).toBeInstanceOf(DoclingDocumentProcessor);
    });
  });

  describe('processArxivPaper', () => {
    it('should process arXiv paper successfully', async () => {
      const processor = new DoclingDocumentProcessor();
      const result = await processor.processArxivPaper('1706.03762');

      expect(result.paper).toEqual(mockPaper);
      expect(result.chunks.length).toBeGreaterThan(0);
      expect(result.fullText).toBe(mockExtractionResult.text);
      expect(result.tables).toEqual(mockExtractionResult.tables);
      expect(result.stats.pages).toBe(15);
      expect(result.stats.numTables).toBe(1);
    });

    it('should call ArxivClient and DoclingExtractor', async () => {
      const processor = new DoclingDocumentProcessor();
      await processor.processArxivPaper('1706.03762');

      expect(mockArxivClient.getPaper).toHaveBeenCalledWith('1706.03762');
      expect(mockArxivClient.downloadPdfBuffer).toHaveBeenCalledWith('1706.03762');
      expect(mockDoclingExtractor.extractFromBuffer).toHaveBeenCalled();
    });

    it('should create chunks with metadata', async () => {
      const processor = new DoclingDocumentProcessor({ includeMetadata: true });
      const result = await processor.processArxivPaper('1706.03762');

      expect(result.chunks[0]?.metadata).toHaveProperty('source', 'arxiv:1706.03762');
      expect(result.chunks[0]?.metadata).toHaveProperty('title', mockPaper.title);
      expect(result.chunks[0]?.metadata).toHaveProperty('authors', mockPaper.authors);
    });

    it('should handle custom chunk size', async () => {
      const processor = new DoclingDocumentProcessor({ chunkSize: 200 });
      const result = await processor.processArxivPaper('1706.03762');

      // Smaller chunk size should create more chunks
      expect(result.chunks.length).toBeGreaterThan(0);
    });
  });

  describe('processArxivPaperByUrl', () => {
    it('should process paper from URL', async () => {
      const processor = new DoclingDocumentProcessor();
      const result = await processor.processArxivPaperByUrl(
        'https://arxiv.org/pdf/1706.03762.pdf',
        mockPaper
      );

      expect(result.paper).toEqual(mockPaper);
      expect(mockDoclingExtractor.extractFromUrl).toHaveBeenCalledWith(
        'https://arxiv.org/pdf/1706.03762.pdf'
      );
    });
  });

  describe('processArxivPapers', () => {
    it('should process multiple papers', async () => {
      const processor = new DoclingDocumentProcessor();
      const result = await processor.processArxivPapers(['1706.03762', '1810.04805']);

      expect(result.successful.length).toBe(2);
      expect(result.failed.length).toBe(0);
    });

    it('should handle errors with continueOnError', async () => {
      mockArxivClient.getPaper
        .mockResolvedValueOnce(mockPaper)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockPaper);

      const processor = new DoclingDocumentProcessor();
      const result = await processor.processArxivPapers(
        ['1706.03762', 'invalid', '1810.04805'],
        { continueOnError: true }
      );

      expect(result.successful.length).toBe(2);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0]?.error).toContain('Network error');
    });

    it('should call progress callback', async () => {
      const onProgress = vi.fn();
      const processor = new DoclingDocumentProcessor();

      await processor.processArxivPapers(['1706.03762', '1810.04805'], { onProgress });

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenCalledWith(0, 2, '1706.03762');
      expect(onProgress).toHaveBeenCalledWith(1, 2, '1810.04805');
    });
  });

  describe('processPdfBuffer', () => {
    it('should process PDF buffer without arXiv metadata', async () => {
      const processor = new DoclingDocumentProcessor();
      const buffer = Buffer.from('PDF content');
      const result = await processor.processPdfBuffer(buffer, {
        title: 'Test PDF',
        authors: ['Test Author'],
      });

      expect(result.chunks.length).toBeGreaterThan(0);
      expect(result.fullText).toBe(mockExtractionResult.text);
    });

    it('should handle buffer without metadata', async () => {
      const processor = new DoclingDocumentProcessor();
      const buffer = Buffer.from('PDF content');
      const result = await processor.processPdfBuffer(buffer);

      expect(result.chunks[0]?.metadata).toHaveProperty('title', 'Untitled');
    });
  });

  describe('createDoclingProcessor', () => {
    it('should create processor with factory function', () => {
      const processor = createDoclingProcessor({ chunkSize: 500 });
      expect(processor).toBeInstanceOf(DoclingDocumentProcessor);
    });
  });

  describe('chunk splitting', () => {
    it('should split by Markdown headers', async () => {
      const processor = new DoclingDocumentProcessor({ chunkSize: 100 });
      const result = await processor.processArxivPaper('1706.03762');

      // 複数セクションがある場合、各チャンクにセクション情報があるはず
      const chunksWithSections = result.chunks.filter(
        (c) => c.metadata && 'section' in c.metadata
      );
      expect(chunksWithSections.length).toBeGreaterThan(0);
    });

    it('should maintain chunk IDs', async () => {
      const processor = new DoclingDocumentProcessor();
      const result = await processor.processArxivPaper('1706.03762');

      // チャンクIDがユニーク
      const ids = result.chunks.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);

      // ID形式チェック
      expect(result.chunks[0]?.id).toMatch(/^1706\.03762-chunk-\d+$/);
    });
  });
});
