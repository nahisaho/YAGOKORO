/**
 * @fileoverview CLI Lifecycle Command
 * TASK-V2-026: Technology Lifecycle CLI Interface
 */

import { Command } from 'commander';

// ============ Types ============

/**
 * Lifecycle phase type (matching @yagokoro/analyzer)
 */
export type LifecyclePhase =
  | 'innovation_trigger'
  | 'peak_of_expectations'
  | 'trough_of_disillusionment'
  | 'slope_of_enlightenment'
  | 'plateau_of_productivity';

/**
 * Trend direction type
 */
export type TrendDirection = 'rising' | 'stable' | 'declining';

/**
 * Output format type
 */
export type OutputFormat = 'json' | 'table' | 'yaml';

/**
 * CLI lifecycle phase result
 */
export interface CLIPhaseResult {
  phase: LifecyclePhase;
  phaseLabel: string;
  phaseLabelJa: string;
  confidence: number;
  daysInPhase: number;
  estimatedDaysToNextPhase: number | null;
  indicators: Array<{
    name: string;
    value: number;
    supports: boolean;
  }>;
}

/**
 * CLI maturity score
 */
export interface CLIMaturityScore {
  overall: number;
  researchActivity: number;
  industryAdoption: number;
  communityEngagement: number;
  documentationQuality: number;
  stability: number;
}

/**
 * CLI trend forecast
 */
export interface CLITrendForecast {
  currentTrend: TrendDirection;
  confidence: number;
  horizonDays: number;
  predictedTransitions: Array<{
    toPhase: LifecyclePhase;
    estimatedDate: string;
    probability: number;
  }>;
  factors: Array<{
    name: string;
    type: 'positive' | 'negative' | 'neutral';
    impact: number;
    description: string;
  }>;
  risks: Array<{
    name: string;
    probability: number;
    impact: number;
  }>;
}

/**
 * CLI lifecycle analysis result
 */
export interface CLILifecycleAnalysis {
  technologyId: string;
  technologyName: string;
  phase: CLIPhaseResult;
  maturity: CLIMaturityScore;
  forecast: CLITrendForecast;
  analyzedAt: string;
}

/**
 * CLI lifecycle report
 */
export interface CLILifecycleReport {
  technologyId: string;
  technologyName: string;
  generatedAt: string;
  phase: CLIPhaseResult;
  maturity: CLIMaturityScore;
  forecast: CLITrendForecast;
  relatedTechnologies: Array<{
    id: string;
    phase: LifecyclePhase;
  }>;
  summary: string;
}

/**
 * CLI emerging technology
 */
export interface CLIEmergingTechnology {
  technologyId: string;
  technologyName: string;
  phase: LifecyclePhase;
  growthRate: number;
  keyIndicators: string[];
  firstSeen: string;
  confidence: number;
}

/**
 * CLI declining technology
 */
export interface CLIDecliningTechnology {
  technologyId: string;
  technologyName: string;
  phase: LifecyclePhase;
  declineRate: number;
  lastActiveDate: string;
  replacements: Array<{ id: string; name: string }>;
  confidence: number;
}

/**
 * Alert severity type
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Alert type
 */
export type AlertType =
  | 'phase_transition'
  | 'maturity_change'
  | 'trend_shift'
  | 'emerging_technology'
  | 'declining_technology'
  | 'anomaly_detected';

/**
 * CLI alert interface
 */
export interface CLIAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  technologyId: string;
  technologyName: string;
  title: string;
  message: string;
  createdAt: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
}

/**
 * Report period type
 */
export type ReportPeriod = 'weekly' | 'monthly' | 'quarterly' | 'annual';

/**
 * Report format type
 */
export type ReportFormatType = 'markdown' | 'html' | 'json';

/**
 * CLI periodic report
 */
export interface CLIPeriodicReport {
  id: string;
  period: ReportPeriod;
  startDate: string;
  endDate: string;
  generatedAt: string;
  summary: {
    totalTechnologies: number;
    newTechnologies: number;
    transitionedTechnologies: number;
    alerts: {
      total: number;
      critical: number;
      warning: number;
      info: number;
    };
  };
  content: string;
}

/**
 * Lifecycle analyze options
 */
export interface LifecycleAnalyzeOptions {
  horizonDays?: number;
  format?: OutputFormat;
}

