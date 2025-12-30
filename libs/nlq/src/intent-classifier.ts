/**
 * @fileoverview Intent Classifier for NLQ
 * @description Classifies natural language queries into intent types
 * @module @yagokoro/nlq/intent-classifier
 */

import {
  type QueryIntent,
  type LLMClient,
  QueryIntentSchema,
  QueryIntentType,
} from './types.js';

/**
 * Configuration for IntentClassifier
 */
export interface IntentClassifierConfig {
  /** Temperature for LLM (default: 0.1 for consistency) */
  temperature?: number;
  /** Maximum tokens for response */
  maxTokens?: number;
  /** Default language */
  defaultLang?: 'ja' | 'en';
}

/**
 * IntentClassifier - Classifies natural language queries
 *
 * Uses LLM to classify user queries into predefined intent types:
 * - ENTITY_LOOKUP: Looking up specific entities
 * - RELATIONSHIP_QUERY: Querying relationships between entities
 * - PATH_FINDING: Finding paths between entities
 * - AGGREGATION: Count, statistics queries
 * - GLOBAL_SUMMARY: Overview/trend queries
 * - COMPARISON: Comparing entities
 *
 * @example
 * ```typescript
 * const classifier = new IntentClassifier(llmClient);
 * const intent = await classifier.classify("Who developed Transformer?");
 * // { type: 'RELATIONSHIP_QUERY', confidence: 0.92, entities: ['Transformer'], ... }
 * ```
 */
export class IntentClassifier {
  private readonly config: Required<IntentClassifierConfig>;

  constructor(
    private readonly llm: LLMClient,
    config: IntentClassifierConfig = {}
  ) {
    this.config = {
      temperature: config.temperature ?? 0.1,
      maxTokens: config.maxTokens ?? 500,
      defaultLang: config.defaultLang ?? 'ja',
    };
  }

  /**
   * Classify a natural language query
   *
   * @param query The user's natural language query
   * @param lang Language hint ('ja' or 'en')
   * @returns Classified intent with confidence score
   */
  async classify(query: string, lang?: 'ja' | 'en'): Promise<QueryIntent> {
    const language = lang ?? this.config.defaultLang;
    const prompt = this.buildPrompt(query, language);

    try {
      const response = await this.llm.complete(prompt, {
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      });

      return this.parseResponse(response, query);
    } catch (error) {
      // Return low-confidence fallback on LLM error
      return this.createFallbackIntent(query);
    }
  }

  /**
   * Build the classification prompt
   */
  private buildPrompt(query: string, lang: 'ja' | 'en'): string {
    const langLabel = lang === 'ja' ? '日本語' : 'English';

    return `あなたはクエリ意図分類の専門家です。ユーザーのクエリを以下の6つのカテゴリに分類してください。

## 意図タイプ
1. ENTITY_LOOKUP: 特定のエンティティについて調べる（例: "GPT-4とは？", "BERTについて教えて"）
2. RELATIONSHIP_QUERY: エンティティ間の関係を問う（例: "Transformerを開発したのは誰？", "OpenAIが作ったモデル"）
3. PATH_FINDING: エンティティ間のパスや関連を探す（例: "BERTとGPTの関係は？", "AttentionからGPT-4への流れ"）
4. AGGREGATION: 集計や統計（例: "2023年にリリースされたモデル数は？", "最も引用された論文"）
5. GLOBAL_SUMMARY: 全体的な傾向やサマリー（例: "NLPの最新トレンドは？", "LLMの進化の概要"）
6. COMPARISON: エンティティの比較（例: "GPT-4とClaude 3の違いは？", "BERTとRoBERTaの比較"）

## クエリ
言語: ${langLabel}
クエリ: "${query}"

## 出力形式（JSON）
{
  "type": "ENTITY_LOOKUP" | "RELATIONSHIP_QUERY" | "PATH_FINDING" | "AGGREGATION" | "GLOBAL_SUMMARY" | "COMPARISON",
  "confidence": 0.0〜1.0の数値,
  "entities": ["検出されたエンティティ名の配列"],
  "relations": ["検出されたリレーション名の配列（あれば）"],
  "isAmbiguous": true/false（クエリが曖昧かどうか）,
  "clarificationNeeded": "曖昧な場合の明確化質問（任意）"
}

JSONのみを出力してください。`;
  }

  /**
   * Parse LLM response into QueryIntent
   */
  private parseResponse(response: string, originalQuery: string): QueryIntent {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.createFallbackIntent(originalQuery);
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate with Zod schema
      const result = QueryIntentSchema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }

