/**
 * YAGOKORO コミュニティ検出スクリプト
 * 
 * Neo4jのグラフ構造からコミュニティを検出し、LLMで要約を生成
 * 
 * Usage:
 *   npx tsx seed/community.ts           # コミュニティ検出実行
 *   npx tsx seed/community.ts --dry-run # プレビューのみ
 */

import neo4j, { Driver } from 'neo4j-driver';

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
    model: process.env.OLLAMA_LLM_MODEL || 'qwen2.5:7b',
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
// Community Detection (Label Propagation)
// =============================================================================

interface CommunityMember {
  id: string;
  name: string;
  type: string;
  description: string;
}

interface Community {
  id: number;
  members: CommunityMember[];
  summary?: string;
}

async function detectCommunities(): Promise<Community[]> {
  const neo4jDriver = await getDriver();
  const session = neo4jDriver.session();

  try {
    // Create graph projection for community detection
    console.log('   Creating graph projection...');
    
    // Drop existing projection if exists
    try {
      await session.run(`CALL gds.graph.drop('yagokoro-graph', false)`);
    } catch {
      // Ignore if doesn't exist
    }

    // Check if GDS is available
    try {
      await session.run(`CALL gds.version()`);
    } catch {
      console.log('   ⚠️  GDS not available, using manual community detection...');
      return await detectCommunitiesManual(session);
    }

    // Create projection
    await session.run(`
      CALL gds.graph.project(
        'yagokoro-graph',
        'Entity',
        {
          DEVELOPED_BY: { orientation: 'UNDIRECTED' },
          USES_TECHNIQUE: { orientation: 'UNDIRECTED' },
          BASED_ON: { orientation: 'UNDIRECTED' },
          EMPLOYED_AT: { orientation: 'UNDIRECTED' },
          EVALUATED_ON: { orientation: 'UNDIRECTED' },
          AUTHORED: { orientation: 'UNDIRECTED' },
          MEMBER_OF: { orientation: 'UNDIRECTED' }
        }
      )
    `);

    console.log('   Running Label Propagation...');
    
    // Run Label Propagation algorithm
    const result = await session.run(`
      CALL gds.labelPropagation.stream('yagokoro-graph')
      YIELD nodeId, communityId
      WITH gds.util.asNode(nodeId) AS node, communityId
      RETURN communityId, 
             collect({
               id: node.id,
               name: node.name,
               type: node.type,
               description: node.description
             }) AS members
      ORDER BY size(members) DESC
    `);

    const communities: Community[] = result.records.map((record, index) => ({
      id: index + 1,
      members: record.get('members'),
    }));

    // Clean up projection
    await session.run(`CALL gds.graph.drop('yagokoro-graph', false)`);

    return communities;

  } finally {
    await session.close();
  }
}

/**
 * Manual community detection using connected components
 * (Fallback when GDS is not available)
 */
async function detectCommunitiesManual(session: any): Promise<Community[]> {
  // Group entities by their relationships
  const result = await session.run(`
    // Find connected clusters based on organization
    MATCH (o:Organization)<-[:DEVELOPED_BY|EMPLOYED_AT]-(e:Entity)
    WITH o, collect(DISTINCT e) as related
    RETURN o.name as clusterName, o.id as clusterId,
           [o] + related as members
    ORDER BY size(members) DESC
  `);

  const communities: Community[] = [];
  let communityId = 1;

  for (const record of result.records) {
    const members = record.get('members').map((m: any) => ({
      id: m.properties.id,
      name: m.properties.name,
      type: m.properties.type,
      description: m.properties.description,
    }));

    if (members.length >= 2) {
      communities.push({
        id: communityId++,
        members,
      });
    }
  }

  // Add technique-based clusters
  const techResult = await session.run(`
    MATCH (t:Technique)<-[:USES_TECHNIQUE|BASED_ON]-(e:Entity)
    WHERE NOT (t)<-[:DEVELOPED_BY]-()
    WITH t, collect(DISTINCT e) as related
    WHERE size(related) >= 2
    RETURN t.name as clusterName,
           [t] + related as members
    ORDER BY size(members) DESC
    LIMIT 5
  `);

  for (const record of techResult.records) {
    const members = record.get('members').map((m: any) => ({
      id: m.properties.id,
      name: m.properties.name,
      type: m.properties.type,
      description: m.properties.description,
    }));

    communities.push({
      id: communityId++,
      members,
    });
  }

  return communities;
}

