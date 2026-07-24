import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RateAlert {
  id: string;
  pair: string;
  condition: 'above' | 'below';
  target: number;
  enabled: boolean;
}

interface RateAlertState {
  alerts: RateAlert[];
  addAlert: (alert: Omit<RateAlert, 'id' | 'enabled'>) => void;
  toggleAlert: (id: string) => void;
  deleteAlert: (id: string) => void;
}

export const useRateAlertStore = create<RateAlertState>()(
  persist(
    (set) => ({
      alerts: [],
      addAlert: (alert) =>
        set((state) => ({
          alerts: [
            ...state.alerts,
            {
              ...alert,
              id: Math.random().toString(36).substr(2, 9),
              enabled: true,
            },
          ],
        })),
      toggleAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, enabled: !a.enabled } : a
          ),
        })),
      deleteAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        })),
    }),
    {
      name: 'bettapay_rate_alerts',
    }
  )
);
