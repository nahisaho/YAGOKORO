/**
 * Generative AI 系譜 初期シードデータ
 * 
 * YAGOKOROナレッジグラフの初期データセット
 * - 主要AIモデル、組織、人物、技術、論文、ベンチマーク
 * - 2017年（Transformer登場）〜2024年を中心にカバー
 */

import type {
  AIModel,
  Organization,
  Person,
  Publication,
  Technique,
  Benchmark,
  Concept,
} from '@yagokoro/domain';

// =============================================================================
// Organizations（組織）
// =============================================================================

export const organizations: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    type: 'Organization',
    name: 'OpenAI',
    description: 'AI研究企業。GPTシリーズ、DALL-E、Whisper等を開発。2015年設立。',
    properties: {
      founded: '2015-12-11',
      headquarters: 'San Francisco, CA, USA',
      website: 'https://openai.com',
      type: 'Research Lab / Company',
    },
  },
  {
    type: 'Organization',
    name: 'Anthropic',
    description: 'AI安全性研究企業。Claudeシリーズを開発。OpenAI出身者が2021年に設立。',
    properties: {
      founded: '2021-01-28',
      headquarters: 'San Francisco, CA, USA',
      website: 'https://anthropic.com',
      type: 'Research Lab / Company',
    },
  },
  {
    type: 'Organization',
    name: 'Google DeepMind',
    description: 'Alphabet傘下のAI研究機関。Gemini、AlphaFold、AlphaGo等を開発。',
    properties: {
      founded: '2010-01-01',
      headquarters: 'London, UK',
      website: 'https://deepmind.google',
      type: 'Research Lab',
      note: '2023年にGoogle BrainとDeepMindが統合',
    },
  },
  {
    type: 'Organization',
    name: 'Meta AI',
    description: 'Meta（旧Facebook）のAI研究部門。LLaMA、SAM等を開発。',
    properties: {
      founded: '2013-12-01',
      headquarters: 'Menlo Park, CA, USA',
      website: 'https://ai.meta.com',
      type: 'Research Lab',
      formerName: 'Facebook AI Research (FAIR)',
    },
  },
  {
    type: 'Organization',
    name: 'Microsoft Research',
    description: 'Microsoftの研究部門。Azure AI、Copilot等を展開。OpenAIに大規模投資。',
    properties: {
      founded: '1991-01-01',
      headquarters: 'Redmond, WA, USA',
      website: 'https://www.microsoft.com/research',
      type: 'Research Lab',
    },
  },
  {
    type: 'Organization',
    name: 'Google Research',
    description: 'Googleの研究部門。Transformerを発明。BERT、T5等を開発。',
    properties: {
      founded: '2006-01-01',
      headquarters: 'Mountain View, CA, USA',
      website: 'https://research.google',
      type: 'Research Lab',
    },
  },
  {
    type: 'Organization',
    name: 'Mistral AI',
    description: 'フランスのAIスタートアップ。高効率なオープンソースLLMを開発。',
    properties: {
      founded: '2023-04-01',
      headquarters: 'Paris, France',
      website: 'https://mistral.ai',
      type: 'Startup',
    },
  },
  {
    type: 'Organization',
    name: 'Stability AI',
    description: 'オープンソースの生成AIを推進。Stable Diffusionを公開。',
    properties: {
      founded: '2019-01-01',
      headquarters: 'London, UK',
      website: 'https://stability.ai',
      type: 'Startup',
    },
  },
  {
    type: 'Organization',
    name: 'Hugging Face',
    description: 'AIモデル・データセットのオープンプラットフォームを運営。Transformersライブラリ開発。',
    properties: {
      founded: '2016-01-01',
      headquarters: 'New York, NY, USA',
      website: 'https://huggingface.co',
      type: 'Platform / Company',
    },
  },
  {
    type: 'Organization',
    name: 'NVIDIA',
    description: 'GPU・AIチップメーカー。CUDA、cuDNN等のAI基盤技術を提供。',
    properties: {
      founded: '1993-01-01',
      headquarters: 'Santa Clara, CA, USA',
      website: 'https://nvidia.com',
      type: 'Hardware / Software Company',
    },
  },
];

// =============================================================================
// Persons（人物）
// =============================================================================

