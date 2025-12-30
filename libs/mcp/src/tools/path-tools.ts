/**
 * @fileoverview Path Finding MCP Tools
 *
 * Provides tools for multi-hop reasoning and path finding
 * integrated with the MCP server.
 */

import { z } from 'zod';
import type { ToolCallResult, ToolDefinition, GraphRAGDependencies } from '../server/types.js';

/**
 * Path node representation
 */
export interface PathNode {
  id: string;
  type: string;
  name: string;
  properties?: Record<string, unknown>;
}

/**
 * Path relation representation
 */
export interface PathRelation {
  type: string;
  direction: 'outgoing' | 'incoming';
}

/**
 * Path representation
 */
export interface Path {
  nodes: PathNode[];
  relations: PathRelation[];
  hops: number;
  score: number;
}

/**
 * Path result
 */
export interface PathResult {
  paths: Path[];
  totalPaths: number;
  executionTime: number;
}

/**
 * Path explanation
 */
export interface PathExplanation {
  path: Path;
  naturalLanguage: string;
  summary: string;
}

/**
 * Extended dependencies including path service
 */
export interface PathToolDependencies extends GraphRAGDependencies {
  /** Path finder service (optional) */
  pathService?: PathServiceInterface;
}

/**
 * Path Service Interface
 */
export interface PathServiceInterface {
  findPaths(startEntity: string, endEntity: string, options?: FindPathsOptions): Promise<PathResult>;
  findShortestPath(startEntity: string, endEntity: string, maxHops?: number): Promise<Path | null>;
  areConnected(startEntity: string, endEntity: string, maxHops?: number): Promise<boolean>;
  getDegreesOfSeparation(startEntity: string, endEntity: string, maxHops?: number): Promise<number | null>;
  explainPath(path: Path, context?: string): Promise<PathExplanation>;
}

export interface FindPathsOptions {
  maxHops?: number;
  startType?: string;
  endType?: string;
  relationTypes?: string[];
  explain?: boolean;
  language?: 'en' | 'ja';
}

/**
 * Input schemas for path tools
 */
export const FindPathsInputSchema = z.object({
  startEntity: z.string().describe('Name of the starting entity'),
  endEntity: z.string().describe('Name of the ending entity'),
  maxHops: z.number().optional().default(4).describe('Maximum number of hops (default: 4)'),
  startType: z.string().optional().describe('Type of the starting entity'),
  endType: z.string().optional().describe('Type of the ending entity'),
  relationTypes: z.array(z.string()).optional().describe('Relation types to traverse'),
});

export const ShortestPathInputSchema = z.object({
  startEntity: z.string().describe('Name of the starting entity'),
  endEntity: z.string().describe('Name of the ending entity'),
  maxHops: z.number().optional().default(6).describe('Maximum hops to search (default: 6)'),
});

export const CheckConnectionInputSchema = z.object({
  startEntity: z.string().describe('Name of the first entity'),
  endEntity: z.string().describe('Name of the second entity'),
  maxHops: z.number().optional().default(4).describe('Maximum hops to search (default: 4)'),
});

export const DegreesOfSeparationInputSchema = z.object({
  startEntity: z.string().describe('Name of the first entity'),
  endEntity: z.string().describe('Name of the second entity'),
  maxHops: z.number().optional().default(6).describe('Maximum hops to search (default: 6)'),
});

export const ExplainPathInputSchema = z.object({
  startEntity: z.string().describe('Name of the starting entity'),
  endEntity: z.string().describe('Name of the ending entity'),
  maxHops: z.number().optional().default(4).describe('Maximum hops to search'),
  language: z.enum(['en', 'ja']).optional().default('en').describe('Language for explanation'),
  context: z.string().optional().describe('Additional context for explanation'),
});

/**
 * Create the find_paths tool
 */
