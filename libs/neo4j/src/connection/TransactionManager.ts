/**
 * @fileoverview Transaction Manager
 * TASK-V2-031: Neo4j transaction management
 *
 * Provides transaction management with Unit of Work pattern
 * for atomic operations across multiple repositories.
 */

import type {
  Session,
  Transaction,
  ManagedTransaction,
  QueryResult,
} from 'neo4j-driver';
import type { Neo4jConnection } from './Neo4jConnection.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Transaction isolation level
 */
export type IsolationLevel = 'READ_COMMITTED' | 'READ_UNCOMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';

/**
 * Transaction options
 */
export interface TransactionOptions {
  /** Maximum execution time in milliseconds */
  timeout?: number;
  /** Transaction metadata for logging */
  metadata?: Record<string, unknown>;
  /** Isolation level (default: READ_COMMITTED) */
  isolationLevel?: IsolationLevel;
}

/**
 * Work item for batch processing
 */
export interface WorkItem<T = unknown> {
  /** Unique identifier for the work item */
  id: string;
  /** Execute the work within a transaction */
  execute: (tx: ManagedTransaction) => Promise<T>;
  /** Priority (higher = executed first) */
  priority?: number;
}

/**
 * Batch result
 */
export interface BatchResult<T> {
  /** Successful results */
  successful: Array<{ id: string; result: T }>;
  /** Failed items */
  failed: Array<{ id: string; error: Error }>;
  /** Total duration in milliseconds */
  duration: number;
}

/**
 * Transaction manager interface
 */
export interface TransactionManager {
  /**
   * Execute work within a read transaction
   */
  read<T>(
    work: (tx: ManagedTransaction) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T>;

  /**
   * Execute work within a write transaction
   */
  write<T>(
    work: (tx: ManagedTransaction) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T>;

  /**
   * Execute multiple work items in a single transaction
   */
  batch<T>(
    items: WorkItem<T>[],
    options?: TransactionOptions
  ): Promise<BatchResult<T>>;

  /**
   * Create a unit of work for complex operations
   */
  createUnitOfWork(): UnitOfWork;
}

/**
 * Pending operation in Unit of Work
 */
export interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  query: string;
  params: Record<string, unknown>;
}

/**
 * Unit of Work interface for tracking changes
 */
export interface UnitOfWork {
  /**
   * Register a create operation
   */
  registerCreate(
    query: string,
    params: Record<string, unknown>
  ): string;

  /**
   * Register an update operation
   */
  registerUpdate(
    query: string,
    params: Record<string, unknown>
  ): string;

  /**
   * Register a delete operation
   */
  registerDelete(
    query: string,
    params: Record<string, unknown>
  ): string;

  /**
   * Get all pending operations
   */
  getPendingOperations(): PendingOperation[];

  /**
   * Clear all pending operations
   */
  clear(): void;

  /**
   * Commit all pending operations in a transaction
   */
  commit(): Promise<void>;

  /**
   * Rollback (clear without committing)
   */
  rollback(): void;

  /**
   * Check if there are pending operations
   */
  hasPendingOperations(): boolean;

