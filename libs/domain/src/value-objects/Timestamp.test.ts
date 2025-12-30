import { describe, expect, it } from 'vitest';
import { Timestamp } from './Timestamp.js';

describe('Timestamp', () => {
  describe('now', () => {
    it('should create a timestamp with current time', () => {
      const before = Date.now();
      const ts = Timestamp.now();
      const after = Date.now();

      expect(ts.value.getTime()).toBeGreaterThanOrEqual(before);
      expect(ts.value.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('fromDate', () => {
    it('should create a timestamp from Date object', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const ts = Timestamp.fromDate(date);
      expect(ts.value.getTime()).toBe(date.getTime());
    });
  });

  describe('fromISO', () => {
    it('should create a timestamp from ISO string', () => {
      const ts = Timestamp.fromISO('2024-01-15T10:30:00Z');
      expect(ts.toISO()).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should throw error for invalid ISO string', () => {
      expect(() => Timestamp.fromISO('invalid')).toThrow();
    });
  });

  describe('toISO', () => {
    it('should return ISO 8601 string', () => {
      const ts = Timestamp.fromISO('2024-01-15T10:30:00Z');
      expect(ts.toISO()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });
  });

  describe('isBefore', () => {
    it('should return true if timestamp is before other', () => {
      const ts1 = Timestamp.fromISO('2024-01-15T10:00:00Z');
      const ts2 = Timestamp.fromISO('2024-01-15T11:00:00Z');
      expect(ts1.isBefore(ts2)).toBe(true);
    });

    it('should return false if timestamp is after other', () => {
      const ts1 = Timestamp.fromISO('2024-01-15T11:00:00Z');
      const ts2 = Timestamp.fromISO('2024-01-15T10:00:00Z');
      expect(ts1.isBefore(ts2)).toBe(false);
    });
  });

  describe('isAfter', () => {
    it('should return true if timestamp is after other', () => {
      const ts1 = Timestamp.fromISO('2024-01-15T11:00:00Z');
      const ts2 = Timestamp.fromISO('2024-01-15T10:00:00Z');
      expect(ts1.isAfter(ts2)).toBe(true);
    });
  });
});
