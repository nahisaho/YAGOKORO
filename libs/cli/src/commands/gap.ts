/**
 * Gap command - Research gap analysis operations
 */

import { Command } from 'commander';
import { logger, createSpinner } from '../utils/logger.js';

/**
 * Research gap for CLI
 */
export interface CLIResearchGap {
  id: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  relatedEntities: string[];
  suggestedActions: string[];
  score: number;
}

/**
 * Gap analysis report for CLI
 */
export interface CLIGapReport {
  id: string;
  generatedAt: Date;
  totalGaps: number;
  gapsByType: Record<string, number>;
  gapsBySeverity: Record<string, number>;
  gaps: CLIResearchGap[];
}

/**
 * Research proposal for CLI
 */
export interface CLIResearchProposal {
  id: string;
  title: string;
  abstract: string;
  methodology: string[];
  priority: number;
}

/**
 * Options for gap analysis
 */
export interface GapAnalyzeOptions {
  types?: string[];
  minSeverity?: string;
  limit?: number;
  format?: 'table' | 'json' | 'markdown';
  export?: string;
}

/**
 * Options for proposal generation
 */
export interface ProposalOptions {
  count?: number;
  useLLM?: boolean;
  format?: 'table' | 'json';
}

/**
 * Service interface for gap operations
 */
export interface GapService {
  analyze(options?: GapAnalyzeOptions): Promise<CLIGapReport>;
  getById(gapId: string): Promise<CLIResearchGap | null>;
  generateProposals(
    gapIds?: string[],
    options?: ProposalOptions
  ): Promise<CLIResearchProposal[]>;
  exportReport(
    report: CLIGapReport,
    format: 'json' | 'markdown'
  ): Promise<string>;
  close(): Promise<void>;
}

/**
 * Format gap severity with color
 */
function formatSeverity(severity: string): string {
  switch (severity) {
    case 'critical':
      return `\x1b[31m${severity}\x1b[0m`; // red
    case 'high':
      return `\x1b[33m${severity}\x1b[0m`; // yellow
    case 'medium':
      return `\x1b[36m${severity}\x1b[0m`; // cyan
    default:
      return severity;
  }
}

/**
 * Format gap type for display
 */
function formatGapType(type: string): string {
  const typeNames: Record<string, string> = {
    missing_combination: '未探索の組み合わせ',
    isolated_cluster: '孤立クラスター',
    stale_research_area: '陳腐化領域',
    underexplored_technique: '未探索手法',
    unexplored_application: '未探索応用',
  };
  return typeNames[type] ?? type;
}

/**
 * Create gap command
 */
