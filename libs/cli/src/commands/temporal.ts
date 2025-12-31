/**
 * @fileoverview CLI Temporal Command
 * T-401: temporal CLI コマンド実装 (Article II 準拠)
 *
 * Commands:
 * - yagokoro temporal trends [--period] [--top] [--format]
 * - yagokoro temporal timeline <entityId> [--range] [--granularity] [--format]
 * - yagokoro temporal hot-topics [--limit] [--min-momentum] [--format]
 * - yagokoro temporal forecast <entityId> [--horizon] [--format]
 * - yagokoro temporal phases [--phase] [--limit] [--format]
 * - yagokoro temporal stats [--range] [--format]
 * - yagokoro temporal snapshot [--format]
 */

import { Command } from 'commander';

// ============ Types ============

/**
 * Adoption phase type (matching @yagokoro/domain)
 */
export type AdoptionPhase = 'emerging' | 'growing' | 'mature' | 'declining';

/**
 * Trend direction type
 */
export type TrendDirection = 'rising' | 'stable' | 'declining' | 'up' | 'down';

/**
 * Output format type
 */
export type OutputFormat = 'json' | 'table' | 'yaml';

/**
 * Time range preset type
 */
export type TimeRangePreset =
  | 'last-week'
  | 'last-month'
  | 'last-quarter'
  | 'last-year'
  | 'all-time';

/**
 * Granularity type
 */
export type Granularity = 'day' | 'week' | 'month';

/**
 * CLI daily metrics record
 */
export interface CLIDailyMetrics {
  entityId: string;
  date: string;
  citationCount: number;
  velocity: number;
  momentum: number;
  adoptionPhase: AdoptionPhase;
  rank: number;
}

/**
 * CLI trend analysis result
 */
export interface CLITrendAnalysisResult {
  entityId: string;
  period: { from: string; to: string };
  metrics: CLIDailyMetrics[];
  summary: {
    avgMomentum: number;
    avgVelocity: number;
    currentPhase: AdoptionPhase;
    trend: TrendDirection;
  };
}

/**
 * CLI trend data point
 */
export interface CLITrendDataPoint {
  date: string;
  citationCount: number;
  momentum: number;
  velocity: number;
}

/**
 * CLI timeline result
 */
export interface CLITimelineResult {
  entityId: string;
  timeRange: { from: string; to: string };
  granularity: Granularity;
  dataPoints: CLITrendDataPoint[];
}

/**
 * CLI hot topic
 */
export interface CLIHotTopic {
  entityId: string;
  entityName: string;
  momentum: number;
  velocity: number;
  citationCount: number;
  adoptionPhase: AdoptionPhase;
  rank: number;
}

/**
 * CLI hot topics result
 */
export interface CLIHotTopicsResult {
  capturedAt: string;
  topics: CLIHotTopic[];
  summary: {
    totalEmerging: number;
    avgMomentum: number;
    topField?: string;
  };
}

/**
 * CLI trend forecast prediction
 */
export interface CLIForecastPrediction {
  date: string;
  predictedCitations: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

/**
 * CLI trend forecast result
 */
export interface CLITrendForecast {
  entityId: string;
  entityName: string;
  forecastStart: string;
  forecastEnd: string;
  predictions: CLIForecastPrediction[];
  trendDirection: TrendDirection;
  confidence: number;
  model: string;
}

/**
 * CLI temporal statistics
 */
export interface CLITemporalStatistics {
  timeRange: { from: string; to: string };
  totalEntities: number;
  avgMomentum: number;
  avgVelocity: number;
  phaseDistribution: Record<AdoptionPhase, number>;
  topGainers: Array<{ entityId: string; momentum: number }>;
  topDecliners: Array<{ entityId: string; momentum: number }>;
}

/**
 * CLI trend snapshot
 */
export interface CLITrendSnapshot {
  id: string;
  date: string;
  totalEntities: number;
  hotTopics: CLIHotTopic[];
  summary: {
    emergingCount: number;
    growingCount: number;
    matureCount: number;
    decliningCount: number;
  };
}

/**
 * Temporal service interface for CLI
 */
export interface TemporalService {
  /** Analyze trends for a period */
  analyzeTrends(options: {
    period?: TimeRangePreset | { from: Date; to: Date };
    top?: number;
  }): Promise<CLITrendAnalysisResult[]>;

