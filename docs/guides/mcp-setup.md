# MCP サーバー セットアップガイド

YAGOKORO を Model Context Protocol (MCP) サーバーとして各種AIクライアントで使用する方法を説明します。

## 📋 前提条件

1. **YAGOKORO のビルド完了**
   ```bash
   cd yagokoro
   pnpm install
   pnpm build
   ```

2. **Docker サービスの起動**
   ```bash
   docker compose -f docker/docker-compose.yml up -d
   ```

3. **環境変数の設定**
   ```bash
   cp .env.example .env
   # .env を編集して必要な値を設定
   ```

---

## 🖥️ Claude Desktop

### 設定ファイルの場所

| OS | パス |
|----|------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

### 設定例

```json
{
  "mcpServers": {
    "yagokoro": {
      "command": "node",
      "args": ["/path/to/yagokoro/apps/yagokoro/dist/mcp-server.js"],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "your_password",
        "QDRANT_URL": "http://localhost:6333",
        "OLLAMA_URL": "http://localhost:11434",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### WSL2 環境での設定

WSL2からWindowsのOllamaを使用する場合:

```json
{
  "mcpServers": {
    "yagokoro": {
      "command": "wsl",
      "args": [
        "-d", "Ubuntu",
        "node", "/home/user/yagokoro/apps/yagokoro/dist/mcp-server.js"
      ],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "your_password",
        "QDRANT_URL": "http://localhost:6333",
        "OLLAMA_URL": "http://host.docker.internal:11434"
      }
    }
  }
}
```

---

## 🔧 Cursor

### 設定手順

1. Cursor を開く
2. `Cmd/Ctrl + Shift + P` でコマンドパレットを開く
3. `Preferences: Open User Settings (JSON)` を選択
4. 以下を追加:

```json
{
  "mcp.servers": {
    "yagokoro": {
      "command": "node",
      "args": ["/path/to/yagokoro/apps/yagokoro/dist/mcp-server.js"],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "your_password",
        "QDRANT_URL": "http://localhost:6333"
      }
    }
  }
}
```

---

## 🐳 Docker 経由での起動

### docker-compose.yml に追加

```yaml
services:
  yagokoro-mcp:
    build: .
    command: node /app/apps/yagokoro/dist/mcp-server.js
    environment:
      - NEO4J_URI=bolt://neo4j:7687
      - NEO4J_USER=neo4j
      - NEO4J_PASSWORD=${NEO4J_PASSWORD}
      - QDRANT_URL=http://qdrant:6333
    depends_on:
      - neo4j
      - qdrant
    stdin_open: true
    tty: true
```

### Claude Desktop から接続

```json
{
  "mcpServers": {
    "yagokoro": {
      "command": "docker",
      "args": [
        "compose", "-f", "/path/to/yagokoro/docker/docker-compose.yml",
        "exec", "-T", "yagokoro-mcp",
        "node", "/app/apps/yagokoro/dist/mcp-server.js"
      ]
    }
  }
}
```

---

## 🔧 利用可能なツール

接続後、以下のMCPツールが利用可能になります:

### 基本ツール

| ツール | 説明 | 使用例 |
|--------|------|--------|
| `queryKnowledgeGraph` | ナレッジグラフを検索 | "Transformerを使うモデルは？" |
| `getEntity` | エンティティを取得 | "GPT-4の情報を取得" |
| `getRelations` | 関係を取得 | "OpenAIが開発したモデル一覧" |
| `getPath` | パスを探索 | "BERTからGPT-4への発展経路" |
| `getCommunity` | コミュニティ情報 | "Transformer関連のクラスタ" |
| `addEntity` | エンティティを追加 | 新しいAIモデルを登録 |
| `addRelation` | 関係を追加 | モデル間の関係を登録 |
| `searchSimilar` | 類似検索 | "Llamaに似たモデルを検索" |

### 高度なツール (v0.3.0+)

| ツール | 説明 | 使用例 |
|--------|------|--------|
| `naturalLanguageQuery` | 自然言語→Cypher変換 | 複雑なグラフクエリ |
| `chainOfThought` | 多段階推論 | 因果関係の分析 |
| `validateResponse` | レスポンス検証 | ハルシネーションチェック |
| `checkConsistency` | 一貫性チェック | グラフとの整合性確認 |

---

## 🔍 動作確認

### Claude Desktop での確認

Claude Desktop で以下のように質問してみてください:

```
YAGOKOROのナレッジグラフを使って、Transformerアーキテクチャを使用しているAIモデルを教えてください。
```

正常に動作していれば、MCPツールが呼び出され、グラフからの情報が返されます。

### ログの確認

問題が発生した場合、ログを確認してください:

```bash
# サーバーログ
tail -f /path/to/yagokoro/docker/logs/mcp-server.log

# Neo4j ログ
docker compose -f docker/docker-compose.yml logs neo4j

# Qdrant ログ
docker compose -f docker/docker-compose.yml logs qdrant
```

---

## ⚠️ トラブルシューティング

### 接続エラー

**症状**: `Connection refused` エラー

**解決策**:
1. Docker サービスが起動しているか確認
2. ポートが正しいか確認
3. ファイアウォール設定を確認

### 認証エラー

**症状**: `Authentication failed` エラー

**解決策**:
1. Neo4j のパスワードが正しいか確認
2. 環境変数が正しく設定されているか確認

### タイムアウト

**症状**: レスポンスが返らない

**解決策**:
1. LLM サービス (Ollama/OpenAI) の接続を確認
2. クエリの複雑さを下げる
3. タイムアウト設定を調整

---

## 📚 関連ドキュメント

- [クイックスタート](quickstart.md)
- [CLI リファレンス](../api/cli-reference.md)
- [MCP Tools リファレンス](../api/mcp-tools.md)
