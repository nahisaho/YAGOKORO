/**
 * LazyQueryEngine Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  LazyQueryEngine,
  LazyQueryPresets,
  type LazyQueryEngineConfig,
} from './LazyQueryEngine.js';
import type { ConceptGraph, ConceptNode, ConceptEdge, ConceptCommunity } from '../extraction/ConceptGraphBuilder.js';
import type { TextChunk } from '../extraction/types.js';
import type { BaseLLMClient } from '../llm/BaseLLMClient.js';

/**
 * Create mock LLM client
 */
function createMockLLMClient(): BaseLLMClient {
  return {
    chat: vi.fn().mockImplementation(async (messages) => {
      const userMessage = messages.find((m: { role: string }) => m.role === 'user')?.content ?? '';

      // Handle different types of requests
      if (userMessage.includes('subqueries')) {
        return {
          content: JSON.stringify({
            subqueries: [
              'What are transformer models?',
              'How do attention mechanisms work?',
              'What are recent LLM advances?',
            ],
          }),
        };
      }

      if (userMessage.includes('relevance') || userMessage.includes('Sentence:')) {
        return {
          content: JSON.stringify({
            assessments: [
              { sentenceIndex: 0, isRelevant: true, score: 0.9 },
            ],
          }),
        };
      }

      if (userMessage.includes('claims') || userMessage.includes('extract')) {
        return {
          content: JSON.stringify({
            claims: [
              { text: 'Transformers use attention', relevance: 0.9 },
              { text: 'LLMs scale well', relevance: 0.8 },
            ],
          }),
        };
      }

      // Default: Generate answer
      return {
        content: 'Based on the claims, transformers revolutionized NLP through attention mechanisms.',
      };
    }),
    countTokens: vi.fn().mockReturnValue(100),
    maxTokens: 4096,
  } as unknown as BaseLLMClient;
}

/**
 * Create mock concept graph
 */
function createMockConceptGraph(): ConceptGraph {
  const nodes: ConceptNode[] = [
    {
      id: 'transformer',
      text: 'transformer',
      importance: 0.9,
      frequency: 10,
      communities: [0],
      sourceChunks: ['chunk-1', 'chunk-3'],
    },
    {
      id: 'attention',
      text: 'attention',
      importance: 0.85,
      frequency: 8,
      communities: [0],
      sourceChunks: ['chunk-1'],
    },
    {
      id: 'language model',
      text: 'language model',
      importance: 0.8,
      frequency: 12,
      communities: [1],
      sourceChunks: ['chunk-2', 'chunk-3'],
    },
  ];

  const edges: ConceptEdge[] = [
    {
      source: 'transformer',
      target: 'attention',
      weight: 5,
      count: 5,
    },
    {
      source: 'transformer',
      target: 'language model',
      weight: 3,
      count: 3,
    },
  ];

  const communities: ConceptCommunity[] = [
    {
      id: 'community-1',
      level: 0,
      conceptIds: ['transformer', 'attention'],
      parentCommunityId: 'community-root',
      childCommunities: [],
      topConcepts: ['transformer', 'attention'],
      chunkIds: ['chunk-1', 'chunk-3'],
      size: 2,
    },
    {
      id: 'community-2',
      level: 0,
      conceptIds: ['language model'],
      parentCommunityId: 'community-root',
      childCommunities: [],
      topConcepts: ['language model'],
      chunkIds: ['chunk-2', 'chunk-3'],
      size: 1,
    },
    {
      id: 'community-root',
      level: 1,
      conceptIds: ['transformer', 'attention', 'language model'],
      childCommunities: ['community-1', 'community-2'],
      topConcepts: ['transformer', 'language model', 'attention'],
      chunkIds: ['chunk-1', 'chunk-2', 'chunk-3'],
      size: 3,
    },
  ];

  const chunkToConcepts = new Map<string, string[]>();
  chunkToConcepts.set('chunk-1', ['transformer', 'attention']);
  chunkToConcepts.set('chunk-2', ['language model']);
  chunkToConcepts.set('chunk-3', ['transformer', 'language model']);

  const conceptToChunks = new Map<string, string[]>();
  conceptToChunks.set('transformer', ['chunk-1', 'chunk-3']);
  conceptToChunks.set('attention', ['chunk-1']);
  conceptToChunks.set('language model', ['chunk-2', 'chunk-3']);

  return {
    nodes,
    edges,
    communities,
    chunkToConcepts,
    conceptToChunks,
    hierarchyLevels: 2,
    stats: {
      nodeCount: 3,
      edgeCount: 2,
      communityCount: 3,
      avgDegree: 1.33,
      density: 0.67,
    },
  };
}

