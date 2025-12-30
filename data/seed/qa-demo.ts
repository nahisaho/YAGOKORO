/**
 * YAGOKORO GraphRAG 質問応答デモ
 * 
 * Neo4j + Qdrant + Ollama を組み合わせた GraphRAG システムのデモ
 * 
 * Usage:
 *   npx tsx seed/qa-demo.ts "GPT-4を作った会社は？"
 *   npx tsx seed/qa-demo.ts "Transformerの技術系譜を教えて"
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
    embedModel: process.env.OLLAMA_EMBED_MODEL || 'bge-m3',
    llmModel: process.env.OLLAMA_LLM_MODEL || 'qwen2.5:7b',
  },
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    collection: 'yagokoro_entities',
  },
};

// =============================================================================
// Database Connections
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

// =============================================================================
// Embedding & Vector Search
// =============================================================================

async function embed(text: string): Promise<number[]> {
  const response = await fetch(`${config.ollama.url}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.ollama.embedModel, prompt: text }),
  });
  const data = await response.json();
  return data.embedding;
}

interface VectorHit {
  id: string;
  score: number;
  payload: {
    entityId?: string;  // Original entity ID from Neo4j
    type: string;
    name: string;
    description: string;
    [key: string]: unknown;
  };
}

async function vectorSearch(query: string, limit = 5): Promise<VectorHit[]> {
  const vector = await embed(query);
  
  const response = await fetch(`${config.qdrant.url}/collections/${config.qdrant.collection}/points/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vector,
      limit,
      with_payload: true,
    }),
  });

  const data = await response.json();
  return data.result;
}

// =============================================================================
// Graph Exploration
// =============================================================================

interface GraphContext {
  entities: Array<{
    id: string;
    type: string;
    name: string;
    description: string;
  }>;
  relations: Array<{
    source: string;
    target: string;
    type: string;
  }>;
}

async function expandGraph(entityIds: string[], depth = 2): Promise<GraphContext> {
  const neo4jDriver = await getDriver();
  const session = neo4jDriver.session();

  try {
    // Extract names from entityIds (they might be Neo4j internal IDs or names)
    const names = entityIds;
    
    // First, get info about the seed entities themselves (by name)
    const seedResult = await session.run(`
      MATCH (e)
      WHERE e.name IN $names AND e.description IS NOT NULL
      RETURN e, labels(e)[0] as label
    `, { names });
    
    const entities = new Map<string, { id: string; type: string; name: string; description: string }>();
    
    // Add seed entities first
    for (const record of seedResult.records) {
      const e = record.get('e');
      const label = record.get('label');
      entities.set(e.properties.name, {
        id: e.properties.name,
        type: e.properties.type || label,
        name: e.properties.name,
        description: e.properties.description || '',
      });
    }
    
    // Get entities and their 1-2 hop neighbors (any label)
    const result = await session.run(`
      MATCH (e)
      WHERE e.name IN $names AND e.description IS NOT NULL
      OPTIONAL MATCH (e)-[r]-(neighbor)
      WHERE neighbor.description IS NOT NULL
      OPTIONAL MATCH (neighbor)-[r2]-(neighbor2)
      WHERE neighbor2.name <> e.name AND neighbor2.description IS NOT NULL
      WITH e, labels(e)[0] as eLabel,
           collect(DISTINCT {node: neighbor, label: labels(neighbor)[0]}) as n1, 
           collect(DISTINCT {node: neighbor2, label: labels(neighbor2)[0]}) as n2,
           collect(DISTINCT r) as r1, collect(DISTINCT r2) as r2_list
      RETURN e, eLabel, n1, n2, r1, r2_list
    `, { names });

    const relations: Array<{ source: string; target: string; type: string }> = [];
    const seenRelations = new Set<string>();

    for (const record of result.records) {
      const e = record.get('e');
      const eLabel = record.get('eLabel');
      entities.set(e.properties.name, {
        id: e.properties.name,
        type: e.properties.type || eLabel,
        name: e.properties.name,
        description: e.properties.description || '',
      });

      for (const item of record.get('n1')) {
        const n = item.node;
        const label = item.label;
        if (n && n.properties) {
          entities.set(n.properties.name, {
            id: n.properties.name,
            type: n.properties.type || label,
            name: n.properties.name,
            description: n.properties.description || '',
          });
        }
      }

      for (const item of record.get('n2')) {
        const n = item.node;
        const label = item.label;
        if (n && n.properties) {
          entities.set(n.properties.name, {
            id: n.properties.name,
            type: n.properties.type || label,
            name: n.properties.name,
            description: n.properties.description || '',
          });
        }
      }

      for (const r of record.get('r1')) {
        if (r) {
          const key = `${r.startNodeElementId}-${r.type}-${r.endNodeElementId}`;
          if (!seenRelations.has(key)) {
            seenRelations.add(key);
            relations.push({
              source: r.startNodeElementId,
              target: r.endNodeElementId,
              type: r.type,
            });
          }
        }
      }
    }

    // Get ALL relations involving collected entities (any label)
    const enrichedRelations = await session.run(`
      MATCH (source)-[r]->(target)
      WHERE source.name IN $names OR target.name IN $names
      RETURN source.name as sourceName, target.name as targetName, 
             type(r) as relType, properties(r) as props
      LIMIT 80
    `, { names: Array.from(entities.keys()) });

    // Also get EVALUATED_ON relations for benchmarks specifically
    const benchmarkIds = Array.from(entities.values())
      .filter(e => e.type === 'Benchmark')
      .map(e => e.name);
    
    let evalRelations: any[] = [];
    if (benchmarkIds.length > 0) {
      const evalResult = await session.run(`
        MATCH (model)-[r:EVALUATED_ON]->(benchmark)
        WHERE benchmark.name IN $benchmarkNames
        RETURN model.name as sourceName, benchmark.name as targetName,
               type(r) as relType, properties(r) as props
        ORDER BY r.score DESC
      `, { benchmarkNames: benchmarkIds });
      evalRelations = evalResult.records.map(r => ({
        source: r.get('sourceName'),
        target: r.get('targetName'),
        type: r.get('relType'),
        props: r.get('props') || {},
      }));
    }

    return {
      entities: Array.from(entities.values()),
      relations: [
        ...evalRelations,
        ...enrichedRelations.records.map(r => ({
          source: r.get('sourceName'),
          target: r.get('targetName'),
          type: r.get('relType'),
          props: r.get('props') || {},
        })),
      ],
    };

  } finally {
    await session.close();
  }
}

// =============================================================================
// LLM Generation
// =============================================================================

async function generateAnswer(question: string, context: string): Promise<string> {
  const systemPrompt = `あなたはGenerative AIの知識グラフに基づいて質問に答えるアシスタントです。
提供されたコンテキスト情報のみを使用して回答してください。
情報が不足している場合は、その旨を伝えてください。
回答は簡潔で正確に。`;

  const userPrompt = `コンテキスト情報:
${context}

質問: ${question}

上記のコンテキスト情報に基づいて回答してください。`;

  const response = await fetch(`${config.ollama.url}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.ollama.llmModel,
      prompt: userPrompt,
      system: systemPrompt,
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 1024,
      },
    }),
  });

  const data = await response.json();
  return data.response;
}

// =============================================================================
// Main GraphRAG Pipeline
// =============================================================================

async function graphRAG(question: string): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              YAGOKORO GraphRAG Q&A Demo                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`❓ 質問: ${question}\n`);
  console.log('─'.repeat(60));

  const startTime = Date.now();

  // Step 1: Vector Search
  console.log('\n🔍 Step 1: セマンティック検索...\n');
  const vectorHits = await vectorSearch(question, 5);
  
  for (const hit of vectorHits) {
    const score = (hit.score * 100).toFixed(1);
    console.log(`   [${score}%] ${hit.payload.type}: ${hit.payload.name}`);
  }

  // Step 2: Graph Expansion
  console.log('\n🔗 Step 2: グラフ探索...\n');
  // Use name from payload for graph search
  const entityNames = vectorHits.map(h => h.payload.name);
  console.log(`   検索対象: ${entityNames.join(', ')}`);
  const graphContext = await expandGraph(entityNames);
  
  console.log(`   エンティティ: ${graphContext.entities.length}件`);
  console.log(`   リレーション: ${graphContext.relations.length}件`);

  // Step 3: Build Context
  console.log('\n📝 Step 3: コンテキスト構築...\n');
  
  let context = '## 関連エンティティ\n\n';
  for (const entity of graphContext.entities.slice(0, 15)) {
    context += `- **${entity.name}** (${entity.type}): ${entity.description}\n`;
  }

  // EVALUATED_ONリレーションを優先表示
  const evaluationRels = graphContext.relations.filter(r => r.type === 'EVALUATED_ON');
  const otherRels = graphContext.relations.filter(r => r.type !== 'EVALUATED_ON');
  
  // 質問に関連するベンチマークの評価を優先
  const relatedEvalRels = evaluationRels.filter(r => {
    const targetLower = (r.target || '').toLowerCase();
    return question.toLowerCase().includes(targetLower) || 
           targetLower.includes(question.toLowerCase().split('で')[0]);
  });
  const otherEvalRels = evaluationRels.filter(r => !relatedEvalRels.includes(r));

  context += '\n## ベンチマーク評価結果\n\n';
  // 関連ベンチマークの評価を先に表示
  const allEvalRels = [...relatedEvalRels, ...otherEvalRels];
  for (const rel of allEvalRels.slice(0, 25)) {
    const props = (rel as any).props;
    if (props && props.score !== undefined) {
      context += `- ${rel.source} → ${rel.target}: スコア ${props.score}${props.note ? ' (' + props.note + ')' : ''}\n`;
    } else {
      context += `- ${rel.source} → ${rel.target}\n`;
    }
  }

  context += '\n## その他のリレーション\n\n';
  for (const rel of otherRels.slice(0, 15)) {
    let relDesc = `- ${rel.source} --[${rel.type}]--> ${rel.target}`;
    const props = (rel as any).props;
    if (props && props.score !== undefined) {
      relDesc += ` (スコア: ${props.score}${props.note ? ', ' + props.note : ''})`;
    }
    context += relDesc + '\n';
  }

  console.log(`   コンテキスト: ${context.length}文字`);

  // Step 4: LLM Generation
  console.log('\n🤖 Step 4: 回答生成...\n');
  console.log(`   モデル: ${config.ollama.llmModel}`);
  
  const answer = await generateAnswer(question, context);

  const duration = (Date.now() - startTime) / 1000;

  console.log('\n' + '═'.repeat(60));
  console.log('\n💡 回答:\n');
  console.log(answer);
  console.log('\n' + '═'.repeat(60));
  console.log(`\n⏱️  処理時間: ${duration.toFixed(2)}秒`);
}

// =============================================================================
// Entry Point
// =============================================================================

async function main(): Promise<void> {
  const question = process.argv[2] || 'GPT-4を開発した会社とその主要メンバーは？';

  try {
    await graphRAG(question);
  } catch (error) {
    console.error('\n❌ エラー:', error);
    process.exit(1);
  } finally {
    if (driver) {
      await driver.close();
    }
  }
}

main();
