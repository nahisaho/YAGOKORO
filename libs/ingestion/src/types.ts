/**
 * Types for ingestion service
 */

import type { Paper, PaperSource } from './entities/paper.js';

/**
 * arXiv ingestion options
 */
export interface ArxivIngestionOptions {
  /** Search query */
  query: string;
  /** arXiv categories (cs.AI, cs.CL, etc.) */
  categories?: string[];
  /** Start date for fetching papers */
  dateFrom?: Date;
  /** End date for fetching papers */
  dateTo?: Date;
  /** Maximum number of results */
  maxResults?: number;
}

/**
 * Semantic Scholar ingestion options
 */
export interface SSIngestionOptions {
  /** Search query */
  query: string;
  /** Paper IDs to fetch */
  paperIds?: string[];
  /** Fields to retrieve */
  fields?: string[];
  /** Maximum number of results */
  maxResults?: number;
}

/**
 * Ingestion schedule configuration
 */
export interface IngestionSchedule {
  /** Schedule name */
  name: string;
  /** Cron expression (e.g., "0 0/6 * * *" for every 6 hours) */
  cron: string;
  /** Search query */
  query: string;
  /** Ingestion options */
  options: ArxivIngestionOptions;
  /** Whether the schedule is enabled */
  enabled: boolean;
}

/**
 * Ingestion error details
 */
export interface IngestionError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Source of the error */
  source: PaperSource | 'system';
  /** Related paper ID if applicable */
  paperId?: string;
  /** Timestamp */
  timestamp: Date;
  /** Whether the error is retryable */
  retryable: boolean;
}

/**
 * Ingestion result summary
 */
export interface IngestionResult {
  /** Total papers fetched */
  totalFetched: number;
  /** New papers added */
  newPapers: number;
  /** Updated papers */
  updatedPapers: number;
  /** Duplicates skipped */
  duplicatesSkipped: number;
  /** Processing duration in milliseconds */
  durationMs: number;
  /** Errors encountered */
  errors: IngestionError[];
  /** Timestamp */
  timestamp: Date;
}

/**
 * Ingestion status
 */
export interface IngestionStatus {
  /** Whether ingestion is currently running */
  isRunning: boolean;
  /** Last run result */
  lastResult?: IngestionResult;
  /** Next scheduled run */
  nextScheduledRun?: Date;
  /** Active schedules */
  activeSchedules: IngestionSchedule[];
  /** Queue depth (papers pending processing) */
  queueDepth: number;
}
