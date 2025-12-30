/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures when external services are unavailable
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms to wait before trying again (half-open state) */
  resetTimeoutMs: number;
  /** Number of successful calls in half-open state to close the circuit */
  successThreshold?: number;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly successThreshold: number;

  constructor(config: CircuitBreakerConfig) {
    this.failureThreshold = config.failureThreshold;
    this.resetTimeoutMs = config.resetTimeoutMs;
    this.successThreshold = config.successThreshold ?? 1;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      throw new CircuitOpenError(
        `Circuit is open. Retry after ${this.getTimeUntilRetry()}ms`
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if the circuit allows execution
   */
  canExecute(): boolean {
    if (this.state === 'closed') {
      return true;
    }

    if (this.state === 'open') {
      // Check if reset timeout has passed
      if (this.lastFailureTime) {
        const elapsed = Date.now() - this.lastFailureTime.getTime();
        if (elapsed >= this.resetTimeoutMs) {
          this.state = 'half-open';
          return true;
        }
      }
      return false;
    }

    // half-open: allow limited requests
    return true;
  }

  /**
   * Record a successful call
   */
  onSuccess(): void {
    this.lastSuccessTime = new Date();
    
    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this.reset();
      }
    } else {
      this.failures = 0;
    }
  }

  /**
   * Record a failed call
   */
  onFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();

    if (this.state === 'half-open') {
      // Any failure in half-open state opens the circuit again
      this.state = 'open';
      this.successes = 0;
    } else if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  /**
   * Reset the circuit breaker to closed state
   */
  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    // Check if we should transition from open to half-open
    if (this.state === 'open' && this.lastFailureTime) {
      const elapsed = Date.now() - this.lastFailureTime.getTime();
      if (elapsed >= this.resetTimeoutMs) {
        this.state = 'half-open';
      }
    }
    return this.state;
  }

  /**
   * Get statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.getState(),
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
    };
  }

  /**
   * Get time until retry is allowed (in ms)
   */
  getTimeUntilRetry(): number {
    if (this.state !== 'open' || !this.lastFailureTime) {
      return 0;
    }
    
    const elapsed = Date.now() - this.lastFailureTime.getTime();
    return Math.max(0, this.resetTimeoutMs - elapsed);
  }
}

/**
 * Error thrown when circuit is open
 */
export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Create a circuit breaker for Semantic Scholar API
 * Opens after 5 consecutive failures, waits 30 seconds before retry
 */
export function createSemanticScholarCircuitBreaker(): CircuitBreaker {
  return new CircuitBreaker({
    failureThreshold: 5,
    resetTimeoutMs: 30000, // 30 seconds
    successThreshold: 2,
  });
}
