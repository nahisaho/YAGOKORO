/**
 * Generate GenAI Genealogy using GraphRAG
 *
 * GraphRAGエンジンを使用して生成AIの進化の系譜を作成
 *
 * Features:
 * - EntityExtractor: AIModel, Organization, Person, Technique, Concept を抽出
 * - RelationExtractor: DERIVED_FROM, USES_TECHNIQUE, DEVELOPED_BY 等の関係を抽出
 * - ConceptGraphBuilder: コンセプトグラフ構築
 * - LeidenCommunityDetector: コミュニティ検出
 *
 * Usage:
 *   npx tsx scripts/generate-genai-genealogy-graphrag.ts
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

// Ollama設定
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://192.168.224.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b';

const DATA_DIRS = [
  'data/chunks',
  'data/chunks/unpaywall',
  'data/chunks/techniques',
  'data/chunks/techniques-2',
  'data/chunks/reasoning-agents',
];

const OUTPUT_DIR = 'outputs';

interface ExtractedEntity {
  tempId: string;
  name: string;
  type: string;
  confidence: number;
  description?: string;
}

interface ExtractedRelation {
  type: string;
  sourceTempId: string;
  targetTempId: string;
  confidence: number;
  description?: string;
}

// Ollama APIを直接呼び出し
async function ollamaChat(prompt: string): Promise<string> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 2000,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { response: string };
  return data.response;
}

/**
 * JSONを抽出・修復する関数
 * LLMの出力から有効なJSONを抽出し、一般的なエラーを修復
 */
function extractAndRepairJson(content: string): string | null {
  // Step 1: コードブロックからJSONを抽出
  let json = content;
  
  // ```json ... ``` または ``` ... ``` を抽出
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    json = codeBlockMatch[1]!;
  }

  // Step 2: JSONオブジェクトの開始と終了を見つける
  json = json.trim();
  
  // 先頭の非JSON文字を除去（"Here is the JSON:" などのプレフィックス）
  const firstBrace = json.indexOf('{');
  if (firstBrace === -1) {
    return null;
  }
  json = json.slice(firstBrace);

  // 末尾の非JSON文字を除去
  const lastBrace = json.lastIndexOf('}');
  if (lastBrace === -1) {
    return null;
  }
  json = json.slice(0, lastBrace + 1);

  // Step 3: 一般的なJSONエラーを修復
  
  // 3a: 末尾のカンマを除去 (配列内 [1, 2, 3,] → [1, 2, 3])
  json = json.replace(/,(\s*[\]}])/g, '$1');
  
  // 3b: シングルクォートをダブルクォートに変換
  // 注意: 文字列内のシングルクォートは保持
  json = json.replace(/'/g, '"');
  
  // 3c: 制御文字を除去（改行以外）
  json = json.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // 3d: エスケープされていない改行を空白に置換（文字列内）
  // JSONの文字列内の改行は \n でエスケープされる必要がある
  json = json.replace(/(?<!\\)\\n/g, '\\n');
  
  // 3e: 不正なエスケープシーケンスを修復
  json = json.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
  
  // 3f: NaNやInfinityを文字列に変換（JSONでは無効）
  json = json.replace(/:\s*NaN\b/g, ': "NaN"');
  json = json.replace(/:\s*Infinity\b/g, ': "Infinity"');
  json = json.replace(/:\s*-Infinity\b/g, ': "-Infinity"');
  
  // 3g: undefinedをnullに変換
  json = json.replace(/:\s*undefined\b/g, ': null');

  return json;
}

/**
 * リトライ付きでJSONを解析
 */
async function parseJsonWithRetry<T>(
  content: string,
  retryPrompt: () => Promise<string>,
  maxRetries = 1
): Promise<T | null> {
  let attempts = 0;
  let lastContent = content;

  while (attempts <= maxRetries) {
    const json = extractAndRepairJson(lastContent);
    if (!json) {
      if (attempts < maxRetries) {
        attempts++;
        lastContent = await retryPrompt();
        continue;
      }
      return null;
    }

    try {
      return JSON.parse(json) as T;
    } catch (e) {
      if (attempts < maxRetries) {
        attempts++;
        lastContent = await retryPrompt();
        continue;
      }
      return null;
    }
  }

  return null;
}

