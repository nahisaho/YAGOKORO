# 生成AI進化の系譜

> YAGOKORO Knowledge Database から自動生成
> 
> 総論文数: 193件
> 生成日時: 2025-12-29T22:58:00.928Z

## 📊 概要

生成AI (Generative AI) は2017年のTransformer発表から急速に進化し、
2024年現在では様々な分野で実用化されています。

本文書は、収集した193件の学術論文を分析し、
生成AIの進化の系譜をまとめたものです。

---

## 🏛️ 主要マイルストーン

| 年 | イベント | 主要論文 |
|----|----------|----------|
| 2017 | **Transformer革命** | Attention Is All You Need |
| 2018 | **事前学習の確立** | BERT, GPT |
| 2019 | **スケーリング開始** | GPT-2, T5 |
| 2020 | **巨大モデル時代** | GPT-3, RAG |
| 2021 | **マルチモーダル** | CLIP, DALL-E, Codex, LoRA |
| 2022 | **アライメント革命** | InstructGPT, ChatGPT, FlashAttention |
| 2023 | **オープンモデル時代** | LLaMA, Mistral, GPT-4, Mamba |
| 2024 | **MoE & 効率化** | Mixtral, LLaMA 3, Claude 3, GPT-4o |

---

## 🌳 系譜図

```mermaid
flowchart TB
    subgraph 2017["2017: Transformer革命"]
        transformer["🔷 Transformer<br/>Attention Is All You Need"]
    end
    
    subgraph 2018["2018: 事前学習の確立"]
        bert["🔷 BERT<br/>双方向事前学習"]
        gpt1["🔷 GPT<br/>自己回帰事前学習"]
    end
    
    subgraph 2019["2019: スケーリング"]
        gpt2["🔷 GPT-2<br/>1.5Bパラメータ"]
        t5["🔷 T5<br/>Text-to-Text"]
    end
    
    subgraph 2020["2020: 巨大モデル & RAG"]
        gpt3["🔶 GPT-3<br/>175Bパラメータ"]
        rag["🟢 RAG<br/>検索拡張生成"]
    end
    
    subgraph 2021["2021: マルチモーダル & 効率化"]
        clip["🟣 CLIP<br/>画像-テキスト対照学習"]
        dalle["🟣 DALL-E<br/>テキストから画像生成"]
        codex["🔵 Codex<br/>コード生成"]
        lora["🟡 LoRA<br/>効率的ファインチューニング"]
    end
    
    subgraph 2022["2022: アライメント革命"]
        instructgpt["🔶 InstructGPT<br/>RLHF"]
        chatgpt["🔶 ChatGPT<br/>対話AI"]
        flash["🟡 FlashAttention<br/>効率的注意機構"]
        sd["🟣 Stable Diffusion<br/>オープン画像生成"]
    end
    
    subgraph 2023["2023: オープンモデル時代"]
        gpt4["🔶 GPT-4<br/>マルチモーダル"]
        llama["🟠 LLaMA<br/>オープンLLM"]
        llama2["🟠 LLaMA 2<br/>商用利用可"]
        mistral["🟠 Mistral 7B<br/>高効率"]
        claude2["🔶 Claude 2<br/>長文脈"]
        gemini["🔶 Gemini<br/>Google統合"]
        dpo["🟢 DPO<br/>直接選好最適化"]
        mamba["🟡 Mamba<br/>状態空間モデル"]
        selfrag["🟢 Self-RAG<br/>自己検索"]
        codellama["🔵 CodeLlama<br/>オープンコード"]
    end
    
    subgraph 2024["2024: MoE & 効率化"]
        mixtral["🟠 Mixtral<br/>MoE"]
        llama3["🟠 LLaMA 3<br/>8B/70B"]
        gpt4o["🔶 GPT-4o<br/>音声統合"]
        claude3["🔶 Claude 3<br/>Opus/Sonnet"]
        deepseek["🟠 DeepSeek-V2<br/>MoE効率化"]
        qwen2["🟠 Qwen2<br/>多言語"]
        graphrag["🟢 GraphRAG<br/>グラフ検索"]
        mamba2["🟡 Mamba-2<br/>SSM改良"]
    end
    
    %% 基本的な系譜
    transformer --> bert & gpt1
    bert --> t5
    gpt1 --> gpt2
    gpt2 --> gpt3
    gpt3 --> instructgpt
    instructgpt --> chatgpt
    chatgpt --> gpt4
    gpt4 --> gpt4o
    
    %% オープンモデル系譜
    gpt3 --> llama
    llama --> llama2
    llama2 --> llama3
    llama2 --> mistral
    mistral --> mixtral
    
    %% マルチモーダル系譜
    transformer --> clip
    clip --> dalle
    gpt4 --> gemini
    gemini --> claude3
    
    %% 効率化系譜
    transformer --> flash
    flash --> mamba
    mamba --> mamba2
    
    %% RAG系譜
    gpt3 --> rag
    rag --> selfrag
    selfrag --> graphrag
    
    %% コード系譜
    gpt3 --> codex
    codex --> codellama
    llama --> codellama
    
    %% アライメント系譜
    instructgpt --> dpo
    
    %% スタイル
    classDef openai fill:#10a37f,color:white
    classDef meta fill:#0866ff,color:white
    classDef google fill:#4285f4,color:white
    classDef anthropic fill:#d97706,color:white
    classDef technique fill:#8b5cf6,color:white
    
    class gpt1,gpt2,gpt3,gpt4,gpt4o,instructgpt,chatgpt,codex,dalle openai
    class llama,llama2,llama3,codellama meta
    class gemini,t5 google
    class claude2,claude3 anthropic
```


