import { describe, expect, it } from 'vitest';
import { EntityId } from '../value-objects/EntityId.js';
import { Benchmark } from './Benchmark.js';

describe('Benchmark', () => {
  const createValidProps = () => ({
    name: 'MMLU',
    category: 'reasoning' as const,
    description: 'Massive Multitask Language Understanding benchmark',
    url: 'https://github.com/hendrycks/test',
    metric: 'accuracy',
  });

  describe('create', () => {
    it('should create a valid Benchmark', () => {
      const bench = Benchmark.create(createValidProps());

      expect(bench.name).toBe('MMLU');
      expect(bench.category).toBe('reasoning');
      expect(bench.id.prefix).toBe('bench');
    });

    it('should require name', () => {
      const props = createValidProps();
      props.name = '';
      expect(() => Benchmark.create(props)).toThrow();
    });
  });

  describe('restore', () => {
    it('should restore a Benchmark from stored data', () => {
      const id = EntityId.create('bench');
      const bench = Benchmark.restore(id, createValidProps());

      expect(bench.id.equals(id)).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const bench = Benchmark.create(createValidProps());
      const json = bench.toJSON();

      expect(json.entityType).toBe('Benchmark');
      expect(json.name).toBe('MMLU');
    });
  });
});
