/**
 * InfluenceCalculator
 *
 * @description 研究者の影響力を計算（h-index、PageRank、引用指標）
 * @since v4.0.0
 * @see REQ-005-03
 */

import type { CoauthorEdge, ResearcherMetrics } from '@yagokoro/domain';
import Graph from 'graphology';
import pagerankModule from 'graphology-metrics/centrality/pagerank.js';

// ESM/CJS互換のためのインポート処理
const pagerank = typeof pagerankModule === 'function'
  ? pagerankModule
  : (pagerankModule as { default: typeof pagerankModule }).default;

/** 論文の引用情報 */
export interface PaperCitation {
  paperId: string;
  citations: number;
}

/** 研究者の引用データ */
export interface ResearcherCitations {
  researcherId: string;
  papers: PaperCitation[];
}

/** 影響力計算の設定 */
export interface InfluenceCalculatorConfig {
  /** PageRankのダンピングファクター（0-1、デフォルト: 0.85） */
  pageRankDamping: number;
  /** PageRankの最大反復回数 */
  pageRankIterations: number;
  /** PageRankの収束閾値 */
  pageRankTolerance: number;
  /** 影響度スコアの重み付け */
  influenceWeights?: {
    hIndex: number;
    citations: number;
    pageRank: number;
    i10Index: number;
  };
}

/** 影響力計算結果 */
export interface InfluenceResult {
  researcherId: string;
  metrics: ResearcherMetrics;
  influenceScore: number;
  rank: number;
}

/** ランキングオプション */
export interface RankingOptions {
  /** 結果の最大数 */
  limit?: number;
  /** 最小h-index */
  minHIndex?: number;
  /** 最小引用数 */
  minCitations?: number;
}

/** デフォルト設定 */
const DEFAULT_CONFIG: InfluenceCalculatorConfig = {
  pageRankDamping: 0.85,
  pageRankIterations: 100,
  pageRankTolerance: 1e-6,
  influenceWeights: {
    hIndex: 0.35,
    citations: 0.25,
    pageRank: 0.25,
    i10Index: 0.15,
  },
};

/** 正規化のための参照値 */
const NORMALIZATION_REFS = {
  maxHIndex: 100,
  maxCitations: 100000,
  maxI10Index: 200,
};

export class InfluenceCalculator {
  private readonly config: InfluenceCalculatorConfig;

