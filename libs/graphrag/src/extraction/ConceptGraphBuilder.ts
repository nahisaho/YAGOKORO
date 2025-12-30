/**
 * ConceptGraphBuilder - LazyGraphRAG Concept Graph Construction
 *
 * Builds a concept graph from extracted concepts and co-occurrences.
 * Uses graphology for graph operations and community detection.
 *
 * Key features:
 * - Builds undirected weighted graph from concepts
 * - Applies Leiden algorithm for community detection
 * - Creates hierarchical community structure
 * - Maps concepts to text chunks for retrieval
 */

import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';
import type { Concept, ConceptCooccurrence } from './ConceptExtractor.js';
import type { TextChunk } from './types.js';

/**
 * Concept node in the graph
 */
export interface ConceptNode {
  /** Concept ID */
  id: string;
  /** Concept text */
  text: string;
  /** Importance score (0-1) */
  importance: number;
  /** Frequency count */
  frequency: number;
  /** Community assignment at each level */
  communities: number[];
  /** Source chunk IDs */
  sourceChunks: string[];
}

/**
 * Edge between concepts
 */
export interface ConceptEdge {
  /** Source concept ID */
  source: string;
  /** Target concept ID */
  target: string;
  /** Co-occurrence strength (weight) */
  weight: number;
  /** Co-occurrence count */
  count: number;
}

/**
 * Community in the concept graph
 */
export interface ConceptCommunity {
  /** Community ID */
  id: string;
  /** Community level in hierarchy */
  level: number;
  /** Concept IDs in this community */
  conceptIds: string[];
  /** Child community IDs (for hierarchical structure) */
  childCommunities: string[];
  /** Parent community ID */
  parentCommunityId?: string;
  /** Top concepts by importance */
  topConcepts: string[];
  /** Associated text chunk IDs */
  chunkIds: string[];
  /** Size (number of concepts) */
  size: number;
}

/**
 * Concept graph structure
 */
export interface ConceptGraph {
  /** All concept nodes */
  nodes: ConceptNode[];
  /** All edges (co-occurrences) */
  edges: ConceptEdge[];
  /** Communities at all levels */
  communities: ConceptCommunity[];
  /** Chunk to concepts mapping */
  chunkToConcepts: Map<string, string[]>;
  /** Concept to chunks mapping */
  conceptToChunks: Map<string, string[]>;
  /** Community hierarchy levels */
  hierarchyLevels: number;
  /** Graph statistics */
  stats: {
    nodeCount: number;
    edgeCount: number;
    communityCount: number;
    avgDegree: number;
    density: number;
  };
}

/**
 * Options for graph building
 */
export interface ConceptGraphOptions {
  /** Minimum edge weight to include */
  minEdgeWeight?: number;
  /** Maximum community levels */
  maxCommunityLevels?: number;
  /** Resolution parameter for community detection */
  resolution?: number;
  /** Top concepts per community to highlight */
  topConceptsPerCommunity?: number;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<ConceptGraphOptions> = {
  minEdgeWeight: 0.1,
  maxCommunityLevels: 3,
  resolution: 1.0,
  topConceptsPerCommunity: 5,
};

/**
 * ConceptGraphBuilder
 *
 * Builds hierarchical concept graph for LazyGraphRAG.
 *
 * @example
 * ```typescript
 * const builder = new ConceptGraphBuilder();
 *
 * const graph = builder.build(concepts, cooccurrences, chunks);
 * console.log(graph.stats);
 * // { nodeCount: 100, edgeCount: 500, communityCount: 10, ... }
 * ```
 */
export class ConceptGraphBuilder {
  private readonly options: Required<ConceptGraphOptions>;

