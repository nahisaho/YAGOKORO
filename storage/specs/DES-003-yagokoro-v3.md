# DES-003: YAGOKORO v3.0.0 設計ドキュメント

| メタデータ | 値 |
|-----------|-----|
| Document ID | DES-003 |
| Version | 1.1 |
| Status | Review Complete |
| Created | 2025-12-31 |
| Author | GitHub Copilot |
| Requirements | REQ-003-yagokoro-v3 |
| Previous Design | DES-002-yagokoro-v2 |

---

## 1. 概要

### 1.1 目的

本ドキュメントは、YAGOKORO v3.0.0の設計仕様を定義します。REQ-003で定義された6つの機能要件に対する技術的な実現方法を記述します。

### 1.2 スコープ

| 機能ID | 機能名 | 新規パッケージ |
|--------|--------|---------------|
| F-001 | 自動関係抽出 | `@yagokoro/extractor` |
| F-002 | 論文自動取り込み | `@yagokoro/ingestion` |
| F-003 | MCPツール拡張 | `@yagokoro/mcp` (拡張) |
| F-004 | HITL検証 | `@yagokoro/hitl` |
| F-005 | 差分更新 | `@yagokoro/pipeline` |
| F-006 | クエリキャッシュ | `@yagokoro/cache` |

### 1.3 設計原則

| 原則 | 説明 | 適用 |
|------|------|------|
| **Single Responsibility** | 各パッケージは1つの責務のみ | 新規5パッケージ分離 |
| **Dependency Inversion** | 抽象に依存、具象に依存しない | インターフェース定義 |
| **Open/Closed** | 拡張に開き、変更に閉じる | 関係タイプ拡張性 |
| **Fail Fast** | 早期にエラーを検出 | バリデーション層 |
| **Graceful Degradation** | 障害時も縮退運用 | Circuit Breaker |

### 1.4 v2からの変更点

```
v2.0.0                              v3.0.0
┌─────────────────────┐            ┌─────────────────────┐
│ @yagokoro/mcp       │     →      │ @yagokoro/mcp       │ (拡張: 6→15ツール)
│ @yagokoro/normalizer│     →      │ @yagokoro/normalizer│ (拡張: LLM確認)
│ @yagokoro/neo4j     │     →      │ @yagokoro/neo4j     │ (拡張: 差分更新)
└─────────────────────┘            ├─────────────────────┤
                                   │ @yagokoro/extractor │ (NEW)
                                   │ @yagokoro/ingestion │ (NEW)
                                   │ @yagokoro/hitl      │ (NEW)
                                   │ @yagokoro/pipeline  │ (NEW)
                                   │ @yagokoro/cache     │ (NEW)
                                   └─────────────────────┘
```

---

## 2. C4アーキテクチャ

### 2.1 Context図（レベル1）

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           External Systems                               │
└─────────────────────────────────────────────────────────────────────────┘
        │                    │                    │                    │
        ▼                    ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   arXiv API  │    │  Semantic    │    │   Ollama/    │    │    Neo4j     │
│              │    │  Scholar API │    │   OpenAI     │    │   Database   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
        │                    │                    │                    │
        └────────────────────┼────────────────────┼────────────────────┘
                             │                    │
                             ▼                    ▼
                    ┌─────────────────────────────────────┐
                    │                                     │
                    │         YAGOKORO v3.0.0             │
                    │                                     │
                    │   GraphRAG + Ontology System        │
                    │   for AI Research Knowledge         │
                    │                                     │
                    └─────────────────────────────────────┘
                             │                    │
                             ▼                    ▼
                    ┌──────────────┐    ┌──────────────┐
                    │  AI研究者    │    │  MCP Client  │
                    │  (CLI/Web)   │    │  (Claude等)  │
                    └──────────────┘    └──────────────┘
