/**
 * CLI command for document ingestion
 *
 * Supports ingesting papers from arXiv using the DocumentProcessor
 */
import { Command } from 'commander';

import { logger } from '../utils/logger.js';

/**
 * Ingest service interface
 */
export interface IngestService {
  /**
   * Process arXiv paper
   */
  processArxivPaper(arxivId: string): Promise<ArxivPaperResult>;

  /**
   * Process multiple arXiv papers
   */
  processArxivPapers(
    arxivIds: string[],
    options?: BatchIngestOptions
  ): Promise<BatchIngestResult>;

  /**
   * Process local PDF file
   */
  processLocalPdf(filePath: string, metadata?: PdfMetadata): Promise<PdfResult>;

  /**
   * Search arXiv papers
   */
  searchArxiv(query: string, options?: ArxivSearchOptions): Promise<ArxivSearchResult>;
}

/**
 * Result from processing an arXiv paper
 */
export interface ArxivPaperResult {
  /** arXiv paper ID */
  arxivId: string;
  /** Paper title */
  title: string;
  /** Paper authors */
  authors: string[];
  /** Number of chunks created */
  chunksCreated: number;
  /** Total characters processed */
  totalCharacters: number;
  /** Processing time in ms */
  processingTimeMs: number;
  /** Paper categories */
  categories: string[];
  /** Publication date */
  published: Date;
}

/**
 * Options for batch ingestion
 */
export interface BatchIngestOptions {
  /** Continue processing on error */
  continueOnError?: boolean | undefined;
  /** Delay between papers (ms) */
  delayMs?: number | undefined;
}

/**
 * Result from batch ingestion
 */
export interface BatchIngestResult {
  /** Successfully processed papers */
  successful: ArxivPaperResult[];
  /** Failed papers */
  failed: Array<{ arxivId: string; error: string }>;
  /** Total processing time */
  totalTimeMs: number;
}

/**
 * PDF metadata for local files
 */
export interface PdfMetadata {
  /** Document ID */
  documentId?: string | undefined;
  /** Document title */
  title?: string | undefined;
  /** Authors */
  authors?: string[] | undefined;
  /** Source identifier */
  source?: string | undefined;
}

/**
 * Result from processing a local PDF
 */
export interface PdfResult {
  /** Source file path */
  filePath: string;
  /** Number of chunks created */
  chunksCreated: number;
  /** Total characters processed */
  totalCharacters: number;
  /** Processing time in ms */
  processingTimeMs: number;
  /** Number of pages */
  pages: number;
}

/**
 * Options for arXiv search
 */
export interface ArxivSearchOptions {
  /** Maximum results */
  maxResults?: number | undefined;
  /** Category filter */
  category?: string | undefined;
  /** Sort by */
  sortBy?: 'relevance' | 'lastUpdatedDate' | 'submittedDate' | undefined;
}

/**
 * Search result from arXiv
 */
export interface ArxivSearchResult {
  /** Search query */
  query: string;
  /** Total results found */
  totalResults: number;
  /** Papers found */
  papers: Array<{
    id: string;
    title: string;
    authors: string[];
    summary: string;
    categories: string[];
    published: Date;
  }>;
}

/**
 * Create the ingest command
 *
 * @param service - Ingest service implementation
 * @returns Commander command instance
 */
