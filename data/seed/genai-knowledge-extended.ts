/**
 * Generative AI 系譜 追加シードデータ
 * 
 * Phase 2: より詳細な論文、ベンチマーク、人物、モデルを追加
 */

import type { SeedRelation } from './genai-knowledge.js';

// =============================================================================
// Additional Organizations
// =============================================================================

export const additionalOrganizations = [
  {
    type: 'Organization',
    name: 'NVIDIA',
    description: 'GPU大手。CUDA、TensorRT、NeMo等のAI基盤技術を提供。AI計算インフラの中核。',
    properties: {
      founded: '1993-01-01',
      headquarters: 'Santa Clara, CA, USA',
      website: 'https://nvidia.com',
      type: 'Hardware / Software',
    },
  },
  {
    type: 'Organization',
    name: 'Hugging Face',
    description: 'AIモデルハブ・ライブラリのプラットフォーム。Transformers、Datasets、Hub等を提供。',
    properties: {
      founded: '2016-01-01',
      headquarters: 'New York, NY, USA',
      website: 'https://huggingface.co',
      type: 'Platform / Startup',
    },
  },
  {
    type: 'Organization',
    name: 'EleutherAI',
    description: 'オープンソースAI研究コミュニティ。GPT-NeoX、Pythia、The Pile等を公開。',
    properties: {
      founded: '2020-07-01',
      headquarters: 'Decentralized',
      website: 'https://eleuther.ai',
      type: 'Research Collective',
    },
  },
  {
    type: 'Organization',
    name: 'Cohere',
    description: 'エンタープライズ向けLLMプロバイダー。Command、Embed、Rerank等を提供。',
    properties: {
      founded: '2019-01-01',
      headquarters: 'Toronto, Canada',
      website: 'https://cohere.com',
      type: 'Startup',
    },
  },
  {
    type: 'Organization',
    name: 'AI2 (Allen Institute for AI)',
    description: '非営利AI研究機関。OLMo、Semantic Scholar等を開発。Paul Allenが設立。',
    properties: {
      founded: '2014-01-01',
      headquarters: 'Seattle, WA, USA',
      website: 'https://allenai.org',
      type: 'Research Institute',
    },
  },
  {
    type: 'Organization',
    name: 'xAI',
    description: 'Elon Muskが設立したAI企業。Grokシリーズを開発。',
    properties: {
      founded: '2023-07-01',
      headquarters: 'Austin, TX, USA',
      website: 'https://x.ai',
      type: 'Startup',
    },
  },
  {
    type: 'Organization',
    name: 'Amazon',
    description: 'AWS、Alexa、Amazon Bedrock等を展開。Anthropicに大規模投資。',
    properties: {
      founded: '1994-07-05',
      headquarters: 'Seattle, WA, USA',
      website: 'https://aws.amazon.com',
      type: 'Tech Company',
    },
  },
];

// =============================================================================
// Additional Persons
// =============================================================================

