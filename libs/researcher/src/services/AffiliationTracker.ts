/**
 * AffiliationTracker
 *
 * @description 研究者の所属機関履歴を追跡・管理する
 * @since v4.0.0
 * @see REQ-005-02
 */

import type { Affiliation } from '@yagokoro/domain';

/**
 * Paper author with affiliation info
 */
export interface PaperAuthorAffiliation {
  id: string;
  name: string;
  affiliations: string[];
}

/**
 * Paper for affiliation extraction
 */
export interface PaperWithAffiliations {
  id: string;
  publishedAt: Date;
  authors: PaperAuthorAffiliation[];
}

/**
 * Affiliation record for a researcher
 */
export interface AffiliationRecord {
  researcherId: string;
  affiliations: Affiliation[];
  lastUpdated: Date;
}

/**
 * Affiliation timeline entry
 */
export interface AffiliationTimelineEntry extends Affiliation {
  paperIds: string[];
  confidence: number;
}

/**
 * Affiliation timeline for a researcher
 */
export interface AffiliationTimeline {
  researcherId: string;
  entries: AffiliationTimelineEntry[];
  currentAffiliation: Affiliation | undefined;
  hasOverlappingAffiliations: boolean;
}

/**
 * Affiliation statistics
 */
export interface AffiliationStats {
  tenureYears: number;
  stintCount: number;
  isCurrentlyActive: boolean;
}

/**
 * Find researchers options
 */
export interface FindResearchersOptions {
  asOf?: Date;
  includeFormer?: boolean;
}

/**
 * Configuration for AffiliationTracker
 */
export interface AffiliationTrackerConfig {
  /** Whether to normalize organization names */
  normalizeOrganizations: boolean;
  /** Whether to track historical affiliations */
  trackHistory: boolean;
  /** Whether to infer missing dates from paper data */
  inferMissingDates: boolean;
}

const DEFAULT_CONFIG: AffiliationTrackerConfig = {
  normalizeOrganizations: true,
  trackHistory: true,
  inferMissingDates: true,
};

/**
 * Organization name aliases for normalization
 */
const ORGANIZATION_ALIASES: Record<string, string[]> = {
  'Massachusetts Institute of Technology': ['MIT', 'M.I.T.'],
  'Stanford University': ['Stanford'],
  'University of California, Berkeley': ['UC Berkeley', 'UCB', 'Berkeley'],
  'University of California, Los Angeles': ['UCLA'],
  'Carnegie Mellon University': ['CMU', 'Carnegie Mellon'],
  'University of Toronto': ['U of T', 'UofT'],
  'University of Oxford': ['Oxford'],
  'University of Cambridge': ['Cambridge'],
  'Harvard University': ['Harvard'],
  'Google Research': ['Google AI', 'Google Brain', 'Google DeepMind'],
  'DeepMind': ['Google DeepMind', 'DeepMind Technologies'],
  'OpenAI': [],
  'Meta AI': ['Facebook AI', 'FAIR', 'Meta'],
  'Microsoft Research': ['MSR', 'Microsoft'],
};

/**
 * AffiliationTracker - Tracks researcher affiliations over time
 *
 * @description
 * Manages researcher affiliation histories, normalizes organization names,
 * infers dates from publication data, and provides timeline views.
 *
 * @example
 * ```typescript
 * const tracker = new AffiliationTracker();
 * tracker.trackAffiliation('r1', { organization: 'MIT', isPrimary: true });
 * const timeline = tracker.getTimeline('r1');
 * ```
 */
export class AffiliationTracker {
  private readonly config: AffiliationTrackerConfig;
  private readonly records: Map<string, AffiliationRecord>;
  private readonly paperAffiliations: Map<string, Map<string, Set<string>>>; // researcherId -> org -> paperIds
  private readonly normalizedAliases: Map<string, string>;

  constructor(config: Partial<AffiliationTrackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.records = new Map();
    this.paperAffiliations = new Map();
    this.normalizedAliases = this.buildAliasMap();
  }