export const persons: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    type: 'Person',
    name: 'Sam Altman',
    description: 'OpenAI CEO。Y Combinator元社長。GPTシリーズの商用化を推進。',
    properties: {
      role: 'CEO',
      affiliation: 'OpenAI',
      nationality: 'American',
    },
  },
  {
    type: 'Person',
    name: 'Ilya Sutskever',
    description: 'OpenAI共同創業者・元主任科学者。GPTアーキテクチャの主導者。2024年にSSI設立。',
    properties: {
      role: 'Co-founder, Former Chief Scientist',
      affiliation: 'Safe Superintelligence Inc. (SSI)',
      formerAffiliation: 'OpenAI',
      nationality: 'Israeli-Canadian',
    },
  },
  {
    type: 'Person',
    name: 'Dario Amodei',
    description: 'Anthropic CEO・共同創業者。元OpenAI VP of Research。AI安全性研究の第一人者。',
    properties: {
      role: 'CEO, Co-founder',
      affiliation: 'Anthropic',
      formerAffiliation: 'OpenAI',
      nationality: 'American',
    },
  },
  {
    type: 'Person',
    name: 'Demis Hassabis',
    description: 'Google DeepMind CEO・共同創業者。AlphaGo、AlphaFoldの開発を主導。2024年ノーベル化学賞受賞。',
    properties: {
      role: 'CEO, Co-founder',
      affiliation: 'Google DeepMind',
      nationality: 'British',
      awards: ['Nobel Prize in Chemistry 2024'],
    },
  },
  {
    type: 'Person',
    name: 'Yann LeCun',
    description: 'Meta AI主任科学者。CNNの発明者。2018年チューリング賞受賞。World Models提唱者。',
    properties: {
      role: 'Chief AI Scientist',
      affiliation: 'Meta AI',
      nationality: 'French-American',
      awards: ['Turing Award 2018'],
    },
  },
  {
    type: 'Person',
    name: 'Geoffrey Hinton',
    description: 'ディープラーニングの父。バックプロパゲーション、Dropout等を開発。2024年ノーベル物理学賞受賞。',
    properties: {
      role: 'Professor Emeritus',
      affiliation: 'University of Toronto',
      formerAffiliation: 'Google',
      nationality: 'British-Canadian',
      awards: ['Turing Award 2018', 'Nobel Prize in Physics 2024'],
    },
  },
  {
    type: 'Person',
    name: 'Yoshua Bengio',
    description: 'ディープラーニングのパイオニア。注意機構の発明に貢献。2018年チューリング賞受賞。',
    properties: {
      role: 'Professor, Scientific Director',
      affiliation: 'Mila, University of Montreal',
      nationality: 'Canadian',
      awards: ['Turing Award 2018'],
    },
  },
  {
    type: 'Person',
    name: 'Ashish Vaswani',
    description: 'Transformerアーキテクチャの主著者。"Attention Is All You Need"論文の筆頭著者。',
    properties: {
      role: 'Co-founder',
      affiliation: 'Essential AI',
      formerAffiliation: 'Google Research',
      nationality: 'Indian-American',
    },
  },
  {
    type: 'Person',
    name: 'Andrej Karpathy',
    description: 'AI研究者・教育者。Tesla元AI Director、OpenAI元研究者。深層学習の教育に貢献。',
    properties: {
      role: 'Independent Researcher',
      formerAffiliation: 'Tesla, OpenAI',
      nationality: 'Slovak-Canadian',
    },
  },
  {
    type: 'Person',
    name: 'Arthur Mensch',
    description: 'Mistral AI CEO・共同創業者。元Google DeepMind研究者。',
    properties: {
      role: 'CEO, Co-founder',
      affiliation: 'Mistral AI',
      formerAffiliation: 'Google DeepMind',
      nationality: 'French',
    },
  },
];

// =============================================================================
// Techniques（技術）
// =============================================================================

export const techniques: Omit<Technique, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    type: 'Technique',
    name: 'Transformer',
    description: 'Self-Attentionに基づくニューラルネットワークアーキテクチャ。2017年にGoogleが発表。現代LLMの基盤。',
    properties: {
      category: 'Architecture',
      introducedYear: 2017,
      keyComponents: ['Self-Attention', 'Multi-Head Attention', 'Position Encoding', 'Feed-Forward Network'],
    },
  },
  {
    type: 'Technique',
    name: 'Self-Attention',
    description: '入力シーケンス内の各要素が他のすべての要素との関連性を計算する機構。',
    properties: {
      category: 'Attention Mechanism',
      complexity: 'O(n²)',
      variants: ['Scaled Dot-Product Attention', 'Multi-Head Attention'],
    },
  },
  {
    type: 'Technique',
    name: 'RLHF',
    description: 'Reinforcement Learning from Human Feedback。人間のフィードバックを用いた強化学習でモデルを微調整。',
    properties: {
      category: 'Training Method',
      fullName: 'Reinforcement Learning from Human Feedback',
      components: ['Reward Model', 'PPO', 'Human Preference Data'],
    },
  },
  {
    type: 'Technique',
    name: 'Chain-of-Thought',
    description: '推論過程を段階的に出力させることでLLMの推論能力を向上させるプロンプティング手法。',
    properties: {
      category: 'Prompting',
      introducedYear: 2022,
      variants: ['Zero-shot CoT', 'Few-shot CoT', 'Self-Consistency'],
    },
  },
  {
    type: 'Technique',
    name: 'Mixture of Experts',
    description: '複数の専門家ネットワークを条件付きで活性化するアーキテクチャ。計算効率を向上。',
    properties: {
      category: 'Architecture',
      abbreviation: 'MoE',
      benefit: 'Sparse Activation for Efficiency',
    },
  },
  {
    type: 'Technique',
    name: 'RAG',
    description: 'Retrieval-Augmented Generation。外部知識を検索して生成に活用する手法。',
    properties: {
      category: 'Architecture Pattern',
      fullName: 'Retrieval-Augmented Generation',
      introducedYear: 2020,
    },
  },
  {
    type: 'Technique',
    name: 'LoRA',
    description: 'Low-Rank Adaptation。大規模モデルを効率的に微調整するパラメータ効率的手法。',
    properties: {
      category: 'Fine-tuning',
      fullName: 'Low-Rank Adaptation',
      benefit: 'Memory Efficient Fine-tuning',
    },
  },
  {
    type: 'Technique',
    name: 'Flash Attention',
    description: 'IO-awareなAttention計算アルゴリズム。メモリ効率と速度を大幅に改善。',
    properties: {
      category: 'Optimization',
      introducedYear: 2022,
      benefit: '2-4x speedup, reduced memory',
    },
  },
  {
    type: 'Technique',
    name: 'Constitutional AI',
    description: 'AIシステムに憲法的原則を組み込み、自己批判と改善を行わせる手法。Anthropicが開発。',
    properties: {
      category: 'Alignment',
      introducedYear: 2022,
      developer: 'Anthropic',
    },
  },
  {
    type: 'Technique',
    name: 'Diffusion Model',
    description: 'データにノイズを加え、それを逆転させる過程を学習する生成モデル。画像生成で革命を起こした。',
    properties: {
      category: 'Generative Model',
      introducedYear: 2020,
      applications: ['Image Generation', 'Video Generation', 'Audio'],
    },
  },
];

