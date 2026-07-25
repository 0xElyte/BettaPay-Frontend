import { create } from 'zustand';

interface OfflineState {
  isOnline: boolean;
  setIsOnline: (isOnline: boolean) => void;
}

export const useOfflineStore = create<OfflineState>()((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  setIsOnline: (isOnline) => set({ isOnline }),
}));
