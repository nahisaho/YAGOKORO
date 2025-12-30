/**
 * Advanced Techniques - 高度な技術の追加シード
 *
 * カバーする領域:
 * 1. 推論技術 (Chain-of-Thought, Tree of Thoughts, ReAct)
 * 2. モデルマージ技術 (TIES, DARE, Model Soup)
 * 3. 埋め込みモデル (E5, BGE, M3-Embedding)
 * 4. 評価フレームワーク (HELM, BIG-Bench)
 * 5. 知識蒸留 (DistilBERT, MiniLM, MeZO)
 * 6. 合成データ生成 (Self-Instruct, Evol-Instruct, WizardLM)
 * 7. コード生成モデル (StarCoder, Code Llama, WizardCoder)
 */

import neo4j from "neo4j-driver";

const driver = neo4j.driver(
  process.env.NEO4J_URI || "bolt://localhost:7687",
  neo4j.auth.basic(
    process.env.NEO4J_USER || "neo4j",
    process.env.NEO4J_PASSWORD || "password"
  )
);

interface Entity {
  name: string;
  type: string;
  description: string;
  metadata?: Record<string, unknown>;
}

interface Relation {
  from: string;
  to: string;
  type: string;
  properties?: Record<string, unknown>;
}

// ============================================================================
// 推論技術 (Reasoning Techniques)
// ============================================================================

const reasoningEntities: Entity[] = [
  // Chain-of-Thought
  {
    name: "Chain-of-Thought Prompting",
    type: "Technique",
    description:
      "Chain-of-Thought (CoT) prompting elicits reasoning in large language models by generating a series of intermediate reasoning steps. Simply providing a few chain of thought demonstrations as exemplars significantly improves performance on arithmetic, commonsense, and symbolic reasoning tasks. A 540B parameter model with just 8 CoT exemplars achieved state-of-the-art on GSM8K math problems.",
    metadata: { year: 2022, category: "prompting", venue: "NeurIPS 2022" },
  },
  {
    name: "Zero-shot Chain-of-Thought",
    type: "Technique",
    description:
      "Zero-shot CoT shows that LLMs are decent zero-shot reasoners by simply adding 'Let's think step by step' before each answer. Without any hand-crafted few-shot examples, this single prompt template significantly outperforms zero-shot LLM performances on diverse reasoning tasks, increasing MultiArith accuracy from 17.7% to 78.7% and GSM8K from 10.4% to 40.7%.",
    metadata: { year: 2022, category: "prompting", venue: "NeurIPS 2022" },
  },
  {
    name: "Self-Consistency",
    type: "Technique",
    description:
      "Self-Consistency is a decoding strategy that replaces greedy decoding in chain-of-thought prompting. It samples a diverse set of reasoning paths and selects the most consistent answer by marginalizing out the sampled paths. This leverages the intuition that complex problems admit multiple ways of thinking leading to the correct answer. Boosts GSM8K by +17.9%, SVAMP by +11.0%.",
    metadata: { year: 2023, category: "decoding", venue: "ICLR 2023" },
  },
  {
    name: "Tree of Thoughts",
    type: "Technique",
    description:
      "Tree of Thoughts (ToT) generalizes Chain-of-Thought by enabling exploration over coherent units of text (thoughts) as intermediate steps toward problem solving. ToT allows LMs to perform deliberate decision making by considering multiple reasoning paths and self-evaluating choices. On Game of 24, while GPT-4 with CoT solved only 4% of tasks, ToT achieved 74% success rate.",
    metadata: { year: 2023, category: "reasoning", venue: "NeurIPS 2023" },
  },
  {
    name: "ReAct",
    type: "Technique",
    description:
      "ReAct synergizes reasoning and acting in language models by generating both reasoning traces and task-specific actions in an interleaved manner. Reasoning traces help induce, track, and update action plans, while actions interface with external sources like knowledge bases. On HotpotQA and Fever, ReAct overcomes hallucination issues by interacting with Wikipedia API.",
    metadata: { year: 2023, category: "agent", venue: "ICLR 2023" },
  },
  // People
  {
    name: "Jason Wei",
    type: "Person",
    description:
      "AI researcher who co-authored the influential Chain-of-Thought Prompting paper at Google, demonstrating how intermediate reasoning steps significantly improve LLM performance on complex tasks.",
    metadata: { affiliation: "Google Research" },
  },
  {
    name: "Shunyu Yao",
    type: "Person",
    description:
      "AI researcher at Princeton who developed ReAct (Reasoning + Acting) and Tree of Thoughts frameworks, advancing how LLMs can perform deliberate problem-solving and interact with external environments.",
    metadata: { affiliation: "Princeton University" },
  },
  {
    name: "Denny Zhou",
    type: "Person",
    description:
      "Principal Scientist at Google DeepMind, co-author of Chain-of-Thought Prompting and Self-Consistency papers, pioneering work on eliciting reasoning capabilities in large language models.",
    metadata: { affiliation: "Google DeepMind" },
  },
];

