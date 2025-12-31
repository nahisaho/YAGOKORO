import type {
  SupportedLanguage,
  LanguageDetectionResult,
  TranslationResult,
  TranslationOptions,
  NERResult,
  MultilingualMetadata,
  MultilingualConfig,
  MultilingualStats,
} from '../types.js';
import { DEFAULT_CONFIG } from '../constants.js';
import { LanguageDetector } from './LanguageDetector.js';
import { TranslationService } from './TranslationService.js';
import { TranslationCache, MemoryCacheStorage, SQLiteCacheStorage, RedisCacheStorage } from '../cache/TranslationCache.js';
import { TermNormalizer } from './TermNormalizer.js';
import { MultilingualNER } from './MultilingualNER.js';
import { CrossLingualLinker } from './CrossLingualLinker.js';
import { MultilingualIngester } from './MultilingualIngester.js';

/**
 * MultilingualService - Unified facade for all multilingual operations
 *
 * Provides a single entry point for:
 * - Language detection (REQ-008-02)
 * - Translation (REQ-008-03)
 * - NER extraction (REQ-008-06)
 * - Cross-lingual linking (REQ-008-05)
 * - Paper ingestion (REQ-008-01)
 */
export class MultilingualService {
  private readonly languageDetector: LanguageDetector;
  private readonly translationService: TranslationService;
  private readonly termNormalizer: TermNormalizer;
  private readonly ner: MultilingualNER;
  private readonly linker: CrossLingualLinker;
  private readonly ingester: MultilingualIngester;
  private readonly cache: TranslationCache;
  
  private stats: MultilingualStats = {
    totalPapers: 0,
    papersByLanguage: { en: 0, zh: 0, ja: 0, ko: 0 },
    totalTranslations: 0,
    cacheHitRate: 0,
    avgTranslationTime: 0,
    totalEntities: 0,
    totalCrossLinks: 0,
    papersRequiringReview: 0,
  };

  constructor(config: Partial<MultilingualConfig> = {}) {
    const fullConfig: MultilingualConfig = {
      cacheType: config.cacheType ?? 'memory',
      confidenceThreshold: config.confidenceThreshold ?? DEFAULT_CONFIG.CONFIDENCE_THRESHOLD,
      linkingThreshold: config.linkingThreshold ?? DEFAULT_CONFIG.LINKING_THRESHOLD,
      translationTimeout: config.translationTimeout ?? DEFAULT_CONFIG.TRANSLATION_TIMEOUT,
      ...config,
    };

    // Initialize cache
    this.cache = this.createCache(fullConfig);

    // Build options object, only including defined values
    const languageDetectorOptions: { pythonPath?: string; confidenceThreshold?: number } = {
      confidenceThreshold: fullConfig.confidenceThreshold,
    };
    if (fullConfig.pythonPath !== undefined) {
      languageDetectorOptions.pythonPath = fullConfig.pythonPath;
    }
    this.languageDetector = new LanguageDetector(languageDetectorOptions);

    const translationOptions: { deeplApiKey?: string; googleApiKey?: string; cache?: TranslationCache; timeout?: number } = {
      cache: this.cache,
      timeout: fullConfig.translationTimeout,
    };
    if (fullConfig.deeplApiKey !== undefined) {
      translationOptions.deeplApiKey = fullConfig.deeplApiKey;
    }
    if (fullConfig.googleApiKey !== undefined) {
      translationOptions.googleApiKey = fullConfig.googleApiKey;
    }
    this.translationService = new TranslationService(translationOptions);

    this.termNormalizer = new TermNormalizer();

    const nerOptions: { pythonPath?: string } = {};
    if (fullConfig.pythonPath !== undefined) {
      nerOptions.pythonPath = fullConfig.pythonPath;
    }
    this.ner = new MultilingualNER(nerOptions);

    this.linker = new CrossLingualLinker({
      termNormalizer: this.termNormalizer,
      translationService: this.translationService,
      similarityThreshold: fullConfig.linkingThreshold,
    });

    this.ingester = new MultilingualIngester({
      languageDetector: this.languageDetector,
      translationService: this.translationService,
      ner: this.ner,
      linker: this.linker,
    });
  }

