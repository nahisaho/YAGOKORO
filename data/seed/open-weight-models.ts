/**
 * オープンウェイトモデル特化のシードデータ
 * LLaMA, Mistral, Qwen, DeepSeek, Falcon, Yi など
 */

import neo4j from 'neo4j-driver';
import { randomUUID } from 'node:crypto';

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password')
);

// =============================================================================
// オープンウェイトモデル関連エンティティ
// =============================================================================

const entities = [
  // ===== 組織 =====
  { type: 'Organization', name: 'Technology Innovation Institute', description: 'UAE拠点の研究機関、Falconモデル開発' },
  { type: 'Organization', name: '01.AI', description: 'Kai-Fu Lee創設のAIスタートアップ、Yiモデル開発' },
  { type: 'Organization', name: 'Stability AI', description: 'Stable Diffusion開発企業、オープンソースAI推進' },
  { type: 'Organization', name: 'EleutherAI', description: 'オープンソースAI研究コミュニティ、GPT-NeoX開発' },
  { type: 'Organization', name: 'BigScience', description: 'Hugging Face主導の国際研究コンソーシアム、BLOOM開発' },
  { type: 'Organization', name: 'xAI', description: 'Elon Musk創設のAI企業、Grok開発' },
  { type: 'Organization', name: 'Cohere', description: 'カナダのAI企業、Command R開発' },
  { type: 'Organization', name: 'Together AI', description: 'オープンソースAIインフラ企業' },

  // ===== 人物 =====
  { type: 'Person', name: 'Kai-Fu Lee', description: '01.AI創設者、元Google China社長、AI投資家' },
  { type: 'Person', name: 'Emad Mostaque', description: 'Stability AI創設者、オープンソースAI提唱者' },
  { type: 'Person', name: 'Stella Biderman', description: 'EleutherAI共同創設者、オープンソースLLM研究者' },
  { type: 'Person', name: 'Thomas Wolf', description: 'Hugging Face共同創設者、BigScience共同リーダー' },
  { type: 'Person', name: 'Tri Dao', description: 'FlashAttention開発者、Together AI' },
  { type: 'Person', name: 'Aidan Gomez', description: 'Cohere共同創設者、Transformer論文共著者' },
  { type: 'Person', name: 'Guillaume Lample', description: 'Mistral AI共同創設者、元Meta AI研究者' },
  { type: 'Person', name: 'Timothée Lacroix', description: 'Mistral AI共同創設者、元DeepMind研究者' },

  // ===== LLaMAファミリー =====
  { type: 'AIModel', name: 'LLaMA', description: 'Meta初のオープンLLM（2023年2月）、7B/13B/33B/65Bパラメータ' },
  { type: 'AIModel', name: 'LLaMA 2', description: 'Meta第2世代オープンLLM（2023年7月）、商用利用可能、7B/13B/70B' },
  { type: 'AIModel', name: 'LLaMA 3', description: 'Meta第3世代LLM（2024年4月）、8B/70B、コンテキスト8K' },
  { type: 'AIModel', name: 'LLaMA 3.2', description: 'Meta最新LLM（2024年9月）、1B/3B/11B/90Bマルチモーダル対応' },
  { type: 'AIModel', name: 'Code Llama', description: 'LLaMA 2ベースのコード特化モデル、7B/13B/34B/70B' },
  { type: 'AIModel', name: 'Llama Guard', description: 'Meta安全性分類モデル、入出力のセーフティチェック' },

  // ===== Mistralファミリー =====
  { type: 'AIModel', name: 'Mistral 7B', description: 'Mistral AI初のモデル（2023年9月）、LLaMA 2 13B超えの性能' },
  { type: 'AIModel', name: 'Mixtral 8x22B', description: 'Mistral大規模MoEモデル（2024年4月）、141Bパラメータ' },
  { type: 'AIModel', name: 'Mistral Large', description: 'Mistral AIフラッグシップ（2024年2月）、GPT-4クラス性能' },
  { type: 'AIModel', name: 'Mistral Nemo', description: 'NVIDIA共同開発12Bモデル（2024年7月）、Apache 2.0ライセンス' },
  { type: 'AIModel', name: 'Codestral', description: 'Mistralコード特化モデル（2024年5月）、80+言語対応' },
  { type: 'AIModel', name: 'Pixtral', description: 'Mistralマルチモーダルモデル（2024年9月）、12B/Large' },

  // ===== Qwenファミリー =====
  { type: 'AIModel', name: 'Qwen', description: 'Alibaba初の大規模LLM（2023年8月）、7B/14B/72B' },
  { type: 'AIModel', name: 'Qwen-VL', description: 'Qwenビジョン言語モデル、画像理解対応' },
  { type: 'AIModel', name: 'Qwen2', description: 'Alibaba第2世代LLM（2024年6月）、0.5B〜72B' },
  { type: 'AIModel', name: 'Qwen2.5-Coder', description: 'Qwen2.5コード特化版（2024年9月）、1.5B〜32B' },
  { type: 'AIModel', name: 'Qwen2-VL', description: 'Qwen2マルチモーダル版、動画理解対応' },
  { type: 'AIModel', name: 'QwQ', description: 'Alibaba推論特化モデル（2024年11月）、o1競合' },

  // ===== DeepSeekファミリー =====
  { type: 'AIModel', name: 'DeepSeek-Coder', description: 'DeepSeekコード特化モデル（2023年11月）、1.3B〜33B' },
  { type: 'AIModel', name: 'DeepSeek-V2', description: 'DeepSeek第2世代（2024年5月）、MoE 236Bパラメータ' },
  { type: 'AIModel', name: 'DeepSeek-Coder-V2', description: 'DeepSeekコード特化MoE（2024年6月）、Codestral超え' },
  { type: 'AIModel', name: 'DeepSeek-R1', description: 'DeepSeek推論モデル（2024年11月）、o1-preview競合' },

  // ===== その他オープンモデル =====
  { type: 'AIModel', name: 'Falcon', description: 'TII開発オープンLLM（2023年5月）、7B/40B/180B' },
  { type: 'AIModel', name: 'Falcon 2', description: 'TII第2世代（2024年5月）、11Bマルチモーダル対応' },
  { type: 'AIModel', name: 'Yi', description: '01.AI開発LLM（2023年11月）、6B/34B/バイリンガル' },
  { type: 'AIModel', name: 'Yi-1.5', description: '01.AI第2世代（2024年5月）、6B/9B/34B' },
  { type: 'AIModel', name: 'BLOOM', description: 'BigScience開発多言語LLM（2022年7月）、176Bパラメータ' },
  { type: 'AIModel', name: 'GPT-NeoX', description: 'EleutherAI開発オープンLLM（2022年4月）、20Bパラメータ' },
  { type: 'AIModel', name: 'Pythia', description: 'EleutherAI解釈可能性研究用モデル群（2023年）、70M〜12B' },
  { type: 'AIModel', name: 'OLMo', description: 'Allen AI開発完全オープンLLM（2024年2月）、7B、学習データも公開' },
  { type: 'AIModel', name: 'Gemma', description: 'Google DeepMind開発オープンLLM（2024年2月）、2B/7B' },
  { type: 'AIModel', name: 'Gemma 2', description: 'Google第2世代オープンLLM（2024年6月）、2B/9B/27B' },
  { type: 'AIModel', name: 'Command R', description: 'Cohere開発RAG特化モデル（2024年3月）、35B/104B' },
  { type: 'AIModel', name: 'Command R+', description: 'Cohere大規模RAGモデル、複雑な推論対応' },
  { type: 'AIModel', name: 'Grok-1', description: 'xAI開発LLM（2024年3月）、314B MoE、オープンウェイト' },
  { type: 'AIModel', name: 'InternLM', description: 'Shanghai AI Lab開発LLM、7B/20B/104B' },
  { type: 'AIModel', name: 'InternLM2', description: 'Shanghai AI Lab第2世代（2024年1月）、7B/20B' },
  { type: 'AIModel', name: 'Baichuan 2', description: 'Baichuan Inc開発中国語LLM（2023年9月）、7B/13B' },
  { type: 'AIModel', name: 'GLM-4', description: 'Zhipu AI開発LLM（2024年1月）、ChatGLM後継' },

  // ===== コード特化モデル =====
  { type: 'AIModel', name: 'StarCoder', description: 'BigCode開発コードLLM（2023年5月）、15B、80+言語' },
  { type: 'AIModel', name: 'StarCoder2', description: 'BigCode第2世代（2024年2月）、3B/7B/15B' },
  { type: 'AIModel', name: 'WizardCoder', description: 'Microsoft Research開発コード特化ファインチューン' },
  { type: 'AIModel', name: 'Magicoder', description: 'OSS-Instruct手法によるコードモデル' },

  // ===== 技術 =====
  { type: 'Technique', name: 'Sliding Window Attention', description: 'Mistralで導入、固定ウィンドウサイズの効率的アテンション' },
  { type: 'Technique', name: 'Grouped Query Attention', description: 'LLaMA 2で採用、KVキャッシュ削減アテンション' },
  { type: 'Technique', name: 'FlashAttention', description: 'Tri Dao開発、IO効率的なアテンション実装' },
  { type: 'Technique', name: 'FlashAttention-2', description: 'FlashAttention改良版、並列化強化' },
  { type: 'Technique', name: 'DeepSeekMoE', description: 'DeepSeek独自MoEアーキテクチャ、細粒度エキスパート' },
  { type: 'Technique', name: 'RoPE', description: 'Rotary Position Embedding、相対位置エンコーディング' },
  { type: 'Technique', name: 'ALiBi', description: 'Attention with Linear Biases、外挿可能な位置エンコーディング' },
  { type: 'Technique', name: 'SwiGLU', description: 'Swish + GLU活性化関数、LLaMAで採用' },
  { type: 'Technique', name: 'Speculative Decoding', description: '投機的デコーディング、推論高速化手法' },
  { type: 'Technique', name: 'AWQ', description: 'Activation-aware Weight Quantization、量子化手法' },
  { type: 'Technique', name: 'GPTQ', description: 'Post-training量子化手法、4bit対応' },
  { type: 'Technique', name: 'GGUF', description: 'llama.cpp用モデルフォーマット、CPU推論最適化' },
  { type: 'Technique', name: 'vLLM', description: 'UC Berkeley開発高速推論エンジン、PagedAttention' },
  { type: 'Technique', name: 'PagedAttention', description: 'vLLMで導入、メモリ効率的KVキャッシュ管理' },

  // ===== ベンチマーク =====
  { type: 'Benchmark', name: 'Open LLM Leaderboard', description: 'Hugging Face運営オープンモデルベンチマーク' },
  { type: 'Benchmark', name: 'AlpacaEval', description: 'Stanford発、LLMの指示追従能力評価' },
  { type: 'Benchmark', name: 'MT-Bench', description: 'LMSYS開発マルチターン会話ベンチマーク' },
  { type: 'Benchmark', name: 'MBPP', description: 'Google開発Python入門プログラミングベンチマーク' },
  { type: 'Benchmark', name: 'MultiPL-E', description: '多言語プログラミングベンチマーク、18言語対応' },
  { type: 'Benchmark', name: 'HellaSwag', description: '常識推論ベンチマーク、文完成タスク' },
  { type: 'Benchmark', name: 'ARC-Challenge', description: '科学質問応答ベンチマーク、難問セット' },
  { type: 'Benchmark', name: 'Winogrande', description: '代名詞解決ベンチマーク、常識推論' },
  { type: 'Benchmark', name: 'MATH', description: '数学問題ベンチマーク、高校〜大学レベル' },
  { type: 'Benchmark', name: 'LiveCodeBench', description: 'リアルタイムコーディングベンチマーク、汚染対策' },
  { type: 'Benchmark', name: 'EvalPlus', description: 'HumanEval/MBPP拡張版、テストケース強化' },

  // ===== 論文 =====
  { type: 'Publication', name: 'LLaMA Paper', description: 'LLaMA: Open and Efficient Foundation Language Models（2023年2月）' },
  { type: 'Publication', name: 'Llama 2 Paper', description: 'Llama 2: Open Foundation and Fine-Tuned Chat Models（2023年7月）' },
  { type: 'Publication', name: 'Mistral 7B Paper', description: 'Mistral 7B（2023年9月）、Sliding Window Attention導入' },
  { type: 'Publication', name: 'Mixtral Paper', description: 'Mixtral of Experts（2024年1月）、SMoE詳細解説' },
  { type: 'Publication', name: 'FlashAttention Paper', description: 'FlashAttention: Fast and Memory-Efficient Exact Attention（2022年5月）' },
  { type: 'Publication', name: 'Qwen Technical Report', description: 'Qwen Technical Report（2023年9月）' },
  { type: 'Publication', name: 'DeepSeek-V2 Paper', description: 'DeepSeek-V2: A Strong, Economical, and Efficient MoE（2024年5月）' },
  { type: 'Publication', name: 'Falcon Paper', description: 'The Falcon Series of Open Language Models（2023年6月）' },
  { type: 'Publication', name: 'BLOOM Paper', description: 'BLOOM: A 176B-Parameter Open-Access Multilingual Language Model（2022年11月）' },
  { type: 'Publication', name: 'OLMo Paper', description: 'OLMo: Accelerating the Science of Language Models（2024年2月）' },
  { type: 'Publication', name: 'Gemma Paper', description: 'Gemma: Open Models Based on Gemini Research and Technology（2024年2月）' },
  { type: 'Publication', name: 'StarCoder Paper', description: 'StarCoder: may the source be with you!（2023年5月）' },

  // ===== コンセプト =====
  { type: 'Concept', name: 'Open Weights', description: 'モデル重みを公開するライセンス形態、完全OSSとは異なる' },
  { type: 'Concept', name: 'Permissive License', description: 'Apache 2.0やMITなど商用利用可能なライセンス' },
  { type: 'Concept', name: 'Model Card', description: 'モデルの能力・限界・使用方法を記載したドキュメント' },
  { type: 'Concept', name: 'Safety Alignment', description: 'モデルの安全性を確保するためのアライメント手法' },
  { type: 'Concept', name: 'Responsible AI License', description: 'RAIL、使用制限付きオープンライセンス' },
].map(e => ({ ...e, id: randomUUID() }));

