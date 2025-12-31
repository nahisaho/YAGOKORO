/**
 * TemporalService - Façade for temporal analysis operations
 *
 * Coordinates trend analysis, hot topic detection, and forecasting.
 * Implements REQ-004-01〜07.
 *
 * @packageDocumentation
 */

import type {
  TrendRepository,
  SaveTrendMetricsOptions,
  SaveSnapshotOptions,
  TrendQueryOptions,
  TrendDataPoint,
  TrendSnapshotRecord,
  DailyMetricsRecord,
  DailyMetricsInput,
} from '@yagokoro/domain';
import type {
  HotTopic,
  TrendForecast,
  TimeRangeFilter,
  AdoptionPhase,
} from '@yagokoro/domain';
import { determineAdoptionPhase, resolveTimeRange } from '@yagokoro/domain';

// ============================================================================
// Service Configuration
// ============================================================================

/**
 * Configuration options for TemporalService
 */
export interface TemporalServiceConfig {
  /**
   * Window size for moving average calculation (days)
   * @default 30
   */
  movingAverageWindow?: number;

  /**
   * Threshold for momentum to be considered "hot"
   * @default 50
   */
  hotTopicMomentumThreshold?: number;

  /**
   * Maximum number of hot topics to track
   * @default 20
   */
  maxHotTopics?: number;

  /**
   * Forecast horizon (days)
   * @default 30
   */
  forecastHorizon?: number;
}

const DEFAULT_CONFIG: Required<TemporalServiceConfig> = {
  movingAverageWindow: 30,
  hotTopicMomentumThreshold: 50,
  maxHotTopics: 20,
  forecastHorizon: 30,
};

// ============================================================================
// Input/Output Types
// ============================================================================

/**
 * Input for recording daily metrics
 */
export interface RecordMetricsInput {
  entityId: string;
  date: Date;
  citationCount: number;
}

/**
 * Input for batch metrics recording
 */
export interface RecordMetricsBatchInput {
  items: RecordMetricsInput[];
}

/**
 * Result from trend analysis
 */
export interface TrendAnalysisResult {
  entityId: string;
  period: { from: Date; to: Date };
  metrics: DailyMetricsRecord[];
  summary: {
    avgMomentum: number;
    avgVelocity: number;
    currentPhase: AdoptionPhase;
    trend: 'rising' | 'stable' | 'declining';
  };
}

/**
 * Timeline data for visualization
 */
export interface TimelineResult {
  entityId: string;
  timeRange: { from: Date; to: Date };
  granularity: 'day' | 'week' | 'month';
  dataPoints: TrendDataPoint[];
}

/**
 * Hot topics analysis result
 */
export interface HotTopicsResult {
  capturedAt: Date;
  topics: HotTopic[];
  summary: {
    totalEmerging: number;
    avgMomentum: number;
    topField?: string;
  };
}

/**
 * Statistics result
 */
export interface TemporalStatistics {
  timeRange: { from: Date; to: Date };
  totalEntities: number;
  avgMomentum: number;
  avgVelocity: number;
  phaseDistribution: Record<AdoptionPhase, number>;
  topGainers: Array<{ entityId: string; momentum: number }>;
  topDecliners: Array<{ entityId: string; momentum: number }>;
}

// ============================================================================
// TemporalService Implementation
// ============================================================================

/**
 * TemporalService provides high-level temporal analysis operations
 *
 * @example
 * ```typescript
 * const service = new TemporalService(repository);
 *
 * // Record daily metrics
 * await service.recordMetrics({
 *   entityId: 'entity-1',
 *   date: new Date(),
 *   citationCount: 150
 * });
 *
 * // Detect hot topics
 * const hotTopics = await service.detectHotTopics({ limit: 10 });
 *
 * // Get timeline data
 * const timeline = await service.getTimeline('entity-1', {
 *   preset: 'last-year',
 *   granularity: 'month'
 * });
 * ```
 */
export class TemporalService {
  private readonly config: Required<TemporalServiceConfig>;
  private previousMetricsCache: Map<string, DailyMetricsRecord> = new Map();

