# Changelog

All notable changes to YAGOKORO will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.0.0] - 2025-12-31

### 🎉 Major Release: YAGOKORO v5 - Multilingual Paper Processing

This release introduces comprehensive multilingual paper processing capabilities,
enabling language detection, translation, named entity recognition, and cross-lingual
entity linking for papers in English, Chinese, Japanese, and Korean.

### Added

#### F-008: Multilingual Paper Processing (@yagokoro/multilang) 🆕

- **LanguageDetector** - High-accuracy language detection
  - Primary: langdetect library (high accuracy)
  - Secondary: spaCy ensemble validation
  - Confidence scoring with threshold (default: 0.7)
  - Fallback to English on detection failure

- **TranslationService** - Multi-provider translation
  - Primary: DeepL API (500,000 char/month free tier)
  - Fallback: Google Translate API (auto-retry)
  - Configurable timeout (default: 2s per request)
  - Batch translation support

- **MultilingualNER** - spaCy-based Named Entity Recognition
  - English: en_core_web_sm (12MB)
  - Chinese: zh_core_web_sm (46MB)
  - Japanese: ja_core_news_sm (22MB)
  - Korean: ko_core_news_sm (16MB)
  - Entity types: PERSON, ORG, GPE, PRODUCT, WORK_OF_ART

- **CrossLingualLinker** - Cross-language entity linking
  - Neo4j vector similarity search (cosine, threshold: 0.85)
  - String similarity matching (Levenshtein, threshold: 0.9)
  - Translation-based linking for non-English entities
  - Confidence scoring with multiple signals

- **TermNormalizer** - Term normalization pipeline
  - Unicode normalization (NFKC)
  - Case folding (lowercase)
  - Stemming (Porter stemmer for English)
  - Custom abbreviation expansion
  - Whitespace normalization

- **TranslationCache** - 3-tier caching system
  - Memory cache (LRU, max 1000 entries)
  - SQLite cache (persistent, file-based)
  - Redis cache (distributed, TTL support)
  - Cache key generation with source/target language

### Neo4j Schema Extensions

New node labels and relationships for multilingual support:

```cypher
// Multilingual Entity Labels
(:MultilingualEntity {
  canonicalName: string,
  language: string,
  alternateNames: string[],
  translations: map<string, string>
})

// Translation Relationships
(:Entity)-[:SAME_AS {
  confidence: float,
  method: string,
  translatedName: string
}]->(:Entity)

// Language-specific indexes
CREATE INDEX entity_language FOR (e:Entity) ON (e.language)
CREATE INDEX entity_canonical FOR (e:MultilingualEntity) ON (e.canonicalName)
```

### Test Summary by Package (v5.0.0)

| Package | Tests | Status |
|---------|-------|--------|
| @yagokoro/domain | 179 | ✅ |
| @yagokoro/extractor | 208 | ✅ |
| @yagokoro/ingestion | 46 | ✅ |
| @yagokoro/temporal | 113 | ✅ |
| @yagokoro/researcher | 94 | ✅ |
| @yagokoro/multilang | 75 | ✅ 🆕 |
| @yagokoro/neo4j | 102 | ✅ |
| @yagokoro/nlq | 66 | ✅ |
| @yagokoro/normalizer | 85 | ✅ |
| @yagokoro/vector | 34 | ✅ |
| @yagokoro/analyzer | 206 | ✅ |
| @yagokoro/cli | 294 | ✅ |
| @yagokoro/graphrag | 332 | ✅ |
| @yagokoro/hallucination | 28 | ✅ |
| @yagokoro/mcp | 430 | ✅ |
| @yagokoro/reasoner | 93 | ✅ |
| apps/yagokoro (E2E) | 135 | ✅ |
| **Total** | **2,520** | ✅ |

### Technical Details