export function createFindPathsTool(deps: PathToolDependencies): ToolDefinition {
  return {
    name: 'find_paths',
    description: 'Find all paths between two entities in the knowledge graph within a maximum number of hops.',
    inputSchema: FindPathsInputSchema,
    handler: async (input: z.infer<typeof FindPathsInputSchema>): Promise<ToolCallResult> => {
      if (!deps.pathService) {
        return {
          content: [{ type: 'text', text: 'Path service not available' }],
          isError: true,
        };
      }

      try {
        const result = await deps.pathService.findPaths(input.startEntity, input.endEntity, {
          maxHops: input.maxHops,
          ...(input.startType && { startType: input.startType }),
          ...(input.endType && { endType: input.endType }),
          ...(input.relationTypes && { relationTypes: input.relationTypes }),
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                totalPaths: result.totalPaths,
                executionTime: result.executionTime,
                paths: result.paths.map((p) => ({
                  hops: p.hops,
                  score: p.score,
                  nodes: p.nodes.map((n) => `${n.type}:${n.name}`),
                  relations: p.relations.map((r) => r.type),
                })),
              }),
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
}

/**
 * Create the shortest_path tool
 */
export function createShortestPathTool(deps: PathToolDependencies): ToolDefinition {
  return {
    name: 'shortest_path',
    description: 'Find the shortest path between two entities in the knowledge graph.',
    inputSchema: ShortestPathInputSchema,
    handler: async (input: z.infer<typeof ShortestPathInputSchema>): Promise<ToolCallResult> => {
      if (!deps.pathService) {
        return {
          content: [{ type: 'text', text: 'Path service not available' }],
          isError: true,
        };
      }

      try {
        const path = await deps.pathService.findShortestPath(
          input.startEntity,
          input.endEntity,
          input.maxHops
        );

        if (!path) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  found: false,
                  message: `No path found between "${input.startEntity}" and "${input.endEntity}" within ${input.maxHops} hops`,
                }),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                found: true,
                hops: path.hops,
                score: path.score,
                nodes: path.nodes.map((n) => `${n.type}:${n.name}`),
                relations: path.relations.map((r) => r.type),
              }),
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
}

/**
 * Create the check_connection tool
 */
export function createCheckConnectionTool(deps: PathToolDependencies): ToolDefinition {
  return {
    name: 'check_connection',
    description: 'Check if two entities are connected in the knowledge graph within a maximum number of hops.',
    inputSchema: CheckConnectionInputSchema,
    handler: async (input: z.infer<typeof CheckConnectionInputSchema>): Promise<ToolCallResult> => {
      if (!deps.pathService) {
        return {
          content: [{ type: 'text', text: 'Path service not available' }],
          isError: true,
        };
      }

      try {
        const connected = await deps.pathService.areConnected(
          input.startEntity,
          input.endEntity,
          input.maxHops
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                startEntity: input.startEntity,
                endEntity: input.endEntity,
                connected,
                maxHops: input.maxHops,
              }),
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
}

/**
 * Create the degrees_of_separation tool
 */
export function createDegreesOfSeparationTool(deps: PathToolDependencies): ToolDefinition {
  return {
    name: 'degrees_of_separation',
    description: 'Get the degrees of separation (minimum hops) between two entities.',
    inputSchema: DegreesOfSeparationInputSchema,
    handler: async (input: z.infer<typeof DegreesOfSeparationInputSchema>): Promise<ToolCallResult> => {
      if (!deps.pathService) {
        return {
          content: [{ type: 'text', text: 'Path service not available' }],
          isError: true,
        };
      }

      try {
        const degrees = await deps.pathService.getDegreesOfSeparation(
          input.startEntity,
          input.endEntity,
          input.maxHops
        );

        if (degrees === null) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  found: false,
                  message: `"${input.startEntity}" and "${input.endEntity}" are not connected within ${input.maxHops} hops`,
                }),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                found: true,
                startEntity: input.startEntity,
                endEntity: input.endEntity,
                degreesOfSeparation: degrees,
              }),
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
}

/**
 * Create the explain_path tool
 */
export function createExplainPathTool(deps: PathToolDependencies): ToolDefinition {
  return {
    name: 'explain_path',
    description: 'Find paths between two entities and explain them in natural language.',
    inputSchema: ExplainPathInputSchema,
    handler: async (input: z.infer<typeof ExplainPathInputSchema>): Promise<ToolCallResult> => {
      if (!deps.pathService) {
        return {
          content: [{ type: 'text', text: 'Path service not available' }],
          isError: true,
        };
      }

      try {
        // First find paths
        const result = await deps.pathService.findPaths(input.startEntity, input.endEntity, {
          maxHops: input.maxHops,
          language: input.language,
        });

        if (result.paths.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  found: false,
                  message: `No paths found between "${input.startEntity}" and "${input.endEntity}"`,
                }),
              },
            ],
          };
        }

        // Explain the shortest path
        const shortestPath = result.paths.reduce((a, b) => (a.hops < b.hops ? a : b));
        const explanation = await deps.pathService.explainPath(shortestPath, input.context);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                found: true,
                totalPaths: result.totalPaths,
                explanation: {
                  summary: explanation.summary,
                  naturalLanguage: explanation.naturalLanguage,
                  hops: explanation.path.hops,
                  nodes: explanation.path.nodes.map((n) => n.name),
                },
              }),
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
}

/**
 * Create all path finding tools
 */
export function createPathTools(deps: PathToolDependencies): ToolDefinition[] {
  return [
    createFindPathsTool(deps),
    createShortestPathTool(deps),
    createCheckConnectionTool(deps),
    createDegreesOfSeparationTool(deps),
    createExplainPathTool(deps),
  ];
}
