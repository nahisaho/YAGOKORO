/**
 * Unpaywall API Client
 *
 * Fetches Open Access paper metadata and PDF URLs using DOI.
 * API Documentation: https://unpaywall.org/products/api
 *
 * Rate limit: 100,000 requests/day
 */

import { logger } from '../utils/logger.js';

/**
 * OA Location information
 */
export interface OALocation {
  /** URL to the PDF */
  url_for_pdf: string | null;
  /** URL to the landing page */
  url_for_landing_page: string | null;
  /** Evidence of OA status */
  evidence: string;
  /** License information */
  license: string | null;
  /** Version of the paper */
  version: 'publishedVersion' | 'acceptedVersion' | 'submittedVersion' | null;
  /** Host type */
  host_type: 'publisher' | 'repository' | null;
  /** Repository institution */
  repository_institution: string | null;
  /** Is this the best OA location? */
  is_best: boolean;
}

/**
 * Unpaywall DOI response object
 */
export interface UnpaywallPaper {
  /** DOI of the paper */
  doi: string;
  /** Paper title */
  title: string;
  /** Journal or venue name */
  journal_name: string | null;
  /** Publication year */
  year: number | null;
  /** Publisher name */
  publisher: string | null;
  /** Is this paper Open Access? */
  is_oa: boolean;
  /** OA status type */
  oa_status: 'gold' | 'green' | 'hybrid' | 'bronze' | 'closed';
  /** Best OA location */
  best_oa_location: OALocation | null;
  /** All OA locations */
  oa_locations: OALocation[];
  /** First OA location */
  first_oa_location: OALocation | null;
  /** Author information */
  z_authors: Array<{
    given: string;
    family: string;
    sequence: string;
  }> | null;
  /** Genre (journal-article, etc.) */
  genre: string | null;
  /** Has fulltext? */
  has_repository_copy: boolean;
  /** DOI URL */
  doi_url: string;
  /** Last updated */
  updated: string;
}

/**
 * Search result from Unpaywall
 */
export interface UnpaywallSearchResult {
  response: UnpaywallPaper;
  score: number;
  snippet: string;
}

/**
 * Client options
 */
export interface UnpaywallClientOptions {
  /** Email for API authentication (required) */
  email: string;
  /** Base URL for API */
  baseUrl?: string;
  /** Request timeout in ms */
  timeout?: number;
  /** Delay between requests in ms (rate limiting) */
  requestDelay?: number;
}

/**
 * Unpaywall API Client for accessing Open Access papers
 */
export class UnpaywallClient {
  private readonly email: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly requestDelay: number;
  private lastRequestTime = 0;

  constructor(options: UnpaywallClientOptions) {
    if (!options.email) {
      throw new Error('Email is required for Unpaywall API');
    }
    this.email = options.email;
    this.baseUrl = options.baseUrl ?? 'https://api.unpaywall.org/v2';
    this.timeout = options.timeout ?? 30000;
    this.requestDelay = options.requestDelay ?? 100; // 100ms between requests
  }

  /**
   * Rate limiting: wait if needed between requests
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.requestDelay) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.requestDelay - elapsed)
      );
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Get paper information by DOI
   */
  async getByDoi(doi: string): Promise<UnpaywallPaper | null> {
    await this.rateLimit();

    const encodedDoi = encodeURIComponent(doi);
    const url = `${this.baseUrl}/${encodedDoi}?email=${encodeURIComponent(this.email)}`;

    logger.debug(`Fetching Unpaywall data for DOI: ${doi}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (response.status === 404) {
        logger.warn(`DOI not found in Unpaywall: ${doi}`);
        return null;
      }

      if (!response.ok) {
        throw new Error(`Unpaywall API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as UnpaywallPaper;
      logger.debug(`Found paper: ${data.title} (OA: ${data.is_oa})`);
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Unpaywall request timeout for DOI: ${doi}`);
      }
      throw error;
    }
  }

  /**
   * Search for papers by title/query
   */
  async search(
    query: string,
    options: { isOa?: boolean; page?: number } = {}
  ): Promise<UnpaywallSearchResult[]> {
    await this.rateLimit();

    const params = new URLSearchParams({
      query,
      email: this.email,
    });

    if (options.isOa !== undefined) {
      params.set('is_oa', String(options.isOa));
    }
    if (options.page !== undefined) {
      params.set('page', String(options.page));
    }

    const url = `${this.baseUrl}/search?${params.toString()}`;
    logger.debug(`Searching Unpaywall: ${query}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Unpaywall search error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as { results: UnpaywallSearchResult[] };
      logger.debug(`Found ${data.results?.length ?? 0} results`);
      return data.results ?? [];
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Unpaywall search timeout for query: ${query}`);
      }
      throw error;
    }
  }

  /**
   * Get the best PDF URL for a paper
   */
  getPdfUrl(paper: UnpaywallPaper): string | null {
    // Try best OA location first
    if (paper.best_oa_location?.url_for_pdf) {
      return paper.best_oa_location.url_for_pdf;
    }

    // Try all OA locations
    for (const location of paper.oa_locations) {
      if (location.url_for_pdf) {
        return location.url_for_pdf;
      }
    }

    return null;
  }

  /**
   * Download PDF for a paper
   */
  async downloadPdf(paper: UnpaywallPaper): Promise<Buffer | null> {
    const pdfUrl = this.getPdfUrl(paper);
    if (!pdfUrl) {
      logger.warn(`No PDF URL available for: ${paper.title}`);
      return null;
    }

    logger.debug(`Downloading PDF from: ${pdfUrl}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout * 2);

      const response = await fetch(pdfUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'YAGOKORO-Research-Bot/1.0 (Academic Research)',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`PDF download failed: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`PDF download timeout: ${pdfUrl}`);
      }
      throw error;
    }
  }

  /**
   * Batch fetch multiple DOIs
   */
  async getBatchByDoi(
    dois: string[],
    options: { onProgress?: (done: number, total: number) => void } = {}
  ): Promise<Map<string, UnpaywallPaper | null>> {
    const results = new Map<string, UnpaywallPaper | null>();

    for (let i = 0; i < dois.length; i++) {
      const doi = dois[i]!;
      try {
        const paper = await this.getByDoi(doi);
        results.set(doi, paper);
      } catch (error) {
        logger.error(`Failed to fetch DOI ${doi}:`, error);
        results.set(doi, null);
      }

      if (options.onProgress) {
        options.onProgress(i + 1, dois.length);
      }
    }

    return results;
  }
}
