import type {
  ResourceDefinition,
  ResourceReadResult,
  GraphRAGDependencies,
  MCPEntity,
} from '../server/types.js';

/**
 * Create ontologySchema resource
 *
 * Provides the schema of the knowledge graph including entity types,
 * relation types, and their properties.
 */
export function createOntologySchemaResource(deps: GraphRAGDependencies): ResourceDefinition {
  return {
    name: 'Ontology Schema',
    uri: 'yagokoro://ontology/schema',
    description:
      'The schema of the knowledge graph including entity types, relation types, and their properties.',
    mimeType: 'application/json',
    handler: async (): Promise<ResourceReadResult> => {
      // Get unique entity types from the repository
      const entities = await deps.entityRepository.findAll({ limit: 1000 });
      const entityTypes = new Map<string, Set<string>>();

      for (const entity of entities) {
        if (!entityTypes.has(entity.type)) {
          entityTypes.set(entity.type, new Set());
        }
        if (entity.properties) {
          for (const prop of Object.keys(entity.properties)) {
            entityTypes.get(entity.type)!.add(prop);
          }
        }
      }

      // Get unique relation types
      const relations = await deps.relationRepository.findAll({ limit: 1000 });
      const relationTypes = new Map<string, Set<string>>();

      for (const relation of relations) {
        if (!relationTypes.has(relation.type)) {
          relationTypes.set(relation.type, new Set());
        }
        if (relation.properties) {
          for (const prop of Object.keys(relation.properties)) {
            relationTypes.get(relation.type)!.add(prop);
          }
        }
      }

      const schema = {
        entityTypes: Object.fromEntries(
          Array.from(entityTypes.entries()).map(([type, props]) => [
            type,
            { properties: Array.from(props) },
          ])
        ),
        relationTypes: Object.fromEntries(
          Array.from(relationTypes.entries()).map(([type, props]) => [
            type,
            { properties: Array.from(props) },
          ])
        ),
        generatedAt: new Date().toISOString(),
      };

      return {
        contents: [
          {
            uri: 'yagokoro://ontology/schema',
            mimeType: 'application/json',
            text: JSON.stringify(schema, null, 2),
          },
        ],
      };
    },
  };
}

/**
 * Create graphStatistics resource
 *
 * Provides statistics about the knowledge graph.
 */
export function createGraphStatisticsResource(deps: GraphRAGDependencies): ResourceDefinition {
  return {
    name: 'Graph Statistics',
    uri: 'yagokoro://graph/statistics',
    description:
      'Statistics about the knowledge graph including entity counts, relation counts, and community information.',
    mimeType: 'application/json',
    handler: async (): Promise<ResourceReadResult> => {
      // Get counts
      const entities = await deps.entityRepository.findAll({ limit: 10000 });
      const relations = await deps.relationRepository.findAll({ limit: 10000 });
      const communities = await deps.communityRepository.findAll({ limit: 1000 });

      // Count by type
      const entityTypeCounts = new Map<string, number>();
      for (const entity of entities) {
        entityTypeCounts.set(entity.type, (entityTypeCounts.get(entity.type) || 0) + 1);
      }

      const relationTypeCounts = new Map<string, number>();
      for (const relation of relations) {
        relationTypeCounts.set(relation.type, (relationTypeCounts.get(relation.type) || 0) + 1);
      }

      // Community stats
      const communityStats = {
        totalCommunities: communities.length,
        byLevel: {} as Record<number, number>,
        avgMembersPerCommunity: 0,
      };

      if (communities.length > 0) {
        let totalMembers = 0;
        for (const community of communities) {
          communityStats.byLevel[community.level] =
            (communityStats.byLevel[community.level] || 0) + 1;
          totalMembers += community.memberEntityIds.length;
        }
        communityStats.avgMembersPerCommunity = totalMembers / communities.length;
      }

      const statistics = {
        entities: {
          total: entities.length,
          byType: Object.fromEntries(entityTypeCounts),
        },
        relations: {
          total: relations.length,
          byType: Object.fromEntries(relationTypeCounts),
        },
        communities: communityStats,
        generatedAt: new Date().toISOString(),
      };

      return {
        contents: [
          {
            uri: 'yagokoro://graph/statistics',
            mimeType: 'application/json',
            text: JSON.stringify(statistics, null, 2),
          },
        ],
      };
    },
  };
}

/**
 * Create entityList resource
 *
 * Provides a paginated list of all entities in the knowledge graph.
 */
export function createEntityListResource(deps: GraphRAGDependencies): ResourceDefinition {
  return {
    name: 'Entity List',
    uri: 'yagokoro://entities/list',
    description: 'A list of all entities in the knowledge graph.',
    mimeType: 'application/json',
    handler: async (): Promise<ResourceReadResult> => {
      const entities = await deps.entityRepository.findAll({ limit: 100 });

      const entityList = entities.map((e: MCPEntity) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        description: e.description,
      }));

      return {
        contents: [
          {
            uri: 'yagokoro://entities/list',
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                entities: entityList,
                total: entityList.length,
                generatedAt: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    },
  };
}

/**
 * Create timeline resource
 *
 * Provides a chronological view of events and their relationships.
 */
export function createTimelineResource(deps: GraphRAGDependencies): ResourceDefinition {
  return {
    name: 'Timeline',
    uri: 'yagokoro://timeline/events',
    description: 'A chronological view of events in the knowledge graph.',
    mimeType: 'application/json',
    handler: async (): Promise<ResourceReadResult> => {
      // Get entities that might be events (have date properties)
      const entities = await deps.entityRepository.findAll({ limit: 1000 });

      const events: Array<{
        id: string;
        name: string;
        type: string;
        date: string;
        description?: string | undefined;
      }> = [];

      for (const entity of entities) {
        // Look for date-related properties
        const dateProps = ['date', 'startDate', 'endDate', 'birthDate', 'deathDate', 'occurredAt'];
        let eventDate: string | null = null;

        if (entity.properties) {
          for (const prop of dateProps) {
            if (entity.properties[prop]) {
              eventDate = String(entity.properties[prop]);
              break;
            }
          }
        }

        if (eventDate || entity.type === 'Event') {
          events.push({
            id: entity.id,
            name: entity.name,
            type: entity.type,
            date: eventDate || 'Unknown',
            description: entity.description,
          });
        }
      }

      // Sort by date (putting unknown at the end)
      events.sort((a, b) => {
        if (a.date === 'Unknown') return 1;
        if (b.date === 'Unknown') return -1;
        return a.date.localeCompare(b.date);
      });

      return {
        contents: [
          {
            uri: 'yagokoro://timeline/events',
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                events,
                total: events.length,
                generatedAt: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    },
  };
}

/**
 * Create all GraphRAG resources
 */
export function createGraphRAGResources(deps: GraphRAGDependencies): ResourceDefinition[] {
  return [
    createOntologySchemaResource(deps),
    createGraphStatisticsResource(deps),
    createEntityListResource(deps),
    createTimelineResource(deps),
  ];
}
