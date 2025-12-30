/**
 * @fileoverview Lifecycle Module Exports
 * FR-004: Technology Lifecycle Tracker
 */

// Types
export type {
  TimelineEvent,
  TimelineEventType,
  LifecyclePhase,
  MaturityScore,
  PhaseDetectionResult,
  TrendForecast,
  TrendFactor,
  TrendRisk,
  LifecycleReport,
  EmergingTechnology,
  DecliningTechnology,
} from './types.js';

export { PHASE_METADATA } from './types.js';

// Timeline Aggregation
export {
  TimelineAggregator,
  type TimelineEntityRepository,
  type AggregatedTimeline,
} from './TimelineAggregator.js';

// Phase Detection
export {
  PhaseDetector,
  type PhaseDetectorConfig,
} from './PhaseDetector.js';

// Trend Prediction
export {
  TrendPredictor,
  type TrendPredictorConfig,
  type TrendLLMInterface,
} from './TrendPredictor.js';

// Lifecycle Service
export {
  TechnologyLifecycleTrackerService,
  type LifecycleTrackerConfig,
  type LifecycleRepository,
  type LifecycleAnalysisResult,
} from './TechnologyLifecycleTrackerService.js';

// Alerts and Reports (TASK-V2-027)
export * from './alerts/index.js';
