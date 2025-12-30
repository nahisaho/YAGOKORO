/**
 * UnpaywallClient unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UnpaywallClient } from './UnpaywallClient.js';

describe('UnpaywallClient', () => {
  const mockEmail = 'test@example.com';

  describe('constructor', () => {
    it('should require email', () => {
      expect(() => new UnpaywallClient({ email: '' })).toThrow(
        'Email is required for Unpaywall API'
      );
    });

    it('should create client with email', () => {
      const client = new UnpaywallClient({ email: mockEmail });
      expect(client).toBeInstanceOf(UnpaywallClient);
    });

    it('should accept custom options', () => {
      const client = new UnpaywallClient({
        email: mockEmail,
        baseUrl: 'https://custom.api.com',
        timeout: 60000,
        requestDelay: 200,
      });
      expect(client).toBeInstanceOf(UnpaywallClient);
    });
  });

  describe('getByDoi', () => {
    let client: UnpaywallClient;

    beforeEach(() => {
      client = new UnpaywallClient({
        email: mockEmail,
        requestDelay: 0, // No delay for tests
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should fetch paper by DOI', async () => {
      const mockPaper = {
        doi: '10.1234/test',
        title: 'Test Paper',
        is_oa: true,
        oa_status: 'gold',
        best_oa_location: {
          url_for_pdf: 'https://example.com/paper.pdf',
          is_best: true,
        },
        oa_locations: [],
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPaper,
      } as Response);

      const result = await client.getByDoi('10.1234/test');

      expect(result).toEqual(mockPaper);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('10.1234%2Ftest'),
        expect.any(Object)
      );
    });

    it('should return null for 404', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await client.getByDoi('10.1234/notfound');
      expect(result).toBeNull();
    });

    it('should throw on API error', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(client.getByDoi('10.1234/error')).rejects.toThrow(
        'Unpaywall API error: 500 Internal Server Error'
      );
    });
  });

  describe('search', () => {
    let client: UnpaywallClient;

    beforeEach(() => {
      client = new UnpaywallClient({
        email: mockEmail,
        requestDelay: 0,
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should search for papers', async () => {
      const mockResults = {
        results: [
          {
            response: {
              doi: '10.1234/test',
              title: 'Test Paper',
              is_oa: true,
            },
            score: 100,
            snippet: '<b>Test</b> Paper',
          },
        ],
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      } as Response);

      const results = await client.search('test query');

      expect(results).toHaveLength(1);
      expect(results[0].response.title).toBe('Test Paper');
    });

    it('should include is_oa filter', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      } as Response);

      await client.search('test', { isOa: true, page: 2 });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('is_oa=true'),
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object)
      );
    });
  });

  describe('getPdfUrl', () => {
    let client: UnpaywallClient;

    beforeEach(() => {
      client = new UnpaywallClient({ email: mockEmail });
    });

    it('should return best_oa_location PDF URL', () => {
      const paper = {
        best_oa_location: {
          url_for_pdf: 'https://best.pdf',
          is_best: true,
        },
        oa_locations: [
          { url_for_pdf: 'https://other.pdf' },
        ],
      } as any;

      expect(client.getPdfUrl(paper)).toBe('https://best.pdf');
    });

    it('should fallback to oa_locations', () => {
      const paper = {
        best_oa_location: {
          url_for_pdf: null,
        },
        oa_locations: [
          { url_for_pdf: null },
          { url_for_pdf: 'https://fallback.pdf' },
        ],
      } as any;

      expect(client.getPdfUrl(paper)).toBe('https://fallback.pdf');
    });

    it('should return null when no PDF available', () => {
      const paper = {
        best_oa_location: null,
        oa_locations: [],
      } as any;

      expect(client.getPdfUrl(paper)).toBeNull();
    });
  });

  describe('getBatchByDoi', () => {
    let client: UnpaywallClient;

    beforeEach(() => {
      client = new UnpaywallClient({
        email: mockEmail,
        requestDelay: 0,
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should fetch multiple DOIs', async () => {
      vi.spyOn(global, 'fetch')
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ doi: '10.1/a', title: 'Paper A' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        } as Response);

      const results = await client.getBatchByDoi(['10.1/a', '10.1/b']);

      expect(results.size).toBe(2);
      expect(results.get('10.1/a')?.title).toBe('Paper A');
      expect(results.get('10.1/b')).toBeNull();
    });

    it('should call onProgress callback', async () => {
      vi.spyOn(global, 'fetch')
        .mockResolvedValueOnce({ ok: false, status: 404 } as Response)
        .mockResolvedValueOnce({ ok: false, status: 404 } as Response);

      const progressCalls: Array<[number, number]> = [];

      await client.getBatchByDoi(['10.1/a', '10.1/b'], {
        onProgress: (done, total) => progressCalls.push([done, total]),
      });

      expect(progressCalls).toEqual([[1, 2], [2, 2]]);
    });
  });
});
