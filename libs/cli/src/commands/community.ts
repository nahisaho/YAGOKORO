import { Command } from 'commander';
import { logger, createSpinner, formatTable } from '../utils/logger.js';

/**
 * Community data structure for CLI
 */
export interface CLICommunity {
  id: string;
  level: number;
  title?: string | undefined;
  summary?: string | undefined;
  entityCount: number;
  entities?: string[] | undefined;
  parentId?: string | undefined;
  childIds?: string[] | undefined;
  createdAt?: string | undefined;
}

/**
 * Community detection result
 */
export interface CommunityDetectionResult {
  communitiesDetected: number;
  levels: number;
  duration: number;
  details: Array<{
    level: number;
    count: number;
  }>;
}

/**
 * Service interface for community operations
 */
export interface CommunityService {
  list(options: CommunityListOptions): Promise<{ communities: CLICommunity[]; total: number }>;
  get(id: string): Promise<CLICommunity | null>;
  detect(options: CommunityDetectOptions): Promise<CommunityDetectionResult>;
  summarize(communityId: string): Promise<{ summary: string; keywords: string[] }>;
  summarizeAll(options?: SummarizeAllOptions): Promise<{ summarized: number; failed: number }>;
  getHierarchy(communityId?: string): Promise<CLICommunity[]>;
  close(): Promise<void>;
}

/**
 * Options for listing communities
 */
export interface CommunityListOptions {
  level?: number | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
  sortBy?: 'size' | 'level' | 'name' | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
}

/**
 * Options for community detection
 */
export interface CommunityDetectOptions {
  algorithm?: 'leiden' | 'louvain' | undefined;
  resolution?: number | undefined;
  minCommunitySize?: number | undefined;
  maxLevels?: number | undefined;
}

/**
 * Options for summarizing all communities
 */
export interface SummarizeAllOptions {
  level?: number | undefined;
  force?: boolean | undefined;
}

/**
 * Create the community command with all subcommands
 */
