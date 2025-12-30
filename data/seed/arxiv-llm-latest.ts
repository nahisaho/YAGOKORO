/**
 * arXiv LLM Latest Papers - December 29, 2025
 * Latest research on LLM training, reasoning, efficiency, and architecture
 */

import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

const ENTITY_LABEL = 'Entity';
const RELATION_TYPE = 'RELATES_TO';

interface Entity {
  id: string;
  name: string;
  type: string;
  description: string;
  metadata: string;
}

interface Relation {
  sourceId: string;
  targetId: string;
  type: string;
  description: string;
}

// ============================================================================
// New Entities - LLM Latest Research (December 2025)
// ============================================================================

const entities: Entity[] = [
  // === Techniques ===
  {
    id: 'tech-kl-estimators-rl',
    name: 'KL Estimator Analysis for RL Training',
    type: 'Technique',
    description: 'Systematic analysis of KL divergence estimators in reinforcement learning training of LLMs. Studies how different KL estimator configurations affect gradient bias and training stability, showing that unbiased gradient configurations lead to better in-domain and out-of-domain performance.',
    metadata: 'arXiv:2512.21852, December 2025, On-policy/Off-policy RL, Qwen2.5-7B, Llama-3.1-8B experiments'
  },
  {
    id: 'tech-coconut-analysis',
    name: 'COCONUT Analysis (Chain-of-Continuous-Thought)',
    type: 'Technique',
    description: 'Critical analysis of latent token reasoning in LLMs. Reveals that COCONUT latent tokens function as uninterpretable placeholders rather than encoding faithful reasoning, promoting shortcut usage over genuine reasoning. Identifies COCONUT as a pseudo-reasoning mechanism.',
    metadata: 'arXiv:2512.21711, December 2025, Steering experiments, MMLU, HotpotQA'
  },
  {
    id: 'tech-1bit-ptq-output-alignment',
    name: '1-bit PTQ Output Alignment',
    type: 'Technique',
    description: 'Novel data-aware post-training quantization approach for 1-bit LLMs that explicitly accounts for activation error accumulation. Investigates why output-matching fails in extreme quantization and proposes solutions that outperform existing 1-bit PTQ methods.',
    metadata: 'arXiv:2512.21651, December 2025, ±1 weight quantization, Error accumulation analysis'
  },
  {
    id: 'tech-semiparametric-po',
    name: 'Semiparametric Preference Optimization',
    type: 'Technique',
    description: 'Policy alignment method under unknown and unrestricted link functions between preferences and rewards. Treats LLM as single-index model, developing policy learners via profiling, orthogonalization, and link-agnostic bipartite ranking objectives.',
    metadata: 'arXiv:2512.21917, December 2025, f-divergence constraints, Robust to unknown noise distribution'
  },
  {
    id: 'tech-dultra',
    name: 'dUltra (Ultra-Fast Diffusion LLMs)',
    type: 'Technique',
    description: 'On-policy reinforcement learning framework based on GRPO for efficient parallel decoding in masked diffusion language models. Introduces unmasking planner head with per-token Bernoulli distributions, achieving diffusion supremacy over autoregressive models.',
    metadata: 'arXiv:2512.21446, December 2025, GRPO, Math reasoning, Code generation'
  },
  {
    id: 'tech-a3po',
    name: 'A3PO (Adaptive Asymmetric Advantage Policy Optimization)',
    type: 'Technique',
    description: 'Token-level advantage shaping method for RLVR training. Investigates how positive and negative sample polarities affect training: positive samples sharpen correct patterns while negative samples encourage exploration. Precisely allocates advantage signals to key tokens.',
    metadata: 'arXiv:2512.21625, December 2025, Large Reasoning Models (LRMs), 5 reasoning benchmarks'
  },
  {
    id: 'tech-parallel-token-prediction',
    name: 'Parallel Token Prediction (PTP)',
    type: 'Technique',
    description: 'Universal framework for parallel sequence generation that jointly predicts multiple dependent tokens in single transformer call. Incorporates sampling procedure into model, proving it can represent arbitrary autoregressive distributions. Achieves 4+ tokens per step on Vicuna-7B.',
    metadata: 'arXiv:2512.21323, December 2025, Speculative decoding, Spec-Bench SOTA'
  },
  {
    id: 'tech-sparse-speculative-verification',
    name: 'Sparse Speculative Verification',
    type: 'Technique',
    description: 'Framework that jointly sparsifies attention, FFN, and MoE components during speculative decoding verification stage. Incorporates inter-draft token and inter-layer retrieval reuse strategy without additional training.',
    metadata: 'arXiv:2512.21911, December 2025, Long-context, MoE models, Summarization/QA/Math'
  },
  {
    id: 'tech-transformer-scaling-ode',
    name: 'Transformer Scaling Law ODE Framework',
    type: 'Technique',
    description: 'Theoretical framework formalizing transformer learning dynamics as ODE system with kernel approximation. Establishes phase transition in excess risk: exponential decay initially, then power-law decay Θ(C^{-1/6}) after threshold.',
    metadata: 'arXiv:2512.22088, December 2025, SGD analysis, Multi-layer transformers'
  },
  
  // === Publications ===
  {
    id: 'pub-kl-comedy-estimators',
    name: 'A Comedy of Estimators: On KL Regularization in RL Training of LLMs',
    type: 'Publication',
    description: 'Systematic study analyzing how KL estimator configurations affect RL training of LLMs. Shows prevailing practices do not provide correct gradients, and unbiased gradient configurations lead to better performance and training stability.',
    metadata: 'arXiv:2512.21852, December 2025, Vedant Shah, Johan Obando-Ceron, et al.'
  },
  {
    id: 'pub-latent-tokens-think',
    name: 'Do Latent Tokens Think? A Causal and Adversarial Analysis of Chain-of-Continuous-Thought',
    type: 'Publication',
    description: 'Critical examination of COCONUT latent reasoning through steering and shortcut experiments. Reveals latent tokens lack reasoning-critical information and consistently exploit dataset artifacts.',
    metadata: 'arXiv:2512.21711, December 2025, Yuyi Zhang, Boyu Tang, et al.'
  },
  {
    id: 'pub-1bit-output-alignment',
    name: 'Rethinking Output Alignment For 1-bit Post-Training Quantization of Large Language Models',
    type: 'Publication',
    description: 'Investigation of why output-matching fails in 1-bit LLM quantization. Proposes data-aware PTQ approach accounting for activation error accumulation.',
    metadata: 'arXiv:2512.21651, December 2025, Dung Anh Hoang, Cuong Pham, et al.'
  },
  {
    id: 'pub-semiparametric-po',
    name: 'Semiparametric Preference Optimization: Your Language Model is Secretly a Single-Index Model',
    type: 'Publication',
    description: 'Novel perspective treating LLM preference optimization as semiparametric single-index model. Develops robust policy learners without assuming known link functions.',
    metadata: 'arXiv:2512.21917, December 2025, Nathan Kallus'
  },
  {
    id: 'pub-dultra',
    name: 'dUltra: Ultra-Fast Diffusion Language Models via Reinforcement Learning',
    type: 'Publication',
    description: 'On-policy RL framework for accelerating masked diffusion LLMs. Jointly optimizes base model and unmasking planner using verifiable and distillation rewards.',
    metadata: 'arXiv:2512.21446, December 2025, Shirui Chen, Jiantao Jiao, et al.'
  },
  {
    id: 'pub-sample-polarity-rlvr',
    name: 'Rethinking Sample Polarity in Reinforcement Learning with Verifiable Rewards',
    type: 'Publication',
    description: 'Systematic investigation of how positive and negative sample polarities affect RLVR training dynamics. Proposes A3PO for precise token-level advantage allocation.',
    metadata: 'arXiv:2512.21625, December 2025, Xinyu Tang, Yuliang Zhan, et al.'
  },
  {
    id: 'pub-parallel-token-prediction',
    name: 'Parallel Token Prediction for Language Models',
    type: 'Publication',
    description: 'Universal framework for parallel sequence generation without restrictive independence assumptions. Proves PTP can represent arbitrary autoregressive distributions.',
    metadata: 'arXiv:2512.21323, December 2025, Felix Draxler, Justus Will, et al.'
  },
  {
    id: 'pub-sparse-speculative-verification',
    name: 'Accelerate Speculative Decoding with Sparse Computation in Verification',
    type: 'Publication',
    description: 'Systematic adoption of sparse methods for speculative decoding verification. Achieves favorable efficiency-accuracy trade-offs while maintaining acceptance length.',
    metadata: 'arXiv:2512.21911, December 2025, Jikai Wang, Jianchao Tan, et al.'
  },
  {
    id: 'pub-transformer-scaling-ode',
    name: 'Unifying Learning Dynamics and Generalization in Transformers Scaling Law',
    type: 'Publication',
    description: 'Theoretical formalization of transformer learning dynamics as ODE system. Establishes phase transition in generalization error from exponential to power-law decay.',
    metadata: 'arXiv:2512.22088, December 2025, Chiwun Yang'
  },

  // === Concepts ===
  {
    id: 'concept-gradient-bias-rl',
    name: 'Gradient Bias in RL Training',
    type: 'Concept',
    description: 'The discrepancy between stated RL objectives and their practical implementations due to KL estimator configurations. Biased gradients can cause training instabilities while unbiased configurations improve generalization.',
    metadata: 'KL divergence estimation, On-policy/Off-policy settings'
  },
  {
    id: 'concept-pseudo-reasoning',
    name: 'Pseudo-Reasoning Mechanism',
    type: 'Concept',
    description: 'Phenomenon where latent tokens generate plausible reasoning traces that conceal shortcut dependence rather than faithfully representing reasoning processes. Identified in COCONUT analysis.',
    metadata: 'Latent tokens, Shortcut exploitation, Dataset artifacts'
  },
  {
    id: 'concept-sample-polarity',
    name: 'Sample Polarity in RLVR',
    type: 'Concept',
    description: 'The distinction between positive and negative self-generated rollouts in reinforcement learning with verifiable rewards. Positive samples sharpen existing patterns; negative samples encourage exploration.',
    metadata: 'Large Reasoning Models, Policy optimization'
  },
  {
    id: 'concept-scaling-phase-transition',
    name: 'Scaling Law Phase Transition',
    type: 'Concept',
    description: 'Theoretical phenomenon where excess risk transitions from exponential decay to power-law decay (Θ(C^{-1/6})) as computational resources cross a threshold during transformer training.',
    metadata: 'ODE dynamics, Kernel approximation, Statistical learning theory'
  },

  // === Benchmarks ===
  {
    id: 'bench-spec-bench',
    name: 'Spec-Bench',
    type: 'Benchmark',
    description: 'Benchmark for evaluating speculative decoding methods. Measures tokens accepted per step and overall inference speedup. PTP achieves state-of-the-art with 4+ tokens per step on Vicuna-7B.',
    metadata: 'Speculative decoding evaluation, Vicuna-7B baseline'
  },

  // === Persons ===
  {
    id: 'person-nathan-kallus',
    name: 'Nathan Kallus',
    type: 'Person',
    description: 'Researcher who developed semiparametric preference optimization framework treating LLMs as single-index models. Expert in causal inference and policy learning.',
    metadata: 'Semiparametric methods, Econometrics, Machine learning'
  },
  {
    id: 'person-felix-draxler',
    name: 'Felix Draxler',
    type: 'Person',
    description: 'Lead author of Parallel Token Prediction framework. Researcher on efficient language model inference and parallel generation methods.',
    metadata: 'Speculative decoding, Parallel generation'
  },

  // === Organizations ===
  {
    id: 'org-llnl',
    name: 'Lawrence Livermore National Laboratory',
    type: 'Organization',
    description: 'US national laboratory contributing to KL estimator analysis for RL training of LLMs. Focus on reliable AI systems and efficient training methods.',
    metadata: 'Department of Energy, AI research'
  }
];

