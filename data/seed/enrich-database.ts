/**
 * Database Enrichment Script
 * 論文から著者・組織を抽出し、リレーションを構築
 */

import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password')
);

// 有名な組織のマッピング
const ORGANIZATION_PATTERNS: Record<string, { name: string; type: string }> = {
  'google': { name: 'Google', type: 'Company' },
  'deepmind': { name: 'Google DeepMind', type: 'Research Lab' },
  'openai': { name: 'OpenAI', type: 'Research Lab' },
  'meta': { name: 'Meta AI', type: 'Company' },
  'facebook': { name: 'Meta AI', type: 'Company' },
  'microsoft': { name: 'Microsoft Research', type: 'Company' },
  'nvidia': { name: 'NVIDIA', type: 'Company' },
  'alibaba': { name: 'Alibaba', type: 'Company' },
  'tencent': { name: 'Tencent', type: 'Company' },
  'baidu': { name: 'Baidu', type: 'Company' },
  'huawei': { name: 'Huawei', type: 'Company' },
  'amazon': { name: 'Amazon', type: 'Company' },
  'aws': { name: 'Amazon Web Services', type: 'Company' },
  'ibm': { name: 'IBM Research', type: 'Company' },
  'apple': { name: 'Apple', type: 'Company' },
  'anthropic': { name: 'Anthropic', type: 'Research Lab' },
  'stanford': { name: 'Stanford University', type: 'University' },
  'mit': { name: 'MIT', type: 'University' },
  'berkeley': { name: 'UC Berkeley', type: 'University' },
  'cmu': { name: 'Carnegie Mellon University', type: 'University' },
  'harvard': { name: 'Harvard University', type: 'University' },
  'princeton': { name: 'Princeton University', type: 'University' },
  'cornell': { name: 'Cornell University', type: 'University' },
  'caltech': { name: 'Caltech', type: 'University' },
  'oxford': { name: 'University of Oxford', type: 'University' },
  'cambridge': { name: 'University of Cambridge', type: 'University' },
  'eth': { name: 'ETH Zurich', type: 'University' },
  'tsinghua': { name: 'Tsinghua University', type: 'University' },
  'peking': { name: 'Peking University', type: 'University' },
  'toronto': { name: 'University of Toronto', type: 'University' },
  'ucla': { name: 'UCLA', type: 'University' },
  'nyu': { name: 'New York University', type: 'University' },
  'columbia': { name: 'Columbia University', type: 'University' },
  'yale': { name: 'Yale University', type: 'University' },
  'washington': { name: 'University of Washington', type: 'University' },
  'illinois': { name: 'UIUC', type: 'University' },
  'michigan': { name: 'University of Michigan', type: 'University' },
  'georgia tech': { name: 'Georgia Tech', type: 'University' },
  'inria': { name: 'INRIA', type: 'Research Lab' },
  'mila': { name: 'Mila', type: 'Research Lab' },
  'allen': { name: 'Allen Institute for AI', type: 'Research Lab' },
};

// 著名な研究者のマッピング
const NOTABLE_RESEARCHERS: Record<string, { fullName: string; affiliation: string }> = {
  'vaswani': { fullName: 'Ashish Vaswani', affiliation: 'Google' },
  'hinton': { fullName: 'Geoffrey Hinton', affiliation: 'Google DeepMind' },
  'lecun': { fullName: 'Yann LeCun', affiliation: 'Meta AI' },
  'bengio': { fullName: 'Yoshua Bengio', affiliation: 'Mila' },
  'sutskever': { fullName: 'Ilya Sutskever', affiliation: 'OpenAI' },
  'ng': { fullName: 'Andrew Ng', affiliation: 'Stanford University' },
  'goodfellow': { fullName: 'Ian Goodfellow', affiliation: 'Google DeepMind' },
  'radford': { fullName: 'Alec Radford', affiliation: 'OpenAI' },
  'brown': { fullName: 'Tom Brown', affiliation: 'Anthropic' },
  'kaplan': { fullName: 'Jared Kaplan', affiliation: 'Anthropic' },
  'chen': { fullName: 'Mark Chen', affiliation: 'OpenAI' },
  'touvron': { fullName: 'Hugo Touvron', affiliation: 'Meta AI' },
  'devlin': { fullName: 'Jacob Devlin', affiliation: 'Google' },
  'raffel': { fullName: 'Colin Raffel', affiliation: 'Google' },
  'ho': { fullName: 'Jonathan Ho', affiliation: 'Google' },
  'song': { fullName: 'Yang Song', affiliation: 'OpenAI' },
  'rombach': { fullName: 'Robin Rombach', affiliation: 'Stability AI' },
  'dosovitskiy': { fullName: 'Alexey Dosovitskiy', affiliation: 'Google' },
  'he': { fullName: 'Kaiming He', affiliation: 'Meta AI' },
  'zoph': { fullName: 'Barret Zoph', affiliation: 'Google' },
  'ouyang': { fullName: 'Long Ouyang', affiliation: 'OpenAI' },
  'schulman': { fullName: 'John Schulman', affiliation: 'OpenAI' },
  'silver': { fullName: 'David Silver', affiliation: 'Google DeepMind' },
  'mnih': { fullName: 'Volodymyr Mnih', affiliation: 'Google DeepMind' },
};

