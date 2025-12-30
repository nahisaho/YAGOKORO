/**
 * arXiv最新論文シードデータ - 2025年12月
 * Generative AI、LLM、推論、Diffusionなどの最新研究
 */

import neo4j from 'neo4j-driver';
import { randomUUID } from 'node:crypto';

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password')
);

// =============================================================================
// 最新arXiv論文データ (2025年12月)
// =============================================================================

interface Entity {
  id: string;
  type: string;
  name: string;
  description: string;
  metadata?: Record<string, unknown>;
}

interface Relation {
  from: string;
  to: string;
  type: string;
  properties?: Record<string, unknown>;
}

interface BenchmarkEvaluation {
  modelId: string;
  benchmarkId: string;
  score: number;
  metric?: string;
}

// 新しいAIモデル
const newModels: Entity[] = [
  // NVIDIA Nemotron 3ファミリー
  {
    id: 'nemotron-3-nano',
    type: 'AIModel',
    name: 'Nemotron 3 Nano',
    description: 'NVIDIAの30B-A3B MoE Mamba-Transformerハイブリッドモデル。25Tトークンで事前学習、1Mコンテキスト長対応、エージェント推論と会話能力を強化。GPT-OSS-20BやQwen3-30Bより3.3倍高速な推論スループット。',
    metadata: {
      organization: 'NVIDIA',
      parameters: '30B (3B active)',
      architecture: 'MoE Mamba-Transformer Hybrid',
      contextLength: 1000000,
      trainingTokens: '25T',
      releaseYear: 2025,
      arxivId: '2512.20848',
      openWeight: true
    }
  },
  {
    id: 'nemotron-3-super',
    type: 'AIModel',
    name: 'Nemotron 3 Super',
    description: 'Nemotron 3ファミリーの中型モデル。協調エージェントと高ボリュームワークロード（ITチケット自動化など）に最適化。NVFP4とLatentMoEを使用。',
    metadata: {
      organization: 'NVIDIA',
      architecture: 'MoE Mamba-Transformer Hybrid',
      contextLength: 1000000,
      releaseYear: 2025,
      arxivId: '2512.20856',
      openWeight: true
    }
  },
  {
    id: 'nemotron-3-ultra',
    type: 'AIModel',
    name: 'Nemotron 3 Ultra',
    description: 'Nemotron 3ファミリーの最大モデル。最先端の精度と推論性能を提供。MTPレイヤーでテキスト生成を高速化。',
    metadata: {
      organization: 'NVIDIA',
      architecture: 'MoE Mamba-Transformer Hybrid',
      contextLength: 1000000,
      releaseYear: 2025,
      arxivId: '2512.20856',
      openWeight: true
    }
  },
  {
    id: 'agentmath-30b',
    type: 'AIModel',
    name: 'AgentMath-30B-A3B',
    description: '数学推論に特化したツール拡張エージェントモデル。コードインタプリタとの連携により複雑な数学問題を解決。AIME24で90.6%、AIME25で86.4%、HMMT25で73.8%を達成。',
    metadata: {
      organization: 'Unknown',
      parameters: '30B (3B active)',
      architecture: 'Tool-Augmented Agent',
      releaseYear: 2025,
      arxivId: '2512.20745',
      capability: 'Mathematical Reasoning'
    }
  },
  {
    id: 'photon',
    type: 'AIModel',
    name: 'PHOTON',
    description: 'Parallel Hierarchical Operation for Top-down Networks。階層的自己回帰モデルでKV-cacheトラフィックを削減し、メモリ単位で1000倍以上のスループット向上を実現。',
    metadata: {
      organization: 'Unknown',
      architecture: 'Hierarchical Autoregressive',
      releaseYear: 2025,
      arxivId: '2512.20687',
      capability: 'Efficient Inference'
    }
  },
  {
    id: 'smart-slm',
    type: 'AIModel',
    name: 'SMART SLM',
    description: 'Structured Memory and Reasoning Transformer。45.51Mパラメータで構造化メモリとTree LSTMを使用。GPT-2より21.3%高い精度、64%少ないパラメータ。',
    metadata: {
      organization: 'Unknown',
      parameters: '45.51M',
      architecture: 'Memory-Augmented Transformer',
      releaseYear: 2025,
      arxivId: '2512.21280',
      capability: 'Document Assistance'
    }
  }
];

