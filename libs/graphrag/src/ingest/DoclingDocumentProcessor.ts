/**
 * DoclingDocumentProcessor - Document Processing Pipeline using Docling
 *
 * Downloads documents from arXiv, extracts text using Docling (local),
 * and converts to TextChunk format for LazyGraphRAG.
 *
 * This processor uses Docling (Python) for PDF extraction instead of
 * the Unstructured.io API, enabling fully local processing.
 */

import { ArxivClient, type ArxivPaper } from './ArxivClient.js';
import {
  DoclingExtractor,
  type DoclingExtractionResult,
  type DoclingExtractorOptions,
} from './DoclingExtractor.js';
import type { TextChunk } from '../extraction/types.js';

/**
 * Processed document with chunks
 */
export interface DoclingProcessedDocument {
  /** Source arXiv paper metadata */
  paper: ArxivPaper;
  /** Extracted text chunks */
  chunks: TextChunk[];
  /** Full extracted text (Markdown) */
  fullText: string;
  /** Extracted tables */
  tables: Array<{ index: number; markdown: string }>;
  /** Processing statistics */
  stats: {
    /** Total pages */
    pages: number;
    /** Total chunks created */
    chunksCreated: number;
    /** Total characters */
    totalCharacters: number;
    /** Total words */
    totalWords: number;
    /** Number of tables */
    numTables: number;
    /** Processing time in ms */
    processingTimeMs: number;
  };
}

/**
 * Document processing options
 */
export interface DoclingProcessorOptions {
  /** Chunk size in characters */
  chunkSize?: number;
  /** Overlap between chunks in characters */
  chunkOverlap?: number;
  /** Minimum chunk size */
  minChunkSize?: number;
  /** Include paper metadata in chunk metadata */
  includeMetadata?: boolean;
  /** Docling options */
  doclingOptions?: DoclingExtractorOptions;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<Omit<DoclingProcessorOptions, 'doclingOptions'>> = {
  chunkSize: 1000,
  chunkOverlap: 200,
  minChunkSize: 100,
  includeMetadata: true,
};

/**
 * DoclingDocumentProcessor
 *
 * End-to-end pipeline for processing arXiv papers into TextChunks using Docling.
 *
 * @example
 * ```typescript
 * const processor = new DoclingDocumentProcessor();
 *
 * // Process a single paper
 * const doc = await processor.processArxivPaper('1706.03762');
 * console.log(doc.paper.title); // "Attention Is All You Need"
 * console.log(doc.chunks.length); // Number of chunks
 *
 * // Use with LazyGraphRAG
 * const conceptResult = await conceptExtractor.extract(doc.chunks);
 * ```
 */
export class DoclingDocumentProcessor {
  private readonly arxivClient: ArxivClient;
  private readonly doclingExtractor: DoclingExtractor;
  private readonly options: Required<Omit<DoclingProcessorOptions, 'doclingOptions'>>;

  constructor(options?: DoclingProcessorOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.arxivClient = new ArxivClient();
    this.doclingExtractor = new DoclingExtractor(options?.doclingOptions);
  }

