/**
 * @yagokoro/analyzer - Type Definitions
 *
 * Phase 3: Research Gap Analyzer types
 * Based on DES-002 §5
 */

import type { EntityType } from '@yagokoro/domain';

// Re-export EntityType
export type { EntityType };

// ============================================================================
// Citation Analysis Types
// ============================================================================

/**
 * Citation metrics for a single entity
 */
export interface CitationMetrics {
  entityId: string;
  entityName: string;
  entityType: EntityType;
  citationCount: number;
  citedByCount: number;
  hIndex: number;
  recentCitationGrowth: number;
  crossDomainCitations: number;
}

/**
 * Node in citation network
 */
export interface CitationNode {
  id: string;
  name: string;
  type: EntityType;
  year?: number;
  domain?: string;
  citationCount: number;
}

/**
 * Edge in citation network
 */
export interface CitationEdge {
  source: string;
  target: string;
  weight: number;
  year?: number;
}

/**
 * Cluster within citation network
 */
export interface CitationCluster {
  id: string;
  name: string;
  nodeCount: number;
  avgCitationCount: number;
  mainDomain?: string;
}

/**
 * Citation network structure
 */
export interface CitationNetwork {
  nodes: CitationNode[];
  edges: CitationEdge[];
  clusters: CitationCluster[];
  totalCitations: number;
  density: number;
}

/**
 * Isolated citation cluster (island)
 */
export interface CitationIsland {
  componentId: number;
  size: number;
  nodes?: CitationNode[];
}

/**
 * Options for citation analysis
 */
export interface CitationAnalysisOptions {
  domain?: string;
  minYear?: number;
  maxYear?: number;
  limit?: number;
  includeEdges?: boolean;
}

// ============================================================================
// Cluster Analysis Types
// ============================================================================

/**
 * Entity within a research cluster
 */
export interface ClusterEntity {
  id: string;
  name: string;
  type: EntityType;
  centrality: number;
}

/**
 * Research cluster
 */
export interface ResearchCluster {
  id: string;
  name: string;
  keywords: string[];
  entities: ClusterEntity[];
  publicationCount: number;
  avgPublicationYear: number;
  growthRate: number;
  connectionStrength: Map<string, number>;
}

/**
 * Gap between clusters
 */
export interface ClusterGap {
  cluster1: ResearchCluster;
  cluster2: ResearchCluster;
  connectionStrength: number;
  potentialBridgeTopics: string[];
}

/**
 * Options for cluster analysis
 */
export interface ClusterAnalysisOptions {
  minClusterSize?: number;
  maxClusters?: number;
  includeConnections?: boolean;
  connectionThreshold?: number;
}

// ============================================================================
// Gap Detection Types
// ============================================================================

/**
 * Type of research gap
 */
export type GapType =
  | 'underexplored_technique'
  | 'missing_combination'
  | 'isolated_cluster'
  | 'stale_research_area'
  | 'unexplored_application';

/**
 * Severity level
 */
export type GapSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Evidence supporting gap detection
 */
export interface GapEvidence {
  type: string;
  value: unknown;
  source: string;
}

/**
 * Research gap
 */
export interface ResearchGap {
  id: string;
  type: GapType;
  description: string;
  severity: GapSeverity;
  evidence: GapEvidence[];
  suggestedActions: string[];
  relatedEntities: string[];
  score?: number;
  createdAt?: Date;
}

/**
 * Possible combination of techniques and models
 */
export interface PossibleCombination {
  key: string;
  model: string;
  technique: string;
  potentialScore?: number;
}

/**
 * Options for gap detection
 */
export interface GapDetectionOptions {
  types?: GapType[];
  minSeverity?: GapSeverity;
  useLLM?: boolean;
  limit?: number;
  includeExisting?: boolean;
}

// ============================================================================
// Service Types
// ============================================================================

/**
 * Analysis report
 */
export interface GapAnalysisReport {
  id: string;
  generatedAt: Date;
  totalGaps: number;
  gapsByType: Record<GapType, number>;
  gapsBySeverity: Record<GapSeverity, number>;
  gaps: ResearchGap[];
  citationMetrics?: CitationMetrics[];
  clusters?: ResearchCluster[];
  recommendations: ResearchRecommendation[];
}

/**
 * Research recommendation
 */
export interface ResearchRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  relatedGaps: string[];
  suggestedApproach: string[];
  estimatedImpact: number;
}

/**
 * Research proposal generated from gaps
 */
