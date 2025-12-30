/**
 * @module ErrorHandling
 * @description 統一エラーハンドリングシステム
 *
 * YAGOKORO全体で使用する標準化されたエラーコード、エラークラス、
 * リトライハンドラを提供
 */

// =============================================================================
// Error Codes
// =============================================================================

/**
 * 標準化されたエラーコード
 */
export const ErrorCodes = {
  // 一般エラー (1xxx)
  UNKNOWN: 'ERR_1000',
  VALIDATION: 'ERR_1001',
  NOT_FOUND: 'ERR_1002',
  ALREADY_EXISTS: 'ERR_1003',
  INVALID_STATE: 'ERR_1004',
  TIMEOUT: 'ERR_1005',
  RATE_LIMITED: 'ERR_1006',
  PERMISSION_DENIED: 'ERR_1007',
  CONFIGURATION: 'ERR_1008',

  // Neo4j エラー (2xxx)
  NEO4J_CONNECTION: 'ERR_2001',
  NEO4J_QUERY: 'ERR_2002',
  NEO4J_TRANSACTION: 'ERR_2003',
  NEO4J_CONSTRAINT: 'ERR_2004',
  NEO4J_AUTH: 'ERR_2005',
  NEO4J_NOT_CONNECTED: 'ERR_2006',

  // Vector/Qdrant エラー (3xxx)
  QDRANT_CONNECTION: 'ERR_3001',
  QDRANT_COLLECTION: 'ERR_3002',
  QDRANT_SEARCH: 'ERR_3003',
  EMBEDDING_GENERATION: 'ERR_3004',
  QDRANT_CONFIG: 'ERR_3005',

  // LLM エラー (4xxx)
  LLM_CONNECTION: 'ERR_4001',
  LLM_RATE_LIMIT: 'ERR_4002',
  LLM_INVALID_RESPONSE: 'ERR_4003',
  LLM_TOKEN_LIMIT: 'ERR_4004',
  LLM_API_KEY: 'ERR_4005',

  // GraphRAG エラー (5xxx)
  GRAPHRAG_EXTRACTION: 'ERR_5001',
  GRAPHRAG_COMMUNITY: 'ERR_5002',
  GRAPHRAG_SEARCH: 'ERR_5003',
  GRAPHRAG_INDEX: 'ERR_5004',

  // MCP エラー (6xxx)
  MCP_TOOL_NOT_FOUND: 'ERR_6001',
  MCP_INVALID_PARAMS: 'ERR_6002',
  MCP_EXECUTION: 'ERR_6003',
  MCP_SERVER: 'ERR_6004',
  MCP_AUTH: 'ERR_6005',

  // CLI エラー (7xxx)
  CLI_INVALID_COMMAND: 'ERR_7001',
  CLI_MISSING_ARGUMENT: 'ERR_7002',
  CLI_FILE_NOT_FOUND: 'ERR_7003',
  CLI_EXECUTION: 'ERR_7004',

  // Backup エラー (8xxx)
  BACKUP_FAILED: 'ERR_8001',
  BACKUP_RESTORE_FAILED: 'ERR_8002',
  BACKUP_INVALID_FORMAT: 'ERR_8003',
} as const;

// =============================================================================
// Error Suggestions
// =============================================================================

/**
 * エラーコードに対する解決提案
 */
