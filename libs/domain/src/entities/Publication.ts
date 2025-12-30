import { Confidence } from '../value-objects/Confidence.js';
import { EntityId } from '../value-objects/EntityId.js';

/**
 * Publication types
 */
export type PublicationType =
  | 'paper'
  | 'preprint'
  | 'blog_post'
  | 'technical_report'
  | 'book'
  | 'thesis'
  | 'patent'
  | 'other';

/**
 * Paper source (v3)
 */
export type PaperSource = 'arxiv' | 'semantic_scholar' | 'manual';

/**
 * Processing status for ingested papers (v3)
 */
export type ProcessingStatus =
  | 'ingested'    // Just fetched
  | 'extracting'  // Relation extraction in progress
  | 'extracted'   // Extraction complete
  | 'reviewing'   // HITL review in progress
  | 'completed'   // Fully processed
  | 'failed';     // Processing failed

/**
 * Author information (v3)
 */
export interface Author {
  /** Author name */
  name: string;
  /** Author ID (if available from source) */
  authorId?: string;
  /** Affiliations */
  affiliations?: string[];
}

/**
 * Properties for creating a new Publication
 */
export interface PublicationProps {
  title: string;
  type: PublicationType;
  venue?: string;
  year?: string;
  url?: string;
  abstract?: string;
  citations?: number;
  doi?: string;
  confidence?: number;
  embedding?: number[];

  // v3 new fields
  /** arXiv ID if available */
  arxivId?: string;
  /** Paper source */
  source?: PaperSource;
  /** Authors with detailed info */
  authors?: Author[];
  /** arXiv categories */
  categories?: string[];
  /** Reference paper IDs */
  references?: string[];
  /** Publication date */
  publishedDate?: Date;
  /** Ingestion timestamp */
  ingestionDate?: Date;
  /** Last updated timestamp */
  lastUpdated?: Date;
  /** Content hash for change detection */
  contentHash?: string;
  /** Processing status */
  processingStatus?: ProcessingStatus;
}

/**
 * Publication Entity
 *
 * Represents a publication (paper, blog post, etc.) in the knowledge graph.
 */
export class Publication {
  private constructor(
    private readonly _id: EntityId,
    private readonly _props: PublicationProps,
    private readonly _confidence?: Confidence,
    private readonly _embedding?: number[]
  ) {}

  get id(): EntityId {
    return this._id;
  }

  get title(): string {
    return this._props.title;
  }

  get type(): PublicationType {
    return this._props.type;
  }

  get venue(): string | undefined {
    return this._props.venue;
  }

  get year(): string | undefined {
    return this._props.year;
  }

  get url(): string | undefined {
    return this._props.url;
  }

  get abstract(): string | undefined {
    return this._props.abstract;
  }

  get citations(): number | undefined {
    return this._props.citations;
  }

  get doi(): string | undefined {
    return this._props.doi;
  }

  // v3 new getters
  get arxivId(): string | undefined {
    return this._props.arxivId;
  }

  get source(): PaperSource | undefined {
    return this._props.source;
  }

  get authors(): Author[] | undefined {
    return this._props.authors ? [...this._props.authors] : undefined;
  }

  get categories(): string[] | undefined {
    return this._props.categories ? [...this._props.categories] : undefined;
  }

  get references(): string[] | undefined {
    return this._props.references ? [...this._props.references] : undefined;
  }

  get publishedDate(): Date | undefined {
    return this._props.publishedDate;
  }

  get ingestionDate(): Date | undefined {
    return this._props.ingestionDate;
  }

  get lastUpdated(): Date | undefined {
    return this._props.lastUpdated;
  }

  get contentHash(): string | undefined {
    return this._props.contentHash;
  }

  get processingStatus(): ProcessingStatus | undefined {
    return this._props.processingStatus;
  }

  get confidence(): Confidence | undefined {
    return this._confidence;
  }