// =============================================================================
// AI Models（AIモデル）
// =============================================================================

export const aiModels: Omit<AIModel, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // OpenAI Models
  {
    type: 'AIModel',
    name: 'GPT-4',
    description: 'OpenAIのマルチモーダル大規模言語モデル。高度な推論・創造性を実現。',
    properties: {
      releaseDate: '2023-03-14',
      developer: 'OpenAI',
      modality: ['Text', 'Image'],
      contextWindow: 128000,
      architecture: 'Transformer (Decoder-only)',
    },
  },
  {
    type: 'AIModel',
    name: 'GPT-4o',
    description: 'GPT-4のOmniモデル。テキスト・画像・音声をネイティブに処理。',
    properties: {
      releaseDate: '2024-05-13',
      developer: 'OpenAI',
      modality: ['Text', 'Image', 'Audio'],
      contextWindow: 128000,
      architecture: 'Transformer (Decoder-only, Multimodal)',
    },
  },
  {
    type: 'AIModel',
    name: 'o1',
    description: 'OpenAIの推論特化モデル。思考連鎖を内部で実行し、複雑な推論タスクに対応。',
    properties: {
      releaseDate: '2024-09-12',
      developer: 'OpenAI',
      modality: ['Text'],
      specialization: 'Reasoning',
      architecture: 'Transformer with Chain-of-Thought',
    },
  },
  {
    type: 'AIModel',
    name: 'GPT-3.5',
    description: 'ChatGPTの基盤モデル。2022年にリリースされ、対話AIブームを牽引。',
    properties: {
      releaseDate: '2022-11-30',
      developer: 'OpenAI',
      modality: ['Text'],
      parameterCount: '175B',
      architecture: 'Transformer (Decoder-only)',
    },
  },
  {
    type: 'AIModel',
    name: 'DALL-E 3',
    description: 'OpenAIのテキストから画像を生成するモデル。高品質な画像生成を実現。',
    properties: {
      releaseDate: '2023-10-01',
      developer: 'OpenAI',
      modality: ['Text-to-Image'],
      architecture: 'Diffusion Model',
    },
  },
  // Anthropic Models
  {
    type: 'AIModel',
    name: 'Claude 3.5 Sonnet',
    description: 'Anthropicのフラッグシップモデル。高い性能とコスト効率のバランス。',
    properties: {
      releaseDate: '2024-06-20',
      developer: 'Anthropic',
      modality: ['Text', 'Image'],
      contextWindow: 200000,
      architecture: 'Transformer (Decoder-only)',
    },
  },
  {
    type: 'AIModel',
    name: 'Claude 3 Opus',
    description: 'Anthropicの最高性能モデル。複雑なタスクと深い分析に対応。',
    properties: {
      releaseDate: '2024-03-04',
      developer: 'Anthropic',
      modality: ['Text', 'Image'],
      contextWindow: 200000,
      architecture: 'Transformer (Decoder-only)',
    },
  },
  // Google Models
  {
    type: 'AIModel',
    name: 'Gemini 1.5 Pro',
    description: 'Google DeepMindの長文脈マルチモーダルモデル。100万トークン以上の文脈を処理可能。',
    properties: {
      releaseDate: '2024-02-15',
      developer: 'Google DeepMind',
      modality: ['Text', 'Image', 'Video', 'Audio'],
      contextWindow: 2000000,
      architecture: 'Transformer (MoE)',
    },
  },
  {
    type: 'AIModel',
    name: 'Gemini 2.0 Flash',
    description: 'Googleの次世代AIモデル。マルチモーダルネイティブでエージェント機能を強化。',
    properties: {
      releaseDate: '2024-12-11',
      developer: 'Google DeepMind',
      modality: ['Text', 'Image', 'Video', 'Audio'],
      features: ['Native Tool Use', 'Multimodal Output'],
      architecture: 'Transformer',
    },
  },
  {
    type: 'AIModel',
    name: 'BERT',
    description: 'Googleが開発した双方向Transformerモデル。事前学習→ファインチューニングのパラダイムを確立。',
    properties: {
      releaseDate: '2018-10-11',
      developer: 'Google Research',
      modality: ['Text'],
      parameterCount: '340M (Large)',
      architecture: 'Transformer (Encoder-only)',
    },
  },
  // Meta Models
  {
    type: 'AIModel',
    name: 'LLaMA 3.1',
    description: 'Metaのオープンソース大規模言語モデル。405Bパラメータ版は最大級のオープンモデル。',
    properties: {
      releaseDate: '2024-07-23',
      developer: 'Meta AI',
      modality: ['Text'],
      parameterCount: '8B / 70B / 405B',
      license: 'Llama 3.1 Community License',
      architecture: 'Transformer (Decoder-only)',
    },
  },
  {
    type: 'AIModel',
    name: 'LLaMA 2',
    description: 'Metaのオープンソースモデル第2世代。商用利用可能なライセンスで公開。',
    properties: {
      releaseDate: '2023-07-18',
      developer: 'Meta AI',
      modality: ['Text'],
      parameterCount: '7B / 13B / 70B',
      license: 'Llama 2 Community License',
      architecture: 'Transformer (Decoder-only)',
    },
  },
  // Mistral Models
  {
    type: 'AIModel',
    name: 'Mistral Large 2',
    description: 'Mistral AIのフラッグシップモデル。123Bパラメータで多言語対応。',
    properties: {
      releaseDate: '2024-07-24',
      developer: 'Mistral AI',
      modality: ['Text'],
      parameterCount: '123B',
      contextWindow: 128000,
      license: 'Mistral Research License',
      architecture: 'Transformer (Decoder-only)',
    },
  },
  {
    type: 'AIModel',
    name: 'Mixtral 8x7B',
    description: 'Mistral AIのMixture of Expertsモデル。効率的に高性能を実現。',
    properties: {
      releaseDate: '2023-12-11',
      developer: 'Mistral AI',
      modality: ['Text'],
      parameterCount: '46.7B (12.9B active)',
      license: 'Apache 2.0',
      architecture: 'Transformer (MoE)',
    },
  },
  // Image Models
  {
    type: 'AIModel',
    name: 'Stable Diffusion XL',
    description: 'Stability AIのオープンソース画像生成モデル。高品質な画像を生成。',
    properties: {
      releaseDate: '2023-07-26',
      developer: 'Stability AI',
      modality: ['Text-to-Image'],
      license: 'Open RAIL-M',
      architecture: 'Latent Diffusion Model',
    },
  },
  {
    type: 'AIModel',
    name: 'Midjourney v6',
    description: 'アート性の高い画像生成AIサービス。Discordベースで提供。',
    properties: {
      releaseDate: '2023-12-21',
      developer: 'Midjourney',
      modality: ['Text-to-Image'],
      architecture: 'Diffusion Model',
    },
  },
];

