# Technology Stack

**Project**: YAGOKORO
**Last Updated**: 2025-12-31
**Status**: Phase 4 - v5.0.0 完成 ✅

---

## Overview

YAGOKOROは、LLM・GraphRAG・オントロジーを統合したAGI実現を目指すシステムです。
本ドキュメントでは、Phase 1〜3（v1.0.0〜v4.0.0）の技術スタックを定義します。

## Decision Criteria

以下の基準に基づき技術を選定：

1. **GraphRAG最適化**: 知識グラフ構築・検索に最適化された技術
2. **MCP互換性**: Model Context Protocolとの統合が容易
3. **スケーラビリティ**: 100万エンティティ以上のグラフを処理可能
4. **エコシステム**: 豊富なライブラリとコミュニティサポート
5. **保守性**: 長期的なメンテナンスが可能

## Technology Stack (Confirmed)

### Core Language & Runtime

| Aspect | Choice | Status |
|--------|--------|--------|
| Primary Language | **TypeScript** | ✅ Confirmed |
| Runtime | **Node.js 20 LTS** | ✅ Confirmed |
| Package Manager | **pnpm 9.x** (workspaces) | ✅ Confirmed |
| Module System | **ESM** | ✅ Confirmed |

**理由**:
- MCPの公式SDKがTypeScript/Python対応
- 型安全性によるドメインモデリングの堅牢性
- 非同期処理によるグラフトラバーサル最適化

### Graph Database

| Aspect | Choice | Status |
|--------|--------|--------|
| Graph DB | **Neo4j** | ✅ Confirmed |
| Query Language | **Cypher** | ✅ Confirmed |
| Driver | **neo4j-driver** | ✅ Confirmed |

**理由**:
- 成熟したグラフデータベース
- GraphRAGとの実績ある統合
- 強力なクエリ最適化

### Vector Store

| Aspect | Choice | Status |
|--------|--------|--------|
| Vector DB | **Qdrant** | ✅ Confirmed |
| Embedding Model | **text-embedding-3-large** | ✅ Confirmed |

**理由**:
- ハイブリッド検索（グラフ＋ベクトル）対応
- オンプレミス/クラウド両対応
- 高いパフォーマンス

### MCP & LLM Integration

| Aspect | Choice | Status |
|--------|--------|--------|
| MCP SDK | **@modelcontextprotocol/sdk** | ✅ Confirmed |
| LLM Provider | **OpenAI GPT-4o** | ✅ Primary |
| Alternative LLM | **Anthropic Claude** | 🔄 Secondary |

**理由**:
- MCPの公式TypeScript SDK使用
- GraphRAG構築時のエンティティ抽出にLLM活用

### GraphRAG Implementation

| Aspect | Choice | Status |
|--------|--------|--------|
| GraphRAG Framework | **Custom Implementation** | ✅ Confirmed |
| Reference | Microsoft GraphRAG Architecture | - |
| Community Detection | **Leiden Algorithm** | ✅ Confirmed |
| Graph Algorithm | **graphology** | ✅ Confirmed |
| LazyGraphRAG | **Custom Implementation** | ✅ Confirmed |
| NLP Processing | **compromise** | ✅ Confirmed |

**理由**:
- Microsoft GraphRAGのアーキテクチャを参考に独自実装
- LazyGraphRAGによるインデックスコスト0.1%削減
- 柔軟なカスタマイズが可能

### LazyGraphRAG Architecture

| Component | Purpose | Status |
|-----------|---------|--------|
| ConceptExtractor | NLPベースのコンセプト抽出 | ✅ Implemented |
| ConceptGraphBuilder | Louvainコミュニティ検出 | ✅ Implemented |
| QueryExpander | サブクエリ生成 | ✅ Implemented |
| RelevanceAssessor | バジェット制御付き関連性評価 | ✅ Implemented |
| IterativeSearch | best-first + breadth-first探索 | ✅ Implemented |
| ClaimExtractor | クレーム抽出・ランキング | ✅ Implemented |
| LazyQueryEngine | 統合エンジン | ✅ Implemented |

### Document Ingestion Pipeline

| Component | Purpose | Status |
|-----------|---------|--------|
| ArxivClient | arXiv API からPDF/メタデータ取得 | ✅ Implemented |
| UnstructuredClient | Unstructured.io API でPDF→テキスト抽出 | ✅ Implemented |
| DoclingExtractor | Docling ローカルPDF→テキスト抽出 | ✅ Implemented |
| DocumentProcessor | E2Eパイプライン（Unstructured版） | ✅ Implemented |
| DoclingDocumentProcessor | E2Eパイプライン（Doclingローカル版） | ✅ Implemented |

**抽出方式**:

