/**
 * YAGOKORO 追加シードデータインジェストスクリプト
 * 
 * 拡張データをNeo4j/Qdrantに投入
 * 
 * Usage:
 *   npx tsx seed/ingest-extended.ts           # 追加データ投入
 *   npx tsx seed/ingest-extended.ts --dry-run # プレビューのみ
 */

import neo4j, { Driver, Session } from 'neo4j-driver';
import { additionalSeedData } from './genai-knowledge-extended.js';

// =============================================================================
// Configuration
// =============================================================================

const config = {
  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'password',
  },
  ollama: {
    url: process.env.OLLAMA_URL || 'http://192.168.224.1:11434',
    model: process.env.OLLAMA_EMBED_MODEL || 'bge-m3',
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
// Embedding
// =============================================================================

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${config.ollama.url}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.ollama.model, prompt: text }),
  });
  const data = await response.json();
  return data.embedding;
}

async function upsertQdrant(points: Array<{ id: string; vector: number[]; payload: Record<string, unknown> }>): Promise<void> {
  await fetch(`${config.qdrant.url}/collections/${config.qdrant.collection}/points`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points }),
  });
}

// =============================================================================
// ID Generation
// =============================================================================

function generateId(): string {
  return crypto.randomUUID();
}

// =============================================================================
// Entity Ingestion
// =============================================================================

async function ingestEntities(session: Session): Promise<Map<string, string>> {
  const nameToId = new Map<string, string>();
  
  console.log('\n📦 Ingesting additional entities...\n');
  
  const allEntities = [
    ...additionalSeedData.organizations.map(e => ({ ...e, labels: ['Entity', 'Organization'] })),
    ...additionalSeedData.persons.map(e => ({ ...e, labels: ['Entity', 'Person'] })),
    ...additionalSeedData.techniques.map(e => ({ ...e, labels: ['Entity', 'Technique'] })),
    ...additionalSeedData.aiModels.map(e => ({ ...e, labels: ['Entity', 'AIModel'] })),
    ...additionalSeedData.publications.map(e => ({ ...e, labels: ['Entity', 'Publication'] })),
    ...additionalSeedData.benchmarks.map(e => ({ ...e, labels: ['Entity', 'Benchmark'] })),
    ...additionalSeedData.concepts.map(e => ({ ...e, labels: ['Entity', 'Concept'] })),
  ];

  // Group by type for display
  const byType = new Map<string, typeof allEntities>();
  for (const entity of allEntities) {
    const list = byType.get(entity.type) || [];
    list.push(entity);
    byType.set(entity.type, list);
  }

  const embedBatch: Array<{ id: string; vector: number[]; payload: Record<string, unknown> }> = [];

  for (const [type, entities] of byType) {
    console.log(`  ${type}: ${entities.length} entities`);
    
    for (const entity of entities) {
      // Check if entity already exists
      const existsResult = await session.run(
        `MATCH (e:Entity {name: $name, type: $type}) RETURN e.id as id`,
        { name: entity.name, type: entity.type }
      );
      
      let id: string;
      if (existsResult.records.length > 0) {
        id = existsResult.records[0].get('id');
        console.log(`     ⏭️  ${entity.name} (already exists)`);
      } else {
        id = generateId();
        
        if (!config.dryRun) {
          const labels = entity.labels.join(':');
          await session.run(`
            CREATE (e:${labels} {
              id: $id,
              type: $type,
              name: $name,
              description: $description,
              properties: $properties,
              createdAt: datetime(),
              updatedAt: datetime()
            })
          `, {
            id,
            type: entity.type,
            name: entity.name,
            description: entity.description,
            properties: JSON.stringify(entity.properties),
          });

          // Generate embedding
          const embeddingText = `${entity.type}: ${entity.name}\n${entity.description}`;
          const vector = await generateEmbedding(embeddingText);
          embedBatch.push({
            id,
            vector,
            payload: {
              type: entity.type,
              name: entity.name,
              description: entity.description,
            },
          });

          if (embedBatch.length >= 10) {
            await upsertQdrant(embedBatch);
            embedBatch.length = 0;
          }
        }
        console.log(`     ✅ ${entity.name}`);
      }
      
      nameToId.set(`${entity.type}:${entity.name}`, id);
    }
  }

  // Flush remaining embeddings
  if (!config.dryRun && embedBatch.length > 0) {
    await upsertQdrant(embedBatch);
  }

  return nameToId;
}

// =============================================================================
// Fetch Existing Entity IDs
// =============================================================================

