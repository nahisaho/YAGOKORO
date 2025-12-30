#!/usr/bin/env node
/**
 * YAGOKORO v2 新機能の実際のテスト
 * v2パッケージの実装を直接使用
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// v2パッケージをインポート（利用可能なもののみ）
import { NormalizationService, NameVariantDetector, EntityMerger } from '../libs/normalizer/src/index.js';
import { NLQService, CypherGenerator, IntentParser } from '../libs/nlq/src/index.js';
import { BFSPathFinder, PathExplainer, ChainOfThoughtReasoner } from '../libs/reasoner/src/index.js';
import { HallucinationDetector, FactChecker, ConsistencyChecker } from '../libs/hallucination/src/index.js';

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

interface TestResult {
  testId: string;
  feature: string;
  component: string;
  success: boolean;
  output: unknown;
  executionTime: number;
  error?: string;
}

// ============================================================
// テスト1: NormalizationService
// ============================================================
async function testNormalization(data: GraphData): Promise<TestResult[]> {
  console.log('\n🔧 Testing Normalization...');
  const results: TestResult[] = [];
  
  // NameVariantDetector
  try {
    const detector = new NameVariantDetector();
    const start = Date.now();
    const similarity = detector.calculateSimilarity('GPT-3', 'GPT3');
    results.push({
      testId: 'NORM-001',
      feature: 'Normalization',
      component: 'NameVariantDetector',
      success: true,
      output: { similarity, input: ['GPT-3', 'GPT3'] },
      executionTime: Date.now() - start,
    });
    console.log(`  ✅ NameVariantDetector: similarity=0.${(similarity * 100).toFixed(0)}`);
  } catch (e) {
    results.push({
      testId: 'NORM-001',
      feature: 'Normalization',
      component: 'NameVariantDetector',
      success: false,
      output: null,
      executionTime: 0,
      error: String(e),
    });
    console.log(`  ❌ NameVariantDetector: ${e}`);
  }
  
  // NormalizationService
  try {
    const normalizer = new NormalizationService();
    const start = Date.now();
    const testCases = [
      { input: 'GPT-3', expected: 'gpt3' },
      { input: 'Chain-of-Thought', expected: 'chain of thought' },
      { input: 'LLaMA 2', expected: 'llama2' },
    ];
    const outputs = testCases.map(tc => ({
      input: tc.input,
      normalized: normalizer.normalize(tc.input),
    }));
    results.push({
      testId: 'NORM-002',
      feature: 'Normalization',
      component: 'NormalizationService',
      success: true,
      output: outputs,
      executionTime: Date.now() - start,
    });
    console.log(`  ✅ NormalizationService: ${outputs.length} normalized`);
  } catch (e) {
    results.push({
      testId: 'NORM-002',
      feature: 'Normalization',
      component: 'NormalizationService',
      success: false,
      output: null,
      executionTime: 0,
      error: String(e),
    });
    console.log(`  ❌ NormalizationService: ${e}`);
  }
  
  // EntityMerger
  try {
    const merger = new EntityMerger(0.8);
    const start = Date.now();
    const names = data.entities.slice(0, 50).map(e => e.name).filter(Boolean);
    const groups = merger.findMergeGroups(names);
    results.push({
      testId: 'NORM-003',
      feature: 'Normalization',
      component: 'EntityMerger',
      success: true,
      output: { groupCount: groups.length, sampleGroups: groups.slice(0, 3) },
      executionTime: Date.now() - start,
    });
    console.log(`  ✅ EntityMerger: ${groups.length} merge groups found`);
  } catch (e) {
    results.push({
      testId: 'NORM-003',
      feature: 'Normalization',
      component: 'EntityMerger',
      success: false,
      output: null,
      executionTime: 0,
      error: String(e),
    });
    console.log(`  ❌ EntityMerger: ${e}`);
  }
  
  return results;
}

// ============================================================
// テスト2: NLQService
// ============================================================
async function testNLQ(): Promise<TestResult[]> {
  console.log('\n🔍 Testing NLQ...');
  const results: TestResult[] = [];
  
  // IntentParser
  try {
    const parser = new IntentParser();
    const start = Date.now();
    const intent = await parser.parse('TransformerアーキテクチャはどのようなAIモデルに影響を与えましたか？');
    results.push({
      testId: 'NLQ-001',
      feature: 'NLQ',
      component: 'IntentParser',
      success: true,
      output: intent,
      executionTime: Date.now() - start,
    });
    console.log(`  ✅ IntentParser: intent parsed`);
  } catch (e) {
    results.push({
      testId: 'NLQ-001',
      feature: 'NLQ',
      component: 'IntentParser',
      success: false,
      output: null,
      executionTime: 0,
      error: String(e),
    });
    console.log(`  ❌ IntentParser: ${e}`);
  }
  
  // CypherGenerator
  try {
    const generator = new CypherGenerator();
    const start = Date.now();
    const cypher = generator.generate({
      queryType: 'search',
      entityTypes: ['AIModel'],
      relationships: ['DEVELOPED_BY'],
      filters: [{ field: 'name', operator: 'contains', value: 'GPT' }],
    });
    results.push({
      testId: 'NLQ-002',
      feature: 'NLQ',
      component: 'CypherGenerator',
      success: true,
      output: cypher,
      executionTime: Date.now() - start,
    });
    console.log(`  ✅ CypherGenerator: cypher generated`);
  } catch (e) {
    results.push({
      testId: 'NLQ-002',
      feature: 'NLQ',
      component: 'CypherGenerator',
      success: false,
      output: null,
      executionTime: 0,
      error: String(e),
    });
    console.log(`  ❌ CypherGenerator: ${e}`);
  }
  
  return results;
}

// ============================================================
// テスト3: Reasoner
// ============================================================
async function testReasoner(data: GraphData): Promise<TestResult[]> {
  console.log('\n🔗 Testing Reasoner...');
  const results: TestResult[] = [];
  
  // BFSPathFinder
  try {
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
    const start = Date.now();
    const paths = pathFinder.findPaths('transformer', 'gpt', 4);
    results.push({
      testId: 'REASON-001',
      feature: 'Reasoner',
      component: 'BFSPathFinder',
      success: true,
      output: { pathsFound: paths.length, paths: paths.slice(0, 3) },
      executionTime: Date.now() - start,
    });
    console.log(`  ✅ BFSPathFinder: ${paths.length} paths found`);
  } catch (e) {
    results.push({
      testId: 'REASON-001',
      feature: 'Reasoner',
      component: 'BFSPathFinder',
      success: false,
      output: null,
      executionTime: 0,
      error: String(e),
    });
    console.log(`  ❌ BFSPathFinder: ${e}`);
  }
  
  // ChainOfThoughtReasoner
  try {
    const reasoner = new ChainOfThoughtReasoner();
    const start = Date.now();
    const reasoning = await reasoner.reason('Transformerの影響を分析', { depth: 2 });
    results.push({
      testId: 'REASON-002',
      feature: 'Reasoner',
      component: 'ChainOfThoughtReasoner',
      success: true,
      output: reasoning,
      executionTime: Date.now() - start,
    });
    console.log(`  ✅ ChainOfThoughtReasoner: reasoning completed`);
  } catch (e) {
    results.push({
      testId: 'REASON-002',
      feature: 'Reasoner',
      component: 'ChainOfThoughtReasoner',
      success: false,
      output: null,
      executionTime: 0,
      error: String(e),
    });
    console.log(`  ❌ ChainOfThoughtReasoner: ${e}`);
  }
  
  return results;
}

// ============================================================
// テスト4: HallucinationDetector
// ============================================================
async function testHallucination(data: GraphData): Promise<TestResult[]> {
  console.log('\n🛡️ Testing Hallucination Detection...');
  const results: TestResult[] = [];
  
  // HallucinationDetector
  try {
    const detector = new HallucinationDetector();
    const start = Date.now();
    const result = await detector.detect(
      'GPT-4はOpenAIによって開発されました',
      { entities: data.entities, relations: data.relations }
    );
    results.push({
      testId: 'HALL-001',
      feature: 'Hallucination',
      component: 'HallucinationDetector',
      success: true,
      output: result,
      executionTime: Date.now() - start,
    });
    console.log(`  ✅ HallucinationDetector: detection completed`);
  } catch (e) {
    results.push({
      testId: 'HALL-001',
      feature: 'Hallucination',
      component: 'HallucinationDetector',
      success: false,
      output: null,
      executionTime: 0,
      error: String(e),
    });
    console.log(`  ❌ HallucinationDetector: ${e}`);
  }
  
  // ConsistencyChecker
  try {
    const checker = new ConsistencyChecker();
    const start = Date.now();
    const result = checker.check([
      'GPT-4はOpenAIが開発した',
      'GPT-4はTransformerを使用',
    ]);
    results.push({
      testId: 'HALL-002',
      feature: 'Hallucination',
      component: 'ConsistencyChecker',
      success: true,
      output: result,
      executionTime: Date.now() - start,
    });
    console.log(`  ✅ ConsistencyChecker: check completed`);
  } catch (e) {
    results.push({
      testId: 'HALL-002',
      feature: 'Hallucination',
      component: 'ConsistencyChecker',
      success: false,
      output: null,
      executionTime: 0,
      error: String(e),
    });
    console.log(`  ❌ ConsistencyChecker: ${e}`);
  }
  
  return results;
}

// ============================================================
// メイン
// ============================================================
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  YAGOKORO v2 機能テスト');
  console.log('  実行日時: ' + new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════');
  
  // データ読み込み
  const dataPath = join(process.cwd(), 'outputs', 'genai-graphrag-data.json');
  let data: GraphData;
  try {
    const content = await readFile(dataPath, 'utf-8');
    data = JSON.parse(content);
    console.log(`\n📂 Data: ${data.metadata.totalEntities} entities, ${data.metadata.totalRelations} relations`);
  } catch (error) {
    console.error('Failed to load data:', error);
    process.exit(1);
  }
  
  const allResults: TestResult[] = [];
  
  allResults.push(...await testNormalization(data));
  allResults.push(...await testNLQ());
  allResults.push(...await testReasoner(data));
  allResults.push(...await testHallucination(data));
  
  // 結果保存
  const outputPath = join(process.cwd(), 'outputs', 'v2-feature-test-results.json');
  await writeFile(outputPath, JSON.stringify({
    metadata: {
      generatedAt: new Date().toISOString(),
      yagokoroVersion: 'v2.0.0',
      testCount: allResults.length,
      successCount: allResults.filter(r => r.success).length,
    },
    results: allResults,
  }, null, 2));
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  テスト完了: ${allResults.filter(r => r.success).length}/${allResults.length} passed`);
  console.log(`  結果: ${outputPath}`);
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch(console.error);