export const ErrorSuggestions: Record<string, string[]> = {
  [ErrorCodes.UNKNOWN]: [
    '詳細なエラーログを確認してください',
    '問題が続く場合はサポートに連絡してください',
  ],
  [ErrorCodes.VALIDATION]: [
    '入力値が正しいフォーマットか確認してください',
    '必須フィールドが全て入力されているか確認してください',
  ],
  [ErrorCodes.NOT_FOUND]: [
    'リソースIDが正しいか確認してください',
    'リソースが削除されていないか確認してください',
  ],
  [ErrorCodes.ALREADY_EXISTS]: [
    '別のIDを使用してください',
    '既存のリソースを更新する場合はupdateを使用してください',
  ],
  [ErrorCodes.INVALID_STATE]: [
    'リソースの現在の状態を確認してください',
    '前提条件が満たされているか確認してください',
    '操作の順序が正しいか確認してください',
  ],
  [ErrorCodes.TIMEOUT]: [
    '操作を再試行してください',
    'タイムアウト値を増やすことを検討してください',
    'ネットワーク接続を確認してください',
  ],
  [ErrorCodes.RATE_LIMITED]: [
    'しばらく待ってから再試行してください',
    'リクエスト頻度を減らしてください',
  ],
  [ErrorCodes.PERMISSION_DENIED]: [
    '適切な権限を持つAPIキーを使用してください',
    '管理者に権限付与を依頼してください',
  ],
  [ErrorCodes.CONFIGURATION]: [
    '設定ファイルの形式を確認してください',
    '必須の設定値が全て設定されているか確認してください',
  ],
  [ErrorCodes.NEO4J_CONNECTION]: [
    'Neo4jが起動しているか確認してください: docker ps',
    'NEO4J_URI環境変数が正しいか確認してください',
    'ファイアウォール設定を確認してください',
  ],
  [ErrorCodes.NEO4J_QUERY]: [
    'Cypherクエリの構文を確認してください',
    'クエリパラメータの型が正しいか確認してください',
  ],
  [ErrorCodes.NEO4J_TRANSACTION]: [
    'トランザクションを再試行してください',
    'デッドロックが発生している可能性があります',
  ],
  [ErrorCodes.NEO4J_CONSTRAINT]: [
    '一意制約に違反していないか確認してください',
    '既存のデータとの重複がないか確認してください',
  ],
  [ErrorCodes.NEO4J_AUTH]: [
    'NEO4J_USERNAME/PASSWORD環境変数を確認してください',
    'Neo4jの認証設定を確認してください',
  ],
  [ErrorCodes.NEO4J_NOT_CONNECTED]: [
    'connect()を呼び出してから操作を実行してください',
    '接続が切断されていないか確認してください',
  ],
  [ErrorCodes.QDRANT_CONNECTION]: [
    'Qdrantが起動しているか確認してください: docker ps',
    'QDRANT_URL環境変数が正しいか確認してください',
  ],
  [ErrorCodes.QDRANT_COLLECTION]: [
    'コレクション名が正しいか確認してください',
    'コレクションが作成されているか確認してください',
  ],
  [ErrorCodes.QDRANT_SEARCH]: [
    'ベクトル次元が一致しているか確認してください',
    '検索パラメータを確認してください',
  ],
  [ErrorCodes.EMBEDDING_GENERATION]: [
    'テキストが空でないか確認してください',
    'LLM APIキーが設定されているか確認してください',
  ],
  [ErrorCodes.QDRANT_CONFIG]: [
    'QDRANT_URL環境変数を設定してください',
    'Qdrantの設定を確認してください',
  ],
  [ErrorCodes.LLM_CONNECTION]: [
    'LLMサービスが利用可能か確認してください',
    'APIエンドポイントが正しいか確認してください',
  ],
  [ErrorCodes.LLM_RATE_LIMIT]: [
    '1分ほど待ってから再試行してください',
    'APIの利用制限を確認してください',
  ],
  [ErrorCodes.LLM_INVALID_RESPONSE]: [
    'プロンプトを確認してください',
    '別のモデルを試してみてください',
  ],
  [ErrorCodes.LLM_TOKEN_LIMIT]: [
    '入力テキストを短くしてください',
    'より大きなコンテキストウィンドウを持つモデルを使用してください',
  ],
  [ErrorCodes.LLM_API_KEY]: [
    'OPENAI_API_KEY環境変数を設定してください',
    'APIキーが有効か確認してください',
  ],
  [ErrorCodes.GRAPHRAG_EXTRACTION]: [
    'ソースドキュメントの形式を確認してください',
    '抽出設定を確認してください',
  ],
  [ErrorCodes.GRAPHRAG_COMMUNITY]: [
    'グラフに十分なノードとエッジがあるか確認してください',
    'コミュニティ検出パラメータを調整してください',
  ],
  [ErrorCodes.GRAPHRAG_SEARCH]: [
    '検索クエリを明確にしてください',
    'インデックスが構築されているか確認してください',
  ],
  [ErrorCodes.GRAPHRAG_INDEX]: [
    'データが正しくインジェストされているか確認してください',
    'インデックス構築を再実行してください',
  ],
  [ErrorCodes.MCP_TOOL_NOT_FOUND]: [
    '利用可能なツール一覧を確認してください',
    'ツール名のスペルを確認してください',
  ],
  [ErrorCodes.MCP_INVALID_PARAMS]: [
    'パラメータの型と形式を確認してください',
    '必須パラメータが全て指定されているか確認してください',
  ],
  [ErrorCodes.MCP_EXECUTION]: [
    'ツールの実行ログを確認してください',
    '入力パラメータを確認してください',
  ],
  [ErrorCodes.MCP_SERVER]: [
    'MCPサーバーが起動しているか確認してください',
    'サーバーログを確認してください',
  ],
  [ErrorCodes.MCP_AUTH]: [
    'APIキーが設定されているか確認してください',
    '認証設定を確認してください',
  ],
  [ErrorCodes.CLI_INVALID_COMMAND]: [
    '--helpオプションでコマンドを確認してください',
    'コマンド名のスペルを確認してください',
  ],
  [ErrorCodes.CLI_MISSING_ARGUMENT]: [
    '必須引数を指定してください',
    '--helpで必要な引数を確認してください',
  ],
  [ErrorCodes.CLI_FILE_NOT_FOUND]: [
    'ファイルパスが正しいか確認してください',
    'ファイルが存在するか確認してください',
  ],
  [ErrorCodes.CLI_EXECUTION]: [
    'コマンドの実行ログを確認してください',
    '権限が十分か確認してください',
  ],
  [ErrorCodes.BACKUP_FAILED]: [
    '出力ディレクトリへの書き込み権限を確認してください',
    '十分なディスク空き容量があるか確認してください',
  ],
  [ErrorCodes.BACKUP_RESTORE_FAILED]: [
    'バックアップファイルが存在するか確認してください',
    'バックアップファイルが破損していないか確認してください',
  ],
  [ErrorCodes.BACKUP_INVALID_FORMAT]: [
    'バックアップファイルの形式を確認してください',
    '正しいバージョンのバックアップか確認してください',
  ],
};

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * エラーコードに対するサジェスションを取得
 */