- **New Packages**: @yagokoro/multilang
- **Test Increase**: +75 tests (2,445 → 2,520)
- **Python Dependencies**: langdetect, spaCy 3.x
- **spaCy Models**: en_core_web_sm, zh_core_web_sm, ja_core_news_sm, ko_core_news_sm
- **Translation APIs**: DeepL (primary), Google Translate (fallback)
- **Cache Options**: Memory, SQLite, Redis

### Requirements Mapping

| Requirement | Component | Status |
|-------------|-----------|--------|
| REQ-008-01 | LanguageDetector | ✅ |
| REQ-008-02 | TranslationService | ✅ |
| REQ-008-03 | MultilingualNER | ✅ |
| REQ-008-04 | CrossLingualLinker | ✅ |
| REQ-008-05 | TermNormalizer | ✅ |
| REQ-008-06 | TranslationCache | ✅ |
| REQ-008-07 | Neo4j Schema | ✅ |
| REQ-008-08 | Error Handling | ✅ |
| REQ-008-09 | Performance | ✅ |
| REQ-008-10 | Logging | ✅ |
| REQ-008-11 | Configuration | ✅ |
| REQ-008-12 | Integration Tests | ✅ |

---

## [4.0.0] - 2025-12-31

### 🎉 Major Release: YAGOKORO v4 - Temporal Analysis & Researcher Network

This release introduces temporal analysis capabilities and researcher network analysis,
enabling time-series trend detection, research collaboration insights, and comprehensive
CLI/MCP integration.

### Added

#### F-004: Temporal Analysis (@yagokoro/temporal) 🆕
- **TrendAnalyzer** - Publication trend detection
  - Period-based aggregation (year/quarter/month)
  - Trend direction classification (increasing/decreasing/stable)
  - Growth rate calculation
- **TimelineAnalyzer** - Entity timeline visualization
  - Entity/category-based filtering
  - Event type classification
  - Chronological sorting
- **HotTopicsDetector** - Trending topic detection
  - Frequency + recency scoring
  - Configurable time windows
  - Top-N topic ranking
- **ForecastEngine** - Trend prediction
  - Linear regression forecasting
  - Confidence interval calculation
  - Multi-period extrapolation
- **PhaseAnalyzer** - Research phase classification
  - Period-based phase detection
  - Key event identification
  - Phase-wise statistics

#### F-005: Researcher Network (@yagokoro/researcher) 🆕
- **ResearcherSearch** - Multi-criteria researcher search
  - Name, affiliation, topic filtering
  - Full-text search support
- **CoauthorNetwork** - Coauthorship graph analysis
  - Weighted collaboration edges
  - Network centrality metrics
  - Cluster coefficient calculation
- **CollaborationPath** - Researcher path finding
  - Dijkstra/BFS shortest path
  - Collaboration chain explanation
- **ResearcherRanking** - Influence ranking
  - Citation count, h-index, publication count metrics
  - Composite scoring
- **CommunityDetector** - Research community detection
  - Louvain algorithm integration
  - Modularity optimization
  - Community labeling

#### F-006: CLI Integration 🆕
New temporal and researcher CLI commands:
- `yagokoro temporal trends` - Analyze publication trends
- `yagokoro temporal timeline` - View entity timelines
- `yagokoro temporal hot-topics` - Detect trending topics
- `yagokoro temporal forecast` - Predict future trends
- `yagokoro temporal phases` - Analyze research phases
- `yagokoro temporal stats` - View temporal statistics
- `yagokoro temporal snapshot` - Get point-in-time snapshot
- `yagokoro researcher search` - Search researchers
- `yagokoro researcher info` - Get researcher details
- `yagokoro researcher coauthors` - View coauthor network
- `yagokoro researcher path` - Find collaboration paths
- `yagokoro researcher ranking` - View influence rankings
- `yagokoro researcher communities` - Detect communities
- `yagokoro researcher stats` - View network statistics
- `yagokoro researcher export` - Export network data
- `yagokoro researcher career` - Analyze researcher career