// =============================================================================
// Publications（論文）
// =============================================================================

export const publications: Omit<Publication, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    type: 'Publication',
    name: 'Attention Is All You Need',
    description: 'Transformerアーキテクチャを提案した革命的論文。現代LLMの基盤を確立。',
    properties: {
      year: 2017,
      venue: 'NeurIPS 2017',
      arxivId: '1706.03762',
      authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar', 'Jakob Uszkoreit', 'Llion Jones', 'Aidan N. Gomez', 'Lukasz Kaiser', 'Illia Polosukhin'],
      citations: 100000,
    },
  },
  {
    type: 'Publication',
    name: 'BERT: Pre-training of Deep Bidirectional Transformers',
    description: 'BERTモデルを提案。双方向の事前学習による言語理解の大幅な改善を実現。',
    properties: {
      year: 2018,
      venue: 'NAACL 2019',
      arxivId: '1810.04805',
      authors: ['Jacob Devlin', 'Ming-Wei Chang', 'Kenton Lee', 'Kristina Toutanova'],
      citations: 80000,
    },
  },
  {
    type: 'Publication',
    name: 'Language Models are Few-Shot Learners',
    description: 'GPT-3を発表。スケーリング則とIn-Context Learningの可能性を示した。',
    properties: {
      year: 2020,
      venue: 'NeurIPS 2020',
      arxivId: '2005.14165',
      authors: ['Tom Brown', 'Benjamin Mann', 'Nick Ryder', 'Melanie Subbiah', 'et al.'],
      citations: 30000,
    },
  },
  {
    type: 'Publication',
    name: 'Training language models to follow instructions with human feedback',
    description: 'InstructGPT論文。RLHFによるモデルのアラインメント手法を確立。',
    properties: {
      year: 2022,
      venue: 'NeurIPS 2022',
      arxivId: '2203.02155',
      authors: ['Long Ouyang', 'Jeff Wu', 'Xu Jiang', 'et al.'],
      citations: 5000,
    },
  },
  {
    type: 'Publication',
    name: 'Chain-of-Thought Prompting Elicits Reasoning in Large Language Models',
    description: 'Chain-of-Thoughtプロンプティングを提案。LLMの推論能力を大幅に向上させた。',
    properties: {
      year: 2022,
      venue: 'NeurIPS 2022',
      arxivId: '2201.11903',
      authors: ['Jason Wei', 'Xuezhi Wang', 'Dale Schuurmans', 'Maarten Bosma', 'Brian Ichter', 'Fei Xia', 'Ed Chi', 'Quoc Le', 'Denny Zhou'],
      citations: 5000,
    },
  },
  {
    type: 'Publication',
    name: 'Constitutional AI: Harmlessness from AI Feedback',
    description: 'Anthropicが提案したAIの自己改善手法。安全なAIシステムの構築に貢献。',
    properties: {
      year: 2022,
      venue: 'arXiv',
      arxivId: '2212.08073',
      authors: ['Yuntao Bai', 'Saurav Kadavath', 'Sandipan Kundu', 'et al.'],
      citations: 1000,
    },
  },
  {
    type: 'Publication',
    name: 'From Local to Global: A Graph RAG Approach to Query-Focused Summarization',
    description: 'Microsoft GraphRAGを提案。階層的コミュニティ検出とグラフベースRAGを統合。',
    properties: {
      year: 2024,
      venue: 'arXiv',
      arxivId: '2404.16130',
      authors: ['Darren Edge', 'Ha Trinh', 'Newman Cheng', 'et al.'],
      citations: 500,
    },
  },
  {
    type: 'Publication',
    name: 'Denoising Diffusion Probabilistic Models',
    description: 'DDPMを提案。現代の拡散モデルの基盤を確立した重要論文。',
    properties: {
      year: 2020,
      venue: 'NeurIPS 2020',
      arxivId: '2006.11239',
      authors: ['Jonathan Ho', 'Ajay Jain', 'Pieter Abbeel'],
      citations: 15000,
    },
  },
];

