// Commands module exports
export { createGraphCommand, type GraphService, type GraphCommandOptions } from './graph.js';
export {
  createEntityCommand,
  type EntityService,
  type CLIEntity,
  type EntityListOptions,
  type EntityCreateData,
  type EntityUpdateData,
  type EntitySearchOptions,
} from './entity.js';
export {
  createRelationCommand,
  type RelationService,
  type CLIRelation,
  type RelationListOptions,
  type RelationCreateData,
} from './relation.js';
export {
  createCommunityCommand,
  type CommunityService,
  type CLICommunity,
  type CommunityListOptions,
  type CommunityDetectOptions,
  type CommunityDetectionResult,
  type SummarizeAllOptions,
} from './community.js';
export {
  createMCPCommand,
  type MCPService,
  type MCPServerStatus,
  type MCPToolInfo,
  type MCPResourceInfo,
  type MCPServeOptions,
} from './mcp.js';
export {
  createSeedCommand,
  type SeedService,
  type SeedDataType,
  type SeedIngestOptions,
  type SeedIngestResult,
  type SeedClearOptions,
  type SeedClearResult,
  type SeedPreviewResult,
  type SeedStatusResult,
} from './seed.js';
export {
  createNormalizeCommand,
  type NormalizeService,
  type NormalizeResult,
  type NormalizeOptions,
  type AliasEntry,
  type AliasListOptions,
  type RuleEntry,
} from './normalize.js';
export {
  createBackupCommand,
  type BackupCommandService,
  type BackupOptions,
  type BackupResult,
  type RestoreOptions,
  type RestoreResult,
  type ValidationResult,
  type BackupListItem,
} from './backup.js';
export {
  createIngestCommand,
  type IngestService,
  type ArxivPaperResult,
  type BatchIngestOptions,
  type BatchIngestResult,
  type PdfMetadata,
  type PdfResult,
  type ArxivSearchOptions,
  type ArxivSearchResult,
} from './ingest.js';
export {
  createPathCommand,
  type PathService,
  type CLIPath,
  type CLIPathNode,
  type CLIPathRelation,
  type CLIPathResult,
  type CLIPathExplanation,
  type PathFindOptions,
} from './path.js';
export {
  createGapCommand,
  type GapService,
  type CLIResearchGap,
  type CLIGapReport,
  type CLIResearchProposal,
  type GapAnalyzeOptions,
  type ProposalOptions,
} from './gap.js';