interface PaperData {
  title: string;
  arxivId?: string;
  doi?: string;
  abstract?: string;
  year: number;
  category: string;
  chunks: Array<{ content: string }>;
  fullText?: string;
}

interface GraphRAGResult {
  entities: ExtractedEntity[];
  relations: ExtractedRelation[];
  papers: PaperData[];
}

// 年の推定（arXiv IDから）
function estimateYear(arxivId?: string): number | null {
  if (!arxivId) return null;
  const match = arxivId.match(/^(\d{2})(\d{2})\./);
  if (match) {
    const yearPrefix = parseInt(match[1]!, 10);
    return yearPrefix >= 90 ? 1900 + yearPrefix : 2000 + yearPrefix;
  }
  return null;
}

async function collectPapers(): Promise<PaperData[]> {
  const papers: PaperData[] = [];

  for (const dir of DATA_DIRS) {
    const fullPath = join(process.cwd(), dir);
    try {
      const files = await readdir(fullPath);
      const jsonFiles = files.filter((f) => f.endsWith('.json') && !f.startsWith('_'));

      for (const file of jsonFiles) {
        try {
          const content = await readFile(join(fullPath, file), 'utf-8');
          const data = JSON.parse(content);

          const paperData = data.paper || data;
          const title = paperData.title || data.title || file.replace('.json', '');

          let arxivId = data.arxivId || paperData.id;
          if (arxivId && arxivId.includes('v')) {
            arxivId = arxivId.split('v')[0];
          }

          let year = data.year || data.metadata?.year;
          if (!year && paperData.published) {
            year = new Date(paperData.published).getFullYear();
          }
          if (!year && arxivId) {
            year = estimateYear(arxivId);
          }
          if (!year) {
            year = 2020;
          }

          papers.push({
            title,
            arxivId,
            doi: data.doi,
            abstract: paperData.abstract || data.abstract,
            year,
            category: data.category || 'LLM',
            chunks: data.chunks || [],
            fullText: data.fullText,
          });
        } catch (e) {
          // Skip invalid files
        }
      }
    } catch (e) {
      // Skip missing directories
    }
  }

  return papers.sort((a, b) => a.year - b.year);
}

