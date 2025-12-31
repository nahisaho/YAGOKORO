/**
 * Neo4j Trend Repository Implementation
 *
 * Implements the TrendRepository port for Neo4j graph database.
 * REQ-004-01〜07: Temporal metadata and trend analysis
 *
 * @packageDocumentation
 */

import type {
  TrendRepository,
  TrendQueryOptions,
  SaveTrendMetricsOptions,
  SaveSnapshotOptions,
  TrendDataPoint,
  TrendSnapshotRecord,
  DailyMetricsRecord,
} from '@yagokoro/domain';
import type {
  HotTopic,
  TimeRangeFilter,
  TemporalQueryOptions,
  AdoptionPhase,
} from '@yagokoro/domain';
import type { Neo4jConnection } from '../connection/Neo4jConnection.js';
import { CypherQueryBuilder } from '../queries/CypherQueryBuilder.js';
import { resolveTimeRange } from '@yagokoro/domain';

/**
 * Generate unique snapshot ID
 */
function generateSnapshotId(): string {
  return `snapshot-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Convert Date to Neo4j date string
 */
function toNeo4jDate(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

/**
 * Convert Neo4j date to JS Date
 */
function fromNeo4jDate(
  neo4jDate: { year: { low: number }; month: { low: number }; day: { low: number } } | string,
): Date {
  if (typeof neo4jDate === 'string') {
    return new Date(neo4jDate);
  }
  return new Date(neo4jDate.year.low, neo4jDate.month.low - 1, neo4jDate.day.low);
}

/**
 * Neo4j Trend Repository
 *
 * Provides persistence for trend metrics, snapshots, and time-series data.
 */
export class Neo4jTrendRepository implements TrendRepository {
  constructor(private readonly connection: Neo4jConnection) {}

  // ============================================
  // Trend Metrics Operations
  // ============================================

  async saveTrendMetrics(options: SaveTrendMetricsOptions): Promise<void> {
    const { entityId, metrics } = options;
    const dateStr = toNeo4jDate(metrics.date);

    const query = new CypherQueryBuilder()
      .merge('(tm:TrendMetrics {entityId: $entityId, date: date($date)})')
      .onCreateSet(
        'tm.citationCount = $citationCount, tm.velocity = $velocity, tm.momentum = $momentum, tm.adoptionPhase = $adoptionPhase, tm.rank = $rank, tm.createdAt = datetime()',
      )
      .onMatchSet(
        'tm.citationCount = $citationCount, tm.velocity = $velocity, tm.momentum = $momentum, tm.adoptionPhase = $adoptionPhase, tm.rank = $rank, tm.updatedAt = datetime()',
      )
      .param('entityId', entityId)
      .param('date', dateStr)
      .param('citationCount', metrics.citationCount)
      .param('velocity', metrics.velocity)
      .param('momentum', metrics.momentum)
      .param('adoptionPhase', metrics.adoptionPhase)
      .param('rank', metrics.rank ?? 0)
      .return('tm')
      .build();

    await this.connection.executeWrite(query.text, query.params);

    // Also link to entity if exists
    const linkQuery = new CypherQueryBuilder()
      .match('(e {id: $entityId})')
      .match('(tm:TrendMetrics {entityId: $entityId, date: date($date)})')
      .merge('(e)-[:HAS_TREND]->(tm)')
      .param('entityId', entityId)
      .param('date', dateStr)
      .return('e, tm')
      .build();

    await this.connection.executeWrite(linkQuery.text, linkQuery.params);
  }

  async saveTrendMetricsBatch(items: SaveTrendMetricsOptions[]): Promise<void> {
    if (items.length === 0) return;

    const batchData = items.map((item) => ({
      entityId: item.entityId,
      date: toNeo4jDate(item.metrics.date),
      citationCount: item.metrics.citationCount,
      velocity: item.metrics.velocity,
      momentum: item.metrics.momentum,
      adoptionPhase: item.metrics.adoptionPhase,
      rank: item.metrics.rank ?? 0,
    }));

    const query = new CypherQueryBuilder()
      .unwind('$items AS item')
      .merge('(tm:TrendMetrics {entityId: item.entityId, date: date(item.date)})')
      .onCreateSet(
        'tm.citationCount = item.citationCount, tm.velocity = item.velocity, tm.momentum = item.momentum, tm.adoptionPhase = item.adoptionPhase, tm.rank = item.rank, tm.createdAt = datetime()',
      )
      .onMatchSet(
        'tm.citationCount = item.citationCount, tm.velocity = item.velocity, tm.momentum = item.momentum, tm.adoptionPhase = item.adoptionPhase, tm.rank = item.rank, tm.updatedAt = datetime()',
      )
      .param('items', batchData)
      .return('count(tm) as saved')
      .build();

    await this.connection.executeWrite(query.text, query.params);
  }

  async getDailyMetrics(
    entityId: string,
    options?: TemporalQueryOptions,
  ): Promise<DailyMetricsRecord[]> {
    const builder = new CypherQueryBuilder()
      .match('(tm:TrendMetrics {entityId: $entityId})')
      .param('entityId', entityId);

    if (options?.timeRange) {
      const { from, to } = resolveTimeRange(options.timeRange);
      builder
        .where('tm.date >= date($startDate) AND tm.date <= date($endDate)')
        .param('startDate', toNeo4jDate(from))
        .param('endDate', toNeo4jDate(to));
    }

    const sortField = options?.sortBy === 'date' ? 'tm.date' : `tm.${options?.sortBy ?? 'date'}`;
    const sortDir = options?.sortOrder === 'asc' ? 'ASC' : 'DESC';

    builder.return('tm').orderBy(`${sortField} ${sortDir}`);

    if (options?.limit) builder.limit(options.limit);
    if (options?.offset) builder.skip(options.offset);

    const query = builder.build();
    const results = await this.connection.executeRead<{
      tm: { properties: Record<string, unknown> };
    }>(query.text, query.params);

    return results.map((r) => this.mapToDailyMetrics(r.tm.properties));
  }

  async getLatestDailyMetrics(entityId: string): Promise<DailyMetricsRecord | null> {
    const query = new CypherQueryBuilder()
      .match('(tm:TrendMetrics {entityId: $entityId})')
      .param('entityId', entityId)
      .return('tm')
      .orderBy('tm.date DESC')
      .limit(1)
      .build();

    const results = await this.connection.executeRead<{
      tm: { properties: Record<string, unknown> };
    }>(query.text, query.params);

    if (results.length === 0) return null;
    return this.mapToDailyMetrics(results[0]!.tm.properties);
  }

  async queryDailyMetrics(options: TrendQueryOptions): Promise<DailyMetricsRecord[]> {
    const builder = new CypherQueryBuilder().match('(tm:TrendMetrics)');

    const conditions: string[] = [];

    if (options.entityIds && options.entityIds.length > 0) {
      conditions.push('tm.entityId IN $entityIds');
      builder.param('entityIds', options.entityIds);
    }

    if (options.timeRange) {
      const { from, to } = resolveTimeRange(options.timeRange);
      conditions.push('tm.date >= date($startDate) AND tm.date <= date($endDate)');
      builder.param('startDate', toNeo4jDate(from));
      builder.param('endDate', toNeo4jDate(to));
    }

    if (options.adoptionPhase) {
      conditions.push('tm.adoptionPhase = $adoptionPhase');
      builder.param('adoptionPhase', options.adoptionPhase);
    }

    if (options.minMomentum !== undefined) {
      conditions.push('tm.momentum >= $minMomentum');
      builder.param('minMomentum', options.minMomentum);
    }

    if (options.maxMomentum !== undefined) {
      conditions.push('tm.momentum <= $maxMomentum');
      builder.param('maxMomentum', options.maxMomentum);
    }

    if (conditions.length > 0) {
      builder.where(conditions.join(' AND '));
    }

    const sortField = options.sortBy ? `tm.${options.sortBy}` : 'tm.date';
    const sortDir = options.sortOrder === 'asc' ? 'ASC' : 'DESC';
    builder.return('tm').orderBy(`${sortField} ${sortDir}`);

    if (options.limit) builder.limit(options.limit);
    if (options.offset) builder.skip(options.offset);

    const query = builder.build();
    const results = await this.connection.executeRead<{
      tm: { properties: Record<string, unknown> };
    }>(query.text, query.params);

    return results.map((r) => this.mapToDailyMetrics(r.tm.properties));
  }

  // ============================================
  // Time Series Operations
  // ============================================

  async getTimeSeries(entityId: string, timeRange: TimeRangeFilter): Promise<TrendDataPoint[]> {
    const { from, to } = resolveTimeRange(timeRange);

    const query = new CypherQueryBuilder()
      .match('(tm:TrendMetrics {entityId: $entityId})')
      .where('tm.date >= date($startDate) AND tm.date <= date($endDate)')
      .param('entityId', entityId)
      .param('startDate', toNeo4jDate(from))
      .param('endDate', toNeo4jDate(to))
      .return(
        'tm.date as date, tm.citationCount as citationCount, tm.velocity as velocity, tm.momentum as momentum',
      )
      .orderBy('tm.date ASC')
      .build();

    const results = await this.connection.executeRead<{
      date: { year: { low: number }; month: { low: number }; day: { low: number } };
      citationCount: number;
      velocity: number;
      momentum: number;
    }>(query.text, query.params);

    return results.map((r) => ({
      date: fromNeo4jDate(r.date),
      citationCount: r.citationCount,
      velocity: r.velocity,
      momentum: r.momentum,
    }));
  }

  async getAggregatedTimeSeries(
    entityId: string,
    timeRange: TimeRangeFilter,
    granularity: 'day' | 'week' | 'month',
  ): Promise<TrendDataPoint[]> {
    const { from, to } = resolveTimeRange(timeRange);

    let dateExpr: string;
    switch (granularity) {
      case 'week':
        dateExpr = 'date.truncate("week", tm.date)';
        break;
      case 'month':
        dateExpr = 'date.truncate("month", tm.date)';
        break;
      default:
        dateExpr = 'tm.date';
    }

    const query = new CypherQueryBuilder()
      .match('(tm:TrendMetrics {entityId: $entityId})')
      .where('tm.date >= date($startDate) AND tm.date <= date($endDate)')
      .param('entityId', entityId)
      .param('startDate', toNeo4jDate(from))
      .param('endDate', toNeo4jDate(to))
      .with(`${dateExpr} as period, tm`)
      .return(
        'period as date, avg(tm.citationCount) as citationCount, avg(tm.velocity) as velocity, avg(tm.momentum) as momentum',
      )
      .orderBy('period ASC')
      .build();

    const results = await this.connection.executeRead<{
      date: { year: { low: number }; month: { low: number }; day: { low: number } };
      citationCount: number;
      velocity: number;
      momentum: number;
    }>(query.text, query.params);

    return results.map((r) => ({
      date: fromNeo4jDate(r.date),
      citationCount: Math.round(r.citationCount),
      velocity: r.velocity,
      momentum: r.momentum,
    }));
  }

  // ============================================
  // Hot Topics / Snapshot Operations
  // ============================================

  async saveSnapshot(options: SaveSnapshotOptions): Promise<string> {
    const snapshotId = generateSnapshotId();

    // Create snapshot node
    const createQuery = new CypherQueryBuilder()
      .create(
        '(ts:TrendSnapshot {id: $id, capturedAt: datetime($date), totalEntities: $totalEntities, emergingCount: $emergingCount, growingCount: $growingCount, matureCount: $matureCount, decliningCount: $decliningCount})',
      )
      .param('id', snapshotId)
      .param('date', options.date.toISOString())
      .param('totalEntities', options.totalEntities)
      .param('emergingCount', options.summary?.emergingCount ?? 0)
      .param('growingCount', options.summary?.growingCount ?? 0)
      .param('matureCount', options.summary?.matureCount ?? 0)
      .param('decliningCount', options.summary?.decliningCount ?? 0)
      .return('ts')
      .build();

    await this.connection.executeWrite(createQuery.text, createQuery.params);

    // Create hot topic relationships
    if (options.hotTopics.length > 0) {
      const hotTopicData = options.hotTopics.map((ht, index) => ({
        entityId: ht.entityId,
        entityName: ht.entityName,
        momentum: ht.momentum,
        rank: ht.rank ?? index + 1,
        velocity: ht.velocity,
        citationCount: ht.citationCount,
      }));

      const hotTopicQuery = new CypherQueryBuilder()
        .match('(ts:TrendSnapshot {id: $snapshotId})')
        .unwind('$hotTopics AS ht')
        .merge('(e {id: ht.entityId})')
        .create('(ts)-[:HOT_TOPIC {rank: ht.rank, momentum: ht.momentum, velocity: ht.velocity}]->(e)')
        .param('snapshotId', snapshotId)
        .param('hotTopics', hotTopicData)
        .return('count(*) as linked')
        .build();

      await this.connection.executeWrite(hotTopicQuery.text, hotTopicQuery.params);
    }

    return snapshotId;
  }

  async getLatestSnapshot(): Promise<TrendSnapshotRecord | null> {
    const query = new CypherQueryBuilder()
      .match('(ts:TrendSnapshot)')
      .return('ts')
      .orderBy('ts.capturedAt DESC')
      .limit(1)
      .build();

    const results = await this.connection.executeRead<{
      ts: { properties: Record<string, unknown> };
    }>(query.text, query.params);

    if (results.length === 0) return null;
    return this.mapToSnapshot(results[0]!.ts.properties);
  }

  async getSnapshot(snapshotId: string): Promise<TrendSnapshotRecord | null> {
    const query = new CypherQueryBuilder()
      .match('(ts:TrendSnapshot {id: $id})')
      .param('id', snapshotId)
      .return('ts')
      .build();

    const results = await this.connection.executeRead<{
      ts: { properties: Record<string, unknown> };
    }>(query.text, query.params);

    if (results.length === 0) return null;
    return this.mapToSnapshot(results[0]!.ts.properties);
  }

  async getHotTopics(options?: { limit?: number; minMomentum?: number }): Promise<HotTopic[]> {
    const limit = options?.limit ?? 10;
    const minMomentum = options?.minMomentum ?? 0;

    // Get hot topics from latest snapshot or calculate from recent metrics
    const query = new CypherQueryBuilder()
      .match('(tm:TrendMetrics)')
      .where('tm.momentum >= $minMomentum')
      .param('minMomentum', minMomentum)
      .with('tm.entityId as entityId, max(tm.date) as latestDate')
      .match('(tm2:TrendMetrics {entityId: entityId, date: latestDate})')
      .optionalMatch('(e {id: entityId})')
      .return(
        "entityId, coalesce(e.name, entityId) as entityName, coalesce(labels(e)[0], 'Unknown') as entityType, tm2.momentum as momentum, tm2.velocity as velocity, tm2.citationCount as citationCount, tm2.adoptionPhase as adoptionPhase",
      )
      .orderBy('tm2.momentum DESC')
      .limit(limit)
      .build();

    const results = await this.connection.executeRead<{
      entityId: string;
      entityName: string;
      entityType: string;
      momentum: number;
      velocity: number;
      citationCount: number;
      adoptionPhase: string;
    }>(query.text, query.params);

    return results.map((r, index) => ({
      entityId: r.entityId,
      entityName: r.entityName,
      entityType: r.entityType,
      momentum: r.momentum,
      velocity: r.velocity,
      citationCount: r.citationCount,
      rank: index + 1,
    }));
  }

  // ============================================
  // Adoption Phase Operations
  // ============================================

  async getEntitiesByPhase(
    phase: AdoptionPhase,
    options?: { limit?: number; offset?: number },
  ): Promise<string[]> {
    const builder = new CypherQueryBuilder()
      .match('(tm:TrendMetrics)')
      .where('tm.adoptionPhase = $phase')
      .param('phase', phase)
      .with('tm.entityId as entityId, max(tm.date) as latestDate')
      .return('entityId');

    if (options?.offset) builder.skip(options.offset);
    if (options?.limit) builder.limit(options.limit);

    const query = builder.build();
    const results = await this.connection.executeRead<{ entityId: string }>(
      query.text,
      query.params,
    );

    return results.map((r) => r.entityId);
  }

  async getPhaseDistribution(): Promise<Record<AdoptionPhase, number>> {
    const query = new CypherQueryBuilder()
      .match('(tm:TrendMetrics)')
      .with('tm.entityId as entityId, max(tm.date) as latestDate')
      .match('(tm2:TrendMetrics {entityId: entityId, date: latestDate})')
      .return('tm2.adoptionPhase as phase, count(distinct entityId) as count')
      .build();

    const results = await this.connection.executeRead<{ phase: string; count: number }>(
      query.text,
      query.params,
    );

    const distribution: Record<AdoptionPhase, number> = {
      emerging: 0,
      growing: 0,
      mature: 0,
      declining: 0,
    };

    for (const r of results) {
      if (r.phase in distribution) {
        distribution[r.phase as AdoptionPhase] = r.count;
      }
    }

    return distribution;
  }

  async updateAdoptionPhase(entityId: string, phase: AdoptionPhase): Promise<void> {
    const query = new CypherQueryBuilder()
      .match('(e {id: $entityId})')
      .set('e.adoptionPhase = $phase')
      .param('entityId', entityId)
      .param('phase', phase)
      .return('e')
      .build();

    await this.connection.executeWrite(query.text, query.params);
  }

  // ============================================
  // Statistics Operations
  // ============================================

  async getStatistics(timeRange: TimeRangeFilter): Promise<{
    totalEntities: number;
    avgMomentum: number;
    avgVelocity: number;
    phaseDistribution: Record<AdoptionPhase, number>;
    topGainers: Array<{ entityId: string; momentum: number }>;
    topDecliners: Array<{ entityId: string; momentum: number }>;
  }> {
    const { from, to } = resolveTimeRange(timeRange);

    // Basic stats query
    const statsQuery = new CypherQueryBuilder()
      .match('(tm:TrendMetrics)')
      .where('tm.date >= date($startDate) AND tm.date <= date($endDate)')
      .param('startDate', toNeo4jDate(from))
      .param('endDate', toNeo4jDate(to))
      .return(
        'count(distinct tm.entityId) as totalEntities, avg(tm.momentum) as avgMomentum, avg(tm.velocity) as avgVelocity',
      )
      .build();

    const statsResults = await this.connection.executeRead<{
      totalEntities: number;
      avgMomentum: number;
      avgVelocity: number;
    }>(statsQuery.text, statsQuery.params);

    const stats = statsResults[0] ?? { totalEntities: 0, avgMomentum: 0, avgVelocity: 0 };

    // Phase distribution
    const phaseDistribution = await this.getPhaseDistribution();

    // Top gainers
    const gainersQuery = new CypherQueryBuilder()
      .match('(tm:TrendMetrics)')
      .where('tm.date >= date($startDate) AND tm.date <= date($endDate) AND tm.momentum > 0')
      .param('startDate', toNeo4jDate(from))
      .param('endDate', toNeo4jDate(to))
      .with('tm.entityId as entityId, max(tm.momentum) as momentum')
      .return('entityId, momentum')
      .orderBy('momentum DESC')
      .limit(10)
      .build();

    const gainersResults = await this.connection.executeRead<{
      entityId: string;
      momentum: number;
    }>(gainersQuery.text, gainersQuery.params);

    // Top decliners
    const declinersQuery = new CypherQueryBuilder()
      .match('(tm:TrendMetrics)')
      .where('tm.date >= date($startDate) AND tm.date <= date($endDate) AND tm.momentum < 0')
      .param('startDate', toNeo4jDate(from))
      .param('endDate', toNeo4jDate(to))
      .with('tm.entityId as entityId, min(tm.momentum) as momentum')
      .return('entityId, momentum')
      .orderBy('momentum ASC')
      .limit(10)
      .build();

    const declinersResults = await this.connection.executeRead<{
      entityId: string;
      momentum: number;
    }>(declinersQuery.text, declinersQuery.params);

    return {
      totalEntities: stats.totalEntities,
      avgMomentum: stats.avgMomentum,
      avgVelocity: stats.avgVelocity,
      phaseDistribution,
      topGainers: gainersResults,
      topDecliners: declinersResults,
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  private mapToDailyMetrics(props: Record<string, unknown>): DailyMetricsRecord {
    return {
      entityId: props.entityId as string,
      date: fromNeo4jDate(
        props.date as { year: { low: number }; month: { low: number }; day: { low: number } } | string,
      ),
      citationCount: (props.citationCount as number) ?? 0,
      velocity: (props.velocity as number) ?? 0,
      momentum: (props.momentum as number) ?? 0,
      adoptionPhase: (props.adoptionPhase as AdoptionPhase) ?? 'emerging',
      rank: (props.rank as number) ?? 0,
    };
  }

  private mapToSnapshot(props: Record<string, unknown>): TrendSnapshotRecord {
    return {
      id: props.id as string,
      capturedAt: new Date(props.capturedAt as string),
      totalEntities: (props.totalEntities as number) ?? 0,
      summary: {
        emergingCount: (props.emergingCount as number) ?? 0,
        growingCount: (props.growingCount as number) ?? 0,
        matureCount: (props.matureCount as number) ?? 0,
        decliningCount: (props.decliningCount as number) ?? 0,
      },
      hotTopics: [], // Hot topics loaded separately
    };
  }
}