```

### 2.2 Container図（レベル2）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              YAGOKORO v3.0.0                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Interface Layer                               │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │   │
│  │  │  @yagokoro/mcp  │  │  @yagokoro/cli  │  │ @yagokoro/hitl  │      │   │
│  │  │   (15 tools)    │  │    (commands)   │  │   (Web UI)      │      │   │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘      │   │
│  └───────────┼────────────────────┼────────────────────┼───────────────┘   │
│              │                    │                    │                    │
│  ┌───────────┼────────────────────┼────────────────────┼───────────────┐   │
│  │           ▼                    ▼                    ▼               │   │
│  │                         Feature Layer                               │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │   │
│  │  │ @yagokoro/      │  │ @yagokoro/      │  │ @yagokoro/      │      │   │
│  │  │  extractor      │  │  ingestion      │  │  pipeline       │      │   │
│  │  │  (共起分析)     │  │  (論文取込)     │  │  (差分更新)     │      │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘      │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │   │
│  │  │ @yagokoro/      │  │ @yagokoro/      │  │ @yagokoro/      │      │   │
│  │  │  normalizer     │  │  nlq            │  │  reasoner       │      │   │
│  │  │  (v2+LLM確認)   │  │  (NLQ→Cypher)   │  │  (マルチホップ) │      │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘      │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                          │   │
│  │  │ @yagokoro/      │  │ @yagokoro/      │                          │   │
│  │  │  analyzer       │  │  hallucination  │                          │   │
│  │  │  (Gap/Lifecycle)│  │  (検証)         │                          │   │
│  │  └─────────────────┘  └─────────────────┘                          │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│              │                    │                    │                    │
│  ┌───────────┼────────────────────┼────────────────────┼───────────────┐   │
│  │           ▼                    ▼                    ▼               │   │
│  │                          Core Layer                                 │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │   │
│  │  │ @yagokoro/      │  │ @yagokoro/      │  │ @yagokoro/      │      │   │
│  │  │  domain         │  │  neo4j          │  │  vector         │      │   │
│  │  │  (エンティティ) │  │  (グラフDB)     │  │  (ベクトルDB)   │      │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘      │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                          │   │
│  │  │ @yagokoro/      │  │ @yagokoro/      │                          │   │
│  │  │  graphrag       │  │  cache          │                          │   │
│  │  │  (LazyGraphRAG) │  │  (クエリ)       │                          │   │
│  │  └─────────────────┘  └─────────────────┘                          │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Component図（レベル3）

#### 2.3.1 @yagokoro/extractor

```
┌─────────────────────────────────────────────────────────────────────┐
│                        @yagokoro/extractor                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │ CooccurrenceAnaly│    │  PatternMatcher  │    │ RelationScorer│  │
│  │ zer              │    │                  │    │               │  │
│  │                  │    │                  │    │               │  │
│  │ • 同一文書内共起 │ →  │ • 動詞パターン   │ →  │ • 信頼度計算  │  │
│  │ • 同一段落内共起 │    │ • 依存構造解析   │    │ • 閾値判定    │  │
│  │ • 同一文内共起   │    │ • テンプレート   │    │ • ランキング  │  │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘
│           │                      │                      │           │
│           ▼                      ▼                      ▼           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    RelationExtractorService                  │   │
│  │                                                              │   │
│  │  extract(document: Document): Promise<Relation[]>            │   │
│  │  extractBatch(docs: Document[]): Promise<Relation[]>         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 2.3.2 @yagokoro/ingestion

```
┌─────────────────────────────────────────────────────────────────────┐
│                        @yagokoro/ingestion                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │   ArxivClient    │    │ SemanticScholar  │    │  Deduplicator │  │
│  │                  │    │     Client       │    │               │  │
│  │ • OAI-PMH API    │    │ • REST API       │    │ • DOI照合     │  │
│  │ • 3秒間隔制限    │    │ • 100req/5min    │    │ • タイトル類似│  │
│  │ • メタデータ取得 │    │ • 引用情報取得   │    │ • 著者マッチ  │  │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘
│           │                      │                      │           │
│           ▼                      ▼                      ▼           │
│  ┌──────────────────┐    ┌──────────────────┐                      │
│  │   RateLimiter    │    │  ScheduleRunner  │                      │
│  │                  │    │                  │                      │
│  │ • Token Bucket   │    │ • Cron式対応     │                      │
│  │ • Circuit Breaker│    │ • 失敗リトライ   │                      │
│  └──────────────────┘    └──────────────────┘                      │
│           │                      │                                  │
│           ▼                      ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    IngestionService                          │   │
│  │                                                              │   │
│  │  ingestFromArxiv(query: string): Promise<Paper[]>            │   │
│  │  scheduleIngestion(cron: string): void                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 2.3.3 @yagokoro/hitl

```
┌─────────────────────────────────────────────────────────────────────┐
│                          @yagokoro/hitl                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │   ReviewQueue    │    │  ReviewService   │    │ BatchApprover │  │
│  │                  │    │                  │    │               │  │
│  │ • 優先度キュー   │ →  │ • 承認/却下API   │ →  │ • 一括承認    │  │
│  │ • ステータス管理 │    │ • 修正提案       │    │ • フィルター  │  │
│  │ • 期限管理       │    │ • 履歴記録       │    │ • 閾値承認    │  │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘
│           │                      │                      │           │
│           ▼                      ▼                      ▼           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                        HITLService                           │   │
│  │                                                              │   │
│  │  submitForReview(item: ReviewItem): Promise<string>          │   │
│  │  approve(id: string): Promise<void>                          │   │
│  │  reject(id: string, reason: string): Promise<void>           │   │
│  │  getPendingReviews(): Promise<ReviewItem[]>                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 2.3.4 @yagokoro/pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                        @yagokoro/pipeline                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │  ChangeDetector  │    │  DiffCalculator  │    │ BatchProcessor│  │
│  │                  │    │                  │    │               │  │
│  │ • ハッシュ比較   │ →  │ • 追加/更新/削除 │ →  │ • チャンク分割│  │
│  │ • 更新日時比較   │    │ • 差分セット生成 │    │ • 並列処理    │  │
│  │ • バージョン管理 │    │ • 影響範囲特定   │    │ • トランザクション│
│  └──────────────────┘    └──────────────────┘    └──────────────────┘
│           │                      │                      │           │
│           ▼                      ▼                      ▼           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    PipelineService                           │   │
│  │                                                              │   │
│  │  detectChanges(since: Date): Promise<ChangeSet>              │   │
│  │  applyChanges(changes: ChangeSet): Promise<PipelineResult>   │   │
│  │  rollback(transactionId: string): Promise<void>              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 2.3.5 @yagokoro/cache