export const additionalPersons = [
  {
    type: 'Person',
    name: 'Geoffrey Hinton',
    description: 'ディープラーニングの父。バックプロパゲーション、Boltzmann Machine等を発明。2024年ノーベル物理学賞。',
    properties: {
      affiliation: 'University of Toronto / Google (Former)',
      awards: ['Turing Award 2018', 'Nobel Prize in Physics 2024'],
      contributions: ['Backpropagation', 'Deep Learning', 'Capsule Networks'],
    },
  },
  {
    type: 'Person',
    name: 'Yoshua Bengio',
    description: 'ディープラーニングのパイオニア。Attention、Word2Vec等に貢献。2018年チューリング賞。',
    properties: {
      affiliation: 'Mila / University of Montreal',
      awards: ['Turing Award 2018'],
      contributions: ['Neural Language Models', 'Attention Mechanism', 'GAN Theory'],
    },
  },
  {
    type: 'Person',
    name: 'Andrej Karpathy',
    description: 'AI研究者・教育者。Tesla AI Director、OpenAI研究者を歴任。AI教育に大きく貢献。',
    properties: {
      affiliation: 'Independent / Former Tesla, OpenAI',
      contributions: ['CS231n', 'nanoGPT', 'AI Education'],
      youtube: '@AndrejKarpathy',
    },
  },
  {
    type: 'Person',
    name: 'Noam Shazeer',
    description: 'Transformerの共著者。GoogleでT5等を開発後、Character.AIを共同創業。',
    properties: {
      affiliation: 'Character.AI',
      contributions: ['Transformer', 'T5', 'Switch Transformer'],
    },
  },
  {
    type: 'Person',
    name: 'Alec Radford',
    description: 'OpenAI研究者。GPTシリーズ、CLIP、Whisper等の中心人物。',
    properties: {
      affiliation: 'OpenAI',
      contributions: ['GPT', 'GPT-2', 'CLIP', 'Whisper'],
    },
  },
  {
    type: 'Person',
    name: 'Jason Wei',
    description: 'Chain-of-Thought Promptingの提案者。Google Brain/OpenAIで推論研究。',
    properties: {
      affiliation: 'OpenAI',
      contributions: ['Chain-of-Thought', 'Instruction Tuning', 'FLAN'],
    },
  },
  {
    type: 'Person',
    name: 'Aidan Gomez',
    description: 'Transformerの共著者。Cohereを共同創業しCEO。',
    properties: {
      affiliation: 'Cohere',
      contributions: ['Transformer', 'Cohere'],
      role: 'CEO',
    },
  },
  {
    type: 'Person',
    name: 'François Chollet',
    description: 'Keras開発者。ARC-AGIベンチマーク作成者。AGI測定研究の第一人者。',
    properties: {
      affiliation: 'Google',
      contributions: ['Keras', 'ARC-AGI', 'On the Measure of Intelligence'],
    },
  },
  {
    type: 'Person',
    name: 'Elon Musk',
    description: 'xAI創業者、OpenAI共同創業者（後に離脱）。Tesla、SpaceX等も経営。',
    properties: {
      affiliation: 'xAI / Tesla / SpaceX',
      contributions: ['xAI', 'OpenAI (Co-founder)'],
      role: 'CEO',
    },
  },
  {
    type: 'Person',
    name: 'Jan Leike',
    description: '元OpenAI Alignment Team共同リーダー。AI安全性研究の第一人者。',
    properties: {
      affiliation: 'Anthropic',
      contributions: ['Superalignment', 'RLHF', 'AI Safety'],
      formerAffiliation: 'OpenAI',
    },
  },
];

// =============================================================================
// Additional AI Models
// =============================================================================