// =============================================================================
// Benchmarks（ベンチマーク）
// =============================================================================

export const benchmarks: Omit<Benchmark, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    type: 'Benchmark',
    name: 'MMLU',
    description: 'Massive Multitask Language Understanding。57科目にわたる多肢選択問題で知識を測定。',
    properties: {
      fullName: 'Massive Multitask Language Understanding',
      tasks: 57,
      metrics: ['Accuracy'],
      humanBaseline: '89.8%',
    },
  },
  {
    type: 'Benchmark',
    name: 'HumanEval',
    description: 'OpenAIが開発したコード生成ベンチマーク。164のプログラミング問題で構成。',
    properties: {
      tasks: 164,
      metrics: ['pass@k'],
      language: 'Python',
      developer: 'OpenAI',
    },
  },
  {
    type: 'Benchmark',
    name: 'GSM8K',
    description: 'Grade School Math 8K。小学校レベルの数学文章題8.5K問で数学推論能力を測定。',
    properties: {
      fullName: 'Grade School Math 8K',
      tasks: 8500,
      metrics: ['Accuracy'],
      difficulty: 'Elementary Math',
    },
  },
  {
    type: 'Benchmark',
    name: 'GPQA',
    description: 'Graduate-level Google-Proof Q&A。PhD専門家でも難しい高度な科学問題。',
    properties: {
      fullName: 'Graduate-level Google-Proof Q&A',
      metrics: ['Accuracy'],
      difficulty: 'PhD-level',
      domains: ['Physics', 'Chemistry', 'Biology'],
    },
  },
  {
    type: 'Benchmark',
    name: 'ARC-AGI',
    description: 'Abstraction and Reasoning Corpus。AGI測定を目指す抽象的推論ベンチマーク。',
    properties: {
      fullName: 'Abstraction and Reasoning Corpus',
      metrics: ['Accuracy'],
      developer: 'François Chollet',
      note: 'o3が87.5%を達成 (2024)',
    },
  },
  {
    type: 'Benchmark',
    name: 'MT-Bench',
    description: 'Multi-Turn Benchmark。複数ターンの対話能力を測定するベンチマーク。',
    properties: {
      metrics: ['Score (1-10)'],
      evaluator: 'GPT-4 as Judge',
      categories: ['Writing', 'Roleplay', 'Reasoning', 'Math', 'Coding', 'Extraction', 'STEM', 'Humanities'],
    },
  },
];

// =============================================================================
// Concepts（概念）
// =============================================================================

