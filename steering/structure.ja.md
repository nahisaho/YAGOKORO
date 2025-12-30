# Project Structure

**Project**: YAGOKORO
**Last Updated**: 2025-12-29
**Version**: 1.0

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
│   ├── nlq/                # Layer 2: 自然言語クエリ処理 [NEW Sprint 5]
│   ├── hallucination/      # Layer 2: ハルシネーション検出 [Sprint 6]
│   ├── neo4j/              # Layer 3: Neo4jリポジトリ
│   ├── vector/             # Layer 3: Qdrantベクトルストア
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

### Layer 2: NLQ (@yagokoro/nlq) [NEW Sprint 5]

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

### Layer 2: Hallucination (@yagokoro/hallucination) [Sprint 6]

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

### Layer 3: Infrastructure (@yagokoro/neo4j, @yagokoro/vector)

**Purpose**: 外部システム統合（DB、API）
**Location**: `libs/neo4j/`, `libs/vector/`
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
| Tools | queryKnowledgeGraph, getEntity, getRelations, getPath, getCommunity, addEntity, addRelation, searchSimilar |
| Resources | knowledgeGraph, entities, communities |
| Health | HealthCheck, StatusMonitor |

**@yagokoro/cli**:
| カテゴリ | 内容 |
|----------|------|
| Commands | graph, entity, relation, community, mcp |
| Utils | Logger, TypeDefinitions |

---

## Layer Dependency Rules

```
┌─────────────────────────────────────────┐
│   Interface (MCP, CLI) - apps/yagokoro  │ ← Entry points
├─────────────────────────────────────────┤
│      @yagokoro/mcp, @yagokoro/cli       │ ← Interface libraries
├─────────────────────────────────────────┤
│   @yagokoro/neo4j, @yagokoro/vector     │ ← Infrastructure
├─────────────────────────────────────────┤
│  @yagokoro/graphrag, @yagokoro/nlq,     │ ← Application/Use Cases
│  @yagokoro/hallucination                │
├─────────────────────────────────────────┤
│           @yagokoro/domain              │ ← Domain (NO dependencies)
└─────────────────────────────────────────┘

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

### Version 1.2 (2025-12-29)

- Added @yagokoro/nlq to Layer 2 (Sprint 5 complete)
- Added @yagokoro/hallucination placeholder (Sprint 6)
- Updated dependency diagram

### Version 1.1 (2025-12-28)

- Initial structure definition

---

**Last Updated**: 2025-12-29
**Maintained By**: {{MAINTAINER}}