```
┌─────────────────────────────────────────────────────────────────────┐
│                         @yagokoro/cache                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │   CacheStore     │    │ InvalidationMgr  │    │  CacheStats   │  │
│  │                  │    │                  │    │               │  │
│  │ • LRU eviction   │    │ • グラフ変更検知 │    │ • ヒット率    │  │
│  │ • TTL管理        │    │ • 依存グラフ     │    │ • メモリ使用量│  │
│  │ • メモリ/ディスク│    │ • 選択的無効化   │    │ • レイテンシ  │  │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘
│           │                      │                      │           │
│           ▼                      ▼                      ▼           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      CacheService                            │   │
│  │                                                              │   │
│  │  get<T>(key: string): Promise<T | null>                      │   │
│  │  set<T>(key: string, value: T, ttl?: number): Promise<void>  │   │
│  │  invalidate(pattern: string): Promise<number>                │   │
│  │  getStats(): CacheStatistics                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. データモデル設計

### 3.1 エンティティモデル（拡張）

```typescript
// @yagokoro/domain - 拡張エンティティ

/** 論文エンティティ（v3新規） */
interface Paper {
  id: string;                    // DOI or arXiv ID
  title: string;
  authors: Author[];
  abstract: string;
  publishedDate: Date;
  source: 'arxiv' | 'semantic_scholar' | 'manual';
  categories: string[];          // cs.AI, cs.CL, etc.
  citationCount?: number;
  references?: string[];         // 引用論文ID
  
  // v3新規フィールド
  ingestionDate: Date;           // 取り込み日時
  lastUpdated: Date;             // 最終更新日時
  contentHash: string;           // 変更検知用ハッシュ
  processingStatus: ProcessingStatus;
}

/** 関係エンティティ（v3拡張） */
interface Relation {
  id: string;
  sourceId: string;              // エンティティID
  targetId: string;              // エンティティID
  type: RelationType;
  
  // v3新規フィールド
  confidence: number;            // 0.0-1.0 信頼度スコア
  extractionMethod: 'rule' | 'cooccurrence' | 'llm' | 'manual';
  evidence: Evidence[];          // 根拠となるソース
  reviewStatus: ReviewStatus;    // HITL状態
  reviewedBy?: string;           // レビュー者
  reviewedAt?: Date;             // レビュー日時
}

/** 関係タイプ（v3拡張） */
type RelationType = 
  // v2既存
  | 'USES_TECHNIQUE'
  | 'DERIVED_FROM'
  | 'DEVELOPED_BY'
  | 'APPLIED_TO'
  | 'COMPARES_WITH'
  // v3新規
  | 'CITES'                      // 引用関係
  | 'EXTENDS'                    // 拡張関係
  | 'IMPROVES'                   // 改善関係
  | 'COMBINES'                   // 統合関係
  | 'CONTRADICTS';               // 矛盾関係

/** レビューステータス */
type ReviewStatus = 
  | 'pending'                    // レビュー待ち
  | 'approved'                   // 承認済み
  | 'rejected'                   // 却下
  | 'auto_approved';             // 高信頼度で自動承認

