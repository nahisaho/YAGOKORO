/**
 * ResearcherService - 研究者分析サービスファサード
 *
 * @description 研究者ネットワーク分析の統合APIを提供
 * @since v4.0.0
 * @see REQ-005-06, REQ-005-08
 */

import { CoauthorExtractor, type Paper as CoauthorPaper, type ExtractedResearcher, type CoauthorNetwork } from './CoauthorExtractor.js';
import { AffiliationTracker } from './AffiliationTracker.js';
import { InfluenceCalculator, type PaperCitation } from './InfluenceCalculator.js';
import { CommunityDetector, type CommunityInfo } from './CommunityDetector.js';
import { CareerAnalyzer, type CareerTimeline, type PaperMetadata, type CareerPrediction } from './CareerAnalyzer.js';
import type { CoauthorEdge } from '@yagokoro/domain';

/**
 * ファサード用Paper型（テストとの互換性のため）
 */
export interface Paper {
  id: string;
  title: string;
  authors: Array<{
    name: string;
    orcid?: string;
    affiliation?: string;
    affiliations?: string[];
  }>;
  publishedDate: Date;
}

/**
 * ResearcherService設定
 */
export interface ResearcherServiceConfig {
  /** ORCIDインテグレーション有効化 */
  enableORCID?: boolean;
  /** コミュニティ検出有効化 */
  enableCommunityDetection?: boolean;
  /** Louvainアルゴリズムの解像度パラメータ */
  defaultResolution?: number;
  /** ORCID APIトークン */
  orcidAccessToken?: string;
}

/**
 * 研究者検索オプション
 */
export interface ResearcherSearchOptions {
  /** 名前クエリ（部分一致） */
  nameQuery?: string;
  /** 所属フィルタ */
  affiliation?: string;
  /** 最小共著者数 */
  minCoauthors?: number;
  /** 結果の最大数 */
  limit?: number;
}

/**
 * 研究者詳細情報
 */
export interface ResearcherDetails {
  /** 研究者ID（ORCIDまたは内部ID） */
  id: string;
  /** 名前 */
  name: string;
  /** 所属機関 */
  affiliation?: string;
  /** ORCID */
  orcid?: string;
  /** 共著論文数 */
  paperCount: number;
  /** 共著者数 */
  coauthorCount: number;
  /** コミュニティID */
  communityId?: number;
  /** 影響度スコア */
  influenceScore?: number;
}

/**
 * 影響度ランキングオプション
 */
export interface InfluenceRankingOptions {
  /** 結果の最大数 */
  limit?: number;
  /** コミュニティIDでフィルタ */
  communityId?: number;
}

/**
 * 影響度ランキング項目
 */
export interface InfluenceRankingItem {
  /** 研究者ID */
  id: string;
  /** 名前 */
  name: string;
  /** 影響度スコア */
  influenceScore: number;
  /** h-index */
  hIndex: number;
  /** PageRank */
  pageRank: number;
}

/**
 * ネットワーク統計
 */
export interface NetworkStats {
  /** 研究者総数 */
  totalResearchers: number;
  /** エッジ総数（共著関係） */
  totalEdges: number;
  /** 論文総数 */
  totalPapers: number;
  /** 平均次数 */
  averageDegree: number;
  /** コミュニティ数 */
  communityCount: number;
}

/**
 * インデックス結果
 */
export interface IndexResult {
  /** 論文総数 */
  totalPapers: number;
  /** 研究者総数 */
  totalResearchers: number;
  /** エッジ総数 */
  totalEdges: number;
}

/**
 * グラフエクスポートデータ
 */
export interface GraphExport {
  nodes: Array<{
    id: string;
    name: string;
    affiliation?: string;
    communityId?: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight: number;
  }>;
}

/**
 * 研究者引用データ
 */
export interface ResearcherCitations {
  researcherId: string;
  citations: PaperCitation[];
}

/**
 * 研究者ネットワーク分析サービス
 *
 * @description 共著者抽出、所属追跡、影響度計算、コミュニティ検出、キャリア分析を統合
 */
export class ResearcherService {
  private readonly config: Required<ResearcherServiceConfig>;
  private readonly coauthorExtractor: CoauthorExtractor;
  private readonly affiliationTracker: AffiliationTracker;
  private readonly influenceCalculator: InfluenceCalculator;
  private readonly communityDetector: CommunityDetector;
  private readonly careerAnalyzer: CareerAnalyzer;

