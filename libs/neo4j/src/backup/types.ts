/**
 * @module BackupTypes
 * @description バックアップ・リストアシステムの型定義
 */

/**
 * エクスポートデータの形式
 */
export interface ExportData {
  version: string;
  exportedAt: string;
  source: 'neo4j' | 'qdrant' | 'combined';
  metadata: ExportMetadata;
  entities: ExportedEntity[];
  relations: ExportedRelation[];
  communities?: ExportedCommunity[];
  vectors?: ExportedVector[];
}

/**
 * エクスポートメタデータ
 */
export interface ExportMetadata {
  entityCount: number;
  relationCount: number;
  communityCount?: number;
  vectorCount?: number;
  checksum?: string;
}

/**
 * エクスポートされたエンティティ
 */
export interface ExportedEntity {
  id: string;
  type: string;
  name: string;
  description?: string | undefined;
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * エクスポートされたリレーション
 */
export interface ExportedRelation {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  properties: Record<string, unknown>;
  confidence?: number;
  createdAt: string;
}

/**
 * エクスポートされたコミュニティ
 */
export interface ExportedCommunity {
  id: string;
  name: string;
  level: number;
  summary: string;
  memberIds: string[];
  parentId?: string;
}

/**
 * エクスポートされたベクトル
 */
export interface ExportedVector {
  id: string;
  entityId: string;
  vector: number[];
  metadata: Record<string, unknown>;
}

/**
 * バックアップオプション
 */
export interface BackupOptions {
  outputPath: string;
  includeVectors?: boolean;
  includeCommunities?: boolean;
  compress?: boolean;
  entityTypes?: string[];
}

/**
 * リストアオプション
 */
export interface RestoreOptions {
  inputPath: string;
  clearExisting?: boolean;
  skipVectors?: boolean;
  skipCommunities?: boolean;
  dryRun?: boolean;
}

/**
 * バックアップ結果
 */
export interface BackupResult {
  success: boolean;
  outputPath: string;
  entityCount: number;
  relationCount: number;
  communityCount?: number;
  vectorCount?: number;
  duration: number;
  fileSize?: number;
  errors?: string[];
}

/**
 * リストア結果
 */
export interface RestoreResult {
  success: boolean;
  entitiesRestored: number;
  relationsRestored: number;
  communitiesRestored?: number;
  vectorsRestored?: number;
  duration: number;
  skipped?: number;
  errors?: string[];
}

/**
 * バックアップサービスインターフェース
 */
export interface BackupService {
  backup(options: BackupOptions): Promise<BackupResult>;
  restore(options: RestoreOptions): Promise<RestoreResult>;
  validate(inputPath: string): Promise<ValidationResult>;
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
  valid: boolean;
  version: string;
  entityCount: number;
  relationCount: number;
  errors?: string[];
  warnings?: string[];
}
