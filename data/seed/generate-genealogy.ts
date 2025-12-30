/**
 * 生成AIの発展系譜 - GraphRAG生成スクリプト
 * Neo4jのデータを活用してMermaid形式の系譜図を生成
 */

import neo4j from 'neo4j-driver';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password')
);

// 生成AI関連のキーワード
const GENERATIVE_AI_KEYWORDS = [
  'transformer', 'attention', 'gpt', 'bert', 'llm', 'language model',
  'generative', 'gan', 'diffusion', 'vae', 'autoencoder',
  'chatgpt', 'claude', 'llama', 'gemini', 'palm',
  'clip', 'dall-e', 'stable diffusion', 'imagen', 'midjourney',
  'whisper', 'wav2vec', 'speech',
  'multimodal', 'vision-language',
  'rlhf', 'alignment', 'instruction tuning', 'fine-tuning',
  'scaling law', 'emergent', 'chain-of-thought', 'reasoning'
];

interface ModelInfo {
  name: string;
  year: number;
  category: string;
  organization: string;
  description: string;
  arxivId?: string;
}

interface TimelineEvent {
  year: number;
  models: ModelInfo[];
}

// カテゴリ判定
function categorize(name: string, description: string): string {
  const text = `${name} ${description}`.toLowerCase();
  
  if (text.includes('diffusion') || text.includes('stable diffusion') || text.includes('imagen') || text.includes('dall-e')) {
    return 'Image Generation';
  }
  if (text.includes('gan') || text.includes('generative adversarial')) {
    return 'GAN';
  }
  if (text.includes('whisper') || text.includes('speech') || text.includes('wav2vec') || text.includes('tts')) {
    return 'Speech/Audio';
  }
  if (text.includes('clip') || text.includes('blip') || text.includes('multimodal') || text.includes('vision-language') || text.includes('llava') || text.includes('flamingo')) {
    return 'Multimodal';
  }
  if (text.includes('gpt') || text.includes('llama') || text.includes('claude') || text.includes('gemini') || text.includes('palm') || text.includes('chatgpt')) {
    return 'LLM';
  }
  if (text.includes('bert') || text.includes('roberta') || text.includes('xlnet') || text.includes('electra')) {
    return 'Encoder LM';
  }
  if (text.includes('transformer') || text.includes('attention')) {
    return 'Foundation';
  }
  if (text.includes('rlhf') || text.includes('alignment') || text.includes('dpo') || text.includes('ppo')) {
    return 'Alignment';
  }
  if (text.includes('vae') || text.includes('autoencoder')) {
    return 'VAE';
  }
  return 'Other';
}

// 組織抽出
function extractOrg(description: string): string {
  const text = description.toLowerCase();
  if (text.includes('openai')) return 'OpenAI';
  if (text.includes('google') || text.includes('deepmind')) return 'Google';
  if (text.includes('meta') || text.includes('facebook')) return 'Meta';
  if (text.includes('anthropic')) return 'Anthropic';
  if (text.includes('microsoft')) return 'Microsoft';
  if (text.includes('nvidia')) return 'NVIDIA';
  if (text.includes('stability')) return 'Stability AI';
  if (text.includes('hugging face')) return 'Hugging Face';
  if (text.includes('alibaba')) return 'Alibaba';
  if (text.includes('baidu')) return 'Baidu';
  if (text.includes('tsinghua')) return 'Tsinghua';
  if (text.includes('stanford')) return 'Stanford';
  if (text.includes('berkeley')) return 'UC Berkeley';
  return 'Academic/Other';
}