  /**
   * Track an affiliation for a researcher
   */
  trackAffiliation(researcherId: string, affiliation: Affiliation): AffiliationRecord {
    // Skip empty organizations
    if (!affiliation.organization || affiliation.organization.trim() === '') {
      return this.getOrCreateRecord(researcherId);
    }

    const record = this.getOrCreateRecord(researcherId);
    const normalizedOrg = this.config.normalizeOrganizations
      ? this.normalizeOrganization(affiliation.organization)
      : affiliation.organization;

    // Find existing affiliation for this organization
    const existingIndex = record.affiliations.findIndex((a) => {
      const existingNorm = this.config.normalizeOrganizations
        ? this.normalizeOrganization(a.organization)
        : a.organization;
      
      // Same organization, same department (or both undefined)
      return existingNorm === normalizedOrg && a.department === affiliation.department;
    });

    if (existingIndex >= 0) {
      // Update existing affiliation
      const existing = record.affiliations[existingIndex]!;
      
      // Merge dates
      if (affiliation.startDate && (!existing.startDate || affiliation.startDate < existing.startDate)) {
        existing.startDate = affiliation.startDate;
      }
      if (affiliation.endDate) {
        existing.endDate = affiliation.endDate;
      }
      
      // Update other fields
      if (affiliation.position) {
        existing.position = affiliation.position;
      }
      existing.isPrimary = affiliation.isPrimary;
    } else {
      // Add new affiliation - preserve original organization name
      record.affiliations.push({
        ...affiliation,
      });
    }

    record.lastUpdated = new Date();
    return record;
  }

  /**
   * Extract and track affiliations from a paper
   */
  trackAffiliationsFromPaper(paper: PaperWithAffiliations): AffiliationRecord[] {
    const records: AffiliationRecord[] = [];

    for (const author of paper.authors) {
      if (!author.id) continue;

      // Initialize paper affiliations tracking
      if (!this.paperAffiliations.has(author.id)) {
        this.paperAffiliations.set(author.id, new Map());
      }
      const authorPapers = this.paperAffiliations.get(author.id)!;

      for (const orgName of author.affiliations) {
        if (!orgName || orgName.trim() === '') continue;

        const normalizedOrg = this.config.normalizeOrganizations
          ? this.normalizeOrganization(orgName)
          : orgName;

        // Track paper for this affiliation
        if (!authorPapers.has(normalizedOrg)) {
          authorPapers.set(normalizedOrg, new Set());
        }
        authorPapers.get(normalizedOrg)!.add(paper.id);

        // Track the affiliation with inferred date
        const affiliation: Affiliation = this.config.inferMissingDates
          ? {
              organization: orgName,
              isPrimary: author.affiliations.indexOf(orgName) === 0,
              startDate: paper.publishedAt,
            }
          : {
              organization: orgName,
              isPrimary: author.affiliations.indexOf(orgName) === 0,
            };

        this.trackAffiliation(author.id, affiliation);
      }

      const record = this.records.get(author.id);
      if (record) {
        records.push(record);
      }
    }

    return records;
  }

