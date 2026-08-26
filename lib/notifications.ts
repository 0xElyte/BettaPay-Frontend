export type NotificationType = 'settlement' | 'webhook_failure' | 'rate_alert' | 'kyc';

export type NotificationPreferences = Record<NotificationType, boolean>;

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  source: string;
  dedupeKey: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  settlement: true,
  webhook_failure: true,
  rate_alert: true,
  kyc: true,
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  settlement: 'Settlement',
  webhook_failure: 'Webhook failure',
  rate_alert: 'Rate alert',
  kyc: 'KYC',
};

export function getDefaultNotifications(): NotificationItem[] {
  const now = Date.now();

  return [
    {
      id: 'notif-settlement-1',
      type: 'settlement',
      title: 'Settlement processed',
      body: 'NGN 275,000 has hit your settlement account.',
      createdAt: new Date(now - 1000 * 60 * 8).toISOString(),
      read: false,
      source: 'settlement-engine',
      dedupeKey: 'settlement:NGN275000:processed',
    },
    {
      id: 'notif-rate-1',
      type: 'rate_alert',
      title: 'FX rate alert',
      body: 'USD/NGN moved 6.2% in the last 30 minutes.',
      createdAt: new Date(now - 1000 * 60 * 26).toISOString(),
      read: true,
      source: 'rate-feed',
      dedupeKey: 'rate_alert:fxngn:6.2',
    },
    {
      id: 'notif-webhook-1',
      type: 'webhook_failure',
      title: 'Webhook delivery failed',
      body: 'Your endpoint timed out while retrying 2 payment events.',
      createdAt: new Date(now - 1000 * 60 * 70).toISOString(),
      read: false,
      source: 'webhook-worker',
      dedupeKey: 'webhook_failure:retry_timeout:2',
    },
  ];
}

export function normalizePreferences(input: Partial<NotificationPreferences> | Record<string, boolean> | undefined): NotificationPreferences {
  const next = { ...DEFAULT_NOTIFICATION_PREFERENCES };

  if (!input) {
    return next;
  }

  for (const key of Object.keys(DEFAULT_NOTIFICATION_PREFERENCES) as NotificationType[]) {
    const value = input[key];
    if (typeof value === 'boolean') {
      next[key] = value;
    }
  }

  return next;
}

export function createNotification(
  type: NotificationType,
  title: string,
  body: string,
  source: string,
  read = false,
): NotificationItem {
  const createdAt = new Date().toISOString();
  const dedupeKey = `${type}:${source}:${title}:${body}`;

  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    body,
    createdAt,
    read,
    source,
    dedupeKey,
  };
}

export function dedupeNotificationList(items: NotificationItem[], incoming: NotificationItem): NotificationItem[] {
  const similar = items.some((item) => {
    const sameKey = item.dedupeKey === incoming.dedupeKey;
    const recent = Math.abs(new Date(item.createdAt).getTime() - new Date(incoming.createdAt).getTime()) < 60 * 1000;
    return sameKey && recent;
  });

  if (similar) {
    return items;
  }

  return sortNotifications([incoming, ...items]);
}

export function sortNotifications(items: NotificationItem[]): NotificationItem[] {
  return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getUnreadCount(items: NotificationItem[]): number {
  return items.filter((item) => !item.read).length;
}

export interface NotificationStore {
  notifications: NotificationItem[];
  preferences: NotificationPreferences;
}

const NOTIFICATION_STORE_KEY = '__bettapay_notification_store__';

declare global {
  // eslint-disable-next-line no-var
  var __bettapay_notification_store__: NotificationStore | undefined;
}

export function getNotificationStore(): NotificationStore {
  const store = globalThis as typeof globalThis & { [NOTIFICATION_STORE_KEY]?: NotificationStore };

  if (!store[NOTIFICATION_STORE_KEY]) {
    store[NOTIFICATION_STORE_KEY] = {
      notifications: getDefaultNotifications(),
      preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
    };
  }

  return store[NOTIFICATION_STORE_KEY]!;
}
