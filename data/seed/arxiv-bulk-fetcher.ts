/**
 * arXiv Bulk Paper Fetcher
 * AI/ML分野の論文を大量取得してNeo4jに投入
 */

import neo4j from 'neo4j-driver';

// Neo4j接続
const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password')
);

// arXiv API設定
const ARXIV_API = 'http://export.arxiv.org/api/query';
const BATCH_SIZE = 100;
const DELAY_MS = 3000; // arXiv API rate limit対策

interface ArxivPaper {
  id: string;
  arxivId: string;
  title: string;
  abstract: string;
  authors: string[];
  published: string;
  categories: string[];
  primaryCategory: string;
}

interface Entity {
  id: string;
  type: string;
  name: string;
  description: string;
  year?: number;
  arxivId?: string;
  authors?: string;
  categories?: string;
}

// AI/ML関連のarXivカテゴリと検索クエリ
const SEARCH_QUERIES = [
  // NLP & LLMs
  { query: 'cat:cs.CL AND (large language model OR LLM OR transformer)', maxResults: 150, category: 'NLP' },
  { query: 'cat:cs.CL AND (BERT OR GPT OR attention mechanism)', maxResults: 100, category: 'NLP' },
  { query: 'cat:cs.CL AND (neural machine translation OR NMT)', maxResults: 50, category: 'NLP' },
  
  // Computer Vision
  { query: 'cat:cs.CV AND (convolutional neural network OR CNN OR image classification)', maxResults: 100, category: 'CV' },
  { query: 'cat:cs.CV AND (object detection OR YOLO OR Faster RCNN)', maxResults: 80, category: 'CV' },
  { query: 'cat:cs.CV AND (vision transformer OR ViT OR image segmentation)', maxResults: 70, category: 'CV' },
  
  // Generative Models
  { query: 'cat:cs.LG AND (generative adversarial OR GAN OR diffusion model)', maxResults: 100, category: 'Generative' },
  { query: 'cat:cs.CV AND (image generation OR text-to-image OR stable diffusion)', maxResults: 80, category: 'Generative' },
  
  // Reinforcement Learning
  { query: 'cat:cs.LG AND (reinforcement learning OR policy gradient OR Q-learning)', maxResults: 100, category: 'RL' },
  { query: 'cat:cs.AI AND (multi-agent OR game playing OR AlphaGo)', maxResults: 50, category: 'RL' },
  
  // Optimization & Efficiency
  { query: 'cat:cs.LG AND (model compression OR pruning OR quantization)', maxResults: 80, category: 'Efficiency' },
  { query: 'cat:cs.LG AND (knowledge distillation OR efficient inference)', maxResults: 60, category: 'Efficiency' },
  
  // Multimodal
  { query: 'cat:cs.CV AND (multimodal OR vision-language OR CLIP)', maxResults: 80, category: 'Multimodal' },
  { query: 'cat:cs.CL AND (visual question answering OR VQA OR image captioning)', maxResults: 50, category: 'Multimodal' },
  
  // Graph Neural Networks
  { query: 'cat:cs.LG AND (graph neural network OR GNN OR message passing)', maxResults: 80, category: 'GNN' },
  
  // Audio & Speech
  { query: 'cat:cs.SD AND (speech recognition OR ASR OR text-to-speech)', maxResults: 70, category: 'Audio' },
  { query: 'cat:eess.AS AND (automatic speech OR acoustic model)', maxResults: 40, category: 'Audio' },
  
  // Safety & Alignment
  { query: 'cat:cs.AI AND (AI safety OR alignment OR RLHF)', maxResults: 60, category: 'Safety' },
  { query: 'cat:cs.LG AND (adversarial robustness OR fairness OR bias)', maxResults: 50, category: 'Safety' },
];

// XMLパース用ヘルパー
function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function extractAllTags(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  const matches = xml.matchAll(regex);
  return Array.from(matches).map(m => m[1].trim());
}

function extractAttribute(xml: string, tag: string, attr: string): string {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

// arXiv APIから論文取得
async function fetchArxivPapers(query: string, start: number, maxResults: number): Promise<ArxivPaper[]> {
  const url = `${ARXIV_API}?search_query=${encodeURIComponent(query)}&start=${start}&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`;
  
  console.log(`  Fetching: ${query.substring(0, 60)}... (start=${start}, max=${maxResults})`);
  
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`  ❌ API error: ${response.status}`);
    return [];
  }
  
  const xml = await response.text();
  const entries = xml.split('<entry>').slice(1); // 最初の空要素をスキップ
  
  const papers: ArxivPaper[] = [];
  
  for (const entry of entries) {
    const idUrl = extractTag(entry, 'id');
    const arxivId = idUrl.replace('http://arxiv.org/abs/', '').replace(/v\d+$/, '');
    
    const title = extractTag(entry, 'title').replace(/\s+/g, ' ');
    const abstract = extractTag(entry, 'summary').replace(/\s+/g, ' ');
    const published = extractTag(entry, 'published').substring(0, 10);
    
    // 著者抽出
    const authorMatches = entry.matchAll(/<author>[\s\S]*?<name>([^<]+)<\/name>[\s\S]*?<\/author>/gi);
    const authors = Array.from(authorMatches).map(m => m[1].trim());
    
    // カテゴリ抽出
    const categoryMatches = entry.matchAll(/category[^>]*term="([^"]+)"/gi);
    const categories = Array.from(categoryMatches).map(m => m[1]);
    const primaryCategory = extractAttribute(entry, 'arxiv:primary_category', 'term');
    
    if (arxivId && title && abstract.length > 50) {
      papers.push({
        id: `pub-${arxivId.replace(/[^a-zA-Z0-9]/g, '-')}`,
        arxivId,
        title,
        abstract: abstract.substring(0, 1000), // 長すぎる場合は切り詰め
        authors: authors.slice(0, 5), // 最大5人
        published,
        categories,
        primaryCategory: primaryCategory || categories[0] || 'cs.LG'
      });
    }
  }
  
  return papers;
}

