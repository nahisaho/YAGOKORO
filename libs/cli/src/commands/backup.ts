/**
 * Backup Command - バックアップ・リストアCLI
 *
 * Neo4j/Qdrantデータのエクスポート・インポートを行うコマンド
 */

import { Command } from 'commander';
import { formatOutput, formatError, formatSuccess } from '../utils/index.js';

/**
 * バックアップオプション
 */
export interface BackupOptions {
  /** 出力ファイルパス */
  output: string;
  /** エンティティタイプでフィルタ */
  entityTypes?: string[];
  /** コミュニティを含めるか */
  includeCommunities?: boolean;
  /** ベクトルを含めるか */
  includeVectors?: boolean;
  /** 圧縮するか */
  compress?: boolean;
}

/**
 * リストアオプション
 */
export interface RestoreOptions {
  /** 入力ファイルパス */
  input: string;
  /** 既存データをクリアするか */
  clearExisting?: boolean;
  /** ベクトルをリストアするか */
  includeVectors?: boolean;
  /** ドライラン */
  dryRun?: boolean;
}

/**
 * バックアップ結果
 */
export interface BackupResult {
  success: boolean;
  filePath: string;
  fileSize: number;
  checksum: string;
  entityCount: number;
  relationCount: number;
  communityCount: number;
  vectorCount: number;
  duration: number;
  errors: string[];
}

/**
 * リストア結果
 */
export interface RestoreResult {
  success: boolean;
  entitiesRestored: number;
  relationsRestored: number;
  communitiesRestored: number;
  vectorsRestored: number;
  duration: number;
  errors: string[];
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
  valid: boolean;
  version: string;
  exportedAt: string;
  entityCount: number;
  relationCount: number;
  checksumValid: boolean;
  errors: string[];
}

/**
 * バックアップサービスインターフェース
 */
export interface BackupCommandService {
  /**
   * バックアップを実行
   */
  backup(options: BackupOptions): Promise<BackupResult>;

  /**
   * リストアを実行
   */
  restore(options: RestoreOptions): Promise<RestoreResult>;

  /**
   * バックアップファイルを検証
   */
  validate(filePath: string): Promise<ValidationResult>;

  /**
   * バックアップ一覧を取得
   */
  list(directory: string): Promise<BackupListItem[]>;
}

/**
 * バックアップ一覧アイテム
 */
export interface BackupListItem {
  fileName: string;
  filePath: string;
  fileSize: number;
  createdAt: string;
  version: string;
  entityCount: number;
}

/**
 * バックアップコマンドを作成
 */
