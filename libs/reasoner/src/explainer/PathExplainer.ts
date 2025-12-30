/**
 * Path Explainer
 *
 * Generates natural language explanations for paths in the knowledge graph.
 * Uses LLM for high-quality explanations with template-based fallback.
 */

import type {
  Path,
  PathExplanation,
  RelationExplanation,
  LLMClient,
  PathExplainerInterface,
} from '../types.js';

/**
 * Options for path explanation
 */
export interface PathExplainerOptions {
  /** Default language for explanations */
  language?: 'ja' | 'en';
  /** Whether to use LLM for explanations */
  useLLM?: boolean;
  /** Custom relation descriptions */
  relationDescriptions?: Record<string, string>;
}

/**
 * Path explainer that generates natural language explanations
 */
export class PathExplainer implements PathExplainerInterface {
  private llmClient: LLMClient | null;
  private options: Required<PathExplainerOptions>;

  /** Default Japanese relation descriptions */
  private static readonly DEFAULT_RELATION_DESCRIPTIONS_JA: Record<string, string> = {
    DERIVED_FROM: 'から派生した',
    USES: 'を使用する',
    DEVELOPED_BY: 'によって開発された',
    AUTHORED_BY: 'によって執筆された',
    AFFILIATED_WITH: 'に所属する',
    EVALUATED_ON: 'で評価された',
    CITES: 'を引用する',
    IMPROVES: 'を改良した',
    APPLIES: 'を適用する',
    BELONGS_TO: 'に属する',
    MEMBER_OF: 'のメンバーである',
  };

  /** Default English relation descriptions */
  private static readonly DEFAULT_RELATION_DESCRIPTIONS_EN: Record<string, string> = {
    DERIVED_FROM: 'is derived from',
    USES: 'uses',
    DEVELOPED_BY: 'was developed by',
    AUTHORED_BY: 'was authored by',
    AFFILIATED_WITH: 'is affiliated with',
    EVALUATED_ON: 'was evaluated on',
    CITES: 'cites',
    IMPROVES: 'improves',
    APPLIES: 'applies',
    BELONGS_TO: 'belongs to',
    MEMBER_OF: 'is a member of',
  };

  constructor(llmClient?: LLMClient, options: PathExplainerOptions = {}) {
    this.llmClient = llmClient ?? null;
    this.options = {
      language: options.language ?? 'ja',
      useLLM: options.useLLM ?? true,
      relationDescriptions: options.relationDescriptions ?? this.getDefaultDescriptions(options.language ?? 'ja'),
    };
  }

  /**
   * Explain a path in natural language
   */
  async explain(path: Path, context?: string): Promise<PathExplanation> {
    // Generate template-based explanation as fallback/base
    const templateExplanation = this.generateTemplateExplanation(path);

    // Try LLM explanation if enabled and available
    let naturalLanguage = templateExplanation;
    if (this.options.useLLM && this.llmClient) {
      try {
        naturalLanguage = await this.generateLLMExplanation(path, context);
      } catch {
        // Fall back to template
        naturalLanguage = templateExplanation;
      }
    }

    return {
      path,
      naturalLanguage,
      summary: this.generateSummary(path),
      keyRelations: this.extractKeyRelations(path),
    };
  }

  /**
   * Explain multiple paths
   */
  async explainBatch(paths: Path[], context?: string): Promise<PathExplanation[]> {
    return Promise.all(paths.map((path) => this.explain(path, context)));
  }

  /**
   * Generate a template-based explanation
   */
  generateTemplateExplanation(path: Path): string {
    const parts: string[] = [];

    for (let i = 0; i < path.nodes.length - 1; i++) {
      const from = path.nodes[i];
      const to = path.nodes[i + 1];
      const rel = path.relations[i];

      if (!from || !to || !rel) continue;

      const relDesc = this.getRelationDescription(rel.type);

      if (this.options.language === 'ja') {
        parts.push(`${from.name}（${from.type}）は${to.name}（${to.type}）${relDesc}`);
      } else {
        parts.push(`${from.name} (${from.type}) ${relDesc} ${to.name} (${to.type})`);
      }
    }

    return parts.join(this.options.language === 'ja' ? '、' : ', ');
  }

  /**
   * Generate explanation using LLM
   */
  private async generateLLMExplanation(path: Path, context?: string): Promise<string> {
    if (!this.llmClient) {
      throw new Error('LLM client not available');
    }

    const pathDescription = this.generatePathDescription(path);

    const prompt = this.options.language === 'ja'
      ? this.buildJapanesePrompt(pathDescription, context)
      : this.buildEnglishPrompt(pathDescription, context);

    return this.llmClient.generate(prompt);
  }

