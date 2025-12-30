# Requirements Specification: YAGOKORO v3.0.0

**Document ID**: REQ-003
**Feature**: yagokoro-v3
**Version**: 1.1
**Status**: Draft
**Created**: 2025-12-30
**Updated**: 2025-12-31
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

**REQ-002-024**: 関係タイプ拡張性
- **Type**: Ubiquitous
- **Statement**: The system SHALL support adding new relationship types without code changes through configuration.
- **Acceptance Criteria**:
  - AC1: 関係タイプをYAML/JSON設定ファイルで定義
  - AC2: 新タイプ追加時にLLMプロンプトを自動更新
  - AC3: 既存グラフへの影響なしで新タイプ追加可能
  - AC4: 関係タイプのバリデーションルール定義可能
- **Priority**: P1
- **Trace**: DES-002-024, TEST-002-024

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
  - AC5: **スロットリング**: Token Bucket方式で同時リクエスト制御
  - AC6: **リトライ**: 429エラー時に指数バックオフ（最大5回）
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
  - AC5: **スロットリング**: Sliding Window方式でレート制限
  - AC6: **リトライ**: 429/503エラー時に指数バックオフ（最大3回）
  - AC7: **フォールバック**: API障害時はarXivデータのみで処理続行
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

**REQ-002-025**: 正規化ツール（normalize）
- **Type**: Event-driven
- **Statement**: WHEN an MCP client calls the `normalizer/normalize` tool with an entity name, the system SHALL return the normalized form with confidence score.
- **Acceptance Criteria**:
  - AC1: 入力: エンティティ名（文字列）
  - AC2: 出力: { original, normalized, confidence, aliases[] }
  - AC3: バッチ入力対応（最大100件）
  - AC4: 応答時間: 1秒以内（単一）、5秒以内（バッチ）
- **Priority**: P1
- **Trace**: DES-002-025, TEST-002-025

**REQ-002-026**: 正規化候補提案ツール（suggest）
- **Type**: Event-driven
- **Statement**: WHEN an MCP client calls the `normalizer/suggest` tool with an entity name, the system SHALL return similar entities from the knowledge graph.
- **Acceptance Criteria**:
  - AC1: 入力: エンティティ名（文字列）、threshold（オプション、デフォルト0.7）
  - AC2: 出力: { candidates: [{ name, similarity, type }], total }
  - AC3: 最大10件の候補を返却
  - AC4: 応答時間: 2秒以内
- **Priority**: P2
- **Trace**: DES-002-026, TEST-002-026

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

### 4.4 Error Handling

**REQ-002-027**: エラーハンドリング・リトライ
- **Statement**: The system SHALL implement comprehensive error handling with retry mechanisms for all external API calls.
- **Acceptance Criteria**:
  - AC1: **リトライ戦略**: 指数バックオフ（初期1秒、最大30秒、最大5回）
  - AC2: **Circuit Breaker**: 連続5回失敗で30秒間APIをスキップ
  - AC3: **フォールバック**: 代替データソースまたはキャッシュからの提供
  - AC4: **Dead Letter Queue**: 処理失敗データの保存と再処理機能
  - AC5: **エラー分類**: Transient/Permanent エラーの自動判別

**REQ-002-028**: グレースフルデグラデーション
- **Statement**: IF external APIs are unavailable, THEN the system SHALL continue operating with reduced functionality.
- **Acceptance Criteria**:
  - AC1: arXiv障害時: 既存データでのクエリ応答を継続
  - AC2: Semantic Scholar障害時: 引用情報なしで論文取り込み続行
  - AC3: LLM障害時: ルールベース処理にフォールバック
  - AC4: 障害状態をヘルスチェックエンドポイントで公開

### 4.5 Monitoring

**REQ-002-029**: パイプライン監視
- **Statement**: The system SHALL provide comprehensive monitoring for all data pipelines.
- **Acceptance Criteria**:
  - AC1: **メトリクス収集**: 処理件数、成功率、レイテンシ、キュー深度
  - AC2: **ログ出力**: 構造化ログ（JSON形式）でCloud Logging対応
  - AC3: **アラート**: エラー率5%超過、レイテンシ閾値超過で通知
  - AC4: **ダッシュボード**: Grafana/Cloud Monitoring対応
  - AC5: **トレーシング**: OpenTelemetry対応で分散トレース

**REQ-002-030**: ヘルスチェック
- **Statement**: The system SHALL expose health check endpoints for all services.
- **Acceptance Criteria**:
  - AC1: `/health` エンドポイントで全体ステータス
  - AC2: `/health/ready` で依存サービス接続状態
  - AC3: `/health/live` でプロセス生存確認
  - AC4: 各外部API接続状態を個別表示

---

