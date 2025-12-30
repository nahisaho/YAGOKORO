/**
 * @fileoverview TimelineAggregator
 *
 * Aggregates timeline events for technology lifecycle analysis.
 * Collects publication events, derivative events, benchmarks, and milestones.
 */

import type {
  TimelineEvent,
  TimelineEventType,
} from './types.js';

/**
 * Entity repository interface for timeline aggregation
 */
export interface TimelineEntityRepository {
  /** Get entity by ID */
  getById(id: string): Promise<TimelineEntity | null>;
  /** Get entities by type */
  getByType(type: string): Promise<TimelineEntity[]>;
  /** Get related entities */
  getRelated(entityId: string, relationTypes?: string[]): Promise<TimelineRelation[]>;
}

/**
 * Timeline entity
 */
export interface TimelineEntity {
  id: string;
  type: string;
  name: string;
  properties: Record<string, unknown>;
}

/**
 * Timeline relation
 */
export interface TimelineRelation {
  sourceId: string;
  targetId: string;
  type: string;
  properties: Record<string, unknown>;
}

/**
 * Options for timeline aggregation
 */
export interface TimelineAggregatorOptions {
  /** Start date for timeline (default: no limit) */
  startDate?: Date;
  /** End date for timeline (default: now) */
  endDate?: Date;
  /** Event types to include (default: all) */
  eventTypes?: TimelineEventType[];
  /** Maximum events to return (default: 1000) */
  maxEvents?: number;
  /** Minimum impact score to include (default: 0) */
  minImpact?: number;
}

/**
 * Aggregated timeline result
 */
export interface AggregatedTimeline {
  /** Technology ID */
  technologyId: string;
  /** Technology name */
  technologyName: string;
  /** Events sorted by date */
  events: TimelineEvent[];
  /** Event counts by type */
  eventCounts: Record<TimelineEventType, number>;
  /** Date range */
  dateRange: {
    earliest: Date;
    latest: Date;
  };
  /** Total impact score */
  totalImpact: number;
}

/**
 * TimelineAggregator class
 *
 * Aggregates and organizes timeline events for a technology.
 */
export class TimelineAggregator {
  private readonly entityRepository: TimelineEntityRepository;

  constructor(entityRepository: TimelineEntityRepository) {
    this.entityRepository = entityRepository;
  }

  /**
   * Aggregate timeline for a technology
   */
  async aggregateTimeline(
    technologyId: string,
    options: TimelineAggregatorOptions = {}
  ): Promise<AggregatedTimeline> {
    const {
      startDate,
      endDate = new Date(),
      eventTypes,
      maxEvents = 1000,
      minImpact = 0,
    } = options;

    const entity = await this.entityRepository.getById(technologyId);
    if (!entity) {
      return this.createEmptyTimeline(technologyId, 'Unknown');
    }

    const events: TimelineEvent[] = [];

    // Get publication events
    if (!eventTypes || eventTypes.includes('publication')) {
      const pubEvents = await this.getPublicationEvents(technologyId);
      events.push(...pubEvents);
    }

    // Get derivative events
    if (!eventTypes || eventTypes.includes('derivative')) {
      const derivEvents = await this.getDerivativeEvents(technologyId);
      events.push(...derivEvents);
    }

    // Get benchmark events
    if (!eventTypes || eventTypes.includes('benchmark')) {
      const benchEvents = await this.getBenchmarkEvents(technologyId);
      events.push(...benchEvents);
    }

    // Get milestone events
    if (!eventTypes || eventTypes.includes('milestone')) {
      const milestoneEvents = await this.getMilestoneEvents(technologyId);
      events.push(...milestoneEvents);
    }

    // Get adoption events
    if (!eventTypes || eventTypes.includes('adoption')) {
      const adoptionEvents = await this.getAdoptionEvents(technologyId);
      events.push(...adoptionEvents);
    }

    // Filter by date range
    let filteredEvents = events.filter((e) => {
      if (startDate && e.date < startDate) return false;
      if (e.date > endDate) return false;
      return true;
    });

    // Filter by minimum impact
    filteredEvents = filteredEvents.filter((e) => e.impact >= minImpact);

    // Sort by date
    filteredEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Limit results
    if (filteredEvents.length > maxEvents) {
      filteredEvents = filteredEvents.slice(0, maxEvents);
    }

    // Calculate statistics
    const eventCounts = this.calculateEventCounts(filteredEvents);
    const dateRange = this.calculateDateRange(filteredEvents);
    const totalImpact = filteredEvents.reduce((sum, e) => sum + e.impact, 0);

    return {
      technologyId,
      technologyName: entity.name,
      events: filteredEvents,
      eventCounts,
      dateRange,
      totalImpact,
    };
  }

