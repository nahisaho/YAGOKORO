/**
 * CareerAnalyzer
 *
 * @description 研究者キャリアの分析（所属履歴、マイルストーン、トレンド）
 * @since v4.0.0
 * @see REQ-005-02
 */

import type { AffiliationTimeline, AffiliationTimelineEntry } from './AffiliationTracker.js';
import type { ResearcherCitations } from './InfluenceCalculator.js';

/** キャリア分析設定 */
export interface CareerAnalyzerConfig {
  /** 初期キャリア期間（年） */
  earlyCareerYears: number;
  /** 中堅キャリア期間（年） */
  midCareerYears: number;
  /** シニアキャリア期間（年） */
  seniorCareerYears: number;
  /** 高引用論文の閾値 */
  highCitationThreshold?: number;
}

/** キャリアフェーズ */
export type CareerPhase = 'early' | 'mid' | 'senior' | 'emeritus';

/** キャリアマイルストーンの種類 */
export type MilestoneType =
  | 'first_publication'
  | 'h_index_10'
  | 'h_index_20'
  | 'h_index_50'
  | 'high_citation_paper'
  | 'career_change'
  | 'tenure'
  | 'promotion';

/** キャリアマイルストーン */
export interface CareerMilestone {
  type: MilestoneType;
  date?: Date;
  description: string;
  details?: Record<string, any>;
}

/** キャリア遷移 */
export interface CareerTransition {
  fromOrganization: string;
  toOrganization: string;
  date: Date;
  type: 'academia_to_industry' | 'industry_to_academia' | 'academia_to_academia' | 'industry_to_industry';
  duration?: number; // 前職での在籍年数
}

/** 論文メタデータ（マイルストーン検出用） */
export interface PaperMetadata {
  paperId: string;
  publishedDate?: Date;
}

/** 生産性指標 */
export interface ProductivityMetrics {
  totalPapers: number;
  totalCitations: number;
  papersPerYear: number;
  citationsPerYear: number;
  hIndex: number;
  i10Index: number;
}

/** キャリアタイムライン */
export interface CareerTimeline {
  researcherId: string;
  researcherName: string;
  careerStartDate: Date;
  totalYears: number;
  currentPhase: CareerPhase;
  currentOrganization?: string;
  milestones: CareerMilestone[];
  transitions: CareerTransition[];
  productivity: ProductivityMetrics;
}

/** キャリア比較結果 */
export interface CareerComparison {
  experienceDelta: number; // 年数の差
  productivityRatio: number; // 論文/年の比率
  citationRatio: number; // 引用/年の比率
  hIndexDelta: number;
}

/** キャリア予測結果 */
export interface CareerPrediction {
  yearsAhead: number;
  predictedPhase: CareerPhase;
  predictedHIndex: number;
  predictedTotalPapers: number;
  predictedTotalCitations: number;
  confidence: number;
}

/** デフォルト設定 */
const DEFAULT_CONFIG: CareerAnalyzerConfig = {
  earlyCareerYears: 5,
  midCareerYears: 15,
  seniorCareerYears: 25,
  highCitationThreshold: 100,
};

/** 産業界の組織キーワード */
const INDUSTRY_KEYWORDS = [
  'google',
  'microsoft',
  'meta',
  'facebook',
  'amazon',
  'apple',
  'openai',
  'anthropic',
  'deepmind',
  'nvidia',
  'intel',
  'ibm',
  'alibaba',
  'tencent',
  'baidu',
  'huawei',
];

export class CareerAnalyzer {
  private readonly config: CareerAnalyzerConfig;

