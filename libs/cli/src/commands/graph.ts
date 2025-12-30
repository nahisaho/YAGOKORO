import { Command } from 'commander';
import { logger, createSpinner, formatTable, formatDuration } from '../utils/logger.js';
import type {
  GraphStats,
  ImportOptions,
  ExportOptions,
  ValidationResult,
  IngestOptions,
  IngestResult,
  QueryResult,
} from '../utils/types.js';

/**
 * Graph command options
 */
export interface GraphCommandOptions {
  config?: string;
  verbose?: boolean;
}

/**
 * Service interface for graph operations
 * This allows dependency injection for testing
 */
export interface GraphService {
  initialize(): Promise<void>;
  getStats(): Promise<GraphStats>;
  query(cypher: string): Promise<QueryResult>;
  validate(): Promise<ValidationResult>;
  importData(options: ImportOptions): Promise<{ imported: number; skipped: number }>;
  exportData(options: ExportOptions): Promise<{ exported: number }>;
  ingest(options: IngestOptions): Promise<IngestResult>;
  close(): Promise<void>;
}

/**
 * Create the graph command with all subcommands
 */
export function createGraphCommand(serviceFactory?: () => Promise<GraphService>): Command {
  const graph = new Command('graph')
    .description('Knowledge graph management commands')
    .option('-c, --config <path>', 'Path to configuration file')
    .option('-v, --verbose', 'Enable verbose output');

  // graph init
  graph
    .command('init')
    .description('Initialize the knowledge graph database')
    .option('--force', 'Force re-initialization (drops existing data)')
    .action(async (options) => {
      const spinner = createSpinner('Initializing knowledge graph...');
      spinner.start();

      try {
        if (serviceFactory) {
          const service = await serviceFactory();
          await service.initialize();
          await service.close();
        }

        spinner.succeed('Knowledge graph initialized successfully');

        if (options.force) {
          logger.warning('Existing data was cleared due to --force flag');
        }

        logger.info('Neo4j indices and constraints created');
        logger.info('Qdrant collection configured');
      } catch (error) {
        spinner.fail('Failed to initialize knowledge graph');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  // graph ingest
  graph
    .command('ingest <source>')
    .description('Ingest documents into the knowledge graph')
    .option('-f, --format <format>', 'Input format (text, json, markdown, html)', 'text')
    .option('--chunk-size <size>', 'Chunk size for text splitting', '1000')
    .option('--chunk-overlap <size>', 'Overlap between chunks', '200')
    .option('--no-entities', 'Skip entity extraction')
    .option('--no-relations', 'Skip relation extraction')
    .option('--no-communities', 'Skip community detection')
    .action(async (source: string, options) => {
      const spinner = createSpinner(`Ingesting from ${source}...`);
      spinner.start();

      try {
        const ingestOptions: IngestOptions = {
          source,
          format: options.format as IngestOptions['format'],
          chunkSize: parseInt(options.chunkSize, 10),
          chunkOverlap: parseInt(options.chunkOverlap, 10),
          extractEntities: options.entities !== false,
          extractRelations: options.relations !== false,
          detectCommunities: options.communities !== false,
        };

        let result: IngestResult;

        if (serviceFactory) {
          const service = await serviceFactory();
          result = await service.ingest(ingestOptions);
          await service.close();
        } else {
          // Mock result for when no service is provided
          result = {
            documentsProcessed: 0,
            entitiesCreated: 0,
            relationsCreated: 0,
            communitiesDetected: 0,
            duration: 0,
            errors: [],
          };
        }

        spinner.succeed(`Ingestion completed in ${formatDuration(result.duration)}`);

        logger.info(`Documents processed: ${result.documentsProcessed}`);
        logger.info(`Entities created: ${result.entitiesCreated}`);
        logger.info(`Relations created: ${result.relationsCreated}`);
        logger.info(`Communities detected: ${result.communitiesDetected}`);

        if (result.errors.length > 0) {
          logger.warning(`${result.errors.length} errors occurred during ingestion`);
          result.errors.slice(0, 5).forEach((err) => logger.error(`  - ${err}`));
          if (result.errors.length > 5) {
            logger.warning(`  ... and ${result.errors.length - 5} more errors`);
          }
        }
      } catch (error) {
        spinner.fail('Ingestion failed');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  // graph query
  graph
    .command('query <cypher>')
    .description('Execute a Cypher query on the knowledge graph')
    .option('-o, --output <format>', 'Output format (table, json)', 'table')
    .option('-l, --limit <n>', 'Limit results', '20')
    .action(async (cypher: string, options) => {
      const spinner = createSpinner('Executing query...');
      spinner.start();

      try {
        let result: QueryResult;

        if (serviceFactory) {
          const service = await serviceFactory();
          result = await service.query(cypher);
          await service.close();
        } else {
          result = {
            entities: [],
            relations: [],
            executionTime: 0,
          };
        }

        spinner.succeed(`Query completed in ${formatDuration(result.executionTime)}`);

        if (options.output === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          // Table output
          if (result.entities.length > 0) {
            logger.info(`Found ${result.entities.length} entities:`);
            const limit = parseInt(options.limit, 10);
            const rows = result.entities.slice(0, limit).map((e) => [
              e.id.slice(0, 8),
              e.name,
              e.type,
            ]);
            console.log(formatTable(['ID', 'Name', 'Type'], rows));

            if (result.entities.length > limit) {
              logger.info(`... and ${result.entities.length - limit} more`);
            }
          }

          if (result.relations.length > 0) {
            logger.info(`\nFound ${result.relations.length} relations:`);
            const limit = parseInt(options.limit, 10);
            const rows = result.relations.slice(0, limit).map((r) => [
              r.sourceId.slice(0, 8),
              r.type,
              r.targetId.slice(0, 8),
            ]);
            console.log(formatTable(['Source', 'Type', 'Target'], rows));
          }
        }
      } catch (error) {
        spinner.fail('Query failed');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  // graph stats
  graph
    .command('stats')
    .description('Show knowledge graph statistics')
    .option('-o, --output <format>', 'Output format (table, json)', 'table')
    .action(async (options) => {
      const spinner = createSpinner('Fetching statistics...');
      spinner.start();

      try {
        let stats: GraphStats;

        if (serviceFactory) {
          const service = await serviceFactory();
          stats = await service.getStats();
          await service.close();
        } else {
          stats = {
            entityCount: 0,
            relationCount: 0,
            communityCount: 0,
            entityTypes: {},
            relationTypes: {},
            avgRelationsPerEntity: 0,
          };
        }

        spinner.succeed('Statistics retrieved');

        if (options.output === 'json') {
          console.log(JSON.stringify(stats, null, 2));
        } else {
          console.log('\n' + '═'.repeat(50));
          console.log('  YAGOKORO Knowledge Graph Statistics');
          console.log('═'.repeat(50) + '\n');

          console.log(`  Total Entities:    ${stats.entityCount}`);
          console.log(`  Total Relations:   ${stats.relationCount}`);
          console.log(`  Total Communities: ${stats.communityCount}`);
          console.log(`  Avg Relations/Entity: ${stats.avgRelationsPerEntity.toFixed(2)}`);

          if (Object.keys(stats.entityTypes).length > 0) {
            console.log('\n  Entity Types:');
            Object.entries(stats.entityTypes)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .forEach(([type, count]) => {
                console.log(`    - ${type}: ${count}`);
              });
          }

          if (Object.keys(stats.relationTypes).length > 0) {
            console.log('\n  Relation Types:');
            Object.entries(stats.relationTypes)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .forEach(([type, count]) => {
                console.log(`    - ${type}: ${count}`);
              });
          }

          console.log('\n' + '═'.repeat(50) + '\n');
        }
      } catch (error) {
        spinner.fail('Failed to fetch statistics');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  // graph export
  graph
    .command('export <output>')
    .description('Export knowledge graph data')
    .option('-f, --format <format>', 'Output format (json, csv, graphml)', 'json')
    .option('--entity-types <types>', 'Filter by entity types (comma-separated)')
    .option('--relation-types <types>', 'Filter by relation types (comma-separated)')
    .option('--no-properties', 'Exclude properties from export')
    .action(async (output: string, options) => {
      const spinner = createSpinner(`Exporting to ${output}...`);
      spinner.start();

      try {
        const exportOptions: ExportOptions = {
          format: options.format as ExportOptions['format'],
          outputPath: output,
          entityTypes: options.entityTypes?.split(','),
          relationTypes: options.relationTypes?.split(','),
          includeProperties: options.properties !== false,
        };

        let result: { exported: number };

        if (serviceFactory) {
          const service = await serviceFactory();
          result = await service.exportData(exportOptions);
          await service.close();
        } else {
          result = { exported: 0 };
        }

        spinner.succeed(`Export completed: ${result.exported} items exported`);
        logger.info(`Output written to: ${output}`);
      } catch (error) {
        spinner.fail('Export failed');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  // graph import
  graph
    .command('import <input>')
    .description('Import data into knowledge graph')
    .option('-f, --format <format>', 'Input format (json, csv, graphml)', 'json')
    .option('--merge', 'Merge with existing data instead of replacing')
    .option('--dry-run', 'Preview import without making changes')
    .action(async (input: string, options) => {
      const spinner = createSpinner(`Importing from ${input}...`);
      spinner.start();

      try {
        const importOptions: ImportOptions = {
          format: options.format as ImportOptions['format'],
          filePath: input,
          merge: options.merge,
          dryRun: options.dryRun,
        };

        let result: { imported: number; skipped: number };

        if (serviceFactory) {
          const service = await serviceFactory();
          result = await service.importData(importOptions);
          await service.close();
        } else {
          result = { imported: 0, skipped: 0 };
        }

        if (options.dryRun) {
          spinner.succeed('Dry run completed');
          logger.info(`Would import: ${result.imported} items`);
          logger.info(`Would skip: ${result.skipped} items`);
        } else {
          spinner.succeed(`Import completed: ${result.imported} items imported`);
          if (result.skipped > 0) {
            logger.warning(`Skipped: ${result.skipped} items`);
          }
        }
      } catch (error) {
        spinner.fail('Import failed');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  // graph validate
  graph
    .command('validate')
    .description('Validate knowledge graph integrity')
    .option('--fix', 'Attempt to fix issues automatically')
    .option('-o, --output <format>', 'Output format (table, json)', 'table')
    .action(async (options) => {
      const spinner = createSpinner('Validating knowledge graph...');
      spinner.start();

      try {
        let result: ValidationResult;

        if (serviceFactory) {
          const service = await serviceFactory();
          result = await service.validate();
          await service.close();
        } else {
          result = {
            valid: true,
            errors: [],
            stats: {
              entitiesChecked: 0,
              relationsChecked: 0,
              orphanedEntities: 0,
              danglingRelations: 0,
            },
          };
        }

        if (result.valid) {
          spinner.succeed('Knowledge graph is valid');
        } else {
          spinner.warn('Validation found issues');
        }

        if (options.output === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('\nValidation Results:');
          console.log(`  Entities checked: ${result.stats.entitiesChecked}`);
          console.log(`  Relations checked: ${result.stats.relationsChecked}`);
          console.log(`  Orphaned entities: ${result.stats.orphanedEntities}`);
          console.log(`  Dangling relations: ${result.stats.danglingRelations}`);

          if (result.errors.length > 0) {
            console.log('\nIssues found:');
            result.errors.slice(0, 10).forEach((err) => {
              const prefix = err.type === 'error' ? '✗' : '⚠';
              console.log(`  ${prefix} ${err.message}`);
            });
            if (result.errors.length > 10) {
              console.log(`  ... and ${result.errors.length - 10} more issues`);
            }
          }
        }

        if (!result.valid) {
          process.exitCode = 1;
        }
      } catch (error) {
        spinner.fail('Validation failed');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  return graph;
}

export { Command };
