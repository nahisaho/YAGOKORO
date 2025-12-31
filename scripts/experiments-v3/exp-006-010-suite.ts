/**
 * EXP-006 to EXP-010: v3.0.0 MCP Tools 統合実験
 * 
 * 複数の実験を一括実行
 */
import * as fs from 'fs';
import * as path from 'path';

// EXP-006: 知識グラフ統計（既存データ分析）
async function exp006_graphStats() {
  console.log('='.repeat(60));
  console.log('EXP-006: 知識グラフ統計分析');
  console.log('='.repeat(60));
  
  // 取り込み済みデータの分析
  const chunksDir = path.join(process.cwd(), 'data/chunks');
  const files = fs.readdirSync(chunksDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  
  let totalChunks = 0;
  let totalPapers = 0;
  const categories: Record<string, number> = {};
  const paperStats: any[] = [];
  
  files.forEach(file => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(chunksDir, file), 'utf-8'));
      const chunks = data.chunks?.length || 0;
      totalChunks += chunks;
      totalPapers++;
      
      // カテゴリ推定
      const category = data.categories?.[0] || data.category || 'unknown';
      categories[category] = (categories[category] || 0) + 1;
      
      paperStats.push({
        id: file.replace('.json', ''),
        title: data.title?.substring(0, 50) || 'Unknown',
        chunks,
      });
    } catch (e) {
      // Skip invalid files
    }
  });
  
  console.log('\n📊 取り込み済みデータ統計:');
  console.log(`   総論文数: ${totalPapers}`);
  console.log(`   総チャンク数: ${totalChunks}`);
  console.log(`   平均チャンク/論文: ${(totalChunks / totalPapers).toFixed(1)}`);
  
  console.log('\n📚 論文一覧（チャンク数順）:');
  paperStats.sort((a, b) => b.chunks - a.chunks).slice(0, 10).forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.title}... (${p.chunks} chunks)`);
  });
  
  return {
    totalPapers,
    totalChunks,
    avgChunksPerPaper: totalChunks / totalPapers,
    categories,
  };
}

// EXP-007: CircuitBreaker パターン
async function exp007_circuitBreaker() {
  console.log('\n' + '='.repeat(60));
  console.log('EXP-007: CircuitBreaker パターン');
  console.log('='.repeat(60));
  
  const { CircuitBreaker } = await import('../../libs/ingestion/src/rate-limit/circuit-breaker.js');
  
  const breaker = new CircuitBreaker({
    failureThreshold: 3,
    resetTimeout: 1000,
    halfOpenRequests: 1,
  });
  
  console.log('\n📋 実験設定:');
  console.log('   失敗閾値: 3回');
  console.log('   リセットタイムアウト: 1000ms');
  console.log('   Half-Open許可リクエスト: 1');
  
  let successes = 0;
  let failures = 0;
  let blocked = 0;
  
  // 正常動作テスト
  console.log('\n🔍 テスト1: 正常動作');
  for (let i = 0; i < 3; i++) {
    try {
      await breaker.execute(async () => 'success');
      successes++;
      console.log(`   リクエスト ${i + 1}: 成功 ✅`);
    } catch (e: any) {
      failures++;
      console.log(`   リクエスト ${i + 1}: 失敗 ❌ (${e.message})`);
    }
  }
  
  // 失敗テスト
  console.log('\n🔍 テスト2: 連続失敗（サーキットオープン）');
  for (let i = 0; i < 5; i++) {
    try {
      await breaker.execute(async () => {
        throw new Error('Simulated failure');
      });
    } catch (e: any) {
      if (e.message.includes('open')) {
        blocked++;
        console.log(`   リクエスト ${i + 1}: ブロック 🔴 (Circuit Open)`);
      } else {
        failures++;
        console.log(`   リクエスト ${i + 1}: 失敗 ❌`);
      }
    }
  }
  
  console.log('\n📊 結果:');
  console.log(`   成功: ${successes}回`);
  console.log(`   失敗: ${failures}回`);
  console.log(`   ブロック: ${blocked}回`);
  console.log(`   状態: ${breaker.getState()}`);
  
  console.log('\n💡 CircuitBreakerの意義:');
  console.log('   ✅ 連続失敗時にシステム保護');
  console.log('   ✅ 外部API障害からの自動復旧');
  console.log('   ✅ 段階的復旧（Half-Open状態）');
  
  return { successes, failures, blocked, state: breaker.getState() };
}

// EXP-008: RateLimiter パターン
async function exp008_rateLimiter() {
  console.log('\n' + '='.repeat(60));
  console.log('EXP-008: RateLimiter パターン比較');
  console.log('='.repeat(60));
  
  const { TokenBucketRateLimiter } = await import('../../libs/ingestion/src/rate-limit/token-bucket.js');
  const { SlidingWindowRateLimiter } = await import('../../libs/ingestion/src/rate-limit/sliding-window.js');
  
  // Token Bucket
  const tokenBucket = new TokenBucketRateLimiter({
    maxTokens: 5,
    refillRate: 2, // 2 tokens per second
    initialTokens: 5, // Start with full bucket
  });
  
  // Sliding Window
  const slidingWindow = new SlidingWindowRateLimiter({
    windowMs: 1000, // 1 second
    maxRequests: 3,
  });
  
  console.log('\n📋 Token Bucket設定:');
  console.log('   バケットサイズ: 5トークン');
  console.log('   補充レート: 2トークン/秒');
  console.log('   初期トークン: 5');
  
  console.log('\n📋 Sliding Window設定:');
  console.log('   ウィンドウサイズ: 1000ms');
  console.log('   最大リクエスト: 3回/ウィンドウ');
  
  // Token Bucket テスト
  console.log('\n🔍 Token Bucket テスト（連続10リクエスト）:');
  let tbAllowed = 0;
  let tbBlocked = 0;
  for (let i = 0; i < 10; i++) {
    const allowed = await tokenBucket.tryAcquire();
    if (allowed) {
      tbAllowed++;
      console.log(`   リクエスト ${i + 1}: 許可 ✅`);
    } else {
      tbBlocked++;
      console.log(`   リクエスト ${i + 1}: 制限 🔴`);
    }
  }
  
  // Sliding Window テスト
  console.log('\n🔍 Sliding Window テスト（連続10リクエスト）:');
  let swAllowed = 0;
  let swBlocked = 0;
  for (let i = 0; i < 10; i++) {
    const allowed = slidingWindow.tryAcquire();
    if (allowed) {
      swAllowed++;
      console.log(`   リクエスト ${i + 1}: 許可 ✅`);
    } else {
      swBlocked++;
      console.log(`   リクエスト ${i + 1}: 制限 🔴`);
    }
  }
  
  console.log('\n📊 比較結果:');
  console.log('┌──────────────────┬────────┬────────┐');
  console.log('│ アルゴリズム     │ 許可   │ 制限   │');
  console.log('├──────────────────┼────────┼────────┤');
  console.log(`│ Token Bucket     │ ${String(tbAllowed).padStart(6)} │ ${String(tbBlocked).padStart(6)} │`);
  console.log(`│ Sliding Window   │ ${String(swAllowed).padStart(6)} │ ${String(swBlocked).padStart(6)} │`);
  console.log('└──────────────────┴────────┴────────┘');
  
  console.log('\n💡 使い分け:');
  console.log('   Token Bucket: バースト許容、平均レート制御');
  console.log('   Sliding Window: 厳密なレート制御、予測可能');
  
  return {
    tokenBucket: { allowed: tbAllowed, blocked: tbBlocked },
    slidingWindow: { allowed: swAllowed, blocked: swBlocked },
  };
}

// EXP-009: ScheduleRunner (Cronベーススケジューラ)
async function exp009_scheduleRunner() {
  console.log('\n' + '='.repeat(60));
  console.log('EXP-009: ScheduleRunner 機能検証');
  console.log('='.repeat(60));
  
  const { ScheduleRunner } = await import('../../libs/ingestion/src/scheduler/schedule-runner.js');
  
  const runner = new ScheduleRunner({
    maxRetries: 3,
    initialRetryDelayMs: 100,
    maxRetryDelayMs: 1000,
  });
  
  console.log('\n📋 ScheduleRunner設定:');
  console.log('   最大リトライ: 3回');
  console.log('   初期リトライ遅延: 100ms');
  console.log('   最大リトライ遅延: 1000ms');
  
  let executionCount = 0;
  let successCount = 0;
  const startTime = Date.now();
  
  // スケジュール追加（毎秒実行）
  const taskName = 'test-harvest';
  runner.addSchedule(
    {
      name: taskName,
      cronExpression: '* * * * * *', // 毎秒
      runOnStart: false,
      maxRetries: 2,
    },
    async () => {
      executionCount++;
      successCount++;
      console.log(`   実行 ${executionCount}: ${Date.now() - startTime}ms 経過`);
    }
  );
  
  console.log('\n🔍 スケジュール開始（3秒間）...');
  
  // スケジュール開始
  runner.start(taskName);
  
  // 3秒間実行
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // スケジュール停止
  runner.stop(taskName);
  
  // ステータス確認
  const status = runner.getStatus(taskName);
  
  console.log('\n📊 結果:');
  console.log(`   総実行回数: ${executionCount}`);
  console.log(`   成功回数: ${successCount}`);
  console.log(`   スケジュール状態: ${status?.isActive ? 'アクティブ' : '停止'}`);
  console.log(`   連続失敗数: ${status?.consecutiveFailures || 0}`);
  
  console.log('\n💡 ScheduleRunnerの用途:');
  console.log('   ✅ 定期的な論文取り込み');
  console.log('   ✅ 知識グラフの増分更新');
  console.log('   ✅ 外部APIの定期ポーリング');
  console.log('   ✅ 失敗時の指数バックオフリトライ');
  
  return {
    executionCount,
    successCount,
    status: status?.isActive ? 'active' : 'stopped',
    consecutiveFailures: status?.consecutiveFailures || 0,
  };
}

// EXP-010: 統合テスト（Ingestionパイプライン）
async function exp010_integrationTest() {
  console.log('\n' + '='.repeat(60));
  console.log('EXP-010: 取り込みパイプライン統合テスト');
  console.log('='.repeat(60));
  
  // 既存の取り込み結果を分析
  const resultsPath = path.join(process.cwd(), 'data/chunks/_ingest-results.json');
  
  if (!fs.existsSync(resultsPath)) {
    console.log('   ⚠️ 取り込み結果ファイルが見つかりません');
    return { error: 'No results file' };
  }
  
  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
  
  console.log('\n📊 取り込み結果分析:');
  console.log(`   実行日時: ${results.timestamp}`);
  console.log(`   総論文数: ${results.summary.total}`);
  console.log(`   成功: ${results.summary.successful}`);
  console.log(`   失敗: ${results.summary.failed}`);
  console.log(`   成功率: ${((results.summary.successful / results.summary.total) * 100).toFixed(1)}%`);
  console.log(`   総チャンク数: ${results.summary.totalChunks}`);
  
  // カテゴリ別分析
  const byStatus = results.results.reduce((acc: Record<string, number>, r: any) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\n📈 ステータス別:');
  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`   - ${status}: ${count}件`);
  });
  
  // 成功した論文の一覧
  console.log('\n📚 取り込み成功論文（上位10件）:');
  const successPapers = results.results
    .filter((r: any) => r.status === 'success')
    .sort((a: any, b: any) => b.chunks - a.chunks)
    .slice(0, 10);
  
  successPapers.forEach((p: any, i: number) => {
    console.log(`   ${i + 1}. ${p.title} (${p.chunks} chunks)`);
  });
  
  console.log('\n💡 v3.0.0 Ingestionパイプラインの特徴:');
  console.log('   ✅ arXiv/Semantic Scholar API統合');
  console.log('   ✅ 自動重複検出・除去');
  console.log('   ✅ レート制限準拠');
  console.log('   ✅ 失敗時のリトライ機能');
  console.log('   ✅ 増分ハーベスティング');
  
  return {
    total: results.summary.total,
    successful: results.summary.successful,
    failed: results.summary.failed,
    successRate: (results.summary.successful / results.summary.total) * 100,
    totalChunks: results.summary.totalChunks,
  };
}

// メイン実行
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     YAGOKORO v3.0.0 実験スイート（EXP-006 〜 EXP-010）    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const allResults: Record<string, any> = {};
  
  // 各実験を順次実行
  allResults['EXP-006'] = await exp006_graphStats();
  allResults['EXP-007'] = await exp007_circuitBreaker();
  allResults['EXP-008'] = await exp008_rateLimiter();
  allResults['EXP-009'] = await exp009_scheduleRunner();
  allResults['EXP-010'] = await exp010_integrationTest();
  
  // 結果を保存
  const outputPath = path.join(process.cwd(), 'outputs/experiments/exp-006-010-results.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    experiment: 'EXP-006 to EXP-010',
    title: 'v3.0.0 機能統合実験',
    timestamp: new Date().toISOString(),
    results: allResults,
  }, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ 全実験完了');
  console.log(`   結果を保存: ${outputPath}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
