/**
 * ContradictionDetector - Detects conflicting relations
 *
 * Identifies contradictions such as:
 * - Cyclic relationships
 * - Conflicting relation types
 * - Temporal inconsistencies
 */

import type { ScoredRelation, RelationType } from '../types.js';

/**
 * Contradiction type
 */
export type ContradictionType =
  | 'cyclic'           // A -> B -> A
  | 'conflicting_type' // A develops B AND A competes_with B
  | 'temporal'         // Time-based conflict
  | 'semantic';        // Semantic inconsistency

/**
 * Detected contradiction
 */
export interface Contradiction {
  /** Type of contradiction */
  type: ContradictionType;
  /** Relations involved */
  relations: ScoredRelation[];
  /** Explanation of contradiction */
  explanation: string;
  /** Severity (0.0-1.0) */
  severity: number;
  /** Suggested resolution */
  suggestedResolution?: string;
}

/**
 * Conflicting type pairs (relations that shouldn't coexist)
 */
export const CONFLICTING_TYPES: Array<[RelationType, RelationType]> = [
  ['DEVELOPED_BY', 'COMPETES_WITH'],
  ['COLLABORATED_WITH', 'COMPETES_WITH'],
  ['BASED_ON', 'COMPETES_WITH'],
];

/**
 * Contradiction detection configuration
 */
export interface ContradictionConfig {
  /** Detect cyclic relationships */
  detectCyclic: boolean;
  /** Detect conflicting types */
  detectConflictingTypes: boolean;
  /** Detect temporal inconsistencies */
  detectTemporal: boolean;
  /** Minimum severity to report */
  minSeverity: number;
  /** Custom conflicting type pairs */
  customConflictingTypes?: Array<[RelationType, RelationType]>;
}

/**
 * Default configuration
 */
export const DEFAULT_CONTRADICTION_CONFIG: ContradictionConfig = {
  detectCyclic: true,
  detectConflictingTypes: true,
  detectTemporal: false, // Requires temporal data
  minSeverity: 0.3,
};

/**
 * ContradictionDetector class
 * Detects conflicting relations in a set of relations
 */
export class ContradictionDetector {
  private config: ContradictionConfig;
  private conflictingTypes: Array<[RelationType, RelationType]>;

  constructor(config: Partial<ContradictionConfig> = {}) {
    this.config = { ...DEFAULT_CONTRADICTION_CONFIG, ...config };
    this.conflictingTypes = [
      ...CONFLICTING_TYPES,
      ...(config.customConflictingTypes || []),
    ];
  }

  /**
   * Detect all contradictions in a set of relations
   */
  detect(relations: ScoredRelation[]): Contradiction[] {
    const contradictions: Contradiction[] = [];

    if (this.config.detectCyclic) {
      contradictions.push(...this.detectCyclicRelations(relations));
    }

    if (this.config.detectConflictingTypes) {
      contradictions.push(...this.detectConflictingTypeRelations(relations));
    }

    if (this.config.detectTemporal) {
      contradictions.push(...this.detectTemporalRelations(relations));
    }

    // Filter by minimum severity
    return contradictions.filter((c) => c.severity >= this.config.minSeverity);
  }

  /**
   * Detect cyclic relationships (A -> B -> C -> A)
   */
  detectCyclic(relations: ScoredRelation[]): Contradiction[] {
    return this.detectCyclicRelations(relations);
  }

  /**
   * Internal cyclic detection using DFS
   */
  private detectCyclicRelations(relations: ScoredRelation[]): Contradiction[] {
    const contradictions: Contradiction[] = [];

    // Build adjacency list
    const graph = new Map<string, Array<{ target: string; relation: ScoredRelation }>>();
    for (const relation of relations) {
      const edges = graph.get(relation.sourceId) || [];
      edges.push({ target: relation.targetId, relation });
      graph.set(relation.sourceId, edges);
    }

    // Find cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const pathRelations: ScoredRelation[] = [];

    const detectCycle = (node: string): ScoredRelation[] | null => {
      visited.add(node);
      recursionStack.add(node);

      const edges = graph.get(node) || [];
      for (const { target, relation } of edges) {
        pathRelations.push(relation);

        if (!visited.has(target)) {
          const cycle = detectCycle(target);
          if (cycle) return cycle;
        } else if (recursionStack.has(target)) {
          // Found cycle - return relations in cycle
          const cycleStart = pathRelations.findIndex((r) => r.sourceId === target);
          return pathRelations.slice(cycleStart);
        }

        pathRelations.pop();
      }

      recursionStack.delete(node);
      return null;
    };

    // Check from each node
    const allNodes = new Set([
      ...relations.map((r) => r.sourceId),
      ...relations.map((r) => r.targetId),
    ]);

    for (const node of allNodes) {
      if (!visited.has(node)) {
        const cycle = detectCycle(node);
        if (cycle && cycle.length > 0) {
          // Check if this cycle is already recorded
          const cycleKey = cycle
            .map((r) => `${r.sourceId}->${r.targetId}`)
            .sort()
            .join('|');
          const alreadyRecorded = contradictions.some(
            (c) =>
              c.type === 'cyclic' &&
              c.relations
                .map((r) => `${r.sourceId}->${r.targetId}`)
                .sort()
                .join('|') === cycleKey
          );

          if (!alreadyRecorded) {
            const entityNames = [
              ...new Set(cycle.flatMap((r) => [r.sourceId, r.targetId])),
            ];
            contradictions.push({
              type: 'cyclic',
              relations: cycle,
              explanation: `Cyclic relationship detected: ${entityNames.join(' -> ')} -> ${entityNames[0]}`,
              severity: this.calculateCyclicSeverity(cycle),
              suggestedResolution:
                'Review the cycle and remove or modify one of the relations to break the cycle.',
            });
          }
        }
      }
    }

    return contradictions;
  }

