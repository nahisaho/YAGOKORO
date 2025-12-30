/**
 * Infrastructure, Multimodal, and Alignment Techniques Seed Data
 * 
 * Covers:
 * - Quantization: GPTQ, AWQ, LLM-FP4
 * - Efficient Attention: Flash Attention, PagedAttention, vLLM
 * - Multimodal: CLIP, BLIP, Flamingo, LLaVA, Qwen-VL
 * - Speech: Whisper, Distil-Whisper
 * - Alignment: DPO, ORPO, IPO
 * - Serving: vLLM, TensorRT-LLM
 */

import neo4j from "neo4j-driver";

const driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "password")
);

interface Entity {
  type: string;
  name: string;
  description: string;
  properties?: Record<string, string | number | string[]>;
}

interface Relation {
  from: string;
  to: string;
  type: string;
  properties?: Record<string, string | number>;
}

// ============================================================================
// ENTITIES
// ============================================================================

const entities: Entity[] = [
  // =========== CONCEPTS ===========
  {
    type: "Concept",
    name: "Model Quantization",
    description: "モデルの重みや活性化を低精度（INT8, INT4, FP4など）に圧縮する技術。メモリ使用量削減と推論高速化を実現。Post-training quantization (PTQ)とQuantization-aware training (QAT)の2つの主要アプローチがある。",
    properties: {
      aliases: ["量子化", "Weight Quantization", "モデル圧縮"],
      domain: "Model Optimization"
    }
  },
  {
    type: "Concept",
    name: "Efficient Attention",
    description: "Transformerのself-attention計算を効率化する技術群。標準的なattentionはO(n²)の計算量だが、IO-aware設計やKVキャッシュ管理により大幅な高速化が可能。",
    properties: {
      aliases: ["効率的Attention", "Attention Optimization"],
      domain: "Architecture Optimization"
    }
  },
  {
    type: "Concept",
    name: "Vision-Language Models",
    description: "画像・動画とテキストを統合的に理解・生成するマルチモーダルAIモデル。CLIP以降、対照学習やクロスモーダルアライメントが主要技術となっている。",
    properties: {
      aliases: ["VLM", "マルチモーダルモデル", "Vision-Language Pretraining"],
      domain: "Multimodal AI"
    }
  },
  {
    type: "Concept",
    name: "Preference Alignment",
    description: "人間の好みに沿ってLLMの出力を調整する技術。RLHFが先駆けだが、DPOやORPOなどより効率的な手法が登場。報酬モデルなしで直接最適化可能。",
    properties: {
      aliases: ["選好アライメント", "RLHF Alternative", "Human Alignment"],
      domain: "Alignment"
    }
  },
  {
    type: "Concept",
    name: "Speech Recognition",
    description: "音声をテキストに変換する技術（ASR）。Whisperにより大規模弱教師あり学習でロバスト性が大幅向上。多言語対応と長時間音声処理が課題。",
    properties: {
      aliases: ["音声認識", "ASR", "Speech-to-Text", "STT"],
      domain: "Speech Processing"
    }
  },
  {
    type: "Concept",
    name: "LLM Serving",
    description: "大規模言語モデルを本番環境で効率的に提供するシステム設計。バッチ処理、KVキャッシュ管理、連続バッチングなどが重要技術。",
    properties: {
      aliases: ["LLMサービング", "Model Serving", "Inference Optimization"],
      domain: "MLOps"
    }
  },

  // =========== QUANTIZATION TECHNIQUES ===========
  {
    type: "Technique",
    name: "GPTQ",
    description: "近似二次情報を用いたワンショット量子化手法。GPT-175Bを約4GPU時間で3-4bitに量子化可能。精度劣化を最小限に抑えながら、175Bモデルを単一GPUで実行可能にした画期的手法。ICLR 2023で発表。",
    properties: {
      arxivId: "2210.17323",
      year: 2022,
      domain: "Quantization",
      precision: "3-4 bit",
      speedup: "3.25-4.5x"
    }
  },
  {
    type: "Technique",
    name: "AWQ",
    description: "Activation-aware Weight Quantization。活性化分布を参照して重要な重みチャネルを特定・保護する量子化手法。重みの1%を保護するだけで量子化誤差を大幅削減。MLSys 2024 Best Paper。70B Llama-2をモバイルGPUで実行可能に。",
    properties: {
      arxivId: "2306.00978",
      year: 2023,
      domain: "Quantization",
      precision: "4 bit",
      speedup: "3x over FP16"
    }
  },
  {
    type: "Technique",
    name: "LLM-FP4",
    description: "4bit浮動小数点量子化手法。整数量子化より柔軟で、長い尾を持つ分布に適応。重みと活性化の両方を4bitに量子化し、LLaMA-13Bで平均63.1のスコアを達成。EMNLP 2023で発表。",
    properties: {
      arxivId: "2310.16836",
      year: 2023,
      domain: "Quantization",
      precision: "FP4"
    }
  },
  {
    type: "Technique",
    name: "GGUF",
    description: "llama.cpp用のモデルフォーマット。CPU推論に最適化された量子化形式で、Q4_0, Q5_K_M等の様々な量子化レベルをサポート。メタデータとモデルを単一ファイルに格納。",
    properties: {
      year: 2023,
      domain: "Model Format",
      developer: "ggerganov"
    }
  },

  // =========== EFFICIENT ATTENTION ===========
  {
    type: "Technique",
    name: "Flash Attention",
    description: "IO-awareな正確なattentionアルゴリズム。タイリングによりGPUメモリ階層を最適活用し、HBMアクセスを削減。BERT-largeで15%、GPT-2で3倍の訓練高速化を実現。Path-X (16K)で61.4%精度を達成した初のTransformer。",
    properties: {
      arxivId: "2205.14135",
      year: 2022,
      developer: "Stanford",
      author: "Tri Dao"
    }
  },
  {
    type: "Technique",
    name: "Flash Attention 2",
    description: "Flash Attentionの改良版。並列化とワーク分割を最適化し、A100で理論最大FLOPs/sの50-73%を達成。GPT訓練で225 TFLOPs/s（モデルFLOPs効率72%）。シングルヘッドでも並列化可能。",
    properties: {
      arxivId: "2307.08691",
      year: 2023,
      speedup: "2x over FlashAttention v1"
    }
  },
  {
    type: "Technique",
    name: "PagedAttention",
    description: "OSの仮想メモリとページングに着想を得たKVキャッシュ管理手法。メモリの断片化と重複を解消し、バッチサイズを大幅に増加可能。vLLMの基盤技術。SOSP 2023で発表。",
    properties: {
      arxivId: "2309.06180",
      year: 2023,
      venue: "SOSP 2023"
    }
  },

  // =========== LLM SERVING SYSTEMS ===========
  {
    type: "AIModel",
    name: "vLLM",
    description: "PagedAttentionを実装した高スループットLLMサービングシステム。KVキャッシュのメモリ無駄をほぼゼロに削減し、FasterTransformerやOrcaと比較して2-4倍のスループット向上。オープンソースで公開。",
    properties: {
      arxivId: "2309.06180",
      year: 2023,
      developer: "UC Berkeley",
      type: "Inference Framework"
    }
  },
  {
    type: "AIModel",
    name: "TinyChat",
    description: "AWQと連携する効率的な4bit推論フレームワーク。カーネルフュージョンとプラットフォーム対応重みパッキングにより、デスクトップとモバイルGPUで3倍以上の高速化を実現。",
    properties: {
      year: 2023,
      developer: "MIT",
      type: "Inference Framework"
    }
  },

  // =========== MULTIMODAL MODELS ===========
  {
    type: "AIModel",
    name: "CLIP",
    description: "Contrastive Language-Image Pre-training。4億の画像テキストペアで対照学習を実施。ゼロショットでImageNet上でResNet-50と同等の精度を達成。30以上のデータセットでタスク特化モデルに匹敵。マルチモーダルAIの基盤モデル。",
    properties: {
      arxivId: "2103.00020",
      year: 2021,
      developer: "OpenAI",
      trainingData: "400M image-text pairs"
    }
  },
  {
    type: "AIModel",
    name: "BLIP",
    description: "Bootstrapping Language-Image Pre-training。キャプション生成器とフィルターによりノイジーなWebデータを効果的に活用。画像テキスト検索で+2.7%、キャプショニングで+2.8% CIDEr向上。理解と生成の両タスクで最先端。",
    properties: {
      arxivId: "2201.12086",
      year: 2022,
      developer: "Salesforce"
    }
  },
  {
    type: "AIModel",
    name: "BLIP-2",
    description: "凍結した画像エンコーダとLLMを軽量なQ-Formerで橋渡し。Flamingo-80Bを54倍少ないパラメータで8.7%上回る（ゼロショットVQAv2）。効率的なVLPの新パラダイム。",
    properties: {
      arxivId: "2301.12597",
      year: 2023,
      developer: "Salesforce"
    }
  },
  {
    type: "AIModel",
    name: "Flamingo",
    description: "Few-shot学習可能なVisual Language Model。任意にインターリーブされた画像/動画とテキストを処理。大規模マルチモーダルWebコーパスで訓練し、少数例で新タスクに適応。NeurIPS 2022。",
    properties: {
      arxivId: "2204.14198",
      year: 2022,
      developer: "DeepMind",
      parameters: "80B"
    }
  },
  {
    type: "AIModel",
    name: "LLaVA",
    description: "Large Language and Vision Assistant。GPT-4で生成した視覚指示データで訓練した初のマルチモーダルLLM。CLIP-ViTとVicunaを結合し、GPT-4対比で85.1%のスコア。NeurIPS 2023 Oral。",
    properties: {
      arxivId: "2304.08485",
      year: 2023,
      developer: "Microsoft/Wisconsin"
    }
  },
  {
    type: "AIModel",
    name: "LLaVA-1.5",
    description: "LLaVAの改良版。CLIP-ViT-L-336pxとMLP projectionを採用し、1.2Mの公開データのみで11ベンチマークでSOTA。単一8-A100ノードで約1日で訓練可能。CVPR 2024 Highlight。",
    properties: {
      arxivId: "2310.03744",
      year: 2023,
      developer: "Wisconsin"
    }
  },
  {
    type: "AIModel",
    name: "Qwen-VL",
    description: "Qwen-LMベースの大規模VLM。視覚受容器、入出力インターフェース、3段階訓練パイプライン、多言語マルチモーダルコーパスを設計。グラウンディングとOCR能力を実装。",
    properties: {
      arxivId: "2308.12966",
      year: 2023,
      developer: "Alibaba"
    }
  },

  // =========== SPEECH MODELS ===========
  {
    type: "AIModel",
    name: "Whisper",
    description: "68万時間の多言語・マルチタスク弱教師ありデータで訓練した音声認識モデル。ゼロショットで標準ベンチマークと競争力があり、人間に近い精度とロバスト性を達成。OpenAIが公開。",
    properties: {
      arxivId: "2212.04356",
      year: 2022,
      developer: "OpenAI",
      trainingData: "680K hours",
      parameters: "1.5B (large)"
    }
  },
  {
    type: "AIModel",
    name: "Distil-Whisper",
    description: "Whisperの蒸留モデル。大規模疑似ラベリングで訓練し、5.8倍高速・51%パラメータ削減でOODテストでWER 1%以内。Speculative decodingでWhisperと組み合わせると2倍高速化。",
    properties: {
      arxivId: "2311.00430",
      year: 2023,
      developer: "Hugging Face"
    }
  },

  // =========== ALIGNMENT TECHNIQUES ===========
  {
    type: "Technique",
    name: "DPO",
    description: "Direct Preference Optimization。報酬モデルを使わず、選好データから直接ポリシーを最適化。RLHFの目的関数を閉形式で解き、単純な分類損失に帰着。PPOベースRLHFより安定で高品質。NeurIPS 2023。",
    properties: {
      arxivId: "2305.18290",
      year: 2023,
      developer: "Stanford"
    }
  },
  {
    type: "Technique",
    name: "ORPO",
    description: "Odds Ratio Preference Optimization。参照モデルなしのモノリシック選好最適化。SFTと選好アライメントを単一段階で実行。Mistral-7BでAlpacaEval 12.20%、MT-Bench 7.32を達成。",
    properties: {
      arxivId: "2403.07691",
      year: 2024,
      developer: "KAIST"
    }
  },
  {
    type: "Technique",
    name: "IPO",
    description: "Identity Preference Optimization。ψPOフレームワークでψを恒等関数に設定。DPOの理論的限界を回避し、選好データから直接最適化。理論的保証付き。",
    properties: {
      arxivId: "2310.12036",
      year: 2023,
      developer: "DeepMind"
    }
  },
  {
    type: "Technique",
    name: "RLHF",
    description: "Reinforcement Learning from Human Feedback。人間の選好から報酬モデルを訓練し、PPOでLLMを最適化。InstructGPT、ChatGPTの基盤技術だが、複雑で不安定という課題がある。",
    properties: {
      year: 2022,
      developer: "OpenAI/Anthropic"
    }
  },
  {
    type: "Technique",
    name: "PPO",
    description: "Proximal Policy Optimization。信頼領域制約付きの方策勾配法。RLHFで標準的に使用される強化学習アルゴリズム。安定だが計算コストが高い。",
    properties: {
      year: 2017,
      developer: "OpenAI"
    }
  },

  // =========== PERSONS ===========
  {
    type: "Person",
    name: "Tri Dao",
    description: "Flash Attentionの開発者。Stanford大学。IO-awareなアルゴリズム設計でTransformerの効率を大幅改善。現在はTogether AIでも活動。",
    properties: {
      affiliation: "Stanford/Together AI"
    }
  },
  {
    type: "Person",
    name: "Alec Radford",
    description: "OpenAIの研究者。GPT、CLIP、Whisperなど多くの基盤モデルの開発に貢献。自然言語処理とマルチモーダルAIの先駆者。",
    properties: {
      affiliation: "OpenAI"
    }
  },
  {
    type: "Person",
    name: "Jong Wook Kim",
    description: "OpenAIの研究者。CLIPとWhisperの共同開発者。マルチモーダル学習と音声認識の専門家。",
    properties: {
      affiliation: "OpenAI"
    }
  },
  {
    type: "Person",
    name: "Junnan Li",
    description: "SalesforceのAI研究者。BLIPシリーズの主要開発者。Vision-Language Pre-trainingの効率化に貢献。",
    properties: {
      affiliation: "Salesforce"
    }
  },
  {
    type: "Person",
    name: "Haotian Liu",
    description: "University of Wisconsin-Madison。LLaVAシリーズの主要開発者。Visual Instruction Tuningを提唱。",
    properties: {
      affiliation: "UW-Madison"
    }
  },
  {
    type: "Person",
    name: "Rafael Rafailov",
    description: "Stanford大学。DPO（Direct Preference Optimization）の主要開発者。アライメント手法の効率化に貢献。",
    properties: {
      affiliation: "Stanford"
    }
  },
  {
    type: "Person",
    name: "Chelsea Finn",
    description: "Stanford大学教授。Meta-learning、Robot learningの専門家。DPOの共著者でもあり、アライメント研究にも貢献。",
    properties: {
      affiliation: "Stanford"
    }
  },
  {
    type: "Person",
    name: "Woosuk Kwon",
    description: "UC Berkeley。PagedAttentionとvLLMの主要開発者。LLMサービングの効率化に大きく貢献。",
    properties: {
      affiliation: "UC Berkeley"
    }
  },

  // =========== ORGANIZATIONS ===========
  {
    type: "Organization",
    name: "Salesforce Research",
    description: "Salesforceの研究部門。BLIPシリーズ、CodeGen等のオープンソースモデルを開発。Enterprise AIに強み。",
    properties: {
      location: "San Francisco, USA"
    }
  },
  {
    type: "Organization",
    name: "Together AI",
    description: "オープンソースAIに注力するスタートアップ。Flash Attentionの開発者Tri Daoが参画。分散推論とファインチューニングプラットフォームを提供。",
    properties: {
      location: "San Francisco, USA",
      founded: 2022
    }
  },

  // =========== BENCHMARKS ===========
  {
    type: "Benchmark",
    name: "VQAv2",
    description: "Visual Question Answering v2。画像に関する自然言語質問に回答するベンチマーク。265Kの画像、110万以上の質問。VLM評価の標準。",
    properties: {
      domain: "Vision-Language",
      task: "Visual QA"
    }
  },
  {
    type: "Benchmark",
    name: "COCO Captioning",
    description: "MS COCOデータセットを用いた画像キャプショニングベンチマーク。CIDErスコアで評価。画像記述能力の標準評価。",
    properties: {
      domain: "Vision-Language",
      task: "Image Captioning"
    }
  },
  {
    type: "Benchmark",
    name: "AlpacaEval",
    description: "LLMの指示追従能力を評価するベンチマーク。GPT-4との比較で勝率を測定。2.0ではLength-controlled版も追加。アライメント評価の標準。",
    properties: {
      domain: "Language",
      task: "Instruction Following"
    }
  },
  {
    type: "Benchmark",
    name: "MT-Bench",
    description: "マルチターン会話能力を評価するベンチマーク。GPT-4による自動評価で1-10スコア。8カテゴリ80質問。LLMの会話品質評価に使用。",
    properties: {
      domain: "Language",
      task: "Multi-turn Dialogue"
    }
  },
  {
    type: "Benchmark",
    name: "LibriSpeech",
    description: "1000時間の読み上げ英語音声データセット。音声認識の標準ベンチマーク。Clean/Otherのサブセットで評価。",
    properties: {
      domain: "Speech",
      task: "Speech Recognition",
      hours: 1000
    }
  },

  // =========== PUBLICATIONS ===========
  {
    type: "Publication",
    name: "Learning Transferable Visual Models From Natural Language Supervision",
    description: "CLIP論文。対照学習による画像テキスト事前学習を提案。4億ペアでの訓練により、ゼロショット転移で優れた性能。マルチモーダルAIの転換点。",
    properties: {
      arxivId: "2103.00020",
      year: 2021,
      venue: "ICML 2021",
      authors: ["Alec Radford", "Jong Wook Kim", "et al."]
    }
  },
  {
    type: "Publication",
    name: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness",
    description: "Flash Attention論文。IO-awareなアルゴリズム設計により、正確なattentionを高速化。長系列Transformerの訓練を実現可能に。",
    properties: {
      arxivId: "2205.14135",
      year: 2022,
      venue: "NeurIPS 2022",
      authors: ["Tri Dao", "Daniel Y. Fu", "et al."]
    }
  },
  {
    type: "Publication",
    name: "Direct Preference Optimization: Your Language Model is Secretly a Reward Model",
    description: "DPO論文。RLHFを閉形式で解き、分類損失に帰着。報酬モデルなしで選好学習を実現し、アライメント研究に革命をもたらした。",
    properties: {
      arxivId: "2305.18290",
      year: 2023,
      venue: "NeurIPS 2023",
      authors: ["Rafael Rafailov", "Archit Sharma", "Chelsea Finn", "et al."]
    }
  },
  {
    type: "Publication",
    name: "Visual Instruction Tuning",
    description: "LLaVA論文。GPT-4で生成した視覚指示データでLLMをチューニング。マルチモーダル指示追従の初期成功例。NeurIPS 2023 Oral。",
    properties: {
      arxivId: "2304.08485",
      year: 2023,
      venue: "NeurIPS 2023 Oral",
      authors: ["Haotian Liu", "Chunyuan Li", "Yong Jae Lee"]
    }
  },
  {
    type: "Publication",
    name: "Robust Speech Recognition via Large-Scale Weak Supervision",
    description: "Whisper論文。68万時間の弱教師ありデータで訓練し、ゼロショットで人間に近い精度とロバスト性を達成。音声認識のスケーリング法則を実証。",
    properties: {
      arxivId: "2212.04356",
      year: 2022,
      authors: ["Alec Radford", "Jong Wook Kim", "Ilya Sutskever", "et al."]
    }
  }
];

