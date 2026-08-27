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
  login: (token: string, user: User) => void;
  /**
   * Ends the session. Returns `{ serverInvalidated }` so callers can surface
   * a "couldn't fully sign out" notice when the server DELETE failed (issue
   * #491). Local state is always cleared and the caller can always navigate.
   */
  logout: () => Promise<{ serverInvalidated: boolean }>;
}

/** Belt-and-braces client-side cookie expiry for when DELETE /api/auth/session
 *  is unreachable (issue #491). The HttpOnly `auth_token` can't be cleared
 *  this way, but the readable ones can, and the server call is retried. */
function expireAuthCookiesClientSide() {
  if (typeof document === "undefined") return;
  const past = "Thu, 01 Jan 1970 00:00:00 GMT";
  for (const name of ["user_role", "csrf_token", "merchant_onboarded"]) {
    document.cookie = `${name}=; Path=/; Expires=${past}; SameSite=Lax`;
  }
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
      isLoggedIn: false,
      login: (token, user) =>
        set({
          user,
          token,
          role: user.role,
          isAuthenticated: true,
          isLoggedIn: true,
        }),
      logout: async () => {
        set({
          user: null,
          token: null,
          role: null,
          isAuthenticated: false,
          isLoggedIn: false,
        });
        resetAllUserState();

        let serverInvalidated = false;
        if (typeof window !== "undefined") {
          try {
            const res = await fetch("/api/auth/session", {
              method: "DELETE",
              credentials: "include",
            });
            serverInvalidated = res.ok;
          } catch {
            serverInvalidated = false;
          }
          if (!serverInvalidated) {
            // Offline / 5xx: clear what we can locally so the browser stops
            // presenting the session, and let a later request retry.
            expireAuthCookiesClientSide();
          }
        }
        return { serverInvalidated };
      },
    }),
    {
      name: BP_SESSION_KEY,
      partialize: (state) => ({ isLoggedIn: state.isLoggedIn }),
    },
  ),
);
