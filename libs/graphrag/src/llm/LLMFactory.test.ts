import { beforeEach, describe, expect, it } from 'vitest';
import { BaseLLMClient, type LLMClientConfig } from './BaseLLMClient.js';
import { LLMFactory, LLMRegistry } from './LLMFactory.js';
import type {
  ChatMessage,
  EmbeddingOptions,
  EmbeddingResponse,
  LLMCompletionOptions,
  LLMCompletionResponse,
  LLMProvider,
  LLMStreamChunk,
} from './types.js';

// Test implementation
class MockLLMClient extends BaseLLMClient {
  get provider(): LLMProvider {
    return 'openai';
  }

  protected async doChat(
    _messages: ChatMessage[],
    _options?: LLMCompletionOptions
  ): Promise<LLMCompletionResponse> {
    return {
      id: 'mock-id',
      model: this._modelName,
      created: Date.now(),
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Mock response' },
          finishReason: 'stop',
        },
      ],
      get content() {
        return this.choices[0]?.message.content ?? null;
      },
    };
  }

  protected async *doChatStream(
    _messages: ChatMessage[],
    _options?: LLMCompletionOptions
  ): AsyncGenerator<LLMStreamChunk> {
    yield {
      id: 'chunk-1',
      model: this._modelName,
      choices: [{ index: 0, delta: { content: 'Hello' }, finishReason: null }],
    };
  }

  protected async doEmbed(
    texts: string[],
    _options?: EmbeddingOptions
  ): Promise<EmbeddingResponse> {
    return {
      model: this._modelName,
      data: texts.map((_, i) => ({
        index: i,
        embedding: Array(1536).fill(0.1),
      })),
      dimension: 1536,
    };
  }
}

describe('LLMRegistry', () => {
  beforeEach(() => {
    // Clear registry before each test
    LLMRegistry.clear();
  });

  describe('register', () => {
    it('should register a provider factory', () => {
      const factory = (config: LLMClientConfig) => new MockLLMClient(config);
      LLMRegistry.register('openai', factory);

      expect(LLMRegistry.has('openai')).toBe(true);
    });

    it('should overwrite existing provider', () => {
      const factory1 = (config: LLMClientConfig) => new MockLLMClient(config);
      const factory2 = (config: LLMClientConfig) =>
        new MockLLMClient({ ...config, modelName: 'v2' });

      LLMRegistry.register('openai', factory1);
      LLMRegistry.register('openai', factory2);

      const client = LLMRegistry.create('openai', { modelName: 'test' });
      expect(client.getModelName()).toBe('v2');
    });
  });

  describe('create', () => {
    it('should create client for registered provider', () => {
      LLMRegistry.register('openai', (config) => new MockLLMClient(config));

      const client = LLMRegistry.create('openai', { modelName: 'gpt-4' });

      expect(client).toBeInstanceOf(MockLLMClient);
      expect(client.getModelName()).toBe('gpt-4');
    });

    it('should throw for unregistered provider', () => {
      expect(() => {
        LLMRegistry.create('unknown-provider' as LLMProvider, { modelName: 'test' });
      }).toThrow('Provider not registered: unknown-provider');
    });
  });

  describe('getProviders', () => {
    it('should return list of registered providers', () => {
      LLMRegistry.register('openai', (c) => new MockLLMClient(c));
      LLMRegistry.register('anthropic', (c) => new MockLLMClient(c));

      const providers = LLMRegistry.getProviders();

      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
    });
  });

  describe('has', () => {
    it('should return true for registered provider', () => {
      LLMRegistry.register('openai', (c) => new MockLLMClient(c));
      expect(LLMRegistry.has('openai')).toBe(true);
    });

    it('should return false for unregistered provider', () => {
      expect(LLMRegistry.has('unknown' as LLMProvider)).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all registered providers', () => {
      LLMRegistry.register('openai', (c) => new MockLLMClient(c));
      LLMRegistry.register('anthropic', (c) => new MockLLMClient(c));

      LLMRegistry.clear();

      expect(LLMRegistry.getProviders()).toHaveLength(0);
    });
  });
});

describe('LLMFactory', () => {
  beforeEach(() => {
    LLMRegistry.clear();
    LLMRegistry.register('openai', (config) => new MockLLMClient(config));
    LLMRegistry.register('anthropic', (config) => new MockLLMClient(config));
  });

  describe('createLanguageModel', () => {
    it('should create language model client', () => {
      const client = LLMFactory.createLanguageModel('openai', 'gpt-4', {
        apiKey: 'test-key',
      });

      expect(client).toBeInstanceOf(MockLLMClient);
      expect(client.getModelName()).toBe('gpt-4');
    });

    it('should pass configuration options', () => {
      const client = LLMFactory.createLanguageModel('openai', 'gpt-4', {
        temperature: 0.5,
        maxTokens: 2000,
      });

      expect(client.getModelName()).toBe('gpt-4');
    });
  });

  describe('createEmbedding', () => {
    it('should create embedding client', () => {
      const client = LLMFactory.createEmbedding('openai', 'text-embedding-3-small', {
        apiKey: 'test-key',
      });

      expect(client).toBeInstanceOf(MockLLMClient);
      expect(client.getModelName()).toBe('text-embedding-3-small');
    });

    it('should set embedding dimension', () => {
      const client = LLMFactory.createEmbedding('openai', 'text-embedding-3-small', {
        embeddingDimension: 512,
      });

      expect(client.getEmbeddingDimension()).toBe(512);
    });
  });

  describe('getAvailableProviders', () => {
    it('should return map of available providers', () => {
      const providers = LLMFactory.getAvailableProviders();

      expect(providers.language).toContain('openai');
      expect(providers.language).toContain('anthropic');
      expect(providers.embedding).toContain('openai');
    });
  });

  describe('isProviderAvailable', () => {
    it('should return true for registered provider', () => {
      expect(LLMFactory.isProviderAvailable('openai')).toBe(true);
    });

    it('should return false for unregistered provider', () => {
      expect(LLMFactory.isProviderAvailable('unknown' as LLMProvider)).toBe(false);
    });
  });
});
