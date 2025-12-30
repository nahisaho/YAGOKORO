/**
 * Cycle Detector
 *
 * Detects cycles in paths to prevent infinite loops and ensure valid paths.
 */

import type { CycleInfo, CycleReport, Path, PathNode } from '../types.js';

/**
 * Cycle detector for graph paths
 */
export class CycleDetector {
  /**
   * Check if a path contains a cycle (duplicate nodes)
   */
  hasCycle(path: Path): boolean {
    const nodeIds = path.nodes.map((n) => n.id);
    const uniqueIds = new Set(nodeIds);
    return nodeIds.length !== uniqueIds.size;
  }

  /**
   * Find all cycles in a set of paths
   */
  findCycles(paths: Path[]): CycleReport {
    const cycles: CycleInfo[] = [];

    for (const path of paths) {
      if (this.hasCycle(path)) {
        cycles.push({
          pathId: this.generatePathId(path),
          nodes: path.nodes,
          cycleNodes: this.identifyCycleNodes(path),
        });
      }
    }

    return {
      totalPaths: paths.length,
      cyclicPaths: cycles.length,
      cycles,
    };
  }

  /**
   * Filter out paths with cycles
   */
  filterCyclicPaths(paths: Path[]): Path[] {
    return paths.filter((path) => !this.hasCycle(path));
  }

  /**
   * Get paths that contain cycles
   */
  getCyclicPaths(paths: Path[]): Path[] {
    return paths.filter((path) => this.hasCycle(path));
  }

  /**
   * Identify which nodes form cycles in a path
   */
  identifyCycleNodes(path: Path): string[] {
    const nodeIds = path.nodes.map((n) => n.id);
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const id of nodeIds) {
      if (seen.has(id)) {
        if (!duplicates.includes(id)) {
          duplicates.push(id);
        }
      }
      seen.add(id);
    }

    return duplicates;
  }

  /**
   * Generate a unique ID for a path based on its nodes
   */
  generatePathId(path: Path): string {
    return path.nodes.map((n) => n.id).join('->');
  }

  /**
   * Check if a node would create a cycle if added to an existing path
   */
  wouldCreateCycle(existingNodes: PathNode[], newNode: PathNode): boolean {
    return existingNodes.some((n) => n.id === newNode.id);
  }
}
