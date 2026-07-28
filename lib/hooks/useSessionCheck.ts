'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

export function useSessionCheck() {
  const [isVerifying, setIsVerifying] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  useEffect(() => {
    // Only verify when in-memory state was lost but a persisted flag exists (tab restore scenario)
    if (isAuthenticated || !isLoggedIn) return;

    let cancelled = false;
    setIsVerifying(true);

    fetch('/api/auth/session', { method: 'GET', credentials: 'include' })
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.user && data?.token) {
            login(data.token, data.user);
          }
          // If backend responds OK but no user data, treat session as valid and leave state alone
        } else {
          // Session expired — clear persisted state and redirect
          logout();
          router.push('/auth/login');
        }
      })
      .catch(() => {
        // Backend unavailable — assume session is valid in mock/preview mode
        if (!cancelled) setIsVerifying(false);
      })
      .finally(() => {
        if (!cancelled) setIsVerifying(false);
      });

    return () => { cancelled = true; };
  }, [isAuthenticated, isLoggedIn, login, logout, router]);

  return { isVerifying };
}
