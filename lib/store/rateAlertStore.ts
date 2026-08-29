import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type RateAlertRecurrence = 'once' | 'recurring';
export type RateAlertChannel = 'in_app' | 'email' | 'webhook';

export interface RateAlertWindow {
  /** 24h "HH:MM" — alerts only fire inside [start, end]. Omitted = always. */
  start: string;
  end: string;
}

export interface RateAlert {
  id: string;
  pair: string;
  condition: 'above' | 'below';
  target: number;
  enabled: boolean;
  /** #469: one-time alerts deactivate after firing; recurring re-arm. */
  recurrence: RateAlertRecurrence;
  channels: RateAlertChannel[];
  window?: RateAlertWindow;
  triggered?: boolean;
  triggeredAt?: number;
  /** Set once the row is known to the backend (issue #469). */
  synced?: boolean;
}

type NewAlert = Pick<RateAlert, 'pair' | 'condition' | 'target'> &
  Partial<Pick<RateAlert, 'recurrence' | 'channels' | 'window'>>;

interface RateAlertState {
  alerts: RateAlert[];
  /** true once the initial server reconcile has completed. */
  hydratedFromServer: boolean;
  addAlert: (alert: NewAlert) => void;
  toggleAlert: (id: string) => void;
  deleteAlert: (id: string) => void;
  markAlertTriggered: (id: string) => void;
  resetAlertTrigger: (id: string) => void;
  clearAllAlerts: () => void;
  /** Replace local alerts with the authoritative server list (issue #469). */
  reconcile: (serverAlerts: RateAlert[]) => void;
  /** Fetch `/api/rate-alerts` and reconcile. Safe to call on every boot. */
  hydrateFromServer: () => Promise<void>;
}

function localId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const useRateAlertStore = create<RateAlertState>()(
  persist(
    (set, get) => ({
      alerts: [],
      hydratedFromServer: false,
      addAlert: (alert) =>
        set((state) => ({
          alerts: [
            ...state.alerts,
            {
              pair: alert.pair,
              condition: alert.condition,
              target: alert.target,
              recurrence: alert.recurrence ?? 'once',
              channels: alert.channels ?? ['in_app'],
              window: alert.window,
              id: localId(),
              enabled: true,
              triggered: false,
              synced: false,
            },
          ],
        })),
      toggleAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id
              ? { ...a, enabled: !a.enabled, triggered: !a.enabled ? false : a.triggered }
              : a,
          ),
        })),
      deleteAlert: (id) =>
        set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) })),
      markAlertTriggered: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) => {
            if (a.id !== id) return a;
            const fired = { ...a, triggered: true, triggeredAt: Date.now() };
            // One-time alerts deactivate after firing (issue #469 acceptance).
            return a.recurrence === 'once' ? { ...fired, enabled: false } : fired;
          }),
        })),
      resetAlertTrigger: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, triggered: false, triggeredAt: undefined } : a,
          ),
        })),
      clearAllAlerts: () => set({ alerts: [] }),
      reconcile: (serverAlerts) => {
        // Server is authoritative; keep any local-only rows that haven't been
        // pushed yet so an offline "add" isn't lost on the next boot.
        const serverIds = new Set(serverAlerts.map((a) => a.id));
        const localOnly = get().alerts.filter((a) => a.synced === false && !serverIds.has(a.id));
        set({
          alerts: [...serverAlerts.map((a) => ({ ...a, synced: true })), ...localOnly],
          hydratedFromServer: true,
        });
      },
      hydrateFromServer: async () => {
        try {
          const res = await fetch('/api/rate-alerts', { cache: 'no-store' });
          if (!res.ok) return;
          const body = (await res.json().catch(() => ({}))) as { alerts?: RateAlert[] };
          if (Array.isArray(body.alerts)) get().reconcile(body.alerts);
        } catch {
          // offline — keep the persisted local list; try again next boot
        }
      },
    }),
    {
      name: 'bettapay_rate_alerts',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
      partialize: (s) => ({ alerts: s.alerts }),
    },
  ),
);