export const additionalAIModels = [
  {
    type: 'AIModel',
    name: 'Grok-2',
    description: 'xAIのフラッグシップモデル。リアルタイムX/Twitter情報にアクセス可能。',
    properties: {
      developer: 'xAI',
      releaseYear: 2024,
      capabilities: ['Text Generation', 'Real-time Information', 'Code'],
    },
  },
  {
    type: 'AIModel',
    name: 'Command R+',
    description: 'Cohereのエンタープライズ向けRAG最適化モデル。多言語対応。',
    properties: {
      developer: 'Cohere',
      releaseYear: 2024,
      parameters: '104B',
      capabilities: ['RAG', 'Multilingual', 'Tool Use'],
    },
  },
  {
    type: 'AIModel',
    name: 'OLMo 2',
    description: 'AI2のオープンソースLLM。学習データ、コード、重みを完全公開。',
    properties: {
      developer: 'AI2',
      releaseYear: 2024,
      parameters: '7B / 13B',
      license: 'Apache 2.0',
      openSource: true,
    },
  },
  {
    type: 'AIModel',
    name: 'Pythia',
    description: 'EleutherAIの研究用LLMスイート。スケーリング研究のための詳細ログ公開。',
    properties: {
      developer: 'EleutherAI',
      releaseYear: 2023,
      parameters: '70M - 12B',
      openSource: true,
    },
  },
  {
    type: 'AIModel',
    name: 'Whisper',
    description: 'OpenAIの音声認識モデル。多言語対応。68万時間の音声データで学習。',
    properties: {
      developer: 'OpenAI',
      releaseYear: 2022,
      modality: 'Audio',
      capabilities: ['Speech Recognition', 'Translation', 'Transcription'],
    },
  },
  {
    type: 'AIModel',
    name: 'CLIP',
    description: 'OpenAIのマルチモーダルモデル。画像とテキストの意味的対応を学習。',
    properties: {
      developer: 'OpenAI',
      releaseYear: 2021,
      modality: 'Vision-Language',
      capabilities: ['Zero-shot Classification', 'Image-Text Matching'],
    },
  },
  {
    type: 'AIModel',
    name: 'Sora',
    description: 'OpenAIのテキストから動画を生成するモデル。最大1分の高品質動画。',
    properties: {
      developer: 'OpenAI',
      releaseYear: 2024,
      modality: 'Video',
      capabilities: ['Text-to-Video', 'Video Editing'],
    },
  },
  {
    type: 'AIModel',
    name: 'AlphaFold 3',
    description: 'DeepMindのタンパク質構造予測モデル。ノーベル化学賞につながった研究。',
    properties: {
      developer: 'Google DeepMind',
      releaseYear: 2024,
      domain: 'Biology',
      capabilities: ['Protein Structure Prediction', 'Drug Discovery'],
    },
  },
  {
    type: 'AIModel',
    name: 'Gemma 2',
    description: 'Google DeepMindのオープンウェイトモデル。Geminiの技術を活用。',
    properties: {
      developer: 'Google DeepMind',
      releaseYear: 2024,
      parameters: '2B / 9B / 27B',
      openSource: true,
    },
  },
  {
    type: 'AIModel',
    name: 'Phi-3',
    description: 'MicrosoftのSLM（Small Language Model）。高効率でモバイル動作可能。',
    properties: {
      developer: 'Microsoft',
      releaseYear: 2024,
      parameters: '3.8B / 7B / 14B',
      category: 'SLM',
    },
  },
  {
    type: 'AIModel',
    name: 'DeepSeek-V3',
    description: '中国DeepSeekの高性能モデル。671BパラメータMoEで低コスト学習。',
    properties: {
      developer: 'DeepSeek',
      releaseYear: 2024,
      parameters: '671B (MoE)',
      trainingCost: '$5.58M',
    },
  },
  {
    type: 'AIModel',
    name: 'Qwen2.5',
    description: 'AlibabaのLLMシリーズ。多言語・長文脈・コード対応。0.5B〜72B。',
    properties: {
      developer: 'Alibaba',
      releaseYear: 2024,
      parameters: '0.5B - 72B',
      contextLength: '128K',
    },
  },
];

// =============================================================================
// Additional Publications
// =============================================================================

