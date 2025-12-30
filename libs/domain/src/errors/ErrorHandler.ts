/**
 * @fileoverview ErrorHandler - グローバルエラーハンドリング
 * TASK-V2-032: 統一エラーハンドリング戦略
 */

import {
  AppError,
  ErrorCodes,
  type ErrorCode,
  type ErrorResponse,
} from './ErrorHandling.js';

// =============================================================================
// Types
// =============================================================================

export type ErrorSeverity = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface ErrorContext {
  operation?: string;
  component?: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorLogEntry {
  timestamp: string;
  severity: ErrorSeverity;
  code: ErrorCode;
  message: string;
  stack?: string;
  context?: ErrorContext;
  cause?: string;
}

export interface ErrorHandlerConfig {
  /** エラーログを出力するかどうか */
  logErrors: boolean;
  /** スタックトレースを含めるかどうか */
  includeStackTrace: boolean;
  /** ログ出力先 */
  logger?: ErrorLogger;
  /** エラー発生時のコールバック */
  onError?: (entry: ErrorLogEntry) => void;
  /** 致命的エラー発生時のコールバック */
  onFatalError?: (entry: ErrorLogEntry) => void;
  /** センシティブ情報をマスクするかどうか */
  maskSensitiveData: boolean;
  /** マスク対象のキー */
  sensitiveKeys?: string[];
}

export interface ErrorLogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

export interface ErrorHandler {
  handle(error: unknown, context?: ErrorContext): ErrorResponse;
  handleAsync<T>(
    fn: () => Promise<T>,
    context?: ErrorContext
  ): Promise<T>;
  wrap<T extends (...args: unknown[]) => unknown>(
    fn: T,
    context?: ErrorContext
  ): T;
  wrapAsync<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    context?: ErrorContext
  ): T;
  getSeverity(error: AppError): ErrorSeverity;
  formatForLog(error: AppError, context?: ErrorContext): ErrorLogEntry;
  getStats(): ErrorStats;
  resetStats(): void;
}

export interface ErrorStats {
  totalErrors: number;
  byCode: Map<ErrorCode, number>;
  bySeverity: Map<ErrorSeverity, number>;
  lastError?: ErrorLogEntry;
  startTime: Date;
}

// =============================================================================
// Default Logger
// =============================================================================

const defaultLogger: ErrorLogger = {
  debug: (message, data) => console.debug(`[DEBUG] ${message}`, data ?? ''),
  info: (message, data) => console.info(`[INFO] ${message}`, data ?? ''),
  warn: (message, data) => console.warn(`[WARN] ${message}`, data ?? ''),
  error: (message, data) => console.error(`[ERROR] ${message}`, data ?? ''),
};

// =============================================================================
// Severity Mapping
// =============================================================================

