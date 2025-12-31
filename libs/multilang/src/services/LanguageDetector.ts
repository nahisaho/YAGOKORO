import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LanguageDetectionResult, SupportedLanguage } from '../types.js';
import { DEFAULT_CONFIG } from '../constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Python detection result interface
 */
interface PythonDetectionResult {
  language: string;
  confidence: number;
  requiresManualReview: boolean;
  alternatives: Array<{ language: string; confidence: number }>;
}

/**
 * Python output interface
 */
interface PythonOutput {
  results: PythonDetectionResult[];
  error: string | null;
}

/**
 * LanguageDetector - Automatic language detection using langdetect
 *
 * REQ-008-02: Automatic language detection at ingestion
 * REQ-008-09: Confidence threshold 0.7, Manual Review Queue
 * ADR-008: langdetect selection (99%+ accuracy)
 */
export class LanguageDetector {
  private readonly pythonPath: string;
  private readonly scriptPath: string;
  private readonly confidenceThreshold: number;

  constructor(options: {
    pythonPath?: string;
    confidenceThreshold?: number;
  } = {}) {
    this.pythonPath = options.pythonPath ?? 'python3';
    this.scriptPath = resolve(__dirname, '../../python/detect_language.py');
    this.confidenceThreshold = options.confidenceThreshold ?? DEFAULT_CONFIG.CONFIDENCE_THRESHOLD;
  }

  /**
   * Detect language of a single text
   *
   * @param text - Text to detect language for
   * @returns Language detection result
   */
  async detect(text: string): Promise<LanguageDetectionResult> {
    const results = await this.detectBatch([text]);
    return results[0] ?? this.createUnknownResult();
  }

  /**
   * Detect languages for multiple texts in batch
   * More efficient than calling detect() multiple times
   *
   * @param texts - Array of texts to detect
   * @returns Array of detection results
   */
  async detectBatch(texts: string[]): Promise<LanguageDetectionResult[]> {
    if (texts.length === 0) {
      return [];
    }

    const input = JSON.stringify({
      texts,
      confidenceThreshold: this.confidenceThreshold,
    });

    try {
      const output = await this.runPythonScript(input);
      return this.parseOutput(output);
    } catch (error) {
      // ADR-010: Error handling for Unwanted behavior
      console.error('[LanguageDetector] Detection failed:', error);
      return texts.map(() => this.createUnknownResult());
    }
  }

  /**
   * Check if a detection result requires manual review
   * REQ-008-09: Manual Review Queue for low confidence
   *
   * @param result - Detection result to check
   * @returns true if manual review is needed
   */
  requiresManualReview(result: LanguageDetectionResult): boolean {
    return result.requiresManualReview || result.confidence < this.confidenceThreshold;
  }

  /**
   * Validate if detected language is supported
   *
   * @param language - Language code to validate
   * @returns true if language is supported
   */
  isSupported(language: string): language is SupportedLanguage {
    return ['en', 'zh', 'ja', 'ko'].includes(language);
  }

  /**
   * Run Python detection script
   */
  private runPythonScript(input: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonPath, [this.scriptPath, input], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });
    });
  }

  /**
   * Parse Python script output
   */
  private parseOutput(output: string): LanguageDetectionResult[] {
    try {
      const parsed: PythonOutput = JSON.parse(output);

      if (parsed.error) {
        console.error('[LanguageDetector] Python error:', parsed.error);
        return [];
      }

      return parsed.results.map((result) => this.mapResult(result));
    } catch (error) {
      console.error('[LanguageDetector] Failed to parse output:', error);
      return [];
    }
  }

  /**
   * Map Python result to TypeScript interface
   */
  private mapResult(result: PythonDetectionResult): LanguageDetectionResult {
    const language = this.isSupported(result.language)
      ? result.language
      : 'unknown';

    return {
      language: language as SupportedLanguage | 'unknown',
      confidence: result.confidence,
      requiresManualReview: result.requiresManualReview,
      alternatives: result.alternatives
        .filter((alt) => this.isSupported(alt.language))
        .map((alt) => ({
          language: alt.language as SupportedLanguage,
          confidence: alt.confidence,
        })),
    };
  }

  /**
   * Create unknown result for error cases
   */
  private createUnknownResult(): LanguageDetectionResult {
    return {
      language: 'unknown',
      confidence: 0,
      requiresManualReview: true,
      alternatives: [],
    };
  }
}
