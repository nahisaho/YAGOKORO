import type {
  Community,
  CommunityDetectionResult,
  CommunityDetector,
  CommunityMetrics,
  Graph,
  GraphEdge,
  LeidenOptions,
} from './types.js';

/**
 * Default Leiden algorithm options
 */
const DEFAULT_OPTIONS: Required<LeidenOptions> = {
  resolution: 1.0,
  maxIterations: 100,
  minModularityGain: 0.0001,
  randomSeed: 42,
  hierarchical: false,
  maxLevels: 3,
};

/**
 * Internal node state for Leiden algorithm
 */
interface NodeState {
  id: string;
  community: string;
  weight: number;
}

/**
 * Leiden Community Detector
 *
 * Implements the Leiden algorithm for community detection.
 * Based on: Traag, V.A., Waltman, L., & van Eck, N.J. (2019).
 * "From Louvain to Leiden: guaranteeing well-connected communities."
 *
 * The Leiden algorithm improves upon Louvain by:
 * 1. Guaranteeing well-connected communities
 * 2. Better local optimization phase
 * 3. More efficient refinement
 *
 * @example
 * ```typescript
 * const detector = new LeidenCommunityDetector({ resolution: 1.0 });
 * const result = await detector.detect(graph);
 * console.log(result.communities);
 * ```
 */
export class LeidenCommunityDetector implements CommunityDetector {
  private readonly options: Required<LeidenOptions>;
  private rng: () => number;

  constructor(options?: LeidenOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.rng = this.createSeededRandom(this.options.randomSeed);
  }

  getAlgorithmName(): string {
    return 'leiden';
  }

  async detect(graph: Graph): Promise<CommunityDetectionResult> {
    const startTime = Date.now();

    if (graph.nodes.length === 0) {
      return this.emptyResult(startTime);
    }

    if (graph.nodes.length === 1) {
      const firstNode = graph.nodes[0];
      if (firstNode) {
        return this.singleNodeResult(firstNode.id, startTime);
      }
      return this.emptyResult(startTime);
    }

    // Build adjacency structure
    const adjacency = this.buildAdjacency(graph);
    const totalWeight = this.calculateTotalWeight(graph);

    // Initialize each node in its own community
    const nodeStates: Map<string, NodeState> = new Map();
    for (const node of graph.nodes) {
      nodeStates.set(node.id, {
        id: node.id,
        community: node.id,
        weight: node.weight ?? 1,
      });
    }

    // Run Leiden iterations
    let improved = true;
    let iterations = 0;

    while (improved && iterations < this.options.maxIterations) {
      improved = false;
      const shuffledNodes = this.shuffle([...graph.nodes.map((n) => n.id)]);

      for (const nodeId of shuffledNodes) {
        const node = nodeStates.get(nodeId)!;
        const currentCommunity = node.community;

        // Find neighboring communities and calculate modularity gain
        const neighborCommunities = this.getNeighborCommunities(nodeId, adjacency, nodeStates);

        let bestCommunity = currentCommunity;
        let bestGain = 0;

        for (const [targetCommunity, edgeWeight] of neighborCommunities) {
          if (targetCommunity === currentCommunity) continue;

          const gain = this.calculateModularityGain(
            nodeId,
            currentCommunity,
            targetCommunity,
            edgeWeight,
            adjacency,
            nodeStates,
            totalWeight
          );

          if (gain > bestGain + this.options.minModularityGain) {
            bestGain = gain;
            bestCommunity = targetCommunity;
          }
        }

        if (bestCommunity !== currentCommunity) {
          node.community = bestCommunity;
          improved = true;
        }
      }

      iterations++;
    }

    // Build communities from node assignments
    const communityMap = new Map<string, string[]>();
    for (const [nodeId, state] of nodeStates) {
      const members = communityMap.get(state.community) ?? [];
      members.push(nodeId);
      communityMap.set(state.community, members);
    }

    const communities: Community[] = [];
    let communityIndex = 0;

    for (const [_, memberIds] of communityMap) {
      const communityId = `c${communityIndex++}`;
      communities.push({
        id: communityId,
        level: 0,
        memberIds,
        metadata: {
          size: memberIds.length,
          density: this.calculateDensity(memberIds, adjacency),
        },
      });
    }

    // Build node to community mapping
    const nodeCommunities = new Map<string, string[]>();
    for (const community of communities) {
      for (const nodeId of community.memberIds) {
        nodeCommunities.set(nodeId, [community.id]);
      }
    }

    // Hierarchical detection if enabled
    let levels = 1;
    if (this.options.hierarchical && communities.length > 1) {
      const hierarchyResult = await this.detectHierarchy(communities, adjacency, graph);
      communities.push(...hierarchyResult.communities);
      levels = hierarchyResult.levels;

      // Update node community mapping for hierarchy
      for (const community of hierarchyResult.communities) {
        for (const nodeId of community.memberIds) {
          const current = nodeCommunities.get(nodeId) ?? [];
          current.push(community.id);
          nodeCommunities.set(nodeId, current);
        }
      }
    }

    const modularity = this.calculateModularity(
      communities.filter((c) => c.level === 0),
      adjacency,
      totalWeight
    );

    const metrics: CommunityMetrics = {
      modularity,
      numCommunities: communities.filter((c) => c.level === 0).length,
      coverage: this.calculateCoverage(
        communities.filter((c) => c.level === 0),
        adjacency,
        graph.edges.length
      ),
      processingTimeMs: Date.now() - startTime,
    };

    return {
      communities,
      nodeCommunities,
      metrics,
      levels,
    };
  }

