/**
 * Ingest GenAI papers from Unpaywall
 *
 * This script fetches important GenAI papers that have **journal DOIs**
 * (not arXiv DOIs) and are available as Open Access through Unpaywall.
 *
 * Note: arXiv papers (10.48550/arXiv.*) should be fetched via ArXiv API instead.
 *
 * Usage:
 *   export UNPAYWALL_EMAIL=your@email.com
 *   npx tsx scripts/ingest-unpaywall-papers.ts
 */

import { UnpaywallDocumentProcessor, type PaperDefinition } from '../libs/graphrag/src/ingest/UnpaywallDocumentProcessor.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

// Your email for Unpaywall API (required)
const EMAIL = process.env.UNPAYWALL_EMAIL ?? 'research@example.com';

// Output directory for processed papers
const OUTPUT_DIR = join(process.cwd(), 'data', 'chunks', 'unpaywall');

/**
 * Important GenAI papers with actual journal/conference DOIs
 *
 * These are papers published in venues like:
 * - NeurIPS, ICML, ICLR, ACL, EMNLP, NAACL
 * - Nature, Science, JMLR, TACL
 */
const GENAI_PAPERS: PaperDefinition[] = [
  // === Foundational Language Models ===
  {
    doi: '10.1162/tacl_a_00349',
    title: 'Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer (T5)',
    category: 'Language Model',
    year: 2020,
  },
  {
    doi: '10.18653/v1/2020.emnlp-main.346',
    title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
    category: 'RAG',
    year: 2020,
  },
  {
    doi: '10.18653/v1/2021.acl-long.416',
    title: 'KILT: Knowledge Intensive Language Tasks',
    category: 'RAG',
    year: 2021,
  },
  {
    doi: '10.18653/v1/2020.acl-main.703',
    title: 'Dense Passage Retrieval for Open-Domain Question Answering',
    category: 'RAG',
    year: 2020,
  },

  // === BERT variations ===
  {
    doi: '10.18653/v1/N19-1423',
    title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
    category: 'Language Model',
    year: 2019,
  },
  {
    doi: '10.18653/v1/2020.acl-main.747',
    title: 'Longformer: The Long-Document Transformer',
    category: 'Architecture',
    year: 2020,
  },

  // === GPT & InstructGPT ===
  {
    doi: '10.18653/v1/2022.acl-long.1',
    title: 'Fine-tuning Language Models from Human Preferences',
    category: 'RLHF',
    year: 2022,
  },

  // === Diffusion Models ===
  {
    doi: '10.5555/3495724.3497205',
    title: 'Denoising Diffusion Probabilistic Models',
    category: 'Diffusion',
    year: 2020,
  },

  // === Multimodal ===
  {
    doi: '10.18653/v1/2021.emnlp-main.243',
    title: 'An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale',
    category: 'Vision',
    year: 2021,
  },

  // === Code Generation ===
  {
    doi: '10.1126/science.abj6511',
    title: 'Competitive programming with AlphaCode',
    category: 'Code',
    year: 2022,
  },

  // === GAN ===
  {
    doi: '10.1145/3422622',
    title: 'Generative Adversarial Networks',
    category: 'Image Generation',
    year: 2020,
  },

  // === Evaluation ===
  {
    doi: '10.18653/v1/2020.acl-main.442',
    title: 'Beyond Accuracy: Behavioral Testing of NLP Models with CheckList',
    category: 'Evaluation',
    year: 2020,
  },
  {
    doi: '10.18653/v1/2020.emnlp-main.448',
    title: 'BLEU: a Method for Automatic Evaluation of Machine Translation',
    category: 'Evaluation',
    year: 2020,
  },

  // === Reasoning ===
  {
    doi: '10.18653/v1/2022.naacl-main.264',
    title: 'Chain-of-Thought Prompting Elicits Reasoning in Large Language Models',
    category: 'Prompting',
    year: 2022,
  },

  // === Machine Learning Theory ===
  {
    doi: '10.1038/nature14539',
    title: 'Deep Learning (LeCun, Bengio, Hinton)',
    category: 'Deep Learning',
    year: 2015,
  },
  {
    doi: '10.1038/s41586-021-03819-2',
    title: 'Highly accurate protein structure prediction with AlphaFold',
    category: 'Science',
    year: 2021,
  },
  {
    doi: '10.1038/s41586-020-2649-2',
    title: 'Language models are few-shot learners (GPT-3)',
    category: 'Language Model',
    year: 2020,
  },

  // === Transformers & Attention ===
  {
    doi: '10.5555/3295222.3295349',
    title: 'Attention is All You Need',
    category: 'Transformer',
    year: 2017,
  },

  // === Safety & Alignment ===
  {
    doi: '10.18653/v1/2020.findings-emnlp.301',
    title: 'RealToxicityPrompts: Evaluating Neural Toxic Degeneration',
    category: 'Safety',
    year: 2020,
  },
  {
    doi: '10.18653/v1/2021.acl-long.330',
    title: 'Measuring Massive Multitask Language Understanding',
    category: 'Evaluation',
    year: 2021,
  },

  // === Efficient Training ===
  {
    doi: '10.18653/v1/2022.acl-long.244',
    title: 'LoRA: Low-Rank Adaptation of Large Language Models',
    category: 'Efficient Training',
    year: 2022,
  },

  // === Speech ===
  {
    doi: '10.21437/Interspeech.2021-1965',
    title: 'wav2vec 2.0: A Framework for Self-Supervised Learning of Speech Representations',
    category: 'Speech',
    year: 2021,
  },
];

/**
 * Search queries for discovering additional papers
 */
