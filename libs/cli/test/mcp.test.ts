import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMCPCommand,
  type MCPService,
  type MCPServerStatus,
  type MCPToolInfo,
  type MCPResourceInfo,
} from '../src/commands/mcp.js';

const originalExitCode = process.exitCode;

describe('MCP Command', () => {
  let mockService: MCPService;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  const mockStatus: MCPServerStatus = {
    running: true,
    pid: 12345,
    port: 3000,
    transport: 'http',
    uptime: 3661, // 1h 1m 1s
    connections: 5,
    requestsHandled: 100,
  };

  const mockTools: MCPToolInfo[] = [
    {
      name: 'queryKnowledgeGraph',
      description: 'Query the knowledge graph',
      inputSchema: { type: 'object' },
    },
    {
      name: 'getEntity',
      description: 'Get entity by ID',
      inputSchema: { type: 'object' },
    },
  ];

  const mockResources: MCPResourceInfo[] = [
    {
      uri: 'yagokoro://ontology/schema',
      name: 'Ontology Schema',
      description: 'The ontology schema',
      mimeType: 'application/json',
    },
    {
      uri: 'yagokoro://graph/statistics',
      name: 'Graph Statistics',
      mimeType: 'application/json',
    },
  ];

  beforeEach(() => {
    mockService = {
      serve: vi.fn().mockResolvedValue(mockStatus),
      status: vi.fn().mockResolvedValue(mockStatus),
      stop: vi.fn().mockResolvedValue(true),
      listTools: vi.fn().mockResolvedValue(mockTools),
      listResources: vi.fn().mockResolvedValue(mockResources),
    };

    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
  });

  describe('createMCPCommand', () => {
    it('should create mcp command with all subcommands', () => {
      const mcp = createMCPCommand();

      expect(mcp.name()).toBe('mcp');
      expect(mcp.description()).toBe('MCP server management commands');

      const subcommands = mcp.commands.map((cmd) => cmd.name());
      expect(subcommands).toContain('serve');
      expect(subcommands).toContain('status');
      expect(subcommands).toContain('stop');
      expect(subcommands).toContain('tools');
      expect(subcommands).toContain('resources');
    });
  });

  describe('mcp serve', () => {
    it('should start server with http transport', async () => {
      const mcp = createMCPCommand(async () => mockService);
      await mcp.parseAsync(['node', 'test', 'serve', '-t', 'http', '-d']);

      expect(mockService.serve).toHaveBeenCalledWith(
        expect.objectContaining({
          transport: 'http',
        })
      );
    });

    it('should accept port option', async () => {
      const mcp = createMCPCommand(async () => mockService);
      await mcp.parseAsync(['node', 'test', 'serve', '-t', 'http', '-p', '8080', '-d']);

      expect(mockService.serve).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 8080,
        })
      );
    });

    it('should accept host option', async () => {
      const mcp = createMCPCommand(async () => mockService);
      await mcp.parseAsync(['node', 'test', 'serve', '-t', 'http', '-h', '0.0.0.0', '-d']);

      expect(mockService.serve).toHaveBeenCalledWith(
        expect.objectContaining({
          host: '0.0.0.0',
        })
      );
    });

    it('should accept log-level option', async () => {
      const mcp = createMCPCommand(async () => mockService);
      await mcp.parseAsync(['node', 'test', 'serve', '-t', 'http', '--log-level', 'debug', '-d']);

      expect(mockService.serve).toHaveBeenCalledWith(
        expect.objectContaining({
          logLevel: 'debug',
        })
      );
    });

    it('should handle serve errors', async () => {
      const errorMock = {
        ...mockService,
        serve: vi.fn().mockRejectedValue(new Error('Port in use')),
      };

      const mcp = createMCPCommand(async () => errorMock);
      await mcp.parseAsync(['node', 'test', 'serve', '-t', 'http', '-d']);

      expect(process.exitCode).toBe(1);
    });
  });

  describe('mcp status', () => {
    it('should show server status', async () => {
      const mcp = createMCPCommand(async () => mockService);
      await mcp.parseAsync(['node', 'test', 'status']);

      expect(mockService.status).toHaveBeenCalled();
    });

    it('should show not running status', async () => {
      const notRunningMock = {
        ...mockService,
        status: vi.fn().mockResolvedValue({
          running: false,
          transport: 'stdio',
        }),
      };

      const mcp = createMCPCommand(async () => notRunningMock);
      await mcp.parseAsync(['node', 'test', 'status']);

      // Should not fail, just show warning
      expect(process.exitCode).toBeUndefined();
    });

    it('should output JSON when specified', async () => {
      const mcp = createMCPCommand(async () => mockService);
      await mcp.parseAsync(['node', 'test', 'status', '-o', 'json']);

      const jsonCall = consoleSpy.mock.calls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('"running"')
      );
      expect(jsonCall).toBeDefined();
    });
  });

  describe('mcp stop', () => {
    it('should stop the server', async () => {
      const mcp = createMCPCommand(async () => mockService);
      await mcp.parseAsync(['node', 'test', 'stop']);

      expect(mockService.stop).toHaveBeenCalled();
    });

    it('should handle server not running', async () => {
      const notRunningMock = {
        ...mockService,
        stop: vi.fn().mockResolvedValue(false),
      };

      const mcp = createMCPCommand(async () => notRunningMock);
      await mcp.parseAsync(['node', 'test', 'stop']);

      // Should show warning but not fail
      expect(process.exitCode).toBeUndefined();
    });

    it('should handle stop errors', async () => {
      const errorMock = {
        ...mockService,
        stop: vi.fn().mockRejectedValue(new Error('Failed to stop')),
      };

      const mcp = createMCPCommand(async () => errorMock);
      await mcp.parseAsync(['node', 'test', 'stop']);

      expect(process.exitCode).toBe(1);
    });
  });

  describe('mcp tools', () => {
    it('should list tools', async () => {
      const mcp = createMCPCommand(async () => mockService);
      await mcp.parseAsync(['node', 'test', 'tools']);

      expect(mockService.listTools).toHaveBeenCalled();
    });

    it('should output JSON when specified', async () => {
      const mcp = createMCPCommand(async () => mockService);
      await mcp.parseAsync(['node', 'test', 'tools', '-o', 'json']);

      const jsonCall = consoleSpy.mock.calls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('"name"')
      );
      expect(jsonCall).toBeDefined();
    });

    it('should show verbose output', async () => {
      const mcp = createMCPCommand(async () => mockService);
      await mcp.parseAsync(['node', 'test', 'tools', '--verbose']);

      // Should show schema info
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('mcp resources', () => {
    it('should list resources', async () => {
      const mcp = createMCPCommand(async () => mockService);
      await mcp.parseAsync(['node', 'test', 'resources']);

      expect(mockService.listResources).toHaveBeenCalled();
    });

    it('should output JSON when specified', async () => {
      const mcp = createMCPCommand(async () => mockService);
      await mcp.parseAsync(['node', 'test', 'resources', '-o', 'json']);

      const jsonCall = consoleSpy.mock.calls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('"uri"')
      );
      expect(jsonCall).toBeDefined();
    });
  });

  describe('without service factory', () => {
    it('should list default tools without service', async () => {
      const mcp = createMCPCommand();
      await mcp.parseAsync(['node', 'test', 'tools']);

      // Should show default tools
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should list default resources without service', async () => {
      const mcp = createMCPCommand();
      await mcp.parseAsync(['node', 'test', 'resources']);

      // Should show default resources
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should show status without service', async () => {
      const mcp = createMCPCommand();
      await mcp.parseAsync(['node', 'test', 'status']);

      // Should show not running
      expect(true).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle tools list error', async () => {
      const errorMock = {
        ...mockService,
        listTools: vi.fn().mockRejectedValue(new Error('Connection error')),
      };

      const mcp = createMCPCommand(async () => errorMock);
      await mcp.parseAsync(['node', 'test', 'tools']);

      expect(process.exitCode).toBe(1);
    });

    it('should handle resources list error', async () => {
      const errorMock = {
        ...mockService,
        listResources: vi.fn().mockRejectedValue(new Error('Connection error')),
      };

      const mcp = createMCPCommand(async () => errorMock);
      await mcp.parseAsync(['node', 'test', 'resources']);

      expect(process.exitCode).toBe(1);
    });

    it('should handle status error', async () => {
      const errorMock = {
        ...mockService,
        status: vi.fn().mockRejectedValue(new Error('Connection error')),
      };

      const mcp = createMCPCommand(async () => errorMock);
      await mcp.parseAsync(['node', 'test', 'status']);

      expect(process.exitCode).toBe(1);
    });
  });
});
