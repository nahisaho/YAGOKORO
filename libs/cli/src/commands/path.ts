/**
 * Path command - Multi-hop reasoning operations
 */

import { Command } from 'commander';
import { logger, createSpinner } from '../utils/logger.js';

/**
 * Path node representation for CLI
 */
export interface CLIPathNode {
  id: string;
  type: string;
  name: string;
  properties?: Record<string, unknown>;
}

/**
 * Path relation representation for CLI
 */
export interface CLIPathRelation {
  type: string;
  direction: 'outgoing' | 'incoming';
}

/**
 * Path representation for CLI
 */
export interface CLIPath {
  nodes: CLIPathNode[];
  relations: CLIPathRelation[];
  hops: number;
  score: number;
}

/**
 * Path result for CLI
 */
export interface CLIPathResult {
  paths: CLIPath[];
  totalPaths: number;
  executionTime: number;
}

/**
 * Path explanation for CLI
 */
export interface CLIPathExplanation {
  path: CLIPath;
  naturalLanguage: string;
  summary: string;
}

/**
 * Options for finding paths
 */
export interface PathFindOptions {
  maxHops?: number;
  startType?: string;
  endType?: string;
  relationTypes?: string[];
  explain?: boolean;
  language?: 'en' | 'ja';
}

/**
 * Service interface for path operations
 */
export interface PathService {
  findPaths(
    startEntity: string,
    endEntity: string,
    options: PathFindOptions
  ): Promise<CLIPathResult>;
  findShortestPath(
    startEntity: string,
    endEntity: string,
    maxHops?: number
  ): Promise<CLIPath | null>;
  areConnected(
    startEntity: string,
    endEntity: string,
    maxHops?: number
  ): Promise<boolean>;
  getDegreesOfSeparation(
    startEntity: string,
    endEntity: string,
    maxHops?: number
  ): Promise<number | null>;
  explainPath(path: CLIPath, context?: string): Promise<CLIPathExplanation>;
  close(): Promise<void>;
}

/**
 * Format a path for display
 */
function formatPath(path: CLIPath): string {
  const parts: string[] = [];
  for (let i = 0; i < path.nodes.length; i++) {
    const node = path.nodes[i];
    if (node) {
      parts.push(`[${node.type}] ${node.name}`);
      if (i < path.relations.length) {
        const rel = path.relations[i];
        if (rel) {
          const arrow = rel.direction === 'outgoing' ? '-->' : '<--';
          parts.push(`${arrow}(${rel.type})${arrow}`);
        }
      }
    }
  }
  return parts.join(' ');
}

/**
 * Create the path command with all subcommands
 */
