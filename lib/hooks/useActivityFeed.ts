"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/api/axios";
import { API_URL } from "@/lib/config";

// ─── Public types ──────────────────────────────────────────────────────────────

export type ActivityEventType =
  | "payment_received"
  | "settlement_initiated"
  | "settlement_completed"
  | "webhook_delivered"
  | "api_key_used";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  title: string;
  description: string;
  timestamp: string;
  detailHref: string;
  metadata?: Record<string, unknown>;
}

/**
 * Live connection status exposed to the UI so it can render an indicator.
 *
 * - `connecting`   — transport is being established (SSE connecting / first poll in-flight)
 * - `connected`    — SSE stream is open and receiving events (or poll succeeded)
 * - `polling`      — SSE unavailable; falling back to HTTP polling
 * - `disconnected` — all transports failed / component unmounted
 */
export type ActivityConnectionStatus =
  | "connecting"
  | "connected"
  | "polling"
  | "disconnected";

// ─── Internal constants ────────────────────────────────────────────────────────

/** REST endpoint for the initial page load and polling fallback */
const REST_PATH = "/api/activity";

/** SSE endpoint — backend pushes `ActivityEvent` objects as `data: <json>\n\n` */
const SSE_PATH = "/api/activity/stream";

/** How long to wait before deciding SSE has failed and switching to polling */
const SSE_CONNECT_TIMEOUT_MS = 8_000;

/** Polling interval used when SSE is unavailable */
const POLL_INTERVAL_MS = 30_000;

/** Maximum consecutive poll failures before the error state is surfaced */
const MAX_POLL_ERRORS = 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface ActivityFeedResponse {
  data: ActivityEvent[];
}

