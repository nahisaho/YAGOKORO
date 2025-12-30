# Changelog

All notable changes to YAGOKORO will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2025-12-30

### Added

#### Docling PDF Extractor (`@yagokoro/graphrag`)
ローカルPDF処理のためのDocling統合を実装。外部API依存なしで高品質なPDFテキスト抽出が可能。

- **DoclingExtractor** - Docling Python ラッパー
  - ローカルPDF処理（API不要）
  - Markdown形式でテキスト抽出
  - テーブル抽出・構造認識
  - OCRサポート（オプション）
  - Python仮想環境統合（`.venv`）

- **DoclingDocumentProcessor** - Docling版E2Eパイプライン
  - ArxivClient + DoclingExtractor 統合
  - TextChunk形式への変換（LazyGraphRAG互換）
  - Markdown見出しベースのセクション分割
  - チャンクサイズ・オーバーラップ設定可能

- **Python Scripts**
  - `scripts/docling-extract.py` - Docling PDFテキスト抽出スクリプト
  - URL/ファイルからの抽出対応
  - JSON出力形式

#### GenAI Papers Ingestion
- 37件のGenAI系譜論文リスト (`data/genai-papers.json`)
- 9カテゴリ: Transformer基盤, LLM, アラインメント, 効率的学習, プロンプティング, RAG, マルチモーダル, 拡散モデル, 創発能力
- `scripts/ingest-genai-papers.ts` バッチインジェストスクリプト

### Changed
- `ingest-genai-papers.ts` をUnstructured.io APIからDoclingローカル処理に変更

### Dependencies
- `docling` 2.66.0 (Python) - PDF抽出エンジン
- Python仮想環境 `.venv` 必須

### Technical Details
- **New Tests**: 27 tests (DoclingExtractor: 12, DoclingDocumentProcessor: 15)
- **Total Tests**: 850+

---

## [0.6.0] - 2025-12-29

### Added

#### Document Ingestion Pipeline (`@yagokoro/graphrag`)
arXiv論文のPDFダウンロード、Unstructured.ioによるテキスト抽出、LazyGraphRAG用チャンク化パイプラインを実装。

- **ArxivClient** - arXiv API クライアント
  - 論文メタデータ取得（ID、タイトル、著者、カテゴリ等）
  - PDFダウンロード（URLまたはBuffer）
  - カテゴリ別検索、バッチ取得対応
  - `fast-xml-parser` によるAtom XML解析
- **UnstructuredClient** - Unstructured.io API クライアント
  - PDF→テキスト抽出
  - 複数戦略サポート（auto, hi_res, fast, ocr_only）
  - テーブル抽出、構造化テキスト抽出
- **DocumentProcessor** - E2Eパイプライン
  - ArxivClient + UnstructuredClient 統合
  - TextChunk形式への変換（LazyGraphRAG互換）
  - チャンクサイズ・オーバーラップ設定可能

#### CLI Ingest Command (`@yagokoro/cli`)
- `yagokoro ingest arxiv <id>` - arXiv論文をインジェスト
- `yagokoro ingest arxiv-batch <ids...>` - 複数論文のバッチ処理
- `yagokoro ingest pdf <file>` - ローカルPDFファイル処理
- `yagokoro ingest search <query>` - arXiv検索
- 15 new tests

### Dependencies
- `fast-xml-parser` ^5.3.3 - arXiv Atom XML解析

### Technical Details
- **New Tests**: 59 tests (graphrag: 44 ingest + cli: 15)
- **Total Tests**: 821+

---

## [0.5.0] - 2025-12-29

### Added

#### LazyGraphRAG Implementation (`@yagokoro/graphrag`)
Microsoft Research の LazyGraphRAG アーキテクチャを実装。インデックスコストを0.1%に削減しながら高品質なクエリ処理を実現。

- **ConceptExtractor** - NLPベースのコンセプト抽出（LLM不要）
  - `compromise` ライブラリによる名詞句抽出
  - TF-IDF重要度スコア計算
  - 共起関係の構築
- **ConceptGraphBuilder** - コミュニティ検出付きグラフ構築
  - `graphology` + `graphology-communities-louvain` 使用
  - 3レベルの階層的コミュニティ構造
  - チャンク-コンセプト双方向マッピング
- **QueryExpander** - サブクエリ生成とコンセプトマッチング
  - 3-5個のサブクエリ生成
  - コンセプトグラフとのマッチング
- **RelevanceAssessor** - バジェット制御付き関連性評価
  - 文レベルの関連性評価
  - バッチ処理による効率化
- **IterativeSearch** - 反復深化探索アルゴリズム
  - best-first（ベクトル類似度）+ breadth-first（コミュニティ構造）
  - ゼロ関連性閾値による探索制御