// =============================================================================
// リレーション定義
// =============================================================================

const relations = [
  // 組織と人物
  { source: 'Kai-Fu Lee', target: '01.AI', type: 'FOUNDED' },
  { source: 'Emad Mostaque', target: 'Stability AI', type: 'FOUNDED' },
  { source: 'Stella Biderman', target: 'EleutherAI', type: 'FOUNDED' },
  { source: 'Thomas Wolf', target: 'Hugging Face', type: 'EMPLOYED_AT' },
  { source: 'Tri Dao', target: 'Together AI', type: 'EMPLOYED_AT' },
  { source: 'Aidan Gomez', target: 'Cohere', type: 'FOUNDED' },
  { source: 'Guillaume Lample', target: 'Mistral AI', type: 'FOUNDED' },
  { source: 'Timothée Lacroix', target: 'Mistral AI', type: 'FOUNDED' },

  // LLaMAファミリー
  { source: 'LLaMA', target: 'Meta', type: 'DEVELOPED_BY' },
  { source: 'LLaMA 2', target: 'Meta', type: 'DEVELOPED_BY' },
  { source: 'LLaMA 3', target: 'Meta', type: 'DEVELOPED_BY' },
  { source: 'LLaMA 3.2', target: 'Meta', type: 'DEVELOPED_BY' },
  { source: 'Code Llama', target: 'Meta', type: 'DEVELOPED_BY' },
  { source: 'Llama Guard', target: 'Meta', type: 'DEVELOPED_BY' },
  { source: 'LLaMA 2', target: 'LLaMA', type: 'BASED_ON' },
  { source: 'LLaMA 3', target: 'LLaMA 2', type: 'BASED_ON' },
  { source: 'LLaMA 3.2', target: 'LLaMA 3', type: 'BASED_ON' },
  { source: 'Code Llama', target: 'LLaMA 2', type: 'BASED_ON' },
  { source: 'LLaMA', target: 'RoPE', type: 'USES_TECHNIQUE' },
  { source: 'LLaMA', target: 'SwiGLU', type: 'USES_TECHNIQUE' },
  { source: 'LLaMA 2', target: 'Grouped Query Attention', type: 'USES_TECHNIQUE' },

  // Mistralファミリー
  { source: 'Mistral 7B', target: 'Mistral AI', type: 'DEVELOPED_BY' },
  { source: 'Mixtral 8x7B', target: 'Mistral AI', type: 'DEVELOPED_BY' },
  { source: 'Mixtral 8x22B', target: 'Mistral AI', type: 'DEVELOPED_BY' },
  { source: 'Mistral Large', target: 'Mistral AI', type: 'DEVELOPED_BY' },
  { source: 'Mistral Nemo', target: 'Mistral AI', type: 'DEVELOPED_BY' },
  { source: 'Codestral', target: 'Mistral AI', type: 'DEVELOPED_BY' },
  { source: 'Pixtral', target: 'Mistral AI', type: 'DEVELOPED_BY' },
  { source: 'Mistral 7B', target: 'Sliding Window Attention', type: 'USES_TECHNIQUE' },
  { source: 'Mistral 7B', target: 'Grouped Query Attention', type: 'USES_TECHNIQUE' },
  { source: 'Mixtral 8x7B', target: 'Mixture of Experts', type: 'USES_TECHNIQUE' },
  { source: 'Mixtral 8x22B', target: 'Mixture of Experts', type: 'USES_TECHNIQUE' },

  // Qwenファミリー
  { source: 'Qwen', target: 'Alibaba', type: 'DEVELOPED_BY' },
  { source: 'Qwen2', target: 'Alibaba', type: 'DEVELOPED_BY' },
  { source: 'Qwen2.5', target: 'Alibaba', type: 'DEVELOPED_BY' },
  { source: 'Qwen2.5-Coder', target: 'Alibaba', type: 'DEVELOPED_BY' },
  { source: 'Qwen-VL', target: 'Alibaba', type: 'DEVELOPED_BY' },
  { source: 'Qwen2-VL', target: 'Alibaba', type: 'DEVELOPED_BY' },
  { source: 'QwQ', target: 'Alibaba', type: 'DEVELOPED_BY' },
  { source: 'Qwen2', target: 'Qwen', type: 'BASED_ON' },
  { source: 'Qwen2.5', target: 'Qwen2', type: 'BASED_ON' },
  { source: 'QwQ', target: 'Qwen2.5', type: 'BASED_ON' },

  // DeepSeekファミリー
  { source: 'DeepSeek-Coder', target: 'DeepSeek', type: 'DEVELOPED_BY' },
  { source: 'DeepSeek-V2', target: 'DeepSeek', type: 'DEVELOPED_BY' },
  { source: 'DeepSeek-V3', target: 'DeepSeek', type: 'DEVELOPED_BY' },
  { source: 'DeepSeek-Coder-V2', target: 'DeepSeek', type: 'DEVELOPED_BY' },
  { source: 'DeepSeek-R1', target: 'DeepSeek', type: 'DEVELOPED_BY' },
  { source: 'DeepSeek-V2', target: 'DeepSeekMoE', type: 'USES_TECHNIQUE' },
  { source: 'DeepSeek-V3', target: 'DeepSeekMoE', type: 'USES_TECHNIQUE' },
  { source: 'DeepSeek-V3', target: 'DeepSeek-V2', type: 'BASED_ON' },
  { source: 'DeepSeek-R1', target: 'DeepSeek-V3', type: 'BASED_ON' },

  // その他オープンモデル
  { source: 'Falcon', target: 'Technology Innovation Institute', type: 'DEVELOPED_BY' },
  { source: 'Falcon 2', target: 'Technology Innovation Institute', type: 'DEVELOPED_BY' },
  { source: 'Yi', target: '01.AI', type: 'DEVELOPED_BY' },
  { source: 'Yi-1.5', target: '01.AI', type: 'DEVELOPED_BY' },
  { source: 'BLOOM', target: 'BigScience', type: 'DEVELOPED_BY' },
  { source: 'GPT-NeoX', target: 'EleutherAI', type: 'DEVELOPED_BY' },
  { source: 'Pythia', target: 'EleutherAI', type: 'DEVELOPED_BY' },
  { source: 'OLMo', target: 'Allen Institute for AI', type: 'DEVELOPED_BY' },
  { source: 'Gemma', target: 'Google DeepMind', type: 'DEVELOPED_BY' },
  { source: 'Gemma 2', target: 'Google DeepMind', type: 'DEVELOPED_BY' },
  { source: 'Command R', target: 'Cohere', type: 'DEVELOPED_BY' },
  { source: 'Command R+', target: 'Cohere', type: 'DEVELOPED_BY' },
  { source: 'Grok-1', target: 'xAI', type: 'DEVELOPED_BY' },
  { source: 'InternLM', target: 'Shanghai AI Lab', type: 'DEVELOPED_BY' },
  { source: 'InternLM2', target: 'Shanghai AI Lab', type: 'DEVELOPED_BY' },
  { source: 'Baichuan 2', target: 'Baichuan Inc', type: 'DEVELOPED_BY' },
  { source: 'GLM-4', target: 'Zhipu AI', type: 'DEVELOPED_BY' },

  // コード特化モデル
  { source: 'StarCoder', target: 'BigScience', type: 'DEVELOPED_BY' },
  { source: 'StarCoder2', target: 'BigScience', type: 'DEVELOPED_BY' },
  { source: 'WizardCoder', target: 'Microsoft Research', type: 'DEVELOPED_BY' },
  { source: 'StarCoder2', target: 'StarCoder', type: 'BASED_ON' },

  // 技術関連
  { source: 'FlashAttention', target: 'Tri Dao', type: 'DEVELOPED_BY' },
  { source: 'FlashAttention-2', target: 'Tri Dao', type: 'DEVELOPED_BY' },
  { source: 'FlashAttention-2', target: 'FlashAttention', type: 'BASED_ON' },
  { source: 'vLLM', target: 'PagedAttention', type: 'USES_TECHNIQUE' },
  { source: 'LLaMA 3', target: 'FlashAttention-2', type: 'USES_TECHNIQUE' },
  { source: 'Mistral 7B', target: 'FlashAttention-2', type: 'USES_TECHNIQUE' },

  // 論文
  { source: 'LLaMA', target: 'LLaMA Paper', type: 'DESCRIBED_IN' },
  { source: 'LLaMA 2', target: 'Llama 2 Paper', type: 'DESCRIBED_IN' },
  { source: 'Mistral 7B', target: 'Mistral 7B Paper', type: 'DESCRIBED_IN' },
  { source: 'Mixtral 8x7B', target: 'Mixtral Paper', type: 'DESCRIBED_IN' },
  { source: 'FlashAttention', target: 'FlashAttention Paper', type: 'DESCRIBED_IN' },
  { source: 'Qwen', target: 'Qwen Technical Report', type: 'DESCRIBED_IN' },
  { source: 'DeepSeek-V2', target: 'DeepSeek-V2 Paper', type: 'DESCRIBED_IN' },
  { source: 'Falcon', target: 'Falcon Paper', type: 'DESCRIBED_IN' },
  { source: 'BLOOM', target: 'BLOOM Paper', type: 'DESCRIBED_IN' },
  { source: 'OLMo', target: 'OLMo Paper', type: 'DESCRIBED_IN' },
  { source: 'Gemma', target: 'Gemma Paper', type: 'DESCRIBED_IN' },
  { source: 'StarCoder', target: 'StarCoder Paper', type: 'DESCRIBED_IN' },

  // オープンウェイト関連
  { source: 'LLaMA', target: 'Open Weights', type: 'EXEMPLIFIES' },
  { source: 'Mistral 7B', target: 'Permissive License', type: 'EXEMPLIFIES' },
  { source: 'OLMo', target: 'Open Weights', type: 'EXEMPLIFIES' },
  { source: 'Gemma', target: 'Permissive License', type: 'EXEMPLIFIES' },
  { source: 'BLOOM', target: 'Responsible AI License', type: 'EXEMPLIFIES' },
];

