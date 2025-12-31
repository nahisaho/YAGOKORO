# @yagokoro/multilang

> Multilingual paper processing for YAGOKORO - language detection, translation, and cross-lingual entity linking

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 概要

`@yagokoro/multilang` は、中国語・日本語・韓国語の学術論文を処理するための多言語対応パッケージです。
言語検出、翻訳、固有表現抽出（NER）、異言語間エンティティリンキングの機能を提供します。

### 主な機能

| 機能 | 説明 | 要件 |
|------|------|------|
| **言語検出** | 論文テキストの言語を自動判定 | REQ-008-02 |
| **翻訳** | DeepL/Google翻訳による英語変換 | REQ-008-03, REQ-008-08 |
| **NER** | spaCyを使用した多言語固有表現抽出 | REQ-008-06 |
| **エンティティリンキング** | 異言語間での用語リンキング | REQ-008-05, REQ-008-11 |
| **キャッシュ** | SQLite/Redisハイブリッドキャッシュ | REQ-008-07 |

## インストール

```bash
pnpm add @yagokoro/multilang
```

### Python環境のセットアップ（オプション）

言語検出とNER機能にはPython環境が必要です：

```bash
cd libs/multilang
pnpm python:setup
```

## クイックスタート

### 基本的な使い方

```typescript
import {
  LanguageDetector,
  TranslationService,
  MultilingualNER,
  CrossLingualLinker,
} from '@yagokoro/multilang';

// 言語検出
const detector = new LanguageDetector();
const result = await detector.detect('大規模言語モデルの研究');
console.log(result.language); // 'ja'
console.log(result.confidence); // 0.95

// 翻訳
const translator = new TranslationService({
  deepLApiKey: process.env.DEEPL_API_KEY,
  googleApiKey: process.env.GOOGLE_TRANSLATE_API_KEY,
});

const translation = await translator.translate('注意機構', {
  sourceLanguage: 'ja',
  targetLanguage: 'en',
});
console.log(translation.translated); // 'Attention mechanism'

// NER (Named Entity Recognition)
const ner = new MultilingualNER();
const entities = await ner.extract('Transformer模型由Google Brain提出', 'zh');
// [{ text: 'Transformer', type: 'TECH' }, { text: 'Google Brain', type: 'ORG' }]

// 異言語間リンキング
const linker = new CrossLingualLinker();
const links = await linker.link(entities, 'zh');
```

### 統合サービスの使用

```typescript
import { MultilingualService } from '@yagokoro/multilang';

const service = new MultilingualService({
  deepLApiKey: process.env.DEEPL_API_KEY,
  cache: {
    type: 'sqlite',
    path: './cache/translations.db',
  },
});

// 論文の一括処理
const metadata = await service.processPaper({
  title: '大型语言模型综述',
  abstract: '本文介绍了大型语言模型的发展历程...',
});

console.log(metadata.originalLanguage); // 'zh'
console.log(metadata.translatedTitle); // 'Survey on Large Language Models'
console.log(metadata.entities); // 抽出されたエンティティ
console.log(metadata.crossLinks); // 異言語間リンク
```

## API リファレンス

### LanguageDetector

論文テキストの言語を自動判定します。

```typescript
class LanguageDetector {
  detect(text: string): Promise<LanguageDetectionResult>;
  detectBatch(texts: string[]): Promise<LanguageDetectionResult[]>;
}

interface LanguageDetectionResult {
  language: SupportedLanguage | 'unknown';
  confidence: number;
  requiresManualReview: boolean;
  alternatives: Array<{ language: SupportedLanguage; confidence: number }>;
}
```

#### 設定

| パラメータ | デフォルト | 説明 |
|-----------|-----------|------|
| `confidenceThreshold` | `0.7` | この値未満は手動レビューが必要 |
| `pythonPath` | `'python3'` | Pythonインタープリタのパス |

### TranslationService

DeepL/Google翻訳による翻訳サービスを提供します。

```typescript
class TranslationService {
  constructor(options: TranslationServiceOptions);
  translate(text: string, options: TranslationOptions): Promise<TranslationResult>;
  translateBatch(texts: string[], options: TranslationOptions): Promise<TranslationResult[]>;
}

interface TranslationOptions {
  sourceLanguage?: SupportedLanguage;
  targetLanguage?: SupportedLanguage; // default: 'en'
  useCache?: boolean; // default: true
  timeout?: number; // default: 2000ms
  preferredProvider?: 'deepl' | 'google';
}
```

#### フォールバック動作

1. DeepL API で翻訳を試行（2秒タイムアウト）
2. 失敗した場合、Google Translate にフォールバック
3. 両方失敗した場合はエラーを返す

### MultilingualNER

spaCyを使用した多言語固有表現抽出。

```typescript
class MultilingualNER {
  extract(text: string, language: SupportedLanguage): Promise<NERResult>;
}

interface NEREntity {
  text: string;
  type: string; // PERSON, ORG, TECH, LOC, etc.
  start: number;
  end: number;
  confidence: number;
  language: SupportedLanguage;
}
```

#### サポートするspaCyモデル

| 言語 | モデル |
|------|--------|
| English | `en_core_web_sm` |
| Chinese | `zh_core_web_sm` |
| Japanese | `ja_core_news_sm` |
| Korean | `ko_core_news_sm` |

### CrossLingualLinker

異言語間でのエンティティリンキング。

