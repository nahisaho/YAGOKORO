/**
 * @fileoverview Tests for CypherGenerator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CypherGenerator } from '../src/cypher-generator.js';
import type { LLMClient, QueryIntent, GraphSchema, CypherExecutor } from '../src/types.js';
import type { SchemaProvider } from '../src/schema-provider.js';

// Mock schema
const mockSchema: GraphSchema = {
  nodeLabels: ['AIModel', 'Person', 'Organization', 'Publication'],
  relationTypes: ['DEVELOPED_BY', 'AFFILIATED_WITH', 'PUBLISHED_BY', 'BASED_ON'],
  propertyKeys: {
    AIModel: ['name', 'releaseDate', 'parameters'],
    Person: ['name', 'affiliation'],
    Organization: ['name', 'location'],
    Publication: ['title', 'year', 'venue'],
  },
};

// Mock SchemaProvider
const createMockSchemaProvider = (): SchemaProvider => ({
  getSchema: vi.fn().mockResolvedValue(mockSchema),
  invalidateCache: vi.fn(),
  isCacheValid: vi.fn().mockReturnValue(true),
  formatForPrompt: vi.fn().mockReturnValue('schema text'),
  formatAsJson: vi.fn().mockReturnValue('{}'),
}) as unknown as SchemaProvider;

// Mock LLM client
const createMockLLM = (response: string): LLMClient => ({
  complete: vi.fn().mockResolvedValue(response),
});

// Mock Cypher executor
const createMockExecutor = (valid = true, error?: string): CypherExecutor => ({
  execute: vi.fn().mockResolvedValue([]),
  validate: vi.fn().mockResolvedValue({ valid, error }),
});

describe('CypherGenerator', () => {
  let schemaProvider: SchemaProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    schemaProvider = createMockSchemaProvider();
  });

  describe('generate', () => {
    it('should generate valid Cypher for entity lookup', async () => {
      const cypherResponse = `
        Here's the Cypher query:
        \`\`\`cypher
        MATCH (n:AIModel {name: 'GPT-4'})
        RETURN n
        LIMIT 25
        \`\`\`
      `;
      const llm = createMockLLM(cypherResponse);
      const generator = new CypherGenerator(llm, schemaProvider);

      const intent: QueryIntent = {
        type: 'ENTITY_LOOKUP',
        confidence: 0.95,
        entities: ['GPT-4'],
        isAmbiguous: false,
      };

      const result = await generator.generate('GPT-4とは？', intent);

      expect(result.success).toBe(true);
      expect(result.query?.cypher).toContain('MATCH');
      expect(result.query?.cypher).toContain('GPT-4');
      expect(result.query?.isValid).toBe(true);
    });

    it('should generate Cypher for relationship query', async () => {
      const cypherResponse = `
        \`\`\`cypher
        MATCH (p:Person)-[:DEVELOPED_BY]-(m:AIModel {name: 'Transformer'})
        RETURN p.name
        LIMIT 25
        \`\`\`
      `;
      const llm = createMockLLM(cypherResponse);
      const generator = new CypherGenerator(llm, schemaProvider);

      const intent: QueryIntent = {
        type: 'RELATIONSHIP_QUERY',
        confidence: 0.92,
        entities: ['Transformer'],
        relations: ['DEVELOPED_BY'],
        isAmbiguous: false,
      };

      const result = await generator.generate('Transformerを開発した人は誰？', intent);

      expect(result.success).toBe(true);
      expect(result.query?.cypher).toContain('DEVELOPED_BY');
    });

    it('should validate Cypher with executor', async () => {
      const cypherResponse = `
        \`\`\`cypher
        MATCH (n:AIModel) RETURN n LIMIT 10
        \`\`\`
      `;
      const llm = createMockLLM(cypherResponse);
      const executor = createMockExecutor(true);
      const generator = new CypherGenerator(llm, schemaProvider, executor);

      const intent: QueryIntent = {
        type: 'ENTITY_LOOKUP',
        confidence: 0.9,
        entities: [],
        isAmbiguous: false,
      };

      const result = await generator.generate('AIモデル一覧', intent);

      expect(result.success).toBe(true);
      expect(executor.validate).toHaveBeenCalled();
    });

    it('should retry on invalid Cypher', async () => {
      const invalidResponse = `
        \`\`\`cypher
        MATCH (n:InvalidLabel) RETURN n
        \`\`\`
      `;
      const validResponse = `
        \`\`\`cypher
        MATCH (n:AIModel) RETURN n LIMIT 25
        \`\`\`
      `;

      const complete = vi.fn()
        .mockResolvedValueOnce(invalidResponse)
        .mockResolvedValueOnce(validResponse);

      const llm: LLMClient = { complete };
      const executor = createMockExecutor(false, 'Unknown label');

      // Make executor pass on second attempt
      (executor.validate as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ valid: false, error: 'Unknown label' })
        .mockResolvedValueOnce({ valid: true });

      const generator = new CypherGenerator(llm, schemaProvider, executor);

      const intent: QueryIntent = {
        type: 'ENTITY_LOOKUP',
        confidence: 0.9,
        entities: [],
        isAmbiguous: false,
      };

      const result = await generator.generate('AIモデル一覧', intent);

      expect(complete).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it('should fail after max retries', async () => {
      const invalidResponse = 'No valid Cypher here';
      const llm = createMockLLM(invalidResponse);
      const generator = new CypherGenerator(llm, schemaProvider, undefined, {
        maxRetries: 2,
      });

      const intent: QueryIntent = {
        type: 'ENTITY_LOOKUP',
        confidence: 0.9,
        entities: [],
        isAmbiguous: false,
      };

      const result = await generator.generate('test', intent);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('E-NLQ-002');
    });

    it('should handle schema fetch error', async () => {
      const failingSchemaProvider = {
        getSchema: vi.fn().mockRejectedValue(new Error('Connection failed')),
      } as unknown as SchemaProvider;

      const llm = createMockLLM('');
      const generator = new CypherGenerator(llm, failingSchemaProvider);

      const intent: QueryIntent = {
        type: 'ENTITY_LOOKUP',
        confidence: 0.9,
        entities: [],
        isAmbiguous: false,
      };

      const result = await generator.generate('test', intent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('schema');
    });

    it('should provide suggestions on failure', async () => {
      const llm = createMockLLM('Invalid response');
      const generator = new CypherGenerator(llm, schemaProvider);

      const intent: QueryIntent = {
        type: 'COMPARISON',
        confidence: 0.5,
        entities: [],
        isAmbiguous: true,
      };

      const result = await generator.generate('比較して', intent);

      expect(result.success).toBe(false);
      expect(result.error?.suggestions).toBeDefined();
      expect(result.error?.suggestions?.length).toBeGreaterThan(0);
    });
  });

  describe('extractCypher', () => {
    it('should extract Cypher from code block', async () => {
      const response = `
        Here is the query:
        \`\`\`cypher
        MATCH (n) RETURN n
        \`\`\`
        This will return all nodes.
      `;
      const llm = createMockLLM(response);
      const generator = new CypherGenerator(llm, schemaProvider);

      const intent: QueryIntent = {
        type: 'ENTITY_LOOKUP',
        confidence: 0.9,
        entities: [],
        isAmbiguous: false,
      };

      const result = await generator.generate('test', intent);
      expect(result.success).toBe(true);
      expect(result.query?.cypher).toBe('MATCH (n) RETURN n');
    });

    it('should extract Cypher without language tag', async () => {
      const response = `
        \`\`\`
        MATCH (n:AIModel) RETURN n LIMIT 10
        \`\`\`
      `;
      const llm = createMockLLM(response);
      const generator = new CypherGenerator(llm, schemaProvider);

      const intent: QueryIntent = {
        type: 'ENTITY_LOOKUP',
        confidence: 0.9,
        entities: [],
        isAmbiguous: false,
      };

      const result = await generator.generate('test', intent);
      expect(result.success).toBe(true);
    });

    it('should extract direct Cypher statements', async () => {
      const response = `
        The query you need is:
        MATCH (m:AIModel {name: 'GPT-4'})
        RETURN m.name, m.releaseDate
      `;
      const llm = createMockLLM(response);
      const generator = new CypherGenerator(llm, schemaProvider);

      const intent: QueryIntent = {
        type: 'ENTITY_LOOKUP',
        confidence: 0.9,
        entities: ['GPT-4'],
        isAmbiguous: false,
      };

      const result = await generator.generate('GPT-4の情報', intent);
      expect(result.success).toBe(true);
      expect(result.query?.cypher).toContain('MATCH');
    });
  });

  describe('intent-specific generation', () => {
    it('should include path hint for PATH_FINDING', async () => {
      const complete = vi.fn().mockResolvedValue(`
        \`\`\`cypher
        MATCH path = shortestPath((a:AIModel {name: 'BERT'})-[*]-(b:AIModel {name: 'GPT'}))
        RETURN path
        \`\`\`
      `);
      const llm: LLMClient = { complete };
      const generator = new CypherGenerator(llm, schemaProvider);

      const intent: QueryIntent = {
        type: 'PATH_FINDING',
        confidence: 0.88,
        entities: ['BERT', 'GPT'],
        isAmbiguous: false,
      };

      await generator.generate('BERTとGPTの関係', intent);

      expect(complete).toHaveBeenCalledWith(
        expect.stringContaining('shortestPath'),
        expect.any(Object)
      );
    });

    it('should include aggregation hint for AGGREGATION', async () => {
      const complete = vi.fn().mockResolvedValue(`
        \`\`\`cypher
        MATCH (m:AIModel)
        WHERE m.releaseDate >= '2023'
        RETURN COUNT(m) as count
        \`\`\`
      `);
      const llm: LLMClient = { complete };
      const generator = new CypherGenerator(llm, schemaProvider);

      const intent: QueryIntent = {
        type: 'AGGREGATION',
        confidence: 0.90,
        entities: [],
        isAmbiguous: false,
      };

      await generator.generate('2023年のモデル数', intent);

      expect(complete).toHaveBeenCalledWith(
        expect.stringContaining('COUNT'),
        expect.any(Object)
      );
    });
  });
});
