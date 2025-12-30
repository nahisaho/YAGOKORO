export { Neo4jConnection, type Neo4jConfig } from './Neo4jConnection.js';
export {
  createTransactionManager,
  executeWithRetry,
  DEFAULT_RETRY_CONFIG,
  type TransactionManager,
  type TransactionOptions,
  type UnitOfWork,
  type PendingOperation,
  type WorkItem,
  type BatchResult,
  type RetryConfig,
  type IsolationLevel,
} from './TransactionManager.js';
