# Project Structure

**Project**: YAGOKORO
**Last Updated**: 2025-12-31
**Version**: 5.0.0 ✅ Complete

---

## Architecture Pattern

**Primary Pattern**: Monorepo with Library-First (Hexagonal / DDD)

> YAGOKOROは、pnpm workspacesを使用したMonorepo構成を採用し、Article I「Library-First Architecture」に準拠しています。
> ドメイン駆動設計（DDD）とヘキサゴナルアーキテクチャを組み合わせ、ビジネスロジックをインフラストラクチャから分離しています。

---

## Project Layout

```
yagokoro/
├── apps/                    # アプリケーション層
│   └── yagokoro/           # メインアプリ（CLI + MCPサーバー）
├── libs/                    # ライブラリ層（Library-First）
│   ├── domain/             # Layer 1: ドメインモデル
│   ├── graphrag/           # Layer 2: GraphRAGコアロジック
│   ├── nlq/                # Layer 2: 自然言語クエリ処理
│   ├── hallucination/      # Layer 2: ハルシネーション検出
│   ├── extractor/          # Layer 2: 関係抽出 [v3]
│   ├── ingestion/          # Layer 2: 論文自動取り込み [v3]
│   ├── hitl/               # Layer 2: Human-in-the-Loop検証 [v3]
│   ├── pipeline/           # Layer 2: 差分更新パイプライン [v3]
│   ├── temporal/           # Layer 2: 時系列分析 [v4]
│   ├── researcher/         # Layer 2: 研究者ネットワーク [v4]
│   ├── multilang/          # Layer 2: 多言語処理 [NEW v5]
│   ├── neo4j/              # Layer 3: Neo4jリポジトリ
│   ├── vector/             # Layer 3: Qdrantベクトルストア
│   ├── cache/              # Layer 3: クエリキャッシュ [NEW v3]
│   ├── mcp/                # Layer 4: MCPサーバー
│   └── cli/                # Layer 4: CLIコマンド
├── steering/               # プロジェクトメモリ（MUSUBI SDD）
├── storage/                # 仕様書・アーカイブ
├── docker/                 # Docker構成
└── templates/              # テンプレート
```

---

## Architecture Layers (YAGOKORO固有)

### Layer 1: Domain (@yagokoro/domain)

**Purpose**: ビジネスロジックとドメインモデル
**Location**: `libs/domain/`
**Rules**:

- 他のレイヤーに依存しない（依存性逆転）
- フレームワーク非依存、I/O操作なし

**Contents**:
| カテゴリ | 内容 |
|----------|------|
| Entities | AIModel, Benchmark, Community, Concept, Organization, Person, Publication, Technique |
| Value Objects | EntityId, RelationType, CommunityLevel, etc. |
| Ports | IEntityRepository, IRelationRepository, ICommunityRepository |
| Errors | DomainError, ValidationError, NotFoundError |

### Layer 2: Application / GraphRAG (@yagokoro/graphrag)

**Purpose**: GraphRAGコアロジック、ユースケース実装
**Location**: `libs/graphrag/`
**Rules**:

- Domainレイヤーにのみ依存
- I/OはPorts経由（インターフェース使用）

**Contents**:
| カテゴリ | 内容 |
|----------|------|
| Extraction | EntityExtractor, RelationExtractor, ConceptExtractor, ConceptGraphBuilder |
| Reasoning | MultiHopReasoner, PathFinder, CoTGenerator, ConfidenceScorer |
| Query | QueryProcessor, CommunitySearch, LazyQueryEngine |
| LazyGraphRAG | QueryExpander, RelevanceAssessor, IterativeSearch, ClaimExtractor |
| Ingest | ArxivClient, UnstructuredClient, DocumentProcessor |
| LLM | LLMClient, PromptTemplates |

### Layer 2: NLQ (@yagokoro/nlq)