// ============================================================================
// モデルマージ技術 (Model Merging Techniques)
// ============================================================================

const mergingEntities: Entity[] = [
  {
    name: "TIES-Merging",
    type: "Technique",
    description:
      "TIES-Merging (Trim, Elect Sign & Merge) resolves interference when merging models by: (1) resetting parameters that changed only slightly during fine-tuning, (2) resolving sign conflicts across models, and (3) merging only parameters aligned with the agreed-upon sign. Outperforms existing methods across modalities, domains, and model sizes.",
    metadata: { year: 2023, category: "model-merging", venue: "NeurIPS 2023" },
  },
  {
    name: "DARE",
    type: "Technique",
    description:
      "DARE (Drop And REscale) enables language models to absorb abilities from homologous models without retraining. It randomly drops delta parameters (difference between fine-tuned and pre-trained) with ratio p and rescales remaining ones by 1/(1-p). Can eliminate 90-99% of delta parameters while maintaining abilities. Created a merged LM ranking first on Open LLM Leaderboard among 7B models.",
    metadata: { year: 2023, category: "model-merging", venue: "ICML 2024" },
  },
  {
    name: "Model Soup",
    type: "Technique",
    description:
      "Model Soup shows that averaging weights of multiple models fine-tuned with different hyperparameters improves accuracy and robustness without increasing inference time. Unlike ensembles, many models can be averaged without additional cost. The resulting ViT-G model achieved 90.94% top-1 accuracy on ImageNet, a new state of the art.",
    metadata: { year: 2022, category: "model-merging", venue: "ICML 2022" },
  },
  {
    name: "Model Merging",
    type: "Concept",
    description:
      "Model Merging is a technique to combine multiple task-specific fine-tuned models into a single multitask model without additional training. It addresses the proliferation of task-specific models that typically can only perform single tasks. Key challenges include parameter interference and sign conflicts across models.",
    metadata: { category: "technique" },
  },
];

// ============================================================================
// 埋め込みモデル (Embedding Models)
// ============================================================================

const embeddingEntities: Entity[] = [
  {
    name: "E5",
    type: "AIModel",
    description:
      "E5 (EmbEddings from bidirEctional Encoder rEpresentations) is a family of state-of-the-art text embeddings trained with weak supervision from curated large-scale text pair dataset (CCPairs). E5 is the first model to outperform strong BM25 baseline on BEIR retrieval benchmark without using any labeled data. When fine-tuned, E5 obtains best results on MTEB benchmark.",
    metadata: {
      year: 2022,
      organization: "Microsoft",
      category: "embedding",
    },
  },
  {
    name: "BGE",
    type: "AIModel",
    description:
      "BGE (BAAI General Embedding) is part of C-Pack, a comprehensive package for Chinese embeddings including C-MTEB benchmark (35 datasets), C-MTP training data, and C-TEM embedding models. BGE models outperform all prior Chinese text embeddings by up to +10% and also achieve state-of-the-art on English MTEB benchmark.",
    metadata: { year: 2023, organization: "BAAI", category: "embedding" },
  },
  {
    name: "M3-Embedding",
    type: "AIModel",
    description:
      "M3-Embedding (Multi-Linguality, Multi-Functionality, Multi-Granularity) provides uniform support for semantic retrieval in 100+ languages. It simultaneously accomplishes dense retrieval, multi-vector retrieval, and sparse retrieval, processing inputs from short sentences to 8,192 token documents. Uses novel self-knowledge distillation where relevance scores from different functionalities enhance training.",
    metadata: { year: 2024, organization: "BAAI", category: "embedding" },
  },
  {
    name: "Text Embedding",
    type: "Concept",
    description:
      "Text Embedding is the process of converting text into dense vector representations that capture semantic meaning. Modern embedding models support multiple functionalities (dense, sparse, multi-vector retrieval), handle various granularities (sentences to documents), and work across many languages. Key benchmarks include MTEB and BEIR.",
    metadata: { category: "nlp" },
  },
  {
    name: "MTEB",
    type: "Benchmark",
    description:
      "MTEB (Massive Text Embedding Benchmark) is a comprehensive benchmark for evaluating text embeddings across 8 tasks and 58 datasets covering multiple languages. It evaluates embeddings on classification, clustering, pair classification, reranking, retrieval, STS, and summarization tasks.",
    metadata: { year: 2022, category: "evaluation" },
  },
];

