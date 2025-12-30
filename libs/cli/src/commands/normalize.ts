/**
 * CLI normalize command
 * 
 * Commands for entity name normalization operations
 */

import { Command } from 'commander';
import { logger, createSpinner, formatTable } from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Result from normalize operation
 */
export interface NormalizeResult {
  original: string;
  normalized: string;
  wasNormalized: boolean;
  confidence: number;
  stage: 'rule' | 'similarity' | 'llm';
  aliasRegistered: boolean;
}

/**
 * Service interface for normalize operations
 */
export interface NormalizeService {
  /**
   * Normalize a single entity name
   */
  normalize(input: string, options?: NormalizeOptions): Promise<NormalizeResult>;
  
  /**
   * Normalize multiple entity names
   */
  normalizeAll(inputs: string[], options?: NormalizeOptions): Promise<NormalizeResult[]>;
  
  /**
   * Get all registered aliases
   */
  listAliases(options?: AliasListOptions): Promise<AliasEntry[]>;
  
  /**
   * Register a new alias
   */
  registerAlias(alias: string, canonical: string, confidence?: number): Promise<AliasEntry>;
  
  /**
   * Delete an alias
   */
  deleteAlias(alias: string): Promise<boolean>;
  
  /**
   * Get existing entities from the graph
   */
  getExistingEntities(): Promise<string[]>;
  
  /**
   * Add a normalization rule
   */
  addRule(pattern: string, replacement: string, priority?: number): Promise<void>;
  
  /**
   * List all normalization rules
   */
  listRules(): Promise<RuleEntry[]>;
  
  /**
   * Clean up resources
   */
  close(): Promise<void>;
}

/**
 * Options for normalization
 */
export interface NormalizeOptions {
  /** Skip LLM confirmation */
  skipLLM?: boolean;
  /** Force LLM confirmation */
  forceLLM?: boolean;
  /** Entity type hint */
  entityType?: string;
  /** Context text */
  context?: string;
  /** Whether to auto-register aliases */
  autoRegister?: boolean;
}

/**
 * Alias entry
 */
