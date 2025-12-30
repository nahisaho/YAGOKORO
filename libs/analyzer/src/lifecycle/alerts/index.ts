/**
 * @fileoverview Alert and Report module exports
 * TASK-V2-027: Alert & Report features
 */

// Types
export type {
  AlertSeverity,
  AlertType,
  BaseAlert,
  PhaseTransitionAlert,
  MaturityChangeAlert,
  TrendShiftAlert,
  EmergingTechnologyAlert,
  DecliningTechnologyAlert,
  AnomalyAlert,
  Alert,
  AlertConfig,
  ReportPeriod,
  ReportFormat,
  TechnologySummary,
  ReportSection,
  PeriodicReport,
  ReportOptions,
} from './types.js';

// Default configs
export { DEFAULT_ALERT_CONFIG, DEFAULT_REPORT_OPTIONS } from './types.js';

// Alert Generator
export {
  AlertGenerator,
  InMemoryAlertStore,
  type AlertStore,
  type TechnologyState,
} from './AlertGenerator.js';

// Report Generator
export {
  ReportGenerator,
  type TechnologyDataProvider,
} from './ReportGenerator.js';
