/**
 * Researcher CLI コマンド
 *
 * @description 研究者ネットワーク分析CLIインターフェース
 * @since v4.0.0
 * @see T-402
 */

import { Command } from 'commander';

/**
 * 研究者詳細（CLI用）
 */
export interface CLIResearcherDetails {
  id: string;
  name: string;
  affiliation?: string;
  orcid?: string;
  paperCount: number;
  coauthorCount: number;
  communityId?: number;
  influenceScore?: number;
}

/**
 * 検索オプション
 */
export interface CLISearchOptions {
  nameQuery?: string;
  affiliation?: string;
  minCoauthors?: number;
  limit?: number;
}

/**
 * 影響度ランキング項目
 */
export interface CLIInfluenceRankingItem {
  id: string;
  name: string;
  influenceScore: number;
  hIndex: number;
  pageRank: number;
}

/**
 * コミュニティ情報
 */
export interface CLICommunityInfo {
  id: string | number;
  memberCount: number;
  representative?: string;
  density?: number;
}

/**
 * ネットワーク統計
 */
export interface CLINetworkStats {
  totalResearchers: number;
  totalEdges: number;
  totalPapers: number;
  averageDegree: number;
  communityCount: number;
}

/**
 * グラフエクスポート
 */
export interface CLIGraphExport {
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
 * キャリアタイムライン
 */
export interface CLICareerTimeline {
  researcherId: string;
  stages: Array<{
    period: string;
    publications: number;
    avgImpact: number;
    topVenue?: string;
  }>;
  currentStage: 'early' | 'mid' | 'senior' | 'emeritus';
}

/**
 * キャリア予測
 */
export interface CLICareerPrediction {
  researcherId: string;
  projectedHIndex: number;
  projectedPublications: number;
  trendDirection: 'rising' | 'stable' | 'declining';
  confidence: number;
}

/**
 * Researcher CLI Service インターフェース
 */
export interface ResearcherCLIService {
  /**
   * 研究者を検索
   */
  searchResearchers(options: CLISearchOptions): CLIResearcherDetails[];

  /**
   * 研究者詳細を取得
   */
  getResearcher(researcherId: string): CLIResearcherDetails | undefined;

  /**
   * 共著者リストを取得
   */
  getCoauthors(researcherId: string): CLIResearcherDetails[];

  /**
   * 2人の研究者間のパスを探索
   */
  findPath(fromId: string, toId: string): string[] | null;

  /**
   * 影響度ランキングを取得
   */
  getInfluenceRanking(options?: {
    limit?: number;
    communityId?: number;
  }): CLIInfluenceRankingItem[];

  /**
   * コミュニティリストを取得
   */
  getCommunities(): CLICommunityInfo[];

  /**
   * ネットワーク統計を取得
   */
  getNetworkStats(): CLINetworkStats;

  /**
   * グラフエクスポート
   */
  exportToGraph(): CLIGraphExport;

  /**
   * キャリア分析
   */
  analyzeCareer(researcherId: string): CLICareerTimeline | null;

