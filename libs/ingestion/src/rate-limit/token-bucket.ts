/**
 * Token Bucket Rate Limiter
 * Used for arXiv API (3 second interval)
 */

export interface TokenBucketConfig {
  /** Maximum tokens in bucket */
  maxTokens: number;
  /** Tokens refilled per second */
  refillRate: number;
  /** Initial tokens */
  initialTokens?: number;
}

export class TokenBucketRateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private lastRefillTime: number;

  constructor(config: TokenBucketConfig) {
    this.maxTokens = config.maxTokens;
    this.refillRate = config.refillRate;
    this.tokens = config.initialTokens ?? config.maxTokens;
    this.lastRefillTime = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefillTime) / 1000; // seconds
    const tokensToAdd = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  /**
   * Try to acquire a token
   * @returns true if token was acquired, false otherwise
   */
  tryAcquire(): boolean {
    this.refill();
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    
    return false;
  }

  /**
   * Wait until a token is available, then acquire it
   */
  async acquire(): Promise<void> {
    while (!this.tryAcquire()) {
      // Calculate wait time until next token
      const tokensNeeded = 1 - this.tokens;
      const waitTimeMs = (tokensNeeded / this.refillRate) * 1000;
      await this.sleep(Math.max(100, waitTimeMs));
    }
  }

  /**
   * Get current token count
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Get time until next token is available (in ms)
   */
  getWaitTime(): number {
    this.refill();
    if (this.tokens >= 1) return 0;
    
    const tokensNeeded = 1 - this.tokens;
    return (tokensNeeded / this.refillRate) * 1000;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a rate limiter for arXiv API (1 request per 3 seconds)
 */
export function createArxivRateLimiter(): TokenBucketRateLimiter {
  return new TokenBucketRateLimiter({
    maxTokens: 1,
    refillRate: 1 / 3, // 1 token per 3 seconds
    initialTokens: 1,
  });
}
