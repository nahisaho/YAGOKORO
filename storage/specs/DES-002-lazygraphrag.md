# DES-002: LazyGraphRAG Implementation Design

**Project**: YAGOKORO  
**Last Updated**: 2025-12-29  
**Status**: Design Complete  
**Reference**: [Microsoft Research - LazyGraphRAG](https://www.microsoft.com/en-us/research/blog/lazygraphrag-setting-a-new-standard-for-quality-and-cost/)

---

## Overview

LazyGraphRAGは、従来のGraphRAGと比較して以下の特徴を持つ新しいアプローチ：

1. **インデックス作成コストが0.1%** - LLMによる事前サマリ生成を行わない
2. **クエリ時のLLM使用を遅延** - "Lazy"な評価でコスト削減
3. **Best-First + Breadth-First検索の融合** - ローカル/グローバルクエリの両方に対応
4. **Relevance Test Budgetによるコスト制御** - 単一パラメータで品質とコストのトレードオフを制御

---

## Architecture Comparison

### Traditional GraphRAG (現在の実装)

```
[Build Index]
  └── LLM: Entity/Relation抽出 → LLM: サマリ生成 → Community検出

[Query]
  └── 全コミュニティサマリをMap-Reduce (Breadth-First)
```

### LazyGraphRAG (新実装)

```
[Build Index]
  └── NLP: Concept抽出 (名詞句) → Community検出 (LLM不使用)

[Query]
  └── Query拡張 → Best-First/Breadth-First融合検索 → Claim抽出 → 回答生成
```

---

## Key Components

### 1. Lazy Indexing (Concept Extraction)

**現在のEntityExtractor (LLM使用)**:
- GPT-4/Claudeでエンティティ・関係を抽出
- サマリ生成にLLM使用
- **コスト**: 高 (全テキストをLLM処理)

**新しいConceptExtractor (NLP使用)**:
- 名詞句抽出 (compromise/NLP.js使用)
- TF-IDF/BM25による重要度計算
- 共起関係からグラフ構築
- **コスト**: Vector RAGと同等

```typescript
interface ConceptExtractor {
  // NLPベースの名詞句抽出
  extractConcepts(text: string): Concept[];
  
  // 共起関係の検出
  detectCooccurrences(chunks: TextChunk[]): ConceptRelation[];
  
  // Concept Graphの構築
  buildConceptGraph(concepts: Concept[], relations: ConceptRelation[]): ConceptGraph;
}
```

### 2. Query Expansion & Subquery Generation

クエリを複数のサブクエリに分解し、コンセプトグラフとマッチング：

```typescript
interface QueryExpander {
  // サブクエリへの分解 (3-5個)
  generateSubqueries(query: string): string[];
  
  // コンセプトグラフとのマッチング
  matchConcepts(subquery: string, conceptGraph: ConceptGraph): MatchedConcept[];
  
  // 拡張クエリの生成
  expandQuery(query: string, matchedConcepts: MatchedConcept[]): string;
}
```

### 3. Iterative Deepening Search

Best-FirstとBreadth-Firstの融合検索：

```typescript
interface LazySearchEngine {
  /**
   * Iterative Deepening Search
   * 
   * 1. Text chunkをクエリ類似度でランキング (Best-First)
   * 2. Chunk-Community関係でコミュニティをランキング
   * 3. Top-kチャンクの関連性をLLMで評価 (Breadth-First)
   * 4. z個連続で関連チャンクがなければサブコミュニティへ (Iterative Deepening)
   * 5. Budget到達または関連コミュニティ枯渇で終了
   */
  search(
    query: string,
    budget: RelevanceTestBudget
  ): SearchResult;
}

interface RelevanceTestBudget {
  /** 関連性テストの総予算 (100, 500, 1500など) */
  total: number;
  
  /** サブクエリあたりの予算 (total / numSubqueries) */
  perSubquery: number;
  
  /** 連続不関連コミュニティの閾値 */
  zeroRelevanceThreshold: number;
}
```

### 4. Relevance Assessor

文レベルの関連性評価（低コストLLM使用）：

```typescript
interface RelevanceAssessor {
  /**
   * 文レベルの関連性評価
   * 低コストLLM (GPT-4o-mini, Claude-3-haiku) 使用
   */
  assessRelevance(
    sentences: string[],
    query: string
  ): RelevanceScore[];
}

interface RelevanceScore {
  sentence: string;
  score: number;  // 0-1
  relevant: boolean;
}
```

### 5. Claim Extraction & Ranking

関連チャンクからクレームを抽出：

```typescript
interface ClaimExtractor {
  /**
   * サブクエリに関連するクレームを抽出
   */
  extractClaims(
    chunks: RelevantChunk[],
    subquery: string
  ): Claim[];
  
  /**
   * クレームをランキングしてコンテキストウィンドウに収める
   */
  rankAndFilter(
    claims: Claim[],
    contextWindowSize: number
  ): Claim[];
}

interface Claim {
  text: string;
  source: TextChunk;
  relevanceScore: number;
  concepts: string[];
}
```

---

## Implementation Plan

### Phase 1: Concept Extraction (NLPベース)

```
libs/graphrag/src/
├── extraction/
│   ├── ConceptExtractor.ts      # NEW: NLP名詞句抽出
│   ├── ConceptGraphBuilder.ts   # NEW: Concept Graph構築
│   └── ...
```

### Phase 2: Lazy Query Engine

```
libs/graphrag/src/
├── query/
│   ├── LazyQueryEngine.ts       # NEW: メインエンジン
│   ├── QueryExpander.ts         # NEW: サブクエリ生成
│   ├── IterativeSearch.ts       # NEW: 反復深化検索
│   ├── RelevanceAssessor.ts     # NEW: 関連性評価
│   ├── ClaimExtractor.ts        # NEW: クレーム抽出
│   └── ...
```

### Phase 3: Budget Control

```typescript
interface LazyGraphRAGOptions {
  /** Relevance Test Budget */
  budget: 100 | 500 | 1500 | number;
  
  /** 関連性テスト用LLM (低コスト) */
  assessorModel: 'gpt-4o-mini' | 'claude-3-haiku';
  
  /** 回答生成用LLM (高品質) */
  generatorModel: 'gpt-4o' | 'claude-3-5-sonnet';
  
  /** サブクエリ数 */
  numSubqueries: 3 | 4 | 5;
  
  /** 連続ゼロ関連閾値 */
  zeroRelevanceThreshold: number;
}
```

---

## Performance Targets

| メトリクス | 従来GraphRAG | LazyGraphRAG目標 |
|-----------|-------------|-----------------|
| インデックスコスト | 1.0x | 0.001x (0.1%) |
| クエリコスト (Budget 100) | 1.0x | 0.001x |
| クエリコスト (Budget 500) | 1.0x | 0.04x (4%) |
| ローカルクエリ品質 | Baseline | ≥ Baseline |
| グローバルクエリ品質 | Baseline | ≥ Baseline |

---

## Migration Strategy

1. **Phase 1**: ConceptExtractorを追加（EntityExtractorと共存）
2. **Phase 2**: LazyQueryEngineを追加（既存エンジンと選択可能）
3. **Phase 3**: デフォルトをLazyGraphRAGに切り替え
4. **Phase 4**: 従来GraphRAGは"Full GraphRAG"としてオプション維持

---

## File Changes Summary

### New Files

| File | Description |
|------|-------------|
| `libs/graphrag/src/extraction/ConceptExtractor.ts` | NLP名詞句抽出 |
| `libs/graphrag/src/extraction/ConceptGraphBuilder.ts` | Concept Graph構築 |
| `libs/graphrag/src/query/LazyQueryEngine.ts` | Lazy検索エンジン |
| `libs/graphrag/src/query/QueryExpander.ts` | サブクエリ生成 |
| `libs/graphrag/src/query/IterativeSearch.ts` | 反復深化検索 |
| `libs/graphrag/src/query/RelevanceAssessor.ts` | 関連性評価 |
| `libs/graphrag/src/query/ClaimExtractor.ts` | クレーム抽出 |

### Modified Files

| File | Changes |
|------|---------|
| `libs/graphrag/src/index.ts` | LazyGraphRAG exports追加 |
| `libs/graphrag/src/extraction/index.ts` | ConceptExtractor export |
| `libs/graphrag/src/query/index.ts` | Lazy系 exports |
| `steering/tech.ja.md` | LazyGraphRAG追記 |

---

## Dependencies

### New Packages

```json
{
  "dependencies": {
    "compromise": "^14.14.0"  // NLP名詞句抽出
  }
}
```

---

## References

- [Microsoft LazyGraphRAG Blog](https://www.microsoft.com/en-us/research/blog/lazygraphrag-setting-a-new-standard-for-quality-and-cost/)
- [GraphRAG GitHub](https://github.com/microsoft/graphrag)
- [compromise NLP](https://compromise.cool/)
