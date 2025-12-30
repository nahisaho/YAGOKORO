# DES-002: YAGOKORO v2.0.0 Design Specification

## Document Information

| 項目 | 内容 |
|------|------|
| **Document ID** | DES-002 |
| **Version** | 0.1.0 (Draft) |
| **Status** | Draft |
| **Created** | 2025-12-30 |
| **Author** | YAGOKORO Development Team |
| **Related Documents** | REQ-002, DES-001 |

---

## 1. Executive Summary

本設計書は、YAGOKORO v2.0.0の技術設計を定義する。REQ-002で定義された要件に基づき、以下の4つのコア機能と2つの統合機能を設計する。

| Phase | 機能 | 設計セクション |
|-------|------|---------------|
| Phase 1 | エンティティ正規化パイプライン | §3 |
| Phase 2 | マルチホップ推論エンジン | §4 |
| Phase 3 | Research Gap Analyzer | §5 |
| Phase 4 | Technology Lifecycle Tracker | §6 |
| Phase 5 | Enhanced MCP Tools | §7 |
| Phase 6 | Enhanced CLI Commands | §8 |

---

## 2. System Architecture Overview

### 2.1 High-Level Architecture (C4 Context)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           External Systems                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐                 │
│  │  arXiv   │   │ Semantic │   │  Ollama  │   │ OpenAI/  │                 │
│  │   API    │   │ Scholar  │   │  (Local) │   │ Anthropic│                 │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘                 │
│       │              │              │              │                        │
└───────┼──────────────┼──────────────┼──────────────┼────────────────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         YAGOKORO v2.0.0 System                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐          │
│  │   CLI Layer     │   │   MCP Server    │   │   API Layer     │          │
│  │  (Commander)    │   │   (stdio/sse)   │   │   (REST/WS)     │          │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘          │
│           │                     │                     │                    │
│           └──────────────┬──────┴─────────────────────┘                    │
│                          ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Application Services Layer                         │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │  │
│  │  │  Entity     │ │  MultiHop   │ │  Research   │ │  Lifecycle  │    │  │
│  │  │ Normalizer  │ │  Reasoner   │ │ Gap Analyzer│ │  Tracker    │    │  │
│  │  │  Service    │ │  Service    │ │  Service    │ │  Service    │    │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                          │                                                  │
│                          ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      Core Domain Layer                                │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │  │
│  │  │  Entities   │ │  Relations  │ │ Communities │ │  Aliases    │    │  │
│  │  │ (AIModel,..)│ │ (DERIVED,..)│ │ (Clusters)  │ │  (Mapping)  │    │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                          │                                                  │
│                          ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Infrastructure Layer                               │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │  │
│  │  │   Neo4j     │ │   Qdrant    │ │    LLM      │ │   Cache     │    │  │
│  │  │  Adapter    │ │  Adapter    │ │   Client    │ │  (Redis)    │    │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                          │                     │
                          ▼                     ▼
                   ┌──────────┐          ┌──────────┐
                   │  Neo4j   │          │  Qdrant  │
                   │  (Graph) │          │ (Vector) │
                   └──────────┘          └──────────┘
```

### 2.2 Package Structure

```
@yagokoro/
├── domain/                    # Core domain entities
│   ├── entities/              # Entity definitions
│   ├── relations/             # Relation types
│   ├── value-objects/         # Value objects
│   └── ports/                 # Repository interfaces
│
├── neo4j/                     # Neo4j infrastructure
│   ├── connection/            # Connection management
│   ├── repositories/          # Repository implementations
│   └── queries/               # Cypher query builders
│
├── vector/                    # Vector DB infrastructure
│   ├── connection/            # Qdrant connection
│   ├── embedding/             # Embedding service
│   └── store/                 # Vector store operations
│
├── graphrag/                  # GraphRAG core
│   ├── extraction/            # Entity/Relation extraction
│   ├── community/             # Community detection
│   ├── query/                 # Query engines
│   ├── llm/                   # LLM clients
│   └── ingest/                # Document ingestion
│
├── normalizer/                # 🆕 Entity normalization (Phase 1)
│   ├── rules/                 # Normalization rules
│   ├── similarity/            # Similarity matching
│   ├── alias/                 # Alias table management
│   └── service/               # Normalizer service
│
├── reasoner/                  # 🆕 Multi-hop reasoning (Phase 2)
│   ├── pathfinder/            # Path finding algorithms
│   ├── cache/                 # Path cache
│   └── explainer/             # Path explanation
│
├── analyzer/                  # 🆕 Research analysis (Phase 3-4)
│   ├── gap/                   # Research gap analysis
│   ├── lifecycle/             # Technology lifecycle
│   └── report/                # Report generation
│
├── mcp/                       # MCP server
│   ├── server/                # MCP server core
│   ├── tools/                 # 🆕 Enhanced tools
│   └── resources/             # MCP resources
│
└── cli/                       # CLI application
    ├── commands/              # 🆕 Enhanced commands
    └── utils/                 # CLI utilities
```

### 2.3 Data Flow Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   論文PDF    │────▶│  抽出処理    │────▶│  正規化      │
│   (arXiv)    │     │  (Docling)   │     │ (Phase 1)   │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                     ┌────────────────────────────┘
                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Neo4j      │◀────│  グラフ構築  │────▶│   Qdrant     │
│  (Graph)     │     │              │     │  (Vector)    │
└──────┬───────┘     └──────────────┘     └──────┬───────┘
       │                                          │
       ▼                                          ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  パス探索    │────▶│  分析処理    │────▶│  レポート    │
│ (Phase 2)   │     │ (Phase 3-4) │     │   生成       │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 3. Phase 1: Entity Normalization Pipeline Design

### 3.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    EntityNormalizerService                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │   Rule       │   │  Similarity  │   │    LLM       │        │
│  │  Normalizer  │──▶│   Matcher    │──▶│  Confirmer   │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                            ▼                                    │
│                   ┌──────────────┐                              │
│                   │    Alias     │                              │
│                   │    Table     │                              │
│                   │   Manager    │                              │
│                   └──────────────┘                              │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             ▼
                    ┌──────────────┐
                    │   Neo4j      │
                    │ (AliasNode)  │
                    └──────────────┘
```

### 3.2 Class Design

```typescript
// libs/normalizer/src/rules/RuleNormalizer.ts
export interface NormalizationRule {
  pattern: RegExp;
  replacement: string;
  priority: number;
  domain?: string;
}

export class RuleNormalizer {
  private rules: NormalizationRule[] = [];
  private domainDictionary: Map<string, string> = new Map();

  constructor(rulesPath?: string, dictionaryPath?: string) {
    this.loadDefaultRules();
    if (rulesPath) this.loadRulesFromFile(rulesPath);
    if (dictionaryPath) this.loadDictionary(dictionaryPath);
  }

  // デフォルトルール
  private loadDefaultRules(): void {
    this.rules = [
      // ハイフン・スペースの正規化
      { pattern: /GPT-(\d)/gi, replacement: 'GPT$1', priority: 100 },
      { pattern: /BERT[-\s]?(Base|Large)/gi, replacement: 'BERT-$1', priority: 100 },
      
      // 略語の展開/統一
      { pattern: /chain[- ]of[- ]thought/gi, replacement: 'CoT', priority: 90 },
      { pattern: /Chain of Thought/gi, replacement: 'CoT', priority: 90 },
      { pattern: /few[- ]shot/gi, replacement: 'few-shot', priority: 90 },
      
      // バージョン正規化
      { pattern: /(\w+)\s+v?(\d+(\.\d+)*)/gi, replacement: '$1-$2', priority: 80 },
    ];
  }

  normalize(entity: string): NormalizationResult {
    let normalized = entity;
    const appliedRules: string[] = [];

    // ドメイン辞書チェック
    if (this.domainDictionary.has(entity.toLowerCase())) {
      return {
        original: entity,
        normalized: this.domainDictionary.get(entity.toLowerCase())!,
        appliedRules: ['domain_dictionary'],
        confidence: 1.0
      };
    }

    // ルール適用（優先度順）
    const sortedRules = [...this.rules].sort((a, b) => b.priority - a.priority);
    for (const rule of sortedRules) {
      if (rule.pattern.test(normalized)) {
        normalized = normalized.replace(rule.pattern, rule.replacement);
        appliedRules.push(rule.pattern.toString());
      }
    }

    return {
      original: entity,
      normalized,
      appliedRules,
      confidence: appliedRules.length > 0 ? 0.9 : 0.5
    };
  }
}

interface NormalizationResult {
  original: string;
  normalized: string;
  appliedRules: string[];
  confidence: number;
}
```

```typescript
// libs/normalizer/src/similarity/SimilarityMatcher.ts
import { distance as levenshtein } from 'fastest-levenshtein';

export interface SimilarityMatch {
  entity: string;
  score: number;
  matchType: 'exact' | 'fuzzy' | 'substring';
}

export class SimilarityMatcher {
  private threshold: number;

  constructor(threshold: number = 0.8) {
    this.threshold = threshold;
  }

  findSimilar(entity: string, candidates: string[]): SimilarityMatch[] {
    const matches: SimilarityMatch[] = [];
    const entityLower = entity.toLowerCase();

    for (const candidate of candidates) {
      if (candidate === entity) continue;
      
      const candidateLower = candidate.toLowerCase();
      
      // 1. 完全一致（大文字小文字無視）
      if (entityLower === candidateLower) {
        matches.push({ entity: candidate, score: 1.0, matchType: 'exact' });
        continue;
      }

      // 2. 部分文字列
      if (entityLower.includes(candidateLower) || candidateLower.includes(entityLower)) {
        const score = Math.min(entityLower.length, candidateLower.length) / 
                     Math.max(entityLower.length, candidateLower.length);
        if (score >= this.threshold) {
          matches.push({ entity: candidate, score, matchType: 'substring' });
          continue;
        }
      }

      // 3. Levenshtein距離
      const maxLen = Math.max(entity.length, candidate.length);
      const dist = levenshtein(entityLower, candidateLower);
      const score = 1 - (dist / maxLen);
      
      if (score >= this.threshold) {
        matches.push({ entity: candidate, score, matchType: 'fuzzy' });
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }

  // Jaccard類似度（トークンベース）
  jaccardSimilarity(entity1: string, entity2: string): number {
    const tokens1 = new Set(entity1.toLowerCase().split(/[\s\-_]+/));
    const tokens2 = new Set(entity2.toLowerCase().split(/[\s\-_]+/));
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return intersection.size / union.size;
  }
}
```

```typescript
// libs/normalizer/src/alias/AliasTableManager.ts
export interface AliasEntry {
  alias: string;
  canonical: string;
  confidence: number;
  source: 'rule' | 'similarity' | 'llm' | 'manual';
  createdAt: Date;
  updatedAt: Date;
}

export class AliasTableManager {
  private neo4jConnection: Neo4jConnection;
  private cache: Map<string, string> = new Map();

  constructor(neo4jConnection: Neo4jConnection) {
    this.neo4jConnection = neo4jConnection;
  }

  async initialize(): Promise<void> {
    // エイリアステーブル用のインデックス作成
    await this.neo4jConnection.run(`
      CREATE INDEX alias_idx IF NOT EXISTS FOR (a:Alias) ON (a.alias)
    `);
    
    // キャッシュにロード
    await this.loadCache();
  }

  async addAlias(entry: Omit<AliasEntry, 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = new Date();
    
    await this.neo4jConnection.run(`
      MERGE (a:Alias {alias: $alias})
      SET a.canonical = $canonical,
          a.confidence = $confidence,
          a.source = $source,
          a.updatedAt = datetime($updatedAt)
      ON CREATE SET a.createdAt = datetime($createdAt)
    `, {
      ...entry,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    });

    this.cache.set(entry.alias.toLowerCase(), entry.canonical);
  }

  getCanonical(alias: string): string | null {
    return this.cache.get(alias.toLowerCase()) || null;
  }

  async rollback(alias: string): Promise<boolean> {
    const result = await this.neo4jConnection.run(`
      MATCH (a:Alias {alias: $alias})
      DELETE a
      RETURN count(a) as deleted
    `, { alias });
    
    this.cache.delete(alias.toLowerCase());
    return result.records[0]?.get('deleted') > 0;
  }

  async exportToJson(): Promise<AliasEntry[]> {
    const result = await this.neo4jConnection.run(`
      MATCH (a:Alias)
      RETURN a.alias as alias, a.canonical as canonical, 
             a.confidence as confidence, a.source as source,
             a.createdAt as createdAt, a.updatedAt as updatedAt
    `);
    
    return result.records.map(r => ({
      alias: r.get('alias'),
      canonical: r.get('canonical'),
      confidence: r.get('confidence'),
      source: r.get('source'),
      createdAt: new Date(r.get('createdAt')),
      updatedAt: new Date(r.get('updatedAt'))
    }));
  }
}
```

