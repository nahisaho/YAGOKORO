# Requirements Specification: YAGOKORO v3.0.0

**Document ID**: REQ-002
**Feature**: yagokoro-v3
**Version**: 1.0
**Status**: Draft
**Created**: 2025-12-30
**Author**: GitHub Copilot

---

## 1. Executive Summary

### 1.1 Background

YAGOKORO v2.0.0では、v1で発見されたエンティティ正規化問題を解決する6つの新機能を実装しました。しかし、以下の残課題が明らかになっています：

| 残課題 | v2での状態 | v3での目標 |
|--------|-----------|-----------|
| データ密度の向上 | 229関係では疎結合 | 自動関係抽出による高密度化 |
| LLM確認ステップ | 正規化は自動のみ | Human-in-the-Loop確認 |
| リアルタイム更新 | バッチ処理のみ | 新論文の自動取り込み |
| MCPツール拡充 | 基本ツールのみ | v2新機能のMCP公開 |

### 1.2 Vision

**v3 Vision Statement**: 「知識グラフの自動成長」と「外部AIシステムとの完全統合」を実現し、AI for Scienceを加速するプラットフォームを構築する

### 1.3 Scope

**In Scope**:
- 自動関係抽出による知識グラフの高密度化
- arXiv/Semantic Scholarからの新論文自動取り込み
- v2新機能（NLQ、マルチホップ推論、Gap分析等）のMCPツール化
- Human-in-the-Loop確認ワークフロー
- インクリメンタル更新パイプライン

**Out of Scope**:
- 複数ドメイン対応（AI以外の分野）
- マルチテナント対応
- 商用ライセンス機能

---

## 2. Feature Categories

### 2.1 Feature Overview

| ID | Feature Name | Priority | Category |
|----|--------------|----------|----------|
| F-001 | 自動関係抽出 (Auto-Relation Extraction) | P0 | Data Enrichment |
| F-002 | リアルタイム論文取り込み (Paper Ingestion) | P0 | Data Pipeline |
| F-003 | MCPツール拡充 (MCP Tool Expansion) | P0 | Integration |
| F-004 | Human-in-the-Loop確認 (HITL Verification) | P1 | Quality |
| F-005 | インクリメンタル更新 (Incremental Update) | P1 | Data Pipeline |
| F-006 | クエリキャッシュ (Query Cache) | P2 | Performance |

---

## 3. Requirements by Feature

### 3.1 F-001: 自動関係抽出 (Auto-Relation Extraction)

#### 3.1.1 Problem Statement

v2では、エンティティ間の関係が**229件**と疎結合であり、マルチホップ推論の効果が限定的でした。実験3（マルチホップ推論）では、4ホップ探索でも**0件**のパスしか発見できませんでした。

**根本原因**:
- 論文のabstractからの関係抽出のみ
- 暗黙的な関係（技術の派生、組織の協力等）が未抽出
- エンティティ間の共起情報を活用していない

#### 3.1.2 Solution Overview

LLMを活用した高度な関係抽出パイプラインを実装し、以下の関係タイプを自動検出：

```
┌─────────────────────────────────────────────────────────────┐
│                 Auto-Relation Extraction                    │
├─────────────────────────────────────────────────────────────┤
│  Input: Entity pairs + Context documents                    │
│                                                             │
│  1. Co-occurrence Analysis                                  │
│     └── 同一文書内でのエンティティ共起を検出                  │
│                                                             │
│  2. LLM Relation Inference                                  │
│     └── 共起ペアに対してLLMで関係タイプを推論                │
│                                                             │
│  3. Confidence Scoring                                      │
│     └── 複数ソースからの確認で信頼度スコアを算出             │
│                                                             │
│  4. Validation Pipeline                                     │
│     └── 既存知識グラフとの整合性検証                        │
│                                                             │
│  Output: New relations with confidence scores               │
└─────────────────────────────────────────────────────────────┘
```

#### 3.1.3 EARS Requirements