export function createPathCommand(serviceFactory?: () => Promise<PathService>): Command {
  const path = new Command('path')
    .description('Multi-hop path finding and reasoning commands')
    .option('-c, --config <path>', 'Path to configuration file');

  // path find <start> <end>
  path
    .command('find <start> <end>')
    .description('Find paths between two entities')
    .option('-m, --max-hops <n>', 'Maximum hops', '4')
    .option('--start-type <type>', 'Type of start entity')
    .option('--end-type <type>', 'Type of end entity')
    .option('-r, --relations <types>', 'Comma-separated relation types to traverse')
    .option('-e, --explain', 'Include natural language explanations')
    .option('-l, --language <lang>', 'Language for explanations (en, ja)', 'en')
    .option('-o, --output <format>', 'Output format (table, json)', 'table')
    .action(async (start, end, options) => {
      const spinner = createSpinner(`Finding paths from "${start}" to "${end}"...`);
      spinner.start();

      try {
        const findOptions: PathFindOptions = {
          maxHops: parseInt(options.maxHops, 10),
          startType: options.startType,
          endType: options.endType,
          relationTypes: options.relations?.split(','),
          explain: options.explain,
          language: options.language as 'en' | 'ja',
        };

        let result: CLIPathResult;

        if (serviceFactory) {
          const service = await serviceFactory();
          result = await service.findPaths(start, end, findOptions);
          await service.close();
        } else {
          result = { paths: [], totalPaths: 0, executionTime: 0 };
        }

        spinner.succeed(`Found ${result.totalPaths} paths in ${result.executionTime}ms`);

        if (options.output === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          if (result.paths.length > 0) {
            console.log('\nPaths found:');
            result.paths.forEach((p, i) => {
              console.log(`\n${i + 1}. ${formatPath(p)}`);
              console.log(`   Hops: ${p.hops}, Score: ${p.score.toFixed(2)}`);
            });
          } else {
            logger.info('No paths found between the entities');
          }
        }
      } catch (error) {
        spinner.fail('Failed to find paths');
        logger.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });

  // path shortest <start> <end>
  path
    .command('shortest <start> <end>')
    .description('Find the shortest path between two entities')
    .option('-m, --max-hops <n>', 'Maximum hops to search', '6')
    .option('-o, --output <format>', 'Output format (table, json)', 'table')
    .action(async (start, end, options) => {
      const spinner = createSpinner(`Finding shortest path from "${start}" to "${end}"...`);
      spinner.start();

      try {
        let result: CLIPath | null;

        if (serviceFactory) {
          const service = await serviceFactory();
          result = await service.findShortestPath(
            start,
            end,
            parseInt(options.maxHops, 10)
          );
          await service.close();
        } else {
          result = null;
        }

        if (result) {
          spinner.succeed(`Found shortest path (${result.hops} hops)`);

          if (options.output === 'json') {
            console.log(JSON.stringify(result, null, 2));
          } else {
            console.log(`\nPath: ${formatPath(result)}`);
            console.log(`Hops: ${result.hops}`);
            console.log(`Score: ${result.score.toFixed(2)}`);
          }
        } else {
          spinner.fail('No path found');
          logger.info(`No path exists between "${start}" and "${end}" within ${options.maxHops} hops`);
        }
      } catch (error) {
        spinner.fail('Failed to find shortest path');
        logger.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });

  // path check <start> <end>
  path
    .command('check <start> <end>')
    .description('Check if two entities are connected')
    .option('-m, --max-hops <n>', 'Maximum hops to search', '4')
    .action(async (start, end, options) => {
      const spinner = createSpinner(`Checking connection between "${start}" and "${end}"...`);
      spinner.start();

      try {
        let connected: boolean;

        if (serviceFactory) {
          const service = await serviceFactory();
          connected = await service.areConnected(
            start,
            end,
            parseInt(options.maxHops, 10)
          );
          await service.close();
        } else {
          connected = false;
        }

        if (connected) {
          spinner.succeed(`✓ "${start}" and "${end}" are connected`);
        } else {
          spinner.fail(`✗ "${start}" and "${end}" are not connected within ${options.maxHops} hops`);
        }
      } catch (error) {
        spinner.fail('Failed to check connection');
        logger.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });

  // path degrees <start> <end>
  path
    .command('degrees <start> <end>')
    .description('Get degrees of separation between two entities')
    .option('-m, --max-hops <n>', 'Maximum hops to search', '6')
    .action(async (start, end, options) => {
      const spinner = createSpinner(`Calculating degrees of separation...`);
      spinner.start();

      try {
        let degrees: number | null;

        if (serviceFactory) {
          const service = await serviceFactory();
          degrees = await service.getDegreesOfSeparation(
            start,
            end,
            parseInt(options.maxHops, 10)
          );
          await service.close();
        } else {
          degrees = null;
        }

        if (degrees !== null) {
          spinner.succeed(`Degrees of separation: ${degrees}`);
          logger.info(`"${start}" and "${end}" are ${degrees} step${degrees !== 1 ? 's' : ''} apart`);
        } else {
          spinner.fail('No connection found');
          logger.info(`"${start}" and "${end}" are not connected within ${options.maxHops} hops`);
        }
      } catch (error) {
        spinner.fail('Failed to calculate degrees');
        logger.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });

  // path explain <start> <end>
  path
    .command('explain <start> <end>')
    .description('Find paths and explain them in natural language')
    .option('-m, --max-hops <n>', 'Maximum hops', '4')
    .option('-n, --count <n>', 'Number of paths to explain', '3')
    .option('-l, --language <lang>', 'Language for explanations (en, ja)', 'en')
    .option('--context <text>', 'Additional context for explanations')
    .option('-o, --output <format>', 'Output format (table, json)', 'table')
    .action(async (start, end, options) => {
      const spinner = createSpinner(`Finding and explaining paths from "${start}" to "${end}"...`);
      spinner.start();

      try {
        const findOptions: PathFindOptions = {
          maxHops: parseInt(options.maxHops, 10),
          explain: true,
          language: options.language as 'en' | 'ja',
        };

        let result: CLIPathResult;
        let explanations: CLIPathExplanation[] = [];

        if (serviceFactory) {
          const service = await serviceFactory();
          result = await service.findPaths(start, end, findOptions);
          
          // Get explanations for top paths
          const count = Math.min(parseInt(options.count, 10), result.paths.length);
          for (let i = 0; i < count; i++) {
            const path = result.paths[i];
            if (path) {
              const explanation = await service.explainPath(path, options.context);
              explanations.push(explanation);
            }
          }
          
          await service.close();
        } else {
          result = { paths: [], totalPaths: 0, executionTime: 0 };
        }

        spinner.succeed(`Found ${result.totalPaths} paths, explained ${explanations.length}`);

        if (options.output === 'json') {
          console.log(JSON.stringify({ result, explanations }, null, 2));
        } else {
          if (explanations.length > 0) {
            console.log('\nExplanations:');
            explanations.forEach((exp, i) => {
              console.log(`\n${i + 1}. ${exp.summary}`);
              console.log(`   ${exp.naturalLanguage}`);
              console.log(`   Path: ${formatPath(exp.path)}`);
            });
          } else {
            logger.info('No paths found to explain');
          }
        }
      } catch (error) {
        spinner.fail('Failed to explain paths');
        logger.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });

  return path;
}
