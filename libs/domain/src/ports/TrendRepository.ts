/**
 * TrendRepository Port
 *
 * Defines the interface for persisting and retrieving trend data.
 * REQ-004-01: Store temporal metadata for all entities
 * REQ-004-04: Trend metrics calculation
 *
 * @packageDocumentation
 */

import type {
  HotTopic,
  TimeRangeFilter,
  TemporalQueryOptions,
  AdoptionPhase,
} from '../entities/temporal.js';

/**
 * Daily metrics data for saving (DB-focused structure)
 */
export interface DailyMetricsInput {
  /** Date of the metrics */
  date: Date;
  /** Citation count */
  citationCount: number;
  /** Citation velocity (citations/day) */
  velocity: number;
  /** Momentum (% change) */
  momentum: number;
  /** Adoption phase */
  adoptionPhase: AdoptionPhase;
  /** Rank (optional) */
  rank?: number;
}

/**
 * Options for saving trend metrics
 */
export interface SaveTrendMetricsOptions {
  /** Entity ID */
  entityId: string;
  /** Daily metrics data */
  metrics: DailyMetricsInput;
}

/**
 * Options for querying trends
 */
export interface TrendQueryOptions {
  /** Entity IDs to query (optional - if not provided, queries all) */
  entityIds?: string[];
  /** Time range filter */
  timeRange?: TimeRangeFilter;
  /** Adoption phase filter */
  adoptionPhase?: AdoptionPhase;
  /** Minimum momentum value */
  minMomentum?: number;
  /** Maximum momentum value */
  maxMomentum?: number;
  /** Sort field */
  sortBy?: 'momentum' | 'velocity' | 'citationCount' | 'date';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Result limit */
  limit?: number;
  /** Result offset */
  offset?: number;
}

/**
 * Options for saving trend snapshots
 */
export interface SaveSnapshotOptions {
  /** Snapshot date */
  date: Date;
  /** Total entities analyzed */
  totalEntities: number;
  /** Hot topics detected */
  hotTopics: HotTopic[];
  /** Summary statistics */
  summary?: {
    emergingCount: number;
    growingCount: number;
    matureCount: number;
    decliningCount: number;
  };
}

/**
 * Trend snapshot for retrieval (different from domain TrendSnapshot)
 */
export interface TrendSnapshotRecord {
  /** Snapshot ID */
  id: string;
  /** Capture timestamp */
  capturedAt: Date;
  /** Total entities */
  totalEntities: number;
  /** Summary */
  summary: {
    emergingCount: number;
    growingCount: number;
    matureCount: number;
    decliningCount: number;
  };
  /** Hot topics (loaded separately) */
  hotTopics: HotTopic[];
}

/**
 * Daily metrics record from DB
 */
export interface DailyMetricsRecord {
  /** Entity ID */
  entityId: string;
  /** Date */
  date: Date;
  /** Citation count */
  citationCount: number;
  /** Velocity */
  velocity: number;
  /** Momentum */
  momentum: number;
  /** Adoption phase */
  adoptionPhase: AdoptionPhase;
  /** Rank */
  rank: number;
}

/**
 * Time series data point for trend analysis
 */
export interface TrendDataPoint {
  /** Date of the data point */
  date: Date;
  /** Citation count at this date */
  citationCount: number;
  /** Velocity at this date */
  velocity?: number;
  /** Momentum at this date */
  momentum?: number;
}

/**
 * Trend Repository Port (Output Port)
 *
 * Defines the interface for persisting and retrieving trend-related data
 * from the knowledge graph. This is implemented by Neo4j adapter.
 *
 * @example
 * ```typescript
 * const repository: TrendRepository = new Neo4jTrendRepository(connection);
 *
 * // Save daily metrics
 * await repository.saveTrendMetrics({
 *   entityId: 'entity-1',
 *   metrics: { date: new Date(), citationCount: 100, velocity: 0.5, momentum: 10 }
 * });
 *
 * // Query hot topics
 * const hotTopics = await repository.getHotTopics({ limit: 10 });
 * ```
 */
export interface TrendRepository {
  // ============================================
  // Trend Metrics Operations
  // ============================================

  /**
   * Save trend metrics for an entity
   * REQ-004-04: Calculate and store trend metrics
   *
   * @param options - Entity ID and metrics to save
   */
  saveTrendMetrics(options: SaveTrendMetricsOptions): Promise<void>;

