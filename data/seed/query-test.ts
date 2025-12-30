/**
 * YAGOKORO グラフクエリテストスクリプト
 */

import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password')
);

async function main() {
  const session = driver.session();

  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║            YAGOKORO Knowledge Graph Queries                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Query 1: GPT-4の技術系譜
    console.log('🔍 Query 1: GPT-4が使用している技術は？\n');
    const q1 = await session.run(`
      MATCH (m:AIModel {name: 'GPT-4'})-[:USES_TECHNIQUE]->(t:Technique)
      RETURN t.name as technique, t.description as description
    `);
    for (const record of q1.records) {
      console.log(`   • ${record.get('technique')}`);
      console.log(`     ${record.get('description').substring(0, 80)}...`);
    }

    // Query 2: Anthropicが開発したモデル
    console.log('\n🔍 Query 2: Anthropicが開発したモデルは？\n');
    const q2 = await session.run(`
      MATCH (m:AIModel)-[:DEVELOPED_BY]->(o:Organization {name: 'Anthropic'})
      RETURN m.name as model, m.properties as props
    `);
    for (const record of q2.records) {
      const props = JSON.parse(record.get('props'));
      console.log(`   • ${record.get('model')} (${props.releaseYear || 'N/A'})`);
    }

    // Query 3: Transformerから派生した技術チェーン
    console.log('\n🔍 Query 3: Transformerから派生した技術チェーンは？\n');
    const q3 = await session.run(`
      MATCH path=(t:Technique {name: 'Transformer'})<-[:BASED_ON*1..3]-(derived)
      RETURN DISTINCT derived.name as name, derived.type as type
    `);
    for (const record of q3.records) {
      console.log(`   • ${record.get('name')} (${record.get('type')})`);
    }

    // Query 4: マルチホップ推論 - GPT-4を作った組織のメンバー
    console.log('\n🔍 Query 4: GPT-4を作った組織の主要メンバーは？\n');
    const q4 = await session.run(`
      MATCH (m:AIModel {name: 'GPT-4'})-[:DEVELOPED_BY]->(o:Organization)
      MATCH (p:Person)-[:EMPLOYED_AT]->(o)
      RETURN o.name as org, collect(p.name) as members
    `);
    for (const record of q4.records) {
      console.log(`   ${record.get('org')}:`);
      for (const member of record.get('members')) {
        console.log(`     • ${member}`);
      }
    }

    // Query 5: ベンチマーク比較 - MMLUで評価されたモデル
    console.log('\n🔍 Query 5: MMLUで評価されたモデルは？\n');
    const q5 = await session.run(`
      MATCH (m:AIModel)-[:EVALUATED_ON]->(b:Benchmark {name: 'MMLU'})
      RETURN m.name as model
      ORDER BY m.name
    `);
    for (const record of q5.records) {
      console.log(`   • ${record.get('model')}`);
    }

    // Query 6: 最短パス - Ilya Sutskeверから Claude 3.5 Sonnetまでの関係
    console.log('\n🔍 Query 6: Ilya SutskeverとClaude 3.5 Sonnetの関係は？\n');
    const q6 = await session.run(`
      MATCH path=shortestPath(
        (p:Person {name: 'Ilya Sutskever'})-[*]-(m:AIModel {name: 'Claude 3.5 Sonnet'})
      )
      RETURN [n in nodes(path) | n.name] as path_nodes,
             [r in relationships(path) | type(r)] as relations
    `);
    for (const record of q6.records) {
      const nodes = record.get('path_nodes');
      const rels = record.get('relations');
      console.log(`   パス: ${nodes.join(' → ')}`);
      console.log(`   関係: ${rels.join(', ')}`);
    }

    // Query 7: グラフ統計
    console.log('\n📊 Knowledge Graph Statistics:\n');
    const stats = await session.run(`
      MATCH (n)
      WITH n.type as type, count(*) as count
      RETURN type, count
      ORDER BY count DESC
    `);
    for (const record of stats.records) {
      console.log(`   ${record.get('type')}: ${record.get('count')}`);
    }

    const relStats = await session.run(`
      MATCH ()-[r]->()
      WITH type(r) as type, count(*) as count
      RETURN type, count
      ORDER BY count DESC
    `);
    console.log('\n   Relations:');
    for (const record of relStats.records) {
      console.log(`   ${record.get('type')}: ${record.get('count')}`);
    }

    console.log('\n✅ All queries completed successfully!');

  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch(console.error);
