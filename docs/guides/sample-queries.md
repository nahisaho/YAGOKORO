# サンプルクエリ集

YAGOKOROナレッジグラフへのクエリ例です。MCP経由またはCLIで使用できます。

## 🔍 基本検索クエリ

### エンティティ検索

```bash
# AIモデル一覧
yagokoro entity list --type AIModel

# 組織一覧
yagokoro entity list --type Organization

# 特定のエンティティを取得
yagokoro entity get "GPT-4"
yagokoro entity get "OpenAI"
```

### 自然言語クエリ

```bash
# Transformerを使うモデル
yagokoro graph query "Transformerアーキテクチャを使用しているモデル"

# 2023年以降のモデル
yagokoro graph query "2023年以降にリリースされた主要なLLM"

# 特定の組織のモデル
yagokoro graph query "OpenAIが開発したすべてのAIモデル"
```

---

## 🔗 リレーション探索

### 直接の関係

```bash
# エンティティの関係を取得
yagokoro relation list --from "GPT-4"
yagokoro relation list --to "Transformer"

# 特定の関係タイプでフィルタ
yagokoro relation list --from "OpenAI" --type DEVELOPED
```

### パス探索

```bash
# 2エンティティ間のパスを探索
yagokoro graph path "BERT" "GPT-4"
yagokoro graph path "Attention Is All You Need" "Claude 3"

# ホップ数を制限
yagokoro graph path "Transformer" "LLaMA 3" --max-hops 5
```

---

## 🎯 高度なクエリ

### 技術の系譜

```cypher
# Transformerから派生した技術
MATCH (t:Technique {name: 'Transformer'})<-[:BASED_ON|USES_TECHNIQUE*1..3]-(m)
RETURN m.name, labels(m)

# 特定の技術を使うモデルの系譜
MATCH path = (m:AIModel)-[:BASED_ON*1..5]->(ancestor:AIModel)
WHERE m.name = 'GPT-4'
RETURN path
```

### 組織の影響力

```cypher
# 組織ごとのモデル数
MATCH (o:Organization)<-[:DEVELOPED_BY]-(m:AIModel)
RETURN o.name, count(m) as modelCount
ORDER BY modelCount DESC

# 組織間の人材移動
MATCH (p:Person)-[:EMPLOYED_AT]->(o1:Organization),
      (p)-[:FORMERLY_AT]->(o2:Organization)
WHERE o1 <> o2
RETURN p.name, o2.name as from, o1.name as to
```

### 論文の引用ネットワーク

```cypher
# 最も引用されている論文
MATCH (p:Publication)<-[:CITES]-(citing)
RETURN p.title, count(citing) as citations
ORDER BY citations DESC
LIMIT 10

# 論文と関連技術
MATCH (p:Publication)-[:INTRODUCES]->(t:Technique)
RETURN p.title, collect(t.name) as techniques
```

---

## 📊 統計・分析クエリ

### グラフ統計

```bash
# 全体統計
yagokoro graph stats

# エンティティタイプ別カウント
yagokoro graph stats --by-type
```

### コミュニティ分析

```bash
# コミュニティ一覧
yagokoro community list

# 特定コミュニティの詳細
yagokoro community get "transformer-family"

# コミュニティの再検出
yagokoro community detect --resolution 1.0
```

---

## 🤖 MCP経由のクエリ

Claude Desktop や Cursor から使用する例：

### 基本的な質問

```
YAGOKOROを使って、GPT-4について教えてください。
```

```
TransformerアーキテクチャがどのようにLLMの発展に影響したか説明してください。
```

```
OpenAIとAnthropicの主要なAIモデルを比較してください。
```

### 系譜・関係の質問

```
BERTからGPT-4への技術的な発展の経路を教えてください。
```

```
Attention Is All You Needの論文がどのモデルに影響を与えたか教えてください。
```

```
LLaMAファミリーのモデルの系譜を説明してください。
```

### 分析・推論の質問

```
2024年のLLMトレンドを分析してください。
```

```
オープンソースLLMと商用LLMの技術的な違いは何ですか？
```

```
マルチモーダルAIの発展における主要なマイルストーンは何ですか？
```

---

## 📝 Cypherクエリ例

### 基本パターン

```cypher
# ノードの検索
MATCH (n:AIModel) WHERE n.name CONTAINS 'GPT' RETURN n

# 関係の探索
MATCH (a)-[r]->(b) WHERE a.name = 'Transformer' RETURN type(r), b.name

# パスの検索
MATCH path = shortestPath((a:AIModel)-[*]-(b:AIModel))
WHERE a.name = 'BERT' AND b.name = 'GPT-4'
RETURN path
```

### 集計クエリ

```cypher
# リレーションタイプ別カウント
MATCH ()-[r]->() RETURN type(r), count(r) ORDER BY count(r) DESC

# ノードの次数（接続数）
MATCH (n)-[r]-() RETURN n.name, count(r) as degree ORDER BY degree DESC LIMIT 20
```

### 時系列分析

```cypher
# 年別モデルリリース数
MATCH (m:AIModel)
WHERE m.properties.releaseDate IS NOT NULL
RETURN substring(m.properties.releaseDate, 0, 4) as year, count(m) as count
ORDER BY year
```

---

## 💡 クエリのコツ

1. **具体的なエンティティ名を使う**: 「OpenAIのモデル」より「GPT-4」「GPT-3.5」
2. **関係タイプを指定**: `DEVELOPED_BY`, `BASED_ON`, `USES_TECHNIQUE`
3. **ホップ数を制限**: パス探索は3-5ホップを推奨
4. **コミュニティを活用**: 広範なトピックはコミュニティサマリーが有効
5. **ハイブリッド検索**: ベクトル+グラフの組み合わせが最も精度が高い
