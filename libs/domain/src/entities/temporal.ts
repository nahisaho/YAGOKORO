/**
 * Temporal Domain Types for YAGOKORO v4.0.0
 *
 * @description 時系列分析機能のためのドメイン型定義
 * @since v4.0.0
 * @see REQ-004-01, REQ-004-04
 */

/**
 * 技術採用フェーズ
 * @description エンティティのライフサイクル段階を表す
 */
export type AdoptionPhase = 'emerging' | 'growing' | 'mature' | 'declining';

/**
 * 時間メタデータ
 * @description エンティティに付与される時間属性
 * @see REQ-004-01
 */
export interface TemporalMetadata {
  /** 最初の公開日 */
  publicationDate?: Date;
  /** 最初に引用された日 */
  firstCitedDate?: Date;
  /** 最後に引用された日 */
  lastCitedDate?: Date;
  /** 引用ピーク日 */
  peakDate?: Date;
  /** 採用フェーズ */
  adoptionPhase: AdoptionPhase;
  /** メタデータ最終更新日 */
  updatedAt: Date;
}

/**
 * トレンドメトリクス
 * @description 特定期間のトレンド指標
 * @see REQ-004-04
 */
export interface TrendMetrics {
  /** 対象エンティティID */
  entityId: string;
  /** エンティティ名 */
  entityName: string;
  /** エンティティタイプ */
  entityType: string;
  /** 分析期間 */
  period: {
    start: Date;
    end: Date;
  };
  /** 引用数 */
  citationCount: number;
  /** 引用増加速度（citations/day） */
  citationVelocity: number;
  /** トレンドの勢い（%変化） */
  momentum: number;
  /** 期間内ランク */
  rank: number;
  /** 採用フェーズ */
  adoptionPhase: AdoptionPhase;
}

/**
 * タイムラインエントリ
 * @description タイムライン可視化用のデータポイント
 * @see REQ-004-06
 */
export interface TimelineEntry {
  /** タイムスタンプ */
  date: Date;
  /** エンティティID */
  entityId: string;
  /** エンティティ名 */
  entityName: string;
  /** イベントタイプ */
  eventType: 'publication' | 'citation' | 'peak' | 'milestone';
  /** 説明 */
  description: string;
  /** 関連メトリクス */
  metrics?: {
    citationCount?: number;
    momentum?: number;
  };
}

/**
 * タイムラインデータ
 * @description フロントエンド消費用のタイムラインJSON
 */
export interface TimelineData {
  /** エンティティID */
  entityId: string;
  /** エンティティ名 */
  entityName: string;
  /** 期間 */
  period: {
    start: Date;
    end: Date;
  };
  /** タイムラインエントリ */
  entries: TimelineEntry[];
  /** サマリーメトリクス */
  summary: {
    totalCitations: number;
    peakDate?: Date;
    adoptionPhase: AdoptionPhase;
  };
}

/**
 * Hot Topic
 * @description 特定期間の注目トピック
 * @see REQ-004-07
 */
export interface HotTopic {
  /** エンティティID */
  entityId: string;
  /** エンティティ名 */
  entityName: string;
  /** エンティティタイプ */
  entityType: string;
  /** モメンタムスコア */
  momentum: number;
  /** 引用増加速度 */
  velocity: number;
  /** 期間内引用数 */
  citationCount: number;
  /** ランク */
  rank: number;
  /** カテゴリ（オプション） */
  category?: string;
}

/**
 * トレンド予測結果
 * @description 時系列予測の出力
 * @see REQ-004-05
 */
export interface TrendForecast {
  /** 対象エンティティID */
  entityId: string;
  /** エンティティ名 */
  entityName: string;
  /** 予測開始日 */
  forecastStart: Date;
  /** 予測終了日 */
  forecastEnd: Date;
  /** 予測データポイント */
  predictions: {
    date: Date;
    predictedCitations: number;
    confidenceInterval: {
      lower: number;
      upper: number;
    };
  }[];
  /** 予測トレンド方向 */
  trendDirection: 'up' | 'down' | 'stable';
  /** 予測信頼度 */
  confidence: number;
  /** 使用モデル */
  model: 'arima' | 'prophet' | 'linear';
}

/**
 * 日次トレンドスナップショット
 * @description Neo4j TrendSnapshot ノード用
 */
export interface TrendSnapshot {
  /** 対象エンティティID */
  entityId: string;
  /** スナップショット日付 */
  date: Date;
  /** その時点での累計引用数 */
  citationCount: number;
  /** その日の新規引用数 */
  dailyCitations: number;
  /** モメンタム */
  momentum: number;
  /** 速度 */
  velocity: number;
  /** 7日移動平均 */
  movingAverage7d: number;
  /** 30日移動平均 */
  movingAverage30d: number;
}

/**
 * 時間範囲フィルター
 * @description 時間範囲クエリ用
 * @see REQ-004-03
 */
export interface TimeRangeFilter {
  /** 開始日 */
  from?: Date;
  /** 終了日 */
  to?: Date;
  /** 年指定（from/toより優先） */
  year?: number;
  /** 四半期指定（year必須） */
  quarter?: 1 | 2 | 3 | 4;
}

/**
 * 時系列クエリオプション
 */
export interface TemporalQueryOptions {
  /** 時間範囲フィルター */
  timeRange?: TimeRangeFilter;
  /** エンティティタイプフィルター */
  entityTypes?: string[];
  /** 最小引用数 */
  minCitations?: number;
  /** 採用フェーズフィルター */
  adoptionPhases?: AdoptionPhase[];
  /** ソート順 */
  sortBy?: 'momentum' | 'velocity' | 'citations' | 'date';
  /** ソート方向 */
  sortOrder?: 'asc' | 'desc';
  /** 取得件数上限 */
  limit?: number;
  /** オフセット */
  offset?: number;
}

/**
 * 採用フェーズを判定
 * @param momentum モメンタム値
 * @param velocity 速度値
 * @param citationCount 引用数
 * @param monthsSincePublication 公開からの月数
 * @returns 採用フェーズ
 */
export function determineAdoptionPhase(
  momentum: number,
  velocity: number,
  citationCount: number,
  monthsSincePublication: number,
): AdoptionPhase {
  // Emerging: 高モメンタム、公開から2年未満
  if (momentum > 20 && velocity > 0.1 && monthsSincePublication < 24) {
    return 'emerging';
  }

  // Declining: 負のモメンタム（早期判定）
  if (momentum < -10) {
    return 'declining';
  }

  // Mature: 安定した引用（200+）、低いモメンタム変化
  if (citationCount > 200 && Math.abs(momentum) < 10) {
    return 'mature';
  }

  // Growing: 正のモメンタム、一定以上の引用
  if (momentum > 0 && citationCount > 50) {
    return 'growing';
  }

  // デフォルト: 引用数に基づく
  if (citationCount < 50) {
    return 'emerging';
  }
  return 'growing';
}

/**
 * TimeRangeFilterから日付範囲を計算
 * @param filter 時間範囲フィルター
 * @returns 開始日と終了日
 */
export function resolveTimeRange(filter: TimeRangeFilter): { from: Date; to: Date } {
  if (filter.year) {
    const year = filter.year;
    if (filter.quarter) {
      const startMonth = (filter.quarter - 1) * 3;
      const endMonth = startMonth + 3;
      return {
        from: new Date(year, startMonth, 1),
        to: new Date(year, endMonth, 0), // 月末
      };
    }
    return {
      from: new Date(year, 0, 1),
      to: new Date(year, 11, 31),
    };
  }

  return {
    from: filter.from ?? new Date(0),
    to: filter.to ?? new Date(),
  };
}
