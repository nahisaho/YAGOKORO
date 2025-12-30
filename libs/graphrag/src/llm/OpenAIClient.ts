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
  ToolCall,
} from './types.js';

/**
 * OpenAI-specific configuration
 */
export interface OpenAIConfig extends LLMClientConfig {
  /** OpenAI organization ID */
  organization?: string;
}

/**
 * OpenAI API request body for chat completions
 */
interface OpenAIChatRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string | null;
    name?: string;
    tool_call_id?: string;
    tool_calls?: Array<{
      id: string;
      type: 'function';
      function: { name: string; arguments: string };
    }>;
  }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stop?: string[];
  stream?: boolean;
  response_format?: { type: 'text' | 'json_object' };
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>;
}

/**
 * OpenAI API response
 */
interface OpenAIChatResponse {
  id: string;
  model: string;
  created: number;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI embedding API response
 */
interface OpenAIEmbeddingResponse {
  model: string;
  data: Array<{
    index: number;
    embedding: number[];
  }>;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

/**
 * OpenAI LLM Client
 *
 * Implements the BaseLLMClient interface for OpenAI's API.
 * Supports GPT-4, GPT-3.5, and embedding models.
 *
 * @example
 * ```typescript
 * const client = new OpenAIClient({
 *   apiKey: 'your-api-key',
 *   modelName: 'gpt-4',
 * });
 *
 * const response = await client.chat([
 *   { role: 'user', content: 'Hello!' }
 * ]);
 * ```
 */
export class OpenAIClient extends BaseLLMClient {
  private readonly baseUrl: string;

  constructor(config: OpenAIConfig) {
    const apiKey = config.apiKey ?? process.env.OPENAI_API_KEY ?? '';
    super({
      ...config,
      apiKey,
    });
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  }

  get provider(): LLMProvider {
    return 'openai';
  }

  /**
   * OpenAI chat completion implementation
   */
  protected async doChat(
    messages: ChatMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMCompletionResponse> {
    const requestBody = this.buildChatRequest(messages, options);
    const response = await this.makeRequest<OpenAIChatResponse>('/chat/completions', requestBody);

    return this.transformChatResponse(response);
  }

  /**
   * OpenAI streaming chat implementation
   */
  protected async *doChatStream(
    messages: ChatMessage[],
    options?: LLMCompletionOptions
  ): AsyncGenerator<LLMStreamChunk> {
    const requestBody = this.buildChatRequest(messages, { ...options, stream: true });

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));
            yield this.transformStreamChunk(data);
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * OpenAI embedding implementation
   */
  protected async doEmbed(texts: string[], options?: EmbeddingOptions): Promise<EmbeddingResponse> {
    const requestBody: Record<string, unknown> = {
      model: this._modelName,
      input: texts,
    };

    if (options?.dimensions) {
      requestBody.dimensions = options.dimensions;
    }

    const response = await this.makeRequest<OpenAIEmbeddingResponse>('/embeddings', requestBody);

    const dimension = response.data[0]?.embedding.length ?? this._embeddingDimension;

    const result: EmbeddingResponse = {
      model: response.model,
      data: response.data.map((d) => ({
        index: d.index,
        embedding: d.embedding,
      })),
      dimension,
    };
    if (response.usage) {
      result.usage = {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: 0,
        totalTokens: response.usage.total_tokens,
      };
    }
    return result;
  }

  /**
   * Build OpenAI chat request body
   */
  private buildChatRequest(
    messages: ChatMessage[],
    options?: LLMCompletionOptions
  ): OpenAIChatRequest {
    const request: OpenAIChatRequest = {
      model: this._modelName,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.name && { name: m.name }),
        ...(m.toolCallId && { tool_call_id: m.toolCallId }),
      })),
    };

    if (options?.temperature !== undefined) {
      request.temperature = options.temperature;
    }
    if (options?.maxTokens !== undefined) {
      request.max_tokens = options.maxTokens;
    }
    if (options?.topP !== undefined) {
      request.top_p = options.topP;
    }
    if (options?.stopSequences?.length) {
      request.stop = options.stopSequences;
    }
    if (options?.stream) {
      request.stream = true;
    }
    if (options?.structured?.type === 'json') {
      request.response_format = { type: 'json_object' };
    }
    if (options?.tools?.length) {
      request.tools = options.tools.map((t) => ({
        type: 'function' as const,
        function: t.function,
      }));
    }

    return request;
  }

  /**
   * Transform OpenAI response to standardized format
   */
  private transformChatResponse(response: OpenAIChatResponse): LLMCompletionResponse {
    const result: LLMCompletionResponse = {
      id: response.id,
      model: response.model,
      created: response.created,
      choices: response.choices.map((c) => {
        const message: LLMCompletionResponse['choices'][0]['message'] = {
          role: 'assistant' as const,
          content: c.message.content,
        };
        if (c.message.tool_calls && c.message.tool_calls.length > 0) {
          message.toolCalls = c.message.tool_calls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          }));
        }
        return {
          index: c.index,
          message,
          finishReason: this.mapFinishReason(c.finish_reason),
        };
      }),
      get content() {
        return this.choices[0]?.message.content ?? null;
      },
    };
    if (response.usage) {
      result.usage = {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      };
    }

    return result;
  }

  /**
   * Transform streaming chunk to standardized format
   */
  private transformStreamChunk(data: {
    id: string;
    model: string;
    choices: Array<{
      index: number;
      delta: {
        role?: string;
        content?: string;
        tool_calls?: Array<{
          id?: string;
          type?: string;
          function?: { name?: string; arguments?: string };
        }>;
      };
      finish_reason?: string;
    }>;
  }): LLMStreamChunk {
    return {
      id: data.id,
      model: data.model,
      choices: data.choices.map((c) => {
        const delta: StreamDelta = {};
        if (c.delta.role === 'assistant') {
          delta.role = 'assistant';
        }
        if (c.delta.content !== undefined) {
          delta.content = c.delta.content;
        }
        if (c.delta.tool_calls && c.delta.tool_calls.length > 0) {
          delta.toolCalls = c.delta.tool_calls.map((tc) => {
            const toolCall: Partial<ToolCall> = {};
            if (tc.id !== undefined) toolCall.id = tc.id;
            if (tc.type === 'function') toolCall.type = 'function';
            if (tc.function) {
              toolCall.function = {
                name: tc.function.name ?? '',
                arguments: tc.function.arguments ?? '',
              };
            }
            return toolCall;
          });
        }
        return {
          index: c.index,
          delta,
          finishReason: c.finish_reason ? this.mapFinishReason(c.finish_reason) : null,
        };
      }),
    };
  }

  /**
   * Map OpenAI finish reason to standardized format
   */
  private mapFinishReason(reason: string): FinishReason {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'tool_calls':
      case 'function_call':
        return 'tool_calls';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'error';
    }
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this._apiKey}`,
    };

    if (this._organization) {
      headers['OpenAI-Organization'] = this._organization;
    }

    return headers;
  }

  /**
   * Make HTTP request to OpenAI API
   */
  private async makeRequest<T>(endpoint: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }
}
