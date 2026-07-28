import { create } from 'zustand';

interface OfflineState {
  isOnline: boolean;
  /** Whether the user has manually dismissed the offline banner. */
  dismissed: boolean;
  setIsOnline: (isOnline: boolean) => void;
  dismiss: () => void;
}

export const useOfflineStore = create<OfflineState>()((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
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
  dismiss: () => set({ dismissed: true }),
}));
