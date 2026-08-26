import { calculatePercentiles, computeTrend, computeDistribution } from '@/lib/rum/aggregate';

describe('calculatePercentiles', () => {
  it('returns zeros for empty array', () => {
    const result = calculatePercentiles([]);
    expect(result).toEqual({ p50: 0, p75: 0, p90: 0, p95: 0, count: 0, min: 0, max: 0 });
  });

  it('returns correct percentiles for a known dataset', () => {
    const values = [100, 200, 300, 400, 500];
    const result = calculatePercentiles(values);
    expect(result.count).toBe(5);
    expect(result.min).toBe(100);
    expect(result.max).toBe(500);
    // p50 with ceil: ceil(0.5 * 5) - 1 = 3 - 1 = 2 → sorted[2] = 300
    expect(result.p50).toBe(300);
    expect(result.p90).toBe(500);
  });

  it('handles a single value', () => {
    const result = calculatePercentiles([42]);
    expect(result.p50).toBe(42);
    expect(result.p95).toBe(42);
    expect(result.count).toBe(1);
  });

  it('sorts input and computes correct percentiles', () => {
    const values = [500, 100, 300, 200, 400];
    const result = calculatePercentiles(values);
    expect(result.min).toBe(100);
    expect(result.max).toBe(500);
    expect(result.p50).toBe(300);
  });
});

describe('computeTrend', () => {
  it('returns empty for no events', () => {
    expect(computeTrend([])).toEqual([]);
  });

  it('groups events by day and computes percentiles', () => {
    const now = Date.now();
    const events = [
      { timestamp: now, value: 100, route: '/test', name: 'lcp' as const, clientId: 'c1' },
      { timestamp: now, value: 200, route: '/test', name: 'lcp' as const, clientId: 'c1' },
    ];
    const trend = computeTrend(events);
    expect(trend.length).toBe(1);
    expect(trend[0].count).toBe(2);
    expect(trend[0].percentiles.p50).toBe(100);
  });
});

describe('computeDistribution', () => {
  it('returns empty for no values', () => {
    expect(computeDistribution([], 'fcp')).toEqual([]);
  });

  it('distributes values into correct timing buckets', () => {
    const values = [150, 300, 600, 1000, 2500];
    const dist = computeDistribution(values, 'fcp');
    // Should have 8 buckets (0-200, 200-400, 400-800, 800-1200, 1200-2000, 2000-4000, 4000+)
    expect(dist.length).toBeGreaterThan(0);
    const totalSamples = dist.reduce((sum, b) => sum + b.count, 0);
    expect(totalSamples).toBe(5);
  });

  it('uses CLS-specific buckets', () => {
    const values = [0.05, 0.15, 0.3, 0.8];
    const dist = computeDistribution(values, 'cls');
    expect(dist.length).toBe(5); // [0, 0.1, 0.25, 0.5, 1.0, inf]
    const totalSamples = dist.reduce((sum, b) => sum + b.count, 0);
    expect(totalSamples).toBe(4);
  });

  it('uses long-task-specific buckets', () => {
    const values = [60, 150, 300, 600];
    const dist = computeDistribution(values, 'long_task');
    expect(dist.length).toBe(4); // [50-100, 100-200, 200-500, 500+]
    const totalSamples = dist.reduce((sum, b) => sum + b.count, 0);
    expect(totalSamples).toBe(4);
  });
});
