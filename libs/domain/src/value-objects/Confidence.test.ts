import { describe, expect, it } from 'vitest';
import { Confidence } from './Confidence.js';

describe('Confidence', () => {
  describe('create', () => {
    it('should create a valid Confidence with value between 0 and 1', () => {
      const conf = Confidence.create(0.85);
      expect(conf.value).toBe(0.85);
    });

    it('should accept 0 as minimum value', () => {
      const conf = Confidence.create(0);
      expect(conf.value).toBe(0);
    });

    it('should accept 1 as maximum value', () => {
      const conf = Confidence.create(1);
      expect(conf.value).toBe(1);
    });

    it('should throw error for value less than 0', () => {
      expect(() => Confidence.create(-0.1)).toThrow();
    });

    it('should throw error for value greater than 1', () => {
      expect(() => Confidence.create(1.1)).toThrow();
    });
  });

  describe('isHigh', () => {
    it('should return true for confidence >= 0.8', () => {
      expect(Confidence.create(0.8).isHigh()).toBe(true);
      expect(Confidence.create(0.9).isHigh()).toBe(true);
      expect(Confidence.create(1.0).isHigh()).toBe(true);
    });

    it('should return false for confidence < 0.8', () => {
      expect(Confidence.create(0.79).isHigh()).toBe(false);
      expect(Confidence.create(0.5).isHigh()).toBe(false);
    });
  });

  describe('isMedium', () => {
    it('should return true for confidence between 0.5 and 0.8', () => {
      expect(Confidence.create(0.5).isMedium()).toBe(true);
      expect(Confidence.create(0.6).isMedium()).toBe(true);
      expect(Confidence.create(0.79).isMedium()).toBe(true);
    });

    it('should return false for confidence outside range', () => {
      expect(Confidence.create(0.49).isMedium()).toBe(false);
      expect(Confidence.create(0.8).isMedium()).toBe(false);
    });
  });

  describe('isLow', () => {
    it('should return true for confidence < 0.5', () => {
      expect(Confidence.create(0.49).isLow()).toBe(true);
      expect(Confidence.create(0.1).isLow()).toBe(true);
      expect(Confidence.create(0).isLow()).toBe(true);
    });

    it('should return false for confidence >= 0.5', () => {
      expect(Confidence.create(0.5).isLow()).toBe(false);
    });
  });

  describe('combine', () => {
    it('should multiply confidence values', () => {
      const conf1 = Confidence.create(0.8);
      const conf2 = Confidence.create(0.9);
      const combined = conf1.combine(conf2);
      expect(combined.value).toBeCloseTo(0.72, 2);
    });
  });

  describe('toString', () => {
    it('should return percentage string', () => {
      const conf = Confidence.create(0.856);
      expect(conf.toString()).toBe('85.6%');
    });
  });
});