export const concepts: Omit<Concept, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    type: 'Concept',
    name: 'Scaling Laws',
    description: 'モデルサイズ、データ量、計算量とモデル性能の間のべき乗則的関係。',
    properties: {
      relatedPapers: ['Scaling Laws for Neural Language Models', 'Chinchilla'],
      keyInsight: 'Larger models trained on more data perform better predictably',
    },
  },
  {
    type: 'Concept',
    name: 'Emergent Abilities',
    description: 'スケールアップによって突然現れる能力。小規模モデルでは見られない。',
    properties: {
      examples: ['In-Context Learning', 'Chain-of-Thought', 'Instruction Following'],
      threshold: '~100B parameters',
    },
  },
  {
    type: 'Concept',
    name: 'AI Alignment',
    description: 'AI システムを人間の意図・価値観と整合させる研究分野。',
    properties: {
      approaches: ['RLHF', 'Constitutional AI', 'Debate', 'IDA'],
      challenges: ['Value Specification', 'Robustness', 'Scalable Oversight'],
    },
  },
  {
    type: 'Concept',
    name: 'In-Context Learning',
    description: '重みを更新せずに、コンテキスト内の例示から学習する能力。',
    properties: {
      discoveredIn: 'GPT-3 (2020)',
      variants: ['Zero-shot', 'Few-shot', 'Many-shot'],
    },
  },
  {
    type: 'Concept',
    name: 'Hallucination',
    description: 'LLMが事実と異なる情報を生成する現象。根本的な解決は困難とされる。',
    properties: {
      causes: ['Training Data Gaps', 'Statistical Pattern Matching', 'Lack of Grounding'],
      mitigations: ['RAG', 'Fact Checking', 'Calibration'],
    },
  },
  {
    type: 'Concept',
    name: 'AGI',
    description: 'Artificial General Intelligence。人間と同等以上の汎用知能を持つAI。',
    properties: {
      fullName: 'Artificial General Intelligence',
      approaches: ['Scaling', 'World Models', 'Neuro-Symbolic', 'GraphRAG+Ontology'],
      status: 'Not yet achieved',
    },
  },
];

// =============================================================================
// Relations（リレーション定義）
// =============================================================================

export interface SeedRelation {
  sourceType: string;
  sourceName: string;
  targetType: string;
  targetName: string;
  relationType: string;
  properties?: Record<string, unknown>;
}