```typescript
// libs/normalizer/src/service/EntityNormalizerService.ts
export class EntityNormalizerService {
  private ruleNormalizer: RuleNormalizer;
  private similarityMatcher: SimilarityMatcher;
  private aliasManager: AliasTableManager;
  private llmClient: LLMClient;

  constructor(deps: EntityNormalizerDependencies) {
    this.ruleNormalizer = deps.ruleNormalizer;
    this.similarityMatcher = deps.similarityMatcher;
    this.aliasManager = deps.aliasManager;
    this.llmClient = deps.llmClient;
  }

  async normalize(
    entity: string, 
    options: NormalizeOptions = {}
  ): Promise<NormalizeResult> {
    // Step 0: キャッシュチェック
    const cached = this.aliasManager.getCanonical(entity);
    if (cached) {
      return { 
        original: entity, 
        canonical: cached, 
        source: 'cache',
        confidence: 1.0 
      };
    }

    // Step 1: ルールベース正規化
    const ruleResult = this.ruleNormalizer.normalize(entity);
    
    // Step 2: 類似エンティティ検索
    const existingEntities = await this.getExistingEntities();
    const similar = this.similarityMatcher.findSimilar(
      ruleResult.normalized, 
      existingEntities
    );

    // Step 3: LLM確認（オプション）
    if (options.confirmWithLLM && similar.length > 0) {
      const llmResult = await this.confirmWithLLM(
        ruleResult.normalized, 
        similar[0].entity
      );
      
      if (llmResult.isEquivalent) {
        await this.aliasManager.addAlias({
          alias: entity,
          canonical: similar[0].entity,
          confidence: llmResult.confidence,
          source: 'llm'
        });
        
        return {
          original: entity,
          canonical: similar[0].entity,
          source: 'llm',
          confidence: llmResult.confidence,
          reasoning: llmResult.reasoning
        };
      }
    }

    // Step 4: 高スコアの類似エンティティがあれば採用
    if (similar.length > 0 && similar[0].score >= 0.95) {
      await this.aliasManager.addAlias({
        alias: entity,
        canonical: similar[0].entity,
        confidence: similar[0].score,
        source: 'similarity'
      });
      
      return {
        original: entity,
        canonical: similar[0].entity,
        source: 'similarity',
        confidence: similar[0].score
      };
    }

    // Step 5: ルール正規化結果を返す
    if (ruleResult.appliedRules.length > 0) {
      await this.aliasManager.addAlias({
        alias: entity,
        canonical: ruleResult.normalized,
        confidence: ruleResult.confidence,
        source: 'rule'
      });
    }

    return {
      original: entity,
      canonical: ruleResult.normalized,
      source: 'rule',
      confidence: ruleResult.confidence
    };
  }

  async normalizeAll(options: NormalizeAllOptions = {}): Promise<NormalizationReport> {
    const entities = await this.getExistingEntities();
    const results: NormalizeResult[] = [];
    const errors: NormalizationError[] = [];

    for (const entity of entities) {
      try {
        const result = await this.normalize(entity, options);
        results.push(result);
      } catch (error) {
        errors.push({ entity, error: String(error) });
      }
    }

    return {
      totalEntities: entities.length,
      normalizedCount: results.filter(r => r.original !== r.canonical).length,
      results,
      errors
    };
  }

  private async confirmWithLLM(
    entity1: string, 
    entity2: string
  ): Promise<LLMEquivalenceResult> {
    const prompt = `
You are an AI research expert. Determine if these two terms refer to the same concept:
- Term 1: "${entity1}"
- Term 2: "${entity2}"

Respond in JSON format:
{
  "isEquivalent": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "explanation"
}
`;
    
    const response = await this.llmClient.generate(prompt);
    return JSON.parse(response);
  }
}
```

### 3.3 Database Schema (Neo4j)

```cypher
// Alias Node
CREATE CONSTRAINT alias_unique IF NOT EXISTS 
FOR (a:Alias) REQUIRE a.alias IS UNIQUE;

// Alias to Entity relationship
// (Alias)-[:REFERS_TO]->(Entity)

// Example:
CREATE (a:Alias {
  alias: 'GPT-3',
  canonical: 'GPT3',
  confidence: 0.95,
  source: 'rule',
  createdAt: datetime(),
  updatedAt: datetime()
})
```

### 3.4 Normalization Rules Configuration

```yaml
# config/normalization-rules.yaml
version: 1.0
rules:
  # Model name normalization
  - pattern: "GPT-?(\\d+)"
    replacement: "GPT$1"
    priority: 100
    category: "model_name"
    
  - pattern: "BERT[-\\s]?(Base|Large|Mini|Small)"
    replacement: "BERT-$1"
    priority: 100
    category: "model_name"
    
  # Technique abbreviations
  - pattern: "[Cc]hain[- ]of[- ][Tt]hought"
    replacement: "CoT"
    priority: 90
    category: "technique"
    
  - pattern: "[Ff]ew[- ]shot"
    replacement: "few-shot"
    priority: 90
    category: "technique"

  # Organization normalization
  - pattern: "OpenAI|Open AI"
    replacement: "OpenAI"
    priority: 80
    category: "organization"

dictionaries:
  # Domain-specific canonical names
  - file: "dictionaries/ai-models.yaml"
  - file: "dictionaries/techniques.yaml"
  - file: "dictionaries/organizations.yaml"
```

### 3.5 ADR-001: Alias Storage Strategy

**Status**: Accepted

**Context**: エイリアステーブルの保存方法として、(1) Neo4jにノードとして保存、(2) 別DBに保存、(3) ファイルとして保存 の選択肢がある。

**Decision**: Neo4jにAliasノードとして保存する。

**Rationale**:
- グラフと同じトランザクションで管理可能
- Cypher クエリでエイリアス解決が可能
- 関係性（REFERS_TO）を明示的にモデル化

**Consequences**:
- Neo4jへの依存が増加
- 正規化時にDB接続が必要

---

## 4. Phase 2: Multi-hop Reasoning Engine Design

### 4.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    MultiHopReasonerService                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │    Query     │   │    Path      │   │     Path     │        │
│  │   Parser     │──▶│   Finder     │──▶│   Explainer  │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│                            │                  │                 │
│                     ┌──────┴──────┐           │                 │
│                     ▼             ▼           │                 │
│              ┌──────────┐  ┌──────────┐       │                 │
│              │   BFS    │  │   DFS    │       │                 │
│              │  Finder  │  │  Finder  │       │                 │
│              └──────────┘  └──────────┘       │                 │
│                     │             │           │                 │
│                     └──────┬──────┘           │                 │
│                            ▼                  │                 │
│                     ┌──────────────┐          │                 │
│                     │    Path      │◀─────────┘                 │
│                     │    Cache     │                            │
│                     └──────────────┘                            │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             ▼
                    ┌──────────────┐
                    │   Neo4j      │
                    │   (Graph)    │
                    └──────────────┘
```

### 4.2 Class Design

```typescript
// libs/reasoner/src/pathfinder/PathFinder.ts
export interface PathQuery {
  startEntityType: EntityType;
  startEntityName?: string;
  endEntityType: EntityType;
  endEntityName?: string;
  maxHops: number;
  relationTypes?: RelationType[];
  excludeRelations?: RelationType[];
}

export interface PathResult {
  paths: Path[];
  statistics: PathStatistics;
  executionTime: number;
}

export interface Path {
  nodes: PathNode[];
  relations: PathRelation[];
  score: number;
  hops: number;
}

export interface PathNode {
  id: string;
  type: EntityType;
  name: string;
  properties: Record<string, unknown>;
}

export interface PathRelation {
  type: RelationType;
  direction: 'outgoing' | 'incoming';
  properties: Record<string, unknown>;
}

export interface PathStatistics {
  totalPaths: number;
  averageHops: number;
  minHops: number;
  maxHops: number;
  pathsByHops: Record<number, number>;
}
```

```typescript
// libs/reasoner/src/pathfinder/BFSPathFinder.ts
export class BFSPathFinder implements PathFinderStrategy {
  private neo4jConnection: Neo4jConnection;
  private cycleDetector: CycleDetector;

  constructor(neo4jConnection: Neo4jConnection) {
    this.neo4jConnection = neo4jConnection;
    this.cycleDetector = new CycleDetector();
  }

  async findPaths(query: PathQuery): Promise<PathResult> {
    const startTime = Date.now();

    // Cypher クエリを構築
    const cypher = this.buildCypherQuery(query);
    
    const result = await this.neo4jConnection.run(cypher, {
      startType: query.startEntityType,
      startName: query.startEntityName,
      endType: query.endEntityType,
      endName: query.endEntityName,
      maxHops: query.maxHops
    });

    const paths = this.processPaths(result.records);
    const filteredPaths = this.filterCyclicPaths(paths);

    return {
      paths: filteredPaths,
      statistics: this.calculateStatistics(filteredPaths),
      executionTime: Date.now() - startTime
    };
  }

  private buildCypherQuery(query: PathQuery): string {
    const relationFilter = query.relationTypes 
      ? `:${query.relationTypes.join('|')}` 
      : '';
    
    const excludeClause = query.excludeRelations?.length
      ? `WHERE NOT type(r) IN [${query.excludeRelations.map(t => `'${t}'`).join(',')}]`
      : '';

    return `
      MATCH path = shortestPath(
        (start:${query.startEntityType} ${query.startEntityName ? '{name: $startName}' : ''})
        -[${relationFilter}*1..${query.maxHops}]-
        (end:${query.endEntityType} ${query.endEntityName ? '{name: $endName}' : ''})
      )
      ${excludeClause}
      RETURN path, length(path) as hops
      ORDER BY hops ASC
      LIMIT 100
    `;
  }

  private filterCyclicPaths(paths: Path[]): Path[] {
    return paths.filter(path => !this.cycleDetector.hasCycle(path));
  }
}
```

```typescript
// libs/reasoner/src/pathfinder/CycleDetector.ts
export class CycleDetector {
  hasCycle(path: Path): boolean {
    const nodeIds = path.nodes.map(n => n.id);
    const uniqueIds = new Set(nodeIds);
    return nodeIds.length !== uniqueIds.size;
  }

  findCycles(paths: Path[]): CycleReport {
    const cycles: CycleInfo[] = [];
    
    for (const path of paths) {
      if (this.hasCycle(path)) {
        cycles.push({
          pathId: this.generatePathId(path),
          nodes: path.nodes,
          cycleNodes: this.identifyCycleNodes(path)
        });
      }
    }

    return {
      totalPaths: paths.length,
      cyclicPaths: cycles.length,
      cycles
    };
  }

  private identifyCycleNodes(path: Path): string[] {
    const nodeIds = path.nodes.map(n => n.id);
    const seen = new Set<string>();
    const duplicates: string[] = [];
    
    for (const id of nodeIds) {
      if (seen.has(id)) {
        duplicates.push(id);
      }
      seen.add(id);
    }
    
    return duplicates;
  }
}
```

```typescript
// libs/reasoner/src/cache/PathCache.ts
import { LRUCache } from 'lru-cache';

export interface CacheOptions {
  maxSize: number;
  ttlMs: number;
}

export class PathCache {
  private cache: LRUCache<string, CachedPathResult>;

  constructor(options: CacheOptions = { maxSize: 1000, ttlMs: 3600000 }) {
    this.cache = new LRUCache({
      max: options.maxSize,
      ttl: options.ttlMs,
    });
  }

  generateKey(query: PathQuery): string {
    return JSON.stringify({
      start: `${query.startEntityType}:${query.startEntityName || '*'}`,
      end: `${query.endEntityType}:${query.endEntityName || '*'}`,
      maxHops: query.maxHops,
      relations: query.relationTypes?.sort()
    });
  }

  get(query: PathQuery): PathResult | undefined {
    const key = this.generateKey(query);
    const cached = this.cache.get(key);
    
    if (cached) {
      return {
        ...cached.result,
        fromCache: true,
        cachedAt: cached.timestamp
      };
    }
    
    return undefined;
  }

  set(query: PathQuery, result: PathResult): void {
    const key = this.generateKey(query);
    this.cache.set(key, {
      result,
      timestamp: new Date()
    });
  }

  invalidate(pattern?: string): number {
    if (!pattern) {
      this.cache.clear();
      return this.cache.size;
    }
    
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  getStats(): CacheStats {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      hitRate: this.cache.calculatedSize / this.cache.max
    };
  }
}