/**
 * Create mock text chunks
 */
function createMockChunks(): TextChunk[] {
  return [
    {
      id: 'chunk-1',
      content: 'Transformers use self-attention mechanisms. This allows them to process sequences efficiently.',
      metadata: {
        source: 'source-1',
      },
    },
    {
      id: 'chunk-2',
      content: 'Large language models have scaled to billions of parameters. They demonstrate emergent abilities.',
      metadata: {
        source: 'source-1',
      },
    },
    {
      id: 'chunk-3',
      content: 'The transformer architecture enables efficient language model training. It uses parallel processing.',
      metadata: {
        source: 'source-2',
      },
    },
  ];
}

describe('LazyQueryEngine', () => {
  let mockAssessorClient: BaseLLMClient;
  let mockGeneratorClient: BaseLLMClient;
  let engine: LazyQueryEngine;
  let mockGraph: ConceptGraph;
  let mockChunks: TextChunk[];

  beforeEach(() => {
    mockAssessorClient = createMockLLMClient();
    mockGeneratorClient = createMockLLMClient();
    mockGraph = createMockConceptGraph();
    mockChunks = createMockChunks();

    engine = new LazyQueryEngine({
      assessorClient: mockAssessorClient,
      generatorClient: mockGeneratorClient,
    });
  });

  describe('constructor', () => {
    it('should create engine with default config', () => {
      expect(engine).toBeDefined();
    });

    it('should accept custom config', () => {
      const customEngine = new LazyQueryEngine(
        {
          assessorClient: mockAssessorClient,
          generatorClient: mockGeneratorClient,
        },
        {
          budget: 500,
          numSubqueries: 5,
        }
      );
      expect(customEngine).toBeDefined();
    });
  });

  describe('query', () => {
    it('should process query and return response', async () => {
      const response = await engine.query(
        'What are transformers?',
        mockGraph,
        mockChunks
      );

      expect(response).toBeDefined();
      expect(response.query).toBe('What are transformers?');
      expect(response.answer).toBeDefined();
      expect(response.answer.length).toBeGreaterThan(0);
    });

    it('should include metrics in response', async () => {
      const response = await engine.query(
        'Explain attention mechanisms',
        mockGraph,
        mockChunks
      );

      expect(response.metrics).toBeDefined();
      expect(response.metrics.totalTimeMs).toBeGreaterThan(0);
      expect(response.metrics.expansionTimeMs).toBeDefined();
      expect(response.metrics.searchTimeMs).toBeDefined();
      expect(response.metrics.extractionTimeMs).toBeDefined();
      expect(response.metrics.generationTimeMs).toBeDefined();
    });

    it('should track relevance tests used', async () => {
      const response = await engine.query(
        'How do language models work?',
        mockGraph,
        mockChunks,
        { budget: 100 }
      );

      expect(response.metrics.relevanceTestsUsed).toBeDefined();
      expect(response.metrics.budgetRemaining).toBeDefined();
    });

    it('should respect budget configuration', async () => {
      const lowBudgetResponse = await engine.query(
        'What are transformers?',
        mockGraph,
        mockChunks,
        LazyQueryPresets.Z100_LITE
      );

      expect(lowBudgetResponse.metrics.relevanceTestsUsed).toBeLessThanOrEqual(100);
    });

    it('should include sources in response', async () => {
      const response = await engine.query(
        'Explain transformers',
        mockGraph,
        mockChunks
      );

      expect(response.sources).toBeDefined();
      expect(Array.isArray(response.sources)).toBe(true);
    });

    it('should include expanded query', async () => {
      const response = await engine.query(
        'What is attention?',
        mockGraph,
        mockChunks
      );

      expect(response.expandedQuery).toBeDefined();
      expect(response.expandedQuery.length).toBeGreaterThan(0);
    });
  });

  describe('estimateCost', () => {
    it('should return low cost for Z100_LITE', () => {
      const cost = engine.estimateCost(LazyQueryPresets.Z100_LITE);
      expect(cost.relativeCost).toBeLessThanOrEqual(0.01);
      expect(cost.description).toContain('Very low');
    });

    it('should return medium cost for Z500', () => {
      const cost = engine.estimateCost(LazyQueryPresets.Z500);
      expect(cost.relativeCost).toBeLessThanOrEqual(0.05);
    });

    it('should return higher cost for Z1500', () => {
      const cost = engine.estimateCost(LazyQueryPresets.Z1500);
      expect(cost.relativeCost).toBeLessThanOrEqual(0.2);
    });
  });

  describe('getConfigForUseCase', () => {
    it('should return Z100_LITE for exploration', () => {
      const config = LazyQueryEngine.getConfigForUseCase('exploration');
      expect(config.budget).toBe(100);
    });

    it('should return Z500 for production', () => {
      const config = LazyQueryEngine.getConfigForUseCase('production');
      expect(config.budget).toBe(500);
    });

    it('should return Z1500 for benchmark', () => {
      const config = LazyQueryEngine.getConfigForUseCase('benchmark');
      expect(config.budget).toBe(1500);
    });
  });

  describe('LazyQueryPresets', () => {
    it('should have Z100_LITE preset', () => {
      expect(LazyQueryPresets.Z100_LITE).toBeDefined();
      expect(LazyQueryPresets.Z100_LITE.budget).toBe(100);
      expect(LazyQueryPresets.Z100_LITE.numSubqueries).toBe(3);
    });

    it('should have Z500 preset', () => {
      expect(LazyQueryPresets.Z500).toBeDefined();
      expect(LazyQueryPresets.Z500.budget).toBe(500);
      expect(LazyQueryPresets.Z500.numSubqueries).toBe(4);
    });

    it('should have Z1500 preset', () => {
      expect(LazyQueryPresets.Z1500).toBeDefined();
      expect(LazyQueryPresets.Z1500.budget).toBe(1500);
      expect(LazyQueryPresets.Z1500.numSubqueries).toBe(5);
    });
  });
});

