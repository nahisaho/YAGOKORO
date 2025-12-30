/**
 * @fileoverview Hallucination detection types
 */

import type { ReasoningPath } from '@yagokoro/graphrag';

/**
 * Fact claim extracted from a response
 */
export interface FactClaim {
  /** Unique identifier */
  id: string;
  /** The claim text */
  text: string;
  /** Entity IDs mentioned in the claim */
  entityIds: string[];
  /** Relation type if applicable */
  relationType?: string;
  /** Source entity ID */
  sourceEntityId?: string;
  /** Target entity ID */
  targetEntityId?: string;
  /** Confidence of extraction */
  confidence: number;
}

/**
 * Evidence supporting or contradicting a claim
 */
export interface Evidence {
  /** Unique identifier */
  id: string;
  /** Evidence type */
  type: 'graph' | 'document' | 'community' | 'external';
  /** Source identifier */
  sourceId: string;
  /** Source name */
  sourceName: string;
  /** Supporting/contradicting content */
  content: string;
  /** Whether this supports the claim */
  supports: boolean;
  /** Confidence level */
  confidence: number;
  /** Timestamp of the evidence */
  timestamp?: Date;
}

/**
 * Result of consistency checking
 */
export interface ConsistencyResult {
  /** The claim being checked */
  claim: FactClaim;
  /** Whether the claim is consistent with evidence */
  isConsistent: boolean;
  /** Overall consistency score (0-1) */
  score: number;
  /** Supporting evidence */
  supportingEvidence: Evidence[];
  /** Contradicting evidence */
  contradictingEvidence: Evidence[];
  /** Explanation of the result */
  explanation: string;
  /** Suggestions for improvement */
  suggestions?: string[];
}

/**
 * Contradiction between two claims or evidence
 */
export interface Contradiction {
  /** Unique identifier */
  id: string;
  /** First claim/evidence */
  first: FactClaim | Evidence;
  /** Second claim/evidence */
  second: FactClaim | Evidence;
  /** Type of contradiction */
  type: 'direct' | 'temporal' | 'logical' | 'semantic';
  /** Severity (0-1) */
  severity: number;
  /** Description of the contradiction */
  description: string;
  /** Resolution suggestion */
  resolution?: string;
}

/**
 * Result of contradiction detection
 */
export interface ContradictionResult {
  /** Claims analyzed */
  claims: FactClaim[];
  /** Detected contradictions */
  contradictions: Contradiction[];
  /** Overall coherence score (0-1) */
  coherenceScore: number;
  /** Whether the response is coherent */
  isCoherent: boolean;
  /** Summary of findings */
  summary: string;
}

/**
 * Hallucination detection result
 */
export interface HallucinationResult {
  /** Original query */
  query: string;
  /** Response being checked */
  response: string;
  /** Extracted claims */
  claims: FactClaim[];
  /** Consistency results per claim */
  consistencyResults: ConsistencyResult[];
  /** Contradiction analysis */
  contradictionResult: ContradictionResult;
  /** Overall hallucination score (0=no hallucination, 1=fully hallucinated) */
  hallucinationScore: number;
  /** Whether hallucination is detected */
  hasHallucination: boolean;
  /** Detailed explanation */
  explanation: string;
  /** Improvement suggestions */
  suggestions: string[];
}

/**
 * Configuration for hallucination detection
 */
export interface HallucinationDetectorConfig {
  /** Minimum consistency score to consider valid */
  minConsistencyScore?: number;
  /** Minimum coherence score to consider valid */
  minCoherenceScore?: number;
  /** Hallucination score threshold */
  hallucinationThreshold?: number;
  /** Language for messages */
  language?: 'ja' | 'en';
  /** Whether to use LLM for claim extraction */
  useLLMExtraction?: boolean;
  /** Maximum claims to analyze */
  maxClaims?: number;
}

/**
 * Input for hallucination detection
 */
export interface HallucinationDetectorInput {
  /** Original query */
  query: string;
  /** Response to check */
  response: string;
  /** Entity IDs from the response */
  entityIds?: string[];
  /** Reasoning paths used */
  paths?: ReasoningPath[];
  /** Additional context */
  context?: string;
}

/**
 * LLM client interface for claim extraction
 */
export interface ClaimExtractorLLM {
  /** Extract claims from text */
  extractClaims(text: string, context?: string): Promise<FactClaim[]>;
}
