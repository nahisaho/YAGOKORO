/**
 * EXP-002: PatternMatcher 実験
 * 
 * v3.0.0の新機能 - 動詞パターンによる関係タイプ推論
 */
import { PatternMatcher } from '../../libs/extractor/src/pattern/pattern-matcher.js';
import type { DocumentEntity } from '../../libs/extractor/src/types.js';
import * as fs from 'fs';
import * as path from 'path';

async function runExperiment() {
  console.log('='.repeat(60));
  console.log('EXP-002: PatternMatcher による関係タイプ推論');
  console.log('='.repeat(60));
  
  // サンプルテキスト（実際の論文から抽出した文章）
  const testTexts = [
    // DEVELOPED_BY パターン
    "BERT was developed by Google AI Language team in 2018.",
    "GPT-3 was created by OpenAI researchers.",
    "The Transformer architecture was introduced by Vaswani et al.",
    
    // TRAINED_ON パターン
    "BERT was trained on BookCorpus and Wikipedia datasets.",
    "The model was fine-tuned on the SQuAD dataset.",
    "GPT-3 was trained using a massive web crawl corpus.",
    
    // USES_TECHNIQUE パターン
    "BERT uses masked language modeling for pre-training.",
    "GPT-3 employs few-shot learning techniques.",
    "The model is based on the Transformer architecture.",
    
    // DERIVED_FROM パターン
    "RoBERTa is derived from BERT with improved training.",
    "DistilBERT was distilled from BERT using knowledge distillation.",
    "GPT-2 builds upon the original GPT architecture.",
    
    // EVALUATED_ON パターン
    "BERT was evaluated on GLUE benchmark tasks.",
    "The model achieved state-of-the-art results on SQuAD.",
    "Performance was measured on the MMLU benchmark.",
    
    // COLLABORATES_WITH パターン
    "Google and DeepMind collaborated on this research.",
    "The work was done in partnership with Stanford University.",
  ];
  
  // エンティティの定義
  const entities: DocumentEntity[] = [
    { id: '1', name: 'BERT', type: 'AIModel', mentions: [] },
    { id: '2', name: 'GPT-3', type: 'AIModel', mentions: [] },
    { id: '3', name: 'GPT-2', type: 'AIModel', mentions: [] },
    { id: '4', name: 'GPT', type: 'AIModel', mentions: [] },
    { id: '5', name: 'Transformer', type: 'Architecture', mentions: [] },
    { id: '6', name: 'RoBERTa', type: 'AIModel', mentions: [] },
    { id: '7', name: 'DistilBERT', type: 'AIModel', mentions: [] },
    { id: '8', name: 'Google AI', type: 'Organization', mentions: [] },
    { id: '9', name: 'OpenAI', type: 'Organization', mentions: [] },
    { id: '10', name: 'DeepMind', type: 'Organization', mentions: [] },
    { id: '11', name: 'Google', type: 'Organization', mentions: [] },
    { id: '12', name: 'Stanford University', type: 'Organization', mentions: [] },
    { id: '13', name: 'BookCorpus', type: 'Dataset', mentions: [] },
    { id: '14', name: 'Wikipedia', type: 'Dataset', mentions: [] },
    { id: '15', name: 'SQuAD', type: 'Benchmark', mentions: [] },
    { id: '16', name: 'GLUE', type: 'Benchmark', mentions: [] },
    { id: '17', name: 'MMLU', type: 'Benchmark', mentions: [] },
    { id: '18', name: 'masked language modeling', type: 'Technique', mentions: [] },
    { id: '19', name: 'few-shot learning', type: 'Technique', mentions: [] },
    { id: '20', name: 'knowledge distillation', type: 'Technique', mentions: [] },
  ];
  
  // PatternMatcherの初期化
  const matcher = new PatternMatcher({
    minConfidence: 0.3,
    useDefaultPatterns: true,
    entityWindowSize: 100,
  });
  
  console.log('\n🔍 パターンマッチング実行中...');
  console.log(`   使用パターン: デフォルトパターン`);
  console.log(`   最小信頼度: 0.3`);
  console.log(`   エンティティウィンドウ: 100文字`);
  
  const allMatches: any[] = [];
  
  // 各テキストでパターンマッチング
  testTexts.forEach((text, index) => {
    const matches = matcher.match(text, entities);
    
    if (matches.length > 0) {
      matches.forEach(match => {
        allMatches.push({
          textIndex: index + 1,
          text: text,
          pattern: match.patternName,
          relationType: match.relationType,
          confidence: match.confidence,
          source: match.sourceEntity?.name || match.matchedText,
          target: match.targetEntity?.name || 'N/A',
          matchedText: match.matchedText,
        });
      });
    }
  });
  
  console.log('\n📊 パターンマッチング結果:');
  console.log(`   総テキスト数: ${testTexts.length}`);
  console.log(`   検出マッチ数: ${allMatches.length}`);
  
  // 関係タイプ別の統計
  const byRelationType = allMatches.reduce((acc, m) => {
    acc[m.relationType] = (acc[m.relationType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n📈 関係タイプ別検出数:');
  console.log('┌──────────────────────┬────────┐');
  console.log('│ 関係タイプ           │ 検出数 │');
  console.log('├──────────────────────┼────────┤');
  Object.entries(byRelationType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`│ ${type.padEnd(20)} │ ${String(count).padStart(6)} │`);
  });
  console.log('└──────────────────────┴────────┘');
  
  // 詳細結果
  console.log('\n🔝 検出された関係候補（上位15件）:');
  console.log('┌────┬──────────────────────┬──────────────────────┬──────────────────────┬────────┐');
  console.log('│ No │ ソース               │ 関係タイプ           │ ターゲット           │ 信頼度 │');
  console.log('├────┼──────────────────────┼──────────────────────┼──────────────────────┼────────┤');
  
  allMatches.slice(0, 15).forEach((match, i) => {
    const source = (match.source || '-').substring(0, 20).padEnd(20);
    const rel = match.relationType.substring(0, 20).padEnd(20);
    const target = (match.target || '-').substring(0, 20).padEnd(20);
    const conf = match.confidence.toFixed(2).padStart(6);
    console.log(`│ ${String(i + 1).padStart(2)} │ ${source} │ ${rel} │ ${target} │ ${conf} │`);
  });
  console.log('└────┴──────────────────────┴──────────────────────┴──────────────────────┴────────┘');
  
  // 使用されたパターン一覧
  const patternUsage = allMatches.reduce((acc, m) => {
    acc[m.pattern] = (acc[m.pattern] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n🎯 使用されたパターン:');
  Object.entries(patternUsage).sort((a, b) => b[1] - a[1]).forEach(([pattern, count]) => {
    console.log(`   - ${pattern}: ${count}回`);
  });
  
  // 結果をファイルに保存
  const outputPath = path.join(process.cwd(), 'outputs/experiments/exp-002-results.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    experiment: 'EXP-002',
    title: 'PatternMatcher による関係タイプ推論',
    timestamp: new Date().toISOString(),
    config: {
      minConfidence: 0.3,
      useDefaultPatterns: true,
      entityWindowSize: 100,
    },
    statistics: {
      totalTexts: testTexts.length,
      totalMatches: allMatches.length,
      byRelationType,
      patternUsage,
    },
    results: allMatches,
  }, null, 2));
  
  console.log(`\n✅ 結果を保存: ${outputPath}`);
  
  return {
    totalMatches: allMatches.length,
    byRelationType,
    patternUsage,
  };
}

runExperiment().catch(console.error);
