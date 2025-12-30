/**
 * @module Metrics.test
 * @description メトリクスシステムのテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  Counter,
  Gauge,
  Histogram,
  MetricsRegistry,
  MemoryMetricsExporter,
  createMCPMetrics,
} from './Metrics.js';

describe('Counter', () => {
  let counter: Counter;

  beforeEach(() => {
    counter = new Counter('test_counter', 'Test counter');
  });

  it('should start at zero', () => {
    expect(counter.get()).toBe(0);
  });

  it('should increment by 1 by default', () => {
    counter.inc();
    expect(counter.get()).toBe(1);
  });

  it('should increment by specified amount', () => {
    counter.inc(5);
    expect(counter.get()).toBe(5);
  });

  it('should accumulate increments', () => {
    counter.inc(3);
    counter.inc(2);
    expect(counter.get()).toBe(5);
  });

  it('should throw on negative increment', () => {
    expect(() => counter.inc(-1)).toThrow('Counter can only be incremented');
  });

  it('should reset to zero', () => {
    counter.inc(10);
    counter.reset();
    expect(counter.get()).toBe(0);
  });

  it('should collect metric data', () => {
    counter.inc(3);
    const collected = counter.collect();

    expect(collected.name).toBe('test_counter');
    expect(collected.type).toBe('counter');
    expect(collected.value).toBe(3);
    expect(collected.timestamp).toBeInstanceOf(Date);
  });
});

describe('Gauge', () => {
  let gauge: Gauge;

  beforeEach(() => {
    gauge = new Gauge('test_gauge', 'Test gauge');
  });

  it('should start at zero', () => {
    expect(gauge.get()).toBe(0);
  });

  it('should set to specific value', () => {
    gauge.set(42);
    expect(gauge.get()).toBe(42);
  });

  it('should increment', () => {
    gauge.set(10);
    gauge.inc(5);
    expect(gauge.get()).toBe(15);
  });

  it('should decrement', () => {
    gauge.set(10);
    gauge.dec(3);
    expect(gauge.get()).toBe(7);
  });

  it('should allow negative values', () => {
    gauge.dec(5);
    expect(gauge.get()).toBe(-5);
  });

  it('should collect metric data', () => {
    gauge.set(100);
    const collected = gauge.collect();

    expect(collected.name).toBe('test_gauge');
    expect(collected.type).toBe('gauge');
    expect(collected.value).toBe(100);
  });
});

describe('Histogram', () => {
  let histogram: Histogram;

  beforeEach(() => {
    histogram = new Histogram(
      'test_histogram',
      'Test histogram',
      [0.1, 0.5, 1.0, 2.5, 5.0]
    );
  });

  it('should start with zero observations', () => {
    expect(histogram.getCount()).toBe(0);
    expect(histogram.getSum()).toBe(0);
    expect(histogram.getMean()).toBe(0);
  });

  it('should record observations', () => {
    histogram.observe(0.2);
    histogram.observe(0.8);
    histogram.observe(3.0);

    expect(histogram.getCount()).toBe(3);
    expect(histogram.getSum()).toBeCloseTo(4.0);
  });

  it('should calculate mean', () => {
    histogram.observe(1);
    histogram.observe(2);
    histogram.observe(3);

    expect(histogram.getMean()).toBe(2);
  });

  it('should collect with histogram data', () => {
    histogram.observe(0.05);
    histogram.observe(0.3);
    histogram.observe(1.5);

    const collected = histogram.collect();

    expect(collected.name).toBe('test_histogram');
    expect(collected.type).toBe('histogram');
    expect(collected.histogram).toBeDefined();
    expect(collected.histogram?.count).toBe(3);
    expect(collected.histogram?.boundaries).toEqual([0.1, 0.5, 1.0, 2.5, 5.0]);
  });

  it('should reset all values', () => {
    histogram.observe(1);
    histogram.observe(2);
    histogram.reset();

    expect(histogram.getCount()).toBe(0);
    expect(histogram.getSum()).toBe(0);
  });

  it('should time async operations', async () => {
    const result = await histogram.time(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return 'done';
    });

    expect(result).toBe('done');
    expect(histogram.getCount()).toBe(1);
    expect(histogram.getSum()).toBeGreaterThan(0.001); // At least 1ms (timing may vary)
  });

  it('should record time even on failure', async () => {
    await expect(
      histogram.time(async () => {
        throw new Error('fail');
      })
    ).rejects.toThrow('fail');

    expect(histogram.getCount()).toBe(1);
  });
});

describe('MetricsRegistry', () => {
  let registry: MetricsRegistry;
  let exporter: MemoryMetricsExporter;

  beforeEach(() => {
    registry = new MetricsRegistry();
    exporter = new MemoryMetricsExporter();
    registry.addExporter(exporter);
  });

  describe('counter', () => {
    it('should create a counter', () => {
      const counter = registry.counter('my_counter', 'My counter');
      expect(counter).toBeInstanceOf(Counter);
    });

    it('should return existing counter with same name', () => {
      const counter1 = registry.counter('my_counter', 'My counter');
      const counter2 = registry.counter('my_counter', 'My counter');
      
      counter1.inc();
      expect(counter2.get()).toBe(1);
    });

    it('should differentiate by labels', () => {
      const counter1 = registry.counter('http_requests', 'Requests', { method: 'GET' });
      const counter2 = registry.counter('http_requests', 'Requests', { method: 'POST' });

      counter1.inc(10);
      counter2.inc(5);

      expect(counter1.get()).toBe(10);
      expect(counter2.get()).toBe(5);
    });
  });

  describe('gauge', () => {
    it('should create a gauge', () => {
      const gauge = registry.gauge('my_gauge', 'My gauge');
      expect(gauge).toBeInstanceOf(Gauge);
    });

    it('should return existing gauge', () => {
      const gauge1 = registry.gauge('active_connections', 'Connections');
      const gauge2 = registry.gauge('active_connections', 'Connections');

      gauge1.set(50);
      expect(gauge2.get()).toBe(50);
    });
  });

  describe('histogram', () => {
    it('should create a histogram', () => {
      const histogram = registry.histogram('request_duration', 'Duration');
      expect(histogram).toBeInstanceOf(Histogram);
    });

    it('should accept custom boundaries', () => {
      const histogram = registry.histogram(
        'custom_histogram',
        'Custom',
        [0.01, 0.1, 1.0]
      );

      const collected = histogram.collect();
      expect(collected.histogram?.boundaries).toEqual([0.01, 0.1, 1.0]);
    });
  });

  describe('collect', () => {
    it('should collect all metrics', () => {
      registry.counter('counter1', 'Counter 1').inc(5);
      registry.gauge('gauge1', 'Gauge 1').set(10);
      registry.histogram('hist1', 'Histogram 1').observe(0.5);

      const collected = registry.collect();

      expect(collected).toHaveLength(3);
      expect(collected.map((m) => m.name)).toContain('counter1');
      expect(collected.map((m) => m.name)).toContain('gauge1');
      expect(collected.map((m) => m.name)).toContain('hist1');
    });
  });

  describe('export', () => {
    it('should export to all registered exporters', async () => {
      const exporter2 = new MemoryMetricsExporter();
      registry.addExporter(exporter2);

      registry.counter('exported_counter', 'Exported').inc();
      await registry.export();

      expect(exporter.exported).toHaveLength(1);
      expect(exporter2.exported).toHaveLength(1);
    });
  });

  describe('reset', () => {
    it('should reset all metrics', () => {
      registry.counter('c', 'c').inc(10);
      registry.gauge('g', 'g').set(20);
      registry.histogram('h', 'h').observe(1);

      registry.reset();

      const collected = registry.collect();
      expect(collected.every((m) => m.value === 0)).toBe(true);
    });
  });
});

describe('MemoryMetricsExporter', () => {
  let exporter: MemoryMetricsExporter;

  beforeEach(() => {
    exporter = new MemoryMetricsExporter();
  });

  it('should store exported metrics', async () => {
    await exporter.export([
      {
        name: 'test',
        type: 'counter',
        value: 1,
        labels: {},
        timestamp: new Date(),
      },
    ]);

    expect(exporter.exported).toHaveLength(1);
  });

  it('should find by name', async () => {
    await exporter.export([
      { name: 'metric_a', type: 'counter', value: 1, labels: {}, timestamp: new Date() },
      { name: 'metric_b', type: 'counter', value: 2, labels: {}, timestamp: new Date() },
      { name: 'metric_a', type: 'counter', value: 3, labels: {}, timestamp: new Date() },
    ]);

    const results = exporter.findByName('metric_a');
    expect(results).toHaveLength(2);
  });

  it('should clear stored metrics', async () => {
    await exporter.export([
      { name: 'test', type: 'counter', value: 1, labels: {}, timestamp: new Date() },
    ]);
    exporter.clear();

    expect(exporter.exported).toHaveLength(0);
  });
});

describe('createMCPMetrics', () => {
  it('should create all MCP metrics', () => {
    const registry = new MetricsRegistry();
    const metrics = createMCPMetrics(registry);

    expect(metrics.requestsTotal).toBeInstanceOf(Counter);
    expect(metrics.requestsActive).toBeInstanceOf(Gauge);
    expect(metrics.requestDuration).toBeInstanceOf(Histogram);
    expect(metrics.errorsTotal).toBeInstanceOf(Counter);
    expect(metrics.toolInvocations).toBeInstanceOf(Counter);
    expect(metrics.resourceReads).toBeInstanceOf(Counter);
  });

  it('should allow tracking request lifecycle', async () => {
    const registry = new MetricsRegistry();
    const metrics = createMCPMetrics(registry);

    // Simulate request
    metrics.requestsTotal.inc();
    metrics.requestsActive.inc();

    await metrics.requestDuration.time(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });

    metrics.requestsActive.dec();

    expect(metrics.requestsTotal.get()).toBe(1);
    expect(metrics.requestsActive.get()).toBe(0);
    expect(metrics.requestDuration.getCount()).toBe(1);
  });
});
