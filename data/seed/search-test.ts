/**
 * YAGOKORO セマンティック検索テストスクリプト
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://192.168.224.1:11434';
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const COLLECTION = 'yagokoro_entities';

async function embed(text: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'bge-m3', prompt: text }),
  });
  const data = await response.json();
  return data.embedding;
}

async function search(query: string, limit = 5): Promise<void> {
  console.log(`\n🔍 Query: "${query}"\n`);
  
  const vector = await embed(query);
  
  const response = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vector,
      limit,
      with_payload: true,
    }),
  });

  const data = await response.json();
  
  for (const hit of data.result) {
    const score = (hit.score * 100).toFixed(1);
    console.log(`   [${score}%] ${hit.payload.type}: ${hit.payload.name}`);
    console.log(`           ${hit.payload.description?.substring(0, 60)}...`);
  }
}

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         YAGOKORO Semantic Search Test                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Test queries
  await search('大規模言語モデルの開発会社');
  await search('attention mechanism neural network');
  await search('reinforcement learning human feedback');
  await search('code generation programming benchmark');
  await search('AI safety alignment research');
  await search('multimodal vision language model');

  console.log('\n✅ Semantic search test complete!');
}

main().catch(console.error);
