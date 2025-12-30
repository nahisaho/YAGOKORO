import { z } from 'zod';
import type {
  ToolCallResult,
  ToolDefinition,
  GraphRAGDependencies,
  MCPEntity,
  MCPRelation,
} from '../server/types.js';

/**
 * Schema for queryKnowledgeGraph tool input
 */
export const QueryKnowledgeGraphInputSchema = z.object({
  query: z.string().describe('Natural language query to search the knowledge graph'),
  limit: z.number().min(1).max(100).optional().default(10).describe('Maximum number of results'),
  includeRelations: z.boolean().optional().default(true).describe('Include related entities'),
});

/**
 * Schema for getEntity tool input
 */
export const GetEntityInputSchema = z.object({
  entityId: z.string().describe('Unique identifier of the entity'),
  includeRelations: z.boolean().optional().default(true).describe('Include related entities'),
});

/**
 * Schema for getRelations tool input
 */
export const GetRelationsInputSchema = z.object({
  entityId: z.string().describe('Entity ID to get relations for'),
  direction: z.enum(['incoming', 'outgoing', 'both']).optional().default('both'),
  relationType: z.string().optional().describe('Filter by relation type'),
  limit: z.number().min(1).max(100).optional().default(50),
});

/**
 * Schema for getPath tool input
 */
export const GetPathInputSchema = z.object({
  sourceId: z.string().describe('Source entity ID'),
  targetId: z.string().describe('Target entity ID'),
  maxDepth: z.number().min(1).max(10).optional().default(5).describe('Maximum path length'),
});

/**
 * Schema for getCommunity tool input
 */
export const GetCommunityInputSchema = z.object({
  communityId: z.string().describe('Community identifier'),
  includeMembers: z.boolean().optional().default(true).describe('Include member entities'),
  includeSummary: z.boolean().optional().default(true).describe('Include community summary'),
});

/**
 * Schema for addEntity tool input
 */
export const AddEntityInputSchema = z.object({
  name: z.string().describe('Entity name'),
  type: z.string().describe('Entity type (e.g., Person, Event, Location)'),
  properties: z.record(z.unknown()).optional().default({}).describe('Additional properties'),
  description: z.string().optional().describe('Entity description'),
});

/**
 * Schema for addRelation tool input
 */
export const AddRelationInputSchema = z.object({
  sourceEntityId: z.string().describe('Source entity ID'),
  targetEntityId: z.string().describe('Target entity ID'),
  type: z.string().describe('Relation type (e.g., PARENT_OF, MARRIED_TO)'),
  properties: z.record(z.unknown()).optional().default({}).describe('Relation properties'),
});

/**
 * Schema for searchSimilar tool input
 */
export const SearchSimilarInputSchema = z.object({
  query: z.string().describe('Search query text'),
  entityType: z.string().optional().describe('Filter by entity type'),
  limit: z.number().min(1).max(100).optional().default(10),
  threshold: z.number().min(0).max(1).optional().default(0.7).describe('Similarity threshold'),
});

/**
 * Helper to format entity for MCP response
 */
function formatEntity(entity: MCPEntity): string {
  const props = entity.properties
    ? Object.entries(entity.properties)
        .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
        .join('\n')
    : '';

  return `Entity: ${entity.name} (${entity.type})
ID: ${entity.id}
${entity.description ? `Description: ${entity.description}\n` : ''}${props ? `Properties:\n${props}` : ''}`.trim();
}

/**
 * Helper to format relation for MCP response
 */
function formatRelation(
  relation: MCPRelation,
  sourceEntity?: MCPEntity,
  targetEntity?: MCPEntity
): string {
  const source = sourceEntity ? sourceEntity.name : relation.sourceEntityId;
  const target = targetEntity ? targetEntity.name : relation.targetEntityId;
  const props = relation.properties
    ? Object.entries(relation.properties)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(', ')
    : '';

  return `[${source}] --(${relation.type}${props ? `: ${props}` : ''})--> [${target}]`;
}