**REQ-002-001**: 共起分析
- **Type**: Event-driven
- **Statement**: WHEN two or more entities appear in the same document section, the system SHALL detect the co-occurrence and create a candidate relation pair.
- **Acceptance Criteria**:
  - AC1: 同一段落内の2エンティティ共起を100%検出
  - AC2: 共起回数と文書数をメタデータとして記録
  - AC3: 処理速度: 1000文書/分以上
- **Priority**: P0
- **Trace**: DES-002-001, TEST-002-001

**REQ-002-002**: LLM関係推論
- **Type**: Event-driven
- **Statement**: WHEN a candidate relation pair is detected, the system SHALL use LLM to infer the relationship type from predefined categories.
- **Acceptance Criteria**:
  - AC1: 以下の関係タイプを推論可能:
    - DERIVED_FROM (技術派生)
    - INFLUENCED_BY (影響関係)
    - DEVELOPED_BY (開発者関係)
    - USES_TECHNIQUE (技術使用)
    - COLLABORATED_WITH (協力関係)
    - EVOLVED_INTO (進化関係)
    - COMPETES_WITH (競合関係)
    - BASED_ON (基盤関係)
  - AC2: 各推論に信頼度スコア(0.0-1.0)を付与
  - AC3: 推論根拠をテキストで記録
- **Priority**: P0
- **Trace**: DES-002-002, TEST-002-002

**REQ-002-003**: 信頼度スコアリング
- **Type**: Event-driven
- **Statement**: WHEN a relation is inferred, the system SHALL calculate a confidence score based on multiple factors.
- **Acceptance Criteria**:
  - AC1: スコア計算要素:
    - 共起頻度 (weight: 0.3)
    - LLM推論確信度 (weight: 0.3)
    - ソース文書の信頼性 (weight: 0.2)
    - 既存グラフとの整合性 (weight: 0.2)
  - AC2: スコア0.7以上を自動承認
  - AC3: スコア0.5-0.7をHITLレビュー対象
  - AC4: スコア0.5未満を棄却
- **Priority**: P0
- **Trace**: DES-002-003, TEST-002-003

**REQ-002-004**: 関係検証
- **Type**: Unwanted behavior
- **Statement**: IF an inferred relation contradicts existing knowledge graph data, THEN the system SHALL flag the contradiction and prevent automatic insertion.
- **Acceptance Criteria**:
  - AC1: 矛盾検出率95%以上
  - AC2: 矛盾理由をログに記録
  - AC3: HITLレビューキューに追加
- **Priority**: P0
- **Trace**: DES-002-004, TEST-002-004

---

### 3.2 F-002: リアルタイム論文取り込み (Paper Ingestion)

#### 3.2.1 Problem Statement

v2では、知識グラフの更新がバッチ処理に依存しており、新しい研究論文の反映に時間がかかっていました。AI分野では日々数百件の新論文が公開されており、リアルタイム性の確保が課題です。

#### 3.2.2 Solution Overview

arXivとSemantic Scholar APIを活用した自動論文取り込みパイプライン：

