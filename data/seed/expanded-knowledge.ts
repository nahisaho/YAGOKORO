/**
 * Expanded Knowledge Graph - Database Enhancement
 * 
 * This seed file adds comprehensive coverage of:
 * 1. Multimodal Models (Vision-Language Models)
 * 2. RAG Techniques (Retrieval-Augmented Generation)
 * 3. Agent Frameworks & Tool Use
 * 4. Long Context Processing
 * 5. Parameter-Efficient Fine-Tuning (PEFT)
 * 6. Inference Acceleration (Speculative Decoding)
 * 7. Alignment Techniques
 * 8. Additional Foundation Models
 */

import { Driver } from 'neo4j-driver';
import neo4j from 'neo4j-driver';

interface Entity {
  name: string;
  type: 'AIModel' | 'Technique' | 'Publication' | 'Person' | 'Benchmark' | 'Organization' | 'Concept';
  description: string;
  metadata?: Record<string, unknown>;
}

interface Relation {
  source: string;
  target: string;
  type: string;
  properties?: Record<string, unknown>;
}

// ============================================================================
// ENTITIES
// ============================================================================

const entities: Entity[] = [
  // -------------------------------------------------------------------------
  // Multimodal / Vision-Language Models
  // -------------------------------------------------------------------------
  {
    name: 'LLaVA',
    type: 'AIModel',
    description: 'Large Language and Vision Assistant. End-to-end trained large multimodal model connecting vision encoder and LLM for visual and language understanding. Uses GPT-4 generated visual instruction tuning data.',
    metadata: { 
      arxivId: '2304.08485', 
      year: 2023,
      venue: 'NeurIPS 2023',
      category: 'multimodal'
    }
  },
  {
    name: 'LLaVA-1.5',
    type: 'AIModel',
    description: 'Improved LLaVA with CLIP-ViT-L-336px, MLP projection, and academic-task-oriented VQA data. Achieves state-of-the-art across 11 benchmarks with only 1.2M public data, trainable in ~1 day on single 8-A100 node.',
    metadata: { 
      arxivId: '2310.03744', 
      year: 2023,
      venue: 'CVPR 2024',
      category: 'multimodal'
    }
  },
  {
    name: 'CogVLM',
    type: 'AIModel',
    description: 'Visual language foundation model with trainable visual expert module in attention and FFN layers. Bridges frozen pretrained LLM and image encoder with deep vision-language fusion. CogVLM-17B achieves SOTA on 10+ cross-modal benchmarks.',
    metadata: { 
      arxivId: '2311.03079', 
      year: 2023,
      category: 'multimodal'
    }
  },
  {
    name: 'Qwen',
    type: 'AIModel',
    description: 'Comprehensive language model series from Alibaba including base and chat models. Features RLHF training, tool-use and planning capabilities. Includes Code-Qwen and Math-Qwen specialized variants.',
    metadata: { 
      arxivId: '2309.16609', 
      year: 2023,
      organization: 'Alibaba',
      category: 'foundation-model'
    }
  },
  {
    name: 'Qwen2',
    type: 'AIModel',
    description: 'Next generation Qwen with 0.5B to 72B parameters including dense and MoE variants. Qwen2-72B achieves 84.2 MMLU, 64.6 HumanEval, 89.5 GSM8K. Multilingual proficiency in 30+ languages.',
    metadata: { 
      arxivId: '2407.10671', 
      year: 2024,
      organization: 'Alibaba',
      category: 'foundation-model'
    }
  },
  
  // -------------------------------------------------------------------------
  // RAG Techniques
  // -------------------------------------------------------------------------
  {
    name: 'RAPTOR',
    type: 'Technique',
    description: 'Recursive Abstractive Processing for Tree-Organized Retrieval. Recursively embeds, clusters, and summarizes chunks to build a tree with different abstraction levels. Enables retrieval across lengthy documents. 20% absolute accuracy improvement on QuALITY with GPT-4.',
    metadata: { 
      arxivId: '2401.18059', 
      year: 2024,
      category: 'rag'
    }
  },
  {
    name: 'HyDE',
    type: 'Technique',
    description: 'Hypothetical Document Embeddings for zero-shot dense retrieval. Instructs LLM to generate hypothetical document, then encodes it for similarity search. Outperforms Contriever and rivals fine-tuned retrievers across web search, QA, fact verification in multiple languages.',
    metadata: { 
      arxivId: '2212.10496', 
      year: 2022,
      category: 'rag'
    }
  },
  {
    name: 'RA-DIT',
    type: 'Technique',
    description: 'Retrieval-Augmented Dual Instruction Tuning. Lightweight fine-tuning retrofitting any LLM with retrieval: (1) update LM to use retrieved info, (2) update retriever for LM preferences. RA-DIT 65B achieves SOTA on knowledge-intensive zero/few-shot benchmarks.',
    metadata: { 
      arxivId: '2310.01352', 
      year: 2023,
      venue: 'ICLR 2024',
      category: 'rag'
    }
  },
  
  // -------------------------------------------------------------------------
  // Agent & Tool Use
  // -------------------------------------------------------------------------
  {
    name: 'AgentBench',
    type: 'Benchmark',
    description: 'Multi-dimensional benchmark with 8 distinct environments evaluating LLM-as-Agent reasoning and decision-making. Shows significant gap between commercial and open-source LLMs. Identifies poor long-term reasoning as main obstacle.',
    metadata: { 
      arxivId: '2308.03688', 
      year: 2023,
      venue: 'ICLR 2024',
      category: 'agent'
    }
  },
  {
    name: 'LATM',
    type: 'Technique',
    description: 'LLMs As Tool Makers. Closed-loop framework where LLMs create reusable tools: (1) tool maker crafts tools, (2) tool user applies them. GPT-4 as maker + GPT-3.5 as user achieves GPT-4-level performance at reduced cost.',
    metadata: { 
      arxivId: '2305.17126', 
      year: 2023,
      category: 'agent'
    }
  },
  {
    name: 'LATS',
    type: 'Technique',
    description: 'Language Agent Tree Search unifying reasoning, acting, and planning. Integrates Monte Carlo Tree Search with LM-powered value functions and self-reflections. 92.7% pass@1 on HumanEval with GPT-4, 75.9 on WebShop with GPT-3.5.',
    metadata: { 
      arxivId: '2310.04406', 
      year: 2023,
      category: 'agent'
    }
  },
  {
    name: 'Data Interpreter',
    type: 'AIModel',
    description: 'LLM-based agent for end-to-end data science problems. Features Hierarchical Graph Modeling for dynamic subproblem decomposition and Programmable Node Generation for iterative code improvement. 25% boost on InfiAgent-DABench (75.9% to 94.9%).',
    metadata: { 
      arxivId: '2402.18679', 
      year: 2024,
      category: 'agent'
    }
  },
  
  // -------------------------------------------------------------------------
  // Long Context Processing
  // -------------------------------------------------------------------------
  {
    name: 'Position Interpolation',
    type: 'Technique',
    description: 'Extends RoPE-based LLMs context to 32768 tokens with minimal fine-tuning (<1000 steps). Linearly down-scales position indices instead of extrapolating. Upper bound ~600x smaller than extrapolation. Works with LLaMA 7B-65B.',
    metadata: { 
      arxivId: '2306.15595', 
      year: 2023,
      category: 'long-context'
    }
  },
  {
    name: 'Lost in the Middle',
    type: 'Concept',
    description: 'Phenomenon where LLMs perform best when relevant info at beginning/end but degrade significantly when info is in the middle of long contexts. Important finding for RAG and long-context model design.',
    metadata: { 
      arxivId: '2307.03172', 
      year: 2023,
      venue: 'TACL 2023',
      category: 'long-context'
    }
  },
  {
    name: 'Long Context Continual Pretraining',
    type: 'Technique',
    description: 'Effective long-context scaling via continual pretraining from Llama 2 with longer sequences and upsampled long texts. More efficient than pretraining from scratch. 70B variant surpasses gpt-3.5-turbo-16k on long-context tasks.',
    metadata: { 
      arxivId: '2309.16039', 
      year: 2023,
      category: 'long-context'
    }
  },
  
  // -------------------------------------------------------------------------
  // Parameter-Efficient Fine-Tuning (PEFT)
  // -------------------------------------------------------------------------
  {
    name: 'LoRA',
    type: 'Technique',
    description: 'Low-Rank Adaptation freezes pretrained weights and injects trainable rank decomposition matrices. Reduces trainable parameters by 10,000x and GPU memory by 3x vs full fine-tuning. No additional inference latency.',
    metadata: { 
      arxivId: '2106.09685', 
      year: 2021,
      category: 'peft'
    }
  },
  {
    name: 'QLoRA',
    type: 'Technique',
    description: 'Efficient finetuning through 4-bit quantized LLM + LoRA. Enables 65B model finetuning on single 48GB GPU. Innovations: 4-bit NormalFloat (NF4), double quantization, paged optimizers. Guanaco reaches 99.3% ChatGPT performance.',
    metadata: { 
      arxivId: '2305.14314', 
      year: 2023,
      category: 'peft'
    }
  },
  {
    name: 'LoRA+',
    type: 'Technique',
    description: 'Improved LoRA with different learning rates for adapter matrices A and B. Original LoRA suboptimal for large width models. LoRA+ achieves 1-2% improvement and ~2x speedup at same computational cost.',
    metadata: { 
      arxivId: '2402.12354', 
      year: 2024,
      category: 'peft'
    }
  },
  
  // -------------------------------------------------------------------------
  // Inference Acceleration
  // -------------------------------------------------------------------------
  {
    name: 'Speculative Decoding',
    type: 'Technique',
    description: 'Accelerates autoregressive inference by computing multiple tokens in parallel. Uses smaller draft model for predictions, verifies with target model. 2-3x speedup on T5-XXL without changing outputs or retraining.',
    metadata: { 
      arxivId: '2211.17192', 
      year: 2022,
      venue: 'ICML 2023',
      category: 'inference'
    }
  },
  {
    name: 'Speculative Sampling',
    type: 'Technique',
    description: 'DeepMind variant of speculative decoding with modified rejection sampling preserving target distribution. 2-2.5x speedup on Chinchilla 70B in distributed setup without quality compromise.',
    metadata: { 
      arxivId: '2302.01318', 
      year: 2023,
      category: 'inference'
    }
  },
  {
    name: 'SpecInfer',
    type: 'Technique',
    description: 'Tree-based speculative inference using token trees for parallel verification. LLM as verifier instead of incremental decoder. 1.5-2.8x speedup for distributed inference, 2.6-3.5x for offloading-based inference.',
    metadata: { 
      arxivId: '2305.09781', 
      year: 2023,
      venue: 'ASPLOS 2024',
      category: 'inference'
    }
  },
  
  // -------------------------------------------------------------------------
  // Alignment Techniques
  // -------------------------------------------------------------------------
  {
    name: 'Constitutional AI',
    type: 'Technique',
    description: 'Training harmless AI through self-improvement without human harm labels. Uses list of principles (constitution) for self-critique and revision. Combines SL phase (revisions) and RL phase (RLAIF with AI preferences).',
    metadata: { 
      arxivId: '2212.08073', 
      year: 2022,
      organization: 'Anthropic',
      category: 'alignment'
    }
  },
  {
    name: 'RRHF',
    type: 'Technique',
    description: 'Rank Responses to align with Human Feedback. Scores responses via log conditional probabilities, learns to rank them. Simpler than PPO: 1-2 models, no complex hyperparameters. NeurIPS 2023.',
    metadata: { 
      arxivId: '2304.05302', 
      year: 2023,
      venue: 'NeurIPS 2023',
      category: 'alignment'
    }
  },
  {
    name: 'LIMA',
    type: 'Technique',
    description: 'Less Is More for Alignment. 65B LLaMA fine-tuned on only 1000 curated prompts without RLHF. Equivalent/preferred to GPT-4 in 43% of cases. Shows almost all knowledge learned during pretraining, limited tuning sufficient.',
    metadata: { 
      arxivId: '2305.11206', 
      year: 2023,
      category: 'alignment'
    }
  },
  
  // -------------------------------------------------------------------------
  // Additional Models
  // -------------------------------------------------------------------------
  {
    name: 'LLaMA Pro',
    type: 'AIModel',
    description: 'Progressive LLaMA with block expansion for post-pretraining. Tunes only expanded blocks on new corpus, preventing catastrophic forgetting. LLaMA Pro-8.3B from LLaMA2-7B excels in general tasks, programming, and math.',
    metadata: { 
      arxivId: '2401.02415', 
      year: 2024,
      venue: 'ACL 2024',
      category: 'foundation-model'
    }
  },
  {
    name: 'Guanaco',
    type: 'AIModel',
    description: 'QLoRA fine-tuned model family achieving 99.3% ChatGPT performance on Vicuna benchmark. 24 hours finetuning on single GPU. Demonstrates efficiency of QLoRA approach.',
    metadata: { 
      year: 2023,
      category: 'foundation-model'
    }
  },
  
  // -------------------------------------------------------------------------
  // Datasets & Benchmarks
  // -------------------------------------------------------------------------
  {
    name: 'LMSYS-Chat-1M',
    type: 'Benchmark',
    description: 'Large-scale dataset with 1M real-world conversations from 25 state-of-the-art LLMs. From 210K unique IPs via Vicuna demo and Chatbot Arena. Use cases: content moderation, safety benchmark, instruction-following training.',
    metadata: { 
      arxivId: '2309.11998', 
      year: 2023,
      category: 'dataset'
    }
  },
  {
    name: 'LLM-AggreFact',
    type: 'Benchmark',
    description: 'Unified benchmark for fact-checking and grounding LLM generations. Combines datasets from recent fact-checking work. Used to train MiniCheck-FT5 achieving GPT-4 accuracy at 770M parameters.',
    metadata: { 
      arxivId: '2404.10774', 
      year: 2024,
      venue: 'EMNLP 2024',
      category: 'benchmark'
    }
  },
  
  // -------------------------------------------------------------------------
  // Concepts
  // -------------------------------------------------------------------------
  {
    name: 'Visual Instruction Tuning',
    type: 'Concept',
    description: 'Using machine-generated image-text instruction data to train multimodal models. Pioneered by LLaVA using GPT-4 generated data. Key technique for building vision-language assistants.',
    metadata: { 
      year: 2023,
      category: 'multimodal'
    }
  },
  {
    name: 'Retrieval-Augmented LM',
    type: 'Concept',
    description: 'Language models enhanced with retrieval from external knowledge stores. Improves long-tail knowledge, up-to-date info, and factual accuracy. Includes RAG, RAPTOR, HyDE, RA-DIT approaches.',
    metadata: { 
      category: 'rag'
    }
  },
  {
    name: 'LLM Agent',
    type: 'Concept',
    description: 'LLMs acting autonomously with reasoning, planning, and tool use capabilities. Evaluated by AgentBench across 8 environments. Key challenge: long-term reasoning and decision-making.',
    metadata: { 
      category: 'agent'
    }
  },
  {
    name: 'RLAIF',
    type: 'Technique',
    description: 'Reinforcement Learning from AI Feedback. Uses AI model to evaluate preferences instead of humans. Core technique in Constitutional AI for scalable alignment without human labels.',
    metadata: { 
      year: 2022,
      organization: 'Anthropic',
      category: 'alignment'
    }
  },
  
  // -------------------------------------------------------------------------
  // Key Researchers
  // -------------------------------------------------------------------------
  {
    name: 'Haotian Liu',
    type: 'Person',
    description: 'Lead author of LLaVA and LLaVA-1.5. Pioneer in visual instruction tuning for large multimodal models.',
    metadata: { 
      affiliation: 'University of Wisconsin-Madison'
    }
  },
  {
    name: 'Edward Hu',
    type: 'Person',
    description: 'Lead author of LoRA (Low-Rank Adaptation). Revolutionized parameter-efficient fine-tuning of large language models.',
    metadata: { 
      affiliation: 'Microsoft Research'
    }
  },
  {
    name: 'Tim Dettmers',
    type: 'Person',
    description: 'Lead author of QLoRA and bitsandbytes. Pioneer in efficient quantization and fine-tuning methods for LLMs.',
    metadata: { 
      affiliation: 'University of Washington'
    }
  },
  {
    name: 'Yuntao Bai',
    type: 'Person',
    description: 'Lead author of Constitutional AI at Anthropic. Pioneer in AI alignment through self-improvement and RLAIF.',
    metadata: { 
      affiliation: 'Anthropic'
    }
  },
  {
    name: 'Christopher D. Manning',
    type: 'Person',
    description: 'Stanford NLP professor. Co-author of RAPTOR for tree-organized retrieval. Pioneer in NLP and knowledge retrieval.',
    metadata: { 
      affiliation: 'Stanford University'
    }
  },
  {
    name: 'Yaniv Leviathan',
    type: 'Person',
    description: 'Lead author of speculative decoding at Google. Pioneered parallel token generation for inference acceleration.',
    metadata: { 
      affiliation: 'Google Research'
    }
  },
  {
    name: 'Lianmin Zheng',
    type: 'Person',
    description: 'Creator of LMSYS-Chat-1M and Chatbot Arena. Leader in LLM evaluation and benchmarking infrastructure.',
    metadata: { 
      affiliation: 'UC Berkeley'
    }
  },
  
  // -------------------------------------------------------------------------
  // Organizations
  // -------------------------------------------------------------------------
  {
    name: 'Anthropic',
    type: 'Organization',
    description: 'AI safety company founded by former OpenAI researchers. Created Constitutional AI, RLAIF, and Claude models. Focus on AI alignment and safety.',
    metadata: { 
      founded: 2021,
      headquarters: 'San Francisco'
    }
  },
  {
    name: 'LMSYS',
    type: 'Organization',
    description: 'Large Model Systems Organization at UC Berkeley. Created Chatbot Arena, LMSYS-Chat-1M, Vicuna. Leader in LLM evaluation infrastructure.',
    metadata: { 
      affiliation: 'UC Berkeley'
    }
  },
  {
    name: 'Alibaba DAMO Academy',
    type: 'Organization',
    description: 'Alibaba research organization. Created Qwen series of models including Qwen, Qwen2, and specialized variants for code and math.',
    metadata: { 
      headquarters: 'Hangzhou, China'
    }
  }
];