// ============================================================================
// 評価フレームワーク (Evaluation Frameworks)
// ============================================================================

const evaluationEntities: Entity[] = [
  {
    name: "HELM",
    type: "Benchmark",
    description:
      "HELM (Holistic Evaluation of Language Models) improves transparency of language models by measuring 7 metrics (accuracy, calibration, robustness, fairness, bias, toxicity, efficiency) across 16 core scenarios. Evaluates 30 prominent models on 42 scenarios (21 new). Prior to HELM, models averaged only 17.9% scenario coverage; HELM improved this to 96.0%.",
    metadata: {
      year: 2022,
      organization: "Stanford CRFM",
      category: "evaluation",
    },
  },
  {
    name: "BIG-Bench",
    type: "Benchmark",
    description:
      "BIG-Bench (Beyond the Imitation Game) consists of 204 tasks contributed by 450 authors across 132 institutions, focusing on tasks believed to be beyond current LLM capabilities. Covers linguistics, math, reasoning, biology, physics, social bias, and software development. Findings show performance improves with scale, with some tasks exhibiting breakthrough behavior at critical scales.",
    metadata: { year: 2022, category: "evaluation" },
  },
  {
    name: "HumanEval",
    type: "Benchmark",
    description:
      "HumanEval is a benchmark for evaluating code generation capabilities of language models. It consists of 164 hand-crafted programming problems with function signatures and docstrings, testing functional correctness through test cases. A key metric is pass@k, measuring the probability of generating correct code within k attempts.",
    metadata: { year: 2021, organization: "OpenAI", category: "code" },
  },
  {
    name: "GSM8K",
    type: "Benchmark",
    description:
      "GSM8K (Grade School Math 8K) is a benchmark of 8,500 high-quality grade school math word problems requiring multi-step reasoning. It has become a standard benchmark for evaluating mathematical reasoning capabilities of language models, with Chain-of-Thought prompting dramatically improving performance.",
    metadata: { year: 2021, organization: "OpenAI", category: "math" },
  },
  {
    name: "Percy Liang",
    type: "Person",
    description:
      "Associate Professor at Stanford University and Director of the Center for Research on Foundation Models (CRFM). Led the development of HELM benchmark and has been influential in establishing standards for evaluating and understanding foundation models.",
    metadata: { affiliation: "Stanford University" },
  },
];

// ============================================================================
// 知識蒸留 (Knowledge Distillation)
// ============================================================================

