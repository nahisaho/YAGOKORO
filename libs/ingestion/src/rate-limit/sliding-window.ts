/**
 * Sliding Window Rate Limiter
 * Used for Semantic Scholar API (100 requests per 5 minutes)
 */

export interface SlidingWindowConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
}

export class SlidingWindowRateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private timestamps: number[] = [];

  constructor(config: SlidingWindowConfig) {
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
  }

  /**
   * Clean up old timestamps outside the window
   */
  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    this.timestamps = this.timestamps.filter(t => t > windowStart);
  }

  /**
   * Try to acquire a slot
   * @returns true if slot was acquired, false otherwise
   */
  tryAcquire(): boolean {
    this.cleanup();
    
    if (this.timestamps.length < this.maxRequests) {
      this.timestamps.push(Date.now());
      return true;
    }
    
    return false;
  }

  /**
   * Wait until a slot is available, then acquire it
   */
  async acquire(): Promise<void> {
    while (!this.tryAcquire()) {
      const waitTime = this.getWaitTime();
      await this.sleep(Math.max(100, waitTime));
    }
  }

  /**
   * Get current request count in the window
   */
  getCount(): number {
    this.cleanup();
    return this.timestamps.length;
  }

  /**
   * Get remaining requests in the window
   */
  getRemaining(): number {
    this.cleanup();
    return Math.max(0, this.maxRequests - this.timestamps.length);
  }

  /**
   * Get time until next slot is available (in ms)
   */
  getWaitTime(): number {
    this.cleanup();
    
    if (this.timestamps.length < this.maxRequests) {
      return 0;
    }
    
    // Wait until oldest request falls out of window
    const oldestTimestamp = this.timestamps[0];
    const windowStart = Date.now() - this.windowMs;
    return Math.max(0, oldestTimestamp - windowStart);
  }

  /**
   * Check if rate limit is exceeded
   */
  isLimited(): boolean {
    this.cleanup();
    return this.timestamps.length >= this.maxRequests;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a rate limiter for Semantic Scholar API (100 requests per 5 minutes)
 */
export function createSemanticScholarRateLimiter(): SlidingWindowRateLimiter {
  return new SlidingWindowRateLimiter({
    maxRequests: 100,
    windowMs: 5 * 60 * 1000, // 5 minutes
  });
}
