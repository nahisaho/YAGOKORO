/**
 * @fileoverview PhaseDetector
 *
 * Detects the current lifecycle phase of a technology using the Hype Cycle model.
 * Calculates maturity scores and phase indicators.
 */

import type {
  LifecyclePhase,
  PhaseDetectionResult,
  PhaseIndicator,
  MaturityScore,
} from './types.js';
import type { AggregatedTimeline } from './TimelineAggregator.js';

/**
 * Phase detection configuration
 */
export interface PhaseDetectorConfig {
  /** Weight for publication activity */
  publicationWeight: number;
  /** Weight for citation growth */
  citationWeight: number;
  /** Weight for derivative count */
  derivativeWeight: number;
  /** Weight for adoption rate */
  adoptionWeight: number;
  /** Recent window in days for trend calculation */
  recentWindowDays: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: PhaseDetectorConfig = {
  publicationWeight: 0.3,
  citationWeight: 0.25,
  derivativeWeight: 0.25,
  adoptionWeight: 0.2,
  recentWindowDays: 365,
};

/**
 * Phase thresholds for detection
 */
interface PhaseThresholds {
  publicationGrowth: [number, number];
  citationMomentum: [number, number];
  adoptionRate: [number, number];
  derivativeCount: [number, number];
  maturityScore: [number, number];
}

/**
 * Phase threshold definitions
 */
const PHASE_THRESHOLDS: Record<LifecyclePhase, PhaseThresholds> = {
  innovation_trigger: {
    publicationGrowth: [0, 0.3],
    citationMomentum: [0, 0.2],
    adoptionRate: [0, 0.1],
    derivativeCount: [0, 2],
    maturityScore: [0, 20],
  },
  peak_of_expectations: {
    publicationGrowth: [0.3, 0.8],
    citationMomentum: [0.2, 0.6],
    adoptionRate: [0.1, 0.3],
    derivativeCount: [2, 10],
    maturityScore: [20, 40],
  },
  trough_of_disillusionment: {
    publicationGrowth: [-0.3, 0.1],
    citationMomentum: [-0.2, 0.2],
    adoptionRate: [0.05, 0.2],
    derivativeCount: [5, 20],
    maturityScore: [30, 50],
  },
  slope_of_enlightenment: {
    publicationGrowth: [0.1, 0.4],
    citationMomentum: [0.1, 0.4],
    adoptionRate: [0.2, 0.5],
    derivativeCount: [10, 50],
    maturityScore: [50, 75],
  },
  plateau_of_productivity: {
    publicationGrowth: [0, 0.2],
    citationMomentum: [0.05, 0.3],
    adoptionRate: [0.4, 1.0],
    derivativeCount: [20, 1000],
    maturityScore: [75, 100],
  },
};

/**
 * Metrics calculated from timeline
 */
interface TimelineMetrics {
  publicationGrowth: number;
  citationMomentum: number;
  adoptionRate: number;
  derivativeCount: number;
  totalPublications: number;
  totalCitations: number;
  daysSinceIntroduction: number;
  recentActivityScore: number;
}

/**
 * PhaseDetector class
 *
 * Detects lifecycle phase using multiple indicators.
 */
export class PhaseDetector {
  private readonly config: PhaseDetectorConfig;

