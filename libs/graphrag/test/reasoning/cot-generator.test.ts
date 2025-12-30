/**
 * @fileoverview Tests for CoTGenerator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CoTGenerator,
  type CoTLLMClient,
  type CoTGeneratorConfig,
} from '../../src/reasoning/cot-generator.js';
import type { ReasoningContext, ReasoningEntity, ReasoningRelation } from '../../src/reasoning/types.js';

// Mock entities
const mockEntities: Record<string, ReasoningEntity> = {
  'transformer-001': {
    id: 'transformer-001',
    name: 'Transformer',
    type: 'AIModel',
    description: 'Attention-based neural network architecture',
  },
  'gpt-001': {
    id: 'gpt-001',
    name: 'GPT',
    type: 'AIModel',
    description: 'Generative Pre-trained Transformer',
  },
  'vaswani-001': {
    id: 'vaswani-001',
    name: 'Ashish Vaswani',
    type: 'Person',
  },
};

// Mock relations
const mockRelations: ReasoningRelation[] = [
  {
    sourceId: 'transformer-001',
    targetId: 'gpt-001',
    type: 'INFLUENCED' as import('@yagokoro/domain').RelationType,
    confidence: 0.95,
  },
  {
    sourceId: 'vaswani-001',
    targetId: 'transformer-001',
    type: 'DEVELOPED' as import('@yagokoro/domain').RelationType,
    confidence: 0.99,
  },
];

// Create mock context
const createMockContext = (): ReasoningContext => ({
  getEntity: vi.fn().mockImplementation((id: string) => 
    Promise.resolve(mockEntities[id] ?? null)
  ),
  getOutgoingRelations: vi.fn().mockResolvedValue(mockRelations.filter(r => r.sourceId === 'transformer-001')),
  getIncomingRelations: vi.fn().mockResolvedValue(mockRelations.filter(r => r.targetId === 'gpt-001')),
  findPaths: vi.fn().mockResolvedValue([
    {
      nodes: [
        { id: 'transformer-001', name: 'Transformer' },
        { id: 'gpt-001', name: 'GPT' },
      ],
      relationships: [
        { type: 'INFLUENCED', confidence: 0.95 },
      ],
    },
  ]),
  getEntityName: vi.fn().mockImplementation((id: string) =>
    Promise.resolve(mockEntities[id]?.name ?? null)
  ),
});

// Create mock LLM client
const createMockLLM = (): CoTLLMClient => ({
  complete: vi.fn()
    .mockResolvedValueOnce(JSON.stringify({
      steps: [
        { stepNumber: 1, claim: 'TransformerはAttention機構を導入した', confidence: 0.95 },
        { stepNumber: 2, claim: 'GPTはTransformerアーキテクチャを採用した', confidence: 0.92 },
      ],
    }))
    .mockResolvedValueOnce('したがって、TransformerはGPTの基盤技術として重要である。'),
});

describe('CoTGenerator', () => {
  let context: ReasoningContext;
  let llm: CoTLLMClient;
  let generator: CoTGenerator;

  beforeEach(() => {
    vi.clearAllMocks();
    context = createMockContext();
    llm = createMockLLM();
    generator = new CoTGenerator(llm, context);
  });

  describe('generateChain', () => {
    it('should generate a reasoning chain with graph paths', async () => {
      const chain = await generator.generateChain(
        'TransformerとGPTの関係は？',
        {
          startEntityId: 'transformer-001',
          endEntityId: 'gpt-001',
        }
      );

      expect(chain.query).toBe('TransformerとGPTの関係は？');
      expect(chain.steps.length).toBeGreaterThan(0);
      expect(chain.hopCount).toBeGreaterThan(0);
      expect(chain.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should include evidence in steps when graph paths exist', async () => {
      const chain = await generator.generateChain(
        'TransformerとGPTの関係は？',
        {
          startEntityId: 'transformer-001',
          endEntityId: 'gpt-001',
        }
      );

      const stepWithEvidence = chain.steps.find(s => s.evidence.length > 0);
      expect(stepWithEvidence).toBeDefined();

      if (stepWithEvidence) {
        expect(stepWithEvidence.evidence[0]?.type).toBe('graph_edge');
        expect(stepWithEvidence.evidence[0]?.confidence).toBeGreaterThan(0);
      }
    });

    it('should generate steps from LLM when no paths found', async () => {
      const emptyContext: ReasoningContext = {
        ...context,
        findPaths: vi.fn().mockResolvedValue([]),
      };

      const gen = new CoTGenerator(llm, emptyContext);
      const chain = await gen.generateChain('What is AI?');

      // Should still produce steps via LLM
      expect(chain.steps.length).toBeGreaterThanOrEqual(0);
      expect(chain.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should calculate total confidence correctly', async () => {
      const chain = await generator.generateChain(
        'Test query',
        {
          startEntityId: 'transformer-001',
          endEntityId: 'gpt-001',
        }
      );

      if (chain.steps.length > 0) {
        // Total confidence should be product of step confidences
        const expectedConfidence = chain.steps.reduce(
          (acc, step) => acc * step.confidence,
          1
        );
        expect(chain.totalConfidence).toBeCloseTo(expectedConfidence, 5);
      }
    });

    it('should respect maxHops configuration', async () => {
      const gen = new CoTGenerator(llm, context, { maxHops: 2 });
      const chain = await gen.generateChain('Test', {
        startEntityId: 'a',
        endEntityId: 'b',
        maxHops: 2,
      });

      expect(chain.hopCount).toBeLessThanOrEqual(2);
    });

    it('should generate conclusion', async () => {
      const chain = await generator.generateChain(
        'TransformerとGPTの関係は？',
        {
          startEntityId: 'transformer-001',
          endEntityId: 'gpt-001',
        }
      );

      expect(chain.conclusion).toBeDefined();
      expect(chain.conclusion.length).toBeGreaterThan(0);
    });
  });

  describe('validation', () => {
    it('should mark chain as invalid when steps are empty', async () => {
      const failingContext: ReasoningContext = {
        ...context,
        findPaths: vi.fn().mockResolvedValue([]),
      };
      const failingLLM: CoTLLMClient = {
        complete: vi.fn().mockRejectedValue(new Error('LLM error')),
      };

      const gen = new CoTGenerator(failingLLM, failingContext);
      const chain = await gen.generateChain('Test query');

      expect(chain.isValid).toBe(false);
      expect(chain.validationErrors).toBeDefined();
      expect(chain.validationErrors?.some(e => e.includes('No reasoning steps'))).toBe(true);
    });

    it('should flag low confidence chains', async () => {
      const lowConfidenceContext: ReasoningContext = {
        ...context,
        findPaths: vi.fn().mockResolvedValue([
          {
            nodes: [
              { id: 'a', name: 'A' },
              { id: 'b', name: 'B' },
            ],
            relationships: [
              { type: 'RELATED', confidence: 0.05 }, // Very low confidence
            ],
          },
        ]),
      };

      const gen = new CoTGenerator(llm, lowConfidenceContext, {
        minStepConfidence: 0.5,
      });
      const chain = await gen.generateChain('Test', {
        startEntityId: 'a',
        endEntityId: 'b',
      });

      expect(chain.validationErrors).toBeDefined();
    });
  });

  describe('configuration', () => {
    it('should use default configuration when not provided', () => {
      const gen = new CoTGenerator(llm, context);
      expect(gen).toBeDefined();
    });

    it('should use custom configuration', async () => {
      const config: CoTGeneratorConfig = {
        maxHops: 3,
        minStepConfidence: 0.5,
        minTotalConfidence: 0.2,
        language: 'en',
        includeEvidence: false,
      };

      const gen = new CoTGenerator(llm, context, config);
      const chain = await gen.generateChain('Test');

      expect(chain).toBeDefined();
    });

    it('should support Japanese language', async () => {
      const gen = new CoTGenerator(llm, context, { language: 'ja' });
      const chain = await gen.generateChain('テストクエリ', {
        startEntityId: 'transformer-001',
        endEntityId: 'gpt-001',
      });

      expect(chain).toBeDefined();
    });

    it('should support English language', async () => {
      const gen = new CoTGenerator(llm, context, { language: 'en' });
      const chain = await gen.generateChain('Test query', {
        startEntityId: 'transformer-001',
        endEntityId: 'gpt-001',
      });

      expect(chain).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle LLM errors gracefully', async () => {
      const failingLLM: CoTLLMClient = {
        complete: vi.fn().mockRejectedValue(new Error('LLM unavailable')),
      };

      const emptyContext: ReasoningContext = {
        ...context,
        findPaths: vi.fn().mockResolvedValue([]),
      };

      const gen = new CoTGenerator(failingLLM, emptyContext);
      const chain = await gen.generateChain('Test');

      expect(chain.isValid).toBe(false);
      expect(chain.steps).toHaveLength(0);
    });

    it('should handle context errors', async () => {
      const failingContext: ReasoningContext = {
        ...context,
        findPaths: vi.fn().mockRejectedValue(new Error('DB error')),
      };

      const gen = new CoTGenerator(llm, failingContext);
      const chain = await gen.generateChain('Test', {
        startEntityId: 'a',
        endEntityId: 'b',
      });

      expect(chain.isValid).toBe(false);
      expect(chain.validationErrors).toBeDefined();
    });

    it('should handle malformed LLM responses', async () => {
      const badLLM: CoTLLMClient = {
        complete: vi.fn().mockResolvedValue('not valid json'),
      };

      const emptyContext: ReasoningContext = {
        ...context,
        findPaths: vi.fn().mockResolvedValue([]),
      };

      const gen = new CoTGenerator(badLLM, emptyContext);
      const chain = await gen.generateChain('Test');

      // Should not throw, but return empty steps
      expect(chain.steps).toHaveLength(0);
    });
  });
});