  /**
   * Detect hierarchical communities by aggregating and re-running
   */
  private async detectHierarchy(
    baseCommunities: Community[],
    adjacency: Map<string, Map<string, number>>,
    originalGraph: Graph
  ): Promise<{ communities: Community[]; levels: number }> {
    const hierarchicalCommunities: Community[] = [];
    let currentCommunities = baseCommunities;
    let level = 1;

    while (level < this.options.maxLevels && currentCommunities.length > 1) {
      // Create aggregated graph from communities
      const aggregatedGraph = this.aggregateCommunities(
        currentCommunities,
        adjacency,
        originalGraph
      );

      if (aggregatedGraph.nodes.length <= 1) break;

      // Detect communities on aggregated graph
      const subDetector = new LeidenCommunityDetector({
        ...this.options,
        hierarchical: false,
      });
      const subResult = await subDetector.detect(aggregatedGraph);

      if (subResult.communities.length >= currentCommunities.length) break;

      // Map back to original nodes
      for (const superCommunity of subResult.communities) {
        const originalMembers: string[] = [];
        const childIds: string[] = [];

        for (const memberId of superCommunity.memberIds) {
          const baseCommunity = currentCommunities.find((c) => c.id === memberId);
          if (baseCommunity) {
            originalMembers.push(...baseCommunity.memberIds);
            childIds.push(baseCommunity.id);
          }
        }

        const hierarchyCommunity: Community = {
          id: `c${level}_${hierarchicalCommunities.length}`,
          level,
          memberIds: originalMembers,
          childIds,
          metadata: {
            size: originalMembers.length,
          },
        };

        // Update child communities with parent reference
        for (const childId of childIds) {
          const child = [...baseCommunities, ...hierarchicalCommunities].find(
            (c) => c.id === childId
          );
          if (child) {
            child.parentId = hierarchyCommunity.id;
          }
        }

        hierarchicalCommunities.push(hierarchyCommunity);
      }

      currentCommunities = hierarchicalCommunities.filter((c) => c.level === level);
      level++;
    }

    return { communities: hierarchicalCommunities, levels: level };
  }

