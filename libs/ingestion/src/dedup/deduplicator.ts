/**
 * Paper Deduplication Service
 * Detects duplicates using DOI, title similarity, and author matching
 */

import type { Paper, Author } from '../entities/paper.js';

export interface DeduplicationResult {
  /** Whether the paper is a duplicate */
  isDuplicate: boolean;
  /** Matched paper ID if duplicate */
  matchedPaperId?: string;
  /** Match type (doi, title, author) */
  matchType?: 'doi' | 'title' | 'title_author';
  /** Similarity score (for fuzzy matches) */
  similarity?: number;
  /** Whether human review is recommended */
  needsReview: boolean;
}

export interface DeduplicatorConfig {
  /** Title similarity threshold for exact duplicate (default: 0.95) */
  titleExactThreshold?: number;
  /** Title similarity threshold for candidate (default: 0.8) */
  titleCandidateThreshold?: number;
  /** Minimum author matches for candidate (default: 3) */
  minAuthorMatches?: number;
}

export class Deduplicator {
  private readonly titleExactThreshold: number;
  private readonly titleCandidateThreshold: number;
  private readonly minAuthorMatches: number;

  constructor(config: DeduplicatorConfig = {}) {
    this.titleExactThreshold = config.titleExactThreshold ?? 0.95;
    this.titleCandidateThreshold = config.titleCandidateThreshold ?? 0.8;
    this.minAuthorMatches = config.minAuthorMatches ?? 3;
  }

  /**
   * Check if a paper is a duplicate of any existing paper
   */
  checkDuplicate(paper: Paper, existingPapers: Paper[]): DeduplicationResult {
    // 1. Check DOI exact match
    if (paper.doi) {
      const doiMatch = existingPapers.find(p => p.doi === paper.doi);
      if (doiMatch) {
        return {
          isDuplicate: true,
          matchedPaperId: doiMatch.id,
          matchType: 'doi',
          similarity: 1.0,
          needsReview: false,
        };
      }
    }

    // 2. Check arXiv ID exact match
    if (paper.arxivId) {
      const arxivMatch = existingPapers.find(p => p.arxivId === paper.arxivId);
      if (arxivMatch) {
        return {
          isDuplicate: true,
          matchedPaperId: arxivMatch.id,
          matchType: 'doi', // Using doi type for exact ID match
          similarity: 1.0,
          needsReview: false,
        };
      }
    }

    // 3. Check title similarity
    const normalizedTitle = this.normalizeTitle(paper.title);
    
    for (const existing of existingPapers) {
      const existingNormalizedTitle = this.normalizeTitle(existing.title);
      const titleSimilarity = this.calculateSimilarity(normalizedTitle, existingNormalizedTitle);
      
      // High title similarity = duplicate
      if (titleSimilarity >= this.titleExactThreshold) {
        return {
          isDuplicate: true,
          matchedPaperId: existing.id,
          matchType: 'title',
          similarity: titleSimilarity,
          needsReview: titleSimilarity < 1.0, // Review if not exact match
        };
      }

      // Medium title similarity + author match = candidate
      if (titleSimilarity >= this.titleCandidateThreshold) {
        const authorMatches = this.countAuthorMatches(paper.authors, existing.authors);
        
        if (authorMatches >= this.minAuthorMatches) {
          return {
            isDuplicate: true,
            matchedPaperId: existing.id,
            matchType: 'title_author',
            similarity: titleSimilarity,
            needsReview: true, // Always review for title+author matches
          };
        }
      }
    }

    // No duplicate found
    return {
      isDuplicate: false,
      needsReview: false,
    };
  }

  /**
   * Batch check for duplicates
   */
  checkDuplicates(papers: Paper[], existingPapers: Paper[]): Map<string, DeduplicationResult> {
    const results = new Map<string, DeduplicationResult>();
    
    // Include papers being processed to detect duplicates within batch
    const allPapers = [...existingPapers];
    
    for (const paper of papers) {
      const result = this.checkDuplicate(paper, allPapers);
      results.set(paper.id, result);
      
      // Add non-duplicate papers to comparison set
      if (!result.isDuplicate) {
        allPapers.push(paper);
      }
    }
    
    return results;
  }

  /**
   * Normalize title for comparison
   */
  normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
  }

  /**
   * Calculate Levenshtein distance based similarity (0-1)
   */
  calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    return 1 - (distance / maxLength);
  }

  /**
   * Count matching authors between two papers
   */
  countAuthorMatches(authors1: Author[], authors2: Author[]): number {
    const normalizedNames1 = new Set(
      authors1.map(a => this.normalizeAuthorName(a.name))
    );
    
    let matches = 0;
    for (const author of authors2) {
      const normalized = this.normalizeAuthorName(author.name);
      if (normalizedNames1.has(normalized)) {
        matches++;
      }
    }
    
    return matches;
  }

  /**
   * Normalize author name for comparison
   */
  normalizeAuthorName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    
    // Create distance matrix
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    // Initialize first row and column
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    // Fill in the rest
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],     // deletion
            dp[i][j - 1],     // insertion
            dp[i - 1][j - 1]  // substitution
          );
        }
      }
    }
    
    return dp[m][n];
  }
}