## 5. Dependencies

### 5.1 Feature Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                  Feature Dependency Graph                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  F-002 (論文取り込み)                                        │
│      │                                                      │
│      ▼                                                      │
│  F-001 (自動関係抽出) ──────────────┐                       │
│      │                             │                       │
│      ▼                             ▼                       │
│  F-004 (HITL確認)            F-003 (MCPツール)              │
│      │                             │                       │
│      └─────────────┬───────────────┘                       │
│                    ▼                                        │
│              F-005 (インクリメンタル更新)                    │
│                    │                                        │
│                    ▼                                        │
│              F-006 (クエリキャッシュ)                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

| 依存元 | 依存先 | 依存内容 |
|--------|--------|----------|
| F-001 | F-002 | 論文データが関係抽出の入力 |
| F-003 | F-001 | 抽出された関係がMCPクエリ結果に反映 |
| F-004 | F-001 | 中信頼度の関係がHITLレビュー対象 |
| F-005 | F-001, F-002 | 差分検出の対象データ |
| F-006 | F-003 | MCPクエリ結果のキャッシュ |

### 5.2 External APIs

| API | Purpose | Rate Limit |
|-----|---------|------------|
| arXiv API | 論文メタデータ取得 | 3秒間隔 |
| Semantic Scholar API | 引用情報・著者情報 | 100リクエスト/5分 |
| Ollama/OpenAI API | LLM推論 | モデル依存 |

### 5.3 v2パッケージ依存

| Package | v3での用途 |
|---------|-----------|
| @yagokoro/normalizer | 論文・エンティティの正規化 |
| @yagokoro/nlq | MCPツールのバックエンド |
| @yagokoro/reasoner | マルチホップ推論MCPツール |
| @yagokoro/analyzer | Gap/Lifecycle分析MCPツール |
| @yagokoro/hallucination | 検証MCPツール |

---

## 6. Success Metrics

| Metric | Current (v2) | Target (v3) | 根拠・算出方法 |
|--------|--------------|-------------|----------------|
| 関係数 | 229 | 1,000+ | 共起分析で平均4関係/エンティティ × 244エンティティ ≈ 1,000 |
| マルチホップ発見率 | 0% | 50%+ | 関係密度4倍でグラフ接続性が指数的に向上（小世界ネットワーク理論） |
| 論文取り込み遅延 | 手動 | 24時間以内 | arXiv更新頻度（1日2回）+ 処理時間（6時間）+ バッファ |
| MCPツール数 | 6 | 15+ | 既存6 + 新規9（NLQ×2, 推論×2, 分析×2, 検証×2, 正規化×1）|
| HITLレビュー完了率 | N/A | 95%/週 | 想定レビュー件数50件/週、1件5分で週4時間の作業量 |

### 6.1 計測方法

| Metric | 計測方法 | 計測頻度 |
|--------|----------|----------|
| 関係数 | Neo4j: `MATCH ()-[r]->() RETURN count(r)` | 日次 |
| マルチホップ発見率 | テストケース10件での成功率 | リリース時 |
| 論文取り込み遅延 | arXiv公開日時 - KG反映日時の差分 | 日次 |
| MCPツール数 | MCP Server manifest.json のツール数 | リリース時 |
| HITLレビュー完了率 | 完了件数 / 発生件数 × 100 | 週次 |

---

## 7. Timeline

### 7.1 段階リリース計画

| Phase | Duration | Deliverables | Release |
|-------|----------|--------------|--------|
| Phase 1: 論文取り込み | 2週間 | F-002実装 | v3.0.0-alpha |
| Phase 2: 自動関係抽出 | 3週間 | F-001実装 | v3.0.0-beta |
| Phase 3: MCPツール | 2週間 | F-003実装 | v3.0.0-rc1 |
| Phase 4: HITL | 2週間 | F-004実装 | v3.0.0-rc2 |
| Phase 5: 最適化 | 2週間 | F-005, F-006実装 | v3.0.0 |
| バッファ | 1週間 | バグ修正・調整 | - |

**Total**: 12週間（バッファ込み）

### 7.2 依存関係を考慮した実行順序

```
Week 1-2:   F-002（論文取り込み）── 他機能の入力データ生成
     │
     ▼
Week 3-5:   F-001（自動関係抽出）── F-002の出力を処理
     │
     ├─────────────────┐
     ▼                 ▼
Week 6-7:   F-003（MCP）    Week 6-7: F-004（HITL）── 並行実施可能
     │                 │
     └────────┬────────┘
              ▼
Week 8-9:   F-005（差分更新）
              │
              ▼
Week 10-11: F-006（キャッシュ）
              │
              ▼
Week 12:    バッファ・最終調整
```

### 7.3 リスクと対策