  /** Get timeline for an entity */
  getTimeline(
    entityId: string,
    options: {
      timeRange: TimeRangePreset | { from: Date; to: Date };
      granularity?: Granularity;
    }
  ): Promise<CLITimelineResult>;

  /** Detect hot topics */
  detectHotTopics(options?: {
    limit?: number;
    minMomentum?: number;
  }): Promise<CLIHotTopicsResult>;

  /** Forecast trend for an entity */
  forecast(entityId: string, horizon?: number): Promise<CLITrendForecast>;

  /** Get entities by phase */
  getEntitiesByPhase(
    phase: AdoptionPhase,
    options?: { limit?: number }
  ): Promise<string[]>;

  /** Get phase distribution */
  getPhaseDistribution(): Promise<Record<AdoptionPhase, number>>;

  /** Get statistics for a time range */
  getStatistics(
    timeRange: TimeRangePreset | { from: Date; to: Date }
  ): Promise<CLITemporalStatistics>;

  /** Create snapshot */
  createSnapshot(): Promise<string>;

  /** Get latest snapshot */
  getLatestSnapshot(): Promise<CLITrendSnapshot | null>;
}

// ============ Options Types ============

export interface TrendsOptions {
  period?: string;
  top?: string;
  format?: string;
}

export interface TimelineOptions {
  range?: string;
  granularity?: string;
  format?: string;
}

export interface HotTopicsOptions {
  limit?: string;
  minMomentum?: string;
  format?: string;
}

export interface ForecastOptions {
  horizon?: string;
  format?: string;
}

export interface PhasesOptions {
  phase?: string;
  limit?: string;
  format?: string;
}

export interface StatsOptions {
  range?: string;
  format?: string;
}

export interface SnapshotOptions {
  format?: string;
}

// ============ Helper Functions ============

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return `Error: ${String(error)}`;
}

function parseTimeRange(
  range: string | undefined,
  defaultValue: TimeRangePreset = 'last-month'
): TimeRangePreset | { from: Date; to: Date } {
  if (!range) return defaultValue;

  const presets: TimeRangePreset[] = [
    'last-week',
    'last-month',
    'last-quarter',
    'last-year',
    'all-time',
  ];

  if (presets.includes(range as TimeRangePreset)) {
    return range as TimeRangePreset;
  }

  // Try to parse custom range "YYYY-MM-DD:YYYY-MM-DD"
  const parts = range.split(':');
  if (parts.length === 2) {
    const from = new Date(parts[0]!);
    const to = new Date(parts[1]!);
    if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
      return { from, to };
    }
  }

  return defaultValue;
}

// ============ Output Formatters ============

const PHASE_LABELS: Record<AdoptionPhase, { en: string; ja: string; emoji: string }> = {
  emerging: { en: 'Emerging', ja: '新興期', emoji: '🌱' },
  growing: { en: 'Growing', ja: '成長期', emoji: '📈' },
  mature: { en: 'Mature', ja: '成熟期', emoji: '🏆' },
  declining: { en: 'Declining', ja: '衰退期', emoji: '📉' },
};

const TREND_LABELS: Record<TrendDirection, { label: string; emoji: string }> = {
  rising: { label: '上昇', emoji: '↗️' },
  up: { label: '上昇', emoji: '↗️' },
  stable: { label: '安定', emoji: '→' },
  declining: { label: '下降', emoji: '↘️' },
  down: { label: '下降', emoji: '↘️' },
};

function formatPhase(phase: AdoptionPhase): string {
  const label = PHASE_LABELS[phase];
  return `${label.emoji} ${label.ja} (${label.en})`;
}

function formatTrend(direction: TrendDirection): string {
  const label = TREND_LABELS[direction];
  return `${label.emoji} ${label.label}`;
}