- **ClaimExtractor** - クレーム抽出とランキング
  - クエリ関連クレームの抽出
  - コンテキストウィンドウへの収束
- **LazyQueryEngine** - 統合クエリエンジン
  - 全コンポーネントのオーケストレーション
  - プリセット設定（Z100_LITE, Z500, Z1500）

#### LazyGraphRAG Presets
| プリセット | バジェット | サブクエリ数 | 用途 |
|-----------|-----------|-------------|------|
| Z100_LITE | 100 | 3 | 探索・低コスト |
| Z500 | 500 | 4 | 本番環境・バランス型 |
| Z1500 | 1500 | 5 | ベンチマーク・高品質 |

### Dependencies
- `compromise` ^14.14.5 - NLP名詞句抽出
- `graphology` ^0.26.0 - グラフデータ構造
- `graphology-communities-louvain` ^2.0.2 - Louvainコミュニティ検出

### Technical Details
- **New Tests**: 84 tests (graphrag: 164 → 248)
- **Total Tests**: 762 (across all packages)
- **Design Document**: storage/specs/DES-002-lazygraphrag.md

### Documentation
- steering/tech.ja.md - LazyGraphRAG アーキテクチャセクション追加
- steering/structure.ja.md - graphragレイヤーにLazyGraphRAGコンポーネント追加
- README.md - LazyGraphRAG使用例追加

---

## [0.4.0] - 2025-12-29

### Added

#### Seed Data & CLI Improvements
- **Generative AI Knowledge Base** - 66エンティティの包括的なシードデータ
  - 16 AI Models (GPT-4, Claude, Gemini, LLaMA等)
  - 10 Organizations (OpenAI, Anthropic, Google DeepMind等)
  - 10 Persons (AI研究者)
  - 10 Techniques (Transformer, RLHF, Constitutional AI等)
  - 8 Publications
  - 6 Benchmarks
  - 6 Concepts
  - 62 Relations (DEVELOPED_BY, USES_TECHNIQUE, BASED_ON等)

#### CLI Seed Command (`@yagokoro/cli`)
- `yagokoro seed list` - 利用可能なシードデータ一覧
- `yagokoro seed preview <name>` - シードデータのプレビュー
- `yagokoro seed ingest <name>` - シードデータの投入
- 14 new tests

#### CLI Backup Command (`@yagokoro/cli`)
- `yagokoro backup create` - バックアップ作成
- `yagokoro backup restore <file>` - リストア実行
- `yagokoro backup validate <file>` - バックアップ検証
- `yagokoro backup list` - バックアップ一覧
- 21 new tests

#### Authentication & Authorization (`@yagokoro/mcp`)
- **ApiKeyAuth** - APIキー認証サービス
  - キー生成・検証・失効
  - 有効期限管理
  - インメモリストア
- **RBACMiddleware** - ロールベースアクセス制御
  - 3ロール: admin, writer, reader
  - 13種類のパーミッション
  - ツール別パーミッションマッピング
  - 認証有効/無効の切り替え機能
- 38 new tests

#### Documentation
- Installation guide (`docs/guides/installation.md`)
- Authentication guide (`docs/guides/authentication.md`)
- Sample queries guide (`docs/guides/sample-queries.md`)
- Neo4j browser connection guide

### Changed
- CLI tests: 135 → 156 (+21)
- MCP tests: 175 → 213 (+38)
- Total tests: 869 → 969 (+100)

### Technical Details
- **Total Tests**: 969 (across 9 packages)
- **Real Data Integration**: Neo4j/Qdrant with seed data

---

## [0.3.0] - 2025-12-29

### Added

#### Natural Language Query (`@yagokoro/nlq`)
- **NLQService** - 自然言語をCypherクエリに変換
- **IntentClassifier** - クエリ意図の分類 (lookup, filter, aggregate, path, comparison)
- **CypherGenerator** - Cypherクエリ生成エンジン
- **SemanticParser** - セマンティック解析
- **QueryOptimizer** - クエリ最適化
- **ResultFormatter** - 結果フォーマット (JSON, Markdown, Table)
- 66 tests passing

#### Hallucination Detection (`@yagokoro/hallucination`)
- **ConsistencyChecker** - グラフとの一貫性チェック
- **ContradictionDetector** - 矛盾検出 (直接/時系列/論理/意味的)
- 28 tests passing

#### Advanced Reasoning (`@yagokoro/graphrag`)
- **CoTGenerator** - Chain-of-Thought多段階推論
- **ConfidenceScorer** - 信頼度スコア計算
- 追加 52 tests

#### MCP Advanced Tools
- `naturalLanguageQuery` - NL→Cypher変換クエリ
- `chainOfThought` - 多段階推論分析
- `validateResponse` - レスポンス検証
- `checkConsistency` - 一貫性チェック
- 14 tests for advanced tools

