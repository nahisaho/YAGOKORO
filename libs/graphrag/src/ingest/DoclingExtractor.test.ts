/**
 * DoclingExtractor Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

// モック: child_process
vi.mock('node:child_process', () => {
  const EventEmitter = require('node:events');
  return {
    spawn: vi.fn(),
  };
});

import { spawn } from 'node:child_process';
import {
  DoclingExtractor,
  type DoclingExtractionResult,
} from './DoclingExtractor.js';

// モック: existsSync
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...(actual as object),
    existsSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  };
});

describe('DoclingExtractor', () => {
  let mockSpawn: ReturnType<typeof vi.fn>;
  let mockExistsSync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSpawn = spawn as ReturnType<typeof vi.fn>;
    mockExistsSync = existsSync as ReturnType<typeof vi.fn>;

    // デフォルト: Python と script 存在
    mockExistsSync.mockImplementation((path: string) => {
      if (path.includes('.venv/bin/python')) return true;
      if (path.includes('docling-extract.py')) return true;
      if (path.endsWith('.pdf')) return true;
      return false;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default paths', () => {
      const extractor = new DoclingExtractor();
      expect(extractor).toBeInstanceOf(DoclingExtractor);
    });

    it('should throw if Python not found', () => {
      mockExistsSync.mockImplementation((path: string) => {
        if (path.includes('.venv/bin/python')) return false;
        return true;
      });

      expect(() => new DoclingExtractor()).toThrow('Python not found');
    });

    it('should throw if script not found', () => {
      mockExistsSync.mockImplementation((path: string) => {
        if (path.includes('.venv/bin/python')) return true;
        if (path.includes('docling-extract.py')) return false;
        return true;
      });

      expect(() => new DoclingExtractor()).toThrow('Docling script not found');
    });

    it('should accept custom paths', () => {
      mockExistsSync.mockReturnValue(true);

      const extractor = new DoclingExtractor({
        pythonPath: '/custom/python',
        scriptPath: '/custom/script.py',
        timeout: 60000,
      });

      expect(extractor).toBeInstanceOf(DoclingExtractor);
    });
  });

  describe('extractFromFile', () => {
    const mockResult: DoclingExtractionResult = {
      text: '# Test Document\n\nThis is a test.',
      metadata: {
        title: 'Test',
        num_pages: 1,
        source: '/tmp/test.pdf',
      },
      pages: [{ page_number: 1, text: 'This is a test.' }],
      tables: [],
      stats: {
        total_characters: 35,
        total_words: 5,
        num_tables: 0,
      },
      extracted_at: '2025-01-01T00:00:00Z',
    };

    it('should extract text from PDF file', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const extractor = new DoclingExtractor();
      const resultPromise = extractor.extractFromFile('/tmp/test.pdf');

      // stdout にデータ送信
      mockProc.stdout.emit('data', JSON.stringify(mockResult));
      mockProc.emit('close', 0);

      const result = await resultPromise;
      expect(result.text).toBe(mockResult.text);
      expect(result.metadata.num_pages).toBe(1);
    });

    it('should throw if PDF file not found', async () => {
      mockExistsSync.mockImplementation((path: string) => {
        if (path.includes('.venv/bin/python')) return true;
        if (path.includes('docling-extract.py')) return true;
        if (path === '/nonexistent.pdf') return false;
        return true;
      });

      const extractor = new DoclingExtractor();
      await expect(extractor.extractFromFile('/nonexistent.pdf')).rejects.toThrow(
        'PDF file not found'
      );
    });

    it('should handle extraction errors', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const extractor = new DoclingExtractor();
      const resultPromise = extractor.extractFromFile('/tmp/test.pdf');

      // エラー出力
      mockProc.stderr.emit(
        'data',
        JSON.stringify({ error: 'PDF corrupted', type: 'ValueError' })
      );
      mockProc.emit('close', 1);

      await expect(resultPromise).rejects.toThrow('Docling error: PDF corrupted');
    });
  });

  describe('extractFromUrl', () => {
    it('should call docling with --url argument', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const extractor = new DoclingExtractor();
      const resultPromise = extractor.extractFromUrl('https://arxiv.org/pdf/1234.56789.pdf');

      mockProc.stdout.emit(
        'data',
        JSON.stringify({
          text: 'Downloaded content',
          metadata: { title: null, num_pages: 1, source: '/tmp/x.pdf', url: 'https://arxiv.org/pdf/1234.56789.pdf' },
          pages: [],
          tables: [],
          stats: { total_characters: 18, total_words: 2, num_tables: 0 },
          extracted_at: '2025-01-01T00:00:00Z',
        })
      );
      mockProc.emit('close', 0);

      const result = await resultPromise;
      expect(result.metadata.url).toBe('https://arxiv.org/pdf/1234.56789.pdf');

      // --url 引数が渡されたか確認
      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--url', 'https://arxiv.org/pdf/1234.56789.pdf']),
        expect.any(Object)
      );
    });
  });

  describe('extractFromBuffer', () => {
    it('should write buffer to temp file and extract', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const extractor = new DoclingExtractor();
      const buffer = Buffer.from('PDF content');
      const resultPromise = extractor.extractFromBuffer(buffer);

      mockProc.stdout.emit(
        'data',
        JSON.stringify({
          text: 'Buffer content',
          metadata: { title: null, num_pages: 1, source: '/tmp/docling-xxx.pdf' },
          pages: [],
          tables: [],
          stats: { total_characters: 14, total_words: 2, num_tables: 0 },
          extracted_at: '2025-01-01T00:00:00Z',
        })
      );
      mockProc.emit('close', 0);

      const result = await resultPromise;
      expect(result.text).toBe('Buffer content');

      // writeFileSync が呼ばれたか
      expect(writeFileSync).toHaveBeenCalled();
    });
  });

  describe('isAvailable', () => {
    it('should return true if environment is ready', async () => {
      const result = await DoclingExtractor.isAvailable();
      expect(result).toBe(true);
    });

    it('should return false if environment is not ready', async () => {
      mockExistsSync.mockReturnValue(false);
      const result = await DoclingExtractor.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe('getVersion', () => {
    it('should return docling version', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const extractor = new DoclingExtractor();
      const versionPromise = extractor.getVersion();

      mockProc.stdout.emit('data', '2.66.0');
      mockProc.emit('close', 0);

      const version = await versionPromise;
      expect(version).toBe('2.66.0');
    });
  });
});

// ヘルパー: モックプロセス作成
function createMockProcess() {
  const EventEmitter = require('node:events');
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const proc = new EventEmitter();
  proc.stdout = stdout;
  proc.stderr = stderr;
  return proc;
}
