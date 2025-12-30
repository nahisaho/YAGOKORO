import { Command } from 'commander';
import { logger, createSpinner, formatTable } from '../utils/logger.js';

/**
 * MCP Server status
 */
export interface MCPServerStatus {
  running: boolean;
  pid?: number | undefined;
  port?: number | undefined;
  transport: 'stdio' | 'http';
  uptime?: number | undefined;
  connections?: number | undefined;
  requestsHandled?: number | undefined;
}

/**
 * MCP Tool info
 */
export interface MCPToolInfo {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * MCP Resource info
 */
export interface MCPResourceInfo {
  uri: string;
  name: string;
  description?: string | undefined;
  mimeType?: string | undefined;
}

/**
 * Service interface for MCP operations
 */
export interface MCPService {
  serve(options: MCPServeOptions): Promise<MCPServerStatus>;
  status(): Promise<MCPServerStatus>;
  stop(): Promise<boolean>;
  listTools(): Promise<MCPToolInfo[]>;
  listResources(): Promise<MCPResourceInfo[]>;
}

/**
 * Options for starting MCP server
 */
export interface MCPServeOptions {
  transport?: 'stdio' | 'http' | undefined;
  port?: number | undefined;
  host?: string | undefined;
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | undefined;
}

/**
 * Create the mcp command with all subcommands
 */
export function createMCPCommand(serviceFactory?: () => Promise<MCPService>): Command {
  const mcp = new Command('mcp')
    .description('MCP server management commands')
    .option('-c, --config <path>', 'Path to configuration file');

  // mcp serve
  mcp
    .command('serve')
    .description('Start the MCP server')
    .option('-t, --transport <type>', 'Transport type (stdio, http)', 'stdio')
    .option('-p, --port <port>', 'HTTP port (for http transport)', '3000')
    .option('-h, --host <host>', 'HTTP host (for http transport)', 'localhost')
    .option('--log-level <level>', 'Log level (debug, info, warn, error)', 'info')
    .option('-d, --daemon', 'Run as daemon (background process)')
    .action(async (options) => {
      const transport = options.transport as 'stdio' | 'http';

      if (transport === 'stdio' && !options.daemon) {
        // stdio mode runs in foreground
        logger.info('Starting MCP server in stdio mode...');
        logger.info('Press Ctrl+C to stop');

        try {
          if (serviceFactory) {
            const service = await serviceFactory();
            const status = await service.serve({
              transport: 'stdio',
              logLevel: options.logLevel,
            });
            logger.success('MCP server started');
            logger.info(`Transport: ${status.transport}`);
          } else {
            logger.info('MCP server would start here (no service factory)');
          }
        } catch (error) {
          logger.error(error instanceof Error ? error.message : String(error));
          process.exitCode = 1;
        }
      } else {
        // HTTP mode or daemon
        const spinner = createSpinner('Starting MCP server...');
        spinner.start();

        try {
          const serveOptions: MCPServeOptions = {
            transport,
            port: parseInt(options.port, 10),
            host: options.host,
            logLevel: options.logLevel,
          };

          let status: MCPServerStatus;

          if (serviceFactory) {
            const service = await serviceFactory();
            status = await service.serve(serveOptions);
          } else {
            status = {
              running: true,
              transport,
              pid: process.pid,
              port: serveOptions.port,
            };
          }

          spinner.succeed('MCP server started');

          console.log('\n  Server Status:');
          console.log(`    Transport: ${status.transport}`);
          if (status.port) {
            console.log(`    URL: http://${options.host}:${status.port}`);
          }
          if (status.pid) {
            console.log(`    PID: ${status.pid}`);
          }
          console.log();

          if (options.daemon) {
            logger.info('Server running in background');
            logger.info('Use `yagokoro mcp stop` to stop the server');
          }
        } catch (error) {
          spinner.fail('Failed to start MCP server');
          logger.error(error instanceof Error ? error.message : String(error));
          process.exitCode = 1;
        }
      }
    });

  // mcp status
  mcp
    .command('status')
    .description('Check MCP server status')
    .option('-o, --output <format>', 'Output format (text, json)', 'text')
    .action(async (options) => {
      const spinner = createSpinner('Checking server status...');
      spinner.start();

      try {
        let status: MCPServerStatus;

        if (serviceFactory) {
          const service = await serviceFactory();
          status = await service.status();
        } else {
          status = {
            running: false,
            transport: 'stdio',
          };
        }

        spinner.stop();

        if (options.output === 'json') {
          console.log(JSON.stringify(status, null, 2));
        } else {
          if (status.running) {
            logger.success('MCP server is running');
            console.log(`\n  Transport: ${status.transport}`);
            if (status.pid) console.log(`  PID: ${status.pid}`);
            if (status.port) console.log(`  Port: ${status.port}`);
            if (status.uptime !== undefined) {
              const hours = Math.floor(status.uptime / 3600);
              const minutes = Math.floor((status.uptime % 3600) / 60);
              const seconds = status.uptime % 60;
              console.log(`  Uptime: ${hours}h ${minutes}m ${seconds}s`);
            }
            if (status.connections !== undefined) {
              console.log(`  Active connections: ${status.connections}`);
            }
            if (status.requestsHandled !== undefined) {
              console.log(`  Requests handled: ${status.requestsHandled}`);
            }
            console.log();
          } else {
            logger.warning('MCP server is not running');
            logger.info('Use `yagokoro mcp serve` to start the server');
          }
        }
      } catch (error) {
        spinner.fail('Failed to get server status');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  // mcp stop
  mcp
    .command('stop')
    .description('Stop the MCP server')
    .option('-f, --force', 'Force stop (kill process)')
    .action(async (options) => {
      const spinner = createSpinner('Stopping MCP server...');
      spinner.start();

      try {
        let stopped = false;

        if (serviceFactory) {
          const service = await serviceFactory();
          stopped = await service.stop();
        } else {
          stopped = true;
        }

        if (stopped) {
          spinner.succeed('MCP server stopped');
        } else {
          spinner.warn('MCP server was not running');
        }
      } catch (error) {
        spinner.fail('Failed to stop MCP server');
        logger.error(error instanceof Error ? error.message : String(error));

        if (options.force) {
          logger.warning('Attempting force stop...');
          // Force stop logic would go here
        }
        process.exitCode = 1;
      }
    });

  // mcp tools
  mcp
    .command('tools')
    .description('List available MCP tools')
    .option('-o, --output <format>', 'Output format (table, json)', 'table')
    .option('--verbose', 'Show full schema details')
    .action(async (options) => {
      const spinner = createSpinner('Fetching tools...');
      spinner.start();

      try {
        let tools: MCPToolInfo[];

        if (serviceFactory) {
          const service = await serviceFactory();
          tools = await service.listTools();
        } else {
          // Default tools from the MCP server
          tools = [
            {
              name: 'queryKnowledgeGraph',
              description: 'Query the knowledge graph using natural language',
              inputSchema: { type: 'object' },
            },
            {
              name: 'getEntity',
              description: 'Get entity details by ID',
              inputSchema: { type: 'object' },
            },
            {
              name: 'getRelations',
              description: 'Get relations for an entity',
              inputSchema: { type: 'object' },
            },
            {
              name: 'getPath',
              description: 'Find path between two entities',
              inputSchema: { type: 'object' },
            },
            {
              name: 'getCommunity',
              description: 'Get community details',
              inputSchema: { type: 'object' },
            },
            {
              name: 'addEntity',
              description: 'Add a new entity to the graph',
              inputSchema: { type: 'object' },
            },
            {
              name: 'addRelation',
              description: 'Add a new relation to the graph',
              inputSchema: { type: 'object' },
            },
            {
              name: 'searchSimilar',
              description: 'Search for similar entities using vector search',
              inputSchema: { type: 'object' },
            },
          ];
        }

        spinner.succeed(`Found ${tools.length} tools`);

        if (options.output === 'json') {
          console.log(JSON.stringify(tools, null, 2));
        } else {
          console.log('\n  Available MCP Tools:\n');

          if (options.verbose) {
            tools.forEach((tool) => {
              console.log(`  ${tool.name}`);
              console.log(`    ${tool.description}`);
              console.log(`    Schema: ${JSON.stringify(tool.inputSchema)}`);
              console.log();
            });
          } else {
            const rows = tools.map((t) => [t.name, t.description.slice(0, 50)]);
            console.log(formatTable(['Name', 'Description'], rows));
          }
        }
      } catch (error) {
        spinner.fail('Failed to fetch tools');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  // mcp resources
  mcp
    .command('resources')
    .description('List available MCP resources')
    .option('-o, --output <format>', 'Output format (table, json)', 'table')
    .action(async (options) => {
      const spinner = createSpinner('Fetching resources...');
      spinner.start();

      try {
        let resources: MCPResourceInfo[];

        if (serviceFactory) {
          const service = await serviceFactory();
          resources = await service.listResources();
        } else {
          // Default resources from the MCP server
          resources = [
            {
              uri: 'yagokoro://ontology/schema',
              name: 'Ontology Schema',
              description: 'The knowledge graph ontology schema',
              mimeType: 'application/json',
            },
            {
              uri: 'yagokoro://graph/statistics',
              name: 'Graph Statistics',
              description: 'Current knowledge graph statistics',
              mimeType: 'application/json',
            },
            {
              uri: 'yagokoro://entities',
              name: 'Entity List',
              description: 'List of all entities in the graph',
              mimeType: 'application/json',
            },
            {
              uri: 'yagokoro://timeline',
              name: 'Timeline',
              description: 'Chronological timeline of events',
              mimeType: 'application/json',
            },
          ];
        }

        spinner.succeed(`Found ${resources.length} resources`);

        if (options.output === 'json') {
          console.log(JSON.stringify(resources, null, 2));
        } else {
          console.log('\n  Available MCP Resources:\n');

          const rows = resources.map((r) => [
            r.name,
            r.uri,
            r.mimeType || '-',
          ]);
          console.log(formatTable(['Name', 'URI', 'MIME Type'], rows));
        }
      } catch (error) {
        spinner.fail('Failed to fetch resources');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  return mcp;
}

export { Command };
