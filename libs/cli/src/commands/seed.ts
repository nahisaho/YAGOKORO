/**
 * Seed Command - シードデータ投入CLI
 *
 * Generative AI系譜データをNeo4j/Qdrantに投入するコマンド
 */

import { Command } from 'commander';
import { ValidationError } from '@yagokoro/domain';
import { formatOutput, formatError, formatSuccess } from '../utils/index.js';

/**
 * シードデータの種類
 */
export type SeedDataType =
  | 'organizations'
  | 'persons'
  | 'techniques'
  | 'publications'
  | 'aimodels'
  | 'benchmarks'
  | 'concepts'
  | 'relations'
  | 'all';

/**
 * シードサービスインターフェース
 */
export interface SeedService {
  /**
   * シードデータを投入
   */
  ingest(options: SeedIngestOptions): Promise<SeedIngestResult>;

  /**
   * データベースをクリア
   */
  clear(options: SeedClearOptions): Promise<SeedClearResult>;

  /**
   * シードデータのプレビュー
   */
  preview(dataType: SeedDataType): Promise<SeedPreviewResult>;

  /**
   * データベースの状態を確認
   */
  status(): Promise<SeedStatusResult>;
}

/**
 * シード投入オプション
 */
export interface SeedIngestOptions {
  /** 投入するデータ種類 */
  dataType: SeedDataType;
  /** ドライラン（実際には投入しない） */
  dryRun?: boolean;
  /** ベクトル埋め込みを生成するか */
  withEmbeddings?: boolean;
  /** 既存データを上書きするか */
  overwrite?: boolean;
}

/**
 * シード投入結果
 */
export interface SeedIngestResult {
  success: boolean;
  inserted: {
    organizations: number;
    persons: number;
    techniques: number;
    publications: number;
    aimodels: number;
    benchmarks: number;
    concepts: number;
    relations: number;
  };
  skipped: number;
  errors: string[];
  duration: number;
}

/**
 * クリアオプション
 */
export interface SeedClearOptions {
  /** クリアするデータ種類 */
  dataType: SeedDataType;
  /** 確認をスキップ */
  force?: boolean;
}

/**
 * クリア結果
 */
export interface SeedClearResult {
  success: boolean;
  deleted: {
    nodes: number;
    relations: number;
  };
}

/**
 * プレビュー結果
 */
export interface SeedPreviewResult {
  dataType: SeedDataType;
  count: number;
  samples: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
}

/**
 * ステータス結果
 */
export interface SeedStatusResult {
  neo4j: {
    connected: boolean;
    nodeCount: number;
    relationCount: number;
    entityCounts: Record<string, number>;
  };
  qdrant: {
    connected: boolean;
    vectorCount: number;
    collectionExists: boolean;
  };
}

/**
 * シードコマンドを作成
 */
