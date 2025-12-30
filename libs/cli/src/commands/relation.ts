import { Command } from 'commander';
import { logger, createSpinner, formatTable } from '../utils/logger.js';

/**
 * Relation data structure for CLI
 */
export interface CLIRelation {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  sourceName?: string | undefined;
  targetName?: string | undefined;
  weight?: number | undefined;
  properties?: Record<string, unknown> | undefined;
  createdAt?: string | undefined;
}

/**
 * Service interface for relation operations
 */
export interface RelationService {
  list(options: RelationListOptions): Promise<{ relations: CLIRelation[]; total: number }>;
  get(id: string): Promise<CLIRelation | null>;
  create(data: RelationCreateData): Promise<CLIRelation>;
  delete(id: string): Promise<boolean>;
  getByEntity(entityId: string, direction?: 'in' | 'out' | 'both'): Promise<CLIRelation[]>;
  close(): Promise<void>;
}

/**
 * Options for listing relations
 */
export interface RelationListOptions {
  type?: string | undefined;
  sourceId?: string | undefined;
  targetId?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

/**
 * Data for creating a relation
 */
export interface RelationCreateData {
  type: string;
  sourceId: string;
  targetId: string;
  weight?: number | undefined;
  properties?: Record<string, unknown> | undefined;
}

/**
 * Create the relation command with all subcommands
 */
export function createRelationCommand(serviceFactory?: () => Promise<RelationService>): Command {
  const relation = new Command('relation')
    .description('Relation management commands')
    .option('-c, --config <path>', 'Path to configuration file');

  // relation list
  relation
    .command('list')
    .description('List all relations')
    .option('-t, --type <type>', 'Filter by relation type')
    .option('--source <id>', 'Filter by source entity ID')
    .option('--target <id>', 'Filter by target entity ID')
    .option('-l, --limit <n>', 'Limit results', '20')
    .option('--offset <n>', 'Offset for pagination', '0')
    .option('-o, --output <format>', 'Output format (table, json)', 'table')
    .action(async (options) => {
      const spinner = createSpinner('Fetching relations...');
      spinner.start();

      try {
        const listOptions: RelationListOptions = {
          type: options.type,
          sourceId: options.source,
          targetId: options.target,
          limit: parseInt(options.limit, 10),
          offset: parseInt(options.offset, 10),
        };

        let result: { relations: CLIRelation[]; total: number };

        if (serviceFactory) {
          const service = await serviceFactory();
          result = await service.list(listOptions);
          await service.close();
        } else {
          result = { relations: [], total: 0 };
        }

        spinner.succeed(`Found ${result.total} relations`);

        if (options.output === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          if (result.relations.length > 0) {
            const rows = result.relations.map((r) => [
              r.id.slice(0, 8),
              r.sourceName || r.sourceId.slice(0, 8),
              r.type,
              r.targetName || r.targetId.slice(0, 8),
              r.weight?.toFixed(2) || '-',
            ]);
            console.log(formatTable(['ID', 'Source', 'Type', 'Target', 'Weight'], rows));

            if (result.total > result.relations.length) {
              logger.info(`Showing ${result.relations.length} of ${result.total} relations`);
            }
          } else {
            logger.info('No relations found');
          }
        }
      } catch (error) {
        spinner.fail('Failed to fetch relations');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  // relation get
  relation
    .command('get <id>')
    .description('Get relation details by ID')
    .option('-o, --output <format>', 'Output format (detail, json)', 'detail')
    .action(async (id: string, options) => {
      const spinner = createSpinner(`Fetching relation ${id}...`);
      spinner.start();

      try {
        let rel: CLIRelation | null = null;

        if (serviceFactory) {
          const service = await serviceFactory();
          rel = await service.get(id);
          await service.close();
        }

        if (!rel) {
          spinner.fail(`Relation not found: ${id}`);
          process.exitCode = 1;
          return;
        }

        spinner.succeed('Relation found');

        if (options.output === 'json') {
          console.log(JSON.stringify(rel, null, 2));
        } else {
          console.log('\n' + '═'.repeat(50));
          console.log(`  Relation: ${rel.type}`);
          console.log('═'.repeat(50) + '\n');

          console.log(`  ID:       ${rel.id}`);
          console.log(`  Type:     ${rel.type}`);
          console.log(`  Source:   ${rel.sourceName || rel.sourceId}`);
          console.log(`  Target:   ${rel.targetName || rel.targetId}`);

          if (rel.weight !== undefined) {
            console.log(`  Weight:   ${rel.weight}`);
          }

          if (rel.properties && Object.keys(rel.properties).length > 0) {
            console.log('\n  Properties:');
            Object.entries(rel.properties).forEach(([key, value]) => {
              console.log(`    ${key}: ${JSON.stringify(value)}`);
            });
          }

          if (rel.createdAt) {
            console.log(`\n  Created: ${rel.createdAt}`);
          }

          console.log('\n' + '═'.repeat(50) + '\n');
        }
      } catch (error) {
        spinner.fail('Failed to fetch relation');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  // relation create
  relation
    .command('create')
    .description('Create a new relation')
    .requiredOption('-t, --type <type>', 'Relation type')
    .requiredOption('-s, --source <id>', 'Source entity ID')
    .requiredOption('--target <id>', 'Target entity ID')
    .option('-w, --weight <weight>', 'Relation weight (0-1)')
    .option('-p, --properties <json>', 'Properties as JSON string')
    .option('-o, --output <format>', 'Output format (detail, json)', 'detail')
    .action(async (options) => {
      const spinner = createSpinner('Creating relation...');
      spinner.start();

      try {
        const createData: RelationCreateData = {
          type: options.type,
          sourceId: options.source,
          targetId: options.target,
          weight: options.weight ? parseFloat(options.weight) : undefined,
          properties: options.properties ? JSON.parse(options.properties) : undefined,
        };

        let rel: CLIRelation;

        if (serviceFactory) {
          const service = await serviceFactory();
          rel = await service.create(createData);
          await service.close();
        } else {
          rel = {
            id: 'mock-relation-id',
            type: createData.type,
            sourceId: createData.sourceId,
            targetId: createData.targetId,
            weight: createData.weight,
            properties: createData.properties,
          };
        }

        spinner.succeed(`Relation created: ${rel.id}`);

        if (options.output === 'json') {
          console.log(JSON.stringify(rel, null, 2));
        } else {
          logger.info(`Type: ${rel.type}`);
          logger.info(`Source: ${rel.sourceId}`);
          logger.info(`Target: ${rel.targetId}`);
        }
      } catch (error) {
        spinner.fail('Failed to create relation');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  // relation delete
  relation
    .command('delete <id>')
    .description('Delete a relation')
    .option('-f, --force', 'Skip confirmation')
    .action(async (id: string, options) => {
      if (!options.force) {
        logger.warning(`This will delete relation ${id}.`);
        logger.info('Use --force to skip this warning.');
      }

      const spinner = createSpinner(`Deleting relation ${id}...`);
      spinner.start();

      try {
        let deleted = false;

        if (serviceFactory) {
          const service = await serviceFactory();
          deleted = await service.delete(id);
          await service.close();
        } else {
          deleted = true;
        }

        if (deleted) {
          spinner.succeed(`Relation deleted: ${id}`);
        } else {
          spinner.fail(`Relation not found: ${id}`);
          process.exitCode = 1;
        }
      } catch (error) {
        spinner.fail('Failed to delete relation');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  // relation by-entity
  relation
    .command('by-entity <entityId>')
    .description('Get all relations for an entity')
    .option('-d, --direction <dir>', 'Relation direction (in, out, both)', 'both')
    .option('-o, --output <format>', 'Output format (table, json)', 'table')
    .action(async (entityId: string, options) => {
      const spinner = createSpinner(`Fetching relations for entity ${entityId}...`);
      spinner.start();

      try {
        let relations: CLIRelation[];

        if (serviceFactory) {
          const service = await serviceFactory();
          relations = await service.getByEntity(entityId, options.direction);
          await service.close();
        } else {
          relations = [];
        }

        spinner.succeed(`Found ${relations.length} relations`);

        if (options.output === 'json') {
          console.log(JSON.stringify(relations, null, 2));
        } else {
          if (relations.length > 0) {
            const rows = relations.map((r) => {
              const isOutgoing = r.sourceId === entityId;
              const direction = isOutgoing ? '→' : '←';
              const otherId = isOutgoing ? r.targetId : r.sourceId;
              const otherName = isOutgoing ? r.targetName : r.sourceName;

              return [
                r.id.slice(0, 8),
                direction,
                r.type,
                otherName || otherId.slice(0, 8),
                r.weight?.toFixed(2) || '-',
              ];
            });
            console.log(formatTable(['ID', 'Dir', 'Type', 'Entity', 'Weight'], rows));
          } else {
            logger.info('No relations found for this entity');
          }
        }
      } catch (error) {
        spinner.fail('Failed to fetch relations');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  return relation;
}

export { Command };