  /**
   * Calculate severity for cyclic contradiction
   */
  private calculateCyclicSeverity(cycle: ScoredRelation[]): number {
    // Higher severity for shorter cycles (more direct contradictions)
    // and higher confidence relations
    const avgConfidence =
      cycle.reduce((sum, r) => sum + r.confidence, 0) / cycle.length;
    const cycleLengthFactor = Math.min(1, 3 / cycle.length); // Shorter cycles = higher severity
    return Math.min(1, avgConfidence * cycleLengthFactor + 0.3);
  }

  /**
   * Detect conflicting relation types
   */
  detectConflictingTypes(relations: ScoredRelation[]): Contradiction[] {
    return this.detectConflictingTypeRelations(relations);
  }

  /**
   * Internal conflicting type detection
   */
  private detectConflictingTypeRelations(
    relations: ScoredRelation[]
  ): Contradiction[] {
    const contradictions: Contradiction[] = [];

    // Group relations by entity pair
    const pairMap = new Map<string, ScoredRelation[]>();
    for (const relation of relations) {
      // Use unordered pair key for bidirectional checking
      const key = [relation.sourceId, relation.targetId].sort().join('::');
      const existing = pairMap.get(key) || [];
      existing.push(relation);
      pairMap.set(key, existing);
    }

    // Check each pair for conflicting types
    for (const [_pairKey, pairRelations] of pairMap) {
      if (pairRelations.length < 2) continue;

      // Check all combinations
      for (let i = 0; i < pairRelations.length; i++) {
        for (let j = i + 1; j < pairRelations.length; j++) {
          const r1 = pairRelations[i];
          const r2 = pairRelations[j];

          if (this.typesConflict(r1.relationType, r2.relationType)) {
            contradictions.push({
              type: 'conflicting_type',
              relations: [r1, r2],
              explanation: `Conflicting relation types between ${r1.sourceId} and ${r2.targetId}: ${r1.relationType} conflicts with ${r2.relationType}`,
              severity: this.calculateConflictingSeverity(r1, r2),
              suggestedResolution: `Review and keep only one of the conflicting relations, or verify if both are truly applicable in different contexts.`,
            });
          }
        }
      }
    }

    return contradictions;
  }

  /**
   * Calculate severity for conflicting type contradiction
   */
  private calculateConflictingSeverity(
    r1: ScoredRelation,
    r2: ScoredRelation
  ): number {
    // Higher severity when both relations have high confidence
    const avgConfidence = (r1.confidence + r2.confidence) / 2;
    return Math.min(1, avgConfidence + 0.2);
  }

  /**
   * Detect temporal inconsistencies
   * Note: Requires temporal data in evidence
   */
  detectTemporal(relations: ScoredRelation[]): Contradiction[] {
    return this.detectTemporalRelations(relations);
  }

  /**
   * Internal temporal detection
   */
  private detectTemporalRelations(
    _relations: ScoredRelation[]
  ): Contradiction[] {
    // Temporal detection would require timestamp information
    // in the evidence or relations, which is not currently available
    // This is a placeholder for future implementation
    return [];
  }

  /**
   * Check if two relation types conflict
   */
  typesConflict(type1: RelationType, type2: RelationType): boolean {
    if (type1 === type2) return false;

    for (const [conflictA, conflictB] of this.conflictingTypes) {
      if (
        (type1 === conflictA && type2 === conflictB) ||
        (type1 === conflictB && type2 === conflictA)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Add a custom conflicting type pair
   */
  addConflictingType(type1: RelationType, type2: RelationType): void {
    // Check if already exists
    const exists = this.conflictingTypes.some(
      ([a, b]) =>
        (a === type1 && b === type2) || (a === type2 && b === type1)
    );
    if (!exists) {
      this.conflictingTypes.push([type1, type2]);
    }
  }

  /**
   * Remove a conflicting type pair
   */
  removeConflictingType(type1: RelationType, type2: RelationType): boolean {
    const index = this.conflictingTypes.findIndex(
      ([a, b]) =>
        (a === type1 && b === type2) || (a === type2 && b === type1)
    );
    if (index !== -1) {
      this.conflictingTypes.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all conflicting type pairs
   */
  getConflictingTypes(): Array<[RelationType, RelationType]> {
    return [...this.conflictingTypes];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ContradictionConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.customConflictingTypes) {
      // Reset to defaults plus new custom types
      this.conflictingTypes = [
        ...CONFLICTING_TYPES,
        ...config.customConflictingTypes,
      ];
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ContradictionConfig {
    return { ...this.config };
  }

  /**
   * Get summary statistics for detected contradictions
   */
  getSummary(contradictions: Contradiction[]): {
    total: number;
    byType: Record<ContradictionType, number>;
    avgSeverity: number;
    highSeverityCount: number;
  } {
    const byType: Record<ContradictionType, number> = {
      cyclic: 0,
      conflicting_type: 0,
      temporal: 0,
      semantic: 0,
    };

    for (const c of contradictions) {
      byType[c.type]++;
    }

    const avgSeverity =
      contradictions.length > 0
        ? contradictions.reduce((sum, c) => sum + c.severity, 0) /
          contradictions.length
        : 0;

    return {
      total: contradictions.length,
      byType,
      avgSeverity,
      highSeverityCount: contradictions.filter((c) => c.severity >= 0.7).length,
    };
  }
}
