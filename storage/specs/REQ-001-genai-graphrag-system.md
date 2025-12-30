# 要件定義書: Generative AI 系譜 GraphRAG MCPシステム

**Document ID**: REQ-001
**Version**: 1.1
**Created**: 2025-12-28
**Updated**: 2025-12-28
**Status**: Draft → Under Review
**Author**: YAGOKORO Development Team

---

## 1. 概要

### 1.1 目的

本要件定義書は、AGI（Artificial General Intelligence）実現に向けた第一フェーズとして、**Generative AI の系譜を提供する知識GraphRAGシステム**の要件を定義する。

### 1.2 背景

spec-yagokoro.md で示された通り：
- LLM単独でのAGI実現は数学的・理論的に不可能である
- AI研究者の76%が現在のアプローチのスケールアップでは不十分と回答
- GraphRAGとオントロジー統合により精度が3.4倍向上（16%→54%）
- LLM・GraphRAG・オントロジーの統合がAGI実現への有望なパラダイム

### 1.3 スコープ

**Phase 1（本要件）**: Generative AI 系譜の知識GraphRAGシステム
**Phase 2**: オントロジー統合と推論エンジン
**Phase 3**: MCP（Model Context Protocol）による外部システム連携
**Phase 4**: AGIコア機能の実装

### 1.4 要件ID命名規則

```
REQ-001-{カテゴリ}-{連番}

カテゴリ:
  KG   = Knowledge Graph（知識グラフ構築）
  GR   = GraphRAG（検索・推論）
  MCP  = Model Context Protocol
  CLI  = Command Line Interface
  DATA = データ永続化
  ERR  = エラー処理
  SEC  = セキュリティ
  SYS  = システム全般
  NFR  = Non-Functional Requirements
```

### 1.5 優先度定義

| 優先度 | 定義 |
|--------|------|
| **Must** | Phase 1で必須。未実装はリリース不可 |
| **Should** | Phase 1で強く推奨。リソース次第で延期可 |
| **Could** | Phase 1で望ましい。Phase 2以降に延期可 |

---

## 2. ビジョン・ミッション

### 2.1 ビジョン

LLMの限界を克服し、知識グラフとオントロジーの力を活用した、真の知的推論能力を持つAGIシステムを実現する。

### 2.2 ミッション

Generative AIの進化の系譜を構造化された知識グラフとして構築し、以下を実現する：
1. AI技術の関係性と依存関係の可視化
2. マルチホップ推論による深い洞察の提供
3. MCPプロトコルを介した外部AIシステムとの連携基盤構築

---

## 3. ライブラリ構成（Article I: Library-First準拠）

### 3.1 パッケージ構成

```
lib/
├── yagokoro-domain/        # ドメインモデル（エンティティ、関係性、オントロジー）
│   ├── src/domain/
│   └── package.json
├── yagokoro-graphrag/      # GraphRAGコアロジック（検索、推論、コミュニティ検出）
│   ├── src/
│   └── package.json
├── yagokoro-neo4j/         # Neo4j リポジトリ実装
│   ├── src/infrastructure/
│   └── package.json
├── yagokoro-vector/        # ベクトルストア実装（Qdrant）
│   ├── src/infrastructure/
│   └── package.json
├── yagokoro-mcp/           # MCPサーバー・ツール定義
│   ├── src/
│   └── package.json
└── yagokoro-cli/           # CLIコマンド実装
    ├── src/
    └── package.json

apps/
└── yagokoro/               # 統合アプリケーション
    ├── src/
    └── package.json
```

### 3.2 依存関係

```
yagokoro-domain      ← 依存なし（純粋ドメイン）
yagokoro-graphrag    ← yagokoro-domain
yagokoro-neo4j       ← yagokoro-domain
yagokoro-vector      ← yagokoro-domain
yagokoro-mcp         ← yagokoro-domain, yagokoro-graphrag
yagokoro-cli         ← yagokoro-domain, yagokoro-graphrag, yagokoro-mcp
apps/yagokoro        ← 全ライブラリ
```

---

## 4. EARS形式要件定義

### 4.1 知識グラフ構築機能 (KG)

#### REQ-001-KG-001 エンティティ抽出（Ubiquitous）
**優先度**: Must

**要件**: システムは、Generative AIに関する文書から以下のエンティティを抽出SHALL：
- **モデル**: GPT-4, Claude, Gemini, LLaMA等のAIモデル
- **組織**: OpenAI, Anthropic, Google DeepMind, Meta等
- **技術**: Transformer, Attention, RLHF, DPO等
- **論文**: 重要な研究論文と著者
- **ベンチマーク**: MMLU, HumanEval, ARC-AGI等
- **概念**: AGI, LLM, GraphRAG, オントロジー等

