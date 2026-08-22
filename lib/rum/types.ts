/**
 * Frontend RUM (Real User Monitoring) type definitions.
 *
 * All fields are privacy-safe: no PII, no auth tokens, no query parameters,
 * no form values. Routes are normalized to path-only (no query strings or
 * fragments).
 */

export type RumMetricName =
  | 'fcp'
  | 'lcp'
  | 'cls'
  | 'long_task'
  | 'ttfb'
  | 'domContentLoaded'
  | 'load'
  | 'route_change'
  | 'hydration_error';

export type NavigationType = 'navigate' | 'reload' | 'back_forward' | 'prerender';

export interface RumEvent {
  /** Opaque client key for deterministic sampling — never derived from PII. */
  clientId: string;
  /** Normalized route path (no query, no fragment). */
  route: string;
  /** Metric identifier. */
  name: RumMetricName;
  /** Numeric metric value (ms for timings, unitless ratio for CLS). */
  value: number;
  /** Navigation type from the Performance Navigation Timing API. */
  navigationType?: NavigationType;
  /** Timestamp (ms since epoch) when the event was recorded. */
  timestamp: number;
  /** Application version / build ID if available. */
  appVersion?: string;
}

export interface RumBatchPayload {
  events: RumEvent[];
}

/** Validated metric name set for server-side validation. */
export const VALID_METRIC_NAMES: ReadonlySet<string> = new Set<RumMetricName>([
  'fcp',
  'lcp',
  'cls',
  'long_task',
  'ttfb',
  'domContentLoaded',
  'load',
  'route_change',
  'hydration_error',
]);
