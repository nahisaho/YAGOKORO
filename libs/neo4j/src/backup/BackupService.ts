/**
 * @module BackupService
 * @description Neo4jとQdrantのバックアップ・リストアサービス
 */

import { createHash } from 'node:crypto';
import type {
  BackupOptions,
  BackupResult,
  BackupService as IBackupService,
  RestoreOptions,
  RestoreResult,
  ValidationResult,
  ExportData,
  ExportMetadata,
  ExportedEntity,
  ExportedRelation,
  ExportedCommunity,
  ExportedVector,
} from './types.js';

/**
 * エンティティリポジトリインターフェース（バックアップ用）
 */
export interface BackupEntityRepository {
  findAll(): Promise<ExportedEntity[]>;
  findByType(type: string): Promise<ExportedEntity[]>;
  create(entity: ExportedEntity): Promise<void>;
  clear(): Promise<void>;
}

/**
 * リレーションリポジトリインターフェース（バックアップ用）
 */
export interface BackupRelationRepository {
  findAll(): Promise<ExportedRelation[]>;
  create(relation: ExportedRelation): Promise<void>;
  clear(): Promise<void>;
}

/**
 * コミュニティリポジトリインターフェース（バックアップ用）
 */
export interface BackupCommunityRepository {
  findAll(): Promise<ExportedCommunity[]>;
  create(community: ExportedCommunity): Promise<void>;
  clear(): Promise<void>;
}

/**
 * ベクトルストアインターフェース（バックアップ用）
 */
export interface BackupVectorStore {
  exportAll(): Promise<ExportedVector[]>;
  importVector(vector: ExportedVector): Promise<void>;
  clear(): Promise<void>;
}

/**
 * ファイルシステムインターフェース
 */
export interface FileSystem {
  writeFile(path: string, content: string): Promise<void>;
  readFile(path: string): Promise<string>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<{ size: number }>;
}

/**
 * バックアップサービス設定
 */
export interface BackupServiceConfig {
  entityRepository: BackupEntityRepository;
  relationRepository: BackupRelationRepository;
  communityRepository?: BackupCommunityRepository;
  vectorStore?: BackupVectorStore;
  fileSystem: FileSystem;
  version?: string;
}

/**
 * バックアップサービス実装
 */
export class Neo4jBackupService implements IBackupService {
  private readonly entityRepository: BackupEntityRepository;
  private readonly relationRepository: BackupRelationRepository;
  private readonly communityRepository: BackupCommunityRepository | undefined;
  private readonly vectorStore: BackupVectorStore | undefined;
  private readonly fileSystem: FileSystem;
  private readonly version: string;

  constructor(config: BackupServiceConfig) {
    this.entityRepository = config.entityRepository;
    this.relationRepository = config.relationRepository;
    this.communityRepository = config.communityRepository;
    this.vectorStore = config.vectorStore;
    this.fileSystem = config.fileSystem;
    this.version = config.version ?? '1.0.0';
  }

  /**
   * バックアップを実行
   */
  async backup(options: BackupOptions): Promise<BackupResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // エンティティを取得
      let entities: ExportedEntity[];
      if (options.entityTypes && options.entityTypes.length > 0) {
        const entityPromises = options.entityTypes.map((type) =>
          this.entityRepository.findByType(type)
        );
        const results = await Promise.all(entityPromises);
        entities = results.flat();
      } else {
        entities = await this.entityRepository.findAll();
      }

      // リレーションを取得
      const relations = await this.relationRepository.findAll();