export const additionalPublications = [
  {
    type: 'Publication',
    name: 'ImageNet Classification with Deep Convolutional Neural Networks',
    description: 'AlexNet論文。深層学習ブームの火付け役。2012年ImageNet優勝。',
    properties: {
      authors: ['Alex Krizhevsky', 'Ilya Sutskever', 'Geoffrey Hinton'],
      year: 2012,
      venue: 'NeurIPS',
      citations: '120000+',
      impact: 'Deep Learning Revolution',
    },
  },
  {
    type: 'Publication',
    name: 'Deep Residual Learning for Image Recognition',
    description: 'ResNet論文。残差接続により超深層ネットワークの学習を可能に。',
    properties: {
      authors: ['Kaiming He', 'Xiangyu Zhang', 'Shaoqing Ren', 'Jian Sun'],
      year: 2015,
      venue: 'CVPR',
      citations: '200000+',
    },
  },
  {
    type: 'Publication',
    name: 'Generative Adversarial Nets',
    description: 'GAN論文。生成器と識別器の敵対的学習による生成モデル。',
    properties: {
      authors: ['Ian Goodfellow', 'Jean Pouget-Abadie', 'Mehdi Mirza', 'Bing Xu', 'David Warde-Farley', 'Sherjil Ozair', 'Aaron Courville', 'Yoshua Bengio'],
      year: 2014,
      venue: 'NeurIPS',
      citations: '70000+',
    },
  },
  {
    type: 'Publication',
    name: 'Improving Language Understanding by Generative Pre-Training',
    description: 'GPT-1論文。大規模事前学習＋ファインチューニングパラダイムの確立。',
    properties: {
      authors: ['Alec Radford', 'Karthik Narasimhan', 'Tim Salimans', 'Ilya Sutskever'],
      year: 2018,
      venue: 'OpenAI',
    },
  },
  {
    type: 'Publication',
    name: 'Language Models are Unsupervised Multitask Learners',
    description: 'GPT-2論文。ゼロショット学習能力の発見。「危険すぎて公開できない」論争。',
    properties: {
      authors: ['Alec Radford', 'Jeffrey Wu', 'Rewon Child', 'David Luan', 'Dario Amodei', 'Ilya Sutskever'],
      year: 2019,
      venue: 'OpenAI',
    },
  },
  {
    type: 'Publication',
    name: 'Scaling Laws for Neural Language Models',
    description: 'OpenAIのスケーリング則論文。モデルサイズ・データ・計算量の関係を定式化。',
    properties: {
      authors: ['Jared Kaplan', 'Sam McCandlish', 'Tom Henighan', 'Tom B. Brown', 'Benjamin Chess', 'Rewon Child', 'Scott Gray', 'Alec Radford', 'Jeffrey Wu', 'Dario Amodei'],
      year: 2020,
      venue: 'arXiv',
    },
  },
  {
    type: 'Publication',
    name: 'Training Compute-Optimal Large Language Models',
    description: 'Chinchilla論文。最適なモデルサイズとデータ量の比率を発見。',
    properties: {
      authors: ['Jordan Hoffmann', 'Sebastian Borgeaud', 'Arthur Mensch', 'et al.'],
      year: 2022,
      venue: 'arXiv',
      impact: 'Changed scaling strategies',
    },
  },
  {
    type: 'Publication',
    name: 'FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness',
    description: 'FlashAttention論文。IO-aware計算でAttentionを大幅高速化。',
    properties: {
      authors: ['Tri Dao', 'Daniel Y. Fu', 'Stefano Ermon', 'Atri Rudra', 'Christopher Ré'],
      year: 2022,
      venue: 'NeurIPS',
    },
  },
  {
    type: 'Publication',
    name: 'Learning Transferable Visual Models From Natural Language Supervision',
    description: 'CLIP論文。自然言語supervision による視覚表現学習。',
    properties: {
      authors: ['Alec Radford', 'Jong Wook Kim', 'Chris Hallacy', 'et al.'],
      year: 2021,
      venue: 'ICML',
    },
  },
  {
    type: 'Publication',
    name: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
    description: 'RAG論文。外部知識検索と生成の統合。Facebook AI Research発。',
    properties: {
      authors: ['Patrick Lewis', 'Ethan Perez', 'Aleksandra Piktus', 'et al.'],
      year: 2020,
      venue: 'NeurIPS',
    },
  },
  {
    type: 'Publication',
    name: 'High-Resolution Image Synthesis with Latent Diffusion Models',
    description: 'Stable Diffusion論文。潜在空間でのDiffusionで効率的な画像生成。',
    properties: {
      authors: ['Robin Rombach', 'Andreas Blattmann', 'Dominik Lorenz', 'Patrick Esser', 'Björn Ommer'],
      year: 2022,
      venue: 'CVPR',
    },
  },
  {
    type: 'Publication',
    name: 'Sparks of Artificial General Intelligence: Early experiments with GPT-4',
    description: 'Microsoft ResearchによるGPT-4の詳細分析。AGIの兆候を報告。',
    properties: {
      authors: ['Sébastien Bubeck', 'Varun Chandrasekaran', 'Ronen Eldan', 'et al.'],
      year: 2023,
      venue: 'arXiv',
    },
  },
];

// =============================================================================
// Additional Techniques
// =============================================================================

