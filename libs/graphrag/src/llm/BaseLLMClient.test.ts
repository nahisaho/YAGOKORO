import { beforeEach, describe, expect, it } from 'vitest';
import { BaseLLMClient } from './BaseLLMClient.js';
import type {
  ChatMessage,
  EmbeddingResponse,
  LLMCompletionOptions,
  LLMCompletionResponse,
  LLMStreamChunk,
} from './types.js';

/**
 * Concrete implementation for testing
 */
class TestLLMClient extends BaseLLMClient {
  public chatCalls: Array<{ messages: ChatMessage[]; options?: LLMCompletionOptions }> = [];
  public embedCalls: Array<{ texts: string[] }> = [];
  public mockResponse: LLMCompletionResponse | null = null;
  public mockEmbedding: EmbeddingResponse | null = null;

  protected async doChat(
    messages: ChatMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMCompletionResponse> {
    this.chatCalls.push({ messages, options });
    if (!this.mockResponse) {
      throw new Error('Mock response not set');
    }
    return this.mockResponse;
  }

  protected async *doChatStream(
    messages: ChatMessage[],
    _options?: LLMCompletionOptions
  ): AsyncGenerator<LLMStreamChunk> {
    this.chatCalls.push({ messages, options: _options });
    yield {
      id: 'chunk-1',
      model: this.modelName,
      choices: [
        {
          index: 0,
          delta: { content: 'Hello' },
          finishReason: null,
        },
      ],
    };
    yield {
      id: 'chunk-2',
      model: this.modelName,
      choices: [
        {
          index: 0,
          delta: { content: ' World' },
          finishReason: 'stop',
        },
      ],
    };
  }

  protected async doEmbed(texts: string[]): Promise<EmbeddingResponse> {
    this.embedCalls.push({ texts });
    if (!this.mockEmbedding) {
      throw new Error('Mock embedding not set');
    }
    return this.mockEmbedding;
  }

  get provider(): string {
    return 'test';
  }
}

describe('BaseLLMClient', () => {
  let client: TestLLMClient;

  beforeEach(() => {
    client = new TestLLMClient({
      modelName: 'test-model',
      apiKey: 'test-key',
    });
  });

  describe('configuration', () => {
    it('should return model name', () => {
      expect(client.getModelName()).toBe('test-model');
    });

    it('should return provider', () => {
      expect(client.provider).toBe('test');
    });

    it('should use default values', () => {
      const defaultClient = new TestLLMClient({
        modelName: 'default-model',
      });
      expect(defaultClient.getModelName()).toBe('default-model');
    });

    it('should accept custom timeout', () => {
      const customClient = new TestLLMClient({
        modelName: 'model',
        timeout: 30000,
      });
      expect(customClient.getModelName()).toBe('model');
    });
  });

  describe('chat', () => {
    it('should call doChat with messages', async () => {
      client.mockResponse = {
        id: 'resp-1',
        model: 'test-model',
        created: Date.now(),
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Hello!' },
            finishReason: 'stop',
          },
        ],
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        get content() {
          return this.choices[0]?.message.content ?? null;
        },
      };

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      const response = await client.chat(messages);

      expect(client.chatCalls).toHaveLength(1);
      expect(client.chatCalls[0].messages).toEqual(messages);
      expect(response.content).toBe('Hello!');
      expect(response.choices[0].finishReason).toBe('stop');
    });

    it('should pass options to doChat', async () => {
      client.mockResponse = {
        id: 'resp-2',
        model: 'test-model',
        created: Date.now(),
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Response' },
            finishReason: 'stop',
          },
        ],
        get content() {
          return this.choices[0]?.message.content ?? null;
        },
      };

      const messages: ChatMessage[] = [{ role: 'user', content: 'Test' }];
      const options: LLMCompletionOptions = {
        temperature: 0.7,
        maxTokens: 100,
      };

      await client.chat(messages, options);

      // Options are merged with defaults, so check individual values
      expect(client.chatCalls[0].options?.temperature).toBe(0.7);
      expect(client.chatCalls[0].options?.maxTokens).toBe(100);
    });
  });

  describe('chatStream', () => {
    it('should yield stream chunks', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];
      const chunks: LLMStreamChunk[] = [];

      for await (const chunk of client.chatStream(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0].choices[0].delta.content).toBe('Hello');
      expect(chunks[1].choices[0].delta.content).toBe(' World');
      expect(chunks[1].choices[0].finishReason).toBe('stop');
    });
  });

  describe('embed', () => {
    it('should generate embedding for single text', async () => {
      client.mockEmbedding = {
        model: 'test-model',
        data: [{ index: 0, embedding: [0.1, 0.2, 0.3] }],
        dimension: 3,
      };

      const response = await client.embed('Hello');

      expect(client.embedCalls).toHaveLength(1);
      expect(client.embedCalls[0].texts).toEqual(['Hello']);
      expect(response.embedding).toEqual([0.1, 0.2, 0.3]);
      expect(response.dimension).toBe(3);
    });
  });

  describe('embedMany', () => {
    it('should generate embeddings for multiple texts', async () => {
      client.mockEmbedding = {
        model: 'test-model',
        data: [
          { index: 0, embedding: [0.1, 0.2] },
          { index: 1, embedding: [0.3, 0.4] },
        ],
        dimension: 2,
      };

      const responses = await client.embedMany(['Hello', 'World']);

      expect(client.embedCalls).toHaveLength(1);
      expect(client.embedCalls[0].texts).toEqual(['Hello', 'World']);
      expect(responses).toHaveLength(2);
      expect(responses[0].embedding).toEqual([0.1, 0.2]);
      expect(responses[1].embedding).toEqual([0.3, 0.4]);
    });
  });

  describe('getEmbeddingDimension', () => {
    it('should return configured dimension', () => {
      const customClient = new TestLLMClient({
        modelName: 'model',
        embeddingDimension: 1536,
      });
      expect(customClient.getEmbeddingDimension()).toBe(1536);
    });

    it('should return default dimension when not configured', () => {
      // Default dimension is typically from model defaults
      expect(client.getEmbeddingDimension()).toBe(1536);
    });
  });
});
