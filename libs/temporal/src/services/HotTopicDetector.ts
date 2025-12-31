/**
 * HotTopicDetector - Algorithm for detecting trending topics
 *
 * Implements sophisticated hot topic detection based on momentum,
 * velocity, and citation patterns.
 *
 * REQ-004-03: Hot Topics detection
 * REQ-004-07: Adoption phase queries
 *
 * @packageDocumentation
 */

import type {
  TrendRepository,
  DailyMetricsRecord,
  TrendDataPoint,
} from '@yagokoro/domain';
import type { HotTopic, TimeRangeFilter, AdoptionPhase } from '@yagokoro/domain';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for hot topic detection
 */
export interface HotTopicDetectorConfig {
  /**
   * Minimum momentum score to be considered a hot topic
   * @default 20
   */
  minMomentum?: number;

  /**
   * Minimum velocity (citations/day) to be considered
   * @default 0.5
   */
  minVelocity?: number;

  /**
   * Weight factor for momentum in scoring (0-1)
   * @default 0.4
   */
  momentumWeight?: number;

  /**
   * Weight factor for velocity in scoring (0-1)
   * @default 0.3
   */
  velocityWeight?: number;

  /**
   * Weight factor for recency in scoring (0-1)
   * @default 0.2
   */
  recencyWeight?: number;

  /**
   * Weight factor for citation count in scoring (0-1)
   * @default 0.1
   */
  citationWeight?: number;

  /**
   * Number of days to consider for recency calculation
   * @default 30
   */
  recencyWindow?: number;

  /**
   * Maximum number of hot topics to return
   * @default 20
   */
  maxTopics?: number;
}

const DEFAULT_CONFIG: Required<HotTopicDetectorConfig> = {
  minMomentum: 20,
  minVelocity: 0.5,
  momentumWeight: 0.4,
  velocityWeight: 0.3,
  recencyWeight: 0.2,
  citationWeight: 0.1,
  recencyWindow: 30,
  maxTopics: 20,
};

/**
 * Detection result with analysis metadata
 */
export interface HotTopicDetectionResult {
  /** Detected hot topics */
  topics: HotTopic[];
  /** Detection timestamp */
  detectedAt: Date;
  /** Analysis summary */
  analysis: {
    /** Total candidates evaluated */
    candidatesEvaluated: number;
    /** Average momentum of detected topics */
    averageMomentum: number;
    /** Average velocity of detected topics */
    averageVelocity: number;
    /** Distribution by adoption phase */
    phaseDistribution: Record<AdoptionPhase, number>;
  };
}

// ============================================================================
// HotTopicDetector Implementation
// ============================================================================

/**
 * HotTopicDetector provides sophisticated hot topic detection
 *
 * @example
 * ```typescript
 * const detector = new HotTopicDetector(repository);
 *
 * // Detect hot topics
 * const result = await detector.detect();
 *
 * // Detect with custom settings
 * const emerging = await detector.detectEmerging({
 *   minMomentum: 50,
 *   maxTopics: 10
 * });
 * ```
 */
export class HotTopicDetector {
  private readonly config: Required<HotTopicDetectorConfig>;

