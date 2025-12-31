/**
 * CoauthorExtractor
 *
 * @description 論文から共著関係を抽出しグラフ化する
 * @since v4.0.0
 * @see REQ-005-01, REQ-005-05
 */

import {
  type CoauthorEdge,
  normalizeName,
  calculateCoauthorWeight,
} from '@yagokoro/domain';

/**
 * Paper author interface for extraction
 */
export interface PaperAuthor {
  id?: string;
  name: string;
  orcid?: string;
  affiliations?: string[];
}

/**
 * Paper interface for coauthor extraction
 */
export interface Paper {
  id: string;
  title: string;
  authors: PaperAuthor[];
  publishedAt: Date;
  citations?: number;
}

/**
 * Researcher info extracted from papers
 */
export interface ExtractedResearcher {
  id: string;
  name: string;
  normalizedName: string;
  orcid: string | undefined;
  affiliations: string[];
  paperCount: number;
  paperIds: string[];
}

/**
 * Coauthor network structure
 */
export interface CoauthorNetwork {
  researchers: ExtractedResearcher[];
  edges: CoauthorEdge[];
  statistics: {
    nodeCount: number;
    edgeCount: number;
    avgDegree: number;
    density: number;
  };
}

/**
 * Configuration for CoauthorExtractor
 */
export interface CoauthorExtractorConfig {
  /** Minimum number of shared papers to create an edge */
  minPapersForEdge: number;
  /** Whether to use ORCID as primary ID when available */
  includeOrcid: boolean;
  /** Whether to normalize names for matching */
  normalizeNames: boolean;
  /** Maximum number of authors to process per paper (for large collaborations) */
  maxAuthorsPerPaper?: number;
}

const DEFAULT_CONFIG: Omit<CoauthorExtractorConfig, 'maxAuthorsPerPaper'> = {
  minPapersForEdge: 1,
  includeOrcid: true,
  normalizeNames: true,
};

/**
 * CoauthorExtractor - Extracts coauthor relationships from papers
 *
 * @description
 * Analyzes papers to extract coauthor relationships and build
 * a collaboration network. Handles author name normalization,
 * ORCID integration, and edge weight calculation.
 *
 * @example
 * ```typescript
 * const extractor = new CoauthorExtractor({ minPapersForEdge: 2 });
 * const papers = await fetchPapers();
 * const edges = extractor.extractFromPapers(papers);
 * const network = extractor.buildCoauthorNetwork(papers);
 * ```
 */
export class CoauthorExtractor {
  private readonly config: CoauthorExtractorConfig;

