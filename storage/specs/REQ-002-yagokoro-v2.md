# REQ-002: YAGOKORO v2.0.0 Requirements Specification

## Document Information

| 項目 | 内容 |
|------|------|
| **Document ID** | REQ-002 |
| **Version** | 0.1.0 (Draft) |
| **Status** | Draft |
| **Created** | 2024-12-30 |
| **Author** | YAGOKORO Development Team |
| **Related Documents** | REQ-001, DES-001, qiita-ai-for-science-graphrag.md |

## 1. Executive Summary

### 1.1 Background

YAGOKORO v1.0.0では、241件のAI論文から244エンティティ・229関係を抽出し、10の分析実験を通じて LazyGraphRAG の有効性を実証した。しかし、以下の課題が明らかになった：

1. **エンティティ正規化の不足**: 表記揺れ（GPT-3/GPT3, CoT/chain-of-thought）によりグラフ接続性が低下
2. **マルチホップ推論の機能不全**: 2-hopパスが0件、間接的関係の発見が困難
3. **研究空白分析の手動性**: カテゴリ分析は可能だが、推奨の自動生成がない
4. **Hype Cycle分析の単発性**: 定期実行・アラート機能がない

### 1.2 Vision

YAGOKORO v2.0.0 は、**AI for Science のための実用的な知識発見プラットフォーム**として、以下を実現する：

- **エンティティ正規化パイプライン**により、グラフ接続性を50%以上向上
- **マルチホップ推論**により、4-hop先までの間接的関係を発見
- **Research Gap Analyzer**により、研究空白と推奨テーマを自動生成
- **Technology Lifecycle Tracker**により、技術成熟度の継続的モニタリングを実現

### 1.3 Success Metrics

| 指標 | v1.0.0 (現状) | v2.0.0 (目標) | 測定方法 |
|------|--------------|---------------|---------|
| グラフ接続性（最大連結成分率） | ~40% | **>80%** | Neo4j クエリ |
| マルチホップパス発見数 | 0件 | **>100件** (2-hop以上) | PathFinder 実行結果 |
| エンティティ正規化率 | 未測定 | **>90%** | 正規化パイプライン出力 |
| 研究空白レポート生成時間 | 手動 | **<5分** (自動) | CLI 実行時間 |
| Hype Cycle 分析自動実行 | 不可 | **月次自動生成** | スケジューラ |

---

## 2. Stakeholders

| Stakeholder | Role | Needs |
|-------------|------|-------|
| 研究者 | Primary User | 論文間の関係発見、研究テーマ推奨 |
| 研究機関管理者 | Decision Maker | 研究投資の優先順位付け |
| データサイエンティスト | Developer | API経由でのグラフ分析 |
| LLM (Claude/ChatGPT) | MCP Client | 知識グラフへのアクセス |

---

## 3. Functional Requirements

### 3.1 FR-001: エンティティ正規化パイプライン (Phase 1) 🔴 Critical

#### 3.1.1 Overview

論文から抽出されたエンティティの表記揺れを統一し、グラフ接続性を向上させる多段階パイプライン。

#### 3.1.2 Requirements

| ID | Requirement | Priority | EARS Format |
|----|-------------|----------|-------------|
| FR-001-01 | **正規表現ベース表記揺れ統一**: システムは、エンティティ名の表記揺れ（GPT-3→GPT3, chain-of-thought→CoT）を正規表現ルールで統一**しなければならない** | P0 | When an entity is extracted, the system shall normalize variant spellings using regex rules |
| FR-001-02 | **類似度ベースマッチング**: システムは、Levenshtein距離が閾値以下のエンティティペアを同一候補として検出**しなければならない** | P0 | When comparing entities, the system shall identify similar entities using Levenshtein distance |
| FR-001-03 | **LLM同一性確認**: システムは、類似度マッチングで検出された候補ペアに対し、LLMで同一性を確認**できなければならない** | P1 | When similar entities are detected, the system shall optionally confirm equivalence using LLM |
| FR-001-04 | **エイリアステーブル構築**: システムは、正規化結果をエイリアステーブルとして永続化**しなければならない** | P0 | The system shall persist normalization results in an alias table |
| FR-001-05 | **インクリメンタル正規化**: システムは、新規エンティティ追加時に既存エイリアステーブルを参照し、インクリメンタルに正規化**しなければならない** | P1 | When a new entity is added, the system shall incrementally normalize using the existing alias table |