#### E2E Test Expansion
- Sprint 5-7機能のE2Eテスト
- 30 tests total (14 new)

#### Documentation
- MCPセットアップガイド追加
- 高度なツールのAPIリファレンス
- CONTRIBUTING.md作成

### Changed
- MCP tools index updated with advanced tool exports
- Project version bumped to 0.3.0

### Technical Details
- **Total Tests**: 834 (58 test files)
- **New Packages**: @yagokoro/nlq, @yagokoro/hallucination

---

## [0.2.0] - 2025-12-28

### Added

#### Core System
- **Domain Layer** (`@yagokoro/domain`)
  - 8 entity types: AIModel, Benchmark, Community, Concept, Organization, Person, Publication, Technique
  - Value Objects for type-safe domain modeling
  - Zod-based validation schemas
  - Custom error hierarchy (DomainError, ValidationError, NotFoundError)

#### GraphRAG Engine (`@yagokoro/graphrag`)
- **Extraction**
  - EntityExtractor with LLM-based NER
  - RelationExtractor for relationship detection
  - SemanticChunker and FixedChunker for document processing
- **Reasoning**
  - MultiHopReasoner for complex queries (up to 5 hops)
  - PathFinder for shortest path discovery
- **Query Engines**
  - LocalSearchEngine (vector + graph)
  - GlobalSearchEngine (community-based Map-Reduce)
  - HybridSearchEngine (weighted combination)
- **Community Detection**
  - Leiden algorithm implementation
  - Hierarchical community structure
  - LLM-based community summarization

#### Infrastructure
- **Neo4j Adapter** (`@yagokoro/neo4j`)
  - Connection pool management
  - Neo4jEntityRepository
  - Neo4jRelationRepository
  - Neo4jCommunityRepository
  - CypherQueryBuilder
  - BackupService with checksum verification
- **Vector Store** (`@yagokoro/vector`)
  - QdrantConnection with health check
  - VectorStore with CRUD operations
  - EmbeddingService (text-embedding-3-small)

#### MCP Server (`@yagokoro/mcp`)
- **8 MCP Tools**
  - `queryKnowledgeGraph` - Natural language search
  - `getEntity` - Entity retrieval by ID/name
  - `getRelations` - Relationship exploration
  - `getPath` - Path finding between entities
  - `getCommunity` - Community information
  - `addEntity` - Entity creation
  - `addRelation` - Relationship creation
  - `searchSimilar` - Vector similarity search
- **2 MCP Resources**
  - `ontology://schema` - Ontology schema
  - `graph://statistics` - Graph statistics
- **Security**
  - API Key authentication (SHA-256)
  - RBAC (admin/editor/reader roles)
- **Observability**
  - Structured Logger with request ID tracking
  - Metrics (Counter, Gauge, Histogram)
  - Health checks (Neo4j, Qdrant, LLM)

#### CLI (`@yagokoro/cli`)
- **5 Command Groups**
  - `entity` - Entity CRUD operations
  - `relation` - Relation management
  - `graph` - Graph queries and statistics
  - `community` - Community operations
  - `mcp` - MCP server management
- Multiple output formats (JSON, Table, YAML)

#### Infrastructure
- Docker Compose setup (Neo4j, Qdrant)
- GitHub Actions CI/CD pipeline
- Vitest testing framework
- Biome linting and formatting

### Technical Details
- **Language**: TypeScript 5.7
- **Runtime**: Node.js 20 LTS
- **Package Manager**: pnpm 9.x with workspaces
- **Module System**: ESM
- **Architecture**: Hexagonal / DDD / Library-First

### Test Coverage
- **48 test files**
- **678 tests passing**
- 100% implementation coverage for all libraries

---

## Development Sprints

### Sprint 0 - Project Setup
- Monorepo structure with pnpm workspaces
- Docker development environment
- CI/CD pipeline
- Testing and linting configuration

### Sprint 1 - Domain & Infrastructure
- All 8 domain entities
- Neo4j repositories
- Vector store integration
- Embedding service

### Sprint 2 - GraphRAG Core
- Extraction pipeline
- Reasoning engine
- Query engines (Local/Global/Hybrid)
- Community detection

### Sprint 3 - Integration
- MCP server implementation
- 8 tools and 2 resources
- CLI commands
- Health checks

### Sprint 4 - Observability & Security
- Backup/Restore functionality
- Authentication (API Key + RBAC)
- Structured logging
- Metrics collection
- Error handling

---

## Links

- [README](./README.md)
- [Quick Start Guide](./docs/guides/quickstart.md)
- [MCP Tools Reference](./docs/api/mcp-tools.md)
- [CLI Reference](./docs/api/cli-reference.md)
- [Architecture Overview](./docs/architecture/overview.md)