  // Internal data stores
  private researchers: Map<string, ResearcherDetails> = new Map();
  private coauthorMap: Map<string, Set<string>> = new Map();
  private edges: CoauthorEdge[] = [];
  private citations: Map<string, PaperCitation[]> = new Map();
  private paperMetadata: Map<string, PaperMetadata[]> = new Map();
  private papers: Paper[] = [];
  private communitiesDetected: boolean = false;
  private detectedCommunities: CommunityInfo[] = [];

  constructor(config: ResearcherServiceConfig = {}) {
    this.config = {
      enableORCID: config.enableORCID ?? false,
      enableCommunityDetection: config.enableCommunityDetection ?? true,
      defaultResolution: config.defaultResolution ?? 1.0,
      orcidAccessToken: config.orcidAccessToken ?? '',
    };

    this.coauthorExtractor = new CoauthorExtractor();
    this.affiliationTracker = new AffiliationTracker();
    this.influenceCalculator = new InfluenceCalculator();
    this.communityDetector = new CommunityDetector({
      resolution: this.config.defaultResolution,
    });
    this.careerAnalyzer = new CareerAnalyzer();
  }

  /**
   * 論文データをインデックス化
   *
   * @param papers - 論文リスト
   * @returns インデックス結果
   */
  async indexPapers(papers: Paper[]): Promise<IndexResult> {
    if (papers.length === 0) {
      return { totalPapers: 0, totalResearchers: 0, totalEdges: 0 };
    }

    this.papers = papers;

    // Paper型を変換してCoauthorExtractorに渡す
    const coauthorPapers: CoauthorPaper[] = papers.map(p => ({
      id: p.id,
      title: p.title,
      authors: p.authors.map(a => ({
        name: a.name,
        orcid: a.orcid,
        affiliations: a.affiliation ? [a.affiliation] : a.affiliations,
      })),
      publishedAt: p.publishedDate,
    }));

    // 共著者ネットワークを構築
    const network = this.coauthorExtractor.buildCoauthorNetwork(coauthorPapers);
    this.edges = network.edges;

    // 研究者マップを構築
    this.researchers.clear();
    this.coauthorMap.clear();

    for (const researcher of network.researchers) {
      this.researchers.set(researcher.id, {
        id: researcher.id,
        name: researcher.name,
        affiliation: researcher.affiliations[0],
        orcid: researcher.orcid,
        paperCount: researcher.paperCount,
        coauthorCount: 0, // 後で計算
      });
    }

    // 共著者マップを構築
    for (const edge of network.edges) {
      // researcher1 -> researcher2
      if (!this.coauthorMap.has(edge.researcher1Id)) {
        this.coauthorMap.set(edge.researcher1Id, new Set());
      }
      this.coauthorMap.get(edge.researcher1Id)!.add(edge.researcher2Id);

      // researcher2 -> researcher1
      if (!this.coauthorMap.has(edge.researcher2Id)) {
        this.coauthorMap.set(edge.researcher2Id, new Set());
      }
      this.coauthorMap.get(edge.researcher2Id)!.add(edge.researcher1Id);
    }

    // 共著者数を更新
    for (const [researcherId, coauthors] of this.coauthorMap) {
      const researcher = this.researchers.get(researcherId);
      if (researcher) {
        researcher.coauthorCount = coauthors.size;
      }
    }

    // 所属履歴を追跡
    for (const paper of papers) {
      for (const author of paper.authors) {
        const authorId = author.orcid ?? this.generateAuthorId(author.name);
        if (author.affiliation) {
          this.affiliationTracker.trackAffiliation(authorId, {
            organization: author.affiliation,
            startDate: paper.publishedDate,
            isPrimary: true,
          });
        }
      }
    }

    // コミュニティ検出
    this.communitiesDetected = false;
    if (this.config.enableCommunityDetection && this.edges.length > 0) {
      this.detectAndAssignCommunities();
    }

    // 影響度計算（ネットワーク構造ベース）
    this.calculateNetworkInfluence();

    return {
      totalPapers: papers.length,
      totalResearchers: this.researchers.size,
      totalEdges: this.edges.length,
    };
  }

  /**
   * 研究者IDで詳細を取得
   *
   * @param researcherId - 研究者ID
   * @returns 研究者詳細（存在しない場合はundefined）
   */
  getResearcher(researcherId: string): ResearcherDetails | undefined {
    return this.researchers.get(researcherId);
  }