  constructor(config: Partial<InfluenceCalculatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * h-indexを計算
   *
   * h-index: h本の論文がそれぞれh回以上引用されている最大のh
   */
  calculateHIndex(citations: ResearcherCitations): number {
    const { papers } = citations;

    if (papers.length === 0) {
      return 0;
    }

    // 引用数で降順ソート（負の値は0として扱う）
    const sortedCitations = papers
      .map((p) => Math.max(0, p.citations))
      .sort((a, b) => b - a);

    let hIndex = 0;

    for (let i = 0; i < sortedCitations.length; i++) {
      const citations = sortedCitations[i]!;
      const rank = i + 1;

      if (citations >= rank) {
        hIndex = rank;
      } else {
        break;
      }
    }

    return hIndex;
  }

  /**
   * i10-indexを計算
   *
   * i10-index: 10回以上引用された論文の数
   */
  calculateI10Index(citations: ResearcherCitations): number {
    return citations.papers.filter((p) => p.citations >= 10).length;
  }

  /**
   * 総引用数を計算
   */
  calculateTotalCitations(citations: ResearcherCitations): number {
    return citations.papers.reduce(
      (sum, p) => sum + Math.max(0, p.citations),
      0,
    );
  }

  /**
   * 共著ネットワークからPageRankを計算
   */
  calculatePageRank(edges: CoauthorEdge[]): Map<string, number> {
    if (edges.length === 0) {
      return new Map();
    }

    // グラフを構築
    const graph = new Graph({ type: 'undirected', allowSelfLoops: false });

    for (const edge of edges) {
      const { researcher1Id, researcher2Id, weight } = edge;

      // 自己ループはスキップ
      if (researcher1Id === researcher2Id) {
        continue;
      }

      // ノードを追加
      if (!graph.hasNode(researcher1Id)) {
        graph.addNode(researcher1Id);
      }
      if (!graph.hasNode(researcher2Id)) {
        graph.addNode(researcher2Id);
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

    // PageRankを計算
    const scores = pagerank(graph, {
      alpha: this.config.pageRankDamping,
      maxIterations: this.config.pageRankIterations,
      tolerance: this.config.pageRankTolerance,
      getEdgeWeight: 'weight',
    });

    return new Map(Object.entries(scores));
  }

  /**
   * 研究者のメトリクスを計算
   */
  calculateMetrics(
    citations: ResearcherCitations,
    edges: CoauthorEdge[],
  ): ResearcherMetrics {
    const hIndex = this.calculateHIndex(citations);
    const i10Index = this.calculateI10Index(citations);
    const citationCount = this.calculateTotalCitations(citations);
    const paperCount = citations.papers.length;

    // 共著者数を計算
    const coauthorIds = new Set<string>();
    for (const edge of edges) {
      if (edge.researcher1Id === citations.researcherId) {
        coauthorIds.add(edge.researcher2Id);
      } else if (edge.researcher2Id === citations.researcherId) {
        coauthorIds.add(edge.researcher1Id);
      }
    }
    const coauthorCount = coauthorIds.size;

    // PageRankを計算
    const pageRanks = this.calculatePageRank(edges);
    const pageRank = pageRanks.get(citations.researcherId) || 0;

    // 平均引用数
    const avgCitationsPerPaper =
      paperCount > 0 ? citationCount / paperCount : 0;

    return {
      hIndex,
      i10Index,
      citationCount,
      paperCount,
      coauthorCount,
      pageRank,
      avgCitationsPerPaper,
      updatedAt: new Date(),
    };
  }

  /**
   * 影響度スコアを計算（0-1の範囲）
   *
   * 各指標を正規化して重み付け平均を取る
   */
  calculateInfluenceScore(metrics: ResearcherMetrics): number {
    const weights = this.config.influenceWeights!;

    // すべてが0の場合は0を返す
    if (
      metrics.hIndex === 0 &&
      metrics.citationCount === 0 &&
      metrics.pageRank === 0
    ) {
      return 0;
    }

    // 各指標を0-1に正規化
    const normalizedHIndex = Math.min(
      metrics.hIndex / NORMALIZATION_REFS.maxHIndex,
      1,
    );
    const normalizedCitations = Math.min(
      metrics.citationCount / NORMALIZATION_REFS.maxCitations,
      1,
    );
    const normalizedI10 = Math.min(
      (metrics.i10Index || 0) / NORMALIZATION_REFS.maxI10Index,
      1,
    );
    // PageRankは既に0-1の範囲（合計が1になるように正規化済み）
    // ただし、ネットワーク内での相対的な重要度を反映させるため10倍にスケーリング
    const normalizedPageRank = Math.min(metrics.pageRank * 10, 1);

    // 重み付け平均
    const score =
      normalizedHIndex * weights.hIndex +
      normalizedCitations * weights.citations +
      normalizedPageRank * weights.pageRank +
      normalizedI10 * weights.i10Index;

    return Math.min(score, 1);
  }

  /**
   * 研究者をランキング
   */
  rankResearchers(
    researchers: Array<{
      researcherId: string;
      citations: ResearcherCitations;
      edges: CoauthorEdge[];
    }>,
    options: RankingOptions = {},
  ): InfluenceResult[] {
    const { limit, minHIndex, minCitations } = options;

    // 各研究者のメトリクスと影響度を計算
    const results: InfluenceResult[] = [];

    for (const { researcherId, citations, edges } of researchers) {
      const metrics = this.calculateMetrics(citations, edges);

      // フィルタリング
      if (minHIndex !== undefined && metrics.hIndex < minHIndex) {
        continue;
      }
      if (minCitations !== undefined && metrics.citationCount < minCitations) {
        continue;
      }

      const influenceScore = this.calculateInfluenceScore(metrics);

      results.push({
        researcherId,
        metrics,
        influenceScore,
        rank: 0, // 後でセット
      });
    }

    // 影響度でソート
    results.sort((a, b) => b.influenceScore - a.influenceScore);

    // ランクを割り当て
    for (let i = 0; i < results.length; i++) {
      results[i]!.rank = i + 1;
    }

    // limitがあれば適用
    if (limit !== undefined && limit > 0) {
      return results.slice(0, limit);
    }

    return results;
  }
}
