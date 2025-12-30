import { describe, expect, it } from 'vitest';
import { CypherQueryBuilder } from './CypherQueryBuilder.js';

describe('CypherQueryBuilder', () => {
  describe('match', () => {
    it('should build basic match query', () => {
      const query = new CypherQueryBuilder().match('(n:AIModel)').return('n').build();

      expect(query.text).toBe('MATCH (n:AIModel) RETURN n');
    });

    it('should build match with where clause', () => {
      const query = new CypherQueryBuilder()
        .match('(n:AIModel)')
        .where('n.name = $name')
        .param('name', 'GPT-4')
        .return('n')
        .build();

      expect(query.text).toBe('MATCH (n:AIModel) WHERE n.name = $name RETURN n');
      expect(query.params.name).toBe('GPT-4');
    });

    it('should build match with multiple where clauses', () => {
      const query = new CypherQueryBuilder()
        .match('(n:AIModel)')
        .where('n.name = $name')
        .andWhere('n.releaseYear = $year')
        .param('name', 'GPT-4')
        .param('year', '2023')
        .return('n')
        .build();

      expect(query.text).toContain('WHERE n.name = $name AND n.releaseYear = $year');
    });
  });

  describe('create', () => {
    it('should build create node query', () => {
      const query = new CypherQueryBuilder()
        .create('(n:AIModel $props)')
        .param('props', { name: 'GPT-4' })
        .return('n')
        .build();

      expect(query.text).toBe('CREATE (n:AIModel $props) RETURN n');
      expect(query.params.props).toEqual({ name: 'GPT-4' });
    });
  });

  describe('merge', () => {
    it('should build merge query', () => {
      const query = new CypherQueryBuilder()
        .merge('(n:AIModel {id: $id})')
        .onCreateSet('n += $props')
        .param('id', 'model_123')
        .param('props', { name: 'GPT-4' })
        .return('n')
        .build();

      expect(query.text).toContain('MERGE (n:AIModel {id: $id})');
      expect(query.text).toContain('ON CREATE SET n += $props');
    });
  });

  describe('relationship', () => {
    it('should build relationship match query', () => {
      const query = new CypherQueryBuilder()
        .match('(a:AIModel)-[r:DEVELOPED_BY]->(b:Organization)')
        .where('a.id = $id')
        .param('id', 'model_123')
        .return('a, r, b')
        .build();

      expect(query.text).toContain('MATCH (a:AIModel)-[r:DEVELOPED_BY]->(b:Organization)');
    });

    it('should build create relationship query', () => {
      const query = new CypherQueryBuilder()
        .match('(a:AIModel {id: $sourceId})')
        .match('(b:Organization {id: $targetId})')
        .create('(a)-[r:DEVELOPED_BY $props]->(b)')
        .param('sourceId', 'model_123')
        .param('targetId', 'org_456')
        .param('props', { confidence: 0.9 })
        .return('r')
        .build();

      expect(query.text).toContain('CREATE (a)-[r:DEVELOPED_BY $props]->(b)');
    });
  });

  describe('delete', () => {
    it('should build delete query', () => {
      const query = new CypherQueryBuilder()
        .match('(n:AIModel {id: $id})')
        .param('id', 'model_123')
        .delete('n')
        .build();

      expect(query.text).toBe('MATCH (n:AIModel {id: $id}) DELETE n');
    });

    it('should build detach delete query', () => {
      const query = new CypherQueryBuilder()
        .match('(n:AIModel {id: $id})')
        .param('id', 'model_123')
        .detachDelete('n')
        .build();

      expect(query.text).toBe('MATCH (n:AIModel {id: $id}) DETACH DELETE n');
    });
  });

  describe('orderBy and limit', () => {
    it('should build query with order and limit', () => {
      const query = new CypherQueryBuilder()
        .match('(n:AIModel)')
        .return('n')
        .orderBy('n.releaseYear DESC')
        .limit(10)
        .skip(5)
        .build();

      expect(query.text).toContain('ORDER BY n.releaseYear DESC');
      expect(query.text).toContain('LIMIT 10');
      expect(query.text).toContain('SKIP 5');
    });
  });
});