/**
 * Create queryKnowledgeGraph tool
 */
export function createQueryKnowledgeGraphTool(deps: GraphRAGDependencies): ToolDefinition {
  return {
    name: 'queryKnowledgeGraph',
    description:
      'Query the knowledge graph using natural language. Returns relevant entities and their relationships.',
    inputSchema: QueryKnowledgeGraphInputSchema,
    handler: async (input): Promise<ToolCallResult> => {
      const { query, limit, includeRelations } = QueryKnowledgeGraphInputSchema.parse(input);

      // Use vector search for semantic matching
      const vectorResults = await deps.vectorStore.search(query, limit);

      if (vectorResults.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No results found for query: "${query}"`,
            },
          ],
        };
      }

      // Fetch full entities
      const entities = await Promise.all(
        vectorResults.map((r) => deps.entityRepository.findById(r.id))
      );

      const validEntities = entities.filter((e): e is MCPEntity => e !== null);

      let response = `Found ${validEntities.length} entities matching "${query}":\n\n`;

      for (const entity of validEntities) {
        response += formatEntity(entity) + '\n\n';

        if (includeRelations) {
          const relations = await deps.relationRepository.findByEntityId(entity.id);
          if (relations.length > 0) {
            response += 'Relations:\n';
            for (const rel of relations.slice(0, 5)) {
              response += `  ${formatRelation(rel)}\n`;
            }
            if (relations.length > 5) {
              response += `  ... and ${relations.length - 5} more relations\n`;
            }
            response += '\n';
          }
        }
      }

      return {
        content: [{ type: 'text', text: response.trim() }],
      };
    },
  };
}

/**
 * Create getEntity tool
 */
export function createGetEntityTool(deps: GraphRAGDependencies): ToolDefinition {
  return {
    name: 'getEntity',
    description: 'Get detailed information about a specific entity by its ID.',
    inputSchema: GetEntityInputSchema,
    handler: async (input): Promise<ToolCallResult> => {
      const { entityId, includeRelations } = GetEntityInputSchema.parse(input);

      const entity = await deps.entityRepository.findById(entityId);

      if (!entity) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Entity not found: ${entityId}` }],
        };
      }

      let response = formatEntity(entity);

      if (includeRelations) {
        const relations = await deps.relationRepository.findByEntityId(entityId);
        if (relations.length > 0) {
          response += '\n\nRelations:\n';
          for (const rel of relations) {
            response += `  ${formatRelation(rel)}\n`;
          }
        }
      }

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  };
}

/**
 * Create getRelations tool
 */
