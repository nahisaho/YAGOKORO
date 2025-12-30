/**
 * @fileoverview Tests for Advanced MCP Tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createNaturalLanguageQueryTool,
  createChainOfThoughtTool,
  createValidateResponseTool,
  createCheckConsistencyTool,
  createAdvancedTools,
  type AdvancedToolDependencies,
  type NLQServiceInterface,
  type CoTGeneratorInterface,
  type ConfidenceScorerInterface,
  type ConsistencyCheckerInterface,
  type ContradictionDetectorInterface,
} from './advanced-tools.js';

// Mock implementations
const createMockDeps = (): AdvancedToolDependencies => ({
  entityRepository: {
    findById: vi.fn().mockResolvedValue({
      id: 'entity-1',
      name: 'GPT-4',
      type: 'AIModel',
      description: 'Large language model by OpenAI',
    }),
    findAll: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
  },
  relationRepository: {
    findByEntityId: vi.fn().mockResolvedValue([]),
    findAll: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
  },
  communityRepository: {
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
  },
  vectorStore: {
    search: vi.fn().mockResolvedValue([
      { id: 'entity-1', score: 0.95, metadata: { name: 'GPT-4', type: 'AIModel' } },
    ]),
    upsert: vi.fn().mockResolvedValue(undefined),
  },
});

const createMockNLQService = (): NLQServiceInterface => ({
  query: vi.fn().mockResolvedValue({
    cypher: 'MATCH (n:AIModel) WHERE n.name = "GPT-4" RETURN n',
    intent: 'entity_lookup',
    entities: ['GPT-4'],
    results: [{ name: 'GPT-4', type: 'AIModel' }],
    confidence: 0.92,
    executionTimeMs: 45,
  }),
});

const createMockCoTGenerator = (): CoTGeneratorInterface => ({
  generateChain: vi.fn().mockResolvedValue({
    chainId: 'chain-1',
    query: 'Who developed GPT-4?',
    steps: [
      {
        stepNumber: 1,
        reasoning: 'Looking up GPT-4 in the knowledge graph',
        evidence: ['Found entity: GPT-4'],
        confidence: 0.9,
      },
      {
        stepNumber: 2,
        reasoning: 'Finding developer relationship',
        evidence: ['Found relation: DEVELOPED_BY -> OpenAI'],
        confidence: 0.95,
      },
    ],
    conclusion: 'GPT-4 was developed by OpenAI.',
    confidence: 0.92,
    totalTimeMs: 150,
  }),
});

const createMockConfidenceScorer = (): ConfidenceScorerInterface => ({
  score: vi.fn().mockResolvedValue({
    overall: 0.85,
    metrics: [
      { name: 'graphCoverage', score: 0.9, explanation: 'High entity coverage' },
      { name: 'pathConfidence', score: 0.8, explanation: 'Good path confidence' },
    ],
    isLow: false,
  }),
});

const createMockConsistencyChecker = (): ConsistencyCheckerInterface => ({
  check: vi.fn().mockResolvedValue({
    claim: { id: 'claim-1', text: 'GPT-4 is developed by OpenAI', entityIds: [], confidence: 0.8 },
    isConsistent: true,
    score: 0.9,
    explanation: 'Claim is consistent with knowledge graph',
  }),
  checkAll: vi.fn().mockResolvedValue([
    {
      claim: { id: 'claim-1', text: 'GPT-4 is developed by OpenAI', entityIds: [], confidence: 0.8 },
      isConsistent: true,
      score: 0.9,
      explanation: 'Claim is consistent',
    },
  ]),
});

const createMockContradictionDetector = (): ContradictionDetectorInterface => ({
  detect: vi.fn().mockResolvedValue({
    claims: [],
    contradictions: [],
    coherenceScore: 0.95,
    isCoherent: true,
    summary: 'No contradictions detected',
  }),
});

describe('Advanced MCP Tools', () => {
  let deps: AdvancedToolDependencies;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  describe('createNaturalLanguageQueryTool', () => {
    it('should fall back to vector search when NLQ service not available', async () => {
      const tool = createNaturalLanguageQueryTool(deps);

      const result = await tool.handler(
        { query: 'What is GPT-4?' },
        {}
      );

      expect(result.content[0]).toHaveProperty('type', 'text');
      expect((result.content[0] as { text: string }).text).toContain('GPT-4');
      expect(deps.vectorStore.search).toHaveBeenCalled();
    });

    it('should use NLQ service when available', async () => {
      const nlqService = createMockNLQService();
      const depsWithNLQ = { ...deps, nlqService };
      const tool = createNaturalLanguageQueryTool(depsWithNLQ);

      const result = await tool.handler(
        { query: 'What is GPT-4?', includeExplanation: true },
        {}
      );

      expect(nlqService.query).toHaveBeenCalledWith('What is GPT-4?');
      expect((result.content[0] as { text: string }).text).toContain('Query Results');
      expect((result.content[0] as { text: string }).text).toContain('cypher');
    });

    it('should handle NLQ service errors gracefully', async () => {
      const nlqService = createMockNLQService();
      vi.mocked(nlqService.query).mockRejectedValue(new Error('Service unavailable'));
      const depsWithNLQ = { ...deps, nlqService };
      const tool = createNaturalLanguageQueryTool(depsWithNLQ);

      const result = await tool.handler(
        { query: 'Test query' },
        {}
      );

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('failed');
    });

    it('should handle empty results', async () => {
      vi.mocked(deps.vectorStore.search).mockResolvedValue([]);
      const tool = createNaturalLanguageQueryTool(deps);

      const result = await tool.handler(
        { query: 'Non-existent entity' },
        {}
      );

      expect((result.content[0] as { text: string }).text).toContain('No results');
    });
  });

  describe('createChainOfThoughtTool', () => {
    it('should return error when CoT generator not available', async () => {
      const tool = createChainOfThoughtTool(deps);

      const result = await tool.handler(
        { query: 'Who developed GPT-4?' },
        {}
      );

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('not available');
    });

    it('should generate reasoning chain when available', async () => {
      const cotGenerator = createMockCoTGenerator();
      const depsWithCoT = { ...deps, cotGenerator };
      const tool = createChainOfThoughtTool(depsWithCoT);

      const result = await tool.handler(
        { query: 'Who developed GPT-4?', maxSteps: 5 },
        {}
      );

      expect(cotGenerator.generateChain).toHaveBeenCalled();
      expect((result.content[0] as { text: string }).text).toContain('Chain of Thought');
      expect((result.content[0] as { text: string }).text).toContain('Step 1');
      expect((result.content[0] as { text: string }).text).toContain('Conclusion');
    });

    it('should handle errors gracefully', async () => {
      const cotGenerator = createMockCoTGenerator();
      vi.mocked(cotGenerator.generateChain).mockRejectedValue(new Error('Timeout'));
      const depsWithCoT = { ...deps, cotGenerator };
      const tool = createChainOfThoughtTool(depsWithCoT);

      const result = await tool.handler(
        { query: 'Complex question' },
        {}
      );

      expect(result.isError).toBe(true);
    });
  });

  describe('createValidateResponseTool', () => {
    it('should provide basic validation message when no services configured', async () => {
      const tool = createValidateResponseTool(deps);

      const result = await tool.handler(
        { query: 'What is GPT-4?', response: 'GPT-4 is a model.' },
        {}
      );

      expect((result.content[0] as { text: string }).text).toContain('Response Validation');
      expect((result.content[0] as { text: string }).text).toContain('No validation services');
    });

    it('should include confidence analysis when scorer available', async () => {
      const confidenceScorer = createMockConfidenceScorer();
      const depsWithScorer = { ...deps, confidenceScorer };
      const tool = createValidateResponseTool(depsWithScorer);

      const result = await tool.handler(
        { query: 'What is GPT-4?', response: 'GPT-4 is a model by OpenAI.' },
        {}
      );

      expect(confidenceScorer.score).toHaveBeenCalled();
      expect((result.content[0] as { text: string }).text).toContain('Confidence Analysis');
      expect((result.content[0] as { text: string }).text).toContain('graphCoverage');
    });

    it('should include consistency check when checker available', async () => {
      const consistencyChecker = createMockConsistencyChecker();
      const depsWithChecker = { ...deps, consistencyChecker };
      const tool = createValidateResponseTool(depsWithChecker);

      const result = await tool.handler(
        {
          query: 'What is GPT-4?',
          response: 'GPT-4 is a model. It was developed by OpenAI.',
        },
        {}
      );

      expect(consistencyChecker.checkAll).toHaveBeenCalled();
      expect((result.content[0] as { text: string }).text).toContain('Consistency Check');
    });

    it('should include coherence analysis when detector available', async () => {
      const contradictionDetector = createMockContradictionDetector();
      const depsWithDetector = { ...deps, contradictionDetector };
      const tool = createValidateResponseTool(depsWithDetector);

      const result = await tool.handler(
        {
          query: 'What is GPT-4?',
          response: 'GPT-4 is a model. It was developed by OpenAI.',
        },
        {}
      );

      expect(contradictionDetector.detect).toHaveBeenCalled();
      expect((result.content[0] as { text: string }).text).toContain('Coherence Analysis');
    });
  });

  describe('createCheckConsistencyTool', () => {
    it('should return error when checker not available', async () => {
      const tool = createCheckConsistencyTool(deps);

      const result = await tool.handler(
        { claims: [{ text: 'Some claim', entityIds: [] }] },
        {}
      );

      expect(result.isError).toBe(true);
    });

    it('should check all claims', async () => {
      const consistencyChecker = createMockConsistencyChecker();
      const depsWithChecker = { ...deps, consistencyChecker };
      const tool = createCheckConsistencyTool(depsWithChecker);

      const result = await tool.handler(
        {
          claims: [
            { text: 'GPT-4 is developed by OpenAI', entityIds: ['gpt4'] },
            { text: 'OpenAI is a company', entityIds: ['openai'] },
          ],
        },
        {}
      );

      expect(consistencyChecker.checkAll).toHaveBeenCalled();
      expect((result.content[0] as { text: string }).text).toContain('Consistency Check Results');
    });
  });

  describe('createAdvancedTools', () => {
    it('should return all 4 advanced tools', () => {
      const tools = createAdvancedTools(deps);

      expect(tools).toHaveLength(4);
      expect(tools.map((t) => t.name)).toContain('naturalLanguageQuery');
      expect(tools.map((t) => t.name)).toContain('chainOfThought');
      expect(tools.map((t) => t.name)).toContain('validateResponse');
      expect(tools.map((t) => t.name)).toContain('checkConsistency');
    });
  });
});
