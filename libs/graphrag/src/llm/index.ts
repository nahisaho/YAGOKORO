// LLM module exports
// Inspired by Esperanto's unified interface pattern

// Types
export type {
  LLMProvider,
  MessageRole,
  ChatMessage,
  ToolDefinition,
  ToolCall,
  StructuredOutput,
  LLMCompletionOptions,
  TokenUsage,
  FinishReason,
  LLMChoice,
  StreamDelta,
  LLMStreamChunk,
  LLMCompletionResponse,
  EmbeddingOptions,
  EmbeddingTaskType,
  EmbeddingData,
  EmbeddingResponse,
  LLMProviderConfig,
  ModelInfo,
} from './types.js';

// Base class and factory
export { BaseLLMClient, type LLMClientConfig } from './BaseLLMClient.js';
export {
  LLMFactory,
  LLMRegistry,
  type LLMClientFactory,
  type AvailableProviders,
} from './LLMFactory.js';

// Provider implementations
export { OpenAIClient, type OpenAIConfig } from './OpenAIClient.js';
export { AnthropicClient, type AnthropicConfig } from './AnthropicClient.js';

import { AnthropicClient } from './AnthropicClient.js';
// Register default providers
import { LLMRegistry } from './LLMFactory.js';
import { OpenAIClient } from './OpenAIClient.js';

// Auto-register providers on module load
LLMRegistry.register('openai', (config) => new OpenAIClient(config));
LLMRegistry.register('anthropic', (config) => new AnthropicClient(config));
