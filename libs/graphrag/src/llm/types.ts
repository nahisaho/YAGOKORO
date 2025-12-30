/**
 * LLM Types - Esperanto-inspired unified interface types
 *
 * Provides standardized types for interacting with various LLM providers
 * (OpenAI, Anthropic, Google, Ollama, etc.)
 */

/**
 * Supported LLM providers
 */
export type LLMProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'ollama'
  | 'openai-compatible'
  | 'azure'
  | 'groq'
  | 'mistral'
  | 'deepseek';

/**
 * Chat message role
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * Chat message structure
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
  name?: string;
  toolCallId?: string;
}

/**
 * Tool/Function definition for function calling
 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * Tool call in assistant response
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Structured output configuration
 */
export interface StructuredOutput {
  type: 'json' | 'json_schema';
  schema?: Record<string, unknown>;
}

/**
 * LLM completion options
 */
export interface LLMCompletionOptions {
  /** Temperature for sampling (0.0 - 2.0) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Top-p (nucleus) sampling */
  topP?: number;
  /** Stop sequences */
  stopSequences?: string[];
  /** Enable streaming */
  stream?: boolean;
  /** Structured output configuration */
  structured?: StructuredOutput;
  /** Tools/functions available */
  tools?: ToolDefinition[];
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Token usage information
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Finish reason for completion
 */
export type FinishReason = 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';

/**
 * Choice in LLM response (following OpenAI structure)
 */
export interface LLMChoice {
  index: number;
  message: {
    role: 'assistant';
    content: string | null;
    toolCalls?: ToolCall[];
  };
  finishReason: FinishReason;
}

/**
 * Streaming delta in chunk
 */
export interface StreamDelta {
  role?: 'assistant';
  content?: string;
  toolCalls?: Partial<ToolCall>[];
}

/**
 * Streaming chunk
 */
export interface LLMStreamChunk {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    delta: StreamDelta;
    finishReason: FinishReason | null;
  }>;
}

/**
 * Standardized LLM completion response
 */
export interface LLMCompletionResponse {
  /** Unique response ID */
  id: string;
  /** Model used */
  model: string;
  /** Timestamp of creation */
  created: number;
  /** Response choices */
  choices: LLMChoice[];
  /** Token usage */
  usage?: TokenUsage;
  /** Shortcut to first choice content */
  readonly content: string | null;
}

/**
 * Embedding options
 */
export interface EmbeddingOptions {
  /** Embedding task type for optimization */
  taskType?: EmbeddingTaskType;
  /** Desired output dimensions (if model supports) */
  dimensions?: number;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Embedding task types (inspired by Esperanto)
 */
export type EmbeddingTaskType =
  | 'retrieval_query'
  | 'retrieval_document'
  | 'similarity'
  | 'classification'
  | 'clustering'
  | 'code_retrieval'
  | 'question_answering'
  | 'fact_verification';

/**
 * Single embedding data
 */
export interface EmbeddingData {
  index: number;
  embedding: number[];
}

/**
 * Standardized embedding response
 */
export interface EmbeddingResponse {
  /** Model used */
  model: string;
  /** Embedding data */
  data: EmbeddingData[];
  /** Token usage */
  usage?: TokenUsage;
  /** Embedding dimension */
  dimension: number;
}

/**
 * LLM provider configuration
 */
export interface LLMProviderConfig {
  /** API key */
  apiKey?: string;
  /** Base URL (for custom endpoints) */
  baseUrl?: string;
  /** Organization ID */
  organization?: string;
  /** Default model name */
  modelName?: string;
  /** Default temperature */
  temperature?: number;
  /** Default max tokens */
  maxTokens?: number;
  /** Default timeout in milliseconds */
  timeout?: number;
  /** Additional provider-specific options */
  options?: Record<string, unknown>;
}

/**
 * Model information
 */
export interface ModelInfo {
  id: string;
  provider: LLMProvider;
  displayName?: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  supportsStreaming?: boolean;
  supportsTools?: boolean;
  supportsStructuredOutput?: boolean;
}
