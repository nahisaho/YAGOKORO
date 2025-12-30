import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAIClient } from './OpenAIClient.js';
import type { ChatMessage } from './types.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OpenAIClient', () => {
  let client: OpenAIClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new OpenAIClient({
      apiKey: 'test-api-key',
      modelName: 'gpt-4',
    });
  });

  describe('constructor', () => {
    it('should create client with required config', () => {
      expect(client.getModelName()).toBe('gpt-4');
      expect(client.provider).toBe('openai');
    });

    it('should use environment variable for API key if not provided', () => {
      const originalEnv = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'env-api-key';

      const envClient = new OpenAIClient({ modelName: 'gpt-4' });
      expect(envClient.getModelName()).toBe('gpt-4');

      process.env.OPENAI_API_KEY = originalEnv;
    });

    it('should allow custom base URL', () => {
      const customClient = new OpenAIClient({
        modelName: 'gpt-4',
        apiKey: 'test-key',
        baseUrl: 'https://custom.openai.com/v1',
      });
      expect(customClient.getModelName()).toBe('gpt-4');
    });
  });

  describe('chat', () => {
    it('should make request to OpenAI API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'chatcmpl-123',
            model: 'gpt-4',
            created: 1234567890,
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Hello!' },
                finish_reason: 'stop',
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
            },
          }),
      });

      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
      ];

      const response = await client.chat(messages);

      expect(mockFetch).toHaveBeenCalledOnce();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          }),
        })
      );

      expect(response.content).toBe('Hello!');
      expect(response.choices[0].finishReason).toBe('stop');
      expect(response.usage?.totalTokens).toBe(15);
    });

    it('should include temperature and max_tokens in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'chatcmpl-123',
            model: 'gpt-4',
            created: 1234567890,
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Response' },
                finish_reason: 'stop',
              },
            ],
          }),
      });

      await client.chat([{ role: 'user', content: 'Test' }], {
        temperature: 0.5,
        maxTokens: 100,
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.temperature).toBe(0.5);
      expect(body.max_tokens).toBe(100);
    });

    it('should handle JSON mode structured output', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'chatcmpl-123',
            model: 'gpt-4',
            created: 1234567890,
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: '{"key": "value"}' },
                finish_reason: 'stop',
              },
            ],
          }),
      });

      await client.chat([{ role: 'user', content: 'Test' }], {
        structured: { type: 'json' },
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.response_format).toEqual({ type: 'json_object' });
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () =>
          Promise.resolve({
            error: {
              message: 'Rate limit exceeded',
              type: 'rate_limit_error',
            },
          }),
      });

      await expect(client.chat([{ role: 'user', content: 'Test' }])).rejects.toThrow(
        'OpenAI API error: 429 Too Many Requests'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.chat([{ role: 'user', content: 'Test' }])).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('chatStream', () => {
    it('should stream responses', async () => {
      const encoder = new TextEncoder();
      const streamData = [
        'data: {"id":"1","model":"gpt-4","choices":[{"index":0,"delta":{"role":"assistant","content":"Hello"}}]}\n\n',
        'data: {"id":"2","model":"gpt-4","choices":[{"index":0,"delta":{"content":" World"}}]}\n\n',
        'data: {"id":"3","model":"gpt-4","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
        'data: [DONE]\n\n',
      ];

      let dataIndex = 0;
      const mockStream = new ReadableStream({
        pull(controller) {
          if (dataIndex < streamData.length) {
            controller.enqueue(encoder.encode(streamData[dataIndex]));
            dataIndex++;
          } else {
            controller.close();
          }
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      });

      const chunks: string[] = [];
      for await (const chunk of client.chatStream([{ role: 'user', content: 'Hi' }])) {
        if (chunk.choices[0].delta.content) {
          chunks.push(chunk.choices[0].delta.content);
        }
      }

      expect(chunks).toEqual(['Hello', ' World']);
    });
  });

  describe('embed', () => {
    it('should generate embedding for single text', async () => {
      const mockEmbedding = Array(1536).fill(0.1);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            model: 'text-embedding-3-small',
            data: [{ index: 0, embedding: mockEmbedding }],
            usage: { prompt_tokens: 5, total_tokens: 5 },
          }),
      });

      const response = await client.embed('Hello world');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"input":["Hello world"]'),
        })
      );

      expect(response.embedding).toEqual(mockEmbedding);
      expect(response.dimension).toBe(1536);
    });
  });

  describe('embedMany', () => {
    it('should generate embeddings for multiple texts', async () => {
      const mockEmbedding1 = Array(1536).fill(0.1);
      const mockEmbedding2 = Array(1536).fill(0.2);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            model: 'text-embedding-3-small',
            data: [
              { index: 0, embedding: mockEmbedding1 },
              { index: 1, embedding: mockEmbedding2 },
            ],
            usage: { prompt_tokens: 10, total_tokens: 10 },
          }),
      });

      const responses = await client.embedMany(['Hello', 'World']);

      expect(responses).toHaveLength(2);
      expect(responses[0].embedding).toEqual(mockEmbedding1);
      expect(responses[1].embedding).toEqual(mockEmbedding2);
    });
  });

  describe('tool calls', () => {
    it('should handle tool/function calls in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'chatcmpl-123',
            model: 'gpt-4',
            created: 1234567890,
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: null,
                  tool_calls: [
                    {
                      id: 'call_123',
                      type: 'function',
                      function: {
                        name: 'get_weather',
                        arguments: '{"location": "Tokyo"}',
                      },
                    },
                  ],
                },
                finish_reason: 'tool_calls',
              },
            ],
          }),
      });

      const response = await client.chat(
        [{ role: 'user', content: "What's the weather in Tokyo?" }],
        {
          tools: [
            {
              type: 'function',
              function: {
                name: 'get_weather',
                description: 'Get weather for a location',
                parameters: {
                  type: 'object',
                  properties: {
                    location: { type: 'string' },
                  },
                },
              },
            },
          ],
        }
      );

      expect(response.choices[0].message.toolCalls).toHaveLength(1);
      expect(response.choices[0].message.toolCalls?.[0].function.name).toBe('get_weather');
      expect(response.choices[0].finishReason).toBe('tool_calls');
    });
  });
});