// ============================================================================
// Relations
// ============================================================================

const relations: Relation[] = [
  // Publication -> Technique
  { sourceId: 'pub-kl-comedy-estimators', targetId: 'tech-kl-estimators-rl', type: 'INTRODUCES', description: 'Introduces systematic KL estimator analysis' },
  { sourceId: 'pub-latent-tokens-think', targetId: 'tech-coconut-analysis', type: 'INTRODUCES', description: 'Provides critical COCONUT analysis' },
  { sourceId: 'pub-1bit-output-alignment', targetId: 'tech-1bit-ptq-output-alignment', type: 'INTRODUCES', description: 'Proposes 1-bit PTQ output alignment method' },
  { sourceId: 'pub-semiparametric-po', targetId: 'tech-semiparametric-po', type: 'INTRODUCES', description: 'Develops semiparametric preference optimization' },
  { sourceId: 'pub-dultra', targetId: 'tech-dultra', type: 'INTRODUCES', description: 'Proposes dUltra framework' },
  { sourceId: 'pub-sample-polarity-rlvr', targetId: 'tech-a3po', type: 'INTRODUCES', description: 'Proposes A3PO method' },
  { sourceId: 'pub-parallel-token-prediction', targetId: 'tech-parallel-token-prediction', type: 'INTRODUCES', description: 'Introduces PTP framework' },
  { sourceId: 'pub-sparse-speculative-verification', targetId: 'tech-sparse-speculative-verification', type: 'INTRODUCES', description: 'Proposes sparse verification framework' },
  { sourceId: 'pub-transformer-scaling-ode', targetId: 'tech-transformer-scaling-ode', type: 'INTRODUCES', description: 'Establishes ODE scaling framework' },

  // Technique -> Concept
  { sourceId: 'tech-kl-estimators-rl', targetId: 'concept-gradient-bias-rl', type: 'ANALYZES', description: 'Studies gradient bias in KL estimation' },
  { sourceId: 'tech-coconut-analysis', targetId: 'concept-pseudo-reasoning', type: 'IDENTIFIES', description: 'Identifies pseudo-reasoning mechanism' },
  { sourceId: 'tech-a3po', targetId: 'concept-sample-polarity', type: 'UTILIZES', description: 'Leverages sample polarity understanding' },
  { sourceId: 'tech-transformer-scaling-ode', targetId: 'concept-scaling-phase-transition', type: 'FORMALIZES', description: 'Formalizes phase transition in scaling' },

  // Technique -> Benchmark
  { sourceId: 'tech-parallel-token-prediction', targetId: 'bench-spec-bench', type: 'EVALUATED_ON', description: 'Achieves SOTA on Spec-Bench' },
  
  // Person -> Publication
  { sourceId: 'person-nathan-kallus', targetId: 'pub-semiparametric-po', type: 'AUTHORED', description: 'Lead author' },
  { sourceId: 'person-felix-draxler', targetId: 'pub-parallel-token-prediction', type: 'AUTHORED', description: 'Lead author' },

  // Related techniques
  { sourceId: 'tech-dultra', targetId: 'tech-parallel-token-prediction', type: 'RELATED_TO', description: 'Both address parallel token generation' },
  { sourceId: 'tech-sparse-speculative-verification', targetId: 'tech-parallel-token-prediction', type: 'COMPLEMENTS', description: 'Sparse verification can enhance PTP' },
  { sourceId: 'tech-kl-estimators-rl', targetId: 'tech-a3po', type: 'RELATED_TO', description: 'Both analyze RL training dynamics' },
  { sourceId: 'tech-1bit-ptq-output-alignment', targetId: 'tech-sparse-speculative-verification', type: 'RELATED_TO', description: 'Both improve LLM efficiency' },

  // Cross-references to existing entities
  { sourceId: 'tech-kl-estimators-rl', targetId: 'ai-qwen-2.5', type: 'EVALUATED_ON', description: 'Experiments on Qwen2.5-7B' },
  { sourceId: 'tech-kl-estimators-rl', targetId: 'ai-llama-3.1', type: 'EVALUATED_ON', description: 'Experiments on Llama-3.1-8B' },
  { sourceId: 'tech-coconut-analysis', targetId: 'bench-mmlu', type: 'EVALUATED_ON', description: 'Evaluated on MMLU' },
  { sourceId: 'tech-parallel-token-prediction', targetId: 'ai-vicuna', type: 'EVALUATED_ON', description: 'Evaluated on Vicuna-7B' },
];

