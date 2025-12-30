import { Confidence } from '../value-objects/Confidence.js';
import { EntityId } from '../value-objects/EntityId.js';

/**
 * Technique categories
 */
export type TechniqueCategory =
  | 'architecture'
  | 'training'
  | 'optimization'
  | 'attention'
  | 'normalization'
  | 'regularization'
  | 'sampling'
  | 'prompting'
  | 'fine_tuning'
  | 'alignment'
  | 'other';

/**
 * Properties for creating a new Technique
 */
export interface TechniqueProps {
  name: string;
  category: TechniqueCategory;
  description?: string;
  paperUrl?: string;
  year?: string;
  confidence?: number;
  embedding?: number[];
}

/**
 * Technique Entity
 *
 * Represents a technique, method, or approach in AI research.
 */
export class Technique {
  private constructor(
    private readonly _id: EntityId,
    private readonly _props: TechniqueProps,
    private readonly _confidence?: Confidence,
    private readonly _embedding?: number[]
  ) {}

  get id(): EntityId {
    return this._id;
  }

  get name(): string {
    return this._props.name;
  }

  get category(): TechniqueCategory {
    return this._props.category;
  }

  get description(): string | undefined {
    return this._props.description;
  }

  get paperUrl(): string | undefined {
    return this._props.paperUrl;
  }

  get year(): string | undefined {
    return this._props.year;
  }

  get confidence(): Confidence | undefined {
    return this._confidence;
  }

  get embedding(): number[] | undefined {
    return this._embedding ? [...this._embedding] : undefined;
  }

  static create(props: TechniqueProps): Technique {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Technique name is required');
    }

    const id = EntityId.create('tech');
    const confidence =
      props.confidence !== undefined ? Confidence.create(props.confidence) : undefined;

    return new Technique(id, props, confidence, props.embedding);
  }

  static restore(id: EntityId, props: TechniqueProps): Technique {
    const confidence =
      props.confidence !== undefined ? Confidence.create(props.confidence) : undefined;
    return new Technique(id, props, confidence, props.embedding);
  }

  updateConfidence(confidence: Confidence): Technique {
    return new Technique(this._id, this._props, confidence, this._embedding);
  }

  setEmbedding(embedding: number[]): Technique {
    return new Technique(this._id, this._props, this._confidence, embedding);
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this._id.value,
      entityType: 'Technique',
      name: this._props.name,
      category: this._props.category,
      description: this._props.description,
      paperUrl: this._props.paperUrl,
      year: this._props.year,
      confidence: this._confidence?.value,
      embedding: this._embedding,
    };
  }
}