const distillationEntities: Entity[] = [
  {
    name: "DistilBERT",
    type: "AIModel",
    description:
      "DistilBERT is a smaller, faster, cheaper, and lighter version of BERT using knowledge distillation during pre-training. It reduces BERT's size by 40% while retaining 97% of language understanding capabilities and being 60% faster. Uses a triple loss combining language modeling, distillation, and cosine-distance losses.",
    metadata: {
      year: 2019,
      organization: "Hugging Face",
      parameters: "66M",
      category: "distillation",
    },
  },
  {
    name: "MiniLM",
    type: "AIModel",
    description:
      "MiniLM uses deep self-attention distillation for task-agnostic compression of pre-trained Transformers. The student model mimics the self-attention module of the teacher's last Transformer layer. Introduces scaled dot-product between values as new knowledge, retaining 99%+ accuracy on SQuAD 2.0 using 50% of teacher's parameters.",
    metadata: { year: 2020, organization: "Microsoft", category: "distillation" },
  },
  {
    name: "MeZO",
    type: "Technique",
    description:
      "MeZO (Memory-efficient Zeroth-order Optimizer) adapts classical ZO-SGD to fine-tune LMs with the same memory footprint as inference. A single A100 80GB GPU can train 30B parameter models, whereas backpropagation trains only 2.7B. Achieves comparable performance to backpropagation with up to 12x memory reduction.",
    metadata: { year: 2023, category: "optimization", venue: "NeurIPS 2023" },
  },
  {
    name: "Knowledge Distillation",
    type: "Concept",
    description:
      "Knowledge Distillation is a model compression technique where a smaller student model is trained to mimic a larger teacher model's behavior. Methods include distilling output logits, intermediate representations, and attention patterns. Enables deploying powerful models on resource-constrained devices.",
    metadata: { category: "compression" },
  },
  {
    name: "Victor Sanh",
    type: "Person",
    description:
      "AI researcher at Hugging Face who led the development of DistilBERT, demonstrating effective knowledge distillation for BERT compression. His work enabled practical deployment of BERT-class models on edge devices.",
    metadata: { affiliation: "Hugging Face" },
  },
];

// ============================================================================
// 合成データ生成 (Synthetic Data Generation)
// ============================================================================

const syntheticDataEntities: Entity[] = [
  {
    name: "Self-Instruct",
    type: "Technique",
    description:
      "Self-Instruct is a framework for improving instruction-following capabilities by bootstrapping off the model's own generations. It generates instructions, inputs, and outputs from an LLM, filters invalid/similar ones, then uses them for fine-tuning. Achieves 33% improvement on Super-NaturalInstructions, approaching InstructGPT-001 performance almost annotation-free.",
    metadata: { year: 2022, category: "data-generation", venue: "ACL 2023" },
  },
  {
    name: "Evol-Instruct",
    type: "Technique",
    description:
      "Evol-Instruct creates large amounts of instruction data with varying complexity using LLM instead of humans. Starting from initial instructions, it rewrites them step-by-step into more complex versions. Human evaluations show Evol-Instruct instructions are superior to human-created ones for training instruction-following models.",
    metadata: { year: 2023, category: "data-generation", venue: "ICLR 2024" },
  },
  {
    name: "WizardLM",
    type: "AIModel",
    description:
      "WizardLM empowers LLMs to follow complex instructions through Evol-Instruct fine-tuning. Human evaluations show outputs are preferred over ChatGPT on high-complexity tasks. In GPT-4 evaluation, WizardLM achieves 90%+ of ChatGPT capacity on 17 out of 29 skills, demonstrating the power of AI-evolved instruction data.",
    metadata: { year: 2023, organization: "Microsoft", category: "instruction-tuning" },
  },
  {
    name: "Synthetic Data Generation",
    type: "Concept",
    description:
      "Synthetic Data Generation for LLMs involves using models to create training data, reducing dependence on expensive human annotation. Techniques include self-instruct (bootstrapping from model outputs), evol-instruct (evolving instruction complexity), and various data augmentation methods. Critical for scaling instruction-tuning.",
    metadata: { category: "data" },
  },
];

// ============================================================================
// コード生成モデル (Code Generation Models)
// ============================================================================