**受入条件**:
- [ ] 6種類以上のエンティティタイプを識別できる
- [ ] F1スコア80%以上でエンティティを抽出できる（評価データセットN≥500）
- [ ] エンティティに一意のUUID v4が付与される
- [ ] 抽出結果にconfidenceスコア（0.0-1.0）が付与される

**トレーサビリティ**:
- テスト: TEST-001-KG-001-*
- 設計: DES-001-KG-001

---

#### REQ-001-KG-002 関係性抽出（Ubiquitous）
**優先度**: Must

**要件**: システムは、エンティティ間の以下の関係性を抽出SHALL：
- **DERIVED_FROM**: 派生関係（GPT-4 → GPT-3.5）
- **DEVELOPED_BY**: 開発者関係（GPT-4 → OpenAI）
- **USES_TECHNIQUE**: 技術使用関係（GPT-4 → Transformer）
- **PUBLISHED_IN**: 論文掲載関係
- **BENCHMARKED_ON**: ベンチマーク評価関係
- **COMPETES_WITH**: 競合関係
- **INFLUENCES**: 影響関係
- **PRECEDES/SUCCEEDS**: 時系列関係

**受入条件**:
- [ ] 8種類以上の関係タイプを定義
- [ ] 関係に方向性（source → target）を付与
- [ ] 関係に属性（timestamp, confidence, source_document）を付与
- [ ] F1スコア75%以上で関係を抽出できる（評価データセットN≥300）
- [ ] 双方向関係は2つの単方向関係として保存

**トレーサビリティ**:
- テスト: TEST-001-KG-002-*
- 設計: DES-001-KG-002

---

#### REQ-001-KG-003 時系列情報管理（Ubiquitous）
**優先度**: Must

**要件**: システムは、全エンティティと関係性に時系列情報を付与SHALL。

**受入条件**:
- [ ] エンティティにcreatedAt, updatedAt, releaseDate属性を付与
- [ ] 関係性にvalidFrom, validTo属性を付与（時限的関係のサポート）
- [ ] ISO 8601形式で日時を保存
- [ ] 時系列クエリ（BETWEEN, BEFORE, AFTER）をサポート

**トレーサビリティ**:
- テスト: TEST-001-KG-003-*
- 設計: DES-001-KG-003

---

#### REQ-001-KG-004 データインポート（Event-driven）
**優先度**: Must

**要件**: WHEN ユーザーがmarkdown/PDF/HTMLファイルをインポートした時、システムは自動的にエンティティと関係性を抽出しグラフに追加SHALL。

**受入条件**:
- [ ] Markdown (.md) ファイルのパースと抽出
- [ ] PDF (.pdf) ファイルのテキスト抽出と処理
- [ ] HTML (.html) ファイルのパースと抽出
- [ ] バッチインポート（ディレクトリ指定）のサポート
- [ ] 重複エンティティの検出とマージ戦略（skip/merge/replace）
- [ ] インポート結果のサマリーレポート出力

**トレーサビリティ**:
- テスト: TEST-001-KG-004-*
- 設計: DES-001-KG-004

---

### 4.2 GraphRAG検索機能 (GR)

#### REQ-001-GR-001 マルチホップ推論（Event-driven）
**優先度**: Must

**要件**: WHEN ユーザーがマルチホップクエリを発行した時、システムは複数のエンティティを経由した推論結果を返却SHALL。

**例**: 「GPT-4に影響を与えた技術の起源となった論文は？」
→ GPT-4 → Transformer → "Attention Is All You Need" (2017)

**受入条件**:
- [ ] 最大10ホップまでの推論が可能
- [ ] 各ホップ追加で+200ms以内のレイテンシ増加
- [ ] 推論パスの可視化（JSON形式でノード・エッジ列挙）
- [ ] 推論の信頼度スコア（0.0-1.0）を提供
- [ ] パス探索アルゴリズム（BFS/DFS/Dijkstra）の選択可能

**トレーサビリティ**:
- テスト: TEST-001-GR-001-*
- 設計: DES-001-GR-001

---

#### REQ-001-GR-002 コミュニティ検出（Ubiquitous）
**優先度**: Must

**要件**: システムは、知識グラフ内のコミュニティ（密結合したエンティティ群）を自動検出SHALL。

**受入条件**:
- [ ] Leidenアルゴリズムによる階層的コミュニティ検出
- [ ] 3階層以上のコミュニティ構造をサポート
- [ ] コミュニティサマリの自動生成（LLMによる要約）
- [ ] コミュニティ間の関係性（ブリッジノード）を識別
- [ ] モジュラリティスコアの計算と出力

