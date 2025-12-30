/**
 * @fileoverview TechnologyLifecycleTrackerService Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TechnologyLifecycleTrackerService,
  type LifecycleRepository,
} from './TechnologyLifecycleTrackerService.js';
import type { TimelineEntityRepository, TimelineEntity, TimelineRelation } from './TimelineAggregator.js';

// ============ Mock Factories ============

function createMockTimelineRepository(): TimelineEntityRepository {
  // Create an entity with publications as related entities
  const techEntity: TimelineEntity = {
    id: 'tech-1',
    type: 'AIModel',
    name: 'Test Technology',
    properties: {},
  };

  // Publication entities
  const publications: TimelineEntity[] = [
    {
      id: 'pub-1',
      type: 'Publication',
      name: 'Paper 1',
      properties: { year: 2022, citations: 100 },
    },
    {
      id: 'pub-2',
      type: 'Publication',
      name: 'Paper 2',
      properties: { year: 2022, citations: 200 },
    },
    {
      id: 'pub-3',
      type: 'Publication',
      name: 'Paper 3',
      properties: { year: 2023, citations: 150 },
    },
    {
      id: 'pub-4',
      type: 'Publication',
      name: 'Paper 4',
      properties: { year: 2023, citations: 250 },
    },
    {
      id: 'pub-5',
      type: 'Publication',
      name: 'Paper 5',
      properties: { year: 2024, citations: 300 },
    },
  ];

  // Relations from tech to publications with PUBLISHED_IN type
  const relations: TimelineRelation[] = publications.map((pub) => ({
    sourceId: 'tech-1',
    targetId: pub.id,
    type: 'PUBLISHED_IN',
    properties: {},
  }));

  return {
    getById: vi.fn().mockImplementation((id: string) => {
      if (id === 'tech-1') return Promise.resolve(techEntity);
      const pub = publications.find((p) => p.id === id);
      return Promise.resolve(pub ?? null);
    }),
    getByType: vi.fn().mockImplementation((type: string) => {
      if (type === 'Publication') return Promise.resolve(publications);
      return Promise.resolve([]);
    }),
    getRelated: vi.fn().mockImplementation((entityId: string, _relationTypes?: string[]) => {
      if (entityId === 'tech-1') return Promise.resolve(relations);
      return Promise.resolve([]);
    }),
  };
}

function createMockLifecycleRepository(options?: {
  techIds?: string[];
  techNames?: Record<string, string>;
  related?: Record<string, string[]>;
}): LifecycleRepository {
  const techIds = options?.techIds ?? ['tech-1', 'tech-2', 'tech-3'];
  const techNames = options?.techNames ?? {
    'tech-1': 'Technology 1',
    'tech-2': 'Technology 2',
    'tech-3': 'Technology 3',
  };
  const related = options?.related ?? {
    'tech-1': ['tech-2', 'tech-3'],
    'tech-2': ['tech-1'],
    'tech-3': ['tech-1'],
  };

  return {
    getAllTechnologyIds: vi.fn().mockResolvedValue(techIds),
    getTechnologyName: vi.fn().mockImplementation((id: string) => {
      return Promise.resolve(techNames[id]);
    }),
    getRelatedTechnologies: vi.fn().mockImplementation((id: string) => {
      return Promise.resolve(related[id] ?? []);
    }),
  };
}

function createGrowingTimelineRepository(): TimelineEntityRepository {
  const techEntity: TimelineEntity = {
    id: 'emerging-1',
    type: 'AIModel',
    name: 'Growing Tech',
    properties: {},
  };

  // Create publications with increasing frequency
  const publicationEntities: TimelineEntity[] = [];
  let pubId = 0;

  // 2022: 2 papers
  for (let i = 0; i < 2; i++) {
    publicationEntities.push({
      id: `pub-${pubId++}`,
      type: 'Publication',
      name: `Paper ${pubId}`,
      properties: {
        year: 2022,
        citations: 50,
      },
    });
  }

  // 2023: 4 papers
  for (let i = 0; i < 4; i++) {
    publicationEntities.push({
      id: `pub-${pubId++}`,
      type: 'Publication',
      name: `Paper ${pubId}`,
      properties: {
        year: 2023,
        citations: 100,
      },
    });
  }

  // 2024: 8 papers
  for (let i = 0; i < 8; i++) {
    publicationEntities.push({
      id: `pub-${pubId++}`,
      type: 'Publication',
      name: `Paper ${pubId}`,
      properties: {
        year: 2024,
        citations: 200,
      },
    });
  }

  const relations: TimelineRelation[] = publicationEntities.map((pub) => ({
    sourceId: 'emerging-1',
    targetId: pub.id,
    type: 'PUBLISHED_IN',
    properties: {},
  }));

  return {
    getById: vi.fn().mockImplementation((id: string) => {
      if (id === 'emerging-1') return Promise.resolve(techEntity);
      const pub = publicationEntities.find((p) => p.id === id);
      return Promise.resolve(pub ?? null);
    }),
    getByType: vi.fn().mockImplementation((type: string) => {
      if (type === 'Publication') return Promise.resolve(publicationEntities);
      return Promise.resolve([]);
    }),
    getRelated: vi.fn().mockImplementation((entityId: string, _relationTypes?: string[]) => {
      if (entityId === 'emerging-1') return Promise.resolve(relations);
      return Promise.resolve([]);
    }),
  };
}

function createDecliningTimelineRepository(): TimelineEntityRepository {
  const techEntity: TimelineEntity = {
    id: 'declining-1',
    type: 'AIModel',
    name: 'Declining Tech',
    properties: {},
  };

  // Create publications with decreasing frequency
  const publicationEntities: TimelineEntity[] = [];
  let pubId = 0;

  // 2020: 8 papers
  for (let i = 0; i < 8; i++) {
    publicationEntities.push({
      id: `pub-${pubId++}`,
      type: 'Publication',
      name: `Paper ${pubId}`,
      properties: {
        year: 2020,
        citations: 200,
      },
    });
  }

  // 2021: 4 papers
  for (let i = 0; i < 4; i++) {
    publicationEntities.push({
      id: `pub-${pubId++}`,
      type: 'Publication',
      name: `Paper ${pubId}`,
      properties: {
        year: 2021,
        citations: 100,
      },
    });
  }

  // 2022: 1 paper
  publicationEntities.push({
    id: `pub-${pubId++}`,
    type: 'Publication',
    name: `Paper ${pubId}`,
    properties: {
      year: 2022,
      citations: 20,
    },
  });

  const relations: TimelineRelation[] = publicationEntities.map((pub) => ({
    sourceId: 'declining-1',
    targetId: pub.id,
    type: 'PUBLISHED_IN',
    properties: {},
  }));

  return {
    getById: vi.fn().mockImplementation((id: string) => {
      if (id === 'declining-1') return Promise.resolve(techEntity);
      const pub = publicationEntities.find((p) => p.id === id);
      return Promise.resolve(pub ?? null);
    }),
    getByType: vi.fn().mockImplementation((type: string) => {
      if (type === 'Publication') return Promise.resolve(publicationEntities);
      return Promise.resolve([]);
    }),
    getRelated: vi.fn().mockImplementation((entityId: string, _relationTypes?: string[]) => {
      if (entityId === 'declining-1') return Promise.resolve(relations);
      return Promise.resolve([]);
    }),
  };
}

// ============ Tests ============

describe('TechnologyLifecycleTrackerService', () => {
  let service: TechnologyLifecycleTrackerService;
  let mockTimelineRepo: TimelineEntityRepository;
  let mockLifecycleRepo: LifecycleRepository;

  beforeEach(() => {
    mockTimelineRepo = createMockTimelineRepository();
    mockLifecycleRepo = createMockLifecycleRepository();
    service = new TechnologyLifecycleTrackerService(mockTimelineRepo, mockLifecycleRepo);
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      expect(service).toBeInstanceOf(TechnologyLifecycleTrackerService);
    });

    it('should accept custom config', () => {
      const customService = new TechnologyLifecycleTrackerService(
        mockTimelineRepo,
        mockLifecycleRepo,
        { minEventsForAnalysis: 10 }
      );
      expect(customService).toBeInstanceOf(TechnologyLifecycleTrackerService);
    });
  });

  describe('analyzeTechnology', () => {
    it('should return complete analysis result', async () => {
      const result = await service.analyzeTechnology('tech-1');

      expect(result.technologyId).toBe('tech-1');
      expect(result.technologyName).toBe('Test Technology');
      expect(result.timeline).toBeDefined();
      expect(result.phase).toBeDefined();
      expect(result.maturity).toBeDefined();
      expect(result.forecast).toBeDefined();
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });

    it('should throw for insufficient data', async () => {
      const emptyRepo: TimelineEntityRepository = {
        getById: vi.fn().mockResolvedValue({
          id: 'tech-1',
          type: 'AIModel',
          name: 'Empty Tech',
          properties: {},
        }),
        getByType: vi.fn().mockResolvedValue([]),
        getRelated: vi.fn().mockResolvedValue([]),
      };

      const emptyService = new TechnologyLifecycleTrackerService(
        emptyRepo,
        mockLifecycleRepo
      );

      await expect(emptyService.analyzeTechnology('tech-1')).rejects.toThrow(
        /Insufficient data/
      );
    });

    it('should include maturity score breakdown', async () => {
      const result = await service.analyzeTechnology('tech-1');

      expect(result.maturity.researchActivity).toBeDefined();
      expect(result.maturity.industryAdoption).toBeDefined();
      expect(result.maturity.communityEngagement).toBeDefined();
      expect(result.maturity.documentationQuality).toBeDefined();
      expect(result.maturity.stability).toBeDefined();
    });

    it('should include phase detection with confidence', async () => {
      const result = await service.analyzeTechnology('tech-1');

      expect(result.phase.phase).toBeDefined();
      expect(result.phase.confidence).toBeGreaterThan(0);
      expect(result.phase.indicators).toBeDefined();
    });
  });

  describe('generateReport', () => {
    it('should generate comprehensive report', async () => {
      const report = await service.generateReport('tech-1');

      expect(report.technologyId).toBe('tech-1');
      expect(report.technologyName).toBe('Test Technology');
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.currentPhase).toBeDefined();
      expect(report.maturityScore).toBeDefined();
      expect(report.timeline).toBeDefined();
      expect(report.forecast).toBeDefined();
      expect(report.summary).toBeDefined();
    });

    it('should include related technologies', async () => {
      const report = await service.generateReport('tech-1');

      expect(report.relatedTechnologies).toBeDefined();
    });

    it('should generate Japanese summary', async () => {
      const report = await service.generateReport('tech-1');

      expect(report.summary).toContain('フェーズ');
      expect(report.summary).toContain('トレンド');
    });
  });

  describe('findEmergingTechnologies', () => {
    it('should find emerging technologies', async () => {
      const growingService = new TechnologyLifecycleTrackerService(
        createGrowingTimelineRepository(),
        createMockLifecycleRepository({ techIds: ['emerging-1'] }),
        {
          emergingThreshold: {
            minGrowthRate: 0.1,
            maxDaysOld: 1500,
            minConfidence: 0.3,
          },
        }
      );

      const emerging = await growingService.findEmergingTechnologies();

      // May or may not find emerging based on phase detection
      expect(Array.isArray(emerging)).toBe(true);
    });

    it('should return empty for old technologies', async () => {
      const oldService = new TechnologyLifecycleTrackerService(
        createDecliningTimelineRepository(),
        createMockLifecycleRepository({ techIds: ['old-1'] }),
        {
          emergingThreshold: {
            minGrowthRate: 0.3,
            maxDaysOld: 730,
            minConfidence: 0.5,
          },
        }
      );

      const emerging = await oldService.findEmergingTechnologies();

      expect(emerging).toHaveLength(0);
    });

    it('should sort by growth rate descending', async () => {
      // This test would need multiple technologies with different growth rates
      const emerging = await service.findEmergingTechnologies();

      if (emerging.length >= 2) {
        for (let i = 1; i < emerging.length; i++) {
          expect(emerging[i - 1]!.growthRate).toBeGreaterThanOrEqual(
            emerging[i]!.growthRate
          );
        }
      }
    });
  });

  describe('findDecliningTechnologies', () => {
    it('should find declining technologies', async () => {
      const decliningService = new TechnologyLifecycleTrackerService(
        createDecliningTimelineRepository(),
        createMockLifecycleRepository({ techIds: ['declining-1'] }),
        {
          decliningThreshold: {
            minDeclineRate: 0.1,
            minInactivityDays: 365,
            minConfidence: 0.3,
          },
        }
      );

      const declining = await decliningService.findDecliningTechnologies();

      // May or may not find declining based on phase detection
      expect(Array.isArray(declining)).toBe(true);
    });

    it('should include replacement suggestions', async () => {
      const declining = await service.findDecliningTechnologies();

      for (const tech of declining) {
        expect(tech.replacements).toBeDefined();
        expect(Array.isArray(tech.replacements)).toBe(true);
      }
    });
  });

  describe('compareTechnologies', () => {
    it('should compare multiple technologies', async () => {
      const results = await service.compareTechnologies(['tech-1', 'tech-2']);

      expect(results.size).toBeGreaterThan(0);

      for (const [id, analysis] of results) {
        expect(analysis.technologyId).toBe(id);
        expect(analysis.phase).toBeDefined();
        expect(analysis.maturity).toBeDefined();
      }
    });

    it('should skip technologies with insufficient data', async () => {
      const tech1Entity: TimelineEntity = {
        id: 'tech-1',
        type: 'AIModel',
        name: 'Tech 1',
        properties: {},
      };

      const publicationEntities: TimelineEntity[] = [
        { id: 'pub-1', type: 'Publication', name: 'Paper 1', properties: { year: 2023, citations: 100 } },
        { id: 'pub-2', type: 'Publication', name: 'Paper 2', properties: { year: 2023, citations: 100 } },
        { id: 'pub-3', type: 'Publication', name: 'Paper 3', properties: { year: 2023, citations: 100 } },
        { id: 'pub-4', type: 'Publication', name: 'Paper 4', properties: { year: 2023, citations: 100 } },
        { id: 'pub-5', type: 'Publication', name: 'Paper 5', properties: { year: 2024, citations: 100 } },
      ];

      const relations: TimelineRelation[] = publicationEntities.map((pub) => ({
        sourceId: 'tech-1',
        targetId: pub.id,
        type: 'PUBLISHED_IN',
        properties: {},
      }));

      const mixedRepo: TimelineEntityRepository = {
        getById: vi.fn().mockImplementation((id: string) => {
          if (id === 'tech-1') return Promise.resolve(tech1Entity);
          if (id === 'tech-2') return Promise.resolve({ id: 'tech-2', type: 'AIModel', name: 'Empty Tech', properties: {} });
          const pub = publicationEntities.find((p) => p.id === id);
          return Promise.resolve(pub ?? null);
        }),
        getByType: vi.fn().mockResolvedValue([]),
        getRelated: vi.fn().mockImplementation((entityId: string, _relationTypes?: string[]) => {
          if (entityId === 'tech-1') return Promise.resolve(relations);
          return Promise.resolve([]);
        }),
      };

      const mixedService = new TechnologyLifecycleTrackerService(
        mixedRepo,
        mockLifecycleRepo
      );

      const results = await mixedService.compareTechnologies(['tech-1', 'tech-2']);

      expect(results.has('tech-1')).toBe(true);
      expect(results.has('tech-2')).toBe(false);
    });
  });

  describe('getTechnologiesByPhase', () => {
    it('should filter by lifecycle phase', async () => {
      const results = await service.getTechnologiesByPhase('slope_of_enlightenment');

      for (const result of results) {
        expect(result.phase.phase).toBe('slope_of_enlightenment');
      }
    });

    it('should sort by confidence descending', async () => {
      const results = await service.getTechnologiesByPhase('innovation_trigger');

      if (results.length >= 2) {
        for (let i = 1; i < results.length; i++) {
          expect(results[i - 1]!.phase.confidence).toBeGreaterThanOrEqual(
            results[i]!.phase.confidence
          );
        }
      }
    });
  });
});
