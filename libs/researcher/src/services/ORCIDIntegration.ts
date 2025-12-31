/**
 * ORCIDIntegration
 *
 * @description ORCID APIとの統合（研究者プロファイル取得）
 * @since v4.0.0
 * @see REQ-005-07
 */

/** ORCID API設定 */
export interface ORCIDConfig {
  /** ベースURL */
  baseUrl: string;
  /** タイムアウト（ミリ秒） */
  timeout: number;
  /** リトライ回数 */
  retryAttempts: number;
  /** リトライ間隔（ミリ秒） */
  retryDelay: number;
  /** APIトークン（オプション） */
  accessToken?: string;
}

/** ORCIDプロファイル */
export interface ORCIDProfile {
  orcid: string;
  givenName?: string;
  familyName?: string;
  creditName?: string;
  biography?: string;
  keywords: string[];
  lastModified: Date;
}

/** ORCID Work（論文等） */
export interface ORCIDWork {
  putCode: number;
  title: string;
  type: string;
  publicationYear?: number;
  publicationMonth?: number;
  doi?: string;
  externalIds?: Record<string, string>;
  journalTitle?: string;
}

/** ORCID Employment（所属履歴） */
export interface ORCIDEmployment {
  organization: string;
  role?: string;
  department?: string;
  city?: string;
  country?: string;
  startDate?: Date;
  endDate?: Date;
  current: boolean;
}

/** 検索オプション */
export interface ORCIDSearchOptions {
  maxResults?: number;
  start?: number;
}

/** エンリッチされた研究者プロファイル */
export interface EnrichedResearcherProfile {
  profile: ORCIDProfile;
  works: ORCIDWork[];
  employments: ORCIDEmployment[];
  summary: {
    totalWorks: number;
    currentAffiliation?: string;
    topKeywords: string[];
    careerYears: number;
  };
}

/** デフォルト設定 */
const DEFAULT_CONFIG: ORCIDConfig = {
  baseUrl: 'https://pub.orcid.org/v3.0',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};

/** ORCIDパターン（16桁、4桁ずつハイフン区切り、最後はXも可） */
const ORCID_PATTERN = /^(\d{4}-){3}\d{3}[\dX]$/;

export class ORCIDIntegration {
  private readonly config: ORCIDConfig;
  private rateLimitDelay: number = 0;
  private lastRequestTime: number = 0;

