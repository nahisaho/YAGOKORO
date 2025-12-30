/**
 * @fileoverview Technology Lifecycle Tracker Service
 * FR-004: Orchestrates timeline aggregation, phase detection, and trend prediction
 */

import type {
  LifecycleReport,
  EmergingTechnology,
  DecliningTechnology,
  LifecyclePhase,
  MaturityScore,
  TrendForecast,
  PhaseDetectionResult,
} from './types.js';
import {
  TimelineAggregator,
  type TimelineEntityRepository,
  type AggregatedTimeline,
} from './TimelineAggregator.js';
import { PhaseDetector } from './PhaseDetector.js';
import { TrendPredictor, type TrendLLMInterface } from './TrendPredictor.js';

/**
 * Configuration for TechnologyLifecycleTrackerService
 */
export interface LifecycleTrackerConfig {
  /** Minimum events to analyze */
  readonly minEventsForAnalysis: number;
  /** Threshold for emerging detection */
  readonly emergingThreshold: {
    readonly minGrowthRate: number;
    readonly maxDaysOld: number;
    readonly minConfidence: number;
  };
  /** Threshold for declining detection */
  readonly decliningThreshold: {
    readonly minDeclineRate: number;
    readonly minInactivityDays: number;
    readonly minConfidence: number;
  };
  /** Enable LLM-based analysis */
  readonly enableLLMAnalysis: boolean;
  /** Forecast horizon in days */
  readonly defaultForecastHorizonDays: number;
}

const DEFAULT_CONFIG: LifecycleTrackerConfig = {
  minEventsForAnalysis: 5,
  emergingThreshold: {
    minGrowthRate: 0.3,
    maxDaysOld: 730,
    minConfidence: 0.5,
  },
  decliningThreshold: {
    minDeclineRate: 0.3,
    minInactivityDays: 365,
    minConfidence: 0.5,
  },
  enableLLMAnalysis: false,
  defaultForecastHorizonDays: 365,
};

/**
 * Repository interface for lifecycle tracking
 */
export interface LifecycleRepository {
  /** Get all technology IDs */
  getAllTechnologyIds(): Promise<string[]>;
  /** Get technology name by ID */
  getTechnologyName(id: string): Promise<string | undefined>;
  /** Get related technologies */
  getRelatedTechnologies(id: string): Promise<string[]>;
}

/**
 * Result of lifecycle analysis
 */
export interface LifecycleAnalysisResult {
  readonly technologyId: string;
  readonly technologyName: string;
  readonly timeline: AggregatedTimeline;
  readonly phase: PhaseDetectionResult;
  readonly maturity: MaturityScore;
  readonly forecast: TrendForecast;
  readonly analyzedAt: Date;
}

/**
 * Technology Lifecycle Tracker Service
 * Orchestrates lifecycle analysis for technologies
 */
export class TechnologyLifecycleTrackerService {
  private readonly config: LifecycleTrackerConfig;
  private readonly timelineAggregator: TimelineAggregator;
  private readonly phaseDetector: PhaseDetector;
  private readonly trendPredictor: TrendPredictor;
  private readonly lifecycleRepository: LifecycleRepository;

  constructor(
    timelineRepository: TimelineEntityRepository,
    lifecycleRepository: LifecycleRepository,
    config: Partial<LifecycleTrackerConfig> = {},
    llm?: TrendLLMInterface
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.lifecycleRepository = lifecycleRepository;
    this.timelineAggregator = new TimelineAggregator(timelineRepository);
    this.phaseDetector = new PhaseDetector();
    this.trendPredictor = new TrendPredictor(
      {
        enableLLMAnalysis: this.config.enableLLMAnalysis,
        defaultHorizonDays: this.config.defaultForecastHorizonDays,
      },
      llm
    );
  }

  /**
   * Analyze single technology lifecycle
   */
  async analyzeTechnology(technologyId: string): Promise<LifecycleAnalysisResult> {
    // 1. Aggregate timeline
    const timeline = await this.timelineAggregator.aggregateTimeline(technologyId);

    if (timeline.events.length < this.config.minEventsForAnalysis) {
      throw new Error(
        `Insufficient data for analysis: ${timeline.events.length} events (minimum: ${this.config.minEventsForAnalysis})`
      );
    }

    // 2. Detect phase
    const phase = this.phaseDetector.detectPhase(timeline);

    // 3. Calculate maturity
    const maturity = this.phaseDetector.calculateMaturityScore(timeline);

    // 4. Generate forecast
    const forecast = await this.trendPredictor.generateForecast(
      timeline,
      phase,
      this.config.defaultForecastHorizonDays
    );

    return {
      technologyId,
      technologyName: timeline.technologyName,
      timeline,
      phase,
      maturity,
      forecast,
      analyzedAt: new Date(),
    };
  }

