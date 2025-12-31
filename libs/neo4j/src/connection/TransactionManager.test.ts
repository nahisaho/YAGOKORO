/**
 * @fileoverview Transaction Manager Tests
 * TASK-V2-031: Tests for TransactionManager and UnitOfWork
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTransactionManager,
  executeWithRetry,
  DEFAULT_RETRY_CONFIG,
  type TransactionManager,
  type UnitOfWork,
} from './TransactionManager.js';
import type { Neo4jConnection } from './Neo4jConnection.js';

// Mock session
const createMockSession = () => ({
  executeRead: vi.fn(),
  executeWrite: vi.fn(),
  close: vi.fn(),
  run: vi.fn(),
});

// Mock transaction
const createMockTransaction = () => ({
  run: vi.fn().mockResolvedValue({ records: [] }),
});

// Mock connection
const createMockConnection = (session = createMockSession()) => ({
  getReadSession: vi.fn().mockReturnValue(session),
  getWriteSession: vi.fn().mockReturnValue(session),
  run: vi.fn(),
  close: vi.fn(),
});

describe('TransactionManager', () => {
  let mockConnection: ReturnType<typeof createMockConnection>;
  let mockSession: ReturnType<typeof createMockSession>;
  let transactionManager: TransactionManager;

  beforeEach(() => {
    mockSession = createMockSession();
    mockConnection = createMockConnection(mockSession);
    transactionManager = createTransactionManager(
      mockConnection as unknown as Neo4jConnection
    );
  });

  describe('read', () => {
    it('should execute read transaction', async () => {
      const expectedResult = { data: 'test' };
      mockSession.executeRead.mockResolvedValue(expectedResult);

      const result = await transactionManager.read(async (tx) => {
        return expectedResult;
      });

      expect(result).toEqual(expectedResult);
      expect(mockConnection.getReadSession).toHaveBeenCalled();
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should pass transaction options', async () => {
      mockSession.executeRead.mockResolvedValue('result');

      await transactionManager.read(
        async () => 'result',
        { timeout: 5000, metadata: { operation: 'test' } }
      );

      expect(mockSession.executeRead).toHaveBeenCalledWith(
        expect.any(Function),
        { timeout: 5000, metadata: { operation: 'test' } }
      );
    });

    it('should close session on error', async () => {
      mockSession.executeRead.mockRejectedValue(new Error('Read failed'));

      await expect(
        transactionManager.read(async () => {
          throw new Error('Read failed');
        })
      ).rejects.toThrow('Read failed');

      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  describe('write', () => {
    it('should execute write transaction', async () => {
      const expectedResult = { id: 'created-1' };
      mockSession.executeWrite.mockResolvedValue(expectedResult);

      const result = await transactionManager.write(async (tx) => {
        return expectedResult;
      });

      expect(result).toEqual(expectedResult);
      expect(mockConnection.getWriteSession).toHaveBeenCalled();
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should close session on error', async () => {
      mockSession.executeWrite.mockRejectedValue(new Error('Write failed'));

      await expect(
        transactionManager.write(async () => {
          throw new Error('Write failed');
        })
      ).rejects.toThrow('Write failed');

      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  describe('batch', () => {
    it('should execute multiple work items', async () => {
      let executionOrder: string[] = [];

      mockSession.executeWrite.mockImplementation(async (work: Function) => {
        await work(createMockTransaction());
      });

      const items = [
        {
          id: 'item1',
          execute: async () => {
            executionOrder.push('item1');
            return 'result1';
          },
          priority: 1,
        },
        {
          id: 'item2',
          execute: async () => {
            executionOrder.push('item2');
            return 'result2';
          },
          priority: 2,
        },
      ];

      const result = await transactionManager.batch(items);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      // Higher priority first
      expect(executionOrder).toEqual(['item2', 'item1']);
    });

    it('should track failed items', async () => {
      mockSession.executeWrite.mockImplementation(async (work: Function) => {
        await work(createMockTransaction());
      });

      const items = [
        {
          id: 'success',
          execute: async () => 'ok',
        },
        {
          id: 'failure',
          execute: async () => {
            throw new Error('Item failed');
          },
        },
      ];

      const result = await transactionManager.batch(items);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].id).toBe('failure');
      expect(result.failed[0].error.message).toBe('Item failed');
    });

    it('should return duration', async () => {
      mockSession.executeWrite.mockImplementation(async (work: Function) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        await work(createMockTransaction());
      });

      const result = await transactionManager.batch([
        { id: 'test', execute: async () => 'result' },
      ]);

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('createUnitOfWork', () => {
    let unitOfWork: UnitOfWork;

    beforeEach(() => {
      unitOfWork = transactionManager.createUnitOfWork();
    });

    it('should register create operation', () => {
      const id = unitOfWork.registerCreate(
        'CREATE (n:Entity {name: $name})',
        { name: 'Test' }
      );

      expect(id).toMatch(/^op_/);
      expect(unitOfWork.getPendingCount()).toBe(1);
      expect(unitOfWork.hasPendingOperations()).toBe(true);
    });

    it('should register update operation', () => {
      const id = unitOfWork.registerUpdate(
        'MATCH (n:Entity {id: $id}) SET n.name = $name',
        { id: '123', name: 'Updated' }
      );

      expect(id).toMatch(/^op_/);
      const operations = unitOfWork.getPendingOperations();
      expect(operations[0].type).toBe('update');
    });

    it('should register delete operation', () => {
      const id = unitOfWork.registerDelete(
        'MATCH (n:Entity {id: $id}) DELETE n',
        { id: '123' }
      );

      expect(id).toMatch(/^op_/);
      const operations = unitOfWork.getPendingOperations();
      expect(operations[0].type).toBe('delete');
    });

    it('should clear pending operations', () => {
      unitOfWork.registerCreate('CREATE (n:Entity)', {});
      unitOfWork.registerUpdate('MATCH (n) SET n.x = 1', {});

      expect(unitOfWork.getPendingCount()).toBe(2);

      unitOfWork.clear();

      expect(unitOfWork.getPendingCount()).toBe(0);
      expect(unitOfWork.hasPendingOperations()).toBe(false);
    });

    it('should rollback (clear without commit)', () => {
      unitOfWork.registerCreate('CREATE (n:Entity)', {});

      unitOfWork.rollback();

      expect(unitOfWork.getPendingCount()).toBe(0);
    });

    it('should commit pending operations', async () => {
      const mockTx = createMockTransaction();
      mockSession.executeWrite.mockImplementation(async (work: Function) => {
        await work(mockTx);
      });

      unitOfWork.registerCreate('CREATE (n:Entity)', {});
      unitOfWork.registerUpdate('MATCH (n) SET n.x = 1', {});

      await unitOfWork.commit();

      expect(mockTx.run).toHaveBeenCalledTimes(2);
      expect(unitOfWork.getPendingCount()).toBe(0);
    });

    it('should commit operations in correct order', async () => {
      const executionOrder: string[] = [];
      const mockTx = {
        run: vi.fn().mockImplementation((query: string) => {
          if (query.includes('CREATE')) executionOrder.push('create');
          if (query.includes('SET')) executionOrder.push('update');
          if (query.includes('DELETE')) executionOrder.push('delete');
          return Promise.resolve({ records: [] });
        }),
      };
      mockSession.executeWrite.mockImplementation(async (work: Function) => {
        await work(mockTx);
      });

      // Register in random order
      unitOfWork.registerDelete('DELETE', {});
      unitOfWork.registerCreate('CREATE', {});
      unitOfWork.registerUpdate('SET', {});

      await unitOfWork.commit();

      // Should be: create, update, delete
      expect(executionOrder).toEqual(['create', 'update', 'delete']);
    });

    it('should not commit if no pending operations', async () => {
      await unitOfWork.commit();

      expect(mockSession.executeWrite).not.toHaveBeenCalled();
    });

    it('should return pending operations copy', () => {
      unitOfWork.registerCreate('CREATE (n)', {});

      const ops1 = unitOfWork.getPendingOperations();
      const ops2 = unitOfWork.getPendingOperations();

      expect(ops1).not.toBe(ops2);
      expect(ops1).toEqual(ops2);
    });
  });
});

describe('executeWithRetry', () => {
  it('should execute operation successfully', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const result = await executeWithRetry(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable error', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce({ code: 'Neo.TransientError.Transaction.DeadlockDetected' })
      .mockResolvedValue('success');

    const result = await executeWithRetry(operation, {
      initialDelay: 1,
    });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-retryable error', async () => {
    const operation = vi
      .fn()
      .mockRejectedValue(new Error('Permanent error'));

    await expect(
      executeWithRetry(operation, { maxRetries: 3 })
    ).rejects.toThrow('Permanent error');

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should give up after max retries', async () => {
    const operation = vi
      .fn()
      .mockRejectedValue({ code: 'Neo.TransientError.Transaction.DeadlockDetected' });

    await expect(
      executeWithRetry(operation, {
        maxRetries: 2,
        initialDelay: 1,
        maxDelay: 10,
      })
    ).rejects.toBeDefined();

    expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should use exponential backoff', async () => {
    const delays: number[] = [];
    const originalSetTimeout = global.setTimeout;
    vi.spyOn(global, 'setTimeout').mockImplementation((fn, delay) => {
      delays.push(delay as number);
      return originalSetTimeout(fn, 0);
    });

    const operation = vi
      .fn()
      .mockRejectedValueOnce({ code: 'Neo.TransientError.Transaction.DeadlockDetected' })
      .mockRejectedValueOnce({ code: 'Neo.TransientError.Transaction.DeadlockDetected' })
      .mockResolvedValue('success');

    await executeWithRetry(operation, {
      maxRetries: 3,
      initialDelay: 100,
      backoffMultiplier: 2,
    });

    expect(delays[0]).toBe(100);
    expect(delays[1]).toBe(200);

    vi.restoreAllMocks();
  });

  it('should respect max delay', async () => {
    const delays: number[] = [];
    const originalSetTimeout = global.setTimeout;
    vi.spyOn(global, 'setTimeout').mockImplementation((fn, delay) => {
      delays.push(delay as number);
      return originalSetTimeout(fn, 0);
    });

    const operation = vi
      .fn()
      .mockRejectedValueOnce({ code: 'Neo.TransientError.Transaction.DeadlockDetected' })
      .mockRejectedValueOnce({ code: 'Neo.TransientError.Transaction.DeadlockDetected' })
      .mockRejectedValueOnce({ code: 'Neo.TransientError.Transaction.DeadlockDetected' })
      .mockResolvedValue('success');

    await executeWithRetry(operation, {
      maxRetries: 5,
      initialDelay: 100,
      maxDelay: 150,
      backoffMultiplier: 2,
    });

    expect(delays.every((d) => d <= 150)).toBe(true);

    vi.restoreAllMocks();
  });
});

describe('DEFAULT_RETRY_CONFIG', () => {
  it('should have sensible defaults', () => {
    expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
    expect(DEFAULT_RETRY_CONFIG.initialDelay).toBe(100);
    expect(DEFAULT_RETRY_CONFIG.maxDelay).toBe(5000);
    expect(DEFAULT_RETRY_CONFIG.backoffMultiplier).toBe(2);
    expect(DEFAULT_RETRY_CONFIG.retryableErrors).toContain(
      'Neo.TransientError.Transaction.DeadlockDetected'
    );
  });
});
