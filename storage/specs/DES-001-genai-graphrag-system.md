# 設計書: Generative AI 系譜 GraphRAG MCPシステム

**Document ID**: DES-001
**Version**: 1.0
**Created**: 2025-12-28
**Status**: Draft
**Related Requirements**: REQ-001

---

## 1. C4 アーキテクチャ設計

### 1.1 C4 Level 1: System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              System Context                                  │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
    │   AI/LLM     │          │  Developer   │          │  Researcher  │
    │   Agent      │          │              │          │              │
    │  (Claude,    │          │  (CLI User)  │          │  (API User)  │
    │   GPT, etc)  │          │              │          │              │
    └──────┬───────┘          └──────┬───────┘          └──────┬───────┘
           │                         │                         │
           │ MCP Protocol            │ CLI                     │ MCP/API
           │                         │                         │
           ▼                         ▼                         ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                                                                 │
    │                      YAGOKORO System                            │
    │                                                                 │
    │   Generative AI 系譜 GraphRAG MCP システム                       │
    │                                                                 │
    │   - 知識グラフ構築・検索                                          │
    │   - マルチホップ推論                                              │
    │   - MCPプロトコル対応                                            │
    │                                                                 │
    └──────────────────────────┬──────────────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │   OpenAI     │    │   Neo4j      │    │   Qdrant     │
    │   API        │    │   Database   │    │   Vector     │
    │              │    │              │    │   Store      │
    │  (Embedding, │    │  (Graph      │    │              │
    │   LLM)       │    │   Storage)   │    │  (Semantic   │
    │              │    │              │    │   Search)    │
    └──────────────┘    └──────────────┘    └──────────────┘
```

### 1.2 C4 Level 2: Container Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              YAGOKORO System                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  User Interface Layer                                                        │
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐         │
│  │      yagokoro-cli           │    │      yagokoro-mcp           │         │
│  │     [TypeScript]            │    │     [TypeScript]            │         │
│  │                             │    │                             │         │
│  │  CLI Interface for          │    │  MCP Server for             │         │
│  │  graph management           │    │  AI Agent integration       │         │
│  │                             │    │                             │         │
│  │  - graph, entity, relation  │    │  - Tools (8 tools)          │         │
│  │  - community, mcp commands  │    │  - Resources (4 resources)  │         │
│  └──────────────┬──────────────┘    └──────────────┬──────────────┘         │
│                 │                                   │                        │
└─────────────────┼───────────────────────────────────┼────────────────────────┘
                  │                                   │
                  ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Application Layer                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │                      yagokoro-graphrag                            │       │
│  │                        [TypeScript]                               │       │
│  │                                                                   │       │
│  │  GraphRAG Core Services:                                          │       │
│  │  - EntityExtractionService    - CommunityDetectionService        │       │
│  │  - RelationExtractionService  - GlobalQueryService               │       │
│  │  - MultiHopReasoningService   - LocalQueryService                │       │
│  │  - HybridSearchService                                           │       │
│  └──────────────────────────────────┬───────────────────────────────┘       │
│                                     │                                        │
└─────────────────────────────────────┼────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Domain Layer                                                                │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │                      yagokoro-domain                              │       │
│  │                       [TypeScript]                                │       │
│  │                                                                   │       │
│  │  Domain Models:                                                   │       │
│  │  - Entity (AIModel, Organization, Technique, Publication...)     │       │
│  │  - Relation (DERIVED_FROM, DEVELOPED_BY, USES_TECHNIQUE...)      │       │
│  │  - Community, OntologySchema                                      │       │
│  │                                                                   │       │
│  │  Ports (Interfaces):                                              │       │
│  │  - EntityRepository, RelationRepository                           │       │
│  │  - VectorStore, LLMClient                                         │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Infrastructure Layer                                                        │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐     │
│  │  yagokoro-neo4j    │  │  yagokoro-vector   │  │  (LLM Client)      │     │
│  │   [TypeScript]     │  │   [TypeScript]     │  │   [TypeScript]     │     │
│  │                    │  │                    │  │                    │     │
│  │  Neo4j Repository  │  │  Qdrant Repository │  │  OpenAI Client     │     │
│  │  Implementation    │  │  Implementation    │  │  (in graphrag)     │     │
│  │                    │  │                    │  │                    │     │
│  │  - EntityRepo      │  │  - VectorStore     │  │  - Embedding       │     │
│  │  - RelationRepo    │  │  - Similarity      │  │  - Completion      │     │
│  │  - CommunityRepo   │  │    Search          │  │                    │     │
│  └─────────┬──────────┘  └─────────┬──────────┘  └─────────┬──────────┘     │
│            │                       │                       │                 │
└────────────┼───────────────────────┼───────────────────────┼─────────────────┘
             │                       │                       │
             ▼                       ▼                       ▼
      ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
      │   Neo4j      │        │   Qdrant     │        │   OpenAI     │
      │   Database   │        │   Vector DB  │        │   API        │
      └──────────────┘        └──────────────┘        └──────────────┘
```

