/**
 * @fileoverview Consistency checker for validating claims against knowledge graph
 */

import type { ReasoningContext, ReasoningEntity, ReasoningPath } from '@yagokoro/graphrag';
import type {
  FactClaim,
  Evidence,
  ConsistencyResult,
  ClaimExtractorLLM,
} from './types.js';

/**
 * Configuration for ConsistencyChecker
 */
export interface ConsistencyCheckerConfig {
  /** Minimum evidence count to make a decision */
  minEvidenceCount?: number;
  /** Score threshold for considering consistent */
  consistencyThreshold?: number;
  /** Maximum evidence items to collect */
  maxEvidence?: number;
  /** Language for messages */
  language?: 'ja' | 'en';
  /** Weight for graph evidence */
  graphEvidenceWeight?: number;
  /** Weight for document evidence */
  documentEvidenceWeight?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<ConsistencyCheckerConfig> = {
  minEvidenceCount: 1,
  consistencyThreshold: 0.6,
  maxEvidence: 10,
  language: 'ja',
  graphEvidenceWeight: 0.7,
  documentEvidenceWeight: 0.3,
};

/**
 * ConsistencyChecker validates fact claims against the knowledge graph
 */
export class ConsistencyChecker {
  private readonly context: ReasoningContext;
  private readonly config: Required<ConsistencyCheckerConfig>;
  private readonly llmClient: ClaimExtractorLLM | undefined;

  constructor(
    context: ReasoningContext,
    config?: ConsistencyCheckerConfig,
    llmClient?: ClaimExtractorLLM
  ) {
    this.context = context;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.llmClient = llmClient;
  }

  /**
   * Check consistency of a single claim
   */
  async check(claim: FactClaim): Promise<ConsistencyResult> {
    const supportingEvidence: Evidence[] = [];
    const contradictingEvidence: Evidence[] = [];

    // Collect evidence from graph
    await this.collectGraphEvidence(claim, supportingEvidence, contradictingEvidence);

    // Calculate consistency score
    const score = this.calculateScore(supportingEvidence, contradictingEvidence);
    const isConsistent = score >= this.config.consistencyThreshold;

    // Generate explanation
    const explanation = this.generateExplanation(
      claim,
      isConsistent,
      score,
      supportingEvidence,
      contradictingEvidence
    );

    // Generate suggestions if inconsistent
    const result: ConsistencyResult = {
      claim,
      isConsistent,
      score,
      supportingEvidence,
      contradictingEvidence,
      explanation,
    };

    if (!isConsistent) {
      result.suggestions = this.generateSuggestions(claim, contradictingEvidence);
    }

    return result;
  }

  /**
   * Check consistency of multiple claims
   */
  async checkAll(claims: FactClaim[]): Promise<ConsistencyResult[]> {
    return Promise.all(claims.map((claim) => this.check(claim)));
  }

  /**
   * Extract claims from response text using LLM
   */
  async extractClaims(response: string, context?: string): Promise<FactClaim[]> {
    if (this.llmClient) {
      return this.llmClient.extractClaims(response, context);
    }
    // Simple rule-based extraction fallback
    return this.simpleClaimExtraction(response);
  }

  /**
   * Collect evidence from the knowledge graph
   */
  private async collectGraphEvidence(
    claim: FactClaim,
    supporting: Evidence[],
    contradicting: Evidence[]
  ): Promise<void> {
    // Check entity existence
    for (const entityId of claim.entityIds) {
      const entity = await this.context.getEntity(entityId);
      if (entity) {
        supporting.push(this.createEntityEvidence(entity, claim));
      } else {
        contradicting.push(this.createMissingEntityEvidence(entityId, claim));
      }
    }

    // Check relation if specified
    if (claim.sourceEntityId && claim.targetEntityId && claim.relationType) {
      const relationEvidence = await this.checkRelation(
        claim.sourceEntityId,
        claim.targetEntityId,
        claim.relationType,
        claim
      );
      if (relationEvidence.supports) {
        supporting.push(relationEvidence);
      } else {
        contradicting.push(relationEvidence);
      }
    }

    // Check paths between entities
    if (claim.entityIds.length >= 2) {
      const pathEvidence = await this.checkPaths(claim);
      for (const evidence of pathEvidence) {
        if (evidence.supports) {
          supporting.push(evidence);
        } else {
          contradicting.push(evidence);
        }
      }
    }

    // Limit evidence count
    while (supporting.length + contradicting.length > this.config.maxEvidence) {
      if (supporting.length > contradicting.length) {
        supporting.pop();
      } else {
        contradicting.pop();
      }
    }
  }

