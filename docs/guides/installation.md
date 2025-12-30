# YAGOKORO インストールガイド

このガイドでは、YAGOKORO GraphRAG MCPシステムのインストールと設定方法を説明します。

## 前提条件

### 必須ソフトウェア

| ソフトウェア | バージョン | 用途 |
|------------|----------|------|
| Node.js | 20 LTS以上 | ランタイム |
| pnpm | 9.x | パッケージマネージャー |
| Docker | 最新版 | Neo4j/Qdrant実行 |
| Docker Compose | v2以上 | コンテナオーケストレーション |

### オプション

| ソフトウェア | 用途 |
|------------|------|
| Git | バージョン管理 |
| VS Code | 推奨エディタ |

## インストール手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/your-org/yagokoro.git
cd yagokoro
```

### 2. 依存関係のインストール

```bash
# pnpmがない場合はインストール
npm install -g pnpm

# 依存関係をインストール
pnpm install
```

### 3. Docker環境のセットアップ

```bash
# Neo4jとQdrantを起動
docker compose -f docker/docker-compose.yml up -d

# 起動確認
docker compose -f docker/docker-compose.yml ps
```

サービスの状態:
- **yagokoro-neo4j**: http://localhost:7474 でアクセス可能
- **yagokoro-qdrant**: http://localhost:6333 でアクセス可能

### 4. ビルド

```bash
# 全パッケージをビルド
pnpm build
```

### 5. テスト実行（オプション）

```bash
# 全テストを実行
pnpm test

# 特定パッケージのテスト
pnpm --filter @yagokoro/domain test
```

## 環境変数

`.env`ファイルを作成して環境変数を設定:

```bash
cp .env.example .env
```

### 必須変数

```env
# Neo4j接続
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# Qdrant接続
QDRANT_URL=http://localhost:6333
```

### オプション変数

```env
# LLM API (OpenAI)
OPENAI_API_KEY=sk-...

# LLM API (Anthropic)
ANTHROPIC_API_KEY=sk-ant-...

# ログレベル
LOG_LEVEL=info

# MCP認証
MCP_AUTH_ENABLED=false
MCP_API_KEY=ykg_your_api_key
```

## Neo4jの初期設定

### ブラウザアクセス

1. http://localhost:7474 を開く
2. 接続情報:
   - Connect URL: `bolt://localhost:7687`
   - Username: `neo4j`
   - Password: `password`

### シードデータの投入

```bash
# Generative AI系譜データを投入
cd data
npx tsx seed/ingest.ts

# または dry-run で確認
npx tsx seed/ingest.ts --dry-run
```

投入されるデータ:
- 16 AIモデル (GPT-4, Claude, Gemini等)
- 10 組織 (OpenAI, Anthropic等)
- 10 人物
- 10 技術 (Transformer, RLHF等)
- 62 リレーション

## トラブルシューティング

### Docker起動エラー

```bash
# ログを確認
docker compose -f docker/docker-compose.yml logs

# 再起動
docker compose -f docker/docker-compose.yml down
docker compose -f docker/docker-compose.yml up -d
```

### Neo4j接続エラー

```bash
# Neo4jが起動しているか確認
docker exec yagokoro-neo4j cypher-shell -u neo4j -p password "RETURN 1"
```

### ビルドエラー

```bash
# node_modulesをクリア
rm -rf node_modules
pnpm install

# ビルドキャッシュをクリア
pnpm clean
pnpm build
```

### ポート競合

デフォルトポートが使用中の場合、`docker/docker-compose.yml`で変更:

```yaml
services:
  neo4j:
    ports:
      - "17474:7474"  # ブラウザ
      - "17687:7687"  # Bolt
  qdrant:
    ports:
      - "16333:6333"
```

## アンインストール

```bash
# Dockerコンテナとボリュームを削除
docker compose -f docker/docker-compose.yml down -v

# リポジトリを削除
cd ..
rm -rf yagokoro
```

## 次のステップ

- [クイックスタートガイド](quickstart.md) - 基本的な使い方
- [MCPセットアップ](mcp-setup.md) - Claude Desktopとの連携
- [サンプルクエリ](sample-queries.md) - クエリ例
