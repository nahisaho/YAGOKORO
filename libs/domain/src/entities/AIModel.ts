import { Confidence } from '../value-objects/Confidence.js';
import { EntityId } from '../value-objects/EntityId.js';

/**
 * AI Model categories in the Generative AI domain
 */
export type AIModelCategory =
  | 'llm' // Large Language Model
  | 'vlm' // Vision-Language Model
  | 'diffusion' // Diffusion Model
  | 'gan' // Generative Adversarial Network
  | 'vae' // Variational Autoencoder
  | 'transformer' // Transformer-based
  | 'multimodal' // Multimodal Model
  | 'agent' // AI Agent
  | 'other';

/**
 * Modalities supported by AI models
 */
export type AIModality = 'text' | 'image' | 'audio' | 'video' | 'code' | '3d';

/**
 * Properties for creating a new AIModel
 */
export interface AIModelProps {
  name: string;
  category: AIModelCategory;
  modality: AIModality[];
  releaseDate?: string;
  description?: string;
  parameters?: string;
  contextWindow?: number;
  trainingData?: string;
  license?: string;
  paperUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  confidence?: number;
  embedding?: number[];
}

/**
 * AIModel Entity
 *
 * Represents an AI model in the Generative AI genealogy knowledge graph.
 */
export class AIModel {
  private constructor(
    private readonly _id: EntityId,
    private readonly _props: AIModelProps,
    private readonly _confidence?: Confidence,
    private readonly _embedding?: number[]
  ) {}

  // Getters
  get id(): EntityId {
    return this._id;
  }

  get name(): string {
    return this._props.name;
  }

  get category(): AIModelCategory {
    return this._props.category;
  }

  get modality(): AIModality[] {
    return [...this._props.modality];
  }

  get releaseDate(): string | undefined {
    return this._props.releaseDate;
  }

  get description(): string | undefined {
    return this._props.description;
  }

  get parameters(): string | undefined {
    return this._props.parameters;
  }

  get contextWindow(): number | undefined {
    return this._props.contextWindow;
  }

  get trainingData(): string | undefined {
    return this._props.trainingData;
  }

  get license(): string | undefined {
    return this._props.license;
  }

  get paperUrl(): string | undefined {
    return this._props.paperUrl;
  }

  get githubUrl(): string | undefined {
    return this._props.githubUrl;
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

  /**
   * Create a new AIModel
   */
  static create(props: AIModelProps): AIModel {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('AIModel name is required');
    }

    const id = EntityId.create('model');
    const confidence =
      props.confidence !== undefined ? Confidence.create(props.confidence) : undefined;

    return new AIModel(id, props, confidence, props.embedding);
  }

  /**
   * Restore an AIModel from stored data
   */
  static restore(id: EntityId, props: AIModelProps): AIModel {
    const confidence =
      props.confidence !== undefined ? Confidence.create(props.confidence) : undefined;

    return new AIModel(id, props, confidence, props.embedding);
  }

  /**
   * Update the confidence score
   */
  updateConfidence(confidence: Confidence): AIModel {
    return new AIModel(this._id, this._props, confidence, this._embedding);
  }

  /**
   * Set the embedding vector
   */
  setEmbedding(embedding: number[]): AIModel {
    return new AIModel(this._id, this._props, this._confidence, embedding);
  }

  /**
   * Serialize to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this._id.value,
      entityType: 'AIModel',
      name: this._props.name,
      category: this._props.category,
      modality: this._props.modality,
      releaseDate: this._props.releaseDate,
      description: this._props.description,
      parameters: this._props.parameters,
      contextWindow: this._props.contextWindow,
      trainingData: this._props.trainingData,
      license: this._props.license,
      paperUrl: this._props.paperUrl,
      githubUrl: this._props.githubUrl,
      websiteUrl: this._props.websiteUrl,
      confidence: this._confidence?.value,
      embedding: this._embedding,
    };
  }
}