export const additionalTechniques = [
  {
    type: 'Technique',
    name: 'LoRA',
    description: 'Low-Rank Adaptation。少数のパラメータでLLMを効率的にファインチューニング。',
    properties: {
      fullName: 'Low-Rank Adaptation',
      year: 2021,
      useCase: 'Efficient Fine-tuning',
      variants: ['QLoRA', 'DoRA'],
    },
  },
  {
    type: 'Technique',
    name: 'Quantization',
    description: 'モデルの重みを低ビット精度に変換。推論の高速化とメモリ削減。',
    properties: {
      variants: ['INT8', 'INT4', 'GPTQ', 'AWQ', 'GGUF'],
      tradeoff: 'Size/Speed vs Quality',
    },
  },
  {
    type: 'Technique',
    name: 'Knowledge Distillation',
    description: '大モデル（教師）の知識を小モデル（生徒）に転移する手法。',
    properties: {
      year: 2015,
      applications: ['Model Compression', 'Edge Deployment'],
    },
  },
  {
    type: 'Technique',
    name: 'Instruction Tuning',
    description: '指示に従うようモデルを微調整。FLAN、InstructGPT等で確立。',
    properties: {
      year: 2021,
      examples: ['FLAN', 'InstructGPT', 'Alpaca'],
    },
  },
  {
    type: 'Technique',
    name: 'DPO',
    description: 'Direct Preference Optimization。RLなしで人間の好みを直接最適化。',
    properties: {
      fullName: 'Direct Preference Optimization',
      year: 2023,
      advantage: 'Simpler than RLHF',
    },
  },
  {
    type: 'Technique',
    name: 'Prompt Engineering',
    description: 'プロンプトの設計によりLLMの出力を制御・改善する技術。',
    properties: {
      techniques: ['Zero-shot', 'Few-shot', 'Chain-of-Thought', 'ReAct'],
    },
  },
  {
    type: 'Technique',
    name: 'Speculative Decoding',
    description: '小モデルで推測し大モデルで検証。推論の大幅高速化。',
    properties: {
      year: 2022,
      speedup: '2-3x',
    },
  },
  {
    type: 'Technique',
    name: 'Rotary Position Embedding',
    description: 'RoPE。相対位置情報を回転行列で表現。長文脈対応に有効。',
    properties: {
      fullName: 'Rotary Position Embedding',
      year: 2021,
      usedBy: ['LLaMA', 'Qwen', 'Mistral'],
    },
  },
];

// =============================================================================
// Additional Benchmarks
// =============================================================================

export const additionalBenchmarks = [
  {
    type: 'Benchmark',
    name: 'HellaSwag',
    description: '常識推論ベンチマーク。文の続きを選択する形式。',
    properties: {
      metrics: ['Accuracy'],
      difficulty: 'Common Sense',
      tasks: 10000,
    },
  },
  {
    type: 'Benchmark',
    name: 'WinoGrande',
    description: '代名詞解決のベンチマーク。Winograd Schema Challengeの大規模版。',
    properties: {
      metrics: ['Accuracy'],
      tasks: 44000,
    },
  },
  {
    type: 'Benchmark',
    name: 'TruthfulQA',
    description: 'LLMの事実性・誠実性を測定するベンチマーク。',
    properties: {
      metrics: ['Truthful %', 'Informative %'],
      categories: ['Health', 'Law', 'Finance', 'Politics'],
    },
  },
  {
    type: 'Benchmark',
    name: 'MBPP',
    description: 'Mostly Basic Python Programming。基本的なPythonコード生成ベンチマーク。',
    properties: {
      fullName: 'Mostly Basic Python Programming',
      tasks: 974,
      metrics: ['Pass@1', 'Pass@10'],
    },
  },
  {
    type: 'Benchmark',
    name: 'BigBench',
    description: 'Beyond the Imitation Game。200以上の多様なタスクを含む大規模ベンチマーク。',
    properties: {
      fullName: 'Beyond the Imitation Game Benchmark',
      tasks: '200+',
      categories: ['Reasoning', 'Knowledge', 'Language'],
    },
  },
  {
    type: 'Benchmark',
    name: 'MATH',
    description: '高校・大学レベルの数学問題。難易度1-5の12,500問。',
    properties: {
      tasks: 12500,
      levels: [1, 2, 3, 4, 5],
      categories: ['Algebra', 'Geometry', 'Number Theory', 'Calculus'],
    },
  },
  {
    type: 'Benchmark',
    name: 'SWE-bench',
    description: 'GitHub issueを解決するソフトウェアエンジニアリングベンチマーク。',
    properties: {
      fullName: 'Software Engineering Benchmark',
      tasks: 2294,
      metrics: ['Resolved %'],
      domain: 'Code',
    },
  },
  {
    type: 'Benchmark',
    name: 'LMSYS Chatbot Arena',
    description: '人間の投票によるLLMランキング。Eloレーティングでモデルを比較。',
    properties: {
      type: 'Human Evaluation',
      metrics: ['Elo Rating'],
      evaluators: 'Crowdsourced',
    },
  },
];

