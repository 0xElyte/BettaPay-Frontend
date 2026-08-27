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
      logout: () => {
        set({
          user: null,
          token: null,
          role: null,
          isAuthenticated: false,
          isLoggedIn: false,
        });
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
      partialize: (state) => ({ isLoggedIn: state.isLoggedIn }),
    },
  ),
);
