/**
 * 2024-2025年の重要なAI/LLM論文データ
 * 主要な基盤モデル、学習手法、ベンチマーク、アーキテクチャを網羅
 */

import neo4j from 'neo4j-driver';
import type { Entity, Relation } from './types.js';

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password')
);

// ============================================================================
// 2024-2025年の主要な基盤モデル
// ============================================================================

const aiModels: Entity[] = [
  // DeepSeek シリーズ
  {
    id: 'deepseek-r1',
    name: 'DeepSeek-R1',
    type: 'AIModel',
    description: 'DeepSeek-AIが開発した推論特化モデル。大規模強化学習(RL)のみで学習したDeepSeek-R1-Zeroと、multi-stage trainingとcold-start dataを導入したDeepSeek-R1がある。OpenAI-o1-1217と同等の推論性能を達成。1.5B/7B/8B/14B/32B/70Bの蒸留モデルも公開。',
  },
  {
    id: 'deepseek-v2',
    name: 'DeepSeek-V2',
    type: 'AIModel',
    description: '236Bパラメータ(21B activated)のMoEモデル。Multi-head Latent Attention (MLA)でKVキャッシュを93.3%削減、DeepSeekMoEで効率的な学習を実現。128Kコンテキスト対応。DeepSeek 67Bと比較して42.5%の学習コスト削減、5.76倍の生成スループット向上。',
  },
  {
    id: 'deepseek-math',
    name: 'DeepSeekMath',
    type: 'AIModel',
    description: 'DeepSeek-Coder-Base-v1.5 7Bを120B math tokensで継続学習した数学推論特化モデル。MATHベンチマークで51.7%を達成、外部ツールなしでGemini-Ultra/GPT-4に匹敵。Group Relative Policy Optimization (GRPO)を導入。',
  },

  // Llama シリーズ
  {
    id: 'llama-3',
    name: 'Llama 3',
    type: 'AIModel',
    description: 'Meta AIの第3世代基盤モデル。405Bパラメータの密なTransformerで128Kコンテキスト対応。多言語、コーディング、推論、ツール使用をネイティブサポート。GPT-4と同等の品質を達成。画像・動画・音声機能も実験的に統合。',
  },
  {
    id: 'llama-2',
    name: 'Llama 2',
    type: 'AIModel',
    description: 'Meta AIの第2世代オープンLLM。7B/13B/70Bパラメータで、対話用に最適化されたLlama 2-Chatを含む。オープンソースモデルで最高水準の性能を達成。',
  },

  // Gemma/Gemini シリーズ
  {
    id: 'gemini',
    name: 'Gemini',
    type: 'AIModel',
    description: 'Google DeepMindのマルチモーダルモデルファミリー。Ultra/Pro/Nanoの3サイズ。32ベンチマーク中30で最先端、MMLUで人間専門家レベルを初めて達成。画像・音声・動画・テキストを統合的に理解。',
  },
  {
    id: 'gemma',
    name: 'Gemma',
    type: 'AIModel',
    description: 'GoogleがGeminiの技術を基に開発した軽量オープンモデル。2B/7Bパラメータ。18タスク中11で同サイズモデルを上回る性能。安全性と責任ある開発を重視。',
  },
  {
    id: 'gemma-2',
    name: 'Gemma 2',
    type: 'AIModel',
    description: 'Gemmaの後継モデル。2B/9B/27Bパラメータ。local-global attention交互配置、group-query attention、知識蒸留(2B/9B)を採用。同サイズで最高性能、2-3倍大きいモデルと競争可能。',
  },

  // Mistral シリーズ
  {
    id: 'mistral-7b',
    name: 'Mistral 7B',
    type: 'AIModel',
    description: 'Mistral AIの7Bパラメータモデル。Grouped-Query Attention (GQA)で高速推論、Sliding Window Attention (SWA)で長系列処理を実現。Llama 2 13Bを全ベンチマークで上回る。Apache 2.0ライセンス。',
  },
  {
    id: 'mixtral-8x7b',
    name: 'Mixtral 8x7B',
    type: 'AIModel',
    description: 'Mistral AIのSparse MoEモデル。各レイヤー8 experts、トークンごとに2 experts選択。47Bパラメータ中13B activeで、32Kコンテキスト対応。Llama 2 70BとGPT-3.5を上回る性能。',
  },

  // GPT シリーズ
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    type: 'AIModel',
    description: 'OpenAIのオムニモーダルモデル。テキスト・音声・画像・動画を入力可能、テキスト・音声・画像を出力。音声応答232msで人間並みの反応速度。end-to-endで学習され、GPT-4 Turbo同等の性能で50%低コスト。',
  },

  // 新アーキテクチャ
  {
    id: 'mamba',
    name: 'Mamba',
    type: 'AIModel',
    description: 'Albert Gu, Tri Daoによる線形時間系列モデル。Selective State Space Modelにより、入力依存のパラメータでcontent-based reasoningを実現。Transformerの5倍スループット、100万長系列対応。Mamba-3BはTransformer 3B以上、6B相当の性能。',
  },
  {
    id: 'xlstm',
    name: 'xLSTM',
    type: 'AIModel',
    description: 'LSTM創始者Sepp Hochreiterチームによる拡張LSTM。exponential gating、sLSTM(scalar memory)とmLSTM(matrix memory)を導入。TransformerやState Space Modelsと同等以上のスケーリング性能。',
  },

  // Post-training モデル
  {
    id: 'smaug',
    name: 'Smaug',
    type: 'AIModel',
    description: 'DPO-Positive (DPOP)で学習されたモデル。Smaug-72BはHuggingFace Open LLM Leaderboardで初めて平均80%超を達成したオープンソースLLM。',
  },
  {
    id: 'tulu-3',
    name: 'Tulu 3',
    type: 'AIModel',
    description: 'Allen AIによるオープンpost-trainingモデル。Llama 3.1ベースで、SFT、DPO、RLVR (Reinforcement Learning with Verifiable Rewards)で学習。Llama 3.1 Instruct、Qwen 2.5、GPT-4o-mini、Claude 3.5-Haikuを上回る。完全なレシピ・データ・コード公開。',
  },

  // コード特化
  {
    id: 'qwen25-coder',
    name: 'Qwen2.5-Coder',
    type: 'AIModel',
    description: 'Alibabaのコード特化モデル。0.5B/1.5B/3B/7B/14B/32Bの6サイズ。5.5兆トークン以上で継続学習。10以上のコードベンチマークでSOTA達成。コード生成・補完・推論・修復で大型モデルを上回る。',
  },
];