**Purpose**: 自然言語クエリをCypherに変換
**Location**: `libs/nlq/`
**Rules**:

- Domain, Neo4j, Vectorレイヤーに依存
- LLMClientインターフェース経由でLLM呼び出し

**Contents**:
| カテゴリ | 内容 |
|----------|------|
| Schema | SchemaProvider (5min TTLキャッシュ) |
| Intent | IntentClassifier (6タイプ分類) |
| Cypher | CypherGenerator (リトライ付き) |
| Service | NLQService (フォールバック機構) |

### Layer 2: Hallucination (@yagokoro/hallucination)

**Purpose**: ハルシネーション検出・整合性検証
**Location**: `libs/hallucination/`
**Rules**:

- Domain, Neo4jレイヤーに依存
- グラフデータとの整合性を検証

**Contents**:
| カテゴリ | 内容 |
|----------|------|
| Checker | ConsistencyChecker, ContradictionDetector |
| Extractor | EntityMentionExtractor |
| Filter | HallucinationFilter |

### Layer 2: Extractor (@yagokoro/extractor) [NEW v3]

**Purpose**: 共起分析ベースの関係自動抽出
**Location**: `libs/extractor/`
**Rules**:

- Domain, Neo4jレイヤーに依存
- 抽出された関係はHITLレビューを経由

**Contents**:
| カテゴリ | 内容 |
|----------|------|
| Cooccurrence | CooccurrenceAnalyzer (document/paragraph/sentence scope) |
| Pattern | PatternMatcher (verb patterns, dependency) |
| Scorer | RelationScorer (confidence calculation) |
| Service | RelationExtractorService |

### Layer 2: Ingestion (@yagokoro/ingestion) [NEW v3]

**Purpose**: 外部ソースからの論文自動取り込み
**Location**: `libs/ingestion/`
**Rules**:

- Domain, Extractorレイヤーに依存
- API制限を遵守（Rate Limiter, Circuit Breaker）

**Contents**:
| カテゴリ | 内容 |
|----------|------|
| Client | ArxivClient, SemanticScholarClient |
| Dedupe | Deduplicator (DOI, title similarity, author matching) |
| Scheduler | ScheduleRunner (cron expression) |
| RateLimit | RateLimiter, CircuitBreaker |
| Service | IngestionService |

### Layer 2: HITL (@yagokoro/hitl) [NEW v3]

**Purpose**: Human-in-the-Loop検証ワークフロー
**Location**: `libs/hitl/`
**Rules**:

- Domain, Neo4jレイヤーに依存
- 信頼度0.5-0.7の関係を人間レビュー

**Contents**:
| カテゴリ | 内容 |
|----------|------|
| Queue | ReviewQueue (priority queue) |
| Workflow | ApprovalWorkflow (approve/reject/modify) |
| Batch | BatchApprover (confidence threshold) |
| Service | HITLService |

### Layer 2: Pipeline (@yagokoro/pipeline) [v3]

**Purpose**: 差分更新とトランザクション管理
**Location**: `libs/pipeline/`
**Rules**:

- 全レイヤーのオーケストレーション
- ロールバック可能なトランザクション

**Contents**:
| カテゴリ | 内容 |
|----------|------|
| Change | ChangeDetector (hash-based) |
| Apply | ChangeApplier (batch processing) |
| Transaction | TransactionManager (rollback support) |
| Service | PipelineService |

### Layer 2: Temporal (@yagokoro/temporal) [NEW v4]

**Purpose**: 時系列分析・トレンド検出
**Location**: `libs/temporal/`
**Rules**:

- Domain, Neo4jレイヤーに依存
- 時系列データの集計・分析

**Contents**:
| カテゴリ | 内容 |
|----------|------|
| Aggregation | TimeSeriesAggregator (by period), TrendDetector (slope analysis) |
| Analysis | TimelineAnalyzer, PhaseAnalyzer, SnapshotAnalyzer |
| Prediction | ForecastEngine (linear regression), HotTopicDetector |
| Service | TemporalService (113 tests) |