async function fetchExistingIds(session: Session): Promise<Map<string, string>> {
  const result = await session.run(`
    MATCH (e:Entity)
    RETURN e.type as type, e.name as name, e.id as id
  `);

  const nameToId = new Map<string, string>();
  for (const record of result.records) {
    const key = `${record.get('type')}:${record.get('name')}`;
    nameToId.set(key, record.get('id'));
  }
  return nameToId;
}

// =============================================================================
// Relation Ingestion
// =============================================================================

async function ingestRelations(session: Session, nameToId: Map<string, string>): Promise<number> {
  console.log('\n🔗 Ingesting additional relations...\n');
  
  let count = 0;
  let skipped = 0;
  const relationsByType = new Map<string, number>();

  for (const rel of additionalSeedData.relations) {
    const sourceKey = `${rel.sourceType}:${rel.sourceName}`;
    const targetKey = `${rel.targetType}:${rel.targetName}`;
    
    const sourceId = nameToId.get(sourceKey);
    const targetId = nameToId.get(targetKey);
    
    if (!sourceId) {
      console.warn(`  ⚠️  Source not found: ${sourceKey}`);
      skipped++;
      continue;
    }
    if (!targetId) {
      console.warn(`  ⚠️  Target not found: ${targetKey}`);
      skipped++;
      continue;
    }

    if (!config.dryRun) {
      // Check if relation already exists
      const existsResult = await session.run(`
        MATCH (source {id: $sourceId})-[r:${rel.relationType}]->(target {id: $targetId})
        RETURN count(r) as count
      `, { sourceId, targetId });
      
      if (existsResult.records[0].get('count').toNumber() > 0) {
        skipped++;
        continue;
      }

      await session.run(`
        MATCH (source {id: $sourceId})
        MATCH (target {id: $targetId})
        CREATE (source)-[r:${rel.relationType} {
          properties: $properties,
          confidence: 1.0,
          createdAt: datetime()
        }]->(target)
      `, {
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
  
  if (skipped > 0) {
    console.log(`  (${skipped} skipped - already exist or missing entities)`);
  }

  return count;
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       YAGOKORO Extended Seed Data Ingestion                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  if (config.dryRun) {
    console.log('\n🔍 DRY RUN MODE - No data will be written\n');
  }

  const startTime = Date.now();

  try {
    // Summary
    console.log('\n📊 Additional Seed Data Summary:');
    console.log(`  Organizations: ${additionalSeedData.organizations.length}`);
    console.log(`  Persons:       ${additionalSeedData.persons.length}`);
    console.log(`  Techniques:    ${additionalSeedData.techniques.length}`);
    console.log(`  AI Models:     ${additionalSeedData.aiModels.length}`);
    console.log(`  Publications:  ${additionalSeedData.publications.length}`);
    console.log(`  Benchmarks:    ${additionalSeedData.benchmarks.length}`);
    console.log(`  Concepts:      ${additionalSeedData.concepts.length}`);
    console.log(`  Relations:     ${additionalSeedData.relations.length}`);

    const totalEntities = 
      additionalSeedData.organizations.length +
      additionalSeedData.persons.length +
      additionalSeedData.techniques.length +
      additionalSeedData.aiModels.length +
      additionalSeedData.publications.length +
      additionalSeedData.benchmarks.length +
      additionalSeedData.concepts.length;
    
    console.log(`  ─────────────────────────`);
    console.log(`  Total:         ${totalEntities} entities, ${additionalSeedData.relations.length} relations`);

    // Connect
    const neo4jDriver = await getDriver();
    const session = neo4jDriver.session();

    try {
      // Fetch existing entities
      const existingIds = await fetchExistingIds(session);
      console.log(`\n📋 Existing entities in graph: ${existingIds.size}`);

      // Ingest new entities
      const newIds = await ingestEntities(session);
      
      // Merge IDs
      const allIds = new Map([...existingIds, ...newIds]);
      
      // Ingest relations
      const relationCount = await ingestRelations(session, allIds);
      
      const duration = (Date.now() - startTime) / 1000;
      
      // Final stats
      const finalResult = await session.run(`
        MATCH (n:Entity) RETURN count(n) as entities
      `);
      const finalRelResult = await session.run(`
        MATCH ()-[r]->() RETURN count(r) as relations
      `);

      console.log('\n✅ Extended ingestion complete!');
      console.log(`   Duration: ${duration.toFixed(2)}s`);
      console.log(`   Total entities in graph: ${finalResult.records[0].get('entities').toNumber()}`);
      console.log(`   Total relations in graph: ${finalRelResult.records[0].get('relations').toNumber()}`);

    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('\n❌ Ingestion failed:', error);
    process.exit(1);
  } finally {
    await closeDriver();
  }
}

// Run
main();
