/**
 * EXP-005: Deduplicator 実験
 * 
 * v3.0.0の新機能 - 論文重複検出・除去
 */
import { Deduplicator } from '../../libs/ingestion/src/dedup/deduplicator.js';
import type { Paper } from '../../libs/ingestion/src/entities/paper.js';
import * as fs from 'fs';
import * as path from 'path';

async function runExperiment() {
  console.log('='.repeat(60));
  console.log('EXP-005: Deduplicator による論文重複検出');
  console.log('='.repeat(60));
  
  // テスト用の論文データ
  const testPapers: Paper[] = [
    // オリジナル論文
    {
      id: 'arxiv-2017-transformer',
      title: 'Attention Is All You Need',
      authors: [{ name: 'Ashish Vaswani' }, { name: 'Noam Shazeer' }, { name: 'Niki Parmar' }],
      doi: '10.5555/3295222.3295349',
      source: 'arxiv',
      status: 'processed',
      ingestedAt: new Date(),
    },
    // DOI重複
    {
      id: 'semantic-scholar-transformer',
      title: 'Attention Is All You Need (Transformer)',
      authors: [{ name: 'A. Vaswani' }, { name: 'N. Shazeer' }, { name: 'N. Parmar' }],
      doi: '10.5555/3295222.3295349',
      source: 'semantic_scholar',
      status: 'processed',
      ingestedAt: new Date(),
    },
    // タイトル類似（表記揺れ）
    {
      id: 'another-transformer',
      title: 'Attention is all you need',
      authors: [{ name: 'Vaswani, Ashish' }, { name: 'Shazeer, Noam' }, { name: 'Parmar, Niki' }],
      source: 'manual',
      status: 'processed',
      ingestedAt: new Date(),
    },
    // BERT - オリジナル
    {
      id: 'bert-original',
      title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
      authors: [{ name: 'Jacob Devlin' }, { name: 'Ming-Wei Chang' }, { name: 'Kenton Lee' }, { name: 'Kristina Toutanova' }],
      doi: '10.18653/v1/N19-1423',
      source: 'arxiv',
      status: 'processed',
      ingestedAt: new Date(),
    },
    // BERT - 著者名の表記揺れ + タイトル類似
    {
      id: 'bert-variant',
      title: 'BERT: Pre-training of Deep Bidirectional Transformers',
      authors: [{ name: 'J. Devlin' }, { name: 'M. Chang' }, { name: 'K. Lee' }, { name: 'K. Toutanova' }],
      source: 'manual',
      status: 'processed',
      ingestedAt: new Date(),
    },
    // 完全に異なる論文
    {
      id: 'gpt3-paper',
      title: 'Language Models are Few-Shot Learners',
      authors: [{ name: 'Tom Brown' }, { name: 'Benjamin Mann' }, { name: 'Nick Ryder' }],
      doi: '10.5555/3495724.3495883',
      source: 'arxiv',
      status: 'processed',
      ingestedAt: new Date(),
    },
    // GPT-3のわずかなタイトル変更
    {
      id: 'gpt3-similar',
      title: 'Language Models Are Few-Shot Learners',
      authors: [{ name: 'T. Brown' }, { name: 'B. Mann' }, { name: 'N. Ryder' }],
      source: 'manual',
      status: 'processed',
      ingestedAt: new Date(),
    },
    // 全く異なる論文
    {
      id: 'vit-paper',
      title: 'An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale',
      authors: [{ name: 'Alexey Dosovitskiy' }, { name: 'Lucas Beyer' }, { name: 'Alexander Kolesnikov' }],
      source: 'arxiv',
      status: 'processed',
      ingestedAt: new Date(),
    },
    // タイトルは似ているが内容が異なる（False Positive テスト）
    {
      id: 'different-attention',
      title: 'Attention Is All You Need for Speech Recognition',
      authors: [{ name: 'Different Author' }, { name: 'Another Author' }],
      source: 'manual',
      status: 'processed',
      ingestedAt: new Date(),
    },
  ];
  
  // Deduplicatorの初期化
  const deduplicator = new Deduplicator({
    titleExactThreshold: 0.95,
    titleCandidateThreshold: 0.8,
    minAuthorMatches: 3,
  });
  
  console.log('\n📋 実験設定:');
  console.log('   タイトル完全一致閾値: 0.95');
  console.log('   タイトル候補閾値: 0.8');
  console.log('   著者最小一致数: 3');
  console.log(`   テスト論文数: ${testPapers.length}`);
  
  console.log('\n🔍 重複検出を実行中...\n');
  
  const results: any[] = [];
  
  // 各論文を既存論文リストと比較
  for (let i = 1; i < testPapers.length; i++) {
    const paper = testPapers[i];
    const existingPapers = testPapers.slice(0, i);
    
    const result = deduplicator.checkDuplicate(paper, existingPapers);
    
    if (result.isDuplicate) {
      results.push({
        paperId: paper.id,
        paperTitle: paper.title.substring(0, 50),
        matchedId: result.matchedPaperId,
        matchType: result.matchType,
        similarity: result.similarity,
        needsReview: result.needsReview,
      });
    }
  }
  
  // 結果表示
  console.log('📊 検出結果:');
  console.log('┌────────────────────────────────────┬──────────────────────┬────────────┬────────┐');
  console.log('│ 重複候補                           │ 一致した論文         │ タイプ     │ 類似度 │');
  console.log('├────────────────────────────────────┼──────────────────────┼────────────┼────────┤');
  
  results.forEach(r => {
    const paper = r.paperId.substring(0, 32).padEnd(34);
    const matched = (r.matchedId || '').substring(0, 20).padEnd(20);
    const type = (r.matchType || 'unknown').padEnd(10);
    const sim = (r.similarity?.toFixed(2) || '1.00').padStart(6);
    console.log(`│ ${paper} │ ${matched} │ ${type} │ ${sim} │`);
  });
  
  console.log('└────────────────────────────────────┴──────────────────────┴────────────┴────────┘');
  
  // 統計サマリー
  const uniquePapers = testPapers.length - results.length;
  
  console.log('\n📈 統計サマリー:');
  console.log('┌────────────────────────────────────┬────────┐');
  console.log('│ 指標                               │ 値     │');
  console.log('├────────────────────────────────────┼────────┤');
  console.log(`│ 入力論文数                         │ ${String(testPapers.length).padStart(6)} │`);
  console.log(`│ 検出された重複数                   │ ${String(results.length).padStart(6)} │`);
  console.log(`│ 推定ユニーク論文数                 │ ${String(uniquePapers).padStart(6)} │`);
  console.log(`│ 重複率                             │ ${((results.length / testPapers.length) * 100).toFixed(1).padStart(5)}% │`);
  console.log('└────────────────────────────────────┴────────┘');
  
  // 理由別統計
  const byType = results.reduce((acc, r) => {
    acc[r.matchType] = (acc[r.matchType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n📊 重複検出タイプの内訳:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`   - ${type}: ${count}件`);
  });
  
  console.log('\n💡 v3.0.0 Deduplicatorの特徴:');
  console.log('   ✅ DOI完全一致検出');
  console.log('   ✅ arXiv ID完全一致検出');
  console.log('   ✅ タイトル類似度マッチング（≥0.95で重複確定）');
  console.log('   ✅ タイトル+著者マッチング（タイトル≥0.8 + 著者3名以上）');
  console.log('   ✅ レビュー必要フラグ付き');
  
  // 結果をファイルに保存
  const outputPath = path.join(process.cwd(), 'outputs/experiments/exp-005-results.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    experiment: 'EXP-005',
    title: 'Deduplicator による論文重複検出',
    timestamp: new Date().toISOString(),
    config: {
      titleExactThreshold: 0.95,
      titleCandidateThreshold: 0.8,
      minAuthorMatches: 3,
    },
    statistics: {
      inputPapers: testPapers.length,
      duplicatesFound: results.length,
      uniquePapers,
      byType,
    },
    results,
  }, null, 2));
  
  console.log(`\n✅ 結果を保存: ${outputPath}`);
  
  return {
    duplicatesFound: results.length,
    uniquePapers,
    results,
  };
}

runExperiment().catch(console.error);