### Layer 2: Researcher (@yagokoro/researcher) [NEW v4]

**Purpose**: 研究者ネットワーク分析
**Location**: `libs/researcher/`
**Rules**:

- Domain, Neo4jレイヤーに依存
- グラフアルゴリズムで共著・影響力分析

**Contents**:
| カテゴリ | 内容 |
|----------|------|
| Graph | CoauthorNetwork, CollaborationGraph |
| Analysis | InfluenceScorer (h-index, PageRank), CommunityDetector (Louvain) |
| Path | ShortestPathFinder, CareerAnalyzer |
| Service | ResearcherService (94 tests) |

### Layer 2: Multilang (@yagokoro/multilang) [NEW v5]

**Purpose**: 多言語論文処理（言語検出、翻訳、NER、リンキング）
**Location**: `libs/multilang/`
**Rules**:

- Domain, Neo4jレイヤーに依存
- Python/spaCy連携による多言語NLP
- 翻訳APIフォールバック機構

**Contents**:
| カテゴリ | 内容 |
|----------|------|
| Detection | LanguageDetector (langdetect + spaCy ensemble) |
| Translation | TranslationService (DeepL/Google fallback), TranslationCache |
| NER | MultilingualNER (spaCy en/zh/ja/ko models) |
| Linking | CrossLingualLinker (Neo4j vector similarity + string matching) |
| Normalization | TermNormalizer (Unicode/case/stemming) |
| Cache | MemoryCacheStorage, SQLiteCacheStorage, RedisCacheStorage |
| Service | MultilingualService (75 tests) |

**Python依存**:
- langdetect: 言語検出
- spaCy 3.x: NER・トークン化
- spaCyモデル: en_core_web_sm, zh_core_web_sm, ja_core_news_sm, ko_core_news_sm

### Layer 3: Infrastructure (@yagokoro/neo4j, @yagokoro/vector, @yagokoro/cache)

**Purpose**: 外部システム統合（DB、API、キャッシュ）
**Location**: `libs/neo4j/`, `libs/vector/`, `libs/cache/`
**Rules**:

- Domainのポートを実装
- すべてのI/O操作をここに集約

**@yagokoro/neo4j**:
| カテゴリ | 内容 |
|----------|------|
| Connection | Neo4jConnection, ConnectionPool |
| Repositories | Neo4jEntityRepository, Neo4jRelationRepository, Neo4jCommunityRepository |
| Queries | CypherQueryBuilder, GraphTraversal |

**@yagokoro/vector**:
| カテゴリ | 内容 |
|----------|------|
| Connection | QdrantConnection |
| Store | VectorStore, CollectionManager |
| Embedding | EmbeddingService, TextChunker |

**@yagokoro/cache** [NEW v3]:
| カテゴリ | 内容 |
|----------|------|
| Store | InMemoryCache, LRUEviction |
| Key | CacheKeyGenerator, PatternMatcher |
| Invalidation | DependencyTracker, SelectiveInvalidation |
| Service | CacheService |

### Layer 4: Interface (@yagokoro/mcp, @yagokoro/cli)

**Purpose**: エントリーポイント（MCP、CLI）
**Location**: `libs/mcp/`, `libs/cli/`
**Rules**:

- Applicationレイヤーに依存
- 入力バリデーションとレスポンスフォーマット

