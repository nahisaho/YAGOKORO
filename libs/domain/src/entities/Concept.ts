import { Confidence } from '../value-objects/Confidence.js';
import { EntityId } from '../value-objects/EntityId.js';

/**
 * Concept categories
 */
export type ConceptCategory =
  | 'architecture'
  | 'training'
  | 'theory'
  | 'application'
  | 'safety'
  | 'ethics'
  | 'capability'
  | 'limitation'
  | 'other';

/**
 * Properties for creating a new Concept
 */
export interface ConceptProps {
  name: string;
  category: ConceptCategory;
  description?: string;
  relatedTerms?: string[];
  confidence?: number;
  embedding?: number[];
}

/**
 * Concept Entity
 *
 * Represents an abstract concept or idea in the knowledge graph.
 */
export class Concept {
  private constructor(
    private readonly _id: EntityId,
    private readonly _props: ConceptProps,
    private readonly _confidence?: Confidence,
    private readonly _embedding?: number[]
  ) {}

  get id(): EntityId {
    return this._id;
  }

  get name(): string {
    return this._props.name;
  }

  get category(): ConceptCategory {
    return this._props.category;
  }

  get description(): string | undefined {
    return this._props.description;
  }

  get relatedTerms(): string[] {
    return this._props.relatedTerms ? [...this._props.relatedTerms] : [];
  }

  get confidence(): Confidence | undefined {
    return this._confidence;
  }

  get embedding(): number[] | undefined {
    return this._embedding ? [...this._embedding] : undefined;
  }

  static create(props: ConceptProps): Concept {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Concept name is required');
    }

    const id = EntityId.create('concept');
    const confidence =
      props.confidence !== undefined ? Confidence.create(props.confidence) : undefined;

    return new Concept(id, props, confidence, props.embedding);
  }

  static restore(id: EntityId, props: ConceptProps): Concept {
    const confidence =
      props.confidence !== undefined ? Confidence.create(props.confidence) : undefined;
    return new Concept(id, props, confidence, props.embedding);
  }

  updateConfidence(confidence: Confidence): Concept {
    return new Concept(this._id, this._props, confidence, this._embedding);
  }

  setEmbedding(embedding: number[]): Concept {
    return new Concept(this._id, this._props, this._confidence, embedding);
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this._id.value,
      entityType: 'Concept',
      name: this._props.name,
      category: this._props.category,
      description: this._props.description,
      relatedTerms: this._props.relatedTerms,
      confidence: this._confidence?.value,
      embedding: this._embedding,
    };
  }
}
