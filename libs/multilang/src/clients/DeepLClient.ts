import type { SupportedLanguage, TranslationResult } from '../types.js';
import { DEFAULT_CONFIG, DEEPL_CONFIG } from '../constants.js';

/**
 * DeepL API response interface
 */
interface DeepLResponse {
  translations: Array<{
    detected_source_language: string;
    text: string;
  }>;
}

/**
 * DeepL API error response
 */
interface DeepLError {
  message: string;
}

/**
 * DeepLClient - Translation client using DeepL API
 *
 * REQ-008-03: Translation to English
 * REQ-008-10: 2-second timeout
 * ADR-004: DeepL as primary translation provider
 */
export class DeepLClient {
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly timeout: number;

  constructor(options: {
    apiKey: string;
    usePro?: boolean;
    timeout?: number;
  }) {
    this.apiKey = options.apiKey;
    this.apiUrl = options.usePro ? DEEPL_CONFIG.PRO_API_URL : DEEPL_CONFIG.API_URL;
    this.timeout = options.timeout ?? DEFAULT_CONFIG.TRANSLATION_TIMEOUT;
  }

  /**
   * Translate text using DeepL API
   *
   * @param text - Text to translate
   * @param sourceLanguage - Source language
   * @param targetLanguage - Target language
   * @returns Translation result
   */
  async translate(
    text: string,
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage = 'en'
  ): Promise<TranslationResult> {
    // Map our language codes to DeepL format
    const sourceLang = this.mapToDeepLCode(sourceLanguage);
    const targetLang = this.mapToDeepLCode(targetLanguage);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: [text],
          source_lang: sourceLang,
          target_lang: targetLang,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = (await response.json()) as DeepLError;
        throw new Error(`DeepL API error: ${error.message || response.statusText}`);
      }

      const data = (await response.json()) as DeepLResponse;

      if (!data.translations || data.translations.length === 0) {
        throw new Error('No translation returned from DeepL');
      }

      const translation = data.translations[0];
      if (!translation) {
        throw new Error('Empty translation result');
      }

      return {
        original: text,
        translated: translation.text,
        sourceLanguage,
        targetLanguage,
        provider: 'deepl',
        cached: false,
        timestamp: new Date(),
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`DeepL translation timeout (${this.timeout}ms)`);
      }

      throw error;
    }
  }

  /**
   * Translate multiple texts in batch
   *
   * @param texts - Array of texts to translate
   * @param sourceLanguage - Source language
   * @param targetLanguage - Target language
   * @returns Array of translation results
   */
  async translateBatch(
    texts: string[],
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage = 'en'
  ): Promise<TranslationResult[]> {
    if (texts.length === 0) {
      return [];
    }

    // DeepL supports batch translation
    const sourceLang = this.mapToDeepLCode(sourceLanguage);
    const targetLang = this.mapToDeepLCode(targetLanguage);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout * 2); // Longer timeout for batch

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: texts,
          source_lang: sourceLang,
          target_lang: targetLang,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = (await response.json()) as DeepLError;
        throw new Error(`DeepL API error: ${error.message || response.statusText}`);
      }

      const data = (await response.json()) as DeepLResponse;
      const timestamp = new Date();

      return texts.map((original, index) => ({
        original,
        translated: data.translations[index]?.text ?? original,
        sourceLanguage,
        targetLanguage,
        provider: 'deepl' as const,
        cached: false,
        timestamp,
      }));
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Check if the API key is valid
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl.replace('/translate', '/usage')}`, {
        method: 'GET',
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Map our language codes to DeepL format
   */
  private mapToDeepLCode(lang: SupportedLanguage): string {
    const mapping: Record<SupportedLanguage, string> = {
      en: 'EN',
      zh: 'ZH',
      ja: 'JA',
      ko: 'KO',
    };
    return mapping[lang] ?? lang.toUpperCase();
  }
}
