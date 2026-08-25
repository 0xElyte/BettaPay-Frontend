'use client';

import { useEffect } from 'react';
import { useRateLimitStore } from '../store/rateLimitStore';

/**
 * Hook that manages the rate limit countdown timer.
 * Calls tick() every second to decrement the seconds remaining counter.
 * Automatically cleans up the interval when rate limit expires or component unmounts.
 */
export function useRateLimitCountdown() {
  const { rateLimitedUntil, tick } = useRateLimitStore();

  useEffect(() => {
    if (rateLimitedUntil === 0) return;

    const interval = setInterval(() => {
      tick();
    }, 1000);

    return () => clearInterval(interval);
  }, [rateLimitedUntil, tick]);
}
