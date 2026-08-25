"use client";

import { useEffect, useState } from "react";
import { RELATIVE_TICK_MS, stableNow } from "@/lib/status/time";

/**
 * A ticking "now" for relative timestamps.
 *
 * Seeded with `stableNow()` so the server render and the first client render
 * produce identical markup, then switched to the live clock on mount and
 * refreshed on an interval — that is what makes "2 minutes ago" advance to
 * "3 minutes ago" without a reload.
 */
export function useNow(intervalMs: number = RELATIVE_TICK_MS): number {
  const [now, setNow] = useState<number>(stableNow);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