### 1.3 C4 Level 3: Component Diagram (yagokoro-graphrag)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           yagokoro-graphrag                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  Extraction Components                                                       │
│  ┌─────────────────────────┐    ┌─────────────────────────┐                 │
│  │  EntityExtractor        │    │  RelationExtractor      │                 │
│  │                         │    │                         │                 │
│  │  - extractFromText()    │    │  - extractFromText()    │                 │
│  │  - extractFromDocument()│    │  - inferRelations()     │                 │
│  │  - mergeEntities()      │    │  - validateRelation()   │                 │
│  └────────────┬────────────┘    └────────────┬────────────┘                 │
│               │                              │                               │
│               └──────────────┬───────────────┘                               │
│                              ▼                                               │
│               ┌─────────────────────────┐                                    │
│               │   LLMExtractionEngine   │                                    │
│               │                         │                                    │
│               │   - promptTemplate      │                                    │
│               │   - parseResponse()     │                                    │
│               └─────────────────────────┘                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  Query Components                                                            │
│  ┌─────────────────────────┐    ┌─────────────────────────┐                 │
│  │  LocalQueryEngine       │    │  GlobalQueryEngine      │                 │
│  │                         │    │                         │                 │
│  │  - queryEntity()        │    │  - queryGlobal()        │                 │
│  │  - getSubgraph()        │    │  - mapReduce()          │                 │
│  │  - rankResults()        │    │  - aggregateAnswers()   │                 │
│  └────────────┬────────────┘    └────────────┬────────────┘                 │
│               │                              │                               │
│               └──────────────┬───────────────┘                               │
│                              ▼                                               │
│               ┌─────────────────────────┐                                    │
│               │   ResponseGenerator     │                                    │
│               │                         │                                    │
│               │   - generateAnswer()    │                                    │
│               │   - formatCitations()   │                                    │
│               └─────────────────────────┘                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  Reasoning Components                                                        │
│  ┌─────────────────────────┐    ┌─────────────────────────┐                 │
│  │  MultiHopReasoner       │    │  CommunityDetector      │                 │
│  │                         │    │                         │                 │
│  │  - findPath()           │    │  - detectCommunities()  │                 │
│  │  - scorePath()          │    │  - summarizeCommunity() │                 │
│  │  - explainReasoning()   │    │  - findBridgeNodes()    │                 │
│  └─────────────────────────┘    └─────────────────────────┘                 │
│                                                                              │
│  ┌─────────────────────────┐                                                │
│  │  HybridSearchEngine     │                                                │
│  │                         │                                                │
│  │  - searchVector()       │                                                │
│  │  - searchGraph()        │                                                │
│  │  - mergeResults()       │                                                │
│  └─────────────────────────┘                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture Decision Records (ADR)

### ADR-001: Graph Database Selection

**Status**: Accepted
**Date**: 2025-12-28

#### Context
知識グラフを永続化するためのグラフデータベースを選定する必要がある。

#### Decision
**Neo4j** を採用する。

#### Rationale
| 候補 | 評価 |
|------|------|
| Neo4j | ✅ 成熟したエコシステム、Cypher言語、GraphRAGとの実績 |
| FalkorDB | △ Redis互換で高速だがエコシステムが小さい |
| Amazon Neptune | △ マネージドだがロックイン懸念 |
| ArangoDB | △ マルチモデルだがグラフ特化ではない |

#### Consequences
- Cypher クエリ言語を学習する必要がある
- Neo4j Community Edition（AGPL）またはEnterprise Edition（商用）のライセンス選択が必要
- Dockerでの開発環境構築が容易

---

### ADR-002: Vector Store Selection

**Status**: Accepted
**Date**: 2025-12-28

#### Context
エンティティの意味的検索のためのベクトルストアを選定する必要がある。

#### Decision
**Qdrant** を採用する。

#### Rationale
| 候補 | 評価 |
|------|------|
| Qdrant | ✅ Rust製で高性能、オンプレ/クラウド両対応、フィルタリング強力 |
| Pinecone | △ フルマネージドだがコスト高い |
| Weaviate | △ GraphQL対応だが複雑 |
| Chroma | △ シンプルだがスケーラビリティ懸念 |

#### Consequences
- Qdrant Cloud または Self-hosted の選択が必要
- REST API または gRPC での接続

---

### ADR-003: MCP SDK Selection

**Status**: Accepted
**Date**: 2025-12-28

#### Context
Model Context Protocol サーバーを実装するためのSDKを選定する必要がある。

#### Decision
**@modelcontextprotocol/sdk** (公式TypeScript SDK) を採用する。

#### Rationale
- 公式SDKによる仕様準拠の保証
- TypeScriptとの親和性
- 継続的なメンテナンス

#### Consequences
- Node.js ランタイムが必要
- SDK のバージョンアップへの追従が必要

---

### ADR-004: Monorepo Structure

**Status**: Accepted
**Date**: 2025-12-28

#### Context
複数のライブラリを管理するためのリポジトリ構成を決定する必要がある。

#### Decision
**pnpm workspaces** によるモノレポ構成を採用する。

#### Rationale
| 候補 | 評価 |
|------|------|
| pnpm workspaces | ✅ 高速、ディスク効率、シンプル |
| Nx | △ 高機能だが学習コスト高い |
| Turborepo | △ ビルドキャッシュ優秀だが設定複雑 |
| Lerna | △ メンテナンス懸念 |

#### Consequences
- pnpm-workspace.yaml の設定が必要
- 依存関係の明示的な管理

---

### ADR-005: Community Detection Algorithm

**Status**: Accepted
**Date**: 2025-12-28

#### Context
知識グラフ内のコミュニティ（密結合クラスタ）を検出するアルゴリズムを選定する必要がある。

#### Decision
**Leiden Algorithm** を採用する。