// ============================================================================
// RELATIONS
// ============================================================================

const relations: Relation[] = [
  // === Quantization Relations ===
  { from: "GPTQ", to: "Model Quantization", type: "IMPLEMENTS" },
  { from: "AWQ", to: "Model Quantization", type: "IMPLEMENTS" },
  { from: "LLM-FP4", to: "Model Quantization", type: "IMPLEMENTS" },
  { from: "GGUF", to: "Model Quantization", type: "IMPLEMENTS" },
  { from: "AWQ", to: "GPTQ", type: "IMPROVES", properties: { aspect: "activation-aware protection" } },
  { from: "LLM-FP4", to: "GPTQ", type: "RELATED_TO", properties: { aspect: "floating-point vs integer" } },
  { from: "TinyChat", to: "AWQ", type: "IMPLEMENTS" },

  // === Efficient Attention Relations ===
  { from: "Flash Attention", to: "Efficient Attention", type: "IMPLEMENTS" },
  { from: "Flash Attention 2", to: "Efficient Attention", type: "IMPLEMENTS" },
  { from: "PagedAttention", to: "Efficient Attention", type: "IMPLEMENTS" },
  { from: "Flash Attention 2", to: "Flash Attention", type: "IMPROVES", properties: { speedup: "2x" } },
  { from: "vLLM", to: "PagedAttention", type: "IMPLEMENTS" },
  { from: "vLLM", to: "LLM Serving", type: "IMPLEMENTS" },
  { from: "Tri Dao", to: "Flash Attention", type: "DEVELOPED" },
  { from: "Tri Dao", to: "Flash Attention 2", type: "DEVELOPED" },
  { from: "Woosuk Kwon", to: "PagedAttention", type: "DEVELOPED" },
  { from: "Woosuk Kwon", to: "vLLM", type: "DEVELOPED" },

  // === Multimodal Model Relations ===
  { from: "CLIP", to: "Vision-Language Models", type: "BELONGS_TO" },
  { from: "BLIP", to: "Vision-Language Models", type: "BELONGS_TO" },
  { from: "BLIP-2", to: "Vision-Language Models", type: "BELONGS_TO" },
  { from: "Flamingo", to: "Vision-Language Models", type: "BELONGS_TO" },
  { from: "LLaVA", to: "Vision-Language Models", type: "BELONGS_TO" },
  { from: "LLaVA-1.5", to: "Vision-Language Models", type: "BELONGS_TO" },
  { from: "Qwen-VL", to: "Vision-Language Models", type: "BELONGS_TO" },
  { from: "BLIP", to: "CLIP", type: "BUILDS_ON" },
  { from: "BLIP-2", to: "BLIP", type: "IMPROVES" },
  { from: "LLaVA", to: "CLIP", type: "USES", properties: { component: "vision encoder" } },
  { from: "LLaVA-1.5", to: "LLaVA", type: "IMPROVES" },
  { from: "Qwen-VL", to: "BLIP-2", type: "RELATED_TO" },
  { from: "OpenAI", to: "CLIP", type: "DEVELOPED" },
  { from: "Salesforce Research", to: "BLIP", type: "DEVELOPED" },
  { from: "Salesforce Research", to: "BLIP-2", type: "DEVELOPED" },
  { from: "DeepMind", to: "Flamingo", type: "DEVELOPED" },
  { from: "Haotian Liu", to: "LLaVA", type: "DEVELOPED" },
  { from: "Haotian Liu", to: "LLaVA-1.5", type: "DEVELOPED" },
  { from: "Alibaba", to: "Qwen-VL", type: "DEVELOPED" },
  { from: "Junnan Li", to: "BLIP", type: "DEVELOPED" },
  { from: "Junnan Li", to: "BLIP-2", type: "DEVELOPED" },
  { from: "Alec Radford", to: "CLIP", type: "DEVELOPED" },
  { from: "Jong Wook Kim", to: "CLIP", type: "DEVELOPED" },

  // === Speech Model Relations ===
  { from: "Whisper", to: "Speech Recognition", type: "IMPLEMENTS" },
  { from: "Distil-Whisper", to: "Speech Recognition", type: "IMPLEMENTS" },
  { from: "Distil-Whisper", to: "Whisper", type: "DISTILLED_FROM" },
  { from: "OpenAI", to: "Whisper", type: "DEVELOPED" },
  { from: "Hugging Face", to: "Distil-Whisper", type: "DEVELOPED" },
  { from: "Alec Radford", to: "Whisper", type: "DEVELOPED" },
  { from: "Jong Wook Kim", to: "Whisper", type: "DEVELOPED" },
  { from: "Whisper", to: "LibriSpeech", type: "EVALUATED_ON" },
  { from: "Distil-Whisper", to: "LibriSpeech", type: "EVALUATED_ON" },

  // === Alignment Technique Relations ===
  { from: "DPO", to: "Preference Alignment", type: "IMPLEMENTS" },
  { from: "ORPO", to: "Preference Alignment", type: "IMPLEMENTS" },
  { from: "IPO", to: "Preference Alignment", type: "IMPLEMENTS" },
  { from: "RLHF", to: "Preference Alignment", type: "IMPLEMENTS" },
  { from: "PPO", to: "RLHF", type: "USED_IN" },
  { from: "DPO", to: "RLHF", type: "IMPROVES", properties: { aspect: "no reward model" } },
  { from: "ORPO", to: "DPO", type: "IMPROVES", properties: { aspect: "no reference model" } },
  { from: "IPO", to: "DPO", type: "RELATED_TO", properties: { aspect: "theoretical framework" } },
  { from: "Rafael Rafailov", to: "DPO", type: "DEVELOPED" },
  { from: "Chelsea Finn", to: "DPO", type: "DEVELOPED" },
  { from: "DeepMind", to: "IPO", type: "DEVELOPED" },

  // === Benchmark Relations ===
  { from: "CLIP", to: "VQAv2", type: "EVALUATED_ON" },
  { from: "BLIP", to: "VQAv2", type: "EVALUATED_ON" },
  { from: "BLIP-2", to: "VQAv2", type: "EVALUATED_ON" },
  { from: "Flamingo", to: "VQAv2", type: "EVALUATED_ON" },
  { from: "LLaVA", to: "VQAv2", type: "EVALUATED_ON" },
  { from: "BLIP", to: "COCO Captioning", type: "EVALUATED_ON" },
  { from: "BLIP-2", to: "COCO Captioning", type: "EVALUATED_ON" },
  { from: "DPO", to: "AlpacaEval", type: "EVALUATED_ON" },
  { from: "ORPO", to: "AlpacaEval", type: "EVALUATED_ON" },
  { from: "DPO", to: "MT-Bench", type: "EVALUATED_ON" },
  { from: "ORPO", to: "MT-Bench", type: "EVALUATED_ON" },

  // === Publication Relations ===
  { from: "Learning Transferable Visual Models From Natural Language Supervision", to: "CLIP", type: "DESCRIBES" },
  { from: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness", to: "Flash Attention", type: "DESCRIBES" },
  { from: "Direct Preference Optimization: Your Language Model is Secretly a Reward Model", to: "DPO", type: "DESCRIBES" },
  { from: "Visual Instruction Tuning", to: "LLaVA", type: "DESCRIBES" },
  { from: "Robust Speech Recognition via Large-Scale Weak Supervision", to: "Whisper", type: "DESCRIBES" },

  // === Organization Relations ===
  { from: "Tri Dao", to: "Together AI", type: "AFFILIATED_WITH" },
  { from: "Tri Dao", to: "Stanford University", type: "AFFILIATED_WITH" },
  { from: "Rafael Rafailov", to: "Stanford University", type: "AFFILIATED_WITH" },
  { from: "Chelsea Finn", to: "Stanford University", type: "AFFILIATED_WITH" },
  { from: "Woosuk Kwon", to: "UC Berkeley", type: "AFFILIATED_WITH" },
  { from: "Junnan Li", to: "Salesforce Research", type: "AFFILIATED_WITH" },
];

// ============================================================================
// INGESTION
// ============================================================================

async function ingest() {
  const session = driver.session();
  
  try {
    console.log("🚀 Starting Infrastructure & Multimodal data ingestion...\n");

    // Create entities
    let created = 0;
    for (const entity of entities) {
      const props = {
        name: entity.name,
        description: entity.description,
        ...entity.properties
      };
      
      await session.run(
        `MERGE (e:${entity.type} {name: $name})
         SET e += $props
         RETURN e`,
        { name: entity.name, props }
      );
      created++;
    }
    console.log(`✅ ${created} entities created/updated`);

    // Create relations
    let relCreated = 0;
    for (const rel of relations) {
      await session.run(
        `MATCH (a {name: $from})
         MATCH (b {name: $to})
         MERGE (a)-[r:${rel.type}]->(b)
         SET r += $props
         RETURN r`,
        { 
          from: rel.from, 
          to: rel.to, 
          props: rel.properties || {} 
        }
      );
      relCreated++;
    }
    console.log(`✅ ${relCreated} relations created/updated`);

    // Statistics
    const stats = await session.run(`
      MATCH (n)
      RETURN labels(n)[0] AS type, count(n) AS count
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
    console.log(`   Total: ${total}`);

  } finally {
    await session.close();
    await driver.close();
  }
}

ingest().catch(console.error);
