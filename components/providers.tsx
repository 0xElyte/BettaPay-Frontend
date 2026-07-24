"use client";

import { ThemeProvider } from "next-themes";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/authStore";
import { useSessionTimeout } from "@/lib/hooks/useSessionTimeout";
import { useSessionCheck } from "@/lib/hooks/useSessionCheck";
import { useCrossTabAuth } from "@/lib/hooks/useCrossTabAuth";
import { SessionTimeoutModal } from "@/components/SessionTimeoutModal";
import { OfflineBanner } from "@/components/ui";

export function Providers({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  // SSR-safe lazy initialisation keeps a stable QueryClient per browser
  // session while making sure each server render starts with its own
  // instance (preventing cross-request cache bleed).
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 30s of staleness keeps API hook consumers responsive without
            // re-hitting the network on every component re-mount or route
            // navigation. Data is silently refetched in the background.
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  // Purge cached merchant data when the user logs out so the next account
  // never sees stale payment/settlement/rate/profile data from the previous
  // session.
  const wasAuthenticatedRef = useRef(isAuthenticated);
  useEffect(() => {
    if (wasAuthenticatedRef.current && !isAuthenticated) {
      queryClient.clear();
    }
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated, queryClient]);

  // Best-effort logout from the timeout warning still needs to wipe the
  // react-query cache in the same render cycle — the effect above covers
  // normal user-driven logouts but a forced session timeout may not flip
  // the same subscription, so trigger an explicit clear as a safety net.
  const handleTimeout = useCallback(() => {
    logout();
    queryClient.clear();
    window.location.href = "/auth/login";
  }, [logout, queryClient]);

  useSessionCheck();
  useCrossTabAuth();

  const { showWarning, secondsRemaining, dismissWarning } = useSessionTimeout({
    onTimeout: handleTimeout,
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
        <OfflineBanner />
        {children}
        {isAuthenticated && (
          <SessionTimeoutModal
            open={showWarning}
            secondsRemaining={secondsRemaining}
            onDismiss={dismissWarning}
          />
        )}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