  constructor(config: Partial<PhaseDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Detect the current lifecycle phase
   */
  detectPhase(timeline: AggregatedTimeline): PhaseDetectionResult {
    const metrics = this.calculateMetrics(timeline);
    const indicators = this.buildIndicators(metrics);

    // Score each phase
    const phaseScores = this.scorePhases(metrics);

    // Find best matching phase
    let bestPhase: LifecyclePhase = 'innovation_trigger';
    let bestScore = 0;

    for (const [phase, score] of Object.entries(phaseScores)) {
      if (score > bestScore) {
        bestPhase = phase as LifecyclePhase;
        bestScore = score;
      }
    }

    // Calculate confidence
    const confidence = this.calculateConfidence(phaseScores, bestPhase);

    // Calculate time in phase
    const daysInPhase = this.estimateDaysInPhase(timeline, bestPhase);

    // Estimate time to next phase
    const estimatedDaysToNextPhase = this.estimateTimeToNextPhase(
      metrics,
      bestPhase
    );

    // Update indicator support flags
    const updatedIndicators = indicators.map((ind) => ({
      ...ind,
      supports: this.indicatorSupportsPhase(ind, bestPhase),
    }));

    return {
      phase: bestPhase,
      confidence,
      indicators: updatedIndicators,
      daysInPhase,
      estimatedDaysToNextPhase,
    };
  }

  /**
   * Calculate maturity score
   */
  calculateMaturityScore(timeline: AggregatedTimeline): MaturityScore {
    const metrics = this.calculateMetrics(timeline);

    // Research activity (based on recent publications)
    const researchActivity = Math.min(
      100,
      metrics.recentActivityScore * 100
    );

    // Industry adoption (based on adoption events)
    const industryAdoption = Math.min(100, metrics.adoptionRate * 100);

    // Community engagement (based on derivatives and citations)
    const communityEngagement = Math.min(
      100,
      (metrics.derivativeCount * 5 + metrics.citationMomentum * 50)
    );

    // Documentation quality (estimated from publication count)
    const documentationQuality = Math.min(
      100,
      Math.log10(metrics.totalPublications + 1) * 30
    );

    // Stability (inverse of volatility, based on age)
    const stability = Math.min(
      100,
      Math.sqrt(metrics.daysSinceIntroduction / 365) * 30
    );

    // Overall maturity
    const overall =
      researchActivity * 0.2 +
      industryAdoption * 0.25 +
      communityEngagement * 0.2 +
      documentationQuality * 0.15 +
      stability * 0.2;

    return {
      overall: Math.round(overall),
      researchActivity: Math.round(researchActivity),
      industryAdoption: Math.round(industryAdoption),
      communityEngagement: Math.round(communityEngagement),
      documentationQuality: Math.round(documentationQuality),
      stability: Math.round(stability),
    };
  }

  /**
   * Get phase metadata
   */
  getPhaseMetadata(phase: LifecyclePhase): { label: string; labelJa: string; description: string } {
    const metadata: Record<LifecyclePhase, { label: string; labelJa: string; description: string }> = {
      innovation_trigger: {
        label: 'Innovation Trigger',
        labelJa: '黎明期',
        description: 'Initial breakthrough, early proof-of-concept stories',
      },
      peak_of_expectations: {
        label: 'Peak of Inflated Expectations',
        labelJa: '過熱期',
        description: 'Early publicity produces success stories',
      },
      trough_of_disillusionment: {
        label: 'Trough of Disillusionment',
        labelJa: '幻滅期',
        description: 'Interest wanes as experiments fail to deliver',
      },
      slope_of_enlightenment: {
        label: 'Slope of Enlightenment',
        labelJa: '回復期',
        description: 'More instances of benefit emerge',
      },
      plateau_of_productivity: {
        label: 'Plateau of Productivity',
        labelJa: '安定期',
        description: 'Mainstream adoption starts',
      },
    };
    return metadata[phase];
  }

  /**
   * Calculate metrics from timeline
   */
  private calculateMetrics(timeline: AggregatedTimeline): TimelineMetrics {
    const now = new Date();
    const recentDate = new Date(
      now.getTime() - this.config.recentWindowDays * 24 * 60 * 60 * 1000
    );

    // Publication growth
    const recentPubs = timeline.events.filter(
      (e) => e.type === 'publication' && e.date >= recentDate
    );
    const olderPubs = timeline.events.filter(
      (e) => e.type === 'publication' && e.date < recentDate
    );
    const publicationGrowth =
      olderPubs.length > 0
        ? (recentPubs.length - olderPubs.length) / olderPubs.length
        : recentPubs.length > 0
          ? 1
          : 0;

    // Citation momentum (from publication metadata)
    let totalCitations = 0;
    let recentCitations = 0;
    for (const event of timeline.events) {
      if (event.type === 'publication' && event.metadata?.['citations']) {
        const citations = event.metadata['citations'] as number;
        totalCitations += citations;
        if (event.date >= recentDate) {
          recentCitations += citations;
        }
      }
    }
    const citationMomentum =
      totalCitations > 0 ? recentCitations / totalCitations : 0;

    // Adoption rate
    const adoptionEvents = timeline.events.filter((e) => e.type === 'adoption');
    const adoptionRate = Math.min(1, adoptionEvents.length / 20);

    // Derivative count
    const derivativeCount = timeline.events.filter(
      (e) => e.type === 'derivative'
    ).length;

    // Days since introduction
    const daysSinceIntroduction = Math.floor(
      (now.getTime() - timeline.dateRange.earliest.getTime()) /
        (24 * 60 * 60 * 1000)
    );

    // Recent activity score
    const recentEvents = timeline.events.filter((e) => e.date >= recentDate);
    const recentActivityScore = Math.min(
      1,
      recentEvents.length / Math.max(1, timeline.events.length)
    );

    return {
      publicationGrowth,
      citationMomentum,
      adoptionRate,
      derivativeCount,
      totalPublications: timeline.eventCounts.publication,
      totalCitations,
      daysSinceIntroduction,
      recentActivityScore,
    };
  }

  /**
   * Build phase indicators from metrics
   */
  private buildIndicators(metrics: TimelineMetrics): PhaseIndicator[] {
    return [
      {
        name: 'Publication Growth',
        value: metrics.publicationGrowth,
        expectedRange: [-0.5, 1.0],
        weight: this.config.publicationWeight,
        supports: false,
      },
      {
        name: 'Citation Momentum',
        value: metrics.citationMomentum,
        expectedRange: [0, 1],
        weight: this.config.citationWeight,
        supports: false,
      },
      {
        name: 'Adoption Rate',
        value: metrics.adoptionRate,
        expectedRange: [0, 1],
        weight: this.config.adoptionWeight,
        supports: false,
      },
      {
        name: 'Derivative Count',
        value: metrics.derivativeCount,
        expectedRange: [0, 100],
        weight: this.config.derivativeWeight,
        supports: false,
      },
      {
        name: 'Recent Activity',
        value: metrics.recentActivityScore,
        expectedRange: [0, 1],
        weight: 0.1,
        supports: false,
      },
    ];
  }

  /**
   * Score each phase based on metrics
   */
  private scorePhases(metrics: TimelineMetrics): Record<LifecyclePhase, number> {
    const scores: Record<LifecyclePhase, number> = {
      innovation_trigger: 0,
      peak_of_expectations: 0,
      trough_of_disillusionment: 0,
      slope_of_enlightenment: 0,
      plateau_of_productivity: 0,
    };

    for (const phase of Object.keys(scores) as LifecyclePhase[]) {
      const thresholds = PHASE_THRESHOLDS[phase];
      let score = 0;
      let totalWeight = 0;

      // Publication growth
      score +=
        this.scoreInRange(
          metrics.publicationGrowth,
          thresholds.publicationGrowth
        ) * this.config.publicationWeight;
      totalWeight += this.config.publicationWeight;

      // Citation momentum
      score +=
        this.scoreInRange(
          metrics.citationMomentum,
          thresholds.citationMomentum
        ) * this.config.citationWeight;
      totalWeight += this.config.citationWeight;

      // Adoption rate
      score +=
        this.scoreInRange(metrics.adoptionRate, thresholds.adoptionRate) *
        this.config.adoptionWeight;
      totalWeight += this.config.adoptionWeight;

      // Derivative count
      score +=
        this.scoreInRange(
          metrics.derivativeCount,
          thresholds.derivativeCount
        ) * this.config.derivativeWeight;
      totalWeight += this.config.derivativeWeight;

      scores[phase] = score / totalWeight;
    }

    return scores;
  }

  /**
   * Score how well a value fits within a range
   */
  private scoreInRange(value: number, range: [number, number]): number {
    const [min, max] = range;
    if (value < min) {
      return Math.max(0, 1 - (min - value) / Math.abs(min || 1));
    }
    if (value > max) {
      return Math.max(0, 1 - (value - max) / Math.abs(max || 1));
    }
    // Value is within range
    return 1;
  }

  /**
   * Calculate confidence in phase detection
   */
  private calculateConfidence(
    scores: Record<LifecyclePhase, number>,
    _bestPhase: LifecyclePhase
  ): number {
    const sortedScores = Object.values(scores).sort((a, b) => b - a);
    const bestScore = sortedScores[0]!;
    const secondBest = sortedScores[1] ?? 0;

    // Confidence based on gap between best and second best
    const gap = bestScore - secondBest;
    return Math.min(1, bestScore * 0.5 + gap * 0.5);
  }

  /**
   * Estimate days in current phase
   */
  private estimateDaysInPhase(
    timeline: AggregatedTimeline,
    _phase: LifecyclePhase
  ): number {
    // Simplified estimation based on recent significant events
    const now = new Date();
    const events = [...timeline.events].sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );

    // Find the last significant event (high impact)
    const lastSignificant = events.find((e) => e.impact >= 0.7);
    if (lastSignificant) {
      return Math.floor(
        (now.getTime() - lastSignificant.date.getTime()) / (24 * 60 * 60 * 1000)
      );
    }

    // Default to half the timeline duration
    const duration =
      timeline.dateRange.latest.getTime() -
      timeline.dateRange.earliest.getTime();
    return Math.floor(duration / 2 / (24 * 60 * 60 * 1000));
  }

