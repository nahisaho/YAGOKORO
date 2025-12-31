/**
 * EXP-004: arXiv API Integration 実験
 * 
 * v3.0.0の新機能 - arXiv OAI-PMH APIによる論文自動取得
 */
import { ArxivClient } from '../../libs/ingestion/src/arxiv/arxiv-client.js';
import * as fs from 'fs';
import * as path from 'path';

async function runExperiment() {
  console.log('='.repeat(60));
  console.log('EXP-004: arXiv API による論文自動取得');
  console.log('='.repeat(60));
  
  // ArxivClientの初期化
  const client = new ArxivClient({
    maxResults: 10,
    rateLimit: {
      requestsPerSecond: 0.33, // 3秒に1リクエスト
    },
  });
  
  console.log('\n📋 実験設定:');
  console.log('   API: arXiv OAI-PMH');
  console.log('   レート制限: 3秒/リクエスト');
  console.log('   取得上限: 10件/クエリ');
  
  // テストクエリ
  const testQueries = [
    { query: 'LLM reasoning', category: 'cs.AI', description: 'LLM推論研究' },
    { query: 'knowledge graph embedding', category: 'cs.LG', description: '知識グラフ埋め込み' },
    { query: 'retrieval augmented generation', category: 'cs.CL', description: 'RAG技術' },
  ];
  
  const results: any[] = [];
  
  for (const test of testQueries) {
    console.log(`\n🔍 検索中: "${test.query}" (${test.description})`);
    
    try {
      const papers = await client.search(test.query, {
        maxResults: 5,
      });
      
      console.log(`   ✅ ${papers.length}件の論文を取得`);
      
      const paperSummaries = papers.map((paper, i) => {
        console.log(`   ${i + 1}. ${paper.title.substring(0, 60)}...`);
        console.log(`      著者: ${paper.authors.slice(0, 3).join(', ')}${paper.authors.length > 3 ? '...' : ''}`);
        console.log(`      投稿日: ${paper.published}`);
        
        return {
          id: paper.id,
          title: paper.title,
          authors: paper.authors,
          published: paper.published,
          categories: paper.categories,
        };
      });
      
      results.push({
        query: test.query,
        description: test.description,
        count: papers.length,
        papers: paperSummaries,
      });
      
      // レート制限のため待機
      await new Promise(resolve => setTimeout(resolve, 3100));
      
    } catch (error: any) {
      console.log(`   ❌ エラー: ${error.message}`);
      results.push({
        query: test.query,
        description: test.description,
        count: 0,
        error: error.message,
      });
    }
  }
  
  // 統計サマリー
  console.log('\n📈 取得結果サマリー:');
  console.log('┌────────────────────────────────────────────┬────────┐');
  console.log('│ クエリ                                     │ 件数   │');
  console.log('├────────────────────────────────────────────┼────────┤');
  
  let totalPapers = 0;
  results.forEach(r => {
    const query = r.query.padEnd(42);
    const count = String(r.count).padStart(6);
    console.log(`│ ${query} │ ${count} │`);
    totalPapers += r.count;
  });
  
  console.log('├────────────────────────────────────────────┼────────┤');
  console.log(`│ ${'合計'.padEnd(42)} │ ${String(totalPapers).padStart(6)} │`);
  console.log('└────────────────────────────────────────────┴────────┘');
  
  // カテゴリ分析
  const allPapers = results.flatMap(r => r.papers || []);
  const categoryCount = allPapers.reduce((acc, p) => {
    (p.categories || []).forEach((cat: string) => {
      acc[cat] = (acc[cat] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n📊 カテゴリ分布:');
  Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([cat, count]) => {
      console.log(`   - ${cat}: ${count}件`);
    });
  
  // 年別分布
  const yearCount = allPapers.reduce((acc, p) => {
    const year = p.published?.substring(0, 4) || 'unknown';
    acc[year] = (acc[year] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n📅 年別分布:');
  Object.entries(yearCount)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .forEach(([year, count]) => {
      console.log(`   - ${year}: ${count}件`);
    });
  
  console.log('\n💡 v3.0.0 arXiv統合の特徴:');
  console.log('   ✅ OAI-PMHプロトコル準拠');
  console.log('   ✅ 3秒レート制限の自動遵守');
  console.log('   ✅ 増分ハーベスティング対応');
  console.log('   ✅ 複数カテゴリのサポート (cs.AI, cs.CL, cs.LG, cs.CV, cs.NE)');
  
  // 結果をファイルに保存
  const outputPath = path.join(process.cwd(), 'outputs/experiments/exp-004-results.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    experiment: 'EXP-004',
    title: 'arXiv API による論文自動取得',
    timestamp: new Date().toISOString(),
    statistics: {
      totalQueries: testQueries.length,
      totalPapers,
      categoryCount,
      yearCount,
    },
    results,
  }, null, 2));
  
  console.log(`\n✅ 結果を保存: ${outputPath}`);
  
  return {
    totalPapers,
    results,
  };
}

runExperiment().catch(console.error);