// 新しい研究組織
const newOrganizations: Entity[] = [
  {
    id: 'nvidia-ai-research',
    type: 'Organization',
    name: 'NVIDIA AI Research',
    description: 'NVIDIAのAI研究部門。Nemotron、NEMO、TensorRT-LLMなどの開発を主導。大規模言語モデルと推論効率化に注力。',
    metadata: {
      location: 'Santa Clara, California',
      founded: 1993
    }
  }
];

// 新しい技術・手法
const newTechniques: Entity[] = [
  {
    id: 'moe-mamba-transformer',
    type: 'Technique',
    name: 'MoE Mamba-Transformer Hybrid',
    description: 'Mixture-of-ExpertsとMamba状態空間モデル、Transformerを組み合わせたハイブリッドアーキテクチャ。長コンテキスト処理と推論効率を両立。',
    metadata: {
      category: 'Architecture',
      year: 2025
    }
  },
  {
    id: 'latent-moe',
    type: 'Technique',
    name: 'LatentMoE',
    description: '潜在空間でのMixture-of-Experts。モデル品質を向上させるNVIDIAの新アプローチ。',
    metadata: {
      category: 'Architecture',
      year: 2025
    }
  },
  {
    id: 'mtp-layers',
    type: 'Technique',
    name: 'MTP Layers',
    description: 'Multi-Token Prediction Layers。複数トークンを同時予測しテキスト生成を高速化。',
    metadata: {
      category: 'Inference Optimization',
      year: 2025
    }
  },
  {
    id: 'denoising-entropy',
    type: 'Technique',
    name: 'Denoising Entropy',
    description: 'Masked Diffusion Modelsにおける不確実性を定量化するメトリック。デコーディングパスの最適化に使用。',
    metadata: {
      category: 'Diffusion Models',
      year: 2025,
      arxivId: '2512.21336'
    }
  },
  {
    id: 'agentic-rl',
    type: 'Technique',
    name: 'Agentic Reinforcement Learning',
    description: '自然言語生成とリアルタイムコード実行を動的にインターリーブする強化学習パラダイム。ツール使用戦略を自律学習。',
    metadata: {
      category: 'Training',
      year: 2025,
      arxivId: '2512.20745'
    }
  },
  {
    id: 'sequence-truncation',
    type: 'Technique',
    name: 'Sequence Truncation for Distillation',
    description: '推論蒸留において最初の50%のトークンのみを使用して94%の性能を維持する手法。訓練時間、メモリ、FLOPsを各50%削減。',
    metadata: {
      category: 'Knowledge Distillation',
      year: 2025,
      arxivId: '2512.21002'
    }
  },
  {
    id: 'revffn',
    type: 'Technique',
    name: 'RevFFN',
    description: 'Reversible Feed-Forward Networks。MoE LLMの全パラメータファインチューニングでメモリ効率を改善。逆変換可能なTransformerブロックで中間活性化の保存を不要に。',
    metadata: {
      category: 'Fine-tuning',
      year: 2025,
      arxivId: '2512.20920'
    }
  },
  {
    id: 'samerging',
    type: 'Technique',
    name: 'SAMerging',
    description: 'Sharpness-Aware Minimizationを用いたモデルマージング手法。多教師知識蒸留によりフラットな最小値を発見。',
    metadata: {
      category: 'Model Merging',
      year: 2025,
      arxivId: '2512.21288'
    }
  },
  {
    id: 'neural-probe-hallucination',
    type: 'Technique',
    name: 'Neural Probe Hallucination Detection',
    description: 'MLPプローブを用いたトークンレベルの幻覚検出フレームワーク。隠れ層の状態から非線形モデリングで幻覚を検出。',
    metadata: {
      category: 'Hallucination Detection',
      year: 2025,
      arxivId: '2512.20949'
    }
  },
  {
    id: 'megaRAG',
    type: 'Technique',
    name: 'MegaRAG',
    description: 'マルチモーダル知識グラフベースのRAG。視覚的手がかりを知識グラフ構築、検索、回答生成に統合。',
    metadata: {
      category: 'RAG',
      year: 2025,
      arxivId: '2512.20626'
    }
  }
];