  /**
   * Create evidence from found entity
   */
  private createEntityEvidence(entity: ReasoningEntity, _claim: FactClaim): Evidence {
    const messages = this.getMessages();
    return {
      id: `evidence-entity-${entity.id}`,
      type: 'graph',
      sourceId: entity.id,
      sourceName: entity.name,
      content: messages.entityFound(entity.name, entity.type),
      supports: true,
      confidence: 0.9,
    };
  }

  /**
   * Create evidence for missing entity
   */
  private createMissingEntityEvidence(entityId: string, _claim: FactClaim): Evidence {
    const messages = this.getMessages();
    return {
      id: `evidence-missing-${entityId}`,
      type: 'graph',
      sourceId: entityId,
      sourceName: entityId,
      content: messages.entityNotFound(entityId),
      supports: false,
      confidence: 0.7,
    };
  }

  /**
   * Check if a specific relation exists
   */
  private async checkRelation(
    sourceId: string,
    targetId: string,
    relationType: string,
    _claim: FactClaim
  ): Promise<Evidence> {
    const messages = this.getMessages();
    const outgoing = await this.context.getOutgoingRelations(sourceId);
    
    const matchingRelation = outgoing.find(
      (rel) => rel.targetId === targetId && rel.type === relationType
    );

    if (matchingRelation) {
      return {
        id: `evidence-relation-${sourceId}-${targetId}`,
        type: 'graph',
        sourceId: `${sourceId}->${targetId}`,
        sourceName: `${relationType}`,
        content: messages.relationFound(relationType, sourceId, targetId),
        supports: true,
        confidence: matchingRelation.confidence ?? 0.85,
      };
    }

    // Check if any relation exists between entities
    const anyRelation = outgoing.find((rel) => rel.targetId === targetId);
    if (anyRelation) {
      return {
        id: `evidence-relation-wrong-${sourceId}-${targetId}`,
        type: 'graph',
        sourceId: `${sourceId}->${targetId}`,
        sourceName: anyRelation.type,
        content: messages.relationWrongType(relationType, anyRelation.type),
        supports: false,
        confidence: 0.6,
      };
    }

    return {
      id: `evidence-relation-missing-${sourceId}-${targetId}`,
      type: 'graph',
      sourceId: `${sourceId}->${targetId}`,
      sourceName: relationType,
      content: messages.relationNotFound(relationType, sourceId, targetId),
      supports: false,
      confidence: 0.5,
    };
  }

  /**
   * Check paths between entities mentioned in claim
   */
  private async checkPaths(claim: FactClaim): Promise<Evidence[]> {
    const evidence: Evidence[] = [];
    const messages = this.getMessages();
    const entityIds = claim.entityIds;

    for (let i = 0; i < entityIds.length - 1; i++) {
      const sourceId = entityIds[i];
      const targetId = entityIds[i + 1];

      if (!sourceId || !targetId) continue;

      // findPaths returns GraphPath[] but tests mock with ReasoningPath-like objects
      const paths = await this.context.findPaths(sourceId, targetId, 3);

      if (paths.length > 0) {
        const bestPath = paths[0];
        if (bestPath) {
          // Handle both GraphPath (domain) and ReasoningPath (graphrag) structures
          const pathAsAny = bestPath as unknown as ReasoningPath;
          const pathId = pathAsAny.pathId ?? `path-${sourceId}-${targetId}`;
          const hopCount = pathAsAny.hopCount ?? bestPath.edges.length;
          const summary = pathAsAny.summary ?? '';
          const totalConfidence = pathAsAny.totalConfidence ?? (1 - bestPath.totalWeight);
          
          evidence.push({
            id: `evidence-path-${sourceId}-${targetId}`,
            type: 'graph',
            sourceId: pathId,
            sourceName: messages.pathLabel,
            content: messages.pathFound(hopCount, summary),
            supports: true,
            confidence: totalConfidence,
          });
        }
      }
    }

    return evidence;
  }

  /**
   * Calculate consistency score from evidence
   */
  private calculateScore(
    supporting: Evidence[],
    contradicting: Evidence[]
  ): number {
    if (supporting.length === 0 && contradicting.length === 0) {
      return 0.5; // Neutral when no evidence
    }

    const supportSum = supporting.reduce((sum, e) => sum + e.confidence, 0);
    const contradictSum = contradicting.reduce((sum, e) => sum + e.confidence, 0);
    const total = supportSum + contradictSum;

    if (total === 0) return 0.5;

    return supportSum / total;
  }