async function fetchGenerativeAIData(session: neo4j.Session): Promise<ModelInfo[]> {
  console.log('📥 Fetching generative AI data from Neo4j...');
  
  // 主要なモデル・手法・論文を取得
  const result = await session.run(`
    MATCH (n)
    WHERE (n:AIModel OR n:Technique OR n:Publication OR n:Entity)
      AND n.name IS NOT NULL
      AND n.description IS NOT NULL
    RETURN n.name as name, 
           n.description as description, 
           n.year as year,
           n.arxivId as arxivId,
           labels(n) as labels
    ORDER BY n.year
  `);
  
  const models: ModelInfo[] = [];
  const seen = new Set<string>();
  
  for (const record of result.records) {
    const name = record.get('name');
    const description = record.get('description') || '';
    const yearRaw = record.get('year');
    const arxivId = record.get('arxivId');
    
    // 重複チェック
    const normalizedName = name.toLowerCase().trim();
    if (seen.has(normalizedName)) continue;
    
    // 生成AI関連かチェック
    const text = `${name} ${description}`.toLowerCase();
    const isGenerativeAI = GENERATIVE_AI_KEYWORDS.some(kw => text.includes(kw));
    
    if (!isGenerativeAI) continue;
    
    // 年を抽出
    let year = yearRaw ? (typeof yearRaw === 'object' ? yearRaw.toNumber() : yearRaw) : null;
    
    // arxivIdから年を推測
    if (!year && arxivId) {
      const match = arxivId.match(/^(\d{2})(\d{2})\./);
      if (match) {
        year = 2000 + parseInt(match[1]);
      }
    }
    
    // 説明文から年を推測
    if (!year) {
      const yearMatch = description.match(/\b(201[0-9]|202[0-5])\b/);
      if (yearMatch) {
        year = parseInt(yearMatch[1]);
      }
    }
    
    if (!year || year < 2014 || year > 2025) continue;
    
    seen.add(normalizedName);
    
    models.push({
      name: name.substring(0, 50), // 名前を短縮
      year,
      category: categorize(name, description),
      organization: extractOrg(description),
      description: description.substring(0, 200),
      arxivId
    });
  }
  
  // 重要なマイルストーンを追加（データベースにない場合）
  const milestones: ModelInfo[] = [
    { name: 'Transformer', year: 2017, category: 'Foundation', organization: 'Google', description: 'Attention Is All You Need - Self-attention architecture' },
    { name: 'GPT-1', year: 2018, category: 'LLM', organization: 'OpenAI', description: 'Generative Pre-Training - First GPT model' },
    { name: 'BERT', year: 2018, category: 'Encoder LM', organization: 'Google', description: 'Bidirectional Encoder Representations from Transformers' },
    { name: 'GPT-2', year: 2019, category: 'LLM', organization: 'OpenAI', description: 'Language Models are Unsupervised Multitask Learners' },
    { name: 'GPT-3', year: 2020, category: 'LLM', organization: 'OpenAI', description: '175B parameters, Few-shot learning' },
    { name: 'DALL-E', year: 2021, category: 'Image Generation', organization: 'OpenAI', description: 'Text-to-image generation' },
    { name: 'CLIP', year: 2021, category: 'Multimodal', organization: 'OpenAI', description: 'Contrastive Language-Image Pre-training' },
    { name: 'Codex', year: 2021, category: 'LLM', organization: 'OpenAI', description: 'Code generation model' },
    { name: 'Stable Diffusion', year: 2022, category: 'Image Generation', organization: 'Stability AI', description: 'Open-source diffusion model' },
    { name: 'ChatGPT', year: 2022, category: 'LLM', organization: 'OpenAI', description: 'Conversational AI with RLHF' },
    { name: 'Whisper', year: 2022, category: 'Speech/Audio', organization: 'OpenAI', description: 'Robust speech recognition' },
    { name: 'LLaMA', year: 2023, category: 'LLM', organization: 'Meta', description: 'Open foundation model' },
    { name: 'GPT-4', year: 2023, category: 'LLM', organization: 'OpenAI', description: 'Multimodal large language model' },
    { name: 'Claude', year: 2023, category: 'LLM', organization: 'Anthropic', description: 'Constitutional AI' },
    { name: 'Gemini', year: 2023, category: 'LLM', organization: 'Google', description: 'Multimodal AI model' },
    { name: 'Sora', year: 2024, category: 'Image Generation', organization: 'OpenAI', description: 'Text-to-video generation' },
    { name: 'Claude 3', year: 2024, category: 'LLM', organization: 'Anthropic', description: 'Advanced reasoning capabilities' },
    { name: 'LLaMA 3', year: 2024, category: 'LLM', organization: 'Meta', description: 'Improved open model' },
    { name: 'GPT-4o', year: 2024, category: 'LLM', organization: 'OpenAI', description: 'Omni model with native multimodal' },
  ];
  
  // マイルストーンを追加（重複なし）
  for (const m of milestones) {
    if (!seen.has(m.name.toLowerCase())) {
      models.push(m);
      seen.add(m.name.toLowerCase());
    }
  }
  
  return models.sort((a, b) => a.year - b.year);
}