| 方式 | 利点 | 欠点 |
|------|------|------|
| Unstructured.io API | 高精度、メンテ不要 | API料金、外部依存 |
| Docling ローカル | 無料、オフライン可能 | Python環境必要、処理時間長 |

**Docling セットアップ**:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install docling
```

**特徴**:
- arXiv論文のワンコマンドインジェスト
- 2種類の抽出方式（API / ローカル）
- LazyGraphRAG TextChunk形式との統合
- テーブル抽出・Markdown出力対応

**特徴**:
- インデックス時にLLM不使用（NLPベース）
- クエリ時にバジェット制御（Z100, Z500, Z1500）
- 反復深化探索による効率的なチャンク取得

### Multilingual Processing [NEW v5]

| Aspect | Choice | Status |
|--------|--------|--------|
| Language Detection | **langdetect** | ✅ Confirmed |
| NLP Framework | **spaCy 3.x** | ✅ Confirmed |
| Translation (Primary) | **DeepL API** | ✅ Confirmed |
| Translation (Fallback) | **Google Translate** | ✅ Confirmed |
| Cache (Distributed) | **Redis** | ✅ Confirmed |
| Cache (Persistent) | **SQLite** | ✅ Confirmed |

**spaCyモデル**:
| 言語 | モデル | サイズ |
|------|--------|--------|
| English | en_core_web_sm | 12MB |
| Chinese | zh_core_web_sm | 46MB |
| Japanese | ja_core_news_sm | 22MB |
| Korean | ko_core_news_sm | 16MB |

**Python セットアップ**:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install langdetect spacy
python -m spacy download en_core_web_sm
python -m spacy download zh_core_web_sm
python -m spacy download ja_core_news_sm
python -m spacy download ko_core_news_sm
```

**特徴**:
- 高精度言語検出（langdetect + spaCyアンサンブル）
- DeepL/Google翻訳の自動フォールバック
- 4言語対応NER（en/zh/ja/ko）
- クロスリンガルエンティティリンキング
- 3層キャッシュ（Memory/SQLite/Redis）

### CLI & Development

| Aspect | Choice | Status |
|--------|--------|--------|
| CLI Framework | **Commander.js** | ✅ Confirmed |
| Testing | **Vitest** | ✅ Confirmed |
| Linting/Format | **Biome** | ✅ Confirmed |
| Build | **tsup** | ✅ Confirmed |
| Validation | **Zod** | ✅ Confirmed |

### Infrastructure

| Aspect | Choice | Status |
|--------|--------|--------|
| Container | **Docker** | ✅ Confirmed |
| Orchestration | **Docker Compose** | ✅ Confirmed |
| CI/CD | **GitHub Actions** | ✅ Confirmed |
| Container | **Docker** | Podman | ✅ Selected |
| Orchestration | **Docker Compose** | K8s | ✅ Selected (Dev) |
| CI/CD | **GitHub Actions** | - | ✅ Selected |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    YAGOKORO System                          │
├─────────────────────────────────────────────────────────────┤
│  CLI Interface (Commander.js)                               │
│    yagokoro graph | entity | relation | community | mcp     │
├─────────────────────────────────────────────────────────────┤
│  MCP Server (@modelcontextprotocol/sdk)                     │
│    Tools: queryKnowledgeGraph, getEntity, getRelations,     │
│           getPath, getCommunity, addEntity, addRelation,    │
│           searchSimilar                                     │
│    Resources: genai://ontology, genai://entities            │
├─────────────────────────────────────────────────────────────┤
│  Application Layer (@yagokoro/graphrag)                     │
│    ├── Extraction (Entity, Relation)                        │
│    ├── Reasoning (MultiHop, PathFinder)                     │
│    ├── Query (QueryProcessor, CommunitySearch)              │
│    └── LLM (Client, PromptTemplates)                        │
├─────────────────────────────────────────────────────────────┤
│  Domain Layer (@yagokoro/domain)                            │
│    ├── Entities (AIModel, Organization, Person, etc.)       │
│    ├── Relations (DERIVED_FROM, DEVELOPED_BY, etc.)         │
│    ├── Value Objects, Ports                                 │
│    └── Errors (DomainError, ValidationError)                │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure Layer                                       │
│    ├── @yagokoro/neo4j (Graph Storage)                      │
│    │     Connection, Repositories, Queries                  │
│    └── @yagokoro/vector (Vector Storage)                    │
│          Connection, Store, Embedding                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Package Dependencies

### Production Dependencies

```json
{
  "@modelcontextprotocol/sdk": "^1.x",
  "neo4j-driver": "^5.x",
  "@qdrant/js-client-rest": "^1.x",
  "openai": "^4.x",
  "graphology": "^0.26.x",
  "graphology-communities-louvain": "^2.x",
  "compromise": "^14.x",
  "commander": "^12.x",
  "zod": "^3.x"
}
```