  /**
   * Get count of pending operations
   */
  getPendingCount(): number;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Generate unique operation ID
 */
function generateOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a transaction manager
 */
export function createTransactionManager(
  connection: Neo4jConnection
): TransactionManager {
  return {
    async read<T>(
      work: (tx: ManagedTransaction) => Promise<T>,
      options: TransactionOptions = {}
    ): Promise<T> {
      const session = connection.getSession('read');
      try {
        const txConfig = buildTransactionConfig(options);
        return await session.executeRead(work, txConfig);
      } finally {
        await session.close();
      }
    },

    async write<T>(
      work: (tx: ManagedTransaction) => Promise<T>,
      options: TransactionOptions = {}
    ): Promise<T> {
      const session = connection.getSession('write');
      try {
        const txConfig = buildTransactionConfig(options);
        return await session.executeWrite(work, txConfig);
      } finally {
        await session.close();
      }
    },

    async batch<T>(
      items: WorkItem<T>[],
      options: TransactionOptions = {}
    ): Promise<BatchResult<T>> {
      const startTime = Date.now();
      const successful: Array<{ id: string; result: T }> = [];
      const failed: Array<{ id: string; error: Error }> = [];

      // Sort by priority (descending)
      const sortedItems = [...items].sort(
        (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
      );

      const session = connection.getSession('write');
      try {
        const txConfig = buildTransactionConfig(options);

        await session.executeWrite(async (tx) => {
          for (const item of sortedItems) {
            try {
              const result = await item.execute(tx);
              successful.push({ id: item.id, result });
            } catch (error) {
              failed.push({
                id: item.id,
                error: error instanceof Error ? error : new Error(String(error)),
              });
              // If any item fails, we'll continue but the transaction will be rolled back
              throw error;
            }
          }
        }, txConfig);
      } catch {
        // Transaction was rolled back
      } finally {
        await session.close();
      }

      return {
        successful,
        failed,
        duration: Date.now() - startTime,
      };
    },

    createUnitOfWork(): UnitOfWork {
      return createUnitOfWorkImpl(connection);
    },
  };
}

/**
 * Create Unit of Work implementation
 */
function createUnitOfWorkImpl(connection: Neo4jConnection): UnitOfWork {
  const operations: PendingOperation[] = [];

  return {
    registerCreate(
      query: string,
      params: Record<string, unknown>
    ): string {
      const id = generateOperationId();
      operations.push({ id, type: 'create', query, params });
      return id;
    },

    registerUpdate(
      query: string,
      params: Record<string, unknown>
    ): string {
      const id = generateOperationId();
      operations.push({ id, type: 'update', query, params });
      return id;
    },

    registerDelete(
      query: string,
      params: Record<string, unknown>
    ): string {
      const id = generateOperationId();
      operations.push({ id, type: 'delete', query, params });
      return id;
    },

    getPendingOperations(): PendingOperation[] {
      return [...operations];
    },

    clear(): void {
      operations.length = 0;
    },

    async commit(): Promise<void> {
      if (operations.length === 0) {
        return;
      }

      const session = connection.getSession('write');
      try {
        await session.executeWrite(async (tx) => {
          // Execute operations in order: create, update, delete
          const sorted = [...operations].sort((a, b) => {
            const order = { create: 0, update: 1, delete: 2 };
            return order[a.type] - order[b.type];
          });

          for (const op of sorted) {
            await tx.run(op.query, op.params);
          }
        });

        // Clear after successful commit
        operations.length = 0;
      } finally {
        await session.close();
      }
    },

    rollback(): void {
      operations.length = 0;
    },

    hasPendingOperations(): boolean {
      return operations.length > 0;
    },

    getPendingCount(): number {
      return operations.length;
    },
  };
}

/**
 * Build transaction configuration
 */
function buildTransactionConfig(
  options: TransactionOptions
): { timeout?: number; metadata?: Record<string, unknown> } {
  const config: { timeout?: number; metadata?: Record<string, unknown> } = {};

  if (options.timeout) {
    config.timeout = options.timeout;
  }

  if (options.metadata) {
    config.metadata = options.metadata;
  }

  return config;
}

// ============================================================================
// Retry Helper
// ============================================================================

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retries */
  maxRetries: number;
  /** Initial delay in milliseconds */
  initialDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Retryable error codes */
  retryableErrors?: string[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 100,
  maxDelay: 5000,
  backoffMultiplier: 2,
  retryableErrors: [
    'Neo.TransientError.Transaction.LockClientStopped',
    'Neo.TransientError.Transaction.DeadlockDetected',
    'Neo.TransientError.Transaction.Outdated',
  ],
};

/**
 * Execute with retry
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;
  let delay = fullConfig.initialDelay;

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      const errorCode = (error as { code?: string }).code;
      const isRetryable =
        fullConfig.retryableErrors?.some((code) => errorCode?.includes(code)) ??
        false;

      if (!isRetryable || attempt === fullConfig.maxRetries) {
        throw lastError;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * fullConfig.backoffMultiplier, fullConfig.maxDelay);
    }
  }

  throw lastError ?? new Error('Operation failed');
}
