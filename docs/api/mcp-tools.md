# MCP Tools リファレンス

YAGOKOROが提供するMCPツールの詳細リファレンスです。

## 概要

YAGOKOROは29のMCPツールを提供し、AIエージェントがナレッジグラフを操作できるようにします。

### ツールカテゴリ

| カテゴリ | ツール数 | 説明 |
|----------|----------|------|
| 基本ツール | 8 | エンティティ・リレーション操作 |
| v3.0.0 高度なツール | 9 | NLQ、推論、分析 |
| v4.0.0 時系列ツール | 5 | トレンド・タイムライン分析 |
| v4.0.0 研究者ツール | 7 | 研究者ネットワーク分析 |

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

---

## v4.0.0 時系列分析ツール 🆕

### temporal_analyze_trends

出版トレンドを分析します。

**入力スキーマ:**
```json
{
  "period": {
    "type": "string",
    "enum": ["year", "quarter", "month"],
    "default": "year",
    "description": "集計期間"
  },
  "from": {
    "type": "string",
    "description": "開始日 (YYYY-MM-DD)"
  },
  "to": {
    "type": "string",
    "description": "終了日 (YYYY-MM-DD)"
  }
}
```

**出力:**
```json
{
  "trends": [
    { "period": "2023", "count": 25, "growthRate": 0.39 },
    { "period": "2024", "count": 32, "growthRate": 0.28 }
  ],
  "direction": "increasing",
  "averageGrowthRate": 0.45
}
```

---

### temporal_get_timeline

エンティティのタイムラインを取得します。

**入力スキーマ:**
```json
{
  "entityId": {
    "type": "string",
    "description": "エンティティID"
  },
  "category": {
    "type": "string",
    "description": "カテゴリでフィルタ"
  },
  "from": {
    "type": "string",
    "description": "開始日"
  },
  "to": {
    "type": "string",
    "description": "終了日"
  }
}
```

**出力:**
```json
{
  "events": [
    { "date": "2017-06-12", "event": "Attention Is All You Need", "type": "publication" },
    { "date": "2018-10-11", "event": "BERT発表", "type": "publication" }
  ]
}
```

---

### temporal_hot_topics

注目トピックを検出します。

**入力スキーマ:**
```json
{
  "limit": {
    "type": "number",
    "default": 10,
    "description": "取得件数"
  },
  "timeWindow": {
    "type": "string",
    "default": "6m",
    "description": "時間窓 (例: 6m, 1y)"
  }
}
```

**出力:**
```json
{
  "topics": [
    { "name": "Large Language Models", "score": 98.5, "frequency": 45 },
    { "name": "Multimodal AI", "score": 92.3, "frequency": 38 }
  ]
}
```

---

### temporal_forecast

トレンドを予測します。

**入力スキーマ:**
```json
{
  "periods": {
    "type": "number",
    "default": 3,
    "description": "予測期間数"
  },
  "model": {
    "type": "string",
    "enum": ["linear", "exponential"],
    "default": "linear",
    "description": "予測モデル"
  }
}
```

**出力:**
```json
{
  "predictions": [
    { "period": "2025", "predicted": 42, "confidence": [38, 46] },
    { "period": "2026", "predicted": 55, "confidence": [48, 62] }
  ],
  "r2": 0.94
}
```

---

### temporal_by_phase

研究フェーズ別に分析します。

**入力スキーマ:**
```json
{}
```

**出力:**
```json
{
  "phases": [
    { "name": "黎明期", "period": "2017-2018", "paperCount": 7, "keyTopics": ["Attention", "BERT"] },
    { "name": "成長期", "period": "2019-2020", "paperCount": 13, "keyTopics": ["GPT", "Scaling"] }
  ]
}
```

---

## v4.0.0 研究者ネットワークツール 🆕

### researcher_search

研究者を検索します。

