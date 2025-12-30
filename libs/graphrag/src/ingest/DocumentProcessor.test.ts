/**
 * DocumentProcessor Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentProcessor, type ProcessedDocument } from './DocumentProcessor.js';
import { ArxivClient, type ArxivPaper } from './ArxivClient.js';
import { UnstructuredClient, type UnstructuredElement } from './UnstructuredClient.js';

// Mock the client modules
vi.mock('./ArxivClient.js', () => ({
  ArxivClient: vi.fn(),
}));

vi.mock('./UnstructuredClient.js', () => ({
  UnstructuredClient: vi.fn(),
}));

/**
 * Sample paper data
 */
const SAMPLE_PAPER: ArxivPaper = {
  id: '1706.03762v7',
  title: 'Attention Is All You Need',
  authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar'],
  abstract: 'We propose a new simple network architecture, the Transformer.',
  primaryCategory: 'cs.CL',
  categories: ['cs.CL', 'cs.LG'],
  published: new Date('2017-06-12'),
  updated: new Date('2023-08-02'),
  pdfUrl: 'https://arxiv.org/pdf/1706.03762.pdf',
  absUrl: 'https://arxiv.org/abs/1706.03762v7',
};

/**
 * Sample extracted elements
 */
const SAMPLE_ELEMENTS: UnstructuredElement[] = [
  {
    type: 'Title',
    element_id: 'title-001',
    text: 'Attention Is All You Need',
    metadata: { page_number: 1 },
  },
  {
    type: 'NarrativeText',
    element_id: 'text-001',
    text: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks in an encoder-decoder configuration. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture.',
    metadata: { page_number: 1 },
  },
  {
    type: 'Title',
    element_id: 'title-002',
    text: 'Introduction',
    metadata: { page_number: 2 },
  },
  {
    type: 'NarrativeText',
    element_id: 'text-002',
    text: 'Recurrent neural networks, long short-term memory and gated recurrent neural networks in particular, have been firmly established as state of the art approaches in sequence modeling and transduction problems such as language modeling and machine translation.',
    metadata: { page_number: 2 },
  },
];

