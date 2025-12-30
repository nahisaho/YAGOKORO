/**
 * Unpaywall Document Processor
 *
 * Fetches papers via Unpaywall API and processes them using Docling
 * for text extraction and chunking.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { UnpaywallClient, type UnpaywallPaper } from './UnpaywallClient.js';
import { DoclingExtractor } from './DoclingExtractor.js';
import type { TextChunk } from '../extraction/types.js';
import { logger } from '../utils/logger.js';

/**
 * Paper definition for processing
 */
export interface PaperDefinition {
  /** DOI of the paper */
  doi: string;
  /** Category for classification */
  category: string;
  /** Optional title (will be fetched from Unpaywall if not provided) */
  title?: string;
  /** Optional year (will be fetched from Unpaywall if not provided) */
  year?: number;
}

/**
 * Processed document result
 */
export interface UnpaywallProcessedDocument {
  /** DOI identifier */
  doi: string;
  /** Paper title */
  title: string;
  /** Category */
  category: string;
  /** Publication year */
  year: number | null;
  /** Full paper metadata from Unpaywall */
  paper: UnpaywallPaper;
  /** Text chunks */
  chunks: TextChunk[];
  /** Extracted tables (markdown format) */
  tables: string[];
  /** Processing statistics */
  stats: {
    totalCharacters: number;
    chunkCount: number;
    tableCount: number;
    oaStatus: string;
    pdfUrl: string | null;
  };
}

/**
 * Processor options
 */
export interface UnpaywallProcessorOptions {
  /** Email for Unpaywall API */
  email: string;
  /** Chunk size */
  chunkSize?: number;
  /** Chunk overlap */
  chunkOverlap?: number;
  /** Docling timeout in ms */
  timeout?: number;
  /** Output directory for saving results */
  outputDir?: string;
}

/**
 * Process results summary
 */
export interface ProcessResults {
  successful: Array<{ doi: string; title: string; chunks: number }>;
  failed: Array<{ doi: string; title: string; error: string }>;
  skipped: Array<{ doi: string; title: string; reason: string }>;
  totalChunks: number;
  totalCharacters: number;
}

/**
 * Unpaywall Document Processor
 */
export class UnpaywallDocumentProcessor {
  private readonly client: UnpaywallClient;
  private readonly extractor: DoclingExtractor;
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;
  private readonly outputDir: string | undefined;

  constructor(options: UnpaywallProcessorOptions) {
    this.client = new UnpaywallClient({
      email: options.email,
      timeout: 30000,
      requestDelay: 100,
    });

    this.extractor = new DoclingExtractor({
      timeout: options.timeout ?? 600000, // 10 minutes default
    });

    this.chunkSize = options.chunkSize ?? 1000;
    this.chunkOverlap = options.chunkOverlap ?? 200;
    this.outputDir = options.outputDir;
  }