  /**
   * Get the affiliation timeline for a researcher
   */
  getTimeline(researcherId: string): AffiliationTimeline {
    const record = this.records.get(researcherId);
    
    if (!record) {
      return {
        researcherId,
        entries: [],
        currentAffiliation: undefined,
        hasOverlappingAffiliations: false,
      };
    }

    // Build timeline entries
    const authorPapers = this.paperAffiliations.get(researcherId);
    const entries: AffiliationTimelineEntry[] = record.affiliations.map((aff) => {
      const normalizedOrg = this.config.normalizeOrganizations
        ? this.normalizeOrganization(aff.organization)
        : aff.organization;
      const paperIds = authorPapers?.get(normalizedOrg) 
        ? Array.from(authorPapers.get(normalizedOrg)!) 
        : [];

      return {
        ...aff,
        paperIds,
        confidence: this.calculateAffiliationConfidence(aff, paperIds.length),
      };
    });

    // Sort by start date
    entries.sort((a, b) => {
      const aStart = a.startDate?.getTime() ?? 0;
      const bStart = b.startDate?.getTime() ?? 0;
      return aStart - bStart;
    });

    // Find current affiliation (no end date, primary preferred)
    const activeAffs = entries.filter((e) => !e.endDate);
    const currentAffiliation = activeAffs.find((a) => a.isPrimary) ?? activeAffs[0];

    // Check for overlapping affiliations
    const hasOverlappingAffiliations = this.hasOverlaps(entries);

    return {
      researcherId,
      entries,
      currentAffiliation,
      hasOverlappingAffiliations,
    };
  }

  /**
   * Get the current primary affiliation for a researcher
   */
  getCurrentAffiliation(researcherId: string): Affiliation | undefined {
    const record = this.records.get(researcherId);
    if (!record) return undefined;

    // Filter to active affiliations (no end date)
    const activeAffs = record.affiliations.filter((a) => !a.endDate);
    
    // Prefer primary
    return activeAffs.find((a) => a.isPrimary) ?? activeAffs[0];
  }

  /**
   * Find researchers by affiliation organization
   */
  findResearchersByAffiliation(
    organization: string,
    options: FindResearchersOptions = {},
  ): string[] {
    const normalizedSearch = this.config.normalizeOrganizations
      ? this.normalizeOrganization(organization)
      : organization.toLowerCase();

    const results: string[] = [];
    const asOf = options.asOf ?? new Date();

    for (const [researcherId, record] of this.records) {
      const matchingAff = record.affiliations.find((aff) => {
        const normalizedOrg = this.config.normalizeOrganizations
          ? this.normalizeOrganization(aff.organization)
          : aff.organization.toLowerCase();

        // Check if organization matches (exact or partial)
        const orgMatches = normalizedOrg === normalizedSearch || 
          normalizedOrg.includes(normalizedSearch) ||
          normalizedSearch.includes(normalizedOrg);

        if (!orgMatches) return false;

        // Check time filter
        if (options.asOf) {
          const isActiveAtDate = this.isActiveAt(aff, asOf);
          return isActiveAtDate;
        }

        return true;
      });

      if (matchingAff) {
        results.push(researcherId);
      }
    }

    return results;
  }

  /**
   * Normalize an organization name
   */
  normalizeOrganization(organization: string): string {
    // Trim and normalize whitespace
    let normalized = organization.trim().replace(/\s+/g, ' ');

    // Remove periods from abbreviations
    normalized = normalized.replace(/\./g, '');

    // Check alias map
    const lowercased = normalized.toLowerCase();
    if (this.normalizedAliases.has(lowercased)) {
      return this.normalizedAliases.get(lowercased)!;
    }

    // Return lowercased for consistency
    return lowercased;
  }

  /**
   * Infer missing affiliation dates based on paper publication history
   */
  inferAffiliationDates(researcherId: string): void {
    const record = this.records.get(researcherId);
    if (!record) return;

    const authorPapers = this.paperAffiliations.get(researcherId);
    if (!authorPapers) return;

    // Sort affiliations by start date to detect transitions
    record.affiliations.sort((a, b) => {
      const aStart = a.startDate?.getTime() ?? 0;
      const bStart = b.startDate?.getTime() ?? 0;
      return aStart - bStart;
    });

    // Infer end dates when affiliations change
    for (let i = 0; i < record.affiliations.length - 1; i++) {
      const current = record.affiliations[i]!;
      const next = record.affiliations[i + 1]!;

      // If current has no end date and next has a start date, infer end
      if (!current.endDate && next.startDate && current.isPrimary && next.isPrimary) {
        // Infer end date as day before next starts
        const endDate = new Date(next.startDate);
        endDate.setDate(endDate.getDate() - 1);
        current.endDate = endDate;
      }
    }
  }

