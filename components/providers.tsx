"use client";

import { ThemeProvider } from "next-themes";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/authStore";
import { useSessionCheck } from "@/lib/hooks/useSessionCheck";
import { useCrossTabAuth } from "@/lib/hooks/useCrossTabAuth";
import { useCrossTabRateLimit } from "@/lib/hooks/useCrossTabRateLimit";
import { setAppRouter } from "@/lib/navigation/appRouter";
import { OfflineBanner } from "@/components/ui";
import { initRum } from "@/lib/rum";
import { initErrorReporting } from "@/lib/errorReporting";
import { useRouteChange } from "@/lib/rum/useRouteChange";
import { useHydrationCapture } from "@/lib/rum/useHydrationCapture";

export function Providers({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();

  // Register the App Router in a module-level singleton so non-React code
  // (e.g. the axios auth interceptor) can navigate with router.push instead of
  // a full-page reload. Clear it on unmount to avoid holding a stale router.
  useEffect(() => {
    setAppRouter(router);
    return () => setAppRouter(null);
  }, [router]);

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

  // Initialize RUM collection once per browser session
  useEffect(() => {
    const cleanup = initRum();
    return cleanup;
  }, []);

  // Install global handlers for uncaught errors and unhandled rejections.
  useEffect(() => {
    const cleanup = initErrorReporting();
    return cleanup;
  }, []);

  useRouteChange();
  useHydrationCapture();
  useSessionCheck();
  useCrossTabAuth();
  useCrossTabRateLimit();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
        <OfflineBanner />
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
