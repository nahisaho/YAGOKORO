/**
 * @fileoverview Periodic Report Generator
 * TASK-V2-027: Generate monthly/quarterly reports
 */

import { v4 as uuidv4 } from 'uuid';
import type { LifecyclePhase, TrendDirection } from '../types.js';
import { PHASE_METADATA } from '../types.js';
import type {
  Alert,
  PeriodicReport,
  ReportOptions,
  ReportSection,
  TechnologySummary,
  ReportPeriod,
} from './types.js';
import { DEFAULT_REPORT_OPTIONS } from './types.js';
import type { AlertStore } from './AlertGenerator.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Technology data provider interface
 */
export interface TechnologyDataProvider {
  /** Get all technology IDs */
  getAllTechnologyIds(): Promise<string[]>;
  /** Get technology name by ID */
  getTechnologyName(id: string): Promise<string>;
  /** Get current phase */
  getCurrentPhase(id: string): Promise<LifecyclePhase>;
  /** Get maturity score */
  getMaturityScore(id: string): Promise<number>;
  /** Get current trend */
  getCurrentTrend(id: string): Promise<TrendDirection>;
  /** Get notable events in date range */
  getNotableEvents(id: string, start: Date, end: Date): Promise<string[]>;
  /** Compare with previous period */
  compareWithPreviousPeriod(
    id: string,
    currentStart: Date,
    currentEnd: Date
  ): Promise<'improved' | 'stable' | 'declined'>;
}

// =============================================================================
// Report Generator
// =============================================================================

/**
 * Periodic report generator
 */
export class ReportGenerator {
  private dataProvider: TechnologyDataProvider;
  private alertStore: AlertStore;

  constructor(dataProvider: TechnologyDataProvider, alertStore: AlertStore) {
    this.dataProvider = dataProvider;
    this.alertStore = alertStore;
  }

  /**
   * Generate periodic report
   */
  async generateReport(
    options: Partial<ReportOptions> = {}
  ): Promise<PeriodicReport> {
    const opts: ReportOptions = { ...DEFAULT_REPORT_OPTIONS, ...options };
    const { periodStart, periodEnd } = this.calculatePeriodDates(opts.period);

    // Get technology data
    const technologyIds = opts.technologyIds?.length
      ? opts.technologyIds
      : await this.dataProvider.getAllTechnologyIds();

    const technologies = await this.gatherTechnologySummaries(
      technologyIds,
      periodStart,
      periodEnd
    );

    // Get alerts if requested
    const alerts = opts.includeAlerts
      ? await this.alertStore.getByDateRange(periodStart, periodEnd)
      : [];

    // Generate sections
    const sections = await this.generateSections(
      technologies,
      alerts,
      opts
    );

    // Generate executive summary
    const executiveSummary = this.generateExecutiveSummary(
      technologies,
      alerts,
      opts.language
    );

    // Generate highlights
    const highlights = this.generateHighlights(technologies, alerts, opts.language);

    // Generate recommendations
    const recommendations = opts.includeRecommendations
      ? this.generateRecommendations(technologies, alerts, opts.language)
      : [];

    // Build report
    const report: PeriodicReport = {
      id: uuidv4(),
      title: this.generateTitle(opts.period, periodStart, periodEnd, opts.language),
      period: opts.period,
      periodStart,
      periodEnd,
      generatedAt: new Date(),
      executiveSummary,
      technologies,
      highlights,
      alerts,
      sections,
      recommendations,
      format: opts.format,
    };

    // Render content if not JSON
    if (opts.format !== 'json') {
      report.renderedContent = this.renderReport(report, opts.format, opts.language);
    }

    return report;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private calculatePeriodDates(period: ReportPeriod): {
    periodStart: Date;
    periodEnd: Date;
  } {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setHours(23, 59, 59, 999);

    const periodStart = new Date(now);

    switch (period) {
      case 'weekly':
        periodStart.setDate(periodStart.getDate() - 7);
        break;
      case 'monthly':
        periodStart.setMonth(periodStart.getMonth() - 1);
        break;
      case 'quarterly':
        periodStart.setMonth(periodStart.getMonth() - 3);
        break;
      case 'annual':
        periodStart.setFullYear(periodStart.getFullYear() - 1);
        break;
    }

    periodStart.setHours(0, 0, 0, 0);
    return { periodStart, periodEnd };
  }

  private async gatherTechnologySummaries(
    technologyIds: string[],
    periodStart: Date,
    periodEnd: Date
  ): Promise<TechnologySummary[]> {
    const summaries: TechnologySummary[] = [];

    for (const id of technologyIds) {
      try {
        const name = await this.dataProvider.getTechnologyName(id);
        const phase = await this.dataProvider.getCurrentPhase(id);
        const maturityScore = await this.dataProvider.getMaturityScore(id);
        const trend = await this.dataProvider.getCurrentTrend(id);
        const notableEvents = await this.dataProvider.getNotableEvents(
          id,
          periodStart,
          periodEnd
        );
        const change = await this.dataProvider.compareWithPreviousPeriod(
          id,
          periodStart,
          periodEnd
        );

        summaries.push({
          id,
          name,
          phase,
          phaseLabel: PHASE_METADATA[phase].labelJa,
          maturityScore,
          trend,
          change,
          notableEvents,
        });
      } catch {
        // Skip technologies that fail to load
      }
    }

    return summaries;
  }

  private async generateSections(
    technologies: TechnologySummary[],
    alerts: Alert[],
    options: ReportOptions
  ): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];
    const lang = options.language;