const codeEntities: Entity[] = [
  {
    name: "StarCoder",
    type: "AIModel",
    description:
      "StarCoder is a 15.5B parameter Code LLM with 8K context length, infilling capabilities, and multi-query attention for fast inference. Trained on 1 trillion tokens from The Stack (permissively licensed GitHub repos). Outperforms every open Code LLM supporting multiple languages and matches OpenAI code-cushman-001. Achieves 40% pass@1 on HumanEval.",
    metadata: {
      year: 2023,
      organization: "BigCode",
      parameters: "15.5B",
      category: "code",
    },
  },
  {
    name: "StarCoder2",
    type: "AIModel",
    description:
      "StarCoder2 builds on The Stack v2 from Software Heritage archive spanning 619 programming languages, plus GitHub PRs, Kaggle notebooks, and documentation - 4x larger than original. Models at 3B, 7B, 15B parameters trained on 3.3-4.3T tokens. StarCoder2-15B matches or outperforms CodeLlama-34B (2x larger) on most benchmarks.",
    metadata: {
      year: 2024,
      organization: "BigCode",
      parameters: "3B/7B/15B",
      category: "code",
    },
  },
  {
    name: "Code Llama",
    type: "AIModel",
    description:
      "Code Llama is Meta's family of code LLMs based on Llama 2, with 7B, 13B, 34B, and 70B variants. Includes foundation models, Python specializations, and instruction-following versions. Trained on 16K token sequences with improvements up to 100K tokens. Achieves 67% on HumanEval and 65% on MBPP - state-of-the-art among open models.",
    metadata: {
      year: 2023,
      organization: "Meta AI",
      parameters: "7B-70B",
      category: "code",
    },
  },
  {
    name: "WizardCoder",
    type: "AIModel",
    description:
      "WizardCoder empowers Code LLMs with complex instruction fine-tuning by adapting Evol-Instruct to code. Surpasses all other open-source Code LLMs by substantial margin on HumanEval, HumanEval+, MBPP, and DS-1000. Even outperforms Claude and Bard on HumanEval benchmarks.",
    metadata: {
      year: 2023,
      organization: "Microsoft",
      category: "code",
      venue: "ICLR 2024",
    },
  },
  {
    name: "The Stack",
    type: "Concept",
    description:
      "The Stack is a large collection of permissively licensed source code from GitHub repositories, created by BigCode for training Code LLMs. Version 2 is built on Software Heritage archive spanning 619 programming languages with 4x more data than version 1. Includes inspection tools and opt-out process for responsible development.",
    metadata: { year: 2022, organization: "BigCode", category: "dataset" },
  },
  {
    name: "BigCode",
    type: "Organization",
    description:
      "BigCode is an open-scientific collaboration focused on responsible development of Large Language Models for Code. Created StarCoder and StarCoder2 models and The Stack dataset. Emphasizes transparency, including releasing all training data identifiers and maintaining responsible AI licenses.",
    metadata: { type: "research-consortium" },
  },
];

// ============================================================================
// Publications
// ============================================================================