  constructor(config: Partial<ORCIDConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * ORCID形式を検証
   */
  validateORCID(orcid: string): boolean {
    if (!orcid || typeof orcid !== 'string') {
      return false;
    }
    return ORCID_PATTERN.test(orcid);
  }

  /**
   * ORCIDを正規化（URLプレフィックスを除去、ハイフンを挿入）
   */
  normalizeORCID(orcid: string): string {
    // URLプレフィックスを除去
    let normalized = orcid
      .replace(/^https?:\/\/orcid\.org\//, '')
      .trim();

    // ハイフンがない場合は挿入
    if (!normalized.includes('-') && normalized.length === 16) {
      normalized = `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}`;
    }

    return normalized;
  }

  /**
   * プロファイルを取得
   */
  async fetchProfile(orcid: string): Promise<ORCIDProfile | null> {
    const normalizedOrcid = this.normalizeORCID(orcid);

    if (!this.validateORCID(normalizedOrcid)) {
      throw new Error(`Invalid ORCID format: ${orcid}`);
    }

    const data = await this.fetchFromAPI(`/${normalizedOrcid}/person`);

    if (!data) {
      return null;
    }

    return this.parseProfile(normalizedOrcid, data);
  }

  /**
   * Work一覧を取得
   */
  async fetchWorks(
    orcid: string,
    options: ORCIDSearchOptions = {},
  ): Promise<ORCIDWork[]> {
    const normalizedOrcid = this.normalizeORCID(orcid);

    if (!this.validateORCID(normalizedOrcid)) {
      throw new Error(`Invalid ORCID format: ${orcid}`);
    }

    const data = await this.fetchFromAPI(`/${normalizedOrcid}/works`);

    if (!data || !data.group) {
      return [];
    }

    let works = this.parseWorks(data.group);

    // 結果数を制限
    if (options.maxResults && options.maxResults > 0) {
      works = works.slice(0, options.maxResults);
    }

    return works;
  }

  /**
   * Employment履歴を取得
   */
  async fetchEmployments(orcid: string): Promise<ORCIDEmployment[]> {
    const normalizedOrcid = this.normalizeORCID(orcid);

    if (!this.validateORCID(normalizedOrcid)) {
      throw new Error(`Invalid ORCID format: ${orcid}`);
    }

    const data = await this.fetchFromAPI(`/${normalizedOrcid}/employments`);

    if (!data || !data['affiliation-group']) {
      return [];
    }

    return this.parseEmployments(data['affiliation-group']);
  }

  /**
   * 名前で検索
   */
  async searchByName(name: string): Promise<string[]> {
    const encodedName = encodeURIComponent(name);
    const data = await this.fetchFromAPI(`/search/?q=${encodedName}`);

    if (!data || !data.result) {
      return [];
    }

    return data.result.map((r: any) => r['orcid-identifier']?.path).filter(Boolean);
  }

  /**
   * 所属で検索
   */
  async searchByAffiliation(affiliation: string): Promise<string[]> {
    const encodedAffiliation = encodeURIComponent(affiliation);
    const data = await this.fetchFromAPI(
      `/search/?q=affiliation-org-name:${encodedAffiliation}`,
    );

    if (!data || !data.result) {
      return [];
    }

    return data.result.map((r: any) => r['orcid-identifier']?.path).filter(Boolean);
  }

  /**
   * 研究者プロファイルをエンリッチ（全情報を取得してまとめる）
   */
  async enrichResearcherProfile(orcid: string): Promise<EnrichedResearcherProfile | null> {
    const profile = await this.fetchProfile(orcid);

    if (!profile) {
      return null;
    }

    const [works, employments] = await Promise.all([
      this.fetchWorks(orcid),
      this.fetchEmployments(orcid),
    ]);

    // 現在の所属を取得
    const currentEmployment = employments.find((e) => e.current);

    // キャリア年数を計算
    const startDates = employments
      .filter((e) => e.startDate)
      .map((e) => e.startDate!.getTime());
    const careerYears =
      startDates.length > 0
        ? Math.floor(
            (Date.now() - Math.min(...startDates)) / (365.25 * 24 * 60 * 60 * 1000),
          )
        : 0;

    return {
      profile,
      works,
      employments,
      summary: {
        totalWorks: works.length,
        currentAffiliation: currentEmployment?.organization,
        topKeywords: profile.keywords.slice(0, 5),
        careerYears,
      },
    };
  }

  /**
   * ORCID URLを構築
   */
  buildORCIDUrl(orcid: string): string {
    const normalizedOrcid = this.normalizeORCID(orcid);
    return `https://orcid.org/${normalizedOrcid}`;
  }

  /**
   * レート制限を設定
   */
  setRateLimit(delayMs: number): void {
    this.rateLimitDelay = delayMs;
  }

  /**
   * APIからデータを取得（内部メソッド）
   */
  private async fetchFromAPI(endpoint: string): Promise<any> {
    // レート制限を適用
    await this.applyRateLimit();

    const url = `${this.config.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (this.config.accessToken) {
      headers['Authorization'] = `Bearer ${this.config.accessToken}`;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 404) {
          return null;
        }

        if (!response.ok) {
          throw new Error(`ORCID API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;

        // 最後の試行でなければリトライ
        if (attempt < this.config.retryAttempts - 1) {
          await this.delay(this.config.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || new Error('Failed to fetch from ORCID API');
  }

  /**
   * プロファイルをパース
   */
  private parseProfile(orcid: string, data: any): ORCIDProfile {
    const person = data.person || data;
    const name = person.name || {};

    const keywords: string[] = [];
    if (person.keywords?.keyword) {
      for (const kw of person.keywords.keyword) {
        if (kw.content) {
          keywords.push(kw.content);
        }
      }
    }

    return {
      orcid,
      givenName: name['given-names']?.value,
      familyName: name['family-name']?.value,
      creditName: name['credit-name']?.value,
      biography: person.biography?.content,
      keywords,
      lastModified: data['last-modified-date']?.value
        ? new Date(data['last-modified-date'].value)
        : new Date(),
    };
  }

  /**
   * Work一覧をパース
   */
  private parseWorks(groups: any[]): ORCIDWork[] {
    const works: ORCIDWork[] = [];

    for (const group of groups) {
      const summaries = group['work-summary'] || [];
      if (summaries.length === 0) continue;

      const summary = summaries[0];
      const externalIds: Record<string, string> = {};

      if (summary['external-ids']?.['external-id']) {
        for (const extId of summary['external-ids']['external-id']) {
          externalIds[extId['external-id-type']] = extId['external-id-value'];
        }
      }

      works.push({
        putCode: summary['put-code'],
        title: summary.title?.title?.value || 'Untitled',
        type: summary.type || 'other',
        publicationYear: summary['publication-date']?.year?.value
          ? parseInt(summary['publication-date'].year.value, 10)
          : undefined,
        publicationMonth: summary['publication-date']?.month?.value
          ? parseInt(summary['publication-date'].month.value, 10)
          : undefined,
        doi: externalIds['doi'],
        externalIds,
        journalTitle: summary['journal-title']?.value,
      });
    }

    return works;
  }

  /**
   * Employment履歴をパース
   */
  private parseEmployments(affiliationGroups: any[]): ORCIDEmployment[] {
    const employments: ORCIDEmployment[] = [];

    for (const group of affiliationGroups) {
      const summaries = group.summaries || [];

      for (const summaryWrapper of summaries) {
        const summary = summaryWrapper['employment-summary'];
        if (!summary) continue;

        const org = summary.organization || {};
        const address = org.address || {};

        let startDate: Date | undefined;
        if (summary['start-date']?.year?.value) {
          const year = parseInt(summary['start-date'].year.value, 10);
          const month = summary['start-date'].month?.value
            ? parseInt(summary['start-date'].month.value, 10) - 1
            : 0;
          startDate = new Date(year, month, 1);
        }

        let endDate: Date | undefined;
        if (summary['end-date']?.year?.value) {
          const year = parseInt(summary['end-date'].year.value, 10);
          const month = summary['end-date'].month?.value
            ? parseInt(summary['end-date'].month.value, 10) - 1
            : 11;
          endDate = new Date(year, month, 1);
        }

        employments.push({
          organization: org.name || 'Unknown Organization',
          role: summary['role-title'],
          department: summary['department-name'],
          city: address.city,
          country: address.country,
          startDate,
          endDate,
          current: !endDate,
        });
      }
    }

    // 開始日で降順ソート（最新が先）
    return employments.sort((a, b) => {
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return b.startDate.getTime() - a.startDate.getTime();
    });
  }

  /**
   * レート制限を適用
   */
  private async applyRateLimit(): Promise<void> {
    if (this.rateLimitDelay > 0) {
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.rateLimitDelay) {
        await this.delay(this.rateLimitDelay - timeSinceLastRequest);
      }
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * 遅延
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
