/**
 * @module Metrics
 * @description メトリクス収集システム
 *
 * レイテンシ、スループット、エラー率などのメトリクスを収集
 */

/**
 * メトリクス値の型
 */
export type MetricValue = number;

/**
 * メトリクスの種類
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/**
 * メトリクスのラベル
 */
export type MetricLabels = Record<string, string>;

/**
 * ヒストグラムのバケット設定
 */
export interface HistogramBuckets {
  boundaries: number[];
  counts: number[];
  sum: number;
  count: number;
}

/**
 * メトリクス定義
 */
export interface MetricDefinition {
  name: string;
  type: MetricType;
  description: string;
  labels?: string[];
}

/**
 * 収集されたメトリクス
 */
export interface CollectedMetric {
  name: string;
  type: MetricType;
  value: MetricValue;
  labels: MetricLabels;
  timestamp: Date;
  histogram?: HistogramBuckets;
}

/**
 * メトリクス出力先インターフェース
 */
export interface MetricsExporter {
  export(metrics: CollectedMetric[]): Promise<void>;
}

/**
 * コンソールエクスポーター（デバッグ用）
 */
export class ConsoleMetricsExporter implements MetricsExporter {
  async export(metrics: CollectedMetric[]): Promise<void> {
    for (const metric of metrics) {
      console.log(
        `[METRIC] ${metric.name}: ${metric.value}`,
        metric.labels,
        metric.timestamp.toISOString()
      );
    }
  }
}

/**
 * メモリエクスポーター（テスト用）
 */
export class MemoryMetricsExporter implements MetricsExporter {
  readonly exported: CollectedMetric[] = [];

  async export(metrics: CollectedMetric[]): Promise<void> {
    this.exported.push(...metrics);
  }

  clear(): void {
    this.exported.length = 0;
  }

  findByName(name: string): CollectedMetric[] {
    return this.exported.filter((m) => m.name === name);
  }
}

/**
 * カウンターメトリクス
 */
export class Counter {
  private value = 0;

  constructor(
    readonly name: string,
    readonly description: string,
    private readonly labels: MetricLabels = {}
  ) {}

  inc(amount: number = 1): void {
    if (amount < 0) {
      throw new Error('Counter can only be incremented');
    }
    this.value += amount;
  }

  get(): MetricValue {
    return this.value;
  }

  reset(): void {
    this.value = 0;
  }

  collect(): CollectedMetric {
    return {
      name: this.name,
      type: 'counter',
      value: this.value,
      labels: this.labels,
      timestamp: new Date(),
    };
  }
}

/**
 * ゲージメトリクス
 */
export class Gauge {
  private value = 0;

  constructor(
    readonly name: string,
    readonly description: string,
    private readonly labels: MetricLabels = {}
  ) {}

  set(value: number): void {
    this.value = value;
  }

  inc(amount: number = 1): void {
    this.value += amount;
  }

  dec(amount: number = 1): void {
    this.value -= amount;
  }

  get(): MetricValue {
    return this.value;
  }

  reset(): void {
    this.value = 0;
  }

  collect(): CollectedMetric {
    return {
      name: this.name,
      type: 'gauge',
      value: this.value,
      labels: this.labels,
      timestamp: new Date(),
    };
  }
}

/**
 * ヒストグラムメトリクス
 */
export class Histogram {
  private counts: number[] = [];
  private sum = 0;
  private count = 0;
  private readonly boundaries: number[];

  constructor(
    readonly name: string,
    readonly description: string,
    boundaries: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    private readonly labels: MetricLabels = {}
  ) {
    this.boundaries = [...boundaries].sort((a, b) => a - b);
    this.counts = new Array(this.boundaries.length + 1).fill(0);
  }

  observe(value: number): void {
    this.sum += value;
    this.count++;

    // Find the bucket
    for (let i = 0; i < this.boundaries.length; i++) {
      const boundary = this.boundaries[i];
      if (boundary !== undefined && value <= boundary) {
        const count = this.counts[i];
        if (count !== undefined) {
          this.counts[i] = count + 1;
        }
        return;
      }
    }
    // +Inf bucket
    const lastIdx = this.counts.length - 1;
    const lastCount = this.counts[lastIdx];
    if (lastCount !== undefined) {
      this.counts[lastIdx] = lastCount + 1;
    }
  }

