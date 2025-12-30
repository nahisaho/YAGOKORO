import { describe, expect, it } from 'vitest';
import { Confidence } from '../value-objects/Confidence.js';
import { EntityId } from '../value-objects/EntityId.js';
import { type AIModality, AIModel, type AIModelCategory } from './AIModel.js';

describe('AIModel', () => {
  const createValidProps = () => ({
    name: 'GPT-4',
    category: 'llm' as AIModelCategory,
    modality: ['text'] as AIModality[],
    releaseDate: '2023-03-14',
    description: 'Large language model by OpenAI',
    parameters: '1.76T',
    contextWindow: 128000,
    trainingData: 'Web data up to Sep 2021',
    license: 'Proprietary',
    paperUrl: 'https://arxiv.org/abs/2303.08774',
  });

  describe('create', () => {
    it('should create a valid AIModel', () => {
      const model = AIModel.create(createValidProps());

      expect(model.name).toBe('GPT-4');
      expect(model.category).toBe('llm');
      expect(model.modality).toEqual(['text']);
      expect(model.releaseDate).toBe('2023-03-14');
      expect(model.id).toBeDefined();
      expect(model.id.prefix).toBe('model');
    });

    it('should require name', () => {
      const props = createValidProps();
      props.name = '';
      expect(() => AIModel.create(props)).toThrow();
    });

    it('should accept multimodal models', () => {
      const props = createValidProps();
      props.modality = ['text', 'image', 'audio'];
      const model = AIModel.create(props);
      expect(model.modality).toEqual(['text', 'image', 'audio']);
    });
  });

  describe('restore', () => {
    it('should restore an AIModel from stored data', () => {
      const id = EntityId.create('model');
      const props = {
        ...createValidProps(),
        confidence: 0.9,
        embedding: [0.1, 0.2, 0.3],
      };

      const model = AIModel.restore(id, props);

      expect(model.id.equals(id)).toBe(true);
      expect(model.name).toBe('GPT-4');
      expect(model.confidence?.value).toBe(0.9);
      expect(model.embedding).toEqual([0.1, 0.2, 0.3]);
    });
  });

  describe('updateConfidence', () => {
    it('should update confidence value', () => {
      const model = AIModel.create(createValidProps());
      const newConfidence = Confidence.create(0.95);

      const updated = model.updateConfidence(newConfidence);

      expect(updated.confidence?.value).toBe(0.95);
      expect(updated.id.equals(model.id)).toBe(true);
    });
  });

  describe('setEmbedding', () => {
    it('should set embedding vector', () => {
      const model = AIModel.create(createValidProps());
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];

      const updated = model.setEmbedding(embedding);

      expect(updated.embedding).toEqual(embedding);
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const model = AIModel.create(createValidProps());
      const json = model.toJSON();

      expect(json.id).toBeDefined();
      expect(json.name).toBe('GPT-4');
      expect(json.category).toBe('llm');
      expect(json.entityType).toBe('AIModel');
    });
  });
});