interface CachedPathResult {
  result: PathResult;
  timestamp: Date;
}
```

```typescript
// libs/reasoner/src/explainer/PathExplainer.ts
export interface PathExplanation {
  path: Path;
  naturalLanguage: string;
  summary: string;
  keyRelations: RelationExplanation[];
}

export interface RelationExplanation {
  from: string;
  to: string;
  relationType: string;
  explanation: string;
}

export class PathExplainer {
  private llmClient: LLMClient;

  constructor(llmClient: LLMClient) {
    this.llmClient = llmClient;
  }

  async explain(path: Path, context?: string): Promise<PathExplanation> {
    // テンプレートベースの説明生成
    const templateExplanation = this.generateTemplateExplanation(path);
    
    // LLMによる自然言語説明
    const llmExplanation = await this.generateLLMExplanation(path, context);

    return {
      path,
      naturalLanguage: llmExplanation,
      summary: this.generateSummary(path),
      keyRelations: this.extractKeyRelations(path)
    };
  }

  private generateTemplateExplanation(path: Path): string {
    const parts: string[] = [];
    
    for (let i = 0; i < path.nodes.length - 1; i++) {
      const from = path.nodes[i];
      const to = path.nodes[i + 1];
      const rel = path.relations[i];
      
      parts.push(
        `${from.name} (${from.type}) -[${rel.type}]-> ${to.name} (${to.type})`
      );
    }
    
    return parts.join('\n');
  }

  private async generateLLMExplanation(path: Path, context?: string): Promise<string> {
    const pathDescription = this.generateTemplateExplanation(path);
    
    const prompt = `
以下の知識グラフパスを、AI研究の文脈で自然な日本語で説明してください。

パス:
${pathDescription}

${context ? `追加コンテキスト: ${context}` : ''}

要求:
1. 各ノード間の関係性を説明
2. このパスが示唆する研究上の関連性を述べる
3. 2-3文で簡潔にまとめる
`;

    return await this.llmClient.generate(prompt);
  }

  private generateSummary(path: Path): string {
    const start = path.nodes[0];
    const end = path.nodes[path.nodes.length - 1];
    
    return `${start.name} から ${end.name} への ${path.hops} ホップのパス`;
  }

  private extractKeyRelations(path: Path): RelationExplanation[] {
    return path.relations.map((rel, i) => ({
      from: path.nodes[i].name,
      to: path.nodes[i + 1].name,
      relationType: rel.type,
      explanation: this.getRelationDescription(rel.type)
    }));
  }

  private getRelationDescription(relationType: string): string {
    const descriptions: Record<string, string> = {
      'DERIVED_FROM': 'から派生した',
      'USES': 'を使用する',
      'DEVELOPED_BY': 'によって開発された',
      'AUTHORED_BY': 'によって執筆された',
      'AFFILIATED_WITH': 'に所属する',
      'EVALUATED_ON': 'で評価された',
      'CITES': 'を引用する',
      'IMPROVES': 'を改良した',
      'APPLIES': 'を適用する'
    };
    
    return descriptions[relationType] || relationType;
  }
}
```

```typescript
// libs/reasoner/src/service/MultiHopReasonerService.ts
export class MultiHopReasonerService {
  private pathFinder: BFSPathFinder;
  private pathCache: PathCache;
  private pathExplainer: PathExplainer;

  constructor(deps: MultiHopReasonerDependencies) {
    this.pathFinder = deps.pathFinder;
    this.pathCache = deps.pathCache;
    this.pathExplainer = deps.pathExplainer;
  }

  async findAndExplain(query: PathQuery): Promise<ReasoningResult> {
    // キャッシュチェック
    const cached = this.pathCache.get(query);
    if (cached) {
      return {
        ...cached,
        explanations: await this.explainPaths(cached.paths)
      };
    }

    // パス検索
    const result = await this.pathFinder.findPaths(query);
    
    // キャッシュ保存
    this.pathCache.set(query, result);

    // 説明生成
    const explanations = await this.explainPaths(result.paths.slice(0, 10));

    return {
      ...result,
      explanations
    };
  }

  async findRelationPaths(
    entity1: string,
    entity2: string,
    options: RelationPathOptions = {}
  ): Promise<ReasoningResult> {
    const query: PathQuery = {
      startEntityType: options.entity1Type || 'Entity',
      startEntityName: entity1,
      endEntityType: options.entity2Type || 'Entity',
      endEntityName: entity2,
      maxHops: options.maxHops || 4,
      relationTypes: options.relationTypes
    };

    return this.findAndExplain(query);
  }

  async findConceptConnections(concept: string): Promise<ConceptConnectionResult> {
    // コンセプトから関連する全エンティティへのパスを検索
    const aiModels = await this.pathFinder.findPaths({
      startEntityType: 'Concept',
      startEntityName: concept,
      endEntityType: 'AIModel',
      maxHops: 3
    });

    const techniques = await this.pathFinder.findPaths({
      startEntityType: 'Concept',
      startEntityName: concept,
      endEntityType: 'Technique',
      maxHops: 3
    });

    return {
      concept,
      connectedModels: aiModels.paths,
      connectedTechniques: techniques.paths,
      summary: await this.generateConnectionSummary(concept, aiModels, techniques)
    };
  }

  private async explainPaths(paths: Path[]): Promise<PathExplanation[]> {
    return Promise.all(
      paths.map(path => this.pathExplainer.explain(path))
    );
  }
}
```

### 4.3 Cypher Query Patterns

```cypher
-- 2エンティティ間の最短パス
MATCH path = shortestPath(
  (start:AIModel {name: 'GPT4'})-[*1..4]-(end:Technique {name: 'CoT'})
)
RETURN path, length(path) as hops

-- 全パス検索（制限付き）
MATCH path = (start:AIModel {name: 'GPT4'})-[*1..3]-(end:Technique {name: 'CoT'})
WHERE ALL(n IN nodes(path) WHERE single(x IN nodes(path) WHERE x = n))
RETURN path, length(path) as hops
ORDER BY hops ASC
LIMIT 50

-- 特定の関係タイプのみを辿る
MATCH path = (start:AIModel)-[:USES|IMPROVES|DERIVED_FROM*1..3]-(end:Technique)
RETURN path, length(path) as hops

-- コミュニティを経由するパス
MATCH path = (start:AIModel)-[*1..2]-(c:Community)-[*1..2]-(end:Technique)
WHERE start.name = 'GPT4'
RETURN path, c.name as community
```

### 4.4 ADR-002: Path Caching Strategy

**Status**: Accepted

**Context**: マルチホップ推論は計算コストが高いため、キャッシュ戦略が必要。

**Decision**: LRUキャッシュ + クエリパラメータベースのキー生成を採用。

**Rationale**:
- LRUは実装がシンプルで、メモリ効率が良い
- クエリパラメータのハッシュでキーを生成することで、同一クエリの再計算を防ぐ
- TTL設定でグラフ更新時の整合性を担保

**Consequences**:
- キャッシュヒット率によりパフォーマンスが変動
- グラフ更新時にキャッシュ無効化が必要

---

## 5. Phase 3: Research Gap Analyzer Design

### 5.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   ResearchGapAnalyzerService                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │  Citation    │   │  Cluster     │   │     Gap      │        │
│  │  Analyzer    │──▶│  Analyzer    │──▶│   Detector   │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│         │                  │                  │                 │
│         ▼                  ▼                  ▼                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │  Citation    │   │  Cluster     │   │     Gap      │        │
│  │   Graph      │   │    Map       │   │    Report    │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│                            │                                    │
│                            ▼                                    │
│                     ┌──────────────┐                            │
│                     │   Report     │                            │
│                     │  Generator   │                            │
│                     └──────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Class Design

```typescript
// libs/analyzer/src/gap/CitationAnalyzer.ts
export interface CitationMetrics {
  entityId: string;
  entityName: string;
  entityType: EntityType;
  citationCount: number;
  citedByCount: number;
  hIndex: number;
  recentCitationGrowth: number;  // 直近1年の被引用成長率
  crossDomainCitations: number;  // 異分野からの引用数
}

export interface CitationNetwork {
  nodes: CitationNode[];
  edges: CitationEdge[];
  clusters: CitationCluster[];
}

export class CitationAnalyzer {
  private neo4jConnection: Neo4jConnection;

  constructor(neo4jConnection: Neo4jConnection) {
    this.neo4jConnection = neo4jConnection;
  }

  async analyzeCitationNetwork(domain?: string): Promise<CitationNetwork> {
    const cypher = `
      MATCH (p1:Publication)-[c:CITES]->(p2:Publication)
      ${domain ? 'WHERE p1.domain = $domain OR p2.domain = $domain' : ''}
      RETURN p1, c, p2
      LIMIT 10000
    `;

    const result = await this.neo4jConnection.run(cypher, { domain });
    return this.buildCitationNetwork(result);
  }

  async getTopCited(limit: number = 20): Promise<CitationMetrics[]> {
    const cypher = `
      MATCH (p:Publication)<-[c:CITES]-()
      WITH p, count(c) as citations
      OPTIONAL MATCH (p)-[co:CITES]->()
      WITH p, citations, count(co) as citing
      RETURN p.id as entityId, p.title as entityName, 'Publication' as entityType,
             citing as citationCount, citations as citedByCount
      ORDER BY citations DESC
      LIMIT $limit
    `;

    const result = await this.neo4jConnection.run(cypher, { limit });
    return result.records.map(r => ({
      entityId: r.get('entityId'),
      entityName: r.get('entityName'),
      entityType: r.get('entityType'),
      citationCount: r.get('citationCount'),
      citedByCount: r.get('citedByCount'),
      hIndex: 0, // 別途計算
      recentCitationGrowth: 0,
      crossDomainCitations: 0
    }));
  }

  async findCitationIslands(): Promise<CitationIsland[]> {
    // 引用ネットワークで孤立したクラスターを検出
    const cypher = `
      CALL gds.wcc.stream('citationGraph')
      YIELD nodeId, componentId
      WITH componentId, count(*) as size
      WHERE size < 5  // 小さな孤立クラスター
      RETURN componentId, size
      ORDER BY size DESC
    `;

    const result = await this.neo4jConnection.run(cypher);
    return result.records.map(r => ({
      componentId: r.get('componentId'),
      size: r.get('size')
    }));
  }
}
```

```typescript
// libs/analyzer/src/gap/ClusterAnalyzer.ts
export interface ResearchCluster {
  id: string;
  name: string;
  keywords: string[];
  entities: ClusterEntity[];
  publicationCount: number;
  avgPublicationYear: number;
  growthRate: number;  // 年間成長率
  connectionStrength: Map<string, number>;  // 他クラスターとの接続強度
}

export interface ClusterEntity {
  id: string;
  name: string;
  type: EntityType;
  centrality: number;
}

export class ClusterAnalyzer {
  private neo4jConnection: Neo4jConnection;

  constructor(neo4jConnection: Neo4jConnection) {
    this.neo4jConnection = neo4jConnection;
  }

  async analyzeExistingClusters(): Promise<ResearchCluster[]> {
    const cypher = `
      MATCH (c:Community)<-[:BELONGS_TO]-(e)
      WITH c, collect(e) as members, count(e) as size
      OPTIONAL MATCH (e)-[:AUTHORED_BY|DEVELOPED_BY]->(p:Publication)
      WITH c, members, size, avg(p.year) as avgYear, count(p) as pubCount
      RETURN c.id as id, c.name as name, c.keywords as keywords,
             members, size, avgYear, pubCount
      ORDER BY size DESC
    `;

    const result = await this.neo4jConnection.run(cypher);
    return this.processClusterResults(result);
  }

  async findClusterGaps(): Promise<ClusterGap[]> {
    // クラスター間の未接続領域を検出
    const clusters = await this.analyzeExistingClusters();
    const gaps: ClusterGap[] = [];

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const connectionStrength = await this.measureConnection(
          clusters[i].id, 
          clusters[j].id
        );
        
        if (connectionStrength < 0.1) {  // 弱い接続
          gaps.push({
            cluster1: clusters[i],
            cluster2: clusters[j],
            connectionStrength,
            potentialBridgeTopics: await this.suggestBridgeTopics(
              clusters[i], 
              clusters[j]
            )
          });
        }
      }
    }

    return gaps;
  }

  private async measureConnection(
    cluster1Id: string, 
    cluster2Id: string
  ): Promise<number> {
    const cypher = `
      MATCH (c1:Community {id: $cluster1Id})<-[:BELONGS_TO]-(e1)
      MATCH (c2:Community {id: $cluster2Id})<-[:BELONGS_TO]-(e2)
      MATCH path = shortestPath((e1)-[*1..3]-(e2))
      RETURN count(path) as connectionCount
    `;

    const result = await this.neo4jConnection.run(cypher, { 
      cluster1Id, 
      cluster2Id 
    });
    
    const count = result.records[0]?.get('connectionCount') || 0;
    // 正規化（0-1スケール）
    return Math.min(count / 100, 1);
  }

  private async suggestBridgeTopics(
    cluster1: ResearchCluster,
    cluster2: ResearchCluster
  ): Promise<string[]> {
    // 両クラスターに関連しそうなトピックを提案
    const keywords1 = new Set(cluster1.keywords);
    const keywords2 = new Set(cluster2.keywords);
    
    // 共通キーワードを探す
    const common = [...keywords1].filter(k => keywords2.has(k));
    
    // 意味的に近いキーワードペアを探す
    // (実際にはベクトル類似度を使用)
    
    return common.length > 0 ? common : ['interdisciplinary research'];
  }
}
```

```typescript
// libs/analyzer/src/gap/GapDetector.ts
export interface ResearchGap {
  id: string;
  type: GapType;
  description: string;
  severity: 'low' | 'medium' | 'high';
  evidence: GapEvidence[];
  suggestedActions: string[];
  relatedEntities: string[];
}

