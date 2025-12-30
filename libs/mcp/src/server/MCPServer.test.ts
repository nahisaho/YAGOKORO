import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { YagokoroMCPServer } from './MCPServer.js';
import type { ToolCallResult, ResourceReadResult } from './types.js';

describe('YagokoroMCPServer', () => {
  let server: YagokoroMCPServer;

  beforeEach(() => {
    server = new YagokoroMCPServer({
      name: 'test-server',
      version: '1.0.0',
    });
  });

  describe('initialization', () => {
    it('should create server with config', () => {
      expect(server.getServerInfo().name).toBe('test-server');
      expect(server.getServerInfo().version).toBe('1.0.0');
    });

    it('should have capabilities', () => {
      const info = server.getServerInfo();
      expect(info.capabilities.tools).toBeDefined();
      expect(info.capabilities.resources).toBeDefined();
    });
  });

  describe('registerTool', () => {
    it('should register a tool', () => {
      const handler = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'result' }],
      } as ToolCallResult);

      server.registerTool({
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: z.object({
          query: z.string(),
        }),
        handler,
      });

      const tools = server.listTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('test-tool');
    });

    it('should not allow duplicate tool names', () => {
      const handler = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'result' }],
      } as ToolCallResult);

      server.registerTool({
        name: 'duplicate-tool',
        description: 'First tool',
        inputSchema: z.object({}),
        handler,
      });

      expect(() =>
        server.registerTool({
          name: 'duplicate-tool',
          description: 'Second tool',
          inputSchema: z.object({}),
          handler,
        })
      ).toThrow('Tool "duplicate-tool" is already registered');
    });
  });

  describe('callTool', () => {
    it('should call registered tool', async () => {
      const handler = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Hello, World!' }],
      } as ToolCallResult);

      server.registerTool({
        name: 'greet',
        description: 'Greet someone',
        inputSchema: z.object({
          name: z.string(),
        }),
        handler,
      });

      const result = await server.callTool('greet', { name: 'World' });

      expect(handler).toHaveBeenCalledWith({ name: 'World' }, expect.any(Object));
      expect(result.content[0]).toEqual({ type: 'text', text: 'Hello, World!' });
    });

    it('should throw for unknown tool', async () => {
      await expect(server.callTool('unknown', {})).rejects.toThrow('Tool not found: unknown');
    });

    it('should validate input schema', async () => {
      const handler = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'result' }],
      } as ToolCallResult);

      server.registerTool({
        name: 'typed-tool',
        description: 'Tool with typed input',
        inputSchema: z.object({
          count: z.number().min(1),
        }),
        handler,
      });

      // Validation errors should return isError: true, not throw
      const result1 = await server.callTool('typed-tool', { count: 0 });
      expect(result1.isError).toBe(true);
      expect(result1.content[0].text).toContain('Number must be greater than or equal to 1');

      const result2 = await server.callTool('typed-tool', { count: 'abc' });
      expect(result2.isError).toBe(true);
      expect(result2.content[0].text).toContain('Expected number');
    });

    it('should handle tool errors gracefully', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Tool failed'));

      server.registerTool({
        name: 'failing-tool',
        description: 'A tool that fails',
        inputSchema: z.object({}),
        handler,
      });

      const result = await server.callTool('failing-tool', {});

      expect(result.isError).toBe(true);
      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining('Tool failed'),
      });
    });
  });

  describe('registerResource', () => {
    it('should register a resource', () => {
      const handler = vi.fn().mockResolvedValue({
        contents: [{ uri: 'resource://test', text: 'content' }],
      } as ResourceReadResult);

      server.registerResource({
        name: 'test-resource',
        uri: 'resource://test',
        description: 'A test resource',
        handler,
      });

      const resources = server.listResources();
      expect(resources).toHaveLength(1);
      expect(resources[0].name).toBe('test-resource');
    });

    it('should not allow duplicate resource URIs', () => {
      const handler = vi.fn().mockResolvedValue({
        contents: [{ uri: 'resource://dup', text: 'content' }],
      } as ResourceReadResult);

      server.registerResource({
        name: 'resource-1',
        uri: 'resource://dup',
        description: 'First resource',
        handler,
      });

      expect(() =>
        server.registerResource({
          name: 'resource-2',
          uri: 'resource://dup',
          description: 'Second resource',
          handler,
        })
      ).toThrow('Resource "resource://dup" is already registered');
    });
  });

  describe('readResource', () => {
    it('should read registered resource', async () => {
      const handler = vi.fn().mockResolvedValue({
        contents: [{ uri: 'resource://data', text: 'Hello Data' }],
      } as ResourceReadResult);

      server.registerResource({
        name: 'data-resource',
        uri: 'resource://data',
        description: 'Data resource',
        handler,
      });

      const result = await server.readResource('resource://data');

      expect(handler).toHaveBeenCalled();
      expect(result.contents[0].text).toBe('Hello Data');
    });

    it('should throw for unknown resource', async () => {
      await expect(server.readResource('resource://unknown')).rejects.toThrow(
        'Resource not found: resource://unknown'
      );
    });
  });

  describe('listTools', () => {
    it('should list all registered tools', () => {
      const handler = vi.fn().mockResolvedValue({ content: [] } as ToolCallResult);

      server.registerTool({
        name: 'tool-a',
        description: 'Tool A',
        inputSchema: z.object({ x: z.number() }),
        handler,
      });

      server.registerTool({
        name: 'tool-b',
        description: 'Tool B',
        inputSchema: z.object({ y: z.string() }),
        handler,
      });

      const tools = server.listTools();

      expect(tools).toHaveLength(2);
      expect(tools.map((t) => t.name)).toContain('tool-a');
      expect(tools.map((t) => t.name)).toContain('tool-b');
    });

    it('should include tool schemas', () => {
      const handler = vi.fn().mockResolvedValue({ content: [] } as ToolCallResult);

      server.registerTool({
        name: 'schema-tool',
        description: 'Tool with schema',
        inputSchema: z.object({
          query: z.string().describe('The search query'),
          limit: z.number().optional().describe('Max results'),
        }),
        handler,
      });

      const tools = server.listTools();
      const tool = tools.find((t) => t.name === 'schema-tool');

      expect(tool?.inputSchema).toBeDefined();
      expect(tool?.inputSchema.properties).toHaveProperty('query');
      expect(tool?.inputSchema.properties).toHaveProperty('limit');
    });
  });

  describe('listResources', () => {
    it('should list all registered resources', () => {
      const handler = vi.fn().mockResolvedValue({ contents: [] } as ResourceReadResult);

      server.registerResource({
        name: 'resource-a',
        uri: 'resource://a',
        description: 'Resource A',
        handler,
      });

      server.registerResource({
        name: 'resource-b',
        uri: 'resource://b',
        description: 'Resource B',
        mimeType: 'application/json',
        handler,
      });

      const resources = server.listResources();

      expect(resources).toHaveLength(2);
      expect(resources.map((r) => r.name)).toContain('resource-a');
      expect(resources.map((r) => r.name)).toContain('resource-b');
    });
  });
});