**トレーサビリティ**:
- テスト: TEST-001-GR-002-*
- 設計: DES-001-GR-002

---

#### REQ-001-GR-003 グローバルクエリ（Event-driven）
**優先度**: Must

**要件**: WHEN ユーザーがグローバルな質問を発行した時、システムはデータセット全体を考慮した包括的な回答を生成SHALL。

**例**: 「2024年のAI研究における主要なトレンドは？」

**受入条件**:
- [ ] コミュニティサマリを活用したmap-reduce方式の回答生成
- [ ] 複数コミュニティからの統合的回答
- [ ] 回答の根拠となるエンティティ・関係の引用（最低3件）
- [ ] 回答生成時間 < 5秒（p95）

**トレーサビリティ**:
- テスト: TEST-001-GR-003-*
- 設計: DES-001-GR-003

---

#### REQ-001-GR-004 ローカルクエリ（Event-driven）
**優先度**: Must

**要件**: WHEN ユーザーが特定エンティティに関する質問を発行した時、システムは関連するコンテキストを収集し回答を生成SHALL。

**受入条件**:
- [ ] エンティティ周辺のサブグラフ抽出（depth=2がデフォルト）
- [ ] 関連度スコアによるランキング
- [ ] ソース引用の提供（エンティティID、関係、元文書）
- [ ] 回答生成時間 < 500ms（p95）

**トレーサビリティ**:
- テスト: TEST-001-GR-004-*
- 設計: DES-001-GR-004

---

#### REQ-001-GR-005 ハイブリッド検索（Ubiquitous）
**優先度**: Should

**要件**: システムは、グラフトラバーサルとベクトル類似度検索を組み合わせたハイブリッド検索を提供SHALL。

**受入条件**:
- [ ] ベクトル検索による意味的類似エンティティの取得
- [ ] グラフ構造を考慮した再ランキング
- [ ] 検索モード切替（graph_only/vector_only/hybrid）
- [ ] ハイブリッドスコア計算式の設定可能

**トレーサビリティ**:
- テスト: TEST-001-GR-005-*
- 設計: DES-001-GR-005

---

### 4.3 MCP（Model Context Protocol）インターフェース

#### REQ-001-MCP-001 MCPサーバー実装（Ubiquitous）
**優先度**: Must

**要件**: システムは、MCP準拠のサーバーインターフェースを提供SHALL。

**受入条件**:
- [ ] JSON-RPC 2.0プロトコル準拠
- [ ] Tools/Resources/Prompts リソースタイプ対応
- [ ] stdio トランスポート対応（必須）
- [ ] SSE トランスポート対応（Should）
- [ ] Streamable HTTP トランスポート対応（Could）
- [ ] MCP Inspector での動作確認

**トレーサビリティ**:
- テスト: TEST-001-MCP-001-*
- 設計: DES-001-MCP-001

---

#### REQ-001-MCP-002 GraphRAGツール公開（Ubiquitous）
**優先度**: Must

**要件**: システムは、以下のMCPツールを公開SHALL：

| ツール名 | 説明 | 優先度 |
|---------|------|--------|
| `query_knowledge_graph` | 自然言語クエリ実行 | Must |
| `get_entity` | エンティティ詳細取得 | Must |
| `get_relations` | 関係性取得 | Must |
| `get_path` | パス探索 | Must |
| `get_community_summary` | コミュニティサマリ取得 | Should |
| `add_entity` | エンティティ追加 | Must |
| `add_relation` | 関係追加 | Must |
| `search_similar` | 類似エンティティ検索 | Should |

**受入条件**:
- [ ] 各ツールにZod/JSON Schemaによる入力バリデーション
- [ ] 適切なエラーハンドリング（MCPエラーコード準拠）
- [ ] ツールごとのタイムアウト設定（デフォルト30秒）
- [ ] 実行ログの記録

**トレーサビリティ**:
- テスト: TEST-001-MCP-002-*
- 設計: DES-001-MCP-002

---

#### REQ-001-MCP-003 リソース公開（Ubiquitous）
**優先度**: Should

**要件**: システムは、以下のMCPリソースを公開SHALL：

| リソースURI | 説明 | MIMEタイプ |
|------------|------|-----------|
| `genai://ontology/schema` | オントロジースキーマ | application/json |
| `genai://graph/statistics` | グラフ統計情報 | application/json |
| `genai://entities/{type}` | エンティティ一覧 | application/json |
| `genai://timeline/{year}` | 時系列データ | application/json |

**受入条件**:
- [ ] リソースURIの一貫した命名規則
- [ ] メタデータの提供（mimeType, description, size）
- [ ] ページネーション対応（cursor-based）
- [ ] ETag によるキャッシュ制御

