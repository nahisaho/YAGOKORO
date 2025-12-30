#!/usr/bin/env node
/**
 * YAGOKORO v2 新機能の実際のテスト
 * v2パッケージの実装を直接使用
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// v2パッケージをインポート
import { RuleNormalizer, SimilarityMatcher, EntityNormalizerService, AliasTableManager } from '../libs/normalizer/src/index.js';
import { NLQService, CypherGenerator, IntentClassifier, SchemaProvider } from '../libs/nlq/src/index.js';
import { BFSPathFinder, PathExplainer, MultiHopReasonerService } from '../libs/reasoner/src/index.js';
import { ConsistencyChecker, ContradictionDetector } from '../libs/hallucination/src/index.js';

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
  
  // RuleNormalizer
  try {
    const normalizer = new RuleNormalizer();
    const start = Date.now();
    const testCases = [
      'GPT-3',
      'Chain-of-Thought',
      'LLaMA 2',
      'Attention Mechanism',
      'Transformer',
    ];
    const normalized = testCases.map(name => ({
      input: name,
      result: normalizer.normalize(name),
    }));
    results.push({
      testId: 'NORM-001',
      feature: 'Normalization',
      component: 'RuleNormalizer',
      success: true,
      output: normalized,
      executionTime: Date.now() - start,
    });
    console.log(`  ✅ RuleNormalizer: ${normalized.length} items normalized`);
  } catch (e) {
    results.push({
      testId: 'NORM-001',
      feature: 'Normalization',
      component: 'RuleNormalizer',
      success: false,
      output: null,
      executionTime: 0,
      error: String(e),
    });
    console.log(`  ❌ RuleNormalizer: ${e}`);
  }
  
  // SimilarityMatcher
  try {
    const matcher = new SimilarityMatcher({ threshold: 0.7 });
    const start = Date.now();
    const names = data.entities.slice(0, 30).map(e => e.name).filter(Boolean);
    const matches = matcher.findSimilar('GPT-4', names);
    results.push({
      testId: 'NORM-002',
      feature: 'Normalization',
      component: 'SimilarityMatcher',
      success: true,
      output: { query: 'GPT-4', matches },
      executionTime: Date.now() - start,
    });
    console.log(`  ✅ SimilarityMatcher: ${matches.length} similar entities found`);
  } catch (e) {
    results.push({
      testId: 'NORM-002',
      feature: 'Normalization',
      component: 'SimilarityMatcher',
      success: false,
      output: null,
      executionTime: 0,
      error: String(e),
    });
    console.log(`  ❌ SimilarityMatcher: ${e}`);
  }
  
  // AliasTableManager
  try {
    const aliasManager = new AliasTableManager();
    const start = Date.now();
    aliasManager.addAlias('GPT-3', 'gpt3');
    aliasManager.addAlias('GPT3', 'gpt3');
    aliasManager.addAlias('Chain-of-Thought', 'cot');
    aliasManager.addAlias('CoT', 'cot');
    const resolved1 = aliasManager.resolve('GPT-3');
    const resolved2 = aliasManager.resolve('CoT');
    results.push({
      testId: 'NORM-003',
      feature: 'Normalization',
      component: 'AliasTableManager',
      success: true,
      output: { 
        aliases: aliasManager.getAll(),
        resolved: { 'GPT-3': resolved1, 'CoT': resolved2 },
      },
      executionTime: Date.now() - start,
    });
    console.log(`  ✅ AliasTableManager: alias table built`);
  } catch (e) {
    results.push({
      testId: 'NORM-003',
      feature: 'Normalization',
      component: 'AliasTableManager',
      success: false,
      output: null,
      executionTime: 0,
      error: String(e),
    });
    console.log(`  ❌ AliasTableManager: ${e}`);
  }
  
  return results;
}

// ============================================================
// テスト2: NLQService
// ============================================================
async function testNLQ(): Promise<TestResult[]> {
  console.log('\n🔍 Testing NLQ...');
  const results: TestResult[] = [];
  
  // CypherGenerator
  try {
    const generator = new CypherGenerator();
    const start = Date.now();
    const intent = {
      type: 'entity_search' as const,
      entityTypes: ['AIModel'],
      searchTerms: ['GPT'],
      limit: 10,
    };
    const cypher = generator.generate(intent);
    results.push({
      testId: 'NLQ-001',
      feature: 'NLQ',
      component: 'CypherGenerator',
      success: true,
      output: { intent, cypher },
      executionTime: Date.now() - start,
    });
    console.log(`  ✅ CypherGenerator: cypher generated`);
  } catch (e) {
    results.push({
      testId: 'NLQ-001',
      feature: 'NLQ',
      component: 'CypherGenerator',
      success: false,
      output: null,
      executionTime: 0,
      error: String(e),
    });
    console.log(`  ❌ CypherGenerator: ${e}`);
  }
  
  // IntentClassifier
  try {
    // Mock LLM client
    const mockLLM = {
      complete: async (prompt: string) => ({
        content: JSON.stringify({
          type: 'entity_search',
          entityTypes: ['AIModel'],
          searchTerms: ['Transformer'],
        }),
        usage: { promptTokens: 100, completionTokens: 50 },
      }),
    };
    const classifier = new IntentClassifier({ llmClient: mockLLM as any });
    const start = Date.now();
    const intent = await classifier.classify('Transformerアーキテクチャを使用したモデルは？');
    results.push({
      testId: 'NLQ-002',
      feature: 'NLQ',
      component: 'IntentClassifier',
      success: true,
      output: intent,
      executionTime: Date.now() - start,
    });
    console.log(`  ✅ IntentClassifier: intent classified`);
  } catch (e) {
    results.push({
      testId: 'NLQ-002',
      feature: 'NLQ',
      component: 'IntentClassifier',
      success: false,
      output: null,
      executionTime: 0,
      error: String(e),
    });
    console.log(`  ❌ IntentClassifier: ${e}`);
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
    const graph = new Map<string, Set<string>>();
    const edgeLabels = new Map<string, string>();
    
    for (const entity of data.entities) {
      if (entity.name) {
        const name = entity.name.toLowerCase();
        if (!graph.has(name)) {
          graph.set(name, new Set());
        }
      }
    }
    
    for (const rel of data.relations) {
      if (rel.sourceName && rel.targetName) {
        const source = rel.sourceName.toLowerCase();
        const target = rel.targetName.toLowerCase();
        if (!graph.has(source)) graph.set(source, new Set());
        if (!graph.has(target)) graph.set(target, new Set());
        graph.get(source)!.add(target);
        graph.get(target)!.add(source);
        edgeLabels.set(`${source}->${target}`, rel.type);
      }
    }
    
    const pathFinder = new BFSPathFinder(graph, edgeLabels);
    const start = Date.now();
    
    // 複数のパス探索テスト
    const testCases = [
      { start: 'transformer', end: 'gpt', maxHops: 4 },
      { start: 'attention', end: 'llm', maxHops: 4 },
      { start: 'openai', end: 'rlhf', maxHops: 3 },
    ];
    
    const pathResults = testCases.map(tc => {
      try {
        const paths = pathFinder.findPaths(tc.start, tc.end, tc.maxHops);
        return { ...tc, found: paths.length > 0, pathCount: paths.length, paths: paths.slice(0, 2) };
      } catch {
        return { ...tc, found: false, pathCount: 0, paths: [] };
      }
    });
    
    results.push({
      testId: 'REASON-001',
      feature: 'Reasoner',
      component: 'BFSPathFinder',
      success: true,
      output: { 
        graphSize: { nodes: graph.size, edges: edgeLabels.size },
        results: pathResults,
      },
      executionTime: Date.now() - start,
    });
    console.log(`  ✅ BFSPathFinder: ${pathResults.filter(r => r.found).length}/${testCases.length} paths found`);
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
  
  // PathExplainer
  try {
    const explainer = new PathExplainer();
    const start = Date.now();
    const path = ['transformer', 'attention', 'gpt-4'];
    const explanation = explainer.explain(path, { 'transformer->attention': 'USES_TECHNIQUE' });
    results.push({
      testId: 'REASON-002',
      feature: 'Reasoner',
      component: 'PathExplainer',
      success: true,
      output: { path, explanation },
      executionTime: Date.now() - start,
    });
    console.log(`  ✅ PathExplainer: path explained`);
  } catch (e) {
    results.push({
      testId: 'REASON-002',
      feature: 'Reasoner',
      component: 'PathExplainer',
      success: false,
      output: null,
      executionTime: 0,
      error: String(e),
    });
    console.log(`  ❌ PathExplainer: ${e}`);
  }
  
  return results;
}

// ============================================================
// テスト4: HallucinationDetector
// ============================================================
async function testHallucination(data: GraphData): Promise<TestResult[]> {
  console.log('\n🛡️ Testing Hallucination Detection...');
  const results: TestResult[] = [];
  
  // ConsistencyChecker
  try {
    const checker = new ConsistencyChecker();
    const start = Date.now();
    const statements = [
      { text: 'GPT-4はOpenAIが開発した', source: 'document1' },
      { text: 'GPT-4はTransformerを使用', source: 'document2' },
      { text: 'GPT-4は2023年3月に発表された', source: 'document3' },
    ];
    const result = checker.check(statements);
    results.push({
      testId: 'HALL-001',
      feature: 'Hallucination',
      component: 'ConsistencyChecker',
      success: true,
      output: result,
      executionTime: Date.now() - start,
    });
    console.log(`  ✅ ConsistencyChecker: consistency checked`);
  } catch (e) {
    results.push({
      testId: 'HALL-001',
      feature: 'Hallucination',
      component: 'ConsistencyChecker',
      success: false,
      output: null,
      executionTime: 0,
      error: String(e),
    });
    console.log(`  ❌ ConsistencyChecker: ${e}`);
  }
  
  // ContradictionDetector
  try {
    const detector = new ContradictionDetector();
    const start = Date.now();
    const statements = [
      'GPT-4はOpenAIが開発した',
      'GPT-4はGoogleが開発した', // 矛盾
    ];
    const contradictions = detector.detect(statements);
    results.push({
      testId: 'HALL-002',
      feature: 'Hallucination',
      component: 'ContradictionDetector',
      success: true,
      output: { statements, contradictions },
      executionTime: Date.now() - start,
    });
    console.log(`  ✅ ContradictionDetector: ${contradictions.length} contradictions found`);
  } catch (e) {
    results.push({
      testId: 'HALL-002',
      feature: 'Hallucination',
      component: 'ContradictionDetector',
      success: false,
      output: null,
      executionTime: 0,
      error: String(e),
    });
    console.log(`  ❌ ContradictionDetector: ${e}`);
  }
  
  return results;
}

// ============================================================
// メイン
// ============================================================
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  YAGOKORO v2 機能テスト (実API使用)');
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
  const outputPath = join(process.cwd(), 'outputs', 'v2-api-test-results.json');
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
  
  // サマリー
  console.log('\n📊 Results by Feature:');
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
    console.log(`  ${status} ${feature}: ${stats.success}/${stats.success + stats.failed}`);
  }
}

main().catch(console.error);