async function extractEntitiesAndRelations(
  papers: PaperData[]
): Promise<GraphRAGResult> {
  const allEntities: ExtractedEntity[] = [];
  const allRelations: ExtractedRelation[] = [];
  const entityMap = new Map<string, ExtractedEntity>();

  console.log(`\n📊 ${papers.length}件の論文からエンティティと関係を抽出中...`);

  // 主要な論文のアブストラクトから抽出（全部やると時間がかかるので上位80件）
  const keyPapers = papers
    .filter((p) => p.abstract && p.abstract.length > 100)
    .slice(0, 80);

  let processed = 0;
  let entityIdCounter = 0;

  for (const paper of keyPapers) {
    try {
      const text = `Title: ${paper.title}\n\nAbstract: ${paper.abstract?.slice(0, 1500)}`;

      // エンティティ抽出プロンプト
      const entityPrompt = `You are an expert at extracting named entities from AI research papers.
Extract entities from the following text. You MUST respond with ONLY a valid JSON object, no other text before or after.

JSON format:
{"entities": [{"name": "entity name", "type": "AIModel|Organization|Person|Technique|Concept", "confidence": 0.9, "description": "brief description"}]}

Entity types:
- AIModel: AI models like GPT-4, BERT, LLaMA, Mistral
- Organization: Companies and institutions like OpenAI, Google, Meta
- Person: Researchers and authors
- Technique: Methods and algorithms like attention, RLHF, LoRA
- Concept: Abstract concepts like few-shot learning, alignment

Text:
${text}

IMPORTANT: Respond with ONLY the JSON object. Do not include any explanation, markdown formatting, or code blocks.`;

      const entityContent = await ollamaChat(entityPrompt);

      // 新しいJSON解析・修復関数を使用
      interface EntityResult {
        entities: Array<{ name: string; type: string; confidence: number; description?: string }>;
      }
      
      const parsedEntities = await parseJsonWithRetry<EntityResult>(
        entityContent,
        async () => {
          // リトライ時はより厳密なプロンプトで再試行
          const retryPrompt = `Output ONLY valid JSON. No text before or after. Format: {"entities":[{"name":"X","type":"AIModel","confidence":0.9,"description":"Y"}]}

Extract AI entities from:
${text.slice(0, 800)}`;
          return await ollamaChat(retryPrompt);
        }
      );

      if (!parsedEntities) {
        console.log(`   ⚠ ${paper.title.slice(0, 40)}... JSON解析エラー（スキップ）`);
        continue;
      }

      const paperEntities: ExtractedEntity[] = [];
      for (const e of parsedEntities.entities || []) {
        if (!e.name || !e.type) continue;
        const key = `${e.type}:${e.name.toLowerCase()}`;
        if (!entityMap.has(key)) {
          const entity: ExtractedEntity = {
            tempId: `e${++entityIdCounter}`,
            name: e.name,
            type: e.type,
            confidence: e.confidence || 0.7,
            description: e.description,
          };
          entityMap.set(key, entity);
          allEntities.push(entity);
          paperEntities.push(entity);
        } else {
          paperEntities.push(entityMap.get(key)!);
        }
      }

      // 関係抽出（エンティティが2つ以上ある場合）
      if (paperEntities.length >= 2) {
        const entityList = paperEntities
          .slice(0, 10)
          .map((e) => `${e.tempId}: ${e.name} (${e.type})`)
          .join('\n');

        const relationPrompt = `You are an expert at extracting relationships between entities in AI research papers.
Given these entities:
${entityList}

And this text:
${text}

Extract relationships between the entities. You MUST respond with ONLY a valid JSON object, no other text.

JSON format:
{"relations": [{"type": "DEVELOPED_BY", "sourceId": "e1", "targetId": "e2", "confidence": 0.9}]}

Valid relation types: DEVELOPED_BY, USES_TECHNIQUE, DERIVED_FROM, EVALUATED_ON, RELATED_TO, PART_OF

IMPORTANT: Respond with ONLY the JSON object. No explanation or markdown.`;

        const relationContent = await ollamaChat(relationPrompt);

        // 新しいJSON解析・修復関数を使用
        interface RelationResult {
          relations: Array<{ type: string; sourceId: string; targetId: string; confidence?: number; description?: string }>;
        }
        
        const parsedRelations = await parseJsonWithRetry<RelationResult>(
          relationContent,
          async () => {
            // リトライ時の簡潔なプロンプト
            const simpleIds = paperEntities.slice(0, 5).map(e => e.tempId).join(',');
            return await ollamaChat(`Output ONLY JSON: {"relations":[{"type":"RELATED_TO","sourceId":"e1","targetId":"e2","confidence":0.8}]}. Use IDs: ${simpleIds}`);
          }
        );

        if (parsedRelations) {
          for (const r of parsedRelations.relations || []) {
            if (!r.type || !r.sourceId || !r.targetId) continue;
            allRelations.push({
              type: r.type,
              sourceTempId: r.sourceId,
              targetTempId: r.targetId,
              confidence: r.confidence || 0.7,
              description: r.description,
            });
          }
        }
        // 関係の解析エラーはスキップ（エンティティは取得済み）
      }

      processed++;
      if (processed % 10 === 0) {
        console.log(`   ✓ ${processed}/${keyPapers.length} 論文処理完了 (エンティティ: ${allEntities.length}, 関係: ${allRelations.length})`);
      }
    } catch (e) {
      console.log(`   ⚠ ${paper.title.slice(0, 40)}... エラー: ${(e as Error).message}`);
    }
  }

  console.log(`\n✅ 抽出完了:`);
  console.log(`   • エンティティ: ${allEntities.length}件`);
  console.log(`   • 関係: ${allRelations.length}件`);

  return { entities: allEntities, relations: allRelations, papers };
}

