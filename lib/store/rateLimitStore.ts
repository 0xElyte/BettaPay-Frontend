import { create } from 'zustand';

interface RateLimitState {
  /** Timestamp (ms) when the rate limit expires, or 0 if not rate-limited */
  rateLimitedUntil: number;
  /** Remaining seconds on the countdown */
  secondsRemaining: number;
  /** Endpoint that was rate-limited */
  endpoint: string | null;
  /** Rate limit policy (max requests per window) */
  limit: number | null;
  /** Set the rate limit window (retryAfter in seconds) */
  setRateLimited: (retryAfterSeconds: number, endpoint?: string | null, limit?: number | null) => void;
  /** Tick the countdown (call every second) */
  tick: () => void;
  /** Clear rate limit state */
  clearRateLimit: () => void;
}

export const useRateLimitStore = create<RateLimitState>()((set, get) => ({
  rateLimitedUntil: 0,
  secondsRemaining: 0,
  endpoint: null,
  limit: null,

  setRateLimited: (retryAfterSeconds: number, endpoint?: string | null, limit?: number | null) => {
    const until = Date.now() + retryAfterSeconds * 1000;
    set({
      rateLimitedUntil: until,
      secondsRemaining: retryAfterSeconds,
      endpoint: endpoint ?? null,
      limit: limit ?? null,
    });
  },

  tick: () => {
    const { rateLimitedUntil } = get();
    if (rateLimitedUntil === 0) return;

    const remaining = Math.max(0, Math.ceil((rateLimitedUntil - Date.now()) / 1000));
    if (remaining <= 0) {
      set({ rateLimitedUntil: 0, secondsRemaining: 0, endpoint: null, limit: null });
    } else {
      set({ secondsRemaining: remaining });
    }
  },

  clearRateLimit: () => {
    set({ rateLimitedUntil: 0, secondsRemaining: 0, endpoint: null, limit: null });
  },
}));