  /**
   * Generate comprehensive lifecycle report
   */
  async generateReport(technologyId: string): Promise<LifecycleReport> {
    const analysis = await this.analyzeTechnology(technologyId);
    const related = await this.lifecycleRepository.getRelatedTechnologies(technologyId);

    // Analyze related technologies
    const relatedAnalyses: Array<{
      id: string;
      phase: LifecyclePhase;
      trend: TrendForecast['currentTrend'];
    }> = [];

    for (const relatedId of related.slice(0, 5)) {
      try {
        const relatedAnalysis = await this.analyzeTechnology(relatedId);
        relatedAnalyses.push({
          id: relatedId,
          phase: relatedAnalysis.phase.phase,
          trend: relatedAnalysis.forecast.currentTrend,
        });
      } catch {
        // Skip technologies with insufficient data
      }
    }

    // Generate summary
    const summary = this.generateSummary(analysis);

    return {
      technologyId: analysis.technologyId,
      technologyName: analysis.technologyName,
      generatedAt: new Date(),
      currentPhase: analysis.phase,
      maturityScore: analysis.maturity,
      timeline: analysis.timeline,
      forecast: analysis.forecast,
      relatedTechnologies: relatedAnalyses.map((r) => ({
        id: r.id,
        phase: r.phase,
        relationship: 'related',
      })),
      summary,
    };
  }

  /**
   * Find emerging technologies across all tracked technologies
   */
  async findEmergingTechnologies(): Promise<EmergingTechnology[]> {
    const allIds = await this.lifecycleRepository.getAllTechnologyIds();
    const emerging: EmergingTechnology[] = [];
    const now = new Date();

    for (const id of allIds) {
      try {
        const analysis = await this.analyzeTechnology(id);

        // Check if technology is emerging
        if (this.isEmerging(analysis, now)) {
          emerging.push({
            technologyId: analysis.technologyId,
            technologyName: analysis.technologyName,
            phase: analysis.phase.phase,
            growthRate: this.calculateGrowthRate(analysis.timeline),
            keyIndicators: this.extractEmergingIndicators(analysis),
            firstSeen: analysis.timeline.dateRange.earliest,
            confidence: analysis.phase.confidence,
          });
        }
      } catch {
        // Skip technologies with insufficient data
      }
    }

    // Sort by growth rate descending
    return emerging.sort((a, b) => b.growthRate - a.growthRate);
  }

  /**
   * Find declining technologies
   */
  async findDecliningTechnologies(): Promise<DecliningTechnology[]> {
    const allIds = await this.lifecycleRepository.getAllTechnologyIds();
    const declining: DecliningTechnology[] = [];
    const now = new Date();

    for (const id of allIds) {
      try {
        const analysis = await this.analyzeTechnology(id);

        // Check if technology is declining
        if (this.isDeclining(analysis, now)) {
          const alternatives = await this.findAlternatives(analysis);

          declining.push({
            technologyId: analysis.technologyId,
            technologyName: analysis.technologyName,
            phase: analysis.phase.phase,
            declineRate: this.calculateDeclineRate(analysis.timeline),
            lastActiveDate: analysis.timeline.dateRange.latest,
            replacements: alternatives,
            confidence: analysis.phase.confidence,
          });
        }
      } catch {
        // Skip technologies with insufficient data
      }
    }

    // Sort by decline rate descending
    return declining.sort((a, b) => b.declineRate - a.declineRate);
  }

  /**
   * Compare lifecycle of multiple technologies
   */
  async compareTechnologies(
    technologyIds: string[]
  ): Promise<Map<string, LifecycleAnalysisResult>> {
    const results = new Map<string, LifecycleAnalysisResult>();

    await Promise.all(
      technologyIds.map(async (id) => {
        try {
          const analysis = await this.analyzeTechnology(id);
          results.set(id, analysis);
        } catch {
          // Skip technologies with insufficient data
        }
      })
    );

    return results;
  }

  /**
   * Get technologies by phase
   */
  async getTechnologiesByPhase(
    targetPhase: LifecyclePhase
  ): Promise<LifecycleAnalysisResult[]> {
    const allIds = await this.lifecycleRepository.getAllTechnologyIds();
    const results: LifecycleAnalysisResult[] = [];

    for (const id of allIds) {
      try {
        const analysis = await this.analyzeTechnology(id);
        if (analysis.phase.phase === targetPhase) {
          results.push(analysis);
        }
      } catch {
        // Skip technologies with insufficient data
      }
    }

    return results.sort((a, b) => b.phase.confidence - a.phase.confidence);
  }

  // ============ Private Helpers ============