  constructor(config: Partial<CoauthorExtractorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Extract coauthor edges from a single paper
   *
   * @param paper - The paper to extract from
   * @returns Array of coauthor edges (one for each author pair)
   */
  extractFromPaper(paper: Paper): CoauthorEdge[] {
    const edges: CoauthorEdge[] = [];

    // Filter and deduplicate authors
    const validAuthors = this.getValidAuthors(paper.authors);

    // Apply max authors limit if configured
    const authors = this.config.maxAuthorsPerPaper
      ? validAuthors.slice(0, this.config.maxAuthorsPerPaper)
      : validAuthors;

    // Generate all pairs of authors
    for (let i = 0; i < authors.length; i++) {
      for (let j = i + 1; j < authors.length; j++) {
        const author1 = authors[i]!;
        const author2 = authors[j]!;

        const edge = this.createEdge(author1, author2, paper);
        edges.push(edge);
      }
    }

    return edges;
  }

  /**
   * Extract and aggregate coauthor edges from multiple papers
   *
   * @param papers - Array of papers to process
   * @returns Aggregated coauthor edges
   */
  extractFromPapers(papers: Paper[]): CoauthorEdge[] {
    const edgeMap = new Map<string, CoauthorEdge>();

    for (const paper of papers) {
      const paperEdges = this.extractFromPaper(paper);

      for (const edge of paperEdges) {
        const key = this.getEdgeKey(edge.researcher1Id, edge.researcher2Id);
        const existing = edgeMap.get(key);

        if (existing) {
          // Merge edges
          this.mergeEdges(existing, edge);
        } else {
          edgeMap.set(key, { ...edge });
        }
      }
    }

    // Filter by minimum paper count
    const edges = Array.from(edgeMap.values()).filter(
      (edge) => edge.paperCount >= this.config.minPapersForEdge,
    );

    // Recalculate weights
    for (const edge of edges) {
      edge.weight = this.calculateWeight(edge);
    }

    return edges;
  }

  /**
   * Calculate edge weight based on paper count and recency
   *
   * @param edge - The coauthor edge
   * @returns Calculated weight
   */
  calculateWeight(edge: CoauthorEdge): number {
    return calculateCoauthorWeight(edge.paperCount, edge.lastCollaboration);
  }

  /**
   * Generate a unique researcher ID
   *
   * @param author - The paper author
   * @returns Unique ID string
   */
  generateResearcherId(author: PaperAuthor): string {
    // Prefer ORCID if available
    if (this.config.includeOrcid && author.orcid) {
      return `orcid:${author.orcid}`;
    }

    // Fall back to normalized name hash
    const normalized = this.config.normalizeNames
      ? normalizeName(author.name)
      : author.name.toLowerCase();

    return `name:${normalized}`;
  }

  /**
   * Generate a consistent edge key for two researchers
   * The key is the same regardless of the order of researchers
   *
   * @param id1 - First researcher ID
   * @param id2 - Second researcher ID
   * @returns Edge key string
   */
  getEdgeKey(id1: string, id2: string): string {
    // Sort IDs to ensure consistent key regardless of order
    const sorted = [id1, id2].sort();
    return `${sorted[0]}|${sorted[1]}`;
  }

  /**
   * Build a complete coauthor network from papers
   *
   * @param papers - Array of papers
   * @returns Coauthor network with researchers, edges, and statistics
   */
  buildCoauthorNetwork(papers: Paper[]): CoauthorNetwork {
    const researcherMap = new Map<string, ExtractedResearcher>();

    // Extract all researchers
    for (const paper of papers) {
      const validAuthors = this.getValidAuthors(paper.authors);

      for (const author of validAuthors) {
        const id = this.generateResearcherId(author);
        const existing = researcherMap.get(id);

        if (existing) {
          // Update existing researcher
          existing.paperCount++;
          existing.paperIds.push(paper.id);

          // Merge affiliations
          if (author.affiliations) {
            for (const aff of author.affiliations) {
              if (!existing.affiliations.includes(aff)) {
                existing.affiliations.push(aff);
              }
            }
          }
        } else {
          // Create new researcher
          researcherMap.set(id, {
            id,
            name: author.name,
            normalizedName: normalizeName(author.name),
            orcid: author.orcid,
            affiliations: author.affiliations ? [...author.affiliations] : [],
            paperCount: 1,
            paperIds: [paper.id],
          });
        }
      }
    }

    // Extract edges
    const edges = this.extractFromPapers(papers);
    const researchers = Array.from(researcherMap.values());

    // Calculate statistics
    const nodeCount = researchers.length;
    const edgeCount = edges.length;
    const avgDegree =
      nodeCount > 0 ? (2 * edgeCount) / nodeCount : 0;
    const maxPossibleEdges = (nodeCount * (nodeCount - 1)) / 2;
    const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

    return {
      researchers,
      edges,
      statistics: {
        nodeCount,
        edgeCount,
        avgDegree,
        density,
      },
    };
  }

  /**
   * Filter and deduplicate authors
   */
  private getValidAuthors(authors: PaperAuthor[]): PaperAuthor[] {
    const seen = new Set<string>();
    const valid: PaperAuthor[] = [];

    for (const author of authors) {
      // Skip empty names
      if (!author.name || author.name.trim() === '') {
        continue;
      }

      // Deduplicate by normalized name
      const key = this.config.normalizeNames
        ? normalizeName(author.name)
        : author.name.toLowerCase();

      if (!seen.has(key)) {
        seen.add(key);
        valid.push(author);
      }
    }

    return valid;
  }

  /**
   * Create a coauthor edge from two authors and a paper
   */
  private createEdge(
    author1: PaperAuthor,
    author2: PaperAuthor,
    paper: Paper,
  ): CoauthorEdge {
    const id1 = this.generateResearcherId(author1);
    const id2 = this.generateResearcherId(author2);

    // Ensure consistent ordering
    const [first, second] = id1 < id2 ? [author1, author2] : [author2, author1];
    const [firstId, secondId] = id1 < id2 ? [id1, id2] : [id2, id1];

    const pubDate = this.getValidDate(paper.publishedAt);

    const edge: CoauthorEdge = {
      researcher1Id: firstId,
      researcher1Name: first.name,
      researcher2Id: secondId,
      researcher2Name: second.name,
      paperCount: 1,
      paperIds: [paper.id],
      firstCollaboration: pubDate,
      lastCollaboration: pubDate,
      weight: 0,
    };

    // Calculate initial weight
    edge.weight = this.calculateWeight(edge);

    return edge;
  }

  /**
   * Merge two edges (from different papers)
   */
  private mergeEdges(existing: CoauthorEdge, newEdge: CoauthorEdge): void {
    existing.paperCount++;

    // Add paper ID if not already present
    if (!existing.paperIds.includes(newEdge.paperIds[0]!)) {
      existing.paperIds.push(newEdge.paperIds[0]!);
    }

    // Update collaboration dates
    if (newEdge.firstCollaboration < existing.firstCollaboration) {
      existing.firstCollaboration = newEdge.firstCollaboration;
    }
    if (newEdge.lastCollaboration > existing.lastCollaboration) {
      existing.lastCollaboration = newEdge.lastCollaboration;
    }
  }

  /**
   * Get a valid date, falling back to current date if invalid
   */
  private getValidDate(date: Date): Date {
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return date;
    }
    return new Date();
  }
}