/** 処理ステータス */
type ProcessingStatus = 
  | 'ingested'                   // 取り込み完了
  | 'extracting'                 // 関係抽出中
  | 'extracted'                  // 抽出完了
  | 'reviewing'                  // HITL中
  | 'completed'                  // 処理完了
  | 'failed';                    // 処理失敗
```

### 3.2 Neo4jスキーマ（拡張）

```cypher
// ノードラベル（v3拡張）
(:Paper {
  id: STRING,
  title: STRING,
  abstract: STRING,
  publishedDate: DATE,
  source: STRING,
  ingestionDate: DATETIME,
  lastUpdated: DATETIME,
  contentHash: STRING,
  processingStatus: STRING
})

(:Entity {
  id: STRING,
  name: STRING,
  normalizedName: STRING,
  type: STRING,
  aliases: STRING[],
  confidence: FLOAT
})

(:ReviewItem {
  id: STRING,
  itemType: STRING,
  status: STRING,
  priority: INTEGER,
  createdAt: DATETIME,
  reviewedAt: DATETIME,
  reviewedBy: STRING,
  reason: STRING
})

// 関係タイプ（v3拡張）
[:MENTIONS {
  paperId: STRING,
  position: INTEGER,
  context: STRING
}]

[:RELATES_TO {
  type: STRING,
  confidence: FLOAT,
  extractionMethod: STRING,
  reviewStatus: STRING,
  evidence: STRING[]
}]

[:CITES {
  context: STRING,
  citationType: STRING
}]

// インデックス（v3新規）
CREATE INDEX paper_source_idx FOR (p:Paper) ON (p.source);
CREATE INDEX paper_status_idx FOR (p:Paper) ON (p.processingStatus);
CREATE INDEX entity_normalized_idx FOR (e:Entity) ON (e.normalizedName);
CREATE INDEX review_status_idx FOR (r:ReviewItem) ON (r.status);
CREATE INDEX relation_confidence_idx FOR ()-[r:RELATES_TO]-() ON (r.confidence);
```

### 3.3 キャッシュデータモデル

```typescript
// @yagokoro/cache

/** キャッシュエントリ */
interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;             // Unix timestamp
  expiresAt: number;             // TTL期限
  accessCount: number;           // LRU用アクセス回数
  lastAccessedAt: number;        // 最終アクセス時刻
  dependencies: string[];        // 依存キー（無効化用）
  size: number;                  // メモリサイズ(bytes)
}

/** キャッシュキー設計 */
type CacheKeyPattern = 
  | `query:${string}`            // クエリ結果
  | `entity:${string}`           // エンティティ詳細
  | `path:${string}:${string}`   // パス探索結果
  | `stats:${string}`;           // 統計情報

/** キャッシュ設定 */
interface CacheConfig {
  maxMemoryMB: number;           // 最大メモリ使用量
  defaultTTLSeconds: number;     // デフォルトTTL
  evictionPolicy: 'lru' | 'lfu'; // エビクションポリシー
  persistToDisk: boolean;        // ディスク永続化
}
```

---

## 4. API設計

### 4.1 MCPツール拡張（6→15ツール）

#### v2既存ツール（6）

| ツール名 | 説明 |
|---------|------|
| `search_entities` | エンティティ検索 |
| `get_relations` | 関係取得 |
| `query_graph` | グラフクエリ |
| `add_entity` | エンティティ追加 |
| `add_relation` | 関係追加 |
| `get_stats` | 統計情報取得 |

#### v3新規ツール（9）

```typescript
// @yagokoro/mcp - v3新規ツール

/** NLQツール */
interface NLQTools {
  /** 自然言語でクエリ */
  nlq_query: {
    input: { question: string; language?: 'ja' | 'en' };
    output: { cypher: string; results: any[]; explanation: string };
  };
  
  /** クエリ履歴取得 */
  nlq_history: {
    input: { limit?: number };
    output: { queries: QueryHistoryItem[] };
  };
}

/** 推論ツール */
interface ReasoningTools {
  /** マルチホップパス探索 */
  find_paths: {
    input: { 
      source: string; 
      target: string; 
      maxHops?: number;
      relationTypes?: string[];
    };
    output: { 
      paths: Path[]; 
      explanation: string;
      confidence: number;
    };
  };
  
  /** 関係推論 */
  infer_relations: {
    input: { entityId: string; depth?: number };
    output: { inferred: InferredRelation[] };
  };
}