export type GapType = 
  | 'underexplored_technique'
  | 'missing_combination'
  | 'isolated_cluster'
  | 'stale_research_area'
  | 'unexplored_application';

export interface GapEvidence {
  type: string;
  value: unknown;
  source: string;
}

export class GapDetector {
  private citationAnalyzer: CitationAnalyzer;
  private clusterAnalyzer: ClusterAnalyzer;
  private llmClient: LLMClient;

  constructor(deps: GapDetectorDependencies) {
    this.citationAnalyzer = deps.citationAnalyzer;
    this.clusterAnalyzer = deps.clusterAnalyzer;
    this.llmClient = deps.llmClient;
  }

  async detectGaps(options: GapDetectionOptions = {}): Promise<ResearchGap[]> {
    const gaps: ResearchGap[] = [];

    // 1. 未探索のテクニック組み合わせを検出
    const unexploredCombinations = await this.findUnexploredCombinations();
    gaps.push(...unexploredCombinations);

    // 2. 孤立したクラスターを検出
    const isolatedClusters = await this.findIsolatedResearchAreas();
    gaps.push(...isolatedClusters);

    // 3. 停滞している研究領域を検出
    const staleAreas = await this.findStaleResearchAreas();
    gaps.push(...staleAreas);

    // 4. LLMによる追加分析
    if (options.useLLM) {
      const llmGaps = await this.analyzWithLLM(gaps);
      gaps.push(...llmGaps);
    }

    return this.prioritizeGaps(gaps);
  }

  private async findUnexploredCombinations(): Promise<ResearchGap[]> {
    // 存在するテクニックとモデルの組み合わせを取得
    const existingCombinations = await this.getExistingCombinations();
    
    // 理論的に可能な組み合わせを生成
    const possibleCombinations = await this.generatePossibleCombinations();
    
    // 未探索の組み合わせを特定
    const unexplored = possibleCombinations.filter(
      combo => !existingCombinations.has(combo.key)
    );

    return unexplored.map(combo => ({
      id: `gap-combo-${combo.key}`,
      type: 'missing_combination' as GapType,
      description: `${combo.technique} と ${combo.model} の組み合わせは未探索`,
      severity: this.calculateSeverity(combo),
      evidence: [{
        type: 'missing_relation',
        value: combo,
        source: 'combination_analysis'
      }],
      suggestedActions: [
        `${combo.technique} を ${combo.model} に適用する研究を実施`,
        `類似の組み合わせの成功事例を調査`
      ],
      relatedEntities: [combo.technique, combo.model]
    }));
  }

  private async findStaleResearchAreas(): Promise<ResearchGap[]> {
    // 直近2年間で論文が出ていないが、過去に活発だった領域
    const cypher = `
      MATCH (t:Technique)<-[:USES]-(p:Publication)
      WITH t, max(p.year) as lastYear, count(p) as totalPubs
      WHERE lastYear < date().year - 2 AND totalPubs > 5
      RETURN t.name as technique, lastYear, totalPubs
      ORDER BY totalPubs DESC
      LIMIT 20
    `;

    const result = await this.neo4jConnection.run(cypher);
    
    return result.records.map(r => ({
      id: `gap-stale-${r.get('technique')}`,
      type: 'stale_research_area' as GapType,
      description: `${r.get('technique')} は ${r.get('lastYear')} 以降論文が出ていない`,
      severity: 'medium' as const,
      evidence: [{
        type: 'publication_gap',
        value: { lastYear: r.get('lastYear'), totalPubs: r.get('totalPubs') },
        source: 'temporal_analysis'
      }],
      suggestedActions: [
        `${r.get('technique')} の最新動向を調査`,
        `代替技術との比較研究を実施`
      ],
      relatedEntities: [r.get('technique')]
    }));
  }

  private prioritizeGaps(gaps: ResearchGap[]): ResearchGap[] {
    // 重要度でソート
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return gaps.sort((a, b) => 
      severityOrder[a.severity] - severityOrder[b.severity]
    );
  }
}
```

```typescript
// libs/analyzer/src/gap/service/ResearchGapAnalyzerService.ts
export class ResearchGapAnalyzerService {
  private gapDetector: GapDetector;
  private reportGenerator: ReportGenerator;

  constructor(deps: ResearchGapAnalyzerDependencies) {
    this.gapDetector = deps.gapDetector;
    this.reportGenerator = deps.reportGenerator;
  }

  async analyze(domain?: string): Promise<GapAnalysisResult> {
    // ギャップ検出
    const gaps = await this.gapDetector.detectGaps({
      domain,
      useLLM: true
    });

    // 統計情報の計算
    const statistics = this.calculateStatistics(gaps);

    // レポート生成
    const report = await this.reportGenerator.generate({
      gaps,
      statistics,
      domain
    });

    return {
      gaps,
      statistics,
      report
    };
  }

  async generateResearchProposals(
    gaps: ResearchGap[], 
    count: number = 5
  ): Promise<ResearchProposal[]> {
    const proposals: ResearchProposal[] = [];

    for (const gap of gaps.slice(0, count)) {
      const proposal = await this.generateProposal(gap);
      proposals.push(proposal);
    }

    return proposals;
  }

  private async generateProposal(gap: ResearchGap): Promise<ResearchProposal> {
    const prompt = `
以下の研究ギャップに基づいて、具体的な研究提案を作成してください。

ギャップ:
- タイプ: ${gap.type}
- 説明: ${gap.description}
- 関連エンティティ: ${gap.relatedEntities.join(', ')}

要求:
1. 研究タイトル
2. 研究目的（2-3文）
3. 予想されるアプローチ
4. 期待される成果
5. 必要なリソース

JSON形式で回答してください。
`;

    const response = await this.llmClient.generate(prompt);
    return JSON.parse(response);
  }

  private calculateStatistics(gaps: ResearchGap[]): GapStatistics {
    return {
      totalGaps: gaps.length,
      byType: this.countByType(gaps),
      bySeverity: this.countBySeverity(gaps),
      topRelatedEntities: this.getTopRelatedEntities(gaps)
    };
  }
}
```

### 5.3 Gap Detection Algorithms

```
Algorithm: Unexplored Combination Detection

Input: Set of Models M, Set of Techniques T
Output: Set of Unexplored Combinations

1. existing_combinations = Query Neo4j for (Model)-[:USES]->(Technique)
2. all_possible = M × T (Cartesian product)
3. unexplored = all_possible - existing_combinations
4. For each combo in unexplored:
   4.1. similarity_score = Calculate semantic similarity between model and technique
   4.2. If similarity_score > threshold:
        4.2.1. Add to candidate_gaps with score
5. Return top K candidate_gaps sorted by score
```

### 5.4 ADR-003: Gap Severity Calculation

**Status**: Accepted

**Context**: 研究ギャップの重要度を判定する基準が必要。

**Decision**: 以下の基準で重要度を計算する:
- **High**: 関連エンティティの被引用数が上位10%、かつ最終論文から2年以上
- **Medium**: 関連エンティティの被引用数が上位30%、または活発なクラスターとの接続が弱い
- **Low**: それ以外

**Rationale**:
- 引用数は研究の影響力を示す
- 時間経過は研究の停滞を示す
- クラスター接続は学際的重要性を示す

---

## 6. Phase 4: Technology Lifecycle Tracker Design

### 6.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                  TechnologyLifecycleTrackerService               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │   Timeline   │   │    Phase     │   │   Trend      │        │
│  │  Aggregator  │──▶│   Detector   │──▶│  Predictor   │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│         │                  │                  │                 │
│         ▼                  ▼                  ▼                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │  Timeline    │   │    Phase     │   │   Trend      │        │
│  │   Events     │   │   Labels     │   │  Forecast    │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│                            │                                    │
│                            ▼                                    │
│                     ┌──────────────┐                            │
│                     │  Lifecycle   │                            │
│                     │   Report     │                            │
│                     └──────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Class Design

```typescript
// libs/analyzer/src/lifecycle/TimelineAggregator.ts
export interface TimelineEvent {
  id: string;
  entityId: string;
  entityName: string;
  entityType: EntityType;
  eventType: EventType;
  date: Date;
  description: string;
  significance: number;  // 0-1スケール
  relatedEntities: string[];
  source: string;
}

export type EventType = 
  | 'publication'      // 論文発表
  | 'model_release'    // モデルリリース
  | 'benchmark'        // ベンチマーク結果
  | 'adoption'         // 産業採用
  | 'derivative'       // 派生技術の登場
  | 'improvement'      // 改良版の発表
  | 'deprecation';     // 非推奨化

export class TimelineAggregator {
  private neo4jConnection: Neo4jConnection;

  constructor(neo4jConnection: Neo4jConnection) {
    this.neo4jConnection = neo4jConnection;
  }

  async aggregateTimeline(
    entityId: string, 
    options: TimelineOptions = {}
  ): Promise<TimelineEvent[]> {
    const events: TimelineEvent[] = [];

    // 1. 論文発表イベント
    const publications = await this.getPublicationEvents(entityId);
    events.push(...publications);

    // 2. 派生技術イベント
    const derivatives = await this.getDerivativeEvents(entityId);
    events.push(...derivatives);

    // 3. ベンチマーク結果イベント
    const benchmarks = await this.getBenchmarkEvents(entityId);
    events.push(...benchmarks);

    // 時系列でソート
    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private async getPublicationEvents(entityId: string): Promise<TimelineEvent[]> {
    const cypher = `
      MATCH (e {id: $entityId})<-[:MENTIONS|USES]-(p:Publication)
      RETURN p.id as pubId, p.title as title, p.publishedDate as date,
             p.citations as citations
      ORDER BY date ASC
    `;

    const result = await this.neo4jConnection.run(cypher, { entityId });
    
    return result.records.map(r => ({
      id: `pub-${r.get('pubId')}`,
      entityId,
      entityName: '',  // 後で設定
      entityType: 'Publication',
      eventType: 'publication' as EventType,
      date: new Date(r.get('date')),
      description: r.get('title'),
      significance: this.calculateSignificance(r.get('citations')),
      relatedEntities: [],
      source: 'neo4j'
    }));
  }

  private async getDerivativeEvents(entityId: string): Promise<TimelineEvent[]> {
    const cypher = `
      MATCH (e {id: $entityId})<-[:DERIVED_FROM]-(d)
      OPTIONAL MATCH (d)<-[:MENTIONS]-(p:Publication)
      RETURN d.id as derivativeId, d.name as name, 
             min(p.publishedDate) as firstMention
      ORDER BY firstMention ASC
    `;

    const result = await this.neo4jConnection.run(cypher, { entityId });
    
    return result.records
      .filter(r => r.get('firstMention'))
      .map(r => ({
        id: `derivative-${r.get('derivativeId')}`,
        entityId,
        entityName: r.get('name'),
        entityType: 'AIModel',
        eventType: 'derivative' as EventType,
        date: new Date(r.get('firstMention')),
        description: `${r.get('name')} が派生`,
        significance: 0.7,
        relatedEntities: [r.get('derivativeId')],
        source: 'neo4j'
      }));
  }
}
```

```typescript
// libs/analyzer/src/lifecycle/PhaseDetector.ts
export type LifecyclePhase = 
  | 'emerging'      // 出現期: 最初の論文から2年以内
  | 'growing'       // 成長期: 論文数が増加傾向
  | 'mature'        // 成熟期: 論文数が安定
  | 'declining'     // 衰退期: 論文数が減少傾向
  | 'legacy';       // レガシー: 2年以上新規論文なし

export interface PhaseResult {
  entity: string;
  currentPhase: LifecyclePhase;
  phaseStartDate: Date;
  confidence: number;
  metrics: PhaseMetrics;
  history: PhaseTransition[];
}

export interface PhaseMetrics {
  totalPublications: number;
  publicationsLastYear: number;
  publicationGrowthRate: number;
  citationMomentum: number;
  derivativeCount: number;
}

export interface PhaseTransition {
  fromPhase: LifecyclePhase;
  toPhase: LifecyclePhase;
  transitionDate: Date;
  reason: string;
}

export class PhaseDetector {
  private timelineAggregator: TimelineAggregator;

