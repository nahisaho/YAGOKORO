/**
 * @fileoverview Rate Limiter
 * TASK-V2-030: Rate limiting for API requests
 *
 * Provides rate limiting to prevent abuse and ensure fair usage.
 */

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Optional key prefix for storage */
  keyPrefix?: string;
  /** Skip rate limiting for certain keys */
  skipKeys?: string[];
  /** Custom message for rate limit exceeded */
  message?: string;
}

/**
 * Rate limit info for a key
 */
export interface RateLimitInfo {
  /** Number of requests remaining */
  remaining: number;
  /** Total limit */
  limit: number;
  /** Time until reset (ms) */
  resetIn: number;
  /** Whether rate limit is exceeded */
  exceeded: boolean;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  info: RateLimitInfo;
  message?: string;
}

/**
 * Rate limiter store interface
 */
export interface RateLimitStore {
  /** Get current count and window start */
  get(key: string): Promise<{ count: number; windowStart: number } | undefined>;
  /** Set count and window start */
  set(key: string, count: number, windowStart: number): Promise<void>;
  /** Delete entry */
  delete(key: string): Promise<void>;
  /** Clear all entries */
  clear(): Promise<void>;
}

/**
 * Rate limiter interface
 */
export interface RateLimiter {
  /**
   * Check if request is allowed
   */
  check(key: string): Promise<RateLimitResult>;

  /**
   * Consume a request from the quota
   */
  consume(key: string): Promise<RateLimitResult>;

  /**
   * Reset rate limit for a key
   */
  reset(key: string): Promise<void>;

  /**
   * Get current rate limit info
   */
  getInfo(key: string): Promise<RateLimitInfo>;

  /**
   * Reset all rate limits
   */
  resetAll(): Promise<void>;
}

// ============================================================================
// In-Memory Store
// ============================================================================

/**
 * In-memory rate limit store
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly store = new Map<
    string,
    { count: number; windowStart: number }
  >();

  async get(
    key: string
  ): Promise<{ count: number; windowStart: number } | undefined> {
    return this.store.get(key);
  }

  async set(key: string, count: number, windowStart: number): Promise<void> {
    this.store.set(key, { count, windowStart });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  /** Get store size (for testing) */
  get size(): number {
    return this.store.size;
  }
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Default rate limit configuration
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  keyPrefix: 'rl:',
  skipKeys: [],
  message: 'Rate limit exceeded. Please try again later.',
};

/**
 * Create rate limiter
 */
export function createRateLimiter(
  store: RateLimitStore,
  config: Partial<RateLimitConfig> = {}
): RateLimiter {
  const fullConfig: RateLimitConfig = {
    ...DEFAULT_RATE_LIMIT_CONFIG,
    ...config,
  };

  const { maxRequests, windowMs, keyPrefix, skipKeys, message } = fullConfig;

  /**
   * Get storage key
   */
  function getStorageKey(key: string): string {
    return `${keyPrefix}${key}`;
  }

  /**
   * Check if key should skip rate limiting
   */
  function shouldSkip(key: string): boolean {
    return skipKeys?.includes(key) ?? false;
  }

  /**
   * Calculate rate limit info
   */
  function calculateInfo(
    count: number,
    windowStart: number
  ): RateLimitInfo {
    const now = Date.now();
    const windowEnd = windowStart + windowMs;
    const remaining = Math.max(0, maxRequests - count);
    const resetIn = Math.max(0, windowEnd - now);

    return {
      remaining,
      limit: maxRequests,
      resetIn,
      exceeded: count >= maxRequests,
    };
  }

  return {
    async check(key: string): Promise<RateLimitResult> {
      if (shouldSkip(key)) {
        return {
          allowed: true,
          info: {
            remaining: maxRequests,
            limit: maxRequests,
            resetIn: 0,
            exceeded: false,
          },
        };
      }

      const storageKey = getStorageKey(key);
      const now = Date.now();
      const entry = await store.get(storageKey);

      if (!entry) {
        return {
          allowed: true,
          info: {
            remaining: maxRequests,
            limit: maxRequests,
            resetIn: windowMs,
            exceeded: false,
          },
        };
      }

      // Check if window has expired
      if (now - entry.windowStart >= windowMs) {
        return {
          allowed: true,
          info: {
            remaining: maxRequests,
            limit: maxRequests,
            resetIn: windowMs,
            exceeded: false,
          },
        };
      }

      const info = calculateInfo(entry.count, entry.windowStart);

      return {
        allowed: !info.exceeded,
        info,
        message: info.exceeded ? message : undefined,
      };
    },

    async consume(key: string): Promise<RateLimitResult> {
      if (shouldSkip(key)) {
        return {
          allowed: true,
          info: {
            remaining: maxRequests,
            limit: maxRequests,
            resetIn: 0,
            exceeded: false,
          },
        };
      }

      const storageKey = getStorageKey(key);
      const now = Date.now();
      const entry = await store.get(storageKey);

      let count = 1;
      let windowStart = now;

      if (entry) {
        // Check if window has expired
        if (now - entry.windowStart >= windowMs) {
          // Start new window
          count = 1;
          windowStart = now;
        } else {
          // Continue current window
          count = entry.count + 1;
          windowStart = entry.windowStart;
        }
      }

      // Save updated count
      await store.set(storageKey, count, windowStart);

      const info = calculateInfo(count, windowStart);

      return {
        allowed: count <= maxRequests,
        info,
        message: count > maxRequests ? message : undefined,
      };
    },

    async reset(key: string): Promise<void> {
      const storageKey = getStorageKey(key);
      await store.delete(storageKey);
    },

    async getInfo(key: string): Promise<RateLimitInfo> {
      if (shouldSkip(key)) {
        return {
          remaining: maxRequests,
          limit: maxRequests,
          resetIn: 0,
          exceeded: false,
        };
      }

      const storageKey = getStorageKey(key);
      const now = Date.now();
      const entry = await store.get(storageKey);

      if (!entry) {
        return {
          remaining: maxRequests,
          limit: maxRequests,
          resetIn: windowMs,
          exceeded: false,
        };
      }

      // Check if window has expired
      if (now - entry.windowStart >= windowMs) {
        return {
          remaining: maxRequests,
          limit: maxRequests,
          resetIn: windowMs,
          exceeded: false,
        };
      }

      return calculateInfo(entry.count, entry.windowStart);
    },

    async resetAll(): Promise<void> {
      await store.clear();
    },
  };
}

// ============================================================================
// Preset Configurations
// ============================================================================

/**
 * Preset rate limit configurations
 */
export const RATE_LIMIT_PRESETS = {
  /** Standard API rate limit */
  standard: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
  },

  /** Strict rate limit */
  strict: {
    maxRequests: 20,
    windowMs: 60000, // 1 minute
  },

  /** Relaxed rate limit */
  relaxed: {
    maxRequests: 1000,
    windowMs: 60000, // 1 minute
  },

  /** Per-hour rate limit */
  hourly: {
    maxRequests: 1000,
    windowMs: 3600000, // 1 hour
  },

  /** Daily rate limit */
  daily: {
    maxRequests: 10000,
    windowMs: 86400000, // 24 hours
  },
} as const;

/**
 * Create rate limiter with preset
 */
export function createRateLimiterWithPreset(
  store: RateLimitStore,
  preset: keyof typeof RATE_LIMIT_PRESETS,
  overrides?: Partial<RateLimitConfig>
): RateLimiter {
  return createRateLimiter(store, {
    ...RATE_LIMIT_PRESETS[preset],
    ...overrides,
  });
}