#### Rationale
| 候補 | 評価 |
|------|------|
| Leiden | ✅ Louvainの改良版、品質保証、階層的検出対応 |
| Louvain | △ 古典的だが接続性の問題あり |
| Label Propagation | △ 高速だが不安定 |
| Girvan-Newman | △ 精度高いが計算コスト大 |

#### Consequences
- graphology-communities-leiden ライブラリを使用
- 解像度パラメータのチューニングが必要

---

### ADR-006: Embedding Model

**Status**: Accepted
**Date**: 2025-12-28

#### Context
エンティティの埋め込みベクトルを生成するモデルを選定する必要がある。

#### Decision
**OpenAI text-embedding-3-large** を採用する。

#### Rationale
| 候補 | 評価 |
|------|------|
| text-embedding-3-large | ✅ 3072次元、高精度、多言語対応 |
| text-embedding-3-small | △ 低コストだが精度劣る |
| BGE-M3 | △ オープンだが運用コスト |
| Cohere Embed | △ 高品質だがベンダーロックイン |

#### Consequences
- OpenAI API への依存
- APIコストの発生
- 将来的なローカルモデルへの移行パスを確保

---

## 3. データベーススキーマ設計

### 3.1 Neo4j Node Labels & Properties

```cypher
// ============================================
// Entity Node Labels
// ============================================

// AIModel Node
CREATE CONSTRAINT aimodel_id IF NOT EXISTS
FOR (n:AIModel) REQUIRE n.id IS UNIQUE;

(:AIModel {
  id: String,           // UUID v4
  name: String,         // Required, indexed
  version: String,
  releaseDate: Date,
  parameterCount: Integer,
  contextLength: Integer,
  trainingCutoff: Date,
  description: String,
  capabilities: [String],
  confidence: Float,    // 0.0-1.0
  sourceDocument: String,
  createdAt: DateTime,
  updatedAt: DateTime
})

// Organization Node
CREATE CONSTRAINT org_id IF NOT EXISTS
FOR (n:Organization) REQUIRE n.id IS UNIQUE;

(:Organization {
  id: String,
  name: String,         // Required, indexed, unique
  type: String,         // company|research_lab|university|nonprofit
  founded: Date,
  headquarters: String,
  website: String,
  confidence: Float,
  sourceDocument: String,
  createdAt: DateTime,
  updatedAt: DateTime
})

// Technique Node
CREATE CONSTRAINT technique_id IF NOT EXISTS
FOR (n:Technique) REQUIRE n.id IS UNIQUE;

(:Technique {
  id: String,
  name: String,
  category: String,     // architecture|training_method|inference_method
  description: String,
  introducedDate: Date,
  confidence: Float,
  sourceDocument: String,
  createdAt: DateTime,
  updatedAt: DateTime
})

// Publication Node
CREATE CONSTRAINT pub_id IF NOT EXISTS
FOR (n:Publication) REQUIRE n.id IS UNIQUE;

(:Publication {
  id: String,
  title: String,        // Required, indexed
  abstract: String,
  publishedDate: Date,
  venue: String,
  arxivId: String,
  doi: String,
  citations: Integer,
  confidence: Float,
  sourceDocument: String,
  createdAt: DateTime,
  updatedAt: DateTime
})

// Person Node
CREATE CONSTRAINT person_id IF NOT EXISTS
FOR (n:Person) REQUIRE n.id IS UNIQUE;

(:Person {
  id: String,
  name: String,
  role: String,         // researcher|engineer
  affiliation: String,
  confidence: Float,
  sourceDocument: String,
  createdAt: DateTime,
  updatedAt: DateTime
})

// Benchmark Node
CREATE CONSTRAINT benchmark_id IF NOT EXISTS
FOR (n:Benchmark) REQUIRE n.id IS UNIQUE;

(:Benchmark {
  id: String,
  name: String,
  description: String,
  domain: String,
  metrics: [String],
  confidence: Float,
  sourceDocument: String,
  createdAt: DateTime,
  updatedAt: DateTime
})

// Concept Node
CREATE CONSTRAINT concept_id IF NOT EXISTS
FOR (n:Concept) REQUIRE n.id IS UNIQUE;

(:Concept {
  id: String,
  name: String,
  category: String,     // capability|paradigm
  description: String,
  confidence: Float,
  sourceDocument: String,
  createdAt: DateTime,
  updatedAt: DateTime
})

// Community Node (for GraphRAG)
CREATE CONSTRAINT community_id IF NOT EXISTS
FOR (n:Community) REQUIRE n.id IS UNIQUE;

(:Community {
  id: String,
  level: Integer,       // Hierarchy level (0=top)
  title: String,
  summary: String,      // LLM-generated summary
  memberCount: Integer,
  modularity: Float,
  createdAt: DateTime,
  updatedAt: DateTime
})
```

### 3.2 Neo4j Relationship Types

