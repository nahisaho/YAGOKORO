/**
 * @fileoverview Tests for ConfidenceScorer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ConfidenceScorer,
  type ConfidenceScorerConfig,
  type ConfidenceScorerInput,
} from '../../src/reasoning/confidence-scorer.js';
import type { ReasoningContext, ReasoningEntity } from '../../src/reasoning/types.js';

// Mock entities
const mockEntities: Record<string, ReasoningEntity> = {
  'entity-001': { id: 'entity-001', name: 'GPT-4', type: 'AIModel' },
  'entity-002': { id: 'entity-002', name: 'OpenAI', type: 'Organization' },
  'entity-003': { id: 'entity-003', name: 'Transformer', type: 'Technique' },
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

describe('ConfidenceScorer', () => {
  let context: ReasoningContext;
  let scorer: ConfidenceScorer;

  beforeEach(() => {
    vi.clearAllMocks();
    context = createMockContext();
    scorer = new ConfidenceScorer(context);
  });

  describe('score', () => {
    it('should calculate overall confidence score', async () => {
      const input: ConfidenceScorerInput = {
        query: 'GPT-4の開発者は？',
        answer: 'OpenAIが開発しました',
        entityIds: ['entity-001', 'entity-002'],
        paths: [
          {
            pathId: 'path-1',
            sourceEntityId: 'entity-001',
            targetEntityId: 'entity-002',
            hopCount: 1,
            steps: [],
            totalConfidence: 0.9,
            summary: 'GPT-4 -> OpenAI',
          },
        ],
      };

      const result = await scorer.score(input);

      expect(result.overall).toBeGreaterThan(0);
      expect(result.overall).toBeLessThanOrEqual(1);
      expect(result.metrics).toHaveLength(5);
    });

    it('should include all 5 confidence metrics', async () => {
      const input: ConfidenceScorerInput = {
        query: 'Test query',
        answer: 'Test answer',
      };

      const result = await scorer.score(input);

      const metricNames = result.metrics.map((m) => m.name);
      expect(metricNames).toContain('graphCoverage');
      expect(metricNames).toContain('pathConfidence');
      expect(metricNames).toContain('recency');
      expect(metricNames).toContain('sourceQuality');
      expect(metricNames).toContain('consensus');
    });

    it('should flag low confidence results', async () => {
      const input: ConfidenceScorerInput = {
        query: 'Unknown topic',
        answer: 'Some answer',
        entityIds: ['non-existent-1', 'non-existent-2'],
        paths: [],
      };

      const result = await scorer.score(input);

      expect(result.isLow).toBe(true);
      expect(result.warning).toBeDefined();
    });

    it('should provide suggestions for low confidence', async () => {
      const input: ConfidenceScorerInput = {
        query: 'Unknown topic',
        answer: 'Some answer',
        entityIds: ['non-existent'],
        paths: [],
      };

      const result = await scorer.score(input);

      if (result.isLow) {
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions!.length).toBeGreaterThan(0);
      }
    });
  });

  describe('graphCoverage', () => {
    it('should score high when all entities exist', async () => {
      const input: ConfidenceScorerInput = {
        query: 'Test',
        answer: 'Answer',
        entityIds: ['entity-001', 'entity-002', 'entity-003'],
      };

      const result = await scorer.score(input);
      const graphMetric = result.metrics.find((m) => m.name === 'graphCoverage');

      expect(graphMetric?.score).toBe(1);
    });

    it('should score low when entities dont exist', async () => {
      const input: ConfidenceScorerInput = {
        query: 'Test',
        answer: 'Answer',
        entityIds: ['non-existent-1', 'non-existent-2'],
      };

      const result = await scorer.score(input);
      const graphMetric = result.metrics.find((m) => m.name === 'graphCoverage');

      expect(graphMetric?.score).toBe(0);
    });

    it('should return neutral when no entities provided', async () => {
      const input: ConfidenceScorerInput = {
        query: 'Test',
        answer: 'Answer',
      };

      const result = await scorer.score(input);
      const graphMetric = result.metrics.find((m) => m.name === 'graphCoverage');

      expect(graphMetric?.score).toBe(0.3);
    });
  });

  describe('pathConfidence', () => {
    it('should calculate average path confidence', async () => {
      const input: ConfidenceScorerInput = {
        query: 'Test',
        answer: 'Answer',
        paths: [
          { pathId: 'p1', sourceEntityId: 'a', targetEntityId: 'b', hopCount: 1, steps: [], totalConfidence: 0.8, summary: '' },
          { pathId: 'p2', sourceEntityId: 'b', targetEntityId: 'c', hopCount: 1, steps: [], totalConfidence: 0.6, summary: '' },
        ],
      };

      const result = await scorer.score(input);
      const pathMetric = result.metrics.find((m) => m.name === 'pathConfidence');

      expect(pathMetric?.score).toBeCloseTo(0.7, 5);
    });

    it('should return neutral when no paths', async () => {
      const input: ConfidenceScorerInput = {
        query: 'Test',
        answer: 'Answer',
      };

      const result = await scorer.score(input);
      const pathMetric = result.metrics.find((m) => m.name === 'pathConfidence');

      expect(pathMetric?.score).toBe(0.5);
    });
  });

  describe('recency', () => {
    it('should score high for recent sources', async () => {
      const input: ConfidenceScorerInput = {
        query: 'Test',
        answer: 'Answer',
        sourceTimestamps: [
          new Date(), // Now
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        ],
      };

      const result = await scorer.score(input);
      const recencyMetric = result.metrics.find((m) => m.name === 'recency');

      expect(recencyMetric?.score).toBeGreaterThan(0.8);
    });

    it('should score low for old sources', async () => {
      const input: ConfidenceScorerInput = {
        query: 'Test',
        answer: 'Answer',
        sourceTimestamps: [
          new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000), // 3 years ago
        ],
      };

      const result = await scorer.score(input);
      const recencyMetric = result.metrics.find((m) => m.name === 'recency');

      expect(recencyMetric?.score).toBeLessThan(0.5);
    });
  });

  describe('sourceQuality', () => {
    it('should calculate average quality rating', async () => {
      const input: ConfidenceScorerInput = {
        query: 'Test',
        answer: 'Answer',
        sourceQualityRatings: [0.9, 0.8, 0.7],
      };

      const result = await scorer.score(input);
      const qualityMetric = result.metrics.find((m) => m.name === 'sourceQuality');

      expect(qualityMetric?.score).toBeCloseTo(0.8, 5);
    });
  });

  describe('consensus', () => {
    it('should score high when many sources agree', async () => {
      const input: ConfidenceScorerInput = {
        query: 'Test',
        answer: 'Answer',
        consensusCount: 5,
        totalSources: 5,
      };

      const result = await scorer.score(input);
      const consensusMetric = result.metrics.find((m) => m.name === 'consensus');

      expect(consensusMetric?.score).toBeGreaterThan(0.9);
    });

    it('should score low when few sources agree', async () => {
      const input: ConfidenceScorerInput = {
        query: 'Test',
        answer: 'Answer',
        consensusCount: 1,
        totalSources: 5,
      };

      const result = await scorer.score(input);
      const consensusMetric = result.metrics.find((m) => m.name === 'consensus');

      expect(consensusMetric?.score).toBeLessThan(0.5);
    });
  });

  describe('configuration', () => {
    it('should use custom weights', async () => {
      const config: ConfidenceScorerConfig = {
        weights: {
          graphCoverage: 0.5,
          pathConfidence: 0.5,
          recency: 0,
          sourceQuality: 0,
          consensus: 0,
        },
      };

      const customScorer = new ConfidenceScorer(context, config);
      const input: ConfidenceScorerInput = {
        query: 'Test',
        answer: 'Answer',
        entityIds: ['entity-001'],
        paths: [{ pathId: 'p1', sourceEntityId: 'a', targetEntityId: 'b', hopCount: 1, steps: [], totalConfidence: 0.8, summary: '' }],
      };

      const result = await customScorer.score(input);

      // Should only consider graphCoverage (1.0) and pathConfidence (0.8)
      expect(result.overall).toBeCloseTo(0.9, 1);
    });

    it('should use custom low confidence threshold', async () => {
      const config: ConfidenceScorerConfig = {
        lowConfidenceThreshold: 0.9,
      };

      const strictScorer = new ConfidenceScorer(context, config);
      const input: ConfidenceScorerInput = {
        query: 'Test',
        answer: 'Answer',
        entityIds: ['entity-001'],
      };

      const result = await strictScorer.score(input);

      // Most scores will be below 0.9, so should flag as low
      expect(result.isLow).toBe(true);
    });

    it('should support Japanese language', async () => {
      const jaScorer = new ConfidenceScorer(context, { language: 'ja' });
      const input: ConfidenceScorerInput = {
        query: 'テスト',
        answer: '回答',
        entityIds: ['non-existent'],
      };

      const result = await jaScorer.score(input);

      expect(result.warning).toContain('信頼度');
    });

    it('should support English language', async () => {
      const enScorer = new ConfidenceScorer(context, { language: 'en' });
      const input: ConfidenceScorerInput = {
        query: 'Test',
        answer: 'Answer',
        entityIds: ['non-existent'],
      };

      const result = await enScorer.score(input);

      expect(result.warning).toContain('Confidence');
    });
  });

  describe('metric explanations', () => {
    it('should provide explanations for each metric', async () => {
      const input: ConfidenceScorerInput = {
        query: 'Test',
        answer: 'Answer',
        entityIds: ['entity-001'],
      };

      const result = await scorer.score(input);

      for (const metric of result.metrics) {
        expect(metric.explanation).toBeDefined();
        expect(metric.explanation.length).toBeGreaterThan(0);
      }
    });
  });
});