// ============================================================================
// RELATIONS
// ============================================================================

const relations: Relation[] = [
  // LLaVA relations
  { source: 'LLaVA', target: 'Visual Instruction Tuning', type: 'PIONEERED' },
  { source: 'LLaVA-1.5', target: 'LLaVA', type: 'EXTENDS' },
  { source: 'Haotian Liu', target: 'LLaVA', type: 'CREATED' },
  { source: 'Haotian Liu', target: 'LLaVA-1.5', type: 'CREATED' },
  
  // CogVLM relations
  { source: 'CogVLM', target: 'Visual Instruction Tuning', type: 'USES' },
  
  // Qwen relations
  { source: 'Qwen2', target: 'Qwen', type: 'EXTENDS' },
  { source: 'Alibaba DAMO Academy', target: 'Qwen', type: 'DEVELOPED' },
  { source: 'Alibaba DAMO Academy', target: 'Qwen2', type: 'DEVELOPED' },
  
  // RAG relations
  { source: 'RAPTOR', target: 'Retrieval-Augmented LM', type: 'IMPLEMENTS' },
  { source: 'HyDE', target: 'Retrieval-Augmented LM', type: 'IMPLEMENTS' },
  { source: 'RA-DIT', target: 'Retrieval-Augmented LM', type: 'IMPLEMENTS' },
  { source: 'Christopher D. Manning', target: 'RAPTOR', type: 'CO_AUTHORED' },
  
  // Agent relations
  { source: 'LATM', target: 'LLM Agent', type: 'IMPLEMENTS' },
  { source: 'LATS', target: 'LLM Agent', type: 'IMPLEMENTS' },
  { source: 'Data Interpreter', target: 'LLM Agent', type: 'IMPLEMENTS' },
  { source: 'AgentBench', target: 'LLM Agent', type: 'EVALUATES' },
  
  // Long context relations
  { source: 'Position Interpolation', target: 'RoPE', type: 'EXTENDS' },
  { source: 'Long Context Continual Pretraining', target: 'Llama 2', type: 'EXTENDS' },
  
  // PEFT relations
  { source: 'QLoRA', target: 'LoRA', type: 'EXTENDS' },
  { source: 'LoRA+', target: 'LoRA', type: 'IMPROVES' },
  { source: 'Edward Hu', target: 'LoRA', type: 'CREATED' },
  { source: 'Tim Dettmers', target: 'QLoRA', type: 'CREATED' },
  { source: 'Guanaco', target: 'QLoRA', type: 'TRAINED_WITH' },
  
  // Inference acceleration relations
  { source: 'Speculative Sampling', target: 'Speculative Decoding', type: 'VARIANT_OF' },
  { source: 'SpecInfer', target: 'Speculative Decoding', type: 'EXTENDS' },
  { source: 'Yaniv Leviathan', target: 'Speculative Decoding', type: 'CREATED' },
  
  // Alignment relations
  { source: 'Constitutional AI', target: 'RLAIF', type: 'USES' },
  { source: 'Yuntao Bai', target: 'Constitutional AI', type: 'CREATED' },
  { source: 'Anthropic', target: 'Constitutional AI', type: 'DEVELOPED' },
  { source: 'Anthropic', target: 'RLAIF', type: 'DEVELOPED' },
  { source: 'RRHF', target: 'DPO', type: 'ALTERNATIVE_TO' },
  { source: 'LIMA', target: 'Instruction Tuning', type: 'INVESTIGATES' },
  
  // Model relations
  { source: 'LLaMA Pro', target: 'Llama 2', type: 'EXTENDS' },
  
  // Dataset/Benchmark relations
  { source: 'Lianmin Zheng', target: 'LMSYS-Chat-1M', type: 'CREATED' },
  { source: 'LMSYS', target: 'LMSYS-Chat-1M', type: 'RELEASED' },
  { source: 'LMSYS', target: 'Chatbot Arena', type: 'CREATED' },
  
  // Cross-domain relations
  { source: 'LLaVA', target: 'GPT-4', type: 'USES_DATA_FROM' },
  { source: 'RAPTOR', target: 'GPT-4', type: 'INTEGRATES_WITH' },
  { source: 'AgentBench', target: 'GPT-4', type: 'EVALUATES' },
  { source: 'Constitutional AI', target: 'Claude', type: 'TRAINS' },
  { source: 'Lost in the Middle', target: 'Retrieval-Augmented LM', type: 'ANALYZES' }
];