  /**
   * Get publication events for a technology
   */
  async getPublicationEvents(technologyId: string): Promise<TimelineEvent[]> {
    const relations = await this.entityRepository.getRelated(technologyId, [
      'PUBLISHED_IN',
      'DESCRIBED_IN',
      'INTRODUCED_BY',
    ]);

    const events: TimelineEvent[] = [];

    for (const relation of relations) {
      const publication = await this.entityRepository.getById(relation.targetId);
      if (!publication) continue;

      const year = publication.properties['year'] as number | undefined;
      const date = year ? new Date(year, 0, 1) : new Date();

      const citations = (publication.properties['citations'] as number) ?? 0;
      const impact = this.calculatePublicationImpact(citations);

      events.push({
        id: `pub-${publication.id}`,
        type: 'publication',
        date,
        title: publication.name,
        description: `Publication: ${publication.name}`,
        impact,
        relatedEntities: [technologyId, publication.id],
        sources: [publication.id],
        metadata: {
          citations,
          venue: publication.properties['venue'],
        },
      });
    }

    return events;
  }

  /**
   * Get derivative technology events
   */
  async getDerivativeEvents(technologyId: string): Promise<TimelineEvent[]> {
    const relations = await this.entityRepository.getRelated(technologyId, [
      'DERIVED_FROM',
      'EXTENDS',
      'BASED_ON',
    ]);

    const events: TimelineEvent[] = [];

    for (const relation of relations) {
      // Check if this technology is the source (derivatives point TO this tech)
      if (relation.targetId !== technologyId) continue;

      const derivative = await this.entityRepository.getById(relation.sourceId);
      if (!derivative) continue;

      const year = derivative.properties['year'] as number | undefined;
      const date = year ? new Date(year, 0, 1) : new Date();

      events.push({
        id: `deriv-${derivative.id}`,
        type: 'derivative',
        date,
        title: `Derivative: ${derivative.name}`,
        description: `${derivative.name} was derived from this technology`,
        impact: 0.6,
        relatedEntities: [technologyId, derivative.id],
        sources: [],
        metadata: {
          derivativeId: derivative.id,
          derivativeName: derivative.name,
        },
      });
    }

    return events;
  }

  /**
   * Get benchmark events
   */
  async getBenchmarkEvents(technologyId: string): Promise<TimelineEvent[]> {
    const relations = await this.entityRepository.getRelated(technologyId, [
      'EVALUATED_ON',
      'BENCHMARKED_ON',
      'TESTED_ON',
    ]);

    const events: TimelineEvent[] = [];

    for (const relation of relations) {
      const benchmark = await this.entityRepository.getById(relation.targetId);
      if (!benchmark) continue;

      const score = relation.properties['score'] as number | undefined;
      const date = relation.properties['date']
        ? new Date(relation.properties['date'] as string)
        : new Date();

      const isTopScore = relation.properties['isTopScore'] as boolean | undefined;
      const impact = isTopScore ? 0.9 : 0.5;

      events.push({
        id: `bench-${benchmark.id}-${technologyId}`,
        type: 'benchmark',
        date,
        title: `Benchmark: ${benchmark.name}`,
        description: score
          ? `Achieved score ${score} on ${benchmark.name}`
          : `Evaluated on ${benchmark.name}`,
        impact,
        relatedEntities: [technologyId, benchmark.id],
        sources: [],
        metadata: {
          benchmarkId: benchmark.id,
          score,
          isTopScore,
        },
      });
    }

    return events;
  }