function generateMermaidTimeline(models: ModelInfo[]): string {
  // 年ごとにグループ化
  const byYear = new Map<number, ModelInfo[]>();
  for (const m of models) {
    if (!byYear.has(m.year)) {
      byYear.set(m.year, []);
    }
    byYear.get(m.year)!.push(m);
  }
  
  let mermaid = `%%{init: {'theme': 'base', 'themeVariables': { 'fontSize': '14px'}}}%%
timeline
    title 生成AIの発展系譜 (2014-2025)
`;
  
  const years = Array.from(byYear.keys()).sort();
  
  for (const year of years) {
    const yearModels = byYear.get(year)!;
    mermaid += `    ${year}\n`;
    
    // カテゴリ別にグループ化
    const byCategory = new Map<string, ModelInfo[]>();
    for (const m of yearModels) {
      if (!byCategory.has(m.category)) {
        byCategory.set(m.category, []);
      }
      byCategory.get(m.category)!.push(m);
    }
    
    for (const [category, categoryModels] of byCategory) {
      const names = categoryModels.slice(0, 5).map(m => m.name).join(', ');
      mermaid += `        : ${category} - ${names}\n`;
    }
  }
  
  return mermaid;
}

function generateMermaidFlowchart(models: ModelInfo[]): string {
  let mermaid = `%%{init: {'theme': 'base', 'themeVariables': { 'fontSize': '12px'}}}%%
flowchart TB
    subgraph legend[" 凡例 "]
        direction LR
        L1[🔵 Foundation]
        L2[🟢 LLM]
        L3[🟡 Encoder]
        L4[🟣 Image Gen]
        L5[🔴 Multimodal]
        L6[🟠 Speech]
        L7[⚪ Alignment]
    end

`;
  
  // カテゴリ別のスタイル
  const categoryColors: Record<string, string> = {
    'Foundation': '#4A90D9',
    'LLM': '#27AE60',
    'Encoder LM': '#F1C40F',
    'Image Generation': '#9B59B6',
    'Multimodal': '#E74C3C',
    'Speech/Audio': '#E67E22',
    'Alignment': '#95A5A6',
    'GAN': '#8E44AD',
    'VAE': '#16A085',
    'Other': '#7F8C8D'
  };
  
  // 年代別サブグラフ
  const periods = [
    { name: '2014-2016', start: 2014, end: 2016, label: '基盤技術期' },
    { name: '2017-2019', start: 2017, end: 2019, label: 'Transformer革命' },
    { name: '2020-2021', start: 2020, end: 2021, label: 'スケーリング時代' },
    { name: '2022-2023', start: 2022, end: 2023, label: 'ChatGPT革命' },
    { name: '2024-2025', start: 2024, end: 2025, label: 'マルチモーダル時代' }
  ];
  
  const nodeIds = new Map<string, string>();
  let nodeCounter = 0;
  
  for (const period of periods) {
    const periodModels = models.filter(m => m.year >= period.start && m.year <= period.end);
    if (periodModels.length === 0) continue;
    
    mermaid += `    subgraph ${period.name.replace('-', '_')}["${period.label} (${period.name})"]
        direction TB
`;
    
    // カテゴリ別にグループ化して表示
    const byCategory = new Map<string, ModelInfo[]>();
    for (const m of periodModels) {
      if (!byCategory.has(m.category)) {
        byCategory.set(m.category, []);
      }
      byCategory.get(m.category)!.push(m);
    }
    
    for (const [category, catModels] of byCategory) {
      // 各カテゴリから最大3つを選択
      const selected = catModels.slice(0, 3);
      for (const m of selected) {
        const nodeId = `n${nodeCounter++}`;
        nodeIds.set(m.name, nodeId);
        const shortName = m.name.length > 20 ? m.name.substring(0, 17) + '...' : m.name;
        mermaid += `        ${nodeId}["${shortName}<br/>${m.organization}"]\n`;
      }
    }
    
    mermaid += `    end
`;
  }
  
  // 主要な関係性を追加
  mermaid += `
    %% 主要な発展経路
`;
  
  // Transformer系列
  const transformerLineage = ['Transformer', 'BERT', 'GPT-1', 'GPT-2', 'GPT-3', 'ChatGPT', 'GPT-4', 'GPT-4o'];
  for (let i = 0; i < transformerLineage.length - 1; i++) {
    const from = nodeIds.get(transformerLineage[i]);
    const to = nodeIds.get(transformerLineage[i + 1]);
    if (from && to) {
      mermaid += `    ${from} --> ${to}\n`;
    }
  }
  
  // LLaMA系列
  const llamaLineage = ['GPT-3', 'LLaMA', 'LLaMA 3'];
  for (let i = 0; i < llamaLineage.length - 1; i++) {
    const from = nodeIds.get(llamaLineage[i]);
    const to = nodeIds.get(llamaLineage[i + 1]);
    if (from && to) {
      mermaid += `    ${from} -.-> ${to}\n`;
    }
  }
  
  // Claude系列
  const claudeLineage = ['ChatGPT', 'Claude', 'Claude 3'];
  for (let i = 0; i < claudeLineage.length - 1; i++) {
    const from = nodeIds.get(claudeLineage[i]);
    const to = nodeIds.get(claudeLineage[i + 1]);
    if (from && to) {
      mermaid += `    ${from} -.-> ${to}\n`;
    }
  }
  
  // 画像生成系列
  const imageLineage = ['CLIP', 'DALL-E', 'Stable Diffusion', 'Sora'];
  for (let i = 0; i < imageLineage.length - 1; i++) {
    const from = nodeIds.get(imageLineage[i]);
    const to = nodeIds.get(imageLineage[i + 1]);
    if (from && to) {
      mermaid += `    ${from} --> ${to}\n`;
    }
  }
  
  // スタイル定義
  mermaid += `
    %% スタイル定義
`;
  for (const [name, nodeId] of nodeIds) {
    const model = models.find(m => m.name === name);
    if (model) {
      const color = categoryColors[model.category] || '#7F8C8D';
      mermaid += `    style ${nodeId} fill:${color},color:#fff,stroke:#333\n`;
    }
  }
  
  return mermaid;
}