export const relations: SeedRelation[] = [
  // Organization → Person (EMPLOYS / reverse: EMPLOYED_AT)
  { sourceType: 'Person', sourceName: 'Sam Altman', targetType: 'Organization', targetName: 'OpenAI', relationType: 'EMPLOYED_AT', properties: { role: 'CEO' } },
  { sourceType: 'Person', sourceName: 'Ilya Sutskever', targetType: 'Organization', targetName: 'OpenAI', relationType: 'EMPLOYED_AT', properties: { role: 'Former Chief Scientist', endDate: '2024' } },
  { sourceType: 'Person', sourceName: 'Dario Amodei', targetType: 'Organization', targetName: 'Anthropic', relationType: 'EMPLOYED_AT', properties: { role: 'CEO' } },
  { sourceType: 'Person', sourceName: 'Demis Hassabis', targetType: 'Organization', targetName: 'Google DeepMind', relationType: 'EMPLOYED_AT', properties: { role: 'CEO' } },
  { sourceType: 'Person', sourceName: 'Yann LeCun', targetType: 'Organization', targetName: 'Meta AI', relationType: 'EMPLOYED_AT', properties: { role: 'Chief AI Scientist' } },
  { sourceType: 'Person', sourceName: 'Arthur Mensch', targetType: 'Organization', targetName: 'Mistral AI', relationType: 'EMPLOYED_AT', properties: { role: 'CEO' } },
  { sourceType: 'Person', sourceName: 'Ashish Vaswani', targetType: 'Organization', targetName: 'Google Research', relationType: 'EMPLOYED_AT', properties: { role: 'Former Researcher' } },
  
  // AIModel → Organization (DEVELOPED_BY)
  { sourceType: 'AIModel', sourceName: 'GPT-4', targetType: 'Organization', targetName: 'OpenAI', relationType: 'DEVELOPED_BY' },
  { sourceType: 'AIModel', sourceName: 'GPT-4o', targetType: 'Organization', targetName: 'OpenAI', relationType: 'DEVELOPED_BY' },
  { sourceType: 'AIModel', sourceName: 'o1', targetType: 'Organization', targetName: 'OpenAI', relationType: 'DEVELOPED_BY' },
  { sourceType: 'AIModel', sourceName: 'GPT-3.5', targetType: 'Organization', targetName: 'OpenAI', relationType: 'DEVELOPED_BY' },
  { sourceType: 'AIModel', sourceName: 'DALL-E 3', targetType: 'Organization', targetName: 'OpenAI', relationType: 'DEVELOPED_BY' },
  { sourceType: 'AIModel', sourceName: 'Claude 3.5 Sonnet', targetType: 'Organization', targetName: 'Anthropic', relationType: 'DEVELOPED_BY' },
  { sourceType: 'AIModel', sourceName: 'Claude 3 Opus', targetType: 'Organization', targetName: 'Anthropic', relationType: 'DEVELOPED_BY' },
  { sourceType: 'AIModel', sourceName: 'Gemini 1.5 Pro', targetType: 'Organization', targetName: 'Google DeepMind', relationType: 'DEVELOPED_BY' },
  { sourceType: 'AIModel', sourceName: 'Gemini 2.0 Flash', targetType: 'Organization', targetName: 'Google DeepMind', relationType: 'DEVELOPED_BY' },
  { sourceType: 'AIModel', sourceName: 'BERT', targetType: 'Organization', targetName: 'Google Research', relationType: 'DEVELOPED_BY' },
  { sourceType: 'AIModel', sourceName: 'LLaMA 3.1', targetType: 'Organization', targetName: 'Meta AI', relationType: 'DEVELOPED_BY' },
  { sourceType: 'AIModel', sourceName: 'LLaMA 2', targetType: 'Organization', targetName: 'Meta AI', relationType: 'DEVELOPED_BY' },
  { sourceType: 'AIModel', sourceName: 'Mistral Large 2', targetType: 'Organization', targetName: 'Mistral AI', relationType: 'DEVELOPED_BY' },
  { sourceType: 'AIModel', sourceName: 'Mixtral 8x7B', targetType: 'Organization', targetName: 'Mistral AI', relationType: 'DEVELOPED_BY' },
  { sourceType: 'AIModel', sourceName: 'Stable Diffusion XL', targetType: 'Organization', targetName: 'Stability AI', relationType: 'DEVELOPED_BY' },
  
  // AIModel → Technique (USES_TECHNIQUE)
  { sourceType: 'AIModel', sourceName: 'GPT-4', targetType: 'Technique', targetName: 'Transformer', relationType: 'USES_TECHNIQUE' },
  { sourceType: 'AIModel', sourceName: 'GPT-4', targetType: 'Technique', targetName: 'RLHF', relationType: 'USES_TECHNIQUE' },
  { sourceType: 'AIModel', sourceName: 'GPT-4o', targetType: 'Technique', targetName: 'Transformer', relationType: 'USES_TECHNIQUE' },
  { sourceType: 'AIModel', sourceName: 'o1', targetType: 'Technique', targetName: 'Chain-of-Thought', relationType: 'USES_TECHNIQUE' },
  { sourceType: 'AIModel', sourceName: 'o1', targetType: 'Technique', targetName: 'Transformer', relationType: 'USES_TECHNIQUE' },
  { sourceType: 'AIModel', sourceName: 'Claude 3.5 Sonnet', targetType: 'Technique', targetName: 'Constitutional AI', relationType: 'USES_TECHNIQUE' },
  { sourceType: 'AIModel', sourceName: 'Claude 3.5 Sonnet', targetType: 'Technique', targetName: 'Transformer', relationType: 'USES_TECHNIQUE' },
  { sourceType: 'AIModel', sourceName: 'Claude 3 Opus', targetType: 'Technique', targetName: 'Constitutional AI', relationType: 'USES_TECHNIQUE' },
  { sourceType: 'AIModel', sourceName: 'Gemini 1.5 Pro', targetType: 'Technique', targetName: 'Mixture of Experts', relationType: 'USES_TECHNIQUE' },
  { sourceType: 'AIModel', sourceName: 'Gemini 1.5 Pro', targetType: 'Technique', targetName: 'Transformer', relationType: 'USES_TECHNIQUE' },
  { sourceType: 'AIModel', sourceName: 'BERT', targetType: 'Technique', targetName: 'Transformer', relationType: 'USES_TECHNIQUE' },
  { sourceType: 'AIModel', sourceName: 'LLaMA 3.1', targetType: 'Technique', targetName: 'Transformer', relationType: 'USES_TECHNIQUE' },
  { sourceType: 'AIModel', sourceName: 'Mixtral 8x7B', targetType: 'Technique', targetName: 'Mixture of Experts', relationType: 'USES_TECHNIQUE' },
  { sourceType: 'AIModel', sourceName: 'Mixtral 8x7B', targetType: 'Technique', targetName: 'Transformer', relationType: 'USES_TECHNIQUE' },
  { sourceType: 'AIModel', sourceName: 'Stable Diffusion XL', targetType: 'Technique', targetName: 'Diffusion Model', relationType: 'USES_TECHNIQUE' },
  { sourceType: 'AIModel', sourceName: 'DALL-E 3', targetType: 'Technique', targetName: 'Diffusion Model', relationType: 'USES_TECHNIQUE' },
  
  // AIModel → AIModel (BASED_ON / PRECEDES)
  { sourceType: 'AIModel', sourceName: 'GPT-4', targetType: 'AIModel', targetName: 'GPT-3.5', relationType: 'BASED_ON' },
  { sourceType: 'AIModel', sourceName: 'GPT-4o', targetType: 'AIModel', targetName: 'GPT-4', relationType: 'BASED_ON' },
  { sourceType: 'AIModel', sourceName: 'o1', targetType: 'AIModel', targetName: 'GPT-4', relationType: 'BASED_ON' },
  { sourceType: 'AIModel', sourceName: 'Claude 3.5 Sonnet', targetType: 'AIModel', targetName: 'Claude 3 Opus', relationType: 'BASED_ON' },
  { sourceType: 'AIModel', sourceName: 'LLaMA 3.1', targetType: 'AIModel', targetName: 'LLaMA 2', relationType: 'BASED_ON' },
  { sourceType: 'AIModel', sourceName: 'Gemini 2.0 Flash', targetType: 'AIModel', targetName: 'Gemini 1.5 Pro', relationType: 'BASED_ON' },
  
  // Publication → Person (AUTHORED)
  { sourceType: 'Publication', sourceName: 'Attention Is All You Need', targetType: 'Person', targetName: 'Ashish Vaswani', relationType: 'AUTHORED', properties: { role: 'First Author' } },
  
  // Publication → Technique (introduces)
  { sourceType: 'Technique', sourceName: 'Transformer', targetType: 'Publication', targetName: 'Attention Is All You Need', relationType: 'BASED_ON' },
  { sourceType: 'Technique', sourceName: 'Chain-of-Thought', targetType: 'Publication', targetName: 'Chain-of-Thought Prompting Elicits Reasoning in Large Language Models', relationType: 'BASED_ON' },
  { sourceType: 'Technique', sourceName: 'RLHF', targetType: 'Publication', targetName: 'Training language models to follow instructions with human feedback', relationType: 'BASED_ON' },
  { sourceType: 'Technique', sourceName: 'Constitutional AI', targetType: 'Publication', targetName: 'Constitutional AI: Harmlessness from AI Feedback', relationType: 'BASED_ON' },
  { sourceType: 'Technique', sourceName: 'RAG', targetType: 'Publication', targetName: 'From Local to Global: A Graph RAG Approach to Query-Focused Summarization', relationType: 'BASED_ON' },
  { sourceType: 'Technique', sourceName: 'Diffusion Model', targetType: 'Publication', targetName: 'Denoising Diffusion Probabilistic Models', relationType: 'BASED_ON' },
  
  // AIModel → Benchmark (EVALUATED_ON)
  { sourceType: 'AIModel', sourceName: 'GPT-4', targetType: 'Benchmark', targetName: 'MMLU', relationType: 'EVALUATED_ON', properties: { score: '86.4%' } },
  { sourceType: 'AIModel', sourceName: 'GPT-4', targetType: 'Benchmark', targetName: 'HumanEval', relationType: 'EVALUATED_ON', properties: { score: '67%' } },
  { sourceType: 'AIModel', sourceName: 'Claude 3.5 Sonnet', targetType: 'Benchmark', targetName: 'MMLU', relationType: 'EVALUATED_ON', properties: { score: '88.7%' } },
  { sourceType: 'AIModel', sourceName: 'Claude 3.5 Sonnet', targetType: 'Benchmark', targetName: 'HumanEval', relationType: 'EVALUATED_ON', properties: { score: '92%' } },
  { sourceType: 'AIModel', sourceName: 'Gemini 1.5 Pro', targetType: 'Benchmark', targetName: 'MMLU', relationType: 'EVALUATED_ON', properties: { score: '85.9%' } },
  { sourceType: 'AIModel', sourceName: 'o1', targetType: 'Benchmark', targetName: 'GPQA', relationType: 'EVALUATED_ON', properties: { score: '77.3%' } },
  { sourceType: 'AIModel', sourceName: 'o1', targetType: 'Benchmark', targetName: 'ARC-AGI', relationType: 'EVALUATED_ON', properties: { score: '25%', note: 'o3 achieved 87.5%' } },
  
  // Technique → Technique (dependencies)
  { sourceType: 'Technique', sourceName: 'Self-Attention', targetType: 'Technique', targetName: 'Transformer', relationType: 'MEMBER_OF' },
  { sourceType: 'Technique', sourceName: 'Flash Attention', targetType: 'Technique', targetName: 'Self-Attention', relationType: 'BASED_ON' },
  
  // Person → Organization (EMPLOYED_AT - additional historical relations)
  { sourceType: 'Person', sourceName: 'Dario Amodei', targetType: 'Organization', targetName: 'OpenAI', relationType: 'EMPLOYED_AT', properties: { role: 'Former VP of Research', endDate: '2021' } },
  { sourceType: 'Person', sourceName: 'Andrej Karpathy', targetType: 'Organization', targetName: 'OpenAI', relationType: 'EMPLOYED_AT', properties: { role: 'Former Researcher' } },
];

// =============================================================================
// Export All
// =============================================================================

export const seedData = {
  organizations,
  persons,
  techniques,
  aiModels,
  publications,
  benchmarks,
  concepts,
  relations,
};

export default seedData;
