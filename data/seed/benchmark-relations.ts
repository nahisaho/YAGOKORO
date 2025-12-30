/**
 * AIモデルとベンチマーク評価の関係を追加
 */

import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password')
);

// モデルとベンチマークの評価関係
const evaluations = [
  // SWE-bench スコア
  { model: 'Claude 3.5 Sonnet', benchmark: 'SWE-bench', score: 49.0, note: '2024年10月時点でトップクラス' },
  { model: 'GPT-4o', benchmark: 'SWE-bench', score: 33.2, note: '2024年' },
  { model: 'DeepSeek-V3', benchmark: 'SWE-bench', score: 42.0, note: '2024年末' },
  { model: 'Claude 3 Opus', benchmark: 'SWE-bench', score: 22.0, note: '2024年3月' },
  { model: 'Gemini 1.5 Pro', benchmark: 'SWE-bench', score: 28.5, note: '2024年' },
  
  // MMLU スコア
  { model: 'GPT-4', benchmark: 'MMLU', score: 86.4, note: '2023年' },
  { model: 'GPT-4o', benchmark: 'MMLU', score: 88.7, note: '2024年' },
  { model: 'Claude 3 Opus', benchmark: 'MMLU', score: 86.8, note: '2024年3月' },
  { model: 'Claude 3.5 Sonnet', benchmark: 'MMLU', score: 88.7, note: '2024年6月' },
  { model: 'Gemini Ultra', benchmark: 'MMLU', score: 90.0, note: '2023年12月' },
  { model: 'Gemini 1.5 Pro', benchmark: 'MMLU', score: 85.9, note: '2024年' },
  { model: 'Llama 3.1 405B', benchmark: 'MMLU', score: 88.6, note: '2024年7月' },
  { model: 'Qwen2.5', benchmark: 'MMLU', score: 85.0, note: '72B版' },
  { model: 'DeepSeek-V3', benchmark: 'MMLU', score: 88.5, note: '2024年末' },
  { model: 'Mixtral 8x22B', benchmark: 'MMLU', score: 77.8, note: 'MoE' },
  { model: 'Phi-3', benchmark: 'MMLU', score: 78.0, note: 'Small版 3.8B' },
  
  // HumanEval スコア
  { model: 'GPT-4', benchmark: 'HumanEval', score: 67.0, note: '2023年' },
  { model: 'GPT-4o', benchmark: 'HumanEval', score: 90.2, note: '2024年' },
  { model: 'Claude 3.5 Sonnet', benchmark: 'HumanEval', score: 92.0, note: '2024年10月' },
  { model: 'Claude 3 Opus', benchmark: 'HumanEval', score: 84.9, note: '2024年3月' },
  { model: 'Gemini 1.5 Pro', benchmark: 'HumanEval', score: 84.1, note: '2024年' },
  { model: 'Llama 3.1 405B', benchmark: 'HumanEval', score: 89.0, note: '2024年7月' },
  { model: 'DeepSeek-V3', benchmark: 'HumanEval', score: 82.6, note: '2024年末' },
  { model: 'Qwen2.5', benchmark: 'HumanEval', score: 84.5, note: '72B版' },
  { model: 'StarCoder 2', benchmark: 'HumanEval', score: 46.3, note: '15B版' },
  { model: 'CodeLlama', benchmark: 'HumanEval', score: 53.7, note: '34B版' },
  { model: 'Phi-3', benchmark: 'HumanEval', score: 62.0, note: 'Small版' },
  
  // LMSYS Chatbot Arena
  { model: 'GPT-4o', benchmark: 'LMSYS Chatbot Arena', score: 1290, note: 'ELO 2024年' },
  { model: 'Claude 3.5 Sonnet', benchmark: 'LMSYS Chatbot Arena', score: 1280, note: 'ELO 2024年' },
  { model: 'Claude 3 Opus', benchmark: 'LMSYS Chatbot Arena', score: 1248, note: 'ELO 2024年' },
  { model: 'Gemini 1.5 Pro', benchmark: 'LMSYS Chatbot Arena', score: 1260, note: 'ELO 2024年' },
  { model: 'Llama 3.1 405B', benchmark: 'LMSYS Chatbot Arena', score: 1210, note: 'ELO 2024年' },
  { model: 'DeepSeek-V3', benchmark: 'LMSYS Chatbot Arena', score: 1310, note: 'ELO 2024年末' },
  { model: 'Qwen2.5', benchmark: 'LMSYS Chatbot Arena', score: 1150, note: 'ELO 72B版' },
  
  // GSM8K (数学推論)
  { model: 'GPT-4', benchmark: 'GSM8K', score: 92.0, note: '2023年' },
  { model: 'Claude 3 Opus', benchmark: 'GSM8K', score: 95.0, note: '2024年' },
  { model: 'Claude 3.5 Sonnet', benchmark: 'GSM8K', score: 96.4, note: '2024年' },
  { model: 'Gemini Ultra', benchmark: 'GSM8K', score: 94.4, note: '2023年' },
  { model: 'Llama 3.1 405B', benchmark: 'GSM8K', score: 96.8, note: '2024年' },
  { model: 'DeepSeek-V3', benchmark: 'GSM8K', score: 89.3, note: '2024年' },
  { model: 'Phi-3', benchmark: 'GSM8K', score: 90.8, note: 'Medium版' },
  
  // BIG-Bench Hard
  { model: 'GPT-4', benchmark: 'BIG-Bench Hard', score: 83.1, note: '2023年 CoT' },
  { model: 'Claude 3 Opus', benchmark: 'BIG-Bench Hard', score: 86.8, note: '2024年 CoT' },
  { model: 'Gemini Ultra', benchmark: 'BIG-Bench Hard', score: 83.6, note: '2023年 CoT' },
  { model: 'PaLM 2', benchmark: 'BIG-Bench Hard', score: 78.1, note: 'CoT' },
  
  // TruthfulQA
  { model: 'GPT-4', benchmark: 'TruthfulQA', score: 59.0, note: '2023年' },
  { model: 'Claude 3 Opus', benchmark: 'TruthfulQA', score: 64.2, note: '2024年' },
  { model: 'Llama 3.1 405B', benchmark: 'TruthfulQA', score: 52.3, note: '2024年' },
];

