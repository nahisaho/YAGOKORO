# MCP Tools リファレンス

YAGOKOROが提供するMCPツールの詳細リファレンスです。

## 概要

YAGOKOROは8つのMCPツールを提供し、AIエージェントがナレッジグラフを操作できるようにします。

## ツール一覧

### queryKnowledgeGraph

自然言語でナレッジグラフを検索します。

**入力スキーマ:**
```json
{
  "query": {
    "type": "string",
    "description": "検索クエリ（自然言語）"
  },
  "mode": {
    "type": "string",
    "enum": ["local", "global", "hybrid"],
    "default": "hybrid",
    "description": "検索モード"
  },
  "maxResults": {
    "type": "number",
    "default": 10,
    "description": "最大結果数"
  }
}
```

**検索モード:**
- `local`: ベクトル検索 + グラフ探索（具体的なエンティティ検索向け）
- `global`: コミュニティサマリーベースのMap-Reduce（広範な質問向け）
- `hybrid`: local + global の重み付け組み合わせ（推奨）

**使用例:**
```
queryKnowledgeGraph({
  query: "Transformerアーキテクチャを使用している主要なモデルは？",
  mode: "hybrid",
  maxResults: 5
})
```

---

### getEntity

ID または名前でエンティティを取得します。

**入力スキーマ:**
```json
{
  "id": {
    "type": "string",
    "description": "エンティティID"
  },
  "name": {
    "type": "string",
    "description": "エンティティ名（idがない場合に使用）"
  }
}
```

**出力:**
```json
{
  "id": "uuid-here",
  "type": "AIModel",
  "name": "GPT-4",
  "description": "OpenAIの大規模言語モデル",
  "properties": {
    "releaseDate": "2023-03-14",
    "parameterCount": "~1.7T"
  },
  "relations": [
    {
      "type": "DEVELOPED_BY",
      "targetId": "openai-uuid",
      "targetName": "OpenAI"
    }
  ]
}
```

---

### getRelations

指定エンティティのリレーションを取得します。

**入力スキーマ:**
```json
{
  "entityId": {
    "type": "string",
    "description": "エンティティID",
    "required": true
  },
  "direction": {
    "type": "string",
    "enum": ["outgoing", "incoming", "both"],
    "default": "both",
    "description": "リレーションの方向"
  },
  "relationTypes": {
    "type": "array",
    "items": { "type": "string" },
    "description": "フィルタするリレーションタイプ"
  },
  "maxDepth": {
    "type": "number",
    "default": 1,
    "description": "探索深度"
  }
}
```

**使用例:**
```
getRelations({
  entityId: "gpt4-uuid",
  direction: "outgoing",
  relationTypes: ["BASED_ON", "USES_TECHNIQUE"]
})
```

---

### getPath

2つのエンティティ間のパスを探索します。

**入力スキーマ:**
```json
{
  "sourceId": {
    "type": "string",
    "description": "始点エンティティID",
    "required": true
  },
  "targetId": {
    "type": "string",
    "description": "終点エンティティID",
    "required": true
  },
  "maxHops": {
    "type": "number",
    "default": 5,
    "minimum": 2,
    "maximum": 10,
    "description": "最大ホップ数"
  },
  "relationTypes": {
    "type": "array",
    "items": { "type": "string" },
    "description": "許可するリレーションタイプ"
  }
}
```

**出力:**
```json
{
  "found": true,
  "paths": [
    {
      "nodes": ["GPT-4", "Transformer", "BERT"],
      "relations": ["USES_TECHNIQUE", "USES_TECHNIQUE"],
      "length": 2,
      "confidence": 0.85
    }
  ]
}
```

---

### getCommunity

コミュニティ情報を取得します。

**入力スキーマ:**
```json
{
  "communityId": {
    "type": "string",
    "description": "コミュニティID"
  },
  "entityId": {
    "type": "string",
    "description": "所属エンティティIDで検索"
  },
  "level": {
    "type": "number",
    "default": 1,
    "description": "階層レベル"
  }
}
```

**出力:**
```json
{
  "id": "comm-uuid",
  "name": "Large Language Models Cluster",
  "level": 1,
  "summary": "このコミュニティは大規模言語モデルとその関連技術を含む...",
  "memberCount": 25,
  "keyEntities": ["GPT-4", "Claude", "PaLM"],
  "parentId": "parent-comm-uuid"
}
```

