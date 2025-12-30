/**
 * arXiv OAI-PMH API Client
 * Implements rate limiting (3 second interval) per arXiv guidelines
 */

import axios, { type AxiosInstance } from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { z } from 'zod';
import type { Paper, Author } from '../entities/paper.js';
import { createContentHash } from '../entities/paper.js';
import { TokenBucketRateLimiter, createArxivRateLimiter } from '../rate-limit/token-bucket.js';

/**
 * arXiv API response schema
 */
const ArxivEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  published: z.string(),
  updated: z.string().optional(),
  author: z.union([
    z.object({ name: z.string() }),
    z.array(z.object({ name: z.string() })),
  ]),
  'arxiv:primary_category': z.object({
    '@_term': z.string(),
  }).optional(),
  category: z.union([
    z.object({ '@_term': z.string() }),
    z.array(z.object({ '@_term': z.string() })),
  ]).optional(),
  link: z.union([
    z.object({ '@_href': z.string(), '@_type': z.string().optional() }),
    z.array(z.object({ '@_href': z.string(), '@_type': z.string().optional() })),
  ]).optional(),
  'arxiv:doi': z.string().optional(),
});

export interface ArxivSearchOptions {
  /** Search query */
  query: string;
  /** Categories to filter (cs.AI, cs.CL, etc.) */
  categories?: string[];
  /** Maximum results to fetch */
  maxResults?: number;
  /** Start index for pagination */
  start?: number;
  /** Sort by (relevance, lastUpdatedDate, submittedDate) */
  sortBy?: 'relevance' | 'lastUpdatedDate' | 'submittedDate';
  /** Sort order */
  sortOrder?: 'ascending' | 'descending';
}

export interface ArxivClientConfig {
  /** Base URL for arXiv API */
  baseUrl?: string;
  /** Custom rate limiter */
  rateLimiter?: TokenBucketRateLimiter;
  /** Request timeout in ms */
  timeout?: number;
}

export class ArxivClient {
  private readonly client: AxiosInstance;
  private readonly rateLimiter: TokenBucketRateLimiter;
  private readonly xmlParser: XMLParser;

  constructor(config: ArxivClientConfig = {}) {
    this.client = axios.create({
      baseURL: config.baseUrl ?? 'http://export.arxiv.org/api',
      timeout: config.timeout ?? 30000,
    });

    this.rateLimiter = config.rateLimiter ?? createArxivRateLimiter();

    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
  }

  /**
   * Search for papers on arXiv
   */
  async search(options: ArxivSearchOptions): Promise<Paper[]> {
    // Build query string
    let searchQuery = options.query;
    
    if (options.categories && options.categories.length > 0) {
      const categoryQuery = options.categories
        .map(cat => `cat:${cat}`)
        .join(' OR ');
      searchQuery = `(${searchQuery}) AND (${categoryQuery})`;
    }

    const params = new URLSearchParams({
      search_query: searchQuery,
      start: String(options.start ?? 0),
      max_results: String(options.maxResults ?? 100),
    });

    if (options.sortBy) {
      params.set('sortBy', options.sortBy);
    }
    if (options.sortOrder) {
      params.set('sortOrder', options.sortOrder);
    }

    // Wait for rate limiter
    await this.rateLimiter.acquire();

    // Make request
    const response = await this.client.get(`/query?${params.toString()}`);
    
    // Parse XML response
    const parsed = this.xmlParser.parse(response.data);
    const feed = parsed.feed;
    
    if (!feed || !feed.entry) {
      return [];
    }

    // Handle single entry vs array
    const entries: unknown[] = Array.isArray(feed.entry) ? feed.entry : [feed.entry];
    
    return entries.map((entry: unknown) => this.transformEntry(entry));
  }

  /**
   * Fetch a specific paper by arXiv ID
   */
  async getById(arxivId: string): Promise<Paper | null> {
    // Clean up ID format
    const cleanId = arxivId.replace('arXiv:', '').replace('arxiv:', '');
    
    await this.rateLimiter.acquire();

    const response = await this.client.get(`/query?id_list=${cleanId}`);
    const parsed = this.xmlParser.parse(response.data);
    const feed = parsed.feed;

    if (!feed || !feed.entry) {
      return null;
    }

    const entry = Array.isArray(feed.entry) ? feed.entry[0] : feed.entry;
    return this.transformEntry(entry);
  }

  /**
   * Fetch multiple papers by IDs
   */
  async getByIds(arxivIds: string[]): Promise<Paper[]> {
    const cleanIds = arxivIds.map(id => 
      id.replace('arXiv:', '').replace('arxiv:', '')
    );
    
    await this.rateLimiter.acquire();

    const response = await this.client.get(`/query?id_list=${cleanIds.join(',')}`);
    const parsed = this.xmlParser.parse(response.data);
    const feed = parsed.feed;

    if (!feed || !feed.entry) {
      return [];
    }

    const entries: unknown[] = Array.isArray(feed.entry) ? feed.entry : [feed.entry];
    return entries.map((entry: unknown) => this.transformEntry(entry));
  }

  /**
   * Get rate limiter status
   */
  getRateLimiterStatus(): { tokens: number; waitTime: number } {
    return {
      tokens: this.rateLimiter.getTokens(),
      waitTime: this.rateLimiter.getWaitTime(),
    };
  }

  /**
   * Transform arXiv API entry to Paper entity
   */
  private transformEntry(entry: unknown): Paper {
    const validated = ArxivEntrySchema.parse(entry);
    
    // Extract arXiv ID from URL
    const idMatch = validated.id.match(/abs\/(.+?)(?:v\d+)?$/);
    const arxivId = idMatch ? idMatch[1] : validated.id;

    // Parse authors
    const authorData = Array.isArray(validated.author) 
      ? validated.author 
      : [validated.author];
    const authors: Author[] = authorData.map(a => ({
      name: a.name.trim(),
    }));

    // Parse categories
    const categories: string[] = [];
    if (validated['arxiv:primary_category']) {
      categories.push(validated['arxiv:primary_category']['@_term']);
    }
    if (validated.category) {
      const cats = Array.isArray(validated.category) 
        ? validated.category 
        : [validated.category];
      cats.forEach(c => {
        const term = c['@_term'];
        if (!categories.includes(term)) {
          categories.push(term);
        }
      });
    }

    // Find PDF link
    let url = validated.id;
    if (validated.link) {
      const links = Array.isArray(validated.link) ? validated.link : [validated.link];
      const pdfLink = links.find(l => l['@_type'] === 'application/pdf');
      if (pdfLink) {
        url = pdfLink['@_href'];
      }
    }

    const now = new Date();
    const paperData: Omit<Paper, 'contentHash'> = {
      id: arxivId,
      title: validated.title.replace(/\s+/g, ' ').trim(),
      authors,
      abstract: validated.summary.replace(/\s+/g, ' ').trim(),
      publishedDate: new Date(validated.published),
      source: 'arxiv',
      categories,
      arxivId,
      doi: validated['arxiv:doi'],
      url,
      ingestionDate: now,
      lastUpdated: now,
      processingStatus: 'ingested',
    };

    return {
      ...paperData,
      contentHash: createContentHash(paperData),
    };
  }
}