**トレーサビリティ**:
- テスト: TEST-001-MCP-003-*
- 設計: DES-001-MCP-003

---

### 4.4 CLI インターフェース（Article II準拠）

#### REQ-001-CLI-001 グラフ管理CLI（Ubiquitous）
**優先度**: Must

**要件**: システムは、以下のCLIコマンドを提供SHALL：

```bash
# 知識グラフ初期化
yagokoro graph init --domain genai

# ドキュメントからの知識抽出
yagokoro graph ingest <source> --format [markdown|pdf|html]
yagokoro graph ingest ./docs --recursive

# クエリ実行
yagokoro graph query "GPT-4の技術的系譜は？"
yagokoro graph query --local "Claude 3について"
yagokoro graph query --global "2024年のAIトレンド"

# エンティティ操作
yagokoro entity list --type model --limit 100
yagokoro entity get <entity_id>
yagokoro entity add --type model --name "Claude 3.5" --props '{"version":"3.5"}'
yagokoro entity delete <entity_id>

# 関係性操作
yagokoro relation add <from_id> DERIVED_FROM <to_id>
yagokoro relation list --from <entity_id>
yagokoro relation delete <relation_id>

# コミュニティ分析
yagokoro community detect --algorithm leiden --resolution 1.0
yagokoro community list
yagokoro community summarize <community_id>

# エクスポート/インポート
yagokoro graph export --format [json|cypher|rdf] --output ./export
yagokoro graph import --format json --input ./backup.json

# 統計情報
yagokoro graph stats
```

**受入条件**:
- [ ] `--help` フラグで詳細ヘルプ表示
- [ ] `--json` オプションでJSON出力
- [ ] `--verbose` オプションで詳細ログ出力
- [ ] `--quiet` オプションで最小出力
- [ ] 終了コード規約準拠（0=成功, 1=一般エラー, 2=使用法エラー）
- [ ] インタラクティブ確認（破壊的操作時）
- [ ] プログレスバー表示（長時間操作時）

**トレーサビリティ**:
- テスト: TEST-001-CLI-001-*
- 設計: DES-001-CLI-001

---

#### REQ-001-CLI-002 MCPサーバー起動CLI（Ubiquitous）
**優先度**: Must

**要件**: システムは、MCPサーバー起動用CLIを提供SHALL：

```bash
# MCPサーバー起動（フォアグラウンド）
yagokoro mcp serve --transport stdio

# MCPサーバー起動（バックグラウンド）
yagokoro mcp serve --transport sse --port 3000 --daemon

# MCPサーバー状態確認
yagokoro mcp status

# MCPサーバー停止
yagokoro mcp stop

# MCPツール一覧
yagokoro mcp tools list

# MCPリソース一覧
yagokoro mcp resources list
```

**受入条件**:
- [ ] デーモンモード対応（--daemon）
- [ ] PIDファイル管理
- [ ] ヘルスチェックエンドポイント（/health）
- [ ] グレースフルシャットダウン（SIGTERM対応）
- [ ] 設定ファイル対応（yagokoro.config.json）

**トレーサビリティ**:
- テスト: TEST-001-CLI-002-*
- 設計: DES-001-CLI-002

---

### 4.5 データ永続化 (DATA)

#### REQ-001-DATA-001 グラフデータベース（Ubiquitous）
**優先度**: Must

**要件**: システムは、知識グラフをNeo4jグラフデータベースに永続化SHALL。

**受入条件**:
- [ ] Neo4j 5.x 対応
- [ ] ACID トランザクション対応
- [ ] インデックス作成（エンティティタイプ、名前、UUID）
- [ ] 全文検索インデックス対応
- [ ] バックアップ・リストア機能（neo4j-admin dump/load）
- [ ] 接続プーリング（最大接続数設定可能）

**トレーサビリティ**:
- テスト: TEST-001-DATA-001-*
- 設計: DES-001-DATA-001

---

#### REQ-001-DATA-002 ベクトルストア統合（Ubiquitous）
**優先度**: Should

**要件**: システムは、エンティティの意味的検索のためQdrantベクトルストアを統合SHALL。

**受入条件**:
- [ ] text-embedding-3-large (3072次元) によるエンベディング生成
- [ ] エンティティ作成時の自動埋め込み生成
- [ ] コサイン類似度による検索
- [ ] フィルタリング条件との組み合わせ検索
- [ ] バッチ埋め込み生成（100件/バッチ）

**トレーサビリティ**:
- テスト: TEST-001-DATA-002-*
- 設計: DES-001-DATA-002

---

#### REQ-001-DATA-003 バックアップ（State-driven）
**優先度**: Should

**要件**: WHILE バックアップスケジュールが有効な間、システムは指定間隔でグラフデータの増分バックアップを実行SHALL。