  /**
   * Build Japanese prompt for LLM
   */
  private buildJapanesePrompt(pathDescription: string, context?: string): string {
    return `
以下の知識グラフパスを、AI研究の文脈で自然な日本語で説明してください。

パス:
${pathDescription}

${context ? `追加コンテキスト: ${context}` : ''}

要求:
1. 各ノード間の関係性を説明
2. このパスが示唆する研究上の関連性を述べる
3. 2-3文で簡潔にまとめる
`.trim();
  }

  /**
   * Build English prompt for LLM
   */
  private buildEnglishPrompt(pathDescription: string, context?: string): string {
    return `
Explain the following knowledge graph path in natural English, within the context of AI research.

Path:
${pathDescription}

${context ? `Additional context: ${context}` : ''}

Requirements:
1. Explain the relationships between each node
2. Describe the research implications suggested by this path
3. Summarize concisely in 2-3 sentences
`.trim();
  }

  /**
   * Generate path description for LLM input
   */
  private generatePathDescription(path: Path): string {
    const parts: string[] = [];

    for (let i = 0; i < path.nodes.length - 1; i++) {
      const from = path.nodes[i];
      const to = path.nodes[i + 1];
      const rel = path.relations[i];

      if (!from || !to || !rel) continue;

      parts.push(`${from.name} (${from.type}) -[${rel.type}]-> ${to.name} (${to.type})`);
    }

    return parts.join('\n');
  }

  /**
   * Generate a brief summary of the path
   */
  generateSummary(path: Path): string {
    const start = path.nodes[0];
    const end = path.nodes[path.nodes.length - 1];

    if (!start || !end) {
      return this.options.language === 'ja' ? '空のパス' : 'Empty path';
    }

    if (this.options.language === 'ja') {
      return `${start.name} から ${end.name} への ${path.hops} ホップのパス`;
    }
    return `${path.hops}-hop path from ${start.name} to ${end.name}`;
  }

  /**
   * Extract key relations with explanations
   */
  extractKeyRelations(path: Path): RelationExplanation[] {
    const result: RelationExplanation[] = [];
    for (let i = 0; i < path.relations.length; i++) {
      const rel = path.relations[i];
      const from = path.nodes[i];
      const to = path.nodes[i + 1];
      if (!from || !to || !rel) continue;
      result.push({
        from: from.name,
        to: to.name,
        relationType: rel.type,
        explanation: this.getRelationDescription(rel.type),
      });
    }
    return result;
  }

  /**
   * Get description for a relation type
   */
  getRelationDescription(relationType: string): string {
    return this.options.relationDescriptions[relationType] ?? relationType;
  }

  /**
   * Get default relation descriptions for a language
   */
  private getDefaultDescriptions(language: 'ja' | 'en'): Record<string, string> {
    return language === 'ja'
      ? PathExplainer.DEFAULT_RELATION_DESCRIPTIONS_JA
      : PathExplainer.DEFAULT_RELATION_DESCRIPTIONS_EN;
  }

  /**
   * Add custom relation description
   */
  addRelationDescription(relationType: string, description: string): void {
    this.options.relationDescriptions[relationType] = description;
  }

  /**
   * Set language
   */
  setLanguage(language: 'ja' | 'en'): void {
    this.options.language = language;
    this.options.relationDescriptions = this.getDefaultDescriptions(language);
  }

  /**
   * Generate a comparison of multiple paths
   */
  comparePaths(paths: Path[]): PathComparison {
    if (paths.length === 0) {
      return {
        shortestPath: null,
        longestPath: null,
        commonNodes: [],
        uniqueRelations: [],
      };
    }

    const sortedByHops = [...paths].sort((a, b) => a.hops - b.hops);

    // Find common nodes across all paths
    const allNodeSets = paths.map((p) => new Set(p.nodes.map((n) => n.id)));
    const firstNodeSet = allNodeSets[0];
    const firstPath = paths[0];
    if (!firstNodeSet || !firstPath) {
      return {
        shortestPath: null,
        longestPath: null,
        commonNodes: [],
        uniqueRelations: [],
      };
    }
    const commonNodeIds = [...firstNodeSet].filter((id) =>
      allNodeSets.every((set) => set.has(id))
    );
    const commonNodes = firstPath.nodes.filter((n) => commonNodeIds.includes(n.id));

    // Find unique relations
    const relationSet = new Set<string>();
    for (const path of paths) {
      for (const rel of path.relations) {
        relationSet.add(rel.type);
      }
    }

    return {
      shortestPath: sortedByHops[0] ?? null,
      longestPath: sortedByHops[sortedByHops.length - 1] ?? null,
      commonNodes,
      uniqueRelations: [...relationSet],
    };
  }
}

/**
 * Path comparison result
 */
export interface PathComparison {
  /** Shortest path */
  shortestPath: Path | null;
  /** Longest path */
  longestPath: Path | null;
  /** Nodes common to all paths */
  commonNodes: Path['nodes'];
  /** Unique relation types across all paths */
  uniqueRelations: string[];
}
