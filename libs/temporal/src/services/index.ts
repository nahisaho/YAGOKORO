/**
 * Temporal Services
 *
 * @packageDocumentation
 */

export {
  TemporalService,
  type TemporalServiceConfig,
  type RecordMetricsInput,
  type RecordMetricsBatchInput,
  type TrendAnalysisResult,
  type TimelineResult,
  type HotTopicsResult,
  type TemporalStatistics,
} from './TemporalService.js';

export {
  HotTopicDetector,
  type HotTopicDetectorConfig,
  type HotTopicDetectionResult,
} from './HotTopicDetector.js';

export {
  TrendForecaster,
  type TrendForecasterConfig,
  type ForecastMethod,
  type ForecastOptions,
  type DetailedForecastResult,
} from './TrendForecaster.js';
