/**
 * arXiv LLM Advances - December 2025
 * LLMの発展と新しい手法に関する最新論文
 * Source: arXiv cs.CL, cs.LG December 22-29, 2025
 */

import neo4j from 'neo4j-driver';

// Neo4j接続
const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password')
);

// Entity types
type EntityType = 'AIModel' | 'Organization' | 'Technique' | 'Benchmark' | 'Publication' | 'Concept' | 'Person';

interface Entity {
  id: string;
  type: EntityType;
  name: string;
  description: string;
  metadata?: string;
}

interface Relation {
  source: string;
  target: string;
  type: string;
  properties?: Record<string, unknown>;
}

// =====================
// LLM Advances Entities
// =====================

const entities: Entity[] = [
  // === Techniques - LLM Training & Reasoning ===
  {
    id: 'em-reasoning',
    type: 'Technique',
    name: 'EM Reasoning (Expectation Maximization for LLMs)',
    description: 'Formalizes reasoning as a latent variable model using expectation-maximization. Connects EM with reward-based optimization. Includes sampling schemes: rejection sampling, STaR (Self-Taught Reasoner), and PPS (Prompt Posterior Sampling).',
    metadata: 'arXiv:2512.20169, December 2025, Llama/Qwen models on ARC/MMLU/OpenBookQA'
  },
  {
    id: 'retroprompt',
    type: 'Technique',
    name: 'RetroPrompt',
    description: 'Retrieval-augmented prompt learning that balances memorization and generalization by decoupling knowledge from mere memorization. Leverages knowledge base from training data with retrieval mechanism throughout input, training, and inference stages.',
    metadata: 'arXiv:2512.20145, IEEE/ACM TASLP 2025, pre-trained foundation models'
  },
  {
    id: 'kl-guided-distillation',
    type: 'Technique',
    name: 'KL-Guided Layer Selection for Hybrid Attention',
    description: 'Distilling pretrained softmax attention Transformers into hybrid architectures with linear attention. Uses layer importance scores from KL divergence training. RADLADS pipeline: attention weight transfer, hidden state alignment, KL distribution matching.',
    metadata: 'arXiv:2512.20569, December 2025, MIT/IBM Research'
  },
  {
    id: 'samerging',
    type: 'Technique',
    name: 'SAMerging',
    description: 'Model merging via multi-teacher knowledge distillation using Sharpness-Aware Minimization (SAM). Establishes flatness-aware PAC-Bayes generalization bound for model merging. Introduces cross-task heterogeneity term for fine-tuned model priors.',
    metadata: 'arXiv:2512.21288, December 2025, Penn State University'
  },
  {
    id: 'reasoning-distillation-tracing',
    type: 'Technique',
    name: 'Reasoning Distillation Provenance Tracing',
    description: 'Cross-model framework tracing origins of distilled model capabilities. Compares predictive probabilities from teacher, student, and distilled models. Proposes teacher-guided data selection based on teacher-student divergences.',
    metadata: 'arXiv:2512.20908, December 2025, Alibaba DAMO Academy'
  },
  {
    id: 'jepa-reasoner',
    type: 'Technique',
    name: 'JEPA-Reasoner',
    description: 'JEPA-based architecture for latent reasoning that decouples latent-space reasoning from token generation. Uses separate Talker model for text reconstruction. Enables multi-threaded reasoning with superior robustness against compounding errors.',
    metadata: 'arXiv:2512.19171, December 2025, Carnegie Mellon University'
  },
  {
    id: 'syntactic-attention-pruning',
    type: 'Technique',
    name: 'SAP (Syntactic Attention Pruning)',
    description: 'Novel attention head pruning method incorporating syntactic structure and attention patterns. Uses Candidate Filtering (CF) mechanism prioritizing heads by performance contribution. Retrain-free pruning for all transformer-based models.',
    metadata: 'arXiv:2512.19125, December 2025, Academia Sinica'
  },
  {
    id: 'abbel',
    type: 'Technique',
    name: 'ABBEL (Acting through Belief Bottlenecks Expressed in Language)',
    description: 'Framework for LLM agents maintaining concise contexts through multi-step interaction. Replaces long interaction history with natural language belief states. RL post-training with belief grading and length penalties.',
    metadata: 'arXiv:2512.20111, December 2025, UC Berkeley/Google DeepMind'
  },
  {
    id: 'memory-t1',
    type: 'Technique',
    name: 'Memory-T1',
    description: 'Reinforcement learning framework for temporal reasoning in multi-session agents. Coarse-to-fine strategy with temporal and relevance filters. Multi-level reward: answer accuracy, evidence grounding, temporal consistency (session and utterance level).',
    metadata: 'arXiv:2512.20092, December 2025, Time-Dialog benchmark SOTA'
  },
  
  // === Techniques - Efficiency & Architecture ===
  {
    id: 'small-lm-tradeoffs',
    type: 'Technique',
    name: 'Small LM Architectural Trade-offs',
    description: 'Systematic study of small language models under compute constraints. Analyzes nonlinearities, self-attention, multi-layer architectures. Finds attention-based models dominate MLPs in per-FLOP efficiency. RoPE may not transfer to small-model regimes.',
    metadata: 'arXiv:2512.20877, December 2025, Penn Treebank/WikiText-2'
  },
  {
    id: 'nncase-compiler',
    type: 'Technique',
    name: 'nncase LLM Compiler',
    description: 'End-to-end compilation framework for LLM deployment on heterogeneous storage architectures. E-graph-based term rewriting for phase ordering. Modules: Auto Vectorize, Auto Distribution, Auto Schedule. Buffer-aware Codegen phase.',
    metadata: 'arXiv:2512.21571, December 2025, Kendryte/Canaan Inc., Qwen3 series'
  },
  {
    id: 'model-editing-unlearning',
    type: 'Technique',
    name: 'Model Editing for Unlearning',
    description: 'Explores ROME, IKE, and WISE editing algorithms for machine unlearning in LLMs. Designs new editing targets for unlearning settings. Addresses scope of unlearning without damaging overall model performance.',
    metadata: 'arXiv:2512.20794, December 2025, MIT CSAIL'
  },
  
  // === Concepts - Hallucination & Evaluation ===
  {
    id: 'unified-hallucination-definition',
    type: 'Concept',
    name: 'Unified Hallucination Definition (World Model)',
    description: 'Defines hallucination as inaccurate internal world modeling observable to user. Different definitions focus on varying reference world models and knowledge conflict policies. Plans family of benchmarks with synthetic but fully specified world models.',
    metadata: 'arXiv:2512.21577, December 2025, Google/Stanford/CMU'
  },
  {
    id: 'faithlens',
    type: 'Technique',
    name: 'FaithLens',
    description: 'Framework for detecting and explaining faithfulness hallucination in LLM outputs. Identifies mismatches between generated content and source documents. Provides explanations for detected hallucinations.',
    metadata: 'arXiv:2512.20182, December 2025'
  },
  
  // === Publications ===
  {
    id: 'pub-em-reasoning',
    type: 'Publication',
    name: 'Learning to Reason in LLMs by Expectation Maximization',
    description: 'Formalizes reasoning as latent variable model using EM. Compares sampling schemes: rejection sampling, STaR, PPS. Shows PPS outperforms others on ARC, MMLU, OpenBookQA with Llama and Qwen models.',
    metadata: 'arXiv:2512.20169, December 2025'
  },
  {
    id: 'pub-retroprompt',
    type: 'Publication',
    name: 'Retrieval-augmented Prompt Learning for Pre-trained Foundation Models',
    description: 'RetroPrompt balances memorization and generalization with retrieval throughout learning stages. Shows superior zero-shot and few-shot performance on NLP and CV tasks.',
    metadata: 'arXiv:2512.20145, IEEE/ACM TASLP 2025'
  },
  {
    id: 'pub-kl-layer-selection',
    type: 'Publication',
    name: 'Distilling to Hybrid Attention Models via KL-Guided Layer Selection',
    description: 'Simple recipe for layer selection using layer importance scores from generic text training. More effective than uniform interleaving and specialized diagnostic datasets.',
    metadata: 'arXiv:2512.20569, December 2025'
  },
  {
    id: 'pub-samerging',
    type: 'Publication',
    name: 'Model Merging via Multi-Teacher Knowledge Distillation',
    description: 'Establishes PAC-Bayes generalization bound for model merging. Frames merging as multi-teacher KD. SAMerging achieves SOTA on vision and NLP benchmarks.',
    metadata: 'arXiv:2512.21288, December 2025'
  },
  {
    id: 'pub-reasoning-provenance',
    type: 'Publication',
    name: 'Where Did This Sentence Come From? Tracing Provenance in LLM Reasoning Distillation',
    description: 'Introduces Reasoning Distillation Provenance Tracing framework. Classifies actions into categories by comparing teacher-student probabilities. Proposes teacher-guided data selection.',
    metadata: 'arXiv:2512.20908, December 2025'
  },
  {
    id: 'pub-jepa-reasoner',
    type: 'Publication',
    name: 'JEPA-Reasoner: Decoupling Latent Reasoning from Token Generation',
    description: 'JEPA-based architecture with separate Talker model for text reconstruction. Enables multi-threaded reasoning. Superior robustness against compounding errors.',
    metadata: 'arXiv:2512.19171, December 2025'
  },
  {
    id: 'pub-sap',
    type: 'Publication',
    name: 'SAP: Syntactic Attention Pruning for Transformer-based Language Models',
    description: 'Incorporates syntactic structure and attention patterns for pruning. Candidate Filtering prioritizes heads by contribution. Retrain-free settings outperform existing strategies.',
    metadata: 'arXiv:2512.19125, December 2025'
  },
  {
    id: 'pub-abbel',
    type: 'Publication',
    name: 'ABBEL: LLM Agents Acting through Belief Bottlenecks Expressed in Language',
    description: 'Framework for concise context maintenance in multi-step LLM agents. RL training improves ABBEL beyond full context setting with less memory.',
    metadata: 'arXiv:2512.20111, December 2025'
  },
  {
    id: 'pub-memory-t1',
    type: 'Publication',
    name: 'Memory-T1: Reinforcement Learning for Temporal Reasoning in Multi-session Agents',
    description: 'Time-aware memory selection via RL with multi-level reward. Achieves 67.0% on Time-Dialog, SOTA for open-source 7B models. Robust up to 128k tokens.',
    metadata: 'arXiv:2512.20092, December 2025'
  },
  {
    id: 'pub-small-lm',
    type: 'Publication',
    name: 'Architectural Trade-offs in Small Language Models Under Compute Constraints',
    description: 'Systematic empirical study of small LMs. Analyzes attention vs MLP, depth vs context, RoPE effects. Shows attention dominates in per-FLOP efficiency.',
    metadata: 'arXiv:2512.20877, December 2025'
  },
  {
    id: 'pub-nncase',
    type: 'Publication',
    name: 'nncase: An End-to-End Compiler for Efficient LLM Deployment',
    description: 'E-graph-based compilation framework. Auto Vectorize, Distribution, Schedule modules. Outperforms MLC LLM, Intel IPEX on Qwen3 models.',
    metadata: 'arXiv:2512.21571, December 2025'
  },
  {
    id: 'pub-model-editing',
    type: 'Publication',
    name: 'Investigating Model Editing for Unlearning in Large Language Models',
    description: 'Explores ROME, IKE, WISE for unlearning. Designs new editing targets. Shows editing can exceed baseline unlearning methods.',
    metadata: 'arXiv:2512.20794, December 2025'
  },
  {
    id: 'pub-hallucination',
    type: 'Publication',
    name: 'A Unified Definition of Hallucination, Or: It\'s the World Model, Stupid',
    description: 'Defines hallucination as inaccurate world modeling. Varies reference world model and knowledge conflict policy. Plans synthetic world model benchmarks.',
    metadata: 'arXiv:2512.21577, December 2025'
  },
  
  // === Benchmarks ===
  {
    id: 'time-dialog',
    type: 'Benchmark',
    name: 'Time-Dialog',
    description: 'Benchmark for temporal reasoning over multi-session dialogues. Tests chronological proximity and fidelity. Memory-T1 achieves 67.0% SOTA.',
    metadata: 'Multi-session dialogue temporal reasoning benchmark'
  },
  {
    id: 'openbookqa',
    type: 'Benchmark',
    name: 'OpenBookQA',
    description: 'Question answering dataset requiring multi-step reasoning with common sense knowledge. Used for evaluating LLM reasoning with EM methods.',
    metadata: 'Science reasoning QA benchmark'
  },
  
  // === Organizations ===
  {
    id: 'alibaba-damo',
    type: 'Organization',
    name: 'Alibaba DAMO Academy',
    description: 'Alibaba\'s research division focusing on cutting-edge AI technologies. Developed Qwen series models and reasoning distillation provenance tracing.',
    metadata: 'Chinese AI research lab, Qwen models'
  },
  {
    id: 'kendryte',
    type: 'Organization',
    name: 'Kendryte (Canaan Inc.)',
    description: 'Developer of nncase compiler framework for efficient LLM deployment on heterogeneous storage architectures.',
    metadata: 'AI chip and compiler company'
  },
  {
    id: 'academia-sinica',
    type: 'Organization',
    name: 'Academia Sinica',
    description: 'Taiwan\'s national academy and leading research institution. Developed SAP (Syntactic Attention Pruning) method.',
    metadata: 'Taiwan national research institution'
  },
  
  // === Persons ===
  {
    id: 'yoon-kim',
    type: 'Person',
    name: 'Yoon Kim',
    description: 'Professor at MIT. Co-authored KL-Guided Layer Selection for hybrid attention models. Expert in neural language models and efficient architectures.',
    metadata: 'MIT CSAIL, NLP research'
  },
  {
    id: 'david-woodruff',
    type: 'Person',
    name: 'David P. Woodruff',
    description: 'Professor at Carnegie Mellon University. Co-authored JEPA-Reasoner. Expert in algorithms and machine learning theory.',
    metadata: 'CMU, Theoretical CS'
  }
];

