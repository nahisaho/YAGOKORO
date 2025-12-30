/**
 * Local PDF Text Extractor
 *
 * PDFからテキストを抽出するローカル実装
 * Unstructured.io APIの代わりにpdf-parseを使用
 */
import * as pdfParseModule from 'pdf-parse';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfParse = (pdfParseModule as any).default || pdfParseModule;

/**
 * 抽出されたページ情報
 */
export interface ExtractedPage {
  /** ページ番号（1-based） */
  pageNumber: number;
  /** ページのテキスト内容 */
  text: string;
}

/**
 * PDF抽出結果
 */
export interface LocalPdfResult {
  /** 全テキスト */
  text: string;
  /** ページ数 */
  numPages: number;
  /** ページ別テキスト */
  pages: ExtractedPage[];
  /** PDFメタデータ */
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
  /** 統計情報 */
  stats: {
    totalCharacters: number;
    totalWords: number;
    processingTimeMs: number;
  };
}

/**
 * 抽出オプション
 */
export interface LocalPdfOptions {
  /** 最大ページ数（0 = 無制限） */
  maxPages?: number;
  /** ページ区切り文字 */
  pageDelimiter?: string;
}

/**
 * ローカルPDF抽出クライアント
 *
 * @example
 * ```typescript
 * const extractor = new LocalPdfExtractor();
 * const result = await extractor.extractFromBuffer(pdfBuffer);
 * console.log(result.text);
 * ```
 */
export class LocalPdfExtractor {
  private options: LocalPdfOptions;

  constructor(options: LocalPdfOptions = {}) {
    this.options = {
      maxPages: 0,
      pageDelimiter: '\n\n---PAGE_BREAK---\n\n',
      ...options,
    };
  }

  /**
   * PDFバッファからテキストを抽出
   *
   * @param pdfBuffer - PDFファイルのバッファ
   * @returns 抽出結果
   */
  async extractFromBuffer(pdfBuffer: Buffer): Promise<LocalPdfResult> {
    const startTime = Date.now();

    // pdf-parseのオプション
    const parseOptions: Record<string, unknown> = {};
    if (this.options.maxPages && this.options.maxPages > 0) {
      parseOptions.max = this.options.maxPages;
    }

    // ページごとのテキストを収集
    const pageTexts: string[] = [];
    parseOptions.pagerender = (pageData: PDFPageProxy) => {
      return pageData.getTextContent().then((textContent) => {
        const text = textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        pageTexts.push(text);
        return text;
      });
    };

    // PDFを解析
    const data = await pdfParse(pdfBuffer, parseOptions);

    // ページ情報を構築
    const pages: ExtractedPage[] = pageTexts.map((text, index) => ({
      pageNumber: index + 1,
      text,
    }));

    // メタデータを抽出
    const info = data.info || {};
    const metadata: LocalPdfResult['metadata'] = {};
    if (info.Title) metadata.title = info.Title;
    if (info.Author) metadata.author = info.Author;
    if (info.Subject) metadata.subject = info.Subject;
    if (info.Creator) metadata.creator = info.Creator;
    if (info.Producer) metadata.producer = info.Producer;
    if (info.CreationDate) {
      const creationDate = this.parseDate(info.CreationDate);
      if (creationDate) metadata.creationDate = creationDate;
    }
    if (info.ModDate) {
      const modificationDate = this.parseDate(info.ModDate);
      if (modificationDate) metadata.modificationDate = modificationDate;
    }

    // 統計情報
    const totalCharacters = data.text.length;
    const totalWords = data.text.split(/\s+/).filter((w: string) => w.length > 0).length;

    return {
      text: data.text,
      numPages: data.numpages,
      pages,
      metadata,
      stats: {
        totalCharacters,
        totalWords,
        processingTimeMs: Date.now() - startTime,
      },
    };
  }

  /**
   * PDFファイルからテキストを抽出
   *
   * @param filePath - PDFファイルのパス
   * @returns 抽出結果
   */
  async extractFromFile(filePath: string): Promise<LocalPdfResult> {
    const fs = await import('fs/promises');
    const buffer = await fs.readFile(filePath);
    return this.extractFromBuffer(buffer);
  }

  /**
   * テキストをクリーンアップ
   *
   * @param text - 元のテキスト
   * @returns クリーンアップされたテキスト
   */
  cleanText(text: string): string {
    return (
      text
        // 連続する空白を単一スペースに
        .replace(/[ \t]+/g, ' ')
        // 連続する改行を2つに制限
        .replace(/\n{3,}/g, '\n\n')
        // ハイフネーションを結合（行末のハイフン）
        .replace(/(\w)-\n(\w)/g, '$1$2')
        // 行頭・行末の空白を削除
        .split('\n')
        .map((line) => line.trim())
        .join('\n')
        // 前後の空白を削除
        .trim()
    );
  }

  /**
   * PDFの日付文字列をDateオブジェクトに変換
   */
  private parseDate(dateStr: string): Date | undefined {
    try {
      // PDF日付形式: D:YYYYMMDDHHmmSS
      const match = dateStr.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
      if (match) {
        const [, year, month, day, hour = '0', minute = '0', second = '0'] = match;
        if (!year || !month || !day) return undefined;
        return new Date(
          parseInt(year, 10),
          parseInt(month, 10) - 1,
          parseInt(day, 10),
          parseInt(hour, 10),
          parseInt(minute, 10),
          parseInt(second, 10)
        );
      }
      return new Date(dateStr);
    } catch {
      return undefined;
    }
  }
}

// pdf-parseの内部型定義
interface PDFPageProxy {
  getTextContent(): Promise<{
    items: Array<{ str?: string }>;
  }>;
}

/**
 * ローカルPDF抽出クライアントを作成
 */
export function createLocalPdfExtractor(options?: LocalPdfOptions): LocalPdfExtractor {
  return new LocalPdfExtractor(options);
}