---

## 📈 技術トレンド

### 1. Foundation Models (基盤モデル)
- **2017**: Transformerアーキテクチャの発明
- **2018-2019**: BERT/GPTによる事前学習パラダイムの確立
- **2020-2022**: GPT-3→InstructGPT→ChatGPTの進化
- **2023-2024**: GPT-4、Claude 3、Geminiのマルチモーダル化

### 2. Open Models (オープンモデル)
- **2023**: LLaMA、Mistral 7Bがオープンソース化
- **2024**: Mixtral (MoE)、LLaMA 3、Qwen2、DeepSeekの台頭

### 3. Efficient AI (効率化)
- **2021**: LoRA (効率的ファインチューニング)
- **2022**: FlashAttention (GPU最適化)
- **2023-2024**: Mamba (状態空間モデル)、量子化技術

### 4. RAG & Retrieval (検索拡張)
- **2020**: RAG (Retrieval-Augmented Generation)
- **2023**: Self-RAG、RAPTOR
- **2024**: GraphRAG、CRAG

### 5. Alignment & Safety (整合性と安全性)
- **2022**: RLHF、InstructGPT
- **2023**: DPO、Constitutional AI
- **2024**: ORPO、Llama Guard

### 6. Multimodal (マルチモーダル)
- **2021**: CLIP、DALL-E
- **2023**: GPT-4V、LLaVA
- **2024**: GPT-4o、Gemini Pro Vision

---

# カテゴリ別統計

| カテゴリ | 論文数 | チャンク数 | 年範囲 |
|----------|--------|------------|--------|
| LLM | 50 | 7,020 | 2020-2024 |
| Multimodal | 23 | 4,395 | 2020-2024 |
| Efficiency | 21 | 2,986 | 2020-2024 |
| Alignment | 19 | 3,074 | 2017-2024 |
| Reasoning | 16 | 2,350 | 2022-2024 |
| RAG | 14 | 1,655 | 2020-2024 |
| Evaluation | 8 | 2,426 | 2020-2024 |
| Code | 8 | 1,986 | 2021-2024 |
| Agent | 8 | 1,197 | 2022-2024 |
| Architecture | 6 | 682 | 2020-2024 |
| Safety | 5 | 825 | 2020-2023 |
| Prompting | 5 | 768 | 2022-2024 |
| Foundation | 3 | 281 | 2017-2020 |
| Embedding | 3 | 276 | 2022-2024 |
| Training | 3 | 852 | 2023-2024 |
| Science | 1 | 89 | 2021-2021 |


---

## 📚 参考文献

本系譜は以下のソースから収集した論文に基づいています:

- **arXiv**: 179件
- **Unpaywall (学術誌)**: 14件

---

*Generated by YAGOKORO MCP Knowledge Base*
