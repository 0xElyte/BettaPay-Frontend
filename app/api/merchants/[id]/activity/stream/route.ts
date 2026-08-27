import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const upstreamBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const isSelfLoop =
    !upstreamBase ||
    upstreamBase.includes('localhost') ||
    upstreamBase.includes('127.0.0.1');

  if (!isSelfLoop) {
    const { searchParams } = new URL(req.url);
    const upstreamUrl = `${upstreamBase}/api/merchants/${params.id}/activity/stream?${searchParams.toString()}`;
    try {
      const response = await fetch(upstreamUrl, {
        headers: {
          cookie: req.headers.get("cookie") || "",
          Accept: "text/event-stream",
        },
      });

      if (!response.ok || !response.body) {
        return new Response("Failed to establish upstream stream", { status: response.status });
      }

      return new Response(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    } catch {
      return new Response("Backend unreachable", { status: 502 });
    }
  }

  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial snapshot/connected event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: "connected" })}\n\n`)
      );

      let counter = 0;
      intervalId = setInterval(() => {
        counter += 1;
        const now = new Date();

        let newEvent;
        let eventType: string;

        if (counter % 3 === 1) {
          eventType = "payment_received";
          newEvent = {
            id: `live-payment-${Date.now()}`,
            type: eventType,
            title: "Payment Received",
            description: `$${(Math.random() * 400 + 10).toFixed(2)} USDC received (Live)`,
            timestamp: now.toISOString(),
            detailHref: "/transactions",
          };
        } else if (counter % 3 === 2) {
          eventType = "webhook_delivered";
          newEvent = {
            id: `live-webhook-${Date.now()}`,
            type: eventType,
            title: "Webhook Delivered",
            description: "payment.succeeded sent to https://api.acme.com/webhook (Live)",
            timestamp: now.toISOString(),
            detailHref: "/developers",
          };
        } else {
          eventType = "api_key_used";
          newEvent = {
            id: `live-key-${Date.now()}`,
            type: eventType,
            title: "API Key Used",
            description: "Live Secret Key verified by client library (Live)",
            timestamp: now.toISOString(),
            detailHref: "/developers",
          };
        }

        // Send with the corresponding event type name so es.addEventListener handles it
        controller.enqueue(
          encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(newEvent)}\n\n`)
        );
      }, 15000); // push every 15 seconds

      req.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