  /**
   * キャリア予測
   */
  predictCareer(researcherId: string): CLICareerPrediction | null;
}

/**
 * 出力フォーマット
 */
export type ResearcherOutputFormat = 'json' | 'table' | 'graph';

/**
 * Researcher CLIオプション型
 */
export interface ResearcherSearchCLIOptions {
  name?: string;
  affiliation?: string;
  minCoauthors?: string;
  limit?: string;
  format?: ResearcherOutputFormat;
}

export interface ResearcherInfoCLIOptions {
  format?: ResearcherOutputFormat;
}

export interface ResearcherCoauthorsCLIOptions {
  limit?: string;
  format?: ResearcherOutputFormat;
}

export interface ResearcherPathCLIOptions {
  format?: ResearcherOutputFormat;
}

export interface ResearcherRankingCLIOptions {
  limit?: string;
  community?: string;
  format?: ResearcherOutputFormat;
}

export interface ResearcherCommunitiesCLIOptions {
  format?: ResearcherOutputFormat;
}

export interface ResearcherStatsCLIOptions {
  format?: ResearcherOutputFormat;
}

export interface ResearcherExportCLIOptions {
  output?: string;
  format?: 'json' | 'graphml' | 'gexf';
}

export interface ResearcherCareerCLIOptions {
  predict?: boolean;
  format?: ResearcherOutputFormat;
}

/**
 * テーブル形式で研究者リストを出力
 */
function formatResearcherTable(researchers: CLIResearcherDetails[]): string {
  if (researchers.length === 0) {
    return '研究者が見つかりませんでした。';
  }

  const lines: string[] = [];
  lines.push('┌──────────────────────────────────────────────────────────────────┐');
  lines.push('│ 🔬 研究者一覧                                                   │');
  lines.push('├──────────────────────────────────────────────────────────────────┤');
  lines.push('│ ID             │ 名前                 │ 論文数 │ 共著者 │ 影響度 │');
  lines.push('├──────────────────────────────────────────────────────────────────┤');

  for (const r of researchers) {
    const id = r.id.substring(0, 14).padEnd(14);
    const name = r.name.substring(0, 20).padEnd(20);
    const papers = String(r.paperCount).padStart(6);
    const coauthors = String(r.coauthorCount).padStart(6);
    const influence = (r.influenceScore ?? 0).toFixed(2).padStart(6);
    lines.push(`│ ${id} │ ${name} │ ${papers} │ ${coauthors} │ ${influence} │`);
  }

  lines.push('└──────────────────────────────────────────────────────────────────┘');
  lines.push(`合計: ${researchers.length} 人の研究者`);

  return lines.join('\n');
}

/**
 * テーブル形式で研究者詳細を出力
 */
function formatResearcherDetail(researcher: CLIResearcherDetails): string {
  const lines: string[] = [];
  lines.push('┌──────────────────────────────────────────────────────────────────┐');
  lines.push('│ 🔬 研究者詳細                                                   │');
  lines.push('├──────────────────────────────────────────────────────────────────┤');
  lines.push(`│ ID:         ${researcher.id.padEnd(52)} │`);
  lines.push(`│ 名前:       ${researcher.name.padEnd(52)} │`);
  lines.push(`│ 所属:       ${(researcher.affiliation ?? '-').substring(0, 52).padEnd(52)} │`);
  lines.push(`│ ORCID:      ${(researcher.orcid ?? '-').padEnd(52)} │`);
  lines.push('├──────────────────────────────────────────────────────────────────┤');
  lines.push(`│ 📄 論文数:       ${String(researcher.paperCount).padEnd(47)} │`);
  lines.push(`│ 👥 共著者数:     ${String(researcher.coauthorCount).padEnd(47)} │`);
  lines.push(`│ 🏘️  コミュニティ: ${(researcher.communityId?.toString() ?? '-').padEnd(47)} │`);
  lines.push(`│ ⭐ 影響度:       ${(researcher.influenceScore?.toFixed(4) ?? '-').padEnd(47)} │`);
  lines.push('└──────────────────────────────────────────────────────────────────┘');

  return lines.join('\n');
}

/**
 * テーブル形式でランキングを出力
 */
function formatRankingTable(items: CLIInfluenceRankingItem[]): string {
  if (items.length === 0) {
    return 'ランキングデータがありません。';
  }

  const lines: string[] = [];
  lines.push('┌──────────────────────────────────────────────────────────────────┐');
  lines.push('│ 🏆 影響度ランキング                                             │');
  lines.push('├──────────────────────────────────────────────────────────────────┤');
  lines.push('│ 順位 │ 名前                 │ 影響度  │ h-index │ PageRank │');
  lines.push('├──────────────────────────────────────────────────────────────────┤');

  items.forEach((item, index) => {
    const rank = String(index + 1).padStart(4);
    const name = item.name.substring(0, 20).padEnd(20);
    const influence = item.influenceScore.toFixed(4).padStart(7);
    const hIndex = String(item.hIndex).padStart(7);
    const pageRank = item.pageRank.toFixed(4).padStart(8);
    lines.push(`│ ${rank} │ ${name} │ ${influence} │ ${hIndex} │ ${pageRank} │`);
  });

  lines.push('└──────────────────────────────────────────────────────────────────┘');

  return lines.join('\n');
}

/**
 * テーブル形式でコミュニティを出力
 */
function formatCommunityTable(communities: CLICommunityInfo[]): string {
  if (communities.length === 0) {
    return 'コミュニティが検出されていません。';
  }

  const lines: string[] = [];
  lines.push('┌──────────────────────────────────────────────────────────────────┐');
  lines.push('│ 🏘️  コミュニティ一覧                                              │');
  lines.push('├──────────────────────────────────────────────────────────────────┤');
  lines.push('│ ID       │ メンバー数 │ 代表者                 │ 密度    │');
  lines.push('├──────────────────────────────────────────────────────────────────┤');

  for (const c of communities) {
    const id = String(c.id).padEnd(8);
    const members = String(c.memberCount).padStart(10);
    const rep = (c.representative ?? '-').substring(0, 22).padEnd(22);
    const density = (c.density?.toFixed(4) ?? '-').padStart(7);
    lines.push(`│ ${id} │ ${members} │ ${rep} │ ${density} │`);
  }

  lines.push('└──────────────────────────────────────────────────────────────────┘');
  lines.push(`合計: ${communities.length} コミュニティ`);

  return lines.join('\n');
}

/**
 * テーブル形式で統計を出力
 */
function formatStatsTable(stats: CLINetworkStats): string {
  const lines: string[] = [];
  lines.push('┌──────────────────────────────────────────────────────────────────┐');
  lines.push('│ 📊 ネットワーク統計                                             │');
  lines.push('├──────────────────────────────────────────────────────────────────┤');
  lines.push(`│ 👥 研究者総数:       ${String(stats.totalResearchers).padEnd(43)} │`);
  lines.push(`│ 🔗 エッジ総数:       ${String(stats.totalEdges).padEnd(43)} │`);
  lines.push(`│ 📄 論文総数:         ${String(stats.totalPapers).padEnd(43)} │`);
  lines.push(`│ 📈 平均次数:         ${stats.averageDegree.toFixed(2).padEnd(43)} │`);
  lines.push(`│ 🏘️  コミュニティ数:   ${String(stats.communityCount).padEnd(43)} │`);
  lines.push('└──────────────────────────────────────────────────────────────────┘');

  return lines.join('\n');
}

/**
 * テーブル形式でパスを出力
 */
function formatPath(path: string[]): string {
  if (path.length === 0) {
    return 'パスが見つかりませんでした。';
  }

  const lines: string[] = [];
  lines.push('┌──────────────────────────────────────────────────────────────────┐');
  lines.push('│ 🔗 共著パス                                                     │');
  lines.push('├──────────────────────────────────────────────────────────────────┤');
  lines.push(`│ 距離: ${path.length - 1} ステップ                                          │`);
  lines.push('├──────────────────────────────────────────────────────────────────┤');

  path.forEach((id, index) => {
    const prefix = index === 0 ? '🟢 開始' : index === path.length - 1 ? '🔴 終点' : `   ${index}   `;
    lines.push(`│ ${prefix}: ${id.padEnd(52)} │`);
    if (index < path.length - 1) {
      lines.push('│        ↓                                                        │');
    }
  });

  lines.push('└──────────────────────────────────────────────────────────────────┘');

  return lines.join('\n');
}

/**
 * テーブル形式でキャリアを出力
 */
function formatCareerTable(timeline: CLICareerTimeline): string {
  const lines: string[] = [];
  const stageLabel: Record<string, string> = {
    early: '🌱 初期',
    mid: '📈 中期',
    senior: '🌟 シニア',
    emeritus: '🎖️ 名誉',
  };

  lines.push('┌──────────────────────────────────────────────────────────────────┐');
  lines.push('│ 📊 キャリア分析                                                 │');
  lines.push('├──────────────────────────────────────────────────────────────────┤');
  lines.push(`│ 研究者ID: ${timeline.researcherId.padEnd(54)} │`);
  lines.push(`│ 現在ステージ: ${stageLabel[timeline.currentStage].padEnd(50)} │`);
  lines.push('├──────────────────────────────────────────────────────────────────┤');
  lines.push('│ 期間           │ 出版数 │ 平均インパクト │ トップ会場        │');
  lines.push('├──────────────────────────────────────────────────────────────────┤');

  for (const stage of timeline.stages) {
    const period = stage.period.padEnd(14);
    const pubs = String(stage.publications).padStart(6);
    const impact = stage.avgImpact.toFixed(2).padStart(14);
    const venue = (stage.topVenue ?? '-').substring(0, 17).padEnd(17);
    lines.push(`│ ${period} │ ${pubs} │ ${impact} │ ${venue} │`);
  }

  lines.push('└──────────────────────────────────────────────────────────────────┘');

  return lines.join('\n');
}

/**
 * テーブル形式で予測を出力
 */
function formatPredictionTable(prediction: CLICareerPrediction): string {
  const directionLabel: Record<string, string> = {
    rising: '📈 上昇',
    stable: '➡️ 安定',
    declining: '📉 下降',
  };

  const lines: string[] = [];
  lines.push('┌──────────────────────────────────────────────────────────────────┐');
  lines.push('│ 🔮 キャリア予測                                                 │');
  lines.push('├──────────────────────────────────────────────────────────────────┤');
  lines.push(`│ 研究者ID:         ${prediction.researcherId.padEnd(46)} │`);
  lines.push(`│ 予測 h-index:     ${String(prediction.projectedHIndex).padEnd(46)} │`);
  lines.push(`│ 予測出版数:       ${String(prediction.projectedPublications).padEnd(46)} │`);
  lines.push(`│ トレンド:         ${directionLabel[prediction.trendDirection].padEnd(46)} │`);
  lines.push(`│ 信頼度:           ${(prediction.confidence * 100).toFixed(1).padEnd(44)}% │`);
  lines.push('└──────────────────────────────────────────────────────────────────┘');

  return lines.join('\n');
}

/**
 * Researcher CLI コマンドを作成
 *
 * @param service - ResearcherCLIService インスタンス
 * @returns Commander コマンド
 */
export function createResearcherCommand(service: ResearcherCLIService): Command {
  const researcher = new Command('researcher')
    .description('🔬 研究者ネットワーク分析');

  // search サブコマンド
  researcher
    .command('search')
    .description('研究者を検索')
    .option('-n, --name <query>', '名前で検索（部分一致）')
    .option('-a, --affiliation <org>', '所属機関でフィルタ')
    .option('-m, --min-coauthors <count>', '最小共著者数', '0')
    .option('-l, --limit <count>', '最大結果数', '20')
    .option('-f, --format <format>', '出力形式 (json|table)', 'table')
    .action((options: ResearcherSearchCLIOptions) => {
      const searchOptions: CLISearchOptions = {
        nameQuery: options.name,
        affiliation: options.affiliation,
        minCoauthors: options.minCoauthors ? parseInt(options.minCoauthors, 10) : undefined,
        limit: options.limit ? parseInt(options.limit, 10) : 20,
      };

      const results = service.searchResearchers(searchOptions);

      if (options.format === 'json') {
        console.log(JSON.stringify(results, null, 2));
      } else {
        console.log(formatResearcherTable(results));
      }
    });

  // info サブコマンド
  researcher
    .command('info <researcherId>')
    .description('研究者の詳細情報を取得')
    .option('-f, --format <format>', '出力形式 (json|table)', 'table')
    .action((researcherId: string, options: ResearcherInfoCLIOptions) => {
      const researcher = service.getResearcher(researcherId);

      if (!researcher) {
        console.error(`研究者が見つかりません: ${researcherId}`);
        process.exitCode = 1;
        return;
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(researcher, null, 2));
      } else {
        console.log(formatResearcherDetail(researcher));
      }
    });