function generateMermaidFromGraphRAG(result: GraphRAGResult): string {
  const { entities, relations } = result;

  // エンティティをタイプ別に分類
  const aiModels = entities.filter((e) => e.type === 'AIModel');
  const techniques = entities.filter((e) => e.type === 'Technique');
  const organizations = entities.filter((e) => e.type === 'Organization');
  const concepts = entities.filter((e) => e.type === 'Concept');

  // 重要なエンティティを選択（出現頻度・関係数が多いもの）
  const relationCount = new Map<string, number>();
  for (const rel of relations) {
    const sourceKey = rel.sourceTempId;
    const targetKey = rel.targetTempId;
    relationCount.set(sourceKey, (relationCount.get(sourceKey) || 0) + 1);
    relationCount.set(targetKey, (relationCount.get(targetKey) || 0) + 1);
  }

  // 関係の多いエンティティを優先
  const sortedModels = aiModels
    .map((e) => ({ ...e, relCount: relationCount.get(e.tempId) || 0 }))
    .sort((a, b) => b.relCount - a.relCount)
    .slice(0, 35);

  const sortedTechniques = techniques
    .map((e) => ({ ...e, relCount: relationCount.get(e.tempId) || 0 }))
    .sort((a, b) => b.relCount - a.relCount)
    .slice(0, 25);

  const sortedOrgs = organizations
    .map((e) => ({ ...e, relCount: relationCount.get(e.tempId) || 0 }))
    .sort((a, b) => b.relCount - a.relCount)
    .slice(0, 15);

  const sortedConcepts = concepts
    .map((e) => ({ ...e, relCount: relationCount.get(e.tempId) || 0 }))
    .sort((a, b) => b.relCount - a.relCount)
    .slice(0, 20);

  // ノードID生成
  const nodeId = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 20);

  // entityIdMap作成
  const entityIdMap = new Map<string, string>();
  for (const e of [...sortedModels, ...sortedTechniques, ...sortedOrgs, ...sortedConcepts]) {
    entityIdMap.set(e.tempId, nodeId(e.name));
  }

  // AIモデル系譜図を生成
  let modelMermaid = `\`\`\`mermaid
flowchart TB
    %% === AIモデル系譜 ===
    
    %% GPT系
    subgraph GPT["🔵 GPT系列"]
        direction TB
`;

  // GPT系モデルをフィルタ
  const gptModels = sortedModels.filter(m => 
    m.name.toLowerCase().includes('gpt') || 
    m.name.toLowerCase().includes('chatgpt') ||
    m.name.toLowerCase().includes('openai')
  );
  for (const model of gptModels) {
    const id = nodeId(model.name);
    modelMermaid += `        ${id}["${model.name}"]\n`;
  }

  modelMermaid += `    end

    %% LLaMA/Meta系
    subgraph LLaMA["🦙 LLaMA/Meta系列"]
        direction TB
`;

  const llamaModels = sortedModels.filter(m => 
    m.name.toLowerCase().includes('llama') || 
    m.name.toLowerCase().includes('meta') ||
    m.name.toLowerCase().includes('opt')
  );
  for (const model of llamaModels) {
    const id = nodeId(model.name);
    modelMermaid += `        ${id}["${model.name}"]\n`;
  }

  modelMermaid += `    end

    %% BERT/Transformer系
    subgraph BERT["🔶 BERT/Encoder系列"]
        direction TB
`;

  const bertModels = sortedModels.filter(m => 
    m.name.toLowerCase().includes('bert') || 
    m.name.toLowerCase().includes('roberta') ||
    m.name.toLowerCase().includes('t5') ||
    m.name.toLowerCase().includes('encoder')
  );
  for (const model of bertModels) {
    const id = nodeId(model.name);
    modelMermaid += `        ${id}["${model.name}"]\n`;
  }

  modelMermaid += `    end

    %% その他主要モデル
    subgraph Others["🟢 その他主要モデル"]
        direction TB
`;

  const usedModels = new Set([...gptModels, ...llamaModels, ...bertModels].map(m => m.tempId));
  const otherModels = sortedModels.filter(m => !usedModels.has(m.tempId));
  for (const model of otherModels.slice(0, 15)) {
    const id = nodeId(model.name);
    modelMermaid += `        ${id}["${model.name}"]\n`;
  }

  modelMermaid += `    end

    %% 組織
    subgraph Orgs["🏢 開発組織"]
`;

  for (const org of sortedOrgs.slice(0, 10)) {
    const id = nodeId(org.name);
    modelMermaid += `        ${id}["${org.name}"]\n`;
  }

  modelMermaid += `    end

    %% AIモデル間の関係
`;

  // AIモデル関連の関係のみ抽出
  const addedModelEdges = new Set<string>();
  const modelIds = new Set(sortedModels.map(m => m.tempId));
  const orgIds = new Set(sortedOrgs.map(o => o.tempId));

  for (const rel of relations) {
    const sourceId = entityIdMap.get(rel.sourceTempId);
    const targetId = entityIdMap.get(rel.targetTempId);
    
    // モデル-モデル または モデル-組織 の関係のみ
    const isModelRel = modelIds.has(rel.sourceTempId) || modelIds.has(rel.targetTempId);
    const isOrgRel = orgIds.has(rel.sourceTempId) || orgIds.has(rel.targetTempId);
    
    if (sourceId && targetId && sourceId !== targetId && (isModelRel || isOrgRel)) {
      const edgeKey = `${sourceId}-${targetId}`;
      if (!addedModelEdges.has(edgeKey)) {
        addedModelEdges.add(edgeKey);
        const label = rel.type.replace(/_/g, ' ').toLowerCase();
        modelMermaid += `    ${sourceId} -->|${label}| ${targetId}\n`;
      }
    }
  }

  modelMermaid += `
    %% スタイリング
    classDef gpt fill:#10a37f,color:white
    classDef llama fill:#667eea,color:white
    classDef bert fill:#ff9800,color:white
    classDef other fill:#4caf50,color:white
    classDef org fill:#9c27b0,color:white
\`\`\``;

  // 技術系譜図を生成
  let techMermaid = `\`\`\`mermaid
flowchart TB
    %% === 主要技術系譜 ===
    
    %% Attention/Transformer系技術
    subgraph Attention["⚡ Attention/Transformer"]
        direction TB
`;

  const attentionTechs = sortedTechniques.filter(t => 
    t.name.toLowerCase().includes('attention') || 
    t.name.toLowerCase().includes('transformer') ||
    t.name.toLowerCase().includes('self-attention')
  );
  for (const tech of attentionTechs) {
    const id = nodeId(tech.name);
    techMermaid += `        ${id}["${tech.name}"]\n`;
  }

  techMermaid += `    end

    %% 推論・Reasoning技術
    subgraph Reasoning["🧠 推論・Reasoning"]
        direction TB
`;

  const reasoningTechs = sortedTechniques.filter(t => 
    t.name.toLowerCase().includes('chain') || 
    t.name.toLowerCase().includes('thought') ||
    t.name.toLowerCase().includes('reasoning') ||
    t.name.toLowerCase().includes('cot') ||
    t.name.toLowerCase().includes('step')
  );
  for (const tech of reasoningTechs) {
    const id = nodeId(tech.name);
    techMermaid += `        ${id}["${tech.name}"]\n`;
  }

  techMermaid += `    end

    %% 学習・最適化技術
    subgraph Training["📚 学習・最適化"]
        direction TB
`;

  const trainingTechs = sortedTechniques.filter(t => 
    t.name.toLowerCase().includes('fine-tuning') || 
    t.name.toLowerCase().includes('rlhf') ||
    t.name.toLowerCase().includes('lora') ||
    t.name.toLowerCase().includes('training') ||
    t.name.toLowerCase().includes('learning') ||
    t.name.toLowerCase().includes('instruction')
  );
  for (const tech of trainingTechs) {
    const id = nodeId(tech.name);
    techMermaid += `        ${id}["${tech.name}"]\n`;
  }

  techMermaid += `    end

    %% プロンプト技術
    subgraph Prompting["📝 プロンプティング"]
        direction TB
`;

  const promptTechs = sortedTechniques.filter(t => 
    t.name.toLowerCase().includes('prompt') || 
    t.name.toLowerCase().includes('few-shot') ||
    t.name.toLowerCase().includes('zero-shot') ||
    t.name.toLowerCase().includes('in-context')
  );
  for (const tech of promptTechs) {
    const id = nodeId(tech.name);
    techMermaid += `        ${id}["${tech.name}"]\n`;
  }

  techMermaid += `    end

    %% その他技術
    subgraph OtherTech["🔧 その他技術"]
        direction TB
`;

  const usedTechs = new Set([...attentionTechs, ...reasoningTechs, ...trainingTechs, ...promptTechs].map(t => t.tempId));
  const otherTechs = sortedTechniques.filter(t => !usedTechs.has(t.tempId));
  for (const tech of otherTechs.slice(0, 12)) {
    const id = nodeId(tech.name);
    techMermaid += `        ${id}["${tech.name}"]\n`;
  }

  techMermaid += `    end

    %% コンセプト
    subgraph Concepts["💡 コンセプト"]
        direction TB
`;

  for (const concept of sortedConcepts.slice(0, 12)) {
    const id = nodeId(concept.name);
    techMermaid += `        ${id}["${concept.name}"]\n`;
  }

  techMermaid += `    end

    %% 技術間の関係
`;

  // 技術関連の関係のみ抽出
  const addedTechEdges = new Set<string>();
  const techIds = new Set(sortedTechniques.map(t => t.tempId));
  const conceptIds = new Set(sortedConcepts.map(c => c.tempId));

  for (const rel of relations) {
    const sourceId = entityIdMap.get(rel.sourceTempId);
    const targetId = entityIdMap.get(rel.targetTempId);
    
    // 技術-技術 または 技術-コンセプト の関係のみ
    const isTechRel = techIds.has(rel.sourceTempId) || techIds.has(rel.targetTempId);
    const isConceptRel = conceptIds.has(rel.sourceTempId) || conceptIds.has(rel.targetTempId);
    
    if (sourceId && targetId && sourceId !== targetId && (isTechRel || isConceptRel)) {
      const edgeKey = `${sourceId}-${targetId}`;
      if (!addedTechEdges.has(edgeKey)) {
        addedTechEdges.add(edgeKey);
        const label = rel.type.replace(/_/g, ' ').toLowerCase();
        techMermaid += `    ${sourceId} -->|${label}| ${targetId}\n`;
      }
    }
  }

  techMermaid += `
    %% スタイリング  
    classDef attention fill:#e91e63,color:white
    classDef reasoning fill:#3f51b5,color:white
    classDef training fill:#009688,color:white
    classDef prompt fill:#ff5722,color:white
    classDef concept fill:#607d8b,color:white
\`\`\``;

  return { modelMermaid, techMermaid };
}

