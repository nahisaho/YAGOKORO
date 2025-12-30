# CLI コマンドリファレンス

YAGOKOROが提供するCLIコマンドの詳細リファレンスです。

## 概要

```bash
yagokoro <command> [options]
```

グローバルオプション:
- `--help, -h`: ヘルプを表示
- `--version, -v`: バージョンを表示
- `--format, -f`: 出力フォーマット（`json` | `table` | `yaml`）
- `--quiet, -q`: 簡易出力モード

---

## エンティティ操作

### entity list

エンティティを一覧表示します。

```bash
yagokoro entity list [options]
```

**オプション:**
| オプション | 短縮形 | 説明 | デフォルト |
|-----------|--------|------|----------|
| `--type` | `-t` | エンティティタイプでフィルタ | - |
| `--limit` | `-l` | 最大件数 | 50 |
| `--offset` | `-o` | オフセット | 0 |
| `--sort` | `-s` | ソートフィールド | `name` |
| `--order` | | `asc` または `desc` | `asc` |

**使用例:**
```bash
# AIModelタイプのエンティティを10件取得
yagokoro entity list --type AIModel --limit 10

# JSON形式で出力
yagokoro entity list --type Organization -f json
```

---

### entity get

エンティティの詳細を取得します。

```bash
yagokoro entity get <id-or-name> [options]
```

**オプション:**
| オプション | 短縮形 | 説明 | デフォルト |
|-----------|--------|------|----------|
| `--include-relations` | `-r` | リレーションを含める | false |
| `--depth` | `-d` | リレーション探索深度 | 1 |

**使用例:**
```bash
# IDで取得
yagokoro entity get 550e8400-e29b-41d4-a716-446655440000

# 名前で取得（リレーション付き）
yagokoro entity get "GPT-4" --include-relations
```

---

### entity add

新しいエンティティを追加します。

```bash
yagokoro entity add [options]
```

**オプション:**
| オプション | 短縮形 | 説明 | 必須 |
|-----------|--------|------|------|
| `--name` | `-n` | エンティティ名 | ✓ |
| `--type` | `-t` | エンティティタイプ | ✓ |
| `--description` | `-d` | 説明 | |
| `--properties` | `-p` | JSON形式のプロパティ | |
| `--file` | `-f` | JSONファイルから読み込み | |

**使用例:**
```bash
# 基本的な追加
yagokoro entity add -n "Llama 3" -t AIModel -d "Meta's LLM"

# プロパティ付き
yagokoro entity add -n "Llama 3" -t AIModel \
  -p '{"releaseDate":"2024-04-18","parameterCount":"70B"}'

# ファイルから追加
yagokoro entity add -f entities.json
```

---

### entity update

エンティティを更新します。

```bash
yagokoro entity update <id> [options]
```

**オプション:**
| オプション | 短縮形 | 説明 |
|-----------|--------|------|
| `--name` | `-n` | 新しい名前 |
| `--description` | `-d` | 新しい説明 |
| `--properties` | `-p` | マージするプロパティ |
| `--replace-properties` | | プロパティを置換 |

---

### entity delete

エンティティを削除します。

```bash
yagokoro entity delete <id> [options]
```

**オプション:**
| オプション | 短縮形 | 説明 | デフォルト |
|-----------|--------|------|----------|
| `--force` | `-y` | 確認をスキップ | false |
| `--cascade` | | 関連リレーションも削除 | true |

---

## リレーション操作

### relation list

リレーションを一覧表示します。

```bash
yagokoro relation list [options]
```

**オプション:**
| オプション | 短縮形 | 説明 |
|-----------|--------|------|
| `--type` | `-t` | リレーションタイプでフィルタ |
| `--source` | `-s` | ソースエンティティID |
| `--target` | | ターゲットエンティティID |
| `--limit` | `-l` | 最大件数 |

---

### relation add

リレーションを追加します。

```bash
yagokoro relation add [options]
```

**オプション:**
| オプション | 短縮形 | 説明 | 必須 |
|-----------|--------|------|------|
| `--source` | `-s` | ソースエンティティID | ✓ |
| `--target` | `-t` | ターゲットエンティティID | ✓ |
| `--type` | `-r` | リレーションタイプ | ✓ |
| `--confidence` | `-c` | 信頼度（0-1） | |
| `--properties` | `-p` | JSON形式のプロパティ | |

**使用例:**
```bash
yagokoro relation add \
  --source "gpt4-uuid" \
  --target "openai-uuid" \
  --type DEVELOPED_BY \
  --confidence 1.0
```

---

### relation delete

リレーションを削除します。

```bash
yagokoro relation delete <source-id> <target-id> <type> [options]
```

---

## グラフ操作

### graph query

自然言語でグラフを検索します。

```bash
yagokoro graph query <query> [options]
```

**オプション:**
| オプション | 短縮形 | 説明 | デフォルト |
|-----------|--------|------|----------|
| `--mode` | `-m` | 検索モード（local/global/hybrid） | hybrid |
| `--limit` | `-l` | 最大結果数 | 10 |