#### 3.1.3 Acceptance Criteria

```gherkin
Feature: Entity Normalization Pipeline
  Scenario: Normalize variant spellings
    Given an entity "GPT-3" is extracted
    When the normalization pipeline runs
    Then the entity should be normalized to "GPT3"
    And the alias table should contain "GPT-3" → "GPT3"

  Scenario: Similar entity detection
    Given entities "Chain of Thought" and "chain-of-thought" exist
    When similarity matching runs with threshold 0.8
    Then they should be flagged as potential duplicates

  Scenario: LLM equivalence confirmation
    Given potential duplicates "CoT" and "Chain of Thought"
    When LLM confirmation is requested
    Then LLM should confirm they are equivalent
    And the alias table should be updated
```

#### 3.1.4 Technical Specifications

```typescript
interface EntityNormalizer {
  // Step 1: 正規表現ベース正規化
  normalizeVariants(entity: string): string;
  
  // Step 2: 類似度マッチング
  findSimilarEntities(
    entity: string, 
    candidates: string[], 
    threshold: number
  ): SimilarityMatch[];
  
  // Step 3: LLM同一性確認
  confirmEquivalence(
    entity1: string, 
    entity2: string
  ): Promise<EquivalenceResult>;
  
  // Step 4: エイリアステーブル操作
  buildAliasTable(): Map<string, string>;
  getCanonicalName(alias: string): string;
  addAlias(alias: string, canonical: string): void;
}

interface SimilarityMatch {
  entity: string;
  score: number;  // 0.0 - 1.0
}

interface EquivalenceResult {
  isEquivalent: boolean;
  confidence: number;
  reasoning: string;
}
```

---

### 3.2 FR-002: マルチホップ推論エンジン (Phase 2) 🔴 Critical

#### 3.2.1 Overview

2-hop以上の間接的関係を発見し、隠れた知識のつながりを明らかにする推論エンジン。

#### 3.2.2 Requirements

| ID | Requirement | Priority | EARS Format |
|----|-------------|----------|-------------|
| FR-002-01 | **パスファインダー**: システムは、2つのエンティティ間の最短経路を4-hopまで探索**しなければならない** | P0 | Given two entities, the system shall find the shortest path up to 4 hops |
| FR-002-02 | **全パス列挙**: システムは、指定されたhop数以内の全パスを列挙**できなければならない** | P1 | The system shall enumerate all paths within a specified hop limit |
| FR-002-03 | **重み付きトラバーサル**: システムは、関係の信頼度スコアを考慮した経路探索**ができなければならない** | P1 | The system shall perform weighted traversal considering confidence scores |
| FR-002-04 | **パス説明生成**: システムは、発見されたパスの意味をLLMで説明**できなければならない** | P2 | The system shall generate LLM explanations for discovered paths |
| FR-002-05 | **バッチパス探索**: システムは、複数のエンティティペアに対して並列にパス探索**しなければならない** | P1 | The system shall perform batch path finding for multiple entity pairs |

#### 3.2.3 Acceptance Criteria

```gherkin
Feature: Multi-hop Reasoning Engine
  Scenario: Find 2-hop path between entities
    Given entity "BERT" and "GPT-4" exist in the graph
    And "BERT" --USES_TECHNIQUE--> "Transformer"
    And "GPT-4" --USES_TECHNIQUE--> "Transformer"
    When finding paths between "BERT" and "GPT-4" up to 2 hops
    Then a path "BERT -> Transformer -> GPT-4" should be found

  Scenario: Generate path explanation
    Given a path "BERT -> Transformer -> GPT-4"
    When explanation is requested
    Then LLM should generate "BERT and GPT-4 are connected through their shared use of Transformer architecture"
```

#### 3.2.4 Technical Specifications

```typescript
interface MultiHopReasoner {
  // 最短経路探索
  findShortestPath(
    source: string,
    target: string,
    maxHops: number
  ): Promise<Path | null>;
  
  // 全パス列挙
  findAllPaths(
    source: string,
    target: string,
    maxHops: number,
    limit?: number
  ): Promise<Path[]>;
  
  // 重み付き探索
  findWeightedPath(
    source: string,
    target: string,
    maxHops: number,
    weightFunction: (relation: Relation) => number
  ): Promise<WeightedPath | null>;
  
  // パス説明生成
  explainPath(path: Path): Promise<PathExplanation>;
  
  // バッチ探索
  batchFindPaths(
    pairs: Array<{source: string, target: string}>,
    maxHops: number
  ): Promise<Map<string, Path[]>>;
}

interface Path {
  nodes: string[];
  edges: Relation[];
  length: number;
}

interface WeightedPath extends Path {
  totalWeight: number;
}

interface PathExplanation {
  summary: string;
  significance: string;
  confidence: number;
}
```

