'use client';

import { useEffect } from 'react';
import { useRateLimitStore } from '../store/rateLimitStore';

/**
 * Hook that manages the rate limit countdown timer.
 *
 * Creates a single steady interval on mount that recomputes `secondsRemaining`
 * from the stored epoch on every tick. The interval is only torn down on
 * unmount — store changes no longer recreate it, preventing drift.
 */
export function useRateLimitCountdown() {
  useEffect(() => {
    const interval = setInterval(() => {
      const { rateLimitedUntil, tick } = useRateLimitStore.getState();
      if (rateLimitedUntil === 0) return;
      tick();
    }, 1000);

    return () => clearInterval(interval);
  }, []);
}