// =============================================================================
// LLM Summary Generation
// =============================================================================

async function generateCommunitySummary(community: Community): Promise<string> {
  const memberList = community.members
    .map(m => `- ${m.name} (${m.type}): ${m.description}`)
    .join('\n');

  const prompt = `以下のエンティティグループの特徴と関係性を日本語で簡潔に要約してください（100-150字程度）:

${memberList}

要約:`;

  const response = await fetch(`${config.ollama.url}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.ollama.model,
      prompt,
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 256,
      },
    }),
  });

  const data = await response.json();
  return data.response.trim();
}

// =============================================================================
// Store Communities
// =============================================================================

async function storeCommunities(communities: Community[]): Promise<void> {
  const neo4jDriver = await getDriver();
  const session = neo4jDriver.session();

  try {
    // Clear existing communities
    await session.run(`MATCH (c:Community) DETACH DELETE c`);

    for (const community of communities) {
      // Create community node
      await session.run(`
        CREATE (c:Community {
          id: $id,
          name: $name,
          summary: $summary,
          memberCount: $memberCount,
          createdAt: datetime()
        })
      `, {
        id: `community-${community.id}`,
        name: `Community ${community.id}`,
        summary: community.summary || '',
        memberCount: community.members.length,
      });

      // Link members to community
      for (const member of community.members) {
        await session.run(`
          MATCH (e:Entity {id: $entityId})
          MATCH (c:Community {id: $communityId})
          CREATE (e)-[:BELONGS_TO]->(c)
        `, {
          entityId: member.id,
          communityId: `community-${community.id}`,
        });
      }
    }

  } finally {
    await session.close();
  }
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          YAGOKORO Community Detection                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  if (config.dryRun) {
    console.log('\n🔍 DRY RUN MODE - No data will be written\n');
  }

  const startTime = Date.now();

  try {
    // Step 1: Detect communities
    console.log('\n🔍 Step 1: コミュニティ検出...\n');
    const communities = await detectCommunities();
    console.log(`   検出されたコミュニティ: ${communities.length}件`);

    // Step 2: Generate summaries
    console.log('\n🤖 Step 2: コミュニティ要約生成...\n');
    
    for (const community of communities) {
      console.log(`   Community ${community.id} (${community.members.length}メンバー):`);
      
      // List members
      for (const member of community.members.slice(0, 5)) {
        console.log(`     • ${member.name} (${member.type})`);
      }
      if (community.members.length > 5) {
        console.log(`     ... and ${community.members.length - 5} more`);
      }

      // Generate summary
      if (!config.dryRun) {
        console.log('     Generating summary...');
        community.summary = await generateCommunitySummary(community);
        console.log(`     📝 ${community.summary.substring(0, 80)}...`);
      }
      console.log('');
    }

    // Step 3: Store communities
    if (!config.dryRun) {
      console.log('💾 Step 3: コミュニティ保存...\n');
      await storeCommunities(communities);
      console.log(`   ${communities.length}件のコミュニティを保存しました`);
    }

    const duration = (Date.now() - startTime) / 1000;

    console.log('\n✅ Community detection complete!');
    console.log(`   Duration: ${duration.toFixed(2)}s`);
    console.log(`   Communities: ${communities.length}`);
    console.log(`   Total members: ${communities.reduce((sum, c) => sum + c.members.length, 0)}`);

    if (config.dryRun) {
      console.log('\n💡 Run without --dry-run to store communities');
    }

    // Display community summary
    console.log('\n📊 Community Summary:\n');
    for (const community of communities) {
      const types = [...new Set(community.members.map(m => m.type))];
      console.log(`   Community ${community.id}: ${community.members.length} members`);
      console.log(`   Types: ${types.join(', ')}`);
      if (community.summary) {
        console.log(`   ${community.summary}`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Community detection failed:', error);
    process.exit(1);
  } finally {
    await closeDriver();
  }
}

// Run
main();
