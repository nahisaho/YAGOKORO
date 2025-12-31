/**
 * ResearcherService Scalability Tests
 *
 * @description REQ-005-N01 非機能要件のスケーラビリティテスト
 *              50K研究者ノードでの性能検証
 * @since v4.0.0
 * @see REQ-005-N01
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ResearcherService, type Paper } from './ResearcherService.js';

describe('ResearcherService Scalability', () => {
  let service: ResearcherService;

  beforeEach(() => {
    service = new ResearcherService({
      enableCommunityDetection: true,
      enableORCID: false,
    });
  });

  afterEach(() => {
    service.clear();
  });

  describe('REQ-005-N01: 50K Node Scale Performance', () => {
    /**
     * 大規模データセット生成
     * 
     * @param numResearchers - 研究者数
     * @param papersPerResearcher - 1研究者あたりの論文数（平均）
     * @param coauthorsPerPaper - 1論文あたりの共著者数（平均）
     */
    const generateLargeDataset = (
      numResearchers: number,
      papersPerResearcher: number,
      coauthorsPerPaper: number
    ): Paper[] => {
      const papers: Paper[] = [];
      const researcherPool: string[] = [];
      
      // 研究者プールを生成
      for (let i = 0; i < numResearchers; i++) {
        researcherPool.push(`researcher-${i.toString().padStart(6, '0')}`);
      }

      // 論文を生成
      let paperId = 0;
      for (let r = 0; r < numResearchers; r++) {
        const numPapers = Math.max(1, papersPerResearcher + Math.floor(Math.random() * 3) - 1);
        
        for (let p = 0; p < numPapers; p++) {
          const mainAuthor = researcherPool[r]!;
          const authors = [{ name: mainAuthor }];
          
          // ランダムな共著者を追加
          const numCoauthors = Math.max(0, coauthorsPerPaper + Math.floor(Math.random() * 2) - 1);
          const usedIndices = new Set<number>([r]);
          
          for (let c = 0; c < numCoauthors && usedIndices.size < Math.min(numResearchers, coauthorsPerPaper + 5); c++) {
            let coauthorIndex: number;
            do {
              coauthorIndex = Math.floor(Math.random() * numResearchers);
            } while (usedIndices.has(coauthorIndex));
            
            usedIndices.add(coauthorIndex);
            authors.push({ name: researcherPool[coauthorIndex]! });
          }

          const year = 2010 + Math.floor(Math.random() * 14); // 2010-2023
          const month = Math.floor(Math.random() * 12) + 1;
          const day = Math.floor(Math.random() * 28) + 1;

          papers.push({
            id: `paper-${paperId++}`,
            title: `Paper ${paperId}`,
            authors,
            publishedDate: new Date(year, month - 1, day),
          });
        }
      }

      return papers;
    };

    it('should handle 1K researchers within 2 seconds', async () => {
      const papers = generateLargeDataset(1000, 3, 3);
      
      const startTime = performance.now();
      await service.indexPapers(papers);
      const indexTime = performance.now() - startTime;

      const stats = service.getNetworkStats();
      
      console.log(`[1K Scale Test] Papers: ${papers.length}, Researchers: ${stats.totalResearchers}, Edges: ${stats.totalEdges}`);
      console.log(`[1K Scale Test] Index time: ${indexTime.toFixed(2)}ms`);

      expect(stats.totalResearchers).toBeGreaterThanOrEqual(900);
      expect(indexTime).toBeLessThan(2000); // 2秒以内
    });

    it('should handle 5K researchers within 10 seconds', async () => {
      const papers = generateLargeDataset(5000, 3, 3);
      
      const startTime = performance.now();
      await service.indexPapers(papers);
      const indexTime = performance.now() - startTime;

      const stats = service.getNetworkStats();
      
      console.log(`[5K Scale Test] Papers: ${papers.length}, Researchers: ${stats.totalResearchers}, Edges: ${stats.totalEdges}`);
      console.log(`[5K Scale Test] Index time: ${indexTime.toFixed(2)}ms`);

      expect(stats.totalResearchers).toBeGreaterThanOrEqual(4500);
      expect(indexTime).toBeLessThan(10000); // 10秒以内
    });

    it('should handle 10K researchers within 30 seconds', async () => {
      const papers = generateLargeDataset(10000, 2, 3);
      
      const startTime = performance.now();
      await service.indexPapers(papers);
      const indexTime = performance.now() - startTime;

      const stats = service.getNetworkStats();
      
      console.log(`[10K Scale Test] Papers: ${papers.length}, Researchers: ${stats.totalResearchers}, Edges: ${stats.totalEdges}`);
      console.log(`[10K Scale Test] Index time: ${indexTime.toFixed(2)}ms`);

      expect(stats.totalResearchers).toBeGreaterThanOrEqual(9000);
      expect(indexTime).toBeLessThan(30000); // 30秒以内
    });

    // NOTE: 50K node test は CI/CD では長時間かかるためスキップ
    // ローカルで実行する場合は .skip を削除
    it.skip('should handle 50K researchers within 5 minutes (REQ-005-N01)', async () => {
      const papers = generateLargeDataset(50000, 2, 2);
      
      const startTime = performance.now();
      await service.indexPapers(papers);
      const indexTime = performance.now() - startTime;

      const stats = service.getNetworkStats();
      
      console.log(`[50K Scale Test] Papers: ${papers.length}, Researchers: ${stats.totalResearchers}, Edges: ${stats.totalEdges}`);
      console.log(`[50K Scale Test] Index time: ${(indexTime / 1000).toFixed(2)}s`);

      expect(stats.totalResearchers).toBeGreaterThanOrEqual(45000);
      expect(indexTime).toBeLessThan(300000); // 5分以内
    }, 600000); // 10分タイムアウト
  });

  describe('Search and Query Performance', () => {
    it('should perform searchResearchers within 100ms on 5K dataset', async () => {
      const papers = generateLargeDataset(5000, 3, 3);
      await service.indexPapers(papers);

      const startTime = performance.now();
      const results = service.searchResearchers({ nameQuery: 'researcher-0001', limit: 100 });
      const queryTime = performance.now() - startTime;

      console.log(`[Search Performance] Query time: ${queryTime.toFixed(2)}ms, Results: ${results.length}`);
      expect(queryTime).toBeLessThan(100);
    });

    it('should perform getCoauthors within 50ms on 5K dataset', async () => {
      const papers = generateLargeDataset(5000, 3, 3);
      await service.indexPapers(papers);

      // Get a researcher ID from the dataset
      const stats = service.getNetworkStats();
      const researcherId = 'name:researcher-000001';

      const startTime = performance.now();
      const coauthors = service.getCoauthors(researcherId);
      const queryTime = performance.now() - startTime;

      console.log(`[Coauthor Query] Query time: ${queryTime.toFixed(2)}ms, Coauthors: ${coauthors?.length ?? 0}`);
      expect(queryTime).toBeLessThan(50);
    });

    it('should perform getInfluenceRanking within 500ms on 5K dataset', async () => {
      const papers = generateLargeDataset(5000, 3, 3);
      await service.indexPapers(papers);

      const startTime = performance.now();
      const ranking = service.getInfluenceRanking({ limit: 100 });
      const queryTime = performance.now() - startTime;

      console.log(`[Ranking Performance] Query time: ${queryTime.toFixed(2)}ms, Results: ${ranking.length}`);
      expect(queryTime).toBeLessThan(500);
      expect(ranking.length).toBeLessThanOrEqual(100);
    });

    it('should perform getCommunities within 100ms on 5K dataset', async () => {
      const papers = generateLargeDataset(5000, 3, 3);
      await service.indexPapers(papers);

      const startTime = performance.now();
      const communities = service.getCommunities();
      const queryTime = performance.now() - startTime;

      console.log(`[Community Query] Query time: ${queryTime.toFixed(2)}ms, Communities: ${communities.length}`);
      expect(queryTime).toBeLessThan(100);
    });
  });

  describe('Memory Efficiency', () => {
    it('should clear memory properly after large dataset', async () => {
      const papers = generateLargeDataset(5000, 3, 3);
      await service.indexPapers(papers);

      const beforeStats = service.getNetworkStats();
      expect(beforeStats.totalResearchers).toBeGreaterThan(0);

      service.clear();

      const afterStats = service.getNetworkStats();
      expect(afterStats.totalResearchers).toBe(0);
      expect(afterStats.totalEdges).toBe(0);
    });

    it('should handle multiple index-clear cycles without memory leak', async () => {
      const papers = generateLargeDataset(1000, 3, 3);

      for (let i = 0; i < 5; i++) {
        await service.indexPapers(papers);
        const stats = service.getNetworkStats();
        expect(stats.totalResearchers).toBeGreaterThan(0);
        service.clear();
      }

      const finalStats = service.getNetworkStats();
      expect(finalStats.totalResearchers).toBe(0);
    });
  });

  describe('Edge Cases at Scale', () => {
    it('should handle papers with many authors (>20)', async () => {
      const largeAuthorPaper: Paper = {
        id: 'large-paper',
        title: 'Large Collaboration Paper',
        authors: Array.from({ length: 50 }, (_, i) => ({
          name: `large-author-${i}`,
        })),
        publishedDate: new Date('2023-01-01'),
      };

      await service.indexPapers([largeAuthorPaper]);
      const stats = service.getNetworkStats();

      expect(stats.totalResearchers).toBe(50);
      // 50人の完全グラフのエッジ数は C(50,2) = 1225
      expect(stats.totalEdges).toBe(1225);
    });

    it('should handle disconnected components', async () => {
      // 2つの独立したクリークを作成
      const clique1: Paper = {
        id: 'clique1',
        title: 'Clique 1',
        authors: Array.from({ length: 10 }, (_, i) => ({ name: `group1-${i}` })),
        publishedDate: new Date('2023-01-01'),
      };

      const clique2: Paper = {
        id: 'clique2',
        title: 'Clique 2',
        authors: Array.from({ length: 10 }, (_, i) => ({ name: `group2-${i}` })),
        publishedDate: new Date('2023-01-01'),
      };

      await service.indexPapers([clique1, clique2]);
      const stats = service.getNetworkStats();
      const communities = service.getCommunities();

      expect(stats.totalResearchers).toBe(20);
      // 少なくとも2つのコミュニティが検出されるべき
      expect(communities.length).toBeGreaterThanOrEqual(2);
    });
  });
});