// ============================================================================
// 主要な学習手法・最適化技術
// ============================================================================

const techniques: Entity[] = [
  // Preference Optimization
  {
    id: 'dpo',
    name: 'Direct Preference Optimization (DPO)',
    type: 'Technique',
    description: 'Stanford大のRafailovらが提案したRLHF代替手法。報酬モデルのパラメータ化により、標準RLHFを単純な分類損失で解く。PPOベースRLHFと同等以上の性能を、安定かつ軽量に達成。感情制御、要約、対話で有効性実証。',
  },
  {
    id: 'dpop',
    name: 'DPO-Positive (DPOP)',
    type: 'Technique',
    description: '標準DPOの失敗モードを解決する損失関数。DPOでは相対確率増加のみで好ましい例の尤度が減少しうる問題を理論的・実証的に示し、DPOPで回避。Smaug-72Bで80%超のベンチマーク達成を可能に。',
  },
  {
    id: 'orpo',
    name: 'Odds Ratio Preference Optimization (ORPO)',
    type: 'Technique',
    description: '参照モデル不要の一体型preference optimization。SFT段階でodds ratioによりfavored/disfavoredスタイルを対比。125M-7Bで有効性実証、Mistral-ORPO-βがAlpacaEval/IFEval/MT-Benchで最先端。',
  },
  {
    id: 'grpo',
    name: 'Group Relative Policy Optimization (GRPO)',
    type: 'Technique',
    description: 'DeepSeekMathで提案されたPPO変種。PPOのメモリ効率を改善しつつ数学推論能力を向上。グループ内の相対的な報酬に基づく最適化。',
  },
  {
    id: 'iterative-rpo',
    name: 'Iterative Reasoning Preference Optimization',
    type: 'Technique',
    description: 'MetaのPangらによる反復的推論改善手法。Chain-of-Thought候補間の選好を最適化、modified DPOにNLL項追加が重要。GSM8Kで55.6%→81.6%、majority votingで88.7%達成。',
  },
  {
    id: 'rlvr',
    name: 'Reinforcement Learning with Verifiable Rewards (RLVR)',
    type: 'Technique',
    description: 'Tulu 3で導入された検証可能報酬による強化学習。数学・コードなど正解が検証可能なタスクで、報酬モデルなしに直接フィードバック。',
  },

  // Test-Time Compute
  {
    id: 'test-time-compute-scaling',
    name: 'Test-Time Compute Scaling',
    type: 'Technique',
    description: 'Google DeepMindのSnellらが提案。推論時計算を最適に割り当てることで、14倍大きいモデルを上回る性能を実現。process-based verifierによる探索と、test-time分布更新の2メカニズム。難易度に応じたcompute-optimal戦略で4倍以上の効率化。',
  },
  {
    id: 'mcts-dpo',
    name: 'MCTS-DPO',
    type: 'Technique',
    description: 'Monte Carlo Tree SearchとDPOを統合した推論改善手法。AlphaZero的なアプローチで、step-levelの選好データを反復生成。GSM8K 81.8%(+5.9%)、MATH 34.7%(+5.8%)、ARC-C 76.4%(+15.8%)達成。',
  },
  {
    id: 'mctsr',
    name: 'MCT Self-Refine (MCTSr)',
    type: 'Technique',
    description: 'LLMとMCTSを統合した数学推論強化アルゴリズム。Selection, Self-refine, Self-evaluation, BackpropagationでMC探索木構築。improved UCBで探索-活用バランス最適化。LLaMA-3 8BでGPT-4レベルの数学オリンピック解答を達成。',
  },

  // 効率的学習
  {
    id: 'galore',
    name: 'Gradient Low-Rank Projection (GaLore)',
    type: 'Technique',
    description: 'UC Berkeleyらの省メモリLLM学習手法。勾配を低ランク射影することで、full-parameter学習しつつLoRAより高効率。optimizer状態65.5%削減、8-bit版で82.5%削減。RTX 4090 (24GB)で7Bモデル学習を初めて実現。ICML 2024 Oral。',
  },
  {
    id: 'knowledge-distillation-llm',
    name: 'Knowledge Distillation for LLMs',
    type: 'Technique',
    description: 'Gemma 2で採用された知識蒸留。next token predictionの代わりに、大型教師モデルから小型生徒モデルへ知識転移。2B/9Bモデルで同サイズ最高性能を実現。',
  },
  {
    id: 'mla',
    name: 'Multi-head Latent Attention (MLA)',
    type: 'Technique',
    description: 'DeepSeek-V2で導入された効率的attention。Key-Valueキャッシュを潜在ベクトルに圧縮し93.3%削減。推論効率を大幅改善しつつ性能維持。',
  },
  {
    id: 'deepseek-moe',
    name: 'DeepSeekMoE',
    type: 'Technique',
    description: 'DeepSeekによる効率的MoEアーキテクチャ。sparse computationで学習コスト42.5%削減。236Bパラメータ中21B activatedで効率と性能を両立。',
  },

  // アーキテクチャ革新
  {
    id: 'selective-ssm',
    name: 'Selective State Space Model',
    type: 'Technique',
    description: 'Mambaの中核技術。SSMパラメータを入力依存にすることで、content-based reasoningを実現。hardware-awareな並列アルゴリズムでrecurrentモードでも効率的。',
  },
  {
    id: 'gqa',
    name: 'Grouped-Query Attention (GQA)',
    type: 'Technique',
    description: 'Mistral 7B, Gemma 2で採用された効率的attention。複数のquery headでkey-value headを共有し、推論速度を向上。',
  },
  {
    id: 'swa',
    name: 'Sliding Window Attention (SWA)',
    type: 'Technique',
    description: 'Mistral 7Bで採用された長系列処理手法。固定サイズのwindowでattentionを計算し、任意長の系列を一定コストで処理。',
  },
  {
    id: 'local-global-attention',
    name: 'Local-Global Attention Interleaving',
    type: 'Technique',
    description: 'Gemma 2で採用されたattentionパターン。local attentionとglobal attentionを交互に配置し、効率と表現力を両立。',
  },

  // 推論効率化
  {
    id: 'efficient-llm-inference',
    name: 'Efficient LLM Inference',
    type: 'Technique',
    description: 'LLM推論効率化の包括的技術体系。大規模モデルサイズ、二次計算量attention、自己回帰デコーディングの3課題に対し、データ・モデル・システムレベルの最適化。量子化、KVキャッシュ圧縮、speculative decodingなど。',
  },
];

