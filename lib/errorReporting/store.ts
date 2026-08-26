/**
 * In-memory error report store.
 *
 * Server-side only — never imported by client code. Uses a bounded ring
 * buffer so ingestion cannot exhaust memory, and groups by fingerprint so the
 * team sees "this crash happened 340 times" rather than 340 rows.
 *
 * For production at scale these would be forwarded to a durable sink; the
 * in-memory buffer keeps the integration self-contained and dependency-free.
 */

import type { ErrorReport } from './types';

const MAX_REPORTS = 2_000;

// Survive hot-reload in development.
const globalForErrorStore = global as unknown as {
  __errorReports?: ErrorReport[];
};

const reports: ErrorReport[] = globalForErrorStore.__errorReports || [];

if (process.env.NODE_ENV !== 'production') {
  globalForErrorStore.__errorReports = reports;
}

/** Store one validated report, collapsing it into a matching group. */
export function storeReport(report: ErrorReport): void {
  const existing = reports.find((r) => r.fingerprint === report.fingerprint);

  if (existing) {
    existing.count += report.count;
    existing.timestamp = Math.max(existing.timestamp, report.timestamp);
    return;
  }

  if (reports.length >= MAX_REPORTS) {
    reports.shift();
  }

  reports.push(report);
}

/** Store a validated batch. */
export function storeReports(batch: ErrorReport[]): void {
  for (const report of batch) {
    storeReport(report);
  }
}

/** Read stored reports, newest first. */
export function getReports(limit = 100): ErrorReport[] {
  return [...reports].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

/** Clear the buffer (tests only). */
export function clearReports(): void {
  reports.length = 0;
}
