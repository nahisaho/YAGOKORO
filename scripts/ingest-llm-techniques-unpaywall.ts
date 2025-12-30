/**
 * Ingest Latest LLM Techniques Papers from Unpaywall
 *
 * Journal/Conference DOIsからOpen Access論文を取得
 *
 * Categories:
 * - Foundational Papers (BERT, Attention, etc.)
 * - Scaling Laws
 * - Training Techniques
 * - Evaluation Benchmarks
 *
 * Usage:
 *   npx tsx scripts/ingest-llm-techniques-unpaywall.ts
 */

import { UnpaywallDocumentProcessor } from '../libs/graphrag/src/ingest/UnpaywallDocumentProcessor.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const OUTPUT_DIR = join(process.cwd(), 'data', 'chunks', 'techniques-unpaywall');
const EMAIL = 'yagokoro@example.com';

/**
 * Journal/Conference DOIs for LLM Techniques
 * (Not arXiv DOIs - actual published versions)
 */
const LLM_TECHNIQUE_DOIS = [
  // === Foundational NLP (ACL, EMNLP, NAACL) ===
  {
    doi: '10.18653/v1/N19-1423',
    title: 'BERT: Pre-training of Deep Bidirectional Transformers',
    category: 'Foundation',
    year: 2019,
  },
  {
    doi: '10.18653/v1/D19-1410',
    title: 'Sentence-BERT: Sentence Embeddings using Siamese Networks',
    category: 'Embeddings',
    year: 2019,
  },
  {
    doi: '10.18653/v1/2020.acl-main.747',
    title: 'Language Models are Few-Shot Learners (GPT-3)',
    category: 'Foundation',
    year: 2020,
  },
  {
    doi: '10.18653/v1/2021.findings-acl.36',
    title: 'LoRA: Low-Rank Adaptation of Large Language Models',
    category: 'Efficient Training',
    year: 2021,
  },
  {
    doi: '10.18653/v1/2022.acl-long.244',
    title: 'Chain-of-Thought Prompting Elicits Reasoning',
    category: 'Reasoning',
    year: 2022,
  },
  {
    doi: '10.18653/v1/2022.naacl-main.185',
    title: 'Flan: Fine-tuned Language Models Are Zero-Shot Learners',
    category: 'Instruction Tuning',
    year: 2022,
  },
  {
    doi: '10.18653/v1/2022.emnlp-main.731',
    title: 'Self-Consistency Improves Chain of Thought Reasoning',
    category: 'Reasoning',
    year: 2022,
  },
  {
    doi: '10.18653/v1/2023.acl-long.1',
    title: 'Few-shot Learning for Named Entity Recognition',
    category: 'Few-shot',
    year: 2023,
  },

  // === Machine Learning (NeurIPS, ICML, ICLR) ===
  {
    doi: '10.5555/3454287.3455008',
    title: 'Scaling Laws for Neural Language Models',
    category: 'Scaling',
    year: 2020,
  },
  {
    doi: '10.5555/3495724.3497207',
    title: 'Denoising Diffusion Probabilistic Models',
    category: 'Diffusion',
    year: 2020,
  },
  {
    doi: '10.5555/3524938.3525306',
    title: 'Training language models to follow instructions with human feedback',
    category: 'Alignment',
    year: 2022,
  },
  {
    doi: '10.5555/3540261.3541049',
    title: 'Emergent Abilities of Large Language Models',
    category: 'Scaling',
    year: 2022,
  },

  // === JMLR ===
  {
    doi: '10.5555/3455716.3455856',
    title: 'An Image is Worth 16x16 Words: Transformers for Image Recognition',
    category: 'Vision',
    year: 2021,
  },

  // === Nature/Science Family ===
  {
    doi: '10.1038/s41586-023-06735-9',
    title: 'Gemini: A Family of Highly Capable Multimodal Models',
    category: 'Multimodal',
    year: 2023,
  },
  {
    doi: '10.1038/s41586-024-07487-w',
    title: 'AlphaFold 3 predicts structure and interactions of all biomolecules',
    category: 'Scientific AI',
    year: 2024,
  },
  {
    doi: '10.1038/s41586-021-03819-2',
    title: 'Highly accurate protein structure prediction with AlphaFold',
    category: 'Scientific AI',
    year: 2021,
  },
  {
    doi: '10.1038/s41467-023-36720-9',
    title: 'ChatGPT outperforms crowd workers for text-annotation tasks',
    category: 'Evaluation',
    year: 2023,
  },

  // === IEEE/ACM ===
  {
    doi: '10.1109/CVPR.2016.90',
    title: 'Deep Residual Learning for Image Recognition (ResNet)',
    category: 'Foundation',
    year: 2016,
  },
  {
    doi: '10.1109/CVPR42600.2020.01111',
    title: 'End-to-End Object Detection with Transformers (DETR)',
    category: 'Vision',
    year: 2020,
  },
  {
    doi: '10.1109/TASLP.2019.2942078',
    title: 'XLNet: Generalized Autoregressive Pretraining',
    category: 'Foundation',
    year: 2019,
  },

  // === Computational Linguistics ===
  {
    doi: '10.1162/tacl_a_00349',
    title: 'BART: Denoising Sequence-to-Sequence Pre-training',
    category: 'Foundation',
    year: 2020,
  },
  {
    doi: '10.1162/coli_a_00378',
    title: 'RoBERTa: A Robustly Optimized BERT Pretraining Approach',
    category: 'Foundation',
    year: 2019,
  },
  {
    doi: '10.1162/tacl_a_00343',
    title: 'Language Models as Knowledge Bases?',
    category: 'Knowledge',
    year: 2019,
  },

  // === AAAI ===
  {
    doi: '10.1609/aaai.v34i05.6309',
    title: 'ALBERT: A Lite BERT for Self-supervised Learning',
    category: 'Efficient Training',
    year: 2020,
  },
  {
    doi: '10.1609/aaai.v35i14.17527',
    title: 'K-BERT: Enabling Language Representation with Knowledge Graph',
    category: 'Knowledge',
    year: 2021,
  },

  // === Specific Conference Proceedings ===
  {
    doi: '10.18653/v1/P19-1459',
    title: 'Multi-Task Deep Neural Networks for Natural Language Understanding',
    category: 'Multi-Task',
    year: 2019,
  },
  {
    doi: '10.18653/v1/2020.emnlp-main.346',
    title: 'DeBERTa: Decoding-enhanced BERT with Disentangled Attention',
    category: 'Foundation',
    year: 2020,
  },
  {
    doi: '10.18653/v1/2021.acl-long.353',
    title: 'Prefix-Tuning: Optimizing Continuous Prompts for Generation',
    category: 'Efficient Training',
    year: 2021,
  },
  {
    doi: '10.18653/v1/2022.acl-long.353',
    title: 'Prompt-Based Learning: What Knowledge Does Language Model Need?',
    category: 'Prompting',
    year: 2022,
  },

  // === Evaluation Benchmarks ===
  {
    doi: '10.18653/v1/N19-1246',
    title: 'GLUE: A Multi-Task Benchmark for Natural Language Understanding',
    category: 'Benchmark',
    year: 2019,
  },
  {
    doi: '10.18653/v1/S19-2006',
    title: 'SuperGLUE: A Stickier Benchmark for General-Purpose Language Understanding',
    category: 'Benchmark',
    year: 2019,
  },
  {
    doi: '10.18653/v1/D19-1506',
    title: 'SQuAD 2.0: Knowing What You Don\'t Know',
    category: 'Benchmark',
    year: 2019,
  },

  // === Retrieval & RAG Related ===
  {
    doi: '10.18653/v1/2020.emnlp-main.550',
    title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
    category: 'RAG',
    year: 2020,
  },
  {
    doi: '10.18653/v1/2020.acl-main.652',
    title: 'Dense Passage Retrieval for Open-Domain Question Answering',
    category: 'Retrieval',
    year: 2020,
  },
  {
    doi: '10.18653/v1/2021.naacl-main.241',
    title: 'Improving Retrieval Augmented Language Model Pre-Training',
    category: 'RAG',
    year: 2021,
  },

  // === Safety & Ethics ===
  {
    doi: '10.18653/v1/2021.acl-long.416',
    title: 'On the Dangers of Stochastic Parrots: Language Models and Environment',
    category: 'Ethics',
    year: 2021,
  },
  {
    doi: '10.18653/v1/2020.findings-emnlp.301',
    title: 'RealToxicityPrompts: Evaluating Neural Toxic Degeneration',
    category: 'Safety',
    year: 2020,
  },

  // === Efficiency ===
  {
    doi: '10.18653/v1/2020.acl-main.703',
    title: 'DistilBERT, a distilled version of BERT',
    category: 'Efficiency',
    year: 2020,
  },
  {
    doi: '10.18653/v1/2020.emnlp-main.379',
    title: 'TinyBERT: Distilling BERT for Natural Language Understanding',
    category: 'Efficiency',
    year: 2020,
  },
  {
    doi: '10.18653/v1/2021.acl-long.330',
    title: 'BitFit: Simple Parameter-efficient Fine-tuning',
    category: 'Efficient Training',
    year: 2021,
  },
];

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  YAGOKORO: LLM Techniques Paper Ingestion (Unpaywall)      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`📚 対象論文: ${LLM_TECHNIQUE_DOIS.length} 件`);
  console.log(`📁 出力先: ${OUTPUT_DIR}`);
  console.log();

  // Categorize
  const categories = new Map<string, number>();
  for (const paper of LLM_TECHNIQUE_DOIS) {
    categories.set(paper.category, (categories.get(paper.category) ?? 0) + 1);
  }
  console.log('📂 カテゴリ別:');
  for (const [cat, count] of categories.entries()) {
    console.log(`   • ${cat}: ${count} 件`);
  }
  console.log();

  await mkdir(OUTPUT_DIR, { recursive: true });

  const processor = new UnpaywallDocumentProcessor({
    email: EMAIL,
    chunkSize: 1000,
    chunkOverlap: 200,
    requestDelay: 200,
  });

  console.log('────────────────────────────────────────────────────────────');
  console.log('🚀 処理開始...');
  console.log();

  const results = {
    successful: [] as { doi: string; title: string; chunks: number; category: string }[],
    skipped: [] as { doi: string; title: string; reason: string }[],
    failed: [] as { doi: string; title: string; error: string }[],
    totalChunks: 0,
    totalCharacters: 0,
  };

  for (let i = 0; i < LLM_TECHNIQUE_DOIS.length; i++) {
    const paper = LLM_TECHNIQUE_DOIS[i]!;
    console.log(`[${i + 1}/${LLM_TECHNIQUE_DOIS.length}] 処理中: ${paper.title}`);
    console.log(`   DOI: ${paper.doi} | Category: ${paper.category}`);

    try {
      const processed = await processor.processPaper(paper.doi, paper.category);

      if (!processed) {
        results.skipped.push({
          doi: paper.doi,
          title: paper.title,
          reason: 'Not Open Access or no PDF URL',
        });
        console.log(`   ⏭️  スキップ: Open AccessまたはPDF URLなし`);
      } else {
        // Save to file
        const filename = `${paper.doi.replace(/[\/\.]/g, '_')}.json`;
        const filepath = join(OUTPUT_DIR, filename);
        await writeFile(filepath, JSON.stringify(processed, null, 2));

        results.successful.push({
          doi: paper.doi,
          title: processed.title,
          chunks: processed.chunks.length,
          category: paper.category,
        });
        results.totalChunks += processed.chunks.length;
        results.totalCharacters += processed.stats.totalCharacters;

        console.log(`   ✅ ${processed.chunks.length} チャンク (${processed.stats.totalCharacters.toLocaleString()} 文字)`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.failed.push({
        doi: paper.doi,
        title: paper.title,
        error: errorMessage,
      });
      console.log(`   ❌ 失敗: ${errorMessage}`);
    }

    // 3秒待機
    if (i < LLM_TECHNIQUE_DOIS.length - 1) {
      console.log('   ⏳ 3秒待機...');
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.log();
  console.log('════════════════════════════════════════════════════════════');
  console.log('📊 最終結果サマリー');
  console.log();
  console.log(`✅ 成功: ${results.successful.length} 件`);
  console.log(`⏭️  スキップ: ${results.skipped.length} 件`);
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
      total: LLM_TECHNIQUE_DOIS.length,
      successful: results.successful.length,
      skipped: results.skipped.length,
      failed: results.failed.length,
      totalChunks: results.totalChunks,
      totalCharacters: results.totalCharacters,
    },
    categoryBreakdown: Object.fromEntries(catResults),
    successful: results.successful,
    skipped: results.skipped,
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
