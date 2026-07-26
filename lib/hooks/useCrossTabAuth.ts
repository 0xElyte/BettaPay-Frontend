'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

const AUTH_STORAGE_KEY = 'auth-storage';
const CHANNEL_NAME = 'bettapay-auth-sync';

interface AuthChannelMessage {
  type: 'AUTH_LOGIN' | 'AUTH_LOGOUT' | 'AUTH_TOKEN_EXPIRED';
  role?: string;
}

export function useCrossTabAuth() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    try {
      channelRef.current = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      // BroadcastChannel not supported — fall back to StorageEvent only
    }

    const channel = channelRef.current;

    const handleChannelMessage = (event: MessageEvent<AuthChannelMessage>) => {
      const message = event.data;

      switch (message.type) {
        case 'AUTH_LOGOUT':
        case 'AUTH_TOKEN_EXPIRED':
          if (useAuthStore.getState().isAuthenticated) {
            useAuthStore.setState({
              user: null,
              token: null,
              role: null,
              isAuthenticated: false,
            });
            router.push('/auth/login');
          }
          break;

        case 'AUTH_LOGIN':
          if (!useAuthStore.getState().isAuthenticated) {
            router.refresh();
          }
          break;
      }
    };

    if (channel) {
      channel.addEventListener('message', handleChannelMessage);
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== AUTH_STORAGE_KEY) return;

      try {
        const newValue = event.newValue ? JSON.parse(event.newValue) : null;
        const newRole = newValue?.state?.role ?? null;

        if (newRole === null && useAuthStore.getState().isAuthenticated) {
          useAuthStore.setState({
            user: null,
            token: null,
            role: null,
            isAuthenticated: false,
          });
          router.push('/auth/login');
        }
      } catch {
        // Malformed JSON — ignore
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      if (channel) {
        channel.removeEventListener('message', handleChannelMessage);
        channel.close();
      }
      window.removeEventListener('storage', handleStorage);
    };
  }, [router]);

  useEffect(() => {
    const channel = channelRef.current;

    const unsub = useAuthStore.subscribe((state, prevState) => {
      if (!channel) return;

      if (state.isAuthenticated && !prevState.isAuthenticated) {
        channel.postMessage({ type: 'AUTH_LOGIN', role: state.role } satisfies AuthChannelMessage);
      } else if (!state.isAuthenticated && prevState.isAuthenticated) {
        channel.postMessage({ type: 'AUTH_LOGOUT' } satisfies AuthChannelMessage);
      }
    });

    return unsub;
  }, []);
}
