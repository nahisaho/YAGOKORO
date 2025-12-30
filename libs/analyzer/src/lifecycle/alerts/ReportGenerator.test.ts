/**
 * @fileoverview ReportGenerator Tests
 * TASK-V2-027: Periodic report generation tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ReportGenerator,
  type TechnologyDataProvider,
} from './ReportGenerator.js';
import { InMemoryAlertStore, AlertGenerator } from './AlertGenerator.js';
import type { LifecyclePhase, TrendDirection } from '../types.js';

describe('ReportGenerator', () => {
  let reportGenerator: ReportGenerator;
  let alertStore: InMemoryAlertStore;
  let mockDataProvider: TechnologyDataProvider;

  const createMockDataProvider = (
    technologies: Array<{
      id: string;
      name: string;
      phase: LifecyclePhase;
      maturity: number;
      trend: TrendDirection;
      change: 'improved' | 'stable' | 'declined';
    }>
  ): TechnologyDataProvider => ({
    getAllTechnologyIds: vi.fn().mockResolvedValue(technologies.map((t) => t.id)),
    getTechnologyName: vi.fn().mockImplementation(async (id: string) => {
      return technologies.find((t) => t.id === id)?.name || 'Unknown';
    }),
    getCurrentPhase: vi.fn().mockImplementation(async (id: string) => {
      return technologies.find((t) => t.id === id)?.phase || 'innovation_trigger';
    }),
    getMaturityScore: vi.fn().mockImplementation(async (id: string) => {
      return technologies.find((t) => t.id === id)?.maturity || 0;
    }),
    getCurrentTrend: vi.fn().mockImplementation(async (id: string) => {
      return technologies.find((t) => t.id === id)?.trend || 'stable';
    }),
    getNotableEvents: vi.fn().mockResolvedValue([]),
    compareWithPreviousPeriod: vi.fn().mockImplementation(async (id: string) => {
      return technologies.find((t) => t.id === id)?.change || 'stable';
    }),
  });

  beforeEach(() => {
    alertStore = new InMemoryAlertStore();
    mockDataProvider = createMockDataProvider([
      {
        id: 'tech-1',
        name: 'React',
        phase: 'plateau_of_productivity',
        maturity: 85,
        trend: 'stable',
        change: 'stable',
      },
      {
        id: 'tech-2',
        name: 'Vue.js',
        phase: 'slope_of_enlightenment',
        maturity: 72,
        trend: 'rising',
        change: 'improved',
      },
      {
        id: 'tech-3',
        name: 'Svelte',
        phase: 'peak_of_expectations',
        maturity: 55,
        trend: 'rising',
        change: 'improved',
      },
      {
        id: 'tech-4',
        name: 'jQuery',
        phase: 'trough_of_disillusionment',
        maturity: 35,
        trend: 'declining',
        change: 'declined',
      },
    ]);
    reportGenerator = new ReportGenerator(mockDataProvider, alertStore);
  });

  describe('report generation', () => {
    it('should generate a monthly report', async () => {
      const report = await reportGenerator.generateReport({
        period: 'monthly',
        format: 'json',
        language: 'ja',
      });

      expect(report.id).toBeDefined();
      expect(report.period).toBe('monthly');
      expect(report.periodStart).toBeInstanceOf(Date);
      expect(report.periodEnd).toBeInstanceOf(Date);
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.title).toContain('月次');
    });

    it('should generate a quarterly report', async () => {
      const report = await reportGenerator.generateReport({
        period: 'quarterly',
        format: 'json',
        language: 'en',
      });

      expect(report.period).toBe('quarterly');
      expect(report.title).toContain('Quarterly');
    });

    it('should include technology summaries', async () => {
      const report = await reportGenerator.generateReport();

      expect(report.technologies).toHaveLength(4);
      expect(report.technologies.map((t) => t.name)).toContain('React');
      expect(report.technologies.map((t) => t.name)).toContain('Vue.js');
    });

    it('should filter by specific technologies', async () => {
      const report = await reportGenerator.generateReport({
        technologyIds: ['tech-1', 'tech-2'],
      });

      expect(report.technologies).toHaveLength(2);
      expect(report.technologies.map((t) => t.name)).toContain('React');
      expect(report.technologies.map((t) => t.name)).toContain('Vue.js');
      expect(report.technologies.map((t) => t.name)).not.toContain('jQuery');
    });
  });

  describe('executive summary', () => {
    it('should include key statistics in Japanese', async () => {
      const report = await reportGenerator.generateReport({
        language: 'ja',
      });

      expect(report.executiveSummary).toContain('4件の技術を監視しました');
      expect(report.executiveSummary).toContain('2件の技術で改善');
    });

    it('should include key statistics in English', async () => {
      const report = await reportGenerator.generateReport({
        language: 'en',
      });

      expect(report.executiveSummary).toContain('4 technologies were monitored');
      expect(report.executiveSummary).toContain('2 technologies showed improvement');
    });
  });

  describe('report sections', () => {
    it('should generate standard sections', async () => {
      const report = await reportGenerator.generateReport({
        language: 'ja',
      });

      const sectionTitles = report.sections.map((s) => s.title);
      expect(sectionTitles).toContain('概要');
      expect(sectionTitles).toContain('フェーズ分布');
      expect(sectionTitles).toContain('トレンド分析');
      expect(sectionTitles).toContain('技術詳細');
    });

    it('should include alert summary when alerts exist', async () => {
      // Add some alerts
      const alertGenerator = new AlertGenerator(alertStore);
      await alertGenerator.generateEmergingAlert(
        'tech-5',
        'New Tech',
        85,
        ['High growth'],
        'New emerging technology'
      );

      const report = await reportGenerator.generateReport({
        language: 'ja',
        includeAlerts: true,
      });

      const alertSection = report.sections.find(
        (s) => s.title === 'アラートサマリー'
      );
      expect(alertSection).toBeDefined();
    });

    it('should order sections correctly', async () => {
      const report = await reportGenerator.generateReport();

      for (let i = 0; i < report.sections.length - 1; i++) {
        expect(report.sections[i].order).toBeLessThanOrEqual(
          report.sections[i + 1].order
        );
      }
    });
  });

  describe('highlights', () => {
    it('should identify improved technologies', async () => {
      const report = await reportGenerator.generateReport({
        language: 'ja',
      });

      // Vue.js has higher maturity than Svelte among improved
      expect(report.highlights.some((h) => h.includes('Vue.js'))).toBe(true);
    });

    it('should identify technologies reaching plateau', async () => {
      const report = await reportGenerator.generateReport({
        language: 'ja',
      });

      // React is at plateau
      expect(
        report.highlights.some((h) => h.includes('安定期に到達'))
      ).toBe(true);
    });
  });

  describe('recommendations', () => {
    it('should recommend alternatives for declining technologies', async () => {
      const report = await reportGenerator.generateReport({
        language: 'ja',
        includeRecommendations: true,
      });

      expect(
        report.recommendations.some((r) => r.includes('jQuery'))
      ).toBe(true);
      expect(
        report.recommendations.some((r) => r.includes('代替技術'))
      ).toBe(true);
    });

    it('should recommend monitoring technologies in trough', async () => {
      const report = await reportGenerator.generateReport({
        language: 'ja',
        includeRecommendations: true,
      });

      expect(
        report.recommendations.some((r) => r.includes('幻滅期'))
      ).toBe(true);
    });
  });

  describe('markdown rendering', () => {
    it('should render markdown format', async () => {
      const report = await reportGenerator.generateReport({
        format: 'markdown',
        language: 'ja',
      });

      expect(report.renderedContent).toBeDefined();
      expect(report.renderedContent).toContain('# 技術ライフサイクル');
      expect(report.renderedContent).toContain('## エグゼクティブサマリー');
      expect(report.renderedContent).toContain('## ハイライト');
    });

    it('should include all sections in markdown', async () => {
      const report = await reportGenerator.generateReport({
        format: 'markdown',
        language: 'en',
      });

      expect(report.renderedContent).toContain('## Overview');
      expect(report.renderedContent).toContain('## Phase Distribution');
      expect(report.renderedContent).toContain('## Trend Analysis');
    });
  });

  describe('HTML rendering', () => {
    it('should render HTML format', async () => {
      const report = await reportGenerator.generateReport({
        format: 'html',
        language: 'ja',
      });

      expect(report.renderedContent).toBeDefined();
      expect(report.renderedContent).toContain('<!DOCTYPE html>');
      expect(report.renderedContent).toContain('<html lang="ja">');
      expect(report.renderedContent).toContain('<h1>');
    });

    it('should include styling in HTML', async () => {
      const report = await reportGenerator.generateReport({
        format: 'html',
        language: 'en',
      });

      expect(report.renderedContent).toContain('<style>');
      expect(report.renderedContent).toContain('font-family');
    });
  });

  describe('period calculations', () => {
    it('should calculate weekly period correctly', async () => {
      const report = await reportGenerator.generateReport({
        period: 'weekly',
      });

      const daysDiff = Math.round(
        (report.periodEnd.getTime() - report.periodStart.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      // Allow some variance due to time precision
      expect(daysDiff).toBeGreaterThanOrEqual(6);
      expect(daysDiff).toBeLessThanOrEqual(8);
    });

    it('should calculate monthly period correctly', async () => {
      const report = await reportGenerator.generateReport({
        period: 'monthly',
      });

      const daysDiff = Math.round(
        (report.periodEnd.getTime() - report.periodStart.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      // Monthly period should be roughly 28-31 days
      expect(daysDiff).toBeGreaterThanOrEqual(27);
      expect(daysDiff).toBeLessThanOrEqual(32);
    });

    it('should calculate quarterly period correctly', async () => {
      const report = await reportGenerator.generateReport({
        period: 'quarterly',
      });

      const daysDiff = Math.round(
        (report.periodEnd.getTime() - report.periodStart.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      // Quarterly period should be roughly 89-93 days
      expect(daysDiff).toBeGreaterThanOrEqual(88);
      expect(daysDiff).toBeLessThanOrEqual(94);
    });
  });

  describe('technology summaries', () => {
    it('should include phase labels', async () => {
      const report = await reportGenerator.generateReport({
        language: 'ja',
      });

      const react = report.technologies.find((t) => t.name === 'React');
      expect(react?.phaseLabel).toBe('安定期');

      const jquery = report.technologies.find((t) => t.name === 'jQuery');
      expect(jquery?.phaseLabel).toBe('幻滅期');
    });

    it('should include maturity scores', async () => {
      const report = await reportGenerator.generateReport();

      const react = report.technologies.find((t) => t.name === 'React');
      expect(react?.maturityScore).toBe(85);

      const svelte = report.technologies.find((t) => t.name === 'Svelte');
      expect(svelte?.maturityScore).toBe(55);
    });

    it('should include change indicators', async () => {
      const report = await reportGenerator.generateReport();

      const vue = report.technologies.find((t) => t.name === 'Vue.js');
      expect(vue?.change).toBe('improved');

      const jquery = report.technologies.find((t) => t.name === 'jQuery');
      expect(jquery?.change).toBe('declined');
    });
  });

  describe('empty data handling', () => {
    it('should handle empty technology list', async () => {
      const emptyProvider = createMockDataProvider([]);
      const emptyReportGenerator = new ReportGenerator(emptyProvider, alertStore);

      const report = await emptyReportGenerator.generateReport();

      expect(report.technologies).toHaveLength(0);
      expect(report.executiveSummary).toContain('0');
    });

    it('should handle no alerts', async () => {
      const report = await reportGenerator.generateReport({
        includeAlerts: true,
      });

      expect(report.alerts).toHaveLength(0);
    });
  });
});
