export {
  ErrorCodes,
  type ErrorCode,
  ErrorSuggestions,
  getSuggestionsForCode,
  type ErrorResponse,
  createErrorResponse,
  AppError,
  type AppErrorOptions,
  ValidationError,
  NotFoundError,
  ConnectionError,
  RateLimitError,
  TimeoutError,
  // Neo4j Errors
  Neo4jConnectionError,
  Neo4jQueryError,
  Neo4jNotConnectedError,
  Neo4jConfigError,
  // Qdrant/Vector Errors
  QdrantConnectionError,
  QdrantConfigError,
  EmbeddingError,
  // GraphRAG Errors
  GraphRAGExtractionError,
  GraphRAGCommunityError,
  GraphRAGSearchError,
  // MCP Errors
  MCPToolNotFoundError,
  MCPInvalidParamsError,
  MCPExecutionError,
  MCPAuthError,
  // CLI Errors
  CLIInvalidCommandError,
  CLIMissingArgumentError,
  CLIFileNotFoundError,
  // Backup Errors
  BackupError,
  BackupRestoreError,
  // Retry
  RetryHandler,
  type RetryOptions,
  withRetry,
  // Result
  Result,
  tryCatch,
} from './ErrorHandling.js';