---

### 3.3 FR-003: Research Gap Analyzer (Phase 3) 🟡 High

#### 3.3.1 Overview

研究空白（Research Gap）を自動検出し、推奨研究テーマを生成する分析ツール。

#### 3.3.2 Requirements

| ID | Requirement | Priority | EARS Format |
|----|-------------|----------|-------------|
| FR-003-01 | **カテゴリカバレッジ分析**: システムは、定義されたカテゴリに対する論文カバレッジを計算**しなければならない** | P0 | The system shall calculate paper coverage for defined categories |
| FR-003-02 | **研究空白検出**: システムは、カバレッジが閾値以下のカテゴリを研究空白として検出**しなければならない** | P0 | The system shall detect research gaps where coverage is below threshold |
| FR-003-03 | **技術組み合わせ分析**: システムは、未探索の技術組み合わせを特定**しなければならない** | P1 | The system shall identify unexplored technology combinations |
| FR-003-04 | **ヒートマップ生成**: システムは、カテゴリ別カバレッジをヒートマップとして可視化**できなければならない** | P1 | The system shall visualize category coverage as a heatmap |
| FR-003-05 | **研究テーマ推奨**: システムは、研究空白に基づいて推奨研究テーマをLLMで生成**しなければならない** | P0 | The system shall generate recommended research themes using LLM |
| FR-003-06 | **優先度スコアリング**: システムは、研究空白に対して投資優先度スコアを算出**しなければならない** | P1 | The system shall calculate investment priority scores for research gaps |

#### 3.3.3 Acceptance Criteria

```gherkin
Feature: Research Gap Analyzer
  Scenario: Detect research gap
    Given category "Multimodal Safety" has 2 papers
    And category "LLM" has 150 papers
    When research gap analysis runs
    Then "Multimodal Safety" should be flagged as a research gap
    And priority score should be calculated

  Scenario: Generate research theme recommendations
    Given research gaps ["Multimodal Safety", "Efficient Fine-tuning"]
    When recommendation generation runs
    Then LLM should generate 3-5 specific research themes
    And each theme should include rationale and potential impact
```

#### 3.3.4 Technical Specifications

```typescript
interface ResearchGapAnalyzer {
  // カテゴリカバレッジ計算
  calculateCoverage(
    categories: string[]
  ): Promise<Map<string, CategoryCoverage>>;
  
  // 研究空白検出
  detectGaps(
    coverageThreshold: number
  ): Promise<ResearchGap[]>;
  
  // 技術組み合わせ分析
  analyzeUnexploredCombinations(
    techniques: string[],
    minCooccurrence: number
  ): Promise<TechniqueCombination[]>;
  
  // ヒートマップデータ生成
  generateHeatmapData(): Promise<HeatmapData>;
  
  // 研究テーマ推奨
  recommendResearchThemes(
    gaps: ResearchGap[],
    count: number
  ): Promise<ResearchRecommendation[]>;
}

interface CategoryCoverage {
  category: string;
  paperCount: number;
  entityCount: number;
  coverageScore: number;  // 0.0 - 1.0
  trend: 'growing' | 'stable' | 'declining';
}

interface ResearchGap {
  category: string;
  coverageScore: number;
  priorityScore: number;
  relatedCategories: string[];
  potentialImpact: 'high' | 'medium' | 'low';
}

interface ResearchRecommendation {
  theme: string;
  description: string;
  rationale: string;
  potentialImpact: string;
  suggestedApproaches: string[];
  relatedGaps: string[];
}
```

---

### 3.4 FR-004: Technology Lifecycle Tracker (Phase 4) 🟡 High

#### 3.4.1 Overview

技術の成熟度（Hype Cycle）を継続的にモニタリングし、投資判断を支援するトラッカー。

#### 3.4.2 Requirements