### Development Dependencies

```json
{
  "typescript": "^5.7.x",
  "vitest": "^2.1.x",
  "@biomejs/biome": "^1.9.x",
  "tsup": "^8.x",
  "@types/node": "^20.x"
}
```

---

## Implementation Progress

| Library | Status | Description |
|---------|--------|-------------|
| @yagokoro/domain | ✅ Implemented | 8 Entities, Value Objects, Errors, Ports |
| @yagokoro/graphrag | ✅ Implemented | Extraction, Reasoning, Query, LLM, Community |
| @yagokoro/neo4j | ✅ Implemented | Connection, Repositories, Queries, Backup |
| @yagokoro/vector | ✅ Implemented | Connection, Store, Embedding |
| @yagokoro/mcp | ✅ Implemented | Server, 8 Tools, Resources, Health, Auth, Metrics |
| @yagokoro/cli | ✅ Implemented | 5 Commands (graph, entity, relation, community, mcp) |
| @yagokoro/nlq | ✅ Implemented | NLQ→Cypher変換 |
| @yagokoro/hallucination | ✅ Implemented | ハルシネーション検出 |
| @yagokoro/normalizer | ✅ Implemented | エンティティ正規化 |
| @yagokoro/analyzer | ✅ Implemented | ライフサイクル分析・Gap分析 |
| @yagokoro/reasoner | ✅ Implemented | CoT推論・パス探索 |
| @yagokoro/extractor | ✅ v3.0.0 | 共起分析ベース関係抽出 (208 tests) |
| @yagokoro/ingestion | ✅ v3.0.0 | 論文自動取り込み (arXiv/Semantic Scholar) (46 tests) |
| @yagokoro/temporal | ✅ v4.0.0 | 時系列分析・トレンド検出 (113 tests) |
| @yagokoro/researcher | ✅ v4.0.0 | 研究者ネットワーク分析 (94 tests) |

---

## v4.0.0 New Technologies

### Temporal Analysis (F-004) ✅ Complete

| Aspect | Choice | Status |
|--------|--------|--------|
| Time Series Aggregation | **Custom Implementation** | ✅ Implemented |
| Trend Detection | **Linear Regression** | ✅ Implemented |
| Hot Topics | **Frequency + Recency Scoring** | ✅ Implemented |
| Forecasting | **Simple Linear Regression** | ✅ Implemented |
| Phase Analysis | **Period-based Classification** | ✅ Implemented |

**TemporalService Contents**:
| カテゴリ | 内容 |
|----------|------|
| Aggregation | analyzePublicationTrends (by period), getTimeline |
| Analysis | getHotTopics, analyzeByPhase, analyzeSnapshot |
| Prediction | forecastTrends (linear regression) |
| Stats | getStats (comprehensive statistics) |

### Researcher Network (F-005) ✅ Complete

| Aspect | Choice | Status |
|--------|--------|--------|
| Coauthor Graph | **graphology** | ✅ Implemented |
| Community Detection | **Louvain Algorithm** | ✅ Implemented |
| Influence Score | **H-Index + Citation Count** | ✅ Implemented |
| Path Finding | **Dijkstra / BFS** | ✅ Implemented |
| Career Analysis | **Period-based Stats** | ✅ Implemented |

**ResearcherService Contents**:
| カテゴリ | 内容 |
|----------|------|
| Search | searchResearchers (by name, affiliation, topic) |
| Network | getCoauthorNetwork, findCollaborationPath |
| Ranking | getRankings (by citations, h-index, publications) |
| Community | detectCommunities (Louvain) |
| Career | analyzeCareer (periods, collaborators) |

### CLI Integration (F-006) ✅ Complete

| Command | Subcommands | Status |
|---------|-------------|--------|
| `yagokoro temporal` | trends, timeline, hot-topics, forecast, phases, stats, snapshot | ✅ 21 tests |
| `yagokoro researcher` | search, info, coauthors, path, ranking, communities, stats, export, career | ✅ 26 tests |

### MCP Integration (F-007) ✅ Complete

| Tool Category | Tools | Status |
|---------------|-------|--------|
| Temporal Tools | temporal_analyze_trends, temporal_get_timeline, temporal_hot_topics, temporal_forecast, temporal_by_phase | ✅ 22 tests |
| Researcher Tools | researcher_search, researcher_get, researcher_coauthors, researcher_path, researcher_ranking, researcher_communities, researcher_career | ✅ 29 tests |

---

## v3.0.0 New Technologies

### Relation Extraction (F-001) ✅ Complete

