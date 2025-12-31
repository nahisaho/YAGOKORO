import type { SupportedLanguage } from '../types.js';

/**
 * Term mapping entry
 */
interface TermMapping {
  canonical: string;
  variants: Record<SupportedLanguage, string[]>;
}

/**
 * TermNormalizer - Normalize terms across languages
 *
 * REQ-008-05: Cross-lingual entity linking (term normalization component)
 */
export class TermNormalizer {
  private readonly mappings: Map<string, TermMapping>;
  private readonly reverseIndex: Map<string, string>;

  constructor(_options: { mappingsPath?: string } = {}) {
    this.mappings = new Map();
    this.reverseIndex = new Map();
    this.loadDefaultMappings();
  }

  /**
   * Normalize a term to its canonical form
   *
   * @param term - Term to normalize
   * @param language - Source language
   * @returns Canonical form or original term
   */
  normalize(term: string, language: SupportedLanguage): string {
    const lowerTerm = term.toLowerCase();
    const key = `${language}:${lowerTerm}`;

    // Check reverse index
    const canonical = this.reverseIndex.get(key);
    if (canonical) {
      return canonical;
    }

    // Try English as canonical
    const englishKey = `en:${lowerTerm}`;
    const englishCanonical = this.reverseIndex.get(englishKey);
    if (englishCanonical) {
      return englishCanonical;
    }

    return term;
  }

  /**
   * Get all variants of a term
   *
   * @param canonicalTerm - Canonical term
   * @returns Variants in all languages
   */
  getVariants(canonicalTerm: string): Record<SupportedLanguage, string[]> | null {
    const mapping = this.mappings.get(canonicalTerm.toLowerCase());
    return mapping?.variants ?? null;
  }

  /**
   * Add a new term mapping
   *
   * @param canonical - Canonical term
   * @param variants - Variants in each language
   */
  addMapping(
    canonical: string,
    variants: Partial<Record<SupportedLanguage, string[]>>
  ): void {
    const lowerCanonical = canonical.toLowerCase();
    const fullVariants: Record<SupportedLanguage, string[]> = {
      en: variants.en ?? [canonical],
      zh: variants.zh ?? [],
      ja: variants.ja ?? [],
      ko: variants.ko ?? [],
    };

    this.mappings.set(lowerCanonical, {
      canonical,
      variants: fullVariants,
    });

    // Build reverse index
    for (const [lang, terms] of Object.entries(fullVariants)) {
      for (const term of terms) {
        this.reverseIndex.set(`${lang}:${term.toLowerCase()}`, canonical);
      }
    }
  }

  /**
   * Load default AI/ML term mappings
   */
  private loadDefaultMappings(): void {
    const defaultMappings: Array<{
      canonical: string;
      variants: Partial<Record<SupportedLanguage, string[]>>;
    }> = [
      {
        canonical: 'Transformer',
        variants: {
          en: ['transformer', 'transformers'],
          zh: ['变换器', 'Transformer'],
          ja: ['トランスフォーマー', 'Transformer'],
          ko: ['트랜스포머', 'Transformer'],
        },
      },
      {
        canonical: 'Attention Mechanism',
        variants: {
          en: ['attention mechanism', 'attention', 'self-attention'],
          zh: ['注意力机制', '自注意力', '注意力'],
          ja: ['注意機構', 'アテンション', '自己注意'],
          ko: ['어텐션 메커니즘', '주의 메커니즘', '셀프 어텐션'],
        },
      },
      {
        canonical: 'Large Language Model',
        variants: {
          en: ['large language model', 'llm', 'llms'],
          zh: ['大语言模型', '大型语言模型', 'LLM'],
          ja: ['大規模言語モデル', 'LLM'],
          ko: ['대규모 언어 모델', '거대 언어 모델', 'LLM'],
        },
      },
      {
        canonical: 'Neural Network',
        variants: {
          en: ['neural network', 'neural networks', 'nn'],
          zh: ['神经网络', '神經網絡'],
          ja: ['ニューラルネットワーク', '神経回路網'],
          ko: ['신경망', '뉴럴 네트워크'],
        },
      },
      {
        canonical: 'Deep Learning',
        variants: {
          en: ['deep learning', 'dl'],
          zh: ['深度学习', '深度學習'],
          ja: ['深層学習', 'ディープラーニング'],
          ko: ['딥러닝', '심층 학습'],
        },
      },
      {
        canonical: 'Machine Learning',
        variants: {
          en: ['machine learning', 'ml'],
          zh: ['机器学习', '機器學習'],
          ja: ['機械学習', 'マシンラーニング'],
          ko: ['기계 학습', '머신러닝'],
        },
      },
      {
        canonical: 'Natural Language Processing',
        variants: {
          en: ['natural language processing', 'nlp'],
          zh: ['自然语言处理', '自然語言處理', 'NLP'],
          ja: ['自然言語処理', 'NLP'],
          ko: ['자연어 처리', 'NLP'],
        },
      },
      {
        canonical: 'Reinforcement Learning',
        variants: {
          en: ['reinforcement learning', 'rl'],
          zh: ['强化学习', '強化學習'],
          ja: ['強化学習'],
          ko: ['강화 학습'],
        },
      },
      {
        canonical: 'BERT',
        variants: {
          en: ['bert', 'bidirectional encoder representations from transformers'],
          zh: ['BERT'],
          ja: ['BERT'],
          ko: ['BERT'],
        },
      },
      {
        canonical: 'GPT',
        variants: {
          en: ['gpt', 'generative pre-trained transformer'],
          zh: ['GPT', '生成式预训练变换器'],
          ja: ['GPT'],
          ko: ['GPT'],
        },
      },
    ];

    for (const mapping of defaultMappings) {
      this.addMapping(mapping.canonical, mapping.variants);
    }
  }
}
