import { create } from 'zustand';

interface RateLimitState {
  /** Timestamp (ms) when the rate limit expires, or 0 if not rate-limited */
  rateLimitedUntil: number;
  /** Remaining seconds on the countdown */
  secondsRemaining: number;
  /** Set the rate limit window (retryAfter in seconds) */
  setRateLimited: (retryAfterSeconds: number) => void;
  /** Tick the countdown (call every second) */
  tick: () => void;
}

export const useRateLimitStore = create<RateLimitState>()((set, get) => ({
  rateLimitedUntil: 0,
  secondsRemaining: 0,

  setRateLimited: (retryAfterSeconds: number) => {
    const until = Date.now() + retryAfterSeconds * 1000;
    set({ rateLimitedUntil: until, secondsRemaining: retryAfterSeconds });
  },

  tick: () => {
    const { rateLimitedUntil } = get();
    if (rateLimitedUntil === 0) return;

    const remaining = Math.max(0, Math.ceil((rateLimitedUntil - Date.now()) / 1000));
    if (remaining <= 0) {
      set({ rateLimitedUntil: 0, secondsRemaining: 0 });
    } else {
      set({ secondsRemaining: remaining });
    }
  },
}));