**受入条件**:
- [ ] 日次フルバックアップ
- [ ] 時間ごとの増分バックアップ（オプション）
- [ ] バックアップ保持ポリシー（世代管理）
- [ ] S3互換ストレージへのリモートバックアップ（Could）
- [ ] バックアップ完了通知（webhook）

**トレーサビリティ**:
- テスト: TEST-001-DATA-003-*
- 設計: DES-001-DATA-003

---

### 4.6 システム運用 (SYS)

#### REQ-001-SYS-001 ヘルスチェック（State-driven）
**優先度**: Must

**要件**: WHILE MCPサーバーが稼働中の状態である間、システムはヘルスチェックエンドポイントで正常性を報告SHALL。

**受入条件**:
- [ ] `/health` エンドポイントで200 OKを返却（正常時）
- [ ] Neo4j接続状態の確認
- [ ] Qdrant接続状態の確認（有効時）
- [ ] メモリ使用量の報告
- [ ] 詳細ヘルス情報のJSON出力

**トレーサビリティ**:
- テスト: TEST-001-SYS-001-*
- 設計: DES-001-SYS-001

---

#### REQ-001-SYS-002 監査ログ（Ubiquitous）
**優先度**: Should

**要件**: システムは、全ての書き込み操作を監査ログに記録SHALL。

**受入条件**:
- [ ] 操作種別（CREATE/UPDATE/DELETE）の記録
- [ ] 操作対象（エンティティID、関係ID）の記録
- [ ] 操作者情報（APIキー、セッション）の記録
- [ ] タイムスタンプ（ISO 8601）の記録
- [ ] 構造化ログ形式（JSON Lines）

**トレーサビリティ**:
- テスト: TEST-001-SYS-002-*
- 設計: DES-001-SYS-002

---

#### REQ-001-SYS-003 メトリクス収集（State-driven）
**優先度**: Could

**要件**: WHILE システムが稼働中の間、システムはPrometheus形式でメトリクスを公開SHALL。

**受入条件**:
- [ ] `/metrics` エンドポイントでPrometheus形式出力
- [ ] クエリ実行時間のヒストグラム
- [ ] エンティティ/関係数のゲージ
- [ ] エラー率のカウンター

**トレーサビリティ**:
- テスト: TEST-001-SYS-003-*
- 設計: DES-001-SYS-003

---

### 4.7 エラー処理 (ERR)

#### REQ-001-ERR-001 クエリエラー（Unwanted Behavior）
**優先度**: Must

**要件**: IF クエリ解析に失敗した場合、THEN システムは具体的なエラーメッセージと修正提案を返却SHALL。

**受入条件**:
- [ ] エラーコードの体系的定義（ERR-1xxx: クエリ系）
- [ ] 自然言語でのエラー説明
- [ ] 類似する有効クエリの提案（最大3件）
- [ ] エラーレスポンスのJSON Schema定義

**エラーコード体系**:
```
ERR-1001: クエリ構文エラー
ERR-1002: エンティティ未発見
ERR-1003: 関係タイプ不正
ERR-1004: タイムアウト
ERR-2001: データベース接続エラー
ERR-2002: ベクトルストア接続エラー
ERR-3001: 認証エラー
ERR-3002: 認可エラー
```

**トレーサビリティ**:
- テスト: TEST-001-ERR-001-*
- 設計: DES-001-ERR-001

---

#### REQ-001-ERR-002 データ不整合（Unwanted Behavior）
**優先度**: Should

**要件**: IF 知識グラフに不整合が検出された場合、THEN システムはアラートを発行し修復オプションを提示SHALL。

**受入条件**:
- [ ] 循環参照の検出（DERIVED_FROM等の階層関係）
- [ ] 孤立ノードの検出（関係を持たないエンティティ）
- [ ] 重複エンティティの検出（名前の類似度ベース）
- [ ] 整合性チェックコマンド（`yagokoro graph validate`）
- [ ] 自動修復モードの提供（--fix オプション）

**トレーサビリティ**:
- テスト: TEST-001-ERR-002-*
- 設計: DES-001-ERR-002

---

### 4.8 セキュリティ (SEC)

#### REQ-001-SEC-001 アクセス制御（Where-Optional）
**優先度**: Could

**要件**: WHERE 認証が有効化されている場合、システムはAPIキーによる認証を要求SHALL。

**受入条件**:
- [ ] APIキー認証（X-API-Key ヘッダー）
- [ ] APIキーのハッシュ保存（bcrypt）
- [ ] キーごとのレート制限設定
- [ ] 監査ログへのアクセス記録

**トレーサビリティ**:
- テスト: TEST-001-SEC-001-*
- 設計: DES-001-SEC-001