    // Overview section
    sections.push({
      title: lang === 'ja' ? '概要' : 'Overview',
      content: this.generateOverviewContent(technologies, lang),
      order: 1,
      expandable: false,
    });

    // Phase distribution section
    sections.push({
      title: lang === 'ja' ? 'フェーズ分布' : 'Phase Distribution',
      content: this.generatePhaseDistributionContent(technologies, lang),
      order: 2,
      expandable: true,
    });

    // Trend analysis section
    sections.push({
      title: lang === 'ja' ? 'トレンド分析' : 'Trend Analysis',
      content: this.generateTrendAnalysisContent(technologies, lang),
      order: 3,
      expandable: true,
    });

    // Alert summary section
    if (options.includeAlerts && alerts.length > 0) {
      sections.push({
        title: lang === 'ja' ? 'アラートサマリー' : 'Alert Summary',
        content: this.generateAlertSummaryContent(alerts, lang),
        order: 4,
        expandable: true,
      });
    }

    // Technology details section
    sections.push({
      title: lang === 'ja' ? '技術詳細' : 'Technology Details',
      content: this.generateTechnologyDetailsContent(technologies, lang),
      order: 5,
      expandable: true,
    });

    return sections;
  }

  private generateOverviewContent(
    technologies: TechnologySummary[],
    lang: 'ja' | 'en'
  ): string {
    const improved = technologies.filter((t) => t.change === 'improved').length;
    const declined = technologies.filter((t) => t.change === 'declined').length;
    const stable = technologies.filter((t) => t.change === 'stable').length;

    if (lang === 'ja') {
      return [
        `監視対象技術: ${technologies.length}件`,
        `改善: ${improved}件 / 安定: ${stable}件 / 低下: ${declined}件`,
        `平均成熟度: ${this.calculateAverageMaturity(technologies).toFixed(1)}%`,
      ].join('\n');
    }

    return [
      `Monitored Technologies: ${technologies.length}`,
      `Improved: ${improved} / Stable: ${stable} / Declined: ${declined}`,
      `Average Maturity: ${this.calculateAverageMaturity(technologies).toFixed(1)}%`,
    ].join('\n');
  }

  private generatePhaseDistributionContent(
    technologies: TechnologySummary[],
    lang: 'ja' | 'en'
  ): string {
    const phases: LifecyclePhase[] = [
      'innovation_trigger',
      'peak_of_expectations',
      'trough_of_disillusionment',
      'slope_of_enlightenment',
      'plateau_of_productivity',
    ];

    const distribution = phases.map((phase) => {
      const count = technologies.filter((t) => t.phase === phase).length;
      const meta = PHASE_METADATA[phase];
      const label = lang === 'ja' ? meta.labelJa : meta.label;
      return `${label}: ${count}件`;
    });

    return distribution.join('\n');
  }

  private generateTrendAnalysisContent(
    technologies: TechnologySummary[],
    lang: 'ja' | 'en'
  ): string {
    const trendLabels: Record<TrendDirection, { ja: string; en: string }> = {
      rising: { ja: '上昇', en: 'Rising' },
      stable: { ja: '安定', en: 'Stable' },
      declining: { ja: '下降', en: 'Declining' },
      volatile: { ja: '変動', en: 'Volatile' },
    };

    const trends: TrendDirection[] = ['rising', 'stable', 'declining', 'volatile'];
    const distribution = trends.map((trend) => {
      const count = technologies.filter((t) => t.trend === trend).length;
      const label = lang === 'ja' ? trendLabels[trend].ja : trendLabels[trend].en;
      return `${label}: ${count}件`;
    });

    return distribution.join('\n');
  }

  private generateAlertSummaryContent(
    alerts: Alert[],
    lang: 'ja' | 'en'
  ): string {
    const byType = new Map<string, number>();
    for (const alert of alerts) {
      byType.set(alert.type, (byType.get(alert.type) || 0) + 1);
    }

    const typeLabels: Record<string, { ja: string; en: string }> = {
      phase_transition: { ja: 'フェーズ遷移', en: 'Phase Transition' },
      maturity_change: { ja: '成熟度変化', en: 'Maturity Change' },
      trend_shift: { ja: 'トレンド変化', en: 'Trend Shift' },
      emerging_technology: { ja: '新興技術', en: 'Emerging Technology' },
      declining_technology: { ja: '衰退技術', en: 'Declining Technology' },
      anomaly_detected: { ja: '異常検出', en: 'Anomaly Detected' },
    };

    const lines = Array.from(byType.entries()).map(([type, count]) => {
      const label =
        lang === 'ja' ? typeLabels[type]?.ja : typeLabels[type]?.en;
      return `${label || type}: ${count}件`;
    });

    return lines.join('\n');
  }

  private generateTechnologyDetailsContent(
    technologies: TechnologySummary[],
    lang: 'ja' | 'en'
  ): string {
    const lines = technologies.map((t) => {
      const changeIcon = t.change === 'improved' ? '↑' : t.change === 'declined' ? '↓' : '→';
      if (lang === 'ja') {
        return `- ${t.name}: ${t.phaseLabel} (成熟度: ${t.maturityScore.toFixed(0)}%) ${changeIcon}`;
      }
      return `- ${t.name}: ${PHASE_METADATA[t.phase].label} (Maturity: ${t.maturityScore.toFixed(0)}%) ${changeIcon}`;
    });

    return lines.join('\n');
  }

  private generateExecutiveSummary(
    technologies: TechnologySummary[],
    alerts: Alert[],
    lang: 'ja' | 'en'
  ): string {
    const improved = technologies.filter((t) => t.change === 'improved').length;
    const declined = technologies.filter((t) => t.change === 'declined').length;
    const criticalAlerts = alerts.filter((a) => a.severity === 'critical').length;

    if (lang === 'ja') {
      const parts = [
        `本期間中、${technologies.length}件の技術を監視しました。`,
      ];

      if (improved > 0) {
        parts.push(`${improved}件の技術で改善が見られました。`);
      }
      if (declined > 0) {
        parts.push(`${declined}件の技術で低下が検出されました。`);
      }
      if (criticalAlerts > 0) {
        parts.push(`重要アラート${criticalAlerts}件が発生しました。`);
      }

      return parts.join(' ');
    }

    const parts = [
      `During this period, ${technologies.length} technologies were monitored.`,
    ];

    if (improved > 0) {
      parts.push(`${improved} technologies showed improvement.`);
    }
    if (declined > 0) {
      parts.push(`${declined} technologies showed decline.`);
    }
    if (criticalAlerts > 0) {
      parts.push(`${criticalAlerts} critical alerts were generated.`);
    }

    return parts.join(' ');
  }

  private generateHighlights(
    technologies: TechnologySummary[],
    alerts: Alert[],
    lang: 'ja' | 'en'
  ): string[] {
    const highlights: string[] = [];

    // Top improved technology
    const improved = technologies
      .filter((t) => t.change === 'improved')
      .sort((a, b) => b.maturityScore - a.maturityScore);
    if (improved.length > 0) {
      const top = improved[0];
      if (lang === 'ja') {
        highlights.push(`${top.name}が最も顕著な成長を示しました`);
      } else {
        highlights.push(`${top.name} showed the most notable growth`);
      }
    }

    // Technologies reaching plateau
    const plateau = technologies.filter(
      (t) => t.phase === 'plateau_of_productivity'
    );
    if (plateau.length > 0) {
      if (lang === 'ja') {
        highlights.push(`${plateau.length}件の技術が安定期に到達`);
      } else {
        highlights.push(`${plateau.length} technologies reached plateau`);
      }
    }

    // Critical alerts
    const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      if (lang === 'ja') {
        highlights.push(`重要アラート: ${criticalAlerts.length}件発生`);
      } else {
        highlights.push(`Critical alerts: ${criticalAlerts.length} generated`);
      }
    }

    return highlights;
  }

  private generateRecommendations(
    technologies: TechnologySummary[],
    alerts: Alert[],
    lang: 'ja' | 'en'
  ): string[] {
    const recommendations: string[] = [];

    // Declining technologies
    const declining = technologies.filter(
      (t) => t.trend === 'declining' || t.change === 'declined'
    );
    if (declining.length > 0) {
      if (lang === 'ja') {
        recommendations.push(
          `衰退傾向の技術（${declining.map((t) => t.name).join('、')}）について代替技術の検討を推奨します`
        );
      } else {
        recommendations.push(
          `Consider alternatives for declining technologies: ${declining.map((t) => t.name).join(', ')}`
        );
      }
    }

    // Technologies in trough
    const inTrough = technologies.filter(
      (t) => t.phase === 'trough_of_disillusionment'
    );
    if (inTrough.length > 0) {
      if (lang === 'ja') {
        recommendations.push(
          `幻滅期にある技術（${inTrough.map((t) => t.name).join('、')}）の動向を注視することを推奨します`
        );
      } else {
        recommendations.push(
          `Monitor technologies in trough: ${inTrough.map((t) => t.name).join(', ')}`
        );
      }
    }

    // Unacknowledged critical alerts
    const unackedCritical = alerts.filter(
      (a) => a.severity === 'critical' && !a.acknowledged
    );
    if (unackedCritical.length > 0) {
      if (lang === 'ja') {
        recommendations.push(
          `${unackedCritical.length}件の未確認重要アラートの対応を推奨します`
        );
      } else {
        recommendations.push(
          `Address ${unackedCritical.length} unacknowledged critical alerts`
        );
      }
    }

    return recommendations;
  }

  private generateTitle(
    period: ReportPeriod,
    start: Date,
    end: Date,
    lang: 'ja' | 'en'
  ): string {
    const periodLabels: Record<ReportPeriod, { ja: string; en: string }> = {
      weekly: { ja: '週次', en: 'Weekly' },
      monthly: { ja: '月次', en: 'Monthly' },
      quarterly: { ja: '四半期', en: 'Quarterly' },
      annual: { ja: '年次', en: 'Annual' },
    };

    const formatDate = (d: Date): string => {
      return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
    };

    const periodLabel =
      lang === 'ja' ? periodLabels[period].ja : periodLabels[period].en;
    const dateRange = `${formatDate(start)} - ${formatDate(end)}`;

    if (lang === 'ja') {
      return `技術ライフサイクル${periodLabel}レポート (${dateRange})`;
    }
    return `Technology Lifecycle ${periodLabel} Report (${dateRange})`;
  }

  private calculateAverageMaturity(technologies: TechnologySummary[]): number {
    if (technologies.length === 0) return 0;
    const sum = technologies.reduce((acc, t) => acc + t.maturityScore, 0);
    return sum / technologies.length;
  }

  private renderReport(
    report: PeriodicReport,
    format: 'markdown' | 'html',
    lang: 'ja' | 'en'
  ): string {
    if (format === 'markdown') {
      return this.renderMarkdown(report, lang);
    }
    return this.renderHtml(report, lang);
  }

  private renderMarkdown(report: PeriodicReport, lang: 'ja' | 'en'): string {
    const lines: string[] = [];

    // Title
    lines.push(`# ${report.title}`);
    lines.push('');

    // Generation info
    lines.push(
      lang === 'ja'
        ? `生成日時: ${report.generatedAt.toISOString()}`
        : `Generated: ${report.generatedAt.toISOString()}`
    );
    lines.push('');

    // Executive Summary
    lines.push(lang === 'ja' ? '## エグゼクティブサマリー' : '## Executive Summary');
    lines.push('');
    lines.push(report.executiveSummary);
    lines.push('');

    // Highlights
    if (report.highlights.length > 0) {
      lines.push(lang === 'ja' ? '## ハイライト' : '## Highlights');
      lines.push('');
      report.highlights.forEach((h) => lines.push(`- ${h}`));
      lines.push('');
    }

    // Sections
    for (const section of report.sections.sort((a, b) => a.order - b.order)) {
      lines.push(`## ${section.title}`);
      lines.push('');
      lines.push(section.content);
      lines.push('');
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      lines.push(lang === 'ja' ? '## 推奨事項' : '## Recommendations');
      lines.push('');
      report.recommendations.forEach((r) => lines.push(`- ${r}`));
      lines.push('');
    }

    return lines.join('\n');
  }

  private renderHtml(report: PeriodicReport, lang: 'ja' | 'en'): string {
    // Simplified HTML rendering
    const sections = report.sections
      .sort((a, b) => a.order - b.order)
      .map(
        (s) => `<section><h2>${s.title}</h2><pre>${s.content}</pre></section>`
      )
      .join('\n');

    const highlights = report.highlights.map((h) => `<li>${h}</li>`).join('\n');
    const recommendations = report.recommendations
      .map((r) => `<li>${r}</li>`)
      .join('\n');

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${report.title}</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    h2 { color: #666; border-bottom: 1px solid #ddd; }
    pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
    ul { list-style-type: disc; padding-left: 20px; }
  </style>
</head>
<body>
  <h1>${report.title}</h1>
  <p><em>${lang === 'ja' ? '生成日時' : 'Generated'}: ${report.generatedAt.toISOString()}</em></p>
  
  <h2>${lang === 'ja' ? 'エグゼクティブサマリー' : 'Executive Summary'}</h2>
  <p>${report.executiveSummary}</p>
  
  ${highlights.length > 0 ? `<h2>${lang === 'ja' ? 'ハイライト' : 'Highlights'}</h2><ul>${highlights}</ul>` : ''}
  
  ${sections}
  
  ${recommendations.length > 0 ? `<h2>${lang === 'ja' ? '推奨事項' : 'Recommendations'}</h2><ul>${recommendations}</ul>` : ''}
</body>
</html>`;
  }
}
