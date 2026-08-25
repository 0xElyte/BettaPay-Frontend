/**
 * RUM data aggregation utilities.
 *
 * Provides percentile calculations, trend aggregation, and distribution
 * analysis from raw RUM events. All operations are non-destructive and
 * never expose PII.
 */

import type { RumEvent, RumMetricName } from "./types";

export interface PercentileResult {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  count: number;
  min: number;
  max: number;
}

export interface TrendPoint {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** Percentile values for this time bucket */
  percentiles: PercentileResult;
  /** Total sample count */
  count: number;
}

export interface DistributionBucket {
  /** Lower bound (inclusive) in ms or unitless for CLS */
  lower: number;
  /** Upper bound (exclusive) in ms or unitless for CLS */
  upper: number;
  /** Number of samples in this bucket */
  count: number;
}

export interface RoutePerformanceSummary {
  route: string;
  metric: RumMetricName;
  percentiles: PercentileResult;
  trend: TrendPoint[];
  distribution: DistributionBucket[];
}

export interface PerformanceDashboardData {
  /** All known routes */
  routes: string[];
  /** All known metric names that have data */
  metrics: RumMetricName[];
  /** Time range of available data */
  timeRange: { from: string; to: string };
  /** Total event count */
  totalEvents: number;
}

/**
 * Calculate percentiles from a sorted array of values.
 */
export function calculatePercentiles(values: number[]): PercentileResult {
  if (values.length === 0) {
    return { p50: 0, p75: 0, p90: 0, p95: 0, count: 0, min: 0, max: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  function percentile(p: number): number {
    const idx = Math.ceil((p / 100) * n) - 1;
    return sorted[Math.max(0, idx)];
  }

  return {
    p50: percentile(50),
    p75: percentile(75),
    p90: percentile(90),
    p95: percentile(95),
    count: n,
    min: sorted[0],
    max: sorted[n - 1],
  };
}

/**
 * Group events by day and compute trend percentiles.
 */
export function computeTrend(
  events: RumEvent[],
  bucketDays: number = 1
): TrendPoint[] {
  if (events.length === 0) return [];

  // Group by day
  const byDay = new Map<string, number[]>();
  for (const event of events) {
    const date = new Date(event.timestamp);
    // Normalize to start of day, then bucket
    const dayMs = bucketDays * 86400000;
    const bucketStart = Math.floor(date.getTime() / dayMs) * dayMs;
    const dateStr = new Date(bucketStart).toISOString().split("T")[0];

    const values = byDay.get(dateStr) || [];
    values.push(event.value);
    byDay.set(dateStr, values);
  }

  // Sort by date and compute percentiles
  const sortedDays = Array.from(byDay.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return sortedDays.map(([date, values]) => ({
    date,
    percentiles: calculatePercentiles(values),
    count: values.length,
  }));
}

/**
 * Generate a histogram/distribution from metric values.
 * Uses fixed bucket boundaries appropriate for the metric type.
 */
export function computeDistribution(
  values: number[],
  metricName: RumMetricName
): DistributionBucket[] {
  if (values.length === 0) return [];

  let boundaries: number[];

  switch (metricName) {
    case "cls":
      // CLS buckets: 0, 0.1, 0.25, 0.5, 1.0, >1.0
      boundaries = [0, 0.1, 0.25, 0.5, 1.0, Infinity];
      break;
    case "long_task":
      // Long task buckets: 50-100ms, 100-200ms, 200-500ms, 500ms+
      boundaries = [50, 100, 200, 500, Infinity];
      break;
    default:
      // Timing metrics (FCP, LCP, TTFB, etc.): 0-200, 200-400, 400-800, 800-1200, 1200-2000, 2000-4000, 4000+
      boundaries = [0, 200, 400, 800, 1200, 2000, 4000, Infinity];
      break;
  }

  const buckets: DistributionBucket[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    buckets.push({
      lower: boundaries[i],
      upper: boundaries[i + 1],
      count: 0,
    });
  }

  for (const value of values) {
    for (let i = 0; i < boundaries.length - 1; i++) {
      if (value >= boundaries[i] && value < boundaries[i + 1]) {
        buckets[i].count++;
        break;
      }
    }
  }

  return buckets;
}