// ============================================================================
// 重要なベンチマークと評価
// ============================================================================

const benchmarks: Entity[] = [
  {
    id: 'wildbench',
    name: 'WildBench',
    type: 'Benchmark',
    description: '実際のユーザークエリでLLMを評価するベンチマーク。100万以上のチャットログから1,024タスクを厳選。WB-RewardとWB-Scoreの2指標。task-specific checklistで体系的評価。Chatbot Arena Eloと相関0.98。',
  },
  {
    id: 'lm-eval-harness',
    name: 'Language Model Evaluation Harness (lm-eval)',
    type: 'Benchmark',
    description: 'EleutherAIの再現可能なLLM評価ライブラリ。評価セットアップへの感度、手法間比較の困難さ、再現性・透明性の欠如に対処。独立・再現可能・拡張可能な評価を実現。',
  },
  {
    id: 'scicode',
    name: 'SciCode',
    type: 'Benchmark',
    description: '科学者がキュレートした研究コーディングベンチマーク。16の自然科学分野から80問題・338サブ問題。知識想起・推論・コード合成を評価。Claude3.5-Sonnetで4.6%の正解率、極めて困難。',
  },
  {
    id: 'math-benchmark',
    name: 'MATH Benchmark',
    type: 'Benchmark',
    description: '競技数学レベルの推論評価ベンチマーク。DeepSeekMath 7Bが51.7%、self-consistencyで60.9%達成。GPT-4/Gemini-Ultra級の難易度。',
  },
  {
    id: 'olympiad-bench',
    name: 'OlympiadBench',
    type: 'Benchmark',
    description: '数学オリンピックレベルの問題集。MCTSrでLLaMA-3 8BがGPT-4レベルの解答を生成可能に。',
  },
];

