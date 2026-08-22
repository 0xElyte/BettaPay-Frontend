import { getUnreadCount } from '@/lib/notifications';
import { getNotificationStore } from '@/lib/notifications';

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const push = () => {
        const store = getNotificationStore();
        controller.enqueue(
          encoder.encode(
            `event: notification\ndata: ${JSON.stringify({
              notifications: store.notifications,
              unreadCount: getUnreadCount(store.notifications),
              preferences: store.preferences,
            })}\n\n`,
          ),
        );
      };

      push();
      const interval = setInterval(push, 15000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
