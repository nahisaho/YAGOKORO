#!/usr/bin/env node
/**
 * YAGOKORO v2 新機能の詳細テスト
 * 実際のv2実装コードを使用して検証
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// v2パッケージをインポート
import { NormalizationService, NameVariantDetector, EntityMerger } from '../libs/normalizer/src';
import { NLQService, CypherGenerator, IntentParser } from '../libs/nlq/src';
import { BFSPathFinder, PathExplainer, ChainOfThoughtReasoner } from '../libs/reasoner/src';
import { GapAnalyzer, ReportGenerator, LifecycleAnalyzer } from '../libs/analyzer/src';
import { HallucinationDetector, FactChecker, ConsistencyChecker } from '../libs/hallucination/src';

// Ollama設定
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://192.168.224.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b';

interface Entity {
  name: string;
  type: string;
  confidence: number;
  description?: string;
}

interface Relation {
  type: string;
  sourceName: string;
  targetName: string;
  confidence: number;
}

interface GraphData {
  metadata: {
    generatedAt: string;
    totalPapers: number;
    totalEntities: number;
    totalRelations: number;
  };
  entities: Entity[];
  relations: Relation[];
}

interface DetailedTestResult {
  testId: string;
  feature: string;
  component: string;
  input: unknown;
  output: unknown;
  executionTime: number;
  success: boolean;
  error?: string;
}

// ============================================================
// テスト1: NormalizationService詳細テスト
// ============================================================
async function testNormalizationServiceDetailed(data: GraphData): Promise<DetailedTestResult[]> {
  console.log('\n🔧 Testing NormalizationService in detail...');
  const results: DetailedTestResult[] = [];
  
  // NameVariantDetector テスト
  const detector = new NameVariantDetector();
  const testNames = ['GPT-3', 'GPT3', 'gpt 3', 'Chain-of-Thought', 'CoT', 'chain of thought'];
  
  const startTime = Date.now();
  const variants: string[][] = [];
  for (let i = 0; i < testNames.length; i++) {
    for (let j = i + 1; j < testNames.length; j++) {
      const similarity = detector.calculateSimilarity(testNames[i], testNames[j]);
      if (similarity > 0.7) {
        variants.push([testNames[i], testNames[j], similarity.toFixed(2)]);
      }
    }
  }
  
  results.push({
    testId: 'NORM-001',
    feature: 'Entity Normalization',
    component: 'NameVariantDetector.calculateSimilarity',
    input: testNames,
    output: variants,
    executionTime: Date.now() - startTime,
    success: variants.length > 0,
  });
  
  // NormalizationService テスト
  const normalizer = new NormalizationService();
  const normStart = Date.now();
  const normalizedEntities = data.entities.map(e => ({
    original: e.name,
    normalized: normalizer.normalize(e.name || ''),
  }));
  
  const uniqueNormalized = new Set(normalizedEntities.map(e => e.normalized));
  
  results.push({
    testId: 'NORM-002',
    feature: 'Entity Normalization',
    component: 'NormalizationService.normalize',
    input: { entityCount: data.entities.length },
    output: {
      originalCount: data.entities.length,
      normalizedUniqueCount: uniqueNormalized.size,
      reductionRate: `${((data.entities.length - uniqueNormalized.size) / data.entities.length * 100).toFixed(1)}%`,
      sampleMappings: normalizedEntities.slice(0, 10),
    },
    executionTime: Date.now() - normStart,
    success: true,
  });
  
  // EntityMerger テスト
  const merger = new EntityMerger(0.8);
  const mergeStart = Date.now();
  const mergeGroups = merger.findMergeGroups(data.entities.map(e => e.name || '').filter(n => n));
  
  results.push({
    testId: 'NORM-003',
    feature: 'Entity Normalization',
    component: 'EntityMerger.findMergeGroups',
    input: { threshold: 0.8 },
    output: {
      mergeGroupCount: mergeGroups.length,
      sampleGroups: mergeGroups.slice(0, 5),
    },
    executionTime: Date.now() - mergeStart,
    success: true,
  });
  
  return results;
}

// ============================================================
// テスト2: NLQService詳細テスト
// ============================================================
async function testNLQServiceDetailed(): Promise<DetailedTestResult[]> {
  console.log('\n🔍 Testing NLQService in detail...');
  const results: DetailedTestResult[] = [];
  
  // IntentParser テスト
  const parser = new IntentParser();
  const testQueries = [
    'TransformerアーキテクチャはどのようなAIモデルに影響を与えましたか？',
    'OpenAIが開発したモデルを教えてください',
    'GPT-4とLLaMAの違いは何ですか？',
  ];
  
  for (let i = 0; i < testQueries.length; i++) {
    const startTime = Date.now();
    try {
      const intent = await parser.parse(testQueries[i]);
      results.push({
        testId: `NLQ-00${i + 1}`,
        feature: 'Natural Language Query',
        component: 'IntentParser.parse',
        input: testQueries[i],
        output: intent,
        executionTime: Date.now() - startTime,
        success: true,
      });
    } catch (error) {
      results.push({
        testId: `NLQ-00${i + 1}`,
        feature: 'Natural Language Query',
        component: 'IntentParser.parse',
        input: testQueries[i],
        output: null,
        executionTime: Date.now() - startTime,
        success: false,
        error: String(error),
      });
    }
  }
  
  // CypherGenerator テスト
  const generator = new CypherGenerator();
  const cypherStart = Date.now();
  try {
    const cypher = generator.generate({
      queryType: 'search',
      entityTypes: ['AIModel'],
      relationships: ['DEVELOPED_BY'],
      filters: [{ field: 'organization', value: 'OpenAI' }],
    });
    results.push({
      testId: 'NLQ-004',
      feature: 'Natural Language Query',
      component: 'CypherGenerator.generate',
      input: { queryType: 'search', entityTypes: ['AIModel'] },
      output: cypher,
      executionTime: Date.now() - cypherStart,
      success: true,
    });
  } catch (error) {
    results.push({
      testId: 'NLQ-004',
      feature: 'Natural Language Query',
      component: 'CypherGenerator.generate',
      input: {},
      output: null,
      executionTime: Date.now() - cypherStart,
      success: false,
      error: String(error),
    });
  }
  
  return results;
}

// ============================================================
// テスト3: BFSPathFinder詳細テスト
// ============================================================
async function testPathFinderDetailed(data: GraphData): Promise<DetailedTestResult[]> {
  console.log('\n🔗 Testing BFSPathFinder in detail...');
  const results: DetailedTestResult[] = [];
  
  // グラフ構築
  const nodes = new Map<string, { type: string }>();
  const edges: Array<{ source: string; target: string; type: string }> = [];
  
  for (const entity of data.entities) {
    if (entity.name) {
      nodes.set(entity.name.toLowerCase(), { type: entity.type });
    }
  }
  
  for (const rel of data.relations) {
    if (rel.sourceName && rel.targetName) {
      edges.push({
        source: rel.sourceName.toLowerCase(),
        target: rel.targetName.toLowerCase(),
        type: rel.type,
      });
    }
  }
  
  const pathFinder = new BFSPathFinder(nodes, edges);
  
  // パス探索テスト
  const testCases = [
    { start: 'transformer', end: 'gpt-4', maxHops: 4 },
    { start: 'attention', end: 'chatgpt', maxHops: 4 },
    { start: 'openai', end: 'rlhf', maxHops: 3 },
  ];
  
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const startTime = Date.now();
    try {
      const paths = pathFinder.findPaths(tc.start, tc.end, tc.maxHops);
      results.push({
        testId: `PATH-00${i + 1}`,
        feature: 'Multi-hop Reasoning',
        component: 'BFSPathFinder.findPaths',
        input: tc,
        output: {
          pathsFound: paths.length,
          paths: paths.slice(0, 3),
        },
        executionTime: Date.now() - startTime,
        success: true,
      });
    } catch (error) {
      results.push({
        testId: `PATH-00${i + 1}`,
        feature: 'Multi-hop Reasoning',
        component: 'BFSPathFinder.findPaths',
        input: tc,
        output: null,
        executionTime: Date.now() - startTime,
        success: false,
        error: String(error),
      });
    }
  }
  
  // ChainOfThoughtReasoner テスト
  const reasoner = new ChainOfThoughtReasoner();
  const cotStart = Date.now();
  try {
    const reasoning = await reasoner.reason(
      '「Attention is All You Need」論文はどのようにしてGPT-4の開発に影響を与えましたか？',
      { graph: { nodes: Array.from(nodes.entries()).slice(0, 50) } }
    );
    results.push({
      testId: 'PATH-004',
      feature: 'Multi-hop Reasoning',
      component: 'ChainOfThoughtReasoner.reason',
      input: 'Attention → GPT-4 reasoning chain',
      output: reasoning,
      executionTime: Date.now() - cotStart,
      success: true,
    });
  } catch (error) {
    results.push({
      testId: 'PATH-004',
      feature: 'Multi-hop Reasoning',
      component: 'ChainOfThoughtReasoner.reason',
      input: 'Attention → GPT-4 reasoning chain',
      output: null,
      executionTime: Date.now() - cotStart,
      success: false,
      error: String(error),
    });
  }
  
  return results;
}

// ============================================================
// テスト4: GapAnalyzer詳細テスト
// ============================================================
async function testGapAnalyzerDetailed(data: GraphData): Promise<DetailedTestResult[]> {
  console.log('\n🔬 Testing GapAnalyzer in detail...');
  const results: DetailedTestResult[] = [];
  
  const analyzer = new GapAnalyzer();
  
  // Research Gap分析
  const gapStart = Date.now();
  try {
    const gaps = analyzer.analyzeGaps(data.entities, data.relations);
    results.push({
      testId: 'GAP-001',
      feature: 'Research Gap Analysis',
      component: 'GapAnalyzer.analyzeGaps',
      input: { entities: data.entities.length, relations: data.relations.length },
      output: gaps,
      executionTime: Date.now() - gapStart,
      success: true,
    });
  } catch (error) {
    results.push({
      testId: 'GAP-001',
      feature: 'Research Gap Analysis',
      component: 'GapAnalyzer.analyzeGaps',
      input: {},
      output: null,
      executionTime: Date.now() - gapStart,
      success: false,
      error: String(error),
    });
  }
  
  // LifecycleAnalyzer テスト
  const lifecycleAnalyzer = new LifecycleAnalyzer();
  const lcStart = Date.now();
  try {
    const lifecycle = lifecycleAnalyzer.analyze(
      data.entities.filter(e => e.type === 'Technique' || e.type === 'Concept')
    );
    results.push({
      testId: 'GAP-002',
      feature: 'Research Gap Analysis',
      component: 'LifecycleAnalyzer.analyze',
      input: { entityCount: data.entities.length },
      output: lifecycle,
      executionTime: Date.now() - lcStart,
      success: true,
    });
  } catch (error) {
    results.push({
      testId: 'GAP-002',
      feature: 'Research Gap Analysis',
      component: 'LifecycleAnalyzer.analyze',
      input: {},
      output: null,
      executionTime: Date.now() - lcStart,
      success: false,
      error: String(error),
    });
  }
  
  // ReportGenerator テスト
  const reportGen = new ReportGenerator();
  const reportStart = Date.now();
  try {
    const report = await reportGen.generate({
      type: 'gap-analysis',
      data: { entities: data.entities.slice(0, 20), relations: data.relations.slice(0, 20) },
    });
    results.push({
      testId: 'GAP-003',
      feature: 'Research Gap Analysis',
      component: 'ReportGenerator.generate',
      input: { type: 'gap-analysis' },
      output: { reportLength: report.length, preview: report.substring(0, 500) },
      executionTime: Date.now() - reportStart,
      success: true,
    });
  } catch (error) {
    results.push({
      testId: 'GAP-003',
      feature: 'Research Gap Analysis',
      component: 'ReportGenerator.generate',
      input: { type: 'gap-analysis' },
      output: null,
      executionTime: Date.now() - reportStart,
      success: false,
      error: String(error),
    });
  }
  
  return results;
}

// ============================================================
// テスト5: HallucinationDetector詳細テスト
// ============================================================
async function testHallucinationDetectorDetailed(data: GraphData): Promise<DetailedTestResult[]> {
  console.log('\n🛡️ Testing HallucinationDetector in detail...');
  const results: DetailedTestResult[] = [];
  
  const detector = new HallucinationDetector();
  
  // テスト文
  const testStatements = [
    { text: 'GPT-4はOpenAIによって2023年に発表されました', expectedValid: true },
    { text: 'LLaMAはGoogleが開発したモデルです', expectedValid: false },
    { text: 'TransformerはAttention機構を使用しています', expectedValid: true },
  ];
  
  for (let i = 0; i < testStatements.length; i++) {
    const stmt = testStatements[i];
    const startTime = Date.now();
    try {
      const result = await detector.detect(stmt.text, {
        entities: data.entities,
        relations: data.relations,
      });
      results.push({
        testId: `HALL-00${i + 1}`,
        feature: 'Hallucination Detection',
        component: 'HallucinationDetector.detect',
        input: stmt,
        output: result,
        executionTime: Date.now() - startTime,
        success: true,
      });
    } catch (error) {
      results.push({
        testId: `HALL-00${i + 1}`,
        feature: 'Hallucination Detection',
        component: 'HallucinationDetector.detect',
        input: stmt,
        output: null,
        executionTime: Date.now() - startTime,
        success: false,
        error: String(error),
      });
    }
  }
  
  // ConsistencyChecker テスト
  const checker = new ConsistencyChecker();
  const consistencyStart = Date.now();
  try {
    const consistency = checker.check([
      'GPT-4はOpenAIが開発した',
      'GPT-4はTransformerアーキテクチャを使用',
      'GPT-4は2023年3月に発表された',
    ]);
    results.push({
      testId: 'HALL-004',
      feature: 'Hallucination Detection',
      component: 'ConsistencyChecker.check',
      input: '3 statements about GPT-4',
      output: consistency,
      executionTime: Date.now() - consistencyStart,
      success: true,
    });
  } catch (error) {
    results.push({
      testId: 'HALL-004',
      feature: 'Hallucination Detection',
      component: 'ConsistencyChecker.check',
      input: '3 statements about GPT-4',
      output: null,
      executionTime: Date.now() - consistencyStart,
      success: false,
      error: String(error),
    });
  }
  
  return results;
}

// ============================================================
// メイン実行
// ============================================================
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  YAGOKORO v2 詳細機能テスト');
  console.log('  実行日時: ' + new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════');
  
  // データ読み込み
  const dataPath = join(process.cwd(), 'outputs', 'genai-graphrag-data.json');
  console.log(`\n📂 Loading data from: ${dataPath}`);
  
  let data: GraphData;
  try {
    const content = await readFile(dataPath, 'utf-8');
    data = JSON.parse(content);
    console.log(`  Entities: ${data.metadata.totalEntities}`);
    console.log(`  Relations: ${data.metadata.totalRelations}`);
  } catch (error) {
    console.error('Failed to load data:', error);
    process.exit(1);
  }
  
  // 各機能のテスト実行
  const allResults: DetailedTestResult[] = [];
  
  allResults.push(...await testNormalizationServiceDetailed(data));
  allResults.push(...await testNLQServiceDetailed());
  allResults.push(...await testPathFinderDetailed(data));
  allResults.push(...await testGapAnalyzerDetailed(data));
  allResults.push(...await testHallucinationDetectorDetailed(data));
  
  // 結果保存
  const outputPath = join(process.cwd(), 'outputs', 'v2-detailed-test-results.json');
  await writeFile(outputPath, JSON.stringify({
    metadata: {
      generatedAt: new Date().toISOString(),
      yagokoroVersion: 'v2.0.0',
      testCount: allResults.length,
      successCount: allResults.filter(r => r.success).length,
      failedCount: allResults.filter(r => !r.success).length,
    },
    results: allResults,
  }, null, 2));
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  テスト完了');
  console.log(`  成功: ${allResults.filter(r => r.success).length}/${allResults.length}`);
  console.log(`  結果保存先: ${outputPath}`);
  console.log('═══════════════════════════════════════════════════════════');
  
  // サマリー出力
  console.log('\n📊 Test Results Summary:');
  const byFeature = new Map<string, { success: number; failed: number }>();
  for (const r of allResults) {
    if (!byFeature.has(r.feature)) {
      byFeature.set(r.feature, { success: 0, failed: 0 });
    }
    const stats = byFeature.get(r.feature)!;
    if (r.success) stats.success++;
    else stats.failed++;
  }
  
  for (const [feature, stats] of byFeature) {
    const status = stats.failed === 0 ? '✅' : '⚠️';
    console.log(`  ${status} ${feature}: ${stats.success}/${stats.success + stats.failed} passed`);
  }
}

main().catch(console.error);
