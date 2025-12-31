export type {
  EntityRepository,
  DomainEntity,
  EntityType,
  EntityFilter,
} from './EntityRepository.js';

export type {
  RelationRepository,
  TraversalDirection,
  TraversalOptions,
  GraphPath,
} from './RelationRepository.js';

export type {
  CommunityRepository,
  CommunityFilter,
  CommunityHierarchy,
} from './CommunityRepository.js';

export type {
  VectorStore,
  VectorSearchResult,
  VectorUpsertInput,
  VectorSearchOptions,
} from './VectorStore.js';

export type {
  LLMClient,
  MessageRole,
  ChatMessage,
  CompletionOptions,
  CompletionResponse,
  EmbeddingResponse,
} from './LLMClient.js';

// v4.0.0: Temporal analysis ports
export type {
  TrendRepository,
  TrendQueryOptions,
  SaveTrendMetricsOptions,
  SaveSnapshotOptions,
  TrendDataPoint,
  TrendSnapshotRecord,
  DailyMetricsRecord,
  DailyMetricsInput,
} from './TrendRepository.js';