// 重複チェック
async function getExistingArxivIds(session: neo4j.Session): Promise<Set<string>> {
  const result = await session.run(`
    MATCH (p:Publication)
    WHERE p.arxivId IS NOT NULL
    RETURN p.arxivId as arxivId
  `);
  
  return new Set(result.records.map(r => r.get('arxivId')));
}

// Neo4jに論文を投入
async function ingestPapers(session: neo4j.Session, papers: ArxivPaper[]): Promise<number> {
  let count = 0;
  
  for (const paper of papers) {
    try {
      await session.run(`
        MERGE (p:Publication {arxivId: $arxivId})
        ON CREATE SET
          p.id = $id,
          p.name = $title,
          p.description = $abstract,
          p.year = $year,
          p.authors = $authors,
          p.categories = $categories,
          p.primaryCategory = $primaryCategory,
          p.createdAt = datetime()
        ON MATCH SET
          p.updatedAt = datetime()
      `, {
        id: paper.id,
        arxivId: paper.arxivId,
        title: paper.title,
        abstract: paper.abstract,
        year: parseInt(paper.published.substring(0, 4)),
        authors: paper.authors.join(', '),
        categories: paper.categories.join(', '),
        primaryCategory: paper.primaryCategory
      });
      count++;
    } catch (error) {
      console.error(`  ❌ Error ingesting ${paper.arxivId}: ${error}`);
    }
  }
  
  return count;
}

// メイン実行
async function main() {
  console.log('🚀 arXiv Bulk Paper Fetcher');
  console.log('=' .repeat(60));
  
  const session = driver.session();
  
  try {
    // 既存のarXiv IDを取得
    const existingIds = await getExistingArxivIds(session);
    console.log(`📊 Existing papers with arXiv ID: ${existingIds.size}`);
    
    // 現在の論文総数を取得
    const countResult = await session.run('MATCH (p:Publication) RETURN count(p) as count');
    const currentCount = countResult.records[0].get('count').toNumber();
    console.log(`📊 Current total publications: ${currentCount}`);
    
    const targetCount = 1000;
    const needed = targetCount - currentCount;
    console.log(`🎯 Target: ${targetCount}, Need to add: ${needed}`);
    
    if (needed <= 0) {
      console.log('✅ Already have enough papers!');
      return;
    }
    
    let totalAdded = 0;
    const allPapers: ArxivPaper[] = [];
    
    // 各クエリで論文を取得
    for (const { query, maxResults, category } of SEARCH_QUERIES) {
      console.log(`\n📚 Category: ${category}`);
      
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      
      const papers = await fetchArxivPapers(query, 0, maxResults);
      
      // 重複除去
      const newPapers = papers.filter(p => !existingIds.has(p.arxivId) && !allPapers.find(ap => ap.arxivId === p.arxivId));
      
      allPapers.push(...newPapers);
      console.log(`  Found ${papers.length} papers, ${newPapers.length} new`);
      
      // 目標に達したら終了
      if (allPapers.length >= needed) {
        console.log(`\n✅ Reached target count: ${allPapers.length} papers`);
        break;
      }
    }
    
    // Neo4jに投入
    console.log(`\n📦 Ingesting ${Math.min(allPapers.length, needed)} papers to Neo4j...`);
    
    const papersToIngest = allPapers.slice(0, needed);
    const batchSize = 50;
    
    for (let i = 0; i < papersToIngest.length; i += batchSize) {
      const batch = papersToIngest.slice(i, i + batchSize);
      const added = await ingestPapers(session, batch);
      totalAdded += added;
      console.log(`  Progress: ${totalAdded}/${papersToIngest.length}`);
    }
    
    // 最終統計
    const finalResult = await session.run('MATCH (p:Publication) RETURN count(p) as count');
    const finalCount = finalResult.records[0].get('count').toNumber();
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Final Statistics:');
    console.log(`  Papers added: ${totalAdded}`);
    console.log(`  Total publications: ${finalCount}`);
    console.log('=' .repeat(60));
    
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch(console.error);