const SEVERITY_MAP: Record<string, ErrorSeverity> = {
  // Validation errors - usually user error
  [ErrorCodes.VALIDATION]: 'warn',
  [ErrorCodes.NOT_FOUND]: 'warn',
  [ErrorCodes.ALREADY_EXISTS]: 'warn',
  [ErrorCodes.INVALID_STATE]: 'warn',

  // Rate limiting - expected behavior
  [ErrorCodes.RATE_LIMITED]: 'warn',

  // Connection errors - potentially serious
  [ErrorCodes.NEO4J_CONNECTION]: 'error',
  [ErrorCodes.QDRANT_CONNECTION]: 'error',
  [ErrorCodes.LLM_CONNECTION]: 'error',

  // Timeout - temporary
  [ErrorCodes.TIMEOUT]: 'warn',

  // Auth errors
  [ErrorCodes.PERMISSION_DENIED]: 'error',
  [ErrorCodes.NEO4J_AUTH]: 'error',
  [ErrorCodes.MCP_AUTH]: 'error',
  [ErrorCodes.LLM_API_KEY]: 'error',

  // Configuration errors - need attention
  [ErrorCodes.CONFIGURATION]: 'error',
  [ErrorCodes.QDRANT_CONFIG]: 'error',

  // Query/execution errors
  [ErrorCodes.NEO4J_QUERY]: 'error',
  [ErrorCodes.NEO4J_TRANSACTION]: 'warn',
  [ErrorCodes.QDRANT_SEARCH]: 'error',

  // MCP errors
  [ErrorCodes.MCP_TOOL_NOT_FOUND]: 'warn',
  [ErrorCodes.MCP_INVALID_PARAMS]: 'warn',
  [ErrorCodes.MCP_EXECUTION]: 'error',
  [ErrorCodes.MCP_SERVER]: 'fatal',

  // CLI errors
  [ErrorCodes.CLI_INVALID_COMMAND]: 'warn',
  [ErrorCodes.CLI_MISSING_ARGUMENT]: 'warn',
  [ErrorCodes.CLI_FILE_NOT_FOUND]: 'warn',
  [ErrorCodes.CLI_EXECUTION]: 'error',

  // Backup errors
  [ErrorCodes.BACKUP_FAILED]: 'error',
  [ErrorCodes.BACKUP_RESTORE_FAILED]: 'error',

  // Unknown
  [ErrorCodes.UNKNOWN]: 'error',
};

// =============================================================================
// Sensitive Data Keys
// =============================================================================

const DEFAULT_SENSITIVE_KEYS = [
  'password',
  'apiKey',
  'api_key',
  'secret',
  'token',
  'authorization',
  'auth',
  'credential',
  'credentials',
];

// =============================================================================
// Implementation
// =============================================================================

const DEFAULT_CONFIG: ErrorHandlerConfig = {
  logErrors: true,
  includeStackTrace: true,
  maskSensitiveData: true,
  sensitiveKeys: DEFAULT_SENSITIVE_KEYS,
};