---

### addEntity

新しいエンティティを追加します。

**入力スキーマ:**
```json
{
  "name": {
    "type": "string",
    "description": "エンティティ名",
    "required": true
  },
  "type": {
    "type": "string",
    "enum": ["AIModel", "Organization", "Person", "Publication", "Technique", "Benchmark", "Concept"],
    "description": "エンティティタイプ",
    "required": true
  },
  "description": {
    "type": "string",
    "description": "説明"
  },
  "properties": {
    "type": "object",
    "description": "追加プロパティ"
  }
}
```

**使用例:**
```
addEntity({
  name: "Llama 3",
  type: "AIModel",
  description: "Metaのオープンソース大規模言語モデル",
  properties: {
    releaseDate: "2024-04-18",
    organization: "Meta"
  }
})
```

---

### addRelation

新しいリレーションを追加します。

**入力スキーマ:**
```json
{
  "sourceId": {
    "type": "string",
    "description": "ソースエンティティID",
    "required": true
  },
  "targetId": {
    "type": "string",
    "description": "ターゲットエンティティID",
    "required": true
  },
  "type": {
    "type": "string",
    "enum": ["DEVELOPED_BY", "BASED_ON", "AUTHORED", "USES_TECHNIQUE", "EVALUATED_ON", "EMPLOYED_AT", "PRECEDES", "MEMBER_OF"],
    "description": "リレーションタイプ",
    "required": true
  },
  "properties": {
    "type": "object",
    "description": "追加プロパティ"
  },
  "confidence": {
    "type": "number",
    "minimum": 0,
    "maximum": 1,
    "default": 1.0,
    "description": "信頼度スコア"
  }
}
```

---

### searchSimilar

ベクトル類似度で関連エンティティを検索します。

**入力スキーマ:**
```json
{
  "query": {
    "type": "string",
    "description": "検索クエリまたはエンティティID"
  },
  "entityId": {
    "type": "string",
    "description": "類似エンティティを検索する基準エンティティ"
  },
  "topK": {
    "type": "number",
    "default": 10,
    "description": "返す結果数"
  },
  "threshold": {
    "type": "number",
    "default": 0.7,
    "description": "類似度しきい値"
  },
  "entityTypes": {
    "type": "array",
    "items": { "type": "string" },
    "description": "フィルタするエンティティタイプ"
  }
}
```

**使用例:**
```
searchSimilar({
  query: "attention mechanism transformer",
  topK: 5,
  entityTypes: ["Technique", "AIModel"]
})
```

---

## MCP Resources

### ontology://schema

オントロジースキーマを取得します。

```
URI: ontology://schema
MimeType: application/json
```

### graph://statistics

グラフ統計を取得します。

```
URI: graph://statistics
MimeType: application/json
```

**出力例:**
```json
{
  "nodeCount": 1523,
  "relationCount": 4821,
  "entityTypeCounts": {
    "AIModel": 245,
    "Organization": 89,
    "Person": 312,
    "Publication": 456,
    "Technique": 198,
    "Benchmark": 67,
    "Concept": 156
  },
  "communityCount": 42
}
```

---

## 高度なツール (v0.3.0+)

### naturalLanguageQuery

自然言語をCypherクエリに変換してナレッジグラフを検索します。

**入力スキーマ:**
```json
{
  "query": {
    "type": "string",
    "description": "自然言語のクエリ",
    "required": true
  },
  "context": {
    "type": "string",
    "description": "追加のコンテキスト情報"
  },
  "maxResults": {
    "type": "number",
    "default": 10,
    "description": "最大結果数"
  }
}
```

**使用例:**
```
naturalLanguageQuery({
  query: "2023年以降にリリースされたTransformerベースのモデル一覧",
  maxResults: 20
})
```

**出力:**
```json
{
  "results": [...],
  "cypherQuery": "MATCH (m:AIModel)-[:USES_TECHNIQUE]->(t:Technique {name: 'Transformer'}) WHERE m.releaseDate >= '2023-01-01' RETURN m",
  "intent": {
    "type": "filter_query",
    "entities": ["AIModel"],
    "filters": ["releaseDate", "technique"]
  }
}
```

---

### chainOfThought

複雑な質問に対して多段階推論を実行します。