/**
 * Lifecycle compare options
 */
export interface LifecycleCompareOptions {
  format?: OutputFormat;
}

/**
 * Lifecycle scan options
 */
export interface LifecycleScanOptions {
  limit?: number;
  format?: OutputFormat;
}

/**
 * Lifecycle service interface
 */
export interface LifecycleService {
  /** Analyze single technology lifecycle */
  analyzeTechnology(
    technologyId: string,
    options?: { horizonDays?: number }
  ): Promise<CLILifecycleAnalysis>;

  /** Generate comprehensive report */
  generateReport(technologyId: string): Promise<CLILifecycleReport>;

  /** Find emerging technologies */
  findEmergingTechnologies(limit?: number): Promise<CLIEmergingTechnology[]>;

  /** Find declining technologies */
  findDecliningTechnologies(limit?: number): Promise<CLIDecliningTechnology[]>;

  /** Compare technologies */
  compareTechnologies(ids: string[]): Promise<CLILifecycleAnalysis[]>;

  /** Get technologies by phase */
  getTechnologiesByPhase(phase: LifecyclePhase): Promise<CLILifecycleAnalysis[]>;

  /** Get alerts */
  getAlerts(options?: {
    acknowledged?: boolean;
    severity?: AlertSeverity;
    limit?: number;
  }): Promise<CLIAlert[]>;

  /** Acknowledge alert */
  acknowledgeAlert(alertId: string): Promise<boolean>;

  /** Generate periodic report */
  generatePeriodicReport(options?: {
    period?: ReportPeriod;
    format?: ReportFormatType;
    language?: 'ja' | 'en';
  }): Promise<CLIPeriodicReport>;
}

// ============ Helper Functions ============

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return `Error: ${String(error)}`;
}

// ============ Command Factory ============

/**
 * Create lifecycle command
 */
