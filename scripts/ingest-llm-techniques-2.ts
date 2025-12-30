/**
 * Ingest Additional LLM Techniques Papers from arXiv (Part 2)
 *
 * 追加カテゴリ:
 * - Code LLMs (CodeLlama, StarCoder, DeepSeek-Coder)
 * - Math Reasoning (Minerva, Llemma)
 * - Knowledge Distillation
 * - Model Merging
 * - Synthetic Data
 * - Constitutional AI
 * - Continual Learning
 * - Speech/Audio LLMs
 * - Embedding Models
 * - Latest 2024 Models
 *
 * Usage:
 *   npx tsx scripts/ingest-llm-techniques-2.ts
 */

import { DoclingDocumentProcessor } from '../libs/graphrag/src/ingest/DoclingDocumentProcessor.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const OUTPUT_DIR = join(process.cwd(), 'data', 'chunks', 'techniques-2');

/**
 * Additional LLM Techniques Papers
 */
const LLM_TECHNIQUE_PAPERS_2 = [
  // === Code LLMs ===
  {
    arxivId: '2308.12950',
    title: 'Code Llama: Open Foundation Models for Code',
    category: 'Code LLM',
    year: 2023,
  },
  {
    arxivId: '2305.06161',
    title: 'StarCoder: May the source be with you!',
    category: 'Code LLM',
    year: 2023,
  },
  {
    arxivId: '2401.14196',
    title: 'DeepSeek-Coder: When the Large Language Model Meets Programming',
    category: 'Code LLM',
    year: 2024,
  },
  {
    arxivId: '2402.19173',
    title: 'StarCoder 2 and The Stack v2',
    category: 'Code LLM',
    year: 2024,
  },
  {
    arxivId: '2406.11612',
    title: 'DeepSeek-Coder-V2: Breaking the Barrier of Closed-Source Models',
    category: 'Code LLM',
    year: 2024,
  },
  {
    arxivId: '2107.03374',
    title: 'Codex: Evaluating Large Language Models Trained on Code',
    category: 'Code LLM',
    year: 2021,
  },
  {
    arxivId: '2308.07124',
    title: 'WizardCoder: Empowering Code LLMs with Evol-Instruct',
    category: 'Code LLM',
    year: 2023,
  },
  {
    arxivId: '2402.16906',
    title: 'Magicoder: Source Code Is All You Need',
    category: 'Code LLM',
    year: 2024,
  },

  // === Math Reasoning ===
  {
    arxivId: '2206.14858',
    title: 'Minerva: Solving Quantitative Reasoning Problems',
    category: 'Math',
    year: 2022,
  },
  {
    arxivId: '2310.10631',
    title: 'Llemma: An Open Language Model for Mathematics',
    category: 'Math',
    year: 2023,
  },
  {
    arxivId: '2309.12284',
    title: 'ToRA: A Tool-Integrated Reasoning Agent for Math',
    category: 'Math',
    year: 2023,
  },
  {
    arxivId: '2402.03300',
    title: 'DeepSeekMath: Pushing the Limits of Math Reasoning',
    category: 'Math',
    year: 2024,
  },
  {
    arxivId: '2309.05653',
    title: 'MetaMath: Bootstrap Your Own Mathematical Questions',
    category: 'Math',
    year: 2023,
  },
  {
    arxivId: '2308.09583',
    title: 'WizardMath: Empowering Mathematical Reasoning for LLMs',
    category: 'Math',
    year: 2023,
  },

  // === Knowledge Distillation ===
  {
    arxivId: '2306.08543',
    title: 'Orca: Progressive Learning from Complex Explanation Traces',
    category: 'Distillation',
    year: 2023,
  },
  {
    arxivId: '2311.11045',
    title: 'Orca 2: Teaching Small Language Models How to Reason',
    category: 'Distillation',
    year: 2023,
  },
  {
    arxivId: '2401.02954',
    title: 'TinyLlama: An Open-Source Small Language Model',
    category: 'Distillation',
    year: 2024,
  },
  {
    arxivId: '2310.06825',
    title: 'MiniGPT-4: Enhancing Vision-Language Understanding',
    category: 'Distillation',
    year: 2023,
  },
  {
    arxivId: '2305.14314',
    title: 'LLM-Pruner: Structural Pruning for Large Language Models',
    category: 'Distillation',
    year: 2023,
  },

  // === Model Merging ===
  {
    arxivId: '2403.19522',
    title: 'Model Stock: All we need is just a few fine-tuned models',
    category: 'Model Merging',
    year: 2024,
  },
  {
    arxivId: '2306.01708',
    title: 'Ties-Merging: Resolving Interference When Merging Models',
    category: 'Model Merging',
    year: 2023,
  },
  {
    arxivId: '2311.03099',
    title: 'Language Models are Super Mario: Absorbing Abilities from Homologous Models',
    category: 'Model Merging',
    year: 2023,
  },
  {
    arxivId: '2212.04089',
    title: 'Editing Models with Task Arithmetic',
    category: 'Model Merging',
    year: 2022,
  },

  // === Synthetic Data Generation ===
  {
    arxivId: '2304.12244',
    title: 'Self-Instruct: Aligning Language Models with Self-Generated Instructions',
    category: 'Synthetic Data',
    year: 2023,
  },
  {
    arxivId: '2305.14233',
    title: 'Unnatural Instructions: Tuning Language Models with (Almost) No Human Labor',
    category: 'Synthetic Data',
    year: 2023,
  },
  {
    arxivId: '2308.06259',
    title: 'Textbooks Are All You Need II: phi-1.5 technical report',
    category: 'Synthetic Data',
    year: 2023,
  },
  {
    arxivId: '2401.00368',
    title: 'Self-Play Fine-Tuning (SPIN)',
    category: 'Synthetic Data',
    year: 2024,
  },
  {
    arxivId: '2402.13228',
    title: 'Cosmopedia: Large-Scale Synthetic Textbooks',
    category: 'Synthetic Data',
    year: 2024,
  },

  // === Constitutional AI & Safety ===
  {
    arxivId: '2212.08073',
    title: 'Constitutional AI: Harmlessness from AI Feedback',
    category: 'Constitutional AI',
    year: 2022,
  },
  {
    arxivId: '2309.07124',
    title: 'SafeRLHF: Safe Reinforcement Learning from Human Feedback',
    category: 'Constitutional AI',
    year: 2023,
  },
  {
    arxivId: '2401.18018',
    title: 'Sleeper Agents: Training Deceptive LLMs',
    category: 'Safety',
    year: 2024,
  },
  {
    arxivId: '2306.09442',
    title: 'Jailbroken: How Does LLM Safety Training Fail?',
    category: 'Safety',
    year: 2023,
  },
  {
    arxivId: '2310.08419',
    title: 'Fine-tuning Language Models for Factuality',
    category: 'Safety',
    year: 2023,
  },

  // === Continual Learning ===
  {
    arxivId: '2308.04014',
    title: 'Continual Pre-training of Language Models',
    category: 'Continual Learning',
    year: 2023,
  },
  {
    arxivId: '2309.09530',
    title: 'Efficient Continual Pre-training for Building Domain-Specific LLMs',
    category: 'Continual Learning',
    year: 2023,
  },

  // === Speech & Audio LLMs ===
  {
    arxivId: '2305.11000',
    title: 'AudioGPT: Understanding and Generating Speech, Music, Sound',
    category: 'Audio LLM',
    year: 2023,
  },
  {
    arxivId: '2306.12925',
    title: 'AudioPaLM: A Large Language Model That Can Speak and Listen',
    category: 'Audio LLM',
    year: 2023,
  },
  {
    arxivId: '2305.15255',
    title: 'SpeechGPT: Empowering Large Language Models with Intrinsic Cross-Modal',
    category: 'Audio LLM',
    year: 2023,
  },
  {
    arxivId: '2312.11805',
    title: 'Whisper-AT: Noise-Robust Automatic Speech Recognition',
    category: 'Audio LLM',
    year: 2023,
  },
  {
    arxivId: '2309.07062',
    title: 'SALMONN: Towards Generic Hearing Abilities for LLMs',
    category: 'Audio LLM',
    year: 2023,
  },

  // === Embedding Models ===
  {
    arxivId: '2212.03533',
    title: 'E5: Text Embeddings by Weakly-Supervised Contrastive Pre-training',
    category: 'Embedding',
    year: 2022,
  },
  {
    arxivId: '2310.07554',
    title: 'BGE M3-Embedding: Multi-Lingual, Multi-Functionality, Multi-Granularity',
    category: 'Embedding',
    year: 2023,
  },
  {
    arxivId: '2401.00368',
    title: 'Nomic Embed: Training a Reproducible Long Context Text Embedder',
    category: 'Embedding',
    year: 2024,
  },
  {
    arxivId: '2402.05672',
    title: 'GritLM: Generative Representational Instruction Tuning',
    category: 'Embedding',
    year: 2024,
  },
  {
    arxivId: '2311.13534',
    title: 'Jina Embeddings 2: 8192-Token General-Purpose Text Embeddings',
    category: 'Embedding',
    year: 2023,
  },

  // === Latest 2024 Models ===
  {
    arxivId: '2401.02385',
    title: 'DeepSeek LLM: Scaling Open-Source Language Models',
    category: '2024 Model',
    year: 2024,
  },
  {
    arxivId: '2405.04434',
    title: 'DeepSeek-V2: A Strong, Economical, and Efficient MoE Model',
    category: '2024 Model',
    year: 2024,
  },
  {
    arxivId: '2403.05530',
    title: 'Yi: Open Foundation Models by 01.AI',
    category: '2024 Model',
    year: 2024,
  },
  {
    arxivId: '2407.10671',
    title: 'Qwen2 Technical Report',
    category: '2024 Model',
    year: 2024,
  },
  {
    arxivId: '2402.05468',
    title: 'OLMo: Accelerating the Science of Language Models',
    category: '2024 Model',
    year: 2024,
  },
  {
    arxivId: '2403.04652',
    title: 'Command R: Retrieval-Augmented Generation at Scale',
    category: '2024 Model',
    year: 2024,
  },
  {
    arxivId: '2406.12793',
    title: 'Nemotron-4 340B Technical Report',
    category: '2024 Model',
    year: 2024,
  },
  {
    arxivId: '2407.12327',
    title: 'Codestral Mamba: A Mamba-based Code Model',
    category: '2024 Model',
    year: 2024,
  },

  // === Prompting Techniques ===
  {
    arxivId: '2210.03629',
    title: 'ReAct: Synergizing Reasoning and Acting in Language Models',
    category: 'Prompting',
    year: 2022,
  },
  {
    arxivId: '2305.14325',
    title: 'Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought',
    category: 'Prompting',
    year: 2023,
  },
  {
    arxivId: '2210.11416',
    title: 'Large Language Models Are Human-Level Prompt Engineers',
    category: 'Prompting',
    year: 2022,
  },
  {
    arxivId: '2302.11382',
    title: 'A Prompt Pattern Catalog to Enhance Prompt Engineering',
    category: 'Prompting',
    year: 2023,
  },
  {
    arxivId: '2309.16797',
    title: 'Promptbreeder: Self-Referential Self-Improvement via Prompt Evolution',
    category: 'Prompting',
    year: 2023,
  },

  // === Retrieval & Knowledge ===
  {
    arxivId: '2301.12652',
    title: 'REPLUG: Retrieval-Augmented Black-Box Language Models',
    category: 'Retrieval',
    year: 2023,
  },
  {
    arxivId: '2305.14283',
    title: 'Active Retrieval Augmented Generation',
    category: 'Retrieval',
    year: 2023,
  },
  {
    arxivId: '2310.01558',
    title: 'Self-Knowledge Guided Retrieval Augmentation for LLMs',
    category: 'Retrieval',
    year: 2023,
  },
  {
    arxivId: '2403.10131',
    title: 'RAFT: Adapting Language Model to Domain Specific RAG',
    category: 'Retrieval',
    year: 2024,
  },

  // === Structured Output ===
  {
    arxivId: '2305.14992',
    title: 'Gorilla: Large Language Model Connected with APIs',
    category: 'Structured Output',
    year: 2023,
  },
  {
    arxivId: '2307.09288',
    title: 'FunSearch: Making new discoveries in mathematical sciences',
    category: 'Structured Output',
    year: 2023,
  },
  {
    arxivId: '2308.00245',
    title: 'Fact-Checking Complex Claims with Program-Guided Reasoning',
    category: 'Structured Output',
    year: 2023,
  },

  // === Video LLMs ===
  {
    arxivId: '2306.02858',
    title: 'Video-LLaMA: An Instruction-tuned Audio-Visual Language Model',
    category: 'Video LLM',
    year: 2023,
  },
  {
    arxivId: '2311.10122',
    title: 'Video-LLaVA: Learning United Visual Representation',
    category: 'Video LLM',
    year: 2023,
  },
  {
    arxivId: '2310.19773',
    title: 'LLaVA-Interactive: An All-in-One Demo',
    category: 'Video LLM',
    year: 2023,
  },

  // === Efficient Inference ===
  {
    arxivId: '2302.01318',
    title: 'vLLM: Efficient Memory Management for Large Language Model',
    category: 'Efficient Inference',
    year: 2023,
  },
  {
    arxivId: '2309.06180',
    title: 'Efficient Streaming Language Models with Attention Sinks',
    category: 'Efficient Inference',
    year: 2023,
  },
  {
    arxivId: '2306.05836',
    title: 'Inference with Reference: Lossless Acceleration of LLMs',
    category: 'Efficient Inference',
    year: 2023,
  },
  {
    arxivId: '2404.14294',
    title: 'Medusa: Simple LLM Inference Acceleration with Multiple Heads',
    category: 'Efficient Inference',
    year: 2024,
  },
  {
    arxivId: '2311.01282',
    title: 'S-LoRA: Serving Thousands of Concurrent LoRA Adapters',
    category: 'Efficient Inference',
    year: 2023,
  },

  // === Context Compression ===
  {
    arxivId: '2310.06201',
    title: 'LongLLMLingua: Accelerating and Enhancing LLMs in Long Context',
    category: 'Context Compression',
    year: 2023,
  },
  {
    arxivId: '2304.08467',
    title: 'LLMLingua: Compressing Prompts for Accelerated Inference',
    category: 'Context Compression',
    year: 2023,
  },
  {
    arxivId: '2305.05176',
    title: 'Unlimiformer: Long-Range Transformers with Unlimited Length Input',
    category: 'Context Compression',
    year: 2023,
  },

  // === Mixture Methods ===
  {
    arxivId: '2401.13792',
    title: 'Mixtral of Experts Fine-Tuning',
    category: 'MoE',
    year: 2024,
  },
  {
    arxivId: '2402.14905',
    title: 'Branch-Train-MiX: Mixing Expert LLMs',
    category: 'MoE',
    year: 2024,
  },
  {
    arxivId: '2310.16944',
    title: 'MoQE: Mixture of Quantized Experts',
    category: 'MoE',
    year: 2023,
  },
];

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  YAGOKORO: LLM Techniques Paper Ingestion Part 2 (arXiv)   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();

  // Remove duplicates by arxivId
  const uniquePapers = Array.from(
    new Map(LLM_TECHNIQUE_PAPERS_2.map(p => [p.arxivId, p])).values()
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