const SEARCH_QUERIES = [
  { query: 'large language model transformer', category: 'Language Model' },
  { query: 'retrieval augmented generation', category: 'RAG' },
  { query: 'reinforcement learning human feedback', category: 'RLHF' },
  { query: 'diffusion model image synthesis', category: 'Diffusion' },
  { query: 'chain of thought reasoning', category: 'Prompting' },
];

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║    YAGOKORO: Unpaywall GenAI Paper Ingestion Pipeline      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();

  if (EMAIL === 'research@example.com') {
    console.log('⚠️  警告: UNPAYWALL_EMAIL環境変数を設定してください');
    console.log('   例: export UNPAYWALL_EMAIL=your@email.com');
    console.log();
  }

  // Create processor
  const processor = new UnpaywallDocumentProcessor({
    email: EMAIL,
    outputDir: OUTPUT_DIR,
    timeout: 600000, // 10 minutes
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log(`📚 対象論文: ${GENAI_PAPERS.length} 件（ジャーナルDOI）`);
  console.log(`🔍 検索クエリ: ${SEARCH_QUERIES.length} 件`);
  console.log(`📁 出力先: ${OUTPUT_DIR}`);
  console.log(`📧 Unpaywall Email: ${EMAIL}`);
  console.log();
  console.log('ℹ️  注意: arXiv論文は別途 ingest-genai-papers.ts で取得済み');
  console.log('────────────────────────────────────────────────────────────');
  console.log('🚀 処理開始...');
  console.log();

  // Process DOI-specified papers
  const doiResults = await processor.processPapers(GENAI_PAPERS, {
    onProgress: (current, total, paper) => {
      console.log(`[${current}/${total}] 処理中: ${paper.title ?? paper.doi}`);
    },
    delayBetweenPapers: 3000, // 3 second delay
  });

  console.log();
  console.log('────────────────────────────────────────────────────────────');
  console.log('📊 DOI指定論文の結果:');
  console.log(`   ✅ 成功: ${doiResults.successful.length} 件`);
  console.log(`   ⏭️  スキップ: ${doiResults.skipped.length} 件 (非OA/PDF無し)`);
  console.log(`   ❌ 失敗: ${doiResults.failed.length} 件`);
  console.log(`   📦 チャンク: ${doiResults.totalChunks}`);
  console.log();

  // Show successful papers
  if (doiResults.successful.length > 0) {
    console.log('✅ 成功した論文:');
    for (const paper of doiResults.successful) {
      console.log(`   • ${paper.title} (${paper.chunks} chunks)`);
    }
    console.log();
  }

  // Show skipped papers
  if (doiResults.skipped.length > 0) {
    console.log('⏭️  スキップした論文:');
    for (const paper of doiResults.skipped) {
      console.log(`   • ${paper.title}: ${paper.reason}`);
    }
    console.log();
  }

  // Search and process additional papers
  console.log('────────────────────────────────────────────────────────────');
  console.log('🔍 タイトル検索による追加論文...');
  console.log();

  let searchResults = {
    successful: [] as typeof doiResults.successful,
    failed: [] as typeof doiResults.failed,
    skipped: [] as typeof doiResults.skipped,
    totalChunks: 0,
    totalCharacters: 0,
  };

  for (const search of SEARCH_QUERIES) {
    console.log(`検索: "${search.query}"`);
    try {
      const results = await processor.searchAndProcess(search.query, {
        category: search.category,
        maxResults: 5,
        isOa: true,
      });
      searchResults.successful.push(...results.successful);
      searchResults.failed.push(...results.failed);
      searchResults.skipped.push(...results.skipped);
      searchResults.totalChunks += results.totalChunks;
      searchResults.totalCharacters += results.totalCharacters;
      console.log(`   → ${results.successful.length} 件成功`);
    } catch (error) {
      console.error(`   ❌ 検索失敗: ${error}`);
    }
    // Wait between searches
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  console.log();
  console.log('════════════════════════════════════════════════════════════');
  console.log('📊 最終結果サマリー');
  console.log();

  const totalSuccessful = doiResults.successful.length + searchResults.successful.length;
  const totalSkipped = doiResults.skipped.length + searchResults.skipped.length;
  const totalFailed = doiResults.failed.length + searchResults.failed.length;
  const totalChunks = doiResults.totalChunks + searchResults.totalChunks;
  const totalChars = doiResults.totalCharacters + searchResults.totalCharacters;

  console.log(`✅ 成功: ${totalSuccessful} 件`);
  console.log(`⏭️  スキップ: ${totalSkipped} 件`);
  console.log(`❌ 失敗: ${totalFailed} 件`);
  console.log(`📦 総チャンク数: ${totalChunks}`);
  console.log(`📝 総文字数: ${totalChars.toLocaleString()}`);
  console.log();

  // Save summary
  const summary = {
    timestamp: new Date().toISOString(),
    email: EMAIL,
    doiPapers: {
      total: GENAI_PAPERS.length,
      successful: doiResults.successful.length,
      skipped: doiResults.skipped.length,
      failed: doiResults.failed.length,
      chunks: doiResults.totalChunks,
    },
    searchPapers: {
      queries: SEARCH_QUERIES.length,
      successful: searchResults.successful.length,
      skipped: searchResults.skipped.length,
      failed: searchResults.failed.length,
      chunks: searchResults.totalChunks,
    },
    totals: {
      papers: totalSuccessful,
      chunks: totalChunks,
      characters: totalChars,
    },
    successful: [...doiResults.successful, ...searchResults.successful],
    skipped: [...doiResults.skipped, ...searchResults.skipped],
    failed: [...doiResults.failed, ...searchResults.failed],
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
