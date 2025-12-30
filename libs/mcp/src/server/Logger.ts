/**
 * @module Logger
 * @description 構造化ロギングシステム
 *
 * JSON形式の構造化ログを出力し、リクエストID追跡を提供
 */

/**
 * ログレベル定義
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * ログレベルの優先度
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

/**
 * ログエントリ
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  duration?: number;
  service?: string;
}

/**
 * ロガー設定
 */
export interface LoggerConfig {
  level: LogLevel;
  service?: string;
  pretty?: boolean;
  destination?: LogDestination;
}

/**
 * ログ出力先インターフェース
 */
export interface LogDestination {
  write(entry: LogEntry): void;
}

/**
 * コンソール出力先
 */
export class ConsoleDestination implements LogDestination {
  constructor(private readonly pretty: boolean = false) {}

  write(entry: LogEntry): void {
    const output = this.pretty
      ? this.formatPretty(entry)
      : JSON.stringify(entry);

    switch (entry.level) {
      case 'debug':
      case 'info':
        console.log(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
      case 'fatal':
        console.error(output);
        break;
    }
  }

  private formatPretty(entry: LogEntry): string {
    const levelColors: Record<LogLevel, string> = {
      debug: '\x1b[34m', // blue
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
      fatal: '\x1b[35m', // magenta
    };
    const reset = '\x1b[0m';
    const color = levelColors[entry.level];
    
    let output = `${entry.timestamp} ${color}[${entry.level.toUpperCase()}]${reset} ${entry.message}`;
    
    if (entry.requestId) {
      output += ` (reqId: ${entry.requestId})`;
    }
    
    if (entry.duration !== undefined) {
      output += ` [${entry.duration}ms]`;
    }
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      output += `\n  Context: ${JSON.stringify(entry.context)}`;
    }
    
    if (entry.error) {
      output += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\n  ${entry.error.stack}`;
      }
    }
    
    return output;
  }
}

/**
 * メモリ出力先（テスト用）
 */
export class MemoryDestination implements LogDestination {
  readonly entries: LogEntry[] = [];

  write(entry: LogEntry): void {
    this.entries.push(entry);
  }

  clear(): void {
    this.entries.length = 0;
  }

  findByLevel(level: LogLevel): LogEntry[] {
    return this.entries.filter((e) => e.level === level);
  }

  findByRequestId(requestId: string): LogEntry[] {
    return this.entries.filter((e) => e.requestId === requestId);
  }
}

/**
 * 構造化ロガー
 */
export class StructuredLogger {
  private readonly level: LogLevel;
  private readonly service: string | undefined;
  private readonly destination: LogDestination;
  private requestId: string | undefined;

  constructor(config: LoggerConfig) {
    this.level = config.level;
    this.service = config.service;
    this.destination = config.destination ?? new ConsoleDestination(config.pretty);
  }

  /**
   * リクエストIDを設定した子ロガーを作成
   */
  child(requestId: string): StructuredLogger {
    const config: LoggerConfig = {
      level: this.level,
      destination: this.destination,
    };
    if (this.service !== undefined) {
      config.service = this.service;
    }
    const child = new StructuredLogger(config);
    child.requestId = requestId;
    return child;
  }

  /**
   * ログを出力
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.level]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };
    if (this.service !== undefined) {
      entry.service = this.service;
    }
    if (this.requestId !== undefined) {
      entry.requestId = this.requestId;
    }
    if (context !== undefined) {
      entry.context = context;
    }

    if (error) {
      const errorObj: { name: string; message: string; stack?: string; code?: string } = {
        name: error.name,
        message: error.message,
      };
      if (error.stack !== undefined) {
        errorObj.stack = error.stack;
      }
      const errorCode = (error as { code?: string }).code;
      if (errorCode !== undefined) {
        errorObj.code = errorCode;
      }
      entry.error = errorObj;
    }

    this.destination.write(entry);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('error', message, context, error);
  }

  fatal(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('fatal', message, context, error);
  }

  /**
   * 操作の実行時間を計測してログ出力
   */
  async timed<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `${operation} completed`,
        duration,
      };
      if (this.service !== undefined) {
        entry.service = this.service;
      }
      if (this.requestId !== undefined) {
        entry.requestId = this.requestId;
      }
      if (context !== undefined) {
        entry.context = context;
      }
      
      this.destination.write(entry);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `${operation} failed`,
        duration,
      };
      if (this.service !== undefined) {
        entry.service = this.service;
      }
      if (this.requestId !== undefined) {
        entry.requestId = this.requestId;
      }
      if (context !== undefined) {
        entry.context = context;
      }
      if (error instanceof Error) {
        const errorObj: { name: string; message: string; stack?: string } = {
          name: error.name,
          message: error.message,
        };
        if (error.stack !== undefined) {
          errorObj.stack = error.stack;
        }
        entry.error = errorObj;
      } else {
        entry.error = { name: 'Error', message: String(error) };
      }
      
      this.destination.write(entry);
      throw error;
    }
  }
}

/**
 * デフォルトロガーを作成
 */
export function createLogger(config?: Partial<LoggerConfig>): StructuredLogger {
  const loggerConfig: LoggerConfig = {
    level: config?.level ?? 'info',
    service: config?.service ?? 'yagokoro',
    pretty: config?.pretty ?? process.env.NODE_ENV !== 'production',
  };
  if (config?.destination !== undefined) {
    loggerConfig.destination = config.destination;
  }
  return new StructuredLogger(loggerConfig);
}