export interface ResearchProposal {
  id: string;
  title: string;
  abstract: string;
  gaps: ResearchGap[];
  methodology: string[];
  expectedOutcomes: string[];
  requiredResources: string[];
  estimatedDuration: string;
  priority: number;
}

/**
 * Options for service analysis
 */
export interface AnalyzerServiceOptions {
  includeCitations?: boolean;
  includeClusters?: boolean;
  gapOptions?: GapDetectionOptions;
  generateRecommendations?: boolean;
}

// ============================================================================
// Dependency Interfaces
// ============================================================================

/**
 * LLM client interface for gap analysis
 */
export interface LLMClientInterface {
  generate(prompt: string): Promise<string>;
  generateWithSchema<T>(prompt: string, schema: unknown): Promise<T>;
}

/**
 * Neo4j connection interface
 */
export interface Neo4jConnectionInterface {
  run(cypher: string, params?: Record<string, unknown>): Promise<Neo4jQueryResult>;
  close(): Promise<void>;
}

/**
 * Neo4j query result
 */
export interface Neo4jQueryResult {
  records: Neo4jRecord[];
  summary?: unknown;
}

/**
 * Neo4j record
 */
export interface Neo4jRecord {
  get(key: string): unknown;
  toObject(): Record<string, unknown>;
}

/**
 * Vector store interface for semantic similarity
 */
export interface VectorStoreInterface {
  search(query: string, limit: number): Promise<VectorSearchResult[]>;
  similarity(text1: string, text2: string): Promise<number>;
}

/**
 * Vector search result
 */
export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/**
 * Dependencies for CitationAnalyzer
 */
export interface CitationAnalyzerDependencies {
  neo4jConnection: Neo4jConnectionInterface;
}

/**
 * Dependencies for ClusterAnalyzer
 */
export interface ClusterAnalyzerDependencies {
  neo4jConnection: Neo4jConnectionInterface;
  vectorStore?: VectorStoreInterface;
}

/**
 * Dependencies for GapDetector
 */
export interface GapDetectorDependencies {
  neo4jConnection: Neo4jConnectionInterface;
  citationAnalyzer: CitationAnalyzerInterface;
  clusterAnalyzer: ClusterAnalyzerInterface;
  llmClient?: LLMClientInterface;
}

/**
 * Dependencies for ResearchGapAnalyzerService
 */
export interface ResearchGapAnalyzerServiceDependencies {
  neo4jConnection: Neo4jConnectionInterface;
  llmClient?: LLMClientInterface;
  vectorStore?: VectorStoreInterface;
}

// ============================================================================
// Component Interfaces
// ============================================================================

/**
 * Citation analyzer interface
 */
export interface CitationAnalyzerInterface {
  analyzeCitationNetwork(options?: CitationAnalysisOptions): Promise<CitationNetwork>;
  getTopCited(limit?: number): Promise<CitationMetrics[]>;
  findCitationIslands(): Promise<CitationIsland[]>;
  getCitationMetrics(entityId: string): Promise<CitationMetrics | null>;
}

/**
 * Cluster analyzer interface
 */
export interface ClusterAnalyzerInterface {
  analyzeExistingClusters(options?: ClusterAnalysisOptions): Promise<ResearchCluster[]>;
  findClusterGaps(): Promise<ClusterGap[]>;
  measureConnection(cluster1Id: string, cluster2Id: string): Promise<number>;
  suggestBridgeTopics(cluster1: ResearchCluster, cluster2: ResearchCluster): Promise<string[]>;
}

/**
 * Gap detector interface
 */
export interface GapDetectorInterface {
  detectGaps(options?: GapDetectionOptions): Promise<ResearchGap[]>;
  findUnexploredCombinations(): Promise<ResearchGap[]>;
  findStaleResearchAreas(): Promise<ResearchGap[]>;
  findIsolatedResearchAreas(): Promise<ResearchGap[]>;
  prioritizeGaps(gaps: ResearchGap[]): ResearchGap[];
}

/**
 * Research gap analyzer service interface
 */
export interface ResearchGapAnalyzerServiceInterface {
  analyze(options?: AnalyzerServiceOptions): Promise<GapAnalysisReport>;
  generateResearchProposals(gaps: ResearchGap[], count?: number): Promise<ResearchProposal[]>;
  getGapById(gapId: string): Promise<ResearchGap | null>;
  exportReport(report: GapAnalysisReport, format: 'json' | 'markdown'): Promise<string>;
}
