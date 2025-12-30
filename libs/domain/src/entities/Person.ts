import { Confidence } from '../value-objects/Confidence.js';
import { EntityId } from '../value-objects/EntityId.js';

/**
 * Properties for creating a new Person
 */
export interface PersonProps {
  name: string;
  affiliation?: string;
  country?: string;
  hIndex?: number;
  orcid?: string;
  googleScholarId?: string;
  confidence?: number;
  embedding?: number[];
}

/**
 * Person Entity
 *
 * Represents a researcher or contributor in the knowledge graph.
 */
export class Person {
  private constructor(
    private readonly _id: EntityId,
    private readonly _props: PersonProps,
    private readonly _confidence?: Confidence,
    private readonly _embedding?: number[]
  ) {}

  get id(): EntityId {
    return this._id;
  }

  get name(): string {
    return this._props.name;
  }

  get affiliation(): string | undefined {
    return this._props.affiliation;
  }

  get country(): string | undefined {
    return this._props.country;
  }

  get hIndex(): number | undefined {
    return this._props.hIndex;
  }

  get orcid(): string | undefined {
    return this._props.orcid;
  }

  get googleScholarId(): string | undefined {
    return this._props.googleScholarId;
  }

  get confidence(): Confidence | undefined {
    return this._confidence;
  }

  get embedding(): number[] | undefined {
    return this._embedding ? [...this._embedding] : undefined;
  }

  static create(props: PersonProps): Person {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Person name is required');
    }

    const id = EntityId.create('person');
    const confidence =
      props.confidence !== undefined ? Confidence.create(props.confidence) : undefined;

    return new Person(id, props, confidence, props.embedding);
  }

  static restore(id: EntityId, props: PersonProps): Person {
    const confidence =
      props.confidence !== undefined ? Confidence.create(props.confidence) : undefined;
    return new Person(id, props, confidence, props.embedding);
  }

  updateConfidence(confidence: Confidence): Person {
    return new Person(this._id, this._props, confidence, this._embedding);
  }

  setEmbedding(embedding: number[]): Person {
    return new Person(this._id, this._props, this._confidence, embedding);
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this._id.value,
      entityType: 'Person',
      name: this._props.name,
      affiliation: this._props.affiliation,
      country: this._props.country,
      hIndex: this._props.hIndex,
      orcid: this._props.orcid,
      googleScholarId: this._props.googleScholarId,
      confidence: this._confidence?.value,
      embedding: this._embedding,
    };
  }
}