/**
 * データセット生成ヘルパー（テストスイート外で使用可能）
 */
const generateLargeDataset = (
  numResearchers: number,
  papersPerResearcher: number,
  coauthorsPerPaper: number
): Paper[] => {
  const papers: Paper[] = [];
  const researcherPool: string[] = [];
  
  for (let i = 0; i < numResearchers; i++) {
    researcherPool.push(`researcher-${i.toString().padStart(6, '0')}`);
  }

  let paperId = 0;
  for (let r = 0; r < numResearchers; r++) {
    const numPapers = Math.max(1, papersPerResearcher + Math.floor(Math.random() * 3) - 1);
    
    for (let p = 0; p < numPapers; p++) {
      const mainAuthor = researcherPool[r]!;
      const authors = [{ name: mainAuthor }];
      
      const numCoauthors = Math.max(0, coauthorsPerPaper + Math.floor(Math.random() * 2) - 1);
      const usedIndices = new Set<number>([r]);
      
      for (let c = 0; c < numCoauthors && usedIndices.size < Math.min(numResearchers, coauthorsPerPaper + 5); c++) {
        let coauthorIndex: number;
        do {
          coauthorIndex = Math.floor(Math.random() * numResearchers);
        } while (usedIndices.has(coauthorIndex));
        
        usedIndices.add(coauthorIndex);
        authors.push({ name: researcherPool[coauthorIndex]! });
      }

      const year = 2010 + Math.floor(Math.random() * 14);
      const month = Math.floor(Math.random() * 12) + 1;
      const day = Math.floor(Math.random() * 28) + 1;

      papers.push({
        id: `paper-${paperId++}`,
        title: `Paper ${paperId}`,
        authors,
        publishedDate: new Date(year, month - 1, day),
      });
    }
  }

  return papers;
};
