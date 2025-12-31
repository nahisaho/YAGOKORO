/**
 * Researcher Services
 *
 * @packageDocumentation
 */

export {
  CoauthorExtractor,
  type CoauthorExtractorConfig,
  type Paper,
  type PaperAuthor,
  type ExtractedResearcher,
  type CoauthorNetwork,
} from './CoauthorExtractor.js';

export {
  AffiliationTracker,
  type AffiliationTrackerConfig,
  type AffiliationRecord,
  type AffiliationTimeline,
  type AffiliationTimelineEntry,
  type AffiliationStats,
  type PaperAuthorAffiliation,
  type PaperWithAffiliations,
  type FindResearchersOptions,
} from './AffiliationTracker.js';

export {
  InfluenceCalculator,
  type InfluenceCalculatorConfig,
  type PaperCitation,
  type ResearcherCitations,
  type InfluenceResult,
  type RankingOptions,
} from './InfluenceCalculator.js';

export {
  CommunityDetector,
  type CommunityDetectorConfig,
  type CommunityAlgorithm,
  type CommunityMember,
  type CommunityInfo,
  type BridgeResearcher,
  type CommunityStats,
} from './CommunityDetector.js';

export {
  ORCIDIntegration,
  type ORCIDConfig,
  type ORCIDProfile,
  type ORCIDWork,
  type ORCIDEmployment,
  type ORCIDSearchOptions,
  type EnrichedResearcherProfile,
} from './ORCIDIntegration.js';

export {
  CareerAnalyzer,
  type CareerAnalyzerConfig,
  type CareerPhase,
  type MilestoneType,
  type CareerMilestone,
  type CareerTransition,
  type PaperMetadata,
  type ProductivityMetrics,
  type CareerTimeline,
  type CareerComparison,
  type CareerPrediction,
} from './CareerAnalyzer.js';

export {
  ResearcherService,
  type ResearcherServiceConfig,
  type ResearcherSearchOptions,
  type ResearcherDetails,
  type InfluenceRankingOptions,
  type InfluenceRankingItem,
  type NetworkStats,
  type IndexResult,
  type GraphExport,
  type ResearcherCitations,
} from './ResearcherService.js';