#### F-007: MCP Tool Integration 🆕
New MCP tools for AI agent integration:
- `temporal_analyze_trends` - Analyze publication trends
- `temporal_get_timeline` - Get entity timeline
- `temporal_hot_topics` - Detect hot topics
- `temporal_forecast` - Forecast trends
- `temporal_by_phase` - Analyze by research phase
- `researcher_search` - Search researchers
- `researcher_get` - Get researcher details
- `researcher_coauthors` - Get coauthor network
- `researcher_path` - Find collaboration path
- `researcher_ranking` - Get influence rankings
- `researcher_communities` - Detect communities
- `researcher_career` - Analyze researcher career

### Test Summary by Package (v4.0.0)

| Package | Tests | Status |
|---------|-------|--------|
| @yagokoro/domain | 179 | ✅ |
| @yagokoro/extractor | 208 | ✅ |
| @yagokoro/ingestion | 46 | ✅ |
| @yagokoro/temporal | 113 | ✅ 🆕 |
| @yagokoro/researcher | 94 | ✅ 🆕 |
| @yagokoro/neo4j | 102 | ✅ |
| @yagokoro/nlq | 66 | ✅ |
| @yagokoro/normalizer | 85 | ✅ |
| @yagokoro/vector | 34 | ✅ |
| @yagokoro/analyzer | 206 | ✅ |
| @yagokoro/cli | 294 | ✅ (+47) |
| @yagokoro/graphrag | 332 | ✅ |
| @yagokoro/hallucination | 28 | ✅ |
| @yagokoro/mcp | 430 | ✅ (+51) |
| @yagokoro/reasoner | 93 | ✅ |
| apps/yagokoro (E2E) | 135 | ✅ |
| **Total** | **2,445** | ✅ |

### Technical Details

- **New Packages**: @yagokoro/temporal, @yagokoro/researcher
- **Test Increase**: +305 tests (2,140 → 2,445)
- **New CLI Commands**: 16 (temporal: 7, researcher: 9)
- **New MCP Tools**: 12 (temporal: 5, researcher: 7)

---

## [3.0.0] - 2025-12-31

### 🎉 Major Release: YAGOKORO v3 - Knowledge Graph Auto-Growth

This release implements automatic knowledge graph enrichment through relation extraction,
paper ingestion pipelines, and expanded MCP tool integration.

### Added

#### F-001: Auto-Relation Extraction (@yagokoro/extractor) 🆕
- **CooccurrenceAnalyzer** - Entity co-occurrence detection
  - Document-level, paragraph-level, sentence-level scope
  - Window-based analysis with configurable size
  - TF-IDF weighted co-occurrence scoring
- **PatternMatcher** - Syntactic pattern-based relation detection
  - Verb pattern matching (developed, created, uses, etc.)
  - Dependency parsing integration
  - Configurable pattern templates
- **RelationScorer** - Multi-factor confidence scoring
  - Frequency-based scoring
  - Position-based scoring (title, abstract, body)
  - Source reliability weighting
- **ContradictionDetector** - Relation conflict detection
  - Temporal contradiction detection
  - Logical inconsistency checking
  - Confidence-based resolution
- **LLMRelationInferrer** - LLM-powered relation inference
  - GPT-4o integration for complex relations
  - Structured prompt templates
  - Confidence calibration
- **RelationExtractorService** - Orchestrated extraction pipeline
  - Configurable extraction strategies
  - Batch processing support
  - Integration with HITL review queue

#### F-002: Paper Ingestion Pipeline (@yagokoro/ingestion) 🆕
- **ArxivClient** - arXiv OAI-PMH API client
  - Paper metadata fetching (cs.AI, cs.CL, cs.LG, cs.CV, cs.NE)
  - 3-second rate limit compliance
  - Incremental harvesting support
- **SemanticScholarClient** - Semantic Scholar REST API client
  - Citation and reference enrichment
  - Author h-index retrieval
  - 100 requests/5min rate limit
- **TokenBucketRateLimiter** - Token bucket rate limiting
  - Configurable bucket size and refill rate
  - Burst handling support
