/**
 * MultilingualMetadataSchema - Neo4j schema extension for multilingual metadata
 *
 * REQ-008-04: Metadata preservation
 * TASK-02-ML-013: Neo4j schema extension
 */

import type { SupportedLanguage, CrossLingualLink } from '../types.js';

/**
 * Multilingual metadata node schema for Neo4j
 */
export interface MultilingualMetadataNode {
  /** Unique ID for the metadata */
  id: string;
  /** Reference to the paper ID */
  paperId: string;
  /** Original language of the paper */
  originalLanguage: SupportedLanguage;
  /** Original title in source language */
  originalTitle: string;
  /** Translated title (English) */
  translatedTitle?: string;
  /** Original abstract in source language */
  originalAbstract: string;
  /** Translated abstract (English) */
  translatedAbstract?: string;
  /** Language detection confidence */
  languageConfidence: number;
  /** Processing timestamp */
  processedAt: string; // ISO 8601 format
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
}

/**
 * Cross-lingual link relationship schema
 */
export interface CrossLingualLinkRelationship {
  /** Source entity ID */
  sourceEntityId: string;
  /** Target entity ID */
  targetEntityId: string;
  /** Similarity score */
  similarity: number;
  /** Link type */
  linkType: 'exact' | 'semantic' | 'partial';
  /** Whether auto-linked */
  autoLinked: boolean;
  /** Created timestamp */
  createdAt: string;
}

/**
 * Cypher queries for multilingual operations
 */
export const MULTILINGUAL_CYPHER = {
  /**
   * Create multilingual metadata constraint
   */
  CREATE_METADATA_CONSTRAINT: `
    CREATE CONSTRAINT multilingual_metadata_id IF NOT EXISTS
    FOR (m:MultilingualMetadata)
    REQUIRE m.id IS UNIQUE
  `,

  /**
   * Create index on paper ID for fast lookups
   */
  CREATE_PAPER_INDEX: `
    CREATE INDEX multilingual_paper_id IF NOT EXISTS
    FOR (m:MultilingualMetadata)
    ON (m.paperId)
  `,

  /**
   * Create index on original language
   */
  CREATE_LANGUAGE_INDEX: `
    CREATE INDEX multilingual_language IF NOT EXISTS
    FOR (m:MultilingualMetadata)
    ON (m.originalLanguage)
  `,

  /**
   * Create multilingual metadata node
   */
  CREATE_METADATA: `
    MERGE (m:MultilingualMetadata {paperId: $paperId})
    ON CREATE SET
      m.id = randomUUID(),
      m.originalLanguage = $originalLanguage,
      m.originalTitle = $originalTitle,
      m.translatedTitle = $translatedTitle,
      m.originalAbstract = $originalAbstract,
      m.translatedAbstract = $translatedAbstract,
      m.languageConfidence = $languageConfidence,
      m.processedAt = $processedAt,
      m.createdAt = datetime(),
      m.updatedAt = datetime()
    ON MATCH SET
      m.originalLanguage = $originalLanguage,
      m.originalTitle = $originalTitle,
      m.translatedTitle = $translatedTitle,
      m.originalAbstract = $originalAbstract,
      m.translatedAbstract = $translatedAbstract,
      m.languageConfidence = $languageConfidence,
      m.processedAt = $processedAt,
      m.updatedAt = datetime()
    RETURN m
  `,

  /**
   * Link multilingual metadata to paper
   */
  LINK_TO_PAPER: `
    MATCH (p:Paper {id: $paperId})
    MATCH (m:MultilingualMetadata {paperId: $paperId})
    MERGE (p)-[:HAS_MULTILINGUAL_METADATA]->(m)
    RETURN p, m
  `,

  /**
   * Create cross-lingual link
   */
  CREATE_CROSS_LINK: `
    MATCH (source:Entity {id: $sourceEntityId})
    MATCH (target:Entity {id: $targetEntityId})
    MERGE (source)-[r:CROSS_LINGUAL_LINK {
      similarity: $similarity,
      linkType: $linkType,
      autoLinked: $autoLinked
    }]->(target)
    ON CREATE SET r.createdAt = datetime()
    RETURN r
  `,

  /**
   * Get multilingual metadata for a paper
   */
  GET_METADATA_BY_PAPER: `
    MATCH (p:Paper {id: $paperId})-[:HAS_MULTILINGUAL_METADATA]->(m:MultilingualMetadata)
    RETURN m
  `,

  /**
   * Get papers by language
   */
  GET_PAPERS_BY_LANGUAGE: `
    MATCH (m:MultilingualMetadata {originalLanguage: $language})
    MATCH (p:Paper {id: m.paperId})
    RETURN p, m
    ORDER BY m.processedAt DESC
    LIMIT $limit
  `,

  /**
   * Get cross-lingual links for an entity
   */
  GET_CROSS_LINKS: `
    MATCH (e:Entity {id: $entityId})-[r:CROSS_LINGUAL_LINK]-(linked)
    RETURN e, r, linked
  `,

  /**
   * Count papers by language
   */
  COUNT_BY_LANGUAGE: `
    MATCH (m:MultilingualMetadata)
    RETURN m.originalLanguage AS language, COUNT(m) AS count
    ORDER BY count DESC
  `,

  /**
   * Get entities needing manual linking review
   */
  GET_REVIEW_QUEUE: `
    MATCH (e:Entity)
    WHERE NOT (e)-[:CROSS_LINGUAL_LINK]-()
    AND e.language <> 'en'
    RETURN e
    LIMIT $limit
  `,
};

