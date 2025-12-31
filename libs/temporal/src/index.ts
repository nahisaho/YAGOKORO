/**
 * @yagokoro/temporal
 *
 * Time-series analysis module for YAGOKORO v4.0.0
 *
 * Features:
 * - F-004: Temporal Metadata and Trend Analysis
 *   - REQ-004-01: Temporal metadata storage
 *   - REQ-004-02: Trend detection with momentum/velocity
 *   - REQ-004-03: Hot Topics detection
 *   - REQ-004-04: Trend metrics calculation
 *   - REQ-004-05: Trend forecasting
 *   - REQ-004-06: Time range filtering
 *   - REQ-004-07: Adoption phase queries
 *
 * @packageDocumentation
 */

// Re-export domain types for convenience
export {
  type AdoptionPhase,
  type TemporalMetadata,
  type TrendMetrics,
  type TimelineEntry,
  type TimelineData,
  type HotTopic,
  type TrendForecast,
  type TrendSnapshot,
  type TimeRangeFilter,
  type TemporalQueryOptions,
  type TrendRepository,
  type TrendQueryOptions,
  type SaveTrendMetricsOptions,
  type SaveSnapshotOptions,
  type TrendDataPoint,
  type TrendSnapshotRecord,
  type DailyMetricsRecord,
  type DailyMetricsInput,
  determineAdoptionPhase,
  resolveTimeRange,
} from '@yagokoro/domain';

// Services
export {
  TemporalService,
  type TemporalServiceConfig,
  type RecordMetricsInput,
  type RecordMetricsBatchInput,
  type TrendAnalysisResult,
  type TimelineResult,
  type HotTopicsResult,
  type TemporalStatistics,
  HotTopicDetector,
  type HotTopicDetectorConfig,
  type HotTopicDetectionResult,
  TrendForecaster,
  type TrendForecasterConfig,
  type ForecastMethod,
  type ForecastOptions,
  type DetailedForecastResult,
} from './services/index.js';