export function createLifecycleCommand(service: LifecycleService): Command {
  const lifecycle = new Command('lifecycle')
    .description('技術ライフサイクル分析 (FR-004)')
    .alias('lc');

  // lifecycle analyze <technologyId>
  lifecycle
    .command('analyze <technologyId>')
    .description('技術のライフサイクルを分析')
    .option('-h, --horizon-days <days>', '予測期間（日）', '365')
    .option('-f, --format <format>', '出力形式 (json|table|yaml)', 'table')
    .action(async (technologyId: string, options: { horizonDays: string; format: string }) => {
      try {
        const result = await service.analyzeTechnology(technologyId, {
          horizonDays: parseInt(options.horizonDays, 10),
        });
        printAnalysisResult(result, options.format as OutputFormat);
      } catch (error) {
        console.error(formatError(error));
        process.exitCode = 1;
      }
    });

  // lifecycle report <technologyId>
  lifecycle
    .command('report <technologyId>')
    .description('詳細なライフサイクルレポートを生成')
    .option('-f, --format <format>', '出力形式 (json|table|yaml)', 'table')
    .action(async (technologyId: string, options: { format: string }) => {
      try {
        const report = await service.generateReport(technologyId);
        printReport(report, options.format as OutputFormat);
      } catch (error) {
        console.error(formatError(error));
        process.exitCode = 1;
      }
    });

  // lifecycle emerging
  lifecycle
    .command('emerging')
    .description('新興技術を検出')
    .option('-l, --limit <count>', '最大件数', '10')
    .option('-f, --format <format>', '出力形式 (json|table|yaml)', 'table')
    .action(async (options: { limit: string; format: string }) => {
      try {
        const limit = parseInt(options.limit, 10);
        const emerging = await service.findEmergingTechnologies(limit);
        printEmergingTechnologies(emerging, options.format as OutputFormat);
      } catch (error) {
        console.error(formatError(error));
        process.exitCode = 1;
      }
    });

  // lifecycle declining
  lifecycle
    .command('declining')
    .description('衰退中の技術を検出')
    .option('-l, --limit <count>', '最大件数', '10')
    .option('-f, --format <format>', '出力形式 (json|table|yaml)', 'table')
    .action(async (options: { limit: string; format: string }) => {
      try {
        const limit = parseInt(options.limit, 10);
        const declining = await service.findDecliningTechnologies(limit);
        printDecliningTechnologies(declining, options.format as OutputFormat);
      } catch (error) {
        console.error(formatError(error));
        process.exitCode = 1;
      }
    });

  // lifecycle compare <ids...>
  lifecycle
    .command('compare <ids...>')
    .description('複数技術のライフサイクルを比較')
    .option('-f, --format <format>', '出力形式 (json|table|yaml)', 'table')
    .action(async (ids: string[], options: { format: string }) => {
      try {
        const results = await service.compareTechnologies(ids);
        printComparisonResults(results, options.format as OutputFormat);
      } catch (error) {
        console.error(formatError(error));
        process.exitCode = 1;
      }
    });

  // lifecycle by-phase <phase>
  lifecycle
    .command('by-phase <phase>')
    .description('特定フェーズの技術を一覧')
    .option('-l, --limit <count>', '最大件数', '20')
    .option('-f, --format <format>', '出力形式 (json|table|yaml)', 'table')
    .action(async (phase: string, options: { limit: string; format: string }) => {
      try {
        const validPhases: LifecyclePhase[] = [
          'innovation_trigger',
          'peak_of_expectations',
          'trough_of_disillusionment',
          'slope_of_enlightenment',
          'plateau_of_productivity',
        ];

        if (!validPhases.includes(phase as LifecyclePhase)) {
          console.error(`Invalid phase: ${phase}`);
          console.error(`Valid phases: ${validPhases.join(', ')}`);
          process.exitCode = 1;
          return;
        }

        const results = await service.getTechnologiesByPhase(phase as LifecyclePhase);
        const limited = results.slice(0, parseInt(options.limit, 10));
        printPhaseResults(phase as LifecyclePhase, limited, options.format as OutputFormat);
      } catch (error) {
        console.error(formatError(error));
        process.exitCode = 1;
      }
    });

  // lifecycle alerts
  lifecycle
    .command('alerts')
    .description('アラート一覧を表示')
    .option('-a, --acknowledged', '確認済みアラートを含める', false)
    .option('-s, --severity <level>', '重要度でフィルタ (info|warning|critical)')
    .option('-l, --limit <count>', '最大件数', '20')
    .option('-f, --format <format>', '出力形式 (json|table|yaml)', 'table')
    .action(
      async (options: {
        acknowledged: boolean;
        severity?: string;
        limit: string;
        format: string;
      }) => {
        try {
          const alerts = await service.getAlerts({
            acknowledged: options.acknowledged ? undefined : false,
            severity: options.severity as AlertSeverity | undefined,
            limit: parseInt(options.limit, 10),
          });
          printAlerts(alerts, options.format as OutputFormat);
        } catch (error) {
          console.error(formatError(error));
          process.exitCode = 1;
        }
      }
    );

  // lifecycle acknowledge <alertId>
  lifecycle
    .command('acknowledge <alertId>')
    .alias('ack')
    .description('アラートを確認済みにする')
    .action(async (alertId: string) => {
      try {
        const success = await service.acknowledgeAlert(alertId);
        if (success) {
          console.log(`✅ アラート ${alertId} を確認済みにしました`);
        } else {
          console.error(`❌ アラート ${alertId} が見つかりません`);
          process.exitCode = 1;
        }
      } catch (error) {
        console.error(formatError(error));
        process.exitCode = 1;
      }
    });

  // lifecycle periodic-report
  lifecycle
    .command('periodic-report')
    .alias('pr')
    .description('定期レポートを生成')
    .option('-p, --period <period>', '期間 (weekly|monthly|quarterly|annual)', 'monthly')
    .option('-o, --output <format>', '出力形式 (markdown|html|json)', 'markdown')
    .option('-l, --language <lang>', '言語 (ja|en)', 'ja')
    .option('-f, --format <format>', '出力形式 (json|table)', 'table')
    .action(
      async (options: {
        period: string;
        output: string;
        language: string;
        format: string;
      }) => {
        try {
          const report = await service.generatePeriodicReport({
            period: options.period as ReportPeriod,
            format: options.output as ReportFormatType,
            language: options.language as 'ja' | 'en',
          });
          printPeriodicReport(report, options.format as OutputFormat);
        } catch (error) {
          console.error(formatError(error));
          process.exitCode = 1;
        }
      }
    );

  return lifecycle;
}

// ============ Output Helpers ============

