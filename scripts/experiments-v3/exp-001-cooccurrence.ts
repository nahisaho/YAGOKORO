/**
 * EXP-001: CooccurrenceAnalyzer 実験
 * 
 * v3.0.0の新機能 - エンティティ共起分析による関係発見
 */
import { CooccurrenceAnalyzer } from '../../libs/extractor/src/cooccurrence/cooccurrence-analyzer.js';
import type { ExtractionDocument, DocumentEntity } from '../../libs/extractor/src/types.js';
import * as fs from 'fs';
import * as path from 'path';

async function runExperiment() {
  console.log('='.repeat(60));
  console.log('EXP-001: CooccurrenceAnalyzer による関係発見');
  console.log('='.repeat(60));
  
  // サンプルドキュメントを読み込み
  const chunksDir = path.join(process.cwd(), 'data/chunks');
  
  // Attention Is All You Need 論文を使用
  const transformerFile = path.join(chunksDir, '1706_03762.json');
  const bertFile = path.join(chunksDir, '1810_04805.json');
  
  // ファイル読み込み
  const transformerData = JSON.parse(fs.readFileSync(transformerFile, 'utf-8'));
  const bertData = JSON.parse(fs.readFileSync(bertFile, 'utf-8'));
  
  console.log('\n📚 分析対象論文:');
  console.log(`  1. ${transformerData.title} (${transformerData.chunks?.length || 0} chunks)`);
  console.log(`  2. ${bertData.title} (${bertData.chunks?.length || 0} chunks)`);
  
  // CooccurrenceAnalyzerの設定
  const analyzer = new CooccurrenceAnalyzer({
    minCount: 2,
    levels: ['document', 'paragraph', 'sentence'],
    normalizeNames: true,
    caseSensitive: false,
  });
  
  // エンティティリストを定義（AI分野の主要エンティティ）
  const entities: DocumentEntity[] = [
    { id: '1', name: 'Transformer', type: 'Architecture', mentions: [] },
    { id: '2', name: 'attention', type: 'Technique', mentions: [] },
    { id: '3', name: 'self-attention', type: 'Technique', mentions: [] },
    { id: '4', name: 'encoder', type: 'Component', mentions: [] },
    { id: '5', name: 'decoder', type: 'Component', mentions: [] },
    { id: '6', name: 'BERT', type: 'Model', mentions: [] },
    { id: '7', name: 'GPT', type: 'Model', mentions: [] },
    { id: '8', name: 'language model', type: 'Concept', mentions: [] },
    { id: '9', name: 'pre-training', type: 'Technique', mentions: [] },
    { id: '10', name: 'fine-tuning', type: 'Technique', mentions: [] },
  ];
  
  // ドキュメントを結合
  const transformerText = transformerData.chunks?.map((c: any) => c.content || c.text || '').join('\n\n') || '';
  const bertText = bertData.chunks?.map((c: any) => c.content || c.text || '').join('\n\n') || '';
  
  const documents: ExtractionDocument[] = [
    { id: 'transformer-paper', content: transformerText, metadata: { title: transformerData.title }, entities },
    { id: 'bert-paper', content: bertText, metadata: { title: bertData.title }, entities },
  ];
  
  console.log('\n🔍 共起分析を実行中...');
  console.log('   分析レベル: document, paragraph, sentence');
  console.log(`   最小共起数: 2`);
  console.log(`   名前正規化: 有効`);
  
  // 共起分析の実行（複数ドキュメント）
  const results = analyzer.analyzeMultiple(documents);
  
  console.log('\n📊 分析結果:');
  console.log(`   検出された共起ペア数: ${results.length}`);
  
  // 上位10件の共起ペアを表示
  const topPairs = results
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  console.log('\n🔝 上位10件の共起ペア:');
  console.log('┌─────────────────────────────┬─────────────────────────────┬────────┬────────────┐');
  console.log('│ エンティティ1               │ エンティティ2               │ 出現数 │ ドキュメント│');
  console.log('├─────────────────────────────┼─────────────────────────────┼────────┼────────────┤');
  
  topPairs.forEach((pair) => {
    const e1Name = entities.find(e => e.id === pair.sourceId)?.name || pair.sourceId;
    const e2Name = entities.find(e => e.id === pair.targetId)?.name || pair.targetId;
    const e1 = e1Name.padEnd(27);
    const e2 = e2Name.padEnd(27);
    const count = pair.count.toString().padStart(6);
    const docs = pair.documentIds.length.toString().padStart(10);
    console.log(`│ ${e1} │ ${e2} │ ${count} │ ${docs} │`);
  });
  
  console.log('└─────────────────────────────┴─────────────────────────────┴────────┴────────────┘');
  
  // 発見された関係候補
  console.log('\n💡 発見された関係候補:');
  
  const relationCandidates = topPairs.map(pair => {
    const e1 = entities.find(e => e.id === pair.sourceId);
    const e2 = entities.find(e => e.id === pair.targetId);
    return {
      source: e1?.name || pair.sourceId,
      target: e2?.name || pair.targetId,
      sourceType: e1?.type || 'Unknown',
      targetType: e2?.type || 'Unknown',
      suggestedRelation: inferRelation(e1?.type || '', e2?.type || ''),
      count: pair.count,
    };
  });
  
  relationCandidates.forEach((rel, i) => {
    console.log(`   ${i + 1}. ${rel.source} --[${rel.suggestedRelation}]--> ${rel.target} (共起数: ${rel.count})`);
  });
  
  // 統計サマリー
  console.log('\n📈 統計サマリー:');
  console.log(`   総ドキュメント数: ${documents.length}`);
  console.log(`   総エンティティ数: ${entities.length}`);
  console.log(`   検出ペア数: ${results.length}`);
  console.log(`   平均共起数: ${(results.reduce((sum, p) => sum + p.count, 0) / results.length).toFixed(2)}`);
  console.log(`   最高共起数: ${Math.max(...results.map(p => p.count))}`);
  
  // 結果をファイルに保存
  const outputPath = path.join(process.cwd(), 'outputs/experiments/exp-001-results.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({
    experiment: 'EXP-001',
    title: 'CooccurrenceAnalyzer による関係発見',
    timestamp: new Date().toISOString(),
    config: {
      minCount: 2,
      levels: ['document', 'paragraph', 'sentence'],
      normalizeNames: true,
    },
    documents: documents.map(d => ({ id: d.id, title: d.metadata?.title })),
    entities: entities.map(e => ({ id: e.id, name: e.name, type: e.type })),
    results: {
      pairCount: results.length,
      topPairs: topPairs,
      relationCandidates: relationCandidates,
    },
  }, null, 2));
  
  console.log(`\n✅ 結果を保存: ${outputPath}`);
  
  return {
    pairCount: results.length,
    topPairs,
    relationCandidates,
  };
}

function inferRelation(type1: string, type2: string): string {
  const relationMap: Record<string, Record<string, string>> = {
    'Architecture': {
      'Technique': 'USES_TECHNIQUE',
      'Component': 'HAS_COMPONENT',
      'Model': 'INSPIRED',
    },
    'Model': {
      'Technique': 'USES_TECHNIQUE',
      'Architecture': 'BASED_ON',
      'Concept': 'IMPLEMENTS',
    },
    'Technique': {
      'Concept': 'RELATED_TO',
      'Component': 'APPLIED_TO',
    },
  };
  
  return relationMap[type1]?.[type2] || relationMap[type2]?.[type1] || 'RELATED_TO';
}

runExperiment().catch(console.error);