```cypher
// ============================================
// Relationship Types
// ============================================

// Model relationships
(m1:AIModel)-[:DERIVED_FROM {
  confidence: Float,
  timestamp: DateTime,
  sourceDocument: String
}]->(m2:AIModel)

(m:AIModel)-[:DEVELOPED_BY {
  role: String,         // primary|contributor
  confidence: Float,
  timestamp: DateTime,
  sourceDocument: String
}]->(o:Organization)

(m:AIModel)-[:USES_TECHNIQUE {
  confidence: Float,
  timestamp: DateTime,
  sourceDocument: String
}]->(t:Technique)

(m:AIModel)-[:BENCHMARKED_ON {
  score: Float,
  metric: String,
  timestamp: DateTime,
  sourceDocument: String
}]->(b:Benchmark)

(m1:AIModel)-[:COMPETES_WITH {
  confidence: Float,
  timestamp: DateTime
}]->(m2:AIModel)

// Publication relationships
(p:Publication)-[:AUTHORED_BY {
  order: Integer,       // Author order
  corresponding: Boolean
}]->(person:Person)

(p:Publication)-[:PUBLISHED_BY]->(o:Organization)

(p:Publication)-[:INTRODUCES {
  confidence: Float
}]->(t:Technique)

(p1:Publication)-[:CITES]->(p2:Publication)

// Organization relationships
(o1:Organization)-[:COLLABORATES_WITH]->(o2:Organization)
(o:Organization)-[:EMPLOYS]->(p:Person)
(o1:Organization)-[:FUNDED_BY]->(o2:Organization)

// Technique relationships
(t:Technique)-[:INFLUENCES {
  confidence: Float,
  timestamp: DateTime
}]->(c:Concept)

// Time-based relationships
(e1)-[:PRECEDES]->(e2)
(e1)-[:SUCCEEDS]->(e2)

// Community relationships
(e)-[:BELONGS_TO {
  level: Integer
}]->(c:Community)

(c1:Community)-[:PARENT_OF]->(c2:Community)
```

### 3.3 Neo4j Indexes

```cypher
// Full-text search indexes
CREATE FULLTEXT INDEX entity_fulltext IF NOT EXISTS
FOR (n:AIModel|Organization|Technique|Publication|Person|Benchmark|Concept)
ON EACH [n.name, n.description];

// Property indexes for common queries
CREATE INDEX aimodel_name IF NOT EXISTS FOR (n:AIModel) ON (n.name);
CREATE INDEX aimodel_releaseDate IF NOT EXISTS FOR (n:AIModel) ON (n.releaseDate);
CREATE INDEX org_name IF NOT EXISTS FOR (n:Organization) ON (n.name);
CREATE INDEX pub_title IF NOT EXISTS FOR (n:Publication) ON (n.title);
CREATE INDEX pub_date IF NOT EXISTS FOR (n:Publication) ON (n.publishedDate);
CREATE INDEX technique_name IF NOT EXISTS FOR (n:Technique) ON (n.name);
CREATE INDEX community_level IF NOT EXISTS FOR (n:Community) ON (n.level);
```

### 3.4 Qdrant Collection Schema

```json
{
  "collection_name": "yagokoro_entities",
  "vectors": {
    "size": 3072,
    "distance": "Cosine"
  },
  "payload_schema": {
    "id": "keyword",
    "type": "keyword",
    "name": "text",
    "description": "text",
    "createdAt": "datetime",
    "updatedAt": "datetime"
  },
  "optimizers_config": {
    "indexing_threshold": 10000
  },
  "hnsw_config": {
    "m": 16,
    "ef_construct": 100,
    "full_scan_threshold": 10000
  }
}
```

---

## 4. API設計

### 4.1 MCP Tools Schema

```typescript
// ============================================
// MCP Tool Definitions
// ============================================

// Tool: query_knowledge_graph
{
  name: "query_knowledge_graph",
  description: "Execute a natural language query against the knowledge graph",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Natural language query"
      },
      mode: {
        type: "string",
        enum: ["local", "global", "hybrid"],
        default: "hybrid"
      },
      maxHops: {
        type: "integer",
        minimum: 1,
        maximum: 10,
        default: 3
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        default: 10
      }
    },
    required: ["query"]
  }
}

// Tool: get_entity
{
  name: "get_entity",
  description: "Get detailed information about a specific entity",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Entity UUID"
      },
      includeRelations: {
        type: "boolean",
        default: true
      },
      relationDepth: {
        type: "integer",
        minimum: 1,
        maximum: 3,
        default: 1
      }
    },
    required: ["id"]
  }
}

// Tool: get_relations
{
  name: "get_relations",
  description: "Get relations for an entity",
  inputSchema: {
    type: "object",
    properties: {
      entityId: {
        type: "string",
        description: "Source entity UUID"
      },
      relationType: {
        type: "string",
        description: "Filter by relation type"
      },
      direction: {
        type: "string",
        enum: ["outgoing", "incoming", "both"],
        default: "both"
      },
      limit: {
        type: "integer",
        default: 50
      }
    },
    required: ["entityId"]
  }
}

// Tool: get_path
{
  name: "get_path",
  description: "Find paths between two entities",
  inputSchema: {
    type: "object",
    properties: {
      fromId: {
        type: "string",
        description: "Source entity UUID"
      },
      toId: {
        type: "string",
        description: "Target entity UUID"
      },
      maxHops: {
        type: "integer",
        minimum: 1,
        maximum: 10,
        default: 5
      },
      algorithm: {
        type: "string",
        enum: ["shortest", "all", "weighted"],
        default: "shortest"
      }
    },
    required: ["fromId", "toId"]
  }
}

// Tool: get_community_summary
{
  name: "get_community_summary",
  description: "Get summary of a community cluster",
  inputSchema: {
    type: "object",
    properties: {
      communityId: {
        type: "string",
        description: "Community UUID"
      },
      level: {
        type: "integer",
        description: "Community hierarchy level",
        default: 0
      }
    },
    required: ["communityId"]
  }
}

// Tool: add_entity
{
  name: "add_entity",
  description: "Add a new entity to the knowledge graph",
  inputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["AIModel", "Organization", "Technique", "Publication", "Person", "Benchmark", "Concept"]
      },
      name: {
        type: "string"
      },
      properties: {
        type: "object",
        description: "Additional properties for the entity"
      }
    },
    required: ["type", "name"]
  }
}

// Tool: add_relation
{
  name: "add_relation",
  description: "Add a relation between entities",
  inputSchema: {
    type: "object",
    properties: {
      fromId: {
        type: "string"
      },
      toId: {
        type: "string"
      },
      relationType: {
        type: "string",
        enum: ["DERIVED_FROM", "DEVELOPED_BY", "USES_TECHNIQUE", "PUBLISHED_IN", "BENCHMARKED_ON", "COMPETES_WITH", "INFLUENCES", "PRECEDES", "SUCCEEDS", "AUTHORED_BY", "CITES"]
      },
      properties: {
        type: "object"
      }
    },
    required: ["fromId", "toId", "relationType"]
  }
}

// Tool: search_similar
{
  name: "search_similar",
  description: "Search for semantically similar entities",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query text"
      },
      entityType: {
        type: "string",
        description: "Filter by entity type"
      },
      limit: {
        type: "integer",
        default: 10
      },
      threshold: {
        type: "number",
        minimum: 0,
        maximum: 1,
        default: 0.7
      }
    },
    required: ["query"]
  }
}
```

