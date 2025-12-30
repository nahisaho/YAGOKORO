/**
 * Chat message role
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Chat message
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * LLM completion options
 */
export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
}

/**
 * LLM completion response
 */
export interface CompletionResponse {
  content: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Embedding response
 */
export interface EmbeddingResponse {
  embedding: number[];
  dimension: number;
}

/**
 * LLM Client Port (Output Port)
 *
 * Defines the interface for interacting with Large Language Models.
 * This is implemented by LLM adapters (OpenAI, Anthropic, etc.).
 */
export interface LLMClient {
  /**
   * Generate a chat completion
   */
  chat(messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResponse>;

  /**
   * Generate embeddings for text
   */
  embed(text: string): Promise<EmbeddingResponse>;

  /**
   * Generate embeddings for multiple texts in a batch
   */
  embedMany(texts: string[]): Promise<EmbeddingResponse[]>;

  /**
   * Get the model name
   */
  getModelName(): string;

  /**
   * Get the embedding dimension for the model
   */
  getEmbeddingDimension(): number;
}