  /**
   * Save multiple trend metrics in batch
   *
   * @param items - Array of entity IDs and metrics
   */
  saveTrendMetricsBatch(items: SaveTrendMetricsOptions[]): Promise<void>;

  /**
   * Query daily metrics with filters
   *
   * @param options - Query options
   * @returns Matching daily metrics records
   */
  queryDailyMetrics(options: TrendQueryOptions): Promise<DailyMetricsRecord[]>;

  // ============================================
  // Time Series Operations
  // ============================================

  /**
   * Get time series data for an entity
   * REQ-004-06: Support time range filtering
   *
   * @param entityId - Entity ID
   * @param timeRange - Time range to query
   * @returns Time series data points
   */
  getTimeSeries(entityId: string, timeRange: TimeRangeFilter): Promise<TrendDataPoint[]>;

  /**
   * Get aggregated time series (daily, weekly, monthly)
   *
   * @param entityId - Entity ID
   * @param timeRange - Time range
   * @param granularity - Aggregation granularity
   * @returns Aggregated data points
   */
  getAggregatedTimeSeries(
    entityId: string,
    timeRange: TimeRangeFilter,
    granularity: 'day' | 'week' | 'month',
  ): Promise<TrendDataPoint[]>;

  // ============================================
  // Hot Topics / Snapshot Operations
  // ============================================

  /**
   * Save a trend snapshot (point-in-time analysis)
   * REQ-004-03: Generate trend snapshots
   *
   * @param options - Snapshot data
   * @returns Snapshot ID
   */
  saveSnapshot(options: SaveSnapshotOptions): Promise<string>;

  /**
   * Get latest trend snapshot
   *
   * @returns Latest snapshot or null
   */
  getLatestSnapshot(): Promise<TrendSnapshotRecord | null>;

  /**
   * Get snapshot by ID
   *
   * @param snapshotId - Snapshot ID
   * @returns Snapshot or null
   */
  getSnapshot(snapshotId: string): Promise<TrendSnapshotRecord | null>;

  /**
   * Get daily metrics records for an entity
   *
   * @param entityId - Entity ID
   * @param options - Query options
   * @returns Daily metrics records
   */
  getDailyMetrics(entityId: string, options?: TemporalQueryOptions): Promise<DailyMetricsRecord[]>;

  /**
   * Get latest daily metrics for an entity
   *
   * @param entityId - Entity ID
   * @returns Latest daily metrics or null
   */
  getLatestDailyMetrics(entityId: string): Promise<DailyMetricsRecord | null>;

  /**
   * Get hot topics from latest snapshot or calculate fresh
   * REQ-004-07: Detect hot topics
   *
   * @param options - Query options
   * @returns Hot topics list
   */
  getHotTopics(options?: { limit?: number; minMomentum?: number }): Promise<HotTopic[]>;

  // ============================================
  // Adoption Phase Operations
  // ============================================

  /**
   * Get entities by adoption phase
   * REQ-004-07: Query by adoption phase
   *
   * @param phase - Adoption phase to filter
   * @param options - Query options
   * @returns Entity IDs in the specified phase
   */
  getEntitiesByPhase(
    phase: AdoptionPhase,
    options?: { limit?: number; offset?: number },
  ): Promise<string[]>;

  /**
   * Get adoption phase distribution
   *
   * @returns Count of entities in each phase
   */
  getPhaseDistribution(): Promise<Record<AdoptionPhase, number>>;

  /**
   * Update adoption phase for an entity
   *
   * @param entityId - Entity ID
   * @param phase - New adoption phase
   */
  updateAdoptionPhase(entityId: string, phase: AdoptionPhase): Promise<void>;

  // ============================================
  // Statistics Operations
  // ============================================

  /**
   * Get trend statistics for a time period
   *
   * @param timeRange - Time range
   * @returns Statistics object
   */
  getStatistics(timeRange: TimeRangeFilter): Promise<{
    totalEntities: number;
    avgMomentum: number;
    avgVelocity: number;
    phaseDistribution: Record<AdoptionPhase, number>;
    topGainers: Array<{ entityId: string; momentum: number }>;
    topDecliners: Array<{ entityId: string; momentum: number }>;
  }>;
}