  /**
   * 研究者の共著者リストを取得
   *
   * @param researcherId - 研究者ID
   * @returns 共著者リスト
   */
  getCoauthors(researcherId: string): ResearcherDetails[] {
    const coauthorIds = this.coauthorMap.get(researcherId) ?? new Set();
    return Array.from(coauthorIds)
      .map(id => this.researchers.get(id))
      .filter((r): r is ResearcherDetails => r !== undefined);
  }

  /**
   * 2人の研究者間の最短共著パスを探索（BFS）
   *
   * @param fromId - 開始研究者ID
   * @param toId - 終了研究者ID
   * @returns パス（研究者IDの配列）またはnull
   */
  findPath(fromId: string, toId: string): string[] | null {
    if (!this.researchers.has(fromId) || !this.researchers.has(toId)) {
      return null;
    }
    if (fromId === toId) {
      return [fromId];
    }

    // BFS
    const visited = new Set<string>([fromId]);
    const queue: Array<{ id: string; path: string[] }> = [{ id: fromId, path: [fromId] }];

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;
      const neighbors = this.coauthorMap.get(id) ?? new Set();

      for (const neighbor of neighbors) {
        if (neighbor === toId) {
          return [...path, neighbor];
        }
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ id: neighbor, path: [...path, neighbor] });
        }
      }
    }

    return null;
  }

  /**
   * 研究者を検索
   *
   * @param options - 検索オプション
   * @returns マッチした研究者リスト
   */
  searchResearchers(options: ResearcherSearchOptions = {}): ResearcherDetails[] {
    let results = Array.from(this.researchers.values());

    // 名前でフィルタ
    if (options.nameQuery) {
      const query = options.nameQuery.toLowerCase();
      results = results.filter(r => r.name.toLowerCase().includes(query));
    }

    // 所属でフィルタ
    if (options.affiliation) {
      const affiliationQuery = options.affiliation.toLowerCase();
      results = results.filter(r =>
        r.affiliation?.toLowerCase().includes(affiliationQuery)
      );
    }

    // 最小共著者数でフィルタ
    if (options.minCoauthors !== undefined) {
      results = results.filter(r => r.coauthorCount >= options.minCoauthors!);
    }

    // 結果数を制限
    if (options.limit !== undefined) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * コミュニティリストを取得
   *
   * @returns コミュニティ情報リスト
   */
  getCommunities(): CommunityInfo[] {
    if (!this.config.enableCommunityDetection || !this.communitiesDetected) {
      return [];
    }

    return this.detectedCommunities;
  }

  /**
   * 影響度ランキングを取得
   *
   * @param options - ランキングオプション
   * @returns ランキングリスト
   */
  getInfluenceRanking(options: InfluenceRankingOptions = {}): InfluenceRankingItem[] {
    // 引用データがある研究者の影響度を計算
    const rankings: InfluenceRankingItem[] = [];

    for (const [researcherId, researcher] of this.researchers) {
      const citations = this.citations.get(researcherId) ?? [];
      
      // 引用データがある場合のみ計算
      // calculateHIndex expects { papers: [...] } format
      const hIndex = citations.length > 0
        ? this.influenceCalculator.calculateHIndex({ papers: citations })
        : 0;

      // PageRankはネットワーク構造から計算
      const pageRank = researcher.influenceScore ?? 0;

      // 総合スコア
      const influenceScore = this.calculateCombinedInfluence(hIndex, pageRank);

      rankings.push({
        id: researcherId,
        name: researcher.name,
        influenceScore,
        hIndex,
        pageRank,
      });
    }

    // コミュニティでフィルタ
    let filtered = rankings;
    if (options.communityId !== undefined) {
      filtered = rankings.filter(r => {
        const researcher = this.researchers.get(r.id);
        return researcher?.communityId === options.communityId;
      });
    }

    // スコアでソート
    filtered.sort((a, b) => b.influenceScore - a.influenceScore);

    // 結果数を制限
    if (options.limit !== undefined) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * 研究者の引用データを設定
   *
   * @param researcherId - 研究者ID
   * @param citations - 引用データリスト
   */
  setCitations(researcherId: string, citations: PaperCitation[]): void {
    this.citations.set(researcherId, citations);
  }

  /**
   * ネットワーク統計を取得
   *
   * @returns ネットワーク統計情報
   */
  getNetworkStats(): NetworkStats {
    const totalResearchers = this.researchers.size;

    // 平均次数の計算
    let totalDegree = 0;
    for (const researcher of this.researchers.values()) {
      totalDegree += researcher.coauthorCount;
    }
    const averageDegree = totalResearchers > 0 ? totalDegree / totalResearchers : 0;

    return {
      totalResearchers,
      totalEdges: this.edges.length,
      totalPapers: this.papers.length,
      averageDegree,
      communityCount: this.getCommunities().length,
    };
  }

  /**
   * ネットワークをグラフ形式でエクスポート
   *
   * @returns グラフデータ
   */
  exportToGraph(): GraphExport {
    const nodes = Array.from(this.researchers.values()).map(r => ({
      id: r.id,
      name: r.name,
      affiliation: r.affiliation,
      communityId: r.communityId,
    }));

    const edges = this.edges.map(e => ({
      source: e.researcher1Id,
      target: e.researcher2Id,
      weight: e.weight,
    }));

    return { nodes, edges };
  }

  /**
   * 研究者のキャリアを分析
   *
   * @param researcherId - 研究者ID
   * @returns キャリアタイムライン
   */
  analyzeCareer(researcherId: string): CareerTimeline | null {
    const researcher = this.researchers.get(researcherId);
    if (!researcher) {
      return null;
    }

    const papers = this.paperMetadata.get(researcherId) ?? [];
    const affiliationHistory = this.affiliationTracker.getHistory(researcherId);

    return this.careerAnalyzer.analyzeCareer({
      researcherId,
      papers,
      affiliationHistory: affiliationHistory.map(h => ({
        affiliation: h.affiliation,
        startDate: h.timestamp,
      })),
    });
  }

  /**
   * キャリア予測を取得
   *
   * @param researcherId - 研究者ID
   * @returns キャリア予測
   */
  predictCareer(researcherId: string): CareerPrediction | null {
    const timeline = this.analyzeCareer(researcherId);
    if (!timeline) {
      return null;
    }

    const papers = this.paperMetadata.get(researcherId) ?? [];
    return this.careerAnalyzer.predictCareerTrajectory(papers, timeline);
  }

  /**
   * 研究者のペーパーメタデータを設定
   *
   * @param researcherId - 研究者ID
   * @param papers - ペーパーメタデータリスト
   */
  setPaperMetadata(researcherId: string, papers: PaperMetadata[]): void {
    this.paperMetadata.set(researcherId, papers);
  }

  /**
   * インデックスされたすべてのデータをクリア
   */
  clear(): void {
    // AffiliationTrackerとCommunityDetectorは新しいインスタンスで再利用
    // ResearcherServiceの内部状態のみクリア
    this.researchers.clear();
    this.coauthorMap.clear();
    this.edges = [];
    this.citations.clear();
    this.paperMetadata.clear();
    this.papers = [];
    this.communitiesDetected = false;
    this.detectedCommunities = [];
  }

  /**
   * 著者名からIDを生成
   */
  private generateAuthorId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * コミュニティを検出して研究者に割り当て
   */
  private detectAndAssignCommunities(): void {
    if (this.researchers.size === 0 || this.edges.length === 0) {
      return;
    }

    // コミュニティを検出
    this.detectedCommunities = this.communityDetector.detectCommunities(this.edges);
    this.communitiesDetected = true;

    // 研究者にコミュニティIDを割り当て
    for (const [researcherId, researcher] of this.researchers) {
      const community = this.communityDetector.getCommunity(researcherId);
      if (community) {
        // communityId は "community-N" 形式の文字列
        const numericId = parseInt(community.communityId.replace('community-', ''), 10);
        researcher.communityId = isNaN(numericId) ? 0 : numericId;
      }
    }
  }

  /**
   * ネットワーク構造に基づく影響度を計算
   */
  private calculateNetworkInfluence(): void {
    if (this.researchers.size === 0 || this.edges.length === 0) {
      return;
    }

    // PageRankを計算
    const pageRanks = this.influenceCalculator.calculatePageRank(this.edges);

    // 影響度スコアを割り当て
    for (const [researcherId, pageRank] of pageRanks) {
      const researcher = this.researchers.get(researcherId);
      if (researcher) {
        researcher.influenceScore = pageRank;
      }
    }
  }

  /**
   * h-indexとPageRankから総合影響度を計算
   */
  private calculateCombinedInfluence(hIndex: number, pageRank: number): number {
    // 重み付け平均: h-indexを主要指標として使用
    // pageRankはネットワーク中心性を反映
    const normalizedHIndex = Math.min(hIndex / 100, 1.0);
    const normalizedPageRank = pageRank;

    return normalizedHIndex * 0.7 + normalizedPageRank * 0.3;
  }
}
