import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SupportedLanguage, NEREntity, NERResult } from '../types.js';
import { SUPPORTED_LANGUAGES } from '../constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * MultilingualNER - Named Entity Recognition across languages
 *
 * REQ-008-06: Multilingual NER with spaCy
 * ADR-007: spaCy language-specific models
 */
export class MultilingualNER {
  private readonly pythonPath: string;
  private readonly scriptPath: string;

  constructor(options: { pythonPath?: string } = {}) {
    this.pythonPath = options.pythonPath ?? 'python3';
    this.scriptPath = resolve(__dirname, '../../python/extract_entities.py');
  }

  /**
   * Extract entities from text
   *
   * @param text - Text to extract entities from
   * @param language - Language of the text
   * @returns NER result with entities
   */
  async extract(text: string, language: SupportedLanguage): Promise<NERResult> {
    const startTime = Date.now();

    // Check if language is supported
    if (!SUPPORTED_LANGUAGES[language]) {
      return {
        entities: [],
        language,
        model: 'none',
        processingTime: Date.now() - startTime,
      };
    }

    const model = SUPPORTED_LANGUAGES[language].spaCyModel;

    try {
      const entities = await this.runNERScript(text, language, model);
      return {
        entities,
        language,
        model,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('[MultilingualNER] Extraction failed:', error);
      return {
        entities: [],
        language,
        model,
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Extract entities from multiple texts in batch
   *
   * @param texts - Array of {text, language} pairs
   * @returns Array of NER results
   */
  async extractBatch(
    texts: Array<{ text: string; language: SupportedLanguage }>
  ): Promise<NERResult[]> {
    // Group by language for efficiency
    const byLanguage = new Map<SupportedLanguage, Array<{ text: string; index: number }>>();

    for (let i = 0; i < texts.length; i++) {
      const item = texts[i];
      if (!item) continue;
      
      const group = byLanguage.get(item.language) ?? [];
      group.push({ text: item.text, index: i });
      byLanguage.set(item.language, group);
    }

    const results: NERResult[] = new Array(texts.length);

    // Process each language group
    for (const [language, items] of byLanguage.entries()) {
      for (const item of items) {
        const result = await this.extract(item.text, language);
        results[item.index] = result;
      }
    }

    return results;
  }

  /**
   * Run Python NER script
   */
  private runNERScript(
    text: string,
    language: SupportedLanguage,
    model: string
  ): Promise<NEREntity[]> {
    return new Promise((resolve, reject) => {
      const input = JSON.stringify({ text, language, model });

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
          try {
            interface PythonOutput {
              entities: NEREntity[];
              error: string | null;
            }
            const output: PythonOutput = JSON.parse(stdout);
            if (output.error) {
              reject(new Error(output.error));
            } else {
              resolve(output.entities);
            }
          } catch (e) {
            reject(new Error(`Failed to parse NER output: ${e}`));
          }
        } else {
          reject(new Error(`NER script failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to spawn NER process: ${error.message}`));
      });
    });
  }
}