  /**
   * Estimate time to next phase
   */
  private estimateTimeToNextPhase(
    metrics: TimelineMetrics,
    currentPhase: LifecyclePhase
  ): number | null {
    // Phase progression order
    const phaseOrder: LifecyclePhase[] = [
      'innovation_trigger',
      'peak_of_expectations',
      'trough_of_disillusionment',
      'slope_of_enlightenment',
      'plateau_of_productivity',
    ];

    const currentIndex = phaseOrder.indexOf(currentPhase);
    if (currentIndex === phaseOrder.length - 1) {
      return null; // Already at final phase
    }

    // Estimate based on activity level and historical patterns
    const baseTime = 365; // Average days per phase
    const activityFactor = 1 - metrics.recentActivityScore * 0.5;

    return Math.round(baseTime * activityFactor);
  }

  /**
   * Check if indicator supports detected phase
   */
  private indicatorSupportsPhase(
    indicator: PhaseIndicator,
    phase: LifecyclePhase
  ): boolean {
    const thresholds = PHASE_THRESHOLDS[phase];

    switch (indicator.name) {
      case 'Publication Growth':
        return (
          indicator.value >= thresholds.publicationGrowth[0] &&
          indicator.value <= thresholds.publicationGrowth[1]
        );
      case 'Citation Momentum':
        return (
          indicator.value >= thresholds.citationMomentum[0] &&
          indicator.value <= thresholds.citationMomentum[1]
        );
      case 'Adoption Rate':
        return (
          indicator.value >= thresholds.adoptionRate[0] &&
          indicator.value <= thresholds.adoptionRate[1]
        );
      case 'Derivative Count':
        return (
          indicator.value >= thresholds.derivativeCount[0] &&
          indicator.value <= thresholds.derivativeCount[1]
        );
      default:
        return true;
    }
  }
}