const PHASE_LABELS: Record<LifecyclePhase, { en: string; ja: string }> = {
  innovation_trigger: { en: 'Innovation Trigger', ja: '黎明期' },
  peak_of_expectations: { en: 'Peak of Expectations', ja: '過熱期' },
  trough_of_disillusionment: { en: 'Trough of Disillusionment', ja: '幻滅期' },
  slope_of_enlightenment: { en: 'Slope of Enlightenment', ja: '回復期' },
  plateau_of_productivity: { en: 'Plateau of Productivity', ja: '安定期' },
};

const TREND_LABELS: Record<TrendDirection, string> = {
  rising: '↗ 上昇',
  stable: '→ 安定',
  declining: '↘ 下降',
};

function formatOutput(data: unknown, format: OutputFormat): string {
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }
  if (format === 'yaml') {
    // Simple YAML-like output
    return JSON.stringify(data, null, 2);
  }
  return String(data);
}

function printAnalysisResult(result: CLILifecycleAnalysis, format: OutputFormat): void {
  if (format === 'json') {
    console.log(formatOutput(result, format));
    return;
  }

  const phaseLabel = PHASE_LABELS[result.phase.phase];
  if (!phaseLabel) {
    console.error(`Unknown phase: ${result.phase.phase}`);
    return;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 ライフサイクル分析: ${result.technologyName}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Phase info
  console.log(`🔄 フェーズ: ${phaseLabel.ja} (${phaseLabel.en})`);
  console.log(`   信頼度: ${(result.phase.confidence * 100).toFixed(0)}%`);
  console.log(`   滞留期間: ${result.phase.daysInPhase}日`);
  if (result.phase.estimatedDaysToNextPhase) {
    console.log(`   次フェーズまで: 約${result.phase.estimatedDaysToNextPhase}日`);
  }

  // Maturity
  console.log('\n📈 成熟度スコア:');
  console.log(`   全体: ${(result.maturity.overall * 100).toFixed(0)}%`);
  console.log(`   研究活動: ${(result.maturity.researchActivity * 100).toFixed(0)}%`);
  console.log(`   産業採用: ${(result.maturity.industryAdoption * 100).toFixed(0)}%`);
  console.log(`   コミュニティ: ${(result.maturity.communityEngagement * 100).toFixed(0)}%`);
  console.log(`   ドキュメント: ${(result.maturity.documentationQuality * 100).toFixed(0)}%`);
  console.log(`   安定性: ${(result.maturity.stability * 100).toFixed(0)}%`);

  // Trend
  console.log('\n📉 トレンド予測:');
  console.log(`   現在のトレンド: ${TREND_LABELS[result.forecast.currentTrend]}`);
  console.log(`   予測信頼度: ${(result.forecast.confidence * 100).toFixed(0)}%`);
  console.log(`   予測期間: ${result.forecast.horizonDays}日`);

  // Transitions
  if (result.forecast.predictedTransitions.length > 0) {
    console.log('\n   📅 予測されるフェーズ遷移:');
    for (const transition of result.forecast.predictedTransitions) {
      const targetLabel = PHASE_LABELS[transition.toPhase];
      if (targetLabel) {
        console.log(
          `      → ${targetLabel.ja}: ${transition.estimatedDate} (確率: ${(transition.probability * 100).toFixed(0)}%)`
        );
      }
    }
  }

  // Factors
  if (result.forecast.factors.length > 0) {
    console.log('\n   🔍 影響要因:');
    for (const factor of result.forecast.factors.slice(0, 5)) {
      const icon = factor.type === 'positive' ? '✅' : factor.type === 'negative' ? '⚠️' : '➖';
      console.log(`      ${icon} ${factor.name}: ${factor.description}`);
    }
  }

  // Risks
  if (result.forecast.risks.length > 0) {
    console.log('\n   ⚠️ リスク:');
    for (const risk of result.forecast.risks.slice(0, 3)) {
      console.log(
        `      - ${risk.name} (確率: ${(risk.probability * 100).toFixed(0)}%, 影響: ${(risk.impact * 100).toFixed(0)}%)`
      );
    }
  }

  console.log(`\n分析日時: ${result.analyzedAt}\n`);
}

function printReport(report: CLILifecycleReport, format: OutputFormat): void {
  if (format === 'json') {
    console.log(formatOutput(report, format));
    return;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📑 ライフサイクルレポート: ${report.technologyName}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📝 サマリー:');
  console.log(`   ${report.summary}\n`);

  // Print the analysis portion
  printAnalysisResult(
    {
      technologyId: report.technologyId,
      technologyName: report.technologyName,
      phase: report.phase,
      maturity: report.maturity,
      forecast: report.forecast,
      analyzedAt: report.generatedAt,
    },
    'table'
  );

  // Related technologies
  if (report.relatedTechnologies.length > 0) {
    console.log('🔗 関連技術:');
    for (const related of report.relatedTechnologies) {
      const phaseLabel = PHASE_LABELS[related.phase];
      if (phaseLabel) {
        console.log(`   - ${related.id}: ${phaseLabel.ja}`);
      } else {
        console.log(`   - ${related.id}: ${related.phase}`);
      }
    }
    console.log('');
  }
}

function printEmergingTechnologies(
  emerging: CLIEmergingTechnology[],
  format: OutputFormat
): void {
  if (format === 'json') {
    console.log(formatOutput(emerging, format));
    return;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 新興技術');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (emerging.length === 0) {
    console.log('新興技術は検出されませんでした。\n');
    return;
  }

  for (const tech of emerging) {
    const phaseLabel = PHASE_LABELS[tech.phase];
    const phaseName = phaseLabel ? phaseLabel.ja : tech.phase;
    console.log(`📈 ${tech.technologyName} (${tech.technologyId})`);
    console.log(`   フェーズ: ${phaseName}`);
    console.log(`   成長率: ${(tech.growthRate * 100).toFixed(0)}%`);
    console.log(`   初検出: ${tech.firstSeen}`);
    console.log(`   信頼度: ${(tech.confidence * 100).toFixed(0)}%`);
    if (tech.keyIndicators.length > 0) {
      console.log(`   指標: ${tech.keyIndicators.join(', ')}`);
    }
    console.log('');
  }
}

function printDecliningTechnologies(
  declining: CLIDecliningTechnology[],
  format: OutputFormat
): void {
  if (format === 'json') {
    console.log(formatOutput(declining, format));
    return;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📉 衰退中の技術');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (declining.length === 0) {
    console.log('衰退中の技術は検出されませんでした。\n');
    return;
  }

  for (const tech of declining) {
    const phaseLabel = PHASE_LABELS[tech.phase];
    const phaseName = phaseLabel ? phaseLabel.ja : tech.phase;
    console.log(`📉 ${tech.technologyName} (${tech.technologyId})`);
    console.log(`   フェーズ: ${phaseName}`);
    console.log(`   衰退率: ${(tech.declineRate * 100).toFixed(0)}%`);
    console.log(`   最終活動: ${tech.lastActiveDate}`);
    console.log(`   信頼度: ${(tech.confidence * 100).toFixed(0)}%`);
    if (tech.replacements.length > 0) {
      console.log(`   代替候補: ${tech.replacements.map((r) => r.name).join(', ')}`);
    }
    console.log('');
  }
}

function printComparisonResults(
  results: CLILifecycleAnalysis[],
  format: OutputFormat
): void {
  if (format === 'json') {
    console.log(formatOutput(results, format));
    return;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚖️ ライフサイクル比較');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (results.length === 0) {
    console.log('比較対象の技術が見つかりませんでした。\n');
    return;
  }

  // Summary table
  console.log('技術名'.padEnd(25) + 'フェーズ'.padEnd(15) + 'トレンド'.padEnd(10) + '成熟度');
  console.log('-'.repeat(65));

  for (const result of results) {
    const phaseLabel = PHASE_LABELS[result.phase.phase];
    const phaseName = phaseLabel ? phaseLabel.ja : result.phase.phase;
    const trend = TREND_LABELS[result.forecast.currentTrend] || result.forecast.currentTrend;
    const maturity = (result.maturity.overall * 100).toFixed(0) + '%';

    console.log(
      result.technologyName.padEnd(25) +
        phaseName.padEnd(15) +
        trend.padEnd(10) +
        maturity
    );
  }

  console.log('');
}

function printPhaseResults(
  phase: LifecyclePhase,
  results: CLILifecycleAnalysis[],
  format: OutputFormat
): void {
  if (format === 'json') {
    console.log(formatOutput(results, format));
    return;
  }

  const phaseLabel = PHASE_LABELS[phase];

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🔄 ${phaseLabel.ja} (${phaseLabel.en}) の技術`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (results.length === 0) {
    console.log('該当する技術は見つかりませんでした。\n');
    return;
  }

  console.log('技術名'.padEnd(30) + '信頼度'.padEnd(10) + 'トレンド'.padEnd(10) + '成熟度');
  console.log('-'.repeat(65));

  for (const result of results) {
    const confidence = (result.phase.confidence * 100).toFixed(0) + '%';
    const trend = TREND_LABELS[result.forecast.currentTrend] || result.forecast.currentTrend;
    const maturity = (result.maturity.overall * 100).toFixed(0) + '%';

    console.log(
      result.technologyName.padEnd(30) +
        confidence.padEnd(10) +
        trend.padEnd(10) +
        maturity
    );
  }

  console.log(`\n合計: ${results.length}件\n`);
}

// ============ Alert Output Helpers ============

const SEVERITY_ICONS: Record<AlertSeverity, string> = {
  critical: '🔴',
  warning: '🟡',
  info: '🔵',
};

const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  critical: '重大',
  warning: '警告',
  info: '情報',
};

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  phase_transition: 'フェーズ遷移',
  maturity_change: '成熟度変化',
  trend_shift: 'トレンド変化',
  emerging_technology: '新興技術検出',
  declining_technology: '衰退技術検出',
  anomaly_detected: '異常検出',
};

function printAlerts(alerts: CLIAlert[], format: OutputFormat): void {
  if (format === 'json') {
    console.log(formatOutput(alerts, format));
    return;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔔 アラート一覧');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (alerts.length === 0) {
    console.log('未確認のアラートはありません。\n');
    return;
  }

  // Summary by severity
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;
  const infoCount = alerts.filter((a) => a.severity === 'info').length;

  console.log('📊 サマリー:');
  console.log(`   🔴 重大: ${criticalCount}件`);
  console.log(`   🟡 警告: ${warningCount}件`);
  console.log(`   🔵 情報: ${infoCount}件`);
  console.log('');

  // Sort by severity (critical first)
  const sorted = [...alerts].sort((a, b) => {
    const order: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  for (const alert of sorted) {
    const icon = SEVERITY_ICONS[alert.severity];
    const severity = SEVERITY_LABELS[alert.severity];
    const type = ALERT_TYPE_LABELS[alert.type];
    const ackStatus = alert.acknowledged ? '✅ 確認済' : '';

    console.log(`${icon} [${severity}] ${alert.title} ${ackStatus}`);
    console.log(`   ID: ${alert.id}`);
    console.log(`   種別: ${type}`);
    console.log(`   技術: ${alert.technologyName}`);
    console.log(`   ${alert.message}`);
    console.log(`   作成: ${alert.createdAt}`);
    if (alert.acknowledgedAt) {
      console.log(`   確認: ${alert.acknowledgedAt}`);
    }
    console.log('');
  }

  console.log(`合計: ${alerts.length}件\n`);
}

function printPeriodicReport(report: CLIPeriodicReport, format: OutputFormat): void {
  if (format === 'json') {
    console.log(formatOutput(report, format));
    return;
  }

  const periodLabels: Record<ReportPeriod, string> = {
    weekly: '週次',
    monthly: '月次',
    quarterly: '四半期',
    annual: '年次',
  };

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 ${periodLabels[report.period]}レポート`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`📅 期間: ${report.startDate} ～ ${report.endDate}`);
  console.log(`📝 生成日時: ${report.generatedAt}`);
  console.log('');

  console.log('📊 サマリー:');
  console.log(`   技術総数: ${report.summary.totalTechnologies}`);
  console.log(`   新規技術: ${report.summary.newTechnologies}`);
  console.log(`   フェーズ遷移: ${report.summary.transitionedTechnologies}`);
  console.log('');

  console.log('🔔 アラート統計:');
  console.log(`   合計: ${report.summary.alerts.total}件`);
  console.log(`   🔴 重大: ${report.summary.alerts.critical}件`);
  console.log(`   🟡 警告: ${report.summary.alerts.warning}件`);
  console.log(`   🔵 情報: ${report.summary.alerts.info}件`);
  console.log('');

  if (report.content) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📄 レポート内容:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(report.content);
  }
}
