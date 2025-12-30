/**
 * @fileoverview TrendPredictor
 *
 * Predicts future trends and phase transitions for technologies.
 * Uses linear extrapolation and qualitative factor analysis.
 */

import type {
  TrendForecast,
  TrendDirection,
  TrendFactor,
  TrendRisk,
  PredictedTransition,
  LifecyclePhase,
  PhaseDetectionResult,
} from './types.js';
import type { AggregatedTimeline } from './TimelineAggregator.js';

/**
 * LLM interface for qualitative analysis
 */
export interface TrendLLMInterface {
  /** Analyze trend factors using LLM */
  analyzeTrendFactors(context: string): Promise<TrendFactor[]>;
  /** Generate risk assessment */
  assessRisks(context: string): Promise<TrendRisk[]>;
}

/**
 * TrendPredictor configuration
 */
export interface TrendPredictorConfig {
  /** Default forecast horizon in days */
  defaultHorizonDays: number;
  /** Minimum data points for linear extrapolation */
  minDataPoints: number;
  /** Confidence decay factor per year */
  confidenceDecayPerYear: number;
  /** Enable LLM-based analysis */
  enableLLMAnalysis: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: TrendPredictorConfig = {
  defaultHorizonDays: 365,
  minDataPoints: 5,
  confidenceDecayPerYear: 0.2,
  enableLLMAnalysis: false,
};

/**
 * Time series data point
 */
interface DataPoint {
  date: Date;
  value: number;
}

/**
 * Linear regression result
 */
interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
}

/**
 * TrendPredictor class
 *
 * Forecasts technology trends using statistical and qualitative methods.
 */
export class TrendPredictor {
  private readonly config: TrendPredictorConfig;
  private readonly llm: TrendLLMInterface | undefined;