export function createGetRelationsTool(deps: GraphRAGDependencies): ToolDefinition {
  return {
    name: 'getRelations',
    description: 'Get all relations for a specific entity.',
    inputSchema: GetRelationsInputSchema,
    handler: async (input): Promise<ToolCallResult> => {
      const { entityId, direction, relationType, limit } = GetRelationsInputSchema.parse(input);

      let relations = await deps.relationRepository.findByEntityId(entityId);

      // Filter by direction
      if (direction === 'outgoing') {
        relations = relations.filter((r) => r.sourceEntityId === entityId);
      } else if (direction === 'incoming') {
        relations = relations.filter((r) => r.targetEntityId === entityId);
      }

      // Filter by type
      if (relationType) {
        relations = relations.filter((r) => r.type === relationType);
      }

      // Apply limit
      relations = relations.slice(0, limit);

      if (relations.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No relations found for entity: ${entityId}`,
            },
          ],
        };
      }

      let response = `Found ${relations.length} relations:\n\n`;
      for (const rel of relations) {
        response += formatRelation(rel) + '\n';
      }

      return {
        content: [{ type: 'text', text: response.trim() }],
      };
    },
  };
}

/**
 * Create getPath tool
 */
export function createGetPathTool(deps: GraphRAGDependencies): ToolDefinition {
  return {
    name: 'getPath',
    description: 'Find the shortest path between two entities in the knowledge graph.',
    inputSchema: GetPathInputSchema,
    handler: async (input): Promise<ToolCallResult> => {
      const { sourceId, targetId, maxDepth } = GetPathInputSchema.parse(input);

      // Verify both entities exist
      const [source, target] = await Promise.all([
        deps.entityRepository.findById(sourceId),
        deps.entityRepository.findById(targetId),
      ]);

      if (!source) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Source entity not found: ${sourceId}` }],
        };
      }

      if (!target) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Target entity not found: ${targetId}` }],
        };
      }

      // BFS to find shortest path
      const visited = new Set<string>();
      type PathStep = { entity: MCPEntity; relation?: MCPRelation };
      const queue: Array<{ entityId: string; path: PathStep[] }> = [
        { entityId: sourceId, path: [{ entity: source }] },
      ];

      while (queue.length > 0) {
        const current = queue.shift()!;

        if (current.entityId === targetId) {
          // Found path
          let response = `Path from ${source.name} to ${target.name} (${current.path.length - 1} hops):\n\n`;
          for (let i = 0; i < current.path.length; i++) {
            const step = current.path[i]!;
            response += `${i + 1}. ${step.entity.name} (${step.entity.type})`;
            if (step.relation) {
              response += ` --[${step.relation.type}]-->`;
            }
            response += '\n';
          }
          return {
            content: [{ type: 'text', text: response.trim() }],
          };
        }

        if (current.path.length > maxDepth) continue;
        if (visited.has(current.entityId)) continue;
        visited.add(current.entityId);

        // Get connected entities
        const relations = await deps.relationRepository.findByEntityId(current.entityId);
        for (const rel of relations) {
          const nextId =
            rel.sourceEntityId === current.entityId ? rel.targetEntityId : rel.sourceEntityId;
          if (!visited.has(nextId)) {
            const nextEntity = await deps.entityRepository.findById(nextId);
            if (nextEntity) {
              queue.push({
                entityId: nextId,
                path: [...current.path, { entity: nextEntity, relation: rel }],
              });
            }
          }
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `No path found between ${source.name} and ${target.name} within ${maxDepth} hops.`,
          },
        ],
      };
    },
  };
}

/**
 * Create getCommunity tool
 */
export function createGetCommunityTool(deps: GraphRAGDependencies): ToolDefinition {
  return {
    name: 'getCommunity',
    description: 'Get information about a community cluster in the knowledge graph.',
    inputSchema: GetCommunityInputSchema,
    handler: async (input): Promise<ToolCallResult> => {
      const { communityId, includeMembers, includeSummary } = GetCommunityInputSchema.parse(input);

      const community = await deps.communityRepository.findById(communityId);

      if (!community) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Community not found: ${communityId}` }],
        };
      }

      let response = `Community: ${community.id}\n`;
      response += `Level: ${community.level}\n`;
      response += `Members: ${community.memberEntityIds.length}\n`;

      if (includeSummary && community.summary) {
        response += `\nSummary:\n${community.summary}\n`;
      }

      if (includeMembers && community.memberEntityIds.length > 0) {
        response += '\nMember Entities:\n';
        const members = await Promise.all(
          community.memberEntityIds.slice(0, 20).map((id) => deps.entityRepository.findById(id))
        );
        for (const member of members) {
          if (member) {
            response += `  - ${member.name} (${member.type})\n`;
          }
        }
        if (community.memberEntityIds.length > 20) {
          response += `  ... and ${community.memberEntityIds.length - 20} more\n`;
        }
      }

      return {
        content: [{ type: 'text', text: response.trim() }],
      };
    },
  };
}

/**
 * Create addEntity tool
 */
