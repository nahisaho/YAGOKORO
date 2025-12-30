/**
 * YAGOKORO シードデータインジェストスクリプト
 * 
 * Generative AI系譜データをNeo4j/Qdrantに投入
 * 
 * Usage:
 *   npx tsx seed/ingest.ts           # 全データ投入
 *   npx tsx seed/ingest.ts --dry-run # プレビューのみ
 */

import neo4j, { Driver, Session } from 'neo4j-driver';
import { seedData, type SeedRelation } from './genai-knowledge.js';

// =============================================================================
// Configuration
// =============================================================================

const config = {
  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'password',
  },
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    collection: 'yagokoro_entities',
  },
  dryRun: process.argv.includes('--dry-run'),
};

// =============================================================================
// Neo4j Connection
// =============================================================================

let driver: Driver | null = null;

async function getDriver(): Promise<Driver> {
  if (!driver) {
    driver = neo4j.driver(
      config.neo4j.uri,
      neo4j.auth.basic(config.neo4j.user, config.neo4j.password)
    );
    // Verify connectivity
    await driver.verifyConnectivity();
    console.log('✅ Connected to Neo4j');
  }
  return driver;
}

async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

// =============================================================================
// Qdrant Connection
// =============================================================================

async function checkQdrant(): Promise<boolean> {
  try {
    const response = await fetch(`${config.qdrant.url}/health`);
    if (response.ok) {
      console.log('✅ Connected to Qdrant');
      return true;
    }
    return false;
  } catch {
    console.warn('⚠️  Qdrant not available (vector embeddings will be skipped)');
    return false;
  }
}