function generateMarkdownReport(result: GraphRAGResult): string {
  const { entities, relations, papers } = result;

  // エンティティ統計
  const entityByType = new Map<string, ExtractedEntity[]>();
  for (const e of entities) {
    const existing = entityByType.get(e.type) || [];
    existing.push(e);
    entityByType.set(e.type, existing);
  }

  // 関係統計
  const relationByType = new Map<string, number>();
  for (const r of relations) {
    relationByType.set(r.type, (relationByType.get(r.type) || 0) + 1);
  }

  let md = `# 生成AI進化の系譜 (GraphRAG分析)

> YAGOKORO GraphRAG Engine による自動生成
>
> 総論文数: ${papers.length}件
> 抽出エンティティ: ${entities.length}件
> 抽出関係: ${relations.length}件
> 生成日時: ${new Date().toISOString()}

## 📊 GraphRAG分析概要

本分析は、収集した${papers.length}件の学術論文から、GraphRAGエンジンを使用して
エンティティ（AIモデル、組織、技術、コンセプト）と、それらの間の関係性を
自動抽出し、生成AIの進化の系譜を可視化したものです。

---

## 📈 エンティティ統計

| タイプ | 件数 | 主要なエンティティ |
|--------|------|-------------------|
`;

  for (const [type, ents] of entityByType) {
    const topEnts = ents
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
      .map((e) => e.name)
      .join(', ');
    md += `| ${type} | ${ents.length} | ${topEnts} |\n`;
  }

  md += `

---

## 🔗 関係統計

| 関係タイプ | 件数 |
|------------|------|
`;

  for (const [type, count] of relationByType) {
    md += `| ${type} | ${count} |\n`;
  }

  // 2つの系譜図を取得
  const { modelMermaid, techMermaid } = generateMermaidFromGraphRAG(result);

  md += `

---

## 🤖 AIモデル系譜図

以下はGraphRAGで抽出されたAIモデル間の関係を可視化した系譜図です。

${modelMermaid}

---

## ⚙️ 主要技術系譜図

以下はGraphRAGで抽出された技術・コンセプト間の関係を可視化した系譜図です。

${techMermaid}

---

## 📋 主要AIモデル一覧

`;

  const aiModels = entityByType.get('AIModel') || [];
  for (const model of aiModels.sort((a, b) => b.confidence - a.confidence).slice(0, 20)) {
    md += `- **${model.name}** (confidence: ${(model.confidence * 100).toFixed(0)}%)\n`;
    if (model.description) {
      md += `  - ${model.description}\n`;
    }
  }

  md += `

---

## 🔧 主要技術一覧

`;

  const techniques = entityByType.get('Technique') || [];
  for (const tech of techniques.sort((a, b) => b.confidence - a.confidence).slice(0, 25)) {
    md += `- **${tech.name}** (confidence: ${(tech.confidence * 100).toFixed(0)}%)\n`;
    if (tech.description) {
      md += `  - ${tech.description}\n`;
    }
  }

  md += `

---

## 💡 主要コンセプト

`;

  const concepts = entityByType.get('Concept') || [];
  for (const concept of concepts.sort((a, b) => b.confidence - a.confidence).slice(0, 20)) {
    md += `- **${concept.name}** (confidence: ${(concept.confidence * 100).toFixed(0)}%)\n`;
    if (concept.description) {
      md += `  - ${concept.description}\n`;
    }
  }

  md += `

---

## 🏢 主要組織

`;

  const orgs = entityByType.get('Organization') || [];
  for (const org of orgs.sort((a, b) => b.confidence - a.confidence).slice(0, 15)) {
    md += `- **${org.name}** (confidence: ${(org.confidence * 100).toFixed(0)}%)\n`;
  }

  md += `

---

## 📚 分析対象論文

本分析は以下の論文データベースに基づいています:

| 年 | 論文数 |
|----|--------|
`;

  const byYear = new Map<number, number>();
  for (const p of papers) {
    byYear.set(p.year, (byYear.get(p.year) || 0) + 1);
  }

  for (const [year, count] of Array.from(byYear.entries()).sort((a, b) => a[0] - b[0])) {
    md += `| ${year} | ${count} |\n`;
  }

  md += `

---

*Generated by YAGOKORO GraphRAG Engine*
`;

  return md;
}