### 4.2 MCP Resources Schema

```typescript
// ============================================
// MCP Resource Definitions
// ============================================

// Resource: genai://ontology/schema
{
  uri: "genai://ontology/schema",
  name: "Ontology Schema",
  description: "The ontology schema defining entity types and relations",
  mimeType: "application/json"
}

// Resource: genai://graph/statistics
{
  uri: "genai://graph/statistics",
  name: "Graph Statistics",
  description: "Statistics about the knowledge graph",
  mimeType: "application/json"
}

// Resource Template: genai://entities/{type}
{
  uriTemplate: "genai://entities/{type}",
  name: "Entity List",
  description: "List of entities by type",
  mimeType: "application/json"
}

// Resource Template: genai://timeline/{year}
{
  uriTemplate: "genai://timeline/{year}",
  name: "Timeline Data",
  description: "Timeline of events for a specific year",
  mimeType: "application/json"
}
```

### 4.3 Response Schemas

```typescript
// ============================================
// Response Types
// ============================================

interface QueryResponse {
  answer: string;
  confidence: number;
  citations: Citation[];
  reasoningPath?: ReasoningStep[];
  metadata: {
    queryTime: number;
    mode: "local" | "global" | "hybrid";
    entitiesFound: number;
  };
}

interface Citation {
  entityId: string;
  entityType: string;
  entityName: string;
  relevance: number;
  excerpt?: string;
}

interface ReasoningStep {
  step: number;
  fromEntity: string;
  relation: string;
  toEntity: string;
  confidence: number;
}

interface EntityResponse {
  id: string;
  type: string;
  name: string;
  properties: Record<string, unknown>;
  relations?: RelationResponse[];
  embedding?: number[];
  createdAt: string;
  updatedAt: string;
}

interface RelationResponse {
  id: string;
  type: string;
  source: { id: string; name: string; type: string };
  target: { id: string; name: string; type: string };
  properties: Record<string, unknown>;
}

interface PathResponse {
  paths: Path[];
  metadata: {
    shortestLength: number;
    totalPaths: number;
    searchTime: number;
  };
}

interface Path {
  nodes: { id: string; name: string; type: string }[];
  edges: { type: string; properties: Record<string, unknown> }[];
  totalConfidence: number;
}

interface CommunityResponse {
  id: string;
  level: number;
  title: string;
  summary: string;
  members: { id: string; name: string; type: string }[];
  bridgeNodes: string[];
  childCommunities?: string[];
  parentCommunity?: string;
}

interface ErrorResponse {
  code: string;          // e.g., "ERR-1001"
  message: string;
  details?: string;
  suggestions?: string[];
}

interface GraphStatistics {
  totalEntities: number;
  totalRelations: number;
  entitiesByType: Record<string, number>;
  relationsByType: Record<string, number>;
  communityCount: number;
  lastUpdated: string;
}
```

---

## 5. ディレクトリ構造

