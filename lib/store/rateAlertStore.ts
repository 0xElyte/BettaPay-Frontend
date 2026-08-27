import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface RateAlert {
  id: string;
  pair: string;
  condition: 'above' | 'below';
  target: number;
  enabled: boolean;
  triggered?: boolean;
  triggeredAt?: number;
}

interface RateAlertState {
  alerts: RateAlert[];
  addAlert: (alert: Omit<RateAlert, 'id' | 'enabled' | 'triggered' | 'triggeredAt'>) => void;
  toggleAlert: (id: string) => void;
  deleteAlert: (id: string) => void;
  markAlertTriggered: (id: string) => void;
  resetAlertTrigger: (id: string) => void;
  clearAllAlerts: () => void;
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
              id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              enabled: true,
              triggered: false,
            },
          ],
        })),
      toggleAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id
              ? {
                  ...a,
                  enabled: !a.enabled,
                  // If enabling an alert, reset its triggered flag so it can monitor again
                  triggered: !a.enabled ? false : a.triggered,
                }
              : a
          ),
        })),
      deleteAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        })),
      markAlertTriggered: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, triggered: true, triggeredAt: Date.now() } : a
          ),
        })),
      resetAlertTrigger: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, triggered: false, triggeredAt: undefined } : a
          ),
        })),
      clearAllAlerts: () => set({ alerts: [] }),
    }),
    {
      name: 'bettapay_rate_alerts',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
    }
  )
);