// ベンチマーク評価
const benchmarkEvaluations = [
  // Open LLM Leaderboard (Average)
  { model: 'LLaMA 3.1 405B', benchmark: 'Open LLM Leaderboard', score: 73.0, note: '2024年7月' },
  { model: 'Mixtral 8x22B', benchmark: 'Open LLM Leaderboard', score: 70.6, note: '2024年4月' },
  { model: 'Qwen2.5', benchmark: 'Open LLM Leaderboard', score: 72.5, note: '72B版' },
  { model: 'LLaMA 3', benchmark: 'Open LLM Leaderboard', score: 68.4, note: '70B版' },
  { model: 'Mistral 7B', benchmark: 'Open LLM Leaderboard', score: 60.1, note: '2023年9月' },

  // MT-Bench
  { model: 'LLaMA 3.1 405B', benchmark: 'MT-Bench', score: 9.0, note: 'Instruct版' },
  { model: 'Mixtral 8x22B', benchmark: 'MT-Bench', score: 8.6, note: 'Instruct版' },
  { model: 'Qwen2.5', benchmark: 'MT-Bench', score: 8.9, note: '72B Instruct' },
  { model: 'Mistral Large', benchmark: 'MT-Bench', score: 8.7, note: '2024年' },

  // HumanEval (コード)
  { model: 'DeepSeek-Coder-V2', benchmark: 'HumanEval', score: 90.2, note: '236B MoE' },
  { model: 'Qwen2.5-Coder', benchmark: 'HumanEval', score: 88.4, note: '32B版' },
  { model: 'Codestral', benchmark: 'HumanEval', score: 81.1, note: '2024年5月' },
  { model: 'Code Llama', benchmark: 'HumanEval', score: 67.8, note: '70B版' },
  { model: 'StarCoder2', benchmark: 'HumanEval', score: 46.3, note: '15B版' },
  { model: 'Mistral 7B', benchmark: 'HumanEval', score: 30.5, note: 'Base版' },

  // MBPP
  { model: 'DeepSeek-Coder-V2', benchmark: 'MBPP', score: 89.4, note: '236B' },
  { model: 'Qwen2.5-Coder', benchmark: 'MBPP', score: 86.2, note: '32B版' },
  { model: 'Code Llama', benchmark: 'MBPP', score: 70.4, note: '70B版' },
  { model: 'StarCoder', benchmark: 'MBPP', score: 55.1, note: '15B版' },

  // MATH
  { model: 'QwQ', benchmark: 'MATH', score: 90.6, note: '32B preview' },
  { model: 'DeepSeek-R1', benchmark: 'MATH', score: 89.1, note: 'preview' },
  { model: 'Qwen2.5', benchmark: 'MATH', score: 83.1, note: '72B Math版' },
  { model: 'LLaMA 3.1 405B', benchmark: 'MATH', score: 73.8, note: 'Instruct' },
  { model: 'Mistral Large', benchmark: 'MATH', score: 45.0, note: '2024年2月' },

  // HellaSwag
  { model: 'LLaMA 3', benchmark: 'HellaSwag', score: 88.0, note: '70B版' },
  { model: 'Mixtral 8x22B', benchmark: 'HellaSwag', score: 88.6, note: '2024年' },
  { model: 'Qwen2.5', benchmark: 'HellaSwag', score: 87.5, note: '72B版' },
  { model: 'Falcon', benchmark: 'HellaSwag', score: 85.3, note: '180B版' },
  { model: 'Yi-1.5', benchmark: 'HellaSwag', score: 86.0, note: '34B版' },

  // ARC-Challenge
  { model: 'LLaMA 3', benchmark: 'ARC-Challenge', score: 68.8, note: '70B版' },
  { model: 'Mixtral 8x22B', benchmark: 'ARC-Challenge', score: 70.6, note: '2024年' },
  { model: 'Qwen2.5', benchmark: 'ARC-Challenge', score: 69.5, note: '72B版' },
  { model: 'Gemma 2', benchmark: 'ARC-Challenge', score: 71.4, note: '27B版' },

  // AlpacaEval 2.0 (Win Rate)
  { model: 'LLaMA 3.1 405B', benchmark: 'AlpacaEval', score: 39.3, note: 'Instruct' },
  { model: 'Qwen2.5', benchmark: 'AlpacaEval', score: 34.5, note: '72B Instruct' },
  { model: 'Mixtral 8x22B', benchmark: 'AlpacaEval', score: 30.9, note: 'Instruct' },

  // LiveCodeBench
  { model: 'DeepSeek-V3', benchmark: 'LiveCodeBench', score: 36.2, note: 'Pass@1' },
  { model: 'Claude 3.5 Sonnet', benchmark: 'LiveCodeBench', score: 33.8, note: 'Pass@1' },
  { model: 'GPT-4o', benchmark: 'LiveCodeBench', score: 32.1, note: 'Pass@1' },
  { model: 'Qwen2.5-Coder', benchmark: 'LiveCodeBench', score: 28.5, note: '32B Pass@1' },
];

