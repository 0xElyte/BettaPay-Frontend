'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

const AUTH_STORAGE_KEY = 'auth-storage';

export function useCrossTabAuth() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== AUTH_STORAGE_KEY) return;

      try {
        const newValue = event.newValue ? JSON.parse(event.newValue) : null;
        const role = newValue?.state?.role ?? null;

        // role going null in another tab means the user logged out
        if (role === null && isAuthenticated) {
          useAuthStore.setState({ user: null, token: null, role: null, isAuthenticated: false });
          router.push('/auth/login');
        }
      } catch {
        // Malformed JSON — ignore
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [isAuthenticated, router]);
}