| ID | Requirement | Priority | EARS Format |
|----|-------------|----------|-------------|
| FR-004-01 | **Hype Cycle ステージ判定**: システムは、技術のHype Cycleステージ（黎明期/過熱期/幻滅期/回復期/安定期）を判定**しなければならない** | P0 | The system shall determine the Hype Cycle stage for each technology |
| FR-004-02 | **成熟度スコア算出**: システムは、各技術に対して成熟度スコア（0-100）を算出**しなければならない** | P0 | The system shall calculate a maturity score (0-100) for each technology |
| FR-004-03 | **定期レポート生成**: システムは、月次/四半期でのHype Cycleレポートを自動生成**できなければならない** | P1 | The system shall generate periodic Hype Cycle reports (monthly/quarterly) |
| FR-004-04 | **ステージ遷移アラート**: システムは、技術がステージ遷移した場合にアラートを生成**しなければならない** | P1 | The system shall generate alerts when a technology transitions between stages |
| FR-004-05 | **投資優先度スコアカード**: システムは、各技術に対して投資優先度スコアカードを生成**しなければならない** | P1 | The system shall generate investment priority scorecards |
| FR-004-06 | **時系列トレンドグラフ**: システムは、技術の成熟度推移を時系列グラフで可視化**できなければならない** | P2 | The system shall visualize maturity trends as time-series graphs |

#### 3.4.3 Acceptance Criteria

```gherkin
Feature: Technology Lifecycle Tracker
  Scenario: Determine Hype Cycle stage
    Given technology "Chain of Thought" with:
      | Metric | Value |
      | publication_growth_rate | -20% |
      | citation_velocity | declining |
      | industry_adoption | moderate |
    When Hype Cycle analysis runs
    Then stage should be "Trough of Disillusionment"
    And maturity score should be between 40-50

  Scenario: Generate transition alert
    Given technology "LoRA" was in "Peak of Inflated Expectations"
    And current analysis shows "Slope of Enlightenment"
    When comparison runs
    Then an alert should be generated
    And notification should include stage change details

  Scenario: Generate monthly report
    Given it is the first day of the month
    When periodic report job runs
    Then a comprehensive Hype Cycle report should be generated
    And report should include all tracked technologies
```

#### 3.4.4 Technical Specifications

```typescript
interface TechnologyLifecycleTracker {
  // Hype Cycle ステージ判定
  determineStage(
    technology: string
  ): Promise<HypeCycleStage>;
  
  // 成熟度スコア算出
  calculateMaturityScore(
    technology: string
  ): Promise<MaturityScore>;
  
  // 定期レポート生成
  generatePeriodicReport(
    period: 'monthly' | 'quarterly',
    technologies?: string[]
  ): Promise<HypeCycleReport>;
  
  // ステージ遷移検出
  detectStageTransitions(
    since: Date
  ): Promise<StageTransition[]>;
  
  // 投資優先度スコアカード
  generateScorecard(
    technology: string
  ): Promise<InvestmentScorecard>;
  
  // 時系列データ取得
  getMaturityHistory(
    technology: string,
    from: Date,
    to: Date
  ): Promise<MaturityDataPoint[]>;
}

type HypeCycleStageType = 
  | 'Innovation Trigger'      // 黎明期
  | 'Peak of Inflated Expectations'  // 過熱期
  | 'Trough of Disillusionment'      // 幻滅期
  | 'Slope of Enlightenment'         // 回復期
  | 'Plateau of Productivity';       // 安定期

interface HypeCycleStage {
  stage: HypeCycleStageType;
  confidence: number;
  indicators: StageIndicator[];
}

interface MaturityScore {
  score: number;  // 0-100
  components: {
    publicationGrowth: number;
    citationVelocity: number;
    industryAdoption: number;
    communityActivity: number;
  };
}

interface StageTransition {
  technology: string;
  fromStage: HypeCycleStageType;
  toStage: HypeCycleStageType;
  transitionDate: Date;
  evidence: string[];
}

interface InvestmentScorecard {
  technology: string;
  overallScore: number;  // 0-100
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'reduce' | 'avoid';
  rationale: string;
  risks: string[];
  opportunities: string[];
  timeHorizon: 'short' | 'medium' | 'long';
}
```

---

### 3.5 FR-005: Enhanced MCP Tools 🟢 Medium

#### 3.5.1 Overview

新機能をMCP（Model Context Protocol）経由でLLM（Claude/ChatGPT）から利用可能にする。

#### 3.5.2 Requirements