// ============================================================================
// 重要な概念とアプリケーション
// ============================================================================

const concepts: Entity[] = [
  {
    id: 'omni-model',
    name: 'Omni Model (オムニモーダルモデル)',
    type: 'Concept',
    description: 'GPT-4oで実現されたマルチモーダルアーキテクチャ。テキスト・音声・画像・動画を統一的に処理し、テキスト・音声・画像を生成。end-to-end学習で人間並みの反応速度を実現。',
  },
  {
    id: 'emergent-reasoning',
    name: 'Emergent Reasoning Behaviors',
    type: 'Concept',
    description: 'DeepSeek-R1-Zeroで観察された創発的推論行動。SFTなしのRL-onlyで、多様で強力な推論パターンが自然に出現。可読性・言語混合の課題あり。',
  },
  {
    id: 'cold-start-data',
    name: 'Cold-Start Data',
    type: 'Concept',
    description: 'DeepSeek-R1でRL前に導入されるデータ。emergent reasoningの問題を解決しつつ推論性能を向上。multi-stage trainingの一部。',
  },
  {
    id: 'process-verifier',
    name: 'Process-based Verifier',
    type: 'Concept',
    description: 'test-time compute scalingで使用される検証器。最終回答だけでなく推論過程を評価し、step-level報酬を提供。',
  },
  {
    id: 'generative-agent',
    name: 'Generative Agent',
    type: 'Concept',
    description: 'LLMで人間行動をシミュレートするエージェント。StanfordのParkらが1,052人の実在個人をシミュレート、2週間後の自己回答再現率85%を達成。社会科学・政策立案への応用可能性。',
  },
  {
    id: 'llm-scientific-discovery',
    name: 'LLM for Scientific Discovery',
    type: 'Concept',
    description: 'LLMの科学的仮説生成能力。GPT-4が乳がん治療の薬物組み合わせを仮説生成、実験で12組中3組が正の相乗効果を実証。hallucination が有用な仮説となりうる。',
  },
];

