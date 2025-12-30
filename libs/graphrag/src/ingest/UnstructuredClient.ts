/**
 * UnstructuredClient - Unstructured.io API Client
 *
 * Converts documents (PDF, DOCX, etc.) to structured text elements.
 *
 * @see https://unstructured.io/
 * @see https://docs.unstructured.io/api-reference/api-services/api-parameters
 */

/**
 * Element types returned by Unstructured
 */
export type UnstructuredElementType =
  | 'Title'
  | 'NarrativeText'
  | 'Text'
  | 'UncategorizedText'
  | 'ListItem'
  | 'Table'
  | 'FigureCaption'
  | 'Image'
  | 'Header'
  | 'Footer'
  | 'PageBreak'
  | 'Formula'
  | 'CodeSnippet';

/**
 * Structured element from document
 */
export interface UnstructuredElement {
  /** Element type */
  type: UnstructuredElementType;
  /** Element ID */
  element_id: string;
  /** Text content */
  text: string;
  /** Metadata */
  metadata: {
    /** Source filename */
    filename?: string;
    /** File type */
    filetype?: string;
    /** Page number (1-based) */
    page_number?: number;
    /** Languages detected */
    languages?: string[];
    /** Parent element ID */
    parent_id?: string;
    /** Text as HTML */
    text_as_html?: string;
    /** Coordinates on page */
    coordinates?: {
      points: number[][];
      system: string;
      layout_width: number;
      layout_height: number;
    };
    /** Additional metadata */
    [key: string]: unknown;
  };
}

/**
 * Unstructured API options
 */
export interface UnstructuredOptions {
  /** API key (or use UNSTRUCTURED_API_KEY env var) */
  apiKey?: string;
  /** API URL (default: https://api.unstructured.io/general/v0/general) */
  apiUrl?: string;
  /** Output format: 'application/json' */
  outputFormat?: string;
  /** Strategy: 'auto', 'hi_res', 'fast', 'ocr_only' */
  strategy?: 'auto' | 'hi_res' | 'fast' | 'ocr_only';
  /** Languages for OCR (ISO 639-1 codes) */
  languages?: string[];
  /** Include page breaks */
  includePageBreaks?: boolean;
  /** Chunking strategy */
  chunkingStrategy?: 'basic' | 'by_title' | null;
  /** Maximum characters per chunk */
  maxCharacters?: number;
  /** Characters overlap between chunks */
  overlap?: number;
  /** Combine under n chars */
  combineUnderNChars?: number;
  /** Include coordinates */
  coordinates?: boolean;
  /** Extract image block types */
  extractImageBlockTypes?: string[];
}

/**
 * Partition result
 */
export interface PartitionResult {
  /** All elements extracted */
  elements: UnstructuredElement[];
  /** Source filename */
  filename: string;
  /** Processing time in ms */
  processingTimeMs: number;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Partial<UnstructuredOptions> = {
  apiUrl: 'https://api.unstructured.io/general/v0/general',
  outputFormat: 'application/json',
  strategy: 'auto',
  includePageBreaks: false,
  coordinates: false,
};

/**
 * UnstructuredClient
 *
 * Client for the Unstructured.io API to extract text from documents.
 *
 * @example
 * ```typescript
 * const client = new UnstructuredClient({
 *   apiKey: process.env.UNSTRUCTURED_API_KEY,
 * });
 *
 * // Partition a PDF buffer
 * const result = await client.partitionPdf(pdfBuffer, 'paper.pdf');
 *
 * // Get all text
 * const text = client.extractText(result.elements);
 *
 * // Get text by page
 * const pageTexts = client.extractTextByPage(result.elements);
 * ```
 */
export class UnstructuredClient {
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly options: Partial<UnstructuredOptions>;

  constructor(options?: UnstructuredOptions) {
    this.apiKey = options?.apiKey ?? process.env.UNSTRUCTURED_API_KEY ?? '';
    this.apiUrl = options?.apiUrl ?? DEFAULT_OPTIONS.apiUrl!;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    if (!this.apiKey) {
      throw new Error(
        'Unstructured API key is required. Set UNSTRUCTURED_API_KEY environment variable or pass apiKey option.'
      );
    }
  }

  /**
   * Partition a PDF document
   *
   * @param pdfBuffer - PDF file as Buffer
   * @param filename - Original filename
   * @returns Partition result with extracted elements
   */
  async partitionPdf(
    pdfBuffer: Buffer,
    filename: string
  ): Promise<PartitionResult> {
    return this.partition(pdfBuffer, filename, 'application/pdf');
  }

