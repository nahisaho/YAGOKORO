import { describe, it, expect } from 'vitest';
import { computeChecksum, parseCypherStatements } from './MigrationRunner.js';

describe('MigrationRunner', () => {
  describe('computeChecksum()', () => {
    it('should return consistent checksum for same content', () => {
      const content = 'CREATE INDEX foo IF NOT EXISTS FOR (n:Node) ON (n.id);';
      const checksum1 = computeChecksum(content);
      const checksum2 = computeChecksum(content);
      expect(checksum1).toBe(checksum2);
    });

    it('should return different checksum for different content', () => {
      const content1 = 'CREATE INDEX foo IF NOT EXISTS FOR (n:Node) ON (n.id);';
      const content2 = 'CREATE INDEX bar IF NOT EXISTS FOR (n:Node) ON (n.id);';
      const checksum1 = computeChecksum(content1);
      const checksum2 = computeChecksum(content2);
      expect(checksum1).not.toBe(checksum2);
    });

    it('should return 8-character hex string', () => {
      const checksum = computeChecksum('test content');
      expect(checksum).toMatch(/^[0-9a-f]{8}$/);
    });
  });

  describe('parseCypherStatements()', () => {
    it('should parse single statement', () => {
      const content = 'CREATE INDEX foo IF NOT EXISTS FOR (n:Node) ON (n.id);';
      const statements = parseCypherStatements(content);
      expect(statements).toHaveLength(1);
      expect(statements[0]).toBe('CREATE INDEX foo IF NOT EXISTS FOR (n:Node) ON (n.id)');
    });

    it('should parse multiple statements', () => {
      const content = `
CREATE INDEX foo IF NOT EXISTS FOR (n:Node) ON (n.id);
CREATE INDEX bar IF NOT EXISTS FOR (n:Node) ON (n.name);
`;
      const statements = parseCypherStatements(content);
      expect(statements).toHaveLength(2);
    });

    it('should ignore single-line comments', () => {
      const content = `
// This is a comment
CREATE INDEX foo IF NOT EXISTS FOR (n:Node) ON (n.id);
// Another comment
CREATE INDEX bar IF NOT EXISTS FOR (n:Node) ON (n.name);
`;
      const statements = parseCypherStatements(content);
      expect(statements).toHaveLength(2);
      expect(statements[0]).toContain('CREATE INDEX foo');
      expect(statements[1]).toContain('CREATE INDEX bar');
    });

    it('should handle multi-line statements', () => {
      const content = `
CREATE (tm:TrendMetrics {
  entityId: string,
  date: date,
  citationCount: integer
});
`;
      const statements = parseCypherStatements(content);
      expect(statements).toHaveLength(1);
      expect(statements[0]).toContain('TrendMetrics');
    });

    it('should filter empty statements', () => {
      const content = `
CREATE INDEX foo IF NOT EXISTS FOR (n:Node) ON (n.id);

;

CREATE INDEX bar IF NOT EXISTS FOR (n:Node) ON (n.name);
`;
      const statements = parseCypherStatements(content);
      expect(statements).toHaveLength(2);
    });

    it('should parse complex migration file', () => {
      const content = `
// ============================================
// v4.0.0 Schema Extensions - Temporal
// ============================================

// Index for publication date
CREATE INDEX entity_publication_date IF NOT EXISTS
FOR (n:AIModel) ON (n.publicationDate);

// Constraint for TrendMetrics
CREATE CONSTRAINT trend_metrics_unique IF NOT EXISTS
FOR (tm:TrendMetrics)
REQUIRE (tm.entityId, tm.date) IS UNIQUE;

// Composite index
CREATE INDEX trend_metrics_entity_date IF NOT EXISTS
FOR (tm:TrendMetrics) ON (tm.entityId, tm.date);
`;
      const statements = parseCypherStatements(content);
      expect(statements).toHaveLength(3);
      expect(statements[0]).toContain('entity_publication_date');
      expect(statements[1]).toContain('trend_metrics_unique');
      expect(statements[2]).toContain('trend_metrics_entity_date');
    });
  });
});