  /**
   * Process a single paper by DOI
   */
  async processPaper(
    definition: PaperDefinition
  ): Promise<UnpaywallProcessedDocument | null> {
    const { doi, category } = definition;

    // 1. Fetch paper metadata from Unpaywall
    logger.info(`Fetching Unpaywall metadata for: ${doi}`);
    const paper = await this.client.getByDoi(doi);

    if (!paper) {
      logger.warn(`Paper not found in Unpaywall: ${doi}`);
      return null;
    }

    const title = definition.title ?? paper.title ?? 'Unknown Title';
    const year = definition.year ?? paper.year;

    logger.info(`Found: ${title} (${year}) - OA: ${paper.oa_status}`);

    // 2. Check if PDF is available
    if (!paper.is_oa) {
      logger.warn(`Paper is not Open Access: ${doi}`);
      return null;
    }

    const pdfUrl = this.client.getPdfUrl(paper);
    if (!pdfUrl) {
      logger.warn(`No PDF URL available: ${doi}`);
      return null;
    }

    // 3. Download PDF
    logger.info(`Downloading PDF: ${pdfUrl}`);
    const pdfBuffer = await this.client.downloadPdf(paper);

    if (!pdfBuffer) {
      logger.error(`Failed to download PDF: ${doi}`);
      return null;
    }

    logger.debug(`Downloaded PDF: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // 4. Extract text using Docling
    logger.info(`Extracting text with Docling...`);
    const extraction = await this.extractor.extractFromBuffer(pdfBuffer);

    // 5. Create chunks from the extraction result
    const authorsStr = paper.z_authors
      ?.map((a) => `${a.given} ${a.family}`)
      .join(', ') ?? '';

    const chunks = this.createChunks(extraction.text, {
      doi,
      title,
      category,
      year,
      authors: authorsStr || undefined,
    });

    // 6. Extract tables as markdown strings
    const tables = extraction.tables.map((t) => t.markdown);

    // 7. Create result
    const result: UnpaywallProcessedDocument = {
      doi,
      title,
      category,
      year,
      paper,
      chunks,
      tables,
      stats: {
        totalCharacters: extraction.stats.total_characters,
        chunkCount: chunks.length,
        tableCount: extraction.stats.num_tables,
        oaStatus: paper.oa_status,
        pdfUrl,
      },
    };

    // 8. Save if output directory is specified
    if (this.outputDir) {
      await this.saveResult(result);
    }

    return result;
  }

  /**
   * Process multiple papers
   */
  async processPapers(
    papers: PaperDefinition[],
    options: {
      onProgress?: (
        current: number,
        total: number,
        paper: PaperDefinition
      ) => void;
      delayBetweenPapers?: number;
    } = {}
  ): Promise<ProcessResults> {
    const results: ProcessResults = {
      successful: [],
      failed: [],
      skipped: [],
      totalChunks: 0,
      totalCharacters: 0,
    };

    const delay = options.delayBetweenPapers ?? 5000;

    for (let i = 0; i < papers.length; i++) {
      const paper = papers[i];
      if (!paper) continue;

      const title = paper.title ?? paper.doi;

      if (options.onProgress) {
        options.onProgress(i + 1, papers.length, paper);
      }

      try {
        const processed = await this.processPaper(paper);

        if (processed) {
          results.successful.push({
            doi: paper.doi,
            title: processed.title,
            chunks: processed.chunks.length,
          });
          results.totalChunks += processed.chunks.length;
          results.totalCharacters += processed.stats.totalCharacters;
        } else {
          results.skipped.push({
            doi: paper.doi,
            title,
            reason: 'Not Open Access or PDF unavailable',
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        results.failed.push({
          doi: paper.doi,
          title,
          error: errorMessage,
        });
        logger.error(`Failed to process ${paper.doi}: ${errorMessage}`);
      }

      // Delay between papers to be polite
      if (i < papers.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return results;
  }

  /**
   * Create text chunks from text content
   */
  private createChunks(
    text: string,
    metadata: {
      doi: string;
      title: string;
      category: string;
      year: number | null;
      authors?: string | undefined;
    }
  ): TextChunk[] {
    const chunks: TextChunk[] = [];
    const cleanText = text.replace(/\r\n/g, '\n');

    // Split by paragraphs first
    const paragraphs = cleanText.split(/\n\n+/);
    let currentChunk = '';
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) continue;

      if (currentChunk.length + trimmed.length > this.chunkSize) {
        if (currentChunk.length > 0) {
          chunks.push({
            id: `unpaywall-${metadata.doi.replace(/\//g, '_')}-chunk-${chunkIndex}`,
            content: currentChunk.trim(),
            metadata: {
              source: `unpaywall:${metadata.doi}`,
              title: metadata.title,
              category: metadata.category,
              year: metadata.year,
              authors: metadata.authors,
              chunkIndex,
            },
          });
          chunkIndex++;

          // Keep overlap
          const words = currentChunk.split(/\s+/);
          const overlapWords = Math.floor(
            (this.chunkOverlap / this.chunkSize) * words.length
          );
          currentChunk = words.slice(-overlapWords).join(' ') + '\n\n';
        }
      }

      currentChunk += trimmed + '\n\n';
    }

    // Add final chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: `unpaywall-${metadata.doi.replace(/\//g, '_')}-chunk-${chunkIndex}`,
        content: currentChunk.trim(),
        metadata: {
          source: `unpaywall:${metadata.doi}`,
          title: metadata.title,
          category: metadata.category,
          year: metadata.year,
          authors: metadata.authors,
          chunkIndex,
        },
      });
    }

    return chunks;
  }

  /**
   * Save processing result to file
   */
  private async saveResult(result: UnpaywallProcessedDocument): Promise<void> {
    if (!this.outputDir) return;

    await mkdir(this.outputDir, { recursive: true });

    const filename = `unpaywall_${result.doi.replace(/\//g, '_')}.json`;
    const filepath = join(this.outputDir, filename);

    await writeFile(filepath, JSON.stringify(result, null, 2));
    logger.debug(`Saved result to: ${filepath}`);
  }

  /**
   * Search for papers and process them
   */
  async searchAndProcess(
    query: string,
    options: {
      category: string;
      maxResults?: number;
      isOa?: boolean;
    }
  ): Promise<ProcessResults> {
    logger.info(`Searching Unpaywall for: ${query}`);

    const searchResults = await this.client.search(query, {
      isOa: options.isOa ?? true,
    });

    const papers: PaperDefinition[] = searchResults
      .slice(0, options.maxResults ?? 10)
      .map((result) => {
        const paperDef: PaperDefinition = {
          doi: result.response.doi,
          title: result.response.title,
          category: options.category,
        };
        if (result.response.year != null) {
          paperDef.year = result.response.year;
        }
        return paperDef;
      });

    logger.info(`Found ${papers.length} papers to process`);

    return this.processPapers(papers, {
      onProgress: (current, total, paper) => {
        console.log(`[${current}/${total}] Processing: ${paper.title ?? paper.doi}`);
      },
    });
  }
}

/**
 * Factory function
 */
export function createUnpaywallProcessor(
  options: UnpaywallProcessorOptions
): UnpaywallDocumentProcessor {
  return new UnpaywallDocumentProcessor(options);
}
