/**
 * Semantic Scholar API Client
 * Implements rate limiting (100 requests per 5 minutes)
 * Includes Circuit Breaker for fault tolerance
 */

import axios, { type AxiosInstance, AxiosError } from 'axios';
import { z } from 'zod';
import type { Paper, Author } from '../entities/paper.js';
import { createContentHash } from '../entities/paper.js';
import { SlidingWindowRateLimiter, createSemanticScholarRateLimiter } from '../rate-limit/sliding-window.js';
import { CircuitBreaker, createSemanticScholarCircuitBreaker, CircuitOpenError } from '../rate-limit/circuit-breaker.js';

/**
 * Semantic Scholar Paper schema
 */
const SSPaperSchema = z.object({
  paperId: z.string(),
  title: z.string().nullable(),
  abstract: z.string().nullable(),
  year: z.number().nullable(),
  citationCount: z.number().nullable(),
  authors: z.array(z.object({
    authorId: z.string().nullable(),
    name: z.string().nullable(),
  })).optional(),
  externalIds: z.object({
    DOI: z.string().optional(),
    ArXiv: z.string().optional(),
  }).nullable().optional(),
  fieldsOfStudy: z.array(z.string()).nullable().optional(),
  publicationDate: z.string().nullable().optional(),
  references: z.array(z.object({
    paperId: z.string().nullable(),
  })).optional(),
  url: z.string().nullable().optional(),
});

export interface SSSearchOptions {
  /** Search query */
  query: string;
  /** Fields to retrieve */
  fields?: string[];
  /** Maximum results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

export interface SSClientConfig {
  /** Base URL */
  baseUrl?: string;
  /** API key (optional, increases rate limit) */
  apiKey?: string;
  /** Custom rate limiter */
  rateLimiter?: SlidingWindowRateLimiter;
  /** Custom circuit breaker */
  circuitBreaker?: CircuitBreaker;
  /** Request timeout in ms */
  timeout?: number;
}

export class SemanticScholarClient {
  private readonly client: AxiosInstance;
  private readonly rateLimiter: SlidingWindowRateLimiter;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly defaultFields: string[];

  constructor(config: SSClientConfig = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (config.apiKey) {
      headers['x-api-key'] = config.apiKey;
    }

    this.client = axios.create({
      baseURL: config.baseUrl ?? 'https://api.semanticscholar.org/graph/v1',
      timeout: config.timeout ?? 30000,
      headers,
    });

    this.rateLimiter = config.rateLimiter ?? createSemanticScholarRateLimiter();
    this.circuitBreaker = config.circuitBreaker ?? createSemanticScholarCircuitBreaker();
    
    this.defaultFields = [
      'paperId',
      'title',
      'abstract',
      'year',
      'citationCount',
      'authors',
      'externalIds',
      'fieldsOfStudy',
      'publicationDate',
      'references',
      'url',
    ];
  }

  /**
   * Search for papers
   */
  async search(options: SSSearchOptions): Promise<Paper[]> {
    const fields = options.fields ?? this.defaultFields;
    
    return this.circuitBreaker.execute(async () => {
      await this.rateLimiter.acquire();

      const response = await this.client.get('/paper/search', {
        params: {
          query: options.query,
          fields: fields.join(','),
          limit: options.limit ?? 100,
          offset: options.offset ?? 0,
        },
      });

      if (!response.data.data) {
        return [];
      }

      return response.data.data
        .filter((p: unknown) => p && typeof p === 'object')
        .map((paper: unknown) => this.transformPaper(paper));
    });
  }

  /**
   * Get paper by Semantic Scholar ID or external ID
   */
  async getPaper(paperId: string): Promise<Paper | null> {
    return this.circuitBreaker.execute(async () => {
      await this.rateLimiter.acquire();

      try {
        const response = await this.client.get(`/paper/${paperId}`, {
          params: {
            fields: this.defaultFields.join(','),
          },
        });

        return this.transformPaper(response.data);
      } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    });
  }