      // コミュニティを取得（オプション）
      let communities: ExportedCommunity[] | undefined;
      if (options.includeCommunities && this.communityRepository) {
        try {
          communities = await this.communityRepository.findAll();
        } catch (error) {
          errors.push(`Community export failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // ベクトルを取得（オプション）
      let vectors: ExportedVector[] | undefined;
      if (options.includeVectors && this.vectorStore) {
        try {
          vectors = await this.vectorStore.exportAll();
        } catch (error) {
          errors.push(`Vector export failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // エクスポートデータを作成
      const metadata: ExportMetadata = {
        entityCount: entities.length,
        relationCount: relations.length,
      };
      if (communities !== undefined) {
        metadata.communityCount = communities.length;
      }
      if (vectors !== undefined) {
        metadata.vectorCount = vectors.length;
      }

      const exportData: ExportData = {
        version: this.version,
        exportedAt: new Date().toISOString(),
        source: this.vectorStore ? 'combined' : 'neo4j',
        metadata,
        entities,
        relations,
      };
      if (communities !== undefined) {
        exportData.communities = communities;
      }
      if (vectors !== undefined) {
        exportData.vectors = vectors;
      }

      // チェックサムを計算
      const contentForChecksum = JSON.stringify({
        entities: exportData.entities,
        relations: exportData.relations,
      });
      exportData.metadata.checksum = this.calculateChecksum(contentForChecksum);

      // ファイルに書き込み
      const content = JSON.stringify(exportData, null, 2);
      await this.fileSystem.writeFile(options.outputPath, content);

      // ファイルサイズを取得
      let fileSize: number | undefined;
      try {
        const stat = await this.fileSystem.stat(options.outputPath);
        fileSize = stat.size;
      } catch {
        // ファイルサイズ取得は任意
      }

      const result: BackupResult = {
        success: errors.length === 0,
        outputPath: options.outputPath,
        entityCount: entities.length,
        relationCount: relations.length,
        duration: Date.now() - startTime,
      };
      if (communities !== undefined) {
        result.communityCount = communities.length;
      }
      if (vectors !== undefined) {
        result.vectorCount = vectors.length;
      }
      if (fileSize !== undefined) {
        result.fileSize = fileSize;
      }
      if (errors.length > 0) {
        result.errors = errors;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        outputPath: options.outputPath,
        entityCount: 0,
        relationCount: 0,
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * リストアを実行
   */
  async restore(options: RestoreOptions): Promise<RestoreResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let skipped = 0;

    try {
      // ファイルを読み込み
      const content = await this.fileSystem.readFile(options.inputPath);
      const exportData: ExportData = JSON.parse(content);

      // バリデーション
      const validation = await this.validateExportData(exportData);
      if (!validation.valid) {
        const errorResult: RestoreResult = {
          success: false,
          entitiesRestored: 0,
          relationsRestored: 0,
          duration: Date.now() - startTime,
        };
        if (validation.errors && validation.errors.length > 0) {
          errorResult.errors = validation.errors;
        }
        return errorResult;
      }

      // ドライランの場合は実際のリストアをスキップ
      if (options.dryRun) {
        const dryRunResult: RestoreResult = {
          success: true,
          entitiesRestored: exportData.entities.length,
          relationsRestored: exportData.relations.length,
          duration: Date.now() - startTime,
        };
        if (exportData.communities !== undefined) {
          dryRunResult.communitiesRestored = exportData.communities.length;
        }
        if (exportData.vectors !== undefined) {
          dryRunResult.vectorsRestored = exportData.vectors.length;
        }
        return dryRunResult;
      }

      // 既存データをクリア（オプション）
      if (options.clearExisting) {
        await this.relationRepository.clear();
        await this.entityRepository.clear();
        if (this.communityRepository) {
          await this.communityRepository.clear();
        }
        if (this.vectorStore) {
          await this.vectorStore.clear();
        }
      }

      // エンティティをリストア
      let entitiesRestored = 0;
      for (const entity of exportData.entities) {
        try {
          await this.entityRepository.create(entity);
          entitiesRestored++;
        } catch (error) {
          errors.push(`Entity ${entity.id}: ${error instanceof Error ? error.message : String(error)}`);
          skipped++;
        }
      }

      // リレーションをリストア
      let relationsRestored = 0;
      for (const relation of exportData.relations) {
        try {
          await this.relationRepository.create(relation);
          relationsRestored++;
        } catch (error) {
          errors.push(`Relation ${relation.id}: ${error instanceof Error ? error.message : String(error)}`);
          skipped++;
        }
      }

      // コミュニティをリストア（オプション）
      let communitiesRestored: number | undefined;
      if (!options.skipCommunities && exportData.communities && this.communityRepository) {
        communitiesRestored = 0;
        for (const community of exportData.communities) {
          try {
            await this.communityRepository.create(community);
            communitiesRestored++;
          } catch (error) {
            errors.push(`Community ${community.id}: ${error instanceof Error ? error.message : String(error)}`);
            skipped++;
          }
        }
      }

      // ベクトルをリストア（オプション）
      let vectorsRestored: number | undefined;
      if (!options.skipVectors && exportData.vectors && this.vectorStore) {
        vectorsRestored = 0;
        for (const vector of exportData.vectors) {
          try {
            await this.vectorStore.importVector(vector);
            vectorsRestored++;
          } catch (error) {
            errors.push(`Vector ${vector.id}: ${error instanceof Error ? error.message : String(error)}`);
            skipped++;
          }
        }
      }

      const restoreResult: RestoreResult = {
        success: errors.length === 0,
        entitiesRestored,
        relationsRestored,
        duration: Date.now() - startTime,
      };
      if (communitiesRestored !== undefined) {
        restoreResult.communitiesRestored = communitiesRestored;
      }
      if (vectorsRestored !== undefined) {
        restoreResult.vectorsRestored = vectorsRestored;
      }
      if (skipped > 0) {
        restoreResult.skipped = skipped;
      }
      if (errors.length > 0) {
        restoreResult.errors = errors;
      }

      return restoreResult;
    } catch (error) {
      return {
        success: false,
        entitiesRestored: 0,
        relationsRestored: 0,
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * バックアップファイルをバリデート
   */
  async validate(inputPath: string): Promise<ValidationResult> {
    try {
      const exists = await this.fileSystem.exists(inputPath);
      if (!exists) {
        return {
          valid: false,
          version: '',
          entityCount: 0,
          relationCount: 0,
          errors: [`File not found: ${inputPath}`],
        };
      }

      const content = await this.fileSystem.readFile(inputPath);
      const exportData: ExportData = JSON.parse(content);

      return this.validateExportData(exportData);
    } catch (error) {
      return {
        valid: false,
        version: '',
        entityCount: 0,
        relationCount: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * エクスポートデータをバリデート
   */
  private validateExportData(data: ExportData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 必須フィールドの確認
    if (!data.version) {
      errors.push('Missing version field');
    }
    if (!data.exportedAt) {
      errors.push('Missing exportedAt field');
    }
    if (!Array.isArray(data.entities)) {
      errors.push('Invalid or missing entities array');
    }
    if (!Array.isArray(data.relations)) {
      errors.push('Invalid or missing relations array');
    }

    // チェックサムの検証
    if (data.metadata?.checksum) {
      const contentForChecksum = JSON.stringify({
        entities: data.entities,
        relations: data.relations,
      });
      const calculatedChecksum = this.calculateChecksum(contentForChecksum);
      if (calculatedChecksum !== data.metadata.checksum) {
        errors.push('Checksum mismatch - data may be corrupted');
      }
    } else {
      warnings.push('No checksum found - data integrity cannot be verified');
    }

    // メタデータの整合性確認
    if (data.metadata) {
      if (data.metadata.entityCount !== data.entities?.length) {
        warnings.push(
          `Entity count mismatch: metadata says ${data.metadata.entityCount}, actual is ${data.entities?.length ?? 0}`
        );
      }
      if (data.metadata.relationCount !== data.relations?.length) {
        warnings.push(
          `Relation count mismatch: metadata says ${data.metadata.relationCount}, actual is ${data.relations?.length ?? 0}`
        );
      }
    }

    // エンティティの構造検証
    for (let i = 0; i < Math.min(data.entities?.length ?? 0, 10); i++) {
      const entity = data.entities?.[i];
      if (entity && (!entity.id || !entity.type || !entity.name)) {
        errors.push(`Entity at index ${i} is missing required fields (id, type, name)`);
      }
    }

    // リレーションの構造検証
    for (let i = 0; i < Math.min(data.relations?.length ?? 0, 10); i++) {
      const relation = data.relations?.[i];
      if (relation && (!relation.id || !relation.type || !relation.sourceId || !relation.targetId)) {
        errors.push(`Relation at index ${i} is missing required fields (id, type, sourceId, targetId)`);
      }
    }

    const validationResult: ValidationResult = {
      valid: errors.length === 0,
      version: data.version ?? '',
      entityCount: data.entities?.length ?? 0,
      relationCount: data.relations?.length ?? 0,
    };
    if (errors.length > 0) {
      validationResult.errors = errors;
    }
    if (warnings.length > 0) {
      validationResult.warnings = warnings;
    }

    return validationResult;
  }

  /**
   * チェックサムを計算
   */
  private calculateChecksum(content: string): string {
    return createHash('sha256').update(content).digest('hex').slice(0, 16);
  }
}