// ============================================================================
// 主要な研究者・組織
// ============================================================================

const persons: Entity[] = [
  {
    id: 'rafael-rafailov',
    name: 'Rafael Rafailov',
    type: 'Person',
    description: 'Stanford大学のAI研究者。Direct Preference Optimization (DPO)の主著者。LLMの選好最適化の簡素化に貢献。',
  },
  {
    id: 'albert-gu',
    name: 'Albert Gu',
    type: 'Person',
    description: 'Carnegie Mellon/Princeton大学の研究者。State Space Models、S4、Mambaの開発者。Transformerに代わるアーキテクチャを追求。',
  },
  {
    id: 'tri-dao',
    name: 'Tri Dao',
    type: 'Person',
    description: 'Princeton大学の研究者。Flash Attention、Mambaの共同開発者。hardware-awareなアルゴリズム設計で効率化に貢献。',
  },
  {
    id: 'sepp-hochreiter',
    name: 'Sepp Hochreiter',
    type: 'Person',
    description: 'LSTM (Long Short-Term Memory)の発明者。Johannes Kepler大学教授。xLSTMでLSTMの現代的復活を主導。',
  },
  {
    id: 'joon-sung-park',
    name: 'Joon Sung Park',
    type: 'Person',
    description: 'Stanford大学の研究者。Generative Agentsの主著者。LLMによる人間行動シミュレーションを開拓。',
  },
  {
    id: 'charlie-snell',
    name: 'Charlie Snell',
    type: 'Person',
    description: 'UC Berkeley/Google DeepMindの研究者。Test-Time Compute Scalingの主著者。推論時計算の最適化を提唱。',
  },
  {
    id: 'stella-biderman',
    name: 'Stella Biderman',
    type: 'Person',
    description: 'EleutherAIの研究ディレクター。lm-evaluation-harnessの主著者。オープンLLM評価の標準化に貢献。',
  },
  {
    id: 'nathan-lambert',
    name: 'Nathan Lambert',
    type: 'Person',
    description: 'Allen AIの研究者。Tulu 3の主著者。オープンpost-trainingレシピの公開に貢献。',
  },
];

const organizations: Entity[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek AI',
    type: 'Organization',
    description: '中国のAI研究企業。DeepSeek-V2/R1/Mathなど革新的モデルを開発。MoE、MLA、GRPOなどの技術革新でオープンモデルをリード。',
  },
  {
    id: 'mistral-ai',
    name: 'Mistral AI',
    type: 'Organization',
    description: 'フランスのAIスタートアップ。Mistral 7B、Mixtral 8x7Bなど効率的なオープンモデルを開発。Apache 2.0ライセンスで公開。',
  },
  {
    id: 'allen-ai',
    name: 'Allen Institute for AI (AI2)',
    type: 'Organization',
    description: 'Paul Allenが設立したAI研究所。Tulu、OLMo、Unified-IOなどオープン研究を推進。完全なレシピ公開を重視。',
  },
  {
    id: 'eleutherai',
    name: 'EleutherAI',
    type: 'Organization',
    description: '非営利のAI研究コレクティブ。GPT-NeoX、The Pile、lm-evaluation-harnessなどオープンAI研究を推進。',
  },
];

// ============================================================================
// 関係性の定義
// ============================================================================