export function createSeedCommand(service: SeedService): Command {
  const seed = new Command('seed')
    .description('シードデータの管理（投入・クリア・プレビュー）');

  // seed ingest - データ投入
  seed
    .command('ingest [type]')
    .description('シードデータを投入（type: organizations, persons, techniques, publications, aimodels, benchmarks, concepts, relations, all）')
    .option('-d, --dry-run', 'ドライラン（実際には投入しない）', false)
    .option('-e, --with-embeddings', 'ベクトル埋め込みを生成', false)
    .option('-o, --overwrite', '既存データを上書き', false)
    .option('-f, --format <format>', '出力フォーマット (json, table)', 'table')
    .action(async (type: string = 'all', options) => {
      try {
        const dataType = validateDataType(type);
        const result = await service.ingest({
          dataType,
          dryRun: options.dryRun,
          withEmbeddings: options.withEmbeddings,
          overwrite: options.overwrite,
        });

        if (result.success) {
          if (options.dryRun) {
            console.log(formatSuccess('ドライラン完了（データは投入されていません）'));
          } else {
            console.log(formatSuccess('シードデータを投入しました'));
          }

          if (options.format === 'json') {
            console.log(formatOutput(result, 'json'));
          } else {
            console.log('\n投入結果:');
            console.log(`  組織:       ${result.inserted.organizations}`);
            console.log(`  人物:       ${result.inserted.persons}`);
            console.log(`  技術:       ${result.inserted.techniques}`);
            console.log(`  論文:       ${result.inserted.publications}`);
            console.log(`  AIモデル:   ${result.inserted.aimodels}`);
            console.log(`  ベンチマーク: ${result.inserted.benchmarks}`);
            console.log(`  概念:       ${result.inserted.concepts}`);
            console.log(`  リレーション: ${result.inserted.relations}`);
            console.log(`\n処理時間: ${result.duration}ms`);
            if (result.skipped > 0) {
              console.log(`スキップ: ${result.skipped}`);
            }
          }
        } else {
          console.error(formatError('シードデータの投入に失敗しました'));
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

  // seed clear - データクリア
  seed
    .command('clear [type]')
    .description('データベースをクリア')
    .option('-f, --force', '確認をスキップ', false)
    .action(async (type: string = 'all', options) => {
      try {
        const dataType = validateDataType(type);

        if (!options.force) {
          console.log(formatError(`警告: ${dataType === 'all' ? '全データ' : dataType}を削除します`));
          console.log('--force オプションを付けて実行してください');
          process.exit(1);
        }

        const result = await service.clear({
          dataType,
          force: options.force,
        });

        if (result.success) {
          console.log(formatSuccess('データをクリアしました'));
          console.log(`  削除ノード: ${result.deleted.nodes}`);
          console.log(`  削除リレーション: ${result.deleted.relations}`);
        } else {
          console.error(formatError('クリアに失敗しました'));
          process.exit(1);
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }
    });

  // seed preview - プレビュー
  seed
    .command('preview [type]')
    .description('シードデータをプレビュー')
    .option('-f, --format <format>', '出力フォーマット (json, table)', 'table')
    .action(async (type: string = 'all', options) => {
      try {
        const dataType = validateDataType(type);
        const result = await service.preview(dataType);

        console.log(`\n📊 ${result.dataType} プレビュー (${result.count}件)\n`);

        if (options.format === 'json') {
          console.log(formatOutput(result, 'json'));
        } else {
          console.log('サンプル:');
          for (const sample of result.samples.slice(0, 10)) {
            console.log(`  - [${sample.type}] ${sample.name}`);
            if (sample.description) {
              console.log(`    ${sample.description.slice(0, 80)}...`);
            }
          }
          if (result.count > 10) {
            console.log(`  ... 他${result.count - 10}件`);
          }
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }
    });

  // seed status - ステータス確認
  seed
    .command('status')
    .description('データベースの状態を確認')
    .option('-f, --format <format>', '出力フォーマット (json, table)', 'table')
    .action(async (options) => {
      try {
        const result = await service.status();

        if (options.format === 'json') {
          console.log(formatOutput(result, 'json'));
        } else {
          console.log('\n📊 データベース状態\n');

          console.log('Neo4j:');
          console.log(`  接続: ${result.neo4j.connected ? '✅' : '❌'}`);
          if (result.neo4j.connected) {
            console.log(`  ノード数: ${result.neo4j.nodeCount}`);
            console.log(`  リレーション数: ${result.neo4j.relationCount}`);
            console.log('  エンティティ別:');
            for (const [type, count] of Object.entries(result.neo4j.entityCounts)) {
              console.log(`    ${type}: ${count}`);
            }
          }

          console.log('\nQdrant:');
          console.log(`  接続: ${result.qdrant.connected ? '✅' : '❌'}`);
          if (result.qdrant.connected) {
            console.log(`  コレクション: ${result.qdrant.collectionExists ? '✅' : '❌'}`);
            console.log(`  ベクトル数: ${result.qdrant.vectorCount}`);
          }
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }
    });

  return seed;
}

/**
 * データ種類を検証
 */
function validateDataType(type: string): SeedDataType {
  const validTypes: SeedDataType[] = [
    'organizations',
    'persons',
    'techniques',
    'publications',
    'aimodels',
    'benchmarks',
    'concepts',
    'relations',
    'all',
  ];

  if (!validTypes.includes(type as SeedDataType)) {
    throw new ValidationError(`無効なデータ種類: ${type}`, {
      type,
      validTypes,
    });
  }

  return type as SeedDataType;
}