  get embedding(): number[] | undefined {
    return this._embedding ? [...this._embedding] : undefined;
  }

  static create(props: PublicationProps): Publication {
    if (!props.title || props.title.trim().length === 0) {
      throw new Error('Publication title is required');
    }

    const id = EntityId.create('pub');
    const confidence =
      props.confidence !== undefined ? Confidence.create(props.confidence) : undefined;

    return new Publication(id, props, confidence, props.embedding);
  }

  static restore(id: EntityId, props: PublicationProps): Publication {
    const confidence =
      props.confidence !== undefined ? Confidence.create(props.confidence) : undefined;
    return new Publication(id, props, confidence, props.embedding);
  }

  updateConfidence(confidence: Confidence): Publication {
    return new Publication(this._id, this._props, confidence, this._embedding);
  }

  setEmbedding(embedding: number[]): Publication {
    return new Publication(this._id, this._props, this._confidence, embedding);
  }

  // v3 new methods
  /**
   * Update processing status
   */
  updateProcessingStatus(status: ProcessingStatus): Publication {
    const newProps = { ...this._props, processingStatus: status, lastUpdated: new Date() };
    return new Publication(this._id, newProps, this._confidence, this._embedding);
  }

  /**
   * Update content hash
   */
  updateContentHash(hash: string): Publication {
    const newProps = { ...this._props, contentHash: hash, lastUpdated: new Date() };
    return new Publication(this._id, newProps, this._confidence, this._embedding);
  }

  /**
   * Check if content has changed based on hash
   */
  hasContentChanged(newHash: string): boolean {
    return this._props.contentHash !== newHash;
  }

  /**
   * Create a Publication from ingestion data
   */
  static fromIngestion(data: {
    title: string;
    abstract?: string;
    authors?: Author[];
    doi?: string;
    arxivId?: string;
    url?: string;
    publishedDate?: Date;
    source: PaperSource;
    categories?: string[];
    citations?: number;
    references?: string[];
    contentHash?: string;
  }): Publication {
    const now = new Date();
    
    // Build props object, only including defined values
    const props: PublicationProps = {
      title: data.title,
      type: data.arxivId ? 'preprint' : 'paper',
      source: data.source,
      ingestionDate: now,
      lastUpdated: now,
      processingStatus: 'ingested',
    };

    // Add optional properties only if defined
    if (data.abstract !== undefined) props.abstract = data.abstract;
    if (data.doi !== undefined) props.doi = data.doi;
    if (data.arxivId !== undefined) props.arxivId = data.arxivId;
    if (data.url !== undefined) props.url = data.url;
    if (data.authors !== undefined) props.authors = data.authors;
    if (data.categories !== undefined) props.categories = data.categories;
    if (data.citations !== undefined) props.citations = data.citations;
    if (data.references !== undefined) props.references = data.references;
    if (data.publishedDate !== undefined) {
      props.publishedDate = data.publishedDate;
      props.year = data.publishedDate.getFullYear().toString();
    }
    if (data.contentHash !== undefined) props.contentHash = data.contentHash;

    const id = EntityId.create('pub');
    return new Publication(id, props, undefined, undefined);
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this._id.value,
      entityType: 'Publication',
      title: this._props.title,
      type: this._props.type,
      venue: this._props.venue,
      year: this._props.year,
      url: this._props.url,
      abstract: this._props.abstract,
      citations: this._props.citations,
      doi: this._props.doi,
      // v3 fields
      arxivId: this._props.arxivId,
      source: this._props.source,
      authors: this._props.authors,
      categories: this._props.categories,
      references: this._props.references,
      publishedDate: this._props.publishedDate?.toISOString(),
      ingestionDate: this._props.ingestionDate?.toISOString(),
      lastUpdated: this._props.lastUpdated?.toISOString(),
      contentHash: this._props.contentHash,
      processingStatus: this._props.processingStatus,
      confidence: this._confidence?.value,
      embedding: this._embedding,
    };
  }
}
