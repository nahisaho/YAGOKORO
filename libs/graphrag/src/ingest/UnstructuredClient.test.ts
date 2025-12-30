/**
 * UnstructuredClient Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  UnstructuredClient,
  type UnstructuredElement,
} from './UnstructuredClient.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

/**
 * Sample Unstructured API response
 */
const SAMPLE_ELEMENTS: UnstructuredElement[] = [
  {
    type: 'Title',
    element_id: 'title-001',
    text: 'Attention Is All You Need',
    metadata: {
      page_number: 1,
      coordinates: { x: 100, y: 50, width: 400, height: 30 },
    },
  },
  {
    type: 'NarrativeText',
    element_id: 'text-001',
    text: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks.',
    metadata: {
      page_number: 1,
    },
  },
  {
    type: 'NarrativeText',
    element_id: 'text-002',
    text: 'We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.',
    metadata: {
      page_number: 1,
    },
  },
  {
    type: 'Title',
    element_id: 'title-002',
    text: 'Introduction',
    metadata: {
      page_number: 2,
    },
  },
  {
    type: 'NarrativeText',
    element_id: 'text-003',
    text: 'Recurrent neural networks have been established as state of the art approaches in sequence modeling.',
    metadata: {
      page_number: 2,
    },
  },
  {
    type: 'Table',
    element_id: 'table-001',
    text: 'Model | BLEU | Training Cost\nTransformer | 28.4 | 3.5 days',
    metadata: {
      page_number: 5,
      text_as_html:
        '<table><tr><td>Model</td><td>BLEU</td></tr><tr><td>Transformer</td><td>28.4</td></tr></table>',
    },
  },
  {
    type: 'FigureCaption',
    element_id: 'figure-001',
    text: 'Figure 1: The Transformer model architecture.',
    metadata: {
      page_number: 3,
    },
  },
  {
    type: 'ListItem',
    element_id: 'list-001',
    text: '• Self-attention mechanism',
    metadata: {
      page_number: 4,
    },
  },
];

describe('UnstructuredClient', () => {
  let client: UnstructuredClient;

  beforeEach(() => {
    client = new UnstructuredClient({
      apiKey: 'test-api-key',
    });
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with API key', () => {
      const client = new UnstructuredClient({ apiKey: 'test-key' });
      expect(client).toBeInstanceOf(UnstructuredClient);
    });

    it('should use custom API URL', () => {
      const client = new UnstructuredClient({
        apiKey: 'test-key',
        apiUrl: 'https://custom.api.url',
      });
      expect(client).toBeInstanceOf(UnstructuredClient);
    });

    it('should throw without API key', () => {
      expect(() => new UnstructuredClient({ apiKey: '' })).toThrow(
        'API key is required'
      );
    });
  });

  describe('partitionPdf', () => {
    it('should partition PDF and return elements', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => SAMPLE_ELEMENTS,
      });

      const pdfBuffer = Buffer.from('mock pdf content');
      const result = await client.partitionPdf(pdfBuffer);

      expect(result.elements).toHaveLength(8);
      expect(result.elements[0].type).toBe('Title');
      expect(result.elements[0].text).toBe('Attention Is All You Need');
    });

    it('should send correct request format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => SAMPLE_ELEMENTS,
      });

      const pdfBuffer = Buffer.from('mock pdf content');
      await client.partitionPdf(pdfBuffer, { filename: 'test.pdf' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/general/v0/general'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'unstructured-api-key': 'test-api-key',
          }),
        })
      );
    });

    it('should apply strategy option', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => SAMPLE_ELEMENTS,
      });

      const pdfBuffer = Buffer.from('mock pdf content');
      await client.partitionPdf(pdfBuffer, { strategy: 'hi_res' });

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.body).toBeInstanceOf(FormData);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error',
      });

      const pdfBuffer = Buffer.from('mock pdf content');
      await expect(client.partitionPdf(pdfBuffer)).rejects.toThrow(
        'Unstructured API error'
      );
    });
  });

  describe('partition', () => {
    it('should partition file with auto-detected type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => SAMPLE_ELEMENTS,
      });

      const buffer = Buffer.from('mock content');
      const result = await client.partition(buffer, 'document.docx');

      expect(result.elements).toBeDefined();
    });
  });

  describe('extractText', () => {
    it('should extract all text from elements', () => {
      const text = client.extractText(SAMPLE_ELEMENTS);

      expect(text).toContain('Attention Is All You Need');
      expect(text).toContain('Transformer');
      expect(text).toContain('attention mechanisms');
    });
  });

  describe('extractTextByPage', () => {
    it('should group text by page number', () => {
      const pages = client.extractTextByPage(SAMPLE_ELEMENTS);

      expect(pages.size).toBeGreaterThan(0);
      expect(pages.get(1)).toContain('Attention Is All You Need');
      expect(pages.get(2)).toContain('Introduction');
    });
  });

  describe('extractStructuredText', () => {
    it('should return structured text array', () => {
      const structured = client.extractStructuredText(SAMPLE_ELEMENTS);

      expect(Array.isArray(structured)).toBe(true);
      expect(structured.length).toBeGreaterThan(0);
      expect(structured[0].type).toBe('Title');
      expect(structured[0].text).toBe('Attention Is All You Need');
    });

    it('should include page numbers when available', () => {
      const structured = client.extractStructuredText(SAMPLE_ELEMENTS);

      expect(structured[0].page).toBe(1);
    });
  });

  describe('extractTables', () => {
    it('should extract tables from elements', () => {
      const tables = client.extractTables(SAMPLE_ELEMENTS);

      expect(tables).toHaveLength(1);
      expect(tables[0].text).toContain('Model');
      expect(tables[0].html).toContain('<table>');
    });
  });

  describe('element filtering', () => {
    it('should correctly identify element types', () => {
      const titleElements = SAMPLE_ELEMENTS.filter((e) => e.type === 'Title');
      expect(titleElements).toHaveLength(2);

      const narrativeElements = SAMPLE_ELEMENTS.filter(
        (e) => e.type === 'NarrativeText'
      );
      expect(narrativeElements).toHaveLength(3);

      const tableElements = SAMPLE_ELEMENTS.filter((e) => e.type === 'Table');
      expect(tableElements).toHaveLength(1);
    });
  });
});
