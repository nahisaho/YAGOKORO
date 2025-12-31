/**
 * @yagokoro/multilang
 *
 * Multilingual paper processing package for YAGOKORO.
 * Provides language detection, translation, NER, and cross-lingual entity linking.
 *
 * @packageDocumentation
 */

// Types
export type {
  SupportedLanguage,
  LanguageDetectionResult,
  TranslationResult,
  TranslationOptions,
  NEREntity,
  NERResult,
  CrossLingualLink,
  MultilingualMetadata,
  TranslationCacheEntry,
  MultilingualConfig,
  MultilingualStats,
} from './types.js';

// Services
export { LanguageDetector } from './services/LanguageDetector.js';
export { TranslationService } from './services/TranslationService.js';
export { TranslationCache, MemoryCacheStorage, SQLiteCacheStorage, RedisCacheStorage } from './cache/TranslationCache.js';
export { TermNormalizer } from './services/TermNormalizer.js';
export { MultilingualNER } from './services/MultilingualNER.js';
export { CrossLingualLinker } from './services/CrossLingualLinker.js';
export { MultilingualIngester } from './services/MultilingualIngester.js';
export { MultilingualService } from './services/MultilingualService.js';

// Clients
export { DeepLClient } from './clients/DeepLClient.js';
export { GoogleTranslateClient } from './clients/GoogleTranslateClient.js';

// Schema
export {
  MULTILINGUAL_CYPHER,
  runMigration,
  MultilingualMetadataRepository,
} from './schema/MultilingualMetadataSchema.js';
export type {
  MultilingualMetadataNode,
  CrossLingualLinkRelationship,
} from './schema/MultilingualMetadataSchema.js';

// Constants
export { SUPPORTED_LANGUAGES, LANGUAGE_CODES, DEFAULT_CONFIG } from './constants.js';
