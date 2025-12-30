/**
 * ArxivClient Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArxivClient, type ArxivPaper } from './ArxivClient.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

/**
 * Sample arXiv Atom XML response
 */
const SAMPLE_ATOM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/"
      xmlns:arxiv="http://arxiv.org/schemas/atom">
  <link href="http://arxiv.org/api/query?search_query=all:transformer&amp;start=0&amp;max_results=1" rel="self" type="application/atom+xml"/>
  <title type="html">ArXiv Query: transformer</title>
  <id>http://arxiv.org/api/query</id>
  <updated>2024-01-01T00:00:00-05:00</updated>
  <opensearch:totalResults>100</opensearch:totalResults>
  <opensearch:startIndex>0</opensearch:startIndex>
  <opensearch:itemsPerPage>1</opensearch:itemsPerPage>
  <entry>
    <id>http://arxiv.org/abs/1706.03762v7</id>
    <updated>2023-08-02T00:00:00Z</updated>
    <published>2017-06-12T00:00:00Z</published>
    <title>Attention Is All You Need</title>
    <summary>The dominant sequence transduction models are based on complex recurrent or
convolutional neural networks in an encoder-decoder configuration. The best
performing models also connect the encoder and decoder through an attention
mechanism. We propose a new simple network architecture, the Transformer,
based solely on attention mechanisms, dispensing with recurrence and convolutions
entirely.</summary>
    <author>
      <name>Ashish Vaswani</name>
    </author>
    <author>
      <name>Noam Shazeer</name>
    </author>
    <author>
      <name>Niki Parmar</name>
    </author>
    <arxiv:primary_category xmlns:arxiv="http://arxiv.org/schemas/atom" term="cs.CL" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.CL" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.LG" scheme="http://arxiv.org/schemas/atom"/>
    <link href="http://arxiv.org/abs/1706.03762v7" rel="alternate" type="text/html"/>
    <link title="pdf" href="http://arxiv.org/pdf/1706.03762v7" rel="related" type="application/pdf"/>
  </entry>
</feed>`;

const EMPTY_ATOM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">
  <opensearch:totalResults>0</opensearch:totalResults>
  <opensearch:startIndex>0</opensearch:startIndex>
  <opensearch:itemsPerPage>0</opensearch:itemsPerPage>
</feed>`;

describe('ArxivClient', () => {
  let client: ArxivClient;

  beforeEach(() => {
    client = new ArxivClient();
    vi.clearAllMocks();
  });

  describe('getPaper', () => {
    it('should fetch paper by arXiv ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => SAMPLE_ATOM_XML,
      });

      const paper = await client.getPaper('1706.03762');

      expect(paper).toBeDefined();
      expect(paper.id).toBe('1706.03762v7');
      expect(paper.title).toBe('Attention Is All You Need');
      expect(paper.authors).toContain('Ashish Vaswani');
      expect(paper.primaryCategory).toBe('cs.CL');
    });

    it('should normalize arXiv ID with prefix', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => SAMPLE_ATOM_XML,
      });

      await client.getPaper('arXiv:1706.03762');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('id_list=1706.03762')
      );
    });

    it('should throw error when paper not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => EMPTY_ATOM_XML,
      });

      await expect(client.getPaper('invalid-id')).rejects.toThrow(
        'Paper not found'
      );
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(client.getPaper('1706.03762')).rejects.toThrow(
        'Failed to fetch paper'
      );
    });
  });

  describe('search', () => {
    it('should search papers by query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => SAMPLE_ATOM_XML,
      });

      const result = await client.search('transformer');

      // XMLパーサーによってはフィールドの形式が異なる場合がある
      expect(result.papers).toHaveLength(1);
      expect(result.papers[0].title).toBe('Attention Is All You Need');
    });

    it('should apply search options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => SAMPLE_ATOM_XML,
      });

      await client.search('transformer', {
        maxResults: 50,
        start: 10,
        sortBy: 'lastUpdatedDate',
        sortOrder: 'ascending',
      });

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('max_results=50');
      expect(callUrl).toContain('start=10');
      expect(callUrl).toContain('sortBy=lastUpdatedDate');
      expect(callUrl).toContain('sortOrder=ascending');
    });
  });

  describe('searchByCategory', () => {
    it('should search papers by category', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => SAMPLE_ATOM_XML,
      });

      await client.searchByCategory('cs.CL');

      const callUrl = mockFetch.mock.calls[0][0] as string;
      // URLエンコードのチェック - "cat:cs.CL" がエンコードされる
      expect(callUrl).toContain('search_query=cat');
      expect(callUrl).toContain('cs.CL');
    });
  });

  describe('downloadPdf', () => {
    it('should download PDF as ArrayBuffer', async () => {
      const mockPdfData = new ArrayBuffer(1024);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockPdfData,
      });

      const result = await client.downloadPdf('1706.03762');

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/pdf/1706.03762.pdf')
      );
    });

    it('should handle download errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(client.downloadPdf('invalid-id')).rejects.toThrow(
        'Failed to download PDF'
      );
    });
  });

  describe('downloadPdfBuffer', () => {
    it('should download PDF as Buffer', async () => {
      const mockPdfData = new ArrayBuffer(1024);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockPdfData,
      });

      const result = await client.downloadPdfBuffer('1706.03762');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(1024);
    });
  });

  describe('getPapers', () => {
    it('should fetch multiple papers by IDs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => SAMPLE_ATOM_XML,
      });

      await client.getPapers(['1706.03762', '2301.04589']);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('id_list=1706.03762,2301.04589');
    });
  });

  describe('parseAtomFeed', () => {
    it('should correctly parse paper metadata', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => SAMPLE_ATOM_XML,
      });

      const paper = await client.getPaper('1706.03762');

      expect(paper.abstract).toContain('Transformer');
      expect(paper.categories).toContain('cs.CL');
      expect(paper.categories).toContain('cs.LG');
      expect(paper.published).toBeInstanceOf(Date);
      expect(paper.updated).toBeInstanceOf(Date);
      expect(paper.pdfUrl).toContain('1706.03762');
      expect(paper.absUrl).toContain('1706.03762');
    });
  });
});