  constructor(
    private readonly repository: TrendRepository,
    config?: TemporalServiceConfig,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // Metrics Recording (REQ-004-01, REQ-004-02)
  // ==========================================================================

  /**
   * Record daily metrics for an entity
   *
   * Calculates velocity, momentum, and adoption phase automatically.
   */
  async recordMetrics(input: RecordMetricsInput): Promise<DailyMetricsRecord> {
    const { entityId, date, citationCount } = input;

    // Get previous metrics for delta calculation
    const previousMetrics = await this.getPreviousMetrics(entityId);

    // Calculate velocity (citations per day)
    const velocity = this.calculateVelocity(citationCount, previousMetrics);

    // Calculate momentum (rate of change)
    const momentum = this.calculateMomentum(citationCount, previousMetrics);

    // Determine adoption phase
    const monthsSincePublication = this.estimateMonthsActive(previousMetrics);
    const adoptionPhase = determineAdoptionPhase(
      momentum,
      velocity,
      citationCount,
      monthsSincePublication,
    );

    const metricsInput: DailyMetricsInput = {
      date,
      citationCount,
      velocity,
      momentum,
      adoptionPhase,
    };

    await this.repository.saveTrendMetrics({ entityId, metrics: metricsInput });

    const result: DailyMetricsRecord = {
      entityId,
      ...metricsInput,
      rank: 0,
    };

    // Update cache
    this.previousMetricsCache.set(entityId, result);

    return result;
  }

  /**
   * Record metrics for multiple entities in batch
   */
  async recordMetricsBatch(
    input: RecordMetricsBatchInput,
  ): Promise<{ recorded: number; failed: number }> {
    const items: SaveTrendMetricsOptions[] = [];
    let failed = 0;

    for (const item of input.items) {
      try {
        const previousMetrics = await this.getPreviousMetrics(item.entityId);
        const velocity = this.calculateVelocity(item.citationCount, previousMetrics);
        const momentum = this.calculateMomentum(item.citationCount, previousMetrics);
        const monthsSincePublication = this.estimateMonthsActive(previousMetrics);
        const adoptionPhase = determineAdoptionPhase(
          momentum,
          velocity,
          item.citationCount,
          monthsSincePublication,
        );

        items.push({
          entityId: item.entityId,
          metrics: {
            date: item.date,
            citationCount: item.citationCount,
            velocity,
            momentum,
            adoptionPhase,
          },
        });
      } catch {
        failed++;
      }
    }

    if (items.length > 0) {
      await this.repository.saveTrendMetricsBatch(items);
    }

    return { recorded: items.length, failed };
  }

  // ==========================================================================
  // Trend Analysis (REQ-004-04)
  // ==========================================================================

  /**
   * Analyze trends for an entity over a time period
   */
  async analyzeTrend(
    entityId: string,
    timeRange: TimeRangeFilter,
  ): Promise<TrendAnalysisResult> {
    const { from, to } = resolveTimeRange(timeRange);

    const metrics = await this.repository.getDailyMetrics(entityId, {
      timeRange,
      sortBy: 'date',
      sortOrder: 'asc',
    });

    const summary = this.summarizeMetrics(metrics);

    return {
      entityId,
      period: { from, to },
      metrics,
      summary,
    };
  }

  /**
   * Query metrics with flexible filters
   */
  async queryMetrics(options: TrendQueryOptions): Promise<DailyMetricsRecord[]> {
    return this.repository.queryDailyMetrics(options);
  }

  /**
   * Get latest metrics for an entity
   */
  async getLatestMetrics(entityId: string): Promise<DailyMetricsRecord | null> {
    return this.repository.getLatestDailyMetrics(entityId);
  }

  // ==========================================================================
  // Hot Topics Detection (REQ-004-03, REQ-004-07)
  // ==========================================================================

  /**
   * Detect current hot topics
   */
  async detectHotTopics(options?: {
    limit?: number;
    minMomentum?: number;
  }): Promise<HotTopicsResult> {
    const limit = options?.limit ?? this.config.maxHotTopics;
    const minMomentum = options?.minMomentum ?? this.config.hotTopicMomentumThreshold;

    const topics = await this.repository.getHotTopics({ limit, minMomentum });

    const avgMomentum =
      topics.length > 0
        ? topics.reduce((sum, t) => sum + t.momentum, 0) / topics.length
        : 0;

    return {
      capturedAt: new Date(),
      topics,
      summary: {
        totalEmerging: topics.filter((t) => t.momentum > minMomentum * 1.5).length,
        avgMomentum,
      },
    };
  }

  /**
   * Get entities by adoption phase
   */
  async getEntitiesByPhase(
    phase: AdoptionPhase,
    options?: { limit?: number; offset?: number },
  ): Promise<string[]> {
    return this.repository.getEntitiesByPhase(phase, options);
  }

  /**
   * Get distribution of entities across phases
   */
  async getPhaseDistribution(): Promise<Record<AdoptionPhase, number>> {
    return this.repository.getPhaseDistribution();
  }

  // ==========================================================================
  // Timeline & Visualization (REQ-004-06)
  // ==========================================================================

  /**
   * Get timeline data for an entity
   */
  async getTimeline(
    entityId: string,
    options: {
      timeRange: TimeRangeFilter;
      granularity?: 'day' | 'week' | 'month';
    },
  ): Promise<TimelineResult> {
    const { timeRange, granularity = 'day' } = options;
    const { from, to } = resolveTimeRange(timeRange);

    const dataPoints =
      granularity === 'day'
        ? await this.repository.getTimeSeries(entityId, timeRange)
        : await this.repository.getAggregatedTimeSeries(entityId, timeRange, granularity);

    return {
      entityId,
      timeRange: { from, to },
      granularity,
      dataPoints,
    };
  }

  /**
   * Compare timelines for multiple entities
   */
  async compareTimelines(
    entityIds: string[],
    timeRange: TimeRangeFilter,
    granularity: 'day' | 'week' | 'month' = 'day',
  ): Promise<Map<string, TrendDataPoint[]>> {
    const results = new Map<string, TrendDataPoint[]>();

    // Execute in parallel
    const promises = entityIds.map(async (entityId) => {
      const dataPoints =
        granularity === 'day'
          ? await this.repository.getTimeSeries(entityId, timeRange)
          : await this.repository.getAggregatedTimeSeries(entityId, timeRange, granularity);
      return { entityId, dataPoints };
    });

    const resolved = await Promise.all(promises);
    for (const { entityId, dataPoints } of resolved) {
      results.set(entityId, dataPoints);
    }

    return results;
  }

  // ==========================================================================
  // Trend Forecasting (REQ-004-05)
  // ==========================================================================

  /**
   * Forecast trend using simple moving average
   *
   * @param entityId - Entity to forecast
   * @param horizon - Number of days to forecast (default: config.forecastHorizon)
   */
  async forecast(
    entityId: string,
    horizon?: number,
  ): Promise<TrendForecast> {
    const forecastDays = horizon ?? this.config.forecastHorizon;
    const windowSize = this.config.movingAverageWindow;

    // Get historical data for moving average calculation
    const now = new Date();
    const startDate = new Date(now.getTime() - windowSize * 2 * 24 * 60 * 60 * 1000);
    const forecastEnd = new Date(now.getTime() + forecastDays * 24 * 60 * 60 * 1000);
    const timeRange: TimeRangeFilter = {
      from: startDate,
      to: now,
    };

    const timeSeries = await this.repository.getTimeSeries(entityId, timeRange);

    if (timeSeries.length < 3) {
      return {
        entityId,
        entityName: entityId, // Would need to fetch actual name
        forecastStart: now,
        forecastEnd,
        predictions: [],
        trendDirection: 'stable',
        confidence: 0,
        model: 'linear',
      };
    }

    // Calculate moving average
    const values = timeSeries.map((p) => p.citationCount);
    const movingAvg = this.calculateMovingAverage(values, Math.min(windowSize, values.length));

    // Simple linear projection based on recent trend
    const recentTrend = this.calculateTrend(values.slice(-Math.min(7, values.length)));

    // Calculate predictions with confidence intervals
    const variance = this.calculateVariance(values);
    const stdDev = Math.sqrt(variance);
    const predictions: TrendForecast['predictions'] = [];

    for (let i = 1; i <= forecastDays; i++) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const predictedValue = Math.max(0, movingAvg + recentTrend * i);
      const uncertainty = stdDev * Math.sqrt(i / 7); // Uncertainty grows with time

      predictions.push({
        date,
        predictedCitations: Math.round(predictedValue),
        confidenceInterval: {
          lower: Math.round(Math.max(0, predictedValue - 1.96 * uncertainty)),
          upper: Math.round(predictedValue + 1.96 * uncertainty),
        },
      });
    }

    // Calculate confidence based on data consistency
    const confidence = Math.min(1, Math.max(0.1, 1 - variance / (movingAvg || 1)));

    // Determine trend direction
    let trendDirection: TrendForecast['trendDirection'];
    if (recentTrend > 0.5) {
      trendDirection = 'up';
    } else if (recentTrend < -0.5) {
      trendDirection = 'down';
    } else {
      trendDirection = 'stable';
    }

    return {
      entityId,
      entityName: entityId, // Would need to fetch actual name
      forecastStart: now,
      forecastEnd,
      predictions,
      trendDirection,
      confidence,
      model: 'linear',
    };
  }