// ============================================================================
// INGESTION LOGIC
// ============================================================================

async function ingestData() {
  const driver: Driver = neo4j.driver(
    'bolt://localhost:7687',
    neo4j.auth.basic('neo4j', 'password')
  );
  
  const session = driver.session();
  
  try {
    console.log('🚀 Starting expanded knowledge ingestion...\n');
    
    // Create entities
    console.log(`📦 Creating ${entities.length} entities...`);
    for (const entity of entities) {
      await session.run(
        `
        MERGE (e:Entity {name: $name})
        SET e.type = $type,
            e.description = $description,
            e.metadata = $metadata,
            e.updatedAt = datetime()
        `,
        {
          name: entity.name,
          type: entity.type,
          description: entity.description,
          metadata: JSON.stringify(entity.metadata || {})
        }
      );
    }
    console.log(`   ✅ ${entities.length} entities created/updated\n`);
    
    // Create relations
    console.log(`🔗 Creating ${relations.length} relations...`);
    let createdRelations = 0;
    for (const rel of relations) {
      const result = await session.run(
        `
        MATCH (source:Entity {name: $source})
        MATCH (target:Entity {name: $target})
        MERGE (source)-[r:${rel.type}]->(target)
        SET r.properties = $properties,
            r.updatedAt = datetime()
        RETURN r
        `,
        {
          source: rel.source,
          target: rel.target,
          properties: JSON.stringify(rel.properties || {})
        }
      );
      if (result.records.length > 0) {
        createdRelations++;
      }
    }
    console.log(`   ✅ ${createdRelations} relations created/updated\n`);
    
    // Print statistics
    const stats = await session.run(`
      MATCH (n:Entity)
      RETURN n.type as type, count(*) as count
      ORDER BY count DESC
    `);
    
    console.log('📊 Database Statistics:');
    stats.records.forEach(record => {
      console.log(`   ${record.get('type')}: ${record.get('count')}`);
    });
    
    const totalCount = await session.run('MATCH (n:Entity) RETURN count(n) as total');
    console.log(`\n   Total entities: ${totalCount.records[0].get('total')}`);
    
  } catch (error) {
    console.error('❌ Error during ingestion:', error);
    throw error;
  } finally {
    await session.close();
    await driver.close();
  }
}

// Run if executed directly
ingestData().catch(console.error);
