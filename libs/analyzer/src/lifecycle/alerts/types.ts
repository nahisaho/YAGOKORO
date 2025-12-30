/**
 * @fileoverview Alert and Report Types
 * TASK-V2-027: Stage transition alerts and periodic reports
 */

import type { LifecyclePhase, MaturityScore, TrendDirection } from '../types.js';

// =============================================================================
// Alert Types
// =============================================================================

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Alert types
 */
export type AlertType =
  | 'phase_transition'
  | 'maturity_change'
  | 'trend_shift'
  | 'emerging_technology'
  | 'declining_technology'
  | 'anomaly_detected';

/**
 * Base alert interface
 */
export interface BaseAlert {
  /** Unique alert ID */
  id: string;
  /** Alert type */
  type: AlertType;
  /** Severity level */
  severity: AlertSeverity;
  /** Technology ID */
  technologyId: string;
  /** Technology name */
  technologyName: string;
  /** Alert title */
  title: string;
  /** Alert message */
  message: string;
  /** Alert creation timestamp */
  createdAt: Date;
  /** Whether alert has been acknowledged */
  acknowledged: boolean;
  /** Acknowledgement timestamp */
  acknowledgedAt?: Date;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Phase transition alert
 */
export interface PhaseTransitionAlert extends BaseAlert {
  type: 'phase_transition';
  /** Previous phase */
  fromPhase: LifecyclePhase;
  /** New phase */
  toPhase: LifecyclePhase;
  /** Confidence in transition detection */
  confidence: number;
  /** Days spent in previous phase */
  daysInPreviousPhase: number;
  /** Transition indicators */
  indicators: string[];
}

/**
 * Maturity change alert
 */
export interface MaturityChangeAlert extends BaseAlert {
  type: 'maturity_change';
  /** Previous maturity score */
  previousScore: number;
  /** Current maturity score */
  currentScore: number;
  /** Change amount */
  change: number;
  /** Change percentage */
  changePercentage: number;
  /** Areas that changed most */
  significantChanges: Array<{
    area: keyof MaturityScore;
    previousValue: number;
    currentValue: number;
  }>;
}

/**
 * Trend shift alert
 */
export interface TrendShiftAlert extends BaseAlert {
  type: 'trend_shift';
  /** Previous trend direction */
  previousTrend: TrendDirection;
  /** Current trend direction */
  currentTrend: TrendDirection;
  /** Shift magnitude (0-1) */
  magnitude: number;
  /** Contributing factors */
  factors: string[];
}

/**
 * Emerging technology alert
 */
export interface EmergingTechnologyAlert extends BaseAlert {
  type: 'emerging_technology';
  /** Growth rate */
  growthRate: number;
  /** Key emergence indicators */
  keyIndicators: string[];
  /** First seen date */
  firstSeen: Date;
}

/**
 * Declining technology alert
 */
export interface DecliningTechnologyAlert extends BaseAlert {
  type: 'declining_technology';
  /** Decline rate */
  declineRate: number;
  /** Suggested replacement technologies */
  replacements: Array<{ id: string; name: string }>;
  /** Last active date */
  lastActiveDate: Date;
}

/**
 * Anomaly detection alert
 */
export interface AnomalyAlert extends BaseAlert {
  type: 'anomaly_detected';
  /** Anomaly description */
  anomalyDescription: string;
  /** Expected value/behavior */
  expected: string;
  /** Observed value/behavior */
  observed: string;
  /** Anomaly score (0-1) */
  anomalyScore: number;
}

/**
 * Union type for all alerts
 */
export type Alert =
  | PhaseTransitionAlert
  | MaturityChangeAlert
  | TrendShiftAlert
  | EmergingTechnologyAlert
  | DecliningTechnologyAlert
  | AnomalyAlert;

// =============================================================================
// Alert Configuration
// =============================================================================

/**
 * Alert configuration
 */
export interface AlertConfig {
  /** Enable phase transition alerts */
  phaseTransition: boolean;
  /** Enable maturity change alerts */
  maturityChange: boolean;
  /** Maturity change threshold (percentage) */
  maturityChangeThreshold: number;
  /** Enable trend shift alerts */
  trendShift: boolean;
  /** Enable emerging technology alerts */
  emergingTechnology: boolean;
  /** Minimum growth rate for emerging alerts */
  emergingGrowthThreshold: number;
  /** Enable declining technology alerts */
  decliningTechnology: boolean;
  /** Minimum decline rate for declining alerts */
  decliningRateThreshold: number;
  /** Enable anomaly alerts */
  anomalyDetection: boolean;
  /** Anomaly score threshold */
  anomalyThreshold: number;
}

/**
 * Default alert configuration
 */
export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  phaseTransition: true,
  maturityChange: true,
  maturityChangeThreshold: 10, // 10% change
  trendShift: true,
  emergingTechnology: true,
  emergingGrowthThreshold: 0.2, // 20% growth
  decliningTechnology: true,
  decliningRateThreshold: 0.2, // 20% decline
  anomalyDetection: true,
  anomalyThreshold: 0.8, // 80% anomaly score
};

// =============================================================================
// Report Types
// =============================================================================

/**
 * Report period
 */
export type ReportPeriod = 'weekly' | 'monthly' | 'quarterly' | 'annual';

/**
 * Report format
 */
export type ReportFormat = 'markdown' | 'html' | 'json';

/**
 * Report section
 */
export interface ReportSection {
  /** Section title */
  title: string;
  /** Section content */
  content: string;
  /** Section order */
  order: number;
  /** Whether section is expandable */
  expandable: boolean;
}

/**
 * Technology summary for reports
 */
export interface TechnologySummary {
  /** Technology ID */
  id: string;
  /** Technology name */
  name: string;
  /** Current phase */
  phase: LifecyclePhase;
  /** Phase label (Japanese) */
  phaseLabel: string;
  /** Maturity score */
  maturityScore: number;
  /** Trend direction */
  trend: TrendDirection;
  /** Change from previous period */
  change: 'improved' | 'stable' | 'declined';
  /** Notable events */
  notableEvents: string[];
}

/**
 * Periodic report
 */
export interface PeriodicReport {
  /** Report ID */
  id: string;
  /** Report title */
  title: string;
  /** Report period type */
  period: ReportPeriod;
  /** Period start date */
  periodStart: Date;
  /** Period end date */
  periodEnd: Date;
  /** Generation timestamp */
  generatedAt: Date;
  /** Executive summary */
  executiveSummary: string;
  /** Technology summaries */
  technologies: TechnologySummary[];
  /** Key highlights */
  highlights: string[];
  /** Alerts generated during period */
  alerts: Alert[];
  /** Report sections */
  sections: ReportSection[];
  /** Recommendations */
  recommendations: string[];
  /** Format */
  format: ReportFormat;
  /** Rendered content (if format is not json) */
  renderedContent?: string;
}

/**
 * Report generation options
 */
export interface ReportOptions {
  /** Report period */
  period: ReportPeriod;
  /** Output format */
  format: ReportFormat;
  /** Technology IDs to include (empty = all) */
  technologyIds?: string[];
  /** Include alert history */
  includeAlerts: boolean;
  /** Include recommendations */
  includeRecommendations: boolean;
  /** Language */
  language: 'ja' | 'en';
}

/**
 * Default report options
 */
export const DEFAULT_REPORT_OPTIONS: ReportOptions = {
  period: 'monthly',
  format: 'markdown',
  includeAlerts: true,
  includeRecommendations: true,
  language: 'ja',
};
