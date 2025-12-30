# アーキテクチャ概要

YAGOKOROのシステムアーキテクチャについて説明します。

## システム構成図

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            External Clients                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│   │   Claude    │    │   ChatGPT   │    │   VS Code   │    │   Custom    │ │
│   │   Desktop   │    │   Plugins   │    │   Copilot   │    │    Apps     │ │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘ │
└──────────┼──────────────────┼──────────────────┼──────────────────┼────────┘
           │                  │                  │                  │
           └──────────────────┴────────┬─────────┴──────────────────┘
                                       │
                              MCP Protocol (stdio/HTTP)
                                       │
┌──────────────────────────────────────┼──────────────────────────────────────┐
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Application Layer                             │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │    │
│  │  │  MCP Server     │  │  CLI Interface  │  │  REST API (future)  │  │    │
│  │  │  (libs/mcp)     │  │  (libs/cli)     │  │                     │  │    │
│  │  └────────┬────────┘  └────────┬────────┘  └──────────┬──────────┘  │    │
│  └───────────┼────────────────────┼──────────────────────┼─────────────┘    │
│              │                    │                      │                   │
│              └────────────────────┴──────────┬───────────┘                   │
│                                              │                               │
│  ┌───────────────────────────────────────────┼──────────────────────────┐   │
│  │                       GraphRAG Core Layer                             │   │
│  │                         (libs/graphrag)                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │   │
│  │  │  Extraction  │  │  Community   │  │  Reasoning   │  │   Query   │ │   │
│  │  │    Engine    │  │  Detection   │  │   Engine     │  │  Engines  │ │   │
│  │  │              │  │              │  │              │  │           │ │   │
│  │  │ • NER        │  │ • Leiden     │  │ • MultiHop   │  │ • Local   │ │   │
│  │  │ • Relations  │  │ • Hierarchy  │  │ • Path       │  │ • Global  │ │   │
│  │  │ • Chunks     │  │ • Summary    │  │ • Reasoning  │  │ • Hybrid  │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └───────────┘ │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                              │                               │
│  ┌───────────────────────────────────────────┼──────────────────────────┐   │
│  │                        Domain Layer                                   │   │
│  │                        (libs/domain)                                  │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │                      Entity Types                               │  │   │
│  │  │  AIModel | Organization | Person | Publication | Technique     │  │   │
│  │  │  Benchmark | Concept                                           │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │                     Relation Types                              │  │   │
│  │  │  DEVELOPED_BY | BASED_ON | AUTHORED | USES_TECHNIQUE |         │  │   │
│  │  │  EVALUATED_ON | EMPLOYED_AT | PRECEDES | MEMBER_OF             │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │                     Value Objects                               │  │   │
│  │  │  EntityId | EntityName | RelationType | Confidence | etc.      │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                              │                               │
│  ┌─────────────────────────────┬─────────────┴─────────────┬────────────┐   │
│  │    Infrastructure Layer     │                           │            │   │
│  │  ┌─────────────────────┐   │   ┌─────────────────────┐ │            │   │
│  │  │   Neo4j Adapter     │   │   │   Vector Adapter    │ │            │   │
│  │  │   (libs/neo4j)      │   │   │   (libs/vector)     │ │            │   │
│  │  │                     │   │   │                     │ │            │   │
│  │  │ • Connection Pool   │   │   │ • Embedding Service │ │            │   │
│  │  │ • Repositories      │   │   │ • Vector Store      │ │            │   │
│  │  │ • Query Builder     │   │   │ • Similarity Search │ │            │   │
│  │  │ • Backup Service    │   │   │                     │ │            │   │
│  │  └──────────┬──────────┘   │   └──────────┬──────────┘ │            │   │
│  └─────────────┼──────────────┴──────────────┼────────────┴────────────┘   │
│                │                             │                              │
│                ▼                             ▼                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐                  │
│  │        Neo4j            │  │        Qdrant           │                  │
│  │   (Graph Database)      │  │   (Vector Database)     │                  │
│  └─────────────────────────┘  └─────────────────────────┘                  │
│                                                                             │
│                              YAGOKORO System                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

