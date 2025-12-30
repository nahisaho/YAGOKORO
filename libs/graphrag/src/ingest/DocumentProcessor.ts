/**
 * DocumentProcessor - Document Processing Pipeline
 *
 * Downloads documents from arXiv, extracts text using Unstructured,
 * and converts to TextChunk format for LazyGraphRAG.
 */

import { ArxivClient, type ArxivPaper } from './ArxivClient.js';
import { UnstructuredClient, type UnstructuredElement } from './UnstructuredClient.js';
import type { TextChunk } from '../extraction/types.js';

/**
 * Processed document with chunks
 */
export interface ProcessedDocument {
  /** Source arXiv paper metadata */
  paper: ArxivPaper;
  /** Extracted text chunks */
  chunks: TextChunk[];
  /** Full extracted text */
  fullText: string;
  /** Processing statistics */
  stats: {
    /** Total pages */
    pages: number;
    /** Total elements extracted */
    elements: number;
    /** Total chunks created */
    chunksCreated: number;
    /** Total characters */
    totalCharacters: number;
    /** Processing time in ms */
    processingTimeMs: number;
  };
}

/**
 * Document processing options
 */
export interface DocumentProcessorOptions {
  /** Chunk size in characters */
  chunkSize?: number;
  /** Overlap between chunks in characters */
  chunkOverlap?: number;
  /** Minimum chunk size */
  minChunkSize?: number;
  /** Include paper metadata in chunk metadata */
  includeMetadata?: boolean;
  /** Unstructured API options */
  unstructuredOptions?: {
    apiKey?: string;
    apiUrl?: string;
    strategy?: 'auto' | 'hi_res' | 'fast' | 'ocr_only';
  };
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<Omit<DocumentProcessorOptions, 'unstructuredOptions'>> = {
  chunkSize: 1000,
  chunkOverlap: 200,
  minChunkSize: 100,
  includeMetadata: true,
};

/**
 * DocumentProcessor
 *
 * End-to-end pipeline for processing arXiv papers into TextChunks.
 *
 * @example
 * ```typescript
 * const processor = new DocumentProcessor({
 *   unstructuredOptions: {
 *     apiKey: process.env.UNSTRUCTURED_API_KEY,
 *   },
 * });
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
export class DocumentProcessor {
  private readonly arxivClient: ArxivClient;
  private readonly unstructuredClient: UnstructuredClient;
  private readonly options: Required<Omit<DocumentProcessorOptions, 'unstructuredOptions'>>;

  constructor(options?: DocumentProcessorOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.arxivClient = new ArxivClient();
    this.unstructuredClient = new UnstructuredClient(options?.unstructuredOptions);
  }

  /**
   * Process an arXiv paper by ID
   *
   * @param arxivId - arXiv paper ID (e.g., "1706.03762")
   * @returns Processed document with chunks
   */
  async processArxivPaper(arxivId: string): Promise<ProcessedDocument> {
    const startTime = Date.now();

    // Step 1: Get paper metadata
    const paper = await this.arxivClient.getPaper(arxivId);

    // Step 2: Download PDF
    const pdfBuffer = await this.arxivClient.downloadPdfBuffer(arxivId);

    // Step 3: Extract text using Unstructured
    const result = await this.unstructuredClient.partitionPdf(
      pdfBuffer,
      `${arxivId}.pdf`
    );

    // Step 4: Extract full text
    const fullText = this.unstructuredClient.extractText(result.elements);

    // Step 5: Create chunks
    const chunks = this.createChunks(fullText, paper, result.elements);

    // Calculate stats
    const pageNumbers = new Set(
      result.elements
        .map((el) => el.metadata.page_number)
        .filter((p): p is number => p !== undefined)
    );

    return {
      paper,
      chunks,
      fullText,
      stats: {
        pages: pageNumbers.size || 1,
        elements: result.elements.length,
        chunksCreated: chunks.length,
        totalCharacters: fullText.length,
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
    }
  ): Promise<{
    successful: ProcessedDocument[];
    failed: Array<{ arxivId: string; error: string }>;
  }> {
    const successful: ProcessedDocument[] = [];
    const failed: Array<{ arxivId: string; error: string }> = [];

    for (let i = 0; i < arxivIds.length; i++) {
      const arxivId = arxivIds[i]!; // Safe because we're iterating within bounds
      options?.onProgress?.(i, arxivIds.length, arxivId);

      try {
        const doc = await this.processArxivPaper(arxivId);
        successful.push(doc);
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
   * @param filename - Original filename
   * @param metadata - Optional metadata
   * @returns Text chunks
   */
  async processPdfBuffer(
    pdfBuffer: Buffer,
    filename: string,
    metadata?: Record<string, unknown>
  ): Promise<{
    chunks: TextChunk[];
    fullText: string;
    stats: {
      pages: number;
      elements: number;
      chunksCreated: number;
      totalCharacters: number;
      processingTimeMs: number;
    };
  }> {
    const startTime = Date.now();

    // Extract text using Unstructured
    const result = await this.unstructuredClient.partitionPdf(pdfBuffer, filename);
    const fullText = this.unstructuredClient.extractText(result.elements);

    // Create chunks with custom metadata
    const chunks = this.createChunksFromText(fullText, filename, metadata, result.elements);

    const pageNumbers = new Set(
      result.elements
        .map((el) => el.metadata.page_number)
        .filter((p): p is number => p !== undefined)
    );

    return {
      chunks,
      fullText,
      stats: {
        pages: pageNumbers.size || 1,
        elements: result.elements.length,
        chunksCreated: chunks.length,
        totalCharacters: fullText.length,
        processingTimeMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Create text chunks from full text
   */
  private createChunks(
    fullText: string,
    paper: ArxivPaper,
    _elements: UnstructuredElement[]
  ): TextChunk[] {
    const chunks: TextChunk[] = [];
    const { chunkSize, chunkOverlap, minChunkSize, includeMetadata } = this.options;

    // Split by sections/paragraphs first
    const paragraphs = this.splitIntoParagraphs(fullText);

    let currentChunk = '';
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      // If adding this paragraph would exceed chunk size
      if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
        // Save current chunk
        if (currentChunk.length >= minChunkSize) {
          chunks.push(this.createChunk(
            currentChunk.trim(),
            paper.id,
            chunkIndex,
            includeMetadata ? paper : undefined
          ));
          chunkIndex++;
        }

        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, chunkOverlap);
        currentChunk = overlapText + paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    // Don't forget the last chunk
    if (currentChunk.trim().length >= minChunkSize) {
      chunks.push(this.createChunk(
        currentChunk.trim(),
        paper.id,
        chunkIndex,
        includeMetadata ? paper : undefined
      ));
    }

    return chunks;
  }

  /**
   * Create chunks from text with custom metadata
   */
  private createChunksFromText(
    fullText: string,
    sourceId: string,
    metadata?: Record<string, unknown>,
    _elements?: UnstructuredElement[]
  ): TextChunk[] {
    const chunks: TextChunk[] = [];
    const { chunkSize, chunkOverlap, minChunkSize } = this.options;

    const paragraphs = this.splitIntoParagraphs(fullText);

    let currentChunk = '';
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
        if (currentChunk.length >= minChunkSize) {
          chunks.push({
            id: `${sourceId}-chunk-${chunkIndex}`,
            content: currentChunk.trim(),
            metadata: {
              source: sourceId,
              chunkIndex,
              ...metadata,
            },
          });
          chunkIndex++;
        }

        const overlapText = this.getOverlapText(currentChunk, chunkOverlap);
        currentChunk = overlapText + paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    if (currentChunk.trim().length >= minChunkSize) {
      chunks.push({
        id: `${sourceId}-chunk-${chunkIndex}`,
        content: currentChunk.trim(),
        metadata: {
          source: sourceId,
          chunkIndex,
          ...metadata,
        },
      });
    }

    return chunks;
  }

  /**
   * Create a single chunk with metadata
   */
  private createChunk(
    content: string,
    sourceId: string,
    chunkIndex: number,
    paper?: ArxivPaper
  ): TextChunk {
    const metadata: TextChunk['metadata'] = {
      source: sourceId,
      chunkIndex,
    };

    if (paper) {
      metadata.arxivId = paper.id;
      metadata.title = paper.title;
      metadata.authors = paper.authors;
      metadata.categories = paper.categories;
      metadata.published = paper.published.toISOString();
    }

    return {
      id: `${sourceId}-chunk-${chunkIndex}`,
      content,
      metadata,
    };
  }

  /**
   * Split text into paragraphs
   */
  private splitIntoParagraphs(text: string): string[] {
    return text
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  /**
   * Get overlap text from the end of a chunk
   */
  private getOverlapText(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) {
      return text;
    }

    // Try to break at word boundary
    const overlapStart = text.length - overlapSize;
    const spaceIndex = text.indexOf(' ', overlapStart);

    if (spaceIndex !== -1 && spaceIndex < text.length - 10) {
      return text.substring(spaceIndex + 1);
    }

    return text.substring(overlapStart);
  }

  /**
   * Get arXiv client for direct access
   */
  getArxivClient(): ArxivClient {
    return this.arxivClient;
  }

  /**
   * Get unstructured client for direct access
   */
  getUnstructuredClient(): UnstructuredClient {
    return this.unstructuredClient;
  }
}

/**
 * Create a document processor with default settings
 */
export function createDocumentProcessor(
  options?: DocumentProcessorOptions
): DocumentProcessor {
  return new DocumentProcessor(options);
}
