/**
 * Schedule Runner for periodic paper ingestion
 * Supports cron expressions and exponential backoff retry
 */

import cron, { type ScheduledTask } from 'node-cron';

export interface ScheduleConfig {
  /** Schedule name */
  name: string;
  /** Cron expression */
  cronExpression: string;
  /** Whether to run immediately on start */
  runOnStart?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Initial retry delay in ms */
  initialRetryDelayMs?: number;
  /** Maximum retry delay in ms */
  maxRetryDelayMs?: number;
}

export interface ScheduleStatus {
  /** Schedule name */
  name: string;
  /** Whether the schedule is active */
  isActive: boolean;
  /** Last run time */
  lastRun?: Date;
  /** Next run time */
  nextRun?: Date;
  /** Last run success */
  lastRunSuccess?: boolean;
  /** Consecutive failures */
  consecutiveFailures: number;
  /** Total runs */
  totalRuns: number;
  /** Successful runs */
  successfulRuns: number;
}

export type ScheduleTask = () => Promise<void>;

interface ScheduleEntry {
  config: ScheduleConfig;
  task: ScheduleTask;
  cronTask?: ScheduledTask;
  status: ScheduleStatus;
}

export class ScheduleRunner {
  private schedules: Map<string, ScheduleEntry> = new Map();
  private readonly maxRetries: number;
  private readonly initialRetryDelayMs: number;
  private readonly maxRetryDelayMs: number;

  constructor(config?: {
    maxRetries?: number;
    initialRetryDelayMs?: number;
    maxRetryDelayMs?: number;
  }) {
    this.maxRetries = config?.maxRetries ?? 5;
    this.initialRetryDelayMs = config?.initialRetryDelayMs ?? 1000;
    this.maxRetryDelayMs = config?.maxRetryDelayMs ?? 30000;
  }

  /**
   * Add a scheduled task
   */
  addSchedule(config: ScheduleConfig, task: ScheduleTask): void {
    if (this.schedules.has(config.name)) {
      throw new Error(`Schedule "${config.name}" already exists`);
    }

    if (!cron.validate(config.cronExpression)) {
      throw new Error(`Invalid cron expression: ${config.cronExpression}`);
    }

    const entry: ScheduleEntry = {
      config,
      task,
      status: {
        name: config.name,
        isActive: false,
        consecutiveFailures: 0,
        totalRuns: 0,
        successfulRuns: 0,
      },
    };

    this.schedules.set(config.name, entry);
  }

  /**
   * Start a schedule
   */
  start(name: string): void {
    const entry = this.schedules.get(name);
    if (!entry) {
      throw new Error(`Schedule "${name}" not found`);
    }

    if (entry.cronTask) {
      entry.cronTask.stop();
    }

    entry.cronTask = cron.schedule(entry.config.cronExpression, async () => {
      await this.runWithRetry(entry);
    });

    entry.status.isActive = true;
    entry.status.nextRun = this.getNextRunTime(entry.config.cronExpression);

    // Run immediately if configured
    if (entry.config.runOnStart) {
      this.runWithRetry(entry).catch(console.error);
    }
  }

  /**
   * Stop a schedule
   */
  stop(name: string): void {
    const entry = this.schedules.get(name);
    if (!entry) {
      throw new Error(`Schedule "${name}" not found`);
    }

    if (entry.cronTask) {
      entry.cronTask.stop();
      entry.cronTask = undefined;
    }

    entry.status.isActive = false;
    entry.status.nextRun = undefined;
  }

  /**
   * Start all schedules
   */
  startAll(): void {
    for (const name of this.schedules.keys()) {
      this.start(name);
    }
  }

  /**
   * Stop all schedules
   */
  stopAll(): void {
    for (const name of this.schedules.keys()) {
      this.stop(name);
    }
  }

  /**
   * Remove a schedule
   */
  remove(name: string): void {
    const entry = this.schedules.get(name);
    if (entry?.cronTask) {
      entry.cronTask.stop();
    }
    this.schedules.delete(name);
  }

  /**
   * Run a task manually
   */
  async runNow(name: string): Promise<void> {
    const entry = this.schedules.get(name);
    if (!entry) {
      throw new Error(`Schedule "${name}" not found`);
    }

    await this.runWithRetry(entry);
  }

  /**
   * Get status of a schedule
   */
  getStatus(name: string): ScheduleStatus | undefined {
    return this.schedules.get(name)?.status;
  }

  /**
   * Get all schedule statuses
   */
  getAllStatuses(): ScheduleStatus[] {
    return Array.from(this.schedules.values()).map(e => e.status);
  }

  /**
   * Check if a schedule exists
   */
  hasSchedule(name: string): boolean {
    return this.schedules.has(name);
  }

  /**
   * Run task with exponential backoff retry
   */
  private async runWithRetry(entry: ScheduleEntry): Promise<void> {
    const maxRetries = entry.config.maxRetries ?? this.maxRetries;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        entry.status.lastRun = new Date();
        entry.status.totalRuns++;

        await entry.task();

        // Success
        entry.status.lastRunSuccess = true;
        entry.status.consecutiveFailures = 0;
        entry.status.successfulRuns++;
        
        // Update next run time
        if (entry.status.isActive) {
          entry.status.nextRun = this.getNextRunTime(entry.config.cronExpression);
        }
        
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        entry.status.consecutiveFailures++;
        entry.status.lastRunSuccess = false;

        if (attempt < maxRetries) {
          // Calculate delay with exponential backoff
          const delay = this.calculateRetryDelay(
            attempt,
            entry.config.initialRetryDelayMs ?? this.initialRetryDelayMs,
            entry.config.maxRetryDelayMs ?? this.maxRetryDelayMs
          );
          
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    throw lastError ?? new Error('Task failed after all retries');
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(
    attempt: number,
    initialDelay: number,
    maxDelay: number
  ): number {
    // Exponential backoff: delay = initialDelay * 2^attempt
    const delay = initialDelay * Math.pow(2, attempt);
    // Add jitter (±10%)
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    return Math.min(delay + jitter, maxDelay);
  }

  /**
   * Get next run time for a cron expression
   */
  private getNextRunTime(cronExpression: string): Date {
    // Simple approximation - in production, use a proper cron parser
    // This is a placeholder implementation
    const now = new Date();
    const parts = cronExpression.split(' ');
    
    // Handle common patterns
    if (parts[0] === '0' && parts[1].startsWith('*/')) {
      // Every N hours
      const hours = parseInt(parts[1].substring(2), 10);
      const next = new Date(now);
      next.setHours(now.getHours() + hours);
      next.setMinutes(0);
      next.setSeconds(0);
      return next;
    }
    
    // Default: 1 hour from now
    return new Date(now.getTime() + 60 * 60 * 1000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create default schedule runner with standard retry settings
 */
export function createScheduleRunner(): ScheduleRunner {
  return new ScheduleRunner({
    maxRetries: 5,
    initialRetryDelayMs: 1000,
    maxRetryDelayMs: 30000,
  });
}