  constructor(options?: ConceptGraphOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Build concept graph from extracted concepts
   *
   * @param concepts - Extracted concepts
   * @param cooccurrences - Co-occurrence relations
   * @param chunks - Source text chunks
   * @returns Concept graph structure
   */
  build(
    concepts: Concept[],
    cooccurrences: ConceptCooccurrence[],
    _chunks: TextChunk[]
  ): ConceptGraph {
    // Step 1: Create graphology graph
    const graph = new Graph({ type: 'undirected', allowSelfLoops: false });

    // Step 2: Add nodes (concepts)
    const conceptMap = new Map<string, Concept>();
    for (const concept of concepts) {
      conceptMap.set(concept.id, concept);
      graph.addNode(concept.id, {
        text: concept.text,
        importance: concept.importance,
        frequency: concept.frequency,
        sourceChunks: concept.sourceChunks,
      });
    }

    // Step 3: Add edges (co-occurrences)
    const filteredCooccurrences = cooccurrences.filter(
      (c) => c.strength >= this.options.minEdgeWeight
    );

    for (const cooc of filteredCooccurrences) {
      if (graph.hasNode(cooc.sourceId) && graph.hasNode(cooc.targetId)) {
        try {
          graph.addEdge(cooc.sourceId, cooc.targetId, {
            weight: cooc.strength,
            count: cooc.count,
          });
        } catch {
          // Edge may already exist, skip
        }
      }
    }

    // Step 4: Detect communities at multiple levels
    const communities = this.detectCommunities(graph, concepts);

    // Step 5: Build chunk-concept mappings
    const chunkToConcepts = this.buildChunkToConceptsMap(concepts);
    const conceptToChunks = this.buildConceptToChunksMap(concepts);

    // Step 6: Build output structures
    const nodes = this.buildNodes(graph, concepts, communities);
    const edges = this.buildEdges(graph);

    // Step 7: Calculate statistics
    const stats = this.calculateStats(graph, communities);

    return {
      nodes,
      edges,
      communities,
      chunkToConcepts,
      conceptToChunks,
      hierarchyLevels: this.options.maxCommunityLevels,
      stats,
    };
  }

  /**
   * Detect communities using Louvain algorithm at multiple levels
   */
  private detectCommunities(
    graph: Graph,
    concepts: Concept[]
  ): ConceptCommunity[] {
    const allCommunities: ConceptCommunity[] = [];

    if (graph.order === 0) {
      return allCommunities;
    }

    // Level 0: Base level communities
    const level0Communities = louvain(graph, {
      resolution: this.options.resolution,
      getEdgeWeight: 'weight',
    });

    // Group concepts by community
    const communityGroups = new Map<number, string[]>();
    for (const nodeId of graph.nodes()) {
      const communityId = level0Communities[nodeId];
      if (communityId !== undefined) {
        const existing = communityGroups.get(communityId);
        if (existing) {
          existing.push(nodeId);
        } else {
          communityGroups.set(communityId, [nodeId]);
        }
      }
    }

    // Create Level 0 communities
    for (const [communityNum, conceptIds] of communityGroups) {
      const community = this.createCommunity(
        `community-L0-${communityNum}`,
        0,
        conceptIds,
        concepts
      );
      allCommunities.push(community);
    }

    // Higher levels: Aggregate communities (simplified hierarchical approach)
    let currentLevelCommunities = allCommunities.filter((c) => c.level === 0);
    for (let level = 1; level < this.options.maxCommunityLevels; level++) {
      if (currentLevelCommunities.length <= 1) break;

      // Create a meta-graph of communities
      const metaGraph = new Graph({ type: 'undirected', allowSelfLoops: false });

      for (const comm of currentLevelCommunities) {
        metaGraph.addNode(comm.id, { size: comm.size });
      }

      // Add edges between communities based on inter-community connections
      for (let i = 0; i < currentLevelCommunities.length; i++) {
        for (let j = i + 1; j < currentLevelCommunities.length; j++) {
          const comm1 = currentLevelCommunities[i];
          const comm2 = currentLevelCommunities[j];
          if (!comm1 || !comm2) continue;

          const connectionWeight = this.calculateInterCommunityWeight(
            graph,
            comm1.conceptIds,
            comm2.conceptIds
          );

          if (connectionWeight > 0) {
            try {
              metaGraph.addEdge(comm1.id, comm2.id, { weight: connectionWeight });
            } catch {
              // Edge may already exist
            }
          }
        }
      }

      // Detect communities in meta-graph
      if (metaGraph.order > 1 && metaGraph.size > 0) {
        const higherLevelCommunities = louvain(metaGraph, {
          resolution: this.options.resolution * (level + 1),
          getEdgeWeight: 'weight',
        });

        // Group and create higher level communities
        const higherGroups = new Map<number, string[]>();
        for (const nodeId of metaGraph.nodes()) {
          const communityId = higherLevelCommunities[nodeId];
          if (communityId !== undefined) {
            const existing = higherGroups.get(communityId);
            if (existing) {
              existing.push(nodeId);
            } else {
              higherGroups.set(communityId, [nodeId]);
            }
          }
        }

        const newLevelCommunities: ConceptCommunity[] = [];
        for (const [communityNum, childCommunityIds] of higherGroups) {
          // Aggregate all concepts from child communities
          const allConceptIds: string[] = [];
          for (const childId of childCommunityIds) {
            const childComm = currentLevelCommunities.find((c) => c.id === childId);
            if (childComm) {
              allConceptIds.push(...childComm.conceptIds);
              childComm.parentCommunityId = `community-L${level}-${communityNum}`;
            }
          }

          const community = this.createCommunity(
            `community-L${level}-${communityNum}`,
            level,
            allConceptIds,
            concepts
          );
          community.childCommunities = childCommunityIds;
          newLevelCommunities.push(community);
          allCommunities.push(community);
        }

        currentLevelCommunities = newLevelCommunities;
      }
    }

    return allCommunities;
  }

  /**
   * Create a community structure
   */
  private createCommunity(
    id: string,
    level: number,
    conceptIds: string[],
    concepts: Concept[]
  ): ConceptCommunity {
    // Get concepts for this community
    const communityConcepts = concepts.filter((c) => conceptIds.includes(c.id));

    // Sort by importance and get top concepts
    const sortedConcepts = [...communityConcepts].sort(
      (a, b) => b.importance - a.importance
    );
    const topConcepts = sortedConcepts
      .slice(0, this.options.topConceptsPerCommunity)
      .map((c) => c.text);

    // Collect all chunk IDs
    const chunkIds = [...new Set(communityConcepts.flatMap((c) => c.sourceChunks))];

    return {
      id,
      level,
      conceptIds,
      childCommunities: [],
      topConcepts,
      chunkIds,
      size: conceptIds.length,
    };
  }

  /**
   * Calculate inter-community connection weight
   */
  private calculateInterCommunityWeight(
    graph: Graph,
    concepts1: string[],
    concepts2: string[]
  ): number {
    let totalWeight = 0;
    let connectionCount = 0;

    for (const c1 of concepts1) {
      for (const c2 of concepts2) {
        if (graph.hasEdge(c1, c2)) {
          const edgeAttrs = graph.getEdgeAttributes(c1, c2);
          const weight = edgeAttrs.weight as number;
          totalWeight += weight;
          connectionCount++;
        }
      }
    }

    return connectionCount > 0 ? totalWeight / connectionCount : 0;
  }

  /**
   * Build chunk to concepts mapping
   */
  private buildChunkToConceptsMap(concepts: Concept[]): Map<string, string[]> {
    const map = new Map<string, string[]>();

    for (const concept of concepts) {
      for (const chunkId of concept.sourceChunks) {
        const existing = map.get(chunkId);
        if (existing) {
          existing.push(concept.id);
        } else {
          map.set(chunkId, [concept.id]);
        }
      }
    }

    return map;
  }

  /**
   * Build concept to chunks mapping
   */
  private buildConceptToChunksMap(concepts: Concept[]): Map<string, string[]> {
    const map = new Map<string, string[]>();

    for (const concept of concepts) {
      map.set(concept.id, [...concept.sourceChunks]);
    }

    return map;
  }

  /**
   * Build node structures from graph
   */
  private buildNodes(
    graph: Graph,
    concepts: Concept[],
    communities: ConceptCommunity[]
  ): ConceptNode[] {
    const conceptMap = new Map(concepts.map((c) => [c.id, c]));

    return graph.mapNodes((nodeId: string) => {
      const concept = conceptMap.get(nodeId);
      const attrs = graph.getNodeAttributes(nodeId);

      // Find communities this concept belongs to at each level
      const conceptCommunities: number[] = [];
      for (let level = 0; level < this.options.maxCommunityLevels; level++) {
        const community = communities.find(
          (c) => c.level === level && c.conceptIds.includes(nodeId)
        );
        if (community) {
          // Extract community number from ID
          const match = community.id.match(/community-L\d+-(\d+)/);
          conceptCommunities.push(match && match[1] ? parseInt(match[1], 10) : -1);
        } else {
          conceptCommunities.push(-1);
        }
      }

      return {
        id: nodeId,
        text: (attrs.text as string) ?? concept?.text ?? '',
        importance: (attrs.importance as number) ?? concept?.importance ?? 0,
        frequency: (attrs.frequency as number) ?? concept?.frequency ?? 0,
        communities: conceptCommunities,
        sourceChunks: (attrs.sourceChunks as string[]) ?? concept?.sourceChunks ?? [],
      };
    });
  }

  /**
   * Build edge structures from graph
   */
  private buildEdges(graph: Graph): ConceptEdge[] {
    return graph.mapEdges((_edge: string, attrs: Record<string, unknown>, source: string, target: string) => ({
      source,
      target,
      weight: attrs.weight as number,
      count: attrs.count as number,
    }));
  }

  /**
   * Calculate graph statistics
   */
  private calculateStats(
    graph: Graph,
    communities: ConceptCommunity[]
  ): ConceptGraph['stats'] {
    const nodeCount = graph.order;
    const edgeCount = graph.size;
    const communityCount = communities.length;

    // Average degree
    let totalDegree = 0;
    graph.forEachNode((node: string) => {
      totalDegree += graph.degree(node);
    });
    const avgDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;

    // Density
    const maxEdges = (nodeCount * (nodeCount - 1)) / 2;
    const density = maxEdges > 0 ? edgeCount / maxEdges : 0;

    return {
      nodeCount,
      edgeCount,
      communityCount,
      avgDegree,
      density,
    };
  }

  /**
   * Get communities at a specific level
   */
  getCommunitiesAtLevel(graph: ConceptGraph, level: number): ConceptCommunity[] {
    return graph.communities.filter((c) => c.level === level);
  }

  /**
   * Get chunks associated with a community
   */
  getChunksForCommunity(graph: ConceptGraph, communityId: string): string[] {
    const community = graph.communities.find((c) => c.id === communityId);
    return community?.chunkIds ?? [];
  }

  /**
   * Get concepts associated with a chunk
   */
  getConceptsForChunk(graph: ConceptGraph, chunkId: string): string[] {
    return graph.chunkToConcepts.get(chunkId) ?? [];
  }
}