// =============================================================================
// Additional Concepts
// =============================================================================

export const additionalConcepts = [
  {
    type: 'Concept',
    name: 'Test-Time Compute',
    description: '推論時により多くの計算を使うことで性能向上。o1の核心技術。',
    properties: {
      examples: ['Chain-of-Thought', 'Self-Consistency', 'Tree of Thoughts'],
      models: ['o1', 'o3'],
    },
  },
  {
    type: 'Concept',
    name: 'World Model',
    description: '環境の内部表現を学習し、シミュレーションや計画に使用するモデル。',
    properties: {
      advocates: ['Yann LeCun'],
      approaches: ['JEPA', 'Video Prediction'],
    },
  },
  {
    type: 'Concept',
    name: 'Multimodality',
    description: '複数のモダリティ（テキスト、画像、音声等）を統合的に処理する能力。',
    properties: {
      modalities: ['Text', 'Image', 'Audio', 'Video', 'Code'],
      models: ['GPT-4o', 'Gemini', 'Claude 3'],
    },
  },
  {
    type: 'Concept',
    name: 'Agentic AI',
    description: 'ツール使用、計画、自律的行動が可能なAIシステム。',
    properties: {
      capabilities: ['Tool Use', 'Planning', 'Memory', 'Reflection'],
      frameworks: ['AutoGPT', 'LangChain Agents', 'CrewAI'],
    },
  },
  {
    type: 'Concept',
    name: 'Synthetic Data',
    description: 'AI生成データで学習する手法。データ効率とスケーラビリティ向上。',
    properties: {
      risks: ['Model Collapse', 'Bias Amplification'],
      benefits: ['Data Augmentation', 'Privacy'],
    },
  },
  {
    type: 'Concept',
    name: 'Open Source AI',
    description: 'モデルの重み、コード、学習データを公開するAI開発アプローチ。',
    properties: {
      examples: ['LLaMA', 'Mistral', 'OLMo'],
      licenses: ['Apache 2.0', 'MIT', 'CC BY-NC'],
    },
  },
];

// =============================================================================
// Additional Relations
// =============================================================================

