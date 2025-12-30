/**
 * ResearchGapAnalyzerService - Orchestration service for research gap analysis
 *
 * Coordinates citation analysis, cluster analysis, and gap detection
 * to produce comprehensive research gap reports.
 * Based on DES-002 §5.2
 */

import { CitationAnalyzer } from '../citation/CitationAnalyzer.js';
import { ClusterAnalyzer } from '../cluster/ClusterAnalyzer.js';
import { GapDetector } from '../gap/GapDetector.js';
import type {
  ResearchGapAnalyzerServiceDependencies,
  ResearchGapAnalyzerServiceInterface,
  AnalyzerServiceOptions,
  GapAnalysisReport,
  ResearchGap,
  ResearchProposal,
  ResearchRecommendation,
  GapType,
  GapSeverity,
  Neo4jConnectionInterface,
  LLMClientInterface,
  VectorStoreInterface,
  CitationAnalyzerInterface,
  ClusterAnalyzerInterface,
  GapDetectorInterface,
} from '../types.js';

/**
 * Default service options
 */
const DEFAULT_OPTIONS: AnalyzerServiceOptions = {
  includeCitations: true,
  includeClusters: true,
  generateRecommendations: true,
  gapOptions: {
    useLLM: false,
    limit: 50,
  },
};

/**
 * Research Gap Analyzer Service implementation
 */
