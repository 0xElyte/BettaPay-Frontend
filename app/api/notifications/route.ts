import { NextResponse } from 'next/server';
import {
  createNotification,
  dedupeNotificationList,
  getNotificationStore,
  getUnreadCount,
  normalizePreferences,
  type NotificationPreferences,
  type NotificationType,
} from '@/lib/notifications';

export async function GET() {
  const store = getNotificationStore();

  return NextResponse.json({
    notifications: store.notifications,
    unreadCount: getUnreadCount(store.notifications),
    preferences: store.preferences,
  });
}

async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const text = await request.text();
    if (!text) {
      return null;
    }
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function PATCH(request: Request) {
  const body = await readJsonBody(request);
  const store = getNotificationStore();

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: true, notifications: store.notifications, unreadCount: getUnreadCount(store.notifications), preferences: store.preferences }, { status: 200 });
  }

  const action = body.action;

  if (action === 'mark_read') {
    const id = typeof body.id === 'string' ? body.id : null;
    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing notification id' }, { status: 400 });
    }

    store.notifications = store.notifications.map((notification) =>
      notification.id === id ? { ...notification, read: true } : notification,
    );
  } else if (action === 'mark_all_read') {
    store.notifications = store.notifications.map((notification) => ({ ...notification, read: true }));
  } else if (action === 'set_preferences') {
    const nextPreferences = normalizePreferences(body.preferences as Partial<NotificationPreferences> | undefined);
    store.preferences = nextPreferences;
  } else if (action === 'add_event') {
    const type = (body.type as NotificationType | undefined) ?? 'settlement';
    const title = typeof body.title === 'string' ? body.title : 'New notification';
    const message = typeof body.body === 'string' ? body.body : 'You have a new update.';
    const source = typeof body.source === 'string' ? body.source : 'system';

    if (!store.preferences[type]) {
      return NextResponse.json({ ok: true, notifications: store.notifications, unreadCount: getUnreadCount(store.notifications), preferences: store.preferences });
    }

    const nextNotification = createNotification(type, title, message, source);
    store.notifications = dedupeNotificationList(store.notifications, nextNotification);
  } else {
    return NextResponse.json({ ok: false, error: 'Unsupported action' }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    notifications: store.notifications,
    unreadCount: getUnreadCount(store.notifications),
    preferences: store.preferences,
  });
}

export async function POST(request: Request) {
  return PATCH(request);
}
