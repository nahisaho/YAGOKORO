/**
 * EXP-003: RelationScorer 実験
 * 
 * v3.0.0の新機能 - マルチファクター信頼度スコアリング
 */
import { RelationScorer, DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS } from '../../libs/extractor/src/scorer/relation-scorer.js';
import type { ExtractedRelation } from '../../libs/extractor/src/types.js';
import * as fs from 'fs';
import * as path from 'path';

async function runExperiment() {
  console.log('='.repeat(60));
  console.log('EXP-003: RelationScorer による信頼度スコアリング');
  console.log('='.repeat(60));
  
  // RelationScorerの初期化
  const scorer = new RelationScorer({
    weights: DEFAULT_WEIGHTS,
    thresholds: DEFAULT_THRESHOLDS,
  });
  
  console.log('\n📊 スコアリング設定:');
  console.log('   重み付け:');
  console.log(`   - 共起スコア: ${DEFAULT_WEIGHTS.cooccurrence} (30%)`);
  console.log(`   - LLM信頼度: ${DEFAULT_WEIGHTS.llm} (30%)`);
  console.log(`   - ソース信頼性: ${DEFAULT_WEIGHTS.source} (20%)`);
  console.log(`   - グラフ整合性: ${DEFAULT_WEIGHTS.graph} (20%)`);
  console.log('\n   HITL閾値:');
  console.log(`   - 自動承認: >= ${DEFAULT_THRESHOLDS.autoApprove}`);
  console.log(`   - レビュー: >= ${DEFAULT_THRESHOLDS.review}`);
  console.log(`   - 却下: < ${DEFAULT_THRESHOLDS.review}`);
  
  // テスト用の抽出関係データ
  const testRelations: Array<{
    relation: ExtractedRelation;
    scores: {
      cooccurrenceScore: number;
      llmConfidence: number;
      sourceReliability: number;
      graphConsistency: number;
    };
    description: string;
  }> = [
    // 高信頼度ケース（自動承認）
    {
      relation: {
        sourceId: 'bert',
        targetId: 'google',
        type: 'DEVELOPED_BY',
        evidence: ['BERT was developed by Google AI Language team'],
      },
      scores: {
        cooccurrenceScore: 0.9,
        llmConfidence: 0.95,
        sourceReliability: 0.85,
        graphConsistency: 0.9,
      },
      description: 'BERT → Google (高信頼度: 複数ソースで確認)',
    },
    // 中信頼度ケース（レビュー必要）
    {
      relation: {
        sourceId: 'gpt-3',
        targetId: 'web-corpus',
        type: 'TRAINED_ON',
        evidence: ['GPT-3 was trained on web crawl data'],
      },
      scores: {
        cooccurrenceScore: 0.6,
        llmConfidence: 0.7,
        sourceReliability: 0.5,
        graphConsistency: 0.6,
      },
      description: 'GPT-3 → WebCorpus (中信頼度: 詳細不明)',
    },
    // 低信頼度ケース（却下）
    {
      relation: {
        sourceId: 'llama',
        targetId: 'anthropic',
        type: 'DEVELOPED_BY',
        evidence: ['Model developed by company'],
      },
      scores: {
        cooccurrenceScore: 0.2,
        llmConfidence: 0.3,
        sourceReliability: 0.4,
        graphConsistency: 0.1,
      },
      description: 'LLaMA → Anthropic (低信頼度: 誤情報の可能性)',
    },
    // エッジケース: LLM高・他低
    {
      relation: {
        sourceId: 'palm',
        targetId: 'google',
        type: 'DEVELOPED_BY',
        evidence: ['PaLM is a Google model'],
      },
      scores: {
        cooccurrenceScore: 0.3,
        llmConfidence: 0.95,
        sourceReliability: 0.5,
        graphConsistency: 0.4,
      },
      description: 'PaLM → Google (LLMのみ高信頼)',
    },
    // エッジケース: 共起高・LLM低
    {
      relation: {
        sourceId: 'transformer',
        targetId: 'attention',
        type: 'USES_TECHNIQUE',
        evidence: ['transformer uses attention mechanism'],
      },
      scores: {
        cooccurrenceScore: 0.95,
        llmConfidence: 0.4,
        sourceReliability: 0.7,
        graphConsistency: 0.8,
      },
      description: 'Transformer → Attention (共起分析高・LLM低)',
    },
    // 境界値ケース
    {
      relation: {
        sourceId: 'roberta',
        targetId: 'bert',
        type: 'DERIVED_FROM',
        evidence: ['RoBERTa improves upon BERT'],
      },
      scores: {
        cooccurrenceScore: 0.7,
        llmConfidence: 0.65,
        sourceReliability: 0.6,
        graphConsistency: 0.75,
      },
      description: 'RoBERTa → BERT (境界値: 自動承認ギリギリ)',
    },
  ];
  
  console.log('\n🔍 スコアリング実行中...\n');
  
  const results: any[] = [];
  
  testRelations.forEach((test, index) => {
    const scored = scorer.score(test.relation, test.scores);
    
    const statusEmoji = {
      'approved': '✅',
      'pending': '🔶',
      'rejected': '❌',
    }[scored.reviewStatus] || '❓';
    
    results.push({
      index: index + 1,
      description: test.description,
      inputScores: test.scores,
      finalScore: scored.confidence,
      status: scored.reviewStatus,
    });
    
    console.log(`${index + 1}. ${test.description}`);
    console.log(`   入力スコア:`);
    console.log(`     - 共起: ${test.scores.cooccurrenceScore.toFixed(2)} × 0.30 = ${(test.scores.cooccurrenceScore * 0.3).toFixed(3)}`);
    console.log(`     - LLM: ${test.scores.llmConfidence.toFixed(2)} × 0.30 = ${(test.scores.llmConfidence * 0.3).toFixed(3)}`);
    console.log(`     - ソース: ${test.scores.sourceReliability.toFixed(2)} × 0.20 = ${(test.scores.sourceReliability * 0.2).toFixed(3)}`);
    console.log(`     - グラフ: ${test.scores.graphConsistency.toFixed(2)} × 0.20 = ${(test.scores.graphConsistency * 0.2).toFixed(3)}`);
    console.log(`   📊 最終スコア: ${scored.confidence.toFixed(3)}`);
    console.log(`   ${statusEmoji} ステータス: ${scored.reviewStatus}\n`);
  });
  
  // 統計サマリー
  const statusCounts = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('📈 統計サマリー:');
  console.log('┌──────────────────┬────────┬────────────────────────────┐');
  console.log('│ ステータス       │ 件数   │ 割合                       │');
  console.log('├──────────────────┼────────┼────────────────────────────┤');
  
  const total = results.length;
  Object.entries(statusCounts).forEach(([status, count]) => {
    const emoji = { 'approved': '✅', 'pending': '🔶', 'rejected': '❌' }[status] || '';
    const percent = ((count as number) / total * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor((count as number) / total * 20));
    console.log(`│ ${emoji} ${status.padEnd(13)} │ ${String(count).padStart(6)} │ ${bar.padEnd(20)} ${percent}% │`);
  });
  console.log('└──────────────────┴────────┴────────────────────────────┘');
  
  console.log('\n💡 HITLワークフローの意義:');
  console.log('   - 自動承認 (approved): 人間のレビュー不要で知識グラフに追加');
  console.log('   - 保留 (pending): 専門家による確認後に追加');
  console.log('   - 却下 (rejected): 信頼性が低く、さらなる検証が必要');
  
  // 結果をファイルに保存
  const outputPath = path.join(process.cwd(), 'outputs/experiments/exp-003-results.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    experiment: 'EXP-003',
    title: 'RelationScorer による信頼度スコアリング',
    timestamp: new Date().toISOString(),
    config: {
      weights: DEFAULT_WEIGHTS,
      thresholds: DEFAULT_THRESHOLDS,
    },
    statistics: {
      total: total,
      statusCounts,
      avgScore: results.reduce((sum, r) => sum + r.finalScore, 0) / total,
    },
    results,
  }, null, 2));
  
  console.log(`\n✅ 結果を保存: ${outputPath}`);
  
  return {
    total,
    statusCounts,
    results,
  };
}

runExperiment().catch(console.error);
