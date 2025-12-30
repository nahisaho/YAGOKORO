/**
 * Paper entity for ingestion
 * Extended from v2 with ingestion-specific fields
 */

/**
 * Paper source
 */
export type PaperSource = 'arxiv' | 'semantic_scholar' | 'manual';

/**
 * Processing status for ingested papers
 */
export type ProcessingStatus =
  | 'ingested'    // Just fetched
  | 'extracting'  // Relation extraction in progress
  | 'extracted'   // Extraction complete
  | 'reviewing'   // HITL review in progress
  | 'completed'   // Fully processed
  | 'failed';     // Processing failed

/**
 * Author information
 */
export interface Author {
  /** Author name */
  name: string;
  /** Author ID (if available from source) */
  authorId?: string;
  /** Affiliations */
  affiliations?: string[];
}

/**
 * Paper entity (v3 extended)
 */
export interface Paper {
  /** Unique identifier (DOI or arXiv ID) */
  id: string;
  /** Paper title */
  title: string;
  /** Authors */
  authors: Author[];
  /** Abstract */
  abstract: string;
  /** Publication date */
  publishedDate: Date;
  /** Source of the paper */
  source: PaperSource;
  /** arXiv categories */
  categories: string[];
  /** Citation count (from Semantic Scholar) */
  citationCount?: number;
  /** Reference paper IDs */
  references?: string[];
  /** DOI if available */
  doi?: string;
  /** arXiv ID if available */
  arxivId?: string;
  /** URL to the paper */
  url?: string;

  // v3 new fields
  /** Ingestion timestamp */
  ingestionDate: Date;
  /** Last updated timestamp */
  lastUpdated: Date;
  /** Content hash for change detection */
  contentHash: string;
  /** Processing status */
  processingStatus: ProcessingStatus;
}

/**
 * Create a content hash for change detection
 */
export function createContentHash(paper: Partial<Paper>): string {
  const content = [
    paper.title,
    paper.abstract,
    paper.authors?.map(a => a.name).join(','),
    paper.categories?.join(','),
  ].join('|');
  
  // Simple hash function (for real use, consider crypto.createHash)
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
