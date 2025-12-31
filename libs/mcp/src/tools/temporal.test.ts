/**
 * MCP Temporal Tools Tests
 *
 * @description temporal MCP ツールのテスト
 * @see T-403
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  temporalTools,
  createTemporalToolHandlers,
  type TemporalToolService,
  type MCPTrendAnalysisResult,
  type MCPTimelineResult,
  type MCPHotTopicsResult,
  type MCPTrendForecast as MCPTemporalForecast,
} from './temporal.js';

// Mock service factory
function createMockService(): TemporalToolService {
  const mockTrendsResult: MCPTrendAnalysisResult = {
    timeRange: { from: '2024-01-01', to: '2024-12-31' },
    topTrends: [
      {
        entityId: 'entity-1',
        period: { from: '2024-01-01', to: '2024-12-31' },
        metrics: [
          { date: '2024-01-01', citationCount: 100, momentum: 10, velocity: 2 },
          { date: '2024-02-01', citationCount: 120, momentum: 15, velocity: 3 },
        ],
        summary: {
          avgMomentum: 12.5,
          avgVelocity: 2.5,
          currentPhase: 'growing',
          trend: 'rising',
        },
      },
    ],
    analyzedAt: '2024-12-31T00:00:00Z',
  };

  const mockTimelineResult: MCPTimelineResult = {
    entityId: 'entity-1',
    entityName: 'Transformer',
    timeRange: { from: '2024-01-01', to: '2024-12-31' },
    granularity: 'month',
    dataPoints: [
      { date: '2024-01-01', citationCount: 100, momentum: 10, velocity: 2, phase: 'growing' },
      { date: '2024-02-01', citationCount: 120, momentum: 15, velocity: 3, phase: 'growing' },
      { date: '2024-03-01', citationCount: 150, momentum: 20, velocity: 4, phase: 'mature' },
    ],
  };

  const mockHotTopicsResult: MCPHotTopicsResult = {
    capturedAt: '2024-12-31T00:00:00Z',
    topics: [
      {
        entityId: 'hot-1',
        entityName: 'LLM',
        momentum: 85.5,
        velocity: 12.3,
        citationCount: 1500,
        adoptionPhase: 'emerging',
        rank: 1,
      },
      {
        entityId: 'hot-2',
        entityName: 'RAG',
        momentum: 72,
        velocity: 9.5,
        citationCount: 800,
        adoptionPhase: 'growing',
        rank: 2,
      },
    ],
    summary: {
      totalEmerging: 5,
      avgMomentum: 65,
      topField: 'AI',
    },
  };

  const mockForecastResult: MCPTemporalForecast = {
    entityId: 'entity-1',
    entityName: 'Transformer',
    forecastStart: '2024-12-31',
    forecastEnd: '2025-01-30',
    predictions: [
      {
        date: '2025-01-01',
        predictedCitations: 160,
        confidenceInterval: { lower: 140, upper: 180 },
      },
      {
        date: '2025-01-15',
        predictedCitations: 175,
        confidenceInterval: { lower: 150, upper: 200 },
      },
    ],
    trendDirection: 'up',
    confidence: 0.85,
    model: 'linear',
  };

  return {
    analyzeTrends: vi.fn().mockResolvedValue(mockTrendsResult),
    getTimeline: vi.fn().mockResolvedValue(mockTimelineResult),
    detectHotTopics: vi.fn().mockResolvedValue(mockHotTopicsResult),
    forecast: vi.fn().mockResolvedValue(mockForecastResult),
    getEntitiesByPhase: vi.fn().mockResolvedValue({
      phase: 'emerging',
      entities: ['entity-1', 'entity-2', 'entity-3'],
    }),
    getStatistics: vi.fn().mockResolvedValue({
      timeRange: { from: '2024-01-01', to: '2024-12-31' },
      totalEntities: 1000,
      avgMomentum: 12.5,
      avgVelocity: 2.3,
      phaseDistribution: { emerging: 150, growing: 320, mature: 450, declining: 80 },
      topGainers: [{ entityId: 'gainer-1', momentum: 50 }],
      topDecliners: [{ entityId: 'decliner-1', momentum: -30 }],
    }),
  };
}

describe('temporalTools', () => {
  it('should define all required tools', () => {
    const toolNames = temporalTools.map((t) => t.name);
    expect(toolNames).toContain('temporal_analyze_trends');
    expect(toolNames).toContain('temporal_get_timeline');
    expect(toolNames).toContain('temporal_hot_topics');
    expect(toolNames).toContain('temporal_forecast');
    expect(toolNames).toContain('temporal_by_phase');
  });

  it('should have correct input schemas', () => {
    const analyzeTrendsTool = temporalTools.find((t) => t.name === 'temporal_analyze_trends');
    expect(analyzeTrendsTool).toBeDefined();
    expect(analyzeTrendsTool!.inputSchema.properties).toHaveProperty('range');
    expect(analyzeTrendsTool!.inputSchema.properties).toHaveProperty('top');

    const timelineTool = temporalTools.find((t) => t.name === 'temporal_get_timeline');
    expect(timelineTool).toBeDefined();
    expect(timelineTool!.inputSchema.required).toContain('entityId');

    const forecastTool = temporalTools.find((t) => t.name === 'temporal_forecast');
    expect(forecastTool).toBeDefined();
    expect(forecastTool!.inputSchema.required).toContain('entityId');

    const byPhaseTool = temporalTools.find((t) => t.name === 'temporal_by_phase');
    expect(byPhaseTool).toBeDefined();
    expect(byPhaseTool!.inputSchema.required).toContain('phase');
  });

  it('should have Japanese descriptions', () => {
    for (const tool of temporalTools) {
      expect(tool.description).toMatch(/[ァ-ヶぁ-ん]/);
    }
  });
});

describe('createTemporalToolHandlers', () => {
  let mockService: TemporalToolService;
  let handlers: ReturnType<typeof createTemporalToolHandlers>;

  beforeEach(() => {
    mockService = createMockService();
    handlers = createTemporalToolHandlers(mockService);
  });

  describe('handleAnalyzeTrends', () => {
    it('should call service.analyzeTrends with default options', async () => {
      const result = await handlers.handleAnalyzeTrends({});
      expect(mockService.analyzeTrends).toHaveBeenCalledWith({
        range: 'last30days',
        top: 10,
      });
      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('text');
    });

    it('should call service.analyzeTrends with custom options', async () => {
      await handlers.handleAnalyzeTrends({ range: 'last1year', top: 5 });
      expect(mockService.analyzeTrends).toHaveBeenCalledWith({
        range: 'last1year',
        top: 5,
      });
    });
  });

  describe('handleGetTimeline', () => {
    it('should call service.getTimeline with entityId', async () => {
      const result = await handlers.handleGetTimeline({ entityId: 'entity-1' });
      expect(mockService.getTimeline).toHaveBeenCalledWith('entity-1', {
        range: 'last1year',
        granularity: 'month',
      });
      expect(result.isError).toBe(false);
    });

    it('should return error when entityId is missing', async () => {
      const result = await handlers.handleGetTimeline({ entityId: '' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('entityId');
    });

    it('should pass custom options', async () => {
      await handlers.handleGetTimeline({
        entityId: 'entity-1',
        range: 'last90days',
        granularity: 'week',
      });
      expect(mockService.getTimeline).toHaveBeenCalledWith('entity-1', {
        range: 'last90days',
        granularity: 'week',
      });
    });
  });

  describe('handleHotTopics', () => {
    it('should call service.detectHotTopics with defaults', async () => {
      const result = await handlers.handleHotTopics({});
      expect(mockService.detectHotTopics).toHaveBeenCalledWith({
        limit: 10,
        minMomentum: 0,
      });
      expect(result.isError).toBe(false);
    });

    it('should pass custom filters', async () => {
      await handlers.handleHotTopics({ limit: 5, minMomentum: 50 });
      expect(mockService.detectHotTopics).toHaveBeenCalledWith({
        limit: 5,
        minMomentum: 50,
      });
    });
  });

  describe('handleForecast', () => {
    it('should call service.forecast with entityId and horizon', async () => {
      const result = await handlers.handleForecast({ entityId: 'entity-1', horizon: 60 });
      expect(mockService.forecast).toHaveBeenCalledWith('entity-1', { horizon: 60 });
      expect(result.isError).toBe(false);
    });

    it('should return error when entityId is missing', async () => {
      const result = await handlers.handleForecast({ entityId: '' });
      expect(result.isError).toBe(true);
    });

    it('should use default horizon when not provided', async () => {
      await handlers.handleForecast({ entityId: 'entity-1' });
      expect(mockService.forecast).toHaveBeenCalledWith('entity-1', { horizon: 30 });
    });
  });

  describe('handleByPhase', () => {
    it('should call service.getEntitiesByPhase', async () => {
      const result = await handlers.handleByPhase({ phase: 'emerging' });
      expect(mockService.getEntitiesByPhase).toHaveBeenCalledWith('emerging', { limit: 20 });
      expect(result.isError).toBe(false);
    });

    it('should return error when phase is missing', async () => {
      const result = await handlers.handleByPhase({ phase: '' as any });
      expect(result.isError).toBe(true);
    });

    it('should return error for invalid phase', async () => {
      const result = await handlers.handleByPhase({ phase: 'invalid' as any });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('emerging');
    });

    it('should pass limit option', async () => {
      await handlers.handleByPhase({ phase: 'growing', limit: 10 });
      expect(mockService.getEntitiesByPhase).toHaveBeenCalledWith('growing', { limit: 10 });
    });
  });

  describe('handleTemporalTool', () => {
    it('should route to correct handler', async () => {
      await handlers.handleTemporalTool('temporal_analyze_trends', { range: 'last7days' });
      expect(mockService.analyzeTrends).toHaveBeenCalled();

      await handlers.handleTemporalTool('temporal_get_timeline', { entityId: 'e-1' });
      expect(mockService.getTimeline).toHaveBeenCalled();

      await handlers.handleTemporalTool('temporal_hot_topics', {});
      expect(mockService.detectHotTopics).toHaveBeenCalled();

      await handlers.handleTemporalTool('temporal_forecast', { entityId: 'e-1' });
      expect(mockService.forecast).toHaveBeenCalled();

      await handlers.handleTemporalTool('temporal_by_phase', { phase: 'mature' });
      expect(mockService.getEntitiesByPhase).toHaveBeenCalled();
    });

    it('should return error for unknown tool', async () => {
      const result = await handlers.handleTemporalTool('unknown_tool', {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown');
    });
  });
});

describe('Tool Response Format', () => {
  let handlers: ReturnType<typeof createTemporalToolHandlers>;

  beforeEach(() => {
    const mockService = createMockService();
    handlers = createTemporalToolHandlers(mockService);
  });

  it('should return properly formatted JSON in content', async () => {
    const result = await handlers.handleHotTopics({});
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
    expect(parsed).toHaveProperty('capturedAt');
    expect(parsed).toHaveProperty('topics');
    expect(parsed).toHaveProperty('summary');
  });

  it('should include isError: false for success', async () => {
    const result = await handlers.handleAnalyzeTrends({});
    expect(result.isError).toBe(false);
  });

  it('should include isError: true for errors', async () => {
    const result = await handlers.handleForecast({ entityId: '' });
    expect(result.isError).toBe(true);
  });
});
