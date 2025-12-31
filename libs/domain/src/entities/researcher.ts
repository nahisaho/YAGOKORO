/**
 * Researcher Domain Types for YAGOKORO v4.0.0
 *
 * @description 研究者ネットワーク分析機能のためのドメイン型定義
 * @since v4.0.0
 * @see REQ-005-01 to REQ-005-08
 */

/**
 * 所属情報
 * @description 研究者の所属機関情報
 */
export interface Affiliation {
  /** 機関名 */
  organization: string;
  /** 部門・研究室（オプション） */
  department?: string;
  /** 役職（オプション） */
  position?: string;
  /** 所属開始日 */
  startDate?: Date;
  /** 所属終了日（現在の場合はundefined） */
  endDate?: Date;
  /** 主要所属かどうか */
  isPrimary: boolean;
}

/**
 * 研究者メトリクス
 * @description 研究者の影響力指標
 * @see REQ-005-03
 */
export interface ResearcherMetrics {
  /** h-index */
  hIndex: number;
  /** 総引用数 */
  citationCount: number;
  /** 論文数 */
  paperCount: number;
  /** 共著者数 */
  coauthorCount: number;
  /** PageRankスコア */
  pageRank: number;
  /** i10-index（10回以上引用された論文数） */
  i10Index?: number;
  /** 平均引用数/論文 */
  avgCitationsPerPaper?: number;
  /** 最終更新日 */
  updatedAt: Date;
}

/**
 * 研究者プロファイル
 * @description 研究者の詳細情報
 * @see REQ-005-07
 */
export interface ResearcherProfile {
  /** 内部ID */
  id: string;
  /** 表示名 */
  name: string;
  /** 正規化名（検索用） */
  normalizedName: string;
  /** ORCID（オプション） */
  orcid?: string;
  /** Google Scholar ID（オプション） */
  googleScholarId?: string;
  /** Semantic Scholar ID（オプション） */
  semanticScholarId?: string;
  /** 所属履歴 */
  affiliations: Affiliation[];
  /** 現在の主要所属 */
  currentAffiliation?: Affiliation;
  /** 影響力メトリクス */
  metrics: ResearcherMetrics;
  /** 所属コミュニティID */
  communities: string[];
  /** 主要研究分野 */
  researchFields: string[];
  /** プロファイル最終更新日 */
  updatedAt: Date;
  /** ORCID検証済みかどうか */
  isVerified: boolean;
}

/**
 * 共著エッジ
 * @description 2人の研究者間の共著関係
 * @see REQ-005-01, REQ-005-05
 */
export interface CoauthorEdge {
  /** 研究者1のID */
  researcher1Id: string;
  /** 研究者1の名前 */
  researcher1Name: string;
  /** 研究者2のID */
  researcher2Id: string;
  /** 研究者2の名前 */
  researcher2Name: string;
  /** 共著論文数 */
  paperCount: number;
  /** 共著論文ID */
  paperIds: string[];
  /** 最初の共著日 */
  firstCollaboration: Date;
  /** 最新の共著日 */
  lastCollaboration: Date;
  /** エッジ重み（共著頻度×最新性） */
  weight: number;
}

/**
 * 研究者コミュニティ
 * @description Leiden/Louvainで検出されたコミュニティ
 * @see REQ-005-04
 */
export interface ResearcherCommunity {
  /** コミュニティID */
  id: string;
  /** コミュニティ名（自動または手動命名） */
  name: string;
  /** 主要研究分野 */
  field: string;
  /** メンバーID */
  members: string[];
  /** コアメンバーID（高影響力） */
  coreMembers: string[];
  /** メンバー数 */
  size: number;
  /** モジュラリティスコア */
  modularity: number;
  /** 平均影響力スコア */
  avgInfluence: number;
  /** 検出日 */
  detectedAt: Date;
  /** 検出アルゴリズム */
  algorithm: 'leiden' | 'louvain';
  /** resolution パラメータ */
  resolution: number;
}

/**
 * 研究者パス
 * @description 2人の研究者間の最短パス
 * @see REQ-005-06
 */
export interface ResearcherPath {
  /** 起点研究者ID */
  fromId: string;
  /** 起点研究者名 */
  fromName: string;
  /** 終点研究者ID */
  toId: string;
  /** 終点研究者名 */
  toName: string;
  /** パス長（ホップ数） */
  length: number;
  /** パス上の研究者 */
  path: {
    researcherId: string;
    researcherName: string;
    affiliations: string[];
  }[];
  /** パス上のエッジ（共著関係） */
  edges: CoauthorEdge[];
  /** パス発見日 */
  foundAt: Date;
}

/**
 * 研究者ランキングエントリ
 * @description ランキング内の研究者情報
 * @see REQ-005-08
 */
export interface ResearcherRankEntry {
  /** ランク */
  rank: number;
  /** 研究者ID */
  researcherId: string;
  /** 研究者名 */
  researcherName: string;
  /** 現在の所属 */
  affiliation?: string;
  /** ランキング対象メトリクス */
  metric: 'hIndex' | 'citations' | 'pageRank' | 'papers' | 'influence';
  /** メトリクス値 */
  metricValue: number;
  /** 前回からの変動 */
  change?: number;
}

/**
 * 研究者同定結果
 * @description 名寄せ処理の結果
 * @see ADR-002
 */
