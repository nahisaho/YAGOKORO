/**
 * YAGOKORO ベクトル埋め込み生成スクリプト
 * 
 * Neo4jのエンティティにOllama bge-m3で埋め込みを生成し、Qdrantに保存
 * 
 * Usage:
 *   npx tsx seed/embed.ts           # 全エンティティを埋め込み
 *   npx tsx seed/embed.ts --dry-run # プレビューのみ
 */

import neo4j, { Driver } from 'neo4j-driver';
import { createHash } from 'node:crypto';

// 文字列IDからUUID形式を生成
function stringToUuid(str: string): string {
  const hash = createHash('md5').update(str).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    hash.substring(12, 16),
    hash.substring(16, 20),
    hash.substring(20, 32),
  ].join('-');
}

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
  batchSize: 10,
};

// =============================================================================
// Ollama Embedding
// =============================================================================

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${config.ollama.url}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.ollama.model,
      prompt: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.embedding;
}

// =============================================================================
// Qdrant Operations
// =============================================================================

async function ensureCollection(dimensions: number): Promise<void> {
  // Check if collection exists
  const checkResponse = await fetch(`${config.qdrant.url}/collections/${config.qdrant.collection}`);
  
  if (checkResponse.ok) {
    console.log(`  Collection '${config.qdrant.collection}' exists`);
    return;
  }

  // Create collection
  const createResponse = await fetch(`${config.qdrant.url}/collections/${config.qdrant.collection}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vectors: {
        size: dimensions,
        distance: 'Cosine',
      },
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Failed to create collection: ${await createResponse.text()}`);
  }
  
  console.log(`  Created collection '${config.qdrant.collection}' (${dimensions} dimensions)`);
}

async function upsertPoints(points: Array<{
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}>): Promise<void> {
  const response = await fetch(`${config.qdrant.url}/collections/${config.qdrant.collection}/points`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      points: points.map(p => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to upsert points: ${await response.text()}`);
  }
}

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
// Main
// =============================================================================

interface Entity {
  id: string;
  type: string;
  name: string;
  description: string;
  properties: Record<string, unknown>;
}

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        YAGOKORO Vector Embedding Generation                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  if (config.dryRun) {
    console.log('\n🔍 DRY RUN MODE - No data will be written\n');
  }

  console.log(`\n⚙️  Configuration:`);
  console.log(`   Ollama: ${config.ollama.url}`);
  console.log(`   Model:  ${config.ollama.model}`);
  console.log(`   Qdrant: ${config.qdrant.url}`);

  const startTime = Date.now();

  try {
    // Test Ollama connection
    console.log('\n🔗 Testing Ollama connection...');
    const testEmbedding = await generateEmbedding('test');
    console.log(`   ✅ Connected (${testEmbedding.length} dimensions)`);

    // Ensure Qdrant collection
    if (!config.dryRun) {
      console.log('\n📦 Setting up Qdrant collection...');
      await ensureCollection(testEmbedding.length);
    }

    // Connect to Neo4j
    console.log('\n🔗 Connecting to Neo4j...');
    const neo4jDriver = await getDriver();
    const session = neo4jDriver.session();
    console.log('   ✅ Connected');

    try {
      // Fetch all entities (any label with name and description)
      console.log('\n📥 Fetching entities from Neo4j...');
      const result = await session.run(`
        MATCH (e)
        WHERE e.name IS NOT NULL AND e.description IS NOT NULL
          AND NOT 'Community' IN labels(e)
        RETURN elementId(e) as id, 
               COALESCE(e.type, labels(e)[0]) as type, 
               e.name as name, 
               e.description as description, 
               properties(e) as properties
        ORDER BY labels(e)[0], e.name
      `);

      const entities: Entity[] = result.records.map(r => ({
        id: r.get('id'),
        type: r.get('type'),
        name: r.get('name'),
        description: r.get('description'),
        properties: r.get('properties'),
      }));

      console.log(`   Found ${entities.length} entities`);

      // Generate embeddings and store
      console.log('\n🧠 Generating embeddings...\n');
      
      let processed = 0;
      const batch: Array<{ id: string; vector: number[]; payload: Record<string, unknown> }> = [];

      for (const entity of entities) {
        // Create embedding text
        const props = entity.properties || {};
        const embeddingText = [
          `${entity.type}: ${entity.name}`,
          entity.description,
          ...Object.entries(props)
            .filter(([k]) => !['name', 'description', 'type'].includes(k))
            .map(([k, v]) => `${k}: ${v}`),
        ].join('\n');

        if (config.dryRun) {
          console.log(`   [DRY] Would embed: ${entity.type}/${entity.name}`);
        } else {
          const vector = await generateEmbedding(embeddingText);
          
          batch.push({
            id: stringToUuid(entity.id),  // Convert to UUID format
            vector,
            payload: {
              entityId: entity.id,  // Store original ID in payload
              type: entity.type,
              name: entity.name,
              description: entity.description,
              ...props,
            },
          });

          // Flush batch
          if (batch.length >= config.batchSize) {
            await upsertPoints(batch);
            processed += batch.length;
            console.log(`   ✅ Processed ${processed}/${entities.length} entities`);
            batch.length = 0;
          }
        }
      }

      // Final batch
      if (!config.dryRun && batch.length > 0) {
        await upsertPoints(batch);
        processed += batch.length;
        console.log(`   ✅ Processed ${processed}/${entities.length} entities`);
      }

      const duration = (Date.now() - startTime) / 1000;

      console.log('\n✅ Embedding generation complete!');
      console.log(`   Duration: ${duration.toFixed(2)}s`);
      console.log(`   Entities: ${entities.length}`);
      console.log(`   Model: ${config.ollama.model}`);

      if (config.dryRun) {
        console.log('\n💡 Run without --dry-run to actually generate embeddings');
      }

    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('\n❌ Embedding generation failed:', error);
    process.exit(1);
  } finally {
    await closeDriver();
  }
}

// Run
main();
