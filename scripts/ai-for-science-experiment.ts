#!/usr/bin/env node
/**
 * AI for Science 小規模実験スクリプト
 * 
 * 研究テーマ: GraphRAGによる生成AI技術系譜の知識発見
 * 
 * 実験シナリオ:
 * 1. 技術進化パターンの分析
 * 2. 組織間技術伝播の検出
 * 3. 研究トレンドの時系列分析
 * 4. マルチホップ推論による隠れた関係性の発見
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

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

interface ExperimentResult {
  experimentId: string;
  title: string;
  hypothesis: string;
  methodology: string;
  results: unknown;
  insights: string[];
  timestamp: string;
}

// Ollama APIを呼び出し
async function ollamaChat(prompt: string): Promise<string> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: { temperature: 0.3, num_predict: 1500 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }

  const data = await response.json() as { response: string };
  return data.response;
}

// 実験1: 技術進化パターン分析
async function experiment1_TechEvolution(data: GraphData): Promise<ExperimentResult> {
  console.log('\n📊 実験1: 技術進化パターン分析');
  
  // AIモデルと技術の関係を抽出
  const aiModels = data.entities.filter(e => e.type === 'AIModel');
  const techniques = data.entities.filter(e => e.type === 'Technique');
  
  // DERIVED_FROM関係を分析（系譜の抽出）
  const derivedRelations = data.relations.filter(r => 
    r.type === 'DERIVED_FROM' || r.type === 'derived from'
  );
  
  // USES_TECHNIQUE関係を分析
  const usesRelations = data.relations.filter(r => 
    r.type === 'USES_TECHNIQUE' || r.type === 'uses technique'
  );
  
  // モデル影響度スコア（派生モデル数）
  const influenceScore = new Map<string, number>();
  for (const rel of derivedRelations) {
    const target = rel.targetName?.toLowerCase() || '';
    influenceScore.set(target, (influenceScore.get(target) || 0) + 1);
  }
  
  // 技術採用度スコア
  const techAdoption = new Map<string, number>();
  for (const rel of usesRelations) {
    const target = rel.targetName?.toLowerCase() || '';
    techAdoption.set(target, (techAdoption.get(target) || 0) + 1);
  }
  
  // 上位影響モデル
  const topInfluencers = Array.from(influenceScore.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  // 上位採用技術
  const topTechniques = Array.from(techAdoption.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  // LLMによる洞察生成
  const analysisPrompt = `Based on this AI technology evolution data, provide 3 key insights:

Top Influential AI Models (by derivative count):
${topInfluencers.map(([name, count]) => `- ${name}: ${count} derivatives`).join('\n')}

Top Adopted Techniques:
${topTechniques.map(([name, count]) => `- ${name}: adopted by ${count} models`).join('\n')}

Total AI Models: ${aiModels.length}
Total Techniques: ${techniques.length}

Provide insights about technology evolution patterns in generative AI. Be specific and data-driven.`;

  const insights = await ollamaChat(analysisPrompt);
  
  return {
    experimentId: 'EXP-001',
    title: '技術進化パターン分析',
    hypothesis: '生成AI技術は特定の基盤モデル・技術からの派生パターンを示す',
    methodology: 'DERIVED_FROMとUSES_TECHNIQUE関係のグラフ分析',
    results: {
      totalModels: aiModels.length,
      totalTechniques: techniques.length,
      derivedRelations: derivedRelations.length,
      usesRelations: usesRelations.length,
      topInfluencers,
      topTechniques,
    },
    insights: [insights],
    timestamp: new Date().toISOString(),
  };
}

// 実験2: 組織間技術伝播の検出
async function experiment2_OrgTechTransfer(data: GraphData): Promise<ExperimentResult> {
  console.log('\n🏢 実験2: 組織間技術伝播分析');
  
  const organizations = data.entities.filter(e => e.type === 'Organization');
  const aiModels = data.entities.filter(e => e.type === 'AIModel');
  
  // DEVELOPED_BY関係を分析
  const developedBy = data.relations.filter(r => 
    r.type === 'DEVELOPED_BY' || r.type === 'developed by'
  );
  
  // 組織ごとのモデル数
  const orgModels = new Map<string, string[]>();
  for (const rel of developedBy) {
    const org = rel.targetName?.toLowerCase() || '';
    const model = rel.sourceName || '';
    if (!orgModels.has(org)) orgModels.set(org, []);
    orgModels.get(org)!.push(model);
  }
  
  // 組織間の技術共有（同じ技術を使用するモデルを開発）
  const orgTechProfile = new Map<string, Set<string>>();
  
  // 各組織のモデルが使用する技術を収集
  for (const [org, models] of orgModels) {
    const techSet = new Set<string>();
    for (const rel of data.relations) {
      if (rel.type?.toLowerCase().includes('uses') && models.includes(rel.sourceName || '')) {
        techSet.add(rel.targetName || '');
      }
    }
    orgTechProfile.set(org, techSet);
  }
  
  // 組織間の技術重複を計算
  const techOverlap: Array<{org1: string; org2: string; shared: string[]; score: number}> = [];
  const orgs = Array.from(orgTechProfile.keys());
  
  for (let i = 0; i < orgs.length; i++) {
    for (let j = i + 1; j < orgs.length; j++) {
      const tech1 = orgTechProfile.get(orgs[i]!) || new Set();
      const tech2 = orgTechProfile.get(orgs[j]!) || new Set();
      const shared = Array.from(tech1).filter(t => tech2.has(t));
      if (shared.length > 0) {
        techOverlap.push({
          org1: orgs[i]!,
          org2: orgs[j]!,
          shared,
          score: shared.length / Math.min(tech1.size, tech2.size),
        });
      }
    }
  }
  
  // LLMによる洞察
  const orgSummary = Array.from(orgModels.entries())
    .map(([org, models]) => `${org}: ${models.length} models`)
    .slice(0, 10)
    .join('\n');
  
  const overlapSummary = techOverlap
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(o => `${o.org1} ↔ ${o.org2}: ${o.shared.length} shared techniques`)
    .join('\n');
  
  const analysisPrompt = `Analyze the technology transfer patterns between AI research organizations:

Organizations and their model count:
${orgSummary}

Technology overlap between organizations:
${overlapSummary}

Provide insights about:
1. Which organizations are technology leaders?
2. Are there technology sharing patterns?
3. What does this suggest about AI research collaboration?`;

  const insights = await ollamaChat(analysisPrompt);
  
  return {
    experimentId: 'EXP-002',
    title: '組織間技術伝播分析',
    hypothesis: '主要AI研究機関間には技術的な相互影響がある',
    methodology: 'DEVELOPED_BY関係と技術採用パターンの重複分析',
    results: {
      totalOrganizations: organizations.length,
      developedByRelations: developedBy.length,
      orgModelCounts: Object.fromEntries(orgModels),
      techOverlap: techOverlap.slice(0, 10),
    },
    insights: [insights],
    timestamp: new Date().toISOString(),
  };
}

// 実験3: マルチホップ推論による隠れた関係発見
async function experiment3_MultiHopDiscovery(data: GraphData): Promise<ExperimentResult> {
  console.log('\n🔗 実験3: マルチホップ推論による関係発見');
  
  // グラフ構造を構築
  const graph = new Map<string, Set<string>>();
  const edgeTypes = new Map<string, string>();
  
  for (const rel of data.relations) {
    const source = rel.sourceName?.toLowerCase() || '';
    const target = rel.targetName?.toLowerCase() || '';
    if (!source || !target) continue;
    
    if (!graph.has(source)) graph.set(source, new Set());
    graph.get(source)!.add(target);
    edgeTypes.set(`${source}→${target}`, rel.type);
  }
  
  // 2-hopパスを探索
  const twoHopPaths: Array<{from: string; via: string; to: string; types: string[]}> = [];
  
  for (const [source, neighbors] of graph) {
    for (const mid of neighbors) {
      const midNeighbors = graph.get(mid) || new Set();
      for (const target of midNeighbors) {
        if (target !== source && !neighbors.has(target)) {
          const type1 = edgeTypes.get(`${source}→${mid}`) || 'unknown';
          const type2 = edgeTypes.get(`${mid}→${target}`) || 'unknown';
          twoHopPaths.push({
            from: source,
            via: mid,
            to: target,
            types: [type1, type2],
          });
        }
      }
    }
  }
  
  // 興味深いパターンを抽出（異なるタイプ間の接続）
  const interestingPaths = twoHopPaths.filter(p => {
    const entities = data.entities;
    const fromEntity = entities.find(e => e.name.toLowerCase() === p.from);
    const toEntity = entities.find(e => e.name.toLowerCase() === p.to);
    return fromEntity?.type !== toEntity?.type;
  }).slice(0, 20);
  
  // LLMによる発見の解釈
  const pathSummary = interestingPaths.slice(0, 10).map(p => 
    `${p.from} --[${p.types[0]}]--> ${p.via} --[${p.types[1]}]--> ${p.to}`
  ).join('\n');
  
  const analysisPrompt = `Analyze these indirect relationships discovered through multi-hop reasoning in the AI knowledge graph:

2-hop paths discovered:
${pathSummary}

Total 2-hop paths found: ${twoHopPaths.length}
Interesting cross-type paths: ${interestingPaths.length}

What hidden relationships or insights can we infer from these indirect connections?
Focus on non-obvious discoveries that wouldn't be apparent from direct relationships.`;

  const insights = await ollamaChat(analysisPrompt);
  
  return {
    experimentId: 'EXP-003',
    title: 'マルチホップ推論による隠れた関係発見',
    hypothesis: '間接的な関係から直接的には見えない知識を発見できる',
    methodology: '2-hopグラフトラバーサルによるパス探索',
    results: {
      totalNodes: graph.size,
      totalTwoHopPaths: twoHopPaths.length,
      interestingPaths: interestingPaths.length,
      samplePaths: interestingPaths.slice(0, 15),
    },
    insights: [insights],
    timestamp: new Date().toISOString(),
  };
}

// 実験4: コンセプトクラスタリング分析
async function experiment4_ConceptClustering(data: GraphData): Promise<ExperimentResult> {
  console.log('\n💡 実験4: コンセプトクラスタリング分析');
  
  const concepts = data.entities.filter(e => e.type === 'Concept');
  const techniques = data.entities.filter(e => e.type === 'Technique');
  
  // コンセプトとモデルの関連を分析
  const conceptModelRelations = data.relations.filter(r =>
    r.type === 'EVALUATED_ON' || r.type?.toLowerCase().includes('evaluated')
  );
  
  // 評価ベンチマーク（コンセプト）ごとのモデル数
  const benchmarkUsage = new Map<string, string[]>();
  for (const rel of conceptModelRelations) {
    const benchmark = rel.targetName?.toLowerCase() || '';
    const model = rel.sourceName || '';
    if (!benchmarkUsage.has(benchmark)) benchmarkUsage.set(benchmark, []);
    benchmarkUsage.get(benchmark)!.push(model);
  }
  
  // 技術カテゴリの分析
  const techCategories = {
    reasoning: techniques.filter(t => 
      t.name.toLowerCase().includes('chain') ||
      t.name.toLowerCase().includes('thought') ||
      t.name.toLowerCase().includes('reasoning')
    ),
    training: techniques.filter(t =>
      t.name.toLowerCase().includes('fine-tuning') ||
      t.name.toLowerCase().includes('rlhf') ||
      t.name.toLowerCase().includes('instruction')
    ),
    architecture: techniques.filter(t =>
      t.name.toLowerCase().includes('attention') ||
      t.name.toLowerCase().includes('transformer') ||
      t.name.toLowerCase().includes('layer')
    ),
    optimization: techniques.filter(t =>
      t.name.toLowerCase().includes('lora') ||
      t.name.toLowerCase().includes('quantization') ||
      t.name.toLowerCase().includes('pruning')
    ),
  };
  
  // LLMによる分析
  const categorySummary = Object.entries(techCategories)
    .map(([cat, techs]) => `${cat}: ${techs.map(t => t.name).join(', ')}`)
    .join('\n');
  
  const benchmarkSummary = Array.from(benchmarkUsage.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10)
    .map(([bench, models]) => `${bench}: ${models.length} models`)
    .join('\n');
  
  const analysisPrompt = `Analyze the conceptual clustering in AI research:

Technique Categories:
${categorySummary}

Popular Benchmarks/Evaluation Methods:
${benchmarkSummary}

Total Concepts: ${concepts.length}
Total Techniques: ${techniques.length}

Provide insights about:
1. What are the dominant research themes?
2. How do benchmarks shape AI development?
3. What technique categories are most actively developed?`;

  const insights = await ollamaChat(analysisPrompt);
  
  return {
    experimentId: 'EXP-004',
    title: 'コンセプトクラスタリング分析',
    hypothesis: '生成AI研究は特定の概念クラスタに集中している',
    methodology: 'EVALUATED_ON関係とキーワードベースの技術分類',
    results: {
      totalConcepts: concepts.length,
      totalTechniques: techniques.length,
      techCategories: Object.fromEntries(
        Object.entries(techCategories).map(([k, v]) => [k, v.map(t => t.name)])
      ),
      topBenchmarks: Array.from(benchmarkUsage.entries())
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 10),
    },
    insights: [insights],
    timestamp: new Date().toISOString(),
  };
}

// 実験5: 研究空白分析（Research Gap Analysis）
async function experiment5_ResearchGapAnalysis(data: GraphData): Promise<ExperimentResult> {
  console.log('\n🔍 実験5: 研究空白分析');
  
  const aiModels = data.entities.filter(e => e.type === 'AIModel');
  const techniques = data.entities.filter(e => e.type === 'Technique');
  const concepts = data.entities.filter(e => e.type === 'Concept');
  
  // 技術ごとの採用モデル数を計算
  const techAdoption = new Map<string, number>();
  for (const rel of data.relations) {
    if (rel.type?.toLowerCase().includes('uses') || rel.type?.toLowerCase().includes('technique')) {
      const tech = rel.targetName?.toLowerCase() || '';
      if (tech) techAdoption.set(tech, (techAdoption.get(tech) || 0) + 1);
    }
  }
  
  // 関係が少ない技術（研究が不足している可能性）
  const underResearchedTechniques = techniques.filter(t => {
    const count = techAdoption.get(t.name.toLowerCase()) || 0;
    return count <= 1;
  });
  
  // 技術カテゴリごとの論文カバレッジ分析
  const categoryKeywords = {
    'マルチモーダル': ['multimodal', 'vision', 'image', 'audio', 'video'],
    '推論・思考': ['reasoning', 'chain-of-thought', 'cot', 'thinking', 'logic'],
    '効率化': ['efficient', 'compression', 'quantization', 'pruning', 'distillation'],
    'エージェント': ['agent', 'tool', 'planning', 'autonomous'],
    '安全性': ['safety', 'alignment', 'harmless', 'honest', 'helpful'],
    'コード生成': ['code', 'programming', 'coding'],
    '長文脈': ['long context', 'long-context', 'context length', 'memory'],
  };
  
  const categoryCoverage: Record<string, {concepts: string[], count: number}> = {};
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const matchingConcepts = concepts.filter(c => 
      keywords.some(kw => c.name.toLowerCase().includes(kw))
    );
    categoryCoverage[category] = {
      concepts: matchingConcepts.map(c => c.name),
      count: matchingConcepts.length
    };
  }
  
  // 関係密度が低いエンティティペア（潜在的な研究機会）
  const entityPairDensity = new Map<string, number>();
  for (const model of aiModels.slice(0, 20)) {
    for (const tech of techniques) {
      const key = `${model.name}↔${tech.name}`;
      const hasRelation = data.relations.some(r => 
        (r.sourceName === model.name && r.targetName === tech.name) ||
        (r.sourceName === tech.name && r.targetName === model.name)
      );
      entityPairDensity.set(key, hasRelation ? 1 : 0);
    }
  }
  
  // 未接続のペア（研究空白の候補）
  const unconnectedPairs = Array.from(entityPairDensity.entries())
    .filter(([_, v]) => v === 0)
    .map(([k, _]) => k)
    .slice(0, 20);
  
  // 研究空白スコア（カテゴリごと）
  const gapScores = Object.entries(categoryCoverage)
    .map(([cat, data]) => ({ category: cat, score: data.count, concepts: data.concepts }))
    .sort((a, b) => a.score - b.score);
  
  // LLMによる分析
  const gapSummary = gapScores.map(g => 
    `${g.category}: ${g.score}件 (${g.concepts.slice(0, 3).join(', ')})`
  ).join('\n');
  
  const underResearchedSummary = underResearchedTechniques
    .slice(0, 10)
    .map(t => t.name)
    .join(', ');
  
  const analysisPrompt = `Analyze the research gaps in generative AI based on this knowledge graph data:

Research Coverage by Category (lower = potential gap):
${gapSummary}

Under-researched Techniques (≤1 model adopts):
${underResearchedSummary}

Unconnected Model-Technique Pairs (potential research opportunities):
${unconnectedPairs.slice(0, 10).join('\n')}

Provide insights about:
1. What are the major research gaps in generative AI?
2. Which technique categories need more attention?
3. What potential research opportunities exist?
4. Recommendations for future research directions`;

  const insights = await ollamaChat(analysisPrompt);
  
  return {
    experimentId: 'EXP-005',
    title: '研究空白分析（Research Gap Analysis）',
    hypothesis: '知識グラフから研究の空白領域を特定できる',
    methodology: '技術カバレッジ分析、関係密度分析、カテゴリ別空白検出',
    results: {
      totalTechniques: techniques.length,
      underResearchedCount: underResearchedTechniques.length,
      underResearchedTechniques: underResearchedTechniques.slice(0, 15).map(t => t.name),
      categoryCoverage,
      gapScores,
      potentialOpportunities: unconnectedPairs.slice(0, 15),
    },
    insights: [insights],
    timestamp: new Date().toISOString(),
  };
}

// 実験6: 技術組み合わせポテンシャル分析
async function experiment6_TechCombinationPotential(data: GraphData): Promise<ExperimentResult> {
  console.log('\n💡 実験6: 技術組み合わせポテンシャル分析');
  
  const techniques = data.entities.filter(e => e.type === 'Technique');
  const aiModels = data.entities.filter(e => e.type === 'AIModel');
  
  // モデルごとに使用している技術を収集
  const modelTechniques = new Map<string, Set<string>>();
  for (const rel of data.relations) {
    if (rel.type?.toLowerCase().includes('uses') || rel.type?.toLowerCase().includes('technique')) {
      const model = rel.sourceName?.toLowerCase() || '';
      const tech = rel.targetName?.toLowerCase() || '';
      if (model && tech) {
        if (!modelTechniques.has(model)) modelTechniques.set(model, new Set());
        modelTechniques.get(model)!.add(tech);
      }
    }
  }
  
  // 技術の共起行列を構築
  const techCooccurrence = new Map<string, number>();
  const techNames = techniques.map(t => t.name.toLowerCase());
  
  for (const [_, techs] of modelTechniques) {
    const techList = Array.from(techs);
    for (let i = 0; i < techList.length; i++) {
      for (let j = i + 1; j < techList.length; j++) {
        const key = [techList[i], techList[j]].sort().join('↔');
        techCooccurrence.set(key, (techCooccurrence.get(key) || 0) + 1);
      }
    }
  }
  
  // 頻出の技術組み合わせ
  const popularCombinations = Array.from(techCooccurrence.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  // 未探索の技術組み合わせ（共起がゼロだが両方とも重要な技術）
  const importantTechs = techniques.filter(t => {
    const adoptionCount = Array.from(modelTechniques.values())
      .filter(set => set.has(t.name.toLowerCase())).length;
    return adoptionCount >= 2;
  }).map(t => t.name.toLowerCase());
  
  const unexploredCombinations: string[] = [];
  for (let i = 0; i < Math.min(importantTechs.length, 15); i++) {
    for (let j = i + 1; j < Math.min(importantTechs.length, 15); j++) {
      const key = [importantTechs[i]!, importantTechs[j]!].sort().join('↔');
      if (!techCooccurrence.has(key)) {
        unexploredCombinations.push(key);
      }
    }
  }
  
  // 技術シナジースコア（仮説的な組み合わせ価値）
  const synergyCategories = {
    '推論×効率化': { techs: ['chain-of-thought', 'lora', 'quantization'], potential: 'high' },
    'マルチモーダル×エージェント': { techs: ['vision', 'tool use', 'planning'], potential: 'high' },
    '安全性×推論': { techs: ['alignment', 'rlhf', 'reasoning'], potential: 'medium' },
    '長文脈×コード': { techs: ['long context', 'code generation'], potential: 'medium' },
  };
  
  // LLMによる分析
  const combinationSummary = popularCombinations.map(([combo, count]) => 
    `${combo}: ${count}回共起`
  ).join('\n');
  
  const unexploredSummary = unexploredCombinations.slice(0, 10).join('\n');
  
  const analysisPrompt = `Analyze technology combination patterns and potential synergies in AI research:

Popular Technology Combinations (frequently used together):
${combinationSummary}

Unexplored Combinations (both important but never combined):
${unexploredSummary}

Based on this analysis:
1. What technology combinations are proven effective?
2. What unexplored combinations might yield breakthroughs?
3. What synergies should researchers explore?
4. Predict which combinations will become popular in the next 2 years`;

  const insights = await ollamaChat(analysisPrompt);
  
  return {
    experimentId: 'EXP-006',
    title: '技術組み合わせポテンシャル分析',
    hypothesis: '未探索の技術組み合わせから新研究方向を発見できる',
    methodology: '共起行列分析、シナジーポテンシャル評価',
    results: {
      totalTechniques: techniques.length,
      modelsWithTechniques: modelTechniques.size,
      popularCombinations,
      unexploredCombinations: unexploredCombinations.slice(0, 15),
      synergyCategories,
    },
    insights: [insights],
    timestamp: new Date().toISOString(),
  };
}

// 拡張データ型（論文の年情報を含む）
interface PaperData {
  title: string;
  arxivId: string;
  year: number;
  category: string;
}

interface ExtendedGraphData extends GraphData {
  papers: PaperData[];
}

// 実験7: 時系列トレンド分析
async function experiment7_TemporalTrendAnalysis(data: ExtendedGraphData): Promise<ExperimentResult> {
  console.log('\n📊 実験7: 時系列トレンド分析');
  
  const papers = data.papers || [];
  const entities = data.entities;
  const relations = data.relations;
  
  // 年別の論文数を集計
  const papersByYear = new Map<number, number>();
  for (const paper of papers) {
    const year = paper.year;
    if (year) {
      papersByYear.set(year, (papersByYear.get(year) || 0) + 1);
    }
  }
  
  // 年別のカテゴリ分布
  const categoryByYear = new Map<number, Map<string, number>>();
  for (const paper of papers) {
    const year = paper.year;
    const category = paper.category;
    if (year && category) {
      if (!categoryByYear.has(year)) {
        categoryByYear.set(year, new Map());
      }
      const yearMap = categoryByYear.get(year)!;
      yearMap.set(category, (yearMap.get(category) || 0) + 1);
    }
  }
  
  // 技術の初出年を推定（関係から）
  const techFirstAppearance = new Map<string, number>();
  const techniques = entities.filter(e => e.type === 'Technique');
  
  // カテゴリごとの年の分布を使って技術の登場年を推定
  for (const tech of techniques) {
    // 技術名に関連する論文を見つける
    const relatedPapers = papers.filter(p => 
      p.title.toLowerCase().includes(tech.name.toLowerCase()) ||
      tech.name.toLowerCase().includes(p.category?.toLowerCase() || '')
    );
    if (relatedPapers.length > 0) {
      const minYear = Math.min(...relatedPapers.map(p => p.year).filter(y => y));
      techFirstAppearance.set(tech.name, minYear);
    }
  }
  
  // 年ごとの新技術数をカウント
  const newTechsByYear = new Map<number, string[]>();
  for (const [tech, year] of techFirstAppearance) {
    if (!newTechsByYear.has(year)) {
      newTechsByYear.set(year, []);
    }
    newTechsByYear.get(year)!.push(tech);
  }
  
  // トレンド検出: 急増しているカテゴリ
  const years = Array.from(papersByYear.keys()).sort();
  const recentYears = years.slice(-3); // 直近3年
  const earlierYears = years.slice(0, -3);
  
  const categoryGrowth: { category: string; growth: number; recent: number; earlier: number }[] = [];
  const allCategories = new Set<string>();
  for (const paper of papers) {
    if (paper.category) allCategories.add(paper.category);
  }
  
  for (const category of allCategories) {
    const recentCount = papers.filter(p => 
      recentYears.includes(p.year) && p.category === category
    ).length;
    const earlierCount = papers.filter(p => 
      earlierYears.includes(p.year) && p.category === category
    ).length;
    
    const growth = earlierCount > 0 
      ? ((recentCount / recentYears.length) / (earlierCount / earlierYears.length) - 1) * 100
      : recentCount > 0 ? 100 : 0;
    
    categoryGrowth.push({ category, growth, recent: recentCount, earlier: earlierCount });
  }
  
  // 成長率でソート
  categoryGrowth.sort((a, b) => b.growth - a.growth);
  
  // LLMによる分析
  const yearTrend = Array.from(papersByYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, count]) => `${year}: ${count}件`)
    .join('\n');
  
  const growthSummary = categoryGrowth.slice(0, 5)
    .map(g => `${g.category}: ${g.growth > 0 ? '+' : ''}${g.growth.toFixed(0)}% (近年${g.recent}件, 過去${g.earlier}件)`)
    .join('\n');
  
  const newTechSummary = Array.from(newTechsByYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, techs]) => `${year}: ${techs.slice(0, 3).join(', ')}${techs.length > 3 ? ` (+${techs.length - 3}件)` : ''}`)
    .join('\n');
  
  const analysisPrompt = `Analyze temporal trends in generative AI research:

Paper Publication Trend:
${yearTrend}

Category Growth Rate (recent vs earlier):
${growthSummary}

Technology First Appearances by Year:
${newTechSummary}

Based on this temporal analysis:
1. What are the major research waves in generative AI?
2. Which areas are rapidly growing and why?
3. What technologies emerged at pivotal moments?
4. Predict the next major research trend for 2025-2026
5. What areas seem to be declining or reaching maturity?`;

  const insights = await ollamaChat(analysisPrompt);
  
  return {
    experimentId: 'EXP-007',
    title: '時系列トレンド分析',
    hypothesis: '技術と研究テーマには明確な時系列パターンがある',
    methodology: '年別集計、成長率分析、技術初出年推定',
    results: {
      papersByYear: Object.fromEntries(papersByYear),
      categoryGrowth: categoryGrowth.slice(0, 10),
      newTechsByYear: Object.fromEntries(
        Array.from(newTechsByYear.entries()).map(([k, v]) => [k, v.slice(0, 5)])
      ),
      totalYearsCovered: years.length,
      yearRange: { min: Math.min(...years), max: Math.max(...years) },
    },
    insights: [insights],
    timestamp: new Date().toISOString(),
  };
}

// 実験8: 影響力スコアリング（PageRank的アプローチ）
async function experiment8_InfluenceScoring(data: GraphData): Promise<ExperimentResult> {
  console.log('\n📊 実験8: 影響力スコアリング');
  
  const entities = data.entities;
  const relations = data.relations;
  
  // 各エンティティのin-degree（被参照数）とout-degree（参照数）を計算
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  const derivedCount = new Map<string, number>(); // DERIVED_FROM関係でソースになった回数
  const usedByCount = new Map<string, number>(); // USES_TECHNIQUE関係でターゲットになった回数
  
  for (const entity of entities) {
    inDegree.set(entity.name, 0);
    outDegree.set(entity.name, 0);
    derivedCount.set(entity.name, 0);
    usedByCount.set(entity.name, 0);
  }
  
  for (const rel of relations) {
    // in-degree: 何から参照されているか
    inDegree.set(rel.targetName, (inDegree.get(rel.targetName) || 0) + 1);
    // out-degree: 何を参照しているか
    outDegree.set(rel.sourceName, (outDegree.get(rel.sourceName) || 0) + 1);
    
    // 派生元としての重要性（他のモデルの基盤になった）
    if (rel.type === 'DERIVED_FROM') {
      derivedCount.set(rel.targetName, (derivedCount.get(rel.targetName) || 0) + 1);
    }
    
    // 技術としての採用度（多くのモデルに採用された）
    if (rel.type === 'USES_TECHNIQUE') {
      usedByCount.set(rel.targetName, (usedByCount.get(rel.targetName) || 0) + 1);
    }
  }
  
  // 影響力スコアを計算（簡易版PageRank的なスコア）
  // スコア = in-degree * 2 + derived_count * 3 + used_by_count * 2
  const influenceScores: { name: string; type: string; score: number; inDeg: number; derived: number; usedBy: number }[] = [];
  
  for (const entity of entities) {
    const inDeg = inDegree.get(entity.name) || 0;
    const derived = derivedCount.get(entity.name) || 0;
    const usedBy = usedByCount.get(entity.name) || 0;
    
    const score = inDeg * 2 + derived * 3 + usedBy * 2;
    
    if (score > 0) {
      influenceScores.push({
        name: entity.name,
        type: entity.type,
        score,
        inDeg,
        derived,
        usedBy,
      });
    }
  }
  
  // スコアでソート
  influenceScores.sort((a, b) => b.score - a.score);
  
  // タイプ別にTop5を取得
  const topByType: Record<string, typeof influenceScores> = {};
  const types = ['AIModel', 'Technique', 'Concept', 'Organization'];
  
  for (const type of types) {
    topByType[type] = influenceScores
      .filter(e => e.type === type)
      .slice(0, 5);
  }
  
  // 「ハブ」ノードの検出（高いout-degree）
  const hubNodes = entities
    .map(e => ({ name: e.name, type: e.type, outDeg: outDegree.get(e.name) || 0 }))
    .filter(e => e.outDeg > 0)
    .sort((a, b) => b.outDeg - a.outDeg)
    .slice(0, 10);
  
  // LLMによる分析
  const topModelsSummary = topByType['AIModel']?.slice(0, 5)
    .map(e => `${e.name}: スコア${e.score} (派生${e.derived}件, 被参照${e.inDeg}件)`)
    .join('\n') || 'なし';
  
  const topTechsSummary = topByType['Technique']?.slice(0, 5)
    .map(e => `${e.name}: スコア${e.score} (採用${e.usedBy}件, 被参照${e.inDeg}件)`)
    .join('\n') || 'なし';
  
  const hubSummary = hubNodes.slice(0, 5)
    .map(e => `${e.name} (${e.type}): ${e.outDeg}件の参照`)
    .join('\n');
  
  const analysisPrompt = `Analyze influence and centrality in the generative AI knowledge graph:

Most Influential AI Models (spawned many derivatives):
${topModelsSummary}

Most Adopted Techniques (used by many models):
${topTechsSummary}

Hub Nodes (reference many other entities):
${hubSummary}

Based on this influence analysis:
1. Why are these models/techniques so influential?
2. What makes a technology become widely adopted?
3. Are there underrated technologies that deserve more attention?
4. What does this tell us about the structure of AI research?
5. Predict which current technologies will become foundational in the future`;

  const insights = await ollamaChat(analysisPrompt);
  
  return {
    experimentId: 'EXP-008',
    title: '影響力スコアリング',
    hypothesis: '特定のモデル・技術が生成AI分野の発展を牽引している',
    methodology: 'グラフ中心性指標（in-degree, 派生数, 採用数）による影響力計算',
    results: {
      topOverall: influenceScores.slice(0, 15),
      topByType,
      hubNodes,
      totalScoredEntities: influenceScores.length,
      averageScore: influenceScores.reduce((sum, e) => sum + e.score, 0) / influenceScores.length,
    },
    insights: [insights],
    timestamp: new Date().toISOString(),
  };
}

// 実験9: クロスカテゴリ影響分析
async function experiment9_CrossCategoryInfluence(data: ExtendedGraphData): Promise<ExperimentResult> {
  console.log('\n📊 実験9: クロスカテゴリ影響分析');
  
  const papers = data.papers || [];
  const entities = data.entities;
  const relations = data.relations;
  
  // カテゴリ間の関係を構築
  // まず論文からカテゴリごとのエンティティを収集
  const categoryEntities = new Map<string, Set<string>>();
  
  // 論文タイトルとエンティティ名をマッチング
  for (const paper of papers) {
    const category = paper.category;
    if (!category) continue;
    
    if (!categoryEntities.has(category)) {
      categoryEntities.set(category, new Set());
    }
    
    // エンティティ名が論文タイトルに含まれているか確認
    for (const entity of entities) {
      if (paper.title.toLowerCase().includes(entity.name.toLowerCase())) {
        categoryEntities.get(category)!.add(entity.name);
      }
    }
  }
  
  // カテゴリ間の関係マトリクスを構築
  const categoryMatrix = new Map<string, Map<string, number>>();
  const categories = Array.from(categoryEntities.keys());
  
  for (const cat1 of categories) {
    categoryMatrix.set(cat1, new Map());
    for (const cat2 of categories) {
      categoryMatrix.get(cat1)!.set(cat2, 0);
    }
  }
  
  // 関係を通じてカテゴリ間の接続をカウント
  for (const rel of relations) {
    let sourceCat: string | undefined;
    let targetCat: string | undefined;
    
    for (const [cat, entitySet] of categoryEntities) {
      if (entitySet.has(rel.sourceName)) sourceCat = cat;
      if (entitySet.has(rel.targetName)) targetCat = cat;
    }
    
    if (sourceCat && targetCat && sourceCat !== targetCat) {
      const current = categoryMatrix.get(sourceCat)!.get(targetCat) || 0;
      categoryMatrix.get(sourceCat)!.set(targetCat, current + 1);
    }
  }
  
  // クロスカテゴリの関係を抽出
  const crossCategoryRelations: { source: string; target: string; count: number }[] = [];
  for (const [source, targets] of categoryMatrix) {
    for (const [target, count] of targets) {
      if (count > 0) {
        crossCategoryRelations.push({ source, target, count });
      }
    }
  }
  crossCategoryRelations.sort((a, b) => b.count - a.count);
  
  // カテゴリの「中心性」を計算（他カテゴリとの接続数）
  const categoryCentrality: { category: string; outgoing: number; incoming: number; total: number }[] = [];
  for (const cat of categories) {
    let outgoing = 0;
    let incoming = 0;
    
    for (const [target, count] of categoryMatrix.get(cat)!) {
      if (target !== cat) outgoing += count;
    }
    
    for (const [source, targets] of categoryMatrix) {
      if (source !== cat) {
        incoming += targets.get(cat) || 0;
      }
    }
    
    categoryCentrality.push({ category: cat, outgoing, incoming, total: outgoing + incoming });
  }
  categoryCentrality.sort((a, b) => b.total - a.total);
  
  // 「ブリッジカテゴリ」の検出（異なる分野を繋ぐ役割）
  const bridgeCategories = categoryCentrality.filter(c => c.outgoing > 0 && c.incoming > 0);
  
  // カテゴリペアごとの共通技術
  const sharedTechniques: { cat1: string; cat2: string; shared: string[] }[] = [];
  const techniquesSet = new Set(entities.filter(e => e.type === 'Technique').map(e => e.name));
  
  for (let i = 0; i < categories.length; i++) {
    for (let j = i + 1; j < categories.length; j++) {
      const cat1 = categories[i];
      const cat2 = categories[j];
      const entities1 = categoryEntities.get(cat1)!;
      const entities2 = categoryEntities.get(cat2)!;
      
      const shared = Array.from(entities1)
        .filter(e => entities2.has(e) && techniquesSet.has(e));
      
      if (shared.length > 0) {
        sharedTechniques.push({ cat1, cat2, shared });
      }
    }
  }
  sharedTechniques.sort((a, b) => b.shared.length - a.shared.length);
  
  // LLMによる分析
  const crossRelSummary = crossCategoryRelations.slice(0, 10)
    .map(r => `${r.source} → ${r.target}: ${r.count}件`)
    .join('\n');
  
  const centralitySummary = categoryCentrality.slice(0, 8)
    .map(c => `${c.category}: 発信${c.outgoing}, 受信${c.incoming}, 合計${c.total}`)
    .join('\n');
  
  const bridgeSummary = bridgeCategories.slice(0, 5)
    .map(c => `${c.category} (発信${c.outgoing}/受信${c.incoming})`)
    .join(', ');
  
  const sharedTechSummary = sharedTechniques.slice(0, 5)
    .map(s => `${s.cat1} ↔ ${s.cat2}: ${s.shared.join(', ')}`)
    .join('\n');
  
  const analysisPrompt = `Analyze cross-category influence patterns in generative AI research:

Cross-Category Relations (top connections):
${crossRelSummary}

Category Centrality (how connected each category is):
${centralitySummary}

Bridge Categories (connecting different fields):
${bridgeSummary}

Shared Techniques Between Categories:
${sharedTechSummary}

Based on this cross-category analysis:
1. Which research categories are most interconnected?
2. What categories serve as "bridges" between different fields?
3. Which techniques enable cross-pollination between research areas?
4. What does this tell us about the interdisciplinary nature of AI research?
5. Which category combinations represent emerging convergence opportunities?`;

  const insights = await ollamaChat(analysisPrompt);
  
  return {
    experimentId: 'EXP-009',
    title: 'クロスカテゴリ影響分析',
    hypothesis: '研究カテゴリ間には明確な技術伝播パターンが存在する',
    methodology: 'カテゴリ間関係マトリクス、中心性分析、共通技術検出',
    results: {
      crossCategoryRelations: crossCategoryRelations.slice(0, 15),
      categoryCentrality: categoryCentrality.slice(0, 10),
      bridgeCategories: bridgeCategories.slice(0, 5),
      sharedTechniques: sharedTechniques.slice(0, 10),
      totalCategories: categories.length,
      totalCrossRelations: crossCategoryRelations.reduce((sum, r) => sum + r.count, 0),
    },
    insights: [insights],
    timestamp: new Date().toISOString(),
  };
}

// 実験10: 技術成熟度分析（Hype Cycle的アプローチ）
async function experiment10_TechMaturityAnalysis(data: ExtendedGraphData): Promise<ExperimentResult> {
  console.log('\n📊 実験10: 技術成熟度分析');
  
  const papers = data.papers || [];
  const entities = data.entities;
  const relations = data.relations;
  
  // 技術の出現パターンを分析
  const techAppearance = new Map<string, { firstYear: number; lastYear: number; totalMentions: number; yearlyMentions: Map<number, number> }>();
  
  const techniques = entities.filter(e => e.type === 'Technique' || e.type === 'Concept');
  
  for (const tech of techniques) {
    const yearlyMentions = new Map<number, number>();
    let totalMentions = 0;
    
    for (const paper of papers) {
      if (paper.title.toLowerCase().includes(tech.name.toLowerCase())) {
        const year = paper.year;
        if (year) {
          yearlyMentions.set(year, (yearlyMentions.get(year) || 0) + 1);
          totalMentions++;
        }
      }
    }
    
    if (totalMentions > 0) {
      const years = Array.from(yearlyMentions.keys());
      techAppearance.set(tech.name, {
        firstYear: Math.min(...years),
        lastYear: Math.max(...years),
        totalMentions,
        yearlyMentions,
      });
    }
  }
  
  // Hype Cycle的な段階を推定
  type HypeStage = 'trigger' | 'peak' | 'trough' | 'slope' | 'plateau' | 'unknown';
  
  interface TechMaturity {
    name: string;
    stage: HypeStage;
    firstYear: number;
    peakYear: number;
    trend: string; // rising, falling, stable
    adoptionScore: number;
    derivativeCount: number;
  }
  
  const techMaturity: TechMaturity[] = [];
  
  for (const [techName, data] of techAppearance) {
    const yearlyArr = Array.from(data.yearlyMentions.entries()).sort(([a], [b]) => a - b);
    
    // ピーク年を特定
    let peakYear = data.firstYear;
    let peakCount = 0;
    for (const [year, count] of yearlyArr) {
      if (count > peakCount) {
        peakCount = count;
        peakYear = year;
      }
    }
    
    // トレンドを判定（直近2年 vs ピーク年）
    const recentYears = yearlyArr.filter(([y]) => y >= 2023);
    const recentTotal = recentYears.reduce((sum, [, c]) => sum + c, 0);
    const recentAvg = recentYears.length > 0 ? recentTotal / recentYears.length : 0;
    
    let trend: string;
    if (recentAvg > peakCount * 0.8) {
      trend = 'rising';
    } else if (recentAvg < peakCount * 0.3) {
      trend = 'falling';
    } else {
      trend = 'stable';
    }
    
    // Hype Cycle段階を推定
    let stage: HypeStage;
    const yearsFromPeak = 2024 - peakYear;
    const yearsFromFirst = 2024 - data.firstYear;
    
    if (yearsFromFirst <= 1) {
      stage = 'trigger';
    } else if (trend === 'rising' && yearsFromPeak <= 1) {
      stage = 'peak';
    } else if (trend === 'falling' && yearsFromPeak <= 2) {
      stage = 'trough';
    } else if (trend === 'stable' || trend === 'rising') {
      stage = yearsFromFirst >= 4 ? 'plateau' : 'slope';
    } else {
      stage = 'unknown';
    }
    
    // 派生数・採用数をカウント
    const derivativeCount = relations.filter(r => 
      r.targetName === techName && (r.type === 'DERIVED_FROM' || r.type === 'USES_TECHNIQUE')
    ).length;
    
    const adoptionScore = data.totalMentions * 10 + derivativeCount * 20;
    
    techMaturity.push({
      name: techName,
      stage,
      firstYear: data.firstYear,
      peakYear,
      trend,
      adoptionScore,
      derivativeCount,
    });
  }
  
  // 段階別にグループ化
  const byStage: Record<HypeStage, TechMaturity[]> = {
    trigger: [],
    peak: [],
    trough: [],
    slope: [],
    plateau: [],
    unknown: [],
  };
  
  for (const tech of techMaturity) {
    byStage[tech.stage].push(tech);
  }
  
  // 各段階でスコア順にソート
  for (const stage of Object.keys(byStage) as HypeStage[]) {
    byStage[stage].sort((a, b) => b.adoptionScore - a.adoptionScore);
  }
  
  // 注目すべき新興技術（trigger/peak段階で高スコア）
  const emergingTech = [...byStage.trigger, ...byStage.peak]
    .sort((a, b) => b.adoptionScore - a.adoptionScore)
    .slice(0, 10);
  
  // 成熟技術（plateau段階）
  const matureTech = byStage.plateau
    .sort((a, b) => b.adoptionScore - a.adoptionScore)
    .slice(0, 10);
  
  // 衰退リスク技術（trough段階）
  const decliningTech = byStage.trough
    .sort((a, b) => b.adoptionScore - a.adoptionScore)
    .slice(0, 10);
  
  // LLMによる分析
  const emergingSummary = emergingTech.slice(0, 5)
    .map(t => `${t.name}: ${t.stage}段階, 初出${t.firstYear}年, スコア${t.adoptionScore}`)
    .join('\n');
  
  const matureSummary = matureTech.slice(0, 5)
    .map(t => `${t.name}: 初出${t.firstYear}年, ${t.derivativeCount}件派生, スコア${t.adoptionScore}`)
    .join('\n');
  
  const decliningSummary = decliningTech.slice(0, 5)
    .map(t => `${t.name}: ピーク${t.peakYear}年, トレンド${t.trend}`)
    .join('\n');
  
  const stageCounts = `Trigger: ${byStage.trigger.length}, Peak: ${byStage.peak.length}, Trough: ${byStage.trough.length}, Slope: ${byStage.slope.length}, Plateau: ${byStage.plateau.length}`;
  
  const analysisPrompt = `Analyze technology maturity patterns in generative AI (Hype Cycle perspective):

Technology Distribution by Hype Cycle Stage:
${stageCounts}

Emerging Technologies (Trigger/Peak Stage):
${emergingSummary || 'None detected'}

Mature Technologies (Plateau of Productivity):
${matureSummary || 'None detected'}

Technologies in Trough of Disillusionment:
${decliningSummary || 'None detected'}

Based on this maturity analysis:
1. Which technologies are at the peak of hype and likely to face disillusionment?
2. Which mature technologies will remain foundational for years to come?
3. Are there technologies that were hyped but have now proven their value?
4. What patterns do you see in the technology adoption lifecycle in AI?
5. Recommend investment priorities: where should researchers focus?`;

  const insights = await ollamaChat(analysisPrompt);
  
  return {
    experimentId: 'EXP-010',
    title: '技術成熟度分析',
    hypothesis: '技術にはHype Cycle的な成熟パターンがある',
    methodology: '出現年・ピーク年・トレンド分析によるHype Cycle段階推定',
    results: {
      stageDistribution: {
        trigger: byStage.trigger.length,
        peak: byStage.peak.length,
        trough: byStage.trough.length,
        slope: byStage.slope.length,
        plateau: byStage.plateau.length,
      },
      emergingTech: emergingTech.slice(0, 10),
      matureTech: matureTech.slice(0, 10),
      decliningTech: decliningTech.slice(0, 10),
      totalAnalyzed: techMaturity.length,
    },
    insights: [insights],
    timestamp: new Date().toISOString(),
  };
}

// メイン実行
async function main() {
  console.log('═'.repeat(60));
  console.log('🔬 AI for Science 小規模実験');
  console.log('   GraphRAGによる生成AI技術系譜の知識発見');
  console.log('═'.repeat(60));
  
  // GraphRAGデータを読み込み
  const dataPath = join(process.cwd(), 'outputs/genai-graphrag-data.json');
  if (!existsSync(dataPath)) {
    console.error('❌ GraphRAGデータが見つかりません。先にgenerate-genai-genealogy-graphrag.tsを実行してください。');
    process.exit(1);
  }
  
  const rawData = await readFile(dataPath, 'utf-8');
  const data: ExtendedGraphData = JSON.parse(rawData);
  
  console.log(`\n📊 データ概要:`);
  console.log(`   • 論文数: ${data.metadata.totalPapers}`);
  console.log(`   • エンティティ: ${data.metadata.totalEntities}`);
  console.log(`   • 関係: ${data.metadata.totalRelations}`);
  
  // 実験実行
  const results: ExperimentResult[] = [];
  
  results.push(await experiment1_TechEvolution(data));
  console.log('   ✅ 実験1完了');
  
  results.push(await experiment2_OrgTechTransfer(data));
  console.log('   ✅ 実験2完了');
  
  results.push(await experiment3_MultiHopDiscovery(data));
  console.log('   ✅ 実験3完了');
  
  results.push(await experiment4_ConceptClustering(data));
  console.log('   ✅ 実験4完了');
  
  results.push(await experiment5_ResearchGapAnalysis(data));
  console.log('   ✅ 実験5完了');
  
  results.push(await experiment6_TechCombinationPotential(data));
  console.log('   ✅ 実験6完了');

  results.push(await experiment7_TemporalTrendAnalysis(data));
  console.log('   ✅ 実験7完了');

  results.push(await experiment8_InfluenceScoring(data));
  console.log('   ✅ 実験8完了');

  results.push(await experiment9_CrossCategoryInfluence(data));
  console.log('   ✅ 実験9完了');

  results.push(await experiment10_TechMaturityAnalysis(data));
  console.log('   ✅ 実験10完了');
  
  // 結果を保存
  const outputPath = join(process.cwd(), 'outputs/experiment-results.json');
  await writeFile(outputPath, JSON.stringify({
    experimentSuite: 'AI for Science - GraphRAG Knowledge Discovery',
    executedAt: new Date().toISOString(),
    graphData: data.metadata,
    experiments: results,
  }, null, 2));
  
  console.log(`\n✅ 実験完了! 結果: ${outputPath}`);
  
  // 統計サマリー
  console.log('\n📊 実験結果サマリー:');
  for (const exp of results) {
    console.log(`   • ${exp.experimentId}: ${exp.title}`);
  }
}

main().catch(console.error);