  getSum(): number {
    return this.sum;
  }

  getCount(): number {
    return this.count;
  }

  getMean(): number {
    return this.count > 0 ? this.sum / this.count : 0;
  }

  reset(): void {
    this.counts.fill(0);
    this.sum = 0;
    this.count = 0;
  }

  collect(): CollectedMetric {
    return {
      name: this.name,
      type: 'histogram',
      value: this.getMean(),
      labels: this.labels,
      timestamp: new Date(),
      histogram: {
        boundaries: this.boundaries,
        counts: [...this.counts],
        sum: this.sum,
        count: this.count,
      },
    };
  }

  /**
   * 操作の実行時間を計測
   */
  async time<T>(fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      return await fn();
    } finally {
      const duration = (Date.now() - start) / 1000; // seconds
      this.observe(duration);
    }
  }
}

/**
 * メトリクスレジストリ
 */
export class MetricsRegistry {
  private readonly metrics: Map<string, Counter | Gauge | Histogram> = new Map();
  private readonly exporters: MetricsExporter[] = [];

  /**
   * カウンターを作成または取得
   */
  counter(name: string, description: string, labels: MetricLabels = {}): Counter {
    const key = this.makeKey(name, labels);
    let metric = this.metrics.get(key);
    
    if (!metric) {
      metric = new Counter(name, description, labels);
      this.metrics.set(key, metric);
    }
    
    return metric as Counter;
  }

  /**
   * ゲージを作成または取得
   */
  gauge(name: string, description: string, labels: MetricLabels = {}): Gauge {
    const key = this.makeKey(name, labels);
    let metric = this.metrics.get(key);
    
    if (!metric) {
      metric = new Gauge(name, description, labels);
      this.metrics.set(key, metric);
    }
    
    return metric as Gauge;
  }

  /**
   * ヒストグラムを作成または取得
   */
  histogram(
    name: string,
    description: string,
    boundaries?: number[],
    labels: MetricLabels = {}
  ): Histogram {
    const key = this.makeKey(name, labels);
    let metric = this.metrics.get(key);
    
    if (!metric) {
      metric = new Histogram(name, description, boundaries, labels);
      this.metrics.set(key, metric);
    }
    
    return metric as Histogram;
  }

  /**
   * エクスポーターを登録
   */
  addExporter(exporter: MetricsExporter): void {
    this.exporters.push(exporter);
  }

  /**
   * すべてのメトリクスを収集
   */
  collect(): CollectedMetric[] {
    return Array.from(this.metrics.values()).map((m) => m.collect());
  }

  /**
   * メトリクスをエクスポート
   */
  async export(): Promise<void> {
    const metrics = this.collect();
    await Promise.all(this.exporters.map((e) => e.export(metrics)));
  }

  /**
   * すべてのメトリクスをリセット
   */
  reset(): void {
    for (const metric of this.metrics.values()) {
      if ('reset' in metric) {
        metric.reset();
      }
    }
  }

  private makeKey(name: string, labels: MetricLabels): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  }
}

/**
 * MCP メトリクス定義
 */
export interface MCPMetrics {
  requestsTotal: Counter;
  requestsActive: Gauge;
  requestDuration: Histogram;
  errorsTotal: Counter;
  toolInvocations: Counter;
  resourceReads: Counter;
}

/**
 * MCPサーバー用のメトリクスを作成
 */
export function createMCPMetrics(registry: MetricsRegistry): MCPMetrics {
  return {
    requestsTotal: registry.counter(
      'mcp_requests_total',
      'Total number of MCP requests'
    ),
    requestsActive: registry.gauge(
      'mcp_requests_active',
      'Number of active MCP requests'
    ),
    requestDuration: registry.histogram(
      'mcp_request_duration_seconds',
      'MCP request duration in seconds',
      [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
    ),
    errorsTotal: registry.counter(
      'mcp_errors_total',
      'Total number of MCP errors'
    ),
    toolInvocations: registry.counter(
      'mcp_tool_invocations_total',
      'Total number of tool invocations'
    ),
    resourceReads: registry.counter(
      'mcp_resource_reads_total',
      'Total number of resource reads'
    ),
  };
}
