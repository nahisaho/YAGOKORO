# MUSUBI SDD 改善要求

**Document Type**: 改善要求仕様書 (Improvement Requirements Specification)
**Format**: EARS (Easy Approach to Requirements Syntax)
**Version**: 1.0.0
**Created**: 2025-12-31
**Author**: YAGOKORO v5.0.0 開発経験に基づく

---

## 概要

YAGOKOROプロジェクト（v1.0.0〜v5.0.0）の開発を通じて特定された、MUSUBI SDD（Specification Driven Development）フレームワークの改善要求を定義します。

### 背景

YAGOKOROは5つのメジャーバージョンを通じて以下を実装しました：
- v1.0.0: 基盤構築（ドメインモデル、Neo4j/Qdrant統合）
- v2.0.0: GraphRAG（LazyGraphRAG、MCP基本ツール）
- v3.0.0: 自動化（LLMレス関係抽出、論文自動取り込み）
- v4.0.0: 時系列・研究者（時系列分析、研究者ネットワーク）
- v5.0.0: 多言語（多言語NER、翻訳、クロスリンガルリンキング）

この過程で、MUSUBIワークフローに不足している機能や改善点が明らかになりました。

---

## カテゴリ1: レビューワークフローの追加

### IMP-001: レビューステージのワークフロー統合

**現状の問題**:
現在のMUSUBI SDDワークフローには明示的なレビューステージが存在せず、各フェーズ（Requirements, Design, Tasks, Implement, Validate）間でのレビューゲートが定義されていません。

#### IMP-001-01: 要件レビューゲート

**EARS Pattern**: Event-driven

```
WHEN requirements document is created,
the MUSUBI system SHALL trigger a requirements review gate
that validates EARS format compliance, stakeholder coverage, and acceptance criteria completeness
BEFORE proceeding to design phase.
```

**Acceptance Criteria**:
- [ ] 要件ドキュメント作成後、自動的にレビューゲートがトリガーされる
- [ ] EARS形式の構文チェックが実行される
- [ ] ステークホルダーカバレッジが検証される
- [ ] 受入基準の完全性がチェックされる
- [ ] レビュー結果が記録される

#### IMP-001-02: 設計レビューゲート

**EARS Pattern**: Event-driven

```
WHEN design document is created,
the MUSUBI system SHALL trigger a design review gate
that validates C4 model compliance, ADR documentation, and constitutional article adherence
BEFORE proceeding to task breakdown phase.
```

**Acceptance Criteria**:
- [ ] 設計ドキュメント作成後、レビューゲートがトリガーされる
- [ ] C4モデル（Context, Container, Component, Code）の完全性が検証される
- [ ] ADR（Architecture Decision Record）の存在と品質がチェックされる
- [ ] Constitutional Articles（特にI, II, VII, VIII）への準拠が検証される

#### IMP-001-03: 実装レビューゲート

**EARS Pattern**: Event-driven

```
WHEN implementation sprint is completed,
the MUSUBI system SHALL trigger an implementation review gate
that validates test coverage, traceability, and code quality
BEFORE marking the sprint as complete.
```

**Acceptance Criteria**:
- [ ] Sprint完了時に実装レビューがトリガーされる
- [ ] テストカバレッジが80%以上であることを検証
- [ ] 要件→設計→コード→テストのトレーサビリティが検証される
- [ ] コード品質メトリクス（lint, type check）がパスすることを確認

#### IMP-001-04: レビュープロンプトの追加

**EARS Pattern**: Ubiquitous

```
The MUSUBI system SHALL provide dedicated review prompts:
- #sdd-review-requirements <feature> - Review requirements
- #sdd-review-design <feature> - Review design
- #sdd-review-implementation <feature> - Review implementation
- #sdd-review-all <feature> - Full review cycle
```

**Acceptance Criteria**:
- [ ] 各レビュープロンプトがAGENTS.mdに定義される
- [ ] プロンプト実行時に適切なレビューチェックリストが生成される
- [ ] レビュー結果がstorage/reviews/ディレクトリに保存される

---

## カテゴリ2: ワークフロー可視化と進捗追跡

### IMP-002: ステージ進捗の可視化

#### IMP-002-01: ワークフローダッシュボード

**EARS Pattern**: State-driven

```
WHILE a feature is in development,
the MUSUBI system SHALL maintain a workflow dashboard
that displays current stage, completion percentage, blockers, and next actions.
```

**Acceptance Criteria**:
- [ ] 各機能のワークフローステージが可視化される
- [ ] 完了率（%）が計算・表示される
- [ ] ブロッカーが明示的に表示される
- [ ] 次のアクションが提案される

#### IMP-002-02: ステージ間トランジション記録

**EARS Pattern**: Event-driven

```
WHEN workflow transitions from one stage to another,
the MUSUBI system SHALL record the transition
with timestamp, reviewer, and approval status.
```

**Acceptance Criteria**:
- [ ] ステージ遷移が自動的に記録される
- [ ] タイムスタンプが付与される
- [ ] 承認者（人間またはAI）が記録される
- [ ] 承認ステータスが保存される