  /**
   * Partition any supported document
   *
   * @param buffer - Document as Buffer
   * @param filename - Original filename
   * @param contentType - MIME type
   * @returns Partition result
   */
  async partition(
    buffer: Buffer,
    filename: string,
    contentType: string
  ): Promise<PartitionResult> {
    const startTime = Date.now();

    const formData = new FormData();
    const blob = new Blob([buffer], { type: contentType });
    formData.append('files', blob, filename);

    // Add options to form data
    if (this.options.strategy) {
      formData.append('strategy', this.options.strategy);
    }
    if (this.options.languages) {
      formData.append('languages', this.options.languages.join(','));
    }
    if (this.options.includePageBreaks) {
      formData.append('include_page_breaks', 'true');
    }
    if (this.options.coordinates) {
      formData.append('coordinates', 'true');
    }
    if (this.options.chunkingStrategy) {
      formData.append('chunking_strategy', this.options.chunkingStrategy);
    }
    if (this.options.maxCharacters) {
      formData.append('max_characters', this.options.maxCharacters.toString());
    }
    if (this.options.overlap) {
      formData.append('overlap', this.options.overlap.toString());
    }
    if (this.options.combineUnderNChars) {
      formData.append('combine_under_n_chars', this.options.combineUnderNChars.toString());
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'unstructured-api-key': this.apiKey,
        Accept: 'application/json',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Unstructured API error (${response.status}): ${errorText}`
      );
    }

    const elements = (await response.json()) as UnstructuredElement[];

    return {
      elements,
      filename,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Extract all text from elements
   *
   * @param elements - Unstructured elements
   * @param options - Extraction options
   * @returns Combined text
   */
  extractText(
    elements: UnstructuredElement[],
    options?: {
      /** Element types to include (default: all) */
      includeTypes?: UnstructuredElementType[];
      /** Element types to exclude */
      excludeTypes?: UnstructuredElementType[];
      /** Separator between elements */
      separator?: string;
    }
  ): string {
    const separator = options?.separator ?? '\n\n';
    const includeTypes = options?.includeTypes;
    const excludeTypes = options?.excludeTypes ?? ['Header', 'Footer', 'PageBreak'];

    return elements
      .filter((el) => {
        if (includeTypes && !includeTypes.includes(el.type)) {
          return false;
        }
        if (excludeTypes.includes(el.type)) {
          return false;
        }
        return el.text && el.text.trim().length > 0;
      })
      .map((el) => el.text.trim())
      .join(separator);
  }

  /**
   * Extract text grouped by page
   *
   * @param elements - Unstructured elements
   * @returns Map of page number to text
   */
  extractTextByPage(elements: UnstructuredElement[]): Map<number, string> {
    const pages = new Map<number, string[]>();

    for (const element of elements) {
      if (!element.text || element.text.trim().length === 0) continue;
      if (['Header', 'Footer', 'PageBreak'].includes(element.type)) continue;

      const pageNum = element.metadata.page_number ?? 1;
      const existing = pages.get(pageNum) ?? [];
      existing.push(element.text.trim());
      pages.set(pageNum, existing);
    }

    const result = new Map<number, string>();
    for (const [pageNum, texts] of pages) {
      result.set(pageNum, texts.join('\n\n'));
    }

    return result;
  }

  /**
   * Extract text with structure preserved
   *
   * @param elements - Unstructured elements
   * @returns Structured text with sections
   */
  extractStructuredText(elements: UnstructuredElement[]): Array<{
    type: UnstructuredElementType;
    text: string;
    page?: number;
  }> {
    return elements
      .filter((el) => el.text && el.text.trim().length > 0)
      .filter((el) => !['Header', 'Footer', 'PageBreak'].includes(el.type))
      .map((el) => {
        const result: { type: UnstructuredElementType; text: string; page?: number } = {
          type: el.type,
          text: el.text.trim(),
        };
        if (el.metadata.page_number !== undefined) {
          result.page = el.metadata.page_number;
        }
        return result;
      });
  }

  /**
   * Extract tables as structured data
   *
   * @param elements - Unstructured elements
   * @returns Table elements with HTML representation
   */
  extractTables(elements: UnstructuredElement[]): Array<{
    text: string;
    html?: string;
    page?: number;
  }> {
    return elements
      .filter((el) => el.type === 'Table')
      .map((el) => {
        const result: { text: string; html?: string; page?: number } = {
          text: el.text,
        };
        if (el.metadata.text_as_html !== undefined) {
          result.html = el.metadata.text_as_html;
        }
        if (el.metadata.page_number !== undefined) {
          result.page = el.metadata.page_number;
        }
        return result;
      });
  }
}