describe('DocumentProcessor', () => {
  let processor: DocumentProcessor;
  let mockArxivClient: {
    getPaper: ReturnType<typeof vi.fn>;
    downloadPdfBuffer: ReturnType<typeof vi.fn>;
  };
  let mockUnstructuredClient: {
    partitionPdf: ReturnType<typeof vi.fn>;
    extractText: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Create mock instances
    mockArxivClient = {
      getPaper: vi.fn(),
      downloadPdfBuffer: vi.fn(),
    };

    mockUnstructuredClient = {
      partitionPdf: vi.fn(),
      extractText: vi.fn(),
    };

    // Mock constructors to return our mock instances
    vi.mocked(ArxivClient).mockImplementation(() => mockArxivClient as unknown as ArxivClient);
    vi.mocked(UnstructuredClient).mockImplementation(() => mockUnstructuredClient as unknown as UnstructuredClient);

    processor = new DocumentProcessor({
      unstructuredOptions: { apiKey: 'test-api-key' },
    });

    vi.clearAllMocks();

    // Re-setup mocks after clearAllMocks
    vi.mocked(ArxivClient).mockImplementation(() => mockArxivClient as unknown as ArxivClient);
    vi.mocked(UnstructuredClient).mockImplementation(() => mockUnstructuredClient as unknown as UnstructuredClient);
  });

  describe('constructor', () => {
    it('should create processor with default options', () => {
      const proc = new DocumentProcessor({
        unstructuredOptions: { apiKey: 'test-key' },
      });
      expect(proc).toBeInstanceOf(DocumentProcessor);
    });

    it('should accept custom chunk options', () => {
      const proc = new DocumentProcessor({
        unstructuredOptions: { apiKey: 'test-key' },
        chunkSize: 500,
        chunkOverlap: 100,
        minChunkSize: 50,
      });
      expect(proc).toBeInstanceOf(DocumentProcessor);
    });
  });

  describe('processArxivPaper', () => {
    beforeEach(() => {
      mockArxivClient.getPaper.mockResolvedValue(SAMPLE_PAPER);
      mockArxivClient.downloadPdfBuffer.mockResolvedValue(Buffer.from('mock pdf'));
      mockUnstructuredClient.partitionPdf.mockResolvedValue({
        elements: SAMPLE_ELEMENTS,
      });
      mockUnstructuredClient.extractText.mockReturnValue(
        'Attention Is All You Need\n\nThe dominant sequence transduction models are based on complex recurrent or convolutional neural networks in an encoder-decoder configuration. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer.'
      );
    });

    it('should process arXiv paper end-to-end', async () => {
      const result = await processor.processArxivPaper('1706.03762');

      expect(result).toBeDefined();
      expect(result.paper).toEqual(SAMPLE_PAPER);
      expect(result.chunks).toBeDefined();
      expect(Array.isArray(result.chunks)).toBe(true);
    });

    it('should fetch paper metadata', async () => {
      await processor.processArxivPaper('1706.03762');

      expect(mockArxivClient.getPaper).toHaveBeenCalledWith('1706.03762');
    });

    it('should download PDF', async () => {
      await processor.processArxivPaper('1706.03762');

      expect(mockArxivClient.downloadPdfBuffer).toHaveBeenCalledWith('1706.03762');
    });

    it('should partition PDF with Unstructured', async () => {
      await processor.processArxivPaper('1706.03762');

      expect(mockUnstructuredClient.partitionPdf).toHaveBeenCalledWith(
        expect.any(Buffer),
        '1706.03762.pdf'
      );
    });

    it('should create TextChunks with metadata', async () => {
      const result = await processor.processArxivPaper('1706.03762');

      expect(result.chunks.length).toBeGreaterThan(0);
      result.chunks.forEach((chunk) => {
        expect(chunk.id).toBeDefined();
        expect(chunk.content).toBeDefined();
        expect(chunk.metadata).toBeDefined();
        expect(chunk.metadata?.arxivId).toBe('1706.03762v7');
      });
    });

    it('should include paper metadata in chunks', async () => {
      const result = await processor.processArxivPaper('1706.03762');

      const chunk = result.chunks[0];
      expect(chunk?.metadata?.title).toBe('Attention Is All You Need');
      expect(chunk?.metadata?.authors).toContain('Ashish Vaswani');
      expect(chunk?.metadata?.categories).toContain('cs.CL');
    });

    it('should handle API errors gracefully', async () => {
      mockArxivClient.getPaper.mockRejectedValue(new Error('Paper not found'));

      await expect(processor.processArxivPaper('invalid-id')).rejects.toThrow('Paper not found');
    });
  });

  describe('processArxivPapers', () => {
    beforeEach(() => {
      mockArxivClient.getPaper.mockResolvedValue(SAMPLE_PAPER);
      mockArxivClient.downloadPdfBuffer.mockResolvedValue(Buffer.from('mock pdf'));
      mockUnstructuredClient.partitionPdf.mockResolvedValue({
        elements: SAMPLE_ELEMENTS,
      });
      mockUnstructuredClient.extractText.mockReturnValue(
        'Attention Is All You Need\n\nThe Transformer model.'
      );
    });

    it('should process multiple papers', async () => {
      const results = await processor.processArxivPapers(['1706.03762', '2301.04589']);

      expect(results.successful).toHaveLength(2);
    });

    it('should continue on partial failures', async () => {
      mockArxivClient.getPaper
        .mockResolvedValueOnce(SAMPLE_PAPER)
        .mockRejectedValueOnce(new Error('Paper not found'));

      const results = await processor.processArxivPapers(
        ['1706.03762', 'invalid-id'],
        { continueOnError: true }
      );

      expect(results.successful).toHaveLength(1);
      expect(results.failed).toHaveLength(1);
    });

    it('should stop on error by default', async () => {
      mockArxivClient.getPaper
        .mockResolvedValueOnce(SAMPLE_PAPER)
        .mockRejectedValueOnce(new Error('Paper not found'));
      mockUnstructuredClient.extractText.mockReturnValue('Test text');

      await expect(
        processor.processArxivPapers(['1706.03762', 'invalid-id'])
      ).rejects.toThrow('Paper not found');
    });
  });

  describe('processPdfBuffer', () => {
    const LONG_TEXT = 'Attention Is All You Need\n\nThe dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.';

    beforeEach(() => {
      mockUnstructuredClient.partitionPdf.mockResolvedValue({
        elements: SAMPLE_ELEMENTS,
      });
      mockUnstructuredClient.extractText.mockReturnValue(LONG_TEXT);
    });

    it('should process PDF buffer directly', async () => {
      const pdfBuffer = Buffer.from('mock pdf content');
      const result = await processor.processPdfBuffer(pdfBuffer, 'test-doc.pdf', {
        documentId: 'test-doc',
        title: 'Test Document',
      });

      expect(result.chunks).toBeDefined();
      expect(result.chunks.length).toBeGreaterThan(0);
    });

    it('should use provided metadata', async () => {
      const pdfBuffer = Buffer.from('mock pdf content');
      const result = await processor.processPdfBuffer(pdfBuffer, 'test-doc.pdf', {
        documentId: 'test-doc',
        title: 'Test Document',
        authors: ['Author One'],
        source: 'manual-upload',
      });

      const chunk = result.chunks[0];
      expect(chunk?.metadata?.documentId).toBe('test-doc');
      expect(chunk?.metadata?.title).toBe('Test Document');
      expect(chunk?.metadata?.source).toBe('manual-upload');
    });
  });

  describe('text chunking', () => {
    const LONG_TEXT = 'Attention Is All You Need\n\nThe dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.';

    beforeEach(() => {
      mockArxivClient.getPaper.mockResolvedValue(SAMPLE_PAPER);
      mockArxivClient.downloadPdfBuffer.mockResolvedValue(Buffer.from('mock pdf'));
      mockUnstructuredClient.partitionPdf.mockResolvedValue({
        elements: SAMPLE_ELEMENTS,
      });
      mockUnstructuredClient.extractText.mockReturnValue(LONG_TEXT);
    });

    it('should respect chunk size limits', async () => {
      const result = await processor.processArxivPaper('1706.03762');

      result.chunks.forEach((chunk) => {
        // Chunks should not exceed the default chunk size significantly
        expect(chunk.content.length).toBeLessThanOrEqual(2000);
      });
    });

    it('should generate unique chunk IDs', async () => {
      const result = await processor.processArxivPaper('1706.03762');

      const ids = result.chunks.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should preserve text content', async () => {
      const result = await processor.processArxivPaper('1706.03762');

      const allText = result.chunks.map((c) => c.content).join(' ');
      expect(allText).toContain('Attention Is All You Need');
      expect(allText).toContain('Transformer');
    });
  });

  describe('element filtering', () => {
    it('should filter out unwanted element types', async () => {
      const elementsWithHeader: UnstructuredElement[] = [
        ...SAMPLE_ELEMENTS,
        {
          type: 'Header',
          element_id: 'header-001',
          text: 'arXiv:1706.03762v7 [cs.CL] 2 Aug 2023',
          metadata: { page_number: 1 },
        },
        {
          type: 'Footer',
          element_id: 'footer-001',
          text: 'Page 1 of 15',
          metadata: { page_number: 1 },
        },
      ];

      mockArxivClient.getPaper.mockResolvedValue(SAMPLE_PAPER);
      mockArxivClient.downloadPdfBuffer.mockResolvedValue(Buffer.from('mock pdf'));
      mockUnstructuredClient.partitionPdf.mockResolvedValue({
        elements: elementsWithHeader,
      });
      // extractText should filter headers/footers
      mockUnstructuredClient.extractText.mockReturnValue(
        'Attention Is All You Need\n\nThe Transformer model.'
      );

      const result = await processor.processArxivPaper('1706.03762');

      // Headers and footers should be filtered out
      const allText = result.chunks.map((c) => c.text).join(' ');
      expect(allText).not.toContain('Page 1 of 15');
    });
  });
});