export function createGapCommand(service: GapService): Command {
  const gap = new Command('gap').description(
    'Research gap analysis operations'
  );

  // gap analyze
  gap
    .command('analyze')
    .description('Analyze research gaps in the knowledge graph')
    .option('-t, --types <types>', 'Gap types to detect (comma-separated)')
    .option(
      '-s, --severity <level>',
      'Minimum severity (low, medium, high, critical)'
    )
    .option('-l, --limit <number>', 'Maximum number of gaps', '50')
    .option('-f, --format <format>', 'Output format (table, json, markdown)', 'table')
    .option('-e, --export <file>', 'Export report to file')
    .action(async (options) => {
      const spinner = createSpinner('Analyzing research gaps...');
      try {
        spinner.start();

        const analyzeOptions: GapAnalyzeOptions = {
          limit: parseInt(options.limit, 10),
          format: options.format,
        };

        if (options.types) {
          analyzeOptions.types = options.types.split(',');
        }

        if (options.severity) {
          analyzeOptions.minSeverity = options.severity;
        }

        const report = await service.analyze(analyzeOptions);

        spinner.success(`Found ${report.totalGaps} research gaps`);

        if (options.format === 'json') {
          console.log(JSON.stringify(report, null, 2));
        } else if (options.format === 'markdown') {
          const markdown = await service.exportReport(report, 'markdown');
          console.log(markdown);
        } else {
          // Table format
          console.log('\n📊 Gap Analysis Summary');
          console.log('─'.repeat(50));
          console.log(`Total Gaps: ${report.totalGaps}`);
          console.log(`Report ID: ${report.id}`);
          console.log(
            `Generated: ${report.generatedAt.toISOString().split('T')[0]}`
          );

          console.log('\n📈 By Type:');
          for (const [type, count] of Object.entries(report.gapsByType)) {
            if (count > 0) {
              console.log(`  ${formatGapType(type)}: ${count}`);
            }
          }

          console.log('\n⚠️ By Severity:');
          for (const [severity, count] of Object.entries(
            report.gapsBySeverity
          )) {
            if (count > 0) {
              console.log(`  ${formatSeverity(severity)}: ${count}`);
            }
          }

          if (report.gaps.length > 0) {
            console.log('\n🔍 Top Gaps:');
            const topGaps = report.gaps.slice(0, 10);
            for (const gap of topGaps) {
              console.log(`\n  [${gap.id}] ${formatSeverity(gap.severity)}`);
              console.log(`  Type: ${formatGapType(gap.type)}`);
              console.log(`  ${gap.description}`);
              if (gap.relatedEntities.length > 0) {
                console.log(
                  `  Related: ${gap.relatedEntities.slice(0, 3).join(', ')}`
                );
              }
            }
          }
        }

        if (options.export) {
          const format = options.export.endsWith('.md') ? 'markdown' : 'json';
          const content = await service.exportReport(report, format);
          const fs = await import('fs/promises');
          await fs.writeFile(options.export, content);
          logger.info(`Report exported to ${options.export}`);
        }
      } catch (error) {
        spinner.error('Failed to analyze gaps');
        if (error instanceof Error) {
          logger.error(error.message);
        }
        process.exit(1);
      } finally {
        await service.close();
      }
    });

  // gap show <id>
  gap
    .command('show <gapId>')
    .description('Show details for a specific gap')
    .option('-f, --format <format>', 'Output format (table, json)', 'table')
    .action(async (gapId: string, options) => {
      const spinner = createSpinner(`Fetching gap ${gapId}...`);
      try {
        spinner.start();
        const gap = await service.getById(gapId);

        if (!gap) {
          spinner.error(`Gap not found: ${gapId}`);
          process.exit(1);
        }

        spinner.success(`Found gap: ${gapId}`);

        if (options.format === 'json') {
          console.log(JSON.stringify(gap, null, 2));
        } else {
          console.log('\n📋 Gap Details');
          console.log('─'.repeat(50));
          console.log(`ID: ${gap.id}`);
          console.log(`Type: ${formatGapType(gap.type)}`);
          console.log(`Severity: ${formatSeverity(gap.severity)}`);
          console.log(`Score: ${gap.score.toFixed(2)}`);
          console.log(`\nDescription:\n  ${gap.description}`);

          if (gap.relatedEntities.length > 0) {
            console.log('\nRelated Entities:');
            for (const entity of gap.relatedEntities) {
              console.log(`  - ${entity}`);
            }
          }

          if (gap.suggestedActions.length > 0) {
            console.log('\nSuggested Actions:');
            for (const action of gap.suggestedActions) {
              console.log(`  • ${action}`);
            }
          }
        }
      } catch (error) {
        spinner.error('Failed to fetch gap');
        if (error instanceof Error) {
          logger.error(error.message);
        }
        process.exit(1);
      } finally {
        await service.close();
      }
    });

  // gap propose
  gap
    .command('propose')
    .description('Generate research proposals from detected gaps')
    .option('-c, --count <number>', 'Number of proposals to generate', '5')
    .option('-g, --gaps <ids>', 'Specific gap IDs (comma-separated)')
    .option('--llm', 'Use LLM to enhance proposals')
    .option('-f, --format <format>', 'Output format (table, json)', 'table')
    .action(async (options) => {
      const spinner = createSpinner('Generating research proposals...');
      try {
        spinner.start();

        const gapIds = options.gaps?.split(',');
        const proposalOptions: ProposalOptions = {
          count: parseInt(options.count, 10),
          useLLM: options.llm ?? false,
        };

        const proposals = await service.generateProposals(
          gapIds,
          proposalOptions
        );

        spinner.success(`Generated ${proposals.length} research proposals`);

        if (options.format === 'json') {
          console.log(JSON.stringify(proposals, null, 2));
        } else {
          console.log('\n📝 Research Proposals');
          console.log('═'.repeat(60));

          for (let i = 0; i < proposals.length; i++) {
            const proposal = proposals[i];
            if (!proposal) continue;

            console.log(`\n${i + 1}. ${proposal.title}`);
            console.log('─'.repeat(50));
            console.log(`Priority: ${'★'.repeat(4 - proposal.priority)}${'☆'.repeat(proposal.priority - 1)}`);
            console.log(`\n${proposal.abstract}`);

            if (proposal.methodology.length > 0) {
              console.log('\nMethodology:');
              for (const method of proposal.methodology.slice(0, 3)) {
                console.log(`  • ${method}`);
              }
            }
          }
        }
      } catch (error) {
        spinner.error('Failed to generate proposals');
        if (error instanceof Error) {
          logger.error(error.message);
        }
        process.exit(1);
      } finally {
        await service.close();
      }
    });

  return gap;
}