---

## カテゴリ3: スプリント管理の強化

### IMP-003: スプリント定義と追跡

#### IMP-003-01: スプリント計画テンプレート

**EARS Pattern**: Ubiquitous

```
The MUSUBI system SHALL provide a sprint planning template
that includes sprint goals, task breakdown, effort estimation, and dependency mapping.
```

**Acceptance Criteria**:
- [ ] スプリント計画テンプレートが提供される
- [ ] スプリントゴールが明確に定義できる
- [ ] タスク分解が要件にトレースできる
- [ ] 工数見積もりが記録できる
- [ ] 依存関係がマッピングできる

#### IMP-003-02: スプリント完了レポート自動生成

**EARS Pattern**: Event-driven

```
WHEN a sprint is marked as complete,
the MUSUBI system SHALL automatically generate a sprint completion report
that includes delivered features, test results, metrics, and lessons learned.
```

**Acceptance Criteria**:
- [ ] スプリント完了時にレポートが自動生成される
- [ ] 配信された機能一覧が含まれる
- [ ] テスト結果（pass/fail/skip）が含まれる
- [ ] パフォーマンスメトリクスが含まれる
- [ ] 振り返り（Lessons Learned）セクションがある

---

## カテゴリ4: トレーサビリティの自動化

### IMP-004: 双方向トレーサビリティマトリクス

#### IMP-004-01: トレーサビリティ自動抽出

**EARS Pattern**: Ubiquitous

```
The MUSUBI system SHALL automatically extract traceability links
from requirement IDs in code comments, test descriptions, and commit messages.
```

**Acceptance Criteria**:
- [ ] コードコメントからREQ-XXX-NNNパターンを自動抽出
- [ ] テスト記述からREQ-XXX-NNNパターンを自動抽出
- [ ] コミットメッセージからREQ-XXX-NNNパターンを自動抽出
- [ ] 抽出結果がトレーサビリティマトリクスに反映される

#### IMP-004-02: トレーサビリティギャップ検出

**EARS Pattern**: State-driven

```
WHILE requirements exist without implementation or tests,
the MUSUBI system SHALL flag traceability gaps
and suggest required actions to close the gaps.
```

**Acceptance Criteria**:
- [ ] 実装のない要件が検出される
- [ ] テストのない要件が検出される
- [ ] ギャップが警告として表示される
- [ ] ギャップを埋めるためのアクションが提案される

---

## カテゴリ5: Constitutional Compliance の強化

### IMP-005: 憲法遵守の自動検証

#### IMP-005-01: Article遵守チェッカー

**EARS Pattern**: Event-driven

```
WHEN code is committed or pull request is created,
the MUSUBI system SHALL validate compliance with Constitutional Articles
and block merge if violations are detected.
```

**Acceptance Criteria**:
- [ ] コミット時にArticle遵守がチェックされる
- [ ] PRマージ前にArticle遵守が検証される
- [ ] 違反がある場合はマージがブロックされる
- [ ] 違反内容と修正方法が提示される

#### IMP-005-02: Phase -1 Gate の自動トリガー

**EARS Pattern**: Event-driven

```
WHEN Article VII (Simplicity) or Article VIII (Anti-Abstraction) violation is detected,
the MUSUBI system SHALL automatically trigger a Phase -1 Gate review process
and notify required reviewers.
```

**Acceptance Criteria**:
- [ ] Article VII/VIII違反が自動検出される
- [ ] Phase -1 Gateレビューが自動的にトリガーされる
- [ ] 必要なレビュアー（system-architect, project-manager等）に通知される
- [ ] 承認/却下のワークフローが提供される

---

## カテゴリ6: ドキュメント生成の自動化

### IMP-006: 実験レポート自動生成

#### IMP-006-01: テスト結果からの実験レポート生成

**EARS Pattern**: Event-driven

```
WHEN test suite execution completes,
the MUSUBI system SHALL generate an experiment report
that includes test summary, performance metrics, and experimental observations.
```

**Acceptance Criteria**:
- [ ] テスト実行後に実験レポートが自動生成される
- [ ] テストサマリー（pass/fail/skip）が含まれる
- [ ] パフォーマンスメトリクス（実行時間、メモリ等）が含まれる
- [ ] 実験観察（Observations）セクションが含まれる

#### IMP-006-02: 技術記事テンプレート生成

**EARS Pattern**: Optional (WHERE)

```
WHERE technical article generation is requested,
the MUSUBI system SHALL generate a publication-ready article
following specified format guidelines (e.g., Qiita, Zenn, Medium).
```

**Acceptance Criteria**:
- [ ] 技術記事テンプレートが生成される
- [ ] 指定されたプラットフォーム形式（Qiita, Zenn, Medium）に対応
- [ ] コードサンプル、図表、ベンチマーク結果が含まれる
- [ ] 公開可能な品質のドラフトが生成される

---

## カテゴリ7: Steering ファイル管理

