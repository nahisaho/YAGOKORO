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
