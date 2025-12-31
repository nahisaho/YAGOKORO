/**
 * CommunityDetector
 *
 * @description 研究者ネットワークのコミュニティ検出（Louvain algorithm）
 * @since v4.0.0
 * @see REQ-005-04
 */

import type { CoauthorEdge } from '@yagokoro/domain';
import Graph from 'graphology';
import louvainModule from 'graphology-communities-louvain';

// ESM/CJS互換のためのインポート処理
const louvain = typeof louvainModule === 'function'
  ? louvainModule
  : (louvainModule as { default: typeof louvainModule }).default;

/** コミュニティ検出アルゴリズム */
export type CommunityAlgorithm = 'louvain';

/** コミュニティ検出の設定 */
export interface CommunityDetectorConfig {
  /** 使用するアルゴリズム */
  algorithm: CommunityAlgorithm;
  /** 解像度パラメータ（高いほど小さなコミュニティを検出） */
  resolution: number;
  /** 乱数シード（再現性のため） */
  randomSeed?: number;
  /** 最小コミュニティサイズ（これ未満は除外） */
  minCommunitySize?: number;
}

/** コミュニティメンバー */
export interface CommunityMember {
  researcherId: string;
  researcherName: string;
  /** コミュニティ内での次数（つながりの数） */
  degree: number;
  /** コミュニティの中心性スコア */
  centralityScore: number;
}

/** コミュニティ情報 */
export interface CommunityInfo {
  communityId: string;
  /** コミュニティのラベル（代表的なメンバーなどから生成） */
  label: string;
  /** メンバー数 */
  size: number;
  /** メンバー一覧 */
  members: CommunityMember[];
  /** コミュニティ内の総エッジ数 */
  internalEdges: number;
  /** 他コミュニティへのエッジ数 */
  externalEdges: number;
  /** 密度（実際のエッジ数 / 可能な最大エッジ数） */
  density: number;
}

/** ブリッジ研究者（複数コミュニティを橋渡し） */
export interface BridgeResearcher {
  researcherId: string;
  researcherName: string;
  /** 所属コミュニティ */
  communityId: string;
  /** 接続している他コミュニティのID */
  connectedCommunities: string[];
  /** ブリッジスコア（外部接続の強さ） */
  bridgeScore: number;
}

/** コミュニティ統計 */
export interface CommunityStats {
  totalCommunities: number;
  totalMembers: number;
  averageSize: number;
  largestCommunitySize: number;
  smallestCommunitySize: number;
  modularity: number;
}

/** デフォルト設定 */
const DEFAULT_CONFIG: CommunityDetectorConfig = {
  algorithm: 'louvain',
  resolution: 1.0,
  minCommunitySize: 1,
};

export class CommunityDetector {
  private readonly config: CommunityDetectorConfig;
  private graph: Graph | null = null;
  private communities: CommunityInfo[] = [];
  private communityMap: Map<string, string> = new Map(); // researcherId -> communityId
  private modularity: number = 0;