| Aspect | Choice | Status |
|--------|--------|--------|
| Cooccurrence Analysis | **Custom Implementation** | ✅ Implemented |
| Pattern Matching | **Dependency Parsing** | ✅ Implemented |
| Confidence Scoring | **Multi-factor (TF-IDF, Position, Frequency)** | ✅ Implemented |
| Contradiction Detection | **Custom Implementation** | ✅ Implemented |
| LLM Relation Inference | **GPT-4o Integration** | ✅ Implemented |

### Paper Ingestion (F-002) ✅ Complete

| Aspect | Choice | Status |
|--------|--------|--------|
| arXiv Client | **OAI-PMH API** | ✅ Implemented |
| Semantic Scholar | **REST API** | ✅ Implemented |
| Rate Limiting | **Token Bucket + Circuit Breaker** | ✅ Implemented |
| Deduplication | **DOI + Title Similarity + Author Match** | ✅ Implemented |
| Scheduler | **Cron-based Schedule Runner** | ✅ Implemented |

### MCP Tool Expansion (F-003) ✅ Complete

| Aspect | Choice | Status |
|--------|--------|--------|
| NLQ Tools | **natural_language_query, chain_of_thought** | ✅ Implemented |
| Path Tools | **find_path, explain_path** | ✅ Implemented |
| Analysis Tools | **analyze_gaps, analyze_lifecycle** | ✅ Implemented |
| Validation Tools | **validate_response, check_consistency** | ✅ Implemented |
| Normalization Tools | **normalize_entities** | ✅ Implemented |

---

## Test Summary (v4.0.0)

| Package | Tests | Status |
|---------|-------|--------|
| @yagokoro/domain | 179 | ✅ All Passing |
| @yagokoro/extractor | 208 | ✅ All Passing |
| @yagokoro/ingestion | 46 | ✅ All Passing |
| @yagokoro/neo4j | 102 | ✅ All Passing |
| @yagokoro/nlq | 66 | ✅ All Passing |
| @yagokoro/normalizer | 85 | ✅ All Passing |
| @yagokoro/vector | 34 | ✅ All Passing |
| @yagokoro/analyzer | 206 | ✅ All Passing |
| @yagokoro/cli | 294 | ✅ All Passing |
| @yagokoro/graphrag | 332 | ✅ All Passing |
| @yagokoro/hallucination | 28 | ✅ All Passing |
| @yagokoro/mcp | 430 | ✅ All Passing |
| @yagokoro/reasoner | 93 | ✅ All Passing |
| @yagokoro/temporal | 113 | ✅ All Passing |
| @yagokoro/researcher | 94 | ✅ All Passing |
| apps/yagokoro (E2E) | 135 | ✅ All Passing |
| **Total** | **2,445** | ✅ **100%** |

---

## Completed Sprints (Phase 1)

- ✅ Sprint 0: Project Setup (Monorepo, Docker, CI/CD)
- ✅ Sprint 1: Domain & Infrastructure (Entities, Neo4j, Vector)
- ✅ Sprint 2: GraphRAG Core (Extraction, Reasoning, Query)
- ✅ Sprint 3: Integration (MCP Tools, CLI Commands)
- ✅ Sprint 4: Observability & Security (Backup, Auth, Logging, Metrics)
- ✅ Sprint 5: NLQ (Natural Language Query → Cypher)
- ✅ Sprint 6: Hallucination Detection

---

## v3.0.0 Sprint Results (Phase 2) ✅ Complete

| Sprint | Focus | Tests | Status |
|--------|-------|-------|--------|
| Sprint 1 | Knowledge Graph Core (@yagokoro/domain) | 179 | ✅ Complete |
| Sprint 2 | Auto-Relation Extraction (@yagokoro/extractor) | 208 | ✅ Complete |
| Sprint 3 | Paper Ingestion (@yagokoro/ingestion) | 46 | ✅ Complete |
| Sprint 4 | MCP Tool Expansion (@yagokoro/mcp) | 379 | ✅ Complete |
| Sprint 5 | NLQ + Reasoning (@yagokoro/nlq, @yagokoro/reasoner) | 159 | ✅ Complete |
| Sprint 6 | Integration + E2E Tests (apps/yagokoro) | 135 | ✅ Complete |

**Total**: 2,140 tests / All passing

---

## v4.0.0 Sprint Results (Phase 3) ✅ Complete

| Sprint | Focus | Tests | Status |
|--------|-------|-------|--------|
| Sprint 1 | TemporalService Core (@yagokoro/temporal) | 57 | ✅ Complete |
| Sprint 2 | ResearcherService Core (@yagokoro/researcher) | 50 | ✅ Complete |
| Sprint 3 | Integration Tests & Optimization | 100 | ✅ Complete |
| Sprint 4 | CLI & MCP Integration | 98 | ✅ Complete |

**v4.0.0 追加テスト**: 305 tests
**累計**: 2,445 tests / All passing

---

*Updated: 2025-12-31*
