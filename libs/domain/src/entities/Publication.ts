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
      confidence: this._confidence?.value,
      embedding: this._embedding,
    };
  }
}