const publications: Entity[] = [
  {
    name: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
    type: "Publication",
    description:
      "Landmark paper introducing Chain-of-Thought prompting, showing that generating intermediate reasoning steps significantly improves LLM performance on complex reasoning tasks. Demonstrated 540B parameter model with 8 CoT exemplars achieving state-of-the-art on GSM8K.",
    metadata: { year: 2022, venue: "NeurIPS 2022", arxiv: "2201.11903" },
  },
  {
    name: "Large Language Models are Zero-Shot Reasoners",
    type: "Publication",
    description:
      "Introduced Zero-shot CoT showing that simply adding 'Let's think step by step' enables LLMs to perform complex reasoning without few-shot examples. Achieved dramatic improvements on MultiArith (17.7% to 78.7%) and GSM8K (10.4% to 40.7%).",
    metadata: { year: 2022, venue: "NeurIPS 2022", arxiv: "2205.11916" },
  },
  {
    name: "Self-Consistency Improves Chain of Thought Reasoning in Language Models",
    type: "Publication",
    description:
      "Proposed Self-Consistency decoding strategy that samples diverse reasoning paths and selects the most consistent answer. Achieved substantial improvements: GSM8K +17.9%, SVAMP +11.0%, AQuA +12.2%.",
    metadata: { year: 2023, venue: "ICLR 2023", arxiv: "2203.11171" },
  },
  {
    name: "Tree of Thoughts: Deliberate Problem Solving with Large Language Models",
    type: "Publication",
    description:
      "Introduced Tree of Thoughts framework generalizing CoT to enable exploration over multiple reasoning paths. Dramatically improved Game of 24 performance from 4% (GPT-4 + CoT) to 74% success rate.",
    metadata: { year: 2023, venue: "NeurIPS 2023", arxiv: "2305.10601" },
  },
  {
    name: "ReAct: Synergizing Reasoning and Acting in Language Models",
    type: "Publication",
    description:
      "Presented ReAct framework combining reasoning traces and actions in an interleaved manner. Demonstrated effectiveness on QA and decision-making tasks, overcoming hallucination through external knowledge interaction.",
    metadata: { year: 2023, venue: "ICLR 2023", arxiv: "2210.03629" },
  },
  {
    name: "Holistic Evaluation of Language Models",
    type: "Publication",
    description:
      "Introduced HELM benchmark measuring 7 metrics across 16 scenarios for 30 models. Improved model evaluation coverage from 17.9% to 96.0%, establishing new standards for transparent LLM assessment.",
    metadata: { year: 2022, venue: "TMLR 2023", arxiv: "2211.09110" },
  },
  {
    name: "Self-Instruct: Aligning Language Models with Self-Generated Instructions",
    type: "Publication",
    description:
      "Introduced framework for improving instruction-following by bootstrapping from model's own generations. Achieved 33% improvement on Super-NaturalInstructions, approaching InstructGPT-001 with minimal human annotation.",
    metadata: { year: 2022, venue: "ACL 2023", arxiv: "2212.10560" },
  },
];

// ============================================================================
// Relations
// ============================================================================

