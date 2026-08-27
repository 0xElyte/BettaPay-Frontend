import { create } from 'zustand';

interface OfflineState {
  isOnline: boolean;
  isApiReachable: boolean;
  dismissed: boolean;
  setIsOnline: (isOnline: boolean) => void;
  setIsApiReachable: (isApiReachable: boolean) => void;
  dismiss: () => void;
}

export const useOfflineStore = create<OfflineState>()((set) => ({
  isOnline: true,
  isApiReachable: true,
  dismissed: false,
  setIsOnline: (isOnline) =>
    set((state) => {
      // Reset the dismissal whenever connectivity transitions from online to
      // offline so a previously-dismissed banner reappears on the next offline
      // event instead of staying hidden forever.
      if (!isOnline && state.isOnline) {
        return { isOnline, dismissed: false };
      }
      return { isOnline };
    }),
  setIsApiReachable: (isApiReachable) =>
    set((state) => {
      // Reset dismissal if API goes from reachable to unreachable
      if (!isApiReachable && state.isApiReachable) {
        return { isApiReachable, dismissed: false };
      }
      return { isApiReachable };
    }),
  dismiss: () => set({ dismissed: true }),
}));