  /**
   * Detect language of text
   *
   * @param text - Text to detect language for
   * @returns Language detection result
   */
  async detectLanguage(text: string): Promise<LanguageDetectionResult> {
    const result = await this.languageDetector.detect(text);
    if (result.requiresManualReview) {
      this.stats.papersRequiringReview++;
    }
    return result;
  }

  /**
   * Translate text
   *
   * @param text - Text to translate
   * @param options - Translation options
   * @returns Translation result
   */
  async translate(
    text: string,
    options: TranslationOptions
  ): Promise<TranslationResult> {
    const startTime = Date.now();
    const result = await this.translationService.translate(text, options);
    
    this.stats.totalTranslations++;
    this.stats.avgTranslationTime = 
      (this.stats.avgTranslationTime * (this.stats.totalTranslations - 1) + (Date.now() - startTime)) 
      / this.stats.totalTranslations;
    
    return result;
  }

  /**
   * Extract named entities
   *
   * @param text - Text to extract entities from
   * @param language - Language of text
   * @returns NER result
   */
  async extractEntities(
    text: string,
    language: SupportedLanguage
  ): Promise<NERResult> {
    const result = await this.ner.extract(text, language);
    this.stats.totalEntities += result.entities.length;
    return result;
  }

  /**
   * Normalize a term
   *
   * @param term - Term to normalize
   * @param language - Source language
   * @returns Normalized canonical term
   */
  normalizeTerm(term: string, language: SupportedLanguage): string {
    return this.termNormalizer.normalize(term, language);
  }

  /**
   * Ingest a multilingual paper
   *
   * @param paper - Paper to ingest
   * @param existingEntityIds - Map of existing entity names to IDs
   * @returns Multilingual metadata
   */
  async ingestPaper(
    paper: {
      id: string;
      title: string;
      abstract: string;
      fullText?: string;
      language?: SupportedLanguage;
    },
    existingEntityIds: Map<string, string> = new Map()
  ): Promise<MultilingualMetadata> {
    const metadata = await this.ingester.ingest(paper, existingEntityIds);
    
    this.stats.totalPapers++;
    this.stats.papersByLanguage[metadata.originalLanguage]++;
    this.stats.totalCrossLinks += metadata.crossLinks.length;
    
    if (metadata.languageConfidence < DEFAULT_CONFIG.CONFIDENCE_THRESHOLD) {
      this.stats.papersRequiringReview++;
    }
    
    return metadata;
  }

  /**
   * Get service statistics
   *
   * @returns Current statistics
   */
  async getStats(): Promise<MultilingualStats> {
    const cacheStats = await this.cache.getStats();
    return {
      ...this.stats,
      cacheHitRate: cacheStats.hitRate,
    };
  }

  /**
   * Check if translation service is available
   */
  isTranslationAvailable(): boolean {
    return this.translationService.isAvailable();
  }

  /**
   * Get available translation providers
   */
  getAvailableProviders(): Array<'deepl' | 'google'> {
    return this.translationService.getAvailableProviders();
  }

  /**
   * Create cache based on configuration
   */
  private createCache(config: MultilingualConfig): TranslationCache {
    switch (config.cacheType) {
      case 'redis':
        if (config.redisUrl) {
          return new TranslationCache(
            new RedisCacheStorage({ redisUrl: config.redisUrl })
          );
        }
        console.warn('[MultilingualService] Redis URL not provided, falling back to memory cache');
        return new TranslationCache(new MemoryCacheStorage());
      case 'sqlite':
        if (config.sqlitePath) {
          return new TranslationCache(
            new SQLiteCacheStorage({ dbPath: config.sqlitePath })
          );
        }
        console.warn('[MultilingualService] SQLite path not provided, falling back to memory cache');
        return new TranslationCache(new MemoryCacheStorage());
      case 'memory':
      default:
        return new TranslationCache(new MemoryCacheStorage());
    }
  }
}