```
yagokoro/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── release.yml
│       └── test.yml
├── apps/
│   └── yagokoro/
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── lib/
│   ├── yagokoro-domain/
│   │   ├── src/
│   │   │   ├── entities/
│   │   │   │   ├── AIModel.ts
│   │   │   │   ├── Organization.ts
│   │   │   │   ├── Technique.ts
│   │   │   │   ├── Publication.ts
│   │   │   │   ├── Person.ts
│   │   │   │   ├── Benchmark.ts
│   │   │   │   ├── Concept.ts
│   │   │   │   └── index.ts
│   │   │   ├── relations/
│   │   │   │   ├── RelationType.ts
│   │   │   │   └── index.ts
│   │   │   ├── ports/
│   │   │   │   ├── EntityRepository.ts
│   │   │   │   ├── RelationRepository.ts
│   │   │   │   ├── VectorStore.ts
│   │   │   │   ├── LLMClient.ts
│   │   │   │   └── index.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── EntityId.ts
│   │   │   │   ├── Confidence.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── yagokoro-graphrag/
│   │   ├── src/
│   │   │   ├── extraction/
│   │   │   │   ├── EntityExtractor.ts
│   │   │   │   ├── RelationExtractor.ts
│   │   │   │   ├── LLMExtractionEngine.ts
│   │   │   │   └── index.ts
│   │   │   ├── query/
│   │   │   │   ├── LocalQueryEngine.ts
│   │   │   │   ├── GlobalQueryEngine.ts
│   │   │   │   ├── ResponseGenerator.ts
│   │   │   │   └── index.ts
│   │   │   ├── reasoning/
│   │   │   │   ├── MultiHopReasoner.ts
│   │   │   │   ├── CommunityDetector.ts
│   │   │   │   ├── HybridSearchEngine.ts
│   │   │   │   └── index.ts
│   │   │   ├── llm/
│   │   │   │   ├── OpenAIClient.ts
│   │   │   │   ├── prompts/
│   │   │   │   │   ├── extraction.ts
│   │   │   │   │   ├── summarization.ts
│   │   │   │   │   └── query.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── yagokoro-neo4j/
│   │   ├── src/
│   │   │   ├── repositories/
│   │   │   │   ├── Neo4jEntityRepository.ts
│   │   │   │   ├── Neo4jRelationRepository.ts
│   │   │   │   ├── Neo4jCommunityRepository.ts
│   │   │   │   └── index.ts
│   │   │   ├── queries/
│   │   │   │   ├── entity.cypher.ts
│   │   │   │   ├── relation.cypher.ts
│   │   │   │   └── path.cypher.ts
│   │   │   ├── Neo4jConnection.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── yagokoro-vector/
│   │   ├── src/
│   │   │   ├── QdrantVectorStore.ts
│   │   │   ├── EmbeddingService.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── yagokoro-mcp/
│   │   ├── src/
│   │   │   ├── server/
│   │   │   │   ├── MCPServer.ts
│   │   │   │   └── index.ts
│   │   │   ├── tools/
│   │   │   │   ├── queryKnowledgeGraph.ts
│   │   │   │   ├── getEntity.ts
│   │   │   │   ├── getRelations.ts
│   │   │   │   ├── getPath.ts
│   │   │   │   ├── getCommunity.ts
│   │   │   │   ├── addEntity.ts
│   │   │   │   ├── addRelation.ts
│   │   │   │   ├── searchSimilar.ts
│   │   │   │   └── index.ts
│   │   │   ├── resources/
│   │   │   │   ├── ontologySchema.ts
│   │   │   │   ├── graphStatistics.ts
│   │   │   │   ├── entityList.ts
│   │   │   │   ├── timeline.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── yagokoro-cli/
│       ├── src/
│       │   ├── commands/
│       │   │   ├── graph/
│       │   │   │   ├── init.ts
│       │   │   │   ├── ingest.ts
│       │   │   │   ├── query.ts
│       │   │   │   ├── export.ts
│       │   │   │   ├── import.ts
│       │   │   │   ├── stats.ts
│       │   │   │   ├── validate.ts
│       │   │   │   └── index.ts
│       │   │   ├── entity/
│       │   │   │   ├── list.ts
│       │   │   │   ├── get.ts
│       │   │   │   ├── add.ts
│       │   │   │   ├── delete.ts
│       │   │   │   └── index.ts
│       │   │   ├── relation/
│       │   │   │   ├── add.ts
│       │   │   │   ├── list.ts
│       │   │   │   ├── delete.ts
│       │   │   │   └── index.ts
│       │   │   ├── community/
│       │   │   │   ├── detect.ts
│       │   │   │   ├── list.ts
│       │   │   │   ├── summarize.ts
│       │   │   │   └── index.ts
│       │   │   ├── mcp/
│       │   │   │   ├── serve.ts
│       │   │   │   ├── status.ts
│       │   │   │   ├── stop.ts
│       │   │   │   ├── tools.ts
│       │   │   │   ├── resources.ts
│       │   │   │   └── index.ts
│       │   │   └── index.ts
│       │   ├── utils/
│       │   │   ├── output.ts
│       │   │   ├── progress.ts
│       │   │   └── config.ts
│       │   ├── cli.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── test/
│   ├── fixtures/
│   │   ├── entities/
│   │   ├── relations/
│   │   ├── documents/
│   │   └── graphs/
│   ├── mocks/
│   │   ├── neo4j/
│   │   ├── qdrant/
│   │   └── openai/
│   └── e2e/
│       ├── cli.test.ts
│       └── mcp.test.ts
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   └── neo4j/
│       └── neo4j.conf
├── docs/
│   ├── api/
│   ├── architecture/
│   └── guides/
├── .env.example
├── .gitignore
├── biome.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── turbo.json
└── README.md
```

---

## 6. Phase -1 Gate 承認記録

### 6.1 Article VII: Simplicity Gate

**申請内容**: 初期構成で7パッケージ（6ライブラリ + 1アプリ）を採用

**正当化理由**:

1. **関心の分離**: GraphRAGシステムは以下の独立した責務を持つ
   - ドメインモデル（yagokoro-domain）
   - GraphRAGロジック（yagokoro-graphrag）
   - グラフDB永続化（yagokoro-neo4j）
   - ベクトル検索（yagokoro-vector）
   - MCPプロトコル（yagokoro-mcp）
   - CLIインターフェース（yagokoro-cli）

2. **独立テスト可能性**: 各ライブラリは独立してユニットテスト可能

3. **段階的デプロイ**: CLI/MCPは個別にリリース可能

4. **将来の拡張性**: AGI Phase 2以降で追加コンポーネントが予定