// 新しいベンチマーク
const newBenchmarks: Entity[] = [
  {
    id: 'aime24',
    type: 'Benchmark',
    name: 'AIME 2024',
    description: 'American Invitational Mathematics Examination 2024。高校数学競技の招待制試験。高度な数学的推論能力を評価。',
    metadata: {
      domain: 'Mathematical Reasoning',
      difficulty: 'Competition Level',
      year: 2024
    }
  },
  {
    id: 'aime25',
    type: 'Benchmark',
    name: 'AIME 2025',
    description: 'American Invitational Mathematics Examination 2025。最新の数学競技問題セット。',
    metadata: {
      domain: 'Mathematical Reasoning',
      difficulty: 'Competition Level',
      year: 2025
    }
  },
  {
    id: 'hmmt25',
    type: 'Benchmark',
    name: 'HMMT 2025',
    description: 'Harvard-MIT Mathematics Tournament 2025。ハーバード大学とMITが共催する数学トーナメント問題。',
    metadata: {
      domain: 'Mathematical Reasoning',
      difficulty: 'Competition Level',
      year: 2025
    }
  },
  {
    id: 'longfact',
    type: 'Benchmark',
    name: 'LongFact',
    description: '長文事実性評価ベンチマーク。LLMの幻覚検出と事実的正確性を評価。',
    metadata: {
      domain: 'Factuality',
      year: 2024
    }
  },
  {
    id: 'healthbench',
    type: 'Benchmark',
    name: 'HealthBench',
    description: '医療領域のLLM評価ベンチマーク。医療情報の正確性と幻覚検出能力を測定。',
    metadata: {
      domain: 'Medical',
      year: 2024
    }
  }
];

