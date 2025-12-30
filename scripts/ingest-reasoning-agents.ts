#!/usr/bin/env node
/**
 * Reasoning・Agents・Prompt Engineering 論文インジェストスクリプト
 *
 * トピック:
 * - 論理的思考能力（Reasoning）
 * - プロンプトエンジニアリング
 * - LLM同士の対話による課題解決
 * - エージェントの自律化
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

const OUTPUT_DIR = join(process.cwd(), 'data/chunks/reasoning-agents');

// 論文リスト: Reasoning, Prompt Engineering, Multi-Agent, Autonomous Agents
const PAPERS = {
  // === Reasoning ===
  reasoning: [
    { arxivId: '2201.11903', title: 'Chain-of-Thought Prompting Elicits Reasoning in Large Language Models', year: 2022 },
    { arxivId: '2203.11171', title: 'Self-Consistency Improves Chain of Thought Reasoning', year: 2022 },
    { arxivId: '2205.11916', title: 'Large Language Models are Zero-Shot Reasoners', year: 2022 },
    { arxivId: '2210.03493', title: 'Automatic Chain of Thought Prompting in Large Language Models', year: 2022 },
    { arxivId: '2305.10601', title: 'Tree of Thoughts: Deliberate Problem Solving with Large Language Models', year: 2023 },
    { arxivId: '2308.09687', title: 'Graph of Thoughts: Solving Elaborate Problems with Large Language Models', year: 2023 },
    { arxivId: '2309.03409', title: 'Cumulative Reasoning with Large Language Models', year: 2023 },
    { arxivId: '2305.20050', title: 'Skeleton-of-Thought: Large Language Models Can Do Parallel Decoding', year: 2023 },
    { arxivId: '2310.01798', title: 'Chain-of-Verification Reduces Hallucination in Large Language Models', year: 2023 },
    { arxivId: '2311.05232', title: 'Take a Step Back: Evoking Reasoning via Abstraction', year: 2023 },
    { arxivId: '2312.10997', title: 'Beyond A*: Better Planning with Transformers via Search Dynamics Bootstrapping', year: 2023 },
    { arxivId: '2401.04925', title: 'DeepSeekMath: Pushing the Limits of Mathematical Reasoning', year: 2024 },
    { arxivId: '2403.09629', title: 'Quiet-STaR: Language Models Can Teach Themselves to Think Before Speaking', year: 2024 },
    { arxivId: '2406.12442', title: 'From Decoding to Meta-Generation: Inference-time Algorithms for Large Language Models', year: 2024 },
    { arxivId: '2408.00724', title: 'Scaling LLM Test-Time Compute Optimally', year: 2024 },
  ],

  // === Prompt Engineering ===
  promptEngineering: [
    { arxivId: '2107.13586', title: 'Prompt Programming for Large Language Models: Beyond the Few-Shot Paradigm', year: 2021 },
    { arxivId: '2109.01652', title: 'Reframing Instructional Prompts to GPTk\'s Language', year: 2021 },
    { arxivId: '2202.12837', title: 'Black-box Prompt Learning for Pre-trained Language Models', year: 2022 },
    { arxivId: '2211.01910', title: 'Large Language Models Are Human-Level Prompt Engineers', year: 2022 },
    { arxivId: '2302.11382', title: 'A Prompt Pattern Catalog to Enhance Prompt Engineering with ChatGPT', year: 2023 },
    { arxivId: '2303.07839', title: 'Prompting GPT-3 To Be Reliable', year: 2023 },
    { arxivId: '2305.03495', title: 'Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning', year: 2023 },
    { arxivId: '2309.16797', title: 'PromptBench: Towards Evaluating the Robustness of Large Language Models on Adversarial Prompts', year: 2023 },
    { arxivId: '2310.04406', title: 'DSPy: Compiling Declarative Language Model Calls into Self-Improving Pipelines', year: 2023 },
    { arxivId: '2311.16452', title: 'Principled Instructions Are All You Need for Questioning LLaMA-1/2, GPT-3.5/4', year: 2023 },
    { arxivId: '2402.07927', title: 'The Unreasonable Effectiveness of Eccentric Automatic Prompts', year: 2024 },
    { arxivId: '2406.06608', title: 'Prompt Engineering a Prompt Engineer', year: 2024 },
  ],

  // === Multi-Agent Dialogue / Collaboration ===
  multiAgent: [
    { arxivId: '2304.03442', title: 'Generative Agents: Interactive Simulacra of Human Behavior', year: 2023 },
    { arxivId: '2305.14325', title: 'Improving Factuality and Reasoning in Language Models through Multiagent Debate', year: 2023 },
    { arxivId: '2305.19118', title: 'Encouraging Divergent Thinking in Large Language Models through Multi-Agent Debate', year: 2023 },
    { arxivId: '2307.07924', title: 'Communicative Agents for Software Development', year: 2023 },  // ChatDev
    { arxivId: '2308.00352', title: 'MetaGPT: Meta Programming for A Multi-Agent Collaborative Framework', year: 2023 },
    { arxivId: '2308.08155', title: 'AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation', year: 2023 },
    { arxivId: '2309.07864', title: 'MindAgent: Emergent Gaming Interaction', year: 2023 },
    { arxivId: '2310.02124', title: 'Agents: An Open-source Framework for Autonomous Language Agents', year: 2023 },
    { arxivId: '2311.08649', title: 'War and Peace (WarAgent): Large Language Model-based Multi-Agent Simulation of World Wars', year: 2023 },
    { arxivId: '2312.17025', title: 'The Impact of Reasoning Step Length on Large Language Models', year: 2023 },
    { arxivId: '2402.05120', title: 'AgentLite: A Lightweight Library for Building and Advancing Task-Oriented LLM Agent System', year: 2024 },
    { arxivId: '2402.18679', title: 'More Agents Is All You Need', year: 2024 },
    { arxivId: '2403.02502', title: 'Scaling Instructable Agents Across Many Simulated Worlds', year: 2024 },
    { arxivId: '2406.04692', title: 'MACRPO: Multi-Agent Reinforcement Learning with Cooperative Policy Optimization', year: 2024 },
  ],

  // === Autonomous Agents ===
  autonomousAgents: [
    { arxivId: '2210.03629', title: 'ReAct: Synergizing Reasoning and Acting in Language Models', year: 2022 },
    { arxivId: '2302.04761', title: 'Toolformer: Language Models Can Teach Themselves to Use Tools', year: 2023 },
    { arxivId: '2303.11366', title: 'Reflexion: Language Agents with Verbal Reinforcement Learning', year: 2023 },
    { arxivId: '2303.17580', title: 'HuggingGPT: Solving AI Tasks with ChatGPT and its Friends', year: 2023 },
    { arxivId: '2303.17760', title: 'Self-Refine: Iterative Refinement with Self-Feedback', year: 2023 },
    { arxivId: '2304.08354', title: 'LLM+P: Empowering Large Language Models with Optimal Planning Proficiency', year: 2023 },
    { arxivId: '2305.16291', title: 'Voyager: An Open-Ended Embodied Agent with Large Language Models', year: 2023 },
    { arxivId: '2305.16334', title: 'CRITIC: Large Language Models Can Self-Correct with Tool-Interactive Critiquing', year: 2023 },
    { arxivId: '2307.13854', title: 'ToolLLM: Facilitating Large Language Models to Master 16000+ Real-world APIs', year: 2023 },
    { arxivId: '2308.11432', title: 'A Survey on Large Language Model based Autonomous Agents', year: 2023 },
    { arxivId: '2309.07870', title: 'Cognitive Architectures for Language Agents', year: 2023 },
    { arxivId: '2310.04363', title: 'Lemur: Harmonizing Natural Language and Code for Language Agents', year: 2023 },
    { arxivId: '2310.12931', title: 'OpenAgents: An Open Platform for Language Agents in the Wild', year: 2023 },
    { arxivId: '2312.06585', title: 'WizardCoder: Empowering Code Large Language Models with Evol-Instruct', year: 2023 },
    { arxivId: '2401.13178', title: 'AgentBoard: An Analytical Evaluation Board of Multi-turn LLM Agents', year: 2024 },
    { arxivId: '2402.02716', title: 'OS-Copilot: Towards Generalist Computer Agents with Self-Improvement', year: 2024 },
    { arxivId: '2403.03186', title: 'Design2Code: How Far Are We From Automating Front-End Engineering?', year: 2024 },
    { arxivId: '2403.13313', title: 'SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering', year: 2024 },
    { arxivId: '2404.11018', title: 'AutoCodeRover: Autonomous Program Improvement', year: 2024 },
    { arxivId: '2405.15793', title: 'Gaia: A Benchmark for General AI Assistants', year: 2024 },
    { arxivId: '2407.01502', title: 'Agentless: Demystifying LLM-based Software Engineering Agents', year: 2024 },
  ],
};

interface ProcessResult {
  arxivId: string;
  title: string;
  status: 'success' | 'failed' | 'skipped';
  chunks?: number;
  error?: string;
}

async function fetchArxivPaper(arxivId: string): Promise<{ abstract: string; authors: string[]; title: string; published: string } | null> {
  const url = `https://export.arxiv.org/api/query?id_list=${arxivId}`;
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    // XMLパース（簡易版）
    const abstractMatch = text.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
    const titleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/g);
    const authorMatches = text.matchAll(/<author[^>]*>[\s\S]*?<name[^>]*>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g);
    const publishedMatch = text.match(/<published[^>]*>([\s\S]*?)<\/published>/);
    
    const abstract = abstractMatch ? abstractMatch[1]!.trim().replace(/\s+/g, ' ') : '';
    const title = titleMatch && titleMatch[1] ? titleMatch[1].replace(/<\/?title[^>]*>/g, '').trim() : '';
    const authors: string[] = [];
    for (const match of authorMatches) {
      authors.push(match[1]!.trim());
    }
    const published = publishedMatch ? publishedMatch[1]!.trim() : '';
    
    return { abstract, authors, title, published };
  } catch (e) {
    console.error(`   ❌ arXiv API error for ${arxivId}: ${(e as Error).message}`);
    return null;
  }
}

async function downloadAndProcessPaper(
  arxivId: string,
  title: string,
  category: string
): Promise<ProcessResult> {
  const outputPath = join(OUTPUT_DIR, `${arxivId.replace('.', '_')}.json`);
  
  // 既存チェック（全ディレクトリ）
  const existingDirs = [
    'data/chunks',
    'data/chunks/techniques',
    'data/chunks/techniques-2',
    'data/chunks/unpaywall',
    'data/chunks/reasoning-agents',
  ];
  
  for (const dir of existingDirs) {
    const checkPath = join(process.cwd(), dir, `${arxivId.replace('.', '_')}.json`);
    if (existsSync(checkPath)) {
      return { arxivId, title, status: 'skipped' };
    }
  }
  
  try {
    // arXiv APIから情報取得
    const arxivData = await fetchArxivPaper(arxivId);
    if (!arxivData || !arxivData.abstract) {
      return { arxivId, title, status: 'failed', error: 'Failed to fetch from arXiv' };
    }
    
    // チャンク生成（アブストラクトベース）
    const chunks = [
      {
        id: `${arxivId}-abstract`,
        content: `Title: ${arxivData.title || title}\n\nAbstract: ${arxivData.abstract}`,
        type: 'abstract',
      },
    ];
    
    // 保存
    const paperData = {
      arxivId,
      title: arxivData.title || title,
      authors: arxivData.authors,
      abstract: arxivData.abstract,
      published: arxivData.published,
      year: parseInt(arxivData.published?.slice(0, 4) || '2023', 10),
      category,
      chunks,
      fullText: null,  // PDFから抽出する場合はここに追加
    };
    
    await writeFile(outputPath, JSON.stringify(paperData, null, 2));
    
    return { arxivId, title, status: 'success', chunks: chunks.length };
  } catch (e) {
    return { arxivId, title, status: 'failed', error: (e as Error).message };
  }
}

async function main() {
  console.log('🧠 Reasoning・Agents・Prompt Engineering 論文インジェスト\n');
  console.log('━'.repeat(60));
  
  // 出力ディレクトリ作成
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }
  
  const results: ProcessResult[] = [];
  const categories = Object.entries(PAPERS);
  
  let totalPapers = 0;
  for (const [, papers] of categories) {
    totalPapers += papers.length;
  }
  
  console.log(`\n📚 論文総数: ${totalPapers} 件`);
  console.log('   • Reasoning: ' + PAPERS.reasoning.length + '件');
  console.log('   • Prompt Engineering: ' + PAPERS.promptEngineering.length + '件');
  console.log('   • Multi-Agent: ' + PAPERS.multiAgent.length + '件');
  console.log('   • Autonomous Agents: ' + PAPERS.autonomousAgents.length + '件\n');
  
  for (const [categoryKey, papers] of categories) {
    const categoryName = {
      reasoning: '📊 Reasoning（論理的思考）',
      promptEngineering: '📝 Prompt Engineering',
      multiAgent: '🤝 Multi-Agent Dialogue',
      autonomousAgents: '🤖 Autonomous Agents',
    }[categoryKey] || categoryKey;
    
    console.log(`\n${categoryName} (${papers.length}件)`);
    console.log('─'.repeat(50));
    
    for (const paper of papers) {
      process.stdout.write(`   [${paper.arxivId}] ${paper.title.slice(0, 40)}... `);
      
      const result = await downloadAndProcessPaper(paper.arxivId, paper.title, categoryKey);
      results.push(result);
      
      if (result.status === 'success') {
        console.log('✅');
      } else if (result.status === 'skipped') {
        console.log('⏭️ (既存)');
      } else {
        console.log(`❌ ${result.error}`);
      }
      
      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // 結果サマリー
  const success = results.filter(r => r.status === 'success').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const failed = results.filter(r => r.status === 'failed').length;
  
  console.log('\n' + '━'.repeat(60));
  console.log('📊 結果サマリー');
  console.log(`   ✅ 成功: ${success}件`);
  console.log(`   ⏭️  スキップ: ${skipped}件（既存）`);
  console.log(`   ❌ 失敗: ${failed}件`);
  
  if (failed > 0) {
    console.log('\n❌ 失敗した論文:');
    for (const r of results.filter(r => r.status === 'failed')) {
      console.log(`   • ${r.arxivId}: ${r.title} - ${r.error}`);
    }
  }
  
  // 結果を保存
  const resultsPath = join(OUTPUT_DIR, '_ingest-results.json');
  await writeFile(resultsPath, JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));
  
  console.log(`\n✅ 完了! 結果は ${resultsPath} に保存`);
}

main().catch(console.error);