**入力スキーマ:**
```json
{
  "query": {
    "type": "string",
    "description": "分析したい質問",
    "required": true
  },
  "context": {
    "type": "object",
    "description": "追加のコンテキスト（グラフデータなど）"
  },
  "maxSteps": {
    "type": "number",
    "default": 5,
    "description": "最大推論ステップ数"
  }
}
```

**使用例:**
```
chainOfThought({
  query: "GPT-4がBERTより優れている理由を技術的な観点から説明してください",
  maxSteps: 7
})
```

**出力:**
```json
{
  "steps": [
    {
      "step": 1,
      "reasoning": "まず、GPT-4とBERTのアーキテクチャの違いを確認します",
      "evidence": ["GPT-4: decoder-only", "BERT: encoder-only"],
      "confidence": 0.95
    },
    {
      "step": 2,
      "reasoning": "次に、パラメータ数を比較します",
      "evidence": ["GPT-4: ~1.7T", "BERT: 340M"],
      "confidence": 0.90
    }
  ],
  "conclusion": "GPT-4はスケール、アーキテクチャ改善、RLHF等により...",
  "overallConfidence": 0.87
}
```

---

### validateResponse

AIレスポンスの整合性と矛盾を検証します。

**入力スキーマ:**
```json
{
  "response": {
    "type": "string",
    "description": "検証するレスポンス",
    "required": true
  },
  "context": {
    "type": "object",
    "description": "レスポンス生成時のコンテキスト"
  },
  "graphEvidence": {
    "type": "array",
    "description": "グラフから取得したエビデンス"
  }
}
```

**使用例:**
```
validateResponse({
  response: "GPT-4は2022年にリリースされ、Googleが開発しました",
  graphEvidence: [
    {"type": "fact", "content": "GPT-4 releaseDate: 2023-03-14"},
    {"type": "fact", "content": "GPT-4 DEVELOPED_BY OpenAI"}
  ]
})
```

**出力:**
```json
{
  "isValid": false,
  "contradictions": [
    {
      "type": "temporal",
      "claim": "GPT-4は2022年にリリース",
      "evidence": "GPT-4 releaseDate: 2023-03-14",
      "severity": "high"
    },
    {
      "type": "direct",
      "claim": "Googleが開発",
      "evidence": "GPT-4 DEVELOPED_BY OpenAI",
      "severity": "high"
    }
  ],
  "coherenceScore": 0.15
}
```

---

### checkConsistency

レスポンスとグラフデータの一貫性をチェックします。

**入力スキーマ:**
```json
{
  "claims": {
    "type": "array",
    "items": { "type": "string" },
    "description": "検証する主張のリスト",
    "required": true
  },
  "entityIds": {
    "type": "array",
    "items": { "type": "string" },
    "description": "関連エンティティのID"
  }
}
```

**使用例:**
```
checkConsistency({
  claims: [
    "TransformerはGoogleが発明した",
    "BERTはTransformerを使用している",
    "GPT-4はOpenAIが開発した"
  ]
})
```

**出力:**
```json
{
  "results": [
    {
      "claim": "TransformerはGoogleが発明した",
      "isConsistent": true,
      "evidence": ["Transformer DEVELOPED_BY Google"],
      "confidence": 0.95
    },
    {
      "claim": "BERTはTransformerを使用している",
      "isConsistent": true,
      "evidence": ["BERT USES_TECHNIQUE Transformer"],
      "confidence": 0.98
    }
  ],
  "overallConsistency": 0.96
}
```

---

## エラーコード

| コード | 説明 |
|--------|------|
| `ERR_6001` | ツールが見つからない |
| `ERR_6002` | 無効なパラメータ |
| `ERR_6003` | 実行エラー |
| `ERR_6004` | サーバーエラー |
| `ERR_1002` | エンティティが見つからない |
| `ERR_1001` | バリデーションエラー |

## ベストプラクティス

1. **検索モードの選択**
   - 具体的なエンティティを探す → `local`
   - 広範なトピックについて知る → `global`
   - 不明な場合 → `hybrid`（デフォルト）

2. **パス探索の最適化**
   - `maxHops` は必要最小限に（推奨: 3-5）
   - `relationTypes` でフィルタして効率化

3. **類似検索の活用**
   - 新しいエンティティを追加する前に類似検索で重複確認
   - `threshold` を調整して精度/再現率をバランス