// 新しい論文
const newPublications: Entity[] = [
  {
    id: 'arxiv-2512-20856',
    type: 'Publication',
    name: 'NVIDIA Nemotron 3: Efficient and Open Intelligence',
    description: 'Nemotron 3ファミリー（Nano、Super、Ultra）の技術レポート。MoE Mamba-Transformerハイブリッドアーキテクチャ、マルチ環境強化学習、1Mトークンコンテキストを紹介。',
    metadata: {
      arxivId: '2512.20856',
      year: 2025,
      month: 12,
      venue: 'arXiv',
      authors: ['NVIDIA']
    }
  },
  {
    id: 'arxiv-2512-20848',
    type: 'Publication',
    name: 'Nemotron 3 Nano: Open, Efficient MoE Hybrid Mamba-Transformer Model for Agentic Reasoning',
    description: 'Nemotron 3 Nano 30B-A3Bの詳細技術レポート。25Tトークン事前学習、SFT、大規模RLによるエージェント・推論・会話能力の強化。',
    metadata: {
      arxivId: '2512.20848',
      year: 2025,
      month: 12,
      venue: 'arXiv',
      authors: ['NVIDIA']
    }
  },
  {
    id: 'arxiv-2512-20745',
    type: 'Publication',
    name: 'AgentMath: Empowering Mathematical Reasoning for LLMs via Tool-Augmented Agent',
    description: 'AgentMathフレームワーク。自動CoT→ツール軌跡変換、エージェントRL、効率的訓練システムを提案。AIME24で90.6%達成。',
    metadata: {
      arxivId: '2512.20745',
      year: 2025,
      month: 12,
      venue: 'arXiv',
      authors: ['Haipeng Luo', 'Huawen Feng', 'Qingfeng Sun', 'Can Xu', 'Kai Zheng']
    }
  },
  {
    id: 'arxiv-2512-21336',
    type: 'Publication',
    name: 'Optimizing Decoding Paths in Masked Diffusion Models by Quantifying Uncertainty',
    description: 'Masked Diffusion ModelsのデコーディングパスをDenoising Entropyで最適化。推論・計画・コードベンチマークで精度向上。',
    metadata: {
      arxivId: '2512.21336',
      year: 2025,
      month: 12,
      venue: 'arXiv',
      authors: ['Ziyu Chen', 'Xinbei Jiang', 'Peng Sun', 'Tao Lin']
    }
  },
  {
    id: 'arxiv-2512-21002',
    type: 'Publication',
    name: 'Distilling the Essence: Efficient Reasoning Distillation via Sequence Truncation',
    description: '推論蒸留の効率化。最初50%のトークンで94%の性能維持、訓練コスト50%削減を実現。',
    metadata: {
      arxivId: '2512.21002',
      year: 2025,
      month: 12,
      venue: 'arXiv',
      authors: ['Wei-Rui Chen', 'Vignesh Kothapalli', 'Ata Fatahibaarzi', 'Hejian Sang', 'Shao Tang']
    }
  },
  {
    id: 'arxiv-2512-20687',
    type: 'Publication',
    name: 'PHOTON: Hierarchical Autoregressive Modeling for Lightspeed and Memory-Efficient Language Generation',
    description: 'PHOTONアーキテクチャ。階層的多解像度コンテキストアクセスでKV-cacheトラフィック削減、メモリ単位1000倍スループット向上。',
    metadata: {
      arxivId: '2512.20687',
      year: 2025,
      month: 12,
      venue: 'arXiv',
      authors: ['Yuma Ichikawa', 'Naoya Takagi', 'Takumi Nakagawa', 'Yuzi Kanazawa', 'Akira Sakai']
    }
  },
  {
    id: 'arxiv-2512-20626',
    type: 'Publication',
    name: 'MegaRAG: Multimodal Knowledge Graph-Based Retrieval Augmented Generation',
    description: 'マルチモーダル知識グラフRAG。視覚的手がかりをKG構築・検索・回答生成に統合、クロスモーダル推論を実現。',
    metadata: {
      arxivId: '2512.20626',
      year: 2025,
      month: 12,
      venue: 'arXiv',
      authors: ['Chi-Hsiang Hsiao', 'Yi-Cheng Wang', 'Tzung-Sheng Lin', 'Yi-Ren Yeh', 'Chu-Song Chen']
    }
  },
  {
    id: 'arxiv-2512-20920',
    type: 'Publication',
    name: 'RevFFN: Memory-Efficient Full-Parameter Fine-Tuning of MoE LLMs with Reversible Blocks',
    description: 'RevFFN手法。逆変換可能Transformerブロックで中間活性化の保存不要化、単一GPUでの全パラメータファインチューニングを実現。',
    metadata: {
      arxivId: '2512.20920',
      year: 2025,
      month: 12,
      venue: 'arXiv',
      authors: ['Ningyuan Liu', 'Jing Yang', 'Kaitong Cai', 'Keze Wang']
    }
  },
  {
    id: 'arxiv-2512-21288',
    type: 'Publication',
    name: 'Model Merging via Multi-Teacher Knowledge Distillation',
    description: 'SAMergingによるモデルマージング。PAC-Bayes汎化境界とSharpness-Aware Minimizationでフラット最小値発見。',
    metadata: {
      arxivId: '2512.21288',
      year: 2025,
      month: 12,
      venue: 'arXiv',
      authors: ['Seyed Arshan Dalili', 'Mehrdad Mahdavi']
    }
  },
  {
    id: 'arxiv-2512-20949',
    type: 'Publication',
    name: 'Neural Probe-Based Hallucination Detection for Large Language Models',
    description: 'MLPプローブによるトークンレベル幻覚検出。隠れ層の非線形モデリング、ベイズ最適化による層選択。LongFact、HealthBench、TriviaQAでSOTA。',
    metadata: {
      arxivId: '2512.20949',
      year: 2025,
      month: 12,
      venue: 'arXiv',
      authors: ['Shize Liang', 'Hongzhi Wang']
    }
  },
  {
    id: 'arxiv-2512-21280',
    type: 'Publication',
    name: 'SMART SLM: Structured Memory and Reasoning Transformer for Document Assistance',
    description: 'SMART SLMアーキテクチャ。Tree LSTM、MANN、6層Transformerで45Mパラメータ。GPT-2より21.3%高精度。',
    metadata: {
      arxivId: '2512.21280',
      year: 2025,
      month: 12,
      venue: 'arXiv',
      authors: ['Divij Dudeja', 'Mayukha Pal']
    }
  }
];

// 新しいコンセプト
const newConcepts: Entity[] = [
  {
    id: 'granular-reasoning-budget',
    type: 'Concept',
    name: 'Granular Reasoning Budget Control',
    description: '推論予算の粒度制御。計算リソースの動的配分により、タスクの複雑さに応じた推論深度を調整。',
    metadata: {
      domain: 'LLM Efficiency',
      year: 2025
    }
  },
  {
    id: 'multi-environment-rl',
    type: 'Concept',
    name: 'Multi-Environment Reinforcement Learning',
    description: '複数環境での強化学習。推論、マルチステップツール使用、粒度別推論予算制御を同時に学習。',
    metadata: {
      domain: 'Training',
      year: 2025
    }
  },
  {
    id: 'cross-task-heterogeneity',
    type: 'Concept',
    name: 'Cross-Task Heterogeneity',
    description: 'モデルマージングにおけるタスク間異質性。ファインチューンモデルの事前分布とマルチタスク分布のミスマッチを表す。',
    metadata: {
      domain: 'Model Merging',
      year: 2025
    }
  }
];