  // coauthors サブコマンド
  researcher
    .command('coauthors <researcherId>')
    .description('共著者リストを取得')
    .option('-l, --limit <count>', '最大結果数')
    .option('-f, --format <format>', '出力形式 (json|table)', 'table')
    .action((researcherId: string, options: ResearcherCoauthorsCLIOptions) => {
      let coauthors = service.getCoauthors(researcherId);

      if (options.limit) {
        coauthors = coauthors.slice(0, parseInt(options.limit, 10));
      }

      if (coauthors.length === 0) {
        console.log(`共著者が見つかりません: ${researcherId}`);
        return;
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(coauthors, null, 2));
      } else {
        console.log(formatResearcherTable(coauthors));
      }
    });

  // path サブコマンド
  researcher
    .command('path <fromId> <toId>')
    .description('2人の研究者間の最短共著パスを探索')
    .option('-f, --format <format>', '出力形式 (json|table)', 'table')
    .action((fromId: string, toId: string, options: ResearcherPathCLIOptions) => {
      const path = service.findPath(fromId, toId);

      if (!path) {
        console.error('パスが見つかりませんでした。（接続されていないか、研究者が存在しません）');
        process.exitCode = 1;
        return;
      }

      if (options.format === 'json') {
        console.log(JSON.stringify({ path, distance: path.length - 1 }, null, 2));
      } else {
        console.log(formatPath(path));
      }
    });

  // ranking サブコマンド
  researcher
    .command('ranking')
    .alias('rank')
    .description('影響度ランキングを表示')
    .option('-l, --limit <count>', '表示件数', '10')
    .option('-c, --community <id>', 'コミュニティIDでフィルタ')
    .option('-f, --format <format>', '出力形式 (json|table)', 'table')
    .action((options: ResearcherRankingCLIOptions) => {
      const rankingOptions = {
        limit: options.limit ? parseInt(options.limit, 10) : 10,
        communityId: options.community ? parseInt(options.community, 10) : undefined,
      };

      const ranking = service.getInfluenceRanking(rankingOptions);

      if (options.format === 'json') {
        console.log(JSON.stringify(ranking, null, 2));
      } else {
        console.log(formatRankingTable(ranking));
      }
    });

  // communities サブコマンド
  researcher
    .command('communities')
    .alias('comm')
    .description('コミュニティ一覧を表示')
    .option('-f, --format <format>', '出力形式 (json|table)', 'table')
    .action((options: ResearcherCommunitiesCLIOptions) => {
      const communities = service.getCommunities();

      if (options.format === 'json') {
        console.log(JSON.stringify(communities, null, 2));
      } else {
        console.log(formatCommunityTable(communities));
      }
    });

  // stats サブコマンド
  researcher
    .command('stats')
    .description('ネットワーク統計を表示')
    .option('-f, --format <format>', '出力形式 (json|table)', 'table')
    .action((options: ResearcherStatsCLIOptions) => {
      const stats = service.getNetworkStats();

      if (options.format === 'json') {
        console.log(JSON.stringify(stats, null, 2));
      } else {
        console.log(formatStatsTable(stats));
      }
    });

  // export サブコマンド
  researcher
    .command('export')
    .description('ネットワークグラフをエクスポート')
    .option('-o, --output <file>', '出力ファイルパス')
    .option('-f, --format <format>', '出力形式 (json|graphml|gexf)', 'json')
    .action((options: ResearcherExportCLIOptions) => {
      const graph = service.exportToGraph();

      // JSON形式のみサポート（graphml, gexfは将来拡張）
      if (options.format !== 'json') {
        console.error(`現在サポートされている形式は json のみです。`);
        process.exitCode = 1;
        return;
      }

      const output = JSON.stringify(graph, null, 2);

      if (options.output) {
        // ファイル出力は呼び出し側で実装
        console.log(`ファイル出力先: ${options.output}`);
        console.log(output);
      } else {
        console.log(output);
      }
    });

  // career サブコマンド
  researcher
    .command('career <researcherId>')
    .description('キャリア分析・予測')
    .option('-p, --predict', 'キャリア予測も表示')
    .option('-f, --format <format>', '出力形式 (json|table)', 'table')
    .action((researcherId: string, options: ResearcherCareerCLIOptions) => {
      const timeline = service.analyzeCareer(researcherId);

      if (!timeline) {
        console.error(`キャリアデータが見つかりません: ${researcherId}`);
        process.exitCode = 1;
        return;
      }

      if (options.format === 'json') {
        const result: { timeline: CLICareerTimeline; prediction?: CLICareerPrediction | null } = { timeline };
        if (options.predict) {
          result.prediction = service.predictCareer(researcherId);
        }
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatCareerTable(timeline));

        if (options.predict) {
          const prediction = service.predictCareer(researcherId);
          if (prediction) {
            console.log('');
            console.log(formatPredictionTable(prediction));
          }
        }
      }
    });

  return researcher;
}