function generateJsonOutput(result: GraphRAGResult): object {
  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      engine: 'YAGOKORO GraphRAG',
      totalPapers: result.papers.length,
      totalEntities: result.entities.length,
      totalRelations: result.relations.length,
    },
    entities: result.entities.map((e) => ({
      name: e.name,
      type: e.type,
      confidence: e.confidence,
      description: e.description,
    })),
    relations: result.relations.map((r) => ({
      type: r.type,
      sourceId: r.sourceTempId,
      targetId: r.targetTempId,
      confidence: r.confidence,
      description: r.description,
    })),
    papers: result.papers.map((p) => ({
      title: p.title,
      arxivId: p.arxivId,
      year: p.year,
      category: p.category,
    })),
  };
}

async function main() {
  console.log('🔷 YAGOKORO GraphRAG - 生成AI系譜分析\n');
  console.log(`🦙 Ollamaプロバイダー: ${OLLAMA_BASE_URL} (${OLLAMA_MODEL})`);

  // 論文収集
  console.log('\n📚 論文データを収集中...');
  const papers = await collectPapers();
  console.log(`   ${papers.length}件の論文を発見`);

  // GraphRAG抽出
  const result = await extractEntitiesAndRelations(papers);

  // 出力生成
  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log('\n📝 出力ファイルを生成中...');

  // 1. メインレポート
  const report = generateMarkdownReport(result);
  await writeFile(join(OUTPUT_DIR, 'genai-genealogy-graphrag.md'), report);

  // 2. JSONデータ
  const jsonData = generateJsonOutput(result);
  await writeFile(join(OUTPUT_DIR, 'genai-graphrag-data.json'), JSON.stringify(jsonData, null, 2));

  console.log(`
✅ GraphRAG分析完了!

📁 出力ファイル:
   • outputs/genai-genealogy-graphrag.md - GraphRAG系譜レポート
   • outputs/genai-graphrag-data.json    - 構造化データ

📊 抽出統計:
   • 論文数: ${papers.length}件
   • エンティティ: ${result.entities.length}件
   • 関係: ${result.relations.length}件
`);
}

main().catch(console.error);