// 関係性の定義
const relations: Relation[] = [
  // Nemotron 3ファミリー
  { from: 'nemotron-3-nano', to: 'nvidia-ai-research', type: 'DEVELOPED_BY' },
  { from: 'nemotron-3-super', to: 'nvidia-ai-research', type: 'DEVELOPED_BY' },
  { from: 'nemotron-3-ultra', to: 'nvidia-ai-research', type: 'DEVELOPED_BY' },
  { from: 'nemotron-3-nano', to: 'moe-mamba-transformer', type: 'USES_TECHNIQUE' },
  { from: 'nemotron-3-super', to: 'moe-mamba-transformer', type: 'USES_TECHNIQUE' },
  { from: 'nemotron-3-ultra', to: 'moe-mamba-transformer', type: 'USES_TECHNIQUE' },
  { from: 'nemotron-3-super', to: 'latent-moe', type: 'USES_TECHNIQUE' },
  { from: 'nemotron-3-ultra', to: 'latent-moe', type: 'USES_TECHNIQUE' },
  { from: 'nemotron-3-super', to: 'mtp-layers', type: 'USES_TECHNIQUE' },
  { from: 'nemotron-3-ultra', to: 'mtp-layers', type: 'USES_TECHNIQUE' },
  { from: 'nemotron-3-nano', to: 'multi-environment-rl', type: 'USES_TECHNIQUE' },
  
  // 論文とモデル・技術の関係
  { from: 'arxiv-2512-20856', to: 'nemotron-3-nano', type: 'DESCRIBES' },
  { from: 'arxiv-2512-20856', to: 'nemotron-3-super', type: 'DESCRIBES' },
  { from: 'arxiv-2512-20856', to: 'nemotron-3-ultra', type: 'DESCRIBES' },
  { from: 'arxiv-2512-20848', to: 'nemotron-3-nano', type: 'DESCRIBES' },
  { from: 'arxiv-2512-20745', to: 'agentmath-30b', type: 'DESCRIBES' },
  { from: 'arxiv-2512-20745', to: 'agentic-rl', type: 'DESCRIBES' },
  { from: 'arxiv-2512-21336', to: 'denoising-entropy', type: 'DESCRIBES' },
  { from: 'arxiv-2512-21002', to: 'sequence-truncation', type: 'DESCRIBES' },
  { from: 'arxiv-2512-20687', to: 'photon', type: 'DESCRIBES' },
  { from: 'arxiv-2512-20626', to: 'megaRAG', type: 'DESCRIBES' },
  { from: 'arxiv-2512-20920', to: 'revffn', type: 'DESCRIBES' },
  { from: 'arxiv-2512-21288', to: 'samerging', type: 'DESCRIBES' },
  { from: 'arxiv-2512-20949', to: 'neural-probe-hallucination', type: 'DESCRIBES' },
  { from: 'arxiv-2512-21280', to: 'smart-slm', type: 'DESCRIBES' },
  
  // AgentMathと技術
  { from: 'agentmath-30b', to: 'agentic-rl', type: 'USES_TECHNIQUE' },
  
  // コンセプトの関係
  { from: 'granular-reasoning-budget', to: 'nemotron-3-nano', type: 'EXEMPLIFIED_BY' },
  { from: 'multi-environment-rl', to: 'nemotron-3-nano', type: 'USED_IN' },
  { from: 'cross-task-heterogeneity', to: 'samerging', type: 'ADDRESSED_BY' },
  
  // 既存モデルとの関係（データベース内のIDを参照）
  { from: 'nemotron-3-nano', to: 'qwen-2.5', type: 'OUTPERFORMS', properties: { benchmark: 'throughput', factor: '3.3x' } },
  { from: 'moe-mamba-transformer', to: 'mamba', type: 'BASED_ON' },
  { from: 'moe-mamba-transformer', to: 'mixture-of-experts', type: 'BASED_ON' },
  { from: 'megaRAG', to: 'graphrag', type: 'EXTENDS' },
  
  // PHOTONの関係
  { from: 'photon', to: 'kv-cache', type: 'OPTIMIZES' },
];

// ベンチマーク評価
const benchmarkEvaluations: BenchmarkEvaluation[] = [
  // AgentMath評価
  { modelId: 'agentmath-30b', benchmarkId: 'aime24', score: 90.6, metric: 'accuracy' },
  { modelId: 'agentmath-30b', benchmarkId: 'aime25', score: 86.4, metric: 'accuracy' },
  { modelId: 'agentmath-30b', benchmarkId: 'hmmt25', score: 73.8, metric: 'accuracy' },
];