```
┌─────────────────────────────────────────────────────────────┐
│                   Paper Ingestion Pipeline                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                │
│  │ arXiv   │    │Semantic │    │ Manual  │                │
│  │ API     │    │Scholar  │    │ Upload  │                │
│  └────┬────┘    └────┬────┘    └────┬────┘                │
│       │              │              │                      │
│       └──────────────┼──────────────┘                      │
│                      ▼                                     │
│            ┌─────────────────┐                             │
│            │ Deduplication   │                             │
│            │ & Normalization │                             │
│            └────────┬────────┘                             │
│                     ▼                                      │
│            ┌─────────────────┐                             │
│            │ Entity & Relation│                            │
│            │ Extraction      │                             │
│            └────────┬────────┘                             │
│                     ▼                                      │
│            ┌─────────────────┐                             │
│            │ Knowledge Graph │                             │
│            │ Integration     │                             │
│            └─────────────────┘                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2.3 EARS Requirements

**REQ-002-005**: arXiv論文取得
- **Type**: Event-driven
- **Statement**: WHEN a new paper is published on arXiv in AI-related categories (cs.AI, cs.CL, cs.LG, cs.CV), the system SHALL fetch the paper metadata and abstract within 24 hours.
- **Acceptance Criteria**:
  - AC1: 対象カテゴリ: cs.AI, cs.CL, cs.LG, cs.CV, cs.NE
  - AC2: 取得遅延: 24時間以内
  - AC3: メタデータ: タイトル、著者、abstract、DOI、公開日
  - AC4: API制限準拠（3秒間隔）
- **Priority**: P0
- **Trace**: DES-002-005, TEST-002-005

**REQ-002-006**: Semantic Scholar連携
- **Type**: Event-driven
- **Statement**: WHEN a paper is ingested from arXiv, the system SHALL enrich the metadata with citation counts and related papers from Semantic Scholar API.
- **Acceptance Criteria**:
  - AC1: 引用数、被引用論文リストを取得
  - AC2: 関連論文（references, citations）を取得
  - AC3: 著者のh-index、所属組織を取得
  - AC4: API制限準拠（100リクエスト/5分）
- **Priority**: P1
- **Trace**: DES-002-006, TEST-002-006

**REQ-002-007**: 重複検出
- **Type**: Event-driven
- **Statement**: WHEN a paper is ingested, the system SHALL check for duplicates using DOI, title similarity, and author matching.
- **Acceptance Criteria**:
  - AC1: DOI完全一致で重複判定
  - AC2: タイトル類似度0.95以上で重複候補
  - AC3: 著者3名以上一致 + タイトル類似度0.8以上で重複候補
  - AC4: 重複候補はHITLレビュー
- **Priority**: P0
- **Trace**: DES-002-007, TEST-002-007

**REQ-002-008**: スケジュール実行
- **Type**: Ubiquitous
- **Statement**: The system SHALL execute paper ingestion pipeline on a configurable schedule (default: every 6 hours).
- **Acceptance Criteria**:
  - AC1: cronジョブまたはCloud Scheduler対応
  - AC2: 実行間隔: 1時間〜24時間で設定可能
  - AC3: 手動トリガー機能あり
  - AC4: 実行ログをCloud Logging出力
- **Priority**: P1
- **Trace**: DES-002-008, TEST-002-008

---

### 3.3 F-003: MCPツール拡充 (MCP Tool Expansion)

#### 3.3.1 Problem Statement

v2では新機能（NLQ、マルチホップ推論、Gap分析、ハルシネーション検出、ライフサイクル分析）を実装しましたが、これらはまだMCPツールとして公開されていません。外部AIシステム（Claude、ChatGPT等）からv2新機能にアクセスできない状態です。

#### 3.3.2 Solution Overview

v2新機能をMCPツールとして公開：

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Tool Expansion                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  既存ツール (v2)           新規ツール (v3)                  │
│  ├── entity/search         ├── nlq/query                   │
│  ├── entity/get            ├── nlq/cypher                  │
│  ├── relation/search       ├── reasoning/multihop          │
│  ├── relation/get          ├── reasoning/explain           │
│  ├── graph/query           ├── analysis/gaps               │
│  └── community/list        ├── analysis/lifecycle          │
│                            ├── hallucination/check         │
│                            ├── hallucination/verify        │
│                            ├── normalizer/normalize        │
│                            └── normalizer/suggest          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3.3.3 EARS Requirements

**REQ-002-009**: NLQツール
- **Type**: Event-driven
- **Statement**: WHEN an MCP client calls the `nlq/query` tool with a natural language question, the system SHALL return structured query results from the knowledge graph.
- **Acceptance Criteria**:
  - AC1: 日本語/英語の質問に対応
  - AC2: 応答時間: 5秒以内
  - AC3: 結果にCypherクエリを含める
  - AC4: 結果に信頼度スコアを含める
- **Priority**: P0
- **Trace**: DES-002-009, TEST-002-009

**REQ-002-010**: マルチホップ推論ツール
- **Type**: Event-driven
- **Statement**: WHEN an MCP client calls the `reasoning/multihop` tool with source and target entities, the system SHALL return all paths up to specified hops.
- **Acceptance Criteria**:
  - AC1: 最大4ホップまで探索
  - AC2: 複数パスを重要度順に返却
  - AC3: 各パスに自然言語説明を含める
  - AC4: 応答時間: 10秒以内
- **Priority**: P0
- **Trace**: DES-002-010, TEST-002-010

**REQ-002-011**: Gap分析ツール
- **Type**: Event-driven
- **Statement**: WHEN an MCP client calls the `analysis/gaps` tool, the system SHALL return research gap categories with recommendations.
- **Acceptance Criteria**:
  - AC1: 全カテゴリのカバレッジを返却
  - AC2: ギャップカテゴリを優先度順にリスト
  - AC3: 各ギャップに推奨アクションを含める
  - AC4: 応答時間: 3秒以内
- **Priority**: P1
- **Trace**: DES-002-011, TEST-002-011

**REQ-002-012**: ハルシネーション検出ツール
- **Type**: Event-driven
- **Statement**: WHEN an MCP client calls the `hallucination/check` tool with a statement, the system SHALL verify the statement against the knowledge graph and return verification results.
- **Acceptance Criteria**:
  - AC1: 文からトリプルを自動抽出
  - AC2: 知識グラフとの一致/矛盾/不明を判定
  - AC3: 根拠となるソース情報を返却
  - AC4: 応答時間: 5秒以内
- **Priority**: P0
- **Trace**: DES-002-012, TEST-002-012

**REQ-002-013**: ライフサイクル分析ツール
- **Type**: Event-driven
- **Statement**: WHEN an MCP client calls the `analysis/lifecycle` tool with an entity name, the system SHALL return the Hype Cycle stage estimation.
- **Acceptance Criteria**:
  - AC1: 5段階ステージを返却（trigger/peak/trough/slope/plateau）
  - AC2: 推定根拠（指標）を含める
  - AC3: 投資推奨を含める
  - AC4: 応答時間: 3秒以内
- **Priority**: P1
- **Trace**: DES-002-013, TEST-002-013

---

### 3.4 F-004: Human-in-the-Loop確認 (HITL Verification)

#### 3.4.1 Problem Statement

v2では、エンティティ正規化と関係抽出が完全自動化されていますが、LLMの判断ミスを人間が確認・修正するメカニズムがありません。特に以下のケースで問題が発生します：

- 類似度が閾値付近のエンティティペア（誤マージの可能性）
- 信頼度が中程度の関係（誤検出の可能性）
- 新しいエンティティタイプ（学習データにない概念）

#### 3.4.2 Solution Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  HITL Verification Workflow                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  自動処理結果 ─┬─→ 高信頼度 (≥0.7) ─→ 自動承認            │
│               │                                            │
│               ├─→ 中信頼度 (0.5-0.7) ─→ レビューキュー     │
│               │                           │                │
│               │                           ▼                │
│               │                    ┌─────────────┐         │
│               │                    │ Human Review│         │
│               │                    │ Interface   │         │
│               │                    └──────┬──────┘         │
│               │                           │                │
│               │                    ┌──────┴──────┐         │
│               │                    ▼             ▼         │
│               │                 承認          却下         │
│               │                    │             │         │
│               └─→ 低信頼度 (<0.5) ─┼─→ 棄却     │         │
│                                    ▼             ▼         │
│                              知識グラフ更新   学習データ化  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3.4.3 EARS Requirements

**REQ-002-014**: レビューキュー管理
- **Type**: Event-driven
- **Statement**: WHEN an item requires human review, the system SHALL add it to the review queue with context information.
- **Acceptance Criteria**:
  - AC1: キュー項目に以下を含める:
    - 対象データ（エンティティ/関係）
    - 自動判定結果
    - 信頼度スコア
    - 判定根拠
    - 関連コンテキスト
  - AC2: 優先度に基づくソート
  - AC3: キュー容量制限なし
- **Priority**: P1
- **Trace**: DES-002-014, TEST-002-014

**REQ-002-015**: レビューインターフェース
- **Type**: State-driven
- **Statement**: WHILE items exist in the review queue, the system SHALL provide a CLI interface for human reviewers to approve, reject, or modify items.
- **Acceptance Criteria**:
  - AC1: CLI コマンド: `yagokoro review list`, `review approve`, `review reject`, `review modify`
  - AC2: バッチ承認/却下対応
  - AC3: レビュー履歴の記録
  - AC4: レビュアー識別（ユーザー名）
- **Priority**: P1
- **Trace**: DES-002-015, TEST-002-015

**REQ-002-016**: フィードバックループ
- **Type**: Event-driven
- **Statement**: WHEN a human reviewer makes a decision, the system SHALL record the decision as training data for future model improvement.
- **Acceptance Criteria**:
  - AC1: 承認/却下/修正の決定を記録
  - AC2: 決定理由（オプション）を記録
  - AC3: 月次でフィードバックデータをエクスポート
  - AC4: プライバシー準拠（個人情報除外）
- **Priority**: P2
- **Trace**: DES-002-016, TEST-002-016

---

### 3.5 F-005: インクリメンタル更新 (Incremental Update)

#### 3.5.1 Problem Statement

v2では、知識グラフの更新が全データの再処理を必要としており、大規模データセットでは処理時間とコストが問題になります。

#### 3.5.2 EARS Requirements

**REQ-002-017**: 差分検出
- **Type**: Event-driven
- **Statement**: WHEN new papers are ingested, the system SHALL identify only the new or modified entities and relations for processing.
- **Acceptance Criteria**:
  - AC1: 変更検出にハッシュベース比較を使用
  - AC2: 変更なしデータの再処理をスキップ
  - AC3: 差分情報をログに記録
- **Priority**: P1
- **Trace**: DES-002-017, TEST-002-017

**REQ-002-018**: インクリメンタルグラフ更新
- **Type**: Event-driven
- **Statement**: WHEN incremental changes are detected, the system SHALL update only the affected nodes and edges in Neo4j.
- **Acceptance Criteria**:
  - AC1: MERGE クエリによる差分更新
  - AC2: 関連ノードの再計算（影響範囲のみ）
  - AC3: コミュニティの部分再計算
  - AC4: 更新履歴の記録
- **Priority**: P1
- **Trace**: DES-002-018, TEST-002-018

---

### 3.6 F-006: クエリキャッシュ (Query Cache)

#### 3.6.1 EARS Requirements

**REQ-002-019**: キャッシュ管理
- **Type**: Event-driven
- **Statement**: WHEN a query is executed, the system SHALL cache the result with a configurable TTL (default: 1 hour).
- **Acceptance Criteria**:
  - AC1: Redis/Memcachedベースのキャッシュ
  - AC2: TTL: 1分〜24時間で設定可能
  - AC3: キャッシュヒット率の監視
  - AC4: 知識グラフ更新時のキャッシュ無効化
- **Priority**: P2
- **Trace**: DES-002-019, TEST-002-019

---

## 4. Non-Functional Requirements

### 4.1 Performance

**REQ-002-020**: 論文取り込み性能
- **Statement**: The system SHALL process at least 1,000 papers per hour during batch ingestion.
- **Acceptance Criteria**:
  - AC1: エンティティ抽出: 1000件/時
  - AC2: 関係抽出: 500件/時
  - AC3: グラフ更新: 2000ノード/分

**REQ-002-021**: クエリ応答性能
- **Statement**: The system SHALL respond to MCP tool calls within specified time limits.
- **Acceptance Criteria**:
  - AC1: 単純クエリ: 1秒以内
  - AC2: NLQクエリ: 5秒以内
  - AC3: マルチホップ推論: 10秒以内

### 4.2 Reliability

**REQ-002-022**: データ整合性
- **Statement**: The system SHALL maintain 99.9% data consistency between ingestion and knowledge graph.
- **Acceptance Criteria**:
  - AC1: トランザクション制御
  - AC2: 障害時のロールバック
  - AC3: 日次整合性チェック

### 4.3 Security

**REQ-002-023**: API認証
- **Statement**: The system SHALL authenticate all external API calls using API keys.
- **Acceptance Criteria**:
  - AC1: arXiv/Semantic Scholar APIキー管理
  - AC2: Secret Manager統合
  - AC3: キーローテーション対応

---

## 5. Dependencies

### 5.1 External APIs

| API | Purpose | Rate Limit |
|-----|---------|------------|
| arXiv API | 論文メタデータ取得 | 3秒間隔 |
| Semantic Scholar API | 引用情報・著者情報 | 100リクエスト/5分 |
| Ollama/OpenAI API | LLM推論 | モデル依存 |

### 5.2 v2パッケージ依存

| Package | v3での用途 |
|---------|-----------|
| @yagokoro/normalizer | 論文・エンティティの正規化 |
| @yagokoro/nlq | MCPツールのバックエンド |
| @yagokoro/reasoner | マルチホップ推論MCPツール |
| @yagokoro/analyzer | Gap/Lifecycle分析MCPツール |
| @yagokoro/hallucination | 検証MCPツール |

---

## 6. Success Metrics

| Metric | Current (v2) | Target (v3) |
|--------|--------------|-------------|
| 関係数 | 229 | 1,000+ |
| マルチホップ発見率 | 0% | 50%+ |
| 論文取り込み遅延 | 手動 | 24時間以内 |
| MCPツール数 | 6 | 15+ |
| HITLレビュー完了率 | N/A | 95%/週 |

---

## 7. Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: 自動関係抽出 | 2週間 | F-001実装 |
| Phase 2: 論文取り込み | 2週間 | F-002実装 |
| Phase 3: MCPツール | 2週間 | F-003実装 |
| Phase 4: HITL | 1週間 | F-004実装 |
| Phase 5: 最適化 | 1週間 | F-005, F-006実装 |

**Total**: 8週間

---

## 8. Appendix

### 8.1 Requirements Traceability Matrix

| Requirement | Design | Implementation | Test |
|-------------|--------|----------------|------|
| REQ-002-001 | DES-002-001 | libs/extractor | TEST-002-001 |
| REQ-002-002 | DES-002-002 | libs/extractor | TEST-002-002 |
| REQ-002-003 | DES-002-003 | libs/extractor | TEST-002-003 |
| REQ-002-004 | DES-002-004 | libs/extractor | TEST-002-004 |
| REQ-002-005 | DES-002-005 | libs/ingestion | TEST-002-005 |
| REQ-002-006 | DES-002-006 | libs/ingestion | TEST-002-006 |
| REQ-002-007 | DES-002-007 | libs/ingestion | TEST-002-007 |
| REQ-002-008 | DES-002-008 | libs/ingestion | TEST-002-008 |
| REQ-002-009 | DES-002-009 | libs/mcp | TEST-002-009 |
| REQ-002-010 | DES-002-010 | libs/mcp | TEST-002-010 |
| REQ-002-011 | DES-002-011 | libs/mcp | TEST-002-011 |
| REQ-002-012 | DES-002-012 | libs/mcp | TEST-002-012 |
| REQ-002-013 | DES-002-013 | libs/mcp | TEST-002-013 |
| REQ-002-014 | DES-002-014 | libs/hitl | TEST-002-014 |
| REQ-002-015 | DES-002-015 | libs/hitl | TEST-002-015 |
| REQ-002-016 | DES-002-016 | libs/hitl | TEST-002-016 |
| REQ-002-017 | DES-002-017 | libs/pipeline | TEST-002-017 |
| REQ-002-018 | DES-002-018 | libs/pipeline | TEST-002-018 |
| REQ-002-019 | DES-002-019 | libs/cache | TEST-002-019 |

### 8.2 Glossary

| Term | Definition |
|------|------------|
| HITL | Human-in-the-Loop: 人間による確認・修正プロセス |
| Co-occurrence | 同一文書内でのエンティティ共起 |
| Incremental Update | 変更部分のみを更新する差分処理方式 |
| Hype Cycle | Gartner社の技術成熟度モデル |

---

**Document Status**: Draft
**Next Step**: Design Document (DES-002)
