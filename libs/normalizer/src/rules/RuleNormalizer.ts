/**
 * RuleNormalizer - Rule-based entity normalization
 * 
 * Applies pattern-based rules to normalize entity names.
 * First stage of the normalization pipeline.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';
import type { NormalizationStage } from '../types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Single normalization rule definition
 */
export interface NormalizationRule {
  /** Regex pattern to match (string form) */
  pattern: string;
  /** Replacement string (can use regex groups) */
  replacement: string;
  /** Priority (higher = applied first) */
  priority: number;
  /** Category of entities this rule applies to */
  category?: string;
  /** Description of what this rule does */
  description?: string;
}

/**
 * Result of rule-based normalization
 */
export interface NormalizationResult {
  /** Original input */
  original: string;
  /** Normalized output */
  normalized: string;
  /** Rules that were applied */
  appliedRules: NormalizationRule[];
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  /** Stage identifier */
  stage: NormalizationStage;
}

/**
 * Configuration for RuleNormalizer
 */
export interface RuleConfig {
  /** Path to YAML rules file */
  rulesPath?: string;
  /** Inline rules (merged with file rules) */
  rules?: NormalizationRule[];
  /** Whether to use default rules */
  useDefaultRules?: boolean;
}

// ============================================================================
// Default Rules
// ============================================================================

const DEFAULT_RULES: NormalizationRule[] = [
  // AI Model normalization
  { pattern: 'GPT[-\\s]?4[oO]?', replacement: 'GPT4', priority: 100, category: 'ai_model', description: 'Normalize GPT-4 variants' },
  { pattern: 'GPT[-\\s]?3\\.?5', replacement: 'GPT3.5', priority: 100, category: 'ai_model', description: 'Normalize GPT-3.5 variants' },
  { pattern: 'GPT[-\\s]?3', replacement: 'GPT3', priority: 99, category: 'ai_model', description: 'Normalize GPT-3 variants' },
  { pattern: 'Claude[-\\s]?3\\.?5[-\\s]?[Ss]onnet', replacement: 'Claude3.5Sonnet', priority: 100, category: 'ai_model' },
  { pattern: 'Claude[-\\s]?3[-\\s]?[Oo]pus', replacement: 'Claude3Opus', priority: 100, category: 'ai_model' },
  { pattern: 'Claude[-\\s]?3', replacement: 'Claude3', priority: 99, category: 'ai_model' },
  { pattern: 'LLaMA[-\\s]?2', replacement: 'LLaMA2', priority: 100, category: 'ai_model' },
  { pattern: 'LLaMA[-\\s]?3', replacement: 'LLaMA3', priority: 100, category: 'ai_model' },
  { pattern: '[Ll][Ll]ama[-\\s]?(\\d)', replacement: 'LLaMA$1', priority: 95, category: 'ai_model' },
  { pattern: 'Gemini[-\\s]?1\\.?5[-\\s]?[Pp]ro', replacement: 'Gemini1.5Pro', priority: 100, category: 'ai_model' },
  { pattern: 'Gemini[-\\s]?[Uu]ltra', replacement: 'GeminiUltra', priority: 100, category: 'ai_model' },
  { pattern: 'DALL[-\\s·]?E[-\\s]?(\\d)?', replacement: 'DALL-E$1', priority: 100, category: 'ai_model' },
  { pattern: 'Stable\\s*Diffusion', replacement: 'StableDiffusion', priority: 100, category: 'ai_model' },
  { pattern: 'Mid[Jj]ourney', replacement: 'Midjourney', priority: 100, category: 'ai_model' },
  
  // Technique normalization
  { pattern: '[Cc]hain[-\\s]?of[-\\s]?[Tt]hought', replacement: 'CoT', priority: 90, category: 'technique' },
  { pattern: '[Cc]o[Tt]', replacement: 'CoT', priority: 85, category: 'technique' },
  { pattern: '[Ff]ew[-\\s]?shot', replacement: 'few-shot', priority: 90, category: 'technique' },
  { pattern: '[Zz]ero[-\\s]?shot', replacement: 'zero-shot', priority: 90, category: 'technique' },
  { pattern: '[Ii]n[-\\s]?context\\s+[Ll]earning', replacement: 'ICL', priority: 90, category: 'technique' },
  { pattern: '[Rr]etrieval[-\\s]?[Aa]ugmented[-\\s]?[Gg]eneration', replacement: 'RAG', priority: 90, category: 'technique' },
  { pattern: '[Rr]einforcement\\s+[Ll]earning\\s+from\\s+[Hh]uman\\s+[Ff]eedback', replacement: 'RLHF', priority: 90, category: 'technique' },
  { pattern: '[Ll]o[Rr][Aa]', replacement: 'LoRA', priority: 90, category: 'technique' },
  { pattern: '[Qq][Ll]o[Rr][Aa]', replacement: 'QLoRA', priority: 90, category: 'technique' },
  { pattern: '[Pp]arameter[-\\s]?[Ee]fficient\\s+[Ff]ine[-\\s]?[Tt]uning', replacement: 'PEFT', priority: 90, category: 'technique' },
  { pattern: '[Dd]irect\\s+[Pp]reference\\s+[Oo]ptimization', replacement: 'DPO', priority: 90, category: 'technique' },
  { pattern: '[Aa]ttention\\s+[Mm]echanism', replacement: 'Attention', priority: 85, category: 'technique' },
  { pattern: '[Ss]elf[-\\s]?[Aa]ttention', replacement: 'SelfAttention', priority: 85, category: 'technique' },
  { pattern: '[Mm]ulti[-\\s]?[Hh]ead\\s+[Aa]ttention', replacement: 'MultiHeadAttention', priority: 85, category: 'technique' },
  
  // Organization normalization
  { pattern: 'Open\\s*AI', replacement: 'OpenAI', priority: 80, category: 'organization' },
  { pattern: 'Deep\\s*Mind', replacement: 'DeepMind', priority: 80, category: 'organization' },
  { pattern: 'Meta\\s*AI', replacement: 'MetaAI', priority: 80, category: 'organization' },
  { pattern: 'Google\\s*AI', replacement: 'GoogleAI', priority: 80, category: 'organization' },
  { pattern: 'Microsoft\\s*Research', replacement: 'MSR', priority: 80, category: 'organization' },
  { pattern: 'Anthropic', replacement: 'Anthropic', priority: 80, category: 'organization' },
  { pattern: 'Hugging\\s*Face', replacement: 'HuggingFace', priority: 80, category: 'organization' },
  
  // Architecture normalization
  { pattern: '[Tt]ransformer[s]?', replacement: 'Transformer', priority: 85, category: 'architecture' },
  { pattern: '[Ee]ncoder[-\\s]?[Dd]ecoder', replacement: 'EncoderDecoder', priority: 85, category: 'architecture' },
  { pattern: '[Aa]uto[-\\s]?[Rr]egressive', replacement: 'Autoregressive', priority: 85, category: 'architecture' },
  
  // Benchmark normalization
  { pattern: 'MMLU', replacement: 'MMLU', priority: 80, category: 'benchmark' },
  { pattern: 'Hella\\s*[Ss]wag', replacement: 'HellaSwag', priority: 80, category: 'benchmark' },
  { pattern: 'TruthfulQA', replacement: 'TruthfulQA', priority: 80, category: 'benchmark' },
  { pattern: 'Human\\s*Eval', replacement: 'HumanEval', priority: 80, category: 'benchmark' },
  { pattern: 'Big[-\\s]?[Bb]ench', replacement: 'BigBench', priority: 80, category: 'benchmark' },
];

