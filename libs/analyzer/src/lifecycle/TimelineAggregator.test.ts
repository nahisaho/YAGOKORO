/**
 * @fileoverview TimelineAggregator Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TimelineAggregator,
  type TimelineEntityRepository,
  type TimelineEntity,
  type TimelineRelation,
} from './TimelineAggregator.js';
import type { TimelineEvent } from './types.js';

/**
 * Create mock entity repository
 */
function createMockRepository(): TimelineEntityRepository {
  return {
    getById: vi.fn(),
    getByType: vi.fn(),
    getRelated: vi.fn(),
  };
}

/**
 * Create sample technology entity
 */
function createTechEntity(id: string, name: string, year?: number): TimelineEntity {
  return {
    id,
    type: 'Technique',
    name,
    properties: {
      ...(year && { year }),
    },
  };
}

/**
 * Create sample publication entity
 */
function createPublicationEntity(
  id: string,
  name: string,
  year: number,
  citations: number
): TimelineEntity {
  return {
    id,
    type: 'Publication',
    name,
    properties: { year, citations },
  };
}

describe('TimelineAggregator', () => {
  let repository: TimelineEntityRepository;
  let aggregator: TimelineAggregator;

  beforeEach(() => {
    repository = createMockRepository();
    aggregator = new TimelineAggregator(repository);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(aggregator).toBeInstanceOf(TimelineAggregator);
    });
  });

  describe('aggregateTimeline', () => {
    it('should return empty timeline for non-existent technology', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      const result = await aggregator.aggregateTimeline('unknown-tech');

      expect(result.technologyId).toBe('unknown-tech');
      expect(result.technologyName).toBe('Unknown');
      expect(result.events).toHaveLength(0);
      expect(result.totalImpact).toBe(0);
    });

    it('should aggregate events from all sources', async () => {
      const tech = createTechEntity('tech-1', 'Transformer', 2017);
      vi.mocked(repository.getById).mockResolvedValue(tech);
      vi.mocked(repository.getRelated).mockResolvedValue([]);

      const result = await aggregator.aggregateTimeline('tech-1');

      expect(result.technologyId).toBe('tech-1');
      expect(result.technologyName).toBe('Transformer');
      // Should have at least the creation milestone
      expect(result.events.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter events by date range', async () => {
      const tech = createTechEntity('tech-1', 'GPT', 2018);
      vi.mocked(repository.getById).mockResolvedValue(tech);
      vi.mocked(repository.getRelated).mockResolvedValue([]);

      const result = await aggregator.aggregateTimeline('tech-1', {
        startDate: new Date(2020, 0, 1),
        endDate: new Date(2023, 11, 31),
      });

      // Milestone from 2018 should be filtered out
      expect(result.events.every((e) => e.date >= new Date(2020, 0, 1))).toBe(true);
    });

    it('should filter events by type', async () => {
      const tech = createTechEntity('tech-1', 'BERT', 2018);
      vi.mocked(repository.getById).mockResolvedValue(tech);
      vi.mocked(repository.getRelated).mockResolvedValue([]);

      const result = await aggregator.aggregateTimeline('tech-1', {
        eventTypes: ['publication'],
      });

      expect(result.events.every((e) => e.type === 'publication')).toBe(true);
    });

    it('should filter events by minimum impact', async () => {
      const tech = createTechEntity('tech-1', 'ResNet', 2015);
      vi.mocked(repository.getById).mockResolvedValue(tech);
      vi.mocked(repository.getRelated).mockResolvedValue([]);

      const result = await aggregator.aggregateTimeline('tech-1', {
        minImpact: 0.5,
      });

      expect(result.events.every((e) => e.impact >= 0.5)).toBe(true);
    });

    it('should limit maximum events', async () => {
      const tech = createTechEntity('tech-1', 'CNN', 2012);
      vi.mocked(repository.getById).mockResolvedValue(tech);
      vi.mocked(repository.getRelated).mockResolvedValue([]);

      const result = await aggregator.aggregateTimeline('tech-1', {
        maxEvents: 5,
      });

      expect(result.events.length).toBeLessThanOrEqual(5);
    });

    it('should sort events by date', async () => {
      const tech = createTechEntity('tech-1', 'LSTM', 1997);
      vi.mocked(repository.getById).mockResolvedValue(tech);
      vi.mocked(repository.getRelated).mockResolvedValue([]);

      const result = await aggregator.aggregateTimeline('tech-1');

      for (let i = 1; i < result.events.length; i++) {
        expect(result.events[i]!.date.getTime()).toBeGreaterThanOrEqual(
          result.events[i - 1]!.date.getTime()
        );
      }
    });
  });

  describe('getPublicationEvents', () => {
    it('should get publication events', async () => {
      const publication = createPublicationEntity(
        'pub-1',
        'Attention Is All You Need',
        2017,
        50000
      );

      vi.mocked(repository.getRelated).mockResolvedValue([
        {
          sourceId: 'tech-1',
          targetId: 'pub-1',
          type: 'PUBLISHED_IN',
          properties: {},
        },
      ]);
      vi.mocked(repository.getById).mockResolvedValue(publication);

      const events = await aggregator.getPublicationEvents('tech-1');

      expect(events).toHaveLength(1);
      expect(events[0]!.type).toBe('publication');
      expect(events[0]!.title).toBe('Attention Is All You Need');
      expect(events[0]!.date.getFullYear()).toBe(2017);
    });

    it('should calculate impact from citations', async () => {
      const highCitePub = createPublicationEntity('pub-high', 'Popular Paper', 2020, 10000);
      const lowCitePub = createPublicationEntity('pub-low', 'New Paper', 2023, 10);

      vi.mocked(repository.getRelated).mockResolvedValue([
        { sourceId: 'tech-1', targetId: 'pub-high', type: 'PUBLISHED_IN', properties: {} },
      ]);
      vi.mocked(repository.getById).mockResolvedValue(highCitePub);

      const highEvents = await aggregator.getPublicationEvents('tech-1');

      vi.mocked(repository.getRelated).mockResolvedValue([
        { sourceId: 'tech-1', targetId: 'pub-low', type: 'PUBLISHED_IN', properties: {} },
      ]);
      vi.mocked(repository.getById).mockResolvedValue(lowCitePub);

      const lowEvents = await aggregator.getPublicationEvents('tech-1');

      expect(highEvents[0]!.impact).toBeGreaterThan(lowEvents[0]!.impact);
    });

    it('should handle publications without citations', async () => {
      const pub = createPublicationEntity('pub-1', 'New Paper', 2024, 0);
      vi.mocked(repository.getRelated).mockResolvedValue([
        { sourceId: 'tech-1', targetId: 'pub-1', type: 'PUBLISHED_IN', properties: {} },
      ]);
      vi.mocked(repository.getById).mockResolvedValue(pub);

      const events = await aggregator.getPublicationEvents('tech-1');

      expect(events[0]!.impact).toBe(0.1); // Minimum impact
    });
  });

  describe('getDerivativeEvents', () => {
    it('should get derivative technology events', async () => {
      const derivative: TimelineEntity = {
        id: 'tech-deriv',
        type: 'Technique',
        name: 'GPT-2',
        properties: { year: 2019 },
      };

      vi.mocked(repository.getRelated).mockResolvedValue([
        {
          sourceId: 'tech-deriv',
          targetId: 'tech-1', // Base technology
          type: 'DERIVED_FROM',
          properties: {},
        },
      ]);
      vi.mocked(repository.getById).mockResolvedValue(derivative);

      const events = await aggregator.getDerivativeEvents('tech-1');

      expect(events).toHaveLength(1);
      expect(events[0]!.type).toBe('derivative');
      expect(events[0]!.title).toContain('GPT-2');
    });
  });

  describe('getBenchmarkEvents', () => {
    it('should get benchmark events', async () => {
      const benchmark: TimelineEntity = {
        id: 'bench-1',
        type: 'Benchmark',
        name: 'ImageNet',
        properties: {},
      };

      vi.mocked(repository.getRelated).mockResolvedValue([
        {
          sourceId: 'tech-1',
          targetId: 'bench-1',
          type: 'EVALUATED_ON',
          properties: { score: 94.5, isTopScore: true },
        },
      ]);
      vi.mocked(repository.getById).mockResolvedValue(benchmark);

      const events = await aggregator.getBenchmarkEvents('tech-1');

      expect(events).toHaveLength(1);
      expect(events[0]!.type).toBe('benchmark');
      expect(events[0]!.title).toContain('ImageNet');
      expect(events[0]!.impact).toBe(0.9); // Top score = high impact
    });

    it('should have lower impact for non-top scores', async () => {
      const benchmark: TimelineEntity = {
        id: 'bench-1',
        type: 'Benchmark',
        name: 'GLUE',
        properties: {},
      };

      vi.mocked(repository.getRelated).mockResolvedValue([
        {
          sourceId: 'tech-1',
          targetId: 'bench-1',
          type: 'EVALUATED_ON',
          properties: { score: 85.0, isTopScore: false },
        },
      ]);
      vi.mocked(repository.getById).mockResolvedValue(benchmark);

      const events = await aggregator.getBenchmarkEvents('tech-1');

      expect(events[0]!.impact).toBe(0.5);
    });
  });

  describe('getMilestoneEvents', () => {
    it('should get milestone events from entity properties', async () => {
      const tech: TimelineEntity = {
        id: 'tech-1',
        type: 'Technique',
        name: 'GPT',
        properties: {
          year: 2018,
          milestones: [
            { date: '2020-06-01', title: 'GPT-3 Released' },
            { date: '2022-11-30', title: 'ChatGPT Launch' },
          ],
        },
      };

      vi.mocked(repository.getById).mockResolvedValue(tech);

      const events = await aggregator.getMilestoneEvents('tech-1');

      expect(events.length).toBeGreaterThanOrEqual(3); // 2 milestones + creation
      expect(events.some((e) => e.title.includes('ChatGPT'))).toBe(true);
    });

    it('should add creation milestone from year', async () => {
      const tech: TimelineEntity = {
        id: 'tech-1',
        type: 'Technique',
        name: 'BERT',
        properties: { year: 2018 },
      };

      vi.mocked(repository.getById).mockResolvedValue(tech);

      const events = await aggregator.getMilestoneEvents('tech-1');

      expect(events.some((e) => e.title.includes('BERT introduced'))).toBe(true);
      expect(events.find((e) => e.title.includes('introduced'))!.impact).toBe(1.0);
    });
  });

  describe('getAdoptionEvents', () => {
    it('should get adoption events', async () => {
      const organization: TimelineEntity = {
        id: 'org-1',
        type: 'Organization',
        name: 'Google',
        properties: { isMajor: true },
      };

      vi.mocked(repository.getRelated).mockResolvedValue([
        {
          sourceId: 'tech-1',
          targetId: 'org-1',
          type: 'ADOPTED_BY',
          properties: { date: '2020-01-15' },
        },
      ]);
      vi.mocked(repository.getById).mockResolvedValue(organization);

      const events = await aggregator.getAdoptionEvents('tech-1');

      expect(events).toHaveLength(1);
      expect(events[0]!.type).toBe('adoption');
      expect(events[0]!.title).toContain('Google');
      expect(events[0]!.impact).toBe(0.8); // Major org = high impact
    });
  });

  describe('mergeTimelines', () => {
    it('should merge and sort events from multiple timelines', () => {
      const timeline1 = {
        technologyId: 'tech-1',
        technologyName: 'Tech 1',
        events: [
          { id: 'e1', type: 'publication' as const, date: new Date(2020, 5, 1), title: 'Event 1', description: '', impact: 0.5, relatedEntities: [], sources: [] },
          { id: 'e3', type: 'milestone' as const, date: new Date(2022, 0, 1), title: 'Event 3', description: '', impact: 0.7, relatedEntities: [], sources: [] },
        ],
        eventCounts: { publication: 1, derivative: 0, benchmark: 0, adoption: 0, milestone: 1, decline: 0, revival: 0 },
        dateRange: { earliest: new Date(2020, 5, 1), latest: new Date(2022, 0, 1) },
        totalImpact: 1.2,
      };

      const timeline2 = {
        technologyId: 'tech-2',
        technologyName: 'Tech 2',
        events: [
          { id: 'e2', type: 'benchmark' as const, date: new Date(2021, 3, 15), title: 'Event 2', description: '', impact: 0.6, relatedEntities: [], sources: [] },
        ],
        eventCounts: { publication: 0, derivative: 0, benchmark: 1, adoption: 0, milestone: 0, decline: 0, revival: 0 },
        dateRange: { earliest: new Date(2021, 3, 15), latest: new Date(2021, 3, 15) },
        totalImpact: 0.6,
      };

      const merged = aggregator.mergeTimelines([timeline1, timeline2]);

      expect(merged).toHaveLength(3);
      expect(merged[0]!.id).toBe('e1');
      expect(merged[1]!.id).toBe('e2');
      expect(merged[2]!.id).toBe('e3');
    });
  });

  describe('filterByType', () => {
    it('should filter events by type', () => {
      const events: TimelineEvent[] = [
        { id: 'e1', type: 'publication', date: new Date(), title: '', description: '', impact: 0.5, relatedEntities: [], sources: [] },
        { id: 'e2', type: 'benchmark', date: new Date(), title: '', description: '', impact: 0.6, relatedEntities: [], sources: [] },
        { id: 'e3', type: 'publication', date: new Date(), title: '', description: '', impact: 0.7, relatedEntities: [], sources: [] },
      ];

      const filtered = aggregator.filterByType(events, 'publication');

      expect(filtered).toHaveLength(2);
      expect(filtered.every((e) => e.type === 'publication')).toBe(true);
    });
  });

  describe('getHighImpactEvents', () => {
    it('should filter high impact events', () => {
      const events: TimelineEvent[] = [
        { id: 'e1', type: 'publication', date: new Date(), title: '', description: '', impact: 0.3, relatedEntities: [], sources: [] },
        { id: 'e2', type: 'milestone', date: new Date(), title: '', description: '', impact: 0.8, relatedEntities: [], sources: [] },
        { id: 'e3', type: 'benchmark', date: new Date(), title: '', description: '', impact: 0.9, relatedEntities: [], sources: [] },
      ];

      const highImpact = aggregator.getHighImpactEvents(events, 0.7);

      expect(highImpact).toHaveLength(2);
      expect(highImpact.every((e) => e.impact >= 0.7)).toBe(true);
    });

    it('should use default threshold of 0.7', () => {
      const events: TimelineEvent[] = [
        { id: 'e1', type: 'publication', date: new Date(), title: '', description: '', impact: 0.65, relatedEntities: [], sources: [] },
        { id: 'e2', type: 'milestone', date: new Date(), title: '', description: '', impact: 0.75, relatedEntities: [], sources: [] },
      ];

      const highImpact = aggregator.getHighImpactEvents(events);

      expect(highImpact).toHaveLength(1);
      expect(highImpact[0]!.impact).toBe(0.75);
    });
  });
});
