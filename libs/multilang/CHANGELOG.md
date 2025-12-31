# Changelog

All notable changes to `@yagokoro/multilang` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.0.0] - 2024-12-31

### Added

#### Core Services
- `LanguageDetector` - Automatic language detection using Python langdetect
  - Support for Chinese (zh), Japanese (ja), Korean (ko), English (en)
  - Confidence threshold of 0.7 for manual review flagging
  - Batch detection support

- `TranslationService` - DeepL/Google Translate integration
  - Primary DeepL API with Google Translate fallback
  - 2-second timeout with automatic failover
  - Batch translation support

- `MultilingualNER` - Named Entity Recognition using spaCy
  - Support for 4 languages with dedicated spaCy models
  - Entity types: PERSON, ORG, TECH, LOC, MISC
  - Confidence scoring

- `CrossLingualLinker` - Cross-lingual entity linking
  - Similarity threshold of 0.8 for automatic linking
  - Exact, semantic, and partial matching strategies
  - Integration with existing entity graph

- `TermNormalizer` - Technical term normalization
  - Canonical form mapping for common abbreviations
  - Multi-language synonym support

#### Cache System
- `TranslationCache` - Hybrid caching for translations
  - `MemoryCacheStorage` - In-memory cache for development
  - `SQLiteCacheStorage` - Persistent SQLite cache
  - `RedisCacheStorage` - Distributed Redis cache for production

#### Schema
- `MultilingualMetadataSchema` - Neo4j schema extension
  - `MultilingualMetadata` node type
  - `CROSS_LINGUAL_LINK` relationship type
  - Cypher queries for language-based queries

#### Types
- Full TypeScript type definitions
  - `SupportedLanguage` - Type-safe language codes
  - `LanguageDetectionResult` - Detection results with confidence
  - `TranslationResult` - Translation output with metadata
  - `NEREntity` - Extracted entity with position
  - `CrossLingualLink` - Entity linking result
  - `MultilingualMetadata` - Paper metadata

### Requirements Implemented
- REQ-008-01: Chinese/Japanese/Korean paper support
- REQ-008-02: Automatic language detection
- REQ-008-03: Translation to English
- REQ-008-04: Metadata preservation
- REQ-008-05: Cross-lingual entity linking
- REQ-008-06: Multilingual NER
- REQ-008-07: Translation caching
- REQ-008-08: Google Translate fallback
- REQ-008-09: Confidence threshold 0.7
- REQ-008-10: 2-second timeout
- REQ-008-11: Linking threshold 0.8
- REQ-008-12: Manual review support

### Testing
- 75 tests passing, 18 skipped (Python-dependent)
- Unit tests for all core services
- Integration tests for E2E workflows
- Mock-based tests for external APIs

## [Unreleased]

### Planned
- Korean spaCy model integration
- Additional translation providers
- Improved entity resolution algorithms
- Performance optimizations for batch processing