export function createAddEntityTool(deps: GraphRAGDependencies): ToolDefinition {
  return {
    name: 'addEntity',
    description: 'Add a new entity to the knowledge graph.',
    inputSchema: AddEntityInputSchema,
    handler: async (input): Promise<ToolCallResult> => {
      const { name, type, properties, description } = AddEntityInputSchema.parse(input);

      const entity: MCPEntity = {
        id: crypto.randomUUID(),
        name,
        type,
        properties,
        description,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await deps.entityRepository.save(entity);

      // Index in vector store if embedding is available
      if (deps.embeddingService) {
        const text = `${name} ${type} ${description || ''}`;
        const embedding = await deps.embeddingService.embed(text);
        await deps.vectorStore.upsert(entity.id, embedding, {
          name,
          type,
          description: description || '',
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: `Entity created successfully:\n${formatEntity(entity)}`,
          },
        ],
      };
    },
  };
}

/**
 * Create addRelation tool
 */
export function createAddRelationTool(deps: GraphRAGDependencies): ToolDefinition {
  return {
    name: 'addRelation',
    description: 'Add a new relation between two entities.',
    inputSchema: AddRelationInputSchema,
    handler: async (input): Promise<ToolCallResult> => {
      const { sourceEntityId, targetEntityId, type, properties } = AddRelationInputSchema.parse(
        input
      );

      // Verify entities exist
      const [source, target] = await Promise.all([
        deps.entityRepository.findById(sourceEntityId),
        deps.entityRepository.findById(targetEntityId),
      ]);

      if (!source) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Source entity not found: ${sourceEntityId}` }],
        };
      }

      if (!target) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Target entity not found: ${targetEntityId}` }],
        };
      }

      const relation: MCPRelation = {
        id: crypto.randomUUID(),
        sourceEntityId,
        targetEntityId,
        type,
        properties,
        weight: 1.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await deps.relationRepository.save(relation);

      return {
        content: [
          {
            type: 'text',
            text: `Relation created successfully:\n${formatRelation(relation, source, target)}`,
          },
        ],
      };
    },
  };
}

/**
 * Create searchSimilar tool
 */
export function createSearchSimilarTool(deps: GraphRAGDependencies): ToolDefinition {
  return {
    name: 'searchSimilar',
    description: 'Search for entities similar to the given query using vector similarity.',
    inputSchema: SearchSimilarInputSchema,
    handler: async (input): Promise<ToolCallResult> => {
      const { query, entityType, limit, threshold } = SearchSimilarInputSchema.parse(input);

      const results = await deps.vectorStore.search(query, limit * 2); // Over-fetch for filtering

      // Filter by type if specified
      let filteredResults = results.filter((r) => r.score >= threshold);
      if (entityType) {
        filteredResults = filteredResults.filter((r) => r.metadata?.type === entityType);
      }
      filteredResults = filteredResults.slice(0, limit);

      if (filteredResults.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No similar entities found for query: "${query}"`,
            },
          ],
        };
      }

      let response = `Found ${filteredResults.length} similar entities:\n\n`;
      for (const result of filteredResults) {
        response += `- ${result.metadata?.name || result.id} (${result.metadata?.type || 'Unknown'})\n`;
        response += `  Similarity: ${(result.score * 100).toFixed(1)}%\n`;
        if (result.metadata?.description) {
          response += `  ${result.metadata.description}\n`;
        }
        response += '\n';
      }

      return {
        content: [{ type: 'text', text: response.trim() }],
      };
    },
  };
}

/**
 * Create all GraphRAG tools
 */
export function createGraphRAGTools(deps: GraphRAGDependencies): ToolDefinition[] {
  return [
    createQueryKnowledgeGraphTool(deps),
    createGetEntityTool(deps),
    createGetRelationsTool(deps),
    createGetPathTool(deps),
    createGetCommunityTool(deps),
    createAddEntityTool(deps),
    createAddRelationTool(deps),
    createSearchSimilarTool(deps),
  ];
}
