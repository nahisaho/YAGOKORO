/**
 * Built Cypher query with text and parameters
 */
export interface CypherQuery {
  text: string;
  params: Record<string, unknown>;
}

/**
 * Cypher Query Builder
 *
 * Provides a fluent interface for building Cypher queries.
 */
export class CypherQueryBuilder {
  private clauses: string[] = [];
  private parameters: Record<string, unknown> = {};

  /**
   * Add MATCH clause
   */
  match(pattern: string): this {
    this.clauses.push(`MATCH ${pattern}`);
    return this;
  }

  /**
   * Add OPTIONAL MATCH clause
   */
  optionalMatch(pattern: string): this {
    this.clauses.push(`OPTIONAL MATCH ${pattern}`);
    return this;
  }

  /**
   * Add CREATE clause
   */
  create(pattern: string): this {
    this.clauses.push(`CREATE ${pattern}`);
    return this;
  }

  /**
   * Add MERGE clause
   */
  merge(pattern: string): this {
    this.clauses.push(`MERGE ${pattern}`);
    return this;
  }

  /**
   * Add ON CREATE SET clause
   */
  onCreateSet(expression: string): this {
    this.clauses.push(`ON CREATE SET ${expression}`);
    return this;
  }

  /**
   * Add ON MATCH SET clause
   */
  onMatchSet(expression: string): this {
    this.clauses.push(`ON MATCH SET ${expression}`);
    return this;
  }

  /**
   * Add SET clause
   */
  set(expression: string): this {
    this.clauses.push(`SET ${expression}`);
    return this;
  }

  /**
   * Add WHERE clause
   */
  where(condition: string): this {
    this.clauses.push(`WHERE ${condition}`);
    return this;
  }

  /**
   * Add AND to WHERE clause
   */
  andWhere(condition: string): this {
    this.clauses.push(`AND ${condition}`);
    return this;
  }

  /**
   * Add OR to WHERE clause
   */
  orWhere(condition: string): this {
    this.clauses.push(`OR ${condition}`);
    return this;
  }

  /**
   * Add WITH clause
   */
  with(expression: string): this {
    this.clauses.push(`WITH ${expression}`);
    return this;
  }

  /**
   * Add UNWIND clause
   */
  unwind(expression: string): this {
    this.clauses.push(`UNWIND ${expression}`);
    return this;
  }

  /**
   * Add RETURN clause
   */
  return(expression: string): this {
    this.clauses.push(`RETURN ${expression}`);
    return this;
  }

  /**
   * Add ORDER BY clause
   */
  orderBy(expression: string): this {
    this.clauses.push(`ORDER BY ${expression}`);
    return this;
  }

  /**
   * Add SKIP clause
   */
  skip(count: number): this {
    this.clauses.push(`SKIP ${count}`);
    return this;
  }

  /**
   * Add LIMIT clause
   */
  limit(count: number): this {
    this.clauses.push(`LIMIT ${count}`);
    return this;
  }

  /**
   * Add DELETE clause
   */
  delete(expression: string): this {
    this.clauses.push(`DELETE ${expression}`);
    return this;
  }

  /**
   * Add DETACH DELETE clause
   */
  detachDelete(expression: string): this {
    this.clauses.push(`DETACH DELETE ${expression}`);
    return this;
  }

  /**
   * Add CALL clause for procedures
   */
  call(procedure: string): this {
    this.clauses.push(`CALL ${procedure}`);
    return this;
  }

  /**
   * Add a parameter
   */
  param(name: string, value: unknown): this {
    this.parameters[name] = value;
    return this;
  }

  /**
   * Add multiple parameters
   */
  params(params: Record<string, unknown>): this {
    Object.assign(this.parameters, params);
    return this;
  }

  /**
   * Add raw Cypher clause
   */
  raw(clause: string): this {
    this.clauses.push(clause);
    return this;
  }

  /**
   * Build the final query
   */
  build(): CypherQuery {
    return {
      text: this.clauses.join(' '),
      params: { ...this.parameters },
    };
  }

  /**
   * Reset the builder for reuse
   */
  reset(): this {
    this.clauses = [];
    this.parameters = {};
    return this;
  }
}