// =====================
// Relations
// =====================

const relations: Relation[] = [
  // Publications -> Techniques
  { source: 'pub-em-reasoning', target: 'em-reasoning', type: 'INTRODUCES' },
  { source: 'pub-retroprompt', target: 'retroprompt', type: 'INTRODUCES' },
  { source: 'pub-kl-layer-selection', target: 'kl-guided-distillation', type: 'INTRODUCES' },
  { source: 'pub-samerging', target: 'samerging', type: 'INTRODUCES' },
  { source: 'pub-reasoning-provenance', target: 'reasoning-distillation-tracing', type: 'INTRODUCES' },
  { source: 'pub-jepa-reasoner', target: 'jepa-reasoner', type: 'INTRODUCES' },
  { source: 'pub-sap', target: 'syntactic-attention-pruning', type: 'INTRODUCES' },
  { source: 'pub-abbel', target: 'abbel', type: 'INTRODUCES' },
  { source: 'pub-memory-t1', target: 'memory-t1', type: 'INTRODUCES' },
  { source: 'pub-small-lm', target: 'small-lm-tradeoffs', type: 'INTRODUCES' },
  { source: 'pub-nncase', target: 'nncase-compiler', type: 'INTRODUCES' },
  { source: 'pub-model-editing', target: 'model-editing-unlearning', type: 'INTRODUCES' },
  { source: 'pub-hallucination', target: 'unified-hallucination-definition', type: 'INTRODUCES' },
  
  // Organizations -> Publications
  { source: 'alibaba-damo', target: 'pub-reasoning-provenance', type: 'PUBLISHED' },
  { source: 'kendryte', target: 'pub-nncase', type: 'PUBLISHED' },
  { source: 'academia-sinica', target: 'pub-sap', type: 'PUBLISHED' },
  
  // Persons -> Publications
  { source: 'yoon-kim', target: 'pub-kl-layer-selection', type: 'AUTHORED' },
  { source: 'david-woodruff', target: 'pub-jepa-reasoner', type: 'AUTHORED' },
  
  // Techniques -> Benchmarks
  { source: 'memory-t1', target: 'time-dialog', type: 'EVALUATED_ON' },
  { source: 'em-reasoning', target: 'openbookqa', type: 'EVALUATED_ON' },
  
  // Technique Relations
  { source: 'samerging', target: 'kl-guided-distillation', type: 'RELATED_TO' },
  { source: 'reasoning-distillation-tracing', target: 'kl-guided-distillation', type: 'RELATED_TO' },
  { source: 'abbel', target: 'memory-t1', type: 'RELATED_TO' },
  { source: 'syntactic-attention-pruning', target: 'small-lm-tradeoffs', type: 'RELATED_TO' },
  { source: 'jepa-reasoner', target: 'em-reasoning', type: 'RELATED_TO' },
  
  // Concept Relations
  { source: 'faithlens', target: 'unified-hallucination-definition', type: 'ADDRESSES' },
  { source: 'retroprompt', target: 'unified-hallucination-definition', type: 'MITIGATES' }
];

