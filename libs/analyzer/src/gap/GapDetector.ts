/**
 * GapDetector - Research gap detection engine
 *
 * Detects and prioritizes research gaps in the knowledge graph.
 * Based on DES-002 §5.2
 */

import type {
  GapDetectorDependencies,
  GapDetectorInterface,
  GapDetectionOptions,
  ResearchGap,
  GapType,
  GapSeverity,
  PossibleCombination,
  ClusterAnalyzerInterface,
  LLMClientInterface,
  Neo4jConnectionInterface,
  Neo4jRecord,
} from '../types.js';

/**
 * Default options for gap detection
 */
const DEFAULT_OPTIONS: GapDetectionOptions = {
  useLLM: false,
  limit: 50,
  includeExisting: false,
};

/**
 * Severity order for sorting
 */
const SEVERITY_ORDER: Record<GapSeverity, number> = {
  critical: -1,
  high: 0,
  medium: 1,
  low: 2,
};

/**
 * Gap Detector implementation
 */
export class GapDetector implements GapDetectorInterface {
  private neo4jConnection: Neo4jConnectionInterface;
  // citationAnalyzer is kept for future use (e.g., citation-based gap detection)
  private clusterAnalyzer: ClusterAnalyzerInterface;
  private llmClient: LLMClientInterface | undefined;

  constructor(deps: GapDetectorDependencies) {
    this.neo4jConnection = deps.neo4jConnection;
    // Store citationAnalyzer for future feature expansion
    void deps.citationAnalyzer;
    this.clusterAnalyzer = deps.clusterAnalyzer;
    this.llmClient = deps.llmClient;
  }

  /**
   * Detect research gaps across multiple dimensions
   */
  async detectGaps(options: GapDetectionOptions = {}): Promise<ResearchGap[]> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const gaps: ResearchGap[] = [];

    const typesToDetect = opts.types ?? [
      'missing_combination',
      'isolated_cluster',
      'stale_research_area',
      'underexplored_technique',
    ];

    // 1. Missing combinations
    if (typesToDetect.includes('missing_combination')) {
      const combinationGaps = await this.findUnexploredCombinations();
      gaps.push(...combinationGaps);
    }

    // 2. Isolated clusters
    if (typesToDetect.includes('isolated_cluster')) {
      const isolatedGaps = await this.findIsolatedResearchAreas();
      gaps.push(...isolatedGaps);
    }

    // 3. Stale research areas
    if (typesToDetect.includes('stale_research_area')) {
      const staleGaps = await this.findStaleResearchAreas();
      gaps.push(...staleGaps);
    }

    // 4. Underexplored techniques
    if (typesToDetect.includes('underexplored_technique')) {
      const underexploredGaps = await this.findUnderexploredTechniques();
      gaps.push(...underexploredGaps);
    }

    // 5. LLM analysis
    if (opts.useLLM && this.llmClient) {
      const llmGaps = await this.analyzeWithLLM(gaps);
      gaps.push(...llmGaps);
    }

    // Filter by severity if specified
    let filteredGaps = opts.minSeverity
      ? gaps.filter(
          (g) => SEVERITY_ORDER[g.severity] <= SEVERITY_ORDER[opts.minSeverity!]
        )
      : gaps;

    // Prioritize and limit
    filteredGaps = this.prioritizeGaps(filteredGaps);

