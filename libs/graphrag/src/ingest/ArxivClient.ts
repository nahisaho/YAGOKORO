/**
 * ArxivClient - arXiv API Client
 *
 * Fetches paper metadata and downloads PDFs from arXiv.org
 *
 * @see https://arxiv.org/help/api/
 */

import { XMLParser } from 'fast-xml-parser';

/**
 * arXiv paper metadata
 */
export interface ArxivPaper {
  /** arXiv ID (e.g., "2301.04589" or "1706.03762") */
  id: string;
  /** Paper title */
  title: string;
  /** Paper abstract/summary */
  abstract: string;
  /** Author list */
  authors: string[];
  /** Publication date */
  published: Date;
  /** Last updated date */
  updated: Date;
  /** Primary category (e.g., "cs.CL", "cs.AI") */
  primaryCategory: string;
  /** All categories */
  categories: string[];
  /** DOI if available */
  doi?: string;
  /** Journal reference if available */
  journalRef?: string;
  /** PDF URL */
  pdfUrl: string;
  /** Abstract page URL */
  absUrl: string;
}

/**
 * arXiv search options
 */
export interface ArxivSearchOptions {
  /** Maximum results to return */
  maxResults?: number;
  /** Start index for pagination */
  start?: number;
  /** Sort by: relevance, lastUpdatedDate, submittedDate */
  sortBy?: 'relevance' | 'lastUpdatedDate' | 'submittedDate';
  /** Sort order */
  sortOrder?: 'ascending' | 'descending';
}

/**
 * arXiv search result
 */