/** 分析ツール */
interface AnalysisTools {
  /** 研究ギャップ分析 */
  analyze_gaps: {
    input: { categories?: string[]; threshold?: number };
    output: { gaps: GapResult[]; recommendations: string[] };
  };
  
  /** ライフサイクル分析 */
  analyze_lifecycle: {
    input: { entities?: string[] };
    output: { stages: LifecycleResult[] };
  };
}

/** 検証ツール */
interface VerificationTools {
  /** ハルシネーション検出 */
  verify_statement: {
    input: { statement: string };
    output: { 
      isValid: boolean; 
      confidence: number;
      evidence: Evidence[];
      contradictions?: Contradiction[];
    };
  };
  
  /** エンティティ検証 */
  verify_entity: {
    input: { name: string; type?: string };
    output: { 
      exists: boolean;
      normalizedName?: string;
      suggestions?: string[];
    };
  };
}

/** 正規化ツール */
interface NormalizationTools {
  /** エンティティ正規化 */
  normalize_entity: {
    input: { name: string; autoApprove?: boolean };
    output: { 
      original: string;
      normalized: string;
      confidence: number;
      aliases: string[];
      requiresReview: boolean;
    };
  };
}
```

### 4.2 内部API設計

#### 4.2.1 Extractorパッケージ

```typescript
// @yagokoro/extractor

export interface IRelationExtractor {
  /** 文書から関係を抽出 */
  extract(document: Document): Promise<ExtractedRelation[]>;
  
  /** バッチ抽出 */
  extractBatch(documents: Document[]): Promise<ExtractedRelation[]>;
  
  /** 共起分析実行 */
  analyzeCooccurrence(
    entities: Entity[],
    options?: CooccurrenceOptions
  ): Promise<CooccurrenceResult[]>;
}

export interface CooccurrenceOptions {
  windowSize: 'document' | 'paragraph' | 'sentence';
  minOccurrences: number;
  minConfidence: number;
}

export interface ExtractedRelation {
  source: string;
  target: string;
  type: RelationType;
  confidence: number;
  evidence: {
    text: string;
    documentId: string;
    position: { start: number; end: number };
  };
}
```

#### 4.2.2 Ingestionパッケージ

```typescript
// @yagokoro/ingestion

export interface IIngestionService {
  /** arXivから論文を取り込み */
  ingestFromArxiv(options: ArxivIngestionOptions): Promise<IngestionResult>;
  
  /** Semantic Scholarから取り込み */
  ingestFromSemanticScholar(options: SSIngestionOptions): Promise<IngestionResult>;
  
  /** スケジュール設定 */
  scheduleIngestion(schedule: IngestionSchedule): void;
  
  /** 取り込み状態取得 */
  getIngestionStatus(): IngestionStatus;
}

export interface ArxivIngestionOptions {
  query: string;                  // 検索クエリ
  categories?: string[];          // cs.AI, cs.CL, etc.
  dateFrom?: Date;               // 開始日
  dateTo?: Date;                 // 終了日
  maxResults?: number;           // 最大件数
}

export interface IngestionSchedule {
  cron: string;                  // "0 */6 * * *" (6時間毎)
  query: string;
  options: ArxivIngestionOptions;
}

export interface IngestionResult {
  totalFetched: number;
  newPapers: number;
  updatedPapers: number;
  duplicatesSkipped: number;
  errors: IngestionError[];
}
```

#### 4.2.3 HITLパッケージ

```typescript
// @yagokoro/hitl

export interface IHITLService {
  /** レビュー対象を登録 */
  submitForReview(item: ReviewSubmission): Promise<string>;
  
  /** 承認 */
  approve(reviewId: string, comment?: string): Promise<void>;
  
  /** 却下 */
  reject(reviewId: string, reason: string): Promise<void>;
  
  /** 修正して承認 */
  approveWithModification(
    reviewId: string, 
    modification: Modification
  ): Promise<void>;
  
  /** 一括承認（閾値以上） */
  batchApprove(filter: BatchApproveFilter): Promise<BatchResult>;
  
  /** 保留中のレビュー取得 */
  getPendingReviews(options?: PaginationOptions): Promise<ReviewItem[]>;
  
  /** レビュー統計取得 */
  getReviewStats(): ReviewStatistics;
}

export interface ReviewSubmission {
  itemType: 'relation' | 'entity' | 'normalization';
  itemId: string;
  confidence: number;
  evidence: Evidence[];
  priority?: 'low' | 'medium' | 'high';
}

