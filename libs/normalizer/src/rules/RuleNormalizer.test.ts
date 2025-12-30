/**
 * Unit tests for RuleNormalizer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RuleNormalizer, type NormalizationRule } from './RuleNormalizer.js';

describe('RuleNormalizer', () => {
  let normalizer: RuleNormalizer;

  beforeEach(() => {
    normalizer = new RuleNormalizer();
  });

  describe('AI Model normalization', () => {
    it('should normalize GPT-4 to GPT4', () => {
      const result = normalizer.normalize('GPT-4');
      expect(result.normalized).toBe('GPT4');
      expect(result.appliedRules.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should normalize GPT 4 to GPT4', () => {
      const result = normalizer.normalize('GPT 4');
      expect(result.normalized).toBe('GPT4');
    });

    it('should normalize GPT4o to GPT4', () => {
      const result = normalizer.normalize('GPT4o');
      expect(result.normalized).toBe('GPT4');
    });

    it('should normalize GPT-3.5 to GPT3.5', () => {
      const result = normalizer.normalize('GPT-3.5');
      expect(result.normalized).toBe('GPT3.5');
    });

    it('should normalize Claude-3.5 Sonnet', () => {
      const result = normalizer.normalize('Claude-3.5 Sonnet');
      expect(result.normalized).toBe('Claude3.5Sonnet');
    });

    it('should normalize LLaMA-2', () => {
      const result = normalizer.normalize('LLaMA-2');
      expect(result.normalized).toBe('LLaMA2');
    });

    it('should normalize llama 3 to LLaMA3', () => {
      const result = normalizer.normalize('llama 3');
      expect(result.normalized).toBe('LLaMA3');
    });

    it('should normalize DALL-E 3', () => {
      const result = normalizer.normalize('DALL-E 3');
      expect(result.normalized).toBe('DALL-E3');
    });

    it('should normalize Stable Diffusion', () => {
      const result = normalizer.normalize('Stable Diffusion');
      expect(result.normalized).toBe('StableDiffusion');
    });
  });

  describe('Technique normalization', () => {
    it('should normalize Chain of Thought to CoT', () => {
      const result = normalizer.normalize('Chain of Thought');
      expect(result.normalized).toBe('CoT');
    });

    it('should normalize chain-of-thought to CoT', () => {
      const result = normalizer.normalize('chain-of-thought');
      expect(result.normalized).toBe('CoT');
    });

    it('should normalize few-shot with hyphen', () => {
      const result = normalizer.normalize('Few shot');
      expect(result.normalized).toBe('few-shot');
    });

    it('should normalize zero-shot with hyphen', () => {
      const result = normalizer.normalize('Zero shot');
      expect(result.normalized).toBe('zero-shot');
    });

    it('should normalize Retrieval-Augmented Generation to RAG', () => {
      const result = normalizer.normalize('Retrieval-Augmented Generation');
      expect(result.normalized).toBe('RAG');
    });

    it('should normalize Reinforcement Learning from Human Feedback to RLHF', () => {
      const result = normalizer.normalize('Reinforcement Learning from Human Feedback');
      expect(result.normalized).toBe('RLHF');
    });

    it('should normalize LoRA variants', () => {
      expect(normalizer.normalize('lora').normalized).toBe('LoRA');
      expect(normalizer.normalize('LORA').normalized).toBe('LoRA');
    });

    it('should normalize QLoRA variants', () => {
      expect(normalizer.normalize('qlora').normalized).toBe('QLoRA');
      expect(normalizer.normalize('QLORA').normalized).toBe('QLoRA');
    });
  });

  describe('Organization normalization', () => {
    it('should normalize OpenAI variants', () => {
      expect(normalizer.normalize('Open AI').normalized).toBe('OpenAI');
      expect(normalizer.normalize('OpenAI').normalized).toBe('OpenAI');
    });

    it('should normalize DeepMind variants', () => {
      expect(normalizer.normalize('Deep Mind').normalized).toBe('DeepMind');
    });

    it('should normalize HuggingFace variants', () => {
      expect(normalizer.normalize('Hugging Face').normalized).toBe('HuggingFace');
    });

    it('should normalize Microsoft Research to MSR', () => {
      const result = normalizer.normalize('Microsoft Research');
      expect(result.normalized).toBe('MSR');
    });
  });

  describe('Architecture normalization', () => {
    it('should normalize Transformer variants', () => {
      expect(normalizer.normalize('transformers').normalized).toBe('Transformer');
      expect(normalizer.normalize('Transformers').normalized).toBe('Transformer');
    });

    it('should normalize Encoder-Decoder', () => {
      const result = normalizer.normalize('Encoder Decoder');
      expect(result.normalized).toBe('EncoderDecoder');
    });
  });

  describe('Edge cases', () => {
    it('should handle already normalized entities', () => {
      const result = normalizer.normalize('Transformer');
      expect(result.normalized).toBe('Transformer');
      expect(result.confidence).toBe(0.5); // Lower confidence when no rules match
    });

    it('should handle empty string', () => {
      const result = normalizer.normalize('');
      expect(result.normalized).toBe('');
    });

    it('should handle whitespace', () => {
      const result = normalizer.normalize('  GPT-4  ');
      expect(result.normalized).toBe('GPT4');
    });

    it('should handle unknown entities', () => {
      const result = normalizer.normalize('SomeUnknownModel');
      expect(result.normalized).toBe('SomeUnknownModel');
      expect(result.confidence).toBe(0.5);
    });
  });

  describe('Custom rules', () => {
    it('should accept custom rules', () => {
      const customRules: NormalizationRule[] = [
        { pattern: 'MyModel', replacement: 'CustomModel', priority: 100 }
      ];
      const customNormalizer = new RuleNormalizer({ 
        rules: customRules,
        useDefaultRules: false 
      });
      
      const result = customNormalizer.normalize('MyModel');
      expect(result.normalized).toBe('CustomModel');
    });

    it('should merge custom rules with defaults', () => {
      const customRules: NormalizationRule[] = [
        { pattern: 'MyModel', replacement: 'CustomModel', priority: 100 }
      ];
      const customNormalizer = new RuleNormalizer({ 
        rules: customRules,
        useDefaultRules: true 
      });
      
      // Should handle both custom and default rules
      expect(customNormalizer.normalize('MyModel').normalized).toBe('CustomModel');
      expect(customNormalizer.normalize('GPT-4').normalized).toBe('GPT4');
    });

    it('should support adding rules dynamically', () => {
      normalizer.addRule({ 
        pattern: 'DynamicModel', 
        replacement: 'AddedModel', 
        priority: 100 
      });
      
      const result = normalizer.normalize('DynamicModel');
      expect(result.normalized).toBe('AddedModel');
    });
  });

  describe('hasMatch', () => {
    it('should return true for matching patterns', () => {
      expect(normalizer.hasMatch('GPT-4')).toBe(true);
      expect(normalizer.hasMatch('Chain of Thought')).toBe(true);
    });

    it('should return false for non-matching patterns', () => {
      // This might match transformer rule
      expect(normalizer.hasMatch('xyz123')).toBe(false);
    });
  });

  describe('getRules', () => {
    it('should return a copy of rules', () => {
      const rules = normalizer.getRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
      
      // Should be a copy, not the original
      rules.pop();
      expect(normalizer.getRules().length).toBeGreaterThan(rules.length);
    });
  });
});