## アーキテクチャパターン

### Hexagonal Architecture（六角形アーキテクチャ）

YAGOKOROは**Hexagonal Architecture**（別名: Ports and Adapters）を採用しています。

```
                    ┌───────────────────────────────────┐
                    │                                   │
    ┌───────────┐   │   ┌───────────────────────────┐   │   ┌───────────────┐
    │   MCP     │◄──┼──►│                           │◄──┼──►│    Neo4j      │
    │  Server   │   │   │       Domain Core         │   │   │   Adapter     │
    └───────────┘   │   │                           │   │   └───────────────┘
                    │   │   • Entities              │   │
    ┌───────────┐   │   │   • Value Objects         │   │   ┌───────────────┐
    │   CLI     │◄──┼──►│   • Domain Services       │◄──┼──►│    Vector     │
    │           │   │   │   • Business Rules        │   │   │   Adapter     │
    └───────────┘   │   │                           │   │   └───────────────┘
                    │   └───────────────────────────┘   │
                    │                                   │
                    │          Application Core         │
                    └───────────────────────────────────┘
                                    ▲
                                    │
                             Ports (Interfaces)
```

**メリット:**
- ドメインロジックが外部依存から分離
- テスト容易性の向上
- データベースやUIの差し替えが容易

### Library-First Pattern

すべてのコア機能は独立したライブラリとして実装されます。

```
libs/
├── domain/      # ドメインモデル（依存なし）
├── graphrag/    # GraphRAGアルゴリズム
├── neo4j/       # Neo4jアダプター
├── vector/      # ベクトルストアアダプター
├── mcp/         # MCPサーバー
└── cli/         # CLIインターフェース
```

**依存関係の方向:**
```
apps/yagokoro
    │
    ├─────────────────────────────────┐
    │                                 │
    ▼                                 ▼
libs/mcp                          libs/cli
    │                                 │
    └─────────────┬───────────────────┘
                  │
                  ▼
            libs/graphrag
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
libs/neo4j   libs/vector   libs/domain
    │             │             │
    │             │             │
    └──────► (no deps) ◄────────┘
```

## コンポーネント詳細

### Domain Layer（libs/domain）

ビジネスルールとエンティティを定義。外部依存ゼロ。

```typescript
// エンティティ定義例
export interface Entity {
  id: EntityId;
  type: EntityType;
  name: EntityName;
  description: string;
  properties: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// バリデーションはZodスキーマで定義
export const AIModelSchema = z.object({
  type: z.literal('AIModel'),
  name: EntityNameSchema,
  properties: z.object({
    parameterCount: z.string().optional(),
    releaseDate: z.string().optional(),
    architecture: z.string().optional(),
  }),
});
```

### GraphRAG Layer（libs/graphrag）

Microsoft GraphRAGに着想を得たナレッジグラフ検索エンジン。

**主要コンポーネント:**

1. **Extraction Engine**
   - ドキュメントからエンティティ・リレーションを抽出
   - LLMベースのNER（Named Entity Recognition）
   - チャンキング戦略（semantic/fixed）

2. **Community Detection**
   - Leidenアルゴリズムによるコミュニティ検出
   - 階層的コミュニティ構造
   - LLMによるコミュニティサマリー生成

3. **Query Engines**
   ```
   ┌─────────────────────────────────────────────────────┐
   │                    Query Router                     │
   │                  (mode selection)                   │
   └───────────────────────┬─────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   ┌───────────┐    ┌───────────┐    ┌───────────┐
   │   Local   │    │  Global   │    │  Hybrid   │
   │  Search   │    │  Search   │    │  Search   │
   │           │    │           │    │           │
   │ Vector +  │    │ Community │    │ Weighted  │
   │ Graph     │    │ Map-Reduce│    │ Merge     │
   └───────────┘    └───────────┘    └───────────┘
   ```

