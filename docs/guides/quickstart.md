# クイックスタートガイド

このガイドでは、YAGOKOROを最短で動かすための手順を説明します。

## 前提条件

- Node.js 20 LTS 以上
- pnpm 9.x
- Docker & Docker Compose
- (オプション) OpenAI API キー

## 1. セットアップ

### 1.1 リポジトリのクローン

```bash
git clone https://github.com/your-org/yagokoro.git
cd yagokoro
```

### 1.2 依存関係のインストール

```bash
pnpm install
```

### 1.3 環境変数の設定

```bash
cp .env.example .env
```

`.env` ファイルを編集:

```env
# Neo4j 設定
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# Qdrant 設定
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=yagokoro

# OpenAI 設定 (オプション)
OPENAI_API_KEY=sk-your-api-key
```

### 1.4 Docker環境の起動

```bash
docker compose -f docker/docker-compose.yml up -d
```

Neo4j と Qdrant が起動します:
- Neo4j Browser: http://localhost:7474
- Qdrant Dashboard: http://localhost:6333/dashboard

### 1.5 ビルド

```bash
pnpm build
```

## 2. CLI の使用

### 2.1 グラフの初期化

```bash
pnpm yagokoro graph init
```

### 2.2 サンプルデータの投入

```bash
# テキストファイルから
pnpm yagokoro graph ingest ./sample.txt --format text

# Markdownから
pnpm yagokoro graph ingest ./docs/ --format markdown
```

### 2.3 クエリの実行

```bash
# 自然言語クエリ
pnpm yagokoro graph query "GPT-4の技術的特徴は?"

# Cypherクエリ
pnpm yagokoro graph query --cypher "MATCH (m:AIModel) RETURN m LIMIT 10"
```

### 2.4 エンティティ操作

```bash
# 一覧表示
pnpm yagokoro entity list

# タイプでフィルタ
pnpm yagokoro entity list --type AIModel

# エンティティ追加
pnpm yagokoro entity add --name "GPT-5" --type AIModel --description "OpenAIの次世代モデル"

# エンティティ詳細
pnpm yagokoro entity get entity-id-here
```

### 2.5 リレーション操作

```bash
# リレーション追加
pnpm yagokoro relation add --source gpt4-id --target openai-id --type DEVELOPED_BY

# リレーション一覧
pnpm yagokoro relation list --entity gpt4-id
```

## 3. MCP サーバーとして使用

### 3.1 サーバー起動

```bash
# stdio モード (MCP クライアント用)
pnpm yagokoro mcp serve

# HTTP モード (デバッグ用)
pnpm yagokoro mcp serve --transport http --port 3000
```

### 3.2 Claude Desktop との連携

`~/.claude/claude_desktop_config.json` に追加:

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

### 3.3 MCP ツールの確認

```bash
pnpm yagokoro mcp tools
```

利用可能なツール:
- `queryKnowledgeGraph` - 自然言語クエリ
- `getEntity` - エンティティ取得
- `getRelations` - リレーション取得
- `getPath` - パス探索
- `getCommunity` - コミュニティ情報
- `addEntity` - エンティティ追加
- `addRelation` - リレーション追加
- `searchSimilar` - 類似検索

## 4. サンプルワークフロー

### 4.1 AIモデルの系譜を構築

```bash
# 1. グラフ初期化
pnpm yagokoro graph init

# 2. エンティティを追加
pnpm yagokoro entity add --name "Transformer" --type Technique --description "Attention機構ベースのアーキテクチャ"
pnpm yagokoro entity add --name "BERT" --type AIModel --description "Bidirectional Encoder Representations from Transformers"
pnpm yagokoro entity add --name "GPT-3" --type AIModel --description "Generative Pre-trained Transformer 3"

# 3. リレーションを追加
pnpm yagokoro relation add --source bert-id --target transformer-id --type USES_TECHNIQUE
pnpm yagokoro relation add --source gpt3-id --target transformer-id --type USES_TECHNIQUE

# 4. クエリ実行
pnpm yagokoro graph query "Transformerを使用しているモデルは?"
```

### 4.2 コミュニティ検出

```bash
# コミュニティを検出
pnpm yagokoro community detect

# コミュニティ一覧
pnpm yagokoro community list

# サマリー生成
pnpm yagokoro community summarize --all
```

## 5. トラブルシューティング

### Docker が起動しない

```bash
# ログを確認
docker compose -f docker/docker-compose.yml logs

# 再起動
docker compose -f docker/docker-compose.yml down
docker compose -f docker/docker-compose.yml up -d
```

### Neo4j に接続できない

```bash
# 接続テスト
pnpm yagokoro graph stats
```

### テストの実行

```bash
pnpm test
```

## 次のステップ

- [インストールガイド](installation.md) - 詳細なインストール手順
- [MCP Tools リファレンス](../api/mcp-tools.md) - 全ツールの詳細
- [CLI リファレンス](../api/cli-reference.md) - 全コマンドの詳細
- [アーキテクチャ概要](../architecture/overview.md) - システム設計