const relations: Relation[] = [
  // モデル → 技術
  { source: 'deepseek-r1', target: 'emergent-reasoning', type: 'DEMONSTRATES' },
  { source: 'deepseek-r1', target: 'cold-start-data', type: 'USES' },
  { source: 'deepseek-v2', target: 'mla', type: 'IMPLEMENTS' },
  { source: 'deepseek-v2', target: 'deepseek-moe', type: 'IMPLEMENTS' },
  { source: 'deepseek-math', target: 'grpo', type: 'INTRODUCES' },
  { source: 'deepseek-math', target: 'math-benchmark', type: 'EVALUATED_ON' },
  
  { source: 'mamba', target: 'selective-ssm', type: 'IMPLEMENTS' },
  { source: 'xlstm', target: 'sepp-hochreiter', type: 'DEVELOPED_BY' },
  
  { source: 'mistral-7b', target: 'gqa', type: 'USES' },
  { source: 'mistral-7b', target: 'swa', type: 'USES' },
  { source: 'mixtral-8x7b', target: 'mistral-ai', type: 'DEVELOPED_BY' },
  
  { source: 'gemma-2', target: 'knowledge-distillation-llm', type: 'USES' },
  { source: 'gemma-2', target: 'local-global-attention', type: 'USES' },
  { source: 'gemma-2', target: 'gqa', type: 'USES' },
  
  { source: 'gpt-4o', target: 'omni-model', type: 'EXEMPLIFIES' },
  
  { source: 'smaug', target: 'dpop', type: 'TRAINED_WITH' },
  { source: 'tulu-3', target: 'dpo', type: 'USES' },
  { source: 'tulu-3', target: 'rlvr', type: 'INTRODUCES' },
  { source: 'tulu-3', target: 'allen-ai', type: 'DEVELOPED_BY' },
  { source: 'tulu-3', target: 'nathan-lambert', type: 'AUTHORED_BY' },
  
  // 技術 → 人物/組織
  { source: 'dpo', target: 'rafael-rafailov', type: 'PROPOSED_BY' },
  { source: 'selective-ssm', target: 'albert-gu', type: 'DEVELOPED_BY' },
  { source: 'mamba', target: 'tri-dao', type: 'CO_DEVELOPED_BY' },
  { source: 'test-time-compute-scaling', target: 'charlie-snell', type: 'PROPOSED_BY' },
  { source: 'lm-eval-harness', target: 'stella-biderman', type: 'DEVELOPED_BY' },
  { source: 'lm-eval-harness', target: 'eleutherai', type: 'DEVELOPED_BY' },
  
  // 技術 → 技術 (関連・発展)
  { source: 'dpop', target: 'dpo', type: 'EXTENDS' },
  { source: 'orpo', target: 'dpo', type: 'ALTERNATIVE_TO' },
  { source: 'grpo', target: 'dpo', type: 'VARIANT_OF' },
  { source: 'iterative-rpo', target: 'dpo', type: 'BUILDS_ON' },
  { source: 'mcts-dpo', target: 'dpo', type: 'COMBINES_WITH' },
  { source: 'mctsr', target: 'mcts-dpo', type: 'RELATED_TO' },
  
  // 概念 → 応用
  { source: 'generative-agent', target: 'joon-sung-park', type: 'PROPOSED_BY' },
  { source: 'process-verifier', target: 'test-time-compute-scaling', type: 'COMPONENT_OF' },
  
  // ベンチマーク評価
  { source: 'wildbench', target: 'llama-3', type: 'EVALUATES' },
  { source: 'scicode', target: 'qwen25-coder', type: 'EVALUATES' },
  { source: 'olympiad-bench', target: 'mctsr', type: 'EVALUATED_BY' },
  
  // 組織 → モデル
  { source: 'deepseek-r1', target: 'deepseek', type: 'DEVELOPED_BY' },
  { source: 'deepseek-v2', target: 'deepseek', type: 'DEVELOPED_BY' },
  { source: 'deepseek-math', target: 'deepseek', type: 'DEVELOPED_BY' },
  { source: 'qwen25-coder', target: 'alibaba', type: 'DEVELOPED_BY' },
  
  // モデル系譜
  { source: 'gemma-2', target: 'gemma', type: 'SUCCESSOR_OF' },
  { source: 'llama-3', target: 'llama-2', type: 'SUCCESSOR_OF' },
  { source: 'deepseek-v2', target: 'deepseek', type: 'PART_OF_SERIES' },
];