function formatNumber(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function printTrendsTable(results: CLITrendAnalysisResult[]): void {
  console.log('\n📊 トレンド分析結果\n');

  if (results.length === 0) {
    console.log('  データがありません');
    return;
  }

  console.log('┌────────────────────────────────────┬──────────┬──────────┬────────────┬──────────┐');
  console.log('│ Entity ID                          │ Momentum │ Velocity │ Phase      │ Trend    │');
  console.log('├────────────────────────────────────┼──────────┼──────────┼────────────┼──────────┤');

  for (const result of results) {
    const entityId = result.entityId.slice(0, 34).padEnd(34);
    const momentum = formatNumber(result.summary.avgMomentum).padStart(8);
    const velocity = formatNumber(result.summary.avgVelocity).padStart(8);
    const phase = PHASE_LABELS[result.summary.currentPhase].ja.padEnd(10);
    const trend = TREND_LABELS[result.summary.trend].label.padEnd(8);

    console.log(`│ ${entityId} │ ${momentum} │ ${velocity} │ ${phase} │ ${trend} │`);
  }

  console.log('└────────────────────────────────────┴──────────┴──────────┴────────────┴──────────┘');
}

function printTimelineTable(timeline: CLITimelineResult): void {
  console.log(`\n📈 タイムライン: ${timeline.entityId}\n`);
  console.log(`  期間: ${formatDate(timeline.timeRange.from)} 〜 ${formatDate(timeline.timeRange.to)}`);
  console.log(`  粒度: ${timeline.granularity}\n`);

  if (timeline.dataPoints.length === 0) {
    console.log('  データがありません');
    return;
  }

  console.log('┌────────────┬───────────┬──────────┬──────────┐');
  console.log('│ Date       │ Citations │ Momentum │ Velocity │');
  console.log('├────────────┼───────────┼──────────┼──────────┤');

  for (const point of timeline.dataPoints.slice(0, 30)) {
    const date = formatDate(point.date).padEnd(10);
    const citations = String(point.citationCount).padStart(9);
    const momentum = formatNumber(point.momentum).padStart(8);
    const velocity = formatNumber(point.velocity).padStart(8);

    console.log(`│ ${date} │ ${citations} │ ${momentum} │ ${velocity} │`);
  }

  if (timeline.dataPoints.length > 30) {
    console.log(`│ ... and ${timeline.dataPoints.length - 30} more rows                │`);
  }

  console.log('└────────────┴───────────┴──────────┴──────────┘');
}

function printHotTopicsTable(result: CLIHotTopicsResult): void {
  console.log('\n🔥 ホットトピック\n');
  console.log(`  取得日時: ${formatDate(result.capturedAt)}`);
  console.log(`  新興トピック数: ${result.summary.totalEmerging}`);
  console.log(`  平均Momentum: ${formatNumber(result.summary.avgMomentum)}\n`);

  if (result.topics.length === 0) {
    console.log('  トピックがありません');
    return;
  }

  console.log('┌──────┬─────────────────────────────────┬──────────┬──────────┬────────────┐');
  console.log('│ Rank │ Entity                          │ Momentum │ Velocity │ Phase      │');
  console.log('├──────┼─────────────────────────────────┼──────────┼──────────┼────────────┤');

  for (const topic of result.topics) {
    const rank = String(topic.rank).padStart(4);
    const name = (topic.entityName || topic.entityId).slice(0, 31).padEnd(31);
    const momentum = formatNumber(topic.momentum).padStart(8);
    const velocity = formatNumber(topic.velocity).padStart(8);
    const phase = PHASE_LABELS[topic.adoptionPhase].ja.padEnd(10);

    console.log(`│ ${rank} │ ${name} │ ${momentum} │ ${velocity} │ ${phase} │`);
  }

  console.log('└──────┴─────────────────────────────────┴──────────┴──────────┴────────────┘');
}

function printForecastTable(forecast: CLITrendForecast): void {
  console.log(`\n🔮 予測: ${forecast.entityName || forecast.entityId}\n`);
  console.log(`  予測期間: ${formatDate(forecast.forecastStart)} 〜 ${formatDate(forecast.forecastEnd)}`);
  console.log(`  トレンド方向: ${formatTrend(forecast.trendDirection)}`);
  console.log(`  信頼度: ${formatNumber(forecast.confidence * 100)}%`);
  console.log(`  モデル: ${forecast.model}\n`);

  if (forecast.predictions.length === 0) {
    console.log('  予測データがありません');
    return;
  }

  console.log('┌────────────┬────────────┬─────────────────────┐');
  console.log('│ Date       │ Predicted  │ Confidence Interval │');
  console.log('├────────────┼────────────┼─────────────────────┤');

  // Show first 10 and last 5 predictions if many
  const predictions = forecast.predictions;
  const showPredictions =
    predictions.length <= 15
      ? predictions
      : [...predictions.slice(0, 10), null, ...predictions.slice(-5)];

  for (const pred of showPredictions) {
    if (pred === null) {
      console.log('│   ...      │    ...     │        ...          │');
      continue;
    }
    const date = formatDate(pred.date).padEnd(10);
    const predicted = String(pred.predictedCitations).padStart(10);
    const interval = `[${pred.confidenceInterval.lower}, ${pred.confidenceInterval.upper}]`.padStart(19);

    console.log(`│ ${date} │ ${predicted} │ ${interval} │`);
  }

  console.log('└────────────┴────────────┴─────────────────────┘');
}

function printPhaseDistribution(distribution: Record<AdoptionPhase, number>): void {
  console.log('\n📊 フェーズ分布\n');

  const total = Object.values(distribution).reduce((a, b) => a + b, 0);

  console.log('┌────────────────┬───────┬────────────────────────────────────────┐');
  console.log('│ Phase          │ Count │ Distribution                           │');
  console.log('├────────────────┼───────┼────────────────────────────────────────┤');

  const phases: AdoptionPhase[] = ['emerging', 'growing', 'mature', 'declining'];
  for (const phase of phases) {
    const count = distribution[phase] || 0;
    const percentage = total > 0 ? (count / total) * 100 : 0;
    const barLength = Math.round(percentage / 2.5);
    const bar = '█'.repeat(barLength) + '░'.repeat(40 - barLength);

    const label = PHASE_LABELS[phase];
    const phaseStr = `${label.emoji} ${label.ja}`.padEnd(14);
    const countStr = String(count).padStart(5);

    console.log(`│ ${phaseStr} │ ${countStr} │ ${bar} │`);
  }

  console.log('└────────────────┴───────┴────────────────────────────────────────┘');
  console.log(`  Total: ${total} entities`);
}

function printStatistics(stats: CLITemporalStatistics): void {
  console.log('\n📊 統計情報\n');
  console.log(`  期間: ${formatDate(stats.timeRange.from)} 〜 ${formatDate(stats.timeRange.to)}`);
  console.log(`  総エンティティ数: ${stats.totalEntities}`);
  console.log(`  平均Momentum: ${formatNumber(stats.avgMomentum)}`);
  console.log(`  平均Velocity: ${formatNumber(stats.avgVelocity)}\n`);

  printPhaseDistribution(stats.phaseDistribution);

  if (stats.topGainers.length > 0) {
    console.log('\n  🚀 Top Gainers:');
    for (const gainer of stats.topGainers.slice(0, 5)) {
      console.log(`    - ${gainer.entityId}: +${formatNumber(gainer.momentum)}%`);
    }
  }

  if (stats.topDecliners.length > 0) {
    console.log('\n  📉 Top Decliners:');
    for (const decliner of stats.topDecliners.slice(0, 5)) {
      console.log(`    - ${decliner.entityId}: ${formatNumber(decliner.momentum)}%`);
    }
  }
}

function printSnapshot(snapshot: CLITrendSnapshot): void {
  console.log('\n📸 スナップショット\n');
  console.log(`  ID: ${snapshot.id}`);
  console.log(`  日時: ${formatDate(snapshot.date)}`);
  console.log(`  総エンティティ数: ${snapshot.totalEntities}\n`);

  console.log('  フェーズ分布:');
  console.log(`    🌱 Emerging: ${snapshot.summary.emergingCount}`);
  console.log(`    📈 Growing: ${snapshot.summary.growingCount}`);
  console.log(`    🏆 Mature: ${snapshot.summary.matureCount}`);
  console.log(`    📉 Declining: ${snapshot.summary.decliningCount}`);

  if (snapshot.hotTopics.length > 0) {
    console.log('\n  🔥 ホットトピック (Top 5):');
    for (const topic of snapshot.hotTopics.slice(0, 5)) {
      console.log(`    ${topic.rank}. ${topic.entityName || topic.entityId} (${formatNumber(topic.momentum)}%)`);
    }
  }
}

function outputResult(result: unknown, format: OutputFormat): void {
  if (format === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else if (format === 'yaml') {
    // Simple YAML-like output
    console.log(toYamlLike(result));
  }
  // 'table' format is handled by specific print functions
}

function toYamlLike(obj: unknown, indent = 0): string {
  const spaces = '  '.repeat(indent);
  if (obj === null || obj === undefined) {
    return `${spaces}null`;
  }
  if (typeof obj !== 'object') {
    return `${spaces}${String(obj)}`;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => `${spaces}- ${toYamlLike(item, indent + 1).trim()}`).join('\n');
  }
  return Object.entries(obj as Record<string, unknown>)
    .map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return `${spaces}${key}:\n${toYamlLike(value, indent + 1)}`;
      }
      return `${spaces}${key}: ${value}`;
    })
    .join('\n');
}

