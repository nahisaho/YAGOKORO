import { Confidence } from '../value-objects/Confidence.js';
import { EntityId } from '../value-objects/EntityId.js';

/**
 * Benchmark categories
 */
export type BenchmarkCategory =
  | 'reasoning'
  | 'language'
  | 'code'
  | 'math'
  | 'vision'
  | 'multimodal'
  | 'safety'
  | 'general'
  | 'other';

/**
 * Properties for creating a new Benchmark
 */
export interface BenchmarkProps {
  name: string;
  category: BenchmarkCategory;
  description?: string;
  url?: string;
  metric?: string;
  confidence?: number;
  embedding?: number[];
}

/**
 * Benchmark Entity
 *
 * Represents an evaluation benchmark in the knowledge graph.
 */
export class Benchmark {
  private constructor(
    private readonly _id: EntityId,
    private readonly _props: BenchmarkProps,
    private readonly _confidence?: Confidence,
    private readonly _embedding?: number[]
  ) {}

  get id(): EntityId {
    return this._id;
  }

  get name(): string {
    return this._props.name;
  }

  get category(): BenchmarkCategory {
    return this._props.category;
  }

  get description(): string | undefined {
    return this._props.description;
  }

  get url(): string | undefined {
    return this._props.url;
  }

  get metric(): string | undefined {
    return this._props.metric;
  }

  get confidence(): Confidence | undefined {
    return this._confidence;
  }

  get embedding(): number[] | undefined {
    return this._embedding ? [...this._embedding] : undefined;
  }

  static create(props: BenchmarkProps): Benchmark {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Benchmark name is required');
    }

    const id = EntityId.create('bench');
    const confidence =
      props.confidence !== undefined ? Confidence.create(props.confidence) : undefined;

    return new Benchmark(id, props, confidence, props.embedding);
  }

  static restore(id: EntityId, props: BenchmarkProps): Benchmark {
    const confidence =
      props.confidence !== undefined ? Confidence.create(props.confidence) : undefined;
    return new Benchmark(id, props, confidence, props.embedding);
  }

  updateConfidence(confidence: Confidence): Benchmark {
    return new Benchmark(this._id, this._props, confidence, this._embedding);
  }

  setEmbedding(embedding: number[]): Benchmark {
    return new Benchmark(this._id, this._props, this._confidence, embedding);
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this._id.value,
      entityType: 'Benchmark',
      name: this._props.name,
      category: this._props.category,
      description: this._props.description,
      url: this._props.url,
      metric: this._props.metric,
      confidence: this._confidence?.value,
      embedding: this._embedding,
    };
  }
}
