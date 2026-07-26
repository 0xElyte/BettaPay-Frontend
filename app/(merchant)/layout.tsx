"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { MerchantSidebar } from "@/components/layout";
import { merchantNavItems } from "@/lib/navigation/merchantNav";
import { PageTransition, ErrorBoundary } from "@/components/shared";
import { MobileNavDrawer } from "@/components/layout";
import { Topbar } from "@/components/layout";
import Footer from "@/components/layout";
import { MobileBottomNav } from "@/components/layout";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { useWalletStore } from "@/lib/store/walletStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useSessionTimeout } from "@/lib/hooks/useSessionTimeout";
import { SessionTimeoutModal } from "@/components/SessionTimeoutModal";

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const network = useWalletStore((s) => s.network);
  const isTestnet = network === 'testnet';
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const handleTimeoutLogout = useCallback(() => {
    logout();
    router.push('/auth/login');
  }, [logout, router]);

  const { showWarning, secondsRemaining, dismissWarning } = useSessionTimeout({
    onTimeout: handleTimeoutLogout,
  });

  const handleExtend = useCallback(async () => {
    try {
      await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
      dismissWarning();
    } catch {
      logout();
      router.push('/auth/login');
    }
  }, [logout, router, dismissWarning]);

  useEffect(() => {
    router.prefetch("/transactions");
    router.prefetch("/payments");
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <MerchantSidebar />

      <MobileNavDrawer
        isOpen={mobileMenuOpen}
        onClose={closeMobileMenu}
        navItems={merchantNavItems}
      />

      <MobileBottomNav />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isTestnet && (
          <div className="bg-yellow-400/90 dark:bg-yellow-500/90 px-4 py-2 text-center text-xs sm:text-sm font-medium text-yellow-950 flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>You are on Stellar Testnet &mdash; transactions use test tokens</span>
          </div>
        )}

        <Topbar
          onMenuClick={() => setMobileMenuOpen((open) => !open)}
          isMenuOpen={mobileMenuOpen}
        />

        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto bg-background/50 pb-20 md:pb-0">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-8 space-y-6">
            <OnboardingWizard />
            <PageTransition>
              <ErrorBoundary>{children}</ErrorBoundary>
            </PageTransition>
          </div>
        </main>

        <Footer />
      </div>

      {isAuthenticated && (
        <SessionTimeoutModal
          open={showWarning}
          secondsRemaining={secondsRemaining}
          onExtend={handleExtend}
          onLogout={handleTimeoutLogout}
        />
      )}
    </div>
  );
}
