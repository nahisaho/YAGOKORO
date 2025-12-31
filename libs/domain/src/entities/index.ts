export { AIModel, type AIModelCategory, type AIModality, type AIModelProps } from './AIModel.js';
export { Organization, type OrganizationType, type OrganizationProps } from './Organization.js';
export { Technique, type TechniqueCategory, type TechniqueProps } from './Technique.js';
export {
  Publication,
  type PublicationType,
  type PublicationProps,
  type PaperSource,
  type ProcessingStatus,
  type Author,
} from './Publication.js';
export { Person, type PersonProps } from './Person.js';
export { Benchmark, type BenchmarkCategory, type BenchmarkProps } from './Benchmark.js';
export { Concept, type ConceptCategory, type ConceptProps } from './Concept.js';
export { Community, type CommunityProps } from './Community.js';

// v4.0.0: Temporal Analysis types
export {
  type AdoptionPhase,
  type TemporalMetadata,
  type TrendMetrics,
  type TimelineEntry,
  type TimelineData,
  type HotTopic,
  type TrendForecast,
  type TrendSnapshot,
  type TimeRangeFilter,
  type TemporalQueryOptions,
  determineAdoptionPhase,
  resolveTimeRange,
} from './temporal.js';

// v4.0.0: Researcher Network types
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
} from './researcher.js';