export interface AliasEntry {
  alias: string;
  canonical: string;
  confidence: number;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Options for listing aliases
 */
export interface AliasListOptions {
  canonical?: string;
  limit?: number;
  offset?: number;
}

/**
 * Normalization rule entry
 */
export interface RuleEntry {
  pattern: string;
  replacement: string;
  priority: number;
  source: string;
}

// ============================================================================
// Command Factory
// ============================================================================

/**
 * Create the normalize command with all subcommands
 */
export function createNormalizeCommand(
  serviceFactory?: () => Promise<NormalizeService>
): Command {
  const normalize = new Command('normalize')
    .description('Entity name normalization commands')
    .option('-c, --config <path>', 'Path to configuration file');

  // normalize run <input...>
  normalize
    .command('run')
    .description('Normalize one or more entity names')
    .argument('<input...>', 'Entity names to normalize')
    .option('--skip-llm', 'Skip LLM confirmation step', false)
    .option('--force-llm', 'Force LLM confirmation even for high-confidence matches', false)
    .option('-t, --type <type>', 'Entity type hint (e.g., AIModel, Technique)')
    .option('--context <text>', 'Context text for better matching')
    .option('--no-register', 'Do not auto-register aliases')
    .option('-o, --output <format>', 'Output format (table, json)', 'table')
    .action(async (inputs: string[], options) => {
      const spinner = createSpinner('Normalizing entities...');
      spinner.start();

      try {
        const normalizeOptions: NormalizeOptions = {
          skipLLM: options.skipLlm,
          forceLLM: options.forceLlm,
          entityType: options.type,
          context: options.context,
          autoRegister: options.register !== false,
        };

        let results: NormalizeResult[];

        if (serviceFactory) {
          const service = await serviceFactory();
          try {
            results = await service.normalizeAll(inputs, normalizeOptions);
          } finally {
            await service.close();
          }
        } else {
          // Mock implementation for testing
          results = inputs.map((input) => ({
            original: input,
            normalized: input,
            wasNormalized: false,
            confidence: 0,
            stage: 'rule' as const,
            aliasRegistered: false,
          }));
        }

        spinner.stop();

        if (options.output === 'json') {
          console.log(JSON.stringify(results, null, 2));
        } else {
          const tableData = results.map((r) => ({
            Original: r.original,
            Normalized: r.normalized,
            Changed: r.wasNormalized ? '✓' : '',
            Confidence: `${(r.confidence * 100).toFixed(0)}%`,
            Stage: r.stage,
            Alias: r.aliasRegistered ? '✓' : '',
          }));
          formatTable(tableData);
          
          const changedCount = results.filter(r => r.wasNormalized).length;
          logger.info(`Normalized ${changedCount}/${results.length} entities`);
        }
      } catch (error) {
        spinner.stop();
        logger.error('Failed to normalize entities:', error);
        process.exitCode = 1;
      }
    });

  // normalize alias list
  normalize
    .command('alias')
    .description('Manage normalization aliases')
    .argument('<action>', 'Action: list, add, remove')
    .argument('[alias]', 'Alias to add or remove')
    .argument('[canonical]', 'Canonical form (for add action)')
    .option('-l, --limit <n>', 'Limit results for list', '50')
    .option('--offset <n>', 'Offset for pagination', '0')
    .option('--canonical <name>', 'Filter by canonical name')
    .option('--confidence <n>', 'Confidence score for add (0-1)', '0.9')
    .option('-o, --output <format>', 'Output format (table, json)', 'table')
    .action(async (action: string, alias: string | undefined, canonical: string | undefined, options) => {
      const spinner = createSpinner(`Processing alias ${action}...`);
      spinner.start();

      try {
        if (!serviceFactory) {
          throw new Error('Service not available');
        }

        const service = await serviceFactory();

        try {
          switch (action) {
            case 'list': {
              const aliases = await service.listAliases({
                canonical: options.canonical,
                limit: parseInt(options.limit, 10),
                offset: parseInt(options.offset, 10),
              });

              spinner.stop();

              if (options.output === 'json') {
                console.log(JSON.stringify(aliases, null, 2));
              } else {
                const tableData = aliases.map((a) => ({
                  Alias: a.alias,
                  Canonical: a.canonical,
                  Confidence: `${(a.confidence * 100).toFixed(0)}%`,
                  Source: a.source,
                  Updated: new Date(a.updatedAt).toISOString().split('T')[0],
                }));
                formatTable(tableData);
                logger.info(`Total: ${aliases.length} aliases`);
              }
              break;
            }

            case 'add': {
              if (!alias || !canonical) {
                throw new Error('Both alias and canonical are required for add action');
              }

              const entry = await service.registerAlias(
                alias,
                canonical,
                parseFloat(options.confidence)
              );

              spinner.stop();

              if (options.output === 'json') {
                console.log(JSON.stringify(entry, null, 2));
              } else {
                logger.success(`Registered alias: "${alias}" → "${canonical}"`);
              }
              break;
            }

            case 'remove': {
              if (!alias) {
                throw new Error('Alias is required for remove action');
              }

              const deleted = await service.deleteAlias(alias);
              spinner.stop();

              if (deleted) {
                logger.success(`Removed alias: "${alias}"`);
              } else {
                logger.warn(`Alias not found: "${alias}"`);
              }
              break;
            }

            default:
              throw new Error(`Unknown action: ${action}. Use list, add, or remove.`);
          }
        } finally {
          await service.close();
        }
      } catch (error) {
        spinner.stop();
        logger.error('Failed to process alias:', error);
        process.exitCode = 1;
      }
    });

  // normalize rules
  normalize
    .command('rules')
    .description('Manage normalization rules')
    .argument('<action>', 'Action: list, add')
    .argument('[pattern]', 'Pattern to match (for add)')
    .argument('[replacement]', 'Replacement text (for add)')
    .option('-p, --priority <n>', 'Rule priority (higher = processed first)', '100')
    .option('-o, --output <format>', 'Output format (table, json)', 'table')
    .action(async (action: string, pattern: string | undefined, replacement: string | undefined, options) => {
      const spinner = createSpinner(`Processing rules ${action}...`);
      spinner.start();

      try {
        if (!serviceFactory) {
          throw new Error('Service not available');
        }

        const service = await serviceFactory();

        try {
          switch (action) {
            case 'list': {
              const rules = await service.listRules();
              spinner.stop();

              if (options.output === 'json') {
                console.log(JSON.stringify(rules, null, 2));
              } else {
                const tableData = rules.map((r) => ({
                  Pattern: r.pattern,
                  Replacement: r.replacement,
                  Priority: r.priority,
                  Source: r.source,
                }));
                formatTable(tableData);
                logger.info(`Total: ${rules.length} rules`);
              }
              break;
            }

            case 'add': {
              if (!pattern || !replacement) {
                throw new Error('Both pattern and replacement are required for add action');
              }

              await service.addRule(pattern, replacement, parseInt(options.priority, 10));
              spinner.stop();
              logger.success(`Added rule: "${pattern}" → "${replacement}"`);
              break;
            }

            default:
              throw new Error(`Unknown action: ${action}. Use list or add.`);
          }
        } finally {
          await service.close();
        }
      } catch (error) {
        spinner.stop();
        logger.error('Failed to process rules:', error);
        process.exitCode = 1;
      }
    });

  // normalize entities
  normalize
    .command('entities')
    .description('List existing entities in the graph')
    .option('-t, --type <type>', 'Filter by entity type')
    .option('-l, --limit <n>', 'Limit results', '100')
    .option('-o, --output <format>', 'Output format (list, json)', 'list')
    .action(async (options) => {
      const spinner = createSpinner('Fetching existing entities...');
      spinner.start();

      try {
        let entities: string[];

        if (serviceFactory) {
          const service = await serviceFactory();
          try {
            entities = await service.getExistingEntities();
          } finally {
            await service.close();
          }
        } else {
          entities = [];
        }

        spinner.stop();

        if (options.output === 'json') {
          console.log(JSON.stringify(entities, null, 2));
        } else {
          const limit = parseInt(options.limit, 10);
          const limited = entities.slice(0, limit);
          limited.forEach((e) => console.log(e));
          
          if (entities.length > limit) {
            logger.info(`Showing ${limit} of ${entities.length} entities. Use --limit to see more.`);
          } else {
            logger.info(`Total: ${entities.length} entities`);
          }
        }
      } catch (error) {
        spinner.stop();
        logger.error('Failed to fetch entities:', error);
        process.exitCode = 1;
      }
    });

  // normalize batch
  normalize
    .command('batch')
    .description('Normalize entities from a file')
    .argument('<file>', 'Input file (one entity per line, or JSON array)')
    .option('--skip-llm', 'Skip LLM confirmation step', false)
    .option('-t, --type <type>', 'Entity type hint')
    .option('--no-register', 'Do not auto-register aliases')
    .option('-o, --output <file>', 'Output file (defaults to stdout)')
    .option('-f, --format <format>', 'Output format (json, csv)', 'json')
    .action(async (file: string, options) => {
      const spinner = createSpinner(`Processing batch file: ${file}`);
      spinner.start();

      try {
        // Read file
        const fs = await import('node:fs/promises');
        const content = await fs.readFile(file, 'utf-8');
        
        // Parse input
        let inputs: string[];
        try {
          inputs = JSON.parse(content);
          if (!Array.isArray(inputs)) {
            throw new Error('Expected array');
          }
        } catch {
          // Try line-by-line format
          inputs = content.split('\n').map(l => l.trim()).filter(Boolean);
        }

        spinner.stop();
        logger.info(`Found ${inputs.length} entities to normalize`);
        
        const batchSpinner = createSpinner(`Normalizing ${inputs.length} entities...`);
        batchSpinner.start();

        const normalizeOptions: NormalizeOptions = {
          skipLLM: options.skipLlm,
          entityType: options.type,
          autoRegister: options.register !== false,
        };

        let results: NormalizeResult[];

        if (serviceFactory) {
          const service = await serviceFactory();
          try {
            results = await service.normalizeAll(inputs, normalizeOptions);
          } finally {
            await service.close();
          }
        } else {
          results = inputs.map((input) => ({
            original: input,
            normalized: input,
            wasNormalized: false,
            confidence: 0,
            stage: 'rule' as const,
            aliasRegistered: false,
          }));
        }

        batchSpinner.stop();

        // Format output
        let output: string;
        if (options.format === 'csv') {
          const header = 'original,normalized,changed,confidence,stage';
          const rows = results.map(r => 
            `"${r.original}","${r.normalized}",${r.wasNormalized},${r.confidence},${r.stage}`
          );
          output = [header, ...rows].join('\n');
        } else {
          output = JSON.stringify(results, null, 2);
        }

        // Write output
        if (options.output) {
          await fs.writeFile(options.output, output);
          logger.success(`Results written to: ${options.output}`);
        } else {
          console.log(output);
        }

        const changedCount = results.filter(r => r.wasNormalized).length;
        logger.info(`Normalized ${changedCount}/${results.length} entities`);
      } catch (error) {
        spinner.stop();
        logger.error('Failed to process batch:', error);
        process.exitCode = 1;
      }
    });

  return normalize;
}