export class ResearchGapAnalyzerService
  implements ResearchGapAnalyzerServiceInterface
{
  private neo4jConnection: Neo4jConnectionInterface;
  private llmClient: LLMClientInterface | undefined;
  private vectorStore: VectorStoreInterface | undefined;

  private citationAnalyzer: CitationAnalyzerInterface;
  private clusterAnalyzer: ClusterAnalyzerInterface;
  private gapDetector: GapDetectorInterface;

  // Cache for gap lookup
  private gapCache: Map<string, ResearchGap> = new Map();

  constructor(deps: ResearchGapAnalyzerServiceDependencies) {
    this.neo4jConnection = deps.neo4jConnection;
    this.llmClient = deps.llmClient;
    this.vectorStore = deps.vectorStore;

    // Initialize sub-components
    this.citationAnalyzer = new CitationAnalyzer({
      neo4jConnection: this.neo4jConnection,
    });

    this.clusterAnalyzer = new ClusterAnalyzer({
      neo4jConnection: this.neo4jConnection,
      ...(this.vectorStore && { vectorStore: this.vectorStore }),
    });

    this.gapDetector = new GapDetector({
      neo4jConnection: this.neo4jConnection,
      citationAnalyzer: this.citationAnalyzer,
      clusterAnalyzer: this.clusterAnalyzer,
      ...(this.llmClient && { llmClient: this.llmClient }),
    });
  }

  /**
   * Perform comprehensive gap analysis
   */
  async analyze(options: AnalyzerServiceOptions = {}): Promise<GapAnalysisReport> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const reportId = this.generateReportId();

    // Detect gaps
    const gaps = await this.gapDetector.detectGaps(opts.gapOptions);

    // Cache gaps for lookup
    for (const gap of gaps) {
      this.gapCache.set(gap.id, gap);
    }

    // Calculate gap statistics
    const gapsByType = this.countByType(gaps);
    const gapsBySeverity = this.countBySeverity(gaps);

    // Get citation metrics if requested
    const citationMetrics = opts.includeCitations
      ? await this.citationAnalyzer.getTopCited(20)
      : undefined;

    // Get clusters if requested
    const clusters = opts.includeClusters
      ? await this.clusterAnalyzer.analyzeExistingClusters({ maxClusters: 20 })
      : undefined;

    // Generate recommendations
    const recommendations = opts.generateRecommendations
      ? await this.generateRecommendations(gaps)
      : [];

    const report: GapAnalysisReport = {
      id: reportId,
      generatedAt: new Date(),
      totalGaps: gaps.length,
      gapsByType,
      gapsBySeverity,
      gaps,
      recommendations,
      ...(citationMetrics && { citationMetrics }),
      ...(clusters && { clusters }),
    };

    return report;
  }

  /**
   * Generate research proposals from gaps
   */
  async generateResearchProposals(
    gaps: ResearchGap[],
    count = 5
  ): Promise<ResearchProposal[]> {
    // Group related gaps
    const groupedGaps = this.groupRelatedGaps(gaps);

    const proposals: ResearchProposal[] = [];

    for (const group of groupedGaps.slice(0, count)) {
      const proposal = await this.createProposal(group);
      proposals.push(proposal);
    }

    // Use LLM to enhance proposals if available
    if (this.llmClient && proposals.length > 0) {
      return await this.enhanceProposalsWithLLM(proposals);
    }

    return proposals;
  }

  /**
   * Get a specific gap by ID
   */
  async getGapById(gapId: string): Promise<ResearchGap | null> {
    // Check cache first
    const cached = this.gapCache.get(gapId);
    if (cached) {
      return cached;
    }

    // Re-run detection if not in cache
    const gaps = await this.gapDetector.detectGaps({ limit: 100 });

    for (const gap of gaps) {
      this.gapCache.set(gap.id, gap);
      if (gap.id === gapId) {
        return gap;
      }
    }

    return null;
  }

  /**
   * Export report to JSON or Markdown
   */
  async exportReport(
    report: GapAnalysisReport,
    format: 'json' | 'markdown'
  ): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(report, this.jsonReplacer, 2);
    }

    return this.formatAsMarkdown(report);
  }

  /**
   * Generate recommendations from gaps
   */
  private async generateRecommendations(
    gaps: ResearchGap[]
  ): Promise<ResearchRecommendation[]> {
    const recommendations: ResearchRecommendation[] = [];

    // Group by type and create type-specific recommendations
    const byType = new Map<GapType, ResearchGap[]>();
    for (const gap of gaps) {
      const existing = byType.get(gap.type) ?? [];
      existing.push(gap);
      byType.set(gap.type, existing);
    }

    // Missing combinations recommendation
    const missingCombos = byType.get('missing_combination') ?? [];
    if (missingCombos.length > 0) {
      recommendations.push({
        id: 'rec-combinations',
        title: '未探索の技術組み合わせを調査',
        description: `${missingCombos.length}件の未探索の技術・モデル組み合わせが検出されました`,
        priority: missingCombos.some((g) => g.severity === 'high')
          ? 'high'
          : 'medium',
        relatedGaps: missingCombos.slice(0, 5).map((g) => g.id),
        suggestedApproach: [
          '高優先度の組み合わせから実験を開始',
          'ベンチマーク評価を実施',
          '既存の類似研究をレビュー',
        ],
        estimatedImpact: missingCombos.length / gaps.length,
      });
    }

    // Stale areas recommendation
    const staleAreas = byType.get('stale_research_area') ?? [];
    if (staleAreas.length > 0) {
      recommendations.push({
        id: 'rec-stale',
        title: '停滞している研究領域の再評価',
        description: `${staleAreas.length}件の停滞した研究領域が検出されました`,
        priority: staleAreas.some((g) => g.severity === 'high')
          ? 'high'
          : 'medium',
        relatedGaps: staleAreas.slice(0, 5).map((g) => g.id),
        suggestedApproach: [
          '停滞の原因を分析（技術的限界、代替技術の台頭など）',
          '最新の関連技術との組み合わせを検討',
          '他分野への応用可能性を探索',
        ],
        estimatedImpact: staleAreas.length / gaps.length,
      });
    }

    // Isolated clusters recommendation
    const isolatedClusters = byType.get('isolated_cluster') ?? [];
    if (isolatedClusters.length > 0) {
      recommendations.push({
        id: 'rec-clusters',
        title: '孤立したクラスター間の橋渡し研究',
        description: `${isolatedClusters.length}件の孤立したクラスターペアが検出されました`,
        priority: isolatedClusters.some((g) => g.severity === 'high')
          ? 'high'
          : 'medium',
        relatedGaps: isolatedClusters.slice(0, 5).map((g) => g.id),
        suggestedApproach: [
          '共通のブリッジトピックを特定',
          '学際的コラボレーションを推進',
          '統合的なフレームワーク開発',
        ],
        estimatedImpact: isolatedClusters.length / gaps.length,
      });
    }

    // Underexplored techniques recommendation
    const underexplored = byType.get('underexplored_technique') ?? [];
    if (underexplored.length > 0) {
      recommendations.push({
        id: 'rec-underexplored',
        title: '未開拓技術の詳細調査',
        description: `${underexplored.length}件の未開拓技術が検出されました`,
        priority: underexplored.some((g) => g.severity === 'high')
          ? 'high'
          : 'medium',
        relatedGaps: underexplored.slice(0, 5).map((g) => g.id),
        suggestedApproach: [
          '基礎的な性能評価を実施',
          '適用可能なドメインを特定',
          '既存技術との比較研究',
        ],
        estimatedImpact: underexplored.length / gaps.length,
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Group related gaps for proposal generation
   */
  private groupRelatedGaps(gaps: ResearchGap[]): ResearchGap[][] {
    const groups: ResearchGap[][] = [];
    const used = new Set<string>();

    for (const gap of gaps) {
      if (used.has(gap.id)) continue;

      const group: ResearchGap[] = [gap];
      used.add(gap.id);

      // Find related gaps by entity overlap
      for (const other of gaps) {
        if (used.has(other.id)) continue;

        const overlap = gap.relatedEntities.some((e) =>
          other.relatedEntities.includes(e)
        );

        if (overlap || gap.type === other.type) {
          group.push(other);
          used.add(other.id);
        }

        if (group.length >= 3) break;
      }

      groups.push(group);
    }

    // Sort by total severity
    return groups.sort((a, b) => {
      const severityScore = (g: ResearchGap) =>
        g.severity === 'critical'
          ? 4
          : g.severity === 'high'
            ? 3
            : g.severity === 'medium'
              ? 2
              : 1;
      const scoreA = a.reduce((sum, g) => sum + severityScore(g), 0);
      const scoreB = b.reduce((sum, g) => sum + severityScore(g), 0);
      return scoreB - scoreA;
    });
  }

  /**
   * Create a research proposal from a group of gaps
   */
  private async createProposal(gaps: ResearchGap[]): Promise<ResearchProposal> {
    const mainGap = gaps[0] ?? {
      severity: 'medium' as const,
      relatedEntities: [],
      suggestedActions: [],
    };
    const allActions = [...new Set(gaps.flatMap((g) => g.suggestedActions))];

    return {
      id: `proposal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: this.generateProposalTitle(gaps),
      abstract: this.generateProposalAbstract(gaps),
      gaps,
      methodology: allActions.slice(0, 5),
      expectedOutcomes: [
        '新規研究領域の開拓',
        '既存知識の体系化',
        '実用的アプリケーションの開発',
      ],
      requiredResources: ['データセット', '計算リソース', '専門知識'],
      estimatedDuration: gaps.length > 2 ? '12-18ヶ月' : '6-12ヶ月',
      priority:
        mainGap.severity === 'critical'
          ? 0
          : mainGap.severity === 'high'
            ? 1
            : mainGap.severity === 'medium'
              ? 2
              : 3,
    };
  }

  /**
   * Generate proposal title
   */
  private generateProposalTitle(gaps: ResearchGap[]): string {
    const mainGap = gaps[0];
    if (!mainGap || mainGap.relatedEntities.length === 0) {
      return '新規研究提案';
    }

    switch (mainGap.type) {
      case 'missing_combination':
        return `${mainGap.relatedEntities.join('と')}の統合研究`;
      case 'stale_research_area':
        return `${mainGap.relatedEntities[0] ?? 'Unknown'}の現代的再評価`;
      case 'isolated_cluster':
        return `${mainGap.relatedEntities.join('・')}間の架橋研究`;
      case 'underexplored_technique':
        return `${mainGap.relatedEntities[0] ?? 'Unknown'}の体系的調査`;
      default:
        return `新規研究提案: ${mainGap.relatedEntities.slice(0, 2).join(', ')}`;
    }
  }

  /**
   * Generate proposal abstract
   */
  private generateProposalAbstract(gaps: ResearchGap[]): string {
    const descriptions = gaps.map((g) => g.description);
    const firstGap = gaps[0];
    const entities = firstGap?.relatedEntities.join('、') ?? '関連エンティティ';
    return `本研究は以下のギャップに対処することを目的とする: ${descriptions.slice(0, 3).join('; ')}。これにより、${entities}に関する理解を深め、新たな研究方向性を開拓する。`;
  }

  /**
   * Enhance proposals with LLM
   */
  private async enhanceProposalsWithLLM(
    proposals: ResearchProposal[]
  ): Promise<ResearchProposal[]> {
    if (!this.llmClient) {
      return proposals;
    }

    const enhanced: ResearchProposal[] = [];

    for (const proposal of proposals) {
      try {
        const prompt = `
以下の研究提案を改善してください:

タイトル: ${proposal.title}
概要: ${proposal.abstract}
対象ギャップ: ${proposal.gaps.map((g) => g.description).join('; ')}

以下のJSON形式で改善された提案を返してください:
{
  "title": "改善されたタイトル",
  "abstract": "改善された概要（200文字以内）",
  "methodology": ["手法1", "手法2", "手法3"],
  "expectedOutcomes": ["成果1", "成果2", "成果3"]
}
`;

        const response = await this.llmClient.generate(prompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          enhanced.push({
            ...proposal,
            title: parsed.title || proposal.title,
            abstract: parsed.abstract || proposal.abstract,
            methodology: parsed.methodology || proposal.methodology,
            expectedOutcomes: parsed.expectedOutcomes || proposal.expectedOutcomes,
          });
        } else {
          enhanced.push(proposal);
        }
      } catch {
        enhanced.push(proposal);
      }
    }

    return enhanced;
  }

  /**
   * Count gaps by type
   */
  private countByType(gaps: ResearchGap[]): Record<GapType, number> {
    const counts: Record<GapType, number> = {
      underexplored_technique: 0,
      missing_combination: 0,
      isolated_cluster: 0,
      stale_research_area: 0,
      unexplored_application: 0,
    };

    for (const gap of gaps) {
      counts[gap.type]++;
    }

    return counts;
  }

  /**
   * Count gaps by severity
   */
  private countBySeverity(gaps: ResearchGap[]): Record<GapSeverity, number> {
    const counts: Record<GapSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const gap of gaps) {
      counts[gap.severity]++;
    }

    return counts;
  }

  /**
   * Generate unique report ID
   */
  private generateReportId(): string {
    return `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * JSON replacer for Map serialization
   */
  private jsonReplacer(_key: string, value: unknown): unknown {
    if (value instanceof Map) {
      return Object.fromEntries(value);
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }

  /**
   * Format report as Markdown
   */
  private formatAsMarkdown(report: GapAnalysisReport): string {
    const lines: string[] = [];

    lines.push(`# 研究ギャップ分析レポート`);
    lines.push(``);
    lines.push(`**生成日時**: ${report.generatedAt.toISOString()}`);
    lines.push(`**レポートID**: ${report.id}`);
    lines.push(``);

    lines.push(`## サマリー`);
    lines.push(``);
    lines.push(`- **総ギャップ数**: ${report.totalGaps}`);
    lines.push(``);

    lines.push(`### タイプ別`);
    for (const [type, count] of Object.entries(report.gapsByType)) {
      if (count > 0) {
        lines.push(`- ${type}: ${count}件`);
      }
    }
    lines.push(``);

    lines.push(`### 重要度別`);
    for (const [severity, count] of Object.entries(report.gapsBySeverity)) {
      if (count > 0) {
        lines.push(`- ${severity}: ${count}件`);
      }
    }
    lines.push(``);

    lines.push(`## 検出されたギャップ`);
    lines.push(``);

    for (const gap of report.gaps.slice(0, 20)) {
      lines.push(`### ${gap.id}`);
      lines.push(``);
      lines.push(`- **タイプ**: ${gap.type}`);
      lines.push(`- **重要度**: ${gap.severity}`);
      lines.push(`- **説明**: ${gap.description}`);
      lines.push(`- **関連エンティティ**: ${gap.relatedEntities.join(', ')}`);
      lines.push(``);
      lines.push(`**推奨アクション**:`);
      for (const action of gap.suggestedActions) {
        lines.push(`- ${action}`);
      }
      lines.push(``);
    }

    if (report.recommendations.length > 0) {
      lines.push(`## 推奨事項`);
      lines.push(``);

      for (const rec of report.recommendations) {
        lines.push(`### ${rec.title}`);
        lines.push(``);
        lines.push(`**優先度**: ${rec.priority}`);
        lines.push(``);
        lines.push(rec.description);
        lines.push(``);
        lines.push(`**アプローチ**:`);
        for (const approach of rec.suggestedApproach) {
          lines.push(`- ${approach}`);
        }
        lines.push(``);
      }
    }

    return lines.join('\n');
  }
}