const relations: Relation[] = [
  // Chain-of-Thought family
  {
    from: "Chain-of-Thought Prompting",
    to: "Zero-shot Chain-of-Thought",
    type: "INFLUENCED",
    properties: { description: "Zero-shot CoT simplified CoT to single prompt" },
  },
  {
    from: "Chain-of-Thought Prompting",
    to: "Self-Consistency",
    type: "INFLUENCED",
    properties: { description: "Self-Consistency enhances CoT with diverse sampling" },
  },
  {
    from: "Chain-of-Thought Prompting",
    to: "Tree of Thoughts",
    type: "INFLUENCED",
    properties: { description: "ToT generalizes CoT to tree-structured exploration" },
  },
  {
    from: "Tree of Thoughts",
    to: "ReAct",
    type: "RELATED_TO",
    properties: { description: "Both enable structured reasoning in LLMs" },
  },
  // Person contributions
  {
    from: "Jason Wei",
    to: "Chain-of-Thought Prompting",
    type: "DEVELOPED",
    properties: { role: "first author" },
  },
  {
    from: "Denny Zhou",
    to: "Chain-of-Thought Prompting",
    type: "DEVELOPED",
    properties: { role: "co-author" },
  },
  {
    from: "Denny Zhou",
    to: "Self-Consistency",
    type: "DEVELOPED",
    properties: { role: "co-author" },
  },
  {
    from: "Shunyu Yao",
    to: "Tree of Thoughts",
    type: "DEVELOPED",
    properties: { role: "first author" },
  },
  {
    from: "Shunyu Yao",
    to: "ReAct",
    type: "DEVELOPED",
    properties: { role: "first author" },
  },
  // Model Merging
  {
    from: "TIES-Merging",
    to: "Model Merging",
    type: "IMPLEMENTS",
    properties: { description: "Resolves interference through sign election" },
  },
  {
    from: "DARE",
    to: "Model Merging",
    type: "IMPLEMENTS",
    properties: { description: "Uses dropout and rescaling for merging" },
  },
  {
    from: "Model Soup",
    to: "Model Merging",
    type: "IMPLEMENTS",
    properties: { description: "Simple weight averaging approach" },
  },
  {
    from: "TIES-Merging",
    to: "DARE",
    type: "RELATED_TO",
    properties: { description: "Both address delta parameter interference" },
  },
  // Embedding models
  {
    from: "E5",
    to: "Text Embedding",
    type: "IMPLEMENTS",
    properties: { description: "Contrastive learning from weak supervision" },
  },
  {
    from: "BGE",
    to: "Text Embedding",
    type: "IMPLEMENTS",
    properties: { description: "Chinese and English embeddings" },
  },
  {
    from: "M3-Embedding",
    to: "Text Embedding",
    type: "IMPLEMENTS",
    properties: { description: "Multi-lingual, multi-functional, multi-granularity" },
  },
  {
    from: "E5",
    to: "MTEB",
    type: "EVALUATED_ON",
    properties: { performance: "state-of-the-art" },
  },
  {
    from: "BGE",
    to: "MTEB",
    type: "EVALUATED_ON",
    properties: { performance: "state-of-the-art" },
  },
  {
    from: "M3-Embedding",
    to: "MTEB",
    type: "EVALUATED_ON",
    properties: { performance: "state-of-the-art on multilingual" },
  },
  // Evaluation
  {
    from: "Percy Liang",
    to: "HELM",
    type: "DEVELOPED",
    properties: { role: "lead" },
  },
  {
    from: "HELM",
    to: "BIG-Bench",
    type: "RELATED_TO",
    properties: { description: "Both comprehensive LLM evaluation frameworks" },
  },
  // Knowledge Distillation
  {
    from: "DistilBERT",
    to: "Knowledge Distillation",
    type: "IMPLEMENTS",
    properties: { description: "Distilled from BERT" },
  },
  {
    from: "MiniLM",
    to: "Knowledge Distillation",
    type: "IMPLEMENTS",
    properties: { description: "Self-attention distillation" },
  },
  {
    from: "Victor Sanh",
    to: "DistilBERT",
    type: "DEVELOPED",
    properties: { role: "first author" },
  },
  {
    from: "MeZO",
    to: "LoRA",
    type: "COMPATIBLE_WITH",
    properties: { description: "Can be combined with PEFT methods" },
  },
  // Synthetic Data
  {
    from: "Self-Instruct",
    to: "Synthetic Data Generation",
    type: "IMPLEMENTS",
    properties: { description: "Bootstrapping from model outputs" },
  },
  {
    from: "Evol-Instruct",
    to: "Synthetic Data Generation",
    type: "IMPLEMENTS",
    properties: { description: "Evolving instruction complexity" },
  },
  {
    from: "Self-Instruct",
    to: "Evol-Instruct",
    type: "INFLUENCED",
    properties: { description: "Evol-Instruct builds on self-instruction concept" },
  },
  {
    from: "Evol-Instruct",
    to: "WizardLM",
    type: "USED_IN",
    properties: { description: "WizardLM trained with Evol-Instruct" },
  },
  {
    from: "Evol-Instruct",
    to: "WizardCoder",
    type: "USED_IN",
    properties: { description: "Adapted for code domain" },
  },
  // Code Models
  {
    from: "StarCoder",
    to: "The Stack",
    type: "TRAINED_ON",
    properties: { description: "Trained on permissively licensed code" },
  },
  {
    from: "StarCoder2",
    to: "The Stack",
    type: "TRAINED_ON",
    properties: { version: "v2" },
  },
  {
    from: "StarCoder",
    to: "StarCoder2",
    type: "EVOLVED_INTO",
    properties: { description: "Next generation with larger data" },
  },
  {
    from: "BigCode",
    to: "StarCoder",
    type: "DEVELOPED",
    properties: {},
  },
  {
    from: "BigCode",
    to: "StarCoder2",
    type: "DEVELOPED",
    properties: {},
  },
  {
    from: "BigCode",
    to: "The Stack",
    type: "CREATED",
    properties: {},
  },
  {
    from: "Code Llama",
    to: "Llama 2",
    type: "BASED_ON",
    properties: { description: "Specialized from Llama 2 for code" },
  },
  {
    from: "WizardCoder",
    to: "StarCoder",
    type: "BASED_ON",
    properties: { description: "Fine-tuned with Evol-Instruct" },
  },
  {
    from: "StarCoder",
    to: "HumanEval",
    type: "EVALUATED_ON",
    properties: { score: "40% pass@1" },
  },
  {
    from: "Code Llama",
    to: "HumanEval",
    type: "EVALUATED_ON",
    properties: { score: "67%" },
  },
  // Benchmarks
  {
    from: "Chain-of-Thought Prompting",
    to: "GSM8K",
    type: "EVALUATED_ON",
    properties: { description: "Achieved state-of-the-art" },
  },
  {
    from: "Self-Consistency",
    to: "GSM8K",
    type: "EVALUATED_ON",
    properties: { improvement: "+17.9%" },
  },
  {
    from: "Tree of Thoughts",
    to: "GSM8K",
    type: "RELATED_TO",
    properties: { description: "Evaluated on math reasoning tasks" },
  },
  // Publications
  {
    from: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
    to: "Chain-of-Thought Prompting",
    type: "INTRODUCES",
    properties: {},
  },
  {
    from: "Large Language Models are Zero-Shot Reasoners",
    to: "Zero-shot Chain-of-Thought",
    type: "INTRODUCES",
    properties: {},
  },
  {
    from: "Self-Consistency Improves Chain of Thought Reasoning in Language Models",
    to: "Self-Consistency",
    type: "INTRODUCES",
    properties: {},
  },
  {
    from: "Tree of Thoughts: Deliberate Problem Solving with Large Language Models",
    to: "Tree of Thoughts",
    type: "INTRODUCES",
    properties: {},
  },
  {
    from: "ReAct: Synergizing Reasoning and Acting in Language Models",
    to: "ReAct",
    type: "INTRODUCES",
    properties: {},
  },
  {
    from: "Holistic Evaluation of Language Models",
    to: "HELM",
    type: "INTRODUCES",
    properties: {},
  },
  {
    from: "Self-Instruct: Aligning Language Models with Self-Generated Instructions",
    to: "Self-Instruct",
    type: "INTRODUCES",
    properties: {},
  },
];

