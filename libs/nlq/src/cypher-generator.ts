/**
 * @fileoverview Cypher Generator for NLQ
 * @description Generates Cypher queries from natural language using LLM
 * @module @yagokoro/nlq/cypher-generator
 */

import {
  type CypherQuery,
  type GraphSchema,
  type LLMClient,
  type CypherExecutor,
  type QueryIntent,
  NLQErrorCode,
} from './types.js';
import type { SchemaProvider } from './schema-provider.js';

/**
 * Configuration for CypherGenerator
 */
export interface CypherGeneratorConfig {
  /** Temperature for LLM (default: 0.2) */
  temperature?: number;
  /** Maximum tokens for response */
  maxTokens?: number;
  /** Maximum retry attempts for invalid Cypher */
  maxRetries?: number;
  /** Default result limit */
  defaultLimit?: number;
}

/**
 * Result of Cypher generation
 */
export interface CypherGenerationResult {
  success: boolean;
  query?: CypherQuery;
  error?: {
    code: string;
    message: string;
    suggestions?: string[];
  };
}

/**
 * CypherGenerator - Generates Cypher queries from natural language
 *
 * Uses LLM with schema context to convert natural language queries
 * into valid Neo4j Cypher queries.
 *
 * @example
 * ```typescript
 * const generator = new CypherGenerator(llm, schemaProvider, cypherExecutor);
 * const result = await generator.generate(
 *   "Transformerを開発した研究者は？",
 *   { type: 'RELATIONSHIP_QUERY', ... }
 * );
 * // { success: true, query: { cypher: "MATCH ...", isValid: true } }
 * ```
 */
export class CypherGenerator {
  private readonly config: Required<CypherGeneratorConfig>;

  constructor(
    private readonly llm: LLMClient,
    private readonly schemaProvider: SchemaProvider,
    private readonly cypherExecutor?: CypherExecutor,
    config: CypherGeneratorConfig = {}
  ) {
    this.config = {
      temperature: config.temperature ?? 0.2,
      maxTokens: config.maxTokens ?? 1000,
      maxRetries: config.maxRetries ?? 3,
      defaultLimit: config.defaultLimit ?? 25,
    };
  }

