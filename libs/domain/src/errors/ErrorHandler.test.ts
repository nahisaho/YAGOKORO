/**
 * @fileoverview ErrorHandler Tests
 * TASK-V2-032: Tests for error handler and global error management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createErrorHandler,
  getGlobalErrorHandler,
  setGlobalErrorHandler,
  handleError,
  withErrorHandling,
  withErrorBoundary,
  type ErrorHandler,
  type ErrorLogger,
  type ErrorContext,
} from './ErrorHandler.js';
import { AppError, ErrorCodes, ValidationError, NotFoundError } from './ErrorHandling.js';

describe('createErrorHandler', () => {
  let handler: ErrorHandler;

  beforeEach(() => {
    handler = createErrorHandler({
      logErrors: false, // Disable logging for tests
    });
    handler.resetStats();
  });

  describe('handle', () => {
    it('should convert unknown error to ErrorResponse', () => {
      const response = handler.handle(new Error('Test error'));

      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(ErrorCodes.UNKNOWN);
      expect(response.error.message).toBe('Test error');
    });

    it('should preserve AppError information', () => {
      const appError = new ValidationError('Invalid input', { field: 'name' });
      const response = handler.handle(appError);

      expect(response.error.code).toBe(ErrorCodes.VALIDATION);
      expect(response.error.message).toBe('Invalid input');
      expect(response.error.retryable).toBe(false);
    });

    it('should include timestamp', () => {
      const response = handler.handle(new Error('Test'));

      expect(response.error.timestamp).toBeDefined();
      expect(new Date(response.error.timestamp)).toBeInstanceOf(Date);
    });

    it('should update stats', () => {
      handler.handle(new ValidationError('Error 1'));
      handler.handle(new NotFoundError('Entity', 'id1'));
      handler.handle(new ValidationError('Error 2'));

      const stats = handler.getStats();

      expect(stats.totalErrors).toBe(3);
      expect(stats.byCode.get(ErrorCodes.VALIDATION)).toBe(2);
      expect(stats.byCode.get(ErrorCodes.NOT_FOUND)).toBe(1);
    });

    it('should track last error', () => {
      handler.handle(new ValidationError('First'));
      handler.handle(new NotFoundError('Entity', 'id'));

      const stats = handler.getStats();

      expect(stats.lastError).toBeDefined();
      expect(stats.lastError?.code).toBe(ErrorCodes.NOT_FOUND);
    });
  });

  describe('getSeverity', () => {
    it('should return warn for validation errors', () => {
      const error = new ValidationError('Invalid');
      expect(handler.getSeverity(error)).toBe('warn');
    });

    it('should return error for connection errors', () => {
      const error = new AppError({
        code: ErrorCodes.NEO4J_CONNECTION,
        message: 'Connection failed',
      });
      expect(handler.getSeverity(error)).toBe('error');
    });

    it('should return error for unknown errors', () => {
      const error = new AppError({
        code: ErrorCodes.UNKNOWN,
        message: 'Unknown error',
      });
      expect(handler.getSeverity(error)).toBe('error');
    });
  });

  describe('formatForLog', () => {
    it('should format error for logging', () => {
      const error = new ValidationError('Invalid input', { field: 'name' });
      const entry = handler.formatForLog(error);

      expect(entry.timestamp).toBeDefined();
      expect(entry.severity).toBe('warn');
      expect(entry.code).toBe(ErrorCodes.VALIDATION);
      expect(entry.message).toBe('Invalid input');
    });

    it('should include context', () => {
      const error = new ValidationError('Invalid');
      const context: ErrorContext = {
        operation: 'createEntity',
        component: 'EntityService',
        requestId: 'req-123',
      };

      const entry = handler.formatForLog(error, context);

      expect(entry.context).toEqual(context);
    });

    it('should include stack trace when configured', () => {
      const handlerWithStack = createErrorHandler({
        logErrors: false,
        includeStackTrace: true,
      });
      const error = new ValidationError('Invalid');
      const entry = handlerWithStack.formatForLog(error);

      expect(entry.stack).toBeDefined();
    });

    it('should exclude stack trace when configured', () => {
      const handlerWithoutStack = createErrorHandler({
        logErrors: false,
        includeStackTrace: false,
      });
      const error = new ValidationError('Invalid');
      const entry = handlerWithoutStack.formatForLog(error);

      expect(entry.stack).toBeUndefined();
    });
  });

  describe('handleAsync', () => {
    it('should pass through successful results', async () => {
      const result = await handler.handleAsync(async () => 'success');

      expect(result).toBe('success');
    });

    it('should catch and rethrow errors', async () => {
      await expect(
        handler.handleAsync(async () => {
          throw new ValidationError('Failed');
        })
      ).rejects.toThrow('Failed');

      expect(handler.getStats().totalErrors).toBe(1);
    });
  });

  describe('wrap', () => {
    it('should wrap sync function', () => {
      const fn = (x: number) => x * 2;
      const wrapped = handler.wrap(fn as (...args: unknown[]) => unknown);

      expect(wrapped(5)).toBe(10);
    });

    it('should catch errors from wrapped function', () => {
      const fn = () => {
        throw new ValidationError('Sync error');
      };
      const wrapped = handler.wrap(fn);

      expect(() => wrapped()).toThrow('Sync error');
      expect(handler.getStats().totalErrors).toBe(1);
    });
  });

  describe('wrapAsync', () => {
    it('should wrap async function', async () => {
      const fn = async (x: number) => x * 2;
      const wrapped = handler.wrapAsync(fn as (...args: unknown[]) => Promise<unknown>);

      expect(await wrapped(5)).toBe(10);
    });

    it('should catch errors from wrapped async function', async () => {
      const fn = async () => {
        throw new ValidationError('Async error');
      };
      const wrapped = handler.wrapAsync(fn);

      await expect(wrapped()).rejects.toThrow('Async error');
      expect(handler.getStats().totalErrors).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return stats copy', () => {
      handler.handle(new ValidationError('Error'));

      const stats1 = handler.getStats();
      const stats2 = handler.getStats();

      expect(stats1).not.toBe(stats2);
      expect(stats1.byCode).not.toBe(stats2.byCode);
    });

    it('should track severity distribution', () => {
      handler.handle(new ValidationError('Warn level'));
      handler.handle(new AppError({
        code: ErrorCodes.NEO4J_CONNECTION,
        message: 'Error level',
      }));

      const stats = handler.getStats();

      expect(stats.bySeverity.get('warn')).toBe(1);
      expect(stats.bySeverity.get('error')).toBe(1);
    });
  });

  describe('resetStats', () => {
    it('should clear all stats', () => {
      handler.handle(new ValidationError('Error 1'));
      handler.handle(new ValidationError('Error 2'));

      handler.resetStats();

      const stats = handler.getStats();
      expect(stats.totalErrors).toBe(0);
      expect(stats.byCode.size).toBe(0);
      expect(stats.bySeverity.size).toBe(0);
      expect(stats.lastError).toBeUndefined();
    });
  });
});

describe('ErrorHandler with logger', () => {
  it('should use custom logger', () => {
    const mockLogger: ErrorLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const handler = createErrorHandler({
      logErrors: true,
      logger: mockLogger,
    });

    handler.handle(new ValidationError('Test warning'));

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Test warning',
      expect.objectContaining({ code: ErrorCodes.VALIDATION })
    );
  });

  it('should call onError callback', () => {
    const onError = vi.fn();
    const handler = createErrorHandler({
      logErrors: false,
      onError,
    });

    handler.handle(new ValidationError('Test'));

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCodes.VALIDATION,
        severity: 'warn',
      })
    );
  });

  it('should call onFatalError for fatal errors', () => {
    const onFatalError = vi.fn();
    const handler = createErrorHandler({
      logErrors: false,
      onFatalError,
    });

    handler.handle(new AppError({
      code: ErrorCodes.MCP_SERVER,
      message: 'Server crash',
    }));

    expect(onFatalError).toHaveBeenCalled();
  });
});

describe('Sensitive data masking', () => {
  it('should mask sensitive data in context', () => {
    const handler = createErrorHandler({
      logErrors: false,
      maskSensitiveData: true,
    });

    const error = new ValidationError('Error');
    const context: ErrorContext = {
      operation: 'auth',
      metadata: {
        username: 'user123',
        password: 'secret123',
        apiKey: 'sk-12345',
      },
    };

    const entry = handler.formatForLog(error, context);

    expect(entry.context?.metadata?.username).toBe('user123');
    expect(entry.context?.metadata?.password).toBe('***MASKED***');
    expect(entry.context?.metadata?.apiKey).toBe('***MASKED***');
  });

  it('should not mask when disabled', () => {
    const handler = createErrorHandler({
      logErrors: false,
      maskSensitiveData: false,
    });

    const error = new ValidationError('Error');
    const context: ErrorContext = {
      metadata: {
        password: 'secret123',
      },
    };

    const entry = handler.formatForLog(error, context);

    expect(entry.context?.metadata?.password).toBe('secret123');
  });
});

describe('Global error handler', () => {
  it('should provide global handler', () => {
    const handler = getGlobalErrorHandler();
    expect(handler).toBeDefined();
    expect(handler.handle).toBeInstanceOf(Function);
  });

  it('should allow setting global handler', () => {
    const customHandler = createErrorHandler({ logErrors: false });
    setGlobalErrorHandler(customHandler);

    const retrieved = getGlobalErrorHandler();
    expect(retrieved).toBe(customHandler);
  });

  it('handleError should use global handler', () => {
    const customHandler = createErrorHandler({ logErrors: false });
    setGlobalErrorHandler(customHandler);

    const response = handleError(new ValidationError('Global test'));

    expect(response.error.code).toBe(ErrorCodes.VALIDATION);
    expect(customHandler.getStats().totalErrors).toBe(1);
  });
});

describe('withErrorBoundary', () => {
  it('should return result on success', async () => {
    const result = await withErrorBoundary(async () => 'success');
    expect(result).toBe('success');
  });

  it('should return null on error by default', async () => {
    const result = await withErrorBoundary(async () => {
      throw new Error('Failed');
    });

    expect(result).toBeNull();
  });

  it('should call fallback on error', async () => {
    const result = await withErrorBoundary(
      async () => {
        throw new ValidationError('Failed');
      },
      {
        fallback: (error) => `Fallback: ${error.message}`,
      }
    );

    expect(result).toBe('Fallback: Failed');
  });

  it('should call onError callback', async () => {
    const onError = vi.fn();

    await withErrorBoundary(
      async () => {
        throw new ValidationError('Test');
      },
      { onError }
    );

    expect(onError).toHaveBeenCalledWith(expect.any(AppError));
  });
});

describe('withErrorHandling', () => {
  it('should wrap function with error handling', async () => {
    const handler = createErrorHandler({ logErrors: false });
    setGlobalErrorHandler(handler);

    const fn = async () => {
      throw new ValidationError('Wrapped error');
    };

    const wrapped = withErrorHandling(fn);

    await expect(wrapped()).rejects.toThrow('Wrapped error');
    expect(handler.getStats().totalErrors).toBe(1);
  });
});
