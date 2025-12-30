import { BaseLLMClient, type LLMClientConfig } from './BaseLLMClient.js';
import type {
  ChatMessage,
  EmbeddingOptions,
  EmbeddingResponse,
  FinishReason,
  LLMCompletionOptions,
  LLMCompletionResponse,
  LLMProvider,
  LLMStreamChunk,
  StreamDelta,
} from './types.js';

/**
 * Anthropic-specific configuration
 */
export interface AnthropicConfig extends LLMClientConfig {
  /** Anthropic API version (default: 2023-06-01) */
  apiVersion?: string;
}

/**
 * Anthropic message content block
 */
interface AnthropicContentBlock {
  type: 'text' | 'tool_use';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

/**
 * Anthropic API response
 */
interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  model: string;
  content: AnthropicContentBlock[];
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Anthropic streaming events
 */
interface AnthropicStreamEvent {
  type: string;
  index?: number;
  content_block?: AnthropicContentBlock;
  delta?: {
    type: string;
    text?: string;
  };
}

const DEFAULT_BASE_URL = 'https://api.anthropic.com/v1';
const DEFAULT_API_VERSION = '2023-06-01';

/**
 * Anthropic LLM Client
 *
 * Implements the BaseLLMClient interface for Anthropic's Claude API.
 * Supports Claude 3 and Claude 3.5 models.
 *
 * Note: Anthropic does not provide embedding models, so embed methods
 * will throw an error.
 *
 * @example
 * ```typescript
 * const client = new AnthropicClient({
 *   apiKey: 'your-api-key',
 *   modelName: 'claude-3-5-sonnet-20241022',
 * });
 *
 * const response = await client.chat([
 *   { role: 'user', content: 'Hello!' }
 * ]);
 * ```
 */
export class AnthropicClient extends BaseLLMClient {
  private readonly baseUrl: string;
  private readonly apiVersion: string;

  constructor(config: AnthropicConfig) {
    const apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY ?? '';
    super({
      ...config,
      apiKey,
      maxTokens: config.maxTokens ?? 4096, // Anthropic requires max_tokens
    });
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.apiVersion = config.apiVersion ?? DEFAULT_API_VERSION;
  }

  get provider(): LLMProvider {
    return 'anthropic';
  }

  /**
   * Anthropic chat completion implementation
   */
  protected async doChat(
    messages: ChatMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMCompletionResponse> {
    const { systemMessage, chatMessages } = this.extractSystemMessage(messages);
    const requestBody = this.buildChatRequest(systemMessage, chatMessages, options);

    const response = await this.makeRequest<AnthropicResponse>(requestBody);
    return this.transformResponse(response);
  }

  /**
   * Anthropic streaming chat implementation
   */
  protected async *doChatStream(
    messages: ChatMessage[],
    options?: LLMCompletionOptions
  ): AsyncGenerator<LLMStreamChunk> {
    const { systemMessage, chatMessages } = this.extractSystemMessage(messages);
    const requestBody = this.buildChatRequest(systemMessage, chatMessages, {
      ...options,
      stream: true,
    });

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let messageId = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let currentEvent = '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('event: ')) {
            currentEvent = trimmed.slice(7);
          } else if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6)) as AnthropicStreamEvent;
              const chunk = this.transformStreamEvent(currentEvent, data, messageId);
              if (chunk) {
                if (data.type === 'message_start') {
                  messageId = (data as { message?: { id?: string } }).message?.id ?? '';
                }
                yield chunk;
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Anthropic does not support embeddings
   */
  protected async doEmbed(
    _texts: string[],
    _options?: EmbeddingOptions
  ): Promise<EmbeddingResponse> {
    throw new Error(
      'Anthropic does not support embeddings. Use a different provider like OpenAI or Voyage.'
    );
  }

  /**
   * Extract system message from chat messages
   * Anthropic uses a separate system field instead of system role in messages
   */
  private extractSystemMessage(messages: ChatMessage[]): {
    systemMessage: string | undefined;
    chatMessages: ChatMessage[];
  } {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    return {
      systemMessage:
        systemMessages.length > 0 ? systemMessages.map((m) => m.content).join('\n') : undefined,
      chatMessages,
    };
  }

  /**
   * Build Anthropic request body
   */
  private buildChatRequest(
    systemMessage: string | undefined,
    messages: ChatMessage[],
    options?: LLMCompletionOptions
  ): Record<string, unknown> {
    const request: Record<string, unknown> = {
      model: this._modelName,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: options?.maxTokens ?? this._maxTokens,
    };

    if (systemMessage) {
      request.system = systemMessage;
    }
    if (options?.temperature !== undefined) {
      request.temperature = options.temperature;
    }
    if (options?.topP !== undefined) {
      request.top_p = options.topP;
    }
    if (options?.stopSequences?.length) {
      request.stop_sequences = options.stopSequences;
    }
    if (options?.stream) {
      request.stream = true;
    }
    if (options?.tools?.length) {
      request.tools = options.tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters,
      }));
    }

    return request;
  }

  /**
   * Transform Anthropic response to standardized format
   */
  private transformResponse(response: AnthropicResponse): LLMCompletionResponse {
    const textContent = response.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('');

    const toolCalls = response.content
      .filter((c) => c.type === 'tool_use')
      .map((c) => ({
        id: c.id ?? '',
        type: 'function' as const,
        function: {
          name: c.name ?? '',
          arguments: JSON.stringify(c.input ?? {}),
        },
      }));

    const message: LLMCompletionResponse['choices'][0]['message'] = {
      role: 'assistant',
      content: textContent || null,
    };
    if (toolCalls.length > 0) {
      message.toolCalls = toolCalls;
    }

    const result: LLMCompletionResponse = {
      id: response.id,
      model: response.model,
      created: Date.now(),
      choices: [
        {
          index: 0,
          message,
          finishReason: this.mapFinishReason(response.stop_reason),
        },
      ],
      get content() {
        return this.choices[0]?.message.content ?? null;
      },
    };
    if (response.usage) {
      result.usage = {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      };
    }
    return result;
  }

  /**
   * Transform streaming event to standardized chunk
   */
  private transformStreamEvent(
    eventType: string,
    data: AnthropicStreamEvent,
    messageId: string
  ): LLMStreamChunk | null {
    if (eventType === 'content_block_delta' && data.delta?.type === 'text_delta') {
      const delta: StreamDelta = {};
      if (data.delta.text !== undefined) {
        delta.content = data.delta.text;
      }
      return {
        id: messageId,
        model: this._modelName,
        choices: [
          {
            index: data.index ?? 0,
            delta,
            finishReason: null,
          },
        ],
      };
    }

    if (eventType === 'message_stop') {
      return {
        id: messageId,
        model: this._modelName,
        choices: [
          {
            index: 0,
            delta: {},
            finishReason: 'stop',
          },
        ],
      };
    }

    return null;
  }

  /**
   * Map Anthropic stop reason to standardized finish reason
   */
  private mapFinishReason(reason: string): FinishReason {
    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'tool_use':
        return 'tool_calls';
      default:
        return 'error';
    }
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this._apiKey ?? '',
      'anthropic-version': this.apiVersion,
    };
  }

  /**
   * Make HTTP request to Anthropic API
   */
  private async makeRequest<T>(body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }
}