  private generateSummary(analysis: LifecycleAnalysisResult): string {
    const { technologyName, phase, maturity, forecast } = analysis;
    const phaseLabel = this.phaseDetector.getPhaseMetadata(phase.phase).label;

    const trendText =
      forecast.currentTrend === 'rising'
        ? '成長中'
        : forecast.currentTrend === 'declining'
          ? '減少傾向'
          : forecast.currentTrend === 'stable'
            ? '安定'
            : '変動的';

    const overallMaturity =
      (maturity.researchActivity +
        maturity.industryAdoption +
        maturity.communityEngagement +
        maturity.documentationQuality +
        maturity.stability) /
      5;

    return (
      `${technologyName}は現在「${phaseLabel}」フェーズにあり、` +
      `トレンドは${trendText}です。` +
      `成熟度スコアは${(overallMaturity * 100).toFixed(0)}%で、` +
      `今後${forecast.horizonDays}日間の予測信頼度は${(forecast.confidence * 100).toFixed(0)}%です。`
    );
  }

  private isEmerging(analysis: LifecycleAnalysisResult, now: Date): boolean {
    const { emergingThreshold } = this.config;

    // Check age
    const ageInDays = Math.floor(
      (now.getTime() - analysis.timeline.dateRange.earliest.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (ageInDays > emergingThreshold.maxDaysOld) {
      return false;
    }

    // Check confidence
    if (analysis.phase.confidence < emergingThreshold.minConfidence) {
      return false;
    }

    // Check growth rate
    const growthRate = this.calculateGrowthRate(analysis.timeline);
    if (growthRate < emergingThreshold.minGrowthRate) {
      return false;
    }

    // Must be in early phases
    const earlyPhases: LifecyclePhase[] = ['innovation_trigger', 'peak_of_expectations'];
    return earlyPhases.includes(analysis.phase.phase);
  }

  private isDeclining(analysis: LifecycleAnalysisResult, now: Date): boolean {
    const { decliningThreshold } = this.config;

    // Check confidence
    if (analysis.phase.confidence < decliningThreshold.minConfidence) {
      return false;
    }

    // Check inactivity
    const daysSinceLastActivity = Math.floor(
      (now.getTime() - analysis.timeline.dateRange.latest.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const isInactive = daysSinceLastActivity >= decliningThreshold.minInactivityDays;

    // Check decline rate
    const declineRate = this.calculateDeclineRate(analysis.timeline);
    const isDeclining = declineRate >= decliningThreshold.minDeclineRate;

    // Must be in late phase or showing decline
    const latePhases: LifecyclePhase[] = [
      'trough_of_disillusionment',
      'plateau_of_productivity',
    ];

    return (
      (isInactive || isDeclining) &&
      (latePhases.includes(analysis.phase.phase) ||
        analysis.forecast.currentTrend === 'declining')
    );
  }

  private calculateGrowthRate(timeline: AggregatedTimeline): number {
    if (timeline.events.length < 2) return 0;

    // Group events by quarter
    const quarters = new Map<string, number>();

    for (const event of timeline.events) {
      const key = `${event.date.getFullYear()}-Q${Math.floor(event.date.getMonth() / 3) + 1}`;
      quarters.set(key, (quarters.get(key) ?? 0) + 1);
    }

    if (quarters.size < 2) return 0;

    const values = Array.from(quarters.values());
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (firstAvg === 0) return secondAvg > 0 ? 1 : 0;

    return (secondAvg - firstAvg) / firstAvg;
  }

  private calculateDeclineRate(timeline: AggregatedTimeline): number {
    const growthRate = this.calculateGrowthRate(timeline);
    return growthRate < 0 ? Math.abs(growthRate) : 0;
  }

  private extractEmergingIndicators(analysis: LifecycleAnalysisResult): string[] {
    const indicators: string[] = [];

    if (analysis.forecast.currentTrend === 'rising') {
      indicators.push('急速な成長トレンド');
    }

    if (analysis.maturity.researchActivity > 0.6) {
      indicators.push('活発な研究活動');
    }

    if (analysis.maturity.communityEngagement > 0.5) {
      indicators.push('コミュニティの関心増加');
    }

    if (analysis.timeline.eventCounts.adoption > 0) {
      indicators.push('企業での採用開始');
    }

    if (analysis.phase.confidence > 0.7) {
      indicators.push('高い分析信頼度');
    }

    return indicators;
  }

  private async findAlternatives(
    analysis: LifecycleAnalysisResult
  ): Promise<Array<{ id: string; name: string }>> {
    const related = await this.lifecycleRepository.getRelatedTechnologies(
      analysis.technologyId
    );

    const alternatives: Array<{ id: string; name: string }> = [];

    for (const relatedId of related.slice(0, 3)) {
      try {
        const relatedAnalysis = await this.analyzeTechnology(relatedId);

        // Find related technologies that are growing
        if (
          relatedAnalysis.forecast.currentTrend === 'rising' ||
          relatedAnalysis.phase.phase === 'slope_of_enlightenment' ||
          relatedAnalysis.phase.phase === 'plateau_of_productivity'
        ) {
          alternatives.push({
            id: relatedId,
            name: relatedAnalysis.technologyName,
          });
        }
      } catch {
        // Skip
      }
    }

    return alternatives;
  }
}
