/**
 * @yagokoro/researcher
 *
 * Researcher network analysis module for YAGOKORO v4.0.0
 *
 * Features:
 * - F-005: Researcher Network Integration
 *   - REQ-005-01: ORCID ID integration
 *   - REQ-005-02: Coauthor network construction
 *   - REQ-005-03: Influence score calculation
 *   - REQ-005-04: Community detection (Leiden algorithm)
 *   - REQ-005-05: Coauthor graph retrieval
 *   - REQ-005-06: Path finding between researchers
 *   - REQ-005-07: Profile retrieval
 *   - REQ-005-08: Researcher ranking
 *
 * Uses graphology for community detection with Leiden algorithm.
 *
 * @packageDocumentation
 */

// Re-export domain types for convenience
export {
  type Affiliation,
  type ResearcherMetrics,
  type ResearcherProfile,
  type CoauthorEdge,
  type ResearcherCommunity,
  type ResearcherPath,
  type ResearcherRankEntry,
  type ResearcherMatchResult,
  type CareerEntry,
  type ResearcherQueryOptions,
  type CoauthorNetworkOptions,
  normalizeName,
  calculateCoauthorWeight,
  calculateAuthorSimilarity,
  determineMatchAction,
} from '@yagokoro/domain';

// Services
export {
  CoauthorExtractor,
  type CoauthorExtractorConfig,
  type Paper,
  type PaperAuthor,
  type ExtractedResearcher,
  type CoauthorNetwork,
  AffiliationTracker,
  type AffiliationTrackerConfig,
  type AffiliationRecord,
  type AffiliationTimeline,
  type AffiliationTimelineEntry,
  type AffiliationStats,
  type PaperAuthorAffiliation,
  type PaperWithAffiliations,
  type FindResearchersOptions,
} from './services/index.js';

// Services (to be implemented)
// export { ResearcherService } from './services/ResearcherService.js';
// export { OrcidClient } from './services/OrcidClient.js';

// Ports (to be implemented)
// export type { ResearcherRepository } from './ports/ResearcherRepository.js';
// export type { OrcidPort } from './ports/OrcidPort.js';

// Adapters (to be implemented)
// export { Neo4jResearcherRepository } from './adapters/Neo4jResearcherRepository.js';
// export { OrcidApiAdapter } from './adapters/OrcidApiAdapter.js';