- **SlidingWindowRateLimiter** - Sliding window rate limiting
  - Time-window based limiting
  - Precise rate control
- **CircuitBreaker** - Circuit breaker pattern
  - Failure threshold configuration
  - Automatic recovery
  - Half-open state testing
- **Deduplicator** - Paper deduplication
  - DOI exact matching
  - Title similarity matching (≥0.95 threshold)
  - Author matching (3+ authors + title ≥0.8)
- **ScheduleRunner** - Cron-based scheduling
  - Configurable intervals (1h-24h, default 6h)
  - Named schedule management
- **IngestionService** - Main orchestration service
  - End-to-end ingestion workflow
  - Error recovery and retry
  - Progress tracking

#### F-003: MCP Tool Expansion (@yagokoro/mcp) 🆕
Enhanced MCP tools for external AI system integration:
- `natural_language_query` - NL to Cypher with fallback
- `chain_of_thought` - Multi-step reasoning (max 10 steps)
- `validate_response` - Response validation against graph
- `check_consistency` - Claim consistency checking
- `find_path` - Path finding (max 10 hops)
- `explain_path` - LLM-powered path explanation
- `analyze_gaps` - Knowledge gap analysis
- `analyze_lifecycle` - Entity lifecycle analysis
- `normalize_entities` - Entity normalization (dry-run support)
- `generate_report` - Periodic report generation

### Performance

- Entity normalization: 1000 entities < 30s ✅
- Path finding (4-hop): < 5s (actual: ~400ms) ✅
- Gap analysis: < 60s (actual: ~500ms) ✅
- Report generation: < 120s (actual: ~1s) ✅
- p95 latency: under threshold ✅
- Throughput: 100 req/sec ✅

### Test Summary by Package (v3.0.0)

| Package | Tests | Status |
|---------|-------|--------|
| @yagokoro/domain | 179 | ✅ |
| @yagokoro/extractor | 208 | ✅ 🆕 |
| @yagokoro/ingestion | 46 | ✅ 🆕 |
| @yagokoro/neo4j | 102 | ✅ |
| @yagokoro/nlq | 66 | ✅ |
| @yagokoro/normalizer | 85 | ✅ |
| @yagokoro/vector | 34 | ✅ |
| @yagokoro/analyzer | 206 | ✅ |
| @yagokoro/cli | 247 | ✅ |
| @yagokoro/graphrag | 332 | ✅ |
| @yagokoro/hallucination | 28 | ✅ |
| @yagokoro/mcp | 379 | ✅ |
| @yagokoro/reasoner | 93 | ✅ |
| apps/yagokoro (E2E) | 135 | ✅ |
| **Total** | **2,140** | ✅ |

### Technical Details

- **New Packages**: @yagokoro/extractor, @yagokoro/ingestion
- **Test Increase**: +266 tests (1,874 → 2,140)
- **E2E Coverage**: CLI, MCP, Performance tests

---

## [2.0.0] - 2025-12-30

### 🎉 Major Release: YAGOKORO v2

This release introduces comprehensive GraphRAG v2 capabilities including entity normalization,
natural language querying, multi-hop reasoning, hallucination detection, and research gap analysis.

### Added

#### Phase 1: Entity Normalization (@yagokoro/normalizer)
- **RuleNormalizer** - Rule-based entity name normalization
  - Case normalization, whitespace handling, abbreviation expansion
  - Configurable normalization rules
- **SimilarityMatcher** - Fuzzy matching for entity deduplication
  - Levenshtein distance, Jaro-Winkler, n-gram similarity
  - Configurable thresholds
- **EntityResolver** - Entity resolution and merging
  - Automatic duplicate detection
  - Property merging strategies
- **NormalizationPipeline** - Orchestrated normalization workflow
  - Batch processing support
  - Dry-run mode