  constructor(timelineAggregator: TimelineAggregator) {
    this.timelineAggregator = timelineAggregator;
  }

  async detectPhase(entityId: string): Promise<PhaseResult> {
    const timeline = await this.timelineAggregator.aggregateTimeline(entityId);
    const metrics = this.calculateMetrics(timeline);
    const phase = this.determinePhase(metrics, timeline);
    const history = await this.reconstructHistory(entityId, timeline);

    return {
      entity: entityId,
      currentPhase: phase,
      phaseStartDate: this.findPhaseStartDate(history, phase),
      confidence: this.calculateConfidence(metrics),
      metrics,
      history
    };
  }

  private determinePhase(
    metrics: PhaseMetrics, 
    timeline: TimelineEvent[]
  ): LifecyclePhase {
    const now = new Date();
    const firstEvent = timeline[0];
    const lastEvent = timeline[timeline.length - 1];

    if (!firstEvent) return 'emerging';

    const ageInYears = (now.getTime() - firstEvent.date.getTime()) / 
                       (365 * 24 * 60 * 60 * 1000);
    const timeSinceLastEvent = (now.getTime() - lastEvent.date.getTime()) / 
                               (365 * 24 * 60 * 60 * 1000);

    // レガシー判定: 2年以上新規論文なし
    if (timeSinceLastEvent > 2 && metrics.totalPublications > 5) {
      return 'legacy';
    }

    // 出現期: 2年以内
    if (ageInYears < 2) {
      return 'emerging';
    }

    // 成長率に基づく判定
    if (metrics.publicationGrowthRate > 0.2) {
      return 'growing';
    } else if (metrics.publicationGrowthRate > -0.1) {
      return 'mature';
    } else {
      return 'declining';
    }
  }

  private calculateMetrics(timeline: TimelineEvent[]): PhaseMetrics {
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const twoYearsAgo = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);

    const publications = timeline.filter(e => e.eventType === 'publication');
    const lastYearPubs = publications.filter(e => e.date > oneYearAgo);
    const prevYearPubs = publications.filter(
      e => e.date > twoYearsAgo && e.date <= oneYearAgo
    );

    const growthRate = prevYearPubs.length > 0 
      ? (lastYearPubs.length - prevYearPubs.length) / prevYearPubs.length
      : lastYearPubs.length > 0 ? 1 : 0;

    const derivatives = timeline.filter(e => e.eventType === 'derivative');

    return {
      totalPublications: publications.length,
      publicationsLastYear: lastYearPubs.length,
      publicationGrowthRate: growthRate,
      citationMomentum: this.calculateCitationMomentum(publications),
      derivativeCount: derivatives.length
    };
  }

  private calculateCitationMomentum(publications: TimelineEvent[]): number {
    // 最近の論文の被引用数の伸び率
    // 実際の実装ではより詳細な計算が必要
    return publications
      .slice(-5)
      .reduce((sum, p) => sum + p.significance, 0) / 5;
  }
}
```

```typescript
// libs/analyzer/src/lifecycle/TrendPredictor.ts
export interface TrendForecast {
  entityId: string;
  predictions: PredictionPoint[];
  confidence: number;
  methodology: string;
  factors: TrendFactor[];
}

export interface PredictionPoint {
  date: Date;
  predictedPhase: LifecyclePhase;
  publicationForecast: number;
  confidenceInterval: [number, number];
}

export interface TrendFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

export class TrendPredictor {
  private phaseDetector: PhaseDetector;
  private llmClient: LLMClient;

  constructor(phaseDetector: PhaseDetector, llmClient: LLMClient) {
    this.phaseDetector = phaseDetector;
    this.llmClient = llmClient;
  }

  async predictTrend(
    entityId: string, 
    horizonMonths: number = 12
  ): Promise<TrendForecast> {
    const currentPhase = await this.phaseDetector.detectPhase(entityId);
    
    // 線形外挿による基本予測
    const basePredictions = this.linearExtrapolation(
      currentPhase.metrics, 
      horizonMonths
    );

    // トレンド要因の分析
    const factors = await this.analyzeTrendFactors(entityId, currentPhase);

    // 要因を考慮した調整予測
    const adjustedPredictions = this.adjustPredictions(basePredictions, factors);

    return {
      entityId,
      predictions: adjustedPredictions,
      confidence: this.calculateForecastConfidence(currentPhase, factors),
      methodology: 'linear_extrapolation_with_factor_adjustment',
      factors
    };
  }

  private linearExtrapolation(
    metrics: PhaseMetrics, 
    horizonMonths: number
  ): PredictionPoint[] {
    const predictions: PredictionPoint[] = [];
    const now = new Date();
    const monthlyGrowth = metrics.publicationGrowthRate / 12;

    for (let i = 1; i <= horizonMonths; i += 3) {
      const futureDate = new Date(now.getTime() + i * 30 * 24 * 60 * 60 * 1000);
      const quarterlyPubs = metrics.publicationsLastYear / 4;
      const predicted = quarterlyPubs * (1 + monthlyGrowth * i);
      
      predictions.push({
        date: futureDate,
        predictedPhase: this.predictPhase(metrics, i),
        publicationForecast: Math.max(0, predicted),
        confidenceInterval: [
          Math.max(0, predicted * 0.7), 
          predicted * 1.3
        ]
      });
    }

    return predictions;
  }

  private async analyzeTrendFactors(
    entityId: string, 
    currentPhase: PhaseResult
  ): Promise<TrendFactor[]> {
    const factors: TrendFactor[] = [];

    // 1. 派生技術の影響
    if (currentPhase.metrics.derivativeCount > 3) {
      factors.push({
        name: 'derivative_growth',
        impact: 'positive',
        weight: 0.3,
        description: '多くの派生技術が登場しており、基盤技術としての重要性が高い'
      });
    }

    // 2. 引用モメンタム
    if (currentPhase.metrics.citationMomentum > 0.7) {
      factors.push({
        name: 'citation_momentum',
        impact: 'positive',
        weight: 0.25,
        description: '最近の論文が多く引用されており、注目度が高い'
      });
    }

    // 3. LLMによる定性分析
    const llmFactors = await this.getLLMFactors(entityId, currentPhase);
    factors.push(...llmFactors);

    return factors;
  }

  private async getLLMFactors(
    entityId: string, 
    currentPhase: PhaseResult
  ): Promise<TrendFactor[]> {
    const prompt = `
以下の技術のトレンド要因を分析してください:

- 技術ID: ${entityId}
- 現在のフェーズ: ${currentPhase.currentPhase}
- 論文数（昨年）: ${currentPhase.metrics.publicationsLastYear}
- 成長率: ${currentPhase.metrics.publicationGrowthRate}

今後のトレンドに影響を与える要因を3つ挙げてください。

JSON配列で回答:
[{
  "name": "factor_name",
  "impact": "positive|negative|neutral",
  "weight": 0.0-1.0,
  "description": "説明"
}]
`;

    const response = await this.llmClient.generate(prompt);
    return JSON.parse(response);
  }
}
```

```typescript
// libs/analyzer/src/lifecycle/service/TechnologyLifecycleTrackerService.ts
export class TechnologyLifecycleTrackerService {
  private timelineAggregator: TimelineAggregator;
  private phaseDetector: PhaseDetector;
  private trendPredictor: TrendPredictor;
  private reportGenerator: ReportGenerator;

  constructor(deps: LifecycleTrackerDependencies) {
    this.timelineAggregator = deps.timelineAggregator;
    this.phaseDetector = deps.phaseDetector;
    this.trendPredictor = deps.trendPredictor;
    this.reportGenerator = deps.reportGenerator;
  }

  async trackLifecycle(entityId: string): Promise<LifecycleReport> {
    // タイムライン取得
    const timeline = await this.timelineAggregator.aggregateTimeline(entityId);
    
    // フェーズ検出
    const phase = await this.phaseDetector.detectPhase(entityId);
    
    // トレンド予測
    const forecast = await this.trendPredictor.predictTrend(entityId);

    // レポート生成
    const report = await this.reportGenerator.generate({
      entityId,
      timeline,
      phase,
      forecast
    });

    return report;
  }

  async compareLifecycles(entityIds: string[]): Promise<LifecycleComparison> {
    const lifecycles = await Promise.all(
      entityIds.map(id => this.trackLifecycle(id))
    );

    return {
      entities: entityIds,
      lifecycles,
      comparison: this.generateComparison(lifecycles),
      insights: await this.generateInsights(lifecycles)
    };
  }

  async findEmergingTechnologies(limit: number = 10): Promise<EmergingTech[]> {
    // emergingフェーズかつ成長率が高い技術を検索
    const cypher = `
      MATCH (t:Technique)<-[:USES]-(p:Publication)
      WITH t, count(p) as pubCount, 
           max(p.publishedDate) as lastPub,
           min(p.publishedDate) as firstPub
      WHERE firstPub > date() - duration('P2Y')
      RETURN t.id as id, t.name as name, pubCount,
             duration.between(firstPub, lastPub).months as activeMonths
      ORDER BY pubCount DESC
      LIMIT $limit
    `;

    const result = await this.neo4jConnection.run(cypher, { limit });
    
    return result.records.map(r => ({
      id: r.get('id'),
      name: r.get('name'),
      publicationCount: r.get('pubCount'),
      activeMonths: r.get('activeMonths'),
      phase: 'emerging' as LifecyclePhase
    }));
  }

  async findDecliningTechnologies(limit: number = 10): Promise<DecliningTech[]> {
    // 過去に活発だったが最近停滞している技術
    const cypher = `
      MATCH (t:Technique)<-[:USES]-(p:Publication)
      WITH t, count(p) as pubCount, 
           max(p.publishedDate) as lastPub,
           min(p.publishedDate) as firstPub
      WHERE pubCount > 10 
        AND lastPub < date() - duration('P1Y')
        AND duration.between(firstPub, lastPub).years > 3
      RETURN t.id as id, t.name as name, pubCount, lastPub
      ORDER BY pubCount DESC
      LIMIT $limit
    `;

    const result = await this.neo4jConnection.run(cypher, { limit });
    
    return result.records.map(r => ({
      id: r.get('id'),
      name: r.get('name'),
      publicationCount: r.get('pubCount'),
      lastPublication: new Date(r.get('lastPub')),
      phase: 'declining' as LifecyclePhase
    }));
  }
}
```

### 6.3 Lifecycle Phase State Machine

```
                    ┌─────────────────┐
                    │                 │
                    │    Emerging     │
                    │   (< 2 years)   │
                    │                 │
                    └────────┬────────┘
                             │
                    growth > 0.2
                             │
                             ▼
                    ┌─────────────────┐
                    │                 │
         ┌─────────│     Growing     │─────────┐
         │         │  (growth > 0.2) │         │
         │         │                 │         │
         │         └────────┬────────┘         │
         │                  │                  │
    growth < -0.1      -0.1 < growth < 0.2    │
         │                  │                  │
         │                  ▼                  │
         │         ┌─────────────────┐         │
         │         │                 │         │
         └────────▶│     Mature      │◀────────┘
                   │ (stable growth) │
                   │                 │
                   └────────┬────────┘
                            │
                   growth < -0.1
                            │
                            ▼
                   ┌─────────────────┐
                   │                 │
                   │    Declining    │
                   │ (negative trend)│
                   │                 │
                   └────────┬────────┘
                            │
                   no pubs > 2 years
                            │
                            ▼
                   ┌─────────────────┐
                   │                 │
                   │     Legacy      │
                   │   (inactive)    │
                   │                 │
                   └─────────────────┘