**使用例:**
```bash
yagokoro graph query "Transformerを使用しているモデルは？" --mode local

yagokoro graph query "生成AIの歴史的な発展について" --mode global
```

---

### graph path

2つのエンティティ間のパスを探索します。

```bash
yagokoro graph path <source> <target> [options]
```

**オプション:**
| オプション | 短縮形 | 説明 | デフォルト |
|-----------|--------|------|----------|
| `--max-hops` | `-h` | 最大ホップ数 | 5 |
| `--relation-types` | `-r` | 許可するリレーションタイプ | |
| `--all` | `-a` | すべてのパスを表示 | false |

**使用例:**
```bash
yagokoro graph path "GPT-4" "BERT" --max-hops 3
```

---

### graph stats

グラフの統計情報を表示します。

```bash
yagokoro graph stats [options]
```

**出力例:**
```
Graph Statistics
================
Nodes:         1,523
Relations:     4,821
Communities:   42

Entity Types:
  AIModel:      245
  Organization: 89
  Person:       312
  Publication:  456
  Technique:    198
  Benchmark:    67
  Concept:      156
```

---

## コミュニティ操作

### community list

コミュニティを一覧表示します。

```bash
yagokoro community list [options]
```

**オプション:**
| オプション | 短縮形 | 説明 | デフォルト |
|-----------|--------|------|----------|
| `--level` | `-l` | 階層レベル | 1 |
| `--min-size` | | 最小メンバー数 | |

---

### community get

コミュニティの詳細を取得します。

```bash
yagokoro community get <id> [options]
```

**オプション:**
| オプション | 短縮形 | 説明 |
|-----------|--------|------|
| `--include-members` | `-m` | メンバー一覧を含める |
| `--include-summary` | `-s` | サマリーを含める |

---

### community detect

コミュニティを検出（再計算）します。

```bash
yagokoro community detect [options]
```

**オプション:**
| オプション | 短縮形 | 説明 | デフォルト |
|-----------|--------|------|----------|
| `--algorithm` | `-a` | アルゴリズム | leiden |
| `--resolution` | `-r` | 解像度パラメータ | 1.0 |
| `--levels` | `-l` | 階層レベル数 | 3 |

---

## MCPサーバー

### mcp start

MCPサーバーを起動します。

```bash
yagokoro mcp start [options]
```

**オプション:**
| オプション | 短縮形 | 説明 | デフォルト |
|-----------|--------|------|----------|
| `--transport` | `-t` | トランスポート（stdio/http） | stdio |
| `--port` | `-p` | HTTPポート | 3000 |
| `--host` | `-h` | HTTPホスト | localhost |
| `--api-key` | | APIキー認証を有効化 | |

**使用例:**
```bash
# stdio（Claude Desktop等向け）
yagokoro mcp start

# HTTP（開発/デバッグ向け）
yagokoro mcp start -t http -p 3000

# APIキー認証付き
yagokoro mcp start --api-key your-secret-key
```

---

### mcp status

MCPサーバーの状態を確認します。

```bash
yagokoro mcp status
```

---

## データ管理

### data export

データをエクスポートします。

```bash
yagokoro data export [options]
```

**オプション:**
| オプション | 短縮形 | 説明 | デフォルト |
|-----------|--------|------|----------|
| `--output` | `-o` | 出力ファイル | backup-{timestamp}.json |
| `--format` | `-f` | フォーマット（json/cypher） | json |
| `--include-vectors` | | ベクトルを含める | false |
| `--compress` | | gzip圧縮 | false |

---

### data import

データをインポートします。

```bash
yagokoro data import <file> [options]
```

**オプション:**
| オプション | 短縮形 | 説明 | デフォルト |
|-----------|--------|------|----------|
| `--merge` | `-m` | 既存データとマージ | false |
| `--skip-validation` | | バリデーションをスキップ | false |
| `--dry-run` | | 実行せずプレビュー | false |

---

### data validate

バックアップファイルを検証します。

```bash
yagokoro data validate <file>
```

---

## 設定

### config show

現在の設定を表示します。

```bash
yagokoro config show
```

---

### config set

設定を変更します。

```bash
yagokoro config set <key> <value>
```

**使用例:**
```bash
yagokoro config set neo4j.uri bolt://localhost:7687
yagokoro config set qdrant.url http://localhost:6333
```

---

## 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|----------|
| `NEO4J_URI` | Neo4j接続URI | bolt://localhost:7687 |
| `NEO4J_USER` | Neo4jユーザー | neo4j |
| `NEO4J_PASSWORD` | Neo4jパスワード | - |
| `QDRANT_URL` | Qdrant URL | http://localhost:6333 |
| `OPENAI_API_KEY` | OpenAI APIキー | - |
| `LOG_LEVEL` | ログレベル | info |
| `YAGOKORO_CONFIG` | 設定ファイルパス | ~/.yagokoro/config.json |

---

## 終了コード

| コード | 説明 |
|--------|------|
| 0 | 成功 |
| 1 | 一般エラー |
| 2 | 引数エラー |
| 3 | 接続エラー |
| 4 | 認証エラー |
| 5 | リソースが見つからない |