### Infrastructure Layer

**Neo4j Adapter（libs/neo4j）:**
- コネクションプール管理
- Cypherクエリビルダー
- トランザクション管理
- バックアップ/リストア

**Vector Adapter（libs/vector）:**
- エンベディング生成（OpenAI text-embedding-3-small）
- Qdrantベクトルストア
- 類似度検索（cosine similarity）

### Application Layer

**MCP Server（libs/mcp）:**
- MCP SDK統合
- 8つのツール定義
- 2つのリソース定義
- 認証（APIキー + RBAC）
- 構造化ロギング

**CLI（libs/cli）:**
- Commander.jsベース
- インタラクティブモード
- 複数出力フォーマット（JSON/Table/YAML）

## データフロー

### クエリ実行フロー

```
User Query: "Transformerを使用しているLLMは？"
                    │
                    ▼
┌───────────────────────────────────────┐
│           MCP Server                  │
│  queryKnowledgeGraph tool             │
└───────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│          Query Router                 │
│  mode: hybrid (default)               │
└───────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│ Local Search  │       │ Global Search │
│               │       │               │
│ 1. Embedding  │       │ 1. Get        │
│ 2. Vector     │       │    communities│
│    search     │       │ 2. Map-Reduce │
│ 3. Graph      │       │    summaries  │
│    expansion  │       │               │
└───────────────┘       └───────────────┘
        │                       │
        └───────────┬───────────┘
                    ▼
┌───────────────────────────────────────┐
│         Result Merger                 │
│  • Weighted combination               │
│  • Deduplication                      │
│  • Ranking                            │
└───────────────────────────────────────┘
                    │
                    ▼
            Final Response
```

### エンティティ追加フロー

```
addEntity Request
        │
        ▼
┌───────────────────────────────────────┐
│         Validation Layer              │
│  Zod schema validation                │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│         Domain Layer                  │
│  Entity creation & business rules     │
└───────────────────────────────────────┘
        │
        ├──────────────────────┐
        ▼                      ▼
┌───────────────┐      ┌───────────────┐
│ Neo4j Repo    │      │ Vector Store  │
│               │      │               │
│ CREATE node   │      │ Generate      │
│               │      │ embedding &   │
│               │      │ upsert        │
└───────────────┘      └───────────────┘
        │                      │
        └──────────┬───────────┘
                   ▼
            Success Response
```

## スケーラビリティ考慮

### 現在の構成（単一ノード）

- Neo4j Community Edition
- Qdrant単一インスタンス
- 適用規模: ~100万ノード

### 将来の拡張オプション

```
                    Load Balancer
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │ YAGOKORO│    │ YAGOKORO│    │ YAGOKORO│
    │   #1    │    │   #2    │    │   #3    │
    └────┬────┘    └────┬────┘    └────┬────┘
         │              │              │
         └──────────────┴──────────────┘
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
    ┌─────────┐   ┌──────────┐   ┌─────────┐
    │ Neo4j   │   │  Qdrant  │   │  Redis  │
    │ Cluster │   │  Cluster │   │  Cache  │
    └─────────┘   └──────────┘   └─────────┘
```

## セキュリティ

### 認証レイヤー

```
Request
    │
    ▼
┌───────────────────────────────────────┐
│         API Key Validation            │
│  • SHA-256 hash comparison            │
│  • Rate limiting                      │
└───────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────┐
│            RBAC Check                 │
│  • admin: full access                 │
│  • editor: read/write                 │
│  • reader: read only                  │
└───────────────────────────────────────┘
    │
    ▼
Tool Execution
```

### データ保護

- Neo4j: ユーザー認証必須
- Qdrant: APIキー認証（オプション）
- バックアップ: SHA-256チェックサム検証