  /**
   * Get milestone events
   */
  async getMilestoneEvents(technologyId: string): Promise<TimelineEvent[]> {
    const entity = await this.entityRepository.getById(technologyId);
    if (!entity) return [];

    const events: TimelineEvent[] = [];

    // Check for milestone properties
    const milestones = entity.properties['milestones'] as
      | Array<{ date: string; title: string; description?: string }>
      | undefined;

    if (milestones) {
      for (const milestone of milestones) {
        events.push({
          id: `milestone-${technologyId}-${milestone.date}`,
          type: 'milestone',
          date: new Date(milestone.date),
          title: milestone.title,
          description: milestone.description ?? milestone.title,
          impact: 0.7,
          relatedEntities: [technologyId],
          sources: [],
        });
      }
    }

    // Add creation milestone
    const createdYear = entity.properties['year'] as number | undefined;
    if (createdYear) {
      events.push({
        id: `milestone-${technologyId}-created`,
        type: 'milestone',
        date: new Date(createdYear, 0, 1),
        title: `${entity.name} introduced`,
        description: `Technology ${entity.name} was first introduced`,
        impact: 1.0,
        relatedEntities: [technologyId],
        sources: [],
      });
    }

    return events;
  }

  /**
   * Get adoption events
   */
  async getAdoptionEvents(technologyId: string): Promise<TimelineEvent[]> {
    const relations = await this.entityRepository.getRelated(technologyId, [
      'ADOPTED_BY',
      'USED_BY',
      'IMPLEMENTED_BY',
    ]);

    const events: TimelineEvent[] = [];

    for (const relation of relations) {
      const adopter = await this.entityRepository.getById(relation.targetId);
      if (!adopter) continue;

      const date = relation.properties['date']
        ? new Date(relation.properties['date'] as string)
        : new Date();

      // Higher impact for major organizations
      const isMajor = adopter.properties['isMajor'] as boolean | undefined;
      const impact = isMajor ? 0.8 : 0.4;

      events.push({
        id: `adopt-${adopter.id}-${technologyId}`,
        type: 'adoption',
        date,
        title: `Adopted by ${adopter.name}`,
        description: `${adopter.name} adopted this technology`,
        impact,
        relatedEntities: [technologyId, adopter.id],
        sources: [],
        metadata: {
          adopterId: adopter.id,
          adopterType: adopter.type,
        },
      });
    }

    return events;
  }

  /**
   * Merge multiple timelines
   */
  mergeTimelines(timelines: AggregatedTimeline[]): TimelineEvent[] {
    const allEvents = timelines.flatMap((t) => t.events);
    allEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
    return allEvents;
  }

  /**
   * Get events by type
   */
  filterByType(events: TimelineEvent[], type: TimelineEventType): TimelineEvent[] {
    return events.filter((e) => e.type === type);
  }

  /**
   * Get high impact events
   */
  getHighImpactEvents(events: TimelineEvent[], threshold = 0.7): TimelineEvent[] {
    return events.filter((e) => e.impact >= threshold);
  }

  /**
   * Calculate publication impact from citations
   */
  private calculatePublicationImpact(citations: number): number {
    // Logarithmic scale: 0 citations = 0.1, 100 citations = 0.5, 1000+ = 0.9
    if (citations === 0) return 0.1;
    const impact = 0.1 + 0.8 * (Math.log10(citations + 1) / 4);
    return Math.min(impact, 1.0);
  }

  /**
   * Calculate event counts by type
   */
  private calculateEventCounts(
    events: TimelineEvent[]
  ): Record<TimelineEventType, number> {
    const counts: Record<TimelineEventType, number> = {
      publication: 0,
      derivative: 0,
      benchmark: 0,
      adoption: 0,
      milestone: 0,
      decline: 0,
      revival: 0,
    };

    for (const event of events) {
      counts[event.type]++;
    }

    return counts;
  }

  /**
   * Calculate date range of events
   */
  private calculateDateRange(
    events: TimelineEvent[]
  ): { earliest: Date; latest: Date } {
    if (events.length === 0) {
      const now = new Date();
      return { earliest: now, latest: now };
    }

    let earliest = events[0]!.date;
    let latest = events[0]!.date;

    for (const event of events) {
      if (event.date < earliest) earliest = event.date;
      if (event.date > latest) latest = event.date;
    }

    return { earliest, latest };
  }

  /**
   * Create empty timeline
   */
  private createEmptyTimeline(
    technologyId: string,
    technologyName: string
  ): AggregatedTimeline {
    const now = new Date();
    return {
      technologyId,
      technologyName,
      events: [],
      eventCounts: {
        publication: 0,
        derivative: 0,
        benchmark: 0,
        adoption: 0,
        milestone: 0,
        decline: 0,
        revival: 0,
      },
      dateRange: { earliest: now, latest: now },
      totalImpact: 0,
    };
  }
}
