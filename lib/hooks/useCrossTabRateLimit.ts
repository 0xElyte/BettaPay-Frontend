'use client';

import { useEffect, useRef } from 'react';
import {
  useRateLimitStore,
  RATE_LIMIT_STORAGE_KEY,
  type RateLimitWindow,
} from '@/lib/store/rateLimitStore';

const CHANNEL_NAME = 'bettapay-rate-limit-sync';

interface RateLimitChannelMessage {
  type: 'RATE_LIMIT_SET' | 'RATE_LIMIT_CLEAR';
  window?: RateLimitWindow;
}

/**
 * Shares the 429 window across tabs.
 *
 * Without this each tab keeps its own countdown: one tab shows "retry in 28s"
 * while its siblings happily keep firing requests into the same limit. This
 * mirrors `useCrossTabAuth` — a BroadcastChannel for live updates, with the
 * `storage` event as the fallback for browsers that lack it (the window is
 * persisted, so the storage write happens either way).
 */
export function useCrossTabRateLimit() {
  const channelRef = useRef<BroadcastChannel | null>(null);
  /** Set while adopting a remote window, so applying it does not echo back. */
  const isApplyingRemoteRef = useRef(false);

  useEffect(() => {
    try {
      channelRef.current = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      // BroadcastChannel not supported — fall back to StorageEvent only.
    }

    const channel = channelRef.current;

    const applyRemote = (window: RateLimitWindow | null) => {
      isApplyingRemoteRef.current = true;
      try {
        useRateLimitStore.getState().applyRemoteWindow(window);
      } finally {
        isApplyingRemoteRef.current = false;
      }
    };

    const handleChannelMessage = (
      event: MessageEvent<RateLimitChannelMessage>
    ) => {
      const message = event.data;

      switch (message?.type) {
        case 'RATE_LIMIT_SET':
          if (message.window) applyRemote(message.window);
          break;
        case 'RATE_LIMIT_CLEAR':
          applyRemote(null);
          break;
      }
    };

    if (channel) {
      channel.addEventListener('message', handleChannelMessage);
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== RATE_LIMIT_STORAGE_KEY) return;

      try {
        const parsed = event.newValue ? JSON.parse(event.newValue) : null;
        const state = parsed?.state as RateLimitWindow | undefined;

        if (!state || !state.rateLimitedUntil) {
          applyRemote(null);
          return;
        }

        applyRemote({
          rateLimitedUntil: state.rateLimitedUntil,
          endpoint: state.endpoint ?? null,
          limit: state.limit ?? null,
        });
      } catch {
        // Malformed JSON — ignore.
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      if (channel) {
        channel.removeEventListener('message', handleChannelMessage);
        channel.close();
      }
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    const unsub = useRateLimitStore.subscribe((state, prevState) => {
      const channel = channelRef.current;
      if (!channel) return;
      // Do not rebroadcast a window we just adopted from another tab.
      if (isApplyingRemoteRef.current) return;
      if (state.rateLimitedUntil === prevState.rateLimitedUntil) return;

      if (state.rateLimitedUntil > Date.now()) {
        channel.postMessage({
          type: 'RATE_LIMIT_SET',
          window: {
            rateLimitedUntil: state.rateLimitedUntil,
            endpoint: state.endpoint,
            limit: state.limit,
          },
        } satisfies RateLimitChannelMessage);
      } else {
        channel.postMessage({
          type: 'RATE_LIMIT_CLEAR',
        } satisfies RateLimitChannelMessage);
      }
    });

    return unsub;
  }, []);
}