| ID | Requirement | Priority | EARS Format |
|----|-------------|----------|-------------|
| FR-005-01 | **normalizeEntity ツール**: MCPクライアントは、エンティティ正規化を実行**できなければならない** | P1 | MCP clients shall be able to invoke entity normalization |
| FR-005-02 | **findMultiHopPath ツール**: MCPクライアントは、マルチホップパス探索を実行**できなければならない** | P1 | MCP clients shall be able to find multi-hop paths |
| FR-005-03 | **analyzeResearchGaps ツール**: MCPクライアントは、研究空白分析を実行**できなければならない** | P1 | MCP clients shall be able to analyze research gaps |
| FR-005-04 | **getTechnologyLifecycle ツール**: MCPクライアントは、技術のHype Cycle情報を取得**できなければならない** | P1 | MCP clients shall be able to get technology lifecycle information |
| FR-005-05 | **generateResearchRecommendations ツール**: MCPクライアントは、研究テーマ推奨を生成**できなければならない** | P2 | MCP clients shall be able to generate research recommendations |

#### 3.5.3 MCP Tool Definitions

```typescript
const mcpTools = {
  normalizeEntity: {
    name: 'normalizeEntity',
    description: 'Normalize entity name and find canonical form',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string', description: 'Entity name to normalize' },
        confirmWithLLM: { type: 'boolean', default: false }
      },
      required: ['entityName']
    }
  },
  
  findMultiHopPath: {
    name: 'findMultiHopPath',
    description: 'Find paths between two entities up to N hops',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Source entity' },
        target: { type: 'string', description: 'Target entity' },
        maxHops: { type: 'number', default: 4 },
        includeExplanation: { type: 'boolean', default: true }
      },
      required: ['source', 'target']
    }
  },
  
  analyzeResearchGaps: {
    name: 'analyzeResearchGaps',
    description: 'Analyze research gaps and coverage',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Research domain' },
        coverageThreshold: { type: 'number', default: 0.1 },
        includeRecommendations: { type: 'boolean', default: true }
      },
      required: ['domain']
    }
  },
  
  getTechnologyLifecycle: {
    name: 'getTechnologyLifecycle',
    description: 'Get Hype Cycle stage and maturity score',
    inputSchema: {
      type: 'object',
      properties: {
        technology: { type: 'string', description: 'Technology name' },
        includeHistory: { type: 'boolean', default: false },
        includeScorecard: { type: 'boolean', default: false }
      },
      required: ['technology']
    }
  }
};
```

---

### 3.6 FR-006: Enhanced CLI Commands 🟢 Medium

#### 3.6.1 Requirements

| ID | Requirement | Priority | EARS Format |
|----|-------------|----------|-------------|
| FR-006-01 | **yagokoro normalize**: CLIから、エンティティ正規化パイプラインを実行**できなければならない** | P1 | CLI users shall be able to run entity normalization |
| FR-006-02 | **yagokoro path**: CLIから、マルチホップパス探索を実行**できなければならない** | P1 | CLI users shall be able to find multi-hop paths |
| FR-006-03 | **yagokoro gaps**: CLIから、研究空白分析を実行**できなければならない** | P1 | CLI users shall be able to analyze research gaps |
| FR-006-04 | **yagokoro lifecycle**: CLIから、Hype Cycle分析を実行**できなければならない** | P1 | CLI users shall be able to run lifecycle analysis |
| FR-006-05 | **yagokoro report**: CLIから、包括的レポートを生成**できなければならない** | P2 | CLI users shall be able to generate comprehensive reports |

#### 3.6.2 CLI Specifications

```bash
# Entity Normalization
yagokoro normalize --all                    # 全エンティティを正規化
yagokoro normalize --entity "GPT-3"         # 特定エンティティを正規化
yagokoro normalize --dry-run                # 変更をプレビュー
yagokoro normalize --export aliases.json    # エイリアステーブルをエクスポート

# Multi-hop Path Finding
yagokoro path --from "BERT" --to "GPT-4"           # 2エンティティ間のパス
yagokoro path --from "BERT" --to "GPT-4" --max-hops 4
yagokoro path --from "BERT" --to "GPT-4" --explain  # LLM説明付き
yagokoro path --batch pairs.json                   # バッチ実行

# Research Gap Analysis
yagokoro gaps --domain "Generative AI"             # ドメイン指定分析
yagokoro gaps --threshold 0.1                      # カバレッジ閾値
yagokoro gaps --recommend                          # 研究テーマ推奨
yagokoro gaps --heatmap output.html               # ヒートマップ出力

# Technology Lifecycle
yagokoro lifecycle --technology "Transformer"      # 特定技術の分析
yagokoro lifecycle --all                           # 全技術の分析
yagokoro lifecycle --report monthly                # 月次レポート
yagokoro lifecycle --scorecard "LoRA"              # 投資スコアカード

# Comprehensive Report
yagokoro report --type full                        # 全分析を含むレポート
yagokoro report --type gaps                        # 研究空白レポート
yagokoro report --type lifecycle                   # Hype Cycleレポート
yagokoro report --format markdown --output report.md
```