#### Phase 2: Natural Language Query (@yagokoro/nlq)
- **IntentClassifier** - Query intent classification
  - Entity lookup, relation lookup, aggregation, path finding
  - Japanese language support
- **CypherGenerator** - NL to Cypher conversion
  - Template-based generation
  - LLM-assisted generation
- **FallbackManager** - Graceful degradation
  - Vector search fallback
  - Response synthesis
- **QueryOptimizer** - Query performance optimization
  - Index hints, query simplification

#### Phase 3: Research Gap Analysis (@yagokoro/analyzer)
- **GapDetector** - Research gap identification
  - Coverage analysis
  - Trend detection
- **OpportunityScorer** - Research opportunity scoring
  - Multi-factor scoring
  - Confidence calculation
- **TrendAnalyzer** - Publication and citation trends
  - Time series analysis
  - Emerging topic detection
- **ReportGenerator** - Automated report generation
  - Weekly/monthly/quarterly reports
  - Multiple output formats
- **AlertGenerator** - Proactive alerting system
  - Date range threshold monitoring
  - Configurable alert severity

#### Phase 4: Multi-hop Reasoning (@yagokoro/reasoner)
- **PathFinder** (BFS/DFS/A*) - Path finding algorithms
  - Configurable max hops
  - Weighted edges support
  - Cycle detection
- **ReasoningChain** - Chain-of-thought reasoning
  - Step-by-step explanation
  - Confidence propagation
- **ConfidenceCalculator** - Multi-factor confidence scoring
  - Graph coverage, path confidence, recency, source quality
- **HallucinationDetector** - Response validation
  - Consistency checking
  - Contradiction detection
  - Entity verification

#### Phase 5: Integration & Infrastructure
- **MCP Tools** - New MCP server tools
  - `natural_language_query` - NL to Cypher
  - `chain_of_thought` - Multi-step reasoning
  - `validate_response` - Hallucination detection
  - `check_consistency` - Claim verification
  - `normalize_entities` - Entity normalization
  - `find_path` - Multi-hop path finding
  - `analyze_lifecycle` - Entity lifecycle
  - `generate_report` - Periodic reports
- **CLI Commands** - New CLI commands
  - `normalize` - Entity normalization
  - `query` - Natural language query
  - `path` - Path finding
  - `analyze` - Gap analysis
  - `lifecycle` - Lifecycle management
- **Auth & Security** - Security infrastructure
  - SecretManager for credential management
  - InputValidator for injection prevention
  - RateLimiter with presets
- **Transaction Management** - Robust data operations
  - TransactionManager with retry logic
  - UnitOfWork pattern
- **Error Handling** - Unified error system
  - ErrorHandler with severity levels
  - Sensitive data masking
  - Error statistics tracking

#### Phase 6: Testing & Documentation
- **E2E Tests** - 81 new E2E tests for CLI and MCP
- **Performance Tests** - 24 tests validating NFR requirements
- **API Documentation** - TypeDoc configuration and API reference

### Performance

- Entity normalization: 1000 entities < 30s ✅
- Path finding (4-hop): < 5s ✅
- Gap analysis: < 60s ✅
- Report generation: < 120s ✅

### Technical Details

- **New Packages**: normalizer, nlq, reasoner, analyzer, hallucination
- **Total Tests**: 1,874 (all passing)
- **Test Coverage**: Comprehensive unit, integration, and E2E tests

### Test Summary by Package

| Package | Tests |
|---------|-------|
| @yagokoro/domain | 167 |
| @yagokoro/graphrag | 332 |
| @yagokoro/neo4j | 102 |
| @yagokoro/vector | 34 |
| @yagokoro/mcp | 379 |
| @yagokoro/cli | 247 |
| @yagokoro/normalizer | 85 |
| @yagokoro/nlq | 66 |
| @yagokoro/reasoner | 93 |
| @yagokoro/analyzer | 206 |
| @yagokoro/hallucination | 28 |
| yagokoro (E2E) | 135 |
| **Total** | **1,874** |

---

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