export function createIngestCommand(service: IngestService): Command {
  const ingest = new Command('ingest').description('Ingest documents into the knowledge graph');

  // Subcommand: ingest arxiv <id>
  ingest
    .command('arxiv <arxivId>')
    .description('Ingest a paper from arXiv by ID (e.g., 1706.03762)')
    .option('-v, --verbose', 'Show detailed output')
    .action(async (arxivId: string, options: { verbose?: boolean }) => {
      try {
        logger.info(`Processing arXiv paper: ${arxivId}`);

        const result = await service.processArxivPaper(arxivId);

        if (options.verbose) {
          logger.info('Paper details:');
          logger.info(`  Title: ${result.title}`);
          logger.info(`  Authors: ${result.authors.join(', ')}`);
          logger.info(`  Categories: ${result.categories.join(', ')}`);
          logger.info(`  Published: ${result.published.toISOString()}`);
          logger.info(`  Chunks created: ${result.chunksCreated}`);
          logger.info(`  Characters: ${result.totalCharacters.toLocaleString()}`);
          logger.info(`  Processing time: ${result.processingTimeMs}ms`);
        } else {
          logger.info(
            `✓ Ingested "${result.title}" - ${result.chunksCreated} chunks (${result.processingTimeMs}ms)`
          );
        }
      } catch (error) {
        logger.error(`Failed to ingest arXiv paper: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // Subcommand: ingest arxiv-batch <ids...>
  ingest
    .command('arxiv-batch <ids...>')
    .description('Ingest multiple papers from arXiv')
    .option('--continue-on-error', 'Continue processing if a paper fails')
    .option('-d, --delay <ms>', 'Delay between papers in ms', '1000')
    .option('-v, --verbose', 'Show detailed output')
    .action(
      async (
        ids: string[],
        options: { continueOnError?: boolean; delay?: string; verbose?: boolean }
      ) => {
        try {
          logger.info(`Processing ${ids.length} arXiv papers...`);

          const result = await service.processArxivPapers(ids, {
            continueOnError: options.continueOnError,
            delayMs: parseInt(options.delay || '1000', 10),
          });

          logger.info(`\nResults:`);
          logger.info(`  Successful: ${result.successful.length}`);
          logger.info(`  Failed: ${result.failed.length}`);
          logger.info(`  Total time: ${(result.totalTimeMs / 1000).toFixed(1)}s`);

          if (options.verbose && result.successful.length > 0) {
            logger.info('\nSuccessful papers:');
            for (const paper of result.successful) {
              logger.info(`  ✓ ${paper.arxivId}: ${paper.title}`);
            }
          }

          if (result.failed.length > 0) {
            logger.warning('\nFailed papers:');
            for (const failed of result.failed) {
              logger.warning(`  ✗ ${failed.arxivId}: ${failed.error}`);
            }
          }
        } catch (error) {
          logger.error(`Batch ingestion failed: ${(error as Error).message}`);
          process.exit(1);
        }
      }
    );

  // Subcommand: ingest pdf <file>
  ingest
    .command('pdf <file>')
    .description('Ingest a local PDF file')
    .option('-t, --title <title>', 'Document title')
    .option('-a, --authors <authors>', 'Document authors (comma-separated)')
    .option('-s, --source <source>', 'Source identifier')
    .option('-v, --verbose', 'Show detailed output')
    .action(
      async (
        file: string,
        options: { title?: string; authors?: string; source?: string; verbose?: boolean }
      ) => {
        try {
          logger.info(`Processing PDF: ${file}`);

          const metadata: PdfMetadata = {
            title: options.title,
            authors: options.authors?.split(',').map((a) => a.trim()),
            source: options.source,
          };

          const result = await service.processLocalPdf(file, metadata);

          if (options.verbose) {
            logger.info('Processing results:');
            logger.info(`  File: ${result.filePath}`);
            logger.info(`  Pages: ${result.pages}`);
            logger.info(`  Chunks created: ${result.chunksCreated}`);
            logger.info(`  Characters: ${result.totalCharacters.toLocaleString()}`);
            logger.info(`  Processing time: ${result.processingTimeMs}ms`);
          } else {
            logger.info(
              `✓ Ingested ${result.filePath} - ${result.chunksCreated} chunks (${result.processingTimeMs}ms)`
            );
          }
        } catch (error) {
          logger.error(`Failed to process PDF: ${(error as Error).message}`);
          process.exit(1);
        }
      }
    );

  // Subcommand: ingest search <query>
  ingest
    .command('search <query>')
    .description('Search arXiv for papers')
    .option('-n, --max-results <n>', 'Maximum number of results', '10')
    .option('-c, --category <category>', 'Filter by category (e.g., cs.CL, cs.AI)')
    .option('-s, --sort <sort>', 'Sort by: relevance, lastUpdatedDate, submittedDate', 'relevance')
    .action(
      async (
        query: string,
        options: { maxResults?: string; category?: string; sort?: string }
      ) => {
        try {
          logger.info(`Searching arXiv for: "${query}"`);

          const result = await service.searchArxiv(query, {
            maxResults: parseInt(options.maxResults || '10', 10),
            category: options.category,
            sortBy: options.sort as 'relevance' | 'lastUpdatedDate' | 'submittedDate',
          });

          logger.info(`Found ${result.totalResults} results:\n`);

          for (const paper of result.papers) {
            logger.info(`${paper.id}`);
            logger.info(`  Title: ${paper.title}`);
            logger.info(`  Authors: ${paper.authors.slice(0, 3).join(', ')}${paper.authors.length > 3 ? '...' : ''}`);
            logger.info(`  Categories: ${paper.categories.join(', ')}`);
            logger.info(`  Published: ${paper.published.toISOString().split('T')[0]}`);
            logger.info('');
          }

          if (result.papers.length > 0) {
            logger.info(`To ingest a paper, run: yagokoro ingest arxiv <paper-id>`);
          }
        } catch (error) {
          logger.error(`Search failed: ${(error as Error).message}`);
          process.exit(1);
        }
      }
    );

  return ingest;
}