  constructor(
    private readonly repository: TrendRepository,
    config?: HotTopicDetectorConfig,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Detect current hot topics
   */
  async detect(options?: {
    limit?: number;
    minMomentum?: number;
    minVelocity?: number;
  }): Promise<HotTopicDetectionResult> {
    const limit = options?.limit ?? this.config.maxTopics;
    const minMomentum = options?.minMomentum ?? this.config.minMomentum;
    const minVelocity = options?.minVelocity ?? this.config.minVelocity;

    // Get initial candidates from repository
    const rawTopics = await this.repository.getHotTopics({
      limit: limit * 3, // Get more candidates for filtering
      minMomentum: Math.max(0, minMomentum - 10), // Slightly lower threshold
    });

    // Filter and score candidates
    const candidates = rawTopics
      .filter((t) => t.momentum >= minMomentum && t.velocity >= minVelocity)
      .slice(0, limit);

    // Calculate analysis metrics
    const analysis = this.calculateAnalysis(candidates);

    return {
      topics: candidates,
      detectedAt: new Date(),
      analysis,
    };
  }

  /**
   * Detect specifically emerging topics (high growth potential)
   */
  async detectEmerging(options?: {
    limit?: number;
    minMomentum?: number;
  }): Promise<HotTopic[]> {
    const limit = options?.limit ?? 10;
    const minMomentum = options?.minMomentum ?? this.config.minMomentum * 1.5;

    const entityIds = await this.repository.getEntitiesByPhase('emerging', {
      limit: limit * 2,
    });

    if (entityIds.length === 0) return [];

    // Get metrics for emerging entities
    const metrics = await this.repository.queryDailyMetrics({
      entityIds,
      limit: entityIds.length,
      sortBy: 'momentum',
      sortOrder: 'desc',
    });

    // Group by entity and get latest
    const latestByEntity = new Map<string, DailyMetricsRecord>();
    for (const m of metrics) {
      const existing = latestByEntity.get(m.entityId);
      if (!existing || m.date > existing.date) {
        latestByEntity.set(m.entityId, m);
      }
    }

    // Filter by momentum and convert to HotTopic
    const emerging: HotTopic[] = [];
    let rank = 1;

    for (const [entityId, m] of latestByEntity) {
      if (m.momentum >= minMomentum) {
        emerging.push({
          entityId,
          entityName: entityId, // Would need entity lookup for actual name
          entityType: 'Unknown',
          momentum: m.momentum,
          velocity: m.velocity,
          citationCount: m.citationCount,
          rank: rank++,
        });
      }
      if (emerging.length >= limit) break;
    }

    return emerging.sort((a, b) => b.momentum - a.momentum);
  }

  /**
   * Detect declining topics (negative momentum)
   */
  async detectDeclining(options?: {
    limit?: number;
    maxMomentum?: number;
  }): Promise<HotTopic[]> {
    const limit = options?.limit ?? 10;
    const maxMomentum = options?.maxMomentum ?? -10;

    const entityIds = await this.repository.getEntitiesByPhase('declining', {
      limit: limit * 2,
    });

    if (entityIds.length === 0) return [];

    const metrics = await this.repository.queryDailyMetrics({
      entityIds,
      maxMomentum,
      limit: entityIds.length,
      sortBy: 'momentum',
      sortOrder: 'asc',
    });

    // Group by entity and get latest
    const latestByEntity = new Map<string, DailyMetricsRecord>();
    for (const m of metrics) {
      const existing = latestByEntity.get(m.entityId);
      if (!existing || m.date > existing.date) {
        latestByEntity.set(m.entityId, m);
      }
    }

    const declining: HotTopic[] = [];
    let rank = 1;

    for (const [entityId, m] of latestByEntity) {
      declining.push({
        entityId,
        entityName: entityId,
        entityType: 'Unknown',
        momentum: m.momentum,
        velocity: m.velocity,
        citationCount: m.citationCount,
        rank: rank++,
      });
      if (declining.length >= limit) break;
    }

    return declining.sort((a, b) => a.momentum - b.momentum);
  }

  /**
   * Detect trending topics within a specific time range
   */
  async detectInTimeRange(
    timeRange: TimeRangeFilter,
    options?: { limit?: number },
  ): Promise<HotTopic[]> {
    const limit = options?.limit ?? this.config.maxTopics;

    const metrics = await this.repository.queryDailyMetrics({
      timeRange,
      sortBy: 'momentum',
      sortOrder: 'desc',
      limit: limit * 3,
    });

    // Group by entity and calculate aggregate metrics
    const entityMetrics = new Map<
      string,
      { totalMomentum: number; totalVelocity: number; count: number; latest: DailyMetricsRecord }
    >();

    for (const m of metrics) {
      const existing = entityMetrics.get(m.entityId);
      if (existing) {
        existing.totalMomentum += m.momentum;
        existing.totalVelocity += m.velocity;
        existing.count++;
        if (m.date > existing.latest.date) {
          existing.latest = m;
        }
      } else {
        entityMetrics.set(m.entityId, {
          totalMomentum: m.momentum,
          totalVelocity: m.velocity,
          count: 1,
          latest: m,
        });
      }
    }

    // Score and sort
    const scored: Array<{ entityId: string; score: number; latest: DailyMetricsRecord }> = [];
    for (const [entityId, data] of entityMetrics) {
      const avgMomentum = data.totalMomentum / data.count;
      const avgVelocity = data.totalVelocity / data.count;
      const score = avgMomentum * this.config.momentumWeight + avgVelocity * this.config.velocityWeight;
      scored.push({ entityId, score, latest: data.latest });
    }

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map((s, index) => ({
      entityId: s.entityId,
      entityName: s.entityId,
      entityType: 'Unknown',
      momentum: s.latest.momentum,
      velocity: s.latest.velocity,
      citationCount: s.latest.citationCount,
      rank: index + 1,
    }));
  }

  /**
   * Calculate a composite "hotness" score for an entity
   */
  async calculateHotnessScore(entityId: string): Promise<number> {
    const latest = await this.repository.getLatestDailyMetrics(entityId);
    if (!latest) return 0;

    const now = new Date();
    const timeRange: TimeRangeFilter = {
      from: new Date(now.getTime() - this.config.recencyWindow * 24 * 60 * 60 * 1000),
      to: now,
    };

    const timeSeries = await this.repository.getTimeSeries(entityId, timeRange);

    return this.computeScore(latest, timeSeries, now);
  }

  /**
   * Get trending direction for an entity
   */
  async getTrendDirection(
    entityId: string,
    windowDays: number = 7,
  ): Promise<'rising' | 'falling' | 'stable'> {
    const now = new Date();
    const timeRange: TimeRangeFilter = {
      from: new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000),
      to: now,
    };

    const timeSeries = await this.repository.getTimeSeries(entityId, timeRange);

    if (timeSeries.length < 2) return 'stable';

    // Calculate trend using linear regression
    const momentums = timeSeries.map((p) => p.momentum ?? 0);
    const trend = this.calculateLinearTrend(momentums);

    if (trend > 0.5) return 'rising';
    if (trend < -0.5) return 'falling';
    return 'stable';
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private computeScore(
    metrics: DailyMetricsRecord,
    timeSeries: TrendDataPoint[],
    now: Date,
  ): number {
    // Normalize momentum (typically -100 to 100, map to 0-1)
    const normalizedMomentum = Math.max(0, Math.min(1, (metrics.momentum + 100) / 200));

    // Normalize velocity (assuming max useful velocity is 10 citations/day)
    const normalizedVelocity = Math.max(0, Math.min(1, metrics.velocity / 10));

    // Recency score based on activity in recent window
    const recencyScore = this.calculateRecencyScore(timeSeries, now);

    // Citation score (log scale, assuming max useful is 10000)
    const normalizedCitations = Math.max(0, Math.min(1, Math.log10(metrics.citationCount + 1) / 4));

    // Weighted combination
    return (
      normalizedMomentum * this.config.momentumWeight +
      normalizedVelocity * this.config.velocityWeight +
      recencyScore * this.config.recencyWeight +
      normalizedCitations * this.config.citationWeight
    );
  }

  private calculateRecencyScore(timeSeries: TrendDataPoint[], now: Date): number {
    if (timeSeries.length === 0) return 0;

    // Score based on how recently there was activity
    const latestDate = timeSeries[timeSeries.length - 1]!.date;
    const daysSinceLatest = (now.getTime() - latestDate.getTime()) / (24 * 60 * 60 * 1000);

    // Exponential decay: score = exp(-days/window)
    return Math.exp(-daysSinceLatest / this.config.recencyWindow);
  }

  private calculateLinearTrend(values: number[]): number {
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

  private calculateAnalysis(
    topics: HotTopic[],
  ): HotTopicDetectionResult['analysis'] {
    const phaseDistribution: Record<AdoptionPhase, number> = {
      emerging: 0,
      growing: 0,
      mature: 0,
      declining: 0,
    };

    // Since HotTopic doesn't have phase, we infer from momentum
    for (const topic of topics) {
      if (topic.momentum > 50) {
        phaseDistribution.emerging++;
      } else if (topic.momentum > 10) {
        phaseDistribution.growing++;
      } else if (topic.momentum > -10) {
        phaseDistribution.mature++;
      } else {
        phaseDistribution.declining++;
      }
    }

    const avgMomentum =
      topics.length > 0 ? topics.reduce((sum, t) => sum + t.momentum, 0) / topics.length : 0;

    const avgVelocity =
      topics.length > 0 ? topics.reduce((sum, t) => sum + t.velocity, 0) / topics.length : 0;

    return {
      candidatesEvaluated: topics.length,
      averageMomentum: avgMomentum,
      averageVelocity: avgVelocity,
      phaseDistribution,
    };
  }
}