export function getSuggestionsForCode(code: ErrorCode): string[] {
  const suggestions = ErrorSuggestions[code];
  if (suggestions) {
    return suggestions;
  }
  return ErrorSuggestions[ErrorCodes.UNKNOWN]!;
}

// =============================================================================
// Error Response Type
// =============================================================================

/**
 * 統一エラーレスポンス形式
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    suggestions: string[];
    context?: Record<string, unknown>;
    retryable: boolean;
    timestamp: string;
  };
}

/**
 * エラーレスポンスを生成
 */
export function createErrorResponse(error: unknown): ErrorResponse {
  const appError = AppError.from(error);
  return appError.toErrorResponse();
}

// =============================================================================
// AppError Class
// =============================================================================

/**
 * アプリケーション標準エラー
 */
export interface AppErrorOptions {
  code: ErrorCode;
  message: string;
  cause?: Error;
  context?: Record<string, unknown>;
  retryable?: boolean;
  httpStatus?: number;
  suggestions?: string[];
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly context?: Record<string, unknown>;
  readonly retryable: boolean;
  readonly httpStatus: number;
  readonly timestamp: Date;
  readonly suggestions: string[];

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = 'AppError';
    this.code = options.code;
    if (options.context) {
      this.context = options.context;
    }
    this.retryable = options.retryable ?? false;
    this.httpStatus = options.httpStatus ?? 500;
    this.timestamp = new Date();
    this.suggestions = options.suggestions ?? getSuggestionsForCode(options.code);

    if (options.cause) {
      this.cause = options.cause;
    }

    // Proper prototype chain for instanceof
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * JSON形式でエラーを出力
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      retryable: this.retryable,
      httpStatus: this.httpStatus,
      timestamp: this.timestamp.toISOString(),
      suggestions: this.suggestions,
      stack: this.stack,
      cause: this.cause instanceof Error ? this.cause.message : undefined,
    };
  }

  /**
   * 統一エラーレスポンス形式で出力
   */
  toErrorResponse(): ErrorResponse {
    const response: ErrorResponse = {
      error: {
        code: this.code,
        message: this.message,
        suggestions: this.suggestions,
        retryable: this.retryable,
        timestamp: this.timestamp.toISOString(),
      },
    };
    if (this.context) {
      response.error.context = this.context;
    }
    return response;
  }

  /**
   * AppErrorかどうかを判定
   */
  static isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
  }

  /**
   * 未知のエラーをAppErrorに変換
   */
  static from(error: unknown, defaultCode: ErrorCode = ErrorCodes.UNKNOWN): AppError {
    if (AppError.isAppError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError({
        code: defaultCode,
        message: error.message,
        cause: error,
      });
    }

    return new AppError({
      code: defaultCode,
      message: String(error),
    });
  }
}

