/**
 * @fileoverview Rate Limiter Tests
 * TASK-V2-030: Tests for RateLimiter
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createRateLimiter,
  createRateLimiterWithPreset,
  InMemoryRateLimitStore,
  RATE_LIMIT_PRESETS,
} from './RateLimiter.js';

describe('RateLimiter', () => {
  describe('InMemoryRateLimitStore', () => {
    let store: InMemoryRateLimitStore;

    beforeEach(() => {
      store = new InMemoryRateLimitStore();
    });

    it('should store and retrieve entry', async () => {
      await store.set('key1', 5, 1000);
      const entry = await store.get('key1');

      expect(entry).toEqual({ count: 5, windowStart: 1000 });
    });

    it('should return undefined for non-existent key', async () => {
      const entry = await store.get('nonexistent');
      expect(entry).toBeUndefined();
    });

    it('should delete entry', async () => {
      await store.set('key1', 5, 1000);
      await store.delete('key1');
      const entry = await store.get('key1');

      expect(entry).toBeUndefined();
    });

    it('should clear all entries', async () => {
      await store.set('key1', 5, 1000);
      await store.set('key2', 10, 2000);
      await store.clear();

      expect(store.size).toBe(0);
    });
  });

  describe('createRateLimiter', () => {
    let store: InMemoryRateLimitStore;
    let originalDateNow: () => number;

    beforeEach(() => {
      store = new InMemoryRateLimitStore();
      originalDateNow = Date.now;
      vi.spyOn(Date, 'now').mockReturnValue(0);
    });

    afterEach(() => {
      Date.now = originalDateNow;
      vi.restoreAllMocks();
    });

    it('should allow first request', async () => {
      const limiter = createRateLimiter(store, {
        maxRequests: 10,
        windowMs: 60000,
      });

      const result = await limiter.check('user1');

      expect(result.allowed).toBe(true);
      expect(result.info.remaining).toBe(10);
    });

    it('should consume requests', async () => {
      const limiter = createRateLimiter(store, {
        maxRequests: 3,
        windowMs: 60000,
      });

      const result1 = await limiter.consume('user1');
      expect(result1.allowed).toBe(true);
      expect(result1.info.remaining).toBe(2);

      const result2 = await limiter.consume('user1');
      expect(result2.allowed).toBe(true);
      expect(result2.info.remaining).toBe(1);

      const result3 = await limiter.consume('user1');
      expect(result3.allowed).toBe(true);
      expect(result3.info.remaining).toBe(0);
    });

    it('should block when limit exceeded', async () => {
      const limiter = createRateLimiter(store, {
        maxRequests: 2,
        windowMs: 60000,
      });

      await limiter.consume('user1');
      await limiter.consume('user1');
      const result = await limiter.consume('user1');

      expect(result.allowed).toBe(false);
      expect(result.info.exceeded).toBe(true);
      expect(result.message).toBeDefined();
    });

    it('should reset after window expires', async () => {
      const limiter = createRateLimiter(store, {
        maxRequests: 2,
        windowMs: 60000,
      });

      await limiter.consume('user1');
      await limiter.consume('user1');

      // Move time forward past window
      vi.spyOn(Date, 'now').mockReturnValue(60001);

      const result = await limiter.consume('user1');
      expect(result.allowed).toBe(true);
      expect(result.info.remaining).toBe(1);
    });

    it('should track separate users independently', async () => {
      const limiter = createRateLimiter(store, {
        maxRequests: 2,
        windowMs: 60000,
      });

      await limiter.consume('user1');
      await limiter.consume('user1');

      const user1Result = await limiter.consume('user1');
      expect(user1Result.allowed).toBe(false);

      const user2Result = await limiter.consume('user2');
      expect(user2Result.allowed).toBe(true);
    });

    it('should skip rate limiting for whitelisted keys', async () => {
      const limiter = createRateLimiter(store, {
        maxRequests: 1,
        windowMs: 60000,
        skipKeys: ['admin'],
      });

      await limiter.consume('admin');
      await limiter.consume('admin');
      const result = await limiter.consume('admin');

      expect(result.allowed).toBe(true);
      expect(result.info.remaining).toBe(1);
    });

    it('should reset rate limit for specific key', async () => {
      const limiter = createRateLimiter(store, {
        maxRequests: 2,
        windowMs: 60000,
      });

      await limiter.consume('user1');
      await limiter.consume('user1');
      await limiter.reset('user1');

      const result = await limiter.check('user1');
      expect(result.info.remaining).toBe(2);
    });

    it('should reset all rate limits', async () => {
      const limiter = createRateLimiter(store, {
        maxRequests: 2,
        windowMs: 60000,
      });

      await limiter.consume('user1');
      await limiter.consume('user2');
      await limiter.resetAll();

      expect(store.size).toBe(0);
    });

    it('should get info without consuming', async () => {
      const limiter = createRateLimiter(store, {
        maxRequests: 10,
        windowMs: 60000,
      });

      await limiter.consume('user1');
      const info = await limiter.getInfo('user1');

      expect(info.remaining).toBe(9);
      expect(info.limit).toBe(10);

      // Info should be same after multiple checks
      const info2 = await limiter.getInfo('user1');
      expect(info2.remaining).toBe(9);
    });

    it('should calculate reset time correctly', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(10000);

      const limiter = createRateLimiter(store, {
        maxRequests: 10,
        windowMs: 60000,
      });

      await limiter.consume('user1');
      const info = await limiter.getInfo('user1');

      expect(info.resetIn).toBe(60000);
    });

    it('should use custom key prefix', async () => {
      const limiter = createRateLimiter(store, {
        maxRequests: 10,
        windowMs: 60000,
        keyPrefix: 'custom:',
      });

      await limiter.consume('user1');

      // Verify the store uses the prefix
      const entry = await store.get('custom:user1');
      expect(entry).toBeDefined();
    });

    it('should use custom message', async () => {
      const limiter = createRateLimiter(store, {
        maxRequests: 1,
        windowMs: 60000,
        message: 'Custom rate limit message',
      });

      await limiter.consume('user1');
      const result = await limiter.consume('user1');

      expect(result.message).toBe('Custom rate limit message');
    });
  });

  describe('createRateLimiterWithPreset', () => {
    it('should create limiter with standard preset', () => {
      const store = new InMemoryRateLimitStore();
      const limiter = createRateLimiterWithPreset(store, 'standard');

      expect(RATE_LIMIT_PRESETS.standard.maxRequests).toBe(100);
    });

    it('should create limiter with strict preset', () => {
      const store = new InMemoryRateLimitStore();
      const limiter = createRateLimiterWithPreset(store, 'strict');

      expect(RATE_LIMIT_PRESETS.strict.maxRequests).toBe(20);
    });

    it('should allow overrides', async () => {
      const store = new InMemoryRateLimitStore();
      const limiter = createRateLimiterWithPreset(store, 'standard', {
        maxRequests: 5,
      });

      // Consume 5 requests
      for (let i = 0; i < 5; i++) {
        await limiter.consume('user1');
      }

      const result = await limiter.consume('user1');
      expect(result.allowed).toBe(false);
    });
  });

  describe('RATE_LIMIT_PRESETS', () => {
    it('should have standard preset', () => {
      expect(RATE_LIMIT_PRESETS.standard.maxRequests).toBe(100);
      expect(RATE_LIMIT_PRESETS.standard.windowMs).toBe(60000);
    });

    it('should have strict preset', () => {
      expect(RATE_LIMIT_PRESETS.strict.maxRequests).toBe(20);
    });

    it('should have relaxed preset', () => {
      expect(RATE_LIMIT_PRESETS.relaxed.maxRequests).toBe(1000);
    });

    it('should have hourly preset', () => {
      expect(RATE_LIMIT_PRESETS.hourly.windowMs).toBe(3600000);
    });

    it('should have daily preset', () => {
      expect(RATE_LIMIT_PRESETS.daily.windowMs).toBe(86400000);
    });
  });
});
