import type {
  SupportedLanguage,
  MultilingualMetadata,
  LanguageDetectionResult,
} from '../types.js';
import { LanguageDetector } from './LanguageDetector.js';
import { TranslationService } from './TranslationService.js';
import { MultilingualNER } from './MultilingualNER.js';
import { CrossLingualLinker } from './CrossLingualLinker.js';

/**
 * Paper input for ingestion
 */
interface PaperInput {
  id: string;
  title: string;
  abstract: string;
  fullText?: string;
  language?: SupportedLanguage;
}

/**
 * MultilingualIngester - Ingest multilingual papers
 *
 * REQ-008-01: Support Chinese, Japanese, Korean papers
 * REQ-008-02: Automatic language detection at ingestion
 * REQ-008-04: Original metadata preservation
 */
export class MultilingualIngester {
  private readonly languageDetector: LanguageDetector;
  private readonly translationService: TranslationService | null;
  private readonly ner: MultilingualNER;
  private readonly linker: CrossLingualLinker;

  constructor(options: {
    languageDetector?: LanguageDetector;
    translationService?: TranslationService;
    ner?: MultilingualNER;
    linker?: CrossLingualLinker;
  } = {}) {
    this.languageDetector = options.languageDetector ?? new LanguageDetector();
    this.translationService = options.translationService ?? null;
    this.ner = options.ner ?? new MultilingualNER();
    this.linker = options.linker ?? new CrossLingualLinker();
  }

  /**
   * Ingest a single paper
   *
   * @param paper - Paper input
   * @param existingEntityIds - Map of existing entity canonical names to IDs
   * @returns Multilingual metadata
   */
  async ingest(
    paper: PaperInput,
    existingEntityIds: Map<string, string> = new Map()
  ): Promise<MultilingualMetadata> {
    // Step 1: Detect or confirm language
    let language: SupportedLanguage;
    let languageConfidence: number;

    if (paper.language) {
      language = paper.language;
      languageConfidence = 1.0;
    } else {
      const detection = await this.detectLanguage(paper);
      language = detection.language === 'unknown' ? 'en' : detection.language;
      languageConfidence = detection.confidence;
    }

    // Step 2: Extract entities
    const nerResult = await this.ner.extract(
      `${paper.title}\n\n${paper.abstract}`,
      language
    );

    // Step 3: Translate if not English
    let translatedTitle: string | undefined;
    let translatedAbstract: string | undefined;

    if (language !== 'en' && this.translationService) {
      try {
        const [titleResult, abstractResult] = await Promise.all([
          this.translationService.translate(paper.title, {
            sourceLanguage: language,
            targetLanguage: 'en',
          }),
          this.translationService.translate(paper.abstract, {
            sourceLanguage: language,
            targetLanguage: 'en',
          }),
        ]);

        translatedTitle = titleResult.translated;
        translatedAbstract = abstractResult.translated;
      } catch (error) {
        console.warn('[MultilingualIngester] Translation failed:', error);
      }
    }

    // Step 4: Link entities to existing knowledge graph
    const crossLinks = await this.linker.linkEntities(
      nerResult.entities,
      existingEntityIds
    );

    const result: MultilingualMetadata = {
      paperId: paper.id,
      originalLanguage: language,
      originalTitle: paper.title,
      originalAbstract: paper.abstract,
      languageConfidence,
      processedAt: new Date(),
      entities: nerResult.entities,
      crossLinks,
    };

    if (translatedTitle) {
      result.translatedTitle = translatedTitle;
    }
    if (translatedAbstract) {
      result.translatedAbstract = translatedAbstract;
    }

    return result;
  }

  /**
   * Ingest multiple papers in batch
   *
   * @param papers - Array of paper inputs
   * @param existingEntityIds - Map of existing entity canonical names to IDs
   * @returns Array of multilingual metadata
   */
  async ingestBatch(
    papers: PaperInput[],
    existingEntityIds: Map<string, string> = new Map()
  ): Promise<MultilingualMetadata[]> {
    const results: MultilingualMetadata[] = [];

    for (const paper of papers) {
      try {
        const metadata = await this.ingest(paper, existingEntityIds);
        results.push(metadata);

        // Update existing entities with newly discovered entities
        for (const entity of metadata.entities) {
          if (!existingEntityIds.has(entity.text.toLowerCase())) {
            existingEntityIds.set(entity.text.toLowerCase(), `entity-${Date.now()}-${Math.random()}`);
          }
        }
      } catch (error) {
        console.error(`[MultilingualIngester] Failed to ingest paper ${paper.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Detect language from paper content
   */
  private async detectLanguage(paper: PaperInput): Promise<LanguageDetectionResult> {
    // Use title + abstract for detection (more reliable than title alone)
    const text = `${paper.title}\n${paper.abstract}`;
    return this.languageDetector.detect(text);
  }
}