  /**
   * Generate explanation for the consistency result
   */
  private generateExplanation(
    claim: FactClaim,
    isConsistent: boolean,
    score: number,
    supporting: Evidence[],
    contradicting: Evidence[]
  ): string {
    const messages = this.getMessages();
    const parts: string[] = [];

    parts.push(messages.claimAnalysis(claim.text));
    parts.push(messages.scoreResult(score, isConsistent));

    if (supporting.length > 0) {
      parts.push(messages.supportingHeader);
      for (const evidence of supporting.slice(0, 3)) {
        parts.push(`  - ${evidence.content}`);
      }
    }

    if (contradicting.length > 0) {
      parts.push(messages.contradictingHeader);
      for (const evidence of contradicting.slice(0, 3)) {
        parts.push(`  - ${evidence.content}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Generate suggestions for improving consistency
   */
  private generateSuggestions(
    _claim: FactClaim,
    contradicting: Evidence[]
  ): string[] {
    const messages = this.getMessages();
    const suggestions: string[] = [];

    // Check for missing entities
    const missingEntities = contradicting.filter((e) =>
      e.id.includes('missing')
    );
    if (missingEntities.length > 0) {
      suggestions.push(messages.suggestionVerifyEntities);
    }

    // Check for wrong relations
    const wrongRelations = contradicting.filter((e) =>
      e.id.includes('relation-wrong')
    );
    if (wrongRelations.length > 0) {
      suggestions.push(messages.suggestionCheckRelations);
    }

    // General suggestion
    if (suggestions.length === 0) {
      suggestions.push(messages.suggestionVerifyFacts);
    }

    return suggestions;
  }

  /**
   * Simple rule-based claim extraction (fallback)
   */
  private simpleClaimExtraction(text: string): FactClaim[] {
    const claims: FactClaim[] = [];
    const sentences = text.split(/[。.!?！？]/);

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i]?.trim();
      if (!sentence || sentence.length < 10) continue;

      claims.push({
        id: `claim-${i}`,
        text: sentence,
        entityIds: [],
        confidence: 0.5,
      });
    }

    return claims;
  }

  /**
   * Get localized messages
   */
  private getMessages() {
    if (this.config.language === 'en') {
      return {
        entityFound: (name: string, type: string) =>
          `Entity "${name}" (${type}) exists in the knowledge graph`,
        entityNotFound: (id: string) =>
          `Entity "${id}" was not found in the knowledge graph`,
        relationFound: (type: string, _source: string, _target: string) =>
          `Relation "${type}" exists between entities`,
        relationNotFound: (type: string, _source: string, _target: string) =>
          `Relation "${type}" was not found between entities`,
        relationWrongType: (expected: string, actual: string) =>
          `Expected relation "${expected}" but found "${actual}"`,
        pathFound: (hops: number, summary: string) =>
          `Path found with ${hops} hop(s): ${summary}`,
        pathLabel: 'Path',
        claimAnalysis: (claim: string) => `Claim Analysis: "${claim}"`,
        scoreResult: (score: number, consistent: boolean) =>
          `Consistency Score: ${(score * 100).toFixed(1)}% (${consistent ? 'Consistent' : 'Inconsistent'})`,
        supportingHeader: 'Supporting Evidence:',
        contradictingHeader: 'Contradicting Evidence:',
        suggestionVerifyEntities:
          'Verify that the mentioned entities exist in the knowledge base',
        suggestionCheckRelations:
          'Check the relationship types between entities',
        suggestionVerifyFacts:
          'Cross-reference the claims with authoritative sources',
      };
    }

    return {
      entityFound: (name: string, type: string) =>
        `エンティティ「${name}」(${type})がナレッジグラフに存在します`,
      entityNotFound: (id: string) =>
        `エンティティ「${id}」がナレッジグラフに見つかりません`,
      relationFound: (type: string, _source: string, _target: string) =>
        `関係「${type}」がエンティティ間に存在します`,
      relationNotFound: (type: string, _source: string, _target: string) =>
        `関係「${type}」がエンティティ間に見つかりません`,
      relationWrongType: (expected: string, actual: string) =>
        `期待された関係「${expected}」ではなく「${actual}」が見つかりました`,
      pathFound: (hops: number, summary: string) =>
        `${hops}ホップのパスが見つかりました: ${summary}`,
      pathLabel: 'パス',
      claimAnalysis: (claim: string) => `主張の分析: 「${claim}」`,
      scoreResult: (score: number, consistent: boolean) =>
        `整合性スコア: ${(score * 100).toFixed(1)}% (${consistent ? '整合的' : '非整合'})`,
      supportingHeader: '支持するエビデンス:',
      contradictingHeader: '矛盾するエビデンス:',
      suggestionVerifyEntities:
        '言及されたエンティティがナレッジベースに存在するか確認してください',
      suggestionCheckRelations:
        'エンティティ間の関係タイプを確認してください',
      suggestionVerifyFacts:
        '信頼できるソースで主張を照合してください',
    };
  }
}
