/**
 * CycleDetector Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CycleDetector } from './CycleDetector.js';
import type { Path, PathNode } from '../types.js';

describe('CycleDetector', () => {
  let detector: CycleDetector;

  beforeEach(() => {
    detector = new CycleDetector();
  });

  const createNode = (id: string, name: string): PathNode => ({
    id,
    type: 'Entity',
    name,
    properties: {},
  });

  const createPath = (nodeIds: string[]): Path => ({
    nodes: nodeIds.map((id) => createNode(id, `Node ${id}`)),
    relations: nodeIds.slice(0, -1).map(() => ({
      type: 'USES',
      direction: 'outgoing' as const,
      properties: {},
    })),
    score: 1.0,
    hops: nodeIds.length - 1,
  });

  describe('hasCycle', () => {
    it('should return false for acyclic path', () => {
      const path = createPath(['1', '2', '3', '4']);
      expect(detector.hasCycle(path)).toBe(false);
    });

    it('should return true for cyclic path', () => {
      const path = createPath(['1', '2', '3', '1']);
      expect(detector.hasCycle(path)).toBe(true);
    });

    it('should return true for path with intermediate cycle', () => {
      const path = createPath(['1', '2', '3', '2', '4']);
      expect(detector.hasCycle(path)).toBe(true);
    });

    it('should handle single node path', () => {
      const path = createPath(['1']);
      expect(detector.hasCycle(path)).toBe(false);
    });

    it('should handle empty path', () => {
      const path: Path = {
        nodes: [],
        relations: [],
        score: 0,
        hops: 0,
      };
      expect(detector.hasCycle(path)).toBe(false);
    });
  });

  describe('findCycles', () => {
    it('should find all cyclic paths', () => {
      const paths = [
        createPath(['1', '2', '3']),
        createPath(['1', '2', '1']),
        createPath(['a', 'b', 'c', 'b']),
        createPath(['x', 'y', 'z']),
      ];

      const report = detector.findCycles(paths);

      expect(report.totalPaths).toBe(4);
      expect(report.cyclicPaths).toBe(2);
      expect(report.cycles).toHaveLength(2);
    });

    it('should return empty cycles for all acyclic paths', () => {
      const paths = [
        createPath(['1', '2', '3']),
        createPath(['a', 'b', 'c']),
      ];

      const report = detector.findCycles(paths);

      expect(report.totalPaths).toBe(2);
      expect(report.cyclicPaths).toBe(0);
      expect(report.cycles).toHaveLength(0);
    });
  });

  describe('filterCyclicPaths', () => {
    it('should remove cyclic paths', () => {
      const paths = [
        createPath(['1', '2', '3']),
        createPath(['1', '2', '1']),
        createPath(['a', 'b', 'c']),
      ];

      const filtered = detector.filterCyclicPaths(paths);

      expect(filtered).toHaveLength(2);
      expect(filtered.every((p) => !detector.hasCycle(p))).toBe(true);
    });
  });

  describe('getCyclicPaths', () => {
    it('should return only cyclic paths', () => {
      const paths = [
        createPath(['1', '2', '3']),
        createPath(['1', '2', '1']),
        createPath(['a', 'b', 'c']),
      ];

      const cyclic = detector.getCyclicPaths(paths);

      expect(cyclic).toHaveLength(1);
      expect(cyclic.every((p) => detector.hasCycle(p))).toBe(true);
    });
  });

  describe('identifyCycleNodes', () => {
    it('should identify duplicate nodes', () => {
      const path = createPath(['1', '2', '3', '1', '4', '2']);

      const cycleNodes = detector.identifyCycleNodes(path);

      expect(cycleNodes).toContain('1');
      expect(cycleNodes).toContain('2');
      expect(cycleNodes).toHaveLength(2);
    });

    it('should return empty array for acyclic path', () => {
      const path = createPath(['1', '2', '3', '4']);

      const cycleNodes = detector.identifyCycleNodes(path);

      expect(cycleNodes).toHaveLength(0);
    });
  });

  describe('generatePathId', () => {
    it('should generate consistent path ID', () => {
      const path = createPath(['1', '2', '3']);

      const id = detector.generatePathId(path);

      expect(id).toBe('1->2->3');
    });

    it('should generate unique IDs for different paths', () => {
      const path1 = createPath(['1', '2', '3']);
      const path2 = createPath(['1', '3', '2']);

      const id1 = detector.generatePathId(path1);
      const id2 = detector.generatePathId(path2);

      expect(id1).not.toBe(id2);
    });
  });

  describe('wouldCreateCycle', () => {
    it('should detect potential cycle', () => {
      const existing = [createNode('1', 'A'), createNode('2', 'B')];
      const newNode = createNode('1', 'A');

      expect(detector.wouldCreateCycle(existing, newNode)).toBe(true);
    });

    it('should allow new node without cycle', () => {
      const existing = [createNode('1', 'A'), createNode('2', 'B')];
      const newNode = createNode('3', 'C');

      expect(detector.wouldCreateCycle(existing, newNode)).toBe(false);
    });
  });
});