```

### 6.4 ADR-004: Trend Prediction Methodology

**Status**: Accepted

**Context**: 技術トレンドの予測には様々な手法がある。

**Decision**: 線形外挿 + LLM要因分析のハイブリッドアプローチを採用。

**Rationale**:
- 線形外挿は解釈可能性が高く、基準として適切
- LLMは定性的要因（業界動向、新技術の登場等）を捕捉可能
- ハイブリッドにより定量・定性の両面をカバー

**Consequences**:
- 予測精度はLLMの品質に依存
- 信頼区間の計算が複雑

---

## 7. Phase 5: Enhanced MCP Tools Design

### 7.1 MCP Tools Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Server                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │  Existing Tools  │  │   New Tools      │                     │
│  ├──────────────────┤  ├──────────────────┤                     │
│  │ • search_entity  │  │ • normalize_entity│                     │
│  │ • get_entity     │  │ • find_paths     │                     │
│  │ • list_relations │  │ • analyze_gaps   │                     │
│  │ • query_graph    │  │ • track_lifecycle│                     │
│  │ • search_similar │  │ • suggest_research│                    │
│  └──────────────────┘  │ • get_trend      │                     │
│                        │ • compare_techs  │                     │
│                        └──────────────────┘                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Tool Registry                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 New MCP Tools Definition

```typescript
// libs/mcp/src/tools/normalization-tools.ts
import { z } from 'zod';

export const normalizeEntityTool = {
  name: 'normalize_entity',
  description: 'エンティティ名を正規化し、エイリアステーブルに登録する',
  inputSchema: z.object({
    entity: z.string().describe('正規化対象のエンティティ名'),
    confirmWithLLM: z.boolean().optional()
      .describe('LLMで類似エンティティとの同一性を確認するか'),
    dryRun: z.boolean().optional()
      .describe('実際に登録せずに結果を確認するか')
  }),
  handler: async (input: NormalizeEntityInput): Promise<NormalizeEntityOutput> => {
    const normalizer = container.get<EntityNormalizerService>('EntityNormalizer');
    const result = await normalizer.normalize(input.entity, {
      confirmWithLLM: input.confirmWithLLM ?? false
    });

    if (!input.dryRun) {
      await normalizer.persistResult(result);
    }

    return {
      original: result.original,
      canonical: result.canonical,
      source: result.source,
      confidence: result.confidence,
      persisted: !input.dryRun
    };
  }
};

export const normalizeAllEntitiesTool = {
  name: 'normalize_all_entities',
  description: 'すべてのエンティティを一括で正規化する',
  inputSchema: z.object({
    entityType: z.enum(['AIModel', 'Technique', 'Person', 'Organization', 'All'])
      .optional()
      .describe('正規化対象のエンティティタイプ'),
    confirmWithLLM: z.boolean().optional(),
    dryRun: z.boolean().optional()
  }),
  handler: async (input: NormalizeAllInput): Promise<NormalizeAllOutput> => {
    const normalizer = container.get<EntityNormalizerService>('EntityNormalizer');
    const report = await normalizer.normalizeAll({
      entityType: input.entityType,
      confirmWithLLM: input.confirmWithLLM ?? false
    });

    return {
      totalProcessed: report.totalEntities,
      normalizedCount: report.normalizedCount,
      errorCount: report.errors.length,
      results: report.results.slice(0, 50),  // 上位50件
      dryRun: input.dryRun ?? false
    };
  }
};
```

```typescript
// libs/mcp/src/tools/reasoning-tools.ts
export const findPathsTool = {
  name: 'find_paths',
  description: '2つのエンティティ間のパス（関係の連鎖）を検索する',
  inputSchema: z.object({
    entity1: z.string().describe('開始エンティティ名'),
    entity2: z.string().describe('終了エンティティ名'),
    maxHops: z.number().min(1).max(6).optional()
      .describe('最大ホップ数（デフォルト: 4）'),
    relationTypes: z.array(z.string()).optional()
      .describe('フィルタする関係タイプ'),
    explain: z.boolean().optional()
      .describe('パスの自然言語説明を生成するか')
  }),
  handler: async (input: FindPathsInput): Promise<FindPathsOutput> => {
    const reasoner = container.get<MultiHopReasonerService>('MultiHopReasoner');
    
    const result = await reasoner.findRelationPaths(
      input.entity1, 
      input.entity2,
      {
        maxHops: input.maxHops ?? 4,
        relationTypes: input.relationTypes
      }
    );

    let explanations: PathExplanation[] = [];
    if (input.explain && result.paths.length > 0) {
      const explainer = container.get<PathExplainer>('PathExplainer');
      explanations = await Promise.all(
        result.paths.slice(0, 5).map(p => explainer.explain(p))
      );
    }

    return {
      pathsFound: result.paths.length,
      paths: result.paths.slice(0, 20),
      statistics: result.statistics,
      explanations,
      executionTime: result.executionTime
    };
  }
};

export const findConceptConnectionsTool = {
  name: 'find_concept_connections',
  description: 'コンセプトから関連するモデル、テクニックへの接続を探索する',
  inputSchema: z.object({
    concept: z.string().describe('探索の起点となるコンセプト'),
    maxHops: z.number().min(1).max(4).optional()
  }),
  handler: async (input: FindConceptInput): Promise<FindConceptOutput> => {
    const reasoner = container.get<MultiHopReasonerService>('MultiHopReasoner');
    return await reasoner.findConceptConnections(input.concept);
  }
};
```

```typescript
// libs/mcp/src/tools/analysis-tools.ts
export const analyzeGapsTool = {
  name: 'analyze_gaps',
  description: '研究ギャップを分析し、未探索の研究領域を特定する',
  inputSchema: z.object({
    domain: z.string().optional()
      .describe('分析対象のドメイン（省略時は全ドメイン）'),
    maxResults: z.number().min(1).max(50).optional()
      .describe('返却する最大ギャップ数'),
    generateProposals: z.boolean().optional()
      .describe('研究提案を自動生成するか')
  }),
  handler: async (input: AnalyzeGapsInput): Promise<AnalyzeGapsOutput> => {
    const analyzer = container.get<ResearchGapAnalyzerService>('GapAnalyzer');
    const result = await analyzer.analyze(input.domain);

    const gaps = result.gaps.slice(0, input.maxResults ?? 20);
    let proposals: ResearchProposal[] = [];

    if (input.generateProposals) {
      proposals = await analyzer.generateResearchProposals(gaps, 5);
    }

    return {
      totalGaps: result.gaps.length,
      gaps,
      statistics: result.statistics,
      proposals
    };
  }
};

export const suggestResearchTool = {
  name: 'suggest_research',
  description: '特定のエンティティに関する研究提案を生成する',
  inputSchema: z.object({
    entity: z.string().describe('研究提案の対象エンティティ'),
    focus: z.enum(['improvement', 'application', 'combination', 'analysis'])
      .optional()
      .describe('研究のフォーカス領域')
  }),
  handler: async (input: SuggestResearchInput): Promise<SuggestResearchOutput> => {
    const analyzer = container.get<ResearchGapAnalyzerService>('GapAnalyzer');
    
    // エンティティに関連するギャップを検索
    const gaps = await analyzer.findEntityRelatedGaps(input.entity);
    
    // フォーカスに基づいて提案を生成
    const proposals = await analyzer.generateFocusedProposals(
      input.entity,
      input.focus,
      gaps
    );

    return {
      entity: input.entity,
      focus: input.focus ?? 'general',
      proposals
    };
  }
};
```

```typescript
// libs/mcp/src/tools/lifecycle-tools.ts
export const trackLifecycleTool = {
  name: 'track_lifecycle',
  description: '技術のライフサイクル（出現期、成長期、成熟期、衰退期）を追跡する',
  inputSchema: z.object({
    entity: z.string().describe('追跡対象のエンティティ名'),
    includeTimeline: z.boolean().optional()
      .describe('詳細なタイムラインを含めるか'),
    includeForecast: z.boolean().optional()
      .describe('将来予測を含めるか')
  }),
  handler: async (input: TrackLifecycleInput): Promise<TrackLifecycleOutput> => {
    const tracker = container.get<TechnologyLifecycleTrackerService>('LifecycleTracker');
    
    const report = await tracker.trackLifecycle(input.entity);

    return {
      entity: input.entity,
      currentPhase: report.phase.currentPhase,
      phaseStartDate: report.phase.phaseStartDate,
      metrics: report.phase.metrics,
      timeline: input.includeTimeline ? report.timeline : undefined,
      forecast: input.includeForecast ? report.forecast : undefined,
      confidence: report.phase.confidence
    };
  }
};

export const getTrendTool = {
  name: 'get_trend',
  description: '技術のトレンド予測を取得する',
  inputSchema: z.object({
    entity: z.string().describe('予測対象のエンティティ'),
    horizonMonths: z.number().min(3).max(24).optional()
      .describe('予測期間（月数）')
  }),
  handler: async (input: GetTrendInput): Promise<GetTrendOutput> => {
    const tracker = container.get<TechnologyLifecycleTrackerService>('LifecycleTracker');
    const forecast = await tracker.trendPredictor.predictTrend(
      input.entity,
      input.horizonMonths ?? 12
    );

    return forecast;
  }
};

export const compareTechsTool = {
  name: 'compare_techs',
  description: '複数の技術のライフサイクルを比較する',
  inputSchema: z.object({
    entities: z.array(z.string()).min(2).max(5)
      .describe('比較対象のエンティティ名（2-5個）')
  }),
  handler: async (input: CompareTechsInput): Promise<CompareTechsOutput> => {
    const tracker = container.get<TechnologyLifecycleTrackerService>('LifecycleTracker');
    return await tracker.compareLifecycles(input.entities);
  }
};

export const findEmergingTechsTool = {
  name: 'find_emerging_techs',
  description: '新興技術（出現期の技術）を検索する',
  inputSchema: z.object({
    limit: z.number().min(1).max(50).optional()
      .describe('返却する最大件数')
  }),
  handler: async (input: FindEmergingInput): Promise<FindEmergingOutput> => {
    const tracker = container.get<TechnologyLifecycleTrackerService>('LifecycleTracker');
    const emerging = await tracker.findEmergingTechnologies(input.limit ?? 10);
    return { technologies: emerging };
  }
};
```

### 7.3 Tool Registration

```typescript
// libs/mcp/src/tools/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

export function registerAllTools(server: Server): void {
  // Existing tools (v1.0)
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      // ... existing tools ...

      // New tools (v2.0)
      {
        name: normalizeEntityTool.name,
        description: normalizeEntityTool.description,
        inputSchema: zodToJsonSchema(normalizeEntityTool.inputSchema)
      },
      {
        name: normalizeAllEntitiesTool.name,
        description: normalizeAllEntitiesTool.description,
        inputSchema: zodToJsonSchema(normalizeAllEntitiesTool.inputSchema)
      },
      {
        name: findPathsTool.name,
        description: findPathsTool.description,
        inputSchema: zodToJsonSchema(findPathsTool.inputSchema)
      },
      {
        name: findConceptConnectionsTool.name,
        description: findConceptConnectionsTool.description,
        inputSchema: zodToJsonSchema(findConceptConnectionsTool.inputSchema)
      },
      {
        name: analyzeGapsTool.name,
        description: analyzeGapsTool.description,
        inputSchema: zodToJsonSchema(analyzeGapsTool.inputSchema)
      },
      {
        name: suggestResearchTool.name,
        description: suggestResearchTool.description,
        inputSchema: zodToJsonSchema(suggestResearchTool.inputSchema)
      },
      {
        name: trackLifecycleTool.name,
        description: trackLifecycleTool.description,
        inputSchema: zodToJsonSchema(trackLifecycleTool.inputSchema)
      },
      {
        name: getTrendTool.name,
        description: getTrendTool.description,
        inputSchema: zodToJsonSchema(getTrendTool.inputSchema)
      },
      {
        name: compareTechsTool.name,
        description: compareTechsTool.description,
        inputSchema: zodToJsonSchema(compareTechsTool.inputSchema)
      },
      {
        name: findEmergingTechsTool.name,
        description: findEmergingTechsTool.description,
        inputSchema: zodToJsonSchema(findEmergingTechsTool.inputSchema)
      }
    ]
  }));

  // Tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    const toolMap = new Map([
      [normalizeEntityTool.name, normalizeEntityTool.handler],
      [normalizeAllEntitiesTool.name, normalizeAllEntitiesTool.handler],
      [findPathsTool.name, findPathsTool.handler],
      [findConceptConnectionsTool.name, findConceptConnectionsTool.handler],
      [analyzeGapsTool.name, analyzeGapsTool.handler],
      [suggestResearchTool.name, suggestResearchTool.handler],
      [trackLifecycleTool.name, trackLifecycleTool.handler],
      [getTrendTool.name, getTrendTool.handler],
      [compareTechsTool.name, compareTechsTool.handler],
      [findEmergingTechsTool.name, findEmergingTechsTool.handler]
    ]);

    const handler = toolMap.get(name);
    if (!handler) {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }

    const result = await handler(args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  });
}
```

---

## 8. Phase 6: Enhanced CLI Commands Design

### 8.1 CLI Command Structure

```
yagokoro
├── entity
│   ├── search <query>
│   ├── get <id>
│   ├── normalize <name>          # 🆕
│   └── normalize-all [--type]    # 🆕
│
├── relation
│   ├── list [--from] [--to]
│   └── create <from> <to> <type>
│
├── path                           # 🆕
│   ├── find <entity1> <entity2>   # 🆕
│   └── explain <path-id>          # 🆕
│
├── analyze                        # 🆕
│   ├── gaps [--domain]            # 🆕
│   ├── lifecycle <entity>         # 🆕
│   ├── trend <entity>             # 🆕
│   ├── compare <entity1> <entity2...>  # 🆕
│   └── emerging                   # 🆕
│
├── graph
│   ├── stats
│   └── export [--format]
│
├── community
│   ├── detect
│   └── list
│
└── mcp
    ├── start
    └── status
