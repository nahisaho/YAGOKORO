import type { SupportedLanguage, TranslationResult } from '../types.js';
import { DEFAULT_CONFIG, GOOGLE_CONFIG } from '../constants.js';

/**
 * Google Translate API response interface
 */
interface GoogleTranslateResponse {
  data: {
    translations: Array<{
      translatedText: string;
      detectedSourceLanguage?: string;
    }>;
  };
}

/**
 * Google Translate API error response
 */
interface GoogleError {
  error: {
    message: string;
    code: number;
  };
}

/**
 * GoogleTranslateClient - Fallback translation client using Google Translate API
 *
 * REQ-008-08: Fallback to Google Translate when DeepL fails
 * REQ-008-10: 2-second timeout
 * ADR-004: Google as fallback translation provider
 */
export class GoogleTranslateClient {
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly timeout: number;

  constructor(options: {
    apiKey: string;
    timeout?: number;
  }) {
    this.apiKey = options.apiKey;
    this.apiUrl = GOOGLE_CONFIG.API_URL;
    this.timeout = options.timeout ?? DEFAULT_CONFIG.TRANSLATION_TIMEOUT;
  }

  /**
   * Translate text using Google Translate API
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
    // Check text length limit
    if (text.length > GOOGLE_CONFIG.MAX_TEXT_LENGTH) {
      throw new Error(`Text exceeds Google Translate limit (${GOOGLE_CONFIG.MAX_TEXT_LENGTH} chars)`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        q: text,
        source: sourceLanguage,
        target: targetLanguage,
        format: 'text',
      });

      const response = await fetch(`${this.apiUrl}?${params.toString()}`, {
        method: 'POST',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = (await response.json()) as GoogleError;
        throw new Error(`Google Translate API error: ${error.error.message}`);
      }

      const data = (await response.json()) as GoogleTranslateResponse;

      if (!data.data.translations || data.data.translations.length === 0) {
        throw new Error('No translation returned from Google');
      }

      const translation = data.data.translations[0];
      if (!translation) {
        throw new Error('Empty translation result');
      }

      return {
        original: text,
        translated: translation.translatedText,
        sourceLanguage,
        targetLanguage,
        provider: 'google',
        cached: false,
        timestamp: new Date(),
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Google Translate timeout (${this.timeout}ms)`);
      }

      throw error;
    }
  }

  /**
   * Translate multiple texts in batch
   * Note: Google Translate API has per-request size limits
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

    // Google has a per-request limit, process in chunks
    const results: TranslationResult[] = [];

    for (const text of texts) {
      try {
        const result = await this.translate(text, sourceLanguage, targetLanguage);
        results.push(result);
      } catch (error) {
        // On error, return original text
        results.push({
          original: text,
          translated: text, // Fallback to original
          sourceLanguage,
          targetLanguage,
          provider: 'google',
          cached: false,
          timestamp: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Check if the API key is valid
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const result = await this.translate('test', 'en', 'zh');
      return result.translated.length > 0;
    } catch {
      return false;
    }
  }
}