// ============ Command Factory ============

/**
 * Create temporal command
 */
export function createTemporalCommand(service: TemporalService): Command {
  const temporal = new Command('temporal')
    .description('時系列分析コマンド (F-004)')
    .alias('tp');

  // temporal trends [--period] [--top] [--format]
  temporal
    .command('trends')
    .description('トレンド分析を実行')
    .option('-p, --period <preset>', '期間 (last-week|last-month|last-quarter|last-year|all-time)', 'last-month')
    .option('-t, --top <n>', '上位N件を表示', '10')
    .option('-f, --format <format>', '出力形式 (json|table|yaml)', 'table')
    .action(async (options: TrendsOptions) => {
      try {
        const period = parseTimeRange(options.period);
        const top = parseInt(options.top || '10', 10);
        const format = (options.format || 'table') as OutputFormat;

        const results = await service.analyzeTrends({ period, top });

        if (format === 'table') {
          printTrendsTable(results);
        } else {
          outputResult(results, format);
        }
      } catch (error) {
        console.error(formatError(error));
        process.exitCode = 1;
      }
    });

  // temporal timeline <entityId> [--range] [--granularity] [--format]
  temporal
    .command('timeline <entityId>')
    .description('エンティティのタイムラインを取得')
    .option('-r, --range <preset>', '期間 (last-week|last-month|last-quarter|last-year)', 'last-year')
    .option('-g, --granularity <level>', '粒度 (day|week|month)', 'month')
    .option('-f, --format <format>', '出力形式 (json|table|yaml)', 'table')
    .action(async (entityId: string, options: TimelineOptions) => {
      try {
        const timeRange = parseTimeRange(options.range, 'last-year');
        const granularity = (options.granularity || 'month') as Granularity;
        const format = (options.format || 'table') as OutputFormat;

        const timeline = await service.getTimeline(entityId, {
          timeRange,
          granularity,
        });

        if (format === 'table') {
          printTimelineTable(timeline);
        } else {
          outputResult(timeline, format);
        }
      } catch (error) {
        console.error(formatError(error));
        process.exitCode = 1;
      }
    });

  // temporal hot-topics [--limit] [--min-momentum] [--format]
  temporal
    .command('hot-topics')
    .alias('hot')
    .description('ホットトピックを検出')
    .option('-l, --limit <n>', '最大件数', '20')
    .option('-m, --min-momentum <value>', '最小Momentum閾値', '50')
    .option('-f, --format <format>', '出力形式 (json|table|yaml)', 'table')
    .action(async (options: HotTopicsOptions) => {
      try {
        const limit = parseInt(options.limit || '20', 10);
        const minMomentum = parseFloat(options.minMomentum || '50');
        const format = (options.format || 'table') as OutputFormat;

        const result = await service.detectHotTopics({ limit, minMomentum });

        if (format === 'table') {
          printHotTopicsTable(result);
        } else {
          outputResult(result, format);
        }
      } catch (error) {
        console.error(formatError(error));
        process.exitCode = 1;
      }
    });

  // temporal forecast <entityId> [--horizon] [--format]
  temporal
    .command('forecast <entityId>')
    .description('トレンドを予測')
    .option('-h, --horizon <days>', '予測期間（日）', '30')
    .option('-f, --format <format>', '出力形式 (json|table|yaml)', 'table')
    .action(async (entityId: string, options: ForecastOptions) => {
      try {
        const horizon = parseInt(options.horizon || '30', 10);
        const format = (options.format || 'table') as OutputFormat;

        const forecast = await service.forecast(entityId, horizon);

        if (format === 'table') {
          printForecastTable(forecast);
        } else {
          outputResult(forecast, format);
        }
      } catch (error) {
        console.error(formatError(error));
        process.exitCode = 1;
      }
    });

  // temporal phases [--phase] [--limit] [--format]
  temporal
    .command('phases')
    .description('フェーズ別エンティティ一覧/分布')
    .option('-p, --phase <phase>', 'フェーズでフィルタ (emerging|growing|mature|declining)')
    .option('-l, --limit <n>', '最大件数', '20')
    .option('-f, --format <format>', '出力形式 (json|table|yaml)', 'table')
    .action(async (options: PhasesOptions) => {
      try {
        const format = (options.format || 'table') as OutputFormat;
        const limit = parseInt(options.limit || '20', 10);

        if (options.phase) {
          const validPhases: AdoptionPhase[] = ['emerging', 'growing', 'mature', 'declining'];
          if (!validPhases.includes(options.phase as AdoptionPhase)) {
            console.error(`Invalid phase: ${options.phase}`);
            console.error(`Valid phases: ${validPhases.join(', ')}`);
            process.exitCode = 1;
            return;
          }

          const entities = await service.getEntitiesByPhase(options.phase as AdoptionPhase, {
            limit,
          });

          if (format === 'table') {
            console.log(`\n${formatPhase(options.phase as AdoptionPhase)} のエンティティ:\n`);
            for (let i = 0; i < entities.length; i++) {
              console.log(`  ${i + 1}. ${entities[i]}`);
            }
            console.log(`\n  Total: ${entities.length} entities`);
          } else {
            outputResult({ phase: options.phase, entities }, format);
          }
        } else {
          const distribution = await service.getPhaseDistribution();

          if (format === 'table') {
            printPhaseDistribution(distribution);
          } else {
            outputResult(distribution, format);
          }
        }
      } catch (error) {
        console.error(formatError(error));
        process.exitCode = 1;
      }
    });

  // temporal stats [--range] [--format]
  temporal
    .command('stats')
    .description('統計情報を取得')
    .option('-r, --range <preset>', '期間 (last-week|last-month|last-quarter|last-year|all-time)', 'last-month')
    .option('-f, --format <format>', '出力形式 (json|table|yaml)', 'table')
    .action(async (options: StatsOptions) => {
      try {
        const timeRange = parseTimeRange(options.range);
        const format = (options.format || 'table') as OutputFormat;

        const stats = await service.getStatistics(timeRange);

        if (format === 'table') {
          printStatistics(stats);
        } else {
          outputResult(stats, format);
        }
      } catch (error) {
        console.error(formatError(error));
        process.exitCode = 1;
      }
    });

  // temporal snapshot [--format]
  temporal
    .command('snapshot')
    .description('スナップショットを作成/取得')
    .option('--create', '新しいスナップショットを作成')
    .option('-f, --format <format>', '出力形式 (json|table|yaml)', 'table')
    .action(async (options: SnapshotOptions & { create?: boolean }) => {
      try {
        const format = (options.format || 'table') as OutputFormat;

        if (options.create) {
          const snapshotId = await service.createSnapshot();
          console.log(`✅ スナップショットを作成しました: ${snapshotId}`);
          return;
        }

        const snapshot = await service.getLatestSnapshot();

        if (!snapshot) {
          console.log('スナップショットがありません。--create オプションで作成できます。');
          return;
        }

        if (format === 'table') {
          printSnapshot(snapshot);
        } else {
          outputResult(snapshot, format);
        }
      } catch (error) {
        console.error(formatError(error));
        process.exitCode = 1;
      }
    });

  return temporal;
}
