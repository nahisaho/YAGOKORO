/**
 * Ingestion Service
 * Orchestrates paper ingestion from multiple sources
 */

import type { Paper } from '../entities/paper.js';
import type { 
  ArxivIngestionOptions, 
  SSIngestionOptions,
  IngestionSchedule,
  IngestionResult,
  IngestionError,
  IngestionStatus,
} from '../types.js';
import { ArxivClient, type ArxivSearchOptions } from '../arxiv/arxiv-client.js';
import { SemanticScholarClient, CircuitOpenError } from '../semantic-scholar/semantic-scholar-client.js';
import { Deduplicator } from '../dedup/deduplicator.js';
import { ScheduleRunner, type ScheduleConfig } from '../scheduler/schedule-runner.js';

export interface IngestionServiceConfig {
  /** arXiv client instance */
  arxivClient?: ArxivClient;
  /** Semantic Scholar client instance */
  ssClient?: SemanticScholarClient;
  /** Deduplicator instance */
  deduplicator?: Deduplicator;
  /** Schedule runner instance */
  scheduleRunner?: ScheduleRunner;
  /** Callback when papers are ingested */
  onPapersIngested?: (papers: Paper[]) => Promise<void>;
  /** Callback to get existing papers for deduplication */
  getExistingPapers?: () => Promise<Paper[]>;
}

export class IngestionService {
  private readonly arxivClient: ArxivClient;
  private readonly ssClient: SemanticScholarClient;
  private readonly deduplicator: Deduplicator;
  private readonly scheduleRunner: ScheduleRunner;
  private readonly onPapersIngested?: (papers: Paper[]) => Promise<void>;
  private readonly getExistingPapers?: () => Promise<Paper[]>;
  
  private isRunning = false;
  private lastResult?: IngestionResult;
  private queueDepth = 0;

  constructor(config: IngestionServiceConfig = {}) {
    this.arxivClient = config.arxivClient ?? new ArxivClient();
    this.ssClient = config.ssClient ?? new SemanticScholarClient();
    this.deduplicator = config.deduplicator ?? new Deduplicator();
    this.scheduleRunner = config.scheduleRunner ?? new ScheduleRunner();
    this.onPapersIngested = config.onPapersIngested;
    this.getExistingPapers = config.getExistingPapers;
  }

  /**
   * Ingest papers from arXiv
   */
  async ingestFromArxiv(options: ArxivIngestionOptions): Promise<IngestionResult> {
    const startTime = Date.now();
    const errors: IngestionError[] = [];
    
    this.isRunning = true;

    try {
      // Fetch papers from arXiv
      const searchOptions: ArxivSearchOptions = {
        query: options.query,
        categories: options.categories,
        maxResults: options.maxResults ?? 100,
        sortBy: 'submittedDate',
        sortOrder: 'descending',
      };

      const papers = await this.arxivClient.search(searchOptions);
      this.queueDepth = papers.length;

      // Get existing papers for deduplication
      const existingPapers = this.getExistingPapers 
        ? await this.getExistingPapers() 
        : [];

      // Deduplicate
      const dedupResults = this.deduplicator.checkDuplicates(papers, existingPapers);
      
      const newPapers: Paper[] = [];
      let duplicatesSkipped = 0;

      for (const paper of papers) {
        const dedupResult = dedupResults.get(paper.id);
        
        if (dedupResult?.isDuplicate && !dedupResult.needsReview) {
          duplicatesSkipped++;
        } else {
          newPapers.push(paper);
        }
        
        this.queueDepth--;
      }

      // Enrich with Semantic Scholar data (if available)
      const enrichedPapers = await this.enrichWithSemanticScholar(newPapers, errors);

      // Call callback if provided
      if (this.onPapersIngested && enrichedPapers.length > 0) {
        await this.onPapersIngested(enrichedPapers);
      }

      const result: IngestionResult = {
        totalFetched: papers.length,
        newPapers: enrichedPapers.length,
        updatedPapers: 0,
        duplicatesSkipped,
        durationMs: Date.now() - startTime,
        errors,
        timestamp: new Date(),
      };

      this.lastResult = result;
      return result;

    } finally {
      this.isRunning = false;
      this.queueDepth = 0;
    }
  }