// ============================================================================
// Ingestion Script
// ============================================================================

async function ingest() {
  const session = driver.session();
  
  try {
    console.log('🚀 Ingesting arXiv LLM Latest Papers (December 29, 2025)...\n');
    
    // Create entities
    let entityCount = 0;
    for (const entity of entities) {
      await session.run(
        `MERGE (e:${ENTITY_LABEL} {id: $id})
         SET e.name = $name,
             e.type = $type,
             e.description = $description,
             e.metadata = $metadata`,
        entity
      );
      entityCount++;
    }
    console.log(`✅ Created/Updated ${entityCount} entities`);
    
    // Create relations
    let relationCount = 0;
    for (const rel of relations) {
      try {
        await session.run(
          `MATCH (a:${ENTITY_LABEL} {id: $sourceId})
           MATCH (b:${ENTITY_LABEL} {id: $targetId})
           MERGE (a)-[r:${RELATION_TYPE}]->(b)
           SET r.type = $type,
               r.description = $description`,
          rel
        );
        relationCount++;
      } catch (err) {
        // Skip if target entity doesn't exist (cross-reference to entities not yet in DB)
        console.log(`⚠️  Skipped relation: ${rel.sourceId} -> ${rel.targetId} (target may not exist)`);
      }
    }
    console.log(`✅ Created/Updated ${relationCount} relations`);
    
    // Print statistics
    const stats = await session.run(`
      MATCH (n:${ENTITY_LABEL})
      RETURN n.type as type, count(*) as count
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Database Statistics:');
    stats.records.forEach(record => {
      console.log(`   ${record.get('type')}: ${record.get('count')}`);
    });
    
    const total = await session.run(`MATCH (n:${ENTITY_LABEL}) RETURN count(n) as total`);
    console.log(`\n📈 Total entities: ${total.records[0].get('total')}`);
    
  } finally {
    await session.close();
    await driver.close();
  }
}

ingest().catch(console.error);