export interface BatchApproveFilter {
  minConfidence: number;         // 最低信頼度
  itemTypes?: string[];          // 対象タイプ
  maxItems?: number;             // 最大件数
}
```

#### 4.2.4 Pipelineパッケージ

```typescript
// @yagokoro/pipeline

export interface IPipelineService {
  /** 変更検知 */
  detectChanges(since: Date): Promise<ChangeSet>;
  
  /** 差分適用 */
  applyChanges(changes: ChangeSet): Promise<PipelineResult>;
  
  /** ロールバック */
  rollback(transactionId: string): Promise<void>;
  
  /** パイプライン実行 */
  run(options?: PipelineRunOptions): Promise<PipelineResult>;
}

export interface ChangeSet {
  transactionId: string;
  timestamp: Date;
  additions: ChangeItem[];
  modifications: ChangeItem[];
  deletions: ChangeItem[];
}

export interface PipelineRunOptions {
  dryRun?: boolean;              // 実際には適用しない
  batchSize?: number;            // バッチサイズ
  parallel?: boolean;            // 並列処理
  maxConcurrency?: number;       // 最大同時実行数
}

export interface PipelineResult {
  transactionId: string;
  success: boolean;
  processedCount: number;
  errorCount: number;
  duration: number;              // ミリ秒
  errors: PipelineError[];
}
```

#### 4.2.5 Cacheパッケージ

```typescript
// @yagokoro/cache

export interface ICacheService {
  /** キャッシュ取得 */
  get<T>(key: string): Promise<T | null>;
  
  /** キャッシュ設定 */
  set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void>;
  
  /** キャッシュ削除 */
  delete(key: string): Promise<boolean>;
  
  /** パターンで無効化 */
  invalidate(pattern: string): Promise<number>;
  
  /** 統計取得 */
  getStats(): CacheStatistics;
  
  /** クリア */
  clear(): Promise<void>;
}

export interface CacheSetOptions {
  ttl?: number;                  // 秒単位のTTL
  dependencies?: string[];       // 依存キー
  priority?: 'low' | 'normal' | 'high';
}

export interface CacheStatistics {
  hitCount: number;
  missCount: number;
  hitRate: number;               // 0.0-1.0
  totalEntries: number;
  memoryUsedBytes: number;
  evictionCount: number;
}
```

---

## 5. シーケンス図

### 5.1 論文取り込みフロー（F-002）

```
┌─────┐    ┌───────────┐    ┌─────────┐    ┌──────────┐    ┌───────┐
│Cron │    │Ingestion  │    │ arXiv   │    │Extractor │    │ Neo4j │
│     │    │ Service   │    │  API    │    │          │    │       │
└──┬──┘    └─────┬─────┘    └────┬────┘    └────┬─────┘    └───┬───┘
   │             │               │              │              │
   │ trigger     │               │              │              │
   │────────────>│               │              │              │
   │             │               │              │              │
   │             │ fetch(query)  │              │              │
   │             │──────────────>│              │              │
   │             │               │              │              │
   │             │ papers[]      │              │              │
   │             │<──────────────│              │              │
   │             │               │              │              │
   │             │ deduplicate   │              │              │
   │             │───────┐       │              │              │
   │             │       │       │              │              │
   │             │<──────┘       │              │              │
   │             │               │              │              │
   │             │ extract(paper)│              │              │
   │             │───────────────┼─────────────>│              │
   │             │               │              │              │
   │             │               │              │ relations[]  │
   │             │<──────────────┼──────────────│              │
   │             │               │              │              │
   │             │ store(paper, relations)      │              │
   │             │──────────────────────────────┼─────────────>│
   │             │               │              │              │
   │             │               │              │   success    │
   │             │<─────────────────────────────┼──────────────│
   │             │               │              │              │
   │ result      │               │              │              │
   │<────────────│               │              │              │
   │             │               │              │              │
