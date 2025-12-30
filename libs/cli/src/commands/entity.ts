import { Command } from 'commander';
import { logger, createSpinner, formatTable } from '../utils/logger.js';

/**
 * Entity data structure for CLI
 */
export interface CLIEntity {
  id: string;
  name: string;
  type: string;
  description?: string | undefined;
  properties?: Record<string, unknown> | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

/**
 * Service interface for entity operations
 */
export interface EntityService {
  list(options: EntityListOptions): Promise<{ entities: CLIEntity[]; total: number }>;
  get(id: string): Promise<CLIEntity | null>;
  create(data: EntityCreateData): Promise<CLIEntity>;
  update(id: string, data: EntityUpdateData): Promise<CLIEntity>;
  delete(id: string): Promise<boolean>;
  search(query: string, options?: EntitySearchOptions): Promise<CLIEntity[]>;
  close(): Promise<void>;
}

/**
 * Options for listing entities
 */
export interface EntityListOptions {
  type?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
  sortBy?: string | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
}

/**
 * Data for creating an entity
 */
export interface EntityCreateData {
  name: string;
  type: string;
  description?: string | undefined;
  properties?: Record<string, unknown> | undefined;
}

/**
 * Data for updating an entity
 */
export interface EntityUpdateData {
  name?: string | undefined;
  type?: string | undefined;
  description?: string | undefined;
  properties?: Record<string, unknown> | undefined;
}

/**
 * Options for searching entities
 */
export interface EntitySearchOptions {
  type?: string | undefined;
  limit?: number | undefined;
}

/**
 * Create the entity command with all subcommands
 */
export function createEntityCommand(serviceFactory?: () => Promise<EntityService>): Command {
  const entity = new Command('entity')
    .description('Entity management commands')
    .option('-c, --config <path>', 'Path to configuration file');

  // entity list
  entity
    .command('list')
    .description('List all entities')
    .option('-t, --type <type>', 'Filter by entity type')
    .option('-l, --limit <n>', 'Limit results', '20')
    .option('--offset <n>', 'Offset for pagination', '0')
    .option('-s, --sort <field>', 'Sort by field', 'name')
    .option('--order <order>', 'Sort order (asc/desc)', 'asc')
    .option('-o, --output <format>', 'Output format (table, json)', 'table')
    .action(async (options) => {
      const spinner = createSpinner('Fetching entities...');
      spinner.start();

      try {
        const listOptions: EntityListOptions = {
          type: options.type,
          limit: parseInt(options.limit, 10),
          offset: parseInt(options.offset, 10),
          sortBy: options.sort,
          sortOrder: options.order as 'asc' | 'desc',
        };

        let result: { entities: CLIEntity[]; total: number };

        if (serviceFactory) {
          const service = await serviceFactory();
          result = await service.list(listOptions);
          await service.close();
        } else {
          result = { entities: [], total: 0 };
        }

        spinner.succeed(`Found ${result.total} entities`);

        if (options.output === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          if (result.entities.length > 0) {
            const rows = result.entities.map((e) => [
              e.id.slice(0, 8),
              e.name,
              e.type,
              e.description?.slice(0, 40) || '-',
            ]);
            console.log(formatTable(['ID', 'Name', 'Type', 'Description'], rows));

            if (result.total > result.entities.length) {
              logger.info(`Showing ${result.entities.length} of ${result.total} entities`);
            }
          } else {
            logger.info('No entities found');
          }
        }
      } catch (error) {
        spinner.fail('Failed to fetch entities');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  // entity get
  entity
    .command('get <id>')
    .description('Get entity details by ID')
    .option('-o, --output <format>', 'Output format (detail, json)', 'detail')
    .action(async (id: string, options) => {
      const spinner = createSpinner(`Fetching entity ${id}...`);
      spinner.start();

      try {
        let entity: CLIEntity | null = null;

        if (serviceFactory) {
          const service = await serviceFactory();
          entity = await service.get(id);
          await service.close();
        }

        if (!entity) {
          spinner.fail(`Entity not found: ${id}`);
          process.exitCode = 1;
          return;
        }

        spinner.succeed('Entity found');

        if (options.output === 'json') {
          console.log(JSON.stringify(entity, null, 2));
        } else {
          console.log('\n' + '═'.repeat(50));
          console.log(`  Entity: ${entity.name}`);
          console.log('═'.repeat(50) + '\n');

          console.log(`  ID:          ${entity.id}`);
          console.log(`  Type:        ${entity.type}`);
          console.log(`  Description: ${entity.description || '-'}`);

          if (entity.properties && Object.keys(entity.properties).length > 0) {
            console.log('\n  Properties:');
            Object.entries(entity.properties).forEach(([key, value]) => {
              console.log(`    ${key}: ${JSON.stringify(value)}`);
            });
          }

          if (entity.createdAt) {
            console.log(`\n  Created: ${entity.createdAt}`);
          }
          if (entity.updatedAt) {
            console.log(`  Updated: ${entity.updatedAt}`);
          }

          console.log('\n' + '═'.repeat(50) + '\n');
        }
      } catch (error) {
        spinner.fail('Failed to fetch entity');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  // entity create
  entity
    .command('create')
    .description('Create a new entity')
    .requiredOption('-n, --name <name>', 'Entity name')
    .requiredOption('-t, --type <type>', 'Entity type')
    .option('-d, --description <desc>', 'Entity description')
    .option('-p, --properties <json>', 'Properties as JSON string')
    .option('-o, --output <format>', 'Output format (detail, json)', 'detail')
    .action(async (options) => {
      const spinner = createSpinner('Creating entity...');
      spinner.start();

      try {
        const createData: EntityCreateData = {
          name: options.name,
          type: options.type,
          description: options.description,
          properties: options.properties ? JSON.parse(options.properties) : undefined,
        };

        let entity: CLIEntity;

        if (serviceFactory) {
          const service = await serviceFactory();
          entity = await service.create(createData);
          await service.close();
        } else {
          entity = {
            id: 'mock-id',
            name: createData.name,
            type: createData.type,
            description: createData.description,
            properties: createData.properties,
          };
        }

        spinner.succeed(`Entity created: ${entity.id}`);

        if (options.output === 'json') {
          console.log(JSON.stringify(entity, null, 2));
        } else {
          logger.info(`Name: ${entity.name}`);
          logger.info(`Type: ${entity.type}`);
        }
      } catch (error) {
        spinner.fail('Failed to create entity');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  // entity update
  entity
    .command('update <id>')
    .description('Update an existing entity')
    .option('-n, --name <name>', 'New entity name')
    .option('-t, --type <type>', 'New entity type')
    .option('-d, --description <desc>', 'New description')
    .option('-p, --properties <json>', 'Properties as JSON string (merges with existing)')
    .option('-o, --output <format>', 'Output format (detail, json)', 'detail')
    .action(async (id: string, options) => {
      const spinner = createSpinner(`Updating entity ${id}...`);
      spinner.start();

      try {
        const updateData: EntityUpdateData = {};
        if (options.name) updateData.name = options.name;
        if (options.type) updateData.type = options.type;
        if (options.description) updateData.description = options.description;
        if (options.properties) updateData.properties = JSON.parse(options.properties);

        if (Object.keys(updateData).length === 0) {
          spinner.fail('No update data provided');
          process.exitCode = 1;
          return;
        }

        let entity: CLIEntity;

        if (serviceFactory) {
          const service = await serviceFactory();
          entity = await service.update(id, updateData);
          await service.close();
        } else {
          entity = {
            id,
            name: updateData.name || 'mock-name',
            type: updateData.type || 'mock-type',
            description: updateData.description,
            properties: updateData.properties,
          };
        }

        spinner.succeed(`Entity updated: ${entity.id}`);

        if (options.output === 'json') {
          console.log(JSON.stringify(entity, null, 2));
        } else {
          logger.info(`Name: ${entity.name}`);
          logger.info(`Type: ${entity.type}`);
        }
      } catch (error) {
        spinner.fail('Failed to update entity');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  // entity delete
  entity
    .command('delete <id>')
    .description('Delete an entity')
    .option('-f, --force', 'Skip confirmation')
    .action(async (id: string, options) => {
      if (!options.force) {
        logger.warning(`This will delete entity ${id} and all its relations.`);
        logger.info('Use --force to skip this warning.');
      }

      const spinner = createSpinner(`Deleting entity ${id}...`);
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
          spinner.succeed(`Entity deleted: ${id}`);
        } else {
          spinner.fail(`Entity not found: ${id}`);
          process.exitCode = 1;
        }
      } catch (error) {
        spinner.fail('Failed to delete entity');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  // entity search
  entity
    .command('search <query>')
    .description('Search entities by name or description')
    .option('-t, --type <type>', 'Filter by entity type')
    .option('-l, --limit <n>', 'Limit results', '10')
    .option('-o, --output <format>', 'Output format (table, json)', 'table')
    .action(async (query: string, options) => {
      const spinner = createSpinner(`Searching for "${query}"...`);
      spinner.start();

      try {
        const searchOptions: EntitySearchOptions = {
          type: options.type,
          limit: parseInt(options.limit, 10),
        };

        let entities: CLIEntity[];

        if (serviceFactory) {
          const service = await serviceFactory();
          entities = await service.search(query, searchOptions);
          await service.close();
        } else {
          entities = [];
        }

        spinner.succeed(`Found ${entities.length} entities`);

        if (options.output === 'json') {
          console.log(JSON.stringify(entities, null, 2));
        } else {
          if (entities.length > 0) {
            const rows = entities.map((e) => [
              e.id.slice(0, 8),
              e.name,
              e.type,
              e.description?.slice(0, 40) || '-',
            ]);
            console.log(formatTable(['ID', 'Name', 'Type', 'Description'], rows));
          } else {
            logger.info('No entities found matching the search query');
          }
        }
      } catch (error) {
        spinner.fail('Search failed');
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  return entity;
}

export { Command };
