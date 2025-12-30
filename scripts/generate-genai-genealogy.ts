/**
 * Generate GenAI Genealogy from collected papers
 *
 * 収集した論文データから生成AIの進化の系譜を作成
 *
 * Usage:
 *   npx tsx scripts/generate-genai-genealogy.ts
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const DATA_DIRS = [
  'data/chunks',
  'data/chunks/unpaywall',
  'data/chunks/techniques',
  'data/chunks/techniques-2',
];

const OUTPUT_DIR = 'outputs';

interface PaperInfo {
  title: string;
  arxivId?: string;
  doi?: string;
  category: string;
  year: number;
  source: string;
  chunks: number;
}

// 年の推定（arXiv IDから）
function estimateYear(arxivId?: string): number | null {
  if (!arxivId) return null;
  const match = arxivId.match(/^(\d{2})(\d{2})\./);
  if (match) {
    const yearPrefix = parseInt(match[1]!, 10);
    return yearPrefix >= 90 ? 1900 + yearPrefix : 2000 + yearPrefix;
  }
  return null;
}

// カテゴリの正規化
function normalizeCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    // Foundation Models
    'Transformer基盤': 'Foundation',
    'Foundation': 'Foundation',
    'GPT系': 'Foundation',
    '基盤モデル': 'Foundation',
    
    // LLM Models
    'LLM': 'LLM',
    '2024 Model': 'LLM',
    'Small LLM': 'LLM',
    '大規模言語モデル': 'LLM',
    'Language Model': 'LLM',
    
    // Code
    'Code LLM': 'Code',
    'Code': 'Code',
    'コード生成': 'Code',
    
    // Math & Reasoning
    'Math': 'Reasoning',
    'Reasoning': 'Reasoning',
    '推論': 'Reasoning',
    'プロンプティング・推論': 'Reasoning',
    
    // Multimodal
    'Multimodal': 'Multimodal',
    'マルチモーダル': 'Multimodal',
    'Video LLM': 'Multimodal',
    'Audio LLM': 'Multimodal',
    'Vision': 'Multimodal',
    '拡散モデル・画像生成': 'Multimodal',
    
    // RAG & Retrieval
    'RAG': 'RAG',
    'Retrieval': 'RAG',
    '検索拡張': 'RAG',
    'RAG・知識統合': 'RAG',
    
    // Alignment & Safety
    'Alignment': 'Alignment',
    'Safety': 'Safety',
    'Constitutional AI': 'Safety',
    'RLHF': 'Alignment',
    'アライメント': 'Alignment',
    'アラインメント・安全性': 'Alignment',
    
    // Efficiency
    'Efficient Attention': 'Efficiency',
    'Efficient Inference': 'Efficiency',
    'Quantization': 'Efficiency',
    'Efficiency': 'Efficiency',
    '効率化': 'Efficiency',
    'Context Compression': 'Efficiency',
    'Efficient Training': 'Efficiency',
    '効率的学習・スケーリング': 'Efficiency',
    
    // Architecture
    'MoE': 'Architecture',
    'State Space Model': 'Architecture',
    'Position Encoding': 'Architecture',
    'Long Context': 'Architecture',
    'Architecture': 'Architecture',
    
    // Training
    'Distillation': 'Training',
    'Synthetic Data': 'Training',
    'Instruction Tuning': 'Training',
    'Training': 'Training',
    'Continual Learning': 'Training',
    'Model Merging': 'Training',
    
    // Prompting & Agents
    'Prompting': 'Prompting',
    'Agent': 'Agent',
    'Tool Use': 'Agent',
    
    // Evaluation
    'Evaluation': 'Evaluation',
    'Benchmark': 'Evaluation',
    '評価': 'Evaluation',
    '創発能力・評価': 'Evaluation',
    
    // Embedding
    'Embedding': 'Embedding',
    'Embeddings': 'Embedding',
    
    // Science
    'Science': 'Science',
  };
  
  return categoryMap[category] || category;
}

async function collectPapers(): Promise<PaperInfo[]> {
  const papers: PaperInfo[] = [];
  
  for (const dir of DATA_DIRS) {
    const fullPath = join(process.cwd(), dir);
    try {
      const files = await readdir(fullPath);
      const jsonFiles = files.filter(f => f.endsWith('.json') && !f.startsWith('_'));
      
      for (const file of jsonFiles) {
        try {
          const content = await readFile(join(fullPath, file), 'utf-8');
          const data = JSON.parse(content);
          
          // techniques/techniques-2 は paper フィールドにメタデータがある
          const paperData = data.paper || data;
          
          // タイトル
          const title = paperData.title || data.title || file.replace('.json', '');
          
          // arXiv ID（複数の場所から探す）
          let arxivId = data.arxivId || paperData.id;
          if (arxivId && arxivId.includes('v')) {
            arxivId = arxivId.split('v')[0]; // v5などのバージョンを除去
          }
          
          // 年（published dateから優先的に取得）
          let year = data.year || data.metadata?.year;
          if (!year && paperData.published) {
            year = new Date(paperData.published).getFullYear();
          }
          if (!year && arxivId) {
            year = estimateYear(arxivId);
          }
          if (!year && data.doi) {
            year = 2020;
          }
          
          // カテゴリ（arXiv カテゴリから推定）
          let category = data.category;
          if (!category && paperData.primaryCategory) {
            category = inferCategoryFromArxivCategory(paperData.primaryCategory, title);
          }
          if (!category) {
            category = inferCategoryFromTitle(title);
          }
          
          papers.push({
            title,
            arxivId,
            doi: data.doi,
            category: normalizeCategory(category || 'LLM'),
            year: year || 2020,
            source: dir.includes('unpaywall') ? 'Unpaywall' : 'arXiv',
            chunks: data.chunks?.length || 0,
          });
        } catch (e) {
          // Skip invalid files
        }
      }
    } catch (e) {
      // Skip missing directories
    }
  }
  
  return papers.sort((a, b) => a.year - b.year);
}

// タイトルからカテゴリを推定
function inferCategoryFromTitle(title: string): string {
  const lower = title.toLowerCase();
  
  // Code
  if (lower.includes('code') || lower.includes('programming') || lower.includes('codex')) {
    return 'Code';
  }
  // Math
  if (lower.includes('math') || lower.includes('theorem') || lower.includes('gsm8k') || lower.includes('arithmetic')) {
    return 'Reasoning';
  }
  // RAG
  if (lower.includes('retrieval') || lower.includes(' rag') || lower.includes('retrieval-augmented')) {
    return 'RAG';
  }
  // Multimodal
  if (lower.includes('vision') || lower.includes('visual') || lower.includes('image') || lower.includes('video') || lower.includes('multimodal')) {
    return 'Multimodal';
  }
  // Audio
  if (lower.includes('audio') || lower.includes('speech') || lower.includes('whisper')) {
    return 'Multimodal';
  }
  // Alignment
  if (lower.includes('rlhf') || lower.includes('preference') || lower.includes('alignment') || lower.includes('instruct') || lower.includes('dpo') || lower.includes('orpo')) {
    return 'Alignment';
  }
  // Safety
  if (lower.includes('safety') || lower.includes('guardrail') || lower.includes('constitutional') || lower.includes('jailbreak')) {
    return 'Safety';
  }
  // Efficiency
  if (lower.includes('flash') || lower.includes('efficient') || lower.includes('quantiz') || lower.includes('lora') || lower.includes('distill')) {
    return 'Efficiency';
  }
  // Architecture
  if (lower.includes('mamba') || lower.includes('moe') || lower.includes('mixture') || lower.includes('position') || lower.includes('rope') || lower.includes('rotary')) {
    return 'Architecture';
  }
  // Agent
  if (lower.includes('agent') || lower.includes('tool') || lower.includes('react')) {
    return 'Agent';
  }
  // Prompting
  if (lower.includes('prompt') || lower.includes('chain-of-thought') || lower.includes('few-shot') || lower.includes('in-context')) {
    return 'Prompting';
  }
  // Reasoning
  if (lower.includes('reason') || lower.includes('step-by-step') || lower.includes('verify')) {
    return 'Reasoning';
  }
  // Evaluation
  if (lower.includes('benchmark') || lower.includes('evaluat') || lower.includes('mmlu') || lower.includes('humaneval')) {
    return 'Evaluation';
  }
  // Training
  if (lower.includes('pretrain') || lower.includes('fine-tun') || lower.includes('instruction') || lower.includes('synthetic')) {
    return 'Training';
  }
  // Embedding
  if (lower.includes('embed') || lower.includes('sentence') || lower.includes('contrastive')) {
    return 'Embedding';
  }
  // Model names
  if (lower.includes('llama') || lower.includes('mistral') || lower.includes('qwen') || lower.includes('deepseek') || lower.includes('phi-') || lower.includes('gemma')) {
    return 'LLM';
  }
  
  return 'LLM';
}

// arXivカテゴリからカテゴリを推定
function inferCategoryFromArxivCategory(arxivCat: string, title: string): string {
  // タイトルベースの推定を優先
  const fromTitle = inferCategoryFromTitle(title);
  if (fromTitle !== 'LLM') {
    return fromTitle;
  }
  
  // arXivカテゴリで補完
  if (arxivCat.includes('CL') || arxivCat.includes('cl')) {
    return 'LLM';
  }
  if (arxivCat.includes('CV') || arxivCat.includes('cv')) {
    return 'Multimodal';
  }
  if (arxivCat.includes('SE') || arxivCat.includes('se')) {
    return 'Code';
  }
  
  return 'LLM';
}

function generateTimeline(papers: PaperInfo[]): string {
  const byYear = new Map<number, PaperInfo[]>();
  
  for (const paper of papers) {
    const existing = byYear.get(paper.year) || [];
    existing.push(paper);
    byYear.set(paper.year, existing);
  }
  
  let md = `# 生成AI進化タイムライン\n\n`;
  md += `> 収集論文: ${papers.length}件\n\n`;
  
  const years = Array.from(byYear.keys()).sort();
  
  for (const year of years) {
    const yearPapers = byYear.get(year)!;
    md += `## ${year}年\n\n`;
    
    // カテゴリ別にグループ化
    const byCategory = new Map<string, PaperInfo[]>();
    for (const p of yearPapers) {
      const existing = byCategory.get(p.category) || [];
      existing.push(p);
      byCategory.set(p.category, existing);
    }
    
    for (const [category, catPapers] of byCategory) {
      md += `### ${category}\n\n`;
      for (const p of catPapers) {
        const id = p.arxivId ? `arXiv:${p.arxivId}` : (p.doi || '');
        md += `- **${p.title}** ${id ? `(${id})` : ''}\n`;
      }
      md += '\n';
    }
  }
  
  return md;
}

function generateMermaidDiagram(papers: PaperInfo[]): string {
  // 主要な論文を抽出してフローチャートを作成
  const keyPapers = [
    // Foundation
    { id: 'transformer', title: 'Attention Is All You Need', year: 2017 },
    { id: 'bert', title: 'BERT', year: 2018 },
    { id: 'gpt2', title: 'GPT-2', year: 2019 },
    { id: 'gpt3', title: 'GPT-3', year: 2020 },
    { id: 'gpt4', title: 'GPT-4', year: 2023 },
    
    // Instruction & Alignment
    { id: 'instructgpt', title: 'InstructGPT', year: 2022 },
    { id: 'rlhf', title: 'RLHF', year: 2022 },
    { id: 'chatgpt', title: 'ChatGPT', year: 2022 },
    { id: 'dpo', title: 'DPO', year: 2023 },
    
    // Open Models
    { id: 'llama', title: 'LLaMA', year: 2023 },
    { id: 'llama2', title: 'LLaMA 2', year: 2023 },
    { id: 'llama3', title: 'LLaMA 3', year: 2024 },
    { id: 'mistral', title: 'Mistral', year: 2023 },
    { id: 'mixtral', title: 'Mixtral', year: 2024 },
    
    // Multimodal
    { id: 'clip', title: 'CLIP', year: 2021 },
    { id: 'dalle', title: 'DALL-E', year: 2021 },
    { id: 'gpt4v', title: 'GPT-4V', year: 2023 },
    { id: 'gemini', title: 'Gemini', year: 2023 },
    
    // Efficient
    { id: 'lora', title: 'LoRA', year: 2021 },
    { id: 'flash', title: 'FlashAttention', year: 2022 },
    { id: 'qlora', title: 'QLoRA', year: 2023 },
    
    // RAG
    { id: 'rag', title: 'RAG', year: 2020 },
    { id: 'selfrag', title: 'Self-RAG', year: 2023 },
    { id: 'graphrag', title: 'GraphRAG', year: 2024 },
    
    // Code
    { id: 'codex', title: 'Codex', year: 2021 },
    { id: 'copilot', title: 'Copilot', year: 2021 },
    { id: 'codellama', title: 'CodeLlama', year: 2023 },
    
    // Architecture
    { id: 'mamba', title: 'Mamba', year: 2023 },
    { id: 'mamba2', title: 'Mamba-2', year: 2024 },
  ];
  
  let mermaid = `\`\`\`mermaid
flowchart TB
    subgraph 2017["2017: Transformer革命"]
        transformer["🔷 Transformer<br/>Attention Is All You Need"]
    end
    
    subgraph 2018["2018: 事前学習の確立"]
        bert["🔷 BERT<br/>双方向事前学習"]
        gpt1["🔷 GPT<br/>自己回帰事前学習"]
    end
    
    subgraph 2019["2019: スケーリング"]
        gpt2["🔷 GPT-2<br/>1.5Bパラメータ"]
        t5["🔷 T5<br/>Text-to-Text"]
    end
    
    subgraph 2020["2020: 巨大モデル & RAG"]
        gpt3["🔶 GPT-3<br/>175Bパラメータ"]
        rag["🟢 RAG<br/>検索拡張生成"]
    end
    
    subgraph 2021["2021: マルチモーダル & 効率化"]
        clip["🟣 CLIP<br/>画像-テキスト対照学習"]
        dalle["🟣 DALL-E<br/>テキストから画像生成"]
        codex["🔵 Codex<br/>コード生成"]
        lora["🟡 LoRA<br/>効率的ファインチューニング"]
    end
    
    subgraph 2022["2022: アライメント革命"]
        instructgpt["🔶 InstructGPT<br/>RLHF"]
        chatgpt["🔶 ChatGPT<br/>対話AI"]
        flash["🟡 FlashAttention<br/>効率的注意機構"]
        sd["🟣 Stable Diffusion<br/>オープン画像生成"]
    end
    
    subgraph 2023["2023: オープンモデル時代"]
        gpt4["🔶 GPT-4<br/>マルチモーダル"]
        llama["🟠 LLaMA<br/>オープンLLM"]
        llama2["🟠 LLaMA 2<br/>商用利用可"]
        mistral["🟠 Mistral 7B<br/>高効率"]
        claude2["🔶 Claude 2<br/>長文脈"]
        gemini["🔶 Gemini<br/>Google統合"]
        dpo["🟢 DPO<br/>直接選好最適化"]
        mamba["🟡 Mamba<br/>状態空間モデル"]
        selfrag["🟢 Self-RAG<br/>自己検索"]
        codellama["🔵 CodeLlama<br/>オープンコード"]
    end
    
    subgraph 2024["2024: MoE & 効率化"]
        mixtral["🟠 Mixtral<br/>MoE"]
        llama3["🟠 LLaMA 3<br/>8B/70B"]
        gpt4o["🔶 GPT-4o<br/>音声統合"]
        claude3["🔶 Claude 3<br/>Opus/Sonnet"]
        deepseek["🟠 DeepSeek-V2<br/>MoE効率化"]
        qwen2["🟠 Qwen2<br/>多言語"]
        graphrag["🟢 GraphRAG<br/>グラフ検索"]
        mamba2["🟡 Mamba-2<br/>SSM改良"]
    end
    
    %% 基本的な系譜
    transformer --> bert & gpt1
    bert --> t5
    gpt1 --> gpt2
    gpt2 --> gpt3
    gpt3 --> instructgpt
    instructgpt --> chatgpt
    chatgpt --> gpt4
    gpt4 --> gpt4o
    
    %% オープンモデル系譜
    gpt3 --> llama
    llama --> llama2
    llama2 --> llama3
    llama2 --> mistral
    mistral --> mixtral
    
    %% マルチモーダル系譜
    transformer --> clip
    clip --> dalle
    gpt4 --> gemini
    gemini --> claude3
    
    %% 効率化系譜
    transformer --> flash
    flash --> mamba
    mamba --> mamba2
    
    %% RAG系譜
    gpt3 --> rag
    rag --> selfrag
    selfrag --> graphrag
    
    %% コード系譜
    gpt3 --> codex
    codex --> codellama
    llama --> codellama
    
    %% アライメント系譜
    instructgpt --> dpo
    
    %% スタイル
    classDef openai fill:#10a37f,color:white
    classDef meta fill:#0866ff,color:white
    classDef google fill:#4285f4,color:white
    classDef anthropic fill:#d97706,color:white
    classDef technique fill:#8b5cf6,color:white
    
    class gpt1,gpt2,gpt3,gpt4,gpt4o,instructgpt,chatgpt,codex,dalle openai
    class llama,llama2,llama3,codellama meta
    class gemini,t5 google
    class claude2,claude3 anthropic
\`\`\`
`;
  
  return mermaid;
}

function generateCategoryStats(papers: PaperInfo[]): string {
  const byCategory = new Map<string, PaperInfo[]>();
  
  for (const p of papers) {
    const existing = byCategory.get(p.category) || [];
    existing.push(p);
    byCategory.set(p.category, existing);
  }
  
  let md = `# カテゴリ別統計\n\n`;
  md += `| カテゴリ | 論文数 | チャンク数 | 年範囲 |\n`;
  md += `|----------|--------|------------|--------|\n`;
  
  const categories = Array.from(byCategory.entries())
    .sort((a, b) => b[1].length - a[1].length);
  
  for (const [category, catPapers] of categories) {
    const totalChunks = catPapers.reduce((sum, p) => sum + p.chunks, 0);
    const years = catPapers.map(p => p.year);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    md += `| ${category} | ${catPapers.length} | ${totalChunks.toLocaleString()} | ${minYear}-${maxYear} |\n`;
  }
  
  return md;
}

function generateJsonData(papers: PaperInfo[]): object {
  // 年別・カテゴリ別に整理
  const byYear: Record<number, Record<string, string[]>> = {};
  
  for (const p of papers) {
    if (!byYear[p.year]) {
      byYear[p.year] = {};
    }
    if (!byYear[p.year]![p.category]) {
      byYear[p.year]![p.category] = [];
    }
    byYear[p.year]![p.category]!.push(p.title);
  }
  
  // 主要なマイルストーン
  const milestones = [
    { year: 2017, event: 'Transformer発表', paper: 'Attention Is All You Need' },
    { year: 2018, event: 'BERT発表、事前学習革命', paper: 'BERT' },
    { year: 2019, event: 'GPT-2、スケーリング開始', paper: 'GPT-2' },
    { year: 2020, event: 'GPT-3、Few-shot学習', paper: 'GPT-3' },
    { year: 2021, event: 'CLIP/DALL-E、マルチモーダル時代', paper: 'CLIP, DALL-E, Codex' },
    { year: 2022, event: 'ChatGPT、AIの民主化', paper: 'InstructGPT, ChatGPT' },
    { year: 2023, event: 'オープンモデル台頭', paper: 'LLaMA, Mistral, GPT-4' },
    { year: 2024, event: 'MoE & 効率化', paper: 'Mixtral, Mamba-2, Claude 3' },
  ];
  
  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalPapers: papers.length,
      totalChunks: papers.reduce((sum, p) => sum + p.chunks, 0),
    },
    milestones,
    byYear,
    papers: papers.map(p => ({
      title: p.title,
      id: p.arxivId || p.doi,
      category: p.category,
      year: p.year,
    })),
  };
}

function generateGenealogyMarkdown(papers: PaperInfo[]): string {
  let md = `# 生成AI進化の系譜

> YAGOKORO Knowledge Database から自動生成
> 
> 総論文数: ${papers.length}件
> 生成日時: ${new Date().toISOString()}

## 📊 概要

生成AI (Generative AI) は2017年のTransformer発表から急速に進化し、
2024年現在では様々な分野で実用化されています。

本文書は、収集した${papers.length}件の学術論文を分析し、
生成AIの進化の系譜をまとめたものです。

---

## 🏛️ 主要マイルストーン

| 年 | イベント | 主要論文 |
|----|----------|----------|
| 2017 | **Transformer革命** | Attention Is All You Need |
| 2018 | **事前学習の確立** | BERT, GPT |
| 2019 | **スケーリング開始** | GPT-2, T5 |
| 2020 | **巨大モデル時代** | GPT-3, RAG |
| 2021 | **マルチモーダル** | CLIP, DALL-E, Codex, LoRA |
| 2022 | **アライメント革命** | InstructGPT, ChatGPT, FlashAttention |
| 2023 | **オープンモデル時代** | LLaMA, Mistral, GPT-4, Mamba |
| 2024 | **MoE & 効率化** | Mixtral, LLaMA 3, Claude 3, GPT-4o |

---

## 🌳 系譜図

${generateMermaidDiagram(papers)}

---

## 📈 技術トレンド

### 1. Foundation Models (基盤モデル)
- **2017**: Transformerアーキテクチャの発明
- **2018-2019**: BERT/GPTによる事前学習パラダイムの確立
- **2020-2022**: GPT-3→InstructGPT→ChatGPTの進化
- **2023-2024**: GPT-4、Claude 3、Geminiのマルチモーダル化

### 2. Open Models (オープンモデル)
- **2023**: LLaMA、Mistral 7Bがオープンソース化
- **2024**: Mixtral (MoE)、LLaMA 3、Qwen2、DeepSeekの台頭

### 3. Efficient AI (効率化)
- **2021**: LoRA (効率的ファインチューニング)
- **2022**: FlashAttention (GPU最適化)
- **2023-2024**: Mamba (状態空間モデル)、量子化技術

### 4. RAG & Retrieval (検索拡張)
- **2020**: RAG (Retrieval-Augmented Generation)
- **2023**: Self-RAG、RAPTOR
- **2024**: GraphRAG、CRAG

### 5. Alignment & Safety (整合性と安全性)
- **2022**: RLHF、InstructGPT
- **2023**: DPO、Constitutional AI
- **2024**: ORPO、Llama Guard

### 6. Multimodal (マルチモーダル)
- **2021**: CLIP、DALL-E
- **2023**: GPT-4V、LLaVA
- **2024**: GPT-4o、Gemini Pro Vision

---

${generateCategoryStats(papers)}

---

## 📚 参考文献

本系譜は以下のソースから収集した論文に基づいています:

- **arXiv**: ${papers.filter(p => p.source === 'arXiv').length}件
- **Unpaywall (学術誌)**: ${papers.filter(p => p.source === 'Unpaywall').length}件

---

*Generated by YAGOKORO MCP Knowledge Base*
`;

  return md;
}

async function main() {
  console.log('🔍 論文データを収集中...');
  const papers = await collectPapers();
  console.log(`📚 ${papers.length}件の論文を発見`);
  
  await mkdir(OUTPUT_DIR, { recursive: true });
  
  // 1. メインの系譜ドキュメント
  console.log('📝 系譜ドキュメントを生成中...');
  const genealogy = generateGenealogyMarkdown(papers);
  await writeFile(join(OUTPUT_DIR, 'genai-genealogy.md'), genealogy);
  
  // 2. タイムライン
  console.log('📅 タイムラインを生成中...');
  const timeline = generateTimeline(papers);
  await writeFile(join(OUTPUT_DIR, 'genai-timeline.md'), timeline);
  
  // 3. JSONデータ
  console.log('📊 JSONデータを生成中...');
  const jsonData = generateJsonData(papers);
  await writeFile(join(OUTPUT_DIR, 'genai-data.json'), JSON.stringify(jsonData, null, 2));
  
  console.log(`
✅ 生成完了!

📁 出力ファイル:
   • outputs/genai-genealogy.md - メイン系譜ドキュメント
   • outputs/genai-timeline.md  - 年別タイムライン
   • outputs/genai-data.json    - 構造化データ

📊 統計:
   • 総論文数: ${papers.length}件
   • 年範囲: ${Math.min(...papers.map(p => p.year))}-${Math.max(...papers.map(p => p.year))}
   • カテゴリ数: ${new Set(papers.map(p => p.category)).size}
`);
}

main().catch(console.error);
