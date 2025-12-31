import type { SupportedLanguage } from './types.js';

/**
 * Supported languages with metadata
 */
export const SUPPORTED_LANGUAGES: Record<
  SupportedLanguage,
  {
    name: string;
    nativeName: string;
    spaCyModel: string;
  }
> = {
  en: {
    name: 'English',
    nativeName: 'English',
    spaCyModel: 'en_core_web_sm',
  },
  zh: {
    name: 'Chinese',
    nativeName: '中文',
    spaCyModel: 'zh_core_web_sm',
  },
  ja: {
    name: 'Japanese',
    nativeName: '日本語',
    spaCyModel: 'ja_core_news_sm',
  },
  ko: {
    name: 'Korean',
    nativeName: '한국어',
    spaCyModel: 'ko_core_news_sm',
  },
};

/**
 * ISO 639-1 language codes mapping
 */
export const LANGUAGE_CODES: Record<string, SupportedLanguage> = {
  en: 'en',
  eng: 'en',
  english: 'en',
  zh: 'zh',
  'zh-cn': 'zh',
  'zh-tw': 'zh',
  zho: 'zh',
  chinese: 'zh',
  ja: 'ja',
  jpn: 'ja',
  japanese: 'ja',
  ko: 'ko',
  kor: 'ko',
  korean: 'ko',
};

/**
 * Default configuration values
 * ADR-008: Language detection with langdetect
 * ADR-009: SQLite + Redis hybrid cache
 * ADR-010: Unwanted behavior handling
 * ADR-011: NFR specifications
 */
export const DEFAULT_CONFIG = {
  /** Confidence threshold for language detection (REQ-008-09) */
  CONFIDENCE_THRESHOLD: 0.7,
  /** Similarity threshold for cross-lingual linking (REQ-008-11) */
  LINKING_THRESHOLD: 0.8,
  /** Translation timeout in ms (REQ-008-10) */
  TRANSLATION_TIMEOUT: 2000,
  /** Cache TTL in seconds (1 week) */
  CACHE_TTL: 604800,
  /** Max retries for API calls */
  MAX_RETRIES: 3,
  /** Retry delay in ms */
  RETRY_DELAY: 1000,
  /** Batch size for translation */
  BATCH_SIZE: 10,
  /** SQLite cache path */
  SQLITE_PATH: './data/cache/translations.db',
  /** Redis default URL */
  REDIS_URL: 'redis://localhost:6379',
} as const;

/**
 * Entity types for NER
 */
export const ENTITY_TYPES = {
  PERSON: 'PERSON',
  ORG: 'ORG',
  TECH: 'TECH',
  METHOD: 'METHOD',
  DATASET: 'DATASET',
  METRIC: 'METRIC',
  TASK: 'TASK',
} as const;

/**
 * DeepL API configuration
 */
export const DEEPL_CONFIG = {
  API_URL: 'https://api-free.deepl.com/v2/translate',
  PRO_API_URL: 'https://api.deepl.com/v2/translate',
  MAX_TEXT_LENGTH: 128000,
  SUPPORTED_LANGUAGES: ['EN', 'ZH', 'JA', 'KO'] as const,
} as const;

/**
 * Google Translate API configuration
 */
export const GOOGLE_CONFIG = {
  API_URL: 'https://translation.googleapis.com/language/translate/v2',
  MAX_TEXT_LENGTH: 5000,
  SUPPORTED_LANGUAGES: ['en', 'zh', 'ja', 'ko'] as const,
} as const;