```typescript
class CrossLingualLinker {
  link(entities: NEREntity[], sourceLanguage: SupportedLanguage): Promise<CrossLingualLink[]>;
}

interface CrossLingualLink {
  sourceEntity: NEREntity;
  targetEntityId: string;
  similarity: number; // threshold: 0.8
  linkType: 'exact' | 'semantic' | 'partial';
  autoLinked: boolean;
}
```

### TermNormalizer

技術用語の正規化と標準形への変換。

```typescript
class TermNormalizer {
  normalize(term: string, language: SupportedLanguage): string;
  getSynonyms(term: string): string[];
}
```

#### 例

```typescript
const normalizer = new TermNormalizer();
normalizer.normalize('llm', 'en'); // 'Large Language Model'
normalizer.normalize('大语言模型', 'zh'); // 'Large Language Model'
normalizer.normalize('LLM', 'ja'); // 'Large Language Model'
```

### TranslationCache

翻訳結果のキャッシュストレージ。

```typescript
// メモリキャッシュ
const memoryCache = new TranslationCache(new MemoryCacheStorage());

// SQLiteキャッシュ（永続化）
const sqliteCache = new TranslationCache(
  new SQLiteCacheStorage('./cache/translations.db')
);

// Redisキャッシュ（分散環境）
const redisCache = new TranslationCache(
  new RedisCacheStorage('redis://localhost:6379')
);
```

### MultilingualMetadataRepository

Neo4jへの多言語メタデータ保存。

```typescript
import { MultilingualMetadataRepository, runMigration } from '@yagokoro/multilang';

// スキーマのマイグレーション
await runMigration(neo4jSession);

// リポジトリの使用
const repo = new MultilingualMetadataRepository(neo4jSession);

// メタデータの保存
await repo.saveMetadata(metadata);

// 言語で論文を検索
const chinesePapers = await repo.getPapersByLanguage('zh');

// 言語統計の取得
const stats = await repo.getLanguageStats();
```

## 型定義

### SupportedLanguage

```typescript
type SupportedLanguage = 'en' | 'zh' | 'ja' | 'ko';
```

### MultilingualMetadata

```typescript
interface MultilingualMetadata {
  paperId: string;
  originalLanguage: SupportedLanguage;
  originalTitle: string;
  translatedTitle?: string;
  originalAbstract: string;
  translatedAbstract?: string;
  languageConfidence: number;
  processedAt: Date;
  entities: NEREntity[];
  crossLinks: CrossLingualLink[];
}
```

## Neo4j スキーマ

### ノードラベル

```cypher
(:MultilingualMetadata {
  id: string,
  paperId: string,
  originalLanguage: string,
  originalTitle: string,
  translatedTitle: string,
  languageConfidence: float,
  processedAt: datetime
})
```

### リレーションシップ

```cypher
(:MultilingualMetadata)-[:METADATA_FOR]->(:Paper)
(:Entity)-[:CROSS_LINGUAL_LINK {
  similarity: float,
  linkType: string,
  autoLinked: boolean
}]->(:Entity)
```

## 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `DEEPL_API_KEY` | Yes | DeepL API キー |
| `GOOGLE_TRANSLATE_API_KEY` | No | Google Translate API キー（フォールバック用） |
| `PYTHON_PATH` | No | Pythonインタープリタのパス（デフォルト: `python3`） |
| `TRANSLATION_CACHE_PATH` | No | SQLiteキャッシュのパス |
| `REDIS_URL` | No | Redis接続URL |

## 設定例

### フル設定

```typescript
import { MultilingualService, SQLiteCacheStorage } from '@yagokoro/multilang';

const service = new MultilingualService({
  // 翻訳設定
  deepLApiKey: process.env.DEEPL_API_KEY,
  googleApiKey: process.env.GOOGLE_TRANSLATE_API_KEY,
  
  // キャッシュ設定
  cache: {
    storage: new SQLiteCacheStorage('./cache/translations.db'),
    ttl: 86400 * 30, // 30日間
  },
  
  // 言語検出設定
  languageDetection: {
    confidenceThreshold: 0.7,
    pythonPath: '/usr/bin/python3',
  },
  
  // リンキング設定
  linking: {
    similarityThreshold: 0.8,
    autoLinkEnabled: true,
  },
  
  // タイムアウト設定
  timeout: 2000,
});
```

## テスト

```bash
# 全テストの実行
pnpm test

# ウォッチモードで実行
pnpm test:watch

# 特定のテストファイルを実行
pnpm test TranslationService
```

## 要件マッピング

| 要件ID | 説明 | 実装 |
|--------|------|------|
| REQ-008-01 | 中国語/日本語/韓国語対応 | `SupportedLanguage` 型 |
| REQ-008-02 | 自動言語検出 | `LanguageDetector` |
| REQ-008-03 | 英語への翻訳 | `TranslationService` |
| REQ-008-04 | メタデータ保存 | `MultilingualMetadata` |
| REQ-008-05 | 異言語間リンキング | `CrossLingualLinker` |
| REQ-008-06 | 多言語NER | `MultilingualNER` |
| REQ-008-07 | 翻訳キャッシュ | `TranslationCache` |
| REQ-008-08 | Google Translateフォールバック | `TranslationService` |
| REQ-008-09 | 信頼度閾値0.7 | `LanguageDetector` |
| REQ-008-10 | 2秒タイムアウト | `TranslationOptions.timeout` |
| REQ-008-11 | リンキング閾値0.8 | `CrossLingualLinker` |
| REQ-008-12 | 手動レビュー機能 | `requiresManualReview` フラグ |

## ライセンス

MIT License - see [LICENSE](../../LICENSE) for details.