// =============================================================================
// Specialized Error Classes
// =============================================================================

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    const options: AppErrorOptions = {
      code: ErrorCodes.VALIDATION,
      message,
      httpStatus: 400,
      retryable: false,
    };
    if (context) {
      options.context = context;
    }
    super(options);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const context: Record<string, unknown> = { resource };
    if (id !== undefined) {
      context.id = id;
    }
    super({
      code: ErrorCodes.NOT_FOUND,
      message: id ? `${resource} not found: ${id}` : `${resource} not found`,
      context,
      httpStatus: 404,
      retryable: false,
    });
    this.name = 'NotFoundError';
  }
}

export class ConnectionError extends AppError {
  constructor(service: string, cause?: Error) {
    const options: AppErrorOptions = {
      code: ErrorCodes.NEO4J_CONNECTION,
      message: `Failed to connect to ${service}`,
      context: { service },
      httpStatus: 503,
      retryable: true,
    };
    if (cause) {
      options.cause = cause;
    }
    super(options);
    this.name = 'ConnectionError';
  }
}

export class RateLimitError extends AppError {
  readonly retryAfter?: number;

  constructor(service: string, retryAfter?: number) {
    const context: Record<string, unknown> = { service };
    if (retryAfter !== undefined) {
      context.retryAfter = retryAfter;
    }
    super({
      code: ErrorCodes.RATE_LIMITED,
      message: `Rate limited by ${service}`,
      context,
      httpStatus: 429,
      retryable: true,
    });
    this.name = 'RateLimitError';
    if (retryAfter !== undefined) {
      this.retryAfter = retryAfter;
    }
  }
}

export class TimeoutError extends AppError {
  constructor(operation: string, timeoutMs: number) {
    super({
      code: ErrorCodes.TIMEOUT,
      message: `Operation '${operation}' timed out after ${timeoutMs}ms`,
      context: { operation, timeoutMs },
      httpStatus: 504,
      retryable: true,
    });
    this.name = 'TimeoutError';
  }
}

// =============================================================================
// Neo4j Errors
// =============================================================================

export class Neo4jConnectionError extends AppError {
  constructor(message: string, cause?: Error) {
    const options: AppErrorOptions = {
      code: ErrorCodes.NEO4J_CONNECTION,
      message,
      httpStatus: 503,
      retryable: true,
    };
    if (cause) {
      options.cause = cause;
    }
    super(options);
    this.name = 'Neo4jConnectionError';
  }
}

export class Neo4jQueryError extends AppError {
  constructor(message: string, query?: string, cause?: Error) {
    const options: AppErrorOptions = {
      code: ErrorCodes.NEO4J_QUERY,
      message,
      httpStatus: 500,
      retryable: false,
    };
    if (query) {
      options.context = { query };
    }
    if (cause) {
      options.cause = cause;
    }
    super(options);
    this.name = 'Neo4jQueryError';
  }
}

export class Neo4jNotConnectedError extends AppError {
  constructor() {
    super({
      code: ErrorCodes.NEO4J_NOT_CONNECTED,
      message: 'Not connected to Neo4j. Call connect() first.',
      httpStatus: 503,
      retryable: false,
    });
    this.name = 'Neo4jNotConnectedError';
  }
}

export class Neo4jConfigError extends AppError {
  constructor(missingVars: string[]) {
    super({
      code: ErrorCodes.CONFIGURATION,
      message: `Missing required Neo4j environment variables: ${missingVars.join(', ')}`,
      context: { missingVars },
      httpStatus: 500,
      retryable: false,
    });
    this.name = 'Neo4jConfigError';
  }
}

// =============================================================================
// Qdrant/Vector Errors
// =============================================================================

export class QdrantConnectionError extends AppError {
  constructor(message: string, cause?: Error) {
    const options: AppErrorOptions = {
      code: ErrorCodes.QDRANT_CONNECTION,
      message,
      httpStatus: 503,
      retryable: true,
    };
    if (cause) {
      options.cause = cause;
    }
    super(options);
    this.name = 'QdrantConnectionError';
  }
}