---

#### REQ-001-SEC-002 ロールベースアクセス制御（Where-Optional）
**優先度**: Could

**要件**: WHERE RBACが有効化されている場合、システムはロールに基づいた操作制限を適用SHALL。

**ロール定義**:
| ロール | 読取 | 書込 | 削除 | 管理 |
|--------|------|------|------|------|
| reader | ✅ | ❌ | ❌ | ❌ |
| writer | ✅ | ✅ | ❌ | ❌ |
| admin  | ✅ | ✅ | ✅ | ✅ |

**受入条件**:
- [ ] 3種類のロール定義
- [ ] APIキーとロールの紐付け
- [ ] 操作ごとの権限チェック

**トレーサビリティ**:
- テスト: TEST-001-SEC-002-*
- 設計: DES-001-SEC-002

---

## 5. 非機能要件 (NFR)

### 5.1 パフォーマンス

| 要件ID | 指標 | 目標値 | 測定条件 |
|--------|------|--------|----------|
| REQ-001-NFR-001 | ローカルクエリ応答時間 | p95 < 500ms | 10万エンティティ |
| REQ-001-NFR-002 | マルチホップ推論（3ホップ） | p95 < 2s | 10万エンティティ |
| REQ-001-NFR-003 | グローバルクエリ応答時間 | p95 < 5s | 10万エンティティ |
| REQ-001-NFR-004 | エンティティ数上限 | ≥ 100万 | - |
| REQ-001-NFR-005 | 関係性数上限 | ≥ 1000万 | - |
| REQ-001-NFR-006 | 同時接続数 | ≥ 100 | MCPサーバー |

### 5.2 可用性

| 要件ID | 指標 | 目標値 |
|--------|------|--------|
| REQ-001-NFR-007 | 稼働率 | 99.9%（月間43分以内のダウンタイム） |
| REQ-001-NFR-008 | 計画停止時間 | 月4時間以内 |
| REQ-001-NFR-009 | RTO（復旧時間目標） | 1時間 |
| REQ-001-NFR-010 | RPO（復旧ポイント目標） | 1時間 |

### 5.3 スケーラビリティ

| 要件ID | 指標 | 目標 |
|--------|------|------|
| REQ-001-NFR-011 | 水平スケーリング | Neo4j Clusterサポート |
| REQ-001-NFR-012 | キャッシュ | Redis/Memcached対応 |
| REQ-001-NFR-013 | CDN | 静的リソースのCDN配信対応 |

### 5.4 保守性

| 要件ID | 指標 | 目標値 |
|--------|------|--------|
| REQ-001-NFR-014 | コードカバレッジ | ≥ 80% |
| REQ-001-NFR-015 | ブランチカバレッジ | ≥ 70% |
| REQ-001-NFR-016 | ドキュメント | APIドキュメント自動生成 |
| REQ-001-NFR-017 | 変更ログ | Conventional Commits準拠 |

---

## 6. オントロジースキーマ（初期版）

### 6.1 クラス階層

```
Thing
├── Agent
│   ├── Organization
│   │   ├── Company (OpenAI, Anthropic, Google)
│   │   ├── ResearchLab (DeepMind, FAIR)
│   │   └── University
│   └── Person
│       ├── Researcher
│       └── Engineer
├── Artifact
│   ├── AIModel
│   │   ├── LLM (GPT-4, Claude, Gemini)
│   │   ├── VisionModel
│   │   └── MultimodalModel
│   ├── Publication
│   │   ├── Paper
│   │   ├── Preprint
│   │   └── TechReport
│   ├── Dataset
│   └── Benchmark
├── Technique
│   ├── Architecture (Transformer, MoE)
│   ├── TrainingMethod (RLHF, DPO)
│   └── InferenceMethod (CoT, ToT)
├── Concept
│   ├── Capability (Reasoning, Coding)
│   └── Paradigm (AGI, GraphRAG)
└── Event
    ├── Release
    ├── Achievement
    └── Milestone
```

### 6.2 プロパティ定義

