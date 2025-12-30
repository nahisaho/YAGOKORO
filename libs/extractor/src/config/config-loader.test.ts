/**
 * @fileoverview Tests for configuration loader
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ConfigLoader,
  RelationTypesConfig,
  validateConfig,
  loadConfigFromJSON,
  createMinimalConfig,
  ConfigValidationError,
} from './config-loader';
import { RelationType, EntityType } from '@yagokoro/domain';

describe('ConfigLoader', () => {
  beforeEach(() => {
    ConfigLoader.resetInstance();
  });

  afterEach(() => {
    ConfigLoader.resetInstance();
  });

  describe('validateConfig', () => {
    it('should validate a correct configuration', () => {
      const config: RelationTypesConfig = {
        version: '1.0.0',
        entityTypes: ['AIModel', 'Organization'] as EntityType[],
        relationTypes: {
          DEVELOPED_BY: {
            description: 'Developed by organization',
            sourceTypes: ['AIModel'] as EntityType[],
            targetTypes: ['Organization'] as EntityType[],
            bidirectional: false,
            extractable: true,
            patterns: ['{source} was developed by {target}'],
            defaultConfidence: 0.7,
          },
        } as Record<RelationType, any>,
        scoring: {
          weights: {
            cooccurrence: 0.3,
            llm: 0.3,
            source: 0.2,
            graph: 0.2,
          },
          thresholds: {
            autoApprove: 0.7,
            review: 0.5,
          },
        },
        conflictingPairs: [],
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should reject invalid version format', () => {
      const config = createMinimalConfig({});
      config.version = 'invalid';

      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
      expect(() => validateConfig(config)).toThrow(/Invalid version format/);
    });

    it('should reject weights that do not sum to 1.0', () => {
      const config = createMinimalConfig({});
      config.scoring.weights = {
        cooccurrence: 0.3,
        llm: 0.3,
        source: 0.3,
        graph: 0.3,
      };

      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
      expect(() => validateConfig(config)).toThrow(/must sum to 1.0/);
    });

    it('should reject autoApprove threshold lower than review', () => {
      const config = createMinimalConfig({});
      config.scoring.thresholds = {
        autoApprove: 0.4,
        review: 0.5,
      };

      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
      expect(() => validateConfig(config)).toThrow(/must be greater than/);
    });

    it('should reject threshold out of range', () => {
      const config = createMinimalConfig({});
      config.scoring.thresholds = {
        autoApprove: 1.5,
        review: 0.5,
      };

      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
      expect(() => validateConfig(config)).toThrow(/must be between 0 and 1/);
    });

    it('should reject relation type without description', () => {
      const config: RelationTypesConfig = {
        version: '1.0.0',
        entityTypes: ['AIModel', 'Organization'] as EntityType[],
        relationTypes: {
          DEVELOPED_BY: {
            description: '',
            sourceTypes: ['AIModel'] as EntityType[],
            targetTypes: ['Organization'] as EntityType[],
            bidirectional: false,
            extractable: true,
          },
        } as Record<RelationType, any>,
        scoring: {
          weights: { cooccurrence: 0.3, llm: 0.3, source: 0.2, graph: 0.2 },
          thresholds: { autoApprove: 0.7, review: 0.5 },
        },
        conflictingPairs: [],
      };

      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
      expect(() => validateConfig(config)).toThrow(/Missing description/);
    });

    it('should reject relation type with empty sourceTypes', () => {
      const config = createMinimalConfig({
        DEVELOPED_BY: {
          description: 'Test',
          sourceTypes: [] as EntityType[],
          targetTypes: ['Organization'] as EntityType[],
          extractable: true,
        },
      });

      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
      expect(() => validateConfig(config)).toThrow(/Missing or empty sourceTypes/);
    });

    it('should reject defaultConfidence out of range', () => {
      const config = createMinimalConfig({
        DEVELOPED_BY: {
          description: 'Test',
          sourceTypes: ['AIModel'] as EntityType[],
          targetTypes: ['Organization'] as EntityType[],
          extractable: true,
          defaultConfidence: 1.5,
        },
      });

      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
      expect(() => validateConfig(config)).toThrow(/defaultConfidence must be between/);
    });

    it('should reject unknown relation type in conflicting pairs', () => {
      const config = createMinimalConfig({
        DEVELOPED_BY: {
          description: 'Test',
          sourceTypes: ['AIModel'] as EntityType[],
          targetTypes: ['Organization'] as EntityType[],
          extractable: true,
        },
      });
      config.conflictingPairs = [
        ['DEVELOPED_BY', 'UNKNOWN_TYPE'],
      ] as [RelationType, RelationType][];

      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
      expect(() => validateConfig(config)).toThrow(/Unknown relation type/);
    });
  });

  describe('loadConfigFromJSON', () => {
    it('should parse and validate JSON content', () => {
      const json = JSON.stringify({
        version: '1.0.0',
        entityTypes: ['AIModel', 'Organization'],
        relationTypes: {
          DEVELOPED_BY: {
            description: 'Developed by',
            sourceTypes: ['AIModel'],
            targetTypes: ['Organization'],
            bidirectional: false,
            extractable: true,
          },
        },
        scoring: {
          weights: { cooccurrence: 0.3, llm: 0.3, source: 0.2, graph: 0.2 },
          thresholds: { autoApprove: 0.7, review: 0.5 },
        },
        conflictingPairs: [],
      });

      const config = loadConfigFromJSON(json);
      expect(config.version).toBe('1.0.0');
      expect(config.relationTypes['DEVELOPED_BY']).toBeDefined();
    });

    it('should throw on invalid JSON', () => {
      expect(() => loadConfigFromJSON('invalid json')).toThrow();
    });
  });

  describe('createMinimalConfig', () => {
    it('should create config with default values', () => {
      const config = createMinimalConfig({
        DEVELOPED_BY: {
          description: 'Test relation',
        },
      });

      expect(config.version).toBe('1.0.0');
      expect(config.relationTypes['DEVELOPED_BY']).toBeDefined();
      expect(config.relationTypes['DEVELOPED_BY'].extractable).toBe(true);
      expect(config.scoring.weights.cooccurrence).toBe(0.3);
    });

    it('should allow overriding specific fields', () => {
      const config = createMinimalConfig({
        DEVELOPED_BY: {
          description: 'Custom',
          extractable: false,
          defaultConfidence: 0.8,
        },
      });

      expect(config.relationTypes['DEVELOPED_BY'].extractable).toBe(false);
      expect(config.relationTypes['DEVELOPED_BY'].defaultConfidence).toBe(0.8);
    });
  });

  describe('ConfigLoader instance methods', () => {
    let loader: ConfigLoader;

    beforeEach(() => {
      // Create a mock config in memory
      const mockConfig: RelationTypesConfig = {
        version: '1.0.0',
        entityTypes: ['AIModel', 'Organization', 'Person'] as EntityType[],
        relationTypes: {
          DEVELOPED_BY: {
            description: 'Developed by organization or person',
            sourceTypes: ['AIModel'] as EntityType[],
            targetTypes: ['Organization', 'Person'] as EntityType[],
            bidirectional: false,
            extractable: true,
            patterns: ['{source} was developed by {target}'],
            defaultConfidence: 0.7,
          },
          USES: {
            description: 'Uses technology',
            sourceTypes: ['AIModel'] as EntityType[],
            targetTypes: ['Technique'] as EntityType[],
            bidirectional: false,
            extractable: true,
            patterns: ['{source} uses {target}'],
            defaultConfidence: 0.6,
          },
          COMPETES_WITH: {
            description: 'Competes with another entity',
            sourceTypes: ['AIModel', 'Organization'] as EntityType[],
            targetTypes: ['AIModel', 'Organization'] as EntityType[],
            bidirectional: true,
            extractable: true,
            defaultConfidence: 0.5,
          },
        } as Record<RelationType, any>,
        scoring: {
          weights: {
            cooccurrence: 0.3,
            llm: 0.3,
            source: 0.2,
            graph: 0.2,
          },
          thresholds: {
            autoApprove: 0.7,
            review: 0.5,
          },
        },
        conflictingPairs: [
          ['DEVELOPED_BY', 'COMPETES_WITH'],
        ] as [RelationType, RelationType][],
      };

      // Mock the loader with pre-loaded config
      loader = new ConfigLoader();
      (loader as any).config = mockConfig;
    });

    describe('getRelationType', () => {
      it('should return config for existing type', () => {
        const typeConfig = loader.getRelationType('DEVELOPED_BY' as RelationType);
        expect(typeConfig).toBeDefined();
        expect(typeConfig?.description).toBe('Developed by organization or person');
      });

      it('should return undefined for non-existent type', () => {
        const typeConfig = loader.getRelationType('NON_EXISTENT' as RelationType);
        expect(typeConfig).toBeUndefined();
      });
    });

    describe('getExtractableTypes', () => {
      it('should return all extractable types', () => {
        const types = loader.getExtractableTypes();
        expect(types).toContain('DEVELOPED_BY');
        expect(types).toContain('USES');
        expect(types).toContain('COMPETES_WITH');
      });
    });

    describe('getPatterns', () => {
      it('should return patterns for a type', () => {
        const patterns = loader.getPatterns('DEVELOPED_BY' as RelationType);
        expect(patterns).toContain('{source} was developed by {target}');
      });

      it('should return empty array if no patterns', () => {
        const patterns = loader.getPatterns('NON_EXISTENT' as RelationType);
        expect(patterns).toEqual([]);
      });
    });

    describe('getScoringWeights', () => {
      it('should return scoring weights', () => {
        const weights = loader.getScoringWeights();
        expect(weights.cooccurrence).toBe(0.3);
        expect(weights.llm).toBe(0.3);
        expect(weights.source).toBe(0.2);
        expect(weights.graph).toBe(0.2);
      });
    });

    describe('getScoringThresholds', () => {
      it('should return scoring thresholds', () => {
        const thresholds = loader.getScoringThresholds();
        expect(thresholds.autoApprove).toBe(0.7);
        expect(thresholds.review).toBe(0.5);
      });
    });

    describe('getConflictingPairs', () => {
      it('should return conflicting pairs', () => {
        const pairs = loader.getConflictingPairs();
        expect(pairs).toHaveLength(1);
        expect(pairs[0]).toContain('DEVELOPED_BY');
        expect(pairs[0]).toContain('COMPETES_WITH');
      });
    });

    describe('areConflicting', () => {
      it('should return true for conflicting types', () => {
        expect(
          loader.areConflicting(
            'DEVELOPED_BY' as RelationType,
            'COMPETES_WITH' as RelationType
          )
        ).toBe(true);
      });

      it('should return true regardless of order', () => {
        expect(
          loader.areConflicting(
            'COMPETES_WITH' as RelationType,
            'DEVELOPED_BY' as RelationType
          )
        ).toBe(true);
      });

      it('should return false for non-conflicting types', () => {
        expect(
          loader.areConflicting(
            'DEVELOPED_BY' as RelationType,
            'USES' as RelationType
          )
        ).toBe(false);
      });
    });

    describe('validateEntityTypes', () => {
      it('should validate correct entity types', () => {
        const result = loader.validateEntityTypes(
          'DEVELOPED_BY' as RelationType,
          'AIModel' as EntityType,
          'Organization' as EntityType
        );
        expect(result.valid).toBe(true);
      });

      it('should reject invalid source type', () => {
        const result = loader.validateEntityTypes(
          'DEVELOPED_BY' as RelationType,
          'Organization' as EntityType,
          'Person' as EntityType
        );
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Invalid source type');
      });

      it('should reject invalid target type', () => {
        const result = loader.validateEntityTypes(
          'DEVELOPED_BY' as RelationType,
          'AIModel' as EntityType,
          'AIModel' as EntityType
        );
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Invalid target type');
      });

      it('should reject unknown relation type', () => {
        const result = loader.validateEntityTypes(
          'UNKNOWN' as RelationType,
          'AIModel' as EntityType,
          'Organization' as EntityType
        );
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Unknown relation type');
      });
    });

    describe('getDefaultConfidence', () => {
      it('should return default confidence for type', () => {
        const confidence = loader.getDefaultConfidence('DEVELOPED_BY' as RelationType);
        expect(confidence).toBe(0.7);
      });

      it('should return 0.5 for type without default', () => {
        // Mock a type without defaultConfidence
        (loader as any).config.relationTypes['NO_DEFAULT'] = {
          description: 'Test',
          sourceTypes: ['AIModel'],
          targetTypes: ['Organization'],
          bidirectional: false,
          extractable: true,
        };

        const confidence = loader.getDefaultConfidence('NO_DEFAULT' as RelationType);
        expect(confidence).toBe(0.5);
      });

      it('should return 0.5 for unknown type', () => {
        const confidence = loader.getDefaultConfidence('UNKNOWN' as RelationType);
        expect(confidence).toBe(0.5);
      });
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = ConfigLoader.getInstance();
      const instance2 = ConfigLoader.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should reset instance', () => {
      const instance1 = ConfigLoader.getInstance();
      ConfigLoader.resetInstance();
      const instance2 = ConfigLoader.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });
});
