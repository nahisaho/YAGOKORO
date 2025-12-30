/**
 * Docling PDF Extractor
 *
 * Docling (Python) を使用してPDFからテキストを抽出するラッパー
 * https://github.com/docling-project/docling
 */

import { spawn } from 'node:child_process';
import { existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// プロジェクトルートからのscriptsパス (libs/graphrag/src/ingest → プロジェクトルート)
const PROJECT_ROOT = join(__dirname, '../../../..');
const VENV_PYTHON = join(PROJECT_ROOT, '.venv', 'bin', 'python');
const DOCLING_SCRIPT = join(PROJECT_ROOT, 'scripts', 'docling-extract.py');

/**
 * Docling抽出結果
 */
export interface DoclingExtractionResult {
  text: string;
  metadata: {
    title: string | null;
    num_pages: number;
    source: string;
    url?: string;
  };
  pages: Array<{
    page_number: number;
    text: string;
  }>;
  tables: Array<{
    index: number;
    markdown: string;
  }>;
  stats: {
    total_characters: number;
    total_words: number;
    num_tables: number;
  };
  extracted_at: string;
}

/**
 * Doclingエラー結果
 */
export interface DoclingError {
  error: string;
  type: string;
}

/**
 * DoclingExtractorオプション
 */
export interface DoclingExtractorOptions {
  /** Python実行パス（デフォルト: .venv/bin/python） */
  pythonPath?: string;
  /** 抽出スクリプトパス */
  scriptPath?: string;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
}

/**
 * Docling PDF Extractor
 */
export class DoclingExtractor {
  private pythonPath: string;
  private scriptPath: string;
  private timeout: number;

  constructor(options: DoclingExtractorOptions = {}) {
    this.pythonPath = options.pythonPath ?? VENV_PYTHON;
    this.scriptPath = options.scriptPath ?? DOCLING_SCRIPT;
    this.timeout = options.timeout ?? 600000; // 10分（大きなPDF対応）

    // 環境チェック
    if (!existsSync(this.pythonPath)) {
      throw new Error(
        `Python not found at ${this.pythonPath}. Run: python3 -m venv .venv && source .venv/bin/activate && pip install docling`
      );
    }

    if (!existsSync(this.scriptPath)) {
      throw new Error(`Docling script not found at ${this.scriptPath}`);
    }
  }

  /**
   * PDFファイルからテキストを抽出
   */
  async extractFromFile(pdfPath: string): Promise<DoclingExtractionResult> {
    if (!existsSync(pdfPath)) {
      throw new Error(`PDF file not found: ${pdfPath}`);
    }

    return this.runDocling([pdfPath]);
  }

  /**
   * URLからPDFをダウンロードしてテキストを抽出
   */
  async extractFromUrl(url: string): Promise<DoclingExtractionResult> {
    return this.runDocling(['--url', url]);
  }

  /**
   * PDFバッファからテキストを抽出
   */
  async extractFromBuffer(buffer: Buffer): Promise<DoclingExtractionResult> {
    // 一時ファイルに保存
    const tempPath = join(tmpdir(), `docling-${randomUUID()}.pdf`);

    try {
      writeFileSync(tempPath, buffer);
      return await this.extractFromFile(tempPath);
    } finally {
      // クリーンアップ
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }
    }
  }

  /**
   * Doclingスクリプトを実行
   */
  private async runDocling(args: string[]): Promise<DoclingExtractionResult> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.pythonPath, [this.scriptPath, ...args], {
        cwd: PROJECT_ROOT,
        timeout: this.timeout,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('error', (error) => {
        reject(new Error(`Failed to run Docling: ${error.message}`));
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          // エラー出力からJSONを解析試行
          try {
            const errorJson = JSON.parse(stderr.trim()) as DoclingError;
            reject(new Error(`Docling error: ${errorJson.error} (${errorJson.type})`));
          } catch {
            reject(new Error(`Docling failed with code ${code}: ${stderr}`));
          }
          return;
        }

        try {
          const result = JSON.parse(stdout.trim()) as DoclingExtractionResult;
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse Docling output: ${parseError}`));
        }
      });
    });
  }

  /**
   * Docling環境が利用可能かチェック
   */
  static async isAvailable(): Promise<boolean> {
    try {
      new DoclingExtractor();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Doclingバージョンを取得
   */
  async getVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.pythonPath, ['-c', 'import docling; print(docling.__version__)'], {
        cwd: PROJECT_ROOT,
        timeout: 10000,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Failed to get Docling version: ${stderr}`));
          return;
        }
        resolve(stdout.trim());
      });
    });
  }
}