  /**
   * Generate Cypher query from natural language
   *
   * @param query Natural language query
   * @param intent Classified query intent
   * @param lang Query language
   * @returns Generation result with Cypher query or error
   */
  async generate(
    query: string,
    intent: QueryIntent,
    lang: 'ja' | 'en' = 'ja'
  ): Promise<CypherGenerationResult> {
    // Get schema for prompt context
    let schema: GraphSchema;
    try {
      schema = await this.schemaProvider.getSchema();
    } catch (error) {
      return {
        success: false,
        error: {
          code: NLQErrorCode.CYPHER_GENERATION_ERROR,
          message: 'Failed to fetch schema',
          suggestions: ['Check Neo4j connection'],
        },
      };
    }

    // Generate Cypher with retries
    let lastError: string | undefined;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      const prompt = this.buildPrompt(query, intent, schema, lang, lastError);

      try {
        const response = await this.llm.complete(prompt, {
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        });

        const cypher = this.extractCypher(response);
        if (!cypher) {
          lastError = 'No valid Cypher found in response';
          continue;
        }

        // Validate Cypher if executor available
        if (this.cypherExecutor) {
          const validation = await this.cypherExecutor.validate(cypher);
          if (!validation.valid) {
            lastError = validation.error ?? 'Invalid Cypher syntax';
            continue;
          }
        }

        return {
          success: true,
          query: {
            cypher,
            isValid: true,
          },
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // All retries failed
    return {
      success: false,
      error: {
        code: NLQErrorCode.CYPHER_GENERATION_ERROR,
        message: `Failed to generate valid Cypher after ${this.config.maxRetries} attempts`,
        suggestions: this.getSuggestions(query, intent),
      },
    };
  }

  /**
   * Build the Cypher generation prompt
   */
  private buildPrompt(
    query: string,
    intent: QueryIntent,
    schema: GraphSchema,
    lang: 'ja' | 'en',
    previousError?: string
  ): string {
    const schemaText = this.formatSchema(schema);
    const intentHint = this.getIntentHint(intent);
    const langLabel = lang === 'ja' ? '日本語' : 'English';

    let prompt = `あなたはNeo4j Cypherクエリ生成の専門家です。ユーザーの自然言語クエリを有効なCypherに変換してください。

## グラフスキーマ
${schemaText}

## クエリの意図
タイプ: ${intent.type}
検出エンティティ: ${intent.entities.join(', ') || 'なし'}
${intentHint}

## 制約
1. スキーマに存在するノードラベルとリレーションタイプのみを使用
2. プロパティ名は正確に使用（大文字小文字も一致）
3. LIMIT句を使用（デフォルト: ${this.config.defaultLimit}）
4. 日本語の値はそのまま使用
5. パラメータ化は不要（直接値を埋め込む）
6. 存在しないノード/リレーションへのマッチは空結果を返す（エラーにしない）

## ユーザークエリ
言語: ${langLabel}
クエリ: "${query}"`;

    if (previousError) {
      prompt += `

## 前回のエラー
${previousError}
このエラーを避けて再生成してください。`;
    }

    prompt += `

## 出力
\`\`\`cypher
// ここにCypherクエリのみを出力
\`\`\``;

    return prompt;
  }

  /**
   * Format schema for prompt
   */
  private formatSchema(schema: GraphSchema): string {
    const lines: string[] = [];

    lines.push('### ノードラベル');
    for (const label of schema.nodeLabels) {
      const props = schema.propertyKeys[label];
      if (props && props.length > 0) {
        lines.push(`- (n:${label}) props: [${props.join(', ')}]`);
      } else {
        lines.push(`- (n:${label})`);
      }
    }

    lines.push('');
    lines.push('### リレーションタイプ');
    for (const relType of schema.relationTypes) {
      lines.push(`- [:${relType}]`);
    }

    return lines.join('\n');
  }

  /**
   * Get intent-specific hints for prompt
   */
  private getIntentHint(intent: QueryIntent): string {
    switch (intent.type) {
      case 'ENTITY_LOOKUP':
        return 'ヒント: 単一エンティティの属性を取得するクエリ';
      case 'RELATIONSHIP_QUERY':
        return 'ヒント: エンティティ間の関係を辿るクエリ (MATCH-関係->)';
      case 'PATH_FINDING':
        return 'ヒント: shortestPath() または可変長パス [:*1..5] を使用';
      case 'AGGREGATION':
        return 'ヒント: COUNT(), SUM(), AVG() などの集計関数を使用';
      case 'GLOBAL_SUMMARY':
        return 'ヒント: 複数ノードの統計やグループ化 (WITH, ORDER BY)';
      case 'COMPARISON':
        return 'ヒント: 複数エンティティを取得して比較可能な形式で返す';
      default:
        return '';
    }
  }

  /**
   * Extract Cypher query from LLM response
   */
  private extractCypher(response: string): string | null {
    // Try to extract from code block
    const codeBlockMatch = response.match(/```(?:cypher)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch?.[1]) {
      const cypher = codeBlockMatch[1].trim();
      if (this.looksLikeCypher(cypher)) {
        return cypher;
      }
    }

    // Try to find MATCH/CREATE/CALL statements directly
    const directMatch = response.match(/(MATCH|CREATE|CALL|MERGE|WITH|RETURN)[\s\S]*?(RETURN\s+[\s\S]*?)(;|\n\n|$)/i);
    if (directMatch) {
      const cypher = directMatch[0].replace(/;$/, '').trim();
      if (this.looksLikeCypher(cypher)) {
        return cypher;
      }
    }

    return null;
  }

  /**
   * Basic validation that string looks like Cypher
   */
  private looksLikeCypher(text: string): boolean {
    const cypherKeywords = ['MATCH', 'RETURN', 'WHERE', 'CREATE', 'MERGE', 'WITH', 'CALL'];
    const upper = text.toUpperCase();
    return cypherKeywords.some(keyword => upper.includes(keyword));
  }

  /**
   * Get suggestions for failed queries
   */
  private getSuggestions(_query: string, intent: QueryIntent): string[] {
    const suggestions: string[] = [];

    if (intent.entities.length === 0) {
      suggestions.push('エンティティ名を具体的に指定してください（例: GPT-4, BERT）');
    }

    if (intent.isAmbiguous) {
      suggestions.push('質問をより具体的にしてください');
    }

    switch (intent.type) {
      case 'PATH_FINDING':
        suggestions.push('2つのエンティティを明確に指定してください（例: AとBの関係）');
        break;
      case 'AGGREGATION':
        suggestions.push('集計対象を明確にしてください（例: 2023年の論文数）');
        break;
      case 'COMPARISON':
        suggestions.push('比較対象のエンティティを2つ以上指定してください');
        break;
    }

    if (suggestions.length === 0) {
      suggestions.push('別の言い方で質問してみてください');
    }

    return suggestions;
  }
}
