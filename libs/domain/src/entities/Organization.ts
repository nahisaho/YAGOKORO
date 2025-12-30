import { Confidence } from '../value-objects/Confidence.js';
import { EntityId } from '../value-objects/EntityId.js';

/**
 * Organization types
 */
export type OrganizationType =
  | 'company'
  | 'research_lab'
  | 'university'
  | 'nonprofit'
  | 'government'
  | 'consortium'
  | 'other';

/**
 * Properties for creating a new Organization
 */
export interface OrganizationProps {
  name: string;
  type: OrganizationType;
  country?: string;
  founded?: string;
  description?: string;
  websiteUrl?: string;
  confidence?: number;
  embedding?: number[];
}

/**
 * Organization Entity
 *
 * Represents an organization (company, lab, university) in the knowledge graph.
 */
export class Organization {
  private constructor(
    private readonly _id: EntityId,
    private readonly _props: OrganizationProps,
    private readonly _confidence?: Confidence,
    private readonly _embedding?: number[]
  ) {}

  get id(): EntityId {
    return this._id;
  }

  get name(): string {
    return this._props.name;
  }

  get type(): OrganizationType {
    return this._props.type;
  }

  get country(): string | undefined {
    return this._props.country;
  }

  get founded(): string | undefined {
    return this._props.founded;
  }

  get description(): string | undefined {
    return this._props.description;
  }

  get websiteUrl(): string | undefined {
    return this._props.websiteUrl;
  }

  get confidence(): Confidence | undefined {
    return this._confidence;
  }

  get embedding(): number[] | undefined {
    return this._embedding ? [...this._embedding] : undefined;
  }

  static create(props: OrganizationProps): Organization {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Organization name is required');
    }

    const id = EntityId.create('org');
    const confidence =
      props.confidence !== undefined ? Confidence.create(props.confidence) : undefined;

    return new Organization(id, props, confidence, props.embedding);
  }

  static restore(id: EntityId, props: OrganizationProps): Organization {
    const confidence =
      props.confidence !== undefined ? Confidence.create(props.confidence) : undefined;
    return new Organization(id, props, confidence, props.embedding);
  }

  updateConfidence(confidence: Confidence): Organization {
    return new Organization(this._id, this._props, confidence, this._embedding);
  }

  setEmbedding(embedding: number[]): Organization {
    return new Organization(this._id, this._props, this._confidence, embedding);
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this._id.value,
      entityType: 'Organization',
      name: this._props.name,
      type: this._props.type,
      country: this._props.country,
      founded: this._props.founded,
      description: this._props.description,
      websiteUrl: this._props.websiteUrl,
      confidence: this._confidence?.value,
      embedding: this._embedding,
    };
  }
}
