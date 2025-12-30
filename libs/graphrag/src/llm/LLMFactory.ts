import type { BaseLLMClient, LLMClientConfig } from './BaseLLMClient.js';
import type { LLMProvider, LLMProviderConfig } from './types.js';

/**
 * Factory function type for creating LLM clients
 */
export type LLMClientFactory = (config: LLMClientConfig) => BaseLLMClient;

/**
 * LLM Provider Registry
 *
 * Manages registration and instantiation of LLM provider implementations.
 * Inspired by Esperanto's factory pattern for provider-agnostic model creation.
 *
 * @example
 * ```typescript
 * // Register a provider
 * LLMRegistry.register('openai', (config) => new OpenAIClient(config));
 *
 * // Create a client
 * const client = LLMRegistry.create('openai', { modelName: 'gpt-4' });
 * ```
 */
export class LLMRegistry {
  private static providers = new Map<string, LLMClientFactory>();

  /**
   * Register a provider factory
   *
   * @param provider - Provider identifier
   * @param factory - Factory function to create client instances
   */
  static register(provider: LLMProvider | string, factory: LLMClientFactory): void {
    LLMRegistry.providers.set(provider, factory);
  }

  /**
   * Create a client for a registered provider
   *
   * @param provider - Provider identifier
   * @param config - Client configuration
   * @returns LLM client instance
   * @throws Error if provider is not registered
   */
  static create(provider: LLMProvider | string, config: LLMClientConfig): BaseLLMClient {
    const factory = LLMRegistry.providers.get(provider);
    if (!factory) {
      throw new Error(`Provider not registered: ${provider}`);
    }
    return factory(config);
  }

  /**
   * Check if a provider is registered
   */
  static has(provider: LLMProvider | string): boolean {
    return LLMRegistry.providers.has(provider);
  }

  /**
   * Get list of registered providers
   */
  static getProviders(): string[] {
    return Array.from(LLMRegistry.providers.keys());
  }

  /**
   * Clear all registered providers (useful for testing)
   */
  static clear(): void {
    LLMRegistry.providers.clear();
  }
}

/**
 * Available provider types
 */
export interface AvailableProviders {
  language: string[];
  embedding: string[];
  speechToText: string[];
  textToSpeech: string[];
}

/**
 * LLM Factory
 *
 * High-level factory for creating LLM clients with a unified interface.
 * Inspired by Esperanto's AIFactory pattern.
 *
 * @example
 * ```typescript
 * // Create a language model
 * const llm = LLMFactory.createLanguageModel('openai', 'gpt-4', {
 *   apiKey: 'your-api-key',
 *   temperature: 0.7,
 * });
 *
 * // Create an embedding model
 * const embedder = LLMFactory.createEmbedding('openai', 'text-embedding-3-small');
 *
 * // Check available providers
 * const providers = LLMFactory.getAvailableProviders();
 * ```
 */
export class LLMFactory {
  /**
   * Create a language model client
   *
   * @param provider - Provider name (openai, anthropic, etc.)
   * @param modelName - Model identifier
   * @param config - Optional configuration
   * @returns LLM client instance
   */
  static createLanguageModel(
    provider: LLMProvider | string,
    modelName: string,
    config?: Partial<LLMProviderConfig>
  ): BaseLLMClient {
    const clientConfig: LLMClientConfig = { modelName };
    if (config?.apiKey !== undefined) clientConfig.apiKey = config.apiKey;
    if (config?.baseUrl !== undefined) clientConfig.baseUrl = config.baseUrl;
    if (config?.organization !== undefined) clientConfig.organization = config.organization;
    if (config?.temperature !== undefined) clientConfig.temperature = config.temperature;
    if (config?.maxTokens !== undefined) clientConfig.maxTokens = config.maxTokens;
    if (config?.timeout !== undefined) clientConfig.timeout = config.timeout;
    if (config?.options !== undefined) clientConfig.options = config.options;
    return LLMRegistry.create(provider, clientConfig);
  }

  /**
   * Create an embedding model client
   *
   * @param provider - Provider name
   * @param modelName - Model identifier
   * @param config - Optional configuration
   * @returns LLM client instance configured for embeddings
   */
  static createEmbedding(
    provider: LLMProvider | string,
    modelName: string,
    config?: Partial<LLMProviderConfig> & { embeddingDimension?: number }
  ): BaseLLMClient {
    const clientConfig: LLMClientConfig = { modelName };
    if (config?.apiKey !== undefined) clientConfig.apiKey = config.apiKey;
    if (config?.baseUrl !== undefined) clientConfig.baseUrl = config.baseUrl;
    if (config?.organization !== undefined) clientConfig.organization = config.organization;
    if (config?.timeout !== undefined) clientConfig.timeout = config.timeout;
    if (config?.embeddingDimension !== undefined) clientConfig.embeddingDimension = config.embeddingDimension;
    if (config?.options !== undefined) clientConfig.options = config.options;
    return LLMRegistry.create(provider, clientConfig);
  }

  /**
   * Get map of available providers by capability
   *
   * @returns Object with provider lists by capability
   */
  static getAvailableProviders(): AvailableProviders {
    const providers = LLMRegistry.getProviders();
    // For now, all registered providers support both language and embedding
    // In future, this could be enhanced to track capabilities per provider
    return {
      language: providers,
      embedding: providers,
      speechToText: [], // Not yet implemented
      textToSpeech: [], // Not yet implemented
    };
  }

  /**
   * Check if a provider is available
   *
   * @param provider - Provider name
   * @returns true if provider is registered
   */
  static isProviderAvailable(provider: LLMProvider | string): boolean {
    return LLMRegistry.has(provider);
  }
}
