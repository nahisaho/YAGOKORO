/**
 * @fileoverview Technology Lifecycle Types
 *
 * Type definitions for technology lifecycle tracking and analysis.
 */

/**
 * Timeline event types
 */
export type TimelineEventType =
  | 'publication'
  | 'derivative'
  | 'benchmark'
  | 'adoption'
  | 'milestone'
  | 'decline'
  | 'revival';

/**
 * Timeline event representing a significant moment in technology history
 */
export interface TimelineEvent {
  /** Unique event ID */
  id: string;
  /** Event type */
  type: TimelineEventType;
  /** Event date */
  date: Date;
  /** Event title */
  title: string;
  /** Detailed description */
  description: string;
  /** Impact score (0-1) */
  impact: number;
  /** Related entity IDs */
  relatedEntities: string[];
  /** Source references */
  sources: string[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Hype Cycle lifecycle phases
 */
export type LifecyclePhase =
  | 'innovation_trigger'      // 黎明期: Technology Trigger
  | 'peak_of_expectations'    // 過熱期: Peak of Inflated Expectations
  | 'trough_of_disillusionment' // 幻滅期: Trough of Disillusionment
  | 'slope_of_enlightenment'  // 回復期: Slope of Enlightenment
  | 'plateau_of_productivity'; // 安定期: Plateau of Productivity

/**
 * Phase metadata with Japanese labels
 */
export const PHASE_METADATA: Record<LifecyclePhase, { label: string; labelJa: string; description: string }> = {
  innovation_trigger: {
    label: 'Innovation Trigger',
    labelJa: '黎明期',
    description: 'Initial breakthrough, early proof-of-concept stories, media interest triggers',
  },
  peak_of_expectations: {
    label: 'Peak of Inflated Expectations',
    labelJa: '過熱期',
    description: 'Early publicity produces success stories, often accompanied by failures',
  },
  trough_of_disillusionment: {
    label: 'Trough of Disillusionment',
    labelJa: '幻滅期',
    description: 'Interest wanes as experiments and implementations fail to deliver',
  },
  slope_of_enlightenment: {
    label: 'Slope of Enlightenment',
    labelJa: '回復期',
    description: 'More instances of how the technology can benefit emerge',
  },
  plateau_of_productivity: {
    label: 'Plateau of Productivity',
    labelJa: '安定期',
    description: 'Mainstream adoption starts, criteria for assessing viability are more clearly defined',
  },
};

/**
 * Maturity score with breakdown
 */
export interface MaturityScore {
  /** Overall maturity (0-100) */
  overall: number;
  /** Research activity score (0-100) */
  researchActivity: number;
  /** Industry adoption score (0-100) */
  industryAdoption: number;
  /** Community engagement score (0-100) */
  communityEngagement: number;
  /** Documentation quality score (0-100) */
  documentationQuality: number;
  /** Stability score (0-100) */
  stability: number;
}

/**
 * Phase detection result
 */
export interface PhaseDetectionResult {
  /** Detected phase */
  phase: LifecyclePhase;
  /** Confidence score (0-1) */
  confidence: number;
  /** Phase indicators */
  indicators: PhaseIndicator[];
  /** Time in current phase (days) */
  daysInPhase: number;
  /** Estimated time to next phase (days), null if unknown */
  estimatedDaysToNextPhase: number | null;
}

/**
 * Indicator used for phase detection
 */
export interface PhaseIndicator {
  /** Indicator name */
  name: string;
  /** Current value */
  value: number;
  /** Expected range for current phase */
  expectedRange: [number, number];
  /** Weight in phase calculation */
  weight: number;
  /** Whether value supports detected phase */
  supports: boolean;
}

/**
 * Trend direction
 */
export type TrendDirection = 'rising' | 'stable' | 'declining' | 'volatile';

/**
 * Trend forecast
 */
export interface TrendForecast {
  /** Technology ID */
  technologyId: string;
  /** Forecast generation date */
  generatedAt: Date;
  /** Forecast horizon (days) */
  horizonDays: number;
  /** Current trend direction */
  currentTrend: TrendDirection;
  /** Predicted phase transitions */
  predictedTransitions: PredictedTransition[];
  /** Confidence in forecast (0-1) */
  confidence: number;
  /** Factors influencing the trend */
  factors: TrendFactor[];
  /** Risk assessment */
  risks: TrendRisk[];
}

/**
 * Predicted phase transition
 */
export interface PredictedTransition {
  /** Target phase */
  toPhase: LifecyclePhase;
  /** Estimated date */
  estimatedDate: Date;
  /** Probability (0-1) */
  probability: number;
}

/**
 * Factor influencing trend
 */
export interface TrendFactor {
  /** Factor name */
  name: string;
  /** Factor type */
  type: 'positive' | 'negative' | 'neutral';
  /** Impact magnitude (0-1) */
  impact: number;
  /** Description */
  description: string;
}

/**
 * Risk to trend forecast
 */
export interface TrendRisk {
  /** Risk name */
  name: string;
  /** Probability (0-1) */
  probability: number;
  /** Potential impact (0-1) */
  impact: number;
  /** Mitigation suggestions */
  mitigations: string[];
}

/**
 * Complete lifecycle report for a technology
 */
export interface LifecycleReport {
  /** Technology ID */
  technologyId: string;
  /** Technology name */
  technologyName: string;
  /** Generation timestamp */
  generatedAt: Date;
  /** Current phase */
  currentPhase: PhaseDetectionResult;
  /** Maturity score */
  maturityScore: MaturityScore;
  /** Timeline (aggregated) */
  timeline: unknown;
  /** Trend forecast */
  forecast: TrendForecast;
  /** Related technologies */
  relatedTechnologies: Array<{
    id: string;
    phase: LifecyclePhase;
    relationship: string;
  }>;
  /** Summary text */
  summary: string;
}

/**
 * Lifecycle comparison between technologies
 */
export interface LifecycleComparison {
  /** Comparison ID */
  id: string;
  /** Compared technology IDs */
  technologyIds: string[];
  /** Generation timestamp */
  generatedAt: Date;
  /** Individual reports */
  reports: LifecycleReport[];
  /** Comparative insights */
  comparativeInsights: ComparativeInsight[];
  /** Similarity score (0-1) */
  similarityScore: number;
}

/**
 * Comparative insight between technologies
 */
export interface ComparativeInsight {
  /** Insight type */
  type: 'phase_difference' | 'maturity_gap' | 'trend_divergence' | 'common_pattern';
  /** Insight description */
  description: string;
  /** Relevant technology IDs */
  technologies: string[];
  /** Significance (0-1) */
  significance: number;
}

/**
 * Emerging technology identification result
 */
export interface EmergingTechnology {
  /** Technology ID */
  technologyId: string;
  /** Technology name */
  technologyName: string;
  /** Current lifecycle phase */
  phase: LifecyclePhase;
  /** Growth rate (e.g., 0.5 = 50% growth) */
  growthRate: number;
  /** Key indicators for emergence */
  keyIndicators: string[];
  /** When technology was first seen */
  firstSeen: Date;
  /** Detection confidence (0-1) */
  confidence: number;
}

/**
 * Declining technology identification result
 */
export interface DecliningTechnology {
  /** Technology ID */
  technologyId: string;
  /** Technology name */
  technologyName: string;
  /** Current lifecycle phase */
  phase: LifecyclePhase;
  /** Decline rate (e.g., 0.3 = 30% decline) */
  declineRate: number;
  /** Last active date */
  lastActiveDate: Date;
  /** Suggested replacements */
  replacements: Array<{ id: string; name: string }>;
  /** Detection confidence (0-1) */
  confidence: number;
}