export function createErrorHandler(
  config: Partial<ErrorHandlerConfig> = {}
): ErrorHandler {
  const fullConfig: ErrorHandlerConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    sensitiveKeys: config.sensitiveKeys ?? DEFAULT_SENSITIVE_KEYS,
  };

  const logger = fullConfig.logger ?? defaultLogger;

  const stats: ErrorStats = {
    totalErrors: 0,
    byCode: new Map(),
    bySeverity: new Map(),
    startTime: new Date(),
  };

  function maskSensitiveData(
    data: Record<string, unknown>
  ): Record<string, unknown> {
    if (!fullConfig.maskSensitiveData) {
      return data;
    }

    const masked: Record<string, unknown> = {};
    const sensitiveKeys = fullConfig.sensitiveKeys ?? DEFAULT_SENSITIVE_KEYS;

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
        masked[key] = '***MASKED***';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        masked[key] = maskSensitiveData(value as Record<string, unknown>);
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }

  function getSeverity(error: AppError): ErrorSeverity {
    return SEVERITY_MAP[error.code] ?? 'error';
  }

  function formatForLog(error: AppError, context?: ErrorContext): ErrorLogEntry {
    const severity = getSeverity(error);
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      severity,
      code: error.code,
      message: error.message,
    };

    if (fullConfig.includeStackTrace && error.stack) {
      entry.stack = error.stack;
    }

    if (context) {
      entry.context = fullConfig.maskSensitiveData && context.metadata
        ? {
            ...context,
            metadata: maskSensitiveData(context.metadata),
          }
        : context;
    }

    if (error.cause instanceof Error) {
      entry.cause = error.cause.message;
    }

    return entry;
  }

  function updateStats(entry: ErrorLogEntry): void {
    stats.totalErrors++;
    stats.byCode.set(entry.code, (stats.byCode.get(entry.code) ?? 0) + 1);
    stats.bySeverity.set(entry.severity, (stats.bySeverity.get(entry.severity) ?? 0) + 1);
    stats.lastError = entry;
  }

  function logError(entry: ErrorLogEntry): void {
    if (!fullConfig.logErrors) {
      return;
    }

    const data: Record<string, unknown> = {
      code: entry.code,
    };
    if (entry.context) {
      data.context = entry.context;
    }
    if (entry.stack) {
      data.stack = entry.stack;
    }
    if (entry.cause) {
      data.cause = entry.cause;
    }

    switch (entry.severity) {
      case 'debug':
        logger.debug(entry.message, data);
        break;
      case 'info':
        logger.info(entry.message, data);
        break;
      case 'warn':
        logger.warn(entry.message, data);
        break;
      case 'error':
        logger.error(entry.message, data);
        break;
      case 'fatal':
        logger.error(`[FATAL] ${entry.message}`, data);
        break;
    }
  }

  function handle(error: unknown, context?: ErrorContext): ErrorResponse {
    const appError = AppError.from(error);
    const entry = formatForLog(appError, context);

    updateStats(entry);
    logError(entry);

    if (entry.severity === 'fatal' && fullConfig.onFatalError) {
      fullConfig.onFatalError(entry);
    } else if (fullConfig.onError) {
      fullConfig.onError(entry);
    }

    return appError.toErrorResponse();
  }

  async function handleAsync<T>(
    fn: () => Promise<T>,
    context?: ErrorContext
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      handle(error, context);
      throw error;
    }
  }

  function wrap<T extends (...args: unknown[]) => unknown>(
    fn: T,
    context?: ErrorContext
  ): T {
    return ((...args: unknown[]) => {
      try {
        return fn(...args);
      } catch (error) {
        handle(error, context);
        throw error;
      }
    }) as T;
  }

  function wrapAsync<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    context?: ErrorContext
  ): T {
    return (async (...args: unknown[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        handle(error, context);
        throw error;
      }
    }) as T;
  }

  function getStats(): ErrorStats {
    return {
      ...stats,
      byCode: new Map(stats.byCode),
      bySeverity: new Map(stats.bySeverity),
      lastError: stats.lastError ? { ...stats.lastError } : undefined,
    };
  }

  function resetStats(): void {
    stats.totalErrors = 0;
    stats.byCode.clear();
    stats.bySeverity.clear();
    stats.lastError = undefined;
    stats.startTime = new Date();
  }

  return {
    handle,
    handleAsync,
    wrap,
    wrapAsync,
    getSeverity,
    formatForLog,
    getStats,
    resetStats,
  };
}

// =============================================================================
// Global Error Handler
// =============================================================================

let globalErrorHandler: ErrorHandler | null = null;

export function getGlobalErrorHandler(): ErrorHandler {
  if (!globalErrorHandler) {
    globalErrorHandler = createErrorHandler();
  }
  return globalErrorHandler;
}

export function setGlobalErrorHandler(handler: ErrorHandler): void {
  globalErrorHandler = handler;
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * グローバルエラーハンドラでエラーを処理
 */
export function handleError(error: unknown, context?: ErrorContext): ErrorResponse {
  return getGlobalErrorHandler().handle(error, context);
}

/**
 * 関数をエラーハンドリングでラップ
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: ErrorContext
): T {
  return getGlobalErrorHandler().wrapAsync(fn, context);
}

// =============================================================================
// Error Boundary (for React-like patterns)
// =============================================================================

export interface ErrorBoundaryOptions {
  fallback?: (error: AppError) => unknown;
  onError?: (error: AppError) => void;
  context?: ErrorContext;
}

/**
 * エラー境界 - エラーをキャッチしてフォールバックを返す
 */
export async function withErrorBoundary<T>(
  fn: () => Promise<T>,
  options: ErrorBoundaryOptions = {}
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const appError = AppError.from(error);
    
    if (options.onError) {
      options.onError(appError);
    } else {
      handleError(appError, options.context);
    }

    if (options.fallback) {
      return options.fallback(appError) as T;
    }

    return null;
  }
}