---

## 4. Non-Functional Requirements

### 4.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | エンティティ正規化（1000エンティティ） | < 30秒 |
| NFR-002 | マルチホップパス探索（4-hop） | < 5秒/ペア |
| NFR-003 | 研究空白分析 | < 60秒 |
| NFR-004 | Hype Cycleレポート生成 | < 120秒 |

### 4.2 Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-005 | 対応論文数 | 10,000件+ |
| NFR-006 | 対応エンティティ数 | 50,000件+ |
| NFR-007 | 対応関係数 | 200,000件+ |

### 4.3 Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-008 | エンティティ正規化精度 | > 90% |
| NFR-009 | パス探索成功率 | > 95% |
| NFR-010 | Hype Cycle判定精度 | > 80% |

### 4.4 Maintainability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-011 | テストカバレッジ | > 80% |
| NFR-012 | ドキュメントカバレッジ | 全public API |

---

## 5. Constraints

### 5.1 Technical Constraints

- **データベース**: Neo4j 5.x, Qdrant 1.x
- **ランタイム**: Node.js 20+, TypeScript 5.x
- **LLM**: Ollama (ローカル) / OpenAI API / Anthropic API
- **NLP**: compromise.js (ブラウザ/Node.js両対応)

### 5.2 Business Constraints

- **コスト**: インデックス構築時LLM使用禁止（LazyGraphRAGの原則維持）
- **ライセンス**: MIT License互換のライブラリのみ使用

---

## 6. Dependencies

### 6.1 External Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| neo4j-driver | ^5.x | Graph database access |
| @qdrant/js-client-rest | ^1.x | Vector database access |
| compromise | ^14.x | NLP processing |
| @modelcontextprotocol/sdk | ^1.x | MCP server |
| fastest-levenshtein | ^1.x | String similarity |

### 6.2 Internal Dependencies

- **@yagokoro/domain**: Entity definitions
- **@yagokoro/neo4j**: Graph operations
- **@yagokoro/vector**: Vector operations
- **@yagokoro/graphrag**: Query engines

---

## 7. Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| エンティティ正規化の精度不足 | High | Medium | 多段階パイプライン、LLM確認ステップ |
| マルチホップ探索の計算量爆発 | High | Medium | パス長制限、プルーニング戦略 |
| Hype Cycle判定の主観性 | Medium | High | 複数指標の組み合わせ、信頼度スコア |
| 大規模データでの性能劣化 | High | Medium | インデックス最適化、キャッシュ戦略 |

---

## 8. Timeline (Draft)

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Entity Normalization | 2 weeks | FR-001, NFR-008 |
| Phase 2: Multi-hop Reasoning | 2 weeks | FR-002, NFR-002 |
| Phase 3: Research Gap Analyzer | 2 weeks | FR-003 |
| Phase 4: Lifecycle Tracker | 2 weeks | FR-004 |
| Phase 5: MCP/CLI Integration | 1 week | FR-005, FR-006 |
| Phase 6: Testing & Documentation | 1 week | NFR-011, NFR-012 |

**Total Estimated Duration**: 10 weeks

---

## 9. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Tech Lead | | | |
| QA Lead | | | |

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| Entity Normalization | 同一概念を指す異なる表記を統一するプロセス |
| Multi-hop Reasoning | グラフ上で複数のエッジを経由して間接的関係を発見する推論 |
| Research Gap | 研究カバレッジが低い領域（研究空白） |
| Hype Cycle | Gartnerが提唱する技術成熟度モデル |
| LazyGraphRAG | インデックス構築時にLLM不使用のGraphRAGアーキテクチャ |

## Appendix B: Related Documents

- [REQ-001: YAGOKORO v1.0.0 Requirements](REQ-001-genai-graphrag-system.md)
- [DES-001: YAGOKORO v1.0.0 Design](DES-001-genai-graphrag-system.md)
- [AI for Science Article](../outputs/qiita-ai-for-science-graphrag.md)
