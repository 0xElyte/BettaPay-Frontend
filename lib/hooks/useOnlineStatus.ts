"use client";

/**
 * useOnlineStatus
 *
 * Returns a reactive boolean that tracks the browser's network connectivity
 * via the `online` / `offline` window events and `navigator.onLine`.
 *
 * SSR-safe: defaults to `true` when `window` is not available so that
 * server-rendered markup does not disable interactive elements.
 */

import { useState, useEffect } from "react";

export function useOnlineStatus(): boolean {
  // Default to true on the server (window is undefined during SSR/RSC).
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Sync with the current value in case it changed between render and mount.
    setIsOnline(window.navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