```

### 5.2 HITL検証フロー（F-004）

```
┌─────────┐   ┌───────────┐   ┌─────────┐   ┌─────────┐   ┌───────┐
│Extractor│   │  HITL     │   │ Review  │   │Normaliz │   │ Neo4j │
│         │   │ Service   │   │  Queue  │   │   er    │   │       │
└────┬────┘   └─────┬─────┘   └────┬────┘   └────┬────┘   └───┬───┘
     │              │              │              │             │
     │ relation     │              │              │             │
     │ (conf=0.7)   │              │              │             │
     │─────────────>│              │              │             │
     │              │              │              │             │
     │              │ submit       │              │             │
     │              │─────────────>│              │             │
     │              │              │              │             │
     │              │      enqueue │              │             │
     │              │<─────────────│              │             │
     │              │              │              │             │
     ├──────────────┼──────────────┼──────────────┼─────────────┤
     │              │    Human Review             │             │
     ├──────────────┼──────────────┼──────────────┼─────────────┤
     │              │              │              │             │
     │              │ approve(id)  │              │             │
     │              │<─────────────│              │             │
     │              │              │              │             │
     │              │              │ update status│             │
     │              │              │─────────────>│             │
     │              │              │              │             │
     │              │              │              │ normalize   │
     │              │              │              │────────────>│
     │              │              │              │             │
     │              │              │              │   success   │
     │              │<─────────────┼──────────────┼─────────────│
     │              │              │              │             │
```

### 5.3 NLQクエリフロー（MCP経由）

```
┌───────┐   ┌─────────┐   ┌───────┐   ┌─────────┐   ┌───────┐   ┌───────┐
│ MCP   │   │   NLQ   │   │ LLM   │   │ Cypher  │   │ Cache │   │ Neo4j │
│Client │   │ Service │   │(Ollama)│   │Generator│   │       │   │       │
└───┬───┘   └────┬────┘   └───┬───┘   └────┬────┘   └───┬───┘   └───┬───┘
    │            │            │            │            │           │
    │nlq_query   │            │            │            │           │
    │───────────>│            │            │            │           │
    │            │            │            │            │           │
    │            │ check cache│            │            │           │
    │            │────────────┼────────────┼───────────>│           │
    │            │            │            │            │           │
    │            │            │            │ cache miss │           │
    │            │<───────────┼────────────┼────────────│           │
    │            │            │            │            │           │
    │            │ classify   │            │            │           │
    │            │───────────>│            │            │           │
    │            │            │            │            │           │
    │            │ intent     │            │            │           │
    │            │<───────────│            │            │           │
    │            │            │            │            │           │
    │            │ generate   │            │            │           │
    │            │───────────────────────->│            │           │
    │            │            │            │            │           │
    │            │ cypher     │            │            │           │
    │            │<────────────────────────│            │           │
    │            │            │            │            │           │
    │            │ execute cypher          │            │           │
    │            │──────────────────────────────────────┼──────────>│
    │            │            │            │            │           │
    │            │ results    │            │            │           │
    │            │<─────────────────────────────────────┼───────────│
    │            │            │            │            │           │
    │            │ cache set  │            │            │           │
    │            │────────────┼────────────┼───────────>│           │
    │            │            │            │            │           │
    │ response   │            │            │            │           │
    │<───────────│            │            │            │           │
    │            │            │            │            │           │
