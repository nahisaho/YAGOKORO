/**
 * @fileoverview Research Gap Analysis MCP Tools
 *
 * Provides tools for identifying and analyzing research gaps
 * integrated with the MCP server.
 */

import { z } from 'zod';
import type {
  ToolCallResult,
  ToolDefinition,
  GraphRAGDependencies,
  MCPEntityRepository,
} from '../server/types.js';

/**
 * Research gap representation
 */
export interface ResearchGap {
  id: string;
  type: GapType;
  description: string;
  severity: GapSeverity;
  relatedEntities: string[];
  suggestedActions: string[];
  score: number;
}

/**
 * Gap type
 */
export type GapType =
  | 'missing_combination'
  | 'underexplored_technique'
  | 'isolated_cluster'
  | 'stale_research_area'
  | 'unexplored_application';

/**
 * Gap severity
 */
export type GapSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Gap analysis report
 */
export interface GapAnalysisReport {
  id: string;
  generatedAt: Date;
  totalGaps: number;
  gapsByType: Record<GapType, number>;
  gapsBySeverity: Record<GapSeverity, number>;
  gaps: ResearchGap[];
}

/**
 * Research proposal
 */
export interface ResearchProposal {
  id: string;
  title: string;
  abstract: string;
  methodology: string[];
  expectedOutcomes: string[];
  priority: number;
}

/**
 * Extended dependencies including gap analysis service
 */
export interface GapToolDependencies extends GraphRAGDependencies {
  /** Gap analyzer service (optional) */
  gapAnalyzer?: GapAnalyzerInterface;
}

/**
 * Gap Analyzer Service Interface
 */
export interface GapAnalyzerInterface {
  analyze(options?: GapAnalyzeOptions): Promise<GapAnalysisReport>;
  getGapById(gapId: string): Promise<ResearchGap | null>;
  generateResearchProposals(
    gaps: ResearchGap[],
    count?: number
  ): Promise<ResearchProposal[]>;
  exportReport(report: GapAnalysisReport, format: 'json' | 'markdown'): Promise<string>;
}

/**
 * Options for gap analysis
 */
export interface GapAnalyzeOptions {
  types?: GapType[];
  minSeverity?: GapSeverity;
  limit?: number;
  includeCitations?: boolean;
  includeClusters?: boolean;
  generateRecommendations?: boolean;
}

/**
 * Result type for gap tools
 */
interface GapToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Create research gap analysis tools
 */