| リスク | 影響 | 発生確率 | 対策 |
|--------|------|----------|------|
| arXiv API仕様変更 | F-002遅延 | 低 | APIバージョン固定、変更監視 |
| LLM推論精度不足 | F-001品質低下 | 中 | プロンプトチューニング、複数モデル併用 |
| HITL対象件数過多 | レビュー滞留 | 中 | 閾値調整、バッチ承認機能強化 |
| Neo4j性能問題 | F-005遅延 | 低 | インデックス最適化、バッチサイズ調整 |
| 開発リソース不足 | 全体遅延 | 中 | P2機能の後回し、段階リリース |

---

## 8. Appendix

### 8.1 Requirements Traceability Matrix

| Requirement | Design | Implementation | Test |
|-------------|--------|----------------|------|
| REQ-003-001 | DES-003-001 | libs/extractor | TEST-003-001 |
| REQ-003-002 | DES-003-002 | libs/extractor | TEST-003-002 |
| REQ-003-003 | DES-003-003 | libs/extractor | TEST-003-003 |
| REQ-003-004 | DES-003-004 | libs/extractor | TEST-003-004 |
| REQ-003-005 | DES-003-005 | libs/ingestion | TEST-003-005 |
| REQ-003-006 | DES-003-006 | libs/ingestion | TEST-003-006 |
| REQ-003-007 | DES-003-007 | libs/ingestion | TEST-003-007 |
| REQ-003-008 | DES-003-008 | libs/ingestion | TEST-003-008 |
| REQ-003-009 | DES-003-009 | libs/mcp | TEST-003-009 |
| REQ-003-010 | DES-003-010 | libs/mcp | TEST-003-010 |
| REQ-003-011 | DES-003-011 | libs/mcp | TEST-003-011 |
| REQ-003-012 | DES-003-012 | libs/mcp | TEST-003-012 |
| REQ-003-013 | DES-003-013 | libs/mcp | TEST-003-013 |
| REQ-003-014 | DES-003-014 | libs/hitl | TEST-003-014 |
| REQ-003-015 | DES-003-015 | libs/hitl | TEST-003-015 |
| REQ-003-016 | DES-003-016 | libs/hitl | TEST-003-016 |
| REQ-003-017 | DES-003-017 | libs/pipeline | TEST-003-017 |
| REQ-003-018 | DES-003-018 | libs/pipeline | TEST-003-018 |
| REQ-003-019 | DES-003-019 | libs/cache | TEST-003-019 |
| REQ-003-020 | DES-003-020 | libs/ingestion | TEST-003-020 |
| REQ-003-021 | DES-003-021 | libs/mcp | TEST-003-021 |
| REQ-003-022 | DES-003-022 | libs/pipeline | TEST-003-022 |
| REQ-003-023 | DES-003-023 | libs/ingestion | TEST-003-023 |
| REQ-003-024 | DES-003-024 | libs/extractor | TEST-003-024 |
| REQ-003-025 | DES-003-025 | libs/mcp | TEST-003-025 |
| REQ-003-026 | DES-003-026 | libs/mcp | TEST-003-026 |
| REQ-003-027 | DES-003-027 | libs/common | TEST-003-027 |
| REQ-003-028 | DES-003-028 | libs/common | TEST-003-028 |
| REQ-003-029 | DES-003-029 | libs/monitor | TEST-003-029 |
| REQ-003-030 | DES-003-030 | libs/monitor | TEST-003-030 |

### 8.2 Glossary

| Term | Definition |
|------|------------|
| HITL | Human-in-the-Loop: 人間による確認・修正プロセス |
| Co-occurrence | 同一文書内でのエンティティ共起 |
| Incremental Update | 変更部分のみを更新する差分処理方式 |
| Hype Cycle | Gartner社の技術成熟度モデル |
| Circuit Breaker | 連続失敗時にAPIコールを一時停止するパターン |
| Token Bucket | レート制限の実装パターン（トークン消費方式）|
| Sliding Window | レート制限の実装パターン（時間窓方式）|
| Dead Letter Queue | 処理失敗メッセージを保存するキュー |
| Exponential Backoff | リトライ間隔を指数的に増加させる戦略 |
| Graceful Degradation | 障害時に機能を縮退して継続稼働する設計 |

### 8.3 変更履歴

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-30 | GitHub Copilot | 初版作成 |
| 1.1 | 2025-12-30 | GitHub Copilot | レビュー指摘対応（エラーハンドリング、依存関係、リスク、根拠追加）|
| 1.2 | 2025-12-31 | GitHub Copilot | Document ID変更（REQ-002→REQ-003）、Traceability Matrix更新 |

---

**Document Status**: Review Complete
**Next Step**: Design Document (DES-003)