```

---

## 6. ADR（アーキテクチャ決定記録）

### ADR-001: 共起分析による関係抽出

| 項目 | 内容 |
|------|------|
| **Status** | Accepted |
| **Context** | v2では229関係しかなく、マルチホップ推論が機能しない（0パス検出）|
| **Decision** | LLM依存の関係抽出に加え、共起分析ベースの自動抽出を追加 |
| **Consequences** | ✅ 関係数が4倍以上に増加（目標1,000+）<br>✅ LLMコスト削減<br>⚠️ 低信頼度の関係が増加→HITLで対応 |
| **Alternatives** | 1. LLMのみ（コスト高、速度遅）<br>2. ルールのみ（精度低）<br>3. ハイブリッド（採用）|

### ADR-002: HITL閾値設計

| 項目 | 内容 |
|------|------|
| **Status** | Accepted |
| **Context** | 自動抽出された関係の品質保証が必要 |
| **Decision** | 3段階閾値: 0.7以上→自動承認、0.5-0.7→HITLレビュー、0.5未満→棄却 |
| **Consequences** | ✅ 高信頼度は即時反映<br>✅ 中信頼度は人間確認<br>✅ 低信頼度はノイズ除去<br>⚠️ レビュー滞留リスク→バッチ承認で対応 |
| **Rationale** | REQ-002-003のスコアリング要件に準拠。v2の正規化実験から閾値を設定 |

### ADR-003: キャッシュ無効化戦略

| 項目 | 内容 |
|------|------|
| **Status** | Accepted |
| **Context** | グラフ更新時にクエリキャッシュが不整合になる |
| **Decision** | 依存グラフベースの選択的無効化 |
| **Consequences** | ✅ 影響範囲のみ無効化（効率的）<br>⚠️ 依存グラフの管理コスト |
| **Alternatives** | 1. TTLのみ（不整合リスク）<br>2. 全クリア（非効率）<br>3. 選択的無効化（採用）|

### ADR-004: arXiv APIレート制限対応

| 項目 | 内容 |
|------|------|
| **Status** | Accepted |
| **Context** | arXiv APIは3秒間隔制限あり、大量取得時にブロックリスク |
| **Decision** | Token Bucket + Circuit Breakerパターンを採用 |
| **Consequences** | ✅ API制限遵守<br>✅ 障害時の自動復旧<br>⚠️ 取り込み速度低下（許容） |
| **Implementation** | `@yagokoro/ingestion` の `RateLimiter` クラス |

### ADR-005: パッケージ分離戦略

| 項目 | 内容 |
|------|------|
| **Status** | Accepted |
| **Context** | 5つの新機能をどのように構造化するか |
| **Decision** | 各機能を独立パッケージとして分離（5新規パッケージ）|
| **Consequences** | ✅ 単一責務の原則<br>✅ 独立テスト可能<br>✅ 選択的インストール<br>⚠️ パッケージ間依存管理 |
| **Package Structure** | extractor, ingestion, hitl, pipeline, cache |

---

## 7. 非機能要件対応設計

### 7.1 パフォーマンス

| 要件 | 設計 |
|------|------|
| 論文取り込み: 100件/時間 | バッチ処理 + 並列抽出（5並列）|
| NLQレスポンス: 3秒以内 | クエリキャッシュ（ヒット率80%目標）|
| 差分更新: 10分以内 | 変更検知ハッシュ + 差分適用 |

### 7.2 可用性

| 要件 | 設計 |
|------|------|
| API障害時の縮退 | Circuit Breaker（5連続失敗で30秒停止）|
| 部分障害継続 | Graceful Degradation（キャッシュ返却）|
| データ整合性 | トランザクション + ロールバック |

### 7.3 セキュリティ

| 要件 | 設計 |
|------|------|
| API認証 | 環境変数でのAPIキー管理 |
| 入力検証 | Zodスキーマバリデーション |
| ログ | 機密情報マスキング |

### 7.4 エラーハンドリング

| コンポーネント | エラー種別 | 対応策 |
|---------------|-----------|--------|
| **Ingestion** | arXiv API 429 | Exponential Backoff（最大5回、初期3秒） |
| **Ingestion** | Semantic Scholar 503 | Circuit Breaker + Fallback（arXivデータのみ） |
| **Extractor** | LLM タイムアウト | リトライ3回後、Dead Letter Queueに格納 |
| **HITL** | レビュー滞留 | 7日経過で自動エスカレーション |
| **Pipeline** | トランザクション失敗 | 自動ロールバック + 通知 |
| **Cache** | メモリ枯渇 | LRU eviction + ディスクスピル |

#### Dead Letter Queue設計

```typescript
interface DeadLetterItem {
  id: string;
  type: 'extraction' | 'ingestion' | 'pipeline';
  payload: unknown;
  error: {
    message: string;
    stack?: string;
    timestamp: Date;
  };
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  lastRetryAt?: Date;
}

// 保存先: Neo4j (:DeadLetterItem) または ファイルシステム
```

---

## 8. テスト戦略

### 8.1 テストカテゴリ

| カテゴリ | 対象 | ツール |
|---------|------|--------|
| Unit | 各クラス・関数 | Vitest |
| Integration | パッケージ間連携 | Vitest + Testcontainers |
| E2E | 全体フロー | Vitest + Neo4j |
| Performance | 負荷・レスポンス | k6 |

### 8.2 テスト件数目標

| パッケージ | 目標件数 | 根拠 |
|-----------|---------|------|
| @yagokoro/extractor | 100+ | 共起分析ロジックの網羅 |
| @yagokoro/ingestion | 80+ | API連携・エラーハンドリング |
| @yagokoro/hitl | 60+ | ワークフロー状態遷移 |
| @yagokoro/pipeline | 80+ | 差分検知・トランザクション |
| @yagokoro/cache | 50+ | LRU・無効化ロジック |
| MCP拡張 | 100+ | 9新規ツール×10+ケース |
| **合計** | **500+** | v2(1,874) + 500 = 2,374+ |

---

## 9. 変更履歴

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-31 | GitHub Copilot | 初版作成 |
| 1.1 | 2025-12-31 | GitHub Copilot | レビュー対応: Document ID変更(DES-002→DES-003)、HITL閾値統一、エラーハンドリング追加 |

---

**Document Status**: Review Complete
**Next Step**: TASKS-003（タスク分解）
