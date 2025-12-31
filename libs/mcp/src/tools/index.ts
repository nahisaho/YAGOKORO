// Tools module exports
export {
  createGraphRAGTools,
  createQueryKnowledgeGraphTool,
  createGetEntityTool,
  createGetRelationsTool,
  createGetPathTool,
  createGetCommunityTool,
  createAddEntityTool,
  createAddRelationTool,
  createSearchSimilarTool,
  QueryKnowledgeGraphInputSchema,
  GetEntityInputSchema,
  GetRelationsInputSchema,
  GetPathInputSchema,
  GetCommunityInputSchema,
  AddEntityInputSchema,
  AddRelationInputSchema,
  SearchSimilarInputSchema,
} from './graphrag-tools.js';

// Advanced tools (NLQ, CoT, Hallucination)
export {
  createAdvancedTools,
  createNaturalLanguageQueryTool,
  createChainOfThoughtTool,
  createValidateResponseTool,
  createCheckConsistencyTool,
  NaturalLanguageQueryInputSchema,
  ChainOfThoughtInputSchema,
  ValidateResponseInputSchema,
  CheckConsistencyInputSchema,
  type AdvancedToolDependencies,
  type NLQServiceInterface,
  type CoTGeneratorInterface,
  type ConfidenceScorerInterface,
  type ConsistencyCheckerInterface,
  type ContradictionDetectorInterface,
} from './advanced-tools.js';

// Normalization tools
export {
  createNormalizationTools,
  createNormalizeEntityTool,
  createNormalizeBatchTool,
  createRegisterAliasTool,
  createResolveAliasTool,
  createListAliasesTool,
  createGetRulesTool,
  NormalizeEntityInputSchema,
  NormalizeBatchInputSchema,
  RegisterAliasInputSchema,
  ResolveAliasInputSchema,
  ListAliasesInputSchema,
  GetRulesInputSchema,
  type NormalizationServiceInterface,
  type NormalizationToolDependencies,
  type NormalizationResult,
  type AliasEntry as MCPAliasEntry,
  type NormalizationRule,
} from './normalization-tools.js';

// Path finding tools
export {
  createPathTools,
  createFindPathsTool,
  createShortestPathTool,
  createCheckConnectionTool,
  createDegreesOfSeparationTool,
  createExplainPathTool,
  FindPathsInputSchema,
  ShortestPathInputSchema,
  CheckConnectionInputSchema,
  DegreesOfSeparationInputSchema,
  ExplainPathInputSchema,
  type PathToolDependencies,
  type PathServiceInterface,
  type Path,
  type PathNode,
  type PathRelation,
  type PathResult,
  type PathExplanation,
  type FindPathsOptions,
} from './path-tools.js';

// Gap analysis tools
export {
  createGapTools,
  type GapToolDependencies,
  type GapAnalyzerInterface,
  type ResearchGap,
  type GapAnalysisReport,
  type ResearchProposal,
  type GapType,
  type GapSeverity,
  type GapAnalyzeOptions,
} from './gap-tools.js';

// Lifecycle tools
export {
  lifecycleTools,
  createLifecycleToolHandler,
  isLifecycleTool,
  type LifecycleToolService,
  type MCPLifecycleAnalysis,
  type MCPLifecycleReport,
  type MCPPhaseResult,
  type MCPMaturityScore,
  type MCPTrendForecast,
  type MCPEmergingTechnology,
  type MCPDecliningTechnology,
  type MCPTechnologyComparison,
  type LifecyclePhase as MCPLifecyclePhase,
} from './lifecycle.js';

// Temporal tools
export {
  temporalTools,
  createTemporalToolHandlers,
  type TemporalToolService,
  type MCPAdoptionPhase,
  type MCPGranularity,
  type MCPTimeRangePreset,
  type MCPTimeRange,
  type MCPDailyMetrics,
  type MCPTrendSummary,
  type MCPTrendDataPoint,
  type MCPTrendAnalysisResult,
  type MCPTimelineDataPoint,
  type MCPTimelineResult,
  type MCPHotTopic,
  type MCPHotTopicsSummary,
  type MCPHotTopicsResult,
  type MCPForecastPrediction,
  type MCPTrendForecast as MCPTemporalForecast,
  type MCPPhaseDistribution,
  type MCPTemporalStatistics,
  type MCPTrendSnapshot,
} from './temporal.js';

// Researcher tools
export {
  researcherTools,
  createResearcherToolHandlers,
  type ResearcherToolService,
  type MCPResearcherDetails,
  type MCPInfluenceRankingItem,
  type MCPCommunityInfo,
  type MCPNetworkStats,
  type MCPGraphExport,
  type MCPCareerStage,
  type MCPCareerTimeline,
  type MCPCareerPrediction,
  type MCPCollaborationPath,
} from './researcher.js';