describe('LazyQueryEngine Integration', () => {
  it('should handle empty chunks gracefully', async () => {
    const engine = new LazyQueryEngine({
      assessorClient: createMockLLMClient(),
      generatorClient: createMockLLMClient(),
    });

    const emptyGraph: ConceptGraph = {
      nodes: [],
      edges: [],
      communities: [],
      chunkToConcepts: new Map(),
      conceptToChunks: new Map(),
      hierarchyLevels: 0,
      stats: {
        nodeCount: 0,
        edgeCount: 0,
        communityCount: 0,
        avgDegree: 0,
        density: 0,
      },
    };

    const response = await engine.query(
      'What are transformers?',
      emptyGraph,
      []
    );

    expect(response).toBeDefined();
    expect(response.answer).toBeDefined();
  });

  it('should handle query with no relevant results', async () => {
    const mockClient = createMockLLMClient();
    (mockClient.chat as ReturnType<typeof vi.fn>).mockImplementation(async () => ({
      content: JSON.stringify({
        assessments: [{ sentenceIndex: 0, isRelevant: false, score: 0.1 }],
      }),
    }));

    const engine = new LazyQueryEngine({
      assessorClient: mockClient,
      generatorClient: createMockLLMClient(),
    });

    const response = await engine.query(
      'Completely unrelated query',
      createMockConceptGraph(),
      createMockChunks()
    );

    expect(response).toBeDefined();
    expect(response.answer).toBeDefined();
  });
});
