'use client';

import { useEffect } from 'react';
import { WifiOff, RotateCw, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { useOfflineStore } from '@/lib/store/offlineStore';

export function OfflineBanner() {
  const detectedOnline = useOnlineStatus();
  const isOnline = useOfflineStore((s) => s.isOnline);
  const dismissed = useOfflineStore((s) => s.dismissed);
  const setIsOnline = useOfflineStore((s) => s.setIsOnline);
  const dismiss = useOfflineStore((s) => s.dismiss);
  const queryClient = useQueryClient();

  // Feed the browser-detected connectivity into the shared store so the banner
  // (and the rest of the app) render from a single source of truth.
  useEffect(() => {
    setIsOnline(detectedOnline);
  }, [detectedOnline, setIsOnline]);

  // Only show when the store says we are truly offline and the user hasn't
  // dismissed it for this offline episode.
  if (isOnline || dismissed) return null;

  const handleRetry = () => {
    // Re-fetch any data that failed while offline. Queries that are still
    // failing (because we're still offline) simply error again and leave the
    // banner in place.
    queryClient.refetchQueries();
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[60] bg-destructive text-destructive-foreground px-4 py-2.5 flex items-center justify-center gap-3 shadow-md animate-in slide-in-from-top duration-300"
    >
      <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span className="text-sm font-medium">
        You are offline. Some features may be unavailable.
      </span>
      <button
        type="button"
        onClick={handleRetry}
        className="inline-flex items-center gap-1 rounded-md border border-destructive-foreground/40 px-2 py-1 text-xs font-medium hover:bg-destructive-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive-foreground/60"
      >
        <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
        Retry
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss offline notification"
        className="ml-1 inline-flex items-center justify-center rounded-md p-1 hover:bg-destructive-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive-foreground/60"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