```

### 8.2 Command Implementation

```typescript
// libs/cli/src/commands/entity.ts
import { Command } from 'commander';

export function createEntityCommands(): Command {
  const entity = new Command('entity')
    .description('エンティティ管理コマンド');

  // 既存コマンド
  entity
    .command('search <query>')
    .description('エンティティを検索する')
    .option('-t, --type <type>', 'エンティティタイプでフィルタ')
    .option('-l, --limit <number>', '最大件数', '20')
    .action(async (query, options) => {
      // ... existing implementation
    });

  // 🆕 正規化コマンド
  entity
    .command('normalize <name>')
    .description('エンティティ名を正規化する')
    .option('--llm', 'LLMで類似性を確認')
    .option('--dry-run', '実際に保存せずに結果を確認')
    .action(async (name, options) => {
      const spinner = ora('正規化中...').start();
      
      try {
        const normalizer = container.get<EntityNormalizerService>('EntityNormalizer');
        const result = await normalizer.normalize(name, {
          confirmWithLLM: options.llm
        });

        spinner.succeed('正規化完了');
        
        console.log('\n📝 正規化結果:');
        console.log(chalk.gray('─'.repeat(50)));
        console.log(`  元の名前:    ${chalk.yellow(result.original)}`);
        console.log(`  正規化名:    ${chalk.green(result.canonical)}`);
        console.log(`  ソース:      ${result.source}`);
        console.log(`  信頼度:      ${(result.confidence * 100).toFixed(1)}%`);
        
        if (!options.dryRun && result.original !== result.canonical) {
          await normalizer.persistResult(result);
          console.log(chalk.green('\n✓ エイリアスを保存しました'));
        }
      } catch (error) {
        spinner.fail('正規化に失敗しました');
        console.error(chalk.red(error.message));
      }
    });

  entity
    .command('normalize-all')
    .description('すべてのエンティティを一括正規化する')
    .option('-t, --type <type>', 'エンティティタイプでフィルタ')
    .option('--llm', 'LLMで類似性を確認')
    .option('--dry-run', '実際に保存せずに結果を確認')
    .action(async (options) => {
      const spinner = ora('一括正規化中...').start();
      
      try {
        const normalizer = container.get<EntityNormalizerService>('EntityNormalizer');
        const report = await normalizer.normalizeAll({
          entityType: options.type,
          confirmWithLLM: options.llm
        });

        spinner.succeed('一括正規化完了');
        
        console.log('\n📊 正規化レポート:');
        console.log(chalk.gray('─'.repeat(50)));
        console.log(`  処理数:      ${report.totalEntities}`);
        console.log(`  正規化数:    ${chalk.green(report.normalizedCount)}`);
        console.log(`  エラー数:    ${chalk.red(report.errors.length)}`);
        
        if (report.normalizedCount > 0) {
          console.log('\n📝 正規化されたエンティティ（上位10件）:');
          report.results
            .filter(r => r.original !== r.canonical)
            .slice(0, 10)
            .forEach(r => {
              console.log(`  ${chalk.yellow(r.original)} → ${chalk.green(r.canonical)}`);
            });
        }
      } catch (error) {
        spinner.fail('一括正規化に失敗しました');
        console.error(chalk.red(error.message));
      }
    });

  return entity;
}
```

```typescript
// libs/cli/src/commands/path.ts
import { Command } from 'commander';

export function createPathCommands(): Command {
  const path = new Command('path')
    .description('パス探索コマンド');

  path
    .command('find <entity1> <entity2>')
    .description('2つのエンティティ間のパスを検索する')
    .option('-m, --max-hops <number>', '最大ホップ数', '4')
    .option('-r, --relations <types>', '関係タイプでフィルタ（カンマ区切り）')
    .option('-e, --explain', 'パスの説明を生成')
    .option('-j, --json', 'JSON形式で出力')
    .action(async (entity1, entity2, options) => {
      const spinner = ora(`${entity1} から ${entity2} へのパスを検索中...`).start();
      
      try {
        const reasoner = container.get<MultiHopReasonerService>('MultiHopReasoner');
        const result = await reasoner.findRelationPaths(entity1, entity2, {
          maxHops: parseInt(options.maxHops),
          relationTypes: options.relations?.split(',')
        });

        spinner.succeed(`${result.paths.length} 件のパスが見つかりました`);

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log('\n🛤️  パス検索結果:');
        console.log(chalk.gray('─'.repeat(60)));
        console.log(`  検索時間:  ${result.executionTime}ms`);
        console.log(`  パス数:    ${result.paths.length}`);
        console.log(`  平均ホップ: ${result.statistics.averageHops.toFixed(1)}`);
        
        if (result.paths.length > 0) {
          console.log('\n📍 パス一覧:');
          result.paths.slice(0, 5).forEach((p, i) => {
            console.log(`\n  パス ${i + 1} (${p.hops} ホップ):`);
            const pathStr = p.nodes.map((n, j) => {
              const rel = p.relations[j];
              return j === p.nodes.length - 1 
                ? chalk.cyan(n.name)
                : `${chalk.cyan(n.name)} -[${chalk.yellow(rel?.type)}]-> `;
            }).join('');
            console.log(`    ${pathStr}`);
          });
        }

        if (options.explain && result.paths.length > 0) {
          const explainer = container.get<PathExplainer>('PathExplainer');
          console.log('\n📖 パスの説明:');
          for (const p of result.paths.slice(0, 3)) {
            const explanation = await explainer.explain(p);
            console.log(chalk.gray('─'.repeat(40)));
            console.log(explanation.naturalLanguage);
          }
        }
      } catch (error) {
        spinner.fail('パス検索に失敗しました');
        console.error(chalk.red(error.message));
      }
    });

  return path;
}
```

```typescript
// libs/cli/src/commands/analyze.ts
import { Command } from 'commander';

export function createAnalyzeCommands(): Command {
  const analyze = new Command('analyze')
    .description('分析コマンド');

  analyze
    .command('gaps')
    .description('研究ギャップを分析する')
    .option('-d, --domain <domain>', '分析対象ドメイン')
    .option('-l, --limit <number>', '最大結果数', '20')
    .option('-p, --proposals', '研究提案を生成')
    .option('-j, --json', 'JSON形式で出力')
    .action(async (options) => {
      const spinner = ora('研究ギャップを分析中...').start();
      
      try {
        const analyzer = container.get<ResearchGapAnalyzerService>('GapAnalyzer');
        const result = await analyzer.analyze(options.domain);

        spinner.succeed('分析完了');

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log('\n🔍 研究ギャップ分析レポート:');
        console.log(chalk.gray('═'.repeat(60)));
        console.log(`  総ギャップ数: ${result.gaps.length}`);
        console.log('\n  重要度別:');
        console.log(`    高:   ${chalk.red(result.statistics.bySeverity.high || 0)}`);
        console.log(`    中:   ${chalk.yellow(result.statistics.bySeverity.medium || 0)}`);
        console.log(`    低:   ${chalk.green(result.statistics.bySeverity.low || 0)}`);

        console.log('\n📋 主要なギャップ:');
        result.gaps.slice(0, parseInt(options.limit)).forEach((gap, i) => {
          const severityColor = {
            high: chalk.red,
            medium: chalk.yellow,
            low: chalk.green
          }[gap.severity];
          
          console.log(chalk.gray('─'.repeat(50)));
          console.log(`  ${i + 1}. ${gap.description}`);
          console.log(`     タイプ: ${gap.type}`);
          console.log(`     重要度: ${severityColor(gap.severity)}`);
          console.log(`     関連:   ${gap.relatedEntities.join(', ')}`);
        });

        if (options.proposals) {
          const proposals = await analyzer.generateResearchProposals(
            result.gaps.slice(0, 5), 
            5
          );
          
          console.log('\n💡 研究提案:');
          proposals.forEach((p, i) => {
            console.log(chalk.gray('─'.repeat(50)));
            console.log(`  ${i + 1}. ${chalk.bold(p.title)}`);
            console.log(`     ${p.objective}`);
          });
        }
      } catch (error) {
        spinner.fail('分析に失敗しました');
        console.error(chalk.red(error.message));
      }
    });

  analyze
    .command('lifecycle <entity>')
    .description('技術のライフサイクルを分析する')
    .option('-t, --timeline', 'タイムラインを表示')
    .option('-f, --forecast', '将来予測を表示')
    .option('-j, --json', 'JSON形式で出力')
    .action(async (entity, options) => {
      const spinner = ora(`${entity} のライフサイクルを分析中...`).start();
      
      try {
        const tracker = container.get<TechnologyLifecycleTrackerService>('LifecycleTracker');
        const report = await tracker.trackLifecycle(entity);

        spinner.succeed('分析完了');

        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
          return;
        }

        const phaseEmoji = {
          emerging: '🌱',
          growing: '📈',
          mature: '🏛️',
          declining: '📉',
          legacy: '📚'
        }[report.phase.currentPhase];

        console.log(`\n${phaseEmoji} ${chalk.bold(entity)} のライフサイクル分析:`);
        console.log(chalk.gray('═'.repeat(60)));
        console.log(`  現在のフェーズ:   ${chalk.cyan(report.phase.currentPhase)}`);
        console.log(`  フェーズ開始日:   ${report.phase.phaseStartDate.toISOString().split('T')[0]}`);
        console.log(`  信頼度:           ${(report.phase.confidence * 100).toFixed(1)}%`);
        
        console.log('\n📊 メトリクス:');
        console.log(`  総論文数:         ${report.phase.metrics.totalPublications}`);
        console.log(`  昨年の論文数:     ${report.phase.metrics.publicationsLastYear}`);
        console.log(`  成長率:           ${(report.phase.metrics.publicationGrowthRate * 100).toFixed(1)}%`);
        console.log(`  派生技術数:       ${report.phase.metrics.derivativeCount}`);

        if (options.timeline && report.timeline) {
          console.log('\n📅 タイムライン:');
          report.timeline.slice(-10).forEach(event => {
            const dateStr = event.date.toISOString().split('T')[0];
            console.log(`  ${dateStr}  ${event.eventType.padEnd(15)} ${event.description.slice(0, 40)}`);
          });
        }

        if (options.forecast && report.forecast) {
          console.log('\n🔮 将来予測:');
          report.forecast.predictions.forEach(pred => {
            const dateStr = pred.date.toISOString().split('T')[0];
            console.log(`  ${dateStr}  予測フェーズ: ${pred.predictedPhase}`);
          });
        }
      } catch (error) {
        spinner.fail('分析に失敗しました');
        console.error(chalk.red(error.message));
      }
    });

  analyze
    .command('compare <entities...>')
    .description('複数の技術を比較する')
    .option('-j, --json', 'JSON形式で出力')
    .action(async (entities, options) => {
      if (entities.length < 2) {
        console.error(chalk.red('比較には2つ以上のエンティティが必要です'));
        return;
      }

      const spinner = ora('技術を比較中...').start();
      
      try {
        const tracker = container.get<TechnologyLifecycleTrackerService>('LifecycleTracker');
        const comparison = await tracker.compareLifecycles(entities);

        spinner.succeed('比較完了');

        if (options.json) {
          console.log(JSON.stringify(comparison, null, 2));
          return;
        }

        console.log('\n📊 技術比較:');
        console.log(chalk.gray('═'.repeat(70)));
        
        // ヘッダー
        const header = ['指標', ...entities.map(e => e.slice(0, 15).padEnd(15))].join(' | ');
        console.log(header);
        console.log(chalk.gray('─'.repeat(70)));

        // フェーズ比較
        const phases = comparison.lifecycles.map(l => l.phase.currentPhase);
        console.log(['フェーズ', ...phases.map(p => p.padEnd(15))].join(' | '));

        // 論文数比較
        const pubs = comparison.lifecycles.map(l => 
          l.phase.metrics.totalPublications.toString().padEnd(15)
        );
        console.log(['論文数', ...pubs].join(' | '));

        // 成長率比較
        const growth = comparison.lifecycles.map(l => 
          `${(l.phase.metrics.publicationGrowthRate * 100).toFixed(1)}%`.padEnd(15)
        );
        console.log(['成長率', ...growth].join(' | '));

      } catch (error) {
        spinner.fail('比較に失敗しました');
        console.error(chalk.red(error.message));
      }
    });

  analyze
    .command('emerging')
    .description('新興技術を検索する')
    .option('-l, --limit <number>', '最大件数', '10')
    .option('-j, --json', 'JSON形式で出力')
    .action(async (options) => {
      const spinner = ora('新興技術を検索中...').start();
      
      try {
        const tracker = container.get<TechnologyLifecycleTrackerService>('LifecycleTracker');
        const emerging = await tracker.findEmergingTechnologies(parseInt(options.limit));

        spinner.succeed(`${emerging.length} 件の新興技術が見つかりました`);

        if (options.json) {
          console.log(JSON.stringify(emerging, null, 2));
          return;
        }

        console.log('\n🌱 新興技術:');
        console.log(chalk.gray('═'.repeat(60)));
        emerging.forEach((tech, i) => {
          console.log(`  ${i + 1}. ${chalk.cyan(tech.name)}`);
          console.log(`     論文数: ${tech.publicationCount}  活動期間: ${tech.activeMonths}ヶ月`);
        });
      } catch (error) {
        spinner.fail('検索に失敗しました');
        console.error(chalk.red(error.message));
      }
    });

  return analyze;
}
```

### 8.3 CLI Entry Point

```typescript
// libs/cli/src/index.ts
import { Command } from 'commander';
import { createEntityCommands } from './commands/entity.js';
import { createRelationCommands } from './commands/relation.js';
import { createPathCommands } from './commands/path.js';
import { createAnalyzeCommands } from './commands/analyze.js';
import { createGraphCommands } from './commands/graph.js';
import { createCommunityCommands } from './commands/community.js';
import { createMcpCommands } from './commands/mcp.js';