      // Try to fix common issues
      return this.fixAndValidate(parsed, originalQuery);
    } catch {
      return this.createFallbackIntent(originalQuery);
    }
  }

  /**
   * Attempt to fix and validate partially valid response
   */
  private fixAndValidate(parsed: unknown, originalQuery: string): QueryIntent {
    if (typeof parsed !== 'object' || parsed === null) {
      return this.createFallbackIntent(originalQuery);
    }

    const obj = parsed as Record<string, unknown>;

    // Ensure required fields
    const type = this.normalizeType(obj.type);
    const confidence = this.normalizeConfidence(obj.confidence);
    const entities = this.normalizeEntities(obj.entities, originalQuery);
    const relations = Array.isArray(obj.relations) ? obj.relations.filter((r): r is string => typeof r === 'string') : undefined;
    const isAmbiguous = typeof obj.isAmbiguous === 'boolean' ? obj.isAmbiguous : confidence < 0.7;
    const clarificationNeeded = typeof obj.clarificationNeeded === 'string' ? obj.clarificationNeeded : undefined;

    return {
      type,
      confidence,
      entities,
      relations,
      isAmbiguous,
      clarificationNeeded,
    };
  }

  /**
   * Normalize intent type
   */
  private normalizeType(type: unknown): QueryIntent['type'] {
    if (typeof type === 'string') {
      const upperType = type.toUpperCase();
      if (Object.values(QueryIntentType).includes(upperType as QueryIntent['type'])) {
        return upperType as QueryIntent['type'];
      }
    }
    return 'ENTITY_LOOKUP'; // Default fallback
  }

  /**
   * Normalize confidence score
   */
  private normalizeConfidence(confidence: unknown): number {
    if (typeof confidence === 'number') {
      return Math.max(0, Math.min(1, confidence));
    }
    if (typeof confidence === 'string') {
      const parsed = Number.parseFloat(confidence);
      if (!Number.isNaN(parsed)) {
        return Math.max(0, Math.min(1, parsed));
      }
    }
    return 0.5; // Default medium confidence
  }

  /**
   * Normalize entities array
   */
  private normalizeEntities(entities: unknown, query: string): string[] {
    if (Array.isArray(entities)) {
      return entities.filter((e): e is string => typeof e === 'string');
    }
    // Try to extract entities from query using simple heuristics
    return this.extractEntitiesHeuristic(query);
  }

  /**
   * Simple heuristic entity extraction from query
   */
  private extractEntitiesHeuristic(query: string): string[] {
    // Look for common AI model patterns
    const patterns = [
      /GPT-?[0-9.]+/gi,
      /BERT|RoBERTa|ALBERT|DistilBERT/gi,
      /Claude[- ]?[0-9.]*/gi,
      /Llama[- ]?[0-9.]*/gi,
      /Gemini[- ]?[0-9.]*/gi,
      /Transformer/gi,
      /Attention/gi,
    ];

    const entities = new Set<string>();
    for (const pattern of patterns) {
      const matches = query.match(pattern);
      if (matches) {
        for (const match of matches) {
          entities.add(match);
        }
      }
    }

    return Array.from(entities);
  }

  /**
   * Create fallback intent for error cases
   */
  private createFallbackIntent(query: string): QueryIntent {
    const entities = this.extractEntitiesHeuristic(query);

    // Simple heuristic classification
    const lowerQuery = query.toLowerCase();

    let type: QueryIntent['type'] = 'ENTITY_LOOKUP';

    if (lowerQuery.includes('比較') || lowerQuery.includes('違い') ||
        lowerQuery.includes('compare') || lowerQuery.includes('difference')) {
      type = 'COMPARISON';
    } else if (lowerQuery.includes('誰') || lowerQuery.includes('開発') ||
               lowerQuery.includes('who') || lowerQuery.includes('developed')) {
      type = 'RELATIONSHIP_QUERY';
    } else if (lowerQuery.includes('関係') || lowerQuery.includes('つながり') ||
               lowerQuery.includes('relation') || lowerQuery.includes('path')) {
      type = 'PATH_FINDING';
    } else if (lowerQuery.includes('いくつ') || lowerQuery.includes('数') ||
               lowerQuery.includes('how many') || lowerQuery.includes('count')) {
      type = 'AGGREGATION';
    } else if (lowerQuery.includes('トレンド') || lowerQuery.includes('概要') ||
               lowerQuery.includes('trend') || lowerQuery.includes('overview')) {
      type = 'GLOBAL_SUMMARY';
    }

    return {
      type,
      confidence: 0.3, // Low confidence for heuristic fallback
      entities,
      isAmbiguous: true,
    };
  }
}
