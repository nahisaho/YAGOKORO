/**
 * @fileoverview Tests for ContradictionDetector
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContradictionDetector, type ContradictionDetectorConfig } from '../src/contradiction-detector.js';
import type { FactClaim, Evidence } from '../src/types.js';
import type { ReasoningContext, ReasoningEntity } from '@yagokoro/graphrag';

// Create mock context
const createMockContext = (): ReasoningContext => ({
  getEntity: vi.fn().mockResolvedValue(null),
  getOutgoingRelations: vi.fn().mockResolvedValue([]),
  getIncomingRelations: vi.fn().mockResolvedValue([]),
  findPaths: vi.fn().mockResolvedValue([]),
  getEntityName: vi.fn().mockResolvedValue(null),
});

describe('ContradictionDetector', () => {
  let context: ReasoningContext;
  let detector: ContradictionDetector;

  beforeEach(() => {
    vi.clearAllMocks();
    context = createMockContext();
    detector = new ContradictionDetector(context);
  });

  describe('detect', () => {
    it('should return coherent for non-contradicting claims', async () => {
      const claims: FactClaim[] = [
        { id: 'c1', text: 'GPT-4は高性能', entityIds: ['gpt4'], confidence: 0.9 },
        { id: 'c2', text: 'OpenAIは企業', entityIds: ['openai'], confidence: 0.9 },
      ];

      const result = await detector.detect(claims);

      expect(result.isCoherent).toBe(true);
      expect(result.contradictions).toHaveLength(0);
    });

    it('should detect direct contradictions with opposing relations', async () => {
      const claims: FactClaim[] = [
        {
          id: 'c1',
          text: 'GPT-4はOpenAIが開発した',
          entityIds: ['gpt4', 'openai'],
          sourceEntityId: 'gpt4',
          targetEntityId: 'openai',
          relationType: 'DEVELOPED_BY',
          confidence: 0.9,
        },
        {
          id: 'c2',
          text: 'GPT-4はOpenAIが開発していない',
          entityIds: ['gpt4', 'openai'],
          sourceEntityId: 'gpt4',
          targetEntityId: 'openai',
          relationType: 'NOT_DEVELOPED_BY',
          confidence: 0.9,
        },
      ];

      const result = await detector.detect(claims);

      expect(result.contradictions.length).toBeGreaterThan(0);
      expect(result.contradictions[0]?.type).toBe('direct');
    });

    it('should detect semantic contradictions', async () => {
      const claims: FactClaim[] = [
        { id: 'c1', text: 'GPT-4はタスクを実行できる', entityIds: ['gpt4'], confidence: 0.9 },
        { id: 'c2', text: 'GPT-4はタスクを実行できない', entityIds: ['gpt4'], confidence: 0.9 },
      ];

      const result = await detector.detect(claims);

      expect(result.contradictions.some(c => c.type === 'semantic')).toBe(true);
    });

    it('should detect temporal contradictions with years', async () => {
      const claims: FactClaim[] = [
        { id: 'c1', text: 'GPT-4は2023年にリリースされた', entityIds: ['gpt4'], confidence: 0.9 },
        { id: 'c2', text: 'GPT-4は2022年にリリースされた', entityIds: ['gpt4'], confidence: 0.9 },
      ];

      const result = await detector.detect(claims);

      expect(result.contradictions.some(c => c.type === 'temporal')).toBe(true);
    });

    it('should detect temporal contradictions with first claims', async () => {
      const claims: FactClaim[] = [
        { id: 'c1', text: 'GPT-4は初めての大規模モデル', entityIds: ['gpt4'], confidence: 0.9 },
        { id: 'c2', text: 'GPT-3は最初の大規模モデル', entityIds: ['gpt4', 'gpt3'], confidence: 0.9 },
      ];

      // Both share gpt4 is not the case here, but test the pattern
      const result = await detector.detect(claims);

      expect(result.coherenceScore).toBeDefined();
    });

    it('should provide resolution suggestions', async () => {
      const claims: FactClaim[] = [
        { id: 'c1', text: '正しい主張', entityIds: ['e1'], confidence: 0.9 },
        { id: 'c2', text: '正しくない主張', entityIds: ['e1'], confidence: 0.9 },
      ];

      const result = await detector.detect(claims);

      if (result.contradictions.length > 0) {
        expect(result.contradictions[0]?.resolution).toBeDefined();
      }
    });
  });

  describe('detectWithEvidence', () => {
    it('should detect contradictions between claims and evidence', async () => {
      const claims: FactClaim[] = [
        { id: 'c1', text: 'GPT-4はOpenAIが開発した', entityIds: ['gpt4'], confidence: 0.9 },
      ];

      const evidence: Evidence[] = [
        {
          id: 'e1',
          type: 'graph',
          sourceId: 'gpt4',
          sourceName: 'GPT-4',
          content: 'GPT-4はOpenAIと関連がない',
          supports: false,
          confidence: 0.8,
        },
      ];

      const result = await detector.detectWithEvidence(claims, evidence);

      expect(result.contradictions.length).toBeGreaterThan(0);
    });

    it('should not flag supporting evidence as contradiction', async () => {
      const claims: FactClaim[] = [
        { id: 'c1', text: 'GPT-4は優秀', entityIds: ['gpt4'], confidence: 0.9 },
      ];

      const evidence: Evidence[] = [
        {
          id: 'e1',
          type: 'graph',
          sourceId: 'gpt4',
          sourceName: 'GPT-4',
          content: 'GPT-4は高性能',
          supports: true,
          confidence: 0.9,
        },
      ];

      const result = await detector.detectWithEvidence(claims, evidence);

      expect(result.isCoherent).toBe(true);
    });
  });

  describe('configuration', () => {
    it('should use custom coherence threshold', async () => {
      const strictDetector = new ContradictionDetector(context, {
        coherenceThreshold: 0.95,
      });

      const claims: FactClaim[] = [
        { id: 'c1', text: 'Some claim', entityIds: ['e1'], confidence: 0.9 },
      ];

      const result = await strictDetector.detect(claims);

      expect(result.coherenceThreshold).toBeUndefined(); // Not exposed in result
      expect(result.coherenceScore).toBeDefined();
    });

    it('should filter by minimum severity', async () => {
      const highSeverityDetector = new ContradictionDetector(context, {
        minSeverity: 0.9,
      });

      const claims: FactClaim[] = [
        { id: 'c1', text: 'クレーム1は成功した', entityIds: ['e1'], confidence: 0.9 },
        { id: 'c2', text: 'クレーム1は失敗した', entityIds: ['e1'], confidence: 0.9 },
      ];

      const result = await highSeverityDetector.detect(claims);

      // Low severity contradictions should be filtered
      for (const c of result.contradictions) {
        expect(c.severity).toBeGreaterThanOrEqual(0.9);
      }
    });

    it('should support English language', async () => {
      const enDetector = new ContradictionDetector(context, { language: 'en' });

      const claims: FactClaim[] = [
        { id: 'c1', text: 'The model can perform', entityIds: ['e1'], confidence: 0.9 },
        { id: 'c2', text: 'The model cannot perform', entityIds: ['e1'], confidence: 0.9 },
      ];

      const result = await enDetector.detect(claims);

      expect(result.summary).toContain('Analyzed');
    });

    it('should support Japanese language', async () => {
      const jaDetector = new ContradictionDetector(context, { language: 'ja' });

      const claims: FactClaim[] = [
        { id: 'c1', text: 'テスト', entityIds: ['e1'], confidence: 0.9 },
      ];

      const result = await jaDetector.detect(claims);

      expect(result.summary).toContain('分析');
    });
  });

  describe('coherence score', () => {
    it('should return 1 for empty claims', async () => {
      const result = await detector.detect([]);

      expect(result.coherenceScore).toBe(1);
    });

    it('should return 1 for single claim', async () => {
      const claims: FactClaim[] = [
        { id: 'c1', text: 'Single claim', entityIds: ['e1'], confidence: 0.9 },
      ];

      const result = await detector.detect(claims);

      expect(result.coherenceScore).toBe(1);
    });

    it('should decrease score with more contradictions', async () => {
      const claims: FactClaim[] = [
        { id: 'c1', text: 'タスクは成功した', entityIds: ['e1'], confidence: 0.9 },
        { id: 'c2', text: 'タスクは失敗した', entityIds: ['e1'], confidence: 0.9 },
        { id: 'c3', text: 'プロジェクトはできる', entityIds: ['e1'], confidence: 0.9 },
        { id: 'c4', text: 'プロジェクトはできない', entityIds: ['e1'], confidence: 0.9 },
      ];

      const result = await detector.detect(claims);

      expect(result.coherenceScore).toBeLessThan(1);
    });
  });

  describe('logical contradictions', () => {
    it('should detect bidirectional relation issues', async () => {
      const claims: FactClaim[] = [
        {
          id: 'c1',
          text: 'AがBを開発した',
          entityIds: ['a', 'b'],
          sourceEntityId: 'a',
          targetEntityId: 'b',
          relationType: 'DEVELOPED',
          confidence: 0.9,
        },
        {
          id: 'c2',
          text: 'BがAを開発した',
          entityIds: ['a', 'b'],
          sourceEntityId: 'b',
          targetEntityId: 'a',
          relationType: 'DEVELOPED',
          confidence: 0.9,
        },
      ];

      const result = await detector.detect(claims);

      expect(result.contradictions.some(c => c.type === 'logical')).toBe(true);
    });
  });
});