**@yagokoro/mcp**:
| カテゴリ | 内容 |
|----------|------|
| Server | YagokoroMCPServer |
| Tools (Existing) | queryKnowledgeGraph, getEntity, getRelations, getPath, getCommunity, addEntity, addRelation, searchSimilar |
| Tools (NLQ) [v3] | nlq_query, nlq_history |
| Tools (Reasoning) [v3] | find_paths, infer_relations |
| Tools (Analysis) [v3] | analyze_gaps, analyze_lifecycle |
| Tools (Verification) [v3] | verify_statement, verify_entity |
| Tools (Normalization) [v3] | normalize_entity |
| Tools (Temporal) [v4] | temporal_analyze_trends, temporal_get_timeline, temporal_hot_topics, temporal_forecast, temporal_by_phase |
| Tools (Researcher) [v4] | researcher_search, researcher_get, researcher_coauthors, researcher_path, researcher_ranking, researcher_communities, researcher_career |
| Resources | knowledgeGraph, entities, communities |
| Health | HealthCheck, StatusMonitor |

**@yagokoro/cli**:
| カテゴリ | 内容 |
|----------|------|
| Commands (Existing) | graph, entity, relation, community, mcp |
| Commands (Ingestion) [v3] | ingest arxiv, ingest semantic-scholar, schedule |
| Commands (Extract) [v3] | extract, extract analyze |
| Commands (Review) [v3] | review list, review approve, review reject |
| Commands (Pipeline) [v3] | pipeline run, pipeline status, pipeline rollback |
| Commands (Cache) [v3] | cache stats, cache clear, cache invalidate |
| Commands (Temporal) [v4] | temporal trends, timeline, hot-topics, forecast, phases, stats, snapshot |
| Commands (Researcher) [v4] | researcher search, info, coauthors, path, ranking, communities, stats, export, career |
| Utils | Logger, TypeDefinitions, OutputFormatter |

---

## Layer Dependency Rules

```
┌─────────────────────────────────────────────────────────────────┐
│     Interface (MCP, CLI) - apps/yagokoro                        │ ← Entry points
├─────────────────────────────────────────────────────────────────┤
│        @yagokoro/mcp, @yagokoro/cli                             │ ← Interface libraries
├─────────────────────────────────────────────────────────────────┤
│     @yagokoro/neo4j, @yagokoro/vector, @yagokoro/cache          │ ← Infrastructure
├─────────────────────────────────────────────────────────────────┤
│  @yagokoro/graphrag, @yagokoro/nlq, @yagokoro/hallucination,    │ ← Application/Use Cases
│  @yagokoro/extractor, @yagokoro/ingestion, @yagokoro/hitl,      │   [v3: extractor, ingestion,
│  @yagokoro/pipeline, @yagokoro/temporal, @yagokoro/researcher   │    hitl, pipeline]
│                                                                 │   [v4: temporal, researcher]
├─────────────────────────────────────────────────────────────────┤
│             @yagokoro/domain                                    │ ← Domain (NO dependencies)
└─────────────────────────────────────────────────────────────────┘

依存方向: 上 → 下 のみ許可
```

---

## Library-First Pattern (Article I)

すべての機能は `libs/` 内の独立したライブラリとして開始されます。

### Library Structure

```
libs/{library}/
├── src/
│   ├── index.ts          # パブリックAPIエクスポート
│   ├── {feature}/        # 機能別サブディレクトリ
│   │   └── index.ts
│   └── ...
├── test/
│   └── *.test.ts         # テストファイル
├── package.json          # ライブラリメタデータ
├── tsconfig.json         # TypeScript設定
└── vitest.config.ts      # テスト設定
```

### Library Guidelines

- **Independence**: ライブラリはアプリケーションコードに依存してはならない
- **Public API**: すべてのエクスポートは `src/index.ts` 経由
- **Testing**: 独立したテストスイート（Vitest）
- **CLI**: すべてのライブラリはCLIインターフェースを公開（Article II）

---

## Test Organization

### Test Structure

```
libs/{library}/test/
├── *.test.ts             # ユニットテスト
├── *.integration.test.ts # 統合テスト（実DB使用）
└── fixtures/             # テストデータ
```

### Test Guidelines