**入力スキーマ:**
```json
{
  "name": {
    "type": "string",
    "description": "研究者名"
  },
  "affiliation": {
    "type": "string",
    "description": "所属機関"
  },
  "topic": {
    "type": "string",
    "description": "研究トピック"
  },
  "limit": {
    "type": "number",
    "default": 20,
    "description": "最大件数"
  }
}
```

**出力:**
```json
{
  "researchers": [
    { "id": "uuid", "name": "Geoffrey Hinton", "affiliation": "Google", "paperCount": 234, "citations": 456789 }
  ]
}
```

---

### researcher_get

研究者の詳細を取得します。

**入力スキーマ:**
```json
{
  "researcherId": {
    "type": "string",
    "required": true,
    "description": "研究者ID"
  }
}
```

---

### researcher_coauthors

共著者ネットワークを取得します。

**入力スキーマ:**
```json
{
  "researcherId": {
    "type": "string",
    "required": true,
    "description": "研究者ID"
  },
  "limit": {
    "type": "number",
    "default": 20,
    "description": "最大共著者数"
  },
  "minCoauthors": {
    "type": "number",
    "default": 1,
    "description": "最小共著回数"
  }
}
```

**出力:**
```json
{
  "coauthors": [
    { "id": "uuid", "name": "Yann LeCun", "coauthorCount": 28 },
    { "id": "uuid", "name": "Yoshua Bengio", "coauthorCount": 24 }
  ],
  "totalCoauthors": 45
}
```

---

### researcher_path

研究者間の協力経路を探索します。

**入力スキーマ:**
```json
{
  "from": {
    "type": "string",
    "required": true,
    "description": "始点研究者ID"
  },
  "to": {
    "type": "string",
    "required": true,
    "description": "終点研究者ID"
  },
  "maxHops": {
    "type": "number",
    "default": 5,
    "description": "最大ホップ数"
  }
}
```

**出力:**
```json
{
  "found": true,
  "path": ["Geoffrey Hinton", "Ilya Sutskever", "Dario Amodei"],
  "hops": 2,
  "explanation": "Hinton → Sutskever (共著: AlexNet) → Amodei (共同創業: Anthropic)"
}
```

---

### researcher_ranking

研究者ランキングを取得します。

**入力スキーマ:**
```json
{
  "metric": {
    "type": "string",
    "enum": ["citations", "h-index", "publications"],
    "default": "citations",
    "description": "ランキング指標"
  },
  "limit": {
    "type": "number",
    "default": 10,
    "description": "取得件数"
  }
}
```

**出力:**
```json
{
  "rankings": [
    { "rank": 1, "name": "Geoffrey Hinton", "value": 456789 },
    { "rank": 2, "name": "Yann LeCun", "value": 345678 }
  ],
  "metric": "citations"
}
```

---

### researcher_communities

研究者コミュニティを検出します。

**入力スキーマ:**
```json
{
  "algorithm": {
    "type": "string",
    "enum": ["louvain", "leiden"],
    "default": "louvain",
    "description": "検出アルゴリズム"
  },
  "minSize": {
    "type": "number",
    "default": 3,
    "description": "最小コミュニティサイズ"
  }
}
```

**出力:**
```json
{
  "communities": [
    { "id": 1, "size": 45, "leader": "Geoffrey Hinton", "theme": "Deep Learning Origins" },
    { "id": 2, "size": 38, "leader": "Ashish Vaswani", "theme": "Transformer Architecture" }
  ],
  "modularity": 0.68
}
```

---

### researcher_career

研究者のキャリアを分析します。

**入力スキーマ:**
```json
{
  "researcherId": {
    "type": "string",
    "required": true,
    "description": "研究者ID"
  }
}
```

**出力:**
```json
{
  "periods": [
    { "period": "2010-2015", "publications": 45, "mainTopics": ["Deep Learning", "CNN"] },
    { "period": "2015-2020", "publications": 67, "mainTopics": ["NLP", "Transformer"] }
  ],
  "totalPublications": 234,
  "topCollaborators": ["Yann LeCun", "Yoshua Bengio"]
}
```

---

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
