/**
 * @yagokoro/ingestion
 *
 * Paper ingestion service for YAGOKORO v3.0.0
 * - arXiv OAI-PMH API integration
 * - Semantic Scholar REST API integration
 * - Deduplication and scheduling
 *
 * @packageDocumentation
 */

// Types
export type {
  ArxivIngestionOptions,
  SSIngestionOptions,
  IngestionSchedule,
  IngestionResult,
  IngestionError,
  IngestionStatus,
} from './types.js';

export type {
  Paper,
  PaperSource,
  ProcessingStatus,
} from './entities/paper.js';

// Clients
export { ArxivClient } from './arxiv/arxiv-client.js';
export { SemanticScholarClient } from './semantic-scholar/semantic-scholar-client.js';

// Services
export { Deduplicator } from './dedup/deduplicator.js';
export { ScheduleRunner } from './scheduler/schedule-runner.js';
export { IngestionService } from './services/ingestion-service.js';

// Rate Limiting
export { TokenBucketRateLimiter } from './rate-limit/token-bucket.js';
export { SlidingWindowRateLimiter } from './rate-limit/sliding-window.js';
export { CircuitBreaker } from './rate-limit/circuit-breaker.js';