- **Test-First**: 実装前にテストを記述（Article III）
- **Real Services**: 統合テストは実際のDB/キャッシュを使用（Article IX）
- **Coverage**: 最低80%カバレッジ
- **Naming**: `*.test.ts`（ユニット）、`*.integration.test.ts`（統合）

---

## SDD Artifacts Organization

### Storage Directory

```
storage/
├── specs/                # 仕様書
│   ├── REQ-001-*.md      # 要件定義
│   ├── DES-001-*.md      # 設計書
│   └── TASKS-001-*.md    # タスク分解
├── changes/              # 変更仕様（ブラウンフィールド用）
└── archive/              # アーカイブ
```

---

## Naming Conventions

### File Naming

- **TypeScript**: `PascalCase.ts` (エンティティ)、`camelCase.ts` (ユーティリティ)
- **Tests**: `*.test.ts`
- **Index**: `index.ts`（各ディレクトリのエントリポイント）

### Directory Naming

- **Features**: `kebab-case` (e.g., `value-objects/`)
- **Libraries**: `kebab-case` (e.g., `graphrag/`)

### Variable Naming

- **Variables**: `camelCase`
- **Constants**: `SCREAMING_SNAKE_CASE`
- **Types/Interfaces**: `PascalCase`
- **Enums**: `PascalCase`

---

## Docker Organization

```
docker/
├── docker-compose.yml      # 本番環境
├── docker-compose.dev.yml  # 開発環境
├── docker-compose.test.yml # テスト環境
├── data/                   # ボリュームデータ
└── logs/                   # ログファイル
```

---

## Version Control

### Branch Organization

- `main` - プロダクションブランチ
- `develop` - 開発ブランチ
- `feature/*` - 機能ブランチ
- `hotfix/*` - ホットフィックスブランチ

### Commit Message Convention

```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, test, chore
Scope: domain, graphrag, neo4j, vector, mcp, cli
```

---

*Updated: 2025-12-29*
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Example**:

```
feat(auth): implement user login (REQ-AUTH-001)

Add login functionality with email and password authentication.
Session created with 24-hour expiry.

Closes REQ-AUTH-001
```

---

## Constitutional Compliance

This structure enforces:

- **Article I**: Library-first pattern in `lib/`
- **Article II**: CLI interfaces per library
- **Article III**: Test structure supports Test-First
- **Article VI**: Steering files maintain project memory

---

## Changelog

### Version 3.0 (2025-12-31) - v4.0.0 対応

- Added 2 new v4 packages to Layer 2:
  - @yagokoro/temporal (時系列分析・トレンド検出) - 113 tests
  - @yagokoro/researcher (研究者ネットワーク分析) - 94 tests
- Updated @yagokoro/mcp: 17 tools → 29 tools (12 new v4 tools)
- Updated @yagokoro/cli: 11 command groups → 13 command groups (2 new v4 commands)
- Updated dependency diagram for v4 architecture

### Version 2.0 (2025-12-31) - v3.0.0 対応

- Added 5 new v3 packages to Layer 2:
  - @yagokoro/extractor (共起分析ベースの関係抽出)
  - @yagokoro/ingestion (論文自動取り込み)
  - @yagokoro/hitl (Human-in-the-Loop検証)
  - @yagokoro/pipeline (差分更新パイプライン)
- Added @yagokoro/cache to Layer 3 (クエリキャッシュ)
- Updated @yagokoro/mcp: 8 tools → 17 tools (9 new v3 tools)
- Updated @yagokoro/cli: 5 commands → 11 command groups (6 new v3 commands)
- Updated dependency diagram for v3 architecture

### Version 1.2 (2025-12-29)

- Added @yagokoro/nlq to Layer 2 (Sprint 5 complete)
- Added @yagokoro/hallucination placeholder (Sprint 6)
- Updated dependency diagram

### Version 1.1 (2025-12-28)

- Initial structure definition

---

**Last Updated**: 2025-12-31
**Maintained By**: {{MAINTAINER}}