  // ==========================================================================
  // Snapshots
  // ==========================================================================

  /**
   * Create a trend snapshot for the current state
   */
  async createSnapshot(): Promise<string> {
    const hotTopics = await this.repository.getHotTopics({
      limit: this.config.maxHotTopics,
    });

    const phaseDistribution = await this.repository.getPhaseDistribution();
    const totalEntities = Object.values(phaseDistribution).reduce((a, b) => a + b, 0);

    const snapshotOptions: SaveSnapshotOptions = {
      date: new Date(),
      totalEntities,
      hotTopics,
      summary: {
        emergingCount: phaseDistribution.emerging,
        growingCount: phaseDistribution.growing,
        matureCount: phaseDistribution.mature,
        decliningCount: phaseDistribution.declining,
      },
    };

    return this.repository.saveSnapshot(snapshotOptions);
  }

  /**
   * Get the latest snapshot
   */
  async getLatestSnapshot(): Promise<TrendSnapshotRecord | null> {
    return this.repository.getLatestSnapshot();
  }

  /**
   * Get snapshot by ID
   */
  async getSnapshot(snapshotId: string): Promise<TrendSnapshotRecord | null> {
    return this.repository.getSnapshot(snapshotId);
  }

  // ==========================================================================
  // Statistics (REQ-004-06)
  // ==========================================================================