// 主要トピック/キーワード
const TOPIC_KEYWORDS: Record<string, string[]> = {
  'Large Language Models': ['llm', 'large language model', 'gpt', 'bert', 'transformer', 'language model'],
  'Computer Vision': ['image classification', 'object detection', 'segmentation', 'cnn', 'convolutional'],
  'Generative AI': ['generative', 'gan', 'diffusion', 'image generation', 'text-to-image', 'stable diffusion'],
  'Reinforcement Learning': ['reinforcement learning', 'rl', 'policy gradient', 'q-learning', 'reward'],
  'Natural Language Processing': ['nlp', 'natural language', 'text', 'sentiment', 'translation', 'summarization'],
  'Multimodal AI': ['multimodal', 'vision-language', 'clip', 'visual question', 'image captioning'],
  'Model Efficiency': ['pruning', 'quantization', 'distillation', 'compression', 'efficient'],
  'Attention Mechanisms': ['attention', 'self-attention', 'cross-attention', 'multi-head'],
  'Graph Neural Networks': ['graph neural', 'gnn', 'message passing', 'node embedding'],
  'Speech & Audio': ['speech recognition', 'asr', 'text-to-speech', 'tts', 'audio', 'whisper'],
  'AI Safety': ['safety', 'alignment', 'rlhf', 'robustness', 'adversarial', 'fairness'],
  'Transfer Learning': ['transfer learning', 'fine-tuning', 'pretrained', 'domain adaptation'],
  'Few-Shot Learning': ['few-shot', 'zero-shot', 'meta-learning', 'in-context learning'],
  'Neural Architecture': ['architecture search', 'nas', 'neural architecture', 'network design'],
  'Embeddings': ['embedding', 'representation learning', 'contrastive', 'self-supervised'],
};

interface Author {
  id: string;
  name: string;
  normalizedName: string;
}

interface Organization {
  id: string;
  name: string;
  type: string;
}

interface Topic {
  id: string;
  name: string;
}

// 著者名の正規化
function normalizeAuthorName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ');
}

