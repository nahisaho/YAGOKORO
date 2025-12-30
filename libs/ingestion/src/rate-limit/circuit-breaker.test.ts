/**
 * Tests for Circuit Breaker
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker, CircuitOpenError, createSemanticScholarCircuitBreaker } from './circuit-breaker.js';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 100,
      successThreshold: 2,
    });
  });

  describe('initial state', () => {
    it('should start in closed state', () => {
      expect(breaker.getState()).toBe('closed');
    });

    it('should allow execution in closed state', () => {
      expect(breaker.canExecute()).toBe(true);
    });
  });

  describe('execute()', () => {
    it('should execute function and return result on success', async () => {
      const result = await breaker.execute(async () => 'success');
      expect(result).toBe('success');
    });

    it('should propagate errors from function', async () => {
      await expect(
        breaker.execute(async () => {
          throw new Error('test error');
        })
      ).rejects.toThrow('test error');
    });

    it('should throw CircuitOpenError when circuit is open', async () => {
      // Trigger failures to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('open');

      await expect(
        breaker.execute(async () => 'should not run')
      ).rejects.toThrow(CircuitOpenError);
    });
  });

  describe('state transitions', () => {
    it('should transition to open after failure threshold', async () => {
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('open');
    });

    it('should transition to half-open after reset timeout', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('open');

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(breaker.getState()).toBe('half-open');
    });

    it('should transition to closed after success in half-open', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch {
          // Expected
        }
      }

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Successful executions in half-open state
      await breaker.execute(async () => 'success');
      await breaker.execute(async () => 'success');

      expect(breaker.getState()).toBe('closed');
    });

    it('should transition back to open on failure in half-open', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch {
          // Expected
        }
      }

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(breaker.getState()).toBe('half-open');

      // Fail in half-open
      try {
        await breaker.execute(async () => {
          throw new Error('fail again');
        });
      } catch {
        // Expected
      }

      expect(breaker.getState()).toBe('open');
    });
  });

  describe('reset()', () => {
    it('should reset to closed state', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch {
          // Expected
        }
      }

      breaker.reset();

      expect(breaker.getState()).toBe('closed');
      expect(breaker.canExecute()).toBe(true);
    });
  });

  describe('getStats()', () => {
    it('should return correct statistics', async () => {
      await breaker.execute(async () => 'success');
      
      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // Expected
      }

      const stats = breaker.getStats();
      expect(stats.state).toBe('closed');
      expect(stats.failures).toBe(1);
      expect(stats.lastSuccessTime).toBeDefined();
      expect(stats.lastFailureTime).toBeDefined();
    });
  });

  describe('createSemanticScholarCircuitBreaker', () => {
    it('should create circuit breaker with SS settings', () => {
      const ssBreaker = createSemanticScholarCircuitBreaker();
      expect(ssBreaker.getState()).toBe('closed');
    });
  });
});