  /**
   * Ingest papers from Semantic Scholar
   */
  async ingestFromSemanticScholar(options: SSIngestionOptions): Promise<IngestionResult> {
    const startTime = Date.now();
    const errors: IngestionError[] = [];
    
    this.isRunning = true;

    try {
      // Fetch papers
      let papers: Paper[];
      
      if (options.paperIds && options.paperIds.length > 0) {
        papers = await this.ssClient.getPapers(options.paperIds);
      } else {
        papers = await this.ssClient.search({
          query: options.query,
          limit: options.maxResults ?? 100,
        });
      }

      this.queueDepth = papers.length;

      // Get existing papers for deduplication
      const existingPapers = this.getExistingPapers 
        ? await this.getExistingPapers() 
        : [];

      // Deduplicate
      const dedupResults = this.deduplicator.checkDuplicates(papers, existingPapers);
      
      const newPapers: Paper[] = [];
      let duplicatesSkipped = 0;

      for (const paper of papers) {
        const dedupResult = dedupResults.get(paper.id);
        
        if (dedupResult?.isDuplicate && !dedupResult.needsReview) {
          duplicatesSkipped++;
        } else {
          newPapers.push(paper);
        }
        
        this.queueDepth--;
      }

      // Call callback if provided
      if (this.onPapersIngested && newPapers.length > 0) {
        await this.onPapersIngested(newPapers);
      }

      const result: IngestionResult = {
        totalFetched: papers.length,
        newPapers: newPapers.length,
        updatedPapers: 0,
        duplicatesSkipped,
        durationMs: Date.now() - startTime,
        errors,
        timestamp: new Date(),
      };

      this.lastResult = result;
      return result;

    } catch (error) {
      if (error instanceof CircuitOpenError) {
        errors.push({
          code: 'CIRCUIT_OPEN',
          message: error.message,
          source: 'semantic_scholar',
          timestamp: new Date(),
          retryable: true,
        });
      }
      throw error;
    } finally {
      this.isRunning = false;
      this.queueDepth = 0;
    }
  }

  /**
   * Schedule periodic ingestion
   */
  scheduleIngestion(schedule: IngestionSchedule): void {
    const config: ScheduleConfig = {
      name: schedule.name,
      cronExpression: schedule.cron,
      runOnStart: false,
    };

    this.scheduleRunner.addSchedule(config, async () => {
      await this.ingestFromArxiv(schedule.options);
    });

    if (schedule.enabled) {
      this.scheduleRunner.start(schedule.name);
    }
  }

  /**
   * Remove a scheduled ingestion
   */
  removeSchedule(name: string): void {
    this.scheduleRunner.remove(name);
  }

  /**
   * Start a schedule
   */
  startSchedule(name: string): void {
    this.scheduleRunner.start(name);
  }

  /**
   * Stop a schedule
   */
  stopSchedule(name: string): void {
    this.scheduleRunner.stop(name);
  }

  /**
   * Get ingestion status
   */
  getStatus(): IngestionStatus {
    const scheduleStatuses = this.scheduleRunner.getAllStatuses();
    
    const activeSchedules: IngestionSchedule[] = scheduleStatuses
      .filter(s => s.isActive)
      .map(s => ({
        name: s.name,
        cron: '', // Would need to store this
        query: '', // Would need to store this
        options: {} as ArxivIngestionOptions,
        enabled: s.isActive,
      }));

    // Find next scheduled run
    let nextScheduledRun: Date | undefined;
    for (const status of scheduleStatuses) {
      if (status.nextRun && (!nextScheduledRun || status.nextRun < nextScheduledRun)) {
        nextScheduledRun = status.nextRun;
      }
    }

    return {
      isRunning: this.isRunning,
      lastResult: this.lastResult,
      nextScheduledRun,
      activeSchedules,
      queueDepth: this.queueDepth,
    };
  }

  /**
   * Enrich papers with Semantic Scholar data
   */
  private async enrichWithSemanticScholar(
    papers: Paper[], 
    errors: IngestionError[]
  ): Promise<Paper[]> {
    // Skip if Semantic Scholar circuit is open
    if (!this.ssClient.isAvailable()) {
      return papers;
    }

    const enrichedPapers: Paper[] = [];

    for (const paper of papers) {
      try {
        // Try to get additional data from Semantic Scholar
        let ssPaper: Paper | null = null;

        if (paper.doi) {
          ssPaper = await this.ssClient.getByDoi(paper.doi);
        } else if (paper.arxivId) {
          ssPaper = await this.ssClient.getByArxivId(paper.arxivId);
        }

        if (ssPaper) {
          // Merge data
          enrichedPapers.push({
            ...paper,
            citationCount: ssPaper.citationCount ?? paper.citationCount,
            references: ssPaper.references ?? paper.references,
          });
        } else {
          enrichedPapers.push(paper);
        }
      } catch (error) {
        // Log error but continue with original paper
        if (error instanceof CircuitOpenError) {
          errors.push({
            code: 'CIRCUIT_OPEN',
            message: 'Semantic Scholar circuit breaker open',
            source: 'semantic_scholar',
            paperId: paper.id,
            timestamp: new Date(),
            retryable: true,
          });
          // Add remaining papers without enrichment
          enrichedPapers.push(paper);
        } else {
          errors.push({
            code: 'ENRICHMENT_FAILED',
            message: error instanceof Error ? error.message : String(error),
            source: 'semantic_scholar',
            paperId: paper.id,
            timestamp: new Date(),
            retryable: true,
          });
          enrichedPapers.push(paper);
        }
      }
    }

    return enrichedPapers;
  }

  /**
   * Stop all scheduled tasks and cleanup
   */
  shutdown(): void {
    this.scheduleRunner.stopAll();
  }
}
