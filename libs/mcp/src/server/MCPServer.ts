import type { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  ValidationError,
  MCPToolNotFoundError,
  NotFoundError,
} from '@yagokoro/domain';
import type {
  MCPServerConfig,
  ResourceDefinition,
  ResourceReadResult,
  ServerCapabilities,
  ServerInfo,
  ToolCallResult,
  ToolContext,
  ToolDefinition,
} from './types.js';

/**
 * Tool listing info (without handler)
 */
export interface ToolInfo {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * Resource listing info (without handler)
 */
export interface ResourceInfo {
  name: string;
  uri: string;
  description: string;
  mimeType?: string | undefined;
}

/**
 * YAGOKORO MCP Server
 *
 * A high-level MCP server implementation for the YAGOKORO GraphRAG system.
 * Provides tools and resources for knowledge graph operations.
 *
 * @example
 * ```typescript
 * const server = new YagokoroMCPServer({
 *   name: 'yagokoro-graphrag',
 *   version: '1.0.0',
 * });
 *
 * server.registerTool({
 *   name: 'queryKnowledgeGraph',
 *   description: 'Query the knowledge graph',
 *   inputSchema: z.object({ query: z.string() }),
 *   handler: async ({ query }) => {
 *     // Implementation
 *     return { content: [{ type: 'text', text: 'Result' }] };
 *   },
 * });
 *
 * // Start with stdio transport
 * await server.start('stdio');
 * ```
 */
export class YagokoroMCPServer {
  private readonly config: MCPServerConfig;
  private readonly tools: Map<string, ToolDefinition> = new Map();
  private readonly resources: Map<string, ResourceDefinition> = new Map();

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  /**
   * Get server info
   */
  getServerInfo(): ServerInfo {
    const capabilities: ServerCapabilities = {
      tools: {
        listChanged: true,
      },
      resources: {
        subscribe: false,
        listChanged: true,
      },
    };

    if (this.config.enableLogging) {
      capabilities.logging = {};
    }

    return {
      name: this.config.name,
      version: this.config.version,
      capabilities,
    };
  }

  /**
   * Register a tool
   *
   * @param definition - Tool definition including name, schema, and handler
   * @throws ValidationError if tool with same name already exists
   */
  registerTool<TInput extends z.ZodType>(definition: ToolDefinition<TInput>): void {
    if (this.tools.has(definition.name)) {
      throw new ValidationError(`Tool "${definition.name}" is already registered`, {
        toolName: definition.name,
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.tools.set(definition.name, definition as ToolDefinition<any>);
  }

  /**
   * Register a resource
   *
   * @param definition - Resource definition including URI and handler
   * @throws ValidationError if resource with same URI already exists
   */
  registerResource(definition: ResourceDefinition): void {
    if (this.resources.has(definition.uri)) {
      throw new ValidationError(`Resource "${definition.uri}" is already registered`, {
        uri: definition.uri,
      });
    }
    this.resources.set(definition.uri, definition);
  }

  /**
   * Call a registered tool
   *
   * @param name - Tool name
   * @param input - Tool input arguments
   * @param context - Optional tool context
   * @returns Tool call result
   */
  async callTool(
    name: string,
    input: unknown,
    context?: Partial<ToolContext>
  ): Promise<ToolCallResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new MCPToolNotFoundError(name);
    }

    try {
      // Validate input against schema
      const validatedInput = tool.inputSchema.parse(input);

      // Build context
      const toolContext: ToolContext = {
        sessionId: context?.sessionId,
        sendLog: context?.sendLog,
      };

      // Execute handler
      return await tool.handler(validatedInput, toolContext);
    } catch (error) {
      // Return error as tool result
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error: ${errorMessage}`,
          },
        ],
      };
    }
  }

  /**
   * Read a registered resource
   *
   * @param uri - Resource URI
   * @returns Resource contents
   */
  async readResource(uri: string): Promise<ResourceReadResult> {
    const resource = this.resources.get(uri);
    if (!resource) {
      throw new NotFoundError('Resource', uri);
    }

    return await resource.handler({ uri });
  }

  /**
   * List all registered tools
   *
   * @returns Array of tool info objects
   */
  listTools(): ToolInfo[] {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.inputSchema) as Record<string, unknown>,
    }));
  }

  /**
   * List all registered resources
   *
   * @returns Array of resource info objects
   */
  listResources(): ResourceInfo[] {
    return Array.from(this.resources.values()).map((resource) => ({
      name: resource.name,
      uri: resource.uri,
      description: resource.description,
      mimeType: resource.mimeType,
    }));
  }

  /**
   * Check if a tool is registered
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Check if a resource is registered
   */
  hasResource(uri: string): boolean {
    return this.resources.has(uri);
  }

  /**
   * Get tool count
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Get resource count
   */
  getResourceCount(): number {
    return this.resources.size;
  }
}