  constructor(config: Partial<CommunityDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 共著ネットワークからコミュニティを検出
   */
  detectCommunities(edges: CoauthorEdge[]): CommunityInfo[] {
    if (edges.length === 0) {
      this.communities = [];
      this.communityMap.clear();
      this.modularity = 0;
      return [];
    }

    // グラフを構築
    this.graph = this.buildGraph(edges);

    if (this.graph.order === 0) {
      return [];
    }

    // Louvainアルゴリズムでコミュニティを検出
    const communityAssignments = louvain(this.graph, {
      resolution: this.config.resolution,
      randomWalk: this.config.randomSeed !== undefined,
      getEdgeWeight: 'weight',
    });

    // コミュニティ割り当てを保存
    this.communityMap.clear();
    for (const [nodeId, communityIdx] of Object.entries(communityAssignments)) {
      this.communityMap.set(nodeId, `community-${communityIdx}`);
    }

    // コミュニティ情報を構築
    this.communities = this.buildCommunityInfo(edges);

    // モジュラリティを計算
    this.modularity = this.calculateModularity();

    // 最小サイズでフィルタリング
    const minSize = this.config.minCommunitySize || 1;
    this.communities = this.communities.filter((c) => c.size >= minSize);

    return this.communities;
  }

  /**
   * 研究者が所属するコミュニティを取得
   */
  getCommunity(researcherId: string): CommunityInfo | undefined {
    const communityId = this.communityMap.get(researcherId);
    if (!communityId) {
      return undefined;
    }
    return this.communities.find((c) => c.communityId === communityId);
  }

  /**
   * コミュニティのメンバー一覧を取得
   */
  getCommunityMembers(communityId: string): CommunityMember[] {
    const community = this.communities.find((c) => c.communityId === communityId);
    return community?.members || [];
  }

  /**
   * モジュラリティを取得
   */
  getModularity(): number {
    return this.modularity;
  }

  /**
   * ブリッジ研究者（コミュニティ間を橋渡しする研究者）を特定
   */
  findBridgeResearchers(): BridgeResearcher[] {
    if (this.communities.length <= 1 || !this.graph) {
      return [];
    }

    const bridges: BridgeResearcher[] = [];

    for (const [researcherId, communityId] of this.communityMap) {
      const connectedCommunities = new Set<string>();
      let externalWeight = 0;

      // このノードに接続しているすべてのノードをチェック
      this.graph.forEachNeighbor(researcherId, (neighborId) => {
        const neighborCommunity = this.communityMap.get(neighborId);
        if (neighborCommunity && neighborCommunity !== communityId) {
          connectedCommunities.add(neighborCommunity);
          const edgeKey = [researcherId, neighborId].sort().join('--');
          if (this.graph!.hasEdge(edgeKey)) {
            externalWeight += this.graph!.getEdgeAttribute(edgeKey, 'weight') || 1;
          }
        }
      });

      if (connectedCommunities.size > 0) {
        bridges.push({
          researcherId,
          researcherName: researcherId, // 実際の名前はグラフに保存されている
          communityId,
          connectedCommunities: Array.from(connectedCommunities),
          bridgeScore: externalWeight,
        });
      }
    }

    // ブリッジスコアで降順ソート
    return bridges.sort((a, b) => b.bridgeScore - a.bridgeScore);
  }

  /**
   * コミュニティ統計を取得
   */
  getCommunityStats(): CommunityStats {
    if (this.communities.length === 0) {
      return {
        totalCommunities: 0,
        totalMembers: 0,
        averageSize: 0,
        largestCommunitySize: 0,
        smallestCommunitySize: 0,
        modularity: 0,
      };
    }

    const sizes = this.communities.map((c) => c.size);
    const totalMembers = sizes.reduce((sum, s) => sum + s, 0);

    return {
      totalCommunities: this.communities.length,
      totalMembers,
      averageSize: totalMembers / this.communities.length,
      largestCommunitySize: Math.max(...sizes),
      smallestCommunitySize: Math.min(...sizes),
      modularity: this.modularity,
    };
  }

  /**
   * グラフを構築
   */
  private buildGraph(edges: CoauthorEdge[]): Graph {
    const graph = new Graph({ type: 'undirected', allowSelfLoops: false });

    for (const edge of edges) {
      const { researcher1Id, researcher2Id, researcher1Name, researcher2Name, weight } = edge;

      // 自己ループはスキップ
      if (researcher1Id === researcher2Id) {
        continue;
      }

      // ノードを追加
      if (!graph.hasNode(researcher1Id)) {
        graph.addNode(researcher1Id, { name: researcher1Name });
      }
      if (!graph.hasNode(researcher2Id)) {
        graph.addNode(researcher2Id, { name: researcher2Name });
      }

      // エッジを追加（既存の場合は重みを加算）
      const edgeKey = [researcher1Id, researcher2Id].sort().join('--');
      if (graph.hasEdge(edgeKey)) {
        const currentWeight = graph.getEdgeAttribute(edgeKey, 'weight') || 0;
        graph.setEdgeAttribute(edgeKey, 'weight', currentWeight + (weight || 1));
      } else {
        graph.addEdgeWithKey(edgeKey, researcher1Id, researcher2Id, {
          weight: weight || 1,
        });
      }
    }

    return graph;
  }

  /**
   * コミュニティ情報を構築
   */
  private buildCommunityInfo(edges: CoauthorEdge[]): CommunityInfo[] {
    if (!this.graph) {
      return [];
    }

    // コミュニティIDごとにメンバーをグループ化
    const communityGroups = new Map<string, string[]>();
    for (const [researcherId, communityId] of this.communityMap) {
      if (!communityGroups.has(communityId)) {
        communityGroups.set(communityId, []);
      }
      communityGroups.get(communityId)!.push(researcherId);
    }

    const communities: CommunityInfo[] = [];

    for (const [communityId, memberIds] of communityGroups) {
      // メンバー情報を構築
      const members: CommunityMember[] = memberIds.map((id) => {
        const degree = this.graph!.degree(id);
        // コミュニティ内での中心性（次数を正規化）
        const centralityScore = memberIds.length > 1 ? degree / (memberIds.length - 1) : 1;

        return {
          researcherId: id,
          researcherName: this.graph!.getNodeAttribute(id, 'name') || id,
          degree,
          centralityScore: Math.min(centralityScore, 1),
        };
      });

      // 内部・外部エッジ数を計算
      let internalEdges = 0;
      let externalEdges = 0;
      const memberSet = new Set(memberIds);

      this.graph!.forEachEdge((edgeKey, attributes, source, target) => {
        const sourceInCommunity = memberSet.has(source);
        const targetInCommunity = memberSet.has(target);

        if (sourceInCommunity && targetInCommunity) {
          internalEdges++;
        } else if (sourceInCommunity || targetInCommunity) {
          externalEdges++;
        }
      });

      // 密度を計算
      const n = memberIds.length;
      const maxPossibleEdges = (n * (n - 1)) / 2;
      const density = maxPossibleEdges > 0 ? internalEdges / maxPossibleEdges : 0;

      // ラベルを生成（最も次数の高いメンバーの名前を使用）
      const topMember = members.reduce((a, b) => (a.degree > b.degree ? a : b));
      const label = `${topMember.researcherName} et al.`;

      communities.push({
        communityId,
        label,
        size: memberIds.length,
        members,
        internalEdges,
        externalEdges,
        density,
      });
    }

    // サイズで降順ソート
    return communities.sort((a, b) => b.size - a.size);
  }

  /**
   * モジュラリティを計算（Q値）
   *
   * Q = (1/2m) * Σ[Aij - (ki*kj)/(2m)] * δ(ci, cj)
   */
  private calculateModularity(): number {
    if (!this.graph || this.graph.size === 0) {
      return 0;
    }

    let Q = 0;
    const m = this.graph.size; // 総エッジ数
    const twoM = 2 * m;

    if (m === 0) {
      return 0;
    }

    // 各ノードの次数を取得
    const degrees = new Map<string, number>();
    this.graph.forEachNode((nodeId) => {
      degrees.set(nodeId, this.graph!.degree(nodeId));
    });

    // モジュラリティを計算
    this.graph.forEachEdge((edgeKey, attributes, source, target) => {
      const ci = this.communityMap.get(source);
      const cj = this.communityMap.get(target);

      if (ci === cj) {
        const ki = degrees.get(source) || 0;
        const kj = degrees.get(target) || 0;
        const weight = attributes.weight || 1;

        Q += weight - (ki * kj) / twoM;
      }
    });

    return Q / twoM;
  }
}