function deduplicate(events: ActivityEvent[]): ActivityEvent[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

function prependAndTrim(
  incoming: ActivityEvent[],
  prev: ActivityEvent[],
  limit: number,
): ActivityEvent[] {
  return deduplicate([...incoming, ...prev]).slice(0, limit);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useActivityFeed
 *
 * Connects to the backend activity stream via Server-Sent Events for real-time
 * push delivery. If the SSE endpoint is unreachable (network error, 4xx/5xx,
 * or no response within `SSE_CONNECT_TIMEOUT_MS`) the hook transparently falls
 * back to `setInterval` polling every 30 seconds.
 *
 * Return shape is backward-compatible — existing consumers only need
 * `{ events, isLoading, error, refetch }` — but `connectionStatus` is now also
 * exposed so the UI can render a live/polling/offline indicator.
 */
export function useActivityFeed(limit = 20) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ActivityConnectionStatus>("connecting");

  // Refs that outlive re-renders without causing extra effect runs
  const mountedRef = useRef(true);
  const evsRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollErrorCountRef = useRef(0);
  // Tracks whether we've already committed to the polling fallback so we don't
  // attempt SSE reconnection on visibility-change wakeups.
  const usePollFallbackRef = useRef(false);

  // ── REST fetch (initial load + polling fallback) ──────────────────────────

  const fetchEvents = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent && mountedRef.current) setIsLoading(true);
      try {
        const res = await apiClient.get<ActivityFeedResponse>(
          `${REST_PATH}?limit=${limit}`,
        );
        const incoming: ActivityEvent[] = res.data?.data ?? (res.data as unknown as ActivityEvent[]) ?? [];
        if (mountedRef.current) {
          setEvents((prev) => prependAndTrim(incoming, prev, limit));
          setError(null);
          pollErrorCountRef.current = 0;
        }
      } catch {
        pollErrorCountRef.current += 1;
        if (
          mountedRef.current &&
          pollErrorCountRef.current >= MAX_POLL_ERRORS
        ) {
          setError("Failed to load activity feed");
        }
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    },
    [limit],
  );

  // ── Polling fallback ──────────────────────────────────────────────────────

  const startPolling = useCallback(() => {
    if (!mountedRef.current) return;
    usePollFallbackRef.current = true;
    setConnectionStatus("polling");

    if (pollTimerRef.current !== null) return; // already polling
    pollTimerRef.current = setInterval(() => {
      // Pause polling when the tab is hidden — identical to useSystemHealth.
      if (mountedRef.current && document.visibilityState === "visible") {
        void fetchEvents({ silent: true });
      }
    }, POLL_INTERVAL_MS);
  }, [fetchEvents]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // ── SSE connection ────────────────────────────────────────────────────────

  const closeSSE = useCallback(() => {
    if (sseTimeoutRef.current !== null) {
      clearTimeout(sseTimeoutRef.current);
      sseTimeoutRef.current = null;
    }
    if (evsRef.current) {
      evsRef.current.close();
      evsRef.current = null;
    }
  }, []);

  const startSSE = useCallback(() => {
    if (typeof EventSource === "undefined") {
      // SSE not supported in this environment — go straight to polling
      void fetchEvents();
      startPolling();
      return;
    }

    closeSSE();
    setConnectionStatus("connecting");

    const apiBase = API_URL || "http://localhost:3001";
    const url = `${apiBase}${SSE_PATH}?limit=${limit}`;

    let hasConnected = false;

    // Safety timeout: if SSE hasn't sent a message within the window, fall
    // back to polling so we don't silently sit in "connecting" forever.
    sseTimeoutRef.current = setTimeout(() => {
      if (!hasConnected && mountedRef.current) {
        console.warn(
          "[useActivityFeed] SSE connection timed out — falling back to polling",
        );
        closeSSE();
        void fetchEvents();
        startPolling();
      }
    }, SSE_CONNECT_TIMEOUT_MS);

    const es = new EventSource(url, { withCredentials: true });
    evsRef.current = es;

    es.onopen = () => {
      hasConnected = true;
      if (sseTimeoutRef.current !== null) {
        clearTimeout(sseTimeoutRef.current);
        sseTimeoutRef.current = null;
      }
      if (mountedRef.current) {
        setConnectionStatus("connected");
        setError(null);
      }
    };

    // Default (unnamed) message events carry a single ActivityEvent as JSON
    es.onmessage = (ev: MessageEvent<string>) => {
      hasConnected = true;
      if (!mountedRef.current) return;
      try {
        const incoming = JSON.parse(ev.data) as ActivityEvent | ActivityEvent[];
        const events = Array.isArray(incoming) ? incoming : [incoming];
        setEvents((prev) => prependAndTrim(events, prev, limit));
        setIsLoading(false);
        setError(null);
        setConnectionStatus("connected");
      } catch {
        // Malformed frame — ignore silently
      }
    };

    // Named event types mirror ActivityEventType so the server can send
    // e.g. `event: payment_received\ndata: {...}` for selective handling.
    const EVENT_TYPES: ActivityEventType[] = [
      "payment_received",
      "settlement_initiated",
      "settlement_completed",
      "webhook_delivered",
      "api_key_used",
    ];
    EVENT_TYPES.forEach((type) => {
      es.addEventListener(type, (ev: Event) => {
        hasConnected = true;
        if (!mountedRef.current) return;
        const msgEv = ev as MessageEvent<string>;
        try {
          const event = JSON.parse(msgEv.data) as ActivityEvent;
          setEvents((prev) => prependAndTrim([event], prev, limit));
          setIsLoading(false);
          setError(null);
          setConnectionStatus("connected");
        } catch {
          // Malformed frame — ignore silently
        }
      });
    });

    // Named "snapshot" event — server can push the full initial page
    es.addEventListener("snapshot", (ev: Event) => {
      hasConnected = true;
      if (!mountedRef.current) return;
      const msgEv = ev as MessageEvent<string>;
      try {
        const snapshot = JSON.parse(msgEv.data) as ActivityEvent[];
        setEvents((prev) => prependAndTrim(snapshot, prev, limit));
        setIsLoading(false);
        setError(null);
        setConnectionStatus("connected");
      } catch {
        // Malformed frame — ignore silently
      }
    });

    es.onerror = () => {
      if (!mountedRef.current) return;
      // EventSource auto-reconnects on transient errors; we only fall back to
      // polling if we never successfully connected at all (hasConnected=false)
      // or if the server sends a terminal close (readyState === CLOSED).
      if (!hasConnected || es.readyState === EventSource.CLOSED) {
        console.warn(
          "[useActivityFeed] SSE error — falling back to polling",
        );
        closeSSE();
        void fetchEvents();
        startPolling();
      }
    };
  }, [limit, fetchEvents, startPolling, closeSSE]);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    usePollFallbackRef.current = false;
    pollErrorCountRef.current = 0;

    // Always do an immediate REST fetch so the list is populated instantly
    // while the SSE handshake completes.
    void fetchEvents();

    // Then attempt SSE
    startSSE();

    // Visibility handler: covers both the SSE and polling fallback paths.
    //
    // • SSE path  — if the stream dropped while hidden, reopen it.
    // • Poll path — resume with an immediate fetch so data isn't stale after
    //   returning to the tab; the interval already guards against hidden-tab
    //   polls via the visibilityState check inside startPolling.
    const handleVisibilityChange = () => {
      if (!mountedRef.current) return;

      if (document.visibilityState === "visible") {
        if (usePollFallbackRef.current) {
          // Polling path: do an immediate fetch on tab-return so data is
          // fresh without waiting for the next interval tick.
          void fetchEvents({ silent: true });
        } else {
          // SSE path: reconnect if the stream closed while the tab was hidden.
          if (
            !evsRef.current ||
            evsRef.current.readyState === EventSource.CLOSED
          ) {
            startSSE();
          }
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      closeSSE();
      stopPolling();
      setConnectionStatus("disconnected");
    };
  }, [fetchEvents, startSSE, closeSSE, stopPolling]);

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    events,
    isLoading,
    error,
    /** Re-fetch from REST immediately. Does not disrupt the SSE stream. */
    refetch: () => void fetchEvents({ silent: true }),
    connectionStatus,
  };
}