  /**
   * Get statistics for a researcher's affiliation with an organization
   */
  getAffiliationStats(researcherId: string, organization: string): AffiliationStats {
    const record = this.records.get(researcherId);
    if (!record) {
      return { tenureYears: 0, stintCount: 0, isCurrentlyActive: false };
    }

    const normalizedSearch = this.config.normalizeOrganizations
      ? this.normalizeOrganization(organization)
      : organization.toLowerCase();

    const matchingAffs = record.affiliations.filter((aff) => {
      const normalizedOrg = this.config.normalizeOrganizations
        ? this.normalizeOrganization(aff.organization)
        : aff.organization.toLowerCase();
      return normalizedOrg === normalizedSearch || 
        normalizedOrg.includes(normalizedSearch);
    });

    if (matchingAffs.length === 0) {
      return { tenureYears: 0, stintCount: 0, isCurrentlyActive: false };
    }

    let totalDays = 0;
    let isCurrentlyActive = false;

    for (const aff of matchingAffs) {
      const start = aff.startDate ?? new Date(2000, 0, 1); // Default start if unknown
      const end = aff.endDate ?? new Date(); // Current date if no end

      if (!aff.endDate) {
        isCurrentlyActive = true;
      }

      const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      totalDays += Math.max(0, days);
    }

    return {
      tenureYears: totalDays / 365,
      stintCount: matchingAffs.length,
      isCurrentlyActive,
    };
  }

  /**
   * Get or create a record for a researcher
   */
  private getOrCreateRecord(researcherId: string): AffiliationRecord {
    let record = this.records.get(researcherId);
    if (!record) {
      record = {
        researcherId,
        affiliations: [],
        lastUpdated: new Date(),
      };
      this.records.set(researcherId, record);
    }
    return record;
  }

  /**
   * Build the alias map for organization normalization
   */
  private buildAliasMap(): Map<string, string> {
    const aliasMap = new Map<string, string>();

    for (const [canonical, aliases] of Object.entries(ORGANIZATION_ALIASES)) {
      const normalizedCanonical = canonical.toLowerCase().replace(/\./g, '');
      aliasMap.set(normalizedCanonical, normalizedCanonical);

      for (const alias of aliases) {
        const normalizedAlias = alias.toLowerCase().replace(/\./g, '');
        aliasMap.set(normalizedAlias, normalizedCanonical);
      }
    }

    return aliasMap;
  }

  /**
   * Check if affiliation was active at a given date
   */
  private isActiveAt(affiliation: Affiliation, date: Date): boolean {
    const start = affiliation.startDate?.getTime() ?? 0;
    const end = affiliation.endDate?.getTime() ?? Number.POSITIVE_INFINITY;
    const check = date.getTime();

    return check >= start && check <= end;
  }

  /**
   * Check for overlapping affiliations
   */
  private hasOverlaps(entries: AffiliationTimelineEntry[]): boolean {
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i]!;
        const b = entries[j]!;

        const aStart = a.startDate?.getTime() ?? 0;
        const aEnd = a.endDate?.getTime() ?? Number.POSITIVE_INFINITY;
        const bStart = b.startDate?.getTime() ?? 0;
        const bEnd = b.endDate?.getTime() ?? Number.POSITIVE_INFINITY;

        // Check overlap
        if (aStart <= bEnd && bStart <= aEnd) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Calculate confidence score for an affiliation
   */
  private calculateAffiliationConfidence(affiliation: Affiliation, paperCount: number): number {
    let confidence = 0.5; // Base confidence

    // More papers = higher confidence
    confidence += Math.min(0.3, paperCount * 0.05);

    // Has dates = higher confidence
    if (affiliation.startDate) confidence += 0.1;
    if (affiliation.endDate) confidence += 0.1;

    return Math.min(1.0, confidence);
  }
}