// ============================================================================
// Publications
// ============================================================================

const publications: Entity[] = [
  {
    id: 'paper-deepseek-r1',
    name: 'DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning',
    type: 'Publication',
    description: 'arXiv:2501.12948 (Jan 2025)。DeepSeek-R1/R1-ZeroのRLによる推論能力獲得を報告。SFTなしのRLでemergent reasoning、multi-stage trainingでo1級性能。',
  },
  {
    id: 'paper-deepseek-v2',
    name: 'DeepSeek-V2: A Strong, Economical, and Efficient Mixture-of-Experts Language Model',
    type: 'Publication',
    description: 'arXiv:2405.04434 (May 2024)。MLA、DeepSeekMoEによる効率的な236B MoEモデル。学習コスト42.5%削減、KVキャッシュ93.3%削減。',
  },
  {
    id: 'paper-dpo',
    name: 'Direct Preference Optimization: Your Language Model is Secretly a Reward Model',
    type: 'Publication',
    description: 'arXiv:2305.18290 (May 2023)。RLHFを単純な分類損失で解くDPOを提案。NeurIPS 2023最優秀論文候補。',
  },
  {
    id: 'paper-mamba',
    name: 'Mamba: Linear-Time Sequence Modeling with Selective State Spaces',
    type: 'Publication',
    description: 'arXiv:2312.00752 (Dec 2023)。Selective SSMによる線形時間系列モデル。Transformer代替として注目。',
  },
  {
    id: 'paper-llama3',
    name: 'The Llama 3 Herd of Models',
    type: 'Publication',
    description: 'arXiv:2407.21783 (Jul 2024)。405Bパラメータの密Transformerで128K context。GPT-4と同等品質のオープンモデル。',
  },
  {
    id: 'paper-gemma2',
    name: 'Gemma 2: Improving Open Language Models at a Practical Size',
    type: 'Publication',
    description: 'arXiv:2408.00118 (Aug 2024)。知識蒸留、local-global attention等で2-27Bのstate-of-the-artオープンモデル。',
  },
  {
    id: 'paper-mixtral',
    name: 'Mixtral of Experts',
    type: 'Publication',
    description: 'arXiv:2401.04088 (Jan 2024)。8x7B Sparse MoEで47Bパラメータ中13B active。Llama 2 70BとGPT-3.5を上回る。',
  },
  {
    id: 'paper-galore',
    name: 'GaLore: Memory-Efficient LLM Training by Gradient Low-Rank Projection',
    type: 'Publication',
    description: 'arXiv:2403.03507 (Mar 2024)。勾配低ランク射影で省メモリfull-parameter学習。ICML 2024 Oral。RTX 4090で7B学習を実現。',
  },
  {
    id: 'paper-test-time-compute',
    name: 'Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters',
    type: 'Publication',
    description: 'arXiv:2408.03314 (Aug 2024)。推論時計算の最適割り当てで14倍大きいモデルを上回る。compute-optimal戦略で4倍効率化。',
  },
  {
    id: 'paper-tulu3',
    name: 'Tulu 3: Pushing Frontiers in Open Language Model Post-Training',
    type: 'Publication',
    description: 'arXiv:2411.15124 (Nov 2024)。完全オープンなpost-trainingレシピ。SFT+DPO+RLVRでGPT-4o-mini/Claude 3.5-Haiku超え。',
  },
  {
    id: 'paper-generative-agents',
    name: 'Generative Agent Simulations of 1,000 People',
    type: 'Publication',
    description: 'arXiv:2411.10109 (Nov 2024)。1,052人の実在個人をLLMでシミュレート。General Social Surveyを85%再現。',
  },
  {
    id: 'paper-orpo',
    name: 'ORPO: Monolithic Preference Optimization without Reference Model',
    type: 'Publication',
    description: 'arXiv:2403.07691 (Mar 2024)。参照モデル不要の一体型preference optimization。odds ratioで効率的なSFT。',
  },
];

