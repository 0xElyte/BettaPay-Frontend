'use client';

import { useEffect, useCallback, useRef, useState } from 'react';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;

interface UseSessionTimeoutOptions {
  /** Inactivity threshold in ms before showing warning (default: 30 min) */
  timeoutMs?: number;
  /** Grace period in ms after warning before auto-logout (default: 2 min) */
  gracePeriodMs?: number;
  /** Called when the session has timed out */
  onTimeout: () => void;
}

interface UseSessionTimeoutReturn {
  /** Whether the warning modal should be shown */
  showWarning: boolean;
  /** Seconds remaining in the grace period */
  secondsRemaining: number;
  /** Dismiss the warning and reset the timer */
  dismissWarning: () => void;
}

export function useSessionTimeout({
  timeoutMs = 30 * 60 * 1000,
  gracePeriodMs = 2 * 60 * 1000,
  onTimeout,
}: UseSessionTimeoutOptions): UseSessionTimeoutReturn {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(
    Math.floor(gracePeriodMs / 1000)
  );

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (graceRef.current) {
      clearInterval(graceRef.current);
      graceRef.current = null;
    }
  }, []);

  const startGracePeriod = useCallback(() => {
    const graceSeconds = Math.floor(gracePeriodMs / 1000);
    setSecondsRemaining(graceSeconds);

    graceRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearAllTimers();
          setShowWarning(false);
          onTimeoutRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [gracePeriodMs, clearAllTimers]);

  const resetTimer = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    setSecondsRemaining(Math.floor(gracePeriodMs / 1000));

    timeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      startGracePeriod();
    }, timeoutMs);
  }, [timeoutMs, gracePeriodMs, clearAllTimers, startGracePeriod]);

  const dismissWarning = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  // Set up activity listeners and initial timer
  useEffect(() => {
    resetTimer();

    const handleActivity = () => {
      // Only reset the inactivity timer if warning is not showing
      if (!showWarning) {
        resetTimer();
      }
    };

    ACTIVITY_EVENTS.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearAllTimers();
      ACTIVITY_EVENTS.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimer, clearAllTimers, showWarning]);

  return { showWarning, secondsRemaining, dismissWarning };
}
