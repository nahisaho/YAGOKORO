/**
 * Supported languages for multilingual processing
 * REQ-008-01: Support Chinese, Japanese, Korean papers
 */
export type SupportedLanguage = 'en' | 'zh' | 'ja' | 'ko';

/**
 * Result of language detection
 * REQ-008-02: Automatic language detection
 * REQ-008-09: Confidence threshold 0.7
 */
export interface LanguageDetectionResult {
  /** Detected language code */
  language: SupportedLanguage | 'unknown';
  /** Detection confidence score (0-1) */
  confidence: number;
  /** Whether the result requires manual review (confidence < 0.7) */
  requiresManualReview: boolean;
  /** Alternative language candidates with their scores */
  alternatives: Array<{
    language: SupportedLanguage;
    confidence: number;
  }>;
}

/**
 * Result of translation operation
 * REQ-008-03: Translation to English
 */
export interface TranslationResult {
  /** Original text */
  original: string;
  /** Translated text */
  translated: string;
  /** Source language */
  sourceLanguage: SupportedLanguage;
  /** Target language */
  targetLanguage: SupportedLanguage;
  /** Translation provider used */
  provider: 'deepl' | 'google';
  /** Whether result was from cache */
  cached: boolean;
  /** Translation timestamp */
  timestamp: Date;
}

/**
 * Options for translation
 * REQ-008-08: Fallback to Google Translate
 * REQ-008-10: 2-second timeout
 */
export interface TranslationOptions {
  /** Source language (auto-detect if not specified) */
  sourceLanguage?: SupportedLanguage;
  /** Target language (default: 'en') */
  targetLanguage?: SupportedLanguage;
  /** Use cache if available */
  useCache?: boolean;
  /** Timeout in milliseconds (default: 2000) */
  timeout?: number;
  /** Preferred provider */
  preferredProvider?: 'deepl' | 'google';
}

/**
 * Named entity extracted from text
 * REQ-008-06: Multilingual NER
 */
export interface NEREntity {
  /** Entity text */
  text: string;
  /** Entity type (PERSON, ORG, TECH, etc.) */
  type: string;
  /** Start position in text */
  start: number;
  /** End position in text */
  end: number;
  /** Confidence score */
  confidence: number;
  /** Original language */
  language: SupportedLanguage;
}

/**
 * Result of NER extraction
 */
export interface NERResult {
  /** Extracted entities */
  entities: NEREntity[];
  /** Source language */
  language: SupportedLanguage;
  /** Model used for extraction */
  model: string;
  /** Processing time in ms */
  processingTime: number;
}

/**
 * Cross-lingual entity link
 * REQ-008-05: Cross-lingual entity linking
 * REQ-008-11: Linking threshold 0.8
 */
export interface CrossLingualLink {
  /** Source entity (original language) */
  sourceEntity: NEREntity;
  /** Target entity (English or existing entity) */
  targetEntityId: string;
  /** Similarity score (threshold: 0.8) */
  similarity: number;
  /** Link type (exact, semantic, partial) */
  linkType: 'exact' | 'semantic' | 'partial';
  /** Whether link was automatically created or needs review */
  autoLinked: boolean;
}

/**
 * Multilingual metadata for a paper
 * REQ-008-04: Metadata preservation
 */
export interface MultilingualMetadata {
  /** Paper ID */
  paperId: string;
  /** Original language */
  originalLanguage: SupportedLanguage;
  /** Original title */
  originalTitle: string;
  /** Translated title (English) */
  translatedTitle?: string;
  /** Original abstract */
  originalAbstract: string;
  /** Translated abstract (English) */
  translatedAbstract?: string;
  /** Detection confidence */
  languageConfidence: number;
  /** Processing timestamp */
  processedAt: Date;
  /** Entities found */
  entities: NEREntity[];
  /** Cross-lingual links */
  crossLinks: CrossLingualLink[];
}

/**
 * Cache entry for translations
 */
export interface TranslationCacheEntry {
  /** Cache key (hash of source text + languages) */
  key: string;
  /** Original text */
  original: string;
  /** Translated text */
  translated: string;
  /** Source language */
  sourceLanguage: SupportedLanguage;
  /** Target language */
  targetLanguage: SupportedLanguage;
  /** Provider used */
  provider: 'deepl' | 'google';
  /** Creation timestamp */
  createdAt: Date;
  /** Last access timestamp */
  lastAccessedAt: Date;
  /** Access count */
  accessCount: number;
}

/**
 * Configuration for multilingual service
 */
export interface MultilingualConfig {
  /** DeepL API key */
  deeplApiKey?: string;
  /** Google Translate API key */
  googleApiKey?: string;
  /** Cache type */
  cacheType: 'sqlite' | 'redis' | 'memory';
  /** Redis URL (if using Redis) */
  redisUrl?: string;
  /** SQLite path (if using SQLite) */
  sqlitePath?: string;
  /** Language detection confidence threshold */
  confidenceThreshold: number;
  /** Cross-lingual linking similarity threshold */
  linkingThreshold: number;
  /** Translation timeout in ms */
  translationTimeout: number;
  /** Python executable path */
  pythonPath?: string;
}

/**
 * Stats for multilingual processing
 */
export interface MultilingualStats {
  /** Total papers processed */
  totalPapers: number;
  /** Papers by language */
  papersByLanguage: Record<SupportedLanguage, number>;
  /** Total translations performed */
  totalTranslations: number;
  /** Cache hit rate */
  cacheHitRate: number;
  /** Average translation time (ms) */
  avgTranslationTime: number;
  /** Total entities extracted */
  totalEntities: number;
  /** Cross-lingual links created */
  totalCrossLinks: number;
  /** Papers requiring manual review */
  papersRequiringReview: number;
}