// ============================================================================
// 追加の関係性
// ============================================================================

const publicationRelations: Relation[] = [
  { source: 'paper-deepseek-r1', target: 'deepseek-r1', type: 'DESCRIBES' },
  { source: 'paper-deepseek-v2', target: 'deepseek-v2', type: 'DESCRIBES' },
  { source: 'paper-dpo', target: 'dpo', type: 'INTRODUCES' },
  { source: 'paper-dpo', target: 'rafael-rafailov', type: 'AUTHORED_BY' },
  { source: 'paper-mamba', target: 'mamba', type: 'INTRODUCES' },
  { source: 'paper-mamba', target: 'albert-gu', type: 'AUTHORED_BY' },
  { source: 'paper-mamba', target: 'tri-dao', type: 'AUTHORED_BY' },
  { source: 'paper-llama3', target: 'llama-3', type: 'DESCRIBES' },
  { source: 'paper-gemma2', target: 'gemma-2', type: 'DESCRIBES' },
  { source: 'paper-mixtral', target: 'mixtral-8x7b', type: 'DESCRIBES' },
  { source: 'paper-galore', target: 'galore', type: 'INTRODUCES' },
  { source: 'paper-test-time-compute', target: 'test-time-compute-scaling', type: 'INTRODUCES' },
  { source: 'paper-test-time-compute', target: 'charlie-snell', type: 'AUTHORED_BY' },
  { source: 'paper-tulu3', target: 'tulu-3', type: 'DESCRIBES' },
  { source: 'paper-tulu3', target: 'nathan-lambert', type: 'AUTHORED_BY' },
  { source: 'paper-generative-agents', target: 'generative-agent', type: 'INTRODUCES' },
  { source: 'paper-generative-agents', target: 'joon-sung-park', type: 'AUTHORED_BY' },
  { source: 'paper-orpo', target: 'orpo', type: 'INTRODUCES' },
];

// ============================================================================
// データベース投入
// ============================================================================

async function ingest() {
  const session = driver.session();
  
  try {
    // 全エンティティを結合
    const allEntities: Entity[] = [
      ...aiModels,
      ...techniques,
      ...benchmarks,
      ...concepts,
      ...persons,
      ...organizations,
      ...publications,
    ];

    // 全リレーションを結合
    const allRelations: Relation[] = [
      ...relations,
      ...publicationRelations,
    ];

    console.log(`\n📚 2024-2025年AI/LLM論文データの投入開始`);
    console.log(`   エンティティ: ${allEntities.length}件`);
    console.log(`   リレーション: ${allRelations.length}件\n`);

    // エンティティ投入
    let entityCount = 0;
    for (const entity of allEntities) {
      await session.run(
        `
        MERGE (e:Entity {id: $id})
        SET e.name = $name,
            e.type = $type,
            e.description = $description,
            e.updatedAt = datetime()
        `,
        entity
      );
      entityCount++;
    }
    console.log(`✅ ${entityCount}件のエンティティを投入`);

    // リレーション投入
    let relCount = 0;
    for (const rel of allRelations) {
      await session.run(
        `
        MATCH (s:Entity {id: $source})
        MATCH (t:Entity {id: $target})
        MERGE (s)-[r:RELATES_TO {type: $type}]->(t)
        SET r.updatedAt = datetime()
        `,
        rel
      );
      relCount++;
    }
    console.log(`✅ ${relCount}件のリレーションを投入`);

    // 統計表示
    const stats = await session.run(`
      MATCH (n:Entity)
      RETURN n.type as type, count(*) as count
      ORDER BY count DESC
    `);
    
    console.log('\n📊 データベース統計:');
    for (const record of stats.records) {
      console.log(`   ${record.get('type')}: ${record.get('count')}`);
    }

  } finally {
    await session.close();
    await driver.close();
  }
}

ingest().catch(console.error);