export function createCommunityCommand(serviceFactory?: () => Promise<CommunityService>): Command {
  const community = new Command('community')
    .description('Community management commands')
    .option('-c, --config <path>', 'Path to configuration file');

  // community list
  community
    .command('list')
    .description('List all communities')
    .option('-l, --level <n>', 'Filter by hierarchy level')
    .option('--limit <n>', 'Limit results', '20')
    .option('--offset <n>', 'Offset for pagination', '0')
    .option('-s, --sort <field>', 'Sort by field (size, level, name)', 'size')
    .option('--order <order>', 'Sort order (asc/desc)', 'desc')
    .option('-o, --output <format>', 'Output format (table, json)', 'table')
    .action(async (options) => {
      const spinner = createSpinner('Fetching communities...');
      spinner.start();

      try {
        const listOptions: CommunityListOptions = {
          level: options.level ? parseInt(options.level, 10) : undefined,
          limit: parseInt(options.limit, 10),
          offset: parseInt(options.offset, 10),
          sortBy: options.sort as CommunityListOptions['sortBy'],
          sortOrder: options.order as 'asc' | 'desc',
        };

        let result: { communities: CLICommunity[]; total: number };

        if (serviceFactory) {
          const service = await serviceFactory();
          result = await service.list(listOptions);
          await service.close();
        } else {
          result = { communities: [], total: 0 };
        }

        spinner.succeed(`Found ${result.total} communities`);

        if (options.output === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          if (result.communities.length > 0) {
            const rows = result.communities.map((c) => [
              c.id.slice(0, 8),
              c.level.toString(),
              c.title || '-',
              c.entityCount.toString(),
              c.summary?.slice(0, 40) || '-',
            ]);
            console.log(formatTable(['ID', 'Level', 'Title', 'Entities', 'Summary'], rows));

            if (result.total > result.communities.length) {
              logger.info(`Showing ${result.communities.length} of ${result.total} communities`);
            }
          } else {
            logger.info('No communities found');
          }
        }
      } catch (error) {
        spinner.fail('Failed to fetch communities');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  // community get
  community
    .command('get <id>')
    .description('Get community details by ID')
    .option('-o, --output <format>', 'Output format (detail, json)', 'detail')
    .action(async (id: string, options) => {
      const spinner = createSpinner(`Fetching community ${id}...`);
      spinner.start();

      try {
        let comm: CLICommunity | null = null;

        if (serviceFactory) {
          const service = await serviceFactory();
          comm = await service.get(id);
          await service.close();
        }

        if (!comm) {
          spinner.fail(`Community not found: ${id}`);
          process.exitCode = 1;
          return;
        }

        spinner.succeed('Community found');

        if (options.output === 'json') {
          console.log(JSON.stringify(comm, null, 2));
        } else {
          console.log('\n' + '═'.repeat(60));
          console.log(`  Community: ${comm.title || comm.id}`);
          console.log('═'.repeat(60) + '\n');

          console.log(`  ID:           ${comm.id}`);
          console.log(`  Level:        ${comm.level}`);
          console.log(`  Entity Count: ${comm.entityCount}`);

          if (comm.parentId) {
            console.log(`  Parent:       ${comm.parentId}`);
          }

          if (comm.childIds && comm.childIds.length > 0) {
            console.log(`  Children:     ${comm.childIds.length} sub-communities`);
          }

          if (comm.summary) {
            console.log('\n  Summary:');
            console.log(`    ${comm.summary}`);
          }

          if (comm.entities && comm.entities.length > 0) {
            console.log('\n  Member Entities:');
            comm.entities.slice(0, 10).forEach((e) => {
              console.log(`    - ${e}`);
            });
            if (comm.entities.length > 10) {
              console.log(`    ... and ${comm.entities.length - 10} more`);
            }
          }

          console.log('\n' + '═'.repeat(60) + '\n');
        }
      } catch (error) {
        spinner.fail('Failed to fetch community');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  // community detect
  community
    .command('detect')
    .description('Detect communities in the knowledge graph')
    .option('-a, --algorithm <alg>', 'Algorithm (leiden, louvain)', 'leiden')
    .option('-r, --resolution <n>', 'Resolution parameter', '1.0')
    .option('--min-size <n>', 'Minimum community size', '2')
    .option('--max-levels <n>', 'Maximum hierarchy levels', '3')
    .option('-o, --output <format>', 'Output format (summary, json)', 'summary')
    .action(async (options) => {
      const spinner = createSpinner('Detecting communities...');
      spinner.start();

      try {
        const detectOptions: CommunityDetectOptions = {
          algorithm: options.algorithm as 'leiden' | 'louvain',
          resolution: parseFloat(options.resolution),
          minCommunitySize: parseInt(options.minSize, 10),
          maxLevels: parseInt(options.maxLevels, 10),
        };

        let result: CommunityDetectionResult;

        if (serviceFactory) {
          const service = await serviceFactory();
          result = await service.detect(detectOptions);
          await service.close();
        } else {
          result = {
            communitiesDetected: 0,
            levels: 0,
            duration: 0,
            details: [],
          };
        }

        spinner.succeed(`Community detection completed in ${(result.duration / 1000).toFixed(2)}s`);

        if (options.output === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`\n  Communities detected: ${result.communitiesDetected}`);
          console.log(`  Hierarchy levels: ${result.levels}`);

          if (result.details.length > 0) {
            console.log('\n  By level:');
            result.details.forEach((d) => {
              console.log(`    Level ${d.level}: ${d.count} communities`);
            });
          }
          console.log();
        }
      } catch (error) {
        spinner.fail('Community detection failed');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  // community summarize
  community
    .command('summarize [id]')
    .description('Generate summary for a community or all communities')
    .option('--all', 'Summarize all communities')
    .option('-l, --level <n>', 'Only summarize communities at this level (with --all)')
    .option('-f, --force', 'Regenerate summaries even if they exist')
    .option('-o, --output <format>', 'Output format (text, json)', 'text')
    .action(async (id: string | undefined, options) => {
      if (!id && !options.all) {
        logger.error('Please provide a community ID or use --all flag');
        process.exitCode = 1;
        return;
      }

      if (options.all) {
        // Summarize all communities
        const spinner = createSpinner('Summarizing all communities...');
        spinner.start();

        try {
          const summarizeOptions: SummarizeAllOptions = {
            level: options.level ? parseInt(options.level, 10) : undefined,
            force: options.force,
          };

          let result: { summarized: number; failed: number };

          if (serviceFactory) {
            const service = await serviceFactory();
            result = await service.summarizeAll(summarizeOptions);
            await service.close();
          } else {
            result = { summarized: 0, failed: 0 };
          }

          spinner.succeed(`Summarization completed: ${result.summarized} communities`);

          if (result.failed > 0) {
            logger.warning(`Failed to summarize ${result.failed} communities`);
          }
        } catch (error) {
          spinner.fail('Summarization failed');
          logger.error(error instanceof Error ? error.message : String(error));
          process.exitCode = 1;
        }
      } else {
        // Summarize single community
        const spinner = createSpinner(`Summarizing community ${id}...`);
        spinner.start();

        try {
          let result: { summary: string; keywords: string[] };

          if (serviceFactory) {
            const service = await serviceFactory();
            result = await service.summarize(id!);
            await service.close();
          } else {
            result = {
              summary: 'Mock summary',
              keywords: ['keyword1', 'keyword2'],
            };
          }

          spinner.succeed('Summary generated');

          if (options.output === 'json') {
            console.log(JSON.stringify(result, null, 2));
          } else {
            console.log('\n  Summary:');
            console.log(`    ${result.summary}`);

            if (result.keywords.length > 0) {
              console.log('\n  Keywords:');
              console.log(`    ${result.keywords.join(', ')}`);
            }
            console.log();
          }
        } catch (error) {
          spinner.fail('Summarization failed');
          logger.error(error instanceof Error ? error.message : String(error));
          process.exitCode = 1;
        }
      }
    });

  // community hierarchy
  community
    .command('hierarchy [id]')
    .description('Show community hierarchy tree')
    .option('-o, --output <format>', 'Output format (tree, json)', 'tree')
    .action(async (id: string | undefined, options) => {
      const spinner = createSpinner('Fetching hierarchy...');
      spinner.start();

      try {
        let communities: CLICommunity[];

        if (serviceFactory) {
          const service = await serviceFactory();
          communities = await service.getHierarchy(id);
          await service.close();
        } else {
          communities = [];
        }

        spinner.succeed(`Found ${communities.length} communities in hierarchy`);

        if (options.output === 'json') {
          console.log(JSON.stringify(communities, null, 2));
        } else {
          if (communities.length > 0) {
            console.log('\n  Community Hierarchy:');

            // Group by level
            const byLevel = new Map<number, CLICommunity[]>();
            communities.forEach((c) => {
              const level = byLevel.get(c.level) || [];
              level.push(c);
              byLevel.set(c.level, level);
            });

            const sortedLevels = [...byLevel.keys()].sort((a, b) => a - b);
            sortedLevels.forEach((level) => {
              const comms = byLevel.get(level)!;
              console.log(`\n  Level ${level}:`);
              comms.forEach((c) => {
                const indent = '    '.repeat(level + 1);
                const title = c.title || c.id.slice(0, 8);
                console.log(`${indent}├─ ${title} (${c.entityCount} entities)`);
              });
            });
            console.log();
          } else {
            logger.info('No communities in hierarchy');
          }
        }
      } catch (error) {
        spinner.fail('Failed to fetch hierarchy');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  return community;
}

export { Command };