export const additionalRelations: SeedRelation[] = [
  // New Organizations
  { sourceType: 'AIModel', sourceName: 'Grok-2', targetType: 'Organization', targetName: 'xAI', relationType: 'DEVELOPED_BY' },
  { sourceType: 'AIModel', sourceName: 'Command R+', targetType: 'Organization', targetName: 'Cohere', relationType: 'DEVELOPED_BY' },
  { sourceType: 'AIModel', sourceName: 'OLMo 2', targetType: 'Organization', targetName: 'AI2 (Allen Institute for AI)', relationType: 'DEVELOPED_BY' },
  { sourceType: 'AIModel', sourceName: 'Pythia', targetType: 'Organization', targetName: 'EleutherAI', relationType: 'DEVELOPED_BY' },
  { sourceType: 'AIModel', sourceName: 'Whisper', targetType: 'Organization', targetName: 'OpenAI', relationType: 'DEVELOPED_BY' },
  { sourceType: 'AIModel', sourceName: 'CLIP', targetType: 'Organization', targetName: 'OpenAI', relationType: 'DEVELOPED_BY' },
  { sourceType: 'AIModel', sourceName: 'Sora', targetType: 'Organization', targetName: 'OpenAI', relationType: 'DEVELOPED_BY' },
  { sourceType: 'AIModel', sourceName: 'AlphaFold 3', targetType: 'Organization', targetName: 'Google DeepMind', relationType: 'DEVELOPED_BY' },
  { sourceType: 'AIModel', sourceName: 'Gemma 2', targetType: 'Organization', targetName: 'Google DeepMind', relationType: 'DEVELOPED_BY' },
  { sourceType: 'AIModel', sourceName: 'Phi-3', targetType: 'Organization', targetName: 'Microsoft Research', relationType: 'DEVELOPED_BY' },
  
  // Person affiliations
  { sourceType: 'Person', sourceName: 'Geoffrey Hinton', targetType: 'Organization', targetName: 'Google Research', relationType: 'EMPLOYED_AT', properties: { role: 'Former VP', endDate: '2023' } },
  { sourceType: 'Person', sourceName: 'Yoshua Bengio', targetType: 'Organization', targetName: 'Google Research', relationType: 'EMPLOYED_AT', properties: { role: 'Advisor' } },
  { sourceType: 'Person', sourceName: 'Noam Shazeer', targetType: 'Organization', targetName: 'Google Research', relationType: 'EMPLOYED_AT', properties: { role: 'Former Researcher' } },
  { sourceType: 'Person', sourceName: 'Alec Radford', targetType: 'Organization', targetName: 'OpenAI', relationType: 'EMPLOYED_AT', properties: { role: 'Researcher' } },
  { sourceType: 'Person', sourceName: 'Jason Wei', targetType: 'Organization', targetName: 'OpenAI', relationType: 'EMPLOYED_AT', properties: { role: 'Researcher' } },
  { sourceType: 'Person', sourceName: 'Aidan Gomez', targetType: 'Organization', targetName: 'Cohere', relationType: 'EMPLOYED_AT', properties: { role: 'CEO' } },
  { sourceType: 'Person', sourceName: 'François Chollet', targetType: 'Organization', targetName: 'Google Research', relationType: 'EMPLOYED_AT', properties: { role: 'Researcher' } },
  { sourceType: 'Person', sourceName: 'Elon Musk', targetType: 'Organization', targetName: 'xAI', relationType: 'EMPLOYED_AT', properties: { role: 'CEO' } },
  { sourceType: 'Person', sourceName: 'Jan Leike', targetType: 'Organization', targetName: 'Anthropic', relationType: 'EMPLOYED_AT', properties: { role: 'Researcher' } },
  
  // Publication authors
  { sourceType: 'Publication', sourceName: 'ImageNet Classification with Deep Convolutional Neural Networks', targetType: 'Person', targetName: 'Geoffrey Hinton', relationType: 'AUTHORED' },
  { sourceType: 'Publication', sourceName: 'ImageNet Classification with Deep Convolutional Neural Networks', targetType: 'Person', targetName: 'Ilya Sutskever', relationType: 'AUTHORED' },
  { sourceType: 'Publication', sourceName: 'Generative Adversarial Nets', targetType: 'Person', targetName: 'Yoshua Bengio', relationType: 'AUTHORED' },
  { sourceType: 'Publication', sourceName: 'Improving Language Understanding by Generative Pre-Training', targetType: 'Person', targetName: 'Alec Radford', relationType: 'AUTHORED' },
  { sourceType: 'Publication', sourceName: 'Improving Language Understanding by Generative Pre-Training', targetType: 'Person', targetName: 'Ilya Sutskever', relationType: 'AUTHORED' },
  { sourceType: 'Publication', sourceName: 'Language Models are Unsupervised Multitask Learners', targetType: 'Person', targetName: 'Alec Radford', relationType: 'AUTHORED' },
  { sourceType: 'Publication', sourceName: 'Language Models are Unsupervised Multitask Learners', targetType: 'Person', targetName: 'Dario Amodei', relationType: 'AUTHORED' },
  { sourceType: 'Publication', sourceName: 'Scaling Laws for Neural Language Models', targetType: 'Person', targetName: 'Dario Amodei', relationType: 'AUTHORED' },
  { sourceType: 'Publication', sourceName: 'Chain-of-Thought Prompting Elicits Reasoning in Large Language Models', targetType: 'Person', targetName: 'Jason Wei', relationType: 'AUTHORED' },
  { sourceType: 'Publication', sourceName: 'Learning Transferable Visual Models From Natural Language Supervision', targetType: 'Person', targetName: 'Alec Radford', relationType: 'AUTHORED' },
  
  // Model techniques
  { sourceType: 'AIModel', sourceName: 'Grok-2', targetType: 'Technique', targetName: 'Transformer', relationType: 'USES_TECHNIQUE' },
  { sourceType: 'AIModel', sourceName: 'Command R+', targetType: 'Technique', targetName: 'RAG', relationType: 'USES_TECHNIQUE' },
  { sourceType: 'AIModel', sourceName: 'Whisper', targetType: 'Technique', targetName: 'Transformer', relationType: 'USES_TECHNIQUE' },
  { sourceType: 'AIModel', sourceName: 'CLIP', targetType: 'Technique', targetName: 'Transformer', relationType: 'USES_TECHNIQUE' },
  { sourceType: 'AIModel', sourceName: 'Sora', targetType: 'Technique', targetName: 'Diffusion Model', relationType: 'USES_TECHNIQUE' },
  { sourceType: 'AIModel', sourceName: 'Sora', targetType: 'Technique', targetName: 'Transformer', relationType: 'USES_TECHNIQUE' },
  { sourceType: 'AIModel', sourceName: 'DeepSeek-V3', targetType: 'Technique', targetName: 'Mixture of Experts', relationType: 'USES_TECHNIQUE' },
  { sourceType: 'AIModel', sourceName: 'Qwen2.5', targetType: 'Technique', targetName: 'Transformer', relationType: 'USES_TECHNIQUE' },
  { sourceType: 'AIModel', sourceName: 'Phi-3', targetType: 'Technique', targetName: 'Transformer', relationType: 'USES_TECHNIQUE' },
  
  // Technique relations
  { sourceType: 'Technique', sourceName: 'LoRA', targetType: 'Technique', targetName: 'Transformer', relationType: 'APPLIES_TO' },
  { sourceType: 'Technique', sourceName: 'DPO', targetType: 'Technique', targetName: 'RLHF', relationType: 'BASED_ON', properties: { note: 'Simpler alternative' } },
  { sourceType: 'Technique', sourceName: 'Flash Attention', targetType: 'Publication', targetName: 'FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness', relationType: 'BASED_ON' },
  
  // Publication → Technique
  { sourceType: 'AIModel', sourceName: 'CLIP', targetType: 'Publication', targetName: 'Learning Transferable Visual Models From Natural Language Supervision', relationType: 'BASED_ON' },
  
  // Benchmark evaluations
  { sourceType: 'AIModel', sourceName: 'GPT-4', targetType: 'Benchmark', targetName: 'HellaSwag', relationType: 'EVALUATED_ON', properties: { score: '95.3%' } },
  { sourceType: 'AIModel', sourceName: 'Claude 3.5 Sonnet', targetType: 'Benchmark', targetName: 'SWE-bench', relationType: 'EVALUATED_ON', properties: { score: '49%' } },
  { sourceType: 'AIModel', sourceName: 'GPT-4', targetType: 'Benchmark', targetName: 'MATH', relationType: 'EVALUATED_ON', properties: { score: '42.5%' } },
  { sourceType: 'AIModel', sourceName: 'o1', targetType: 'Benchmark', targetName: 'MATH', relationType: 'EVALUATED_ON', properties: { score: '94.8%' } },
  
  // Concept relations
  { sourceType: 'Concept', sourceName: 'Test-Time Compute', targetType: 'AIModel', targetName: 'o1', relationType: 'EXEMPLIFIED_BY' },
  { sourceType: 'Concept', sourceName: 'Multimodality', targetType: 'AIModel', targetName: 'GPT-4o', relationType: 'EXEMPLIFIED_BY' },
  { sourceType: 'Concept', sourceName: 'Open Source AI', targetType: 'AIModel', targetName: 'LLaMA 3.1', relationType: 'EXEMPLIFIED_BY' },
  
  // Founder relations
  { sourceType: 'Person', sourceName: 'Aidan Gomez', targetType: 'Publication', targetName: 'Attention Is All You Need', relationType: 'AUTHORED' },
  { sourceType: 'Person', sourceName: 'Noam Shazeer', targetType: 'Publication', targetName: 'Attention Is All You Need', relationType: 'AUTHORED' },
];

// =============================================================================
// Export
// =============================================================================

export const additionalSeedData = {
  organizations: additionalOrganizations,
  persons: additionalPersons,
  aiModels: additionalAIModels,
  publications: additionalPublications,
  techniques: additionalTechniques,
  benchmarks: additionalBenchmarks,
  concepts: additionalConcepts,
  relations: additionalRelations,
};

export default additionalSeedData;
