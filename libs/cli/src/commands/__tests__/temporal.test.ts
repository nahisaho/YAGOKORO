/**
 * @fileoverview CLI Temporal Command Tests
 * T-401: temporal CLI コマンドテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createTemporalCommand, type TemporalService } from '../temporal.js';

// ============ Mock Service Factory ============

function createMockService(): TemporalService {
  return {
    analyzeTrends: vi.fn().mockResolvedValue([
      {
        entityId: 'entity-1',
        period: { from: '2024-01-01', to: '2024-12-31' },
        metrics: [],
        summary: {
          avgMomentum: 25.5,
          avgVelocity: 3.2,
          currentPhase: 'growing',
          trend: 'rising',
        },
      },
      {
        entityId: 'entity-2',
        period: { from: '2024-01-01', to: '2024-12-31' },
        metrics: [],
        summary: {
          avgMomentum: -5.0,
          avgVelocity: -1.2,
          currentPhase: 'mature',
          trend: 'declining',
        },
      },
    ]),
    getTimeline: vi.fn().mockResolvedValue({
      entityId: 'entity-1',
      timeRange: { from: '2024-01-01', to: '2024-12-31' },
      granularity: 'month',
      dataPoints: [
        { date: '2024-01-01', citationCount: 100, momentum: 10, velocity: 2 },
        { date: '2024-02-01', citationCount: 120, momentum: 15, velocity: 3 },
        { date: '2024-03-01', citationCount: 150, momentum: 20, velocity: 4 },
      ],
    }),
    detectHotTopics: vi.fn().mockResolvedValue({
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
          momentum: 72.0,
          velocity: 9.5,
          citationCount: 800,
          adoptionPhase: 'growing',
          rank: 2,
        },
      ],
      summary: {
        totalEmerging: 5,
        avgMomentum: 65.0,
        topField: 'AI',
      },
    }),
    forecast: vi.fn().mockResolvedValue({
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
    }),
    getEntitiesByPhase: vi.fn().mockResolvedValue([
      'emerging-entity-1',
      'emerging-entity-2',
      'emerging-entity-3',
    ]),
    getPhaseDistribution: vi.fn().mockResolvedValue({
      emerging: 150,
      growing: 320,
      mature: 450,
      declining: 80,
    }),
    getStatistics: vi.fn().mockResolvedValue({
      timeRange: { from: '2024-01-01', to: '2024-12-31' },
      totalEntities: 1000,
      avgMomentum: 12.5,
      avgVelocity: 2.3,
      phaseDistribution: {
        emerging: 150,
        growing: 320,
        mature: 450,
        declining: 80,
      },
      topGainers: [
        { entityId: 'gainer-1', momentum: 150 },
        { entityId: 'gainer-2', momentum: 120 },
      ],
      topDecliners: [
        { entityId: 'decliner-1', momentum: -80 },
        { entityId: 'decliner-2', momentum: -65 },
      ],
    }),
    createSnapshot: vi.fn().mockResolvedValue('snapshot-20241231-001'),
    getLatestSnapshot: vi.fn().mockResolvedValue({
      id: 'snapshot-20241231-001',
      date: '2024-12-31T00:00:00Z',
      totalEntities: 1000,
      hotTopics: [
        {
          entityId: 'hot-1',
          entityName: 'LLM',
          momentum: 85.5,
          velocity: 12.3,
          citationCount: 1500,
          adoptionPhase: 'emerging',
          rank: 1,
        },
      ],
      summary: {
        emergingCount: 150,
        growingCount: 320,
        matureCount: 450,
        decliningCount: 80,
      },
    }),
  };
}

// ============ Tests ============

describe('createTemporalCommand', () => {
  let service: TemporalService;
  let command: ReturnType<typeof createTemporalCommand>;

  beforeEach(() => {
    service = createMockService();
    command = createTemporalCommand(service);
  });

  it('should create a command with correct name and description', () => {
    expect(command.name()).toBe('temporal');
    expect(command.description()).toContain('時系列分析');
    expect(command.alias()).toBe('tp');
  });

  it('should have all required subcommands', () => {
    const subcommands = command.commands.map((c) => c.name());
    expect(subcommands).toContain('trends');
    expect(subcommands).toContain('timeline');
    expect(subcommands).toContain('hot-topics');
    expect(subcommands).toContain('forecast');
    expect(subcommands).toContain('phases');
    expect(subcommands).toContain('stats');
    expect(subcommands).toContain('snapshot');
  });

  describe('trends command', () => {
    it('should have correct options', () => {
      const trendsCmd = command.commands.find((c) => c.name() === 'trends');
      expect(trendsCmd).toBeDefined();

      const options = trendsCmd!.options.map((o) => o.long);
      expect(options).toContain('--period');
      expect(options).toContain('--top');
      expect(options).toContain('--format');
    });

    it('should call service.analyzeTrends', async () => {
      const cmd = createTemporalCommand(service);
      await cmd.parseAsync(['trends', '--format', 'json'], { from: 'user' });

      expect(service.analyzeTrends).toHaveBeenCalled();
    });
  });

  describe('timeline command', () => {
    it('should have entityId argument', () => {
      const timelineCmd = command.commands.find((c) => c.name() === 'timeline');
      expect(timelineCmd).toBeDefined();
      // Commander stores arguments in registeredArguments
      expect(timelineCmd!.registeredArguments.length).toBeGreaterThan(0);
      expect(timelineCmd!.registeredArguments[0]?.name()).toBe('entityId');
    });

    it('should have correct options', () => {
      const timelineCmd = command.commands.find((c) => c.name() === 'timeline');
      const options = timelineCmd!.options.map((o) => o.long);
      expect(options).toContain('--range');
      expect(options).toContain('--granularity');
      expect(options).toContain('--format');
    });

    it('should call service.getTimeline with entityId', async () => {
      const cmd = createTemporalCommand(service);
      await cmd.parseAsync(['timeline', 'entity-123', '--format', 'json'], { from: 'user' });

      expect(service.getTimeline).toHaveBeenCalledWith(
        'entity-123',
        expect.objectContaining({
          granularity: 'month',
        })
      );
    });
  });

  describe('hot-topics command', () => {
    it('should have alias "hot"', () => {
      const hotCmd = command.commands.find((c) => c.name() === 'hot-topics');
      expect(hotCmd).toBeDefined();
      expect(hotCmd!.alias()).toBe('hot');
    });

    it('should call service.detectHotTopics', async () => {
      const cmd = createTemporalCommand(service);
      await cmd.parseAsync(['hot-topics', '--limit', '5', '--format', 'json'], { from: 'user' });

      expect(service.detectHotTopics).toHaveBeenCalledWith({
        limit: 5,
        minMomentum: 50,
      });
    });

    it('should respect --min-momentum option', async () => {
      const cmd = createTemporalCommand(service);
      await cmd.parseAsync(['hot-topics', '--min-momentum', '75', '--format', 'json'], {
        from: 'user',
      });

      expect(service.detectHotTopics).toHaveBeenCalledWith({
        limit: 20,
        minMomentum: 75,
      });
    });
  });

  describe('forecast command', () => {
    it('should require entityId argument', () => {
      const forecastCmd = command.commands.find((c) => c.name() === 'forecast');
      expect(forecastCmd).toBeDefined();
      // Commander stores arguments in registeredArguments
      expect(forecastCmd!.registeredArguments.length).toBeGreaterThan(0);
      expect(forecastCmd!.registeredArguments[0]?.name()).toBe('entityId');
    });

    it('should call service.forecast with entityId and horizon', async () => {
      const cmd = createTemporalCommand(service);
      await cmd.parseAsync(['forecast', 'entity-456', '--horizon', '60', '--format', 'json'], {
        from: 'user',
      });

      expect(service.forecast).toHaveBeenCalledWith('entity-456', 60);
    });
  });

  describe('phases command', () => {
    it('should call getPhaseDistribution when no phase specified', async () => {
      const cmd = createTemporalCommand(service);
      await cmd.parseAsync(['phases', '--format', 'json'], { from: 'user' });

      expect(service.getPhaseDistribution).toHaveBeenCalled();
    });

    it('should call getEntitiesByPhase when phase specified', async () => {
      const cmd = createTemporalCommand(service);
      await cmd.parseAsync(['phases', '--phase', 'emerging', '--format', 'json'], { from: 'user' });

      expect(service.getEntitiesByPhase).toHaveBeenCalledWith('emerging', { limit: 20 });
    });

    it('should reject invalid phase', async () => {
      const originalExitCode = process.exitCode;
      const cmd = createTemporalCommand(service);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await cmd.parseAsync(['phases', '--phase', 'invalid-phase', '--format', 'json'], {
        from: 'user',
      });

      expect(process.exitCode).toBe(1);
      process.exitCode = originalExitCode;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('stats command', () => {
    it('should call service.getStatistics', async () => {
      const cmd = createTemporalCommand(service);
      await cmd.parseAsync(['stats', '--range', 'last-quarter', '--format', 'json'], {
        from: 'user',
      });

      expect(service.getStatistics).toHaveBeenCalledWith('last-quarter');
    });
  });

  describe('snapshot command', () => {
    it('should call getLatestSnapshot by default', async () => {
      const cmd = createTemporalCommand(service);
      await cmd.parseAsync(['snapshot', '--format', 'json'], { from: 'user' });

      expect(service.getLatestSnapshot).toHaveBeenCalled();
      expect(service.createSnapshot).not.toHaveBeenCalled();
    });

    it('should call createSnapshot when --create flag is set', async () => {
      const cmd = createTemporalCommand(service);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await cmd.parseAsync(['snapshot', '--create'], { from: 'user' });

      expect(service.createSnapshot).toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });
  });
});

describe('Temporal CLI Output Formats', () => {
  let service: TemporalService;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    service = createMockService();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should output JSON when --format json is specified', async () => {
    const command = createTemporalCommand(service);
    await command.parseAsync(['trends', '--format', 'json'], { from: 'user' });

    expect(consoleLogSpy).toHaveBeenCalled();
    const output = consoleLogSpy.mock.calls[0]?.[0];
    expect(() => JSON.parse(output as string)).not.toThrow();
  });

  it('should output table format by default', async () => {
    const command = createTemporalCommand(service);
    await command.parseAsync(['hot-topics'], { from: 'user' });

    expect(consoleLogSpy).toHaveBeenCalled();
    const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(allOutput).toContain('ホットトピック');
  });
});

describe('Error Handling', () => {
  let service: TemporalService;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    service = createMockService();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should handle service errors gracefully', async () => {
    (service.analyzeTrends as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Service unavailable')
    );

    const originalExitCode = process.exitCode;
    const command = createTemporalCommand(service);

    await command.parseAsync(['trends', '--format', 'json'], { from: 'user' });

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Service unavailable'));
    expect(process.exitCode).toBe(1);

    process.exitCode = originalExitCode;
  });
});
