import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createGraphRAGTools,
  createQueryKnowledgeGraphTool,
  createGetEntityTool,
  createGetRelationsTool,
  createGetPathTool,
  createGetCommunityTool,
  createAddEntityTool,
  createAddRelationTool,
  createSearchSimilarTool,
} from './graphrag-tools.js';
import type {
  GraphRAGDependencies,
  MCPEntity,
  MCPRelation,
  MCPCommunity,
  MCPVectorSearchResult,
} from '../server/types.js';

describe('GraphRAG Tools', () => {
  let mockDeps: GraphRAGDependencies;
  let mockEntities: Map<string, MCPEntity>;
  let mockRelations: MCPRelation[];
  let mockCommunities: Map<string, MCPCommunity>;
  let mockVectorResults: MCPVectorSearchResult[];

  beforeEach(() => {
    mockEntities = new Map();
    mockRelations = [];
    mockCommunities = new Map();
    mockVectorResults = [];

    // Setup mock entities
    mockEntities.set('entity-1', {
      id: 'entity-1',
      name: 'GPT-4',
      type: 'AIModel',
      description: 'Large language model by OpenAI',
      properties: { version: '4' },
    });
    mockEntities.set('entity-2', {
      id: 'entity-2',
      name: 'OpenAI',
      type: 'Organization',
      description: 'AI research company',
    });
    mockEntities.set('entity-3', {
      id: 'entity-3',
      name: 'Transformer',
      type: 'Technique',
      description: 'Neural network architecture',
    });

    // Setup mock relations
    mockRelations = [
      {
        id: 'rel-1',
        type: 'DEVELOPED_BY',
        sourceEntityId: 'entity-1',
        targetEntityId: 'entity-2',
        weight: 1.0,
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
    mockCommunities.set('community-1', {
      id: 'community-1',
      level: 1,
      memberEntityIds: ['entity-1', 'entity-2', 'entity-3'],
      summary: 'AI Models and Organizations',
    });

    // Setup mock vector results
    mockVectorResults = [
      { id: 'entity-1', score: 0.95, metadata: { name: 'GPT-4', type: 'AIModel' } },
      { id: 'entity-2', score: 0.8, metadata: { name: 'OpenAI', type: 'Organization' } },
    ];

    // Create mock dependencies
    mockDeps = {
      entityRepository: {
        findById: vi.fn((id: string) => Promise.resolve(mockEntities.get(id) || null)),
        findAll: vi.fn((_opts?: { limit?: number }) =>
          Promise.resolve(Array.from(mockEntities.values()))
        ),
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
        findById: vi.fn((id: string) => Promise.resolve(mockCommunities.get(id) || null)),
        findAll: vi.fn((_opts?: { limit?: number }) =>
          Promise.resolve(Array.from(mockCommunities.values()))
        ),
      },
      vectorStore: {
        search: vi.fn((_query: string, _limit: number) => Promise.resolve(mockVectorResults)),
        upsert: vi.fn(() => Promise.resolve()),
      },
    };
  });

  describe('createGraphRAGTools', () => {
    it('should create all 8 GraphRAG tools', () => {
      const tools = createGraphRAGTools(mockDeps);
      expect(tools).toHaveLength(8);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('queryKnowledgeGraph');
      expect(toolNames).toContain('getEntity');
      expect(toolNames).toContain('getRelations');
      expect(toolNames).toContain('getPath');
      expect(toolNames).toContain('getCommunity');
      expect(toolNames).toContain('addEntity');
      expect(toolNames).toContain('addRelation');
      expect(toolNames).toContain('searchSimilar');
    });
  });

  describe('queryKnowledgeGraph', () => {
    it('should search and return matching entities', async () => {
      const tool = createQueryKnowledgeGraphTool(mockDeps);
      const result = await tool.handler({ query: 'GPT language model', limit: 10 }, {});

      expect(mockDeps.vectorStore.search).toHaveBeenCalledWith('GPT language model', 10);
      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe('text');
      expect((result.content[0] as { text: string }).text).toContain('GPT-4');
    });

    it('should return no results message when empty', async () => {
      mockDeps.vectorStore.search = vi.fn(() => Promise.resolve([]));
      const tool = createQueryKnowledgeGraphTool(mockDeps);
      const result = await tool.handler({ query: 'nonexistent' }, {});

      expect(result.content[0].type).toBe('text');
      expect((result.content[0] as { text: string }).text).toContain('No results found');
    });
  });

  describe('getEntity', () => {
    it('should return entity details', async () => {
      const tool = createGetEntityTool(mockDeps);
      const result = await tool.handler({ entityId: 'entity-1', includeRelations: true }, {});

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe('text');
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('GPT-4');
      expect(text).toContain('AIModel');
      expect(text).toContain('DEVELOPED_BY');
    });

    it('should return error for unknown entity', async () => {
      const tool = createGetEntityTool(mockDeps);
      const result = await tool.handler({ entityId: 'nonexistent' }, {});

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('not found');
    });
  });

  describe('getRelations', () => {
    it('should return relations for entity', async () => {
      const tool = createGetRelationsTool(mockDeps);
      const result = await tool.handler({ entityId: 'entity-1' }, {});

      expect(result.content[0].type).toBe('text');
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Found 2 relations');
      expect(text).toContain('DEVELOPED_BY');
      expect(text).toContain('USES_TECHNIQUE');
    });

    it('should filter by direction', async () => {
      const tool = createGetRelationsTool(mockDeps);
      const result = await tool.handler({ entityId: 'entity-1', direction: 'outgoing' }, {});

      expect(result.content[0].type).toBe('text');
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Found 2 relations');
    });

    it('should filter by relation type', async () => {
      const tool = createGetRelationsTool(mockDeps);
      const result = await tool.handler(
        { entityId: 'entity-1', relationType: 'DEVELOPED_BY' },
        {}
      );

      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Found 1 relations');
      expect(text).toContain('DEVELOPED_BY');
    });
  });

  describe('getPath', () => {
    it('should find path between entities', async () => {
      const tool = createGetPathTool(mockDeps);
      const result = await tool.handler({ sourceId: 'entity-1', targetId: 'entity-2' }, {});

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe('text');
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Path from GPT-4 to OpenAI');
    });

    it('should return error for nonexistent source', async () => {
      const tool = createGetPathTool(mockDeps);
      const result = await tool.handler({ sourceId: 'nonexistent', targetId: 'entity-2' }, {});

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('Source entity not found');
    });
  });

  describe('getCommunity', () => {
    it('should return community details', async () => {
      const tool = createGetCommunityTool(mockDeps);
      const result = await tool.handler({ communityId: 'community-1' }, {});

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Community: community-1');
      expect(text).toContain('Level: 1');
      expect(text).toContain('AI Models and Organizations');
      expect(text).toContain('GPT-4');
    });

    it('should return error for unknown community', async () => {
      const tool = createGetCommunityTool(mockDeps);
      const result = await tool.handler({ communityId: 'nonexistent' }, {});

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('not found');
    });
  });

  describe('addEntity', () => {
    it('should create new entity', async () => {
      const tool = createAddEntityTool(mockDeps);
      const result = await tool.handler(
        {
          name: 'Claude',
          type: 'AIModel',
          description: 'AI assistant by Anthropic',
        },
        {}
      );

      expect(result.isError).toBeUndefined();
      expect(mockDeps.entityRepository.save).toHaveBeenCalled();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Entity created successfully');
      expect(text).toContain('Claude');
    });

    it('should index in vector store if embedding service exists', async () => {
      const mockEmbeddingService = {
        embed: vi.fn(() => Promise.resolve([0.1, 0.2, 0.3])),
      };
      mockDeps.embeddingService = mockEmbeddingService;

      const tool = createAddEntityTool(mockDeps);
      await tool.handler({ name: 'Test', type: 'Test' }, {});

      expect(mockEmbeddingService.embed).toHaveBeenCalled();
      expect(mockDeps.vectorStore.upsert).toHaveBeenCalled();
    });
  });

  describe('addRelation', () => {
    it('should create new relation', async () => {
      const tool = createAddRelationTool(mockDeps);
      const result = await tool.handler(
        {
          sourceEntityId: 'entity-1',
          targetEntityId: 'entity-3',
          type: 'USES_TECHNIQUE',
        },
        {}
      );

      expect(result.isError).toBeUndefined();
      expect(mockDeps.relationRepository.save).toHaveBeenCalled();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Relation created successfully');
    });

    it('should return error for nonexistent source entity', async () => {
      const tool = createAddRelationTool(mockDeps);
      const result = await tool.handler(
        {
          sourceEntityId: 'nonexistent',
          targetEntityId: 'entity-2',
          type: 'RELATED_TO',
        },
        {}
      );

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('Source entity not found');
    });
  });

  describe('searchSimilar', () => {
    it('should search for similar entities', async () => {
      const tool = createSearchSimilarTool(mockDeps);
      const result = await tool.handler({ query: 'language model' }, {});

      expect(mockDeps.vectorStore.search).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Found 2 similar entities');
      expect(text).toContain('GPT-4');
      expect(text).toContain('Similarity');
    });

    it('should filter by entity type', async () => {
      const tool = createSearchSimilarTool(mockDeps);
      const result = await tool.handler({ query: 'AI', entityType: 'AIModel' }, {});

      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Found 1 similar entities');
      expect(text).toContain('GPT-4');
    });

    it('should filter by threshold', async () => {
      const tool = createSearchSimilarTool(mockDeps);
      const result = await tool.handler({ query: 'AI', threshold: 0.9 }, {});

      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Found 1 similar entities');
    });
  });
});