```yaml
AIModel:
  properties:
    - id: uuid (required, auto-generated)
    - name: string (required, indexed)
    - version: string
    - releaseDate: date (indexed)
    - parameterCount: integer
    - contextLength: integer
    - trainingCutoff: date
    - description: text
    - capabilities: [string]
    - createdAt: datetime (auto)
    - updatedAt: datetime (auto)
  relations:
    - developedBy: Organization (required)
    - derivedFrom: AIModel[]
    - usesTechnique: Technique[]
    - benchmarkedOn: Benchmark[]
    - competesWith: AIModel[]

Organization:
  properties:
    - id: uuid (required, auto-generated)
    - name: string (required, indexed, unique)
    - founded: date
    - headquarters: string
    - type: enum[company, research_lab, university, nonprofit]
    - website: url
    - createdAt: datetime (auto)
    - updatedAt: datetime (auto)
  relations:
    - develops: AIModel[]
    - publishes: Publication[]
    - employs: Person[]
    - fundedBy: Organization[]
    - collaboratesWith: Organization[]

Publication:
  properties:
    - id: uuid (required, auto-generated)
    - title: string (required, indexed)
    - abstract: text
    - publishedDate: date (indexed)
    - venue: string
    - arxivId: string
    - doi: string
    - citations: integer
    - createdAt: datetime (auto)
    - updatedAt: datetime (auto)
  relations:
    - authoredBy: Person[] (required)
    - publishedBy: Organization
    - introduces: Technique[]
    - evaluatesOn: Benchmark[]
    - cites: Publication[]
```

---

## 7. テスト戦略（Article III準拠）

### 7.1 テストレベル

| レベル | 対象 | ツール | カバレッジ目標 |
|--------|------|--------|---------------|
| 単体テスト | ドメインモデル、ユーティリティ | Vitest | 90% |
| 統合テスト | リポジトリ、外部サービス連携 | Vitest + Testcontainers | 80% |
| E2Eテスト | CLI、MCPサーバー | Vitest + playwright | 70% |
| 性能テスト | クエリ応答時間 | k6 | - |

### 7.2 テストカテゴリ

#### 7.2.1 知識グラフ構築テスト (TEST-001-KG-*)
- エンティティ抽出精度テスト（各タイプ別）
- 関係性抽出精度テスト（各タイプ別）
- 重複検出・マージテスト
- インポート/エクスポートテスト

#### 7.2.2 GraphRAGテスト (TEST-001-GR-*)
- マルチホップ推論正確性テスト
- コミュニティ検出テスト
- グローバル/ローカルクエリテスト
- ハイブリッド検索テスト

#### 7.2.3 MCPテスト (TEST-001-MCP-*)
- プロトコル準拠テスト（MCP Inspector）
- 各ツールの入出力テスト
- エラーハンドリングテスト
- 同時接続テスト

#### 7.2.4 CLIテスト (TEST-001-CLI-*)
- 全コマンドのヘルプ表示テスト
- 正常系・異常系のE2Eテスト
- 終了コードテスト
- JSON出力形式テスト

### 7.3 テストデータ

```
test/
├── fixtures/
│   ├── entities/          # エンティティのサンプルデータ
│   ├── relations/         # 関係性のサンプルデータ
│   ├── documents/         # インポート用サンプル文書
│   └── graphs/            # グラフスナップショット
└── mocks/
    ├── neo4j/             # Neo4jモック
    ├── qdrant/            # Qdrantモック
    └── openai/            # OpenAI APIモック
```

### 7.4 CI/CD統合

```yaml
# .github/workflows/test.yml
test:
  - lint (Biome)
  - type-check (tsc)
  - unit-test (Vitest)
  - integration-test (Testcontainers)
  - e2e-test (Playwright)
  - coverage-report (Codecov)
```

---

## 8. AGIへのロードマップ

### Phase 1: 知識GraphRAGシステム（本要件）
- ✅ 要件定義完了
- [ ] 設計（C4 + ADR）
- [ ] 実装
- [ ] テスト
- [ ] リリース

**目標**: Generative AI系譜の知識グラフ構築とMCPサーバー

### Phase 2: オントロジー統合
- BFO (Basic Formal Ontology) ベースのフォーマルオントロジー定義
- 推論ルールエンジン統合（RDFox, Stardog等）
- OWL 2 DL互換性
- SPARQL エンドポイント

### Phase 3: ニューロシンボリック統合
- LLMとシンボリック推論のハイブリッドアーキテクチャ
- 説明可能な推論パス生成
- 自己矛盾検出・解消機能
- 信念改訂メカニズム

### Phase 4: AGIコア機能
- 永続的メモリシステム（エピソード記憶、意味記憶）
- 計画・目標設定機能（HTN Planner）
- 自己改善メカニズム
- 世界モデル統合（JEPA アーキテクチャ）

---

## 9. 要件トレーサビリティマトリクス