    return filteredGaps.slice(0, opts.limit);
  }

  /**
   * Find unexplored technique-model combinations
   */
  async findUnexploredCombinations(): Promise<ResearchGap[]> {
    const existingCombinations = await this.getExistingCombinations();
    const possibleCombinations = await this.generatePossibleCombinations();

    const unexplored = possibleCombinations.filter(
      (combo) => !existingCombinations.has(combo.key)
    );

    return unexplored.slice(0, 30).map((combo) => ({
      id: `gap-combo-${this.hashKey(combo.key)}`,
      type: 'missing_combination' as GapType,
      description: `${combo.technique} と ${combo.model} の組み合わせは未探索`,
      severity: this.calculateCombinationSeverity(combo),
      evidence: [
        {
          type: 'missing_relation',
          value: { model: combo.model, technique: combo.technique },
          source: 'combination_analysis',
        },
      ],
      suggestedActions: [
        `${combo.technique} を ${combo.model} に適用する研究を実施`,
        `類似の組み合わせの成功事例を調査`,
      ],
      relatedEntities: [combo.technique, combo.model],
      score: combo.potentialScore ?? 0.5,
      createdAt: new Date(),
    }));
  }

  /**
   * Find stale research areas with no recent activity
   */
  async findStaleResearchAreas(): Promise<ResearchGap[]> {
    const currentYear = new Date().getFullYear();

    const cypher = `
      MATCH (t:Technique)<-[:USES]-(p:Publication)
      WITH t, max(p.year) as lastYear, count(p) as totalPubs
      WHERE lastYear < $cutoffYear AND totalPubs >= $minPubs
      RETURN t.name as technique, 
             t.id as techniqueId,
             lastYear, 
             totalPubs
      ORDER BY totalPubs DESC
      LIMIT 20
    `;

    const result = await this.neo4jConnection.run(cypher, {
      cutoffYear: currentYear - 2,
      minPubs: 5,
    });

    return result.records.map((r: Neo4jRecord) => {
      const technique = String(r.get('technique') ?? '');
      const lastYear = this.toNumber(r.get('lastYear'));
      const totalPubs = this.toNumber(r.get('totalPubs'));
      const yearsStale = currentYear - lastYear;

      return {
        id: `gap-stale-${this.hashKey(technique)}`,
        type: 'stale_research_area' as GapType,
        description: `${technique} は ${lastYear} 以降論文が出ていない（過去 ${totalPubs} 件）`,
        severity: this.calculateStaleSeverity(yearsStale, totalPubs),
        evidence: [
          {
            type: 'publication_gap',
            value: { lastYear, totalPubs, yearsStale },
            source: 'temporal_analysis',
          },
        ],
        suggestedActions: [
          `${technique} の最新動向を調査`,
          `代替技術との比較研究を実施`,
          `衰退の原因を分析`,
        ],
        relatedEntities: [technique],
        score: totalPubs / 100 + yearsStale / 10,
        createdAt: new Date(),
      };
    });
  }

  /**
   * Find isolated research areas (weak cluster connections)
   */
  async findIsolatedResearchAreas(): Promise<ResearchGap[]> {
    const clusterGaps = await this.clusterAnalyzer.findClusterGaps();

    return clusterGaps.slice(0, 20).map((gap) => ({
      id: `gap-isolated-${this.hashKey(`${gap.cluster1.id}-${gap.cluster2.id}`)}`,
      type: 'isolated_cluster' as GapType,
      description: `クラスター "${gap.cluster1.name}" と "${gap.cluster2.name}" の間の接続が弱い (強度: ${(gap.connectionStrength * 100).toFixed(1)}%)`,
      severity:
        gap.connectionStrength < 0.05
          ? ('high' as GapSeverity)
          : ('medium' as GapSeverity),
      evidence: [
        {
          type: 'weak_connection',
          value: {
            connectionStrength: gap.connectionStrength,
            cluster1Size: gap.cluster1.entities.length,
            cluster2Size: gap.cluster2.entities.length,
          },
          source: 'cluster_analysis',
        },
      ],
      suggestedActions: [
        `${gap.potentialBridgeTopics.join(', ')} をブリッジトピックとして研究`,
        `両クラスターを統合する学際的研究の実施`,
      ],
      relatedEntities: [gap.cluster1.name, gap.cluster2.name],
      score: 1 - gap.connectionStrength,
      createdAt: new Date(),
    }));
  }

  /**
   * Find underexplored techniques
   */
  async findUnderexploredTechniques(): Promise<ResearchGap[]> {
    const cypher = `
      MATCH (t:Technique)
      OPTIONAL MATCH (t)<-[:USES]-(p:Publication)
      WITH t, count(p) as pubCount
      WHERE pubCount > 0 AND pubCount < $threshold
      OPTIONAL MATCH (t)<-[:USES]-(m:AIModel)
      WITH t, pubCount, count(DISTINCT m) as modelCount
      RETURN t.name as technique,
             t.id as techniqueId,
             pubCount,
             modelCount
      ORDER BY pubCount ASC
      LIMIT 20
    `;

    const result = await this.neo4jConnection.run(cypher, { threshold: 5 });

    return result.records.map((r: Neo4jRecord) => {
      const technique = String(r.get('technique') ?? '');
      const pubCount = this.toNumber(r.get('pubCount'));
      const modelCount = this.toNumber(r.get('modelCount'));

      return {
        id: `gap-underexplored-${this.hashKey(technique)}`,
        type: 'underexplored_technique' as GapType,
        description: `${technique} は論文数 ${pubCount} 件、適用モデル ${modelCount} 件と未開拓`,
        severity: pubCount < 2 ? ('high' as GapSeverity) : ('medium' as GapSeverity),
        evidence: [
          {
            type: 'low_coverage',
            value: { pubCount, modelCount },
            source: 'coverage_analysis',
          },
        ],
        suggestedActions: [
          `${technique} の適用可能性を調査`,
          `他分野での活用事例を収集`,
          `ベンチマーク評価を実施`,
        ],
        relatedEntities: [technique],
        score: 1 / (pubCount + 1),
        createdAt: new Date(),
      };
    });
  }

  /**
   * Prioritize gaps by severity and score
   */
  prioritizeGaps(gaps: ResearchGap[]): ResearchGap[] {
    return gaps.sort((a, b) => {
      // First by severity
      const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (severityDiff !== 0) {
        return severityDiff;
      }
      // Then by score (descending)
      return (b.score ?? 0) - (a.score ?? 0);
    });
  }

  /**
   * Get existing technique-model combinations
   */
  private async getExistingCombinations(): Promise<Set<string>> {
    const cypher = `
      MATCH (m:AIModel)-[:USES]->(t:Technique)
      RETURN m.name as model, t.name as technique
    `;

    const result = await this.neo4jConnection.run(cypher);
    const combinations = new Set<string>();

    for (const record of result.records) {
      const model = String(record.get('model') ?? '');
      const technique = String(record.get('technique') ?? '');
      if (model && technique) {
        combinations.add(`${model}:${technique}`);
      }
    }

    return combinations;
  }

  /**
   * Generate possible technique-model combinations
   */
  private async generatePossibleCombinations(): Promise<PossibleCombination[]> {
    const modelsCypher = `
      MATCH (m:AIModel)
      OPTIONAL MATCH (m)<-[:CITES]-(p:Publication)
      WITH m, count(p) as importance
      RETURN m.name as name, importance
      ORDER BY importance DESC
      LIMIT 50
    `;

    const techniquesCypher = `
      MATCH (t:Technique)
      OPTIONAL MATCH (t)<-[:USES]-(p:Publication)
      WITH t, count(p) as usage
      RETURN t.name as name, usage
      ORDER BY usage DESC
      LIMIT 50
    `;

    const [modelsResult, techniquesResult] = await Promise.all([
      this.neo4jConnection.run(modelsCypher),
      this.neo4jConnection.run(techniquesCypher),
    ]);

    const models = modelsResult.records.map((r: Neo4jRecord) => ({
      name: String(r.get('name') ?? ''),
      importance: this.toNumber(r.get('importance')),
    }));

    const techniques = techniquesResult.records.map((r: Neo4jRecord) => ({
      name: String(r.get('name') ?? ''),
      usage: this.toNumber(r.get('usage')),
    }));

    const combinations: PossibleCombination[] = [];

    for (const model of models) {
      for (const technique of techniques) {
        const potentialScore =
          (model.importance + technique.usage) /
          (Math.max(model.importance, 1) * Math.max(technique.usage, 1));

        combinations.push({
          key: `${model.name}:${technique.name}`,
          model: model.name,
          technique: technique.name,
          potentialScore: Math.min(potentialScore, 1),
        });
      }
    }

    // Sort by potential score
    return combinations.sort(
      (a, b) => (b.potentialScore ?? 0) - (a.potentialScore ?? 0)
    );
  }

  /**
   * Calculate severity for combination gaps
   */
  private calculateCombinationSeverity(combo: PossibleCombination): GapSeverity {
    const score = combo.potentialScore ?? 0.5;
    if (score > 0.7) {
      return 'high';
    }
    if (score > 0.4) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Calculate severity for stale research areas
   */
  private calculateStaleSeverity(
    yearsStale: number,
    totalPubs: number
  ): GapSeverity {
    // High importance area that's been stale for long time
    if (yearsStale >= 4 && totalPubs >= 10) {
      return 'high';
    }
    if (yearsStale >= 3 || totalPubs >= 15) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Analyze gaps with LLM
   */
  private async analyzeWithLLM(existingGaps: ResearchGap[]): Promise<ResearchGap[]> {
    if (!this.llmClient) {
      return [];
    }

    const prompt = `
以下の研究ギャップを分析し、追加の洞察を提供してください:

${existingGaps
  .slice(0, 10)
  .map((g) => `- ${g.type}: ${g.description}`)
  .join('\n')}

追加で考慮すべき研究ギャップがあれば、以下のJSON配列形式で応答してください:
[{"description": "説明", "type": "unexplored_application", "severity": "high|medium|low", "suggestedActions": ["アクション1", "アクション2"]}]

追加がない場合は空配列 [] を返してください。
`;

    try {
      const response = await this.llmClient.generate(prompt);

      // Parse JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]) as Array<{
        description: string;
        type: GapType;
        severity: GapSeverity;
        suggestedActions: string[];
      }>;

      return parsed.map((item, index) => ({
        id: `gap-llm-${index}-${Date.now()}`,
        type: item.type || ('unexplored_application' as GapType),
        description: item.description,
        severity: item.severity || 'medium',
        evidence: [
          {
            type: 'llm_analysis',
            value: { source: 'gpt-analysis' },
            source: 'llm',
          },
        ],
        suggestedActions: item.suggestedActions || [],
        relatedEntities: [],
        score: 0.5,
        createdAt: new Date(),
      }));
    } catch {
      // LLM analysis failed, return empty
      return [];
    }
  }

  /**
   * Create a short hash key for IDs
   */
  private hashKey(key: string): string {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).slice(0, 8);
  }

  /**
   * Convert Neo4j value to number safely
   */
  private toNumber(value: unknown): number {
    if (value === null || value === undefined) {
      return 0;
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'object' && value !== null && 'toNumber' in value) {
      return (value as { toNumber(): number }).toNumber();
    }
    const num = Number(value);
    return Number.isNaN(num) ? 0 : num;
  }
}
