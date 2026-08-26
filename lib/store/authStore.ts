import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { BP_SESSION_KEY } from '@/lib/auth/session';

interface AuthState {
  user: User | null;
  token: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isLoggedIn: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
      isLoggedIn: false,
      login: (token, user) => set({ user, token, role: user.role, isAuthenticated: true, isLoggedIn: true }),
      logout: () => {
        set({ user: null, token: null, role: null, isAuthenticated: false, isLoggedIn: false });
        // Ask backend to clear the auth cookie (best-effort, backend may not exist in this demo)
        if (typeof window !== 'undefined') {
          fetch('/api/auth/session', { method: 'DELETE', credentials: 'include' }).catch(() => {});
        }
      },
    }),
    {
      name: BP_SESSION_KEY,
      // Persist only a non-sensitive flag. Token, user, and role are kept in memory only.
      // Aligns with middleware's auth_token+user_role cookie contract and
      // useSessionCheck's SessionCheckResponse rehydration (lib/auth/session.ts).
      partialize: (state) => ({ isLoggedIn: state.isLoggedIn }),
    }
  )
);
