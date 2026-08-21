/**
 * Batched RUM event sender.
 *
 * Accumulates events in memory and flushes them periodically or when the
 * page visibility changes / unloads. Uses navigator.sendBeacon when available
 * (most reliable during page unload), with fetch fallback.
 *
 * Failures are silently contained — telemetry never surfaces errors to the
 * application.
 */

import type { RumEvent, RumBatchPayload } from './types';

const FLUSH_INTERVAL_MS = 30_000;
const MAX_BATCH_SIZE = 50;
const ENDPOINT = '/api/rum';

let queue: RumEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isDestroyed = false;

function getEndpoint(): string {
  return ENDPOINT;
}

async function sendBatch(events: RumEvent[]): Promise<void> {
  if (events.length === 0) return;

  const payload: RumBatchPayload = { events };
  const body = JSON.stringify(payload);

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(getEndpoint(), blob);
      return;
    }

    // Fallback: fire-and-forget fetch (best-effort)
    if (typeof fetch !== 'undefined') {
      await fetch(getEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      });
    }
  } catch {
    // Silently ignore — telemetry must never break the application
  }
}

function flush(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (queue.length === 0) return;

  // Take all queued events
  const batch = queue.splice(0, queue.length);
  sendBatch(batch);
}

function scheduleFlush(): void {
  if (flushTimer || isDestroyed) return;

  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
}

/**
 * Enqueue a RUM event for batched delivery.
 */
export function enqueue(event: RumEvent): void {
  if (isDestroyed) return;

  queue.push(event);

  if (queue.length >= MAX_BATCH_SIZE) {
    flush();
  } else {
    scheduleFlush();
  }
}

/**
 * Set up automatic flushing on page visibility change and unload.
 */
export function initSender(): void {
  if (typeof document === 'undefined') return;

  const handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      flush();
    }
  };

  const handleBeforeUnload = (): void => {
    flush();
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('pagehide', handleBeforeUnload);
}

/**
 * Tear down the sender (for testing or component unmount).
 */
export function destroySender(): void {
  isDestroyed = true;
  flush();

  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', flush);
    window.removeEventListener('beforeunload', flush);
    window.removeEventListener('pagehide', flush);
  }
}

/**
 * Reset the sender state (for testing).
 */
export function resetSender(): void {
  queue = [];
  isDestroyed = false;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

/**
 * Expose queue size for testing.
 */
export function getQueueSize(): number {
  return queue.length;
}