  /**
   * Process an arXiv paper by ID
   *
   * @param arxivId - arXiv paper ID (e.g., "1706.03762")
   * @returns Processed document with chunks
   */
  async processArxivPaper(arxivId: string): Promise<DoclingProcessedDocument> {
    const startTime = Date.now();

    // Step 1: Get paper metadata
    const paper = await this.arxivClient.getPaper(arxivId);

    // Step 2: Download PDF
    const pdfBuffer = await this.arxivClient.downloadPdfBuffer(arxivId);

    // Step 3: Extract text using Docling
    const result = await this.doclingExtractor.extractFromBuffer(pdfBuffer);

    // Step 4: Create chunks
    const chunks = this.createChunks(result.text, paper, result);

    return {
      paper,
      chunks,
      fullText: result.text,
      tables: result.tables,
      stats: {
        pages: result.metadata.num_pages,
        chunksCreated: chunks.length,
        totalCharacters: result.stats.total_characters,
        totalWords: result.stats.total_words,
        numTables: result.stats.num_tables,
        processingTimeMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Process an arXiv paper by URL
   *
   * @param pdfUrl - arXiv PDF URL
   * @param paper - Paper metadata
   * @returns Processed document with chunks
   */
  async processArxivPaperByUrl(
    pdfUrl: string,
    paper: ArxivPaper
  ): Promise<DoclingProcessedDocument> {
    const startTime = Date.now();

    // Extract directly from URL using Docling
    const result = await this.doclingExtractor.extractFromUrl(pdfUrl);

    // Create chunks
    const chunks = this.createChunks(result.text, paper, result);

    return {
      paper,
      chunks,
      fullText: result.text,
      tables: result.tables,
      stats: {
        pages: result.metadata.num_pages,
        chunksCreated: chunks.length,
        totalCharacters: result.stats.total_characters,
        totalWords: result.stats.total_words,
        numTables: result.stats.num_tables,
        processingTimeMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Process multiple arXiv papers
   *
   * @param arxivIds - List of arXiv paper IDs
   * @param options - Processing options
   * @returns Processed documents
   */
  async processArxivPapers(
    arxivIds: string[],
    options?: {
      /** Continue on error */
      continueOnError?: boolean;
      /** Callback for progress */
      onProgress?: (completed: number, total: number, current: string) => void;
      /** Delay between papers (ms) - for rate limiting */
      delayBetweenPapers?: number;
    }
  ): Promise<{
    successful: DoclingProcessedDocument[];
    failed: Array<{ arxivId: string; error: string }>;
  }> {
    const successful: DoclingProcessedDocument[] = [];
    const failed: Array<{ arxivId: string; error: string }> = [];

    for (let i = 0; i < arxivIds.length; i++) {
      const arxivId = arxivIds[i]!;
      options?.onProgress?.(i, arxivIds.length, arxivId);

      try {
        const doc = await this.processArxivPaper(arxivId);
        successful.push(doc);

        // Rate limiting delay
        if (options?.delayBetweenPapers && i < arxivIds.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, options.delayBetweenPapers));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        failed.push({ arxivId: arxivId, error: errorMessage });

        if (!options?.continueOnError) {
          throw error;
        }
      }
    }

    return { successful, failed };
  }

  /**
   * Process PDF buffer directly (without arXiv)
   *
   * @param pdfBuffer - PDF file as Buffer
   * @param metadata - Optional metadata
   * @returns Text chunks
   */
  async processPdfBuffer(
    pdfBuffer: Buffer,
    metadata?: {
      title?: string;
      authors?: string[];
      source?: string;
    }
  ): Promise<{
    chunks: TextChunk[];
    fullText: string;
    tables: Array<{ index: number; markdown: string }>;
    stats: {
      pages: number;
      chunksCreated: number;
      totalCharacters: number;
      totalWords: number;
      numTables: number;
    };
  }> {
    // Extract text using Docling
    const result = await this.doclingExtractor.extractFromBuffer(pdfBuffer);

    // Create pseudo-paper for chunking
    const pseudoPaper: ArxivPaper = {
      id: 'local',
      title: metadata?.title ?? 'Untitled',
      authors: metadata?.authors ?? [],
      abstract: '',
      published: new Date(),
      updated: new Date(),
      pdfUrl: metadata?.source ?? 'local',
      absUrl: '',
      primaryCategory: '',
      categories: [],
    };

    // Create chunks
    const chunks = this.createChunks(result.text, pseudoPaper, result);

    return {
      chunks,
      fullText: result.text,
      tables: result.tables,
      stats: {
        pages: result.metadata.num_pages,
        chunksCreated: chunks.length,
        totalCharacters: result.stats.total_characters,
        totalWords: result.stats.total_words,
        numTables: result.stats.num_tables,
      },
    };
  }

  /**
   * Create chunks from extracted text
   */
  private createChunks(
    text: string,
    paper: ArxivPaper,
    _result: DoclingExtractionResult
  ): TextChunk[] {
    const chunks: TextChunk[] = [];
    const { chunkSize, chunkOverlap, minChunkSize, includeMetadata } = this.options;

    // Split text into sections based on Markdown headers
    const sections = this.splitByMarkdownHeaders(text);

    let chunkIndex = 0;

    for (const section of sections) {
      const sectionChunks = this.splitTextIntoChunks(
        section.content,
        chunkSize,
        chunkOverlap,
        minChunkSize
      );

      for (const chunkText of sectionChunks) {
        const chunkMetadata: TextChunk['metadata'] = includeMetadata
          ? {
              source: `arxiv:${paper.id}`,
              title: paper.title,
              authors: paper.authors,
              chunkIndex,
              totalChunks: -1, // Will be updated later
            }
          : {};
        if (includeMetadata && section.header) {
          chunkMetadata!.section = section.header;
        }
        const chunk: TextChunk = {
          id: `${paper.id}-chunk-${chunkIndex}`,
          content: chunkText,
          metadata: chunkMetadata,
        };

        chunks.push(chunk);
        chunkIndex++;
      }
    }

    // Update total chunks count
    for (const chunk of chunks) {
      if (chunk.metadata) {
        (chunk.metadata as Record<string, unknown>).totalChunks = chunks.length;
      }
    }

    return chunks;
  }

  /**
   * Split text by Markdown headers
   */
  private splitByMarkdownHeaders(
    text: string
  ): Array<{ header: string | null; content: string }> {
    const sections: Array<{ header: string | null; content: string }> = [];
    const headerRegex = /^(#{1,6})\s+(.+)$/gm;

    let lastIndex = 0;
    let lastHeader: string | null = null;
    let match: RegExpExecArray | null;

    // biome-ignore lint/suspicious/noAssignInExpressions: standard regex iteration pattern
    while ((match = headerRegex.exec(text)) !== null) {
      // Add content before this header
      const content = text.slice(lastIndex, match.index).trim();
      if (content) {
        sections.push({ header: lastHeader, content });
      }

      lastHeader = match[2]!; // Header text
      lastIndex = match.index + match[0].length;
    }

    // Add remaining content
    const remaining = text.slice(lastIndex).trim();
    if (remaining) {
      sections.push({ header: lastHeader, content: remaining });
    }

    // If no headers found, return entire text as one section
    if (sections.length === 0) {
      sections.push({ header: null, content: text });
    }

    return sections;
  }

  /**
   * Split text into chunks with overlap
   */
  private splitTextIntoChunks(
    text: string,
    chunkSize: number,
    overlap: number,
    minSize: number
  ): string[] {
    if (text.length <= chunkSize) {
      return text.trim() ? [text.trim()] : [];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + chunkSize;

      // Find a good break point (sentence or paragraph end)
      if (end < text.length) {
        const searchStart = Math.max(start + chunkSize - 200, start);
        const searchText = text.slice(searchStart, end);

        // Look for paragraph break
        const paragraphBreak = searchText.lastIndexOf('\n\n');
        if (paragraphBreak > 0) {
          end = searchStart + paragraphBreak;
        } else {
          // Look for sentence break
          const sentenceBreak = searchText.lastIndexOf('. ');
          if (sentenceBreak > 0) {
            end = searchStart + sentenceBreak + 1;
          }
        }
      }

      const chunk = text.slice(start, end).trim();
      if (chunk.length >= minSize) {
        chunks.push(chunk);
      }

      // Move start position with overlap
      start = end - overlap;
      if (start >= text.length) break;
    }

    return chunks;
  }

  /**
   * Check if Docling is available
   */
  static async isAvailable(): Promise<boolean> {
    return DoclingExtractor.isAvailable();
  }
}

/**
 * Create a DoclingDocumentProcessor with default options
 */
export function createDoclingProcessor(
  options?: DoclingProcessorOptions
): DoclingDocumentProcessor {
  return new DoclingDocumentProcessor(options);
}