export class QdrantConfigError extends AppError {
  constructor(missingVars: string[]) {
    super({
      code: ErrorCodes.QDRANT_CONFIG,
      message: `Missing required Qdrant environment variables: ${missingVars.join(', ')}`,
      context: { missingVars },
      httpStatus: 500,
      retryable: false,
    });
    this.name = 'QdrantConfigError';
  }
}

export class EmbeddingError extends AppError {
  constructor(message: string, cause?: Error) {
    const options: AppErrorOptions = {
      code: ErrorCodes.EMBEDDING_GENERATION,
      message,
      httpStatus: 500,
      retryable: false,
    };
    if (cause) {
      options.cause = cause;
    }
    super(options);
    this.name = 'EmbeddingError';
  }
}

// =============================================================================
// GraphRAG Errors
// =============================================================================

export class GraphRAGExtractionError extends AppError {
  constructor(message: string, cause?: Error) {
    const options: AppErrorOptions = {
      code: ErrorCodes.GRAPHRAG_EXTRACTION,
      message,
      httpStatus: 500,
      retryable: false,
    };
    if (cause) {
      options.cause = cause;
    }
    super(options);
    this.name = 'GraphRAGExtractionError';
  }
}

export class GraphRAGCommunityError extends AppError {
  constructor(message: string, cause?: Error) {
    const options: AppErrorOptions = {
      code: ErrorCodes.GRAPHRAG_COMMUNITY,
      message,
      httpStatus: 500,
      retryable: false,
    };
    if (cause) {
      options.cause = cause;
    }
    super(options);
    this.name = 'GraphRAGCommunityError';
  }
}

export class GraphRAGSearchError extends AppError {
  constructor(message: string, cause?: Error) {
    const options: AppErrorOptions = {
      code: ErrorCodes.GRAPHRAG_SEARCH,
      message,
      httpStatus: 500,
      retryable: true,
    };
    if (cause) {
      options.cause = cause;
    }
    super(options);
    this.name = 'GraphRAGSearchError';
  }
}

// =============================================================================
// MCP Errors
// =============================================================================

export class MCPToolNotFoundError extends AppError {
  constructor(toolName: string) {
    super({
      code: ErrorCodes.MCP_TOOL_NOT_FOUND,
      message: `Tool not found: ${toolName}`,
      context: { toolName },
      httpStatus: 404,
      retryable: false,
    });
    this.name = 'MCPToolNotFoundError';
  }
}

export class MCPInvalidParamsError extends AppError {
  constructor(message: string, params?: Record<string, unknown>) {
    const options: AppErrorOptions = {
      code: ErrorCodes.MCP_INVALID_PARAMS,
      message,
      httpStatus: 400,
      retryable: false,
    };
    if (params) {
      options.context = { params };
    }
    super(options);
    this.name = 'MCPInvalidParamsError';
  }
}

export class MCPExecutionError extends AppError {
  constructor(message: string, toolName?: string, cause?: Error) {
    const options: AppErrorOptions = {
      code: ErrorCodes.MCP_EXECUTION,
      message,
      httpStatus: 500,
      retryable: false,
    };
    if (toolName) {
      options.context = { toolName };
    }
    if (cause) {
      options.cause = cause;
    }
    super(options);
    this.name = 'MCPExecutionError';
  }
}

export class MCPAuthError extends AppError {
  constructor(message: string) {
    super({
      code: ErrorCodes.MCP_AUTH,
      message,
      httpStatus: 401,
      retryable: false,
    });
    this.name = 'MCPAuthError';
  }
}

// =============================================================================
// CLI Errors
// =============================================================================

export class CLIInvalidCommandError extends AppError {
  constructor(command: string) {
    super({
      code: ErrorCodes.CLI_INVALID_COMMAND,
      message: `Invalid command: ${command}`,
      context: { command },
      httpStatus: 400,
      retryable: false,
    });
    this.name = 'CLIInvalidCommandError';
  }
}

export class CLIMissingArgumentError extends AppError {
  constructor(argument: string) {
    super({
      code: ErrorCodes.CLI_MISSING_ARGUMENT,
      message: `Missing required argument: ${argument}`,
      context: { argument },
      httpStatus: 400,
      retryable: false,
    });
    this.name = 'CLIMissingArgumentError';
  }
}

