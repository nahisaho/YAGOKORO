/**
 * arXiv 検索テストスクリプト
 */
import { ArxivClient } from '../libs/ingestion/dist/index.js';

async function main() {
  const client = new ArxivClient();
  
  console.log('🔍 arXiv から最新のAI論文を検索中...\n');
  
  try {
    const papers = await client.search({
      query: 'LLM reasoning',
      categories: ['cs.AI', 'cs.CL'],
      maxResults: 5,
      sortBy: 'submittedDate',
      sortOrder: 'descending',
    });
    
    console.log(`📚 ${papers.length} 件の論文が見つかりました:\n`);
    
    for (const paper of papers) {
      console.log(`📄 ${paper.id}`);
      console.log(`   タイトル: ${paper.title}`);
      console.log(`   著者: ${paper.authors.slice(0, 3).map(a => a.name).join(', ')}...`);
      console.log(`   カテゴリ: ${paper.categories.join(', ')}`);
      console.log(`   公開日: ${paper.publishedDate.toISOString().split('T')[0]}`);
      console.log('');
    }
  } catch (error) {
    console.error('エラー:', error);
  }
}

main();