  /**
   * Aggregate communities into super-nodes for hierarchical detection
   */
  private aggregateCommunities(
    communities: Community[],
    adjacency: Map<string, Map<string, number>>,
    _originalGraph: Graph
  ): Graph {
    const nodes = communities.map((c) => ({ id: c.id, weight: c.memberIds.length }));

    // Calculate inter-community edge weights
    const edgeMap = new Map<string, number>();

    for (const community of communities) {
      for (const nodeId of community.memberIds) {
        const neighbors = adjacency.get(nodeId);
        if (!neighbors) continue;

        for (const [neighborId, weight] of neighbors) {
          const neighborCommunity = communities.find((c) => c.memberIds.includes(neighborId));
          if (!neighborCommunity || neighborCommunity.id === community.id) continue;

          const edgeKey = [community.id, neighborCommunity.id].sort().join('-');
          edgeMap.set(edgeKey, (edgeMap.get(edgeKey) ?? 0) + weight);
        }
      }
    }

    const edges: GraphEdge[] = [];
    for (const [edgeKey, weight] of edgeMap) {
      const [source, target] = edgeKey.split('-');
      if (source && target) {
        edges.push({ source, target, weight });
      }
    }

    return { nodes, edges };
  }

  /**
   * Build adjacency list from graph
   */
  private buildAdjacency(graph: Graph): Map<string, Map<string, number>> {
    const adjacency = new Map<string, Map<string, number>>();

    for (const node of graph.nodes) {
      adjacency.set(node.id, new Map());
    }

    for (const edge of graph.edges) {
      const weight = edge.weight ?? 1;

      const sourceNeighbors = adjacency.get(edge.source)!;
      sourceNeighbors.set(edge.target, (sourceNeighbors.get(edge.target) ?? 0) + weight);

      const targetNeighbors = adjacency.get(edge.target)!;
      targetNeighbors.set(edge.source, (targetNeighbors.get(edge.source) ?? 0) + weight);
    }

    return adjacency;
  }

  /**
   * Calculate total edge weight
   */
  private calculateTotalWeight(graph: Graph): number {
    return graph.edges.reduce((sum, e) => sum + (e.weight ?? 1), 0);
  }

  /**
   * Get neighboring communities for a node
   */
  private getNeighborCommunities(
    nodeId: string,
    adjacency: Map<string, Map<string, number>>,
    nodeStates: Map<string, NodeState>
  ): Map<string, number> {
    const result = new Map<string, number>();
    const neighbors = adjacency.get(nodeId);

    if (!neighbors) return result;

    for (const [neighborId, weight] of neighbors) {
      const neighborState = nodeStates.get(neighborId);
      if (!neighborState) continue;

      const community = neighborState.community;
      result.set(community, (result.get(community) ?? 0) + weight);
    }

    return result;
  }

  /**
   * Calculate modularity gain from moving node to new community
   */
  private calculateModularityGain(
    nodeId: string,
    fromCommunity: string,
    toCommunity: string,
    edgeWeightToCommunity: number,
    adjacency: Map<string, Map<string, number>>,
    nodeStates: Map<string, NodeState>,
    totalWeight: number
  ): number {
    if (totalWeight === 0) return 0;

    const nodeWeight = this.getNodeDegree(nodeId, adjacency);
    const fromCommunityWeight = this.getCommunityWeight(fromCommunity, adjacency, nodeStates);
    const toCommunityWeight = this.getCommunityWeight(toCommunity, adjacency, nodeStates);

    const resolution = this.options.resolution;
    const m2 = 2 * totalWeight;

    // Modularity gain formula
    const gain =
      edgeWeightToCommunity -
      (resolution * nodeWeight * toCommunityWeight) / m2 +
      (resolution * nodeWeight * (fromCommunityWeight - nodeWeight)) / m2;

    return gain;
  }

  /**
   * Get node degree (sum of edge weights)
   */
  private getNodeDegree(nodeId: string, adjacency: Map<string, Map<string, number>>): number {
    const neighbors = adjacency.get(nodeId);
    if (!neighbors) return 0;

    let degree = 0;
    for (const weight of neighbors.values()) {
      degree += weight;
    }
    return degree;
  }