  constructor(config: Partial<CareerAnalyzerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * キャリアを分析
   */
  analyzeCareer(
    affiliations: AffiliationTimeline,
    citations: ResearcherCitations,
    paperMetadata: PaperMetadata[] = [],
  ): CareerTimeline {
    // キャリア開始日を取得
    const careerStartDate = this.getCareerStartDate(affiliations);
    const totalYears = this.calculateYearsFromDate(careerStartDate);

    // キャリアフェーズを決定
    const currentPhase = this.determinePhase(totalYears);

    // 遷移を検出
    const transitions = this.detectTransitions(affiliations);

    // マイルストーンを検出
    const milestones = this.detectMilestones(citations, careerStartDate, paperMetadata);

    // 生産性を計算
    const productivity = this.calculateProductivity(citations, totalYears);

    return {
      researcherId: affiliations.researcherId,
      researcherName: affiliations.researcherName,
      careerStartDate,
      totalYears,
      currentPhase,
      currentOrganization: affiliations.currentOrganization,
      milestones,
      transitions,
      productivity,
    };
  }

  /**
   * キャリアフェーズを決定
   */
  determinePhase(years: number): CareerPhase {
    if (years <= this.config.earlyCareerYears) {
      return 'early';
    }
    if (years <= this.config.midCareerYears) {
      return 'mid';
    }
    if (years <= this.config.seniorCareerYears) {
      return 'senior';
    }
    return 'emeritus';
  }

  /**
   * マイルストーンを検出
   */
  detectMilestones(
    citations: ResearcherCitations,
    careerStartDate: Date,
    paperMetadata: PaperMetadata[],
  ): CareerMilestone[] {
    const milestones: CareerMilestone[] = [];

    // 最初の出版
    const firstPaper = paperMetadata
      .filter((p) => p.publishedDate)
      .sort((a, b) => a.publishedDate!.getTime() - b.publishedDate!.getTime())[0];

    if (firstPaper?.publishedDate) {
      milestones.push({
        type: 'first_publication',
        date: firstPaper.publishedDate,
        description: 'First academic publication',
        details: { paperId: firstPaper.paperId },
      });
    } else if (citations.papers.length > 0) {
      // メタデータがない場合でも論文があればマイルストーンを追加
      milestones.push({
        type: 'first_publication',
        description: 'First academic publication',
      });
    }

    // 高引用論文
    const threshold = this.config.highCitationThreshold || 100;
    const highCitationPapers = citations.papers.filter((p) => p.citations >= threshold);
    for (const paper of highCitationPapers) {
      const meta = paperMetadata.find((m) => m.paperId === paper.paperId);
      milestones.push({
        type: 'high_citation_paper',
        date: meta?.publishedDate,
        description: `Paper with ${paper.citations} citations`,
        details: { paperId: paper.paperId, citations: paper.citations },
      });
    }

    // h-indexマイルストーン
    const hIndex = this.calculateHIndex(citations);

    if (hIndex >= 10) {
      milestones.push({
        type: 'h_index_10',
        description: 'Achieved h-index of 10',
        details: { hIndex },
      });
    }

    if (hIndex >= 20) {
      milestones.push({
        type: 'h_index_20',
        description: 'Achieved h-index of 20',
        details: { hIndex },
      });
    }

    if (hIndex >= 50) {
      milestones.push({
        type: 'h_index_50',
        description: 'Achieved h-index of 50',
        details: { hIndex },
      });
    }

    return milestones;
  }

  /**
   * キャリア遷移を検出
   */
  detectTransitions(affiliations: AffiliationTimeline): CareerTransition[] {
    const transitions: CareerTransition[] = [];
    const sortedEntries = [...affiliations.entries].sort(
      (a, b) => (a.startDate?.getTime() || 0) - (b.startDate?.getTime() || 0),
    );

    for (let i = 0; i < sortedEntries.length - 1; i++) {
      const current = sortedEntries[i]!;
      const next = sortedEntries[i + 1]!;

      const currentIsIndustry = this.isIndustryOrganization(current.normalizedOrganization);
      const nextIsIndustry = this.isIndustryOrganization(next.normalizedOrganization);

      let type: CareerTransition['type'];
      if (currentIsIndustry && nextIsIndustry) {
        type = 'industry_to_industry';
      } else if (currentIsIndustry) {
        type = 'industry_to_academia';
      } else if (nextIsIndustry) {
        type = 'academia_to_industry';
      } else {
        type = 'academia_to_academia';
      }

      // 在籍期間を計算
      let duration: number | undefined;
      if (current.startDate && current.endDate) {
        duration = Math.round(
          (current.endDate.getTime() - current.startDate.getTime()) /
            (365.25 * 24 * 60 * 60 * 1000),
        );
      }

      transitions.push({
        fromOrganization: current.organization,
        toOrganization: next.organization,
        date: next.startDate || new Date(),
        type,
        duration,
      });
    }

    return transitions;
  }

  /**
   * 生産性を計算
   */
  calculateProductivity(citations: ResearcherCitations, years: number): ProductivityMetrics {
    const totalPapers = citations.papers.length;
    const totalCitations = citations.papers.reduce((sum, p) => sum + Math.max(0, p.citations), 0);
    const hIndex = this.calculateHIndex(citations);
    const i10Index = citations.papers.filter((p) => p.citations >= 10).length;

    const effectiveYears = Math.max(years, 1);

    return {
      totalPapers,
      totalCitations,
      papersPerYear: years > 0 ? totalPapers / effectiveYears : 0,
      citationsPerYear: years > 0 ? totalCitations / effectiveYears : 0,
      hIndex,
      i10Index,
    };
  }

  /**
   * 2人の研究者のキャリアを比較
   */
  compareCareer(career1: CareerTimeline, career2: CareerTimeline): CareerComparison {
    return {
      experienceDelta: career1.totalYears - career2.totalYears,
      productivityRatio:
        career2.productivity.papersPerYear > 0
          ? career1.productivity.papersPerYear / career2.productivity.papersPerYear
          : 0,
      citationRatio:
        career2.productivity.citationsPerYear > 0
          ? career1.productivity.citationsPerYear / career2.productivity.citationsPerYear
          : 0,
      hIndexDelta: career1.productivity.hIndex - career2.productivity.hIndex,
    };
  }

  /**
   * キャリア軌道を予測
   */
  predictCareerTrajectory(career: CareerTimeline, yearsAhead: number): CareerPrediction {
    const futureYears = career.totalYears + yearsAhead;
    const predictedPhase = this.determinePhase(futureYears);

    // 線形予測（単純なモデル）
    const annualGrowthRate = career.totalYears > 0
      ? Math.min(career.productivity.papersPerYear / career.totalYears, 0.5)
      : 0.1;

    const predictedPapersPerYear = career.productivity.papersPerYear * (1 + annualGrowthRate);
    const predictedTotalPapers =
      career.productivity.totalPapers + predictedPapersPerYear * yearsAhead;

    // h-indexは論文数の平方根に近い成長パターン
    const predictedHIndex = Math.round(
      career.productivity.hIndex * Math.pow(predictedTotalPapers / Math.max(career.productivity.totalPapers, 1), 0.5),
    );

    // 引用は論文数に比例して成長
    const citationGrowthRate = career.productivity.totalPapers > 0
      ? career.productivity.totalCitations / career.productivity.totalPapers
      : 10;
    const predictedTotalCitations =
      career.productivity.totalCitations +
      citationGrowthRate * (predictedTotalPapers - career.productivity.totalPapers);

    // 信頼度は予測期間が長いほど低下
    const confidence = Math.max(0.3, 1 - yearsAhead * 0.1);

    return {
      yearsAhead,
      predictedPhase,
      predictedHIndex,
      predictedTotalPapers: Math.round(predictedTotalPapers),
      predictedTotalCitations: Math.round(predictedTotalCitations),
      confidence,
    };
  }

  /**
   * キャリア開始日を取得
   */
  private getCareerStartDate(affiliations: AffiliationTimeline): Date {
    const sortedEntries = affiliations.entries
      .filter((e) => e.startDate)
      .sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime());

    return sortedEntries[0]?.startDate || new Date();
  }

  /**
   * 日付から年数を計算
   */
  private calculateYearsFromDate(date: Date): number {
    const now = new Date();
    const years = (now.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return Math.max(0, Math.floor(years));
  }

  /**
   * h-indexを計算
   */
  private calculateHIndex(citations: ResearcherCitations): number {
    const sortedCitations = citations.papers
      .map((p) => Math.max(0, p.citations))
      .sort((a, b) => b - a);

    let hIndex = 0;
    for (let i = 0; i < sortedCitations.length; i++) {
      if (sortedCitations[i]! >= i + 1) {
        hIndex = i + 1;
      } else {
        break;
      }
    }

    return hIndex;
  }

  /**
   * 産業界の組織かどうか判定
   */
  private isIndustryOrganization(normalizedName: string): boolean {
    const lower = normalizedName.toLowerCase();
    return INDUSTRY_KEYWORDS.some((keyword) => lower.includes(keyword));
  }
}
