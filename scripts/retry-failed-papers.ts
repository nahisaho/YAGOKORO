#!/usr/bin/env node
/**
 * 失敗した論文の再処理スクリプト
 *
 * タイムアウトを10分に増やしてDoclingで再処理
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 失敗した論文リスト
const FAILED_PAPERS = [
  { arxivId: '2005.14165', title: 'GPT-3: Language Models are Few-Shot Learners', category: '大規模言語モデル', year: 2020 },
  { arxivId: '2307.09288', title: 'LLaMA 2', category: '大規模言語モデル', year: 2023 },
  { arxivId: '2204.02311', title: 'PaLM: Scaling Language Modeling', category: '大規模言語モデル', year: 2022 },
  { arxivId: '2103.00020', title: 'CLIP: Learning Visual Concepts', category: 'マルチモーダル', year: 2021 },
  { arxivId: '2211.09110', title: 'Holistic Evaluation (HELM)', category: '創発能力・評価', year: 2022 },
];

async function main() {
  console.log('🔄 失敗した論文の再処理スクリプト\n');
  console.log(`📚 対象論文: ${FAILED_PAPERS.length} 件`);
  console.log('⏱️  タイムアウト: 10分\n');

  for (const paper of FAILED_PAPERS) {
    console.log(`   • [${paper.arxivId}] ${paper.title}`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log('🚀 再処理開始...\n');

  // 動的インポート
  const { DoclingDocumentProcessor } = await import('../libs/graphrag/src/ingest/index.js');

  const processor = new DoclingDocumentProcessor({
    chunkSize: 1000,
    chunkOverlap: 200,
    doclingOptions: {
      timeout: 600000, // 10分
    },
  });

  const outputDir = path.join(__dirname, '../data/chunks');
  const results: Array<{ arxivId: string; status: 'success' | 'failed'; chunks?: number; error?: string }> = [];

  for (let i = 0; i < FAILED_PAPERS.length; i++) {
    const paper = FAILED_PAPERS[i];
    const progress = `[${i + 1}/${FAILED_PAPERS.length}]`;

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
        status: 'success',
        chunks: result.chunks.length,
      });

      // arXiv APIレート制限対策
      if (i < FAILED_PAPERS.length - 1) {
        console.log('   ⏳ 5秒待機...');
        await sleep(5000);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`   ❌ エラー: ${errorMsg.slice(0, 100)}...`);

      results.push({
        arxivId: paper.arxivId,
        status: 'failed',
        error: errorMsg,
      });
    }
  }

  // サマリー出力
  console.log('\n' + '═'.repeat(60));
  console.log('📊 再処理結果サマリー\n');

  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');
  const totalChunks = successful.reduce((sum, r) => sum + (r.chunks || 0), 0);

  console.log(`✅ 成功: ${successful.length} 件`);
  console.log(`❌ 失敗: ${failed.length} 件`);
  console.log(`📦 追加チャンク数: ${totalChunks.toLocaleString()}`);

  if (failed.length > 0) {
    console.log('\nまだ失敗している論文:');
    for (const f of failed) {
      console.log(`  • ${f.arxivId}`);
    }
  }

  // 結果をファイルに保存
  const resultFile = path.join(outputDir, '_retry-results.json');
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