// 組織の検出
function detectOrganization(text: string): Organization | null {
  const lowerText = text.toLowerCase();
  for (const [pattern, org] of Object.entries(ORGANIZATION_PATTERNS)) {
    if (lowerText.includes(pattern)) {
      return {
        id: `org-${org.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: org.name,
        type: org.type
      };
    }
  }
  return null;
}

// 著名研究者の検出
function detectNotableResearcher(authorName: string): { fullName: string; affiliation: string } | null {
  const lowerName = authorName.toLowerCase();
  for (const [pattern, info] of Object.entries(NOTABLE_RESEARCHERS)) {
    if (lowerName.includes(pattern)) {
      return info;
    }
  }
  return null;
}

// トピックの検出
function detectTopics(text: string): string[] {
  const lowerText = text.toLowerCase();
  const detectedTopics: string[] = [];
  
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        detectedTopics.push(topic);
        break;
      }
    }
  }
  
  return detectedTopics;
}

// =====================
// Main Functions
// =====================

async function extractAuthorsFromPublications(session: neo4j.Session): Promise<void> {
  console.log('\n📝 Step 1: Extracting authors from publications...');
  
  // 著者情報を持つ論文を取得
  const result = await session.run(`
    MATCH (p:Publication)
    WHERE p.authors IS NOT NULL AND p.authors <> ''
    RETURN p.id as pubId, p.name as title, p.authors as authors, p.description as description
  `);
  
  const authorMap = new Map<string, { name: string; publications: string[]; affiliation?: string }>();
  const pubAuthors: { pubId: string; authorId: string }[] = [];
  
  for (const record of result.records) {
    const pubId = record.get('pubId');
    const authorsRaw = record.get('authors');
    const description = record.get('description') || '';
    
    if (!authorsRaw) continue;
    
    // 配列または文字列の両方に対応
    let authors: string[];
    if (Array.isArray(authorsRaw)) {
      authors = authorsRaw.filter((a: string) => a && a.length > 2 && a !== 'et al.');
    } else if (typeof authorsRaw === 'string') {
      authors = authorsRaw.split(',').map((a: string) => a.trim()).filter((a: string) => a.length > 2 && a !== 'et al.');
    } else {
      continue;
    }
    
    for (const authorName of authors) {
      const normalized = normalizeAuthorName(authorName);
      const authorId = `author-${normalized.replace(/\s+/g, '-')}`;
      
      if (!authorMap.has(authorId)) {
        const notable = detectNotableResearcher(authorName);
        authorMap.set(authorId, {
          name: notable?.fullName || authorName,
          publications: [],
          affiliation: notable?.affiliation
        });
      }
      
      authorMap.get(authorId)!.publications.push(pubId);
      pubAuthors.push({ pubId, authorId });
    }
  }
  
  console.log(`   Found ${authorMap.size} unique authors`);
  
  // 著者ノードを作成
  let created = 0;
  for (const [authorId, info] of authorMap) {
    if (info.publications.length >= 1) { // 1件以上の論文を持つ著者のみ
      try {
        await session.run(`
          MERGE (a:Person {name: $name})
          ON CREATE SET
            a.id = $id,
            a.description = $description,
            a.publicationCount = $pubCount,
            a.createdAt = datetime()
          ON MATCH SET
            a.publicationCount = COALESCE(a.publicationCount, 0) + $pubCount,
            a.updatedAt = datetime()
        `, {
          id: authorId,
          name: info.name,
          description: `AI researcher with ${info.publications.length} publications${info.affiliation ? ` at ${info.affiliation}` : ''}`,
          pubCount: info.publications.length
        });
        created++;
      } catch (e) {
        // Skip duplicates
      }
    }
  }
  console.log(`   Created/Updated ${created} author nodes`);
  
  // AUTHORED リレーションを作成
  let relations = 0;
  for (const { pubId, authorId } of pubAuthors) {
    if (authorMap.get(authorId)!.publications.length >= 1) {
      const authorName = authorMap.get(authorId)!.name;
      try {
        await session.run(`
          MATCH (a:Person {name: $authorName})
          MATCH (p:Publication {id: $pubId})
          MERGE (a)-[r:AUTHORED]->(p)
          ON CREATE SET r.createdAt = datetime()
        `, { authorName, pubId });
        relations++;
      } catch (e) {
        // Skip errors
      }
    }
  }
  console.log(`   Created ${relations} AUTHORED relations`);
}

async function extractOrganizations(session: neo4j.Session): Promise<void> {
  console.log('\n🏢 Step 2: Extracting organizations...');
  
  const result = await session.run(`
    MATCH (p:Publication)
    WHERE p.description IS NOT NULL
    RETURN p.id as pubId, p.description as description
  `);
  
  const orgMap = new Map<string, { name: string; type: string; publications: string[] }>();
  
  for (const record of result.records) {
    const pubId = record.get('pubId');
    const description = record.get('description') || '';
    
    const org = detectOrganization(description);
    if (org) {
      if (!orgMap.has(org.id)) {
        orgMap.set(org.id, { name: org.name, type: org.type, publications: [] });
      }
      orgMap.get(org.id)!.publications.push(pubId);
    }
  }
  
  console.log(`   Found ${orgMap.size} organizations`);
  
  // 組織ノードを作成
  for (const [orgId, info] of orgMap) {
    try {
      await session.run(`
        MERGE (o:Organization {name: $name})
        ON CREATE SET
          o.id = $id,
          o.type = $type,
          o.description = $description,
          o.publicationCount = $pubCount,
          o.createdAt = datetime()
        ON MATCH SET
          o.publicationCount = COALESCE(o.publicationCount, 0) + $pubCount,
          o.updatedAt = datetime()
      `, {
        id: orgId,
        name: info.name,
        type: info.type,
        description: `${info.type} with research in AI/ML. ${info.publications.length} related publications.`,
        pubCount: info.publications.length
      });
    } catch (e) {
      // Skip duplicates
    }
  }
  console.log(`   Created/Updated ${orgMap.size} organization nodes`);
}

async function extractTopics(session: neo4j.Session): Promise<void> {
  console.log('\n🏷️  Step 3: Extracting topics and creating relations...');
  
  // トピックノードを作成
  const topics = Object.keys(TOPIC_KEYWORDS);
  for (const topic of topics) {
    const topicId = `topic-${topic.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    await session.run(`
      MERGE (t:Concept {id: $id})
      ON CREATE SET
        t.name = $name,
        t.description = $description,
        t.createdAt = datetime()
    `, {
      id: topicId,
      name: topic,
      description: `Research topic: ${topic}. Keywords: ${TOPIC_KEYWORDS[topic].join(', ')}`
    });
  }
  console.log(`   Created ${topics.length} topic nodes`);
  
  // 論文とトピックのリレーションを作成
  const result = await session.run(`
    MATCH (p:Publication)
    WHERE p.name IS NOT NULL AND p.description IS NOT NULL
    RETURN p.id as pubId, p.name as title, p.description as description
  `);
  
  let relations = 0;
  for (const record of result.records) {
    const pubId = record.get('pubId');
    const title = record.get('title') || '';
    const description = record.get('description') || '';
    const text = `${title} ${description}`;
    
    const detectedTopics = detectTopics(text);
    
    for (const topic of detectedTopics) {
      const topicId = `topic-${topic.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      await session.run(`
        MATCH (p:Publication {id: $pubId})
        MATCH (t:Concept {id: $topicId})
        MERGE (p)-[r:BELONGS_TO]->(t)
        ON CREATE SET r.createdAt = datetime()
      `, { pubId, topicId });
      relations++;
    }
  }
  console.log(`   Created ${relations} BELONGS_TO relations`);
}

async function createSimilarityRelations(session: neo4j.Session): Promise<void> {
  console.log('\n🔗 Step 4: Creating similarity relations between publications...');
  
  // 同じカテゴリの論文間にリレーションを作成
  const result = await session.run(`
    MATCH (p1:Publication)-[:BELONGS_TO]->(t:Concept)<-[:BELONGS_TO]-(p2:Publication)
    WHERE p1.id < p2.id
    WITH p1, p2, count(t) as commonTopics
    WHERE commonTopics >= 2
    RETURN p1.id as pub1, p2.id as pub2, commonTopics
    LIMIT 500
  `);
  
  let relations = 0;
  for (const record of result.records) {
    const pub1 = record.get('pub1');
    const pub2 = record.get('pub2');
    const commonTopics = record.get('commonTopics').toNumber();
    
    await session.run(`
      MATCH (p1:Publication {id: $pub1})
      MATCH (p2:Publication {id: $pub2})
      MERGE (p1)-[r:SIMILAR_TO]->(p2)
      SET r.strength = $strength, r.updatedAt = datetime()
    `, { pub1, pub2, strength: commonTopics });
    relations++;
  }
  console.log(`   Created ${relations} SIMILAR_TO relations`);
}

async function createYearBasedRelations(session: neo4j.Session): Promise<void> {
  console.log('\n📅 Step 5: Creating year-based and category-based relations...');
  
  // 同じカテゴリ内で時系列順にリレーションを作成
  const result = await session.run(`
    MATCH (p1:Publication)
    WHERE p1.year IS NOT NULL AND p1.primaryCategory IS NOT NULL
    WITH p1.primaryCategory as category, p1
    ORDER BY p1.year
    WITH category, collect(p1) as papers
    WHERE size(papers) > 1
    UNWIND range(0, size(papers)-2) as i
    WITH papers[i] as earlier, papers[i+1] as later
    WHERE later.year - earlier.year <= 2
    RETURN earlier.id as earlierId, later.id as laterId
    LIMIT 300
  `);
  
  let relations = 0;
  for (const record of result.records) {
    const earlierId = record.get('earlierId');
    const laterId = record.get('laterId');
    
    await session.run(`
      MATCH (p1:Publication {id: $earlierId})
      MATCH (p2:Publication {id: $laterId})
      MERGE (p1)-[r:PRECEDES]->(p2)
      ON CREATE SET r.createdAt = datetime()
    `, { earlierId, laterId });
    relations++;
  }
  console.log(`   Created ${relations} PRECEDES relations`);
}

async function printStatistics(session: neo4j.Session): Promise<void> {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Final Database Statistics');
  console.log('═'.repeat(60));
  
  // ノード統計
  const nodeResult = await session.run(`
    MATCH (n)
    RETURN labels(n)[0] as label, count(*) as count
    ORDER BY count DESC
  `);
  
  console.log('\n📦 Nodes:');
  for (const record of nodeResult.records) {
    console.log(`   ${record.get('label')}: ${record.get('count')}`);
  }
  
  // リレーション統計
  const relResult = await session.run(`
    MATCH ()-[r]->()
    RETURN type(r) as type, count(*) as count
    ORDER BY count DESC
    LIMIT 15
  `);
  
  console.log('\n🔗 Relations (top 15):');
  for (const record of relResult.records) {
    console.log(`   ${record.get('type')}: ${record.get('count')}`);
  }
  
  // 総計
  const totalNodes = await session.run('MATCH (n) RETURN count(n) as count');
  const totalRels = await session.run('MATCH ()-[r]->() RETURN count(r) as count');
  
  console.log('\n📈 Totals:');
  console.log(`   Total Nodes: ${totalNodes.records[0].get('count')}`);
  console.log(`   Total Relations: ${totalRels.records[0].get('count')}`);
  console.log('═'.repeat(60));
}

// Main
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        YAGOKORO Database Enrichment                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const session = driver.session();
  
  try {
    await extractAuthorsFromPublications(session);
    await extractOrganizations(session);
    await extractTopics(session);
    await createSimilarityRelations(session);
    await createYearBasedRelations(session);
    await printStatistics(session);
    
    console.log('\n✅ Database enrichment complete!');
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch(console.error);
