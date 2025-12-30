import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createGraphRAGResources,
  createOntologySchemaResource,
  createGraphStatisticsResource,
  createEntityListResource,
  createTimelineResource,
} from './graphrag-resources.js';
import type {
  GraphRAGDependencies,
  MCPEntity,
  MCPRelation,
  MCPCommunity,
} from '../server/types.js';

describe('GraphRAG Resources', () => {
  let mockDeps: GraphRAGDependencies;
  let mockEntities: MCPEntity[];
  let mockRelations: MCPRelation[];
  let mockCommunities: MCPCommunity[];

  beforeEach(() => {
    // Setup mock entities
    mockEntities = [
      {
        id: 'entity-1',
        name: 'GPT-4',
        type: 'AIModel',
        description: 'Large language model',
        properties: { version: '4', parameterCount: '1.76T' },
      },
      {
        id: 'entity-2',
        name: 'OpenAI',
        type: 'Organization',
        description: 'AI research company',
        properties: { founded: '2015' },
      },
      {
        id: 'entity-3',
        name: 'GPT Release',
        type: 'Event',
        properties: { date: '2023-03-14' },
      },
    ];

    // Setup mock relations
    mockRelations = [
      {
        id: 'rel-1',
        type: 'DEVELOPED_BY',
        sourceEntityId: 'entity-1',
        targetEntityId: 'entity-2',
        weight: 1.0,
        properties: { since: '2023' },
      },
      {
        id: 'rel-2',
        type: 'USES_TECHNIQUE',
        sourceEntityId: 'entity-1',
        targetEntityId: 'entity-3',
        weight: 0.9,
      },
    ];

    // Setup mock communities
    mockCommunities = [
      {
        id: 'community-1',
        level: 1,
        memberEntityIds: ['entity-1', 'entity-2'],
        summary: 'AI Models group',
      },
      {
        id: 'community-2',
        level: 2,
        memberEntityIds: ['entity-3'],
        summary: 'Events group',
      },
    ];

    // Create mock dependencies
    mockDeps = {
      entityRepository: {
        findById: vi.fn((id: string) =>
          Promise.resolve(mockEntities.find((e) => e.id === id) || null)
        ),
        findAll: vi.fn((_opts?: { limit?: number }) => Promise.resolve(mockEntities)),
        save: vi.fn(() => Promise.resolve()),
      },
      relationRepository: {
        findByEntityId: vi.fn((entityId: string) =>
          Promise.resolve(
            mockRelations.filter(
              (r) => r.sourceEntityId === entityId || r.targetEntityId === entityId
            )
          )
        ),
        findAll: vi.fn((_opts?: { limit?: number }) => Promise.resolve(mockRelations)),
        save: vi.fn(() => Promise.resolve()),
      },
      communityRepository: {
        findById: vi.fn((id: string) =>
          Promise.resolve(mockCommunities.find((c) => c.id === id) || null)
        ),
        findAll: vi.fn((_opts?: { limit?: number }) => Promise.resolve(mockCommunities)),
      },
      vectorStore: {
        search: vi.fn(() => Promise.resolve([])),
        upsert: vi.fn(() => Promise.resolve()),
      },
    };
  });

  describe('createGraphRAGResources', () => {
    it('should create all 4 GraphRAG resources', () => {
      const resources = createGraphRAGResources(mockDeps);
      expect(resources).toHaveLength(4);

      const resourceUris = resources.map((r) => r.uri);
      expect(resourceUris).toContain('yagokoro://ontology/schema');
      expect(resourceUris).toContain('yagokoro://graph/statistics');
      expect(resourceUris).toContain('yagokoro://entities/list');
      expect(resourceUris).toContain('yagokoro://timeline/events');
    });
  });

  describe('ontologySchema', () => {
    it('should return schema with entity and relation types', async () => {
      const resource = createOntologySchemaResource(mockDeps);
      const result = await resource.handler({ uri: resource.uri });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].mimeType).toBe('application/json');

      const schema = JSON.parse(result.contents[0].text!);
      expect(schema.entityTypes).toBeDefined();
      expect(schema.relationTypes).toBeDefined();
      expect(schema.entityTypes.AIModel).toBeDefined();
      expect(schema.entityTypes.Organization).toBeDefined();
      expect(schema.relationTypes.DEVELOPED_BY).toBeDefined();
    });

    it('should include entity properties in schema', async () => {
      const resource = createOntologySchemaResource(mockDeps);
      const result = await resource.handler({ uri: resource.uri });

      const schema = JSON.parse(result.contents[0].text!);
      expect(schema.entityTypes.AIModel.properties).toContain('version');
      expect(schema.entityTypes.AIModel.properties).toContain('parameterCount');
    });
  });

  describe('graphStatistics', () => {
    it('should return entity and relation counts', async () => {
      const resource = createGraphStatisticsResource(mockDeps);
      const result = await resource.handler({ uri: resource.uri });

      const stats = JSON.parse(result.contents[0].text!);
      expect(stats.entities.total).toBe(3);
      expect(stats.relations.total).toBe(2);
    });

    it('should count entities by type', async () => {
      const resource = createGraphStatisticsResource(mockDeps);
      const result = await resource.handler({ uri: resource.uri });

      const stats = JSON.parse(result.contents[0].text!);
      expect(stats.entities.byType.AIModel).toBe(1);
      expect(stats.entities.byType.Organization).toBe(1);
      expect(stats.entities.byType.Event).toBe(1);
    });

    it('should count relations by type', async () => {
      const resource = createGraphStatisticsResource(mockDeps);
      const result = await resource.handler({ uri: resource.uri });

      const stats = JSON.parse(result.contents[0].text!);
      expect(stats.relations.byType.DEVELOPED_BY).toBe(1);
      expect(stats.relations.byType.USES_TECHNIQUE).toBe(1);
    });

    it('should include community statistics', async () => {
      const resource = createGraphStatisticsResource(mockDeps);
      const result = await resource.handler({ uri: resource.uri });

      const stats = JSON.parse(result.contents[0].text!);
      expect(stats.communities.totalCommunities).toBe(2);
      expect(stats.communities.byLevel[1]).toBe(1);
      expect(stats.communities.byLevel[2]).toBe(1);
    });
  });

  describe('entityList', () => {
    it('should return list of entities', async () => {
      const resource = createEntityListResource(mockDeps);
      const result = await resource.handler({ uri: resource.uri });

      const data = JSON.parse(result.contents[0].text!);
      expect(data.entities).toHaveLength(3);
      expect(data.total).toBe(3);
    });

    it('should include entity summary info', async () => {
      const resource = createEntityListResource(mockDeps);
      const result = await resource.handler({ uri: resource.uri });

      const data = JSON.parse(result.contents[0].text!);
      const gpt4 = data.entities.find((e: MCPEntity) => e.id === 'entity-1');
      expect(gpt4.name).toBe('GPT-4');
      expect(gpt4.type).toBe('AIModel');
      expect(gpt4.description).toBe('Large language model');
    });
  });

  describe('timeline', () => {
    it('should return events sorted by date', async () => {
      const resource = createTimelineResource(mockDeps);
      const result = await resource.handler({ uri: resource.uri });

      const data = JSON.parse(result.contents[0].text!);
      expect(data.events).toBeDefined();
      expect(data.events.length).toBeGreaterThan(0);
    });

    it('should include entities with Event type', async () => {
      const resource = createTimelineResource(mockDeps);
      const result = await resource.handler({ uri: resource.uri });

      const data = JSON.parse(result.contents[0].text!);
      const gptRelease = data.events.find((e: { id: string }) => e.id === 'entity-3');
      expect(gptRelease).toBeDefined();
      expect(gptRelease.type).toBe('Event');
    });

    it('should include date property', async () => {
      const resource = createTimelineResource(mockDeps);
      const result = await resource.handler({ uri: resource.uri });

      const data = JSON.parse(result.contents[0].text!);
      const gptRelease = data.events.find((e: { id: string }) => e.id === 'entity-3');
      expect(gptRelease.date).toBe('2023-03-14');
    });
  });
});
