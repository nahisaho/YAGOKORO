import type {
  SupportedLanguage,
  TranslationResult,
  TranslationOptions,
} from '../types.js';
import { DEFAULT_CONFIG } from '../constants.js';
import { DeepLClient } from '../clients/DeepLClient.js';
import { GoogleTranslateClient } from '../clients/GoogleTranslateClient.js';
import type { TranslationCache } from '../cache/TranslationCache.js';

/**
 * TranslationService - Unified translation service with fallback
 *
 * REQ-008-03: Translation to English
 * REQ-008-08: Fallback to Google Translate
 * REQ-008-10: 2-second timeout
 * ADR-004: DeepL primary, Google fallback
 */
export class TranslationService {
  private readonly deeplClient?: DeepLClient;
  private readonly googleClient?: GoogleTranslateClient;
  private readonly cache: TranslationCache | null;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(options: {
    deeplApiKey?: string;
    googleApiKey?: string;
    cache?: TranslationCache;
    timeout?: number;
    maxRetries?: number;
    deeplUsePro?: boolean;
  }) {
    this.timeout = options.timeout ?? DEFAULT_CONFIG.TRANSLATION_TIMEOUT;
    this.maxRetries = options.maxRetries ?? DEFAULT_CONFIG.MAX_RETRIES;
    this.cache = options.cache ?? null;

    if (options.deeplApiKey) {
      this.deeplClient = new DeepLClient({
        apiKey: options.deeplApiKey,
        usePro: options.deeplUsePro ?? false,
        timeout: this.timeout,
      });
    }

    if (options.googleApiKey) {
      this.googleClient = new GoogleTranslateClient({
        apiKey: options.googleApiKey,
        timeout: this.timeout,
      });
    }

    if (!this.deeplClient && !this.googleClient) {
      console.warn('[TranslationService] No translation API keys configured');
    }
  }

  /**
   * Translate text with automatic fallback
   *
   * @param text - Text to translate
   * @param options - Translation options
   * @returns Translation result
   */
  async translate(
    text: string,
    options: TranslationOptions = {}
  ): Promise<TranslationResult> {
    const {
      sourceLanguage,
      targetLanguage = 'en',
      useCache = true,
      preferredProvider,
    } = options;

    if (!sourceLanguage) {
      throw new Error('Source language is required');
    }

    // Skip translation if source and target are the same
    if (sourceLanguage === targetLanguage) {
      return {
        original: text,
        translated: text,
        sourceLanguage,
        targetLanguage,
        provider: 'deepl',
        cached: false,
        timestamp: new Date(),
      };
    }

    // Check cache first
    if (useCache && this.cache) {
      const cached = await this.cache.get(text, sourceLanguage, targetLanguage);
      if (cached) {
        return {
          ...cached,
          cached: true,
        };
      }
    }

    // Try translation with fallback
    let result: TranslationResult;

    if (preferredProvider === 'google' && this.googleClient) {
      result = await this.translateWithFallback(
        text,
        sourceLanguage,
        targetLanguage,
        'google'
      );
    } else {
      result = await this.translateWithFallback(
        text,
        sourceLanguage,
        targetLanguage,
        'deepl'
      );
    }

    // Save to cache
    if (useCache && this.cache) {
      await this.cache.set(result);
    }

    return result;
  }

  /**
   * Translate multiple texts in batch
   *
   * @param texts - Array of texts to translate
   * @param options - Translation options
   * @returns Array of translation results
   */
  async translateBatch(
    texts: string[],
    options: TranslationOptions = {}
  ): Promise<TranslationResult[]> {
    const {
      sourceLanguage,
      targetLanguage = 'en',
      useCache = true,
    } = options;

    if (!sourceLanguage) {
      throw new Error('Source language is required');
    }

    if (texts.length === 0) {
      return [];
    }

    const results: TranslationResult[] = [];
    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];

    // Check cache for each text
    if (useCache && this.cache) {
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        if (!text) continue;

        const cached = await this.cache.get(text, sourceLanguage, targetLanguage);
        if (cached) {
          results[i] = { ...cached, cached: true };
        } else {
          uncachedTexts.push(text);
          uncachedIndices.push(i);
        }
      }
    } else {
      uncachedTexts.push(...texts);
      uncachedIndices.push(...texts.map((_, i) => i));
    }

    // Translate uncached texts
    if (uncachedTexts.length > 0) {
      const translations = await this.translateBatchWithFallback(
        uncachedTexts,
        sourceLanguage,
        targetLanguage
      );

      // Merge results
      for (let i = 0; i < translations.length; i++) {
        const translation = translations[i];
        const originalIndex = uncachedIndices[i];
        if (translation && originalIndex !== undefined) {
          results[originalIndex] = translation;

          // Save to cache
          if (useCache && this.cache) {
            await this.cache.set(translation);
          }
        }
      }
    }

    return results;
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): Array<'deepl' | 'google'> {
    const providers: Array<'deepl' | 'google'> = [];
    if (this.deeplClient) providers.push('deepl');
    if (this.googleClient) providers.push('google');
    return providers;
  }

  /**
   * Check if translation is available
   */
  isAvailable(): boolean {
    return Boolean(this.deeplClient || this.googleClient);
  }

  /**
   * Translate with automatic fallback
   * ADR-004: DeepL primary, Google fallback
   */
  private async translateWithFallback(
    text: string,
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage,
    preferredProvider: 'deepl' | 'google'
  ): Promise<TranslationResult> {
    const providers =
      preferredProvider === 'google'
        ? [this.googleClient, this.deeplClient]
        : [this.deeplClient, this.googleClient];

    let lastError: Error | null = null;

    for (const client of providers) {
      if (!client) continue;

      for (let attempt = 0; attempt < this.maxRetries; attempt++) {
        try {
          return await client.translate(text, sourceLanguage, targetLanguage);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.warn(
            `[TranslationService] Attempt ${attempt + 1} failed:`,
            lastError.message
          );

          // Wait before retry
          if (attempt < this.maxRetries - 1) {
            await this.delay(DEFAULT_CONFIG.RETRY_DELAY * (attempt + 1));
          }
        }
      }
    }

    throw new Error(
      `Translation failed after all retries: ${lastError?.message ?? 'Unknown error'}`
    );
  }

  /**
   * Translate batch with fallback
   */
  private async translateBatchWithFallback(
    texts: string[],
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage
  ): Promise<TranslationResult[]> {
    // Try DeepL first
    if (this.deeplClient) {
      try {
        return await this.deeplClient.translateBatch(
          texts,
          sourceLanguage,
          targetLanguage
        );
      } catch (error) {
        console.warn('[TranslationService] DeepL batch failed, trying Google:', error);
      }
    }

    // Fallback to Google
    if (this.googleClient) {
      return await this.googleClient.translateBatch(
        texts,
        sourceLanguage,
        targetLanguage
      );
    }

    throw new Error('No translation provider available');
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
