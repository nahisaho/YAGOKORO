import { describe, it, expect } from 'vitest';
import {
  determineAdoptionPhase,
  resolveTimeRange,
  type AdoptionPhase,
  type TemporalMetadata,
  type TrendMetrics,
  type TimelineEntry,
  type HotTopic,
  type TrendSnapshot,
  type TimeRangeFilter,
} from './temporal.js';

describe('Temporal Domain Types', () => {
  describe('AdoptionPhase', () => {
    it('should allow valid adoption phases', () => {
      const phases: AdoptionPhase[] = ['emerging', 'growing', 'mature', 'declining'];
      expect(phases).toHaveLength(4);
    });
  });

  describe('TemporalMetadata', () => {
    it('should create valid temporal metadata', () => {
      const metadata: TemporalMetadata = {
        publicationDate: new Date('2023-01-15'),
        firstCitedDate: new Date('2023-02-01'),
        lastCitedDate: new Date('2024-12-01'),
        peakDate: new Date('2024-06-15'),
        adoptionPhase: 'growing',
        updatedAt: new Date(),
      };

      expect(metadata.adoptionPhase).toBe('growing');
      expect(metadata.publicationDate).toBeInstanceOf(Date);
    });

    it('should allow optional date fields', () => {
      const metadata: TemporalMetadata = {
        adoptionPhase: 'emerging',
        updatedAt: new Date(),
      };

      expect(metadata.publicationDate).toBeUndefined();
      expect(metadata.adoptionPhase).toBe('emerging');
    });
  });

  describe('TrendMetrics', () => {
    it('should create valid trend metrics', () => {
      const metrics: TrendMetrics = {
        entityId: 'entity-123',
        entityName: 'Transformer',
        entityType: 'Technique',
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31'),
        },
        citationCount: 1500,
        citationVelocity: 4.1,
        momentum: 45.2,
        rank: 1,
        adoptionPhase: 'growing',
      };

      expect(metrics.momentum).toBe(45.2);
      expect(metrics.rank).toBe(1);
    });
  });

  describe('TimelineEntry', () => {
    it('should create valid timeline entry', () => {
      const entry: TimelineEntry = {
        date: new Date('2024-06-15'),
        entityId: 'entity-123',
        entityName: 'GPT-4',
        eventType: 'publication',
        description: 'GPT-4 Technical Report published',
        metrics: {
          citationCount: 100,
        },
      };

      expect(entry.eventType).toBe('publication');
      expect(entry.metrics?.citationCount).toBe(100);
    });
  });

  describe('HotTopic', () => {
    it('should create valid hot topic', () => {
      const topic: HotTopic = {
        entityId: 'entity-456',
        entityName: 'RAG',
        entityType: 'Technique',
        momentum: 38.5,
        velocity: 2.3,
        citationCount: 450,
        rank: 2,
        category: 'Large Language Models',
      };

      expect(topic.momentum).toBe(38.5);
      expect(topic.category).toBe('Large Language Models');
    });
  });

  describe('TrendSnapshot', () => {
    it('should create valid trend snapshot', () => {
      const snapshot: TrendSnapshot = {
        entityId: 'entity-123',
        date: new Date('2024-12-31'),
        citationCount: 1500,
        dailyCitations: 12,
        momentum: 15.3,
        velocity: 4.1,
        movingAverage7d: 10.5,
        movingAverage30d: 8.2,
      };

      expect(snapshot.dailyCitations).toBe(12);
      expect(snapshot.movingAverage7d).toBe(10.5);
    });
  });

  describe('determineAdoptionPhase()', () => {
    it('should return "emerging" for high momentum new entities', () => {
      const phase = determineAdoptionPhase(25, 0.5, 30, 12);
      expect(phase).toBe('emerging');
    });

    it('should return "growing" for positive momentum with good citations', () => {
      const phase = determineAdoptionPhase(15, 0.3, 100, 36);
      expect(phase).toBe('growing');
    });

    it('should return "mature" for stable high-citation entities', () => {
      const phase = determineAdoptionPhase(5, 0.1, 500, 60);
      expect(phase).toBe('mature');
    });

    it('should return "declining" for negative momentum', () => {
      const phase = determineAdoptionPhase(-15, -0.2, 300, 72);
      expect(phase).toBe('declining');
    });

    it('should return "emerging" for low citation new entities', () => {
      const phase = determineAdoptionPhase(5, 0.05, 20, 6);
      expect(phase).toBe('emerging');
    });
  });

  describe('resolveTimeRange()', () => {
    it('should resolve year-based filter', () => {
      const filter: TimeRangeFilter = { year: 2024 };
      const { from, to } = resolveTimeRange(filter);

      expect(from.getFullYear()).toBe(2024);
      expect(from.getMonth()).toBe(0); // January
      expect(to.getFullYear()).toBe(2024);
      expect(to.getMonth()).toBe(11); // December
    });

    it('should resolve year+quarter filter', () => {
      const filter: TimeRangeFilter = { year: 2024, quarter: 2 };
      const { from, to } = resolveTimeRange(filter);

      expect(from.getFullYear()).toBe(2024);
      expect(from.getMonth()).toBe(3); // April
      expect(to.getMonth()).toBe(5); // June (end of Q2)
    });

    it('should resolve explicit date range', () => {
      const filter: TimeRangeFilter = {
        from: new Date('2024-03-01'),
        to: new Date('2024-06-30'),
      };
      const { from, to } = resolveTimeRange(filter);

      expect(from).toEqual(new Date('2024-03-01'));
      expect(to).toEqual(new Date('2024-06-30'));
    });

    it('should handle empty filter with defaults', () => {
      const filter: TimeRangeFilter = {};
      const { from, to } = resolveTimeRange(filter);

      expect(from).toEqual(new Date(0));
      expect(to.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should resolve Q1 correctly', () => {
      const filter: TimeRangeFilter = { year: 2024, quarter: 1 };
      const { from, to } = resolveTimeRange(filter);

      expect(from.getMonth()).toBe(0); // January
      expect(to.getMonth()).toBe(2); // March
    });

    it('should resolve Q4 correctly', () => {
      const filter: TimeRangeFilter = { year: 2024, quarter: 4 };
      const { from, to } = resolveTimeRange(filter);

      expect(from.getMonth()).toBe(9); // October
      expect(to.getMonth()).toBe(11); // December
    });
  });
});