export interface ResearcherMatchResult {
  /** マッチした研究者ID（null=新規） */
  matchedId: string | null;
  /** マッチ信頼度 */
  confidence: number;
  /** マッチ方法 */
  matchMethod: 'orcid' | 'similarity' | 'hitl' | 'new';
  /** 候補リスト（similarity matchの場合） */
  candidates?: {
    researcherId: string;
    researcherName: string;
    similarity: number;
  }[];
  /** HITLレビューが必要かどうか */
  needsReview: boolean;
}

/**
 * キャリア推移エントリ
 * @description 研究者のキャリア変遷
 */
export interface CareerEntry {
  /** 年 */
  year: number;
  /** 所属機関 */
  affiliation: Affiliation;
  /** その年の論文数 */
  paperCount: number;
  /** その年の引用数増加 */
  citationGain: number;
  /** その時点のh-index */
  hIndex: number;
  /** 主要共著者 */
  topCoauthors: string[];
}

/**
 * 研究者クエリオプション
 */
export interface ResearcherQueryOptions {
  /** 所属機関フィルター */
  affiliations?: string[];
  /** 研究分野フィルター */
  fields?: string[];
  /** 最小h-index */
  minHIndex?: number;
  /** 最小論文数 */
  minPapers?: number;
  /** コミュニティIDフィルター */
  communityId?: string;
  /** ソート順 */
  sortBy?: 'hIndex' | 'citations' | 'pageRank' | 'papers' | 'name';
  /** ソート方向 */
  sortOrder?: 'asc' | 'desc';
  /** 取得件数上限 */
  limit?: number;
  /** オフセット */
  offset?: number;
}

/**
 * 共著ネットワーククエリオプション
 */
export interface CoauthorNetworkOptions {
  /** 探索深度（ホップ数） */
  depth: number;
  /** 最小共著論文数 */
  minPapers: number;
  /** 最小エッジ重み */
  minWeight?: number;
  /** ノード数上限 */
  maxNodes?: number;
}

/**
 * 名前正規化
 * @description 研究者名を正規化（検索・マッチング用）
 * @param name 元の名前
 * @returns 正規化された名前
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // アクセント記号除去
    .replace(/[^a-z0-9\s]/g, '') // 英数字とスペース以外除去
    .replace(/\s+/g, ' ') // 連続スペースを1つに
    .trim();
}

/**
 * 共著エッジの重みを計算
 * @description paperCount × recencyFactor
 * @param paperCount 共著論文数
 * @param lastCollaboration 最終共著日
 * @returns エッジ重み
 * @see REQ-005-05
 */
export function calculateCoauthorWeight(
  paperCount: number,
  lastCollaboration: Date,
): number {
  const daysSinceLastCollab = Math.floor(
    (Date.now() - lastCollaboration.getTime()) / (1000 * 60 * 60 * 24),
  );
  const recencyFactor = 1 / (1 + daysSinceLastCollab / 365);
  return paperCount * recencyFactor;
}

/**
 * 類似度スコアを計算（名寄せ用）
 * @description ADR-002 の 3段階名寄せパイプライン用
 * @param author1 著者1の情報
 * @param author2 著者2の情報
 * @returns 類似度スコア（0-1）
 */
export function calculateAuthorSimilarity(
  author1: { name: string; affiliations: string[]; coauthors: string[] },
  author2: { name: string; affiliations: string[]; coauthors: string[] },
): number {
  // 名前類似度（Levenshtein距離ベース）
  const nameScore = calculateNameSimilarity(author1.name, author2.name);

  // 所属類似度（Jaccard係数）
  const affiliationScore = jaccardSimilarity(author1.affiliations, author2.affiliations);

  // 共著者類似度（Jaccard係数）
  const coauthorScore = jaccardSimilarity(author1.coauthors, author2.coauthors);

  // 重み付け（ADR-002準拠）
  return nameScore * 0.4 + affiliationScore * 0.3 + coauthorScore * 0.3;
}

/**
 * 名前の類似度を計算
 * @param name1 名前1
 * @param name2 名前2
 * @returns 類似度（0-1）
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  const normalized1 = normalizeName(name1);
  const normalized2 = normalizeName(name2);

  if (normalized1 === normalized2) return 1.0;

  // Levenshtein距離ベースの類似度
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);

  if (maxLength === 0) return 1.0;
  return 1 - distance / maxLength;
}

/**
 * Levenshtein距離を計算
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = [];

  // Initialize 2D array
  for (let i = 0; i <= m; i++) {
    dp[i] = [];
    for (let j = 0; j <= n; j++) {
      dp[i]![j] = 0;
    }
  }

  // Base cases
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  // Fill DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!;
      } else {
        dp[i]![j] = 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
      }
    }
  }

  return dp[m]![n]!;
}

/**
 * Jaccard類似度を計算
 */
function jaccardSimilarity(set1: string[], set2: string[]): number {
  if (set1.length === 0 && set2.length === 0) return 1.0;
  if (set1.length === 0 || set2.length === 0) return 0.0;

  const s1 = new Set(set1.map((s) => s.toLowerCase()));
  const s2 = new Set(set2.map((s) => s.toLowerCase()));

  const intersection = new Set([...s1].filter((x) => s2.has(x)));
  const union = new Set([...s1, ...s2]);

  return intersection.size / union.size;
}

/**
 * 名寄せ閾値判定
 * @description ADR-002 の閾値に基づく判定
 * @param similarity 類似度スコア
 * @returns 判定結果
 */
export function determineMatchAction(
  similarity: number,
): 'auto_approve' | 'hitl_review' | 'auto_reject' {
  if (similarity >= 0.8) return 'auto_approve';
  if (similarity >= 0.5) return 'hitl_review';
  return 'auto_reject';
}
