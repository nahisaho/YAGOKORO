/**
 * @fileoverview Tests for NLQService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NLQService } from '../src/nlq-service.js';
import type {
  LLMClient,
  CypherExecutor,
  VectorSearchClient,
  GraphSchema,
} from '../src/types.js';
import type { Neo4jConnectionPort } from '../src/schema-provider.js';

// Mock schema
const mockSchema: GraphSchema = {
  nodeLabels: ['AIModel', 'Person'],
  relationTypes: ['DEVELOPED_BY'],
  propertyKeys: {
    AIModel: ['name', 'releaseDate'],
    Person: ['name'],
  },
};

// Create combined Neo4j mock (connection + executor)
const createMockNeo4j = (): Neo4jConnectionPort & CypherExecutor => ({
  isConnected: vi.fn().mockReturnValue(true),
  executeRead: vi.fn()
    .mockResolvedValueOnce([{ label: 'AIModel' }, { label: 'Person' }])
    .mockResolvedValueOnce([{ relationshipType: 'DEVELOPED_BY' }])
    .mockResolvedValueOnce([{ key: 'name' }, { key: 'releaseDate' }])
    .mockResolvedValueOnce([{ key: 'name' }]),
  execute: vi.fn().mockResolvedValue([
    { name: 'GPT-4', releaseDate: '2023-03-14' },
  ]),
  validate: vi.fn().mockResolvedValue({ valid: true }),
});

// Mock LLM client
const createMockLLM = (): LLMClient => ({
  complete: vi.fn()
    // First call for intent classification
    .mockResolvedValueOnce(JSON.stringify({
      type: 'ENTITY_LOOKUP',
      confidence: 0.95,
      entities: ['GPT-4'],
      isAmbiguous: false,
    }))
    // Second call for Cypher generation
    .mockResolvedValueOnce(`
      \`\`\`cypher
      MATCH (n:AIModel {name: 'GPT-4'})
      RETURN n
      LIMIT 25
      \`\`\`
    `),
});

// Mock vector search client
const createMockVectorSearch = (): VectorSearchClient => ({
  search: vi.fn().mockResolvedValue([
    { id: '1', score: 0.95, payload: { name: 'GPT-4', type: 'AIModel' } },
    { id: '2', score: 0.88, payload: { name: 'GPT-3.5', type: 'AIModel' } },
  ]),
});

describe('NLQService', () => {
  let neo4j: Neo4jConnectionPort & CypherExecutor;
  let llm: LLMClient;
  let vectorSearch: VectorSearchClient;

  beforeEach(() => {
    vi.clearAllMocks();
    neo4j = createMockNeo4j();
    llm = createMockLLM();
    vectorSearch = createMockVectorSearch();
  });

  describe('query', () => {
    it('should process a successful query end-to-end', async () => {
      const service = new NLQService({ llm, neo4j, vectorSearch });

      const result = await service.query('GPT-4とは？');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.cypher).toContain('GPT-4');
      expect(result.fallbackUsed).toBe(false);
      expect(result.executionTimeMs).toBeGreaterThan(0);
    });

    it('should include intent in result', async () => {
      const service = new NLQService({ llm, neo4j, vectorSearch });

      const result = await service.query('GPT-4とは？');

      expect(result.intent).toBeDefined();
      expect(result.intent?.type).toBe('ENTITY_LOOKUP');
      expect(result.intent?.entities).toContain('GPT-4');
    });

    it('should fallback to vector search on Cypher failure', async () => {
      const failingNeo4j = {
        ...createMockNeo4j(),
        execute: vi.fn().mockRejectedValue(new Error('Query failed')),
      };

      const service = new NLQService({
        llm,
        neo4j: failingNeo4j,
        vectorSearch,
      });

      const result = await service.query('GPT-4について', { fallback: true });

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should not fallback when disabled', async () => {
      const failingNeo4j = {
        ...createMockNeo4j(),
        execute: vi.fn().mockRejectedValue(new Error('Query failed')),
      };

      const service = new NLQService({
        llm,
        neo4j: failingNeo4j,
        vectorSearch,
        enableFallback: false,
      });

      const result = await service.query('GPT-4について');

      expect(result.success).toBe(false);
      expect(result.fallbackUsed).toBe(false);
      expect(result.error?.code).toBe('E-NLQ-004');
    });

    it('should handle ambiguous queries', async () => {
      const ambiguousLLM: LLMClient = {
        complete: vi.fn().mockResolvedValue(JSON.stringify({
          type: 'ENTITY_LOOKUP',
          confidence: 0.3,
          entities: [],
          isAmbiguous: true,
          clarificationNeeded: '具体的なAIモデル名を指定してください',
        })),
      };

      const service = new NLQService({
        llm: ambiguousLLM,
        neo4j,
        vectorSearch,
      });

      const result = await service.query('最近のAI');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('AIモデル名');
    });

    it('should respect language option', async () => {
      const complete = vi.fn()
        .mockResolvedValueOnce(JSON.stringify({
          type: 'ENTITY_LOOKUP',
          confidence: 0.9,
          entities: ['GPT-4'],
          isAmbiguous: false,
        }))
        .mockResolvedValueOnce(`\`\`\`cypher\nMATCH (n) RETURN n\n\`\`\``);

      const service = new NLQService({
        llm: { complete },
        neo4j,
      });

      await service.query('What is GPT-4?', { lang: 'en' });

      expect(complete).toHaveBeenCalledWith(
        expect.stringContaining('English'),
        expect.any(Object)
      );
    });

    it('should use default language from config', async () => {
      // Reset neo4j mock for this test
      const localNeo4j = createMockNeo4j();
      const complete = vi.fn()
        .mockResolvedValueOnce(JSON.stringify({
          type: 'ENTITY_LOOKUP',
          confidence: 0.9,
          entities: [],
          isAmbiguous: false,
        }))
        .mockResolvedValueOnce(`\`\`\`cypher\nMATCH (n) RETURN n\n\`\`\``);

      const service = new NLQService({
        llm: { complete },
        neo4j: localNeo4j,
        defaultLang: 'ja', // Test that default ja works
      });

      await service.query('GPT-4とは？');

      // Check the first call (intent classification) uses Japanese prompt
      // The prompt uses "言語: 日本語" format
      const firstCallArgs = complete.mock.calls[0]?.[0] ?? '';
      expect(firstCallArgs).toContain('言語: 日本語');
    });
  });

  describe('error handling', () => {
    it('should handle LLM errors gracefully', async () => {
      const failingLLM: LLMClient = {
        complete: vi.fn().mockRejectedValue(new Error('LLM unavailable')),
      };

      const service = new NLQService({
        llm: failingLLM,
        neo4j,
        vectorSearch,
      });

      const result = await service.query('test query', { fallback: true });

      // Should fallback to vector search
      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
    });

    it('should return error when both Cypher and fallback fail', async () => {
      const failingLLM: LLMClient = {
        complete: vi.fn()
          .mockResolvedValueOnce(JSON.stringify({
            type: 'ENTITY_LOOKUP',
            confidence: 0.9,
            entities: [],
            isAmbiguous: false,
          }))
          .mockResolvedValueOnce('Invalid response'),
      };

      const failingVectorSearch: VectorSearchClient = {
        search: vi.fn().mockRejectedValue(new Error('Vector search failed')),
      };

      const service = new NLQService({
        llm: failingLLM,
        neo4j,
        vectorSearch: failingVectorSearch,
      });

      const result = await service.query('test', { fallback: true });

      expect(result.success).toBe(false);
    });
  });

  describe('component access', () => {
    it('should provide access to schema provider', () => {
      const service = new NLQService({ llm, neo4j });
      expect(service.getSchemaProvider()).toBeDefined();
    });

    it('should provide access to intent classifier', () => {
      const service = new NLQService({ llm, neo4j });
      expect(service.getIntentClassifier()).toBeDefined();
    });

    it('should provide access to cypher generator', () => {
      const service = new NLQService({ llm, neo4j });
      expect(service.getCypherGenerator()).toBeDefined();
    });
  });
});