### IMP-007: Steering 自動同期

#### IMP-007-01: バージョン更新時のSteering自動更新

**EARS Pattern**: Event-driven

```
WHEN a new version is released,
the MUSUBI system SHALL automatically update steering files
to reflect current version, features, and status.
```

**Acceptance Criteria**:
- [ ] バージョンリリース時にsteering/*.mdが自動更新される
- [ ] product.md/tech.md/structure.mdが同期される
- [ ] バージョン番号、機能一覧、ステータスが更新される
- [ ] 更新内容がコミットされる

#### IMP-007-02: Steering 整合性チェック

**EARS Pattern**: Ubiquitous

```
The MUSUBI system SHALL validate consistency between steering files
and ensure tech.md, structure.md, and product.md are synchronized.
```

**Acceptance Criteria**:
- [ ] steering/*.md間の整合性がチェックされる
- [ ] 不整合が検出された場合に警告される
- [ ] 自動修正の提案が行われる

---

## カテゴリ8: エラーハンドリングとリカバリー

### IMP-008: ワークフロー障害対応

#### IMP-008-01: 失敗したステージのリカバリー

**EARS Pattern**: Unwanted behavior (IF-THEN)

```
IF a workflow stage fails (test failure, validation error, etc.),
THEN the MUSUBI system SHALL provide recovery guidance
including root cause analysis and remediation steps.
```

**Acceptance Criteria**:
- [ ] ステージ失敗時に自動的に失敗分析が行われる
- [ ] 根本原因が特定される
- [ ] 修正手順が提案される
- [ ] 失敗履歴が記録される

#### IMP-008-02: ロールバック機能

**EARS Pattern**: Optional (WHERE)

```
WHERE a workflow stage produces incorrect results,
the MUSUBI system SHALL support rollback to previous state
with cleanup of partial changes.
```

**Acceptance Criteria**:
- [ ] 前のステージ状態へのロールバックが可能
- [ ] 部分的な変更がクリーンアップされる
- [ ] ロールバック履歴が記録される

---

## 優先度マトリクス

| カテゴリ | 要件ID | 優先度 | 影響度 | 実装難易度 |
|---------|--------|--------|--------|------------|
| レビューワークフロー | IMP-001-01〜04 | **Critical** | 高 | 中 |
| 進捗可視化 | IMP-002-01〜02 | High | 中 | 低 |
| スプリント管理 | IMP-003-01〜02 | High | 中 | 低 |
| トレーサビリティ | IMP-004-01〜02 | High | 高 | 中 |
| Constitutional | IMP-005-01〜02 | Medium | 高 | 高 |
| ドキュメント生成 | IMP-006-01〜02 | Medium | 中 | 中 |
| Steering管理 | IMP-007-01〜02 | Medium | 中 | 低 |
| エラーハンドリング | IMP-008-01〜02 | Low | 中 | 高 |

---

## 実装提案

### Phase 1: レビューワークフロー（最優先）

1. AGENTS.mdにレビュープロンプト追加
2. steering/rules/workflow.mdにレビューステージ定義
3. レビューチェックリストテンプレート作成
4. storage/reviews/ディレクトリ構造定義

### Phase 2: トレーサビリティと進捗追跡

1. traceability-auditorスキル強化
2. ワークフローダッシュボード仕様定義
3. ステージ遷移記録フォーマット定義

### Phase 3: 自動化とConstitutional強化

1. GitHub Actions/CI統合
2. Phase -1 Gate自動トリガー実装
3. Steering自動同期実装

---

## 参考: YAGOKOROプロジェクトでの具体的課題

### 課題1: レビューなしでの実装進行

v1.0.0〜v5.0.0の開発において、要件→設計→実装の各フェーズ間で明示的なレビューゲートがなく、以下の問題が発生しました：

- 要件の曖昧さが設計段階で発覚
- 設計変更が実装後に必要になるケース
- テストカバレッジの事後確認のみ

**解決策**: IMP-001（レビューワークフロー追加）

### 課題2: Steering更新の手動作業

各バージョンリリース時に、tech.ja.md、product.ja.md、structure.ja.mdを手動で更新する必要があり、更新漏れや不整合が発生しました。

**解決策**: IMP-007（Steering自動同期）

### 課題3: トレーサビリティの手動管理

REQ-XXX-NNNとコード/テストの対応関係が手動管理であり、ギャップの検出が困難でした。

**解決策**: IMP-004（トレーサビリティ自動化）

---

## 結論

MUSUBI SDDは強力な仕様駆動開発フレームワークですが、本プロジェクトの経験から、特に**レビューワークフローの統合**が最も重要な改善点として特定されました。

9つのConstitutional Articlesは優れた設計原則を提供していますが、それらを実際のワークフローに組み込むためのレビューゲートが不足しています。本改善要求の実装により、MUSUBIはより堅牢で実用的なSDDフレームワークとなることが期待されます。

---

**Document Status**: Draft
**Review Required**: MUSUBI Core Team
**Target Version**: MUSUBI v0.2.0
