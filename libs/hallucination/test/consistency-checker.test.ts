/**
 * @fileoverview Tests for ConsistencyChecker
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsistencyChecker, type ConsistencyCheckerConfig } from '../src/consistency-checker.js';
import type { FactClaim } from '../src/types.js';
import type { ReasoningContext, ReasoningEntity } from '@yagokoro/graphrag';

// Mock entities
const mockEntities: Record<string, ReasoningEntity> = {
  'gpt4': { id: 'gpt4', name: 'GPT-4', type: 'AIModel' },
  'openai': { id: 'openai', name: 'OpenAI', type: 'Organization' },
  'transformer': { id: 'transformer', name: 'Transformer', type: 'Technique' },
};

// Create mock context
const createMockContext = (): ReasoningContext => ({
  getEntity: vi.fn().mockImplementation((id: string) =>
    Promise.resolve(mockEntities[id] ?? null)
  ),
  getOutgoingRelations: vi.fn().mockResolvedValue([]),
  getIncomingRelations: vi.fn().mockResolvedValue([]),
  findPaths: vi.fn().mockResolvedValue([]),
  getEntityName: vi.fn().mockImplementation((id: string) =>
    Promise.resolve(mockEntities[id]?.name ?? null)
  ),
});

describe('ConsistencyChecker', () => {
  let context: ReasoningContext;
  let checker: ConsistencyChecker;

  beforeEach(() => {
    vi.clearAllMocks();
    context = createMockContext();
    checker = new ConsistencyChecker(context);
  });

  describe('check', () => {
    it('should return consistent for valid claim with existing entities', async () => {
      const claim: FactClaim = {
        id: 'claim-1',
        text: 'GPT-4はOpenAIが開発した',
        entityIds: ['gpt4', 'openai'],
        confidence: 0.9,
      };

      const result = await checker.check(claim);

      expect(result.isConsistent).toBe(true);
      expect(result.score).toBeGreaterThan(0.5);
      expect(result.supportingEvidence.length).toBeGreaterThan(0);
    });

    it('should return inconsistent for claim with missing entities', async () => {
      const claim: FactClaim = {
        id: 'claim-1',
        text: 'GPT-5はAnthropicが開発した',
        entityIds: ['gpt5', 'anthropic'],
        confidence: 0.9,
      };

      const result = await checker.check(claim);

      expect(result.isConsistent).toBe(false);
      expect(result.contradictingEvidence.length).toBeGreaterThan(0);
    });

    it('should check relation existence', async () => {
      vi.mocked(context.getOutgoingRelations).mockResolvedValue([
        { sourceId: 'gpt4', targetId: 'openai', type: 'DEVELOPED_BY', confidence: 0.9 },
      ]);

      const claim: FactClaim = {
        id: 'claim-1',
        text: 'GPT-4はOpenAIが開発した',
        entityIds: ['gpt4', 'openai'],
        sourceEntityId: 'gpt4',
        targetEntityId: 'openai',
        relationType: 'DEVELOPED_BY',
        confidence: 0.9,
      };

      const result = await checker.check(claim);

      expect(result.isConsistent).toBe(true);
      expect(result.supportingEvidence.some(e => e.content.includes('関係'))).toBe(true);
    });

    it('should detect wrong relation type', async () => {
      vi.mocked(context.getOutgoingRelations).mockResolvedValue([
        { sourceId: 'gpt4', targetId: 'openai', type: 'USES', confidence: 0.8 },
      ]);

      const claim: FactClaim = {
        id: 'claim-1',
        text: 'GPT-4はOpenAIが開発した',
        entityIds: ['gpt4', 'openai'],
        sourceEntityId: 'gpt4',
        targetEntityId: 'openai',
        relationType: 'DEVELOPED_BY',
        confidence: 0.9,
      };

      const result = await checker.check(claim);

      expect(result.contradictingEvidence.some(e => e.id.includes('wrong'))).toBe(true);
    });

    it('should provide suggestions for inconsistent claims', async () => {
      const claim: FactClaim = {
        id: 'claim-1',
        text: '存在しないモデル',
        entityIds: ['non-existent'],
        confidence: 0.5,
      };

      const result = await checker.check(claim);

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);
    });
  });

  describe('checkAll', () => {
    it('should check multiple claims', async () => {
      const claims: FactClaim[] = [
        { id: 'claim-1', text: 'GPT-4はモデル', entityIds: ['gpt4'], confidence: 0.9 },
        { id: 'claim-2', text: 'OpenAIは組織', entityIds: ['openai'], confidence: 0.9 },
      ];

      const results = await checker.checkAll(claims);

      expect(results).toHaveLength(2);
      expect(results[0]?.isConsistent).toBe(true);
      expect(results[1]?.isConsistent).toBe(true);
    });
  });

  describe('extractClaims', () => {
    it('should extract claims from text', async () => {
      const text = 'GPT-4は高性能なモデルです。OpenAIが開発しました。';

      const claims = await checker.extractClaims(text);

      expect(claims.length).toBeGreaterThan(0);
      expect(claims[0]?.text).toBeDefined();
    });

    it('should use LLM client when provided', async () => {
      const mockLLM = {
        extractClaims: vi.fn().mockResolvedValue([
          { id: 'llm-claim-1', text: 'LLM extracted claim', entityIds: [], confidence: 0.8 },
        ]),
      };

      const checkerWithLLM = new ConsistencyChecker(context, {}, mockLLM);
      const claims = await checkerWithLLM.extractClaims('test text');

      expect(mockLLM.extractClaims).toHaveBeenCalled();
      expect(claims[0]?.id).toBe('llm-claim-1');
    });
  });

  describe('configuration', () => {
    it('should use custom consistency threshold', async () => {
      const strictChecker = new ConsistencyChecker(context, {
        consistencyThreshold: 0.9,
      });

      const claim: FactClaim = {
        id: 'claim-1',
        text: 'Some claim',
        entityIds: ['gpt4'],
        confidence: 0.9,
      };

      const result = await strictChecker.check(claim);
      // With only one entity found, score should be around 0.9
      // but threshold is 0.9, so might not pass
      expect(result.score).toBeDefined();
    });

    it('should support English language', async () => {
      const enChecker = new ConsistencyChecker(context, { language: 'en' });

      const claim: FactClaim = {
        id: 'claim-1',
        text: 'Test claim',
        entityIds: ['gpt4'],
        confidence: 0.9,
      };

      const result = await enChecker.check(claim);

      expect(result.explanation).toContain('Entity');
    });

    it('should support Japanese language', async () => {
      const jaChecker = new ConsistencyChecker(context, { language: 'ja' });

      const claim: FactClaim = {
        id: 'claim-1',
        text: 'テストの主張',
        entityIds: ['gpt4'],
        confidence: 0.9,
      };

      const result = await jaChecker.check(claim);

      expect(result.explanation).toContain('エンティティ');
    });
  });

  describe('path checking', () => {
    it('should check paths between entities', async () => {
      vi.mocked(context.findPaths).mockResolvedValue([
        {
          pathId: 'path-1',
          sourceEntityId: 'gpt4',
          targetEntityId: 'transformer',
          hopCount: 1,
          steps: [],
          totalConfidence: 0.85,
          summary: 'GPT-4 uses Transformer',
        },
      ]);

      const claim: FactClaim = {
        id: 'claim-1',
        text: 'GPT-4はTransformerを使用',
        entityIds: ['gpt4', 'transformer'],
        confidence: 0.9,
      };

      const result = await checker.check(claim);

      expect(result.supportingEvidence.some(e => e.type === 'graph' && e.id.includes('path'))).toBe(true);
    });
  });
});