export interface ArxivSearchResult {
  /** Total results available */
  totalResults: number;
  /** Start index */
  startIndex: number;
  /** Items per page */
  itemsPerPage: number;
  /** Papers in this result */
  papers: ArxivPaper[];
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<ArxivSearchOptions> = {
  maxResults: 10,
  start: 0,
  sortBy: 'relevance',
  sortOrder: 'descending',
};

/**
 * ArxivClient
 *
 * Client for interacting with the arXiv API.
 *
 * @example
 * ```typescript
 * const client = new ArxivClient();
 *
 * // Get paper by ID
 * const paper = await client.getPaper('1706.03762');
 * console.log(paper.title); // "Attention Is All You Need"
 *
 * // Search papers
 * const results = await client.search('transformer attention mechanism');
 *
 * // Download PDF
 * const pdfBuffer = await client.downloadPdf('1706.03762');
 * ```
 */
export class ArxivClient {
  private readonly baseUrl = 'https://export.arxiv.org/api/query';
  private readonly pdfBaseUrl = 'https://arxiv.org/pdf';
  private readonly absBaseUrl = 'https://arxiv.org/abs';
  private readonly parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
    });
  }

  /**
   * Get a single paper by arXiv ID
   *
   * @param arxivId - arXiv paper ID (e.g., "1706.03762" or "cs.CL/0001234")
   * @returns Paper metadata
   * @throws Error if paper not found
   */
  async getPaper(arxivId: string): Promise<ArxivPaper> {
    const normalizedId = this.normalizeId(arxivId);
    const url = `${this.baseUrl}?id_list=${normalizedId}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch paper ${arxivId}: ${response.statusText}`);
    }

    const xml = await response.text();
    const result = this.parseAtomFeed(xml);

    if (result.papers.length === 0) {
      throw new Error(`Paper not found: ${arxivId}`);
    }

    // papers[0] is guaranteed to exist after the length check above
    return result.papers[0]!;
  }

  /**
   * Search papers by query
   *
   * @param query - Search query (supports arXiv search syntax)
   * @param options - Search options
   * @returns Search results
   *
   * @example
   * ```typescript
   * // Search by title
   * await client.search('ti:transformer');
   *
   * // Search by author
   * await client.search('au:Vaswani');
   *
   * // Search by abstract
   * await client.search('abs:attention mechanism');
   *
   * // Combined search
   * await client.search('ti:GPT AND cat:cs.CL');
   * ```
   */
  async search(
    query: string,
    options?: ArxivSearchOptions
  ): Promise<ArxivSearchResult> {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    const encodedQuery = encodeURIComponent(query);

    const url = new URL(this.baseUrl);
    url.searchParams.set('search_query', encodedQuery);
    url.searchParams.set('start', mergedOptions.start.toString());
    url.searchParams.set('max_results', mergedOptions.maxResults.toString());
    url.searchParams.set('sortBy', mergedOptions.sortBy);
    url.searchParams.set('sortOrder', mergedOptions.sortOrder);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const xml = await response.text();
    return this.parseAtomFeed(xml);
  }

  /**
   * Search papers by category
   *
   * @param category - arXiv category (e.g., "cs.CL", "cs.AI", "cs.LG")
   * @param options - Search options
   */
  async searchByCategory(
    category: string,
    options?: ArxivSearchOptions
  ): Promise<ArxivSearchResult> {
    return this.search(`cat:${category}`, options);
  }

  /**
   * Download PDF for a paper
   *
   * @param arxivId - arXiv paper ID
   * @returns PDF as ArrayBuffer
   */
  async downloadPdf(arxivId: string): Promise<ArrayBuffer> {
    const normalizedId = this.normalizeId(arxivId);
    const url = `${this.pdfBaseUrl}/${normalizedId}.pdf`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download PDF for ${arxivId}: ${response.statusText}`);
    }

    return response.arrayBuffer();
  }

  /**
   * Download PDF and return as Buffer (for Node.js file operations)
   *
   * @param arxivId - arXiv paper ID
   * @returns PDF as Buffer
   */
  async downloadPdfBuffer(arxivId: string): Promise<Buffer> {
    const arrayBuffer = await this.downloadPdf(arxivId);
    return Buffer.from(arrayBuffer);
  }

  /**
   * Get multiple papers by ID list
   *
   * @param arxivIds - List of arXiv IDs
   * @returns Papers metadata
   */
  async getPapers(arxivIds: string[]): Promise<ArxivPaper[]> {
    const normalizedIds = arxivIds.map((id) => this.normalizeId(id));
    const url = `${this.baseUrl}?id_list=${normalizedIds.join(',')}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch papers: ${response.statusText}`);
    }

    const xml = await response.text();
    const result = this.parseAtomFeed(xml);
    return result.papers;
  }

  /**
   * Normalize arXiv ID to standard format
   */
  private normalizeId(arxivId: string): string {
    // Remove version suffix if present (e.g., "1706.03762v7" -> "1706.03762")
    // Keep it for specific version requests
    return arxivId.replace(/^arXiv:/i, '').trim();
  }

  /**
   * Parse Atom XML feed from arXiv API
   */
  private parseAtomFeed(xml: string): ArxivSearchResult {
    const parsed = this.parser.parse(xml);
    const feed = parsed.feed;

    // Extract metadata
    const totalResults = parseInt(feed['opensearch:totalResults']?.['#text'] ?? '0', 10);
    const startIndex = parseInt(feed['opensearch:startIndex']?.['#text'] ?? '0', 10);
    const itemsPerPage = parseInt(feed['opensearch:itemsPerPage']?.['#text'] ?? '0', 10);

    // Extract entries
    const entries = feed.entry ? (Array.isArray(feed.entry) ? feed.entry : [feed.entry]) : [];

    const papers: ArxivPaper[] = entries.map((entry: Record<string, unknown>) =>
      this.parseEntry(entry)
    );

    return {
      totalResults,
      startIndex,
      itemsPerPage,
      papers,
    };
  }

  /**
   * Parse a single entry from the Atom feed
   */
  private parseEntry(entry: Record<string, unknown>): ArxivPaper {
    // Extract arXiv ID from the id URL
    const idUrl = entry.id as string;
    const idMatch = idUrl.match(/arxiv\.org\/abs\/(.+)$/);
    const id = idMatch ? idMatch[1] : idUrl;

    // Extract authors
    const authorField = entry.author;
    const authors: string[] = [];
    if (authorField) {
      const authorList = Array.isArray(authorField) ? authorField : [authorField];
      for (const author of authorList) {
        if (typeof author === 'object' && author !== null && 'name' in author) {
          authors.push((author as { name: string }).name);
        }
      }
    }

    // Extract categories
    const categoryField = entry.category;
    const categories: string[] = [];
    let primaryCategory = '';
    if (categoryField) {
      const categoryList = Array.isArray(categoryField) ? categoryField : [categoryField];
      for (const cat of categoryList) {
        if (typeof cat === 'object' && cat !== null && '@_term' in cat) {
          const term = (cat as { '@_term': string })['@_term'];
          categories.push(term);
          if (!primaryCategory) {
            primaryCategory = term;
          }
        }
      }
    }

    // Extract primary category from arxiv namespace
    const primaryCatField = entry['arxiv:primary_category'];
    if (
      primaryCatField &&
      typeof primaryCatField === 'object' &&
      '@_term' in primaryCatField
    ) {
      primaryCategory = (primaryCatField as { '@_term': string })['@_term'];
    }

    // Extract links
    const linkField = entry.link;
    let pdfUrl = `${this.pdfBaseUrl}/${id}.pdf`;
    let absUrl = `${this.absBaseUrl}/${id}`;
    if (linkField) {
      const linkList = Array.isArray(linkField) ? linkField : [linkField];
      for (const link of linkList) {
        if (typeof link === 'object' && link !== null) {
          const linkObj = link as { '@_href'?: string; '@_title'?: string; '@_type'?: string };
          if (linkObj['@_title'] === 'pdf') {
            pdfUrl = linkObj['@_href'] ?? pdfUrl;
          } else if (linkObj['@_type'] === 'text/html') {
            absUrl = linkObj['@_href'] ?? absUrl;
          }
        }
      }
    }

    // Extract optional fields
    const doi = entry['arxiv:doi']
      ? typeof entry['arxiv:doi'] === 'object'
        ? (entry['arxiv:doi'] as { '#text': string })['#text']
        : (entry['arxiv:doi'] as string)
      : undefined;

    const journalRef = entry['arxiv:journal_ref']
      ? typeof entry['arxiv:journal_ref'] === 'object'
        ? (entry['arxiv:journal_ref'] as { '#text': string })['#text']
        : (entry['arxiv:journal_ref'] as string)
      : undefined;

    // Build the paper object, only including optional fields if they have values
    const paper: ArxivPaper = {
      id: id ?? '',
      title: this.cleanText(entry.title as string),
      abstract: this.cleanText(entry.summary as string),
      authors,
      published: new Date(entry.published as string),
      updated: new Date(entry.updated as string),
      primaryCategory,
      categories,
      pdfUrl,
      absUrl,
    };

    // Only add optional fields if they have values (exactOptionalPropertyTypes compliance)
    if (doi !== undefined) {
      paper.doi = doi;
    }
    if (journalRef !== undefined) {
      paper.journalRef = journalRef;
    }

    return paper;
  }

  /**
   * Clean text by removing extra whitespace
   */
  private cleanText(text: string): string {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim();
  }
}
