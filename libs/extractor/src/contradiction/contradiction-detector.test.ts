/**
 * Tests for ContradictionDetector
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ContradictionDetector,
  CONFLICTING_TYPES,
  DEFAULT_CONTRADICTION_CONFIG,
  type Contradiction,
} from './contradiction-detector.js';
import type { ScoredRelation, RelationType } from '../types.js';

/**
 * Helper to create a scored relation for testing
 */
function createScoredRelation(
  sourceId: string,
  targetId: string,
  relationType: RelationType,
  confidence: number = 0.8
): ScoredRelation {
  return {
    sourceId,
    targetId,
    relationType,
    method: 'pattern',
    evidence: [
      {
        documentId: 'doc1',
        context: 'test context',
        method: 'pattern',
        rawConfidence: confidence,
      },
    ],
    rawConfidence: confidence,
    confidence,
    scoreComponents: {
      cooccurrenceScore: 0.8,
      llmConfidence: 0.7,
      sourceReliability: 0.9,
      graphConsistency: 0.8,
    },
    reviewStatus: 'pending',
    needsReview: true,
  };
}

describe('ContradictionDetector', () => {
  let detector: ContradictionDetector;

  beforeEach(() => {
    detector = new ContradictionDetector();
  });

  describe('constructor', () => {
    it('should use default config when none provided', () => {
      const config = detector.getConfig();
      expect(config).toEqual(DEFAULT_CONTRADICTION_CONFIG);
    });

    it('should merge custom config with defaults', () => {
      const customDetector = new ContradictionDetector({
        detectCyclic: false,
        minSeverity: 0.5,
      });
      const config = customDetector.getConfig();
      expect(config.detectCyclic).toBe(false);
      expect(config.detectConflictingTypes).toBe(true);
      expect(config.minSeverity).toBe(0.5);
    });

    it('should accept custom conflicting types', () => {
      const customDetector = new ContradictionDetector({
        customConflictingTypes: [['USES_TECHNIQUE', 'INFLUENCED_BY']],
      });
      expect(customDetector.typesConflict('USES_TECHNIQUE', 'INFLUENCED_BY')).toBe(true);
    });
  });

  describe('typesConflict', () => {
    it('should detect default conflicting types', () => {
      expect(detector.typesConflict('DEVELOPED_BY', 'COMPETES_WITH')).toBe(true);
      expect(detector.typesConflict('COLLABORATED_WITH', 'COMPETES_WITH')).toBe(true);
      expect(detector.typesConflict('BASED_ON', 'COMPETES_WITH')).toBe(true);
    });

    it('should detect conflict in both directions', () => {
      expect(detector.typesConflict('COMPETES_WITH', 'DEVELOPED_BY')).toBe(true);
      expect(detector.typesConflict('COMPETES_WITH', 'COLLABORATED_WITH')).toBe(true);
    });

    it('should return false for non-conflicting types', () => {
      expect(detector.typesConflict('DEVELOPED_BY', 'CITES')).toBe(false);
      expect(detector.typesConflict('USES_TECHNIQUE', 'TRAINED_ON')).toBe(false);
    });

    it('should return false for same types', () => {
      expect(detector.typesConflict('DEVELOPED_BY', 'DEVELOPED_BY')).toBe(false);
    });
  });

  describe('detectConflictingTypes', () => {
    it('should detect conflicting relation types between same entities', () => {
      const relations = [
        createScoredRelation('entityA', 'entityB', 'DEVELOPED_BY', 0.9),
        createScoredRelation('entityA', 'entityB', 'COMPETES_WITH', 0.8),
      ];

      const contradictions = detector.detectConflictingTypes(relations);
      
      expect(contradictions).toHaveLength(1);
      expect(contradictions[0].type).toBe('conflicting_type');
      expect(contradictions[0].relations).toHaveLength(2);
    });

    it('should detect conflicts regardless of direction', () => {
      const relations = [
        createScoredRelation('entityA', 'entityB', 'COLLABORATED_WITH', 0.9),
        createScoredRelation('entityB', 'entityA', 'COMPETES_WITH', 0.8),
      ];

      const contradictions = detector.detectConflictingTypes(relations);
      
      expect(contradictions).toHaveLength(1);
    });

    it('should return empty array when no conflicts', () => {
      const relations = [
        createScoredRelation('entityA', 'entityB', 'DEVELOPED_BY', 0.9),
        createScoredRelation('entityA', 'entityB', 'CITES', 0.8),
      ];

      const contradictions = detector.detectConflictingTypes(relations);
      
      expect(contradictions).toHaveLength(0);
    });

    it('should not flag different entity pairs', () => {
      const relations = [
        createScoredRelation('entityA', 'entityB', 'DEVELOPED_BY', 0.9),
        createScoredRelation('entityC', 'entityD', 'COMPETES_WITH', 0.8),
      ];

      const contradictions = detector.detectConflictingTypes(relations);
      
      expect(contradictions).toHaveLength(0);
    });

    it('should include severity in contradiction', () => {
      const relations = [
        createScoredRelation('entityA', 'entityB', 'DEVELOPED_BY', 0.9),
        createScoredRelation('entityA', 'entityB', 'COMPETES_WITH', 0.9),
      ];

      const contradictions = detector.detectConflictingTypes(relations);
      
      expect(contradictions[0].severity).toBeGreaterThan(0);
      expect(contradictions[0].severity).toBeLessThanOrEqual(1);
    });
  });

  describe('detectCyclic', () => {
    it('should detect simple A -> B -> A cycle', () => {
      const relations = [
        createScoredRelation('A', 'B', 'INFLUENCED_BY'),
        createScoredRelation('B', 'A', 'INFLUENCED_BY'),
      ];

      const contradictions = detector.detectCyclic(relations);
      
      expect(contradictions).toHaveLength(1);
      expect(contradictions[0].type).toBe('cyclic');
    });

    it('should detect A -> B -> C -> A cycle', () => {
      const relations = [
        createScoredRelation('A', 'B', 'BASED_ON'),
        createScoredRelation('B', 'C', 'BASED_ON'),
        createScoredRelation('C', 'A', 'BASED_ON'),
      ];

      const contradictions = detector.detectCyclic(relations);
      
      expect(contradictions).toHaveLength(1);
      expect(contradictions[0].relations.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty for acyclic relations', () => {
      const relations = [
        createScoredRelation('A', 'B', 'CITES'),
        createScoredRelation('B', 'C', 'CITES'),
        createScoredRelation('A', 'C', 'CITES'),
      ];

      const contradictions = detector.detectCyclic(relations);
      
      expect(contradictions).toHaveLength(0);
    });

    it('should include suggested resolution', () => {
      const relations = [
        createScoredRelation('A', 'B', 'EVOLVED_INTO'),
        createScoredRelation('B', 'A', 'EVOLVED_INTO'),
      ];

      const contradictions = detector.detectCyclic(relations);
      
      expect(contradictions[0].suggestedResolution).toBeDefined();
    });
  });

  describe('detect (main method)', () => {
    it('should detect both cyclic and conflicting type contradictions', () => {
      const relations = [
        // Cyclic
        createScoredRelation('A', 'B', 'INFLUENCED_BY'),
        createScoredRelation('B', 'A', 'INFLUENCED_BY'),
        // Conflicting types
        createScoredRelation('C', 'D', 'DEVELOPED_BY'),
        createScoredRelation('C', 'D', 'COMPETES_WITH'),
      ];

      const contradictions = detector.detect(relations);
      
      expect(contradictions.length).toBeGreaterThanOrEqual(2);
      expect(contradictions.some((c) => c.type === 'cyclic')).toBe(true);
      expect(contradictions.some((c) => c.type === 'conflicting_type')).toBe(true);
    });

    it('should respect detectCyclic config', () => {
      const customDetector = new ContradictionDetector({ detectCyclic: false });
      const relations = [
        createScoredRelation('A', 'B', 'INFLUENCED_BY'),
        createScoredRelation('B', 'A', 'INFLUENCED_BY'),
      ];

      const contradictions = customDetector.detect(relations);
      
      expect(contradictions.filter((c) => c.type === 'cyclic')).toHaveLength(0);
    });

    it('should respect detectConflictingTypes config', () => {
      const customDetector = new ContradictionDetector({ detectConflictingTypes: false });
      const relations = [
        createScoredRelation('A', 'B', 'DEVELOPED_BY'),
        createScoredRelation('A', 'B', 'COMPETES_WITH'),
      ];

      const contradictions = customDetector.detect(relations);
      
      expect(contradictions.filter((c) => c.type === 'conflicting_type')).toHaveLength(0);
    });

    it('should filter by minSeverity', () => {
      const customDetector = new ContradictionDetector({ minSeverity: 0.9 });
      const relations = [
        createScoredRelation('A', 'B', 'DEVELOPED_BY', 0.3),
        createScoredRelation('A', 'B', 'COMPETES_WITH', 0.3),
      ];

      const contradictions = customDetector.detect(relations);
      
      // Low confidence relations should result in low severity
      expect(contradictions.every((c) => c.severity >= 0.9)).toBe(true);
    });
  });

  describe('addConflictingType', () => {
    it('should add new conflicting type pair', () => {
      detector.addConflictingType('USES_TECHNIQUE', 'INFLUENCED_BY');
      
      expect(detector.typesConflict('USES_TECHNIQUE', 'INFLUENCED_BY')).toBe(true);
    });

    it('should not add duplicate pairs', () => {
      const initialCount = detector.getConflictingTypes().length;
      
      detector.addConflictingType('DEVELOPED_BY', 'COMPETES_WITH');
      
      expect(detector.getConflictingTypes().length).toBe(initialCount);
    });
  });

  describe('removeConflictingType', () => {
    it('should remove existing conflicting type pair', () => {
      const result = detector.removeConflictingType('DEVELOPED_BY', 'COMPETES_WITH');
      
      expect(result).toBe(true);
      expect(detector.typesConflict('DEVELOPED_BY', 'COMPETES_WITH')).toBe(false);
    });

    it('should return false for non-existing pair', () => {
      const result = detector.removeConflictingType('CITES', 'USES_TECHNIQUE');
      
      expect(result).toBe(false);
    });
  });

  describe('getConflictingTypes', () => {
    it('should return all conflicting types including defaults', () => {
      const types = detector.getConflictingTypes();
      
      expect(types.length).toBeGreaterThanOrEqual(CONFLICTING_TYPES.length);
    });

    it('should return a copy, not the original', () => {
      const types1 = detector.getConflictingTypes();
      const types2 = detector.getConflictingTypes();
      
      expect(types1).not.toBe(types2);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      detector.updateConfig({ minSeverity: 0.5, detectCyclic: false });
      
      const config = detector.getConfig();
      expect(config.minSeverity).toBe(0.5);
      expect(config.detectCyclic).toBe(false);
    });

    it('should reset conflicting types when custom types provided', () => {
      detector.addConflictingType('CITES', 'USES_TECHNIQUE');
      
      detector.updateConfig({ customConflictingTypes: [['TRAINED_ON', 'EVALUATED_ON']] });
      
      // Should have defaults + new custom, but not the manually added one
      expect(detector.typesConflict('CITES', 'USES_TECHNIQUE')).toBe(false);
      expect(detector.typesConflict('TRAINED_ON', 'EVALUATED_ON')).toBe(true);
    });
  });

  describe('getSummary', () => {
    it('should return correct summary statistics', () => {
      const contradictions: Contradiction[] = [
        {
          type: 'cyclic',
          relations: [],
          explanation: 'test',
          severity: 0.8,
        },
        {
          type: 'cyclic',
          relations: [],
          explanation: 'test',
          severity: 0.6,
        },
        {
          type: 'conflicting_type',
          relations: [],
          explanation: 'test',
          severity: 0.9,
        },
      ];

      const summary = detector.getSummary(contradictions);
      
      expect(summary.total).toBe(3);
      expect(summary.byType.cyclic).toBe(2);
      expect(summary.byType.conflicting_type).toBe(1);
      expect(summary.byType.temporal).toBe(0);
      expect(summary.avgSeverity).toBeCloseTo(0.7667, 2);
      expect(summary.highSeverityCount).toBe(2); // severity >= 0.7
    });

    it('should handle empty contradictions', () => {
      const summary = detector.getSummary([]);
      
      expect(summary.total).toBe(0);
      expect(summary.avgSeverity).toBe(0);
      expect(summary.highSeverityCount).toBe(0);
    });
  });

  describe('detectTemporal', () => {
    it('should return empty array (not yet implemented)', () => {
      const relations = [
        createScoredRelation('A', 'B', 'DEVELOPED_BY'),
      ];

      const contradictions = detector.detectTemporal(relations);
      
      expect(contradictions).toHaveLength(0);
    });
  });
});