// =====================
// Ingestion Functions
// =====================

async function ingestEntities(session: neo4j.Session): Promise<void> {
  console.log(`\n📦 Ingesting ${entities.length} entities...`);
  
  for (const entity of entities) {
    await session.run(
      `
      MERGE (e:Entity {id: $id})
      SET e.type = $type,
          e.name = $name,
          e.description = $description,
          e.metadata = $metadata,
          e.updatedAt = datetime()
      `,
      {
        id: entity.id,
        type: entity.type,
        name: entity.name,
        description: entity.description,
        metadata: entity.metadata || ''
      }
    );
    console.log(`  ✓ ${entity.type}: ${entity.name}`);
  }
}

async function ingestRelations(session: neo4j.Session): Promise<void> {
  console.log(`\n🔗 Ingesting ${relations.length} relations...`);
  
  for (const rel of relations) {
    await session.run(
      `
      MATCH (source:Entity {id: $source})
      MATCH (target:Entity {id: $target})
      MERGE (source)-[r:${rel.type}]->(target)
      SET r.updatedAt = datetime()
      `,
      {
        source: rel.source,
        target: rel.target
      }
    );
    console.log(`  ✓ ${rel.source} -[${rel.type}]-> ${rel.target}`);
  }
}

async function printStats(session: neo4j.Session): Promise<void> {
  console.log('\n📊 Database Statistics:');
  
  const entityResult = await session.run(`
    MATCH (e:Entity)
    RETURN e.type as type, count(*) as count
    ORDER BY count DESC
  `);
  
  for (const record of entityResult.records) {
    console.log(`  ${record.get('type')}: ${record.get('count')}`);
  }
  
  const relResult = await session.run(`
    MATCH ()-[r]->()
    RETURN type(r) as type, count(*) as count
    ORDER BY count DESC
    LIMIT 10
  `);
  
  console.log('\n📊 Top Relation Types:');
  for (const record of relResult.records) {
    console.log(`  ${record.get('type')}: ${record.get('count')}`);
  }
}

// =====================
// Main
// =====================

async function main(): Promise<void> {
  console.log('🚀 arXiv LLM Advances - December 2025');
  console.log('=====================================');
  
  const session = driver.session();
  
  try {
    await ingestEntities(session);
    await ingestRelations(session);
    await printStats(session);
    
    console.log('\n✅ Ingestion complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch(console.error);