export function createGapTools(deps: GapToolDependencies): ToolDefinition[] {
  const { gapAnalyzer, entityRepository } = deps;

  /**
   * Helper to get analyzer or fallback
   */
  async function getAnalyzer(): Promise<GapAnalyzerInterface | null> {
    if (gapAnalyzer) {
      return gapAnalyzer;
    }

    // Could create a default analyzer using entity repository
    // For now, return null if not provided
    return null;
  }

  /**
   * Analyze research gaps
   */
  const analyzeGaps: ToolDefinition = {
    name: 'gap_analyze',
    description:
      'Analyze the knowledge graph to identify research gaps, including missing combinations, underexplored techniques, and stale research areas.',
    inputSchema: z.object({
      types: z
        .array(
          z.enum([
            'missing_combination',
            'underexplored_technique',
            'isolated_cluster',
            'stale_research_area',
            'unexplored_application',
          ])
        )
        .optional()
        .describe('Types of gaps to detect'),
      minSeverity: z
        .enum(['low', 'medium', 'high', 'critical'])
        .optional()
        .describe('Minimum severity level to include'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .default(50)
        .describe('Maximum number of gaps to return'),
      includeCitations: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include citation metrics in analysis'),
      includeClusters: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include cluster analysis'),
    }),
    async handler(args): Promise<ToolCallResult> {
      const startTime = Date.now();

      try {
        const analyzer = await getAnalyzer();

        if (!analyzer) {
          // Fallback: simple gap detection using entity repository
          return await fallbackAnalyzeGaps(entityRepository, args as GapAnalyzeOptions);
        }

        const options: GapAnalyzeOptions = {
          generateRecommendations: true,
          ...(args.types && { types: args.types as GapType[] }),
          ...(args.minSeverity && { minSeverity: args.minSeverity as GapSeverity }),
          ...(args.limit && { limit: args.limit as number }),
          ...(typeof args.includeCitations === 'boolean' && { includeCitations: args.includeCitations }),
          ...(typeof args.includeClusters === 'boolean' && { includeClusters: args.includeClusters }),
        };

        const report = await analyzer.analyze(options);

        const result: GapToolResult = {
          success: true,
          data: {
            reportId: report.id,
            totalGaps: report.totalGaps,
            gapsByType: report.gapsByType,
            gapsBySeverity: report.gapsBySeverity,
            topGaps: report.gaps.slice(0, 10).map((g) => ({
              id: g.id,
              type: g.type,
              severity: g.severity,
              description: g.description,
              relatedEntities: g.relatedEntities.slice(0, 5),
              score: g.score,
            })),
            executionTime: Date.now() - startTime,
          },
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const result: GapToolResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          isError: true,
        };
      }
    },
  };

  /**
   * Get gap by ID
   */
  const getGap: ToolDefinition = {
    name: 'gap_get',
    description: 'Get detailed information about a specific research gap by ID.',
    inputSchema: z.object({
      gapId: z.string().describe('The gap ID to retrieve'),
    }),
    async handler(args): Promise<ToolCallResult> {
      try {
        const analyzer = await getAnalyzer();

        if (!analyzer) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: 'Gap analyzer not configured',
                }),
              },
            ],
            isError: true,
          };
        }

        const gap = await analyzer.getGapById(args.gapId as string);

        if (!gap) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: `Gap not found: ${args.gapId}`,
                }),
              },
            ],
            isError: true,
          };
        }

        const result: GapToolResult = {
          success: true,
          data: gap,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              }),
            },
          ],
          isError: true,
        };
      }
    },
  };

  /**
   * Generate research proposals from gaps
   */
  const generateProposals: ToolDefinition = {
    name: 'gap_propose',
    description:
      'Generate research proposals based on identified gaps. Combines related gaps and suggests concrete research directions.',
    inputSchema: z.object({
      gapIds: z
        .array(z.string())
        .optional()
        .describe('Specific gap IDs to generate proposals for'),
      count: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .default(5)
        .describe('Number of proposals to generate'),
    }),
    async handler(args): Promise<ToolCallResult> {
      try {
        const analyzer = await getAnalyzer();

        if (!analyzer) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: 'Gap analyzer not configured',
                }),
              },
            ],
            isError: true,
          };
        }

        // If specific gap IDs provided, get those gaps
        let gaps: ResearchGap[] = [];
        const gapIds = args.gapIds as string[] | undefined;

        if (gapIds && gapIds.length > 0) {
          for (const gapId of gapIds) {
            const gap = await analyzer.getGapById(gapId);
            if (gap) {
              gaps.push(gap);
            }
          }
        } else {
          // Get all gaps from a fresh analysis
          const report = await analyzer.analyze({ limit: 50 });
          gaps = report.gaps;
        }

        const proposals = await analyzer.generateResearchProposals(
          gaps,
          args.count as number
        );

        const result: GapToolResult = {
          success: true,
          data: {
            proposalCount: proposals.length,
            proposals: proposals.map((p) => ({
              id: p.id,
              title: p.title,
              abstract: p.abstract,
              methodology: p.methodology.slice(0, 3),
              priority: p.priority,
            })),
          },
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              }),
            },
          ],
          isError: true,
        };
      }
    },
  };

  /**
   * List gap types
   */
  const listGapTypes: ToolDefinition = {
    name: 'gap_types',
    description:
      'List all available gap types and their descriptions for filtering gap analysis.',
    inputSchema: z.object({}),
    async handler(): Promise<ToolCallResult> {
      const types = {
        missing_combination: {
          name: 'Missing Combination',
          description:
            'AI models and techniques that have not been combined or explored together',
          example: 'GPT-4 architecture with reinforcement learning from human feedback',
        },
        underexplored_technique: {
          name: 'Underexplored Technique',
          description:
            'Techniques with few publications or limited application to modern models',
          example: 'Sparse attention mechanisms in large language models',
        },
        isolated_cluster: {
          name: 'Isolated Cluster',
          description:
            'Research clusters with weak connections to other areas of the field',
          example: 'Neuro-symbolic AI with limited integration to deep learning',
        },
        stale_research_area: {
          name: 'Stale Research Area',
          description:
            'Areas with no recent publications despite past significance',
          example: 'Traditional RNN architectures in sequence modeling',
        },
        unexplored_application: {
          name: 'Unexplored Application',
          description:
            'Potential application domains that remain uninvestigated',
          example: 'Diffusion models for scientific simulation',
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                data: types,
              },
              null,
              2
            ),
          },
        ],
      };
    },
  };

  return [analyzeGaps, getGap, generateProposals, listGapTypes];
}

/**
 * Fallback gap analysis using entity repository
 */
async function fallbackAnalyzeGaps(
  entityRepository: MCPEntityRepository,
  options: GapAnalyzeOptions
): Promise<ToolCallResult> {
  const limit = options.limit ?? 50;

  try {
    // Generate mock gaps for fallback - in production this would query the repository
    const gaps: ResearchGap[] = [];

    // Mock: Find potential underexplored techniques
    // In production, this would query the entity repository for entity statistics
    gaps.push({
      id: 'fallback-underexplored-1',
      type: 'underexplored_technique',
      description: 'Fallback analysis: entity relationships not fully analyzed',
      severity: 'low',
      relatedEntities: [],
      suggestedActions: [
        'Configure gap analyzer service for full analysis',
        'Ensure entity repository has sufficient data',
      ],
      score: 0.3,
    });

    // Count by type and severity
    const gapsByType: Record<GapType, number> = {
      missing_combination: 0,
      underexplored_technique: 1,
      isolated_cluster: 0,
      stale_research_area: 0,
      unexplored_application: 0,
    };

    const gapsBySeverity: Record<GapSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 1,
    };

    const report: GapAnalysisReport = {
      id: `fallback-${Date.now()}`,
      generatedAt: new Date(),
      totalGaps: gaps.length,
      gapsByType,
      gapsBySeverity,
      gaps: gaps.slice(0, limit),
    };

    // Reference entityRepository to avoid unused warning
    void entityRepository;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              data: {
                reportId: report.id,
                totalGaps: report.totalGaps,
                gapsByType: report.gapsByType,
                gapsBySeverity: report.gapsBySeverity,
                topGaps: report.gaps.slice(0, 10),
                note: 'Using fallback analysis (limited capabilities). Configure gapAnalyzer for full analysis.',
              },
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
        },
      ],
      isError: true,
    };
  }
}

export default createGapTools;