async function createQdrantCollection(): Promise<void> {
  try {
    // Check if collection exists
    const checkResponse = await fetch(`${config.qdrant.url}/collections/${config.qdrant.collection}`);
    if (checkResponse.ok) {
      console.log(`  Collection '${config.qdrant.collection}' already exists`);
      return;
    }

    // Create collection
    const createResponse = await fetch(`${config.qdrant.url}/collections/${config.qdrant.collection}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vectors: {
          size: 1536, // text-embedding-3-small dimensions
          distance: 'Cosine',
        },
      }),
    });

    if (createResponse.ok) {
      console.log(`  Created collection '${config.qdrant.collection}'`);
    } else {
      console.warn(`  Failed to create collection: ${await createResponse.text()}`);
    }
  } catch (error) {
    console.warn('  Failed to create Qdrant collection:', error);
  }
}

// =============================================================================
// ID Generation
// =============================================================================

function generateId(): string {
  return crypto.randomUUID();
}

// =============================================================================
// Neo4j Schema Setup
// =============================================================================

async function setupSchema(session: Session): Promise<void> {
  console.log('\n📋 Setting up Neo4j schema...\n');

  const constraints = [
    'CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE',
    'CREATE CONSTRAINT organization_name IF NOT EXISTS FOR (o:Organization) REQUIRE o.name IS UNIQUE',
    'CREATE CONSTRAINT person_name IF NOT EXISTS FOR (p:Person) REQUIRE p.name IS UNIQUE',
    'CREATE CONSTRAINT aimodel_name IF NOT EXISTS FOR (a:AIModel) REQUIRE a.name IS UNIQUE',
    'CREATE CONSTRAINT technique_name IF NOT EXISTS FOR (t:Technique) REQUIRE t.name IS UNIQUE',
    'CREATE CONSTRAINT publication_name IF NOT EXISTS FOR (p:Publication) REQUIRE p.name IS UNIQUE',
    'CREATE CONSTRAINT benchmark_name IF NOT EXISTS FOR (b:Benchmark) REQUIRE b.name IS UNIQUE',
    'CREATE CONSTRAINT concept_name IF NOT EXISTS FOR (c:Concept) REQUIRE c.name IS UNIQUE',
  ];

  for (const constraint of constraints) {
    try {
      await session.run(constraint);
    } catch (error: any) {
      // Ignore if constraint already exists
      if (!error.message?.includes('already exists')) {
        console.warn(`  Warning: ${error.message}`);
      }
    }
  }

  console.log('  Schema constraints created');
}

// =============================================================================
// Entity Ingestion
// =============================================================================

async function ingestEntities(session: Session): Promise<Map<string, string>> {
  const nameToId = new Map<string, string>();
  
  console.log('\n📦 Ingesting entities...\n');
  
  const allEntities = [
    ...seedData.organizations.map(e => ({ ...e, labels: ['Entity', 'Organization'] })),
    ...seedData.persons.map(e => ({ ...e, labels: ['Entity', 'Person'] })),
    ...seedData.techniques.map(e => ({ ...e, labels: ['Entity', 'Technique'] })),
    ...seedData.aiModels.map(e => ({ ...e, labels: ['Entity', 'AIModel'] })),
    ...seedData.publications.map(e => ({ ...e, labels: ['Entity', 'Publication'] })),
    ...seedData.benchmarks.map(e => ({ ...e, labels: ['Entity', 'Benchmark'] })),
    ...seedData.concepts.map(e => ({ ...e, labels: ['Entity', 'Concept'] })),
  ];

  // Group by type for display
  const byType = new Map<string, typeof allEntities>();
  for (const entity of allEntities) {
    const list = byType.get(entity.type) || [];
    list.push(entity);
    byType.set(entity.type, list);
  }

  for (const [type, entities] of byType) {
    console.log(`  ${type}: ${entities.length} entities`);
    
    for (const entity of entities) {
      const id = generateId();
      nameToId.set(`${entity.type}:${entity.name}`, id);
      
      if (!config.dryRun) {
        const labels = entity.labels.join(':');
        const query = `
          CREATE (e:${labels} {
            id: $id,
            type: $type,
            name: $name,
            description: $description,
            properties: $properties,
            createdAt: datetime(),
            updatedAt: datetime()
          })
        `;
        
        await session.run(query, {
          id,
          type: entity.type,
          name: entity.name,
          description: entity.description,
          properties: JSON.stringify(entity.properties),
        });
      }
    }
  }

  return nameToId;
}

// =============================================================================
// Relation Ingestion
// =============================================================================

async function ingestRelations(session: Session, nameToId: Map<string, string>): Promise<number> {
  console.log('\n🔗 Ingesting relations...\n');
  
  let count = 0;
  const relationsByType = new Map<string, number>();

  for (const rel of seedData.relations) {
    const sourceKey = `${rel.sourceType}:${rel.sourceName}`;
    const targetKey = `${rel.targetType}:${rel.targetName}`;
    
    const sourceId = nameToId.get(sourceKey);
    const targetId = nameToId.get(targetKey);
    
    if (!sourceId) {
      console.warn(`  ⚠️  Source not found: ${sourceKey}`);
      continue;
    }
    if (!targetId) {
      console.warn(`  ⚠️  Target not found: ${targetKey}`);
      continue;
    }

    if (!config.dryRun) {
      const query = `
        MATCH (source {id: $sourceId})
        MATCH (target {id: $targetId})
        CREATE (source)-[r:${rel.relationType} {
          properties: $properties,
          confidence: 1.0,
          createdAt: datetime()
        }]->(target)
      `;
      
      await session.run(query, {
        sourceId,
        targetId,
        properties: JSON.stringify(rel.properties || {}),
      });
    }

    relationsByType.set(rel.relationType, (relationsByType.get(rel.relationType) || 0) + 1);
    count++;
  }

  for (const [type, typeCount] of relationsByType) {
    console.log(`  ${type}: ${typeCount} relations`);
  }

  return count;
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          YAGOKORO Seed Data Ingestion                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  if (config.dryRun) {
    console.log('\n🔍 DRY RUN MODE - No data will be written\n');
  }

  const startTime = Date.now();

  try {
    // Summary of seed data
    console.log('\n📊 Seed Data Summary:');
    console.log(`  Organizations: ${seedData.organizations.length}`);
    console.log(`  Persons:       ${seedData.persons.length}`);
    console.log(`  Techniques:    ${seedData.techniques.length}`);
    console.log(`  AI Models:     ${seedData.aiModels.length}`);
    console.log(`  Publications:  ${seedData.publications.length}`);
    console.log(`  Benchmarks:    ${seedData.benchmarks.length}`);
    console.log(`  Concepts:      ${seedData.concepts.length}`);
    console.log(`  Relations:     ${seedData.relations.length}`);
    
    const totalEntities = 
      seedData.organizations.length +
      seedData.persons.length +
      seedData.techniques.length +
      seedData.aiModels.length +
      seedData.publications.length +
      seedData.benchmarks.length +
      seedData.concepts.length;
    
    console.log(`  ─────────────────────────`);
    console.log(`  Total:         ${totalEntities} entities, ${seedData.relations.length} relations`);

    // Connect to databases
    if (!config.dryRun) {
      const neo4jDriver = await getDriver();
      const session = neo4jDriver.session();
      const qdrantAvailable = await checkQdrant();

      try {
        // Setup schema
        await setupSchema(session);

        // Create Qdrant collection if available
        if (qdrantAvailable) {
          await createQdrantCollection();
        }

        // Ingest entities
        const nameToId = await ingestEntities(session);
        
        // Ingest relations
        const relationCount = await ingestRelations(session, nameToId);
        
        const duration = (Date.now() - startTime) / 1000;
        
        console.log('\n✅ Ingestion complete!');
        console.log(`   Duration: ${duration.toFixed(2)}s`);
        console.log(`   Entities: ${nameToId.size}`);
        console.log(`   Relations: ${relationCount}`);

      } finally {
        await session.close();
        await closeDriver();
      }
    } else {
      // Dry run mode - just simulate
      const nameToId = new Map<string, string>();
      
      const allEntities = [
        ...seedData.organizations,
        ...seedData.persons,
        ...seedData.techniques,
        ...seedData.aiModels,
        ...seedData.publications,
        ...seedData.benchmarks,
        ...seedData.concepts,
      ];

      for (const entity of allEntities) {
        nameToId.set(`${entity.type}:${entity.name}`, generateId());
      }

      // Group by type for display
      const byType = new Map<string, number>();
      for (const entity of allEntities) {
        byType.set(entity.type, (byType.get(entity.type) || 0) + 1);
      }

      console.log('\n📦 Would ingest entities...\n');
      for (const [type, count] of byType) {
        console.log(`  ${type}: ${count} entities`);
      }

      console.log('\n🔗 Would ingest relations...\n');
      const relationsByType = new Map<string, number>();
      for (const rel of seedData.relations) {
        relationsByType.set(rel.relationType, (relationsByType.get(rel.relationType) || 0) + 1);
      }
      for (const [type, count] of relationsByType) {
        console.log(`  ${type}: ${count} relations`);
      }

      const duration = (Date.now() - startTime) / 1000;
      
      console.log('\n✅ Dry run complete!');
      console.log(`   Duration: ${duration.toFixed(2)}s`);
      console.log(`   Entities: ${nameToId.size}`);
      console.log(`   Relations: ${seedData.relations.length}`);
      console.log('\n💡 Run without --dry-run to actually ingest data');
    }

  } catch (error) {
    console.error('\n❌ Ingestion failed:', error);
    await closeDriver();
    process.exit(1);
  }
}

// Run
main();