// ============================================================================
// Ingestion
// ============================================================================

async function ingest(): Promise<void> {
  const session = driver.session();

  const allEntities: Entity[] = [
    ...reasoningEntities,
    ...mergingEntities,
    ...embeddingEntities,
    ...evaluationEntities,
    ...distillationEntities,
    ...syntheticDataEntities,
    ...codeEntities,
    ...publications,
  ];

  console.log(`\n📚 Advanced Techniques Seed`);
  console.log(`   Entities: ${allEntities.length}`);
  console.log(`   Relations: ${relations.length}`);
  console.log("");

  try {
    // Create entities
    let entityCount = 0;
    for (const entity of allEntities) {
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
          metadata: JSON.stringify(entity.metadata ?? {}),
        }
      );
      entityCount++;
      if (entityCount % 10 === 0) {
        process.stdout.write(`   Creating entities: ${entityCount}/${allEntities.length}\r`);
      }
    }
    console.log(`✅ ${entityCount} entities created/updated`);

    // Create relations
    let relationCount = 0;
    for (const relation of relations) {
      await session.run(
        `
        MATCH (from:Entity {name: $from})
        MATCH (to:Entity {name: $to})
        MERGE (from)-[r:${relation.type}]->(to)
        SET r.properties = $properties,
            r.updatedAt = datetime()
        `,
        {
          from: relation.from,
          to: relation.to,
          properties: JSON.stringify(relation.properties ?? {}),
        }
      );
      relationCount++;
      if (relationCount % 10 === 0) {
        process.stdout.write(`   Creating relations: ${relationCount}/${relations.length}\r`);
      }
    }
    console.log(`✅ ${relationCount} relations created/updated`);

    // Show statistics
    const stats = await session.run(`
      MATCH (n:Entity)
      RETURN n.type as type, count(*) as count
      ORDER BY count DESC
    `);

    console.log("\n📊 Database Statistics:");
    let total = 0;
    for (const record of stats.records) {
      const type = record.get("type");
      const count = record.get("count").toNumber();
      console.log(`   ${type}: ${count}`);
      total += count;
    }
    console.log(`   ─────────────`);
    console.log(`   Total: ${total}`);
  } finally {
    await session.close();
    await driver.close();
  }
}

ingest().catch(console.error);