  /**
   * Get comprehensive statistics for a time range
   */
  async getStatistics(timeRange: TimeRangeFilter): Promise<TemporalStatistics> {
    const { from, to } = resolveTimeRange(timeRange);
    const stats = await this.repository.getStatistics(timeRange);

    return {
      timeRange: { from, to },
      ...stats,
    };
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private async getPreviousMetrics(entityId: string): Promise<DailyMetricsRecord | null> {
    // Check cache first
    const cached = this.previousMetricsCache.get(entityId);
    if (cached) return cached;

    // Fetch from repository
    const latest = await this.repository.getLatestDailyMetrics(entityId);
    if (latest) {
      this.previousMetricsCache.set(entityId, latest);
    }
    return latest;
  }

  private calculateVelocity(
    currentCount: number,
    previous: DailyMetricsRecord | null,
  ): number {
    if (!previous) return 0;

    const delta = currentCount - previous.citationCount;
    const daysDiff = 1; // Assume daily recording
    return delta / daysDiff;
  }

  private calculateMomentum(
    currentCount: number,
    previous: DailyMetricsRecord | null,
  ): number {
    if (!previous || previous.citationCount === 0) return 0;

    return ((currentCount - previous.citationCount) / previous.citationCount) * 100;
  }

  private estimateMonthsActive(previous: DailyMetricsRecord | null): number {
    if (!previous) return 0;
    // Simplified: assume 12 months if we have any previous data
    return 12;
  }

  private summarizeMetrics(metrics: DailyMetricsRecord[]): {
    avgMomentum: number;
    avgVelocity: number;
    currentPhase: AdoptionPhase;
    trend: 'rising' | 'stable' | 'declining';
  } {
    if (metrics.length === 0) {
      return {
        avgMomentum: 0,
        avgVelocity: 0,
        currentPhase: 'emerging',
        trend: 'stable',
      };
    }

    const avgMomentum = metrics.reduce((sum, m) => sum + m.momentum, 0) / metrics.length;
    const avgVelocity = metrics.reduce((sum, m) => sum + m.velocity, 0) / metrics.length;
    const currentPhase = metrics[metrics.length - 1]!.adoptionPhase;

    // Determine trend based on recent momentum
    const recentMetrics = metrics.slice(-7);
    const recentAvgMomentum =
      recentMetrics.reduce((sum, m) => sum + m.momentum, 0) / recentMetrics.length;

    let trend: 'rising' | 'stable' | 'declining';
    if (recentAvgMomentum > 5) {
      trend = 'rising';
    } else if (recentAvgMomentum < -5) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    return { avgMomentum, avgVelocity, currentPhase, trend };
  }

  private calculateMovingAverage(values: number[], window: number): number {
    if (values.length === 0) return 0;
    const windowValues = values.slice(-window);
    return windowValues.reduce((a, b) => a + b, 0) / windowValues.length;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i]! - yMean);
      denominator += (i - xMean) ** 2;
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => (v - mean) ** 2);
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }
}