  /**
   * Get paper by DOI
   */
  async getByDoi(doi: string): Promise<Paper | null> {
    return this.getPaper(`DOI:${doi}`);
  }

  /**
   * Get paper by arXiv ID
   */
  async getByArxivId(arxivId: string): Promise<Paper | null> {
    return this.getPaper(`ARXIV:${arxivId}`);
  }

  /**
   * Batch get papers by IDs
   */
  async getPapers(paperIds: string[]): Promise<Paper[]> {
    if (paperIds.length === 0) return [];

    // API allows max 500 IDs per request
    const batches: string[][] = [];
    for (let i = 0; i < paperIds.length; i += 500) {
      batches.push(paperIds.slice(i, i + 500));
    }

    const results: Paper[] = [];

    for (const batch of batches) {
      const batchResults = await this.circuitBreaker.execute(async () => {
        await this.rateLimiter.acquire();

        const response = await this.client.post('/paper/batch', {
          ids: batch,
        }, {
          params: {
            fields: this.defaultFields.join(','),
          },
        });

        return response.data
          .filter((p: unknown) => p !== null)
          .map((paper: unknown) => this.transformPaper(paper));
      });

      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get citations for a paper
   */
  async getCitations(paperId: string, limit = 100): Promise<Paper[]> {
    return this.circuitBreaker.execute(async () => {
      await this.rateLimiter.acquire();

      const response = await this.client.get(`/paper/${paperId}/citations`, {
        params: {
          fields: this.defaultFields.join(','),
          limit,
        },
      });

      if (!response.data.data) {
        return [];
      }

      return response.data.data
        .filter((c: any) => c.citingPaper)
        .map((c: any) => this.transformPaper(c.citingPaper));
    });
  }

  /**
   * Get references for a paper
   */
  async getReferences(paperId: string, limit = 100): Promise<Paper[]> {
    return this.circuitBreaker.execute(async () => {
      await this.rateLimiter.acquire();

      const response = await this.client.get(`/paper/${paperId}/references`, {
        params: {
          fields: this.defaultFields.join(','),
          limit,
        },
      });

      if (!response.data.data) {
        return [];
      }

      return response.data.data
        .filter((r: any) => r.citedPaper)
        .map((r: any) => this.transformPaper(r.citedPaper));
    });
  }

  /**
   * Get rate limiter status
   */
  getRateLimiterStatus(): { remaining: number; isLimited: boolean } {
    return {
      remaining: this.rateLimiter.getRemaining(),
      isLimited: this.rateLimiter.isLimited(),
    };
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus() {
    return this.circuitBreaker.getStats();
  }

  /**
   * Check if client is available (circuit not open)
   */
  isAvailable(): boolean {
    return this.circuitBreaker.canExecute();
  }

  /**
   * Transform Semantic Scholar paper to Paper entity
   */
  private transformPaper(data: unknown): Paper {
    const validated = SSPaperSchema.parse(data);
    
    const authors: Author[] = (validated.authors ?? [])
      .filter(a => a.name)
      .map(a => ({
        name: a.name!,
        authorId: a.authorId ?? undefined,
      }));

    const categories = validated.fieldsOfStudy ?? [];

    // Determine publication date
    let publishedDate: Date;
    if (validated.publicationDate) {
      publishedDate = new Date(validated.publicationDate);
    } else if (validated.year) {
      publishedDate = new Date(validated.year, 0, 1);
    } else {
      publishedDate = new Date();
    }

    const now = new Date();
    const paperData: Omit<Paper, 'contentHash'> = {
      id: validated.paperId,
      title: validated.title ?? 'Untitled',
      authors,
      abstract: validated.abstract ?? '',
      publishedDate,
      source: 'semantic_scholar',
      categories,
      citationCount: validated.citationCount ?? undefined,
      doi: validated.externalIds?.DOI,
      arxivId: validated.externalIds?.ArXiv,
      url: validated.url ?? undefined,
      references: validated.references
        ?.filter(r => r.paperId)
        .map(r => r.paperId!) ?? [],
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

export { CircuitOpenError };