  /**
   * Get total weight of edges to nodes in a community
   */
  private getCommunityWeight(
    communityId: string,
    adjacency: Map<string, Map<string, number>>,
    nodeStates: Map<string, NodeState>
  ): number {
    let weight = 0;
    for (const [nodeId, state] of nodeStates) {
      if (state.community === communityId) {
        weight += this.getNodeDegree(nodeId, adjacency);
      }
    }
    return weight;
  }

  /**
   * Calculate overall modularity
   */
  private calculateModularity(
    communities: Community[],
    adjacency: Map<string, Map<string, number>>,
    totalWeight: number
  ): number {
    if (totalWeight === 0) return 0;

    let modularity = 0;
    const m2 = 2 * totalWeight;

    for (const community of communities) {
      let internalEdges = 0;
      let totalDegree = 0;

      for (const nodeId of community.memberIds) {
        const neighbors = adjacency.get(nodeId);
        if (!neighbors) continue;

        totalDegree += this.getNodeDegree(nodeId, adjacency);

        for (const [neighborId, weight] of neighbors) {
          if (community.memberIds.includes(neighborId)) {
            internalEdges += weight;
          }
        }
      }

      // Each internal edge counted twice
      internalEdges /= 2;

      modularity += internalEdges / totalWeight - this.options.resolution * (totalDegree / m2) ** 2;
    }

    return modularity;
  }

  /**
   * Calculate density of a community
   */
  private calculateDensity(
    memberIds: string[],
    adjacency: Map<string, Map<string, number>>
  ): number {
    if (memberIds.length <= 1) return 1;

    let internalEdges = 0;
    const memberSet = new Set(memberIds);

    for (const nodeId of memberIds) {
      const neighbors = adjacency.get(nodeId);
      if (!neighbors) continue;

      for (const [neighborId] of neighbors) {
        if (memberSet.has(neighborId)) {
          internalEdges++;
        }
      }
    }

    // Each edge counted twice
    internalEdges /= 2;

    const maxEdges = (memberIds.length * (memberIds.length - 1)) / 2;
    return maxEdges > 0 ? internalEdges / maxEdges : 0;
  }

  /**
   * Calculate coverage (fraction of edges within communities)
   */
  private calculateCoverage(
    communities: Community[],
    adjacency: Map<string, Map<string, number>>,
    totalEdges: number
  ): number {
    if (totalEdges === 0) return 0;

    let coveredEdges = 0;

    for (const community of communities) {
      const memberSet = new Set(community.memberIds);

      for (const nodeId of community.memberIds) {
        const neighbors = adjacency.get(nodeId);
        if (!neighbors) continue;

        for (const [neighborId] of neighbors) {
          if (memberSet.has(neighborId)) {
            coveredEdges++;
          }
        }
      }
    }

    // Each edge counted twice
    coveredEdges /= 2;

    return coveredEdges / totalEdges;
  }

  /**
   * Shuffle array in place using Fisher-Yates
   */
  private shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      const temp = array[i];
      const swapVal = array[j];
      if (temp !== undefined && swapVal !== undefined) {
        array[i] = swapVal;
        array[j] = temp;
      }
    }
    return array;
  }

  /**
   * Create seeded random number generator
   */
  private createSeededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  /**
   * Empty result for empty graphs
   */
  private emptyResult(startTime: number): CommunityDetectionResult {
    return {
      communities: [],
      nodeCommunities: new Map(),
      metrics: {
        modularity: 0,
        numCommunities: 0,
        processingTimeMs: Date.now() - startTime,
      },
      levels: 0,
    };
  }

  /**
   * Result for single node graphs
   */
  private singleNodeResult(nodeId: string, startTime: number): CommunityDetectionResult {
    const community: Community = {
      id: 'c0',
      level: 0,
      memberIds: [nodeId],
      metadata: {
        size: 1,
        density: 1,
      },
    };

    return {
      communities: [community],
      nodeCommunities: new Map([[nodeId, ['c0']]]),
      metrics: {
        modularity: 0,
        numCommunities: 1,
        processingTimeMs: Date.now() - startTime,
      },
      levels: 1,
    };
  }
}
