# YAGOKORO v3.0.0 - Generative AI 系譜 GraphRAG MCP システム

[![CI](https://github.com/nahisaho/yagokoro/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/yagokoro/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-2140%20passing-brightgreen)]()
[![Version](https://img.shields.io/badge/version-3.0.0-blue)]()

生成AI技術の系譜・発展を知識グラフとして構築し、Model Context Protocol (MCP) を通じてAIエージェントに高度な検索・推論機能を提供するシステムです。

## 名前の由来

**YAGOKORO（八意）** は、日本神話に登場する **八意思兼命（やごころおもいかねのみこと）** に由来します。

八意思兼命は知恵と判断力を司る神であり、天照大神が天岩戸（あまのいわと）に隠れた際、岩戸を開けるための素晴らしい策を講じ、世界に光を取り戻したことで有名です。高皇産霊神（たかみむすびのかみ）の子とされ、「八百万（やおよろず）の思慮」を持つことから「八意思」と名付けられました。

> 💡 知識グラフと推論によって「知恵」を提供し、AIの力で「光」をもたらすという本プロジェクトの理念を、この神の名に重ねています。

**主な御祭神社**: 戸隠神社（長野県）、思金神社（横浜市）

## 🌟 特徴

### Core Features
- **GraphRAG アーキテクチャ**: Neo4j知識グラフ + Qdrantベクトル検索のハイブリッド検索
- **LazyGraphRAG**: インデックスコスト0.1%の高効率なクエリ処理
- **MCP サーバー**: Claude、GPT等のAIエージェントとの標準プロトコル連携
- **マルチホップ推論**: 2〜10ホップの経路探索による深い洞察
- **コミュニティ検出**: Leidenアルゴリズムによる階層的クラスタリング
- **CLI ツール**: 直感的なコマンドラインインターフェース

### v3.0.0 New Features 🆕
- **自動関係抽出 (F-001)**: 共起分析ベースのエンティティ関係自動検出
- **論文自動取り込み (F-002)**: arXiv/Semantic Scholarからの自動インジェスト
- **MCPツール拡充 (F-003)**: NLQ、パス探索、Gap分析等の新ツール
- **Chain-of-Thought推論**: 多段階推論で複雑な質問に対応
- **ハルシネーション検出**: AIレスポンスの整合性・矛盾検証

## 📦 アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    apps/yagokoro                            │
│                   (CLI + MCP Server)                        │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  @yagokoro/   │   │  @yagokoro/   │   │  @yagokoro/   │
│     mcp       │   │     cli       │   │   graphrag    │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  @yagokoro/   │   │  @yagokoro/   │   │  @yagokoro/   │
│    neo4j      │   │    vector     │   │    domain     │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │
        ▼                     ▼
┌───────────────┐   ┌───────────────┐
│    Neo4j      │   │    Qdrant     │
│   (Graph)     │   │   (Vector)    │
└───────────────┘   └───────────────┘
```

## 🚀 クイックスタート

### 前提条件

- Node.js 20 LTS 以上
- pnpm 9.x
- Docker & Docker Compose

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/your-org/yagokoro.git
cd yagokoro

# 依存関係をインストール
pnpm install

# Docker環境を起動
docker compose -f docker/docker-compose.yml up -d

# ビルド
pnpm build
```

### MCP サーバーとして使用

Claude Desktop や他のMCPクライアントで使用する場合:

```json
{
  "mcpServers": {
    "yagokoro": {
      "command": "node",
      "args": ["/path/to/yagokoro/apps/yagokoro/dist/mcp-server.js"],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "password",
        "QDRANT_URL": "http://localhost:6333"
      }
    }
  }
}
```

### CLI として使用

```bash
# グラフを初期化
yagokoro graph init

# シードデータを投入 (Generative AI 系譜データ)
yagokoro seed ingest genai-knowledge

# arXiv論文を取り込み（PDF→テキスト→チャンク）
yagokoro ingest arxiv 1706.03762  # Attention Is All You Need
yagokoro ingest search "transformer attention" --category cs.CL

# クエリを実行
yagokoro graph query "Transformerアーキテクチャの発展"

# エンティティを一覧
yagokoro entity list --type AIModel

# バックアップ作成
yagokoro backup create --output ./backup.json

# バックアップからリストア
yagokoro backup restore ./backup.json
```

## 📚 ドキュメント

- [クイックスタートガイド](docs/guides/quickstart.md)
- [インストールガイド](docs/guides/installation.md)
- [MCPセットアップガイド](docs/guides/mcp-setup.md)
- [認証・認可ガイド](docs/guides/authentication.md)
- [サンプルクエリ](docs/guides/sample-queries.md)
- [MCP Tools リファレンス](docs/api/mcp-tools.md)
- [CLI リファレンス](docs/api/cli-reference.md)
- [アーキテクチャ概要](docs/architecture/overview.md)

## 🔧 MCP Tools

### 基本ツール

| ツール名 | 説明 |
|---------|------|
| `queryKnowledgeGraph` | 自然言語でナレッジグラフを検索 |
| `getEntity` | ID/名前でエンティティを取得 |
| `getRelations` | エンティティ間のリレーションを取得 |
| `getPath` | 2エンティティ間のパスを探索 |
| `getCommunity` | コミュニティ情報を取得 |
| `addEntity` | 新しいエンティティを追加 |
| `addRelation` | 新しいリレーションを追加 |
| `searchSimilar` | 類似エンティティをベクトル検索 |

### 高度なツール (v3.0.0)

| ツール名 | 説明 |
|---------|------|
| `natural_language_query` | 自然言語をCypherに変換してクエリ実行 |
| `chain_of_thought` | 多段階推論でステップバイステップ分析 |
| `validate_response` | AIレスポンスの整合性・矛盾を検証 |
| `check_consistency` | グラフとの一貫性チェック |
| `find_path` | エンティティ間のパス探索 (max 10ホップ) |
| `explain_path` | パスのLLMによる説明生成 |
| `analyze_gaps` | 知識グラフのGap分析 |
| `analyze_lifecycle` | エンティティのライフサイクル分析 |
| `normalize_entities` | エンティティ正規化 |
| `generate_report` | 定期レポート生成 |

### ドキュメントインジェスト (v0.6.0+)

| コマンド | 説明 |
|---------|------|
| `yagokoro ingest arxiv <id>` | arXiv論文をPDFダウンロード→テキスト抽出→チャンク化 |
| `yagokoro ingest arxiv-batch <ids...>` | 複数論文のバッチインジェスト |
| `yagokoro ingest pdf <file>` | ローカルPDFファイルをインジェスト |
| `yagokoro ingest search <query>` | arXiv検索 |

## 🛠️ 開発

```bash
# テストを実行
pnpm test

# 型チェック
pnpm typecheck

# リント
pnpm lint

# フォーマット
pnpm format
```

### プロジェクト構造

```
yagokoro/
├── apps/
│   └── yagokoro/          # メインアプリケーション (135 E2E tests)
├── libs/
│   ├── domain/            # ドメインモデル (179 tests)
│   ├── graphrag/          # GraphRAGコアロジック (332 tests)
│   ├── extractor/         # 関係抽出 [NEW v3] (208 tests)
│   ├── ingestion/         # 論文取り込み [NEW v3] (46 tests)
│   ├── nlq/               # 自然言語クエリ処理 (66 tests)
│   ├── hallucination/     # ハルシネーション検出 (28 tests)
│   ├── normalizer/        # エンティティ正規化 (85 tests)
│   ├── analyzer/          # ライフサイクル・Gap分析 (206 tests)
│   ├── reasoner/          # CoT推論・パス探索 (93 tests)
│   ├── neo4j/             # Neo4jリポジトリ (102 tests)
│   ├── vector/            # Qdrantベクトルストア (34 tests)
│   ├── mcp/               # MCPサーバー実装 (379 tests)
│   └── cli/               # CLIコマンド (247 tests)
├── docker/                # Docker設定
├── steering/              # プロジェクト設計ドキュメント
└── storage/
    └── specs/             # 要件・設計・タスク仕様
```

**Total: 2,140 tests ✅**

## ✨ 主要機能

### LazyGraphRAG クエリ

```typescript
import { LazyQueryEngine, LazyQueryPresets } from '@yagokoro/graphrag';

// LazyGraphRAG エンジン初期化
const engine = new LazyQueryEngine({
  assessorClient: gpt4oMini,  // 低コストLLM（関連性評価用）
  generatorClient: gpt4o,      // 高品質LLM（回答生成用）
});

// クエリ実行（Z500プリセット: バランス型）
const response = await engine.query(
  'Transformerアーキテクチャの主な進化について教えて',
  conceptGraph,
  chunks,
  LazyQueryPresets.Z500
);

console.log(response.answer);
console.log(`関連性テスト使用数: ${response.metrics.relevanceTestsUsed}`);
// → インデックスコスト0.1%で高品質な回答を生成
```

### 自然言語クエリ (NLQ)

```typescript
// 自然言語をCypherクエリに変換
const result = await nlqService.query("Transformerを使用するモデル一覧");
// → MATCH (m:AIModel)-[:USES_TECHNIQUE]->(t:Technique {name: 'Transformer'}) RETURN m
```

### Chain-of-Thought 推論

```typescript
// 複雑な質問を段階的に分析
const analysis = await cotGenerator.generate("GPT-4のTransformerへの依存関係を説明して");
// → 複数のステップで推論を展開
```

### ハルシネーション検出

```typescript
// AIレスポンスの整合性チェック
const validation = await consistencyChecker.check(response, context);
// → 矛盾や不整合を検出
```

## 📊 オントロジースキーマ

### エンティティ型

| 型 | 説明 | 例 |
|----|------|-----|
| `AIModel` | AIモデル | GPT-4, Claude, BERT |
| `Organization` | 組織 | OpenAI, Google, Meta |
| `Person` | 人物 | Ilya Sutskever, Yann LeCun |
| `Publication` | 論文・出版物 | "Attention Is All You Need" |
| `Technique` | 技術・手法 | Transformer, LoRA |
| `Benchmark` | ベンチマーク | MMLU, HumanEval |
| `Concept` | 概念 | Emergent Abilities |
| `Community` | コミュニティ | (自動検出) |

### リレーション型

| リレーション | 説明 |
|-------------|------|
| `DEVELOPED_BY` | モデル→組織 |
| `BASED_ON` | モデル→モデル/技術 |
| `AUTHORED` | 人物→論文 |
| `USES_TECHNIQUE` | モデル→技術 |
| `EVALUATED_ON` | モデル→ベンチマーク |
| `EMPLOYED_AT` | 人物→組織 |
| `PRECEDES` | 時系列関係 |
| `MEMBER_OF` | コミュニティ所属 |

## 🔒 セキュリティ

- APIキー認証 (SHA-256 ハッシュ)
- RBAC (admin/editor/reader ロール)
- 構造化ログ・リクエストID追跡

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照

## 🤝 コントリビューション

Issue や Pull Request を歓迎します。[CONTRIBUTING.md](CONTRIBUTING.md) をご確認ください。

---

Built with ❤️ using [MUSUBI SDD](https://github.com/your-org/musubi)
