import type {
  ChatMessage,
  EmbeddingOptions,
  EmbeddingResponse,
  LLMCompletionOptions,
  LLMCompletionResponse,
  LLMProvider,
  LLMStreamChunk,
} from './types.js';

/**
 * LLM Client interface for graphrag package
 * This extends the domain's LLMClient with more advanced features
 */
export interface GraphRAGLLMClient {
  /**
   * Generate a chat completion with full response
   */
  chat(messages: ChatMessage[], options?: LLMCompletionOptions): Promise<LLMCompletionResponse>;

  /**
   * Generate embeddings for text
   */
  embed(text: string): Promise<{ embedding: number[]; dimension: number }>;

  /**
   * Generate embeddings for multiple texts in a batch
   */
  embedMany(texts: string[]): Promise<Array<{ embedding: number[]; dimension: number }>>;

  /**
   * Get the model name
   */
  getModelName(): string;

  /**
   * Get the embedding dimension for the model
   */
  getEmbeddingDimension(): number;
}

/**
 * Configuration for LLM client
 */
export interface LLMClientConfig {
  /** Model name */
  modelName: string;
  /** API key */
  apiKey?: string;
  /** Base URL for custom endpoints */
  baseUrl?: string;
  /** Organization ID */
  organization?: string;
  /** Default temperature */
  temperature?: number;
  /** Default max tokens */
  maxTokens?: number;
  /** Default timeout in milliseconds */
  timeout?: number;
  /** Embedding dimension (for embedding models) */
  embeddingDimension?: number;
  /** Additional provider-specific options */
  options?: Record<string, unknown>;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  temperature: 0.7,
  maxTokens: 4096,
  timeout: 60000, // 60 seconds
  embeddingDimension: 1536, // OpenAI text-embedding-3-small default
} as const;

/**
 * Base class for LLM clients
 *
 * Inspired by Esperanto's unified interface pattern.
 * Provides a consistent API across different LLM providers
 * (OpenAI, Anthropic, Google, Ollama, etc.)
 *
 * @example
 * ```typescript
 * class OpenAIClient extends BaseLLMClient {
 *   protected async doChat(messages, options) {
 *     // OpenAI-specific implementation
 *   }
 *   protected async doEmbed(texts) {
 *     // OpenAI-specific embedding
 *   }
 * }
 * ```
 */
export abstract class BaseLLMClient implements GraphRAGLLMClient {
  protected readonly _modelName: string;
  protected readonly _apiKey?: string;
  protected readonly _baseUrl?: string;
  protected readonly _organization?: string;
  protected readonly _temperature: number;
  protected readonly _maxTokens: number;
  protected readonly _timeout: number;
  protected readonly _embeddingDimension: number;
  protected readonly _options: Record<string, unknown>;

  constructor(config: LLMClientConfig) {
    this._modelName = config.modelName;
    if (config.apiKey !== undefined) {
      this._apiKey = config.apiKey;
    }
    if (config.baseUrl !== undefined) {
      this._baseUrl = config.baseUrl;
    }
    if (config.organization !== undefined) {
      this._organization = config.organization;
    }
    this._temperature = config.temperature ?? DEFAULT_CONFIG.temperature;
    this._maxTokens = config.maxTokens ?? DEFAULT_CONFIG.maxTokens;
    this._timeout = config.timeout ?? DEFAULT_CONFIG.timeout;
    this._embeddingDimension = config.embeddingDimension ?? DEFAULT_CONFIG.embeddingDimension;
    this._options = config.options ?? {};
  }

  /**
   * Get the provider name
   */
  abstract get provider(): LLMProvider | string;

  /**
   * Get model name
   */
  get modelName(): string {
    return this._modelName;
  }

  /**
   * LLMClient interface: Get model name
   */
  getModelName(): string {
    return this._modelName;
  }

  /**
   * LLMClient interface: Get embedding dimension
   */
  getEmbeddingDimension(): number {
    return this._embeddingDimension;
  }

  /**
   * Generate a chat completion
   *
   * @param messages - Chat messages
   * @param options - Completion options
   * @returns Standardized completion response
   */
  async chat(
    messages: ChatMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMCompletionResponse> {
    const mergedOptions = this.mergeOptions(options);
    return this.doChat(messages, mergedOptions);
  }

  /**
   * Generate a streaming chat completion
   *
   * @param messages - Chat messages
   * @param options - Completion options
   * @yields Stream chunks
   */
  async *chatStream(
    messages: ChatMessage[],
    options?: LLMCompletionOptions
  ): AsyncGenerator<LLMStreamChunk> {
    const mergedOptions = this.mergeOptions({ ...options, stream: true });
    yield* this.doChatStream(messages, mergedOptions);
  }

  /**
   * LLMClient interface: Generate embedding for single text
   *
   * @param text - Text to embed
   * @returns Embedding response
   */
  async embed(text: string): Promise<{ embedding: number[]; dimension: number }> {
    const response = await this.doEmbed([text]);
    const firstData = response.data[0];
    if (!firstData) {
      throw new Error('No embedding data returned');
    }
    return {
      embedding: firstData.embedding,
      dimension: response.dimension,
    };
  }

  /**
   * LLMClient interface: Generate embeddings for multiple texts
   *
   * @param texts - Texts to embed
   * @returns Array of embedding responses
   */
  async embedMany(texts: string[]): Promise<Array<{ embedding: number[]; dimension: number }>> {
    const response = await this.doEmbed(texts);
    return response.data.map((d) => ({
      embedding: d.embedding,
      dimension: response.dimension,
    }));
  }

  /**
   * Generate embeddings with full response
   *
   * @param texts - Texts to embed
   * @param options - Embedding options
   * @returns Full embedding response
   */
  async embedWithMetadata(texts: string[], options?: EmbeddingOptions): Promise<EmbeddingResponse> {
    return this.doEmbed(texts, options);
  }

  /**
   * Merge default options with provided options
   */
  protected mergeOptions(options?: LLMCompletionOptions): LLMCompletionOptions {
    return {
      temperature: options?.temperature ?? this._temperature,
      maxTokens: options?.maxTokens ?? this._maxTokens,
      timeout: options?.timeout ?? this._timeout,
      ...options,
    };
  }

  /**
   * Provider-specific chat implementation
   * Must be implemented by concrete classes
   */
  protected abstract doChat(
    messages: ChatMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMCompletionResponse>;

  /**
   * Provider-specific streaming chat implementation
   * Must be implemented by concrete classes
   */
  protected abstract doChatStream(
    messages: ChatMessage[],
    options?: LLMCompletionOptions
  ): AsyncGenerator<LLMStreamChunk>;

  /**
   * Provider-specific embedding implementation
   * Must be implemented by concrete classes
   */
  protected abstract doEmbed(
    texts: string[],
    options?: EmbeddingOptions
  ): Promise<EmbeddingResponse>;
}
