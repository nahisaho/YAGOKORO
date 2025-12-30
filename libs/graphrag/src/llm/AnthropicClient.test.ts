import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnthropicClient } from './AnthropicClient.js';
import type { ChatMessage } from './types.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AnthropicClient', () => {
  let client: AnthropicClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new AnthropicClient({
      apiKey: 'test-api-key',
      modelName: 'claude-3-5-sonnet-20241022',
    });
  });

  describe('constructor', () => {
    it('should create client with required config', () => {
      expect(client.getModelName()).toBe('claude-3-5-sonnet-20241022');
      expect(client.provider).toBe('anthropic');
    });

    it('should use environment variable for API key if not provided', () => {
      const originalEnv = process.env.ANTHROPIC_API_KEY;
      process.env.ANTHROPIC_API_KEY = 'env-api-key';

      const envClient = new AnthropicClient({ modelName: 'claude-3-5-sonnet-20241022' });
      expect(envClient.getModelName()).toBe('claude-3-5-sonnet-20241022');

      process.env.ANTHROPIC_API_KEY = originalEnv;
    });
  });

  describe('chat', () => {
    it('should make request to Anthropic API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'msg_123',
            type: 'message',
            role: 'assistant',
            model: 'claude-3-5-sonnet-20241022',
            content: [{ type: 'text', text: 'Hello!' }],
            stop_reason: 'end_turn',
            usage: {
              input_tokens: 10,
              output_tokens: 5,
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
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'test-api-key',
            'anthropic-version': '2023-06-01',
          }),
        })
      );

      expect(response.content).toBe('Hello!');
      expect(response.choices[0].finishReason).toBe('stop');
    });

    it('should extract system message from chat messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'msg_123',
            type: 'message',
            role: 'assistant',
            model: 'claude-3-5-sonnet-20241022',
            content: [{ type: 'text', text: 'Response' }],
            stop_reason: 'end_turn',
          }),
      });

      await client.chat([
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hi' },
      ]);

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      // System message should be extracted to top-level system field
      expect(body.system).toBe('You are helpful.');
      // Messages should only contain non-system messages
      expect(body.messages).toEqual([{ role: 'user', content: 'Hi' }]);
    });

    it('should include temperature and max_tokens in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'msg_123',
            type: 'message',
            role: 'assistant',
            model: 'claude-3-5-sonnet-20241022',
            content: [{ type: 'text', text: 'Response' }],
            stop_reason: 'end_turn',
          }),
      });

      await client.chat([{ role: 'user', content: 'Test' }], {
        temperature: 0.5,
        maxTokens: 1000,
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.temperature).toBe(0.5);
      expect(body.max_tokens).toBe(1000);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () =>
          Promise.resolve({
            error: {
              type: 'rate_limit_error',
              message: 'Rate limit exceeded',
            },
          }),
      });

      await expect(client.chat([{ role: 'user', content: 'Test' }])).rejects.toThrow(
        'Anthropic API error: 429 Too Many Requests'
      );
    });

    it('should handle multiple content blocks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'msg_123',
            type: 'message',
            role: 'assistant',
            model: 'claude-3-5-sonnet-20241022',
            content: [
              { type: 'text', text: 'First part. ' },
              { type: 'text', text: 'Second part.' },
            ],
            stop_reason: 'end_turn',
          }),
      });

      const response = await client.chat([{ role: 'user', content: 'Test' }]);
      expect(response.content).toBe('First part. Second part.');
    });
  });

  describe('chatStream', () => {
    it('should stream responses', async () => {
      const encoder = new TextEncoder();
      const streamData = [
        'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n\n',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" World"}}\n\n',
        'event: message_stop\ndata: {"type":"message_stop"}\n\n',
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
    it('should throw error as Anthropic does not support embeddings', async () => {
      await expect(client.embed('Hello')).rejects.toThrow('Anthropic does not support embeddings');
    });
  });

  describe('tool calls', () => {
    it('should handle tool use in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'msg_123',
            type: 'message',
            role: 'assistant',
            model: 'claude-3-5-sonnet-20241022',
            content: [
              {
                type: 'tool_use',
                id: 'toolu_123',
                name: 'get_weather',
                input: { location: 'Tokyo' },
              },
            ],
            stop_reason: 'tool_use',
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
