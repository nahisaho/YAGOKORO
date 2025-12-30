#!/usr/bin/env node
/**
 * 生成AI系譜論文インジェストスクリプト
 *
 * arXivから論文をダウンロードし、Docling(ローカル)でテキスト抽出、
 * LazyGraphRAG用のチャンクを生成します。
 *
 * Usage:
 *   npx tsx scripts/ingest-genai-papers.ts
 *
 * Options:
 *   --dry-run     実際にダウンロードせずプレビュー
 *   --category    特定カテゴリのみ処理
 *   --limit       処理する論文数を制限
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 論文リストを読み込み
const papersPath = path.join(__dirname, '../data/genai-papers.json');
const papersData = JSON.parse(fs.readFileSync(papersPath, 'utf-8'));

interface Paper {
  arxivId: string;
  title: string;
  year: number;
}

interface Category {
  name: string;
  papers: Paper[];
}

interface ProcessResult {
  arxivId: string;
  title: string;
  status: 'success' | 'failed' | 'skipped';
  chunks?: number;
  error?: string;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const categoryFilter = args.find(a => a.startsWith('--category='))?.split('=')[1];
  const limitArg = args.find(a => a.startsWith('--limit='))?.split('=')[1];
  const limit = limitArg ? parseInt(limitArg, 10) : undefined;

  console.log('🧠 生成AI系譜論文インジェストスクリプト\n');

  // Docling環境チェック
  const venvPython = path.join(__dirname, '../.venv/bin/python');
  if (!fs.existsSync(venvPython) && !dryRun) {
    console.error('❌ Python仮想環境が見つかりません');
    console.log('   以下のコマンドでセットアップしてください:');
    console.log('   python3 -m venv .venv && source .venv/bin/activate && pip install docling');
    process.exit(1);
  }

  // カテゴリと論文を収集
  const categories: Record<string, Category> = papersData.categories;
  const allPapers: Array<Paper & { category: string }> = [];

  for (const [key, cat] of Object.entries(categories)) {
    if (categoryFilter && key !== categoryFilter) continue;
    for (const paper of cat.papers) {
      allPapers.push({ ...paper, category: cat.name });
    }
  }

  const papersToProcess = limit ? allPapers.slice(0, limit) : allPapers;

  console.log(`📚 論文総数: ${papersData.totalPapers}`);
  console.log(`📂 処理対象: ${papersToProcess.length} 件`);
  if (categoryFilter) console.log(`🏷️  カテゴリ: ${categoryFilter}`);
  if (dryRun) console.log('🔍 ドライラン モード\n');
  console.log('─'.repeat(60) + '\n');

  // カテゴリごとに表示
  const byCategory = new Map<string, Paper[]>();
  for (const paper of papersToProcess) {
    const cat = paper.category;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(paper);
  }

  for (const [category, papers] of byCategory) {
    console.log(`\n📁 ${category} (${papers.length}件)`);
    for (const paper of papers) {
      console.log(`   • [${paper.arxivId}] ${paper.title} (${paper.year})`);
    }
  }

  if (dryRun) {
    console.log('\n✅ ドライラン完了。実行するには --dry-run を外してください。');
    return;
  }

  console.log('\n' + '─'.repeat(60));
  console.log('🚀 インジェスト開始 (Docling ローカルモード)...\n');

  // 動的インポート（ESM対応）
  const { DoclingDocumentProcessor } = await import('../libs/graphrag/src/ingest/index.js');

  const processor = new DoclingDocumentProcessor({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const results: ProcessResult[] = [];
  const outputDir = path.join(__dirname, '../data/chunks');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (let i = 0; i < papersToProcess.length; i++) {
    const paper = papersToProcess[i];
    const progress = `[${i + 1}/${papersToProcess.length}]`;

    console.log(`${progress} 処理中: ${paper.arxivId} - ${paper.title}`);

    try {
      const result = await processor.processArxivPaper(paper.arxivId);

      // チャンクを保存
      const chunkFile = path.join(outputDir, `${paper.arxivId.replace(/\./g, '_')}.json`);
      fs.writeFileSync(chunkFile, JSON.stringify({
        arxivId: paper.arxivId,
        title: paper.title,
        category: paper.category,
        year: paper.year,
        paper: result.paper,
        chunks: result.chunks,
        tables: result.tables,
        stats: result.stats,
        processedAt: new Date().toISOString(),
      }, null, 2));

      console.log(`   ✅ ${result.chunks.length} チャンク作成 (${result.stats.totalCharacters.toLocaleString()} 文字, ${result.stats.numTables} テーブル)`);

      results.push({
        arxivId: paper.arxivId,
        title: paper.title,
        status: 'success',
        chunks: result.chunks.length,
      });

      // arXiv APIレート制限対策 + Docling処理時間考慮（5秒待機）
      if (i < papersToProcess.length - 1) {
        await sleep(5000);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`   ❌ エラー: ${errorMsg}`);

      results.push({
        arxivId: paper.arxivId,
        title: paper.title,
        status: 'failed',
        error: errorMsg,
      });
    }
  }

  // サマリー出力
  console.log('\n' + '═'.repeat(60));
  console.log('📊 処理結果サマリー\n');

  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');
  const totalChunks = successful.reduce((sum, r) => sum + (r.chunks || 0), 0);

  console.log(`✅ 成功: ${successful.length} 件`);
  console.log(`❌ 失敗: ${failed.length} 件`);
  console.log(`📦 総チャンク数: ${totalChunks.toLocaleString()}`);

  if (failed.length > 0) {
    console.log('\n失敗した論文:');
    for (const f of failed) {
      console.log(`  • ${f.arxivId}: ${f.error}`);
    }
  }

  // 結果をファイルに保存
  const resultFile = path.join(outputDir, '_ingest-results.json');
  fs.writeFileSync(resultFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      totalChunks,
    },
    results,
  }, null, 2));

  console.log(`\n📄 結果保存: ${resultFile}`);
  console.log('✨ 完了!\n');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