async function addBenchmarkRelations() {
  const session = driver.session();
  
  try {
    console.log('🏆 ベンチマーク評価関係の追加...\n');
    
    let added = 0;
    let skipped = 0;
    
    for (const eval_ of evaluations) {
      // モデルとベンチマークが存在するか確認
      const checkResult = await session.run(`
        MATCH (m:Entity {name: $model, type: 'AIModel'})
        MATCH (b:Entity {name: $benchmark, type: 'Benchmark'})
        RETURN m, b
      `, { model: eval_.model, benchmark: eval_.benchmark });
      
      if (checkResult.records.length === 0) {
        console.log(`  ⚠️  スキップ: ${eval_.model} → ${eval_.benchmark} (エンティティなし)`);
        skipped++;
        continue;
      }
      
      // 既存の関係をチェック
      const existingResult = await session.run(`
        MATCH (m:Entity {name: $model})-[r:EVALUATED_ON]->(b:Entity {name: $benchmark})
        RETURN r
      `, { model: eval_.model, benchmark: eval_.benchmark });
      
      if (existingResult.records.length > 0) {
        console.log(`  ⏭️  既存: ${eval_.model} → ${eval_.benchmark}`);
        skipped++;
        continue;
      }
      
      // 関係を追加
      await session.run(`
        MATCH (m:Entity {name: $model, type: 'AIModel'})
        MATCH (b:Entity {name: $benchmark, type: 'Benchmark'})
        CREATE (m)-[:EVALUATED_ON {score: $score, note: $note}]->(b)
      `, { 
        model: eval_.model, 
        benchmark: eval_.benchmark,
        score: eval_.score,
        note: eval_.note
      });
      
      console.log(`  ✅ 追加: ${eval_.model} → ${eval_.benchmark} (${eval_.score})`);
      added++;
    }
    
    console.log(`\n📊 結果: ${added}件追加, ${skipped}件スキップ`);
    
    // 統計を表示
    const statsResult = await session.run(`
      MATCH ()-[r:EVALUATED_ON]->()
      RETURN count(r) as count
    `);
    const evalCount = statsResult.records[0].get('count').toNumber();
    
    const relStats = await session.run(`
      MATCH ()-[r]->()
      RETURN type(r) as type, count(*) as count
      ORDER BY count DESC
    `);
    
    console.log('\n📈 リレーション統計:');
    for (const record of relStats.records) {
      console.log(`   ${record.get('type')}: ${record.get('count').toNumber()}`);
    }
    
  } finally {
    await session.close();
    await driver.close();
  }
}

addBenchmarkRelations().catch(console.error);