**承認**:

| 役割 | 承認 | 日付 |
|------|------|------|
| system-architect | ✅ Approved | 2025-12-28 |
| project-manager | ✅ Approved | 2025-12-28 |

**条件**: Phase 1完了時にライブラリ統合の再評価を実施

---

## 7. 設計トレーサビリティマトリクス

| 要件ID | 設計コンポーネント | 設計決定 |
|--------|-------------------|----------|
| REQ-001-KG-001 | EntityExtractor, LLMExtractionEngine | ADR-006 |
| REQ-001-KG-002 | RelationExtractor, LLMExtractionEngine | ADR-006 |
| REQ-001-KG-003 | Entity models, Neo4j schema | ADR-001 |
| REQ-001-KG-004 | EntityExtractor, DocumentParser | - |
| REQ-001-GR-001 | MultiHopReasoner, Neo4j path queries | ADR-001, ADR-005 |
| REQ-001-GR-002 | CommunityDetector | ADR-005 |
| REQ-001-GR-003 | GlobalQueryEngine, ResponseGenerator | - |
| REQ-001-GR-004 | LocalQueryEngine, ResponseGenerator | - |
| REQ-001-GR-005 | HybridSearchEngine | ADR-002 |
| REQ-001-MCP-001 | MCPServer | ADR-003 |
| REQ-001-MCP-002 | tools/* | ADR-003 |
| REQ-001-MCP-003 | resources/* | ADR-003 |
| REQ-001-CLI-001 | commands/* | ADR-004 |
| REQ-001-CLI-002 | commands/mcp/* | ADR-003, ADR-004 |
| REQ-001-DATA-001 | yagokoro-neo4j | ADR-001 |
| REQ-001-DATA-002 | yagokoro-vector | ADR-002 |
| REQ-001-DATA-003 | Backup scripts (TBD) | - |
| REQ-001-SYS-001 | MCPServer health endpoint | - |
| REQ-001-SYS-002 | Logger middleware | - |
| REQ-001-SYS-003 | Metrics middleware | - |
| REQ-001-ERR-001 | ErrorResponse, error handling | - |
| REQ-001-ERR-002 | graph validate command | - |
| REQ-001-SEC-001 | Auth middleware | - |
| REQ-001-SEC-002 | RBAC middleware | - |

---

## 8. テスト戦略

### 8.1 テストレベル

| レベル | 対象 | ツール | 実行環境 |
|--------|------|--------|----------|
| Unit | 各ライブラリの関数・クラス | Vitest | Node.js |
| Integration | ライブラリ間連携 | Vitest + Testcontainers | Docker |
| E2E | CLI/MCP全体フロー | Vitest + Playwright | Docker Compose |

### 8.2 Docker Compose 構成

```yaml
# docker/docker-compose.yml
version: '3.8'

services:
  neo4j:
    image: neo4j:5.15-community
    ports:
      - "7474:7474"  # Browser
      - "7687:7687"  # Bolt
    environment:
      - NEO4J_AUTH=neo4j/testpassword
      - NEO4J_PLUGINS=["apoc"]
    volumes:
      - neo4j_data:/data
      - ./neo4j/neo4j.conf:/conf/neo4j.conf
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7474"]
      interval: 10s
      timeout: 5s
      retries: 5

  qdrant:
    image: qdrant/qdrant:v1.7.4
    ports:
      - "6333:6333"  # REST API
      - "6334:6334"  # gRPC
    volumes:
      - qdrant_data:/qdrant/storage
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  neo4j_data:
  qdrant_data:
```

```yaml
# docker/docker-compose.dev.yml
version: '3.8'

services:
  neo4j:
    extends:
      file: docker-compose.yml
      service: neo4j
    ports:
      - "7474:7474"
      - "7687:7687"

  qdrant:
    extends:
      file: docker-compose.yml
      service: qdrant
    ports:
      - "6333:6333"
```

### 8.3 Testcontainers 設定

```typescript
// test/setup/containers.ts
import { GenericContainer, StartedTestContainer } from 'testcontainers';

export async function startNeo4jContainer(): Promise<StartedTestContainer> {
  return new GenericContainer('neo4j:5.15-community')
    .withEnvironment({
      NEO4J_AUTH: 'neo4j/testpassword',
    })
    .withExposedPorts(7687)
    .withWaitStrategy(Wait.forHealthCheck())
    .start();
}

export async function startQdrantContainer(): Promise<StartedTestContainer> {
  return new GenericContainer('qdrant/qdrant:v1.7.4')
    .withExposedPorts(6333)
    .withWaitStrategy(Wait.forHealthCheck())
    .start();
}
```

### 8.4 Integration-First Testing (Article IX 準拠)

| テスト対象 | 方式 | Mock許可 |
|-----------|------|----------|
| Neo4j | Testcontainers | ❌ 不可 |
| Qdrant | Testcontainers | ❌ 不可 |
| OpenAI API | Mock | ✅ 許可（コスト・レート制限） |
| MCP Protocol | 実サーバー | ❌ 不可 |

**OpenAI Mock 正当化**:
- API コスト: テスト実行ごとに課金発生
- レート制限: CI/CD で並列実行時に制限超過リスク
- 代替: 録画済みレスポンスによるリプレイテスト

---

## 9. 環境変数一覧

```bash
# .env.example

# ===========================================
# Neo4j Configuration
# ===========================================
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password-here

# ===========================================
# Qdrant Configuration
# ===========================================
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=           # Optional for local
QDRANT_COLLECTION=yagokoro_entities

# ===========================================
# OpenAI Configuration
# ===========================================
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
OPENAI_CHAT_MODEL=gpt-4o

# ===========================================
# MCP Server Configuration
# ===========================================
MCP_SERVER_NAME=yagokoro-graphrag
MCP_SERVER_VERSION=1.0.0
MCP_TRANSPORT=stdio        # stdio | http
MCP_HTTP_PORT=3000         # Only for http transport

# ===========================================
# Logging Configuration
# ===========================================
LOG_LEVEL=info             # debug | info | warn | error
LOG_FORMAT=json            # json | pretty

# ===========================================
# Feature Flags
# ===========================================
ENABLE_METRICS=true
ENABLE_HEALTH_CHECK=true
```

---

## 10. エラーコード体系

### 10.1 エラーコード形式

```
ERR-{Category}-{Number}
```

| Category | 範囲 | 説明 |
|----------|------|------|
| KG | 1000-1999 | Knowledge Graph 操作エラー |
| GR | 2000-2999 | GraphRAG 推論エラー |
| MCP | 3000-3999 | MCP プロトコルエラー |
| DATA | 4000-4999 | データベース接続・操作エラー |
| AUTH | 5000-5999 | 認証・認可エラー |
| SYS | 9000-9999 | システムエラー |

### 10.2 エラーコード一覧

| コード | 名前 | 説明 | HTTP Status |
|--------|------|------|-------------|
| ERR-KG-1001 | ENTITY_NOT_FOUND | エンティティが見つからない | 404 |
| ERR-KG-1002 | ENTITY_ALREADY_EXISTS | エンティティが既に存在する | 409 |
| ERR-KG-1003 | INVALID_ENTITY_TYPE | 無効なエンティティタイプ | 400 |
| ERR-KG-1004 | RELATION_NOT_FOUND | リレーションが見つからない | 404 |
| ERR-KG-1005 | INVALID_RELATION_TYPE | 無効なリレーションタイプ | 400 |
| ERR-KG-1006 | EXTRACTION_FAILED | エンティティ抽出失敗 | 500 |
| ERR-GR-2001 | PATH_NOT_FOUND | パスが見つからない | 404 |
| ERR-GR-2002 | MAX_HOPS_EXCEEDED | 最大ホップ数超過 | 400 |
| ERR-GR-2003 | COMMUNITY_NOT_FOUND | コミュニティが見つからない | 404 |
| ERR-GR-2004 | REASONING_TIMEOUT | 推論タイムアウト | 504 |
| ERR-GR-2005 | EMBEDDING_FAILED | 埋め込み生成失敗 | 500 |
| ERR-MCP-3001 | INVALID_TOOL_NAME | 無効なツール名 | 400 |
| ERR-MCP-3002 | INVALID_TOOL_PARAMS | 無効なツールパラメータ | 400 |
| ERR-MCP-3003 | RESOURCE_NOT_FOUND | リソースが見つからない | 404 |
| ERR-MCP-3004 | PROTOCOL_ERROR | MCPプロトコルエラー | 500 |
| ERR-DATA-4001 | NEO4J_CONNECTION_FAILED | Neo4j接続失敗 | 503 |
| ERR-DATA-4002 | NEO4J_QUERY_FAILED | Neo4jクエリ失敗 | 500 |
| ERR-DATA-4003 | QDRANT_CONNECTION_FAILED | Qdrant接続失敗 | 503 |
| ERR-DATA-4004 | QDRANT_QUERY_FAILED | Qdrantクエリ失敗 | 500 |
| ERR-AUTH-5001 | UNAUTHORIZED | 認証エラー | 401 |
| ERR-AUTH-5002 | FORBIDDEN | アクセス拒否 | 403 |
| ERR-AUTH-5003 | TOKEN_EXPIRED | トークン期限切れ | 401 |
| ERR-SYS-9001 | INTERNAL_ERROR | 内部エラー | 500 |
| ERR-SYS-9002 | SERVICE_UNAVAILABLE | サービス利用不可 | 503 |
| ERR-SYS-9003 | RATE_LIMIT_EXCEEDED | レート制限超過 | 429 |

### 10.3 エラーレスポンス形式

```typescript
interface ErrorResponse {
  code: string;           // e.g., "ERR-KG-1001"
  message: string;        // Human-readable message
  details?: string;       // Technical details
  suggestions?: string[]; // Recovery suggestions
  timestamp: string;      // ISO 8601 format
  requestId?: string;     // For debugging
}

// Example
{
  "code": "ERR-KG-1001",
  "message": "Entity not found",
  "details": "Entity with ID 'abc-123' does not exist in the knowledge graph",
  "suggestions": [
    "Verify the entity ID is correct",
    "Use search_similar to find related entities"
  ],
  "timestamp": "2025-12-28T10:30:00Z",
  "requestId": "req-xyz-789"
}
```

---

## 11. 改訂履歴

| バージョン | 日付 | 変更内容 | 著者 |
|-----------|------|----------|------|
| 1.0 | 2025-12-28 | 初版作成 | YAGOKORO Team |
| 1.1 | 2025-12-28 | Phase -1 Gate承認、テスト戦略、環境変数、エラーコード追加 | YAGOKORO Team |

---

## 12. 承認

| 役割 | 氏名 | 日付 | 署名 |
|------|------|------|------|
| アーキテクト | | | |
| テックリード | | | |