// =============================================================================
// データベース操作
// =============================================================================

async function ingestEntities(session: neo4j.Session, entities: Entity[]): Promise<number> {
  let count = 0;
  for (const entity of entities) {
    const query = `
      MERGE (e:Entity {id: $id})
      SET e.type = $type,
          e.name = $name,
          e.description = $description,
          e.metadata = $metadata,
          e.updatedAt = datetime()
    `;
    await session.run(query, {
      id: entity.id,
      type: entity.type,
      name: entity.name,
      description: entity.description,
      metadata: JSON.stringify(entity.metadata || {})
    });
    count++;
  }
  return count;
}

async function ingestRelations(session: neo4j.Session, relations: Relation[]): Promise<number> {
  let count = 0;
  for (const rel of relations) {
    // Check if both entities exist
    const checkQuery = `
      MATCH (from:Entity {id: $from}), (to:Entity {id: $to})
      RETURN from, to
    `;
    const result = await session.run(checkQuery, { from: rel.from, to: rel.to });
    
    if (result.records.length > 0) {
      const createQuery = `
        MATCH (from:Entity {id: $from}), (to:Entity {id: $to})
        MERGE (from)-[r:${rel.type}]->(to)
        SET r.properties = $properties
      `;
      await session.run(createQuery, {
        from: rel.from,
        to: rel.to,
        properties: JSON.stringify(rel.properties || {})
      });
      count++;
    }
  }
  return count;
}

async function ingestBenchmarkEvaluations(
  session: neo4j.Session, 
  evaluations: BenchmarkEvaluation[]
): Promise<number> {
  let count = 0;
  for (const eval_ of evaluations) {
    const query = `
      MATCH (m:Entity {id: $modelId}), (b:Entity {id: $benchmarkId})
      MERGE (m)-[r:EVALUATED_ON]->(b)
      SET r.score = $score,
          r.metric = $metric,
          r.updatedAt = datetime()
    `;
    const result = await session.run(query, {
      modelId: eval_.modelId,
      benchmarkId: eval_.benchmarkId,
      score: eval_.score,
      metric: eval_.metric || 'score'
    });
    
    if (result.summary.counters.updates().relationshipsCreated > 0 ||
        result.summary.counters.updates().propertiesSet > 0) {
      count++;
    }
  }
  return count;
}

async function main() {
  const session = driver.session();
  
  try {
    console.log('📚 arXiv最新論文データのインジェスト開始...\n');
    
    // エンティティ追加
    const allEntities = [
      ...newModels,
      ...newOrganizations,
      ...newTechniques,
      ...newBenchmarks,
      ...newPublications,
      ...newConcepts
    ];
    
    const entityCount = await ingestEntities(session, allEntities);
    console.log(`✅ ${entityCount} エンティティを追加/更新`);
    console.log(`   - AIModels: ${newModels.length}`);
    console.log(`   - Organizations: ${newOrganizations.length}`);
    console.log(`   - Techniques: ${newTechniques.length}`);
    console.log(`   - Benchmarks: ${newBenchmarks.length}`);
    console.log(`   - Publications: ${newPublications.length}`);
    console.log(`   - Concepts: ${newConcepts.length}`);
    
    // 関係性追加
    const relationCount = await ingestRelations(session, relations);
    console.log(`✅ ${relationCount} 関係を追加`);
    
    // ベンチマーク評価追加
    const evalCount = await ingestBenchmarkEvaluations(session, benchmarkEvaluations);
    console.log(`✅ ${evalCount} ベンチマーク評価を追加`);
    
    // 統計表示
    const statsResult = await session.run(`
      MATCH (e:Entity)
      RETURN e.type as type, count(*) as count
      ORDER BY count DESC
    `);
    
    console.log('\n📊 データベース統計:');
    for (const record of statsResult.records) {
      console.log(`   ${record.get('type')}: ${record.get('count')}`);
    }
    
    const totalResult = await session.run(`
      MATCH (e:Entity) RETURN count(e) as total
    `);
    console.log(`\n   総エンティティ数: ${totalResult.records[0].get('total')}`);
    
    const relResult = await session.run(`
      MATCH ()-[r]->() RETURN count(r) as total
    `);
    console.log(`   総関係数: ${relResult.records[0].get('total')}`);
    
    console.log('\n✨ arXiv論文データのインジェスト完了！');
    
  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch(console.error);
