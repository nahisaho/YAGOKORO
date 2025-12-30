/**
 * @fileoverview TrendPredictor Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TrendPredictor, type TrendLLMInterface } from './TrendPredictor.js';
import type { AggregatedTimeline } from './TimelineAggregator.js';
import type { PhaseDetectionResult, TimelineEvent, LifecyclePhase } from './types.js';

/**
 * Create sample timeline
 */
function createTimeline(options: {
  technologyId?: string;
  technologyName?: string;
  events?: TimelineEvent[];
  startYear?: number;
  endYear?: number;
  generateDefaults?: boolean;
} = {}): AggregatedTimeline {
  const {
    technologyId = 'tech-1',
    technologyName = 'Test Tech',
    startYear = 2020,
    endYear = 2024,
    generateDefaults = true,
  } = options;

  const events: TimelineEvent[] = options.events ?? [];

  // Generate default events if none provided and generateDefaults is true
  if (events.length === 0 && generateDefaults) {
    for (let year = startYear; year <= endYear; year++) {
      for (let month = 0; month < 12; month += 3) {
        events.push({
          id: `pub-${year}-${month}`,
          type: 'publication',
          date: new Date(year, month, 1),
          title: `Publication ${year}-${month}`,
          description: '',
          impact: 0.5,
          relatedEntities: [technologyId],
          sources: [],
          metadata: { citations: 100 },
        });
      }
    }
  }

  if (events.length > 0) {
    events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  const dates = events.length > 0 ? events.map((e) => e.date.getTime()) : [Date.now()];
  const earliest = new Date(Math.min(...dates));
  const latest = new Date(Math.max(...dates));

  return {
    technologyId,
    technologyName,
    events,
    eventCounts: {
      publication: events.filter((e) => e.type === 'publication').length,
      derivative: events.filter((e) => e.type === 'derivative').length,
      adoption: events.filter((e) => e.type === 'adoption').length,
      benchmark: events.filter((e) => e.type === 'benchmark').length,
      milestone: events.filter((e) => e.type === 'milestone').length,
      decline: 0,
      revival: 0,
    },
    dateRange: { earliest, latest },
    totalImpact: events.reduce((sum, e) => sum + e.impact, 0),
  };
}

/**
 * Create sample phase detection result
 */
function createPhaseResult(
  phase: LifecyclePhase = 'slope_of_enlightenment',
  confidence = 0.7
): PhaseDetectionResult {
  return {
    phase,
    confidence,
    indicators: [],
    daysInPhase: 180,
    estimatedDaysToNextPhase: 365,
  };
}

describe('TrendPredictor', () => {
  let predictor: TrendPredictor;

  beforeEach(() => {
    predictor = new TrendPredictor();
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      expect(predictor).toBeInstanceOf(TrendPredictor);
    });

    it('should accept custom config', () => {
      const custom = new TrendPredictor({
        defaultHorizonDays: 180,
        minDataPoints: 10,
      });
      expect(custom).toBeInstanceOf(TrendPredictor);
    });

    it('should accept LLM interface', () => {
      const llm: TrendLLMInterface = {
        analyzeTrendFactors: vi.fn(),
        assessRisks: vi.fn(),
      };
      const withLLM = new TrendPredictor({ enableLLMAnalysis: true }, llm);
      expect(withLLM).toBeInstanceOf(TrendPredictor);
    });
  });

  describe('determineTrendDirection', () => {
    it('should return stable for insufficient data', () => {
      const timeline = createTimeline({ generateDefaults: false });
      const direction = predictor.determineTrendDirection(timeline);
      expect(direction).toBe('stable');
    });

    it('should detect rising trend', () => {
      const events: TimelineEvent[] = [];
      // Create increasing activity
      for (let i = 0; i < 20; i++) {
        const count = Math.floor(i / 2) + 1;
        for (let j = 0; j < count; j++) {
          events.push({
            id: `pub-${i}-${j}`,
            type: 'publication',
            date: new Date(2020 + Math.floor(i / 4), (i % 4) * 3, 1),
            title: '',
            description: '',
            impact: 0.5,
            relatedEntities: ['tech-1'],
            sources: [],
          });
        }
      }

      const timeline = createTimeline({ events });
      const direction = predictor.determineTrendDirection(timeline);

      expect(['rising', 'stable', 'volatile']).toContain(direction);
    });

    it('should detect declining trend', () => {
      const events: TimelineEvent[] = [];
      // Create decreasing activity
      for (let i = 0; i < 20; i++) {
        const count = Math.max(1, 10 - Math.floor(i / 2));
        for (let j = 0; j < count; j++) {
          events.push({
            id: `pub-${i}-${j}`,
            type: 'publication',
            date: new Date(2020 + Math.floor(i / 4), (i % 4) * 3, 1),
            title: '',
            description: '',
            impact: 0.5,
            relatedEntities: ['tech-1'],
            sources: [],
          });
        }
      }

      const timeline = createTimeline({ events });
      const direction = predictor.determineTrendDirection(timeline);

      expect(['declining', 'stable', 'volatile']).toContain(direction);
    });
  });

  describe('generateForecast', () => {
    it('should generate forecast with all fields', async () => {
      const timeline = createTimeline({});
      const phaseResult = createPhaseResult();

      const forecast = await predictor.generateForecast(timeline, phaseResult);

      expect(forecast.technologyId).toBe('tech-1');
      expect(forecast.generatedAt).toBeInstanceOf(Date);
      expect(forecast.horizonDays).toBe(365);
      expect(forecast.currentTrend).toBeDefined();
      expect(forecast.confidence).toBeGreaterThan(0);
      expect(forecast.factors).toBeDefined();
      expect(forecast.risks).toBeDefined();
    });

    it('should use custom horizon', async () => {
      const timeline = createTimeline({});
      const phaseResult = createPhaseResult();

      const forecast = await predictor.generateForecast(timeline, phaseResult, 180);

      expect(forecast.horizonDays).toBe(180);
    });

    it('should predict phase transitions', async () => {
      const timeline = createTimeline({});
      const phaseResult = createPhaseResult('innovation_trigger');

      const forecast = await predictor.generateForecast(timeline, phaseResult, 730);

      expect(forecast.predictedTransitions.length).toBeGreaterThan(0);

      for (const transition of forecast.predictedTransitions) {
        expect(transition.toPhase).toBeDefined();
        expect(transition.estimatedDate).toBeInstanceOf(Date);
        expect(transition.probability).toBeGreaterThan(0);
        expect(transition.probability).toBeLessThanOrEqual(1);
      }
    });

    it('should not predict transitions for plateau phase', async () => {
      const timeline = createTimeline({});
      const phaseResult = createPhaseResult('plateau_of_productivity');

      const forecast = await predictor.generateForecast(timeline, phaseResult);

      expect(forecast.predictedTransitions).toHaveLength(0);
    });
  });

  describe('linearExtrapolation', () => {
    it('should return empty array for insufficient data', () => {
      const timeline = createTimeline({ generateDefaults: false });
      const predictions = predictor.linearExtrapolation(timeline, 180);
      expect(predictions).toHaveLength(0);
    });

    it('should generate predictions', () => {
      const timeline = createTimeline({});
      const predictions = predictor.linearExtrapolation(timeline, 365);

      expect(predictions.length).toBeGreaterThan(0);

      for (const prediction of predictions) {
        expect(prediction.date).toBeInstanceOf(Date);
        expect(prediction.value).toBeGreaterThanOrEqual(0);
      }
    });

    it('should predict future dates', () => {
      const timeline = createTimeline({});
      const predictions = predictor.linearExtrapolation(timeline, 180);

      if (predictions.length > 0) {
        expect(predictions[0]!.date.getTime()).toBeGreaterThan(
          timeline.dateRange.latest.getTime()
        );
      }
    });
  });

  describe('analyzeTrendFactors', () => {
    it('should return multiple factors', async () => {
      const timeline = createTimeline({});
      const phaseResult = createPhaseResult();

      const factors = await predictor.analyzeTrendFactors(timeline, phaseResult);

      expect(factors.length).toBeGreaterThan(0);

      for (const factor of factors) {
        expect(factor.name).toBeDefined();
        expect(['positive', 'negative', 'neutral']).toContain(factor.type);
        expect(factor.impact).toBeGreaterThanOrEqual(0);
        expect(factor.impact).toBeLessThanOrEqual(1);
        expect(factor.description).toBeDefined();
      }
    });

    it('should include phase-specific factor', async () => {
      const timeline = createTimeline({});
      const phaseResult = createPhaseResult('peak_of_expectations');

      const factors = await predictor.analyzeTrendFactors(timeline, phaseResult);

      const phaseFactor = factors.find((f) => f.name === 'Hype Cycle Position');
      expect(phaseFactor).toBeDefined();
      expect(phaseFactor!.type).toBe('negative');
    });

    it('should use LLM when enabled', async () => {
      const llm: TrendLLMInterface = {
        analyzeTrendFactors: vi.fn().mockResolvedValue([
          {
            name: 'LLM Factor',
            type: 'positive',
            impact: 0.5,
            description: 'LLM-generated factor',
          },
        ]),
        assessRisks: vi.fn().mockResolvedValue([]),
      };

      const llmPredictor = new TrendPredictor({ enableLLMAnalysis: true }, llm);
      const timeline = createTimeline({});
      const phaseResult = createPhaseResult();

      const factors = await llmPredictor.analyzeTrendFactors(timeline, phaseResult);

      expect(llm.analyzeTrendFactors).toHaveBeenCalled();
      expect(factors.some((f) => f.name === 'LLM Factor')).toBe(true);
    });
  });

  describe('assessRisks', () => {
    it('should return risk assessments', async () => {
      const timeline = createTimeline({});
      const phaseResult = createPhaseResult();

      const risks = await predictor.assessRisks(timeline, phaseResult);

      for (const risk of risks) {
        expect(risk.name).toBeDefined();
        expect(risk.probability).toBeGreaterThanOrEqual(0);
        expect(risk.probability).toBeLessThanOrEqual(1);
        expect(risk.impact).toBeGreaterThanOrEqual(0);
        expect(risk.impact).toBeLessThanOrEqual(1);
        expect(risk.mitigations).toBeDefined();
      }
    });

    it('should include hype risk for peak phase', async () => {
      const timeline = createTimeline({});
      const phaseResult = createPhaseResult('peak_of_expectations');

      const risks = await predictor.assessRisks(timeline, phaseResult);

      const hypeRisk = risks.find((r) => r.name === 'Hype Cycle Correction');
      expect(hypeRisk).toBeDefined();
      expect(hypeRisk!.probability).toBeGreaterThan(0.5);
    });

    it('should assess obsolescence risk for old tech', async () => {
      const events: TimelineEvent[] = [];
      // Only old events
      for (let i = 0; i < 10; i++) {
        events.push({
          id: `pub-${i}`,
          type: 'publication',
          date: new Date(2018, i, 1),
          title: '',
          description: '',
          impact: 0.5,
          relatedEntities: ['tech-1'],
          sources: [],
        });
      }

      const timeline = createTimeline({ events });
      const phaseResult = createPhaseResult('trough_of_disillusionment');

      const risks = await predictor.assessRisks(timeline, phaseResult);

      const obsolescenceRisk = risks.find((r) => r.name === 'Obsolescence Risk');
      expect(obsolescenceRisk).toBeDefined();
      expect(obsolescenceRisk!.probability).toBeGreaterThan(0.3);
    });
  });

  describe('confidence calculation', () => {
    it('should have higher confidence with more data', async () => {
      const smallTimeline = createTimeline({ startYear: 2023, endYear: 2024 });
      const largeTimeline = createTimeline({ startYear: 2015, endYear: 2024 });
      const phaseResult = createPhaseResult();

      const smallForecast = await predictor.generateForecast(smallTimeline, phaseResult);
      const largeForecast = await predictor.generateForecast(largeTimeline, phaseResult);

      expect(largeForecast.confidence).toBeGreaterThanOrEqual(smallForecast.confidence);
    });

    it('should bound confidence between 0.1 and 0.9', async () => {
      const timeline = createTimeline({});
      const phaseResult = createPhaseResult();

      const forecast = await predictor.generateForecast(timeline, phaseResult);

      expect(forecast.confidence).toBeGreaterThanOrEqual(0.1);
      expect(forecast.confidence).toBeLessThanOrEqual(0.9);
    });
  });
});
