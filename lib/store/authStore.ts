import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "../types";
import { BP_SESSION_KEY } from "@/lib/auth/session";

interface AuthState {
  user: User | null;
  token: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isLoggedIn: boolean;
  /** false until zustand-persist has rehydrated from storage (issue #485). */
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  /** Replace the token in place after a silent refresh (issue #487). */
  setToken: (token: string) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export function resetAllUserState() {
  if (typeof window === "undefined") return;

  const stores = [BP_SESSION_KEY, "bettapay_rate_alerts", "bp-rate-limit"];

  stores.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Failed to clear ${key}`, e);
    }
  });

  const { useWalletStore } = require("@/lib/store/walletStore");
  const { useOfflineStore } = require("@/lib/store/offlineStore");

  useWalletStore.getState().disconnect();
  useOfflineStore.setState({ dismissed: false });
}

/** The single source of truth for "is there a real session" — a login flag is
 *  only meaningful with an identity attached (issue #485). */
export function hasRealSession(s: Pick<AuthState, "isAuthenticated" | "user">): boolean {
  return s.isAuthenticated && s.user != null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
      isLoggedIn: false,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      setToken: (token) => {
        if (get().isAuthenticated) set({ token });
      },
      login: (token, user) =>
        set({
          user,
          token,
          role: user.role,
          isAuthenticated: true,
          isLoggedIn: true,
        }),
      logout: () => {
        set({
          user: null,
          token: null,
          role: null,
          isAuthenticated: false,
          isLoggedIn: false,
        });
        // Drop the persisted snapshot immediately so a late partialize write
        // (or another tab reading storage) can't resurrect `isLoggedIn: true`.
        try {
          useAuthStore.persist.clearStorage();
        } catch {
          /* storage unavailable */
        }
        resetAllUserState();
        if (typeof window !== "undefined") {
          fetch("/api/auth/session", {
            method: "DELETE",
            credentials: "include",
          }).catch(() => {});
        }
      },
    }),
    {
      name: BP_SESSION_KEY,
      // Persist a *consistent* envelope: identity + flags together, so the
      // store can never hydrate as "logged in" with a null user (issue #485).
      // `isLoggedIn` is derived from the identity, never written independently.
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
        isLoggedIn: hasRealSession(state),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Defensive: an old/partial snapshot with a flag but no user is not
          // a session — treat it as logged out rather than half-authenticated.
          if ((state.isLoggedIn || state.isAuthenticated) && state.user == null) {
            state.user = null;
            state.token = null;
            state.role = null;
            state.isAuthenticated = false;
            state.isLoggedIn = false;
          }
          state.setHasHydrated(true);
        }
      },
    },
  ),
);

/** Selector hook for gating protected UI on rehydration (issue #485). */
export function useAuthHydrated(): boolean {
  return useAuthStore((s) => s._hasHydrated);
}