function generateMarkdownReport(models: ModelInfo[]): string {
  let md = `# 生成AIの発展系譜

> Generated by YAGOKORO GraphRAG on ${new Date().toISOString().split('T')[0]}

## 概要

このドキュメントはYAGOKOROのGraphRAGシステムを使用して、Neo4jナレッジグラフから抽出した生成AI関連のデータを基に作成された系譜です。

- **総モデル/技術数**: ${models.length}
- **期間**: 2014年〜2025年
- **データソース**: Neo4j (${models.filter(m => m.arxivId).length}件のarXiv論文を含む)

## カテゴリ別統計

| カテゴリ | 件数 | 代表例 |
|----------|------|--------|
`;

  const byCategory = new Map<string, ModelInfo[]>();
  for (const m of models) {
    if (!byCategory.has(m.category)) {
      byCategory.set(m.category, []);
    }
    byCategory.get(m.category)!.push(m);
  }
  
  for (const [category, catModels] of Array.from(byCategory).sort((a, b) => b[1].length - a[1].length)) {
    const examples = catModels.slice(0, 3).map(m => m.name).join(', ');
    md += `| ${category} | ${catModels.length} | ${examples} |\n`;
  }

  md += `
## 年表

`;

  const byYear = new Map<number, ModelInfo[]>();
  for (const m of models) {
    if (!byYear.has(m.year)) {
      byYear.set(m.year, []);
    }
    byYear.get(m.year)!.push(m);
  }
  
  for (const year of Array.from(byYear.keys()).sort()) {
    const yearModels = byYear.get(year)!;
    md += `### ${year}年

`;
    for (const m of yearModels.sort((a, b) => a.category.localeCompare(b.category))) {
      md += `- **${m.name}** (${m.category}) - ${m.organization}\n`;
      if (m.arxivId) {
        md += `  - arXiv: ${m.arxivId}\n`;
      }
    }
    md += '\n';
  }

  md += `## 主要なマイルストーン

### 2017: Transformer革命
- **Attention Is All You Need** - Google が Self-Attention アーキテクチャを発表
- RNN/LSTMからの転換点

### 2018: 事前学習の時代
- **BERT** - 双方向エンコーダによる文脈理解
- **GPT-1** - 生成的事前学習の開始

### 2020: スケーリング法則
- **GPT-3** - 1750億パラメータ、Few-shot学習能力の実証
- スケーリング法則（Scaling Laws）の確立

### 2022: ChatGPT革命
- **ChatGPT** - RLHF による対話AI
- **Stable Diffusion** - オープンソース画像生成
- **Whisper** - 堅牢な音声認識

### 2023: マルチモーダルの幕開け
- **GPT-4** - マルチモーダル大規模言語モデル
- **LLaMA** - オープンな基盤モデル
- **Claude** - Constitutional AI

### 2024-2025: 次世代へ
- **Sora** - テキストから動画生成
- **GPT-4o** - ネイティブマルチモーダル
- エージェント AI の台頭

## 系譜図 (Mermaid)

以下のMermaid図は \`genai-timeline.mmd\` および \`genai-flowchart.mmd\` として保存されています。

---

*This document was auto-generated by YAGOKORO GraphRAG system.*
`;

  return md;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     生成AIの発展系譜 - YAGOKORO GraphRAG Generator        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const session = driver.session();
  
  try {
    // データ取得
    const models = await fetchGenerativeAIData(session);
    console.log(`\n📊 Found ${models.length} generative AI models/techniques`);
    
    // 出力ディレクトリ作成
    const outputDir = join(process.cwd(), '..', 'outputs');
    mkdirSync(outputDir, { recursive: true });
    
    // Timeline生成
    console.log('\n📝 Generating timeline...');
    const timeline = generateMermaidTimeline(models);
    writeFileSync(join(outputDir, 'genai-timeline.mmd'), timeline);
    console.log('   ✅ genai-timeline.mmd');
    
    // Flowchart生成
    console.log('\n📝 Generating flowchart...');
    const flowchart = generateMermaidFlowchart(models);
    writeFileSync(join(outputDir, 'genai-flowchart.mmd'), flowchart);
    console.log('   ✅ genai-flowchart.mmd');
    
    // レポート生成
    console.log('\n📝 Generating report...');
    const report = generateMarkdownReport(models);
    writeFileSync(join(outputDir, 'genai-genealogy.md'), report);
    console.log('   ✅ genai-genealogy.md');
    
    // 統計表示
    console.log('\n' + '═'.repeat(60));
    console.log('📊 Statistics:');
    
    const byCategory = new Map<string, number>();
    for (const m of models) {
      byCategory.set(m.category, (byCategory.get(m.category) || 0) + 1);
    }
    
    for (const [cat, count] of Array.from(byCategory).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${cat}: ${count}`);
    }
    
    console.log('\n✅ All files saved to outputs/ directory');
    console.log('═'.repeat(60));
    
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch(console.error);