// =============================================================================
// 投入処理
// =============================================================================

async function ingestOpenWeightData() {
  const session = driver.session();

  try {
    console.log('🚀 オープンウェイトモデルデータ投入開始\n');

    // エンティティ作成
    let entityCount = 0;
    let skipCount = 0;

    for (const entity of entities) {
      // 既存チェック
      const existing = await session.run(
        'MATCH (e:Entity {name: $name, type: $type}) RETURN e',
        { name: entity.name, type: entity.type }
      );

      if (existing.records.length > 0) {
        skipCount++;
        continue;
      }

      await session.run(`
        CREATE (e:Entity {
          id: $id,
          type: $type,
          name: $name,
          description: $description,
          createdAt: datetime()
        })
      `, entity);
      entityCount++;
    }

    console.log(`📦 エンティティ: ${entityCount}件追加, ${skipCount}件スキップ`);

    // リレーション作成
    let relCount = 0;
    let relSkip = 0;

    for (const rel of relations) {
      const result = await session.run(`
        MATCH (source:Entity {name: $source})
        MATCH (target:Entity {name: $target})
        MERGE (source)-[r:${rel.type}]->(target)
        ON CREATE SET r.createdAt = datetime()
        RETURN r
      `, { source: rel.source, target: rel.target });

      if (result.records.length > 0) {
        relCount++;
      } else {
        relSkip++;
      }
    }

    console.log(`🔗 リレーション: ${relCount}件追加, ${relSkip}件スキップ`);

    // ベンチマーク評価
    let evalCount = 0;
    let evalSkip = 0;

    for (const eval_ of benchmarkEvaluations) {
      const checkResult = await session.run(`
        MATCH (m:Entity {name: $model, type: 'AIModel'})
        MATCH (b:Entity {name: $benchmark, type: 'Benchmark'})
        RETURN m, b
      `, { model: eval_.model, benchmark: eval_.benchmark });

      if (checkResult.records.length === 0) {
        evalSkip++;
        continue;
      }

      await session.run(`
        MATCH (m:Entity {name: $model, type: 'AIModel'})
        MATCH (b:Entity {name: $benchmark, type: 'Benchmark'})
        MERGE (m)-[r:EVALUATED_ON]->(b)
        ON CREATE SET r.score = $score, r.note = $note, r.createdAt = datetime()
        ON MATCH SET r.score = $score, r.note = $note
      `, { model: eval_.model, benchmark: eval_.benchmark, score: eval_.score, note: eval_.note });
      evalCount++;
    }

    console.log(`🏆 ベンチマーク評価: ${evalCount}件追加/更新, ${evalSkip}件スキップ`);

    // 統計表示
    const stats = await session.run(`
      MATCH (e:Entity)
      RETURN e.type as type, count(*) as count
      ORDER BY count DESC
    `);

    console.log('\n📊 エンティティ統計:');
    for (const record of stats.records) {
      console.log(`   ${record.get('type')}: ${record.get('count').toNumber()}`);
    }

    const relStats = await session.run(`
      MATCH ()-[r]->()
      RETURN type(r) as type, count(*) as count
      ORDER BY count DESC
    `);

    console.log('\n📈 リレーション統計:');
    for (const record of relStats.records) {
      console.log(`   ${record.get('type')}: ${record.get('count').toNumber()}`);
    }

  } finally {
    await session.close();
    await driver.close();
  }
}

ingestOpenWeightData().catch(console.error);