| 要件ID | 設計 | 実装 | テスト | 状態 |
|--------|------|------|--------|------|
| REQ-001-KG-001 | DES-001-KG-001 | TBD | TEST-001-KG-001 | 📝 Draft |
| REQ-001-KG-002 | DES-001-KG-002 | TBD | TEST-001-KG-002 | 📝 Draft |
| REQ-001-KG-003 | DES-001-KG-003 | TBD | TEST-001-KG-003 | 📝 Draft |
| REQ-001-KG-004 | DES-001-KG-004 | TBD | TEST-001-KG-004 | 📝 Draft |
| REQ-001-GR-001 | DES-001-GR-001 | TBD | TEST-001-GR-001 | 📝 Draft |
| REQ-001-GR-002 | DES-001-GR-002 | TBD | TEST-001-GR-002 | 📝 Draft |
| REQ-001-GR-003 | DES-001-GR-003 | TBD | TEST-001-GR-003 | 📝 Draft |
| REQ-001-GR-004 | DES-001-GR-004 | TBD | TEST-001-GR-004 | 📝 Draft |
| REQ-001-GR-005 | DES-001-GR-005 | TBD | TEST-001-GR-005 | 📝 Draft |
| REQ-001-MCP-001 | DES-001-MCP-001 | TBD | TEST-001-MCP-001 | 📝 Draft |
| REQ-001-MCP-002 | DES-001-MCP-002 | TBD | TEST-001-MCP-002 | 📝 Draft |
| REQ-001-MCP-003 | DES-001-MCP-003 | TBD | TEST-001-MCP-003 | 📝 Draft |
| REQ-001-CLI-001 | DES-001-CLI-001 | TBD | TEST-001-CLI-001 | 📝 Draft |
| REQ-001-CLI-002 | DES-001-CLI-002 | TBD | TEST-001-CLI-002 | 📝 Draft |
| REQ-001-DATA-001 | DES-001-DATA-001 | TBD | TEST-001-DATA-001 | 📝 Draft |
| REQ-001-DATA-002 | DES-001-DATA-002 | TBD | TEST-001-DATA-002 | 📝 Draft |
| REQ-001-DATA-003 | DES-001-DATA-003 | TBD | TEST-001-DATA-003 | 📝 Draft |
| REQ-001-SYS-001 | DES-001-SYS-001 | TBD | TEST-001-SYS-001 | 📝 Draft |
| REQ-001-SYS-002 | DES-001-SYS-002 | TBD | TEST-001-SYS-002 | 📝 Draft |
| REQ-001-SYS-003 | DES-001-SYS-003 | TBD | TEST-001-SYS-003 | 📝 Draft |
| REQ-001-ERR-001 | DES-001-ERR-001 | TBD | TEST-001-ERR-001 | 📝 Draft |
| REQ-001-ERR-002 | DES-001-ERR-002 | TBD | TEST-001-ERR-002 | 📝 Draft |
| REQ-001-SEC-001 | DES-001-SEC-001 | TBD | TEST-001-SEC-001 | 📝 Draft |
| REQ-001-SEC-002 | DES-001-SEC-002 | TBD | TEST-001-SEC-002 | 📝 Draft |

---

## 10. 用語集

| 用語 | 定義 |
|------|------|
| GraphRAG | Graph Retrieval Augmented Generation。知識グラフを活用したRAGの拡張手法 |
| MCP | Model Context Protocol。AIモデルと外部ツール/データ間の標準プロトコル |
| オントロジー | ドメインの概念と関係性を形式的に定義した知識体系 |
| マルチホップ推論 | 複数のエンティティを経由して結論を導出する推論手法 |
| コミュニティ検出 | グラフ内の密結合したノード群を自動識別するアルゴリズム |
| EARS | Easy Approach to Requirements Syntax。要件記述の標準形式 |
| AGI | Artificial General Intelligence。汎用人工知能 |
| Leiden Algorithm | コミュニティ検出アルゴリズム。Louvainの改良版 |
| BFO | Basic Formal Ontology。ISO標準の上位オントロジー |

---

## 11. 参照文書

- [spec-yagokoro.md](../../spec-yagokoro.md) - プロジェクト仕様書
- [constitution.md](../../steering/rules/constitution.md) - Constitutional Governance
- [Microsoft GraphRAG Documentation](https://microsoft.github.io/graphrag/)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Neo4j Documentation](https://neo4j.com/docs/)
- [Qdrant Documentation](https://qdrant.tech/documentation/)

---

## 12. 改訂履歴

| バージョン | 日付 | 変更内容 | 著者 |
|-----------|------|----------|------|
| 1.0 | 2025-12-28 | 初版作成 | YAGOKORO Team |
| 1.1 | 2025-12-28 | レビュー指摘対応：要件ID命名規則改善、State-driven要件追加、優先度明示、定量的受入条件強化、Library-First構成追加、テスト戦略追加、トレーサビリティマトリクス追加 | YAGOKORO Team |

---

## 13. 承認

| 役割 | 氏名 | 日付 | 署名 |
|------|------|------|------|
| プロダクトオーナー | | | |
| テックリード | | | |
| アーキテクト | | | |