// ============================================================================
// RuleNormalizer Class
// ============================================================================

/**
 * Rule-based entity normalizer
 * 
 * @example
 * ```typescript
 * const normalizer = new RuleNormalizer();
 * const result = normalizer.normalize('GPT-4');
 * console.log(result.normalized); // 'GPT4'
 * ```
 */
export class RuleNormalizer {
  private rules: NormalizationRule[];
  private compiledRules: Array<{ rule: NormalizationRule; regex: RegExp }>;

  constructor(config: RuleConfig = {}) {
    this.rules = this.loadRules(config);
    this.compiledRules = this.compileRules();
  }

  /**
   * Normalize an entity name using rules
   */
  normalize(input: string): NormalizationResult {
    let normalized = input.trim();
    const appliedRules: NormalizationRule[] = [];

    for (const { rule, regex } of this.compiledRules) {
      if (regex.test(normalized)) {
        const before = normalized;
        normalized = normalized.replace(regex, rule.replacement);
        if (before !== normalized) {
          appliedRules.push(rule);
        }
      }
    }

    // Calculate confidence based on whether rules were applied
    const confidence = appliedRules.length > 0 
      ? Math.min(0.95, 0.7 + appliedRules.length * 0.1)
      : 0.5; // No rules matched, uncertain

    return {
      original: input,
      normalized,
      appliedRules,
      confidence,
      stage: 'rule',
    };
  }

  /**
   * Check if input matches any normalization rule
   */
  hasMatch(input: string): boolean {
    return this.compiledRules.some(({ regex }) => regex.test(input));
  }

  /**
   * Get all loaded rules
   */
  getRules(): NormalizationRule[] {
    return [...this.rules];
  }

  /**
   * Add a rule dynamically
   */
  addRule(rule: NormalizationRule): void {
    this.rules.push(rule);
    this.compiledRules = this.compileRules();
  }

  /**
   * Load rules from config
   */
  private loadRules(config: RuleConfig): NormalizationRule[] {
    const rules: NormalizationRule[] = [];

    // Load default rules if enabled (default: true)
    if (config.useDefaultRules !== false) {
      rules.push(...DEFAULT_RULES);
    }

    // Load rules from file
    if (config.rulesPath) {
      const fileRules = this.loadRulesFromFile(config.rulesPath);
      rules.push(...fileRules);
    }

    // Add inline rules
    if (config.rules) {
      rules.push(...config.rules);
    }

    return rules;
  }

  /**
   * Load rules from YAML file
   */
  private loadRulesFromFile(filePath: string): NormalizationRule[] {
    try {
      const absolutePath = path.resolve(filePath);
      const content = fs.readFileSync(absolutePath, 'utf-8');
      const data = yaml.parse(content);
      
      if (data?.rules && Array.isArray(data.rules)) {
        return data.rules as NormalizationRule[];
      }
      return [];
    } catch (error) {
      console.warn(`Failed to load rules from ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Compile rules into regex objects, sorted by priority
   */
  private compileRules(): Array<{ rule: NormalizationRule; regex: RegExp }> {
    return this.rules
      .sort((a, b) => b.priority - a.priority)
      .map(rule => ({
        rule,
        regex: new RegExp(rule.pattern, 'gi'),
      }));
  }
}