export class CLIFileNotFoundError extends AppError {
  constructor(path: string) {
    super({
      code: ErrorCodes.CLI_FILE_NOT_FOUND,
      message: `File not found: ${path}`,
      context: { path },
      httpStatus: 404,
      retryable: false,
    });
    this.name = 'CLIFileNotFoundError';
  }
}

// =============================================================================
// Backup Errors
// =============================================================================

export class BackupError extends AppError {
  constructor(message: string, cause?: Error) {
    const options: AppErrorOptions = {
      code: ErrorCodes.BACKUP_FAILED,
      message,
      httpStatus: 500,
      retryable: false,
    };
    if (cause) {
      options.cause = cause;
    }
    super(options);
    this.name = 'BackupError';
  }
}

export class BackupRestoreError extends AppError {
  constructor(message: string, cause?: Error) {
    const options: AppErrorOptions = {
      code: ErrorCodes.BACKUP_RESTORE_FAILED,
      message,
      httpStatus: 500,
      retryable: false,
    };
    if (cause) {
      options.cause = cause;
    }
    super(options);
    this.name = 'BackupRestoreError';
  }
}

// =============================================================================
// Retry Handler
// =============================================================================

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: ErrorCode[];
  onRetry?: (error: AppError, attempt: number) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'retryableErrors' | 'onRetry'>> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * リトライハンドラ - 指数バックオフでリトライを実行
 */
export class RetryHandler {
  private readonly options: Required<Omit<RetryOptions, 'retryableErrors' | 'onRetry'>> & Pick<RetryOptions, 'retryableErrors' | 'onRetry'>;

  constructor(options: RetryOptions = {}) {
    this.options = {
      ...DEFAULT_RETRY_OPTIONS,
      ...options,
    };
  }

  /**
   * リトライ可能なエラーかどうかを判定
   */
  private isRetryable(error: AppError): boolean {
    if (!error.retryable) {
      return false;
    }

    if (this.options.retryableErrors) {
      return this.options.retryableErrors.includes(error.code);
    }

    return true;
  }

  /**
   * 遅延を計算（指数バックオフ + ジッター）
   */
  private calculateDelay(attempt: number): number {
    const baseDelay = this.options.initialDelayMs * Math.pow(this.options.backoffMultiplier, attempt);
    const jitter = Math.random() * 0.3 * baseDelay; // 30% jitter
    return Math.min(baseDelay + jitter, this.options.maxDelayMs);
  }

  /**
   * 遅延を実行
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * リトライ付きで関数を実行
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: AppError | undefined;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = AppError.from(error);

        if (attempt === this.options.maxRetries || !this.isRetryable(lastError)) {
          throw lastError;
        }

        this.options.onRetry?.(lastError, attempt + 1);

        const delayMs = this.calculateDelay(attempt);
        await this.delay(delayMs);
      }
    }

    throw lastError!;
  }
}

/**
 * リトライデコレータ用ヘルパー
 */
export function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const handler = new RetryHandler(options);
  return handler.execute(fn);
}

// =============================================================================
// Result Type (Functional Error Handling)
// =============================================================================

/**
 * Result型 - 成功/失敗を明示的に表現
 */
export type Result<T, E = AppError> =
  | { success: true; value: T }
  | { success: false; error: E };

export const Result = {
  ok<T>(value: T): Result<T, never> {
    return { success: true, value };
  },

  err<E>(error: E): Result<never, E> {
    return { success: false, error };
  },

  isOk<T, E>(result: Result<T, E>): result is { success: true; value: T } {
    return result.success;
  },

  isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
    return !result.success;
  },

  map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
    if (result.success) {
      return Result.ok(fn(result.value));
    }
    return result;
  },

  flatMap<T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> {
    if (result.success) {
      return fn(result.value);
    }
    return result;
  },

  unwrap<T, E>(result: Result<T, E>): T {
    if (result.success) {
      return result.value;
    }
    throw result.error;
  },

  unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    if (result.success) {
      return result.value;
    }
    return defaultValue;
  },
};

// =============================================================================
// Async Result Wrapper
// =============================================================================

/**
 * async関数をResult型で包む
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorMapper?: (error: unknown) => AppError
): Promise<Result<T, AppError>> {
  try {
    const value = await fn();
    return Result.ok(value);
  } catch (error) {
    const appError = errorMapper
      ? errorMapper(error)
      : AppError.from(error);
    return Result.err(appError);
  }
}
