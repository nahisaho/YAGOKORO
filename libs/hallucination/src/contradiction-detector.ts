/**
 * @fileoverview Contradiction detector for identifying conflicts in claims
 */

import type { ReasoningContext } from '@yagokoro/graphrag';
import type {
  FactClaim,
  Evidence,
  Contradiction,
  ContradictionResult,
} from './types.js';

/**
 * Configuration for ContradictionDetector
 */
export interface ContradictionDetectorConfig {
  /** Threshold for semantic similarity to detect contradictions */
  similarityThreshold?: number;
  /** Minimum severity to report */
  minSeverity?: number;
  /** Coherence score threshold */
  coherenceThreshold?: number;
  /** Language for messages */
  language?: 'ja' | 'en';
  /** Maximum contradictions to report */
  maxContradictions?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<ContradictionDetectorConfig> = {
  similarityThreshold: 0.7,
  minSeverity: 0.3,
  coherenceThreshold: 0.6,
  language: 'ja',
  maxContradictions: 20,
};

/**
 * ContradictionDetector identifies conflicts between claims and evidence
 */
export class ContradictionDetector {
  private readonly config: Required<ContradictionDetectorConfig>;

  constructor(_context: ReasoningContext, config?: ContradictionDetectorConfig) {
    // _context is reserved for future use (e.g., graph-based contradiction detection)
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Detect contradictions in a set of claims
   */
  async detect(claims: FactClaim[]): Promise<ContradictionResult> {
    const contradictions: Contradiction[] = [];

    // Check for direct contradictions between claims
    const directContradictions = await this.findDirectContradictions(claims);
    contradictions.push(...directContradictions);

    // Check for temporal contradictions
    const temporalContradictions = this.findTemporalContradictions(claims);
    contradictions.push(...temporalContradictions);

    // Check for logical contradictions
    const logicalContradictions = this.findLogicalContradictions(claims);
    contradictions.push(...logicalContradictions);

    // Filter by severity and limit
    const filteredContradictions = contradictions
      .filter((c) => c.severity >= this.config.minSeverity)
      .sort((a, b) => b.severity - a.severity)
      .slice(0, this.config.maxContradictions);

    // Calculate coherence score
    const coherenceScore = this.calculateCoherenceScore(
      claims,
      filteredContradictions
    );

    const isCoherent = coherenceScore >= this.config.coherenceThreshold;
    const summary = this.generateSummary(
      claims,
      filteredContradictions,
      coherenceScore,
      isCoherent
    );

    return {
      claims,
      contradictions: filteredContradictions,
      coherenceScore,
      isCoherent,
      summary,
    };
  }

  /**
   * Detect contradictions between claims and evidence
   */
  async detectWithEvidence(
    claims: FactClaim[],
    evidenceList: Evidence[]
  ): Promise<ContradictionResult> {
    // First detect contradictions among claims
    const claimResult = await this.detect(claims);
    const contradictions = [...claimResult.contradictions];

    // Check claims against evidence
    for (const claim of claims) {
      for (const evidence of evidenceList) {
        if (!evidence.supports) {
          const contradiction = this.checkClaimEvidenceContradiction(
            claim,
            evidence
          );
          if (contradiction) {
            contradictions.push(contradiction);
          }
        }
      }
    }

    // Recalculate with new contradictions
    const filteredContradictions = contradictions
      .filter((c) => c.severity >= this.config.minSeverity)
      .sort((a, b) => b.severity - a.severity)
      .slice(0, this.config.maxContradictions);

    const coherenceScore = this.calculateCoherenceScore(
      claims,
      filteredContradictions
    );
    const isCoherent = coherenceScore >= this.config.coherenceThreshold;
    const summary = this.generateSummary(
      claims,
      filteredContradictions,
      coherenceScore,
      isCoherent
    );

    return {
      claims,
      contradictions: filteredContradictions,
      coherenceScore,
      isCoherent,
      summary,
    };
  }

  /**
   * Find direct contradictions between claims (same subject, opposite assertions)
   */
  private async findDirectContradictions(
    claims: FactClaim[]
  ): Promise<Contradiction[]> {
    const contradictions: Contradiction[] = [];
    const messages = this.getMessages();

    for (let i = 0; i < claims.length; i++) {
      for (let j = i + 1; j < claims.length; j++) {
        const claim1 = claims[i];
        const claim2 = claims[j];

        if (!claim1 || !claim2) continue;

        // Check if claims share entities
        const sharedEntities = claim1.entityIds.filter((id) =>
          claim2.entityIds.includes(id)
        );

        if (sharedEntities.length === 0) continue;

        // Check for opposing relations
        if (this.hasOpposingRelations(claim1, claim2)) {
          contradictions.push({
            id: `contradiction-direct-${i}-${j}`,
            first: claim1,
            second: claim2,
            type: 'direct',
            severity: 0.9,
            description: messages.directContradiction(
              claim1.text,
              claim2.text
            ),
            resolution: messages.resolutionVerifySource,
          });
        }

        // Check for semantic opposition
        if (this.hasSemanticallyOpposite(claim1.text, claim2.text)) {
          contradictions.push({
            id: `contradiction-semantic-${i}-${j}`,
            first: claim1,
            second: claim2,
            type: 'semantic',
            severity: 0.7,
            description: messages.semanticContradiction(
              claim1.text,
              claim2.text
            ),
            resolution: messages.resolutionClarify,
          });
        }
      }
    }

    return contradictions;
  }

  /**
   * Find temporal contradictions (conflicting time-based assertions)
   */
  private findTemporalContradictions(claims: FactClaim[]): Contradiction[] {
    const contradictions: Contradiction[] = [];
    const messages = this.getMessages();

    // Extract temporal patterns
    const temporalPatterns = [
      { pattern: /初めて|最初|first/i, type: 'first' },
      { pattern: /以前|before|前/i, type: 'before' },
      { pattern: /以後|after|後/i, type: 'after' },
      { pattern: /(\d{4})年/i, type: 'year' },
    ];

    for (let i = 0; i < claims.length; i++) {
      for (let j = i + 1; j < claims.length; j++) {
        const claim1 = claims[i];
        const claim2 = claims[j];

        if (!claim1 || !claim2) continue;

        // Check for conflicting "first" claims
        const firstPattern = temporalPatterns.find((p) => p.type === 'first');
        if (firstPattern) {
          const isFirst1 = firstPattern.pattern.test(claim1.text);
          const isFirst2 = firstPattern.pattern.test(claim2.text);

          if (isFirst1 && isFirst2) {
            const sharedEntities = claim1.entityIds.filter((id) =>
              claim2.entityIds.includes(id)
            );
            if (sharedEntities.length > 0) {
              contradictions.push({
                id: `contradiction-temporal-${i}-${j}`,
                first: claim1,
                second: claim2,
                type: 'temporal',
                severity: 0.8,
                description: messages.temporalContradiction(
                  claim1.text,
                  claim2.text
                ),
                resolution: messages.resolutionCheckTimeline,
              });
            }
          }
        }

        // Check for conflicting year references
        const year1 = this.extractYear(claim1.text);
        const year2 = this.extractYear(claim2.text);

        if (year1 && year2 && year1 !== year2) {
          const sharedEntities = claim1.entityIds.filter((id) =>
            claim2.entityIds.includes(id)
          );
          if (sharedEntities.length > 0) {
            // Check if claims are about the same event
            if (this.isSameEvent(claim1.text, claim2.text)) {
              contradictions.push({
                id: `contradiction-year-${i}-${j}`,
                first: claim1,
                second: claim2,
                type: 'temporal',
                severity: 0.85,
                description: messages.yearContradiction(year1, year2),
                resolution: messages.resolutionVerifyDate,
              });
            }
          }
        }
      }
    }

    return contradictions;
  }

  /**
   * Find logical contradictions
   */
  private findLogicalContradictions(claims: FactClaim[]): Contradiction[] {
    const contradictions: Contradiction[] = [];
    const messages = this.getMessages();

    // Check for A -> B and B -> C but A -/> C inconsistencies
    for (let i = 0; i < claims.length; i++) {
      const claim = claims[i];
      if (!claim?.sourceEntityId || !claim.targetEntityId) continue;

      // Find transitive claims
      for (let j = 0; j < claims.length; j++) {
        if (i === j) continue;
        const claim2 = claims[j];
        if (!claim2?.sourceEntityId || !claim2.targetEntityId) continue;

        // Check for A -> B, B -> A (bidirectional but shouldn't be)
        if (
          claim.sourceEntityId === claim2.targetEntityId &&
          claim.targetEntityId === claim2.sourceEntityId &&
          claim.relationType === claim2.relationType
        ) {
          // Some relations are naturally bidirectional, skip those
          const bidirectionalRelations = ['RELATED_TO', 'COLLABORATES_WITH'];
          if (!bidirectionalRelations.includes(claim.relationType ?? '')) {
            contradictions.push({
              id: `contradiction-logical-${i}-${j}`,
              first: claim,
              second: claim2,
              type: 'logical',
              severity: 0.75,
              description: messages.logicalContradiction(
                claim.relationType ?? 'relation',
                claim.sourceEntityId,
                claim.targetEntityId
              ),
              resolution: messages.resolutionCheckDirection,
            });
          }
        }
      }
    }

    return contradictions;
  }

  /**
   * Check for contradiction between claim and evidence
   */
  private checkClaimEvidenceContradiction(
    claim: FactClaim,
    evidence: Evidence
  ): Contradiction | null {
    if (evidence.supports) return null;

    const messages = this.getMessages();

    // Check if evidence directly contradicts the claim
    const sharedEntities = claim.entityIds.filter(
      (id) => evidence.sourceId.includes(id) || evidence.content.includes(id)
    );

    if (sharedEntities.length > 0 || evidence.confidence > 0.7) {
      return {
        id: `contradiction-evidence-${claim.id}-${evidence.id}`,
        first: claim,
        second: evidence,
        type: 'direct',
        severity: evidence.confidence,
        description: messages.evidenceContradiction(
          claim.text,
          evidence.content
        ),
        resolution: messages.resolutionVerifyBoth,
      };
    }

    return null;
  }

  /**
   * Check if two claims have opposing relations
   */
  private hasOpposingRelations(claim1: FactClaim, claim2: FactClaim): boolean {
    if (!claim1.relationType || !claim2.relationType) return false;

    const opposites: Record<string, string[]> = {
      DEVELOPED_BY: ['NOT_DEVELOPED_BY'],
      CREATED: ['NOT_CREATED'],
      PART_OF: ['NOT_PART_OF'],
      BEFORE: ['AFTER'],
      AFTER: ['BEFORE'],
      LARGER_THAN: ['SMALLER_THAN'],
      SMALLER_THAN: ['LARGER_THAN'],
    };

    const type1Opposites = opposites[claim1.relationType] ?? [];
    return type1Opposites.includes(claim2.relationType);
  }

  /**
   * Check if two texts are semantically opposite
   */
  private hasSemanticallyOpposite(text1: string, text2: string): boolean {
    const negations = [
      { positive: /できる|can|possible/i, negative: /できない|cannot|impossible/i },
      { positive: /ある|exist|is/i, negative: /ない|does not exist|is not/i },
      { positive: /成功|success/i, negative: /失敗|fail/i },
      { positive: /正しい|correct|true/i, negative: /間違|incorrect|false/i },
    ];

    for (const pair of negations) {
      if (
        (pair.positive.test(text1) && pair.negative.test(text2)) ||
        (pair.negative.test(text1) && pair.positive.test(text2))
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract year from text
   */
  private extractYear(text: string): number | null {
    const match = text.match(/(\d{4})年?/);
    return match ? parseInt(match[1]!, 10) : null;
  }

  /**
   * Check if two claims refer to the same event
   */
  private isSameEvent(text1: string, text2: string): boolean {
    const eventKeywords = [
      '発表', '発売', 'リリース', '公開', '開始',
      'announce', 'release', 'launch', 'publish', 'start',
    ];

    const hasEvent1 = eventKeywords.some((k) => text1.includes(k));
    const hasEvent2 = eventKeywords.some((k) => text2.includes(k));

    return hasEvent1 && hasEvent2;
  }

  /**
   * Calculate coherence score
   */
  private calculateCoherenceScore(
    claims: FactClaim[],
    contradictions: Contradiction[]
  ): number {
    if (claims.length === 0) return 1;
    if (contradictions.length === 0) return 1;

    // Weight contradictions by severity
    const contradictionWeight = contradictions.reduce(
      (sum, c) => sum + c.severity,
      0
    );

    // Max possible contradiction weight
    const maxWeight = (claims.length * (claims.length - 1)) / 2;
    if (maxWeight === 0) return 1;

    const normalizedWeight = Math.min(contradictionWeight / maxWeight, 1);
    return 1 - normalizedWeight;
  }

  /**
   * Generate summary of contradiction analysis
   */
  private generateSummary(
    claims: FactClaim[],
    contradictions: Contradiction[],
    coherenceScore: number,
    isCoherent: boolean
  ): string {
    const messages = this.getMessages();
    const parts: string[] = [];

    parts.push(messages.summaryHeader(claims.length, contradictions.length));
    parts.push(messages.coherenceResult(coherenceScore, isCoherent));

    if (contradictions.length > 0) {
      parts.push(messages.contradictionsFound);
      for (const contradiction of contradictions.slice(0, 5)) {
        parts.push(`  - [${this.getTypeLabel(contradiction.type)}] ${contradiction.description}`);
      }
      if (contradictions.length > 5) {
        parts.push(messages.moreContradictions(contradictions.length - 5));
      }
    }

    return parts.join('\n');
  }

  /**
   * Get human-readable type label
   */
  private getTypeLabel(type: Contradiction['type']): string {
    const labels: Record<Contradiction['type'], { ja: string; en: string }> = {
      direct: { ja: '直接矛盾', en: 'Direct' },
      temporal: { ja: '時間的矛盾', en: 'Temporal' },
      logical: { ja: '論理的矛盾', en: 'Logical' },
      semantic: { ja: '意味的矛盾', en: 'Semantic' },
    };
    return labels[type][this.config.language];
  }

  /**
   * Get localized messages
   */
  private getMessages() {
    if (this.config.language === 'en') {
      return {
        directContradiction: (c1: string, c2: string) =>
          `Direct contradiction between: "${c1}" and "${c2}"`,
        semanticContradiction: (c1: string, c2: string) =>
          `Semantically opposing statements: "${c1}" vs "${c2}"`,
        temporalContradiction: (c1: string, c2: string) =>
          `Temporal conflict: "${c1}" vs "${c2}"`,
        yearContradiction: (y1: number, y2: number) =>
          `Conflicting years: ${y1} vs ${y2}`,
        logicalContradiction: (rel: string, src: string, tgt: string) =>
          `Logical inconsistency in "${rel}" between ${src} and ${tgt}`,
        evidenceContradiction: (claim: string, evidence: string) =>
          `Claim "${claim}" contradicted by evidence: ${evidence}`,
        resolutionVerifySource: 'Verify the primary source for both claims',
        resolutionClarify: 'Clarify the intended meaning of each statement',
        resolutionCheckTimeline: 'Verify the timeline of events',
        resolutionVerifyDate: 'Confirm the correct date from official sources',
        resolutionCheckDirection: 'Verify the directionality of the relationship',
        resolutionVerifyBoth: 'Cross-reference both the claim and evidence',
        summaryHeader: (claims: number, contradictions: number) =>
          `Analyzed ${claims} claims, found ${contradictions} contradiction(s)`,
        coherenceResult: (score: number, coherent: boolean) =>
          `Coherence Score: ${(score * 100).toFixed(1)}% (${coherent ? 'Coherent' : 'Incoherent'})`,
        contradictionsFound: 'Contradictions found:',
        moreContradictions: (count: number) => `  ... and ${count} more`,
      };
    }

    return {
      directContradiction: (c1: string, c2: string) =>
        `直接矛盾: 「${c1}」と「${c2}」`,
      semanticContradiction: (c1: string, c2: string) =>
        `意味的に相反する主張: 「${c1}」対「${c2}」`,
      temporalContradiction: (c1: string, c2: string) =>
        `時間的矛盾: 「${c1}」対「${c2}」`,
      yearContradiction: (y1: number, y2: number) =>
        `年の矛盾: ${y1}年 対 ${y2}年`,
      logicalContradiction: (rel: string, src: string, tgt: string) =>
        `「${rel}」関係の論理的矛盾: ${src}と${tgt}の間`,
      evidenceContradiction: (claim: string, evidence: string) =>
        `主張「${claim}」はエビデンスと矛盾: ${evidence}`,
      resolutionVerifySource: '両方の主張の一次ソースを確認してください',
      resolutionClarify: '各ステートメントの意図を明確にしてください',
      resolutionCheckTimeline: 'イベントのタイムラインを確認してください',
      resolutionVerifyDate: '公式ソースから正しい日付を確認してください',
      resolutionCheckDirection: '関係の方向性を確認してください',
      resolutionVerifyBoth: '主張とエビデンスの両方を照合してください',
      summaryHeader: (claims: number, contradictions: number) =>
        `${claims}件の主張を分析、${contradictions}件の矛盾を検出`,
      coherenceResult: (score: number, coherent: boolean) =>
        `整合性スコア: ${(score * 100).toFixed(1)}% (${coherent ? '整合的' : '非整合'})`,
      contradictionsFound: '検出された矛盾:',
      moreContradictions: (count: number) => `  ... 他${count}件`,
    };
  }
}
