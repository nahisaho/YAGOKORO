# Technology Stack

**Project**: YAGOKORO
**Last Updated**: 2025-12-31
**Status**: Phase 2 - v3.0.0 開発中 🔄

---

## Overview

YAGOKOROは、LLM・GraphRAG・オントロジーを統合したAGI実現を目指すシステムです。
本ドキュメントでは、Phase 1（完了）およびPhase 2（v3.0.0開発）の技術スタックを定義します。

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
| @yagokoro/extractor | 🔄 v3.0.0 | 共起分析ベース関係抽出 |
| @yagokoro/ingestion | 🔄 v3.0.0 | 論文自動取り込み (arXiv/Semantic Scholar) |
| @yagokoro/hitl | 🔄 v3.0.0 | Human-in-the-Loop検証ワークフロー |
| @yagokoro/pipeline | 🔄 v3.0.0 | 差分更新パイプライン |
| @yagokoro/cache | 🔄 v3.0.0 | クエリキャッシュ（LRU + 依存グラフ無効化） |

---

## v3.0.0 New Technologies

### Relation Extraction (F-001)

| Aspect | Choice | Status |
|--------|--------|--------|
| Cooccurrence Analysis | **Custom Implementation** | 🔄 Planned |
| Pattern Matching | **Dependency Parsing** | 🔄 Planned |
| Confidence Scoring | **Multi-factor (TF-IDF, Position, Frequency)** | 🔄 Planned |

### Paper Ingestion (F-002)

| Aspect | Choice | Status |
|--------|--------|--------|
| arXiv Client | **OAI-PMH API** | 🔄 Planned |
| Semantic Scholar | **REST API** | 🔄 Planned |
| Rate Limiting | **Token Bucket + Circuit Breaker** | 🔄 Planned |
| Deduplication | **DOI + Title Similarity + Author Match** | 🔄 Planned |

### HITL Workflow (F-004)

| Aspect | Choice | Status |
|--------|--------|--------|
| Threshold | **0.5-0.7 → Review, 0.7+ → Auto-approve** | 🔄 Planned |
| Batch Approval | **Confidence-based bulk approve** | 🔄 Planned |

### Query Cache (F-006)

| Aspect | Choice | Status |
|--------|--------|--------|
| Cache Strategy | **LRU + TTL** | 🔄 Planned |
| Invalidation | **Dependency Graph Selective** | 🔄 Planned |
| Storage | **In-Memory (Redis optional)** | 🔄 Planned |

---

## Test Summary

| Package | Test Files | Tests | Status |
|---------|-----------|-------|--------|
| @yagokoro/domain | 13 | 104 | ✅ All Passing |
| @yagokoro/graphrag | 18 | 248 | ✅ All Passing |
| @yagokoro/neo4j | 6 | 78 | ✅ All Passing |
| @yagokoro/vector | 3 | 34 | ✅ All Passing |
| @yagokoro/mcp | 7 | 161 | ✅ All Passing |
| @yagokoro/cli | 5 | 121 | ✅ All Passing |
| apps/yagokoro | 1 | 16 | ✅ All Passing |
| **Total** | **53** | **762** | ✅ **100%** |

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

## v3.0.0 Sprint Plan (Phase 2)

| Sprint | Focus | Duration | Status |
|--------|-------|----------|--------|
| Sprint 1 | 論文自動取り込み (@yagokoro/ingestion) | 36h | ⏳ Planned |
| Sprint 2 | 共起分析ベース関係抽出 (@yagokoro/extractor) | 38h | ⏳ Planned |
| Sprint 3 | MCPツール拡張 (9 new tools) | 38h | ⏳ Planned |
| Sprint 4 | HITL検証ワークフロー (@yagokoro/hitl) | 32h | ⏳ Planned |
| Sprint 5 | 差分更新パイプライン (@yagokoro/pipeline) | 38h | ⏳ Planned |
| Sprint 6 | クエリキャッシュ + 統合テスト (@yagokoro/cache) | 36h | ⏳ Planned |

**Total**: 218 hours / 6 sprints

---

*Updated: 2025-12-31*