  constructor(config: Partial<TrendPredictorConfig> = {}, llm?: TrendLLMInterface) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    if (llm) {
      this.llm = llm;
    }
  }

  /**
   * Generate trend forecast for a technology
   */
  async generateForecast(
    timeline: AggregatedTimeline,
    currentPhase: PhaseDetectionResult,
    horizonDays?: number
  ): Promise<TrendForecast> {
    const horizon = horizonDays ?? this.config.defaultHorizonDays;

    // Determine current trend direction
    const currentTrend = this.determineTrendDirection(timeline);

    // Calculate base confidence
    let confidence = this.calculateBaseConfidence(timeline);

    // Predict phase transitions
    const predictedTransitions = this.predictTransitions(
      currentPhase,
      currentTrend,
      horizon
    );

    // Analyze trend factors
    const factors = await this.analyzeTrendFactors(timeline, currentPhase);

    // Assess risks
    const risks = await this.assessRisks(timeline, currentPhase);

    // Adjust confidence based on factors and risks
    confidence = this.adjustConfidence(confidence, factors, risks);

    return {
      technologyId: timeline.technologyId,
      generatedAt: new Date(),
      horizonDays: horizon,
      currentTrend,
      predictedTransitions,
      confidence,
      factors,
      risks,
    };
  }

  /**
   * Determine current trend direction
   */
  determineTrendDirection(timeline: AggregatedTimeline): TrendDirection {
    const activitySeries = this.buildActivityTimeSeries(timeline);

    if (activitySeries.length < this.config.minDataPoints) {
      return 'stable';
    }

    const regression = this.linearRegression(activitySeries);

    // Classify based on slope and R²
    const slopeThreshold = 0.1;
    const volatilityThreshold = 0.3;

    if (regression.r2 < volatilityThreshold) {
      return 'volatile';
    }

    if (regression.slope > slopeThreshold) {
      return 'rising';
    }

    if (regression.slope < -slopeThreshold) {
      return 'declining';
    }

    return 'stable';
  }

  /**
   * Predict future activity using linear extrapolation
   */
  linearExtrapolation(
    timeline: AggregatedTimeline,
    futureDays: number
  ): DataPoint[] {
    const activitySeries = this.buildActivityTimeSeries(timeline);

    if (activitySeries.length < this.config.minDataPoints) {
      return [];
    }

    const regression = this.linearRegression(activitySeries);
    const predictions: DataPoint[] = [];

    const lastDate = activitySeries[activitySeries.length - 1]!.date;
    const lastX = activitySeries.length - 1;

    // Generate predictions
    const intervals = Math.min(12, Math.ceil(futureDays / 30));
    for (let i = 1; i <= intervals; i++) {
      const futureDate = new Date(
        lastDate.getTime() + i * 30 * 24 * 60 * 60 * 1000
      );
      const x = lastX + i;
      const predictedValue = Math.max(0, regression.slope * x + regression.intercept);

      predictions.push({
        date: futureDate,
        value: predictedValue,
      });
    }

    return predictions;
  }

  /**
   * Analyze trend factors
   */
  async analyzeTrendFactors(
    timeline: AggregatedTimeline,
    currentPhase: PhaseDetectionResult
  ): Promise<TrendFactor[]> {
    const factors: TrendFactor[] = [];

    // Publication momentum
    const pubMomentum = this.calculatePublicationMomentum(timeline);
    factors.push({
      name: 'Publication Momentum',
      type: pubMomentum > 0 ? 'positive' : pubMomentum < 0 ? 'negative' : 'neutral',
      impact: Math.abs(pubMomentum),
      description:
        pubMomentum > 0
          ? 'Growing research activity indicates continued interest'
          : pubMomentum < 0
            ? 'Declining publications suggest waning interest'
            : 'Stable publication rate maintains current trajectory',
    });

    // Industry adoption
    const adoptionTrend = this.calculateAdoptionTrend(timeline);
    factors.push({
      name: 'Industry Adoption',
      type: adoptionTrend > 0.3 ? 'positive' : adoptionTrend < 0.1 ? 'negative' : 'neutral',
      impact: adoptionTrend,
      description:
        adoptionTrend > 0.3
          ? 'Strong industry adoption drives practical applications'
          : adoptionTrend < 0.1
            ? 'Limited adoption may slow development'
            : 'Moderate adoption supports steady growth',
    });

    // Derivative technologies
    const derivativeImpact = this.calculateDerivativeImpact(timeline);
    factors.push({
      name: 'Derivative Technologies',
      type: derivativeImpact > 0.5 ? 'positive' : 'neutral',
      impact: derivativeImpact,
      description:
        derivativeImpact > 0.5
          ? 'Active development of derivative technologies expands ecosystem'
          : 'Limited derivatives focus development on core technology',
    });

    // Phase-specific factors
    const phaseFactor = this.getPhaseSpecificFactor(currentPhase.phase);
    factors.push(phaseFactor);

    // LLM-based analysis if enabled
    if (this.config.enableLLMAnalysis && this.llm) {
      const context = this.buildAnalysisContext(timeline, currentPhase);
      const llmFactors = await this.llm.analyzeTrendFactors(context);
      factors.push(...llmFactors);
    }

    return factors;
  }

  /**
   * Assess trend risks
   */
  async assessRisks(
    timeline: AggregatedTimeline,
    currentPhase: PhaseDetectionResult
  ): Promise<TrendRisk[]> {
    const risks: TrendRisk[] = [];

    // Concentration risk (few key contributors)
    const concentrationRisk = this.assessConcentrationRisk(timeline);
    if (concentrationRisk.probability > 0.1) {
      risks.push(concentrationRisk);
    }

    // Obsolescence risk
    const obsolescenceRisk = this.assessObsolescenceRisk(timeline, currentPhase);
    if (obsolescenceRisk.probability > 0.1) {
      risks.push(obsolescenceRisk);
    }

    // Hype risk (peak phase)
    if (currentPhase.phase === 'peak_of_expectations') {
      risks.push({
        name: 'Hype Cycle Correction',
        probability: 0.7,
        impact: 0.6,
        mitigations: [
          'Focus on practical applications',
          'Set realistic expectations',
          'Build sustainable community',
        ],
      });
    }

    // LLM-based risk assessment if enabled
    if (this.config.enableLLMAnalysis && this.llm) {
      const context = this.buildAnalysisContext(timeline, currentPhase);
      const llmRisks = await this.llm.assessRisks(context);
      risks.push(...llmRisks);
    }

    return risks;
  }

  /**
   * Predict phase transitions
   */
  private predictTransitions(
    currentPhase: PhaseDetectionResult,
    trend: TrendDirection,
    horizonDays: number
  ): PredictedTransition[] {
    const transitions: PredictedTransition[] = [];
    const phaseOrder: LifecyclePhase[] = [
      'innovation_trigger',
      'peak_of_expectations',
      'trough_of_disillusionment',
      'slope_of_enlightenment',
      'plateau_of_productivity',
    ];

    const currentIndex = phaseOrder.indexOf(currentPhase.phase);
    if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) {
      return transitions;
    }

    const now = new Date();

    // Base transition time varies by phase
    const baseTransitionDays: Record<LifecyclePhase, number> = {
      innovation_trigger: 365,
      peak_of_expectations: 180,
      trough_of_disillusionment: 365,
      slope_of_enlightenment: 730,
      plateau_of_productivity: 0,
    };

    // Adjust based on trend
    const trendMultiplier: Record<TrendDirection, number> = {
      rising: 0.7,
      stable: 1.0,
      declining: 1.5,
      volatile: 1.2,
    };

    let accumulatedDays = 0;

    for (let i = currentIndex + 1; i < phaseOrder.length; i++) {
      const targetPhase = phaseOrder[i]!;
      const previousPhase = phaseOrder[i - 1]!;

      const baseDays = baseTransitionDays[previousPhase];
      const adjustedDays = baseDays * trendMultiplier[trend];
      accumulatedDays += adjustedDays;

      if (accumulatedDays > horizonDays) {
        break;
      }

      // Calculate probability (decreases with time)
      const decayFactor = 1 - (accumulatedDays / horizonDays) * 0.5;
      const probability = Math.max(0.1, decayFactor * currentPhase.confidence);

      transitions.push({
        toPhase: targetPhase,
        estimatedDate: new Date(
          now.getTime() + accumulatedDays * 24 * 60 * 60 * 1000
        ),
        probability,
      });
    }

    return transitions;
  }

  /**
   * Build activity time series from timeline
   */
  private buildActivityTimeSeries(timeline: AggregatedTimeline): DataPoint[] {
    // Group events by month
    const monthlyActivity = new Map<string, number>();

    for (const event of timeline.events) {
      const key = `${event.date.getFullYear()}-${String(event.date.getMonth() + 1).padStart(2, '0')}`;
      monthlyActivity.set(key, (monthlyActivity.get(key) ?? 0) + event.impact);
    }

    // Convert to sorted array
    const series: DataPoint[] = [];
    const sortedKeys = [...monthlyActivity.keys()].sort();

    for (const key of sortedKeys) {
      const [year, month] = key.split('-').map(Number);
      series.push({
        date: new Date(year!, month! - 1, 1),
        value: monthlyActivity.get(key)!,
      });
    }

    return series;
  }

  /**
   * Perform linear regression
   */
  private linearRegression(data: DataPoint[]): RegressionResult {
    const n = data.length;
    if (n < 2) {
      return { slope: 0, intercept: 0, r2: 0 };
    }

    // Use index as x value
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = data[i]!.value;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R²
    const meanY = sumY / n;
    let ssTotal = 0;
    let ssResidual = 0;

    for (let i = 0; i < n; i++) {
      const y = data[i]!.value;
      const yPred = slope * i + intercept;
      ssTotal += (y - meanY) ** 2;
      ssResidual += (y - yPred) ** 2;
    }

    const r2 = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

    return { slope, intercept, r2 };
  }

  /**
   * Calculate publication momentum
   */
  private calculatePublicationMomentum(timeline: AggregatedTimeline): number {
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const twoYearsAgo = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);

    const recentPubs = timeline.events.filter(
      (e) => e.type === 'publication' && e.date >= oneYearAgo
    ).length;

    const previousPubs = timeline.events.filter(
      (e) => e.type === 'publication' && e.date >= twoYearsAgo && e.date < oneYearAgo
    ).length;

    if (previousPubs === 0) {
      return recentPubs > 0 ? 1 : 0;
    }

    return (recentPubs - previousPubs) / previousPubs;
  }

  /**
   * Calculate adoption trend
   */
  private calculateAdoptionTrend(timeline: AggregatedTimeline): number {
    const adoptions = timeline.events.filter((e) => e.type === 'adoption');
    const total = timeline.events.length;

    return total > 0 ? adoptions.length / total : 0;
  }

  /**
   * Calculate derivative impact
   */
  private calculateDerivativeImpact(timeline: AggregatedTimeline): number {
    const derivatives = timeline.events.filter((e) => e.type === 'derivative');
    return Math.min(1, derivatives.length / 10);
  }

  /**
   * Get phase-specific trend factor
   */
  private getPhaseSpecificFactor(phase: LifecyclePhase): TrendFactor {
    const phaseFactors: Record<LifecyclePhase, TrendFactor> = {
      innovation_trigger: {
        name: 'Early Stage Potential',
        type: 'positive',
        impact: 0.6,
        description: 'Early stage technologies have high growth potential',
      },
      peak_of_expectations: {
        name: 'Hype Cycle Position',
        type: 'negative',
        impact: 0.5,
        description: 'Technology at peak hype may face correction',
      },
      trough_of_disillusionment: {
        name: 'Recovery Opportunity',
        type: 'positive',
        impact: 0.4,
        description: 'Trough phase often precedes sustainable growth',
      },
      slope_of_enlightenment: {
        name: 'Maturing Technology',
        type: 'positive',
        impact: 0.7,
        description: 'Technology entering productive development phase',
      },
      plateau_of_productivity: {
        name: 'Stable Maturity',
        type: 'neutral',
        impact: 0.3,
        description: 'Mature technology with stable trajectory',
      },
    };

    return phaseFactors[phase];
  }

  /**
   * Assess concentration risk
   */
  private assessConcentrationRisk(timeline: AggregatedTimeline): TrendRisk {
    // Check if few entities dominate
    const entityCounts = new Map<string, number>();

    for (const event of timeline.events) {
      for (const entityId of event.relatedEntities) {
        entityCounts.set(entityId, (entityCounts.get(entityId) ?? 0) + 1);
      }
    }

    const sortedCounts = [...entityCounts.values()].sort((a, b) => b - a);
    const topConcentration =
      sortedCounts.length > 0 ? sortedCounts[0]! / timeline.events.length : 0;

    return {
      name: 'Concentration Risk',
      probability: topConcentration > 0.5 ? 0.6 : topConcentration > 0.3 ? 0.3 : 0.1,
      impact: topConcentration,
      mitigations: [
        'Diversify contributor base',
        'Encourage community participation',
        'Support independent implementations',
      ],
    };
  }

  /**
   * Assess obsolescence risk
   */
  private assessObsolescenceRisk(
    timeline: AggregatedTimeline,
    currentPhase: PhaseDetectionResult
  ): TrendRisk {
    const now = new Date();
    const daysSinceLastEvent = Math.floor(
      (now.getTime() - timeline.dateRange.latest.getTime()) / (24 * 60 * 60 * 1000)
    );

    const inactivityRisk = Math.min(1, daysSinceLastEvent / 365);
    const phaseRisk =
      currentPhase.phase === 'trough_of_disillusionment' ? 0.3 : 0;

    const probability = Math.min(1, inactivityRisk + phaseRisk);

    return {
      name: 'Obsolescence Risk',
      probability,
      impact: 0.8,
      mitigations: [
        'Monitor emerging alternatives',
        'Invest in modernization',
        'Build migration paths',
      ],
    };
  }

  /**
   * Calculate base confidence
   */
  private calculateBaseConfidence(timeline: AggregatedTimeline): number {
    // More data = higher confidence
    const dataPoints = timeline.events.length;
    const dataConfidence = Math.min(1, Math.log10(dataPoints + 1) / 2);

    // Longer history = higher confidence
    const daysCovered =
      (timeline.dateRange.latest.getTime() -
        timeline.dateRange.earliest.getTime()) /
      (24 * 60 * 60 * 1000);
    const historyConfidence = Math.min(1, daysCovered / (365 * 3));

    return (dataConfidence + historyConfidence) / 2;
  }

  /**
   * Adjust confidence based on factors and risks
   */
  private adjustConfidence(
    baseConfidence: number,
    factors: TrendFactor[],
    risks: TrendRisk[]
  ): number {
    let confidence = baseConfidence;

    // Positive factors increase confidence slightly
    const positiveFactor = factors
      .filter((f) => f.type === 'positive')
      .reduce((sum, f) => sum + f.impact * 0.1, 0);

    // Risks decrease confidence
    const riskPenalty = risks.reduce(
      (sum, r) => sum + r.probability * r.impact * 0.2,
      0
    );

    confidence = confidence + positiveFactor - riskPenalty;
    return Math.max(0.1, Math.min(0.9, confidence));
  }

  /**
   * Build context string for LLM analysis
   */
  private buildAnalysisContext(
    timeline: AggregatedTimeline,
    currentPhase: PhaseDetectionResult
  ): string {
    return `
Technology: ${timeline.technologyName}
Current Phase: ${currentPhase.phase}
Phase Confidence: ${currentPhase.confidence.toFixed(2)}
Total Events: ${timeline.events.length}
Publications: ${timeline.eventCounts.publication}
Derivatives: ${timeline.eventCounts.derivative}
Adoptions: ${timeline.eventCounts.adoption}
Date Range: ${timeline.dateRange.earliest.toISOString()} to ${timeline.dateRange.latest.toISOString()}
    `.trim();
  }
}