export function createBackupCommand(service: BackupCommandService): Command {
  const backup = new Command('backup')
    .description('データベースのバックアップ・リストア管理');

  // backup create - バックアップ作成
  backup
    .command('create')
    .description('バックアップを作成')
    .option('-o, --output <path>', '出力ファイルパス', './backup.json')
    .option('-t, --types <types...>', 'エンティティタイプでフィルタ')
    .option('-c, --include-communities', 'コミュニティを含める', false)
    .option('-v, --include-vectors', 'ベクトルを含める', false)
    .option('-z, --compress', '圧縮する（.gz）', false)
    .option('-f, --format <format>', '出力フォーマット (json, table)', 'table')
    .action(async (options) => {
      try {
        console.log('🔄 バックアップを作成中...\n');

        const result = await service.backup({
          output: options.output,
          entityTypes: options.types,
          includeCommunities: options.includeCommunities,
          includeVectors: options.includeVectors,
          compress: options.compress,
        });

        if (result.success) {
          console.log(formatSuccess('バックアップが完了しました'));

          if (options.format === 'json') {
            console.log(formatOutput(result, 'json'));
          } else {
            console.log(`\n📁 ファイル: ${result.filePath}`);
            console.log(`📊 サイズ: ${formatFileSize(result.fileSize)}`);
            console.log(`🔐 チェックサム: ${result.checksum.slice(0, 16)}...`);
            console.log('\n内容:');
            console.log(`  エンティティ: ${result.entityCount}`);
            console.log(`  リレーション: ${result.relationCount}`);
            console.log(`  コミュニティ: ${result.communityCount}`);
            console.log(`  ベクトル: ${result.vectorCount}`);
            console.log(`\n⏱️  処理時間: ${result.duration}ms`);
          }
        } else {
          console.error(formatError('バックアップに失敗しました'));
          for (const error of result.errors) {
            console.error(`  - ${error}`);
          }
          process.exit(1);
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }
    });

  // backup restore - リストア
  backup
    .command('restore <file>')
    .description('バックアップからリストア')
    .option('--clear', '既存データをクリア', false)
    .option('-v, --include-vectors', 'ベクトルもリストア', false)
    .option('-d, --dry-run', 'ドライラン（実際にはリストアしない）', false)
    .option('-f, --format <format>', '出力フォーマット (json, table)', 'table')
    .action(async (file: string, options) => {
      try {
        if (options.dryRun) {
          console.log('🔍 ドライラン実行中...\n');
        } else {
          console.log('🔄 リストア中...\n');
        }

        const result = await service.restore({
          input: file,
          clearExisting: options.clear,
          includeVectors: options.includeVectors,
          dryRun: options.dryRun,
        });

        if (result.success) {
          if (options.dryRun) {
            console.log(formatSuccess('ドライラン完了（データは変更されていません）'));
          } else {
            console.log(formatSuccess('リストアが完了しました'));
          }

          if (options.format === 'json') {
            console.log(formatOutput(result, 'json'));
          } else {
            console.log('\nリストア結果:');
            console.log(`  エンティティ: ${result.entitiesRestored}`);
            console.log(`  リレーション: ${result.relationsRestored}`);
            console.log(`  コミュニティ: ${result.communitiesRestored}`);
            console.log(`  ベクトル: ${result.vectorsRestored}`);
            console.log(`\n⏱️  処理時間: ${result.duration}ms`);
          }
        } else {
          console.error(formatError('リストアに失敗しました'));
          for (const error of result.errors) {
            console.error(`  - ${error}`);
          }
          process.exit(1);
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }
    });

  // backup validate - 検証
  backup
    .command('validate <file>')
    .description('バックアップファイルを検証')
    .option('-f, --format <format>', '出力フォーマット (json, table)', 'table')
    .action(async (file: string, options) => {
      try {
        console.log('🔍 バックアップを検証中...\n');

        const result = await service.validate(file);

        if (options.format === 'json') {
          console.log(formatOutput(result, 'json'));
        } else {
          console.log(`ファイル: ${file}`);
          console.log(`バージョン: ${result.version}`);
          console.log(`エクスポート日時: ${result.exportedAt}`);
          console.log(`エンティティ数: ${result.entityCount}`);
          console.log(`リレーション数: ${result.relationCount}`);
          console.log(`チェックサム: ${result.checksumValid ? '✅ 有効' : '❌ 無効'}`);
          console.log(`\n検証結果: ${result.valid ? '✅ 有効' : '❌ 無効'}`);

          if (result.errors.length > 0) {
            console.log('\nエラー:');
            for (const error of result.errors) {
              console.error(`  - ${error}`);
            }
          }
        }

        if (!result.valid) {
          process.exit(1);
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }
    });

  // backup list - 一覧
  backup
    .command('list [directory]')
    .description('バックアップファイルの一覧')
    .option('-f, --format <format>', '出力フォーマット (json, table)', 'table')
    .action(async (directory: string = '.', options) => {
      try {
        const items = await service.list(directory);

        if (items.length === 0) {
          console.log('バックアップファイルが見つかりません');
          return;
        }

        if (options.format === 'json') {
          console.log(formatOutput(items, 'json'));
        } else {
          console.log(`\n📁 バックアップ一覧 (${directory})\n`);
          console.log('ファイル名                      サイズ      日時                    エンティティ');
          console.log('─'.repeat(90));

          for (const item of items) {
            const name = item.fileName.padEnd(30);
            const size = formatFileSize(item.fileSize).padEnd(10);
            const date = new Date(item.createdAt).toLocaleString('ja-JP');
            console.log(`${name}  ${size}  ${date}  ${item.entityCount}`);
          }
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }
    });

  return backup;
}

/**
 * ファイルサイズをフォーマット
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
