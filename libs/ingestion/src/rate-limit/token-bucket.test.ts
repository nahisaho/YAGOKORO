/**
 * Tests for Token Bucket Rate Limiter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TokenBucketRateLimiter, createArxivRateLimiter } from './token-bucket.js';

describe('TokenBucketRateLimiter', () => {
  describe('basic operations', () => {
    it('should allow acquisition when tokens are available', () => {
      const limiter = new TokenBucketRateLimiter({
        maxTokens: 5,
        refillRate: 1,
        initialTokens: 5,
      });

      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.getTokens()).toBeCloseTo(4, 1);
    });

    it('should reject acquisition when no tokens available', () => {
      const limiter = new TokenBucketRateLimiter({
        maxTokens: 1,
        refillRate: 0.1,
        initialTokens: 0,
      });

      expect(limiter.tryAcquire()).toBe(false);
    });

    it('should refill tokens over time', async () => {
      const limiter = new TokenBucketRateLimiter({
        maxTokens: 2,
        refillRate: 10, // 10 tokens per second
        initialTokens: 0,
      });

      // Wait 100ms for refill
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have approximately 1 token
      expect(limiter.getTokens()).toBeGreaterThan(0.5);
    });

    it('should not exceed max tokens', async () => {
      const limiter = new TokenBucketRateLimiter({
        maxTokens: 2,
        refillRate: 100,
        initialTokens: 2,
      });

      // Wait for potential refill
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(limiter.getTokens()).toBeLessThanOrEqual(2);
    });
  });

  describe('acquire()', () => {
    it('should wait until token is available', async () => {
      const limiter = new TokenBucketRateLimiter({
        maxTokens: 1,
        refillRate: 10, // Fast refill for testing
        initialTokens: 0,
      });

      const start = Date.now();
      await limiter.acquire();
      const elapsed = Date.now() - start;

      // Should have waited for refill
      expect(elapsed).toBeGreaterThan(50);
    });
  });

  describe('getWaitTime()', () => {
    it('should return 0 when tokens available', () => {
      const limiter = new TokenBucketRateLimiter({
        maxTokens: 1,
        refillRate: 1,
        initialTokens: 1,
      });

      expect(limiter.getWaitTime()).toBe(0);
    });

    it('should return positive value when no tokens', () => {
      const limiter = new TokenBucketRateLimiter({
        maxTokens: 1,
        refillRate: 1,
        initialTokens: 0,
      });

      expect(limiter.getWaitTime()).toBeGreaterThan(0);
    });
  });

  describe('createArxivRateLimiter', () => {
    it('should create rate limiter with arXiv settings', () => {
      const limiter = createArxivRateLimiter();
      
      // Should have 1 token initially
      expect(limiter.getTokens()).toBe(1);
      
      // After acquiring, should need to wait ~3 seconds
      limiter.tryAcquire();
      expect(limiter.getWaitTime()).toBeGreaterThan(2000);
    });
  });
});
