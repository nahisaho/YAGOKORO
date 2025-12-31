/**
 * ResearcherService Privacy Tests
 *
 * @description REQ-005-N02 プライバシー準拠テスト
 *              公開情報のみを使用することを検証
 * @since v4.0.0
 * @see REQ-005-N02
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResearcherService, type Paper } from './ResearcherService.js';
import { CoauthorExtractor } from './CoauthorExtractor.js';
import { AffiliationTracker } from './AffiliationTracker.js';

describe('ResearcherService Privacy Compliance', () => {
  describe('REQ-005-N02: Privacy - Public Information Only', () => {
    let service: ResearcherService;

    beforeEach(() => {
      service = new ResearcherService({
        enableCommunityDetection: true,
        enableORCID: false,
      });
    });

    describe('Data Collection Privacy', () => {
      it('should only collect public information from papers', async () => {
        const paper: Paper = {
          id: 'p1',
          title: 'Test Paper',
          authors: [
            {
              name: 'Alice Smith',
              orcid: '0000-0001-2345-6789',
              affiliation: 'University of Test',
            },
            {
              name: 'Bob Johnson',
              affiliation: 'Research Institute',
            },
          ],
          publishedDate: new Date('2023-06-15'),
        };

        await service.indexPapers([paper]);
        const researcher = service.getResearcher('orcid:0000-0001-2345-6789');

        // Should have public information
        expect(researcher).toBeDefined();
        expect(researcher!.name).toBe('Alice Smith');
        expect(researcher!.affiliation).toBe('University of Test');
        expect(researcher!.orcid).toBe('0000-0001-2345-6789');

        // Should NOT have private information
        expect(researcher).not.toHaveProperty('email');
        expect(researcher).not.toHaveProperty('privateContact');
        expect(researcher).not.toHaveProperty('phone');
        expect(researcher).not.toHaveProperty('salary');
        expect(researcher).not.toHaveProperty('employeeId');
        expect(researcher).not.toHaveProperty('ssn');
        expect(researcher).not.toHaveProperty('birthDate');
        expect(researcher).not.toHaveProperty('homeAddress');
      });

      it('should not expose private data in coauthor relationships', async () => {
        const paper: Paper = {
          id: 'p1',
          title: 'Collaborative Research',
          authors: [
            { name: 'Alice', orcid: '0000-0001-0000-0001' },
            { name: 'Bob', orcid: '0000-0001-0000-0002' },
          ],
          publishedDate: new Date('2023-01-01'),
        };

        await service.indexPapers([paper]);
        const coauthors = service.getCoauthors('orcid:0000-0001-0000-0001');

        expect(coauthors).toBeDefined();
        expect(coauthors!.length).toBe(1);

        const coauthor = coauthors![0];
        expect(coauthor).toBeDefined();

        // Coauthor data should only contain public information
        expect(coauthor).not.toHaveProperty('email');
        expect(coauthor).not.toHaveProperty('privateNotes');
        expect(coauthor).not.toHaveProperty('internalId');
      });

      it('should not expose private data in network export', async () => {
        const paper: Paper = {
          id: 'p1',
          title: 'Paper',
          authors: [
            { name: 'Alice' },
            { name: 'Bob' },
          ],
          publishedDate: new Date('2023-01-01'),
        };

        await service.indexPapers([paper]);
        const graphData = service.exportToGraph();

        // Verify nodes don't have private data
        for (const node of graphData.nodes) {
          expect(node).not.toHaveProperty('email');
          expect(node).not.toHaveProperty('privateContact');
          expect(node).not.toHaveProperty('salary');
        }

        // Verify edges don't have private data
        for (const edge of graphData.edges) {
          expect(edge).not.toHaveProperty('privateNotes');
          expect(edge).not.toHaveProperty('internalMetrics');
        }
      });
    });

    describe('CoauthorExtractor Privacy', () => {
      let extractor: CoauthorExtractor;

      beforeEach(() => {
        extractor = new CoauthorExtractor();
      });

      it('should only extract public coauthor data', () => {
        const paper = {
          id: 'p1',
          title: 'Test',
          authors: [
            { name: 'Alice', orcid: 'orcid-a', affiliations: ['MIT'] },
            { name: 'Bob', orcid: 'orcid-b', affiliations: ['Stanford'] },
          ],
          publishedAt: new Date('2023-01-01'),
        };

        const edges = extractor.extractFromPaper(paper);

        expect(edges.length).toBe(1);
        const edge = edges[0]!;

        // Should have public information
        expect(edge.researcher1Name).toBe('Alice');
        expect(edge.researcher2Name).toBe('Bob');

        // Should NOT have private information
        expect(edge).not.toHaveProperty('email1');
        expect(edge).not.toHaveProperty('email2');
        expect(edge).not.toHaveProperty('privateContactInfo');
      });

      it('should only include public researcher metadata', () => {
        const paper = {
          id: 'p1',
          title: 'Test',
          authors: [
            { name: 'Alice', orcid: 'orcid-a', affiliations: ['MIT'] },
          ],
          publishedAt: new Date('2023-01-01'),
        };

        const network = extractor.buildCoauthorNetwork([paper]);
        const researcher = network.researchers[0]!;

        // Should have public information
        expect(researcher.name).toBe('Alice');
        expect(researcher.orcid).toBe('orcid-a');
        expect(researcher.affiliations).toContain('MIT');

        // Should NOT have private information
        expect(researcher).not.toHaveProperty('email');
        expect(researcher).not.toHaveProperty('phone');
        expect(researcher).not.toHaveProperty('internalNotes');
      });
    });

    describe('AffiliationTracker Privacy', () => {
      let tracker: AffiliationTracker;

      beforeEach(() => {
        tracker = new AffiliationTracker();
      });

      it('should only track public affiliation data', () => {
        tracker.trackAffiliation('researcher-001', {
          organization: 'MIT',
          startDate: new Date('2020-01-01'),
          isPrimary: true,
        });

        const timeline = tracker.getTimeline('researcher-001');

        expect(timeline.entries.length).toBe(1);
        const affiliation = timeline.entries[0]!;

        // Should have public information
        expect(affiliation.organization).toBe('MIT');

        // Should NOT have private information
        expect(affiliation).not.toHaveProperty('salary');
        expect(affiliation).not.toHaveProperty('employeeId');
        expect(affiliation).not.toHaveProperty('hrNotes');
        expect(affiliation).not.toHaveProperty('performanceReview');
      });

      it('should not expose internal identifiers', () => {
        tracker.trackAffiliation('researcher-001', {
          organization: 'Stanford University',
          startDate: new Date('2020-01-01'),
        });

        const current = tracker.getCurrentAffiliation('researcher-001');

        expect(current).toBeDefined();
        expect(current!.organization).toContain('Stanford');

        // Should NOT have internal IDs
        expect(current).not.toHaveProperty('internalDepartmentCode');
        expect(current).not.toHaveProperty('hrSystemId');
        expect(current).not.toHaveProperty('payrollCode');
      });
    });

    describe('Search Results Privacy', () => {
      it('should not return private data in search results', async () => {
        const papers: Paper[] = [
          {
            id: 'p1',
            title: 'Paper 1',
            authors: [
              { name: 'Alice Smith', affiliation: 'MIT' },
              { name: 'Bob Johnson', affiliation: 'Stanford' },
            ],
            publishedDate: new Date('2023-01-01'),
          },
        ];

        await service.indexPapers(papers);
        const results = service.searchResearchers({ nameQuery: 'Alice' });

        expect(results.length).toBeGreaterThan(0);
        const result = results[0]!;

        // Should have public information
        expect(result.name).toContain('Alice');

        // Should NOT have private information
        expect(result).not.toHaveProperty('email');
        expect(result).not.toHaveProperty('privatePhone');
        expect(result).not.toHaveProperty('personalAddress');
      });
    });

    describe('Influence Ranking Privacy', () => {
      it('should not expose private metrics in rankings', async () => {
        const papers: Paper[] = [
          {
            id: 'p1',
            title: 'Paper 1',
            authors: [{ name: 'Alice' }, { name: 'Bob' }],
            publishedDate: new Date('2023-01-01'),
          },
        ];

        await service.indexPapers(papers);
        const rankings = service.getInfluenceRanking({ limit: 10 });

        for (const ranking of rankings) {
          // Should have public metrics
          expect(ranking).toHaveProperty('name');
          expect(ranking).toHaveProperty('influenceScore');

          // Should NOT have private metrics
          expect(ranking).not.toHaveProperty('email');
          expect(ranking).not.toHaveProperty('internalScore');
          expect(ranking).not.toHaveProperty('privateRank');
        }
      });
    });

    describe('Community Data Privacy', () => {
      it('should not expose private data in community info', async () => {
        const papers: Paper[] = [
          {
            id: 'p1',
            title: 'Paper 1',
            authors: [
              { name: 'Alice' },
              { name: 'Bob' },
              { name: 'Charlie' },
            ],
            publishedDate: new Date('2023-01-01'),
          },
        ];

        await service.indexPapers(papers);
        const communities = service.getCommunities();

        for (const community of communities) {
          // Should have public information
          expect(community).toHaveProperty('communityId');
          expect(community).toHaveProperty('size');

          // Should NOT have private information
          expect(community).not.toHaveProperty('privateNotes');
          expect(community).not.toHaveProperty('internalClassification');
        }
      });
    });

    describe('Data Source Validation', () => {
      it('should only accept data from valid public sources', async () => {
        // Paper sources are considered public
        const paper: Paper = {
          id: 'p1',
          title: 'Public Paper',
          authors: [{ name: 'Alice', affiliation: 'MIT' }],
          publishedDate: new Date('2023-01-01'),
        };

        await service.indexPapers([paper]);
        const researcher = service.getResearcher('name:alice');

        expect(researcher).toBeDefined();
        expect(researcher!.name).toBe('Alice');
      });

      it('should handle ORCID data as public source when enabled', async () => {
        const serviceWithOrcid = new ResearcherService({
          enableORCID: true, // ORCID is a public registry
        });

        const paper: Paper = {
          id: 'p1',
          title: 'Paper',
          authors: [
            { name: 'Alice', orcid: '0000-0001-2345-6789' },
          ],
          publishedDate: new Date('2023-01-01'),
        };

        await serviceWithOrcid.indexPapers([paper]);
        // ORCID data is public and acceptable
        const researcher = serviceWithOrcid.getResearcher('orcid:0000-0001-2345-6789');
        expect(researcher).toBeDefined();
      });
    });
  });
});