export function createCLI(): Command {
  const program = new Command();
  
  program
    .name('yagokoro')
    .description('YAGOKORO - GenAI GraphRAG Knowledge System')
    .version('2.0.0');

  // Register all command groups
  program.addCommand(createEntityCommands());
  program.addCommand(createRelationCommands());
  program.addCommand(createPathCommands());      // 🆕
  program.addCommand(createAnalyzeCommands());   // 🆕
  program.addCommand(createGraphCommands());
  program.addCommand(createCommunityCommands());
  program.addCommand(createMcpCommands());

  return program;
}
```

---

## 9. Integration Architecture

### 9.1 Dependency Injection Container

```typescript
// libs/shared/src/container.ts
import { Container } from 'inversify';

export const container = new Container();

// Service bindings
container.bind<Neo4jConnection>('Neo4jConnection').to(Neo4jConnection).inSingletonScope();
container.bind<QdrantConnection>('QdrantConnection').to(QdrantConnection).inSingletonScope();
container.bind<LLMClient>('LLMClient').to(OllamaClient).inSingletonScope();

// Phase 1: Normalization
container.bind<RuleNormalizer>('RuleNormalizer').to(RuleNormalizer);
container.bind<SimilarityMatcher>('SimilarityMatcher').to(SimilarityMatcher);
container.bind<AliasTableManager>('AliasTableManager').to(AliasTableManager);
container.bind<EntityNormalizerService>('EntityNormalizer').to(EntityNormalizerService);

// Phase 2: Reasoning
container.bind<BFSPathFinder>('PathFinder').to(BFSPathFinder);
container.bind<PathCache>('PathCache').to(PathCache).inSingletonScope();
container.bind<PathExplainer>('PathExplainer').to(PathExplainer);
container.bind<MultiHopReasonerService>('MultiHopReasoner').to(MultiHopReasonerService);

// Phase 3: Gap Analysis
container.bind<CitationAnalyzer>('CitationAnalyzer').to(CitationAnalyzer);
container.bind<ClusterAnalyzer>('ClusterAnalyzer').to(ClusterAnalyzer);
container.bind<GapDetector>('GapDetector').to(GapDetector);
container.bind<ResearchGapAnalyzerService>('GapAnalyzer').to(ResearchGapAnalyzerService);

// Phase 4: Lifecycle Tracking
container.bind<TimelineAggregator>('TimelineAggregator').to(TimelineAggregator);
container.bind<PhaseDetector>('PhaseDetector').to(PhaseDetector);
container.bind<TrendPredictor>('TrendPredictor').to(TrendPredictor);
container.bind<TechnologyLifecycleTrackerService>('LifecycleTracker').to(TechnologyLifecycleTrackerService);

// Report Generation
container.bind<ReportGenerator>('ReportGenerator').to(ReportGenerator);
```

### 9.2 Configuration Schema

```typescript
// libs/shared/src/config.ts
import { z } from 'zod';

export const ConfigSchema = z.object({
  neo4j: z.object({
    uri: z.string().default('bolt://localhost:7687'),
    username: z.string().default('neo4j'),
    password: z.string(),
    database: z.string().default('neo4j')
  }),
  
  qdrant: z.object({
    url: z.string().default('http://localhost:6333'),
    collection: z.string().default('yagokoro')
  }),
  
  llm: z.object({
    provider: z.enum(['ollama', 'openai', 'anthropic']).default('ollama'),
    model: z.string().default('qwen2.5'),
    baseUrl: z.string().optional(),
    apiKey: z.string().optional()
  }),
  
  normalization: z.object({
    rulesPath: z.string().optional(),
    dictionaryPath: z.string().optional(),
    similarityThreshold: z.number().min(0).max(1).default(0.8),
    confirmWithLLM: z.boolean().default(false)
  }),
  
  reasoning: z.object({
    maxHops: z.number().min(1).max(10).default(4),
    cacheEnabled: z.boolean().default(true),
    cacheTTLMs: z.number().default(3600000),
    cacheMaxSize: z.number().default(1000)
  }),
  
  analysis: z.object({
    gapSeverityThresholds: z.object({
      high: z.number().default(0.9),
      medium: z.number().default(0.7)
    }),
    lifecyclePhaseThresholds: z.object({
      emergingYears: z.number().default(2),
      growthRate: z.number().default(0.2),
      legacyInactiveYears: z.number().default(2)
    })
  }),
  
  mcp: z.object({
    transport: z.enum(['stdio', 'sse']).default('stdio'),
    port: z.number().optional()
  })
});

export type Config = z.infer<typeof ConfigSchema>;
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

```typescript
// libs/normalizer/src/rules/RuleNormalizer.test.ts
describe('RuleNormalizer', () => {
  let normalizer: RuleNormalizer;

  beforeEach(() => {
    normalizer = new RuleNormalizer();
  });

  describe('normalize', () => {
    it('should normalize GPT-4 to GPT4', () => {
      const result = normalizer.normalize('GPT-4');
      expect(result.normalized).toBe('GPT4');
      expect(result.appliedRules.length).toBeGreaterThan(0);
    });

    it('should normalize Chain of Thought to CoT', () => {
      const result = normalizer.normalize('Chain of Thought');
      expect(result.normalized).toBe('CoT');
    });

    it('should handle already normalized entities', () => {
      const result = normalizer.normalize('Transformer');
      expect(result.normalized).toBe('Transformer');
      expect(result.confidence).toBe(0.5);
    });
  });
});
```

### 10.2 Integration Tests

```typescript
// libs/reasoner/src/service/MultiHopReasonerService.integration.test.ts
describe('MultiHopReasonerService Integration', () => {
  let reasoner: MultiHopReasonerService;
  let neo4jConnection: Neo4jConnection;

  beforeAll(async () => {
    neo4jConnection = await createTestNeo4jConnection();
    await seedTestData(neo4jConnection);
    reasoner = new MultiHopReasonerService({
      pathFinder: new BFSPathFinder(neo4jConnection),
      pathCache: new PathCache(),
      pathExplainer: new PathExplainer(mockLLMClient)
    });
  });

  afterAll(async () => {
    await cleanupTestData(neo4jConnection);
    await neo4jConnection.close();
  });

  describe('findRelationPaths', () => {
    it('should find paths between two entities', async () => {
      const result = await reasoner.findRelationPaths('GPT4', 'Transformer');
      
      expect(result.paths.length).toBeGreaterThan(0);
      expect(result.statistics.minHops).toBeGreaterThanOrEqual(1);
    });

    it('should return empty for unconnected entities', async () => {
      const result = await reasoner.findRelationPaths('GPT4', 'NonExistent');
      
      expect(result.paths.length).toBe(0);
    });

    it('should respect maxHops constraint', async () => {
      const result = await reasoner.findRelationPaths('GPT4', 'Transformer', {
        maxHops: 2
      });
      
      expect(result.paths.every(p => p.hops <= 2)).toBe(true);
    });
  });
});
```

### 10.3 E2E Tests

```typescript
// apps/yagokoro/test/e2e.test.ts
describe('YAGOKORO E2E', () => {
  describe('CLI Commands', () => {
    it('should normalize entity via CLI', async () => {
      const result = await runCLI(['entity', 'normalize', 'GPT-4', '--dry-run']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('GPT4');
    });

    it('should find paths via CLI', async () => {
      const result = await runCLI(['path', 'find', 'GPT4', 'Transformer']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('パス');
    });

    it('should analyze gaps via CLI', async () => {
      const result = await runCLI(['analyze', 'gaps', '--limit', '5']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('研究ギャップ');
    });
  });

  describe('MCP Tools', () => {
    let mcpClient: MCPTestClient;

    beforeAll(async () => {
      mcpClient = await createMCPTestClient();
    });

    it('should normalize entity via MCP', async () => {
      const result = await mcpClient.callTool('normalize_entity', {
        entity: 'GPT-4',
        dryRun: true
      });
      
      expect(result.canonical).toBe('GPT4');
    });

    it('should find paths via MCP', async () => {
      const result = await mcpClient.callTool('find_paths', {
        entity1: 'GPT4',
        entity2: 'Transformer',
        maxHops: 3
      });
      
      expect(result.pathsFound).toBeGreaterThan(0);
    });
  });
});
```

---

## 11. Deployment & Operations

### 11.1 Docker Compose (Development)

```yaml
# docker/docker-compose.dev.yml
version: '3.8'

services:
  yagokoro:
    build:
      context: ..
      dockerfile: Dockerfile
    volumes:
      - ../:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - NEO4J_URI=bolt://neo4j:7687
      - QDRANT_URL=http://qdrant:6333
      - OLLAMA_URL=http://ollama:11434
    depends_on:
      - neo4j
      - qdrant
      - ollama

  neo4j:
    image: neo4j:5-community
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      - NEO4J_AUTH=neo4j/password
      - NEO4J_PLUGINS=["apoc", "graph-data-science"]
    volumes:
      - neo4j_data:/data

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama

volumes:
  neo4j_data:
  qdrant_data:
  ollama_data:
```

### 11.2 Monitoring & Observability

```typescript
// libs/shared/src/telemetry/metrics.ts
import { Counter, Histogram, Registry } from 'prom-client';

export const register = new Registry();

// Normalization metrics
export const normalizationCounter = new Counter({
  name: 'yagokoro_normalization_total',
  help: 'Total number of normalizations performed',
  labelNames: ['source', 'success'],
  registers: [register]
});

// Path finding metrics
export const pathFindingDuration = new Histogram({
  name: 'yagokoro_path_finding_duration_seconds',
  help: 'Duration of path finding operations',
  labelNames: ['hops'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

// Cache metrics
export const cacheHitCounter = new Counter({
  name: 'yagokoro_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
  registers: [register]
});
```

---

## 12. Appendix

### A. Glossary

| 用語 | 説明 |
|------|------|
| エンティティ正規化 | 表記揺れのあるエンティティを標準形に統一するプロセス |
| マルチホップ推論 | 複数の関係を経由して間接的な関連性を発見する推論 |
| 研究ギャップ | 未探索または不十分に探索された研究領域 |
| ライフサイクルフェーズ | 技術の成熟度段階（出現期、成長期、成熟期、衰退期、レガシー）|

### B. ADR Index

| ADR | タイトル | ステータス |
|-----|---------|----------|
| ADR-001 | エイリアス保存戦略 | Accepted |
| ADR-002 | パスキャッシング戦略 | Accepted |
| ADR-003 | ギャップ重要度計算 | Accepted |
| ADR-004 | トレンド予測手法 | Accepted |

### C. References

- REQ-002: YAGOKORO v2.0.0 Requirements Specification
- DES-001: YAGOKORO v1.0.0 Design Specification
- steering/tech.ja.md: Technology Stack
- steering/structure.ja.md: Architecture Patterns

---

**Document History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1.0 | 2025-12-30 | YAGOKORO Dev Team | Initial draft |

