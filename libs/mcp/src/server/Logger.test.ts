/**
 * @module Logger.test
 * @description 構造化ロガーのテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  StructuredLogger,
  MemoryDestination,
  ConsoleDestination,
  createLogger,
  type LogLevel,
} from './Logger.js';

describe('StructuredLogger', () => {
  let destination: MemoryDestination;
  let logger: StructuredLogger;

  beforeEach(() => {
    destination = new MemoryDestination();
    logger = new StructuredLogger({
      level: 'debug',
      service: 'test-service',
      destination,
    });
  });

  describe('log levels', () => {
    it('should log debug messages', () => {
      logger.debug('Debug message');

      expect(destination.entries).toHaveLength(1);
      expect(destination.entries[0].level).toBe('debug');
      expect(destination.entries[0].message).toBe('Debug message');
    });

    it('should log info messages', () => {
      logger.info('Info message');

      expect(destination.entries).toHaveLength(1);
      expect(destination.entries[0].level).toBe('info');
    });

    it('should log warn messages', () => {
      logger.warn('Warning message');

      expect(destination.entries).toHaveLength(1);
      expect(destination.entries[0].level).toBe('warn');
    });

    it('should log error messages with error object', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);

      expect(destination.entries).toHaveLength(1);
      expect(destination.entries[0].level).toBe('error');
      expect(destination.entries[0].error).toBeDefined();
      expect(destination.entries[0].error?.message).toBe('Test error');
    });

    it('should log fatal messages', () => {
      logger.fatal('Fatal error');

      expect(destination.entries).toHaveLength(1);
      expect(destination.entries[0].level).toBe('fatal');
    });
  });

  describe('log level filtering', () => {
    it('should filter messages below configured level', () => {
      const warnLogger = new StructuredLogger({
        level: 'warn',
        destination,
      });

      warnLogger.debug('Should not appear');
      warnLogger.info('Should not appear');
      warnLogger.warn('Should appear');

      expect(destination.entries).toHaveLength(1);
      expect(destination.entries[0].level).toBe('warn');
    });

    it('should log all messages at debug level', () => {
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');
      logger.fatal('Fatal');

      expect(destination.entries).toHaveLength(5);
    });
  });

  describe('context and metadata', () => {
    it('should include context in log entries', () => {
      logger.info('With context', { userId: 'user-123', action: 'login' });

      expect(destination.entries[0].context).toEqual({
        userId: 'user-123',
        action: 'login',
      });
    });

    it('should include service name', () => {
      logger.info('Service test');

      expect(destination.entries[0].service).toBe('test-service');
    });

    it('should include timestamp', () => {
      logger.info('Timestamp test');

      expect(destination.entries[0].timestamp).toBeDefined();
      expect(new Date(destination.entries[0].timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('child logger', () => {
    it('should create child logger with request ID', () => {
      const child = logger.child('req-123');
      child.info('Child log');

      expect(destination.entries[0].requestId).toBe('req-123');
    });

    it('should maintain parent configuration', () => {
      const child = logger.child('req-456');
      child.info('Child inherits service');

      expect(destination.entries[0].service).toBe('test-service');
    });

    it('should filter by request ID', () => {
      const child1 = logger.child('req-1');
      const child2 = logger.child('req-2');

      child1.info('Request 1');
      child2.info('Request 2');
      child1.info('Request 1 again');

      const req1Logs = destination.findByRequestId('req-1');
      expect(req1Logs).toHaveLength(2);
    });
  });

  describe('timed operations', () => {
    it('should log operation duration on success', async () => {
      await logger.timed('test-operation', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'result';
      });

      expect(destination.entries).toHaveLength(1);
      expect(destination.entries[0].message).toBe('test-operation completed');
      expect(destination.entries[0].duration).toBeGreaterThanOrEqual(10);
    });

    it('should log operation duration on failure', async () => {
      await expect(
        logger.timed('failing-operation', async () => {
          throw new Error('Operation failed');
        })
      ).rejects.toThrow('Operation failed');

      expect(destination.entries).toHaveLength(1);
      expect(destination.entries[0].level).toBe('error');
      expect(destination.entries[0].message).toBe('failing-operation failed');
      expect(destination.entries[0].error?.message).toBe('Operation failed');
    });

    it('should include context in timed operations', async () => {
      await logger.timed(
        'context-operation',
        async () => 'done',
        { key: 'value' }
      );

      expect(destination.entries[0].context).toEqual({ key: 'value' });
    });
  });

  describe('findByLevel', () => {
    it('should filter entries by level', () => {
      logger.info('Info 1');
      logger.warn('Warn 1');
      logger.info('Info 2');
      logger.error('Error 1');

      const warnings = destination.findByLevel('warn');
      expect(warnings).toHaveLength(1);
      expect(warnings[0].message).toBe('Warn 1');
    });
  });
});

describe('ConsoleDestination', () => {
  it('should be instantiable', () => {
    const dest = new ConsoleDestination();
    expect(dest).toBeInstanceOf(ConsoleDestination);
  });

  it('should support pretty mode', () => {
    const dest = new ConsoleDestination(true);
    expect(dest).toBeInstanceOf(ConsoleDestination);
  });
});

describe('createLogger', () => {
  it('should create a logger with defaults', () => {
    const logger = createLogger();
    expect(logger).toBeInstanceOf(StructuredLogger);
  });

  it('should accept custom configuration', () => {
    const destination = new MemoryDestination();
    const logger = createLogger({
      level: 'warn',
      service: 'custom-service',
      destination,
    });

    logger.info('Should be filtered');
    logger.warn('Should appear');

    expect(destination.entries).toHaveLength(1);
    expect(destination.entries[0].service).toBe('custom-service');
  });
});