/**
 * Migration script for multilingual schema
 */
export async function runMigration(driver: any): Promise<void> {
  const session = driver.session();
  
  try {
    // Create constraints and indexes
    await session.run(MULTILINGUAL_CYPHER.CREATE_METADATA_CONSTRAINT);
    await session.run(MULTILINGUAL_CYPHER.CREATE_PAPER_INDEX);
    await session.run(MULTILINGUAL_CYPHER.CREATE_LANGUAGE_INDEX);
    
    console.log('[Migration] Multilingual schema migration completed');
  } finally {
    await session.close();
  }
}

/**
 * MultilingualMetadataRepository - Repository for multilingual metadata operations
 */
export class MultilingualMetadataRepository {
  constructor(private readonly driver: any) {}

  /**
   * Save multilingual metadata
   */
  async save(metadata: {
    paperId: string;
    originalLanguage: SupportedLanguage;
    originalTitle: string;
    translatedTitle?: string;
    originalAbstract: string;
    translatedAbstract?: string;
    languageConfidence: number;
    processedAt: Date;
  }): Promise<MultilingualMetadataNode> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(MULTILINGUAL_CYPHER.CREATE_METADATA, {
        paperId: metadata.paperId,
        originalLanguage: metadata.originalLanguage,
        originalTitle: metadata.originalTitle,
        translatedTitle: metadata.translatedTitle ?? null,
        originalAbstract: metadata.originalAbstract,
        translatedAbstract: metadata.translatedAbstract ?? null,
        languageConfidence: metadata.languageConfidence,
        processedAt: metadata.processedAt.toISOString(),
      });

      // Link to paper
      await session.run(MULTILINGUAL_CYPHER.LINK_TO_PAPER, {
        paperId: metadata.paperId,
      });

      const record = result.records[0];
      return record?.get('m').properties as MultilingualMetadataNode;
    } finally {
      await session.close();
    }
  }

  /**
   * Get metadata by paper ID
   */
  async getByPaperId(paperId: string): Promise<MultilingualMetadataNode | null> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(MULTILINGUAL_CYPHER.GET_METADATA_BY_PAPER, {
        paperId,
      });

      if (result.records.length === 0) {
        return null;
      }

      return result.records[0]?.get('m').properties as MultilingualMetadataNode;
    } finally {
      await session.close();
    }
  }

  /**
   * Get papers by language
   */
  async getByLanguage(
    language: SupportedLanguage,
    limit: number = 100
  ): Promise<MultilingualMetadataNode[]> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(MULTILINGUAL_CYPHER.GET_PAPERS_BY_LANGUAGE, {
        language,
        limit,
      });

      return result.records.map(
        (record: any) => record.get('m').properties as MultilingualMetadataNode
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Save cross-lingual link
   */
  async saveCrossLink(link: CrossLingualLink, sourceEntityId: string): Promise<void> {
    const session = this.driver.session();
    
    try {
      await session.run(MULTILINGUAL_CYPHER.CREATE_CROSS_LINK, {
        sourceEntityId,
        targetEntityId: link.targetEntityId,
        similarity: link.similarity,
        linkType: link.linkType,
        autoLinked: link.autoLinked,
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Get language statistics
   */
  async getLanguageStats(): Promise<Map<SupportedLanguage, number>> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(MULTILINGUAL_CYPHER.COUNT_BY_LANGUAGE);
      const stats = new Map<SupportedLanguage, number>();

      for (const record of result.records) {
        const language = record.get('language') as SupportedLanguage;
        const count = record.get('count').toNumber() as number;
        stats.set(language, count);
      }

      return stats;
    } finally {
      await session.close();
    }
  }
}
