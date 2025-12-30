/**
 * Ingest Latest LLM Techniques Papers from arXiv
 *
 * 2023-2024年のLLMの最新技術・手法に焦点を当てた論文を取得
 *
 * Categories:
 * - Mixture of Experts (MoE)
 * - Efficient Attention (Flash Attention, etc.)
 * - Position Encoding (RoPE, ALiBi)
 * - State Space Models (Mamba)
 * - Alignment (DPO, ORPO, KTO)
 * - RAG Advances (Self-RAG, RAPTOR)
 * - Long Context
 * - Multimodal LLMs
 * - Small Language Models
 * - Quantization & Efficiency
 * - Agents & Tool Use
 *
 * Usage:
 *   npx tsx scripts/ingest-llm-techniques.ts
 */

import { DoclingDocumentProcessor } from '../libs/graphrag/src/ingest/DoclingDocumentProcessor.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const OUTPUT_DIR = join(process.cwd(), 'data', 'chunks', 'techniques');

/**
 * Latest LLM Techniques Papers (2023-2024)
 */
const LLM_TECHNIQUE_PAPERS = [
  // === Mixture of Experts (MoE) ===
  {
    arxivId: '2401.04088',
    title: 'Mixtral of Experts',
    category: 'MoE',
    year: 2024,
  },
  {
    arxivId: '2401.06066',
    title: 'DeepSeekMoE: Towards Ultimate Expert Specialization',
    category: 'MoE',
    year: 2024,
  },
  {
    arxivId: '2402.07871',
    title: 'OpenMoE: An Early Effort on Open Mixture-of-Experts',
    category: 'MoE',
    year: 2024,
  },

  // === Efficient Attention ===
  {
    arxivId: '2205.14135',
    title: 'FlashAttention: Fast and Memory-Efficient Exact Attention',
    category: 'Efficient Attention',
    year: 2022,
  },
  {
    arxivId: '2307.08691',
    title: 'FlashAttention-2: Faster Attention with Better Parallelism',
    category: 'Efficient Attention',
    year: 2023,
  },
  {
    arxivId: '2309.06180',
    title: 'Efficient Streaming Language Models with Attention Sinks',
    category: 'Efficient Attention',
    year: 2023,
  },

  // === Position Encoding ===
  {
    arxivId: '2104.09864',
    title: 'RoFormer: Enhanced Transformer with Rotary Position Embedding',
    category: 'Position Encoding',
    year: 2021,
  },
  {
    arxivId: '2108.12409',
    title: 'Train Short, Test Long: Attention with Linear Biases (ALiBi)',
    category: 'Position Encoding',
    year: 2021,
  },
  {
    arxivId: '2306.15595',
    title: 'Extending Context Window via Position Interpolation',
    category: 'Position Encoding',
    year: 2023,
  },
  {
    arxivId: '2309.00071',
    title: 'YaRN: Efficient Context Window Extension',
    category: 'Position Encoding',
    year: 2023,
  },

  // === State Space Models ===
  {
    arxivId: '2312.00752',
    title: 'Mamba: Linear-Time Sequence Modeling with Selective State Spaces',
    category: 'State Space Model',
    year: 2023,
  },
  {
    arxivId: '2401.04081',
    title: 'MoE-Mamba: Efficient Selective State Space Models with MoE',
    category: 'State Space Model',
    year: 2024,
  },
  {
    arxivId: '2405.21060',
    title: 'Mamba-2: Transformers are SSMs',
    category: 'State Space Model',
    year: 2024,
  },

  // === Alignment (DPO, ORPO, KTO) ===
  {
    arxivId: '2305.18290',
    title: 'Direct Preference Optimization (DPO)',
    category: 'Alignment',
    year: 2023,
  },
  {
    arxivId: '2310.12036',
    title: 'Zephyr: Direct Distillation of LM Alignment',
    category: 'Alignment',
    year: 2023,
  },
  {
    arxivId: '2402.01306',
    title: 'Self-Rewarding Language Models',
    category: 'Alignment',
    year: 2024,
  },
  {
    arxivId: '2403.07691',
    title: 'ORPO: Monolithic Preference Optimization without Reference Model',
    category: 'Alignment',
    year: 2024,
  },
  {
    arxivId: '2402.01306',
    title: 'KTO: Model Alignment as Prospect Theoretic Optimization',
    category: 'Alignment',
    year: 2024,
  },

  // === RAG Advances ===
  {
    arxivId: '2310.11511',
    title: 'Self-RAG: Learning to Retrieve, Generate, and Critique',
    category: 'RAG',
    year: 2023,
  },
  {
    arxivId: '2401.18059',
    title: 'RAPTOR: Recursive Abstractive Processing for Tree-Organized Retrieval',
    category: 'RAG',
    year: 2024,
  },
  {
    arxivId: '2312.10997',
    title: 'Retrieval-Augmented Generation for Large Language Models: A Survey',
    category: 'RAG',
    year: 2023,
  },
  {
    arxivId: '2404.10981',
    title: 'From Local to Global: A Graph RAG Approach',
    category: 'RAG',
    year: 2024,
  },
  {
    arxivId: '2402.03367',
    title: 'CRAG: Corrective Retrieval Augmented Generation',
    category: 'RAG',
    year: 2024,
  },

  // === Long Context ===
  {
    arxivId: '2402.08268',
    title: 'LongRoPE: Extending LLM Context Window Beyond 2M Tokens',
    category: 'Long Context',
    year: 2024,
  },
  {
    arxivId: '2307.03172',
    title: 'Lost in the Middle: How LLMs Use Long Contexts',
    category: 'Long Context',
    year: 2023,
  },
  {
    arxivId: '2401.01325',
    title: 'LLM Maybe LongLM: SelfExtend for Long Contexts',
    category: 'Long Context',
    year: 2024,
  },

  // === Multimodal LLMs ===
  {
    arxivId: '2304.08485',
    title: 'Visual Instruction Tuning (LLaVA)',
    category: 'Multimodal',
    year: 2023,
  },
  {
    arxivId: '2310.03744',
    title: 'Improved Baselines with Visual Instruction Tuning (LLaVA-1.5)',
    category: 'Multimodal',
    year: 2023,
  },
  {
    arxivId: '2312.11805',
    title: 'TinyGPT-V: Efficient Multimodal LLM via Small Backbones',
    category: 'Multimodal',
    year: 2023,
  },
  {
    arxivId: '2402.11530',
    title: 'LLaVA-NeXT: Improved reasoning, OCR, and world knowledge',
    category: 'Multimodal',
    year: 2024,
  },
  {
    arxivId: '2403.09611',
    title: 'MM1: Methods, Analysis & Insights from Multimodal LLM Pre-training',
    category: 'Multimodal',
    year: 2024,
  },

  // === Small Language Models ===
  {
    arxivId: '2309.05463',
    title: 'Qwen Technical Report',
    category: 'Small LLM',
    year: 2023,
  },
  {
    arxivId: '2306.01116',
    title: 'Phi-1: Textbooks Are All You Need',
    category: 'Small LLM',
    year: 2023,
  },
  {
    arxivId: '2309.05463',
    title: 'Phi-1.5: Textbooks Are All You Need II',
    category: 'Small LLM',
    year: 2023,
  },
  {
    arxivId: '2404.14219',
    title: 'Phi-3 Technical Report: A Highly Capable Small LLM',
    category: 'Small LLM',
    year: 2024,
  },
  {
    arxivId: '2403.08295',
    title: 'Gemma: Open Models Based on Gemini Research',
    category: 'Small LLM',
    year: 2024,
  },
  {
    arxivId: '2407.21783',
    title: 'Llama 3.1: The Llama 3 Herd of Models',
    category: 'Small LLM',
    year: 2024,
  },

  // === Quantization & Efficiency ===
  {
    arxivId: '2306.00978',
    title: 'AWQ: Activation-aware Weight Quantization',
    category: 'Quantization',
    year: 2023,
  },
  {
    arxivId: '2210.17323',
    title: 'SmoothQuant: Accurate and Efficient Post-Training Quantization',
    category: 'Quantization',
    year: 2022,
  },
  {
    arxivId: '2402.17764',
    title: 'BitNet: Scaling 1-bit Transformers',
    category: 'Quantization',
    year: 2024,
  },
  {
    arxivId: '2310.11453',
    title: 'LLM in a Flash: Efficient LLM Inference with Limited Memory',
    category: 'Efficiency',
    year: 2023,
  },
  {
    arxivId: '2211.17192',
    title: 'Speculative Decoding: Fast Inference from Transformers',
    category: 'Efficiency',
    year: 2022,
  },

  // === Agents & Tool Use ===
  {
    arxivId: '2308.08155',
    title: 'AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent',
    category: 'Agent',
    year: 2023,
  },
  {
    arxivId: '2310.04406',
    title: 'Language Agent Tree Search (LATS)',
    category: 'Agent',
    year: 2023,
  },
  {
    arxivId: '2303.17580',
    title: 'HuggingGPT: Solving AI Tasks with ChatGPT',
    category: 'Agent',
    year: 2023,
  },
  {
    arxivId: '2402.18679',
    title: 'More Agents Is All You Need',
    category: 'Agent',
    year: 2024,
  },
  {
    arxivId: '2305.16291',
    title: 'Toolformer: Language Models Can Teach Themselves to Use Tools',
    category: 'Tool Use',
    year: 2023,
  },
  {
    arxivId: '2307.16789',
    title: 'ToolLLM: Facilitating LLMs to Master 16000+ APIs',
    category: 'Tool Use',
    year: 2023,
  },

  // === Reasoning & CoT ===
  {
    arxivId: '2305.10601',
    title: 'Tree of Thoughts: Deliberate Problem Solving with LLMs',
    category: 'Reasoning',
    year: 2023,
  },
  {
    arxivId: '2309.03409',
    title: 'Graph of Thoughts: Solving Elaborate Problems with LLMs',
    category: 'Reasoning',
    year: 2023,
  },
  {
    arxivId: '2402.03268',
    title: 'Self-Discover: LLMs Self-Compose Reasoning Structures',
    category: 'Reasoning',
    year: 2024,
  },
  {
    arxivId: '2305.20050',
    title: 'Let\'s Verify Step by Step (Process Reward Models)',
    category: 'Reasoning',
    year: 2023,
  },

  // === Instruction Following ===
  {
    arxivId: '2304.03277',
    title: 'Instruction Tuning with GPT-4',
    category: 'Instruction Tuning',
    year: 2023,
  },
  {
    arxivId: '2306.02707',
    title: 'WizardLM: Empowering LLMs with Evol-Instruct',
    category: 'Instruction Tuning',
    year: 2023,
  },
  {
    arxivId: '2308.10792',
    title: 'OpenChat: Advancing Open-source Language Models with Imperfect Data',
    category: 'Instruction Tuning',
    year: 2023,
  },

  // === Safety & Red Teaming ===
  {
    arxivId: '2310.06987',
    title: 'Fine-tuning Aligned LLMs Compromises Safety',
    category: 'Safety',
    year: 2023,
  },
  {
    arxivId: '2307.15043',
    title: 'Universal and Transferable Adversarial Attacks on Aligned LLMs',
    category: 'Safety',
    year: 2023,
  },
  {
    arxivId: '2310.03693',
    title: 'Llama Guard: LLM-based Input-Output Safeguard',
    category: 'Safety',
    year: 2023,
  },

  // === Evaluation ===
  {
    arxivId: '2311.12022',
    title: 'GPQA: A Graduate-Level Benchmark for LLMs',
    category: 'Evaluation',
    year: 2023,
  },
  {
    arxivId: '2403.13787',
    title: 'Chatbot Arena: An Open Platform for Evaluating LLMs',
    category: 'Evaluation',
    year: 2024,
  },
  {
    arxivId: '2306.05685',
    title: 'How Far Can Camels Go? Exploring Language Models across Many Tasks',
    category: 'Evaluation',
    year: 2023,
  },

  // === Context & Memory ===
  {
    arxivId: '2306.07174',
    title: 'MemGPT: Towards LLMs as Operating Systems',
    category: 'Memory',
    year: 2023,
  },
  {
    arxivId: '2310.08560',
    title: 'Walking Down the Memory Maze: Beyond Context Limit',
    category: 'Memory',
    year: 2023,
  },

  // === Data & Training ===
  {
    arxivId: '2306.11644',
    title: 'Textbooks Are All You Need II: phi-1.5 (Data Quality)',
    category: 'Training',
    year: 2023,
  },
  {
    arxivId: '2305.11206',
    title: 'LIMA: Less Is More for Alignment',
    category: 'Training',
    year: 2023,
  },
  {
    arxivId: '2401.10020',
    title: 'Dolma: An Open Corpus of 3T Tokens',
    category: 'Training Data',
    year: 2024,
  },
];

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║    YAGOKORO: LLM Techniques Paper Ingestion (arXiv)        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();

  // Remove duplicates by arxivId
  const uniquePapers = Array.from(
    new Map(LLM_TECHNIQUE_PAPERS.map(p => [p.arxivId, p])).values()
  );

  console.log(`📚 対象論文: ${uniquePapers.length} 件`);
  console.log(`📁 出力先: ${OUTPUT_DIR}`);
  console.log();

  // Categorize
  const categories = new Map<string, number>();
  for (const paper of uniquePapers) {
    categories.set(paper.category, (categories.get(paper.category) ?? 0) + 1);
  }
  console.log('📂 カテゴリ別:');
  for (const [cat, count] of categories.entries()) {
    console.log(`   • ${cat}: ${count} 件`);
  }
  console.log();

  await mkdir(OUTPUT_DIR, { recursive: true });

  const processor = new DoclingDocumentProcessor({
    chunkSize: 1000,
    chunkOverlap: 200,
    timeout: 600000, // 10 minutes
  });

  console.log('────────────────────────────────────────────────────────────');
  console.log('🚀 処理開始...');
  console.log();

  const results = {
    successful: [] as { arxivId: string; title: string; chunks: number; category: string }[],
    failed: [] as { arxivId: string; title: string; error: string }[],
    totalChunks: 0,
    totalCharacters: 0,
  };

  for (let i = 0; i < uniquePapers.length; i++) {
    const paper = uniquePapers[i]!;
    console.log(`[${i + 1}/${uniquePapers.length}] 処理中: ${paper.title}`);
    console.log(`   arXiv: ${paper.arxivId} | Category: ${paper.category}`);

    try {
      const processed = await processor.processArxivPaper(paper.arxivId, paper.category);

      // Save to file
      const filename = `${paper.arxivId.replace(/\./g, '_')}.json`;
      const filepath = join(OUTPUT_DIR, filename);
      await writeFile(filepath, JSON.stringify(processed, null, 2));

      results.successful.push({
        arxivId: paper.arxivId,
        title: processed.title,
        chunks: processed.chunks.length,
        category: paper.category,
      });
      results.totalChunks += processed.chunks.length;
      results.totalCharacters += processed.stats.totalCharacters;

      console.log(`   ✅ ${processed.chunks.length} チャンク (${processed.stats.totalCharacters.toLocaleString()} 文字)`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.failed.push({
        arxivId: paper.arxivId,
        title: paper.title,
        error: errorMessage,
      });
      console.log(`   ❌ 失敗: ${errorMessage}`);
    }

    // 5秒待機
    if (i < uniquePapers.length - 1) {
      console.log('   ⏳ 5秒待機...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  console.log();
  console.log('════════════════════════════════════════════════════════════');
  console.log('📊 最終結果サマリー');
  console.log();
  console.log(`✅ 成功: ${results.successful.length} 件`);
  console.log(`❌ 失敗: ${results.failed.length} 件`);
  console.log(`📦 総チャンク数: ${results.totalChunks.toLocaleString()}`);
  console.log(`📝 総文字数: ${results.totalCharacters.toLocaleString()}`);
  console.log();

  // Category summary
  const catResults = new Map<string, { count: number; chunks: number }>();
  for (const paper of results.successful) {
    const curr = catResults.get(paper.category) ?? { count: 0, chunks: 0 };
    catResults.set(paper.category, {
      count: curr.count + 1,
      chunks: curr.chunks + paper.chunks,
    });
  }
  console.log('📂 カテゴリ別成功:');
  for (const [cat, data] of catResults.entries()) {
    console.log(`   • ${cat}: ${data.count} 件 (${data.chunks} chunks)`);
  }
  console.log();

  // Save summary
  const summary = {
    timestamp: new Date().toISOString(),
    summary: {
      total: uniquePapers.length,
      successful: results.successful.length,
      failed: results.failed.length,
      totalChunks: results.totalChunks,
      totalCharacters: results.totalCharacters,
    },
    categoryBreakdown: Object.fromEntries(catResults),
    successful: results.successful,
    failed: results.failed,
  };

  await writeFile(
    join(OUTPUT_DIR, '_summary.json'),
    JSON.stringify(summary, null, 2)
  );

  console.log(`📄 サマリー保存: ${join(OUTPUT_DIR, '_summary.json')}`);
  console.log();
  console.log('✨ 完了!');
}

main().catch(console.error);
