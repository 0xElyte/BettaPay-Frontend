import { NextResponse, NextRequest } from "next/server";

export const runtime = "nodejs";

export interface ActivityEvent {
  id: string;
  type:
    | "payment_received"
    | "settlement_initiated"
    | "settlement_completed"
    | "webhook_delivered"
    | "api_key_used";
  title: string;
  description: string;
  timestamp: string;
  detailHref: string;
  metadata?: Record<string, unknown>;
}

function generateActivityEvents(): ActivityEvent[] {
  const now = new Date();
  const subHours = (hrs: number) => new Date(now.getTime() - hrs * 60 * 60 * 1000).toISOString();
  const subDays = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

  return [
    // Today
    {
      id: "act-01",
      type: "payment_received",
      title: "Payment Received",
      description: "$1,500.00 USDC received from GBX...4Q3 (QR Code)",
      timestamp: subHours(2),
      detailHref: "/transactions",
    },
    {
      id: "act-02",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subHours(2.1),
      detailHref: "/developers",
    },
    {
      id: "act-03",
      type: "api_key_used",
      title: "API Key Used",
      description: "Live Secret Key verified for payment link creation",
      timestamp: subHours(4),
      detailHref: "/developers",
    },
    {
      id: "act-04",
      type: "payment_received",
      title: "Payment Received",
      description: "$45.50 USDC received from GCY...8R2 (Payment Link)",
      timestamp: subHours(5),
      detailHref: "/transactions",
    },
    {
      id: "act-05",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subHours(5.05),
      detailHref: "/developers",
    },
    {
      id: "act-06",
      type: "settlement_initiated",
      title: "Settlement Initiated",
      description: "Settlement of $8,200.50 USDC initiated to GTBank account",
      timestamp: subHours(8),
      detailHref: "/settlement",
    },

    // Yesterday
    {
      id: "act-07",
      type: "payment_received",
      title: "Payment Received",
      description: "$12,000.00 USDC received from GDZ...1T5 (API)",
      timestamp: subHours(26),
      detailHref: "/transactions",
    },
    {
      id: "act-08",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subHours(26.1),
      detailHref: "/developers",
    },
    {
      id: "act-09",
      type: "settlement_completed",
      title: "Settlement Completed",
      description: "Settlement of $5,000.00 USDC completed to GTBank account",
      timestamp: subHours(30),
      detailHref: "/settlement",
    },
    {
      id: "act-10",
      type: "api_key_used",
      title: "API Key Used",
      description: "Public key used for client checkout initialization",
      timestamp: subHours(35),
      detailHref: "/developers",
    },

    // 2 Days Ago
    {
      id: "act-11",
      type: "payment_received",
      title: "Payment Received",
      description: "$850.25 USDC received from GBX...4Q3 (QR Code)",
      timestamp: subDays(2),
      detailHref: "/transactions",
    },
    {
      id: "act-12",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subDays(2),
      detailHref: "/developers",
    },
    {
      id: "act-13",
      type: "settlement_initiated",
      title: "Settlement Initiated",
      description: "Settlement of $5,000.00 USDC initiated to GTBank account",
      timestamp: subDays(2.2),
      detailHref: "/settlement",
    },

    // 3 Days Ago
    {
      id: "act-14",
      type: "payment_received",
      title: "Payment Received",
      description: "$300.00 USDC received from GBX...4Q3 (Payment Link)",
      timestamp: subDays(3),
      detailHref: "/transactions",
    },
    {
      id: "act-15",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subDays(3),
      detailHref: "/developers",
    },

    // 4 Days Ago
    {
      id: "act-16",
      type: "payment_received",
      title: "Payment Received",
      description: "$750.00 USDC received from GDZ...1T5 (API)",
      timestamp: subDays(4),
      detailHref: "/transactions",
    },
    {
      id: "act-17",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subDays(4),
      detailHref: "/developers",
    },
    {
      id: "act-18",
      type: "api_key_used",
      title: "API Key Used",
      description: "Live Secret Key verified for payment link creation",
      timestamp: subDays(4.1),
      detailHref: "/developers",
    },

    // 5 Days Ago
    {
      id: "act-19",
      type: "settlement_completed",
      title: "Settlement Completed",
      description: "Settlement of $12,450.00 USDC completed to GTBank account",
      timestamp: subDays(5),
      detailHref: "/settlement",
    },

    // 6 Days Ago
    {
      id: "act-20",
      type: "payment_received",
      title: "Payment Received",
      description: "$200.00 USDC received from GEA...3V9 (Payment Link)",
      timestamp: subDays(6),
      detailHref: "/transactions",
    },
    {
      id: "act-21",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subDays(6),
      detailHref: "/developers",
    },

    // 7 Days Ago
    {
      id: "act-22",
      type: "payment_received",
      title: "Payment Received",
      description: "$120.00 USDC received from GKL...8W1 (QR Code)",
      timestamp: subDays(7),
      detailHref: "/transactions",
    },
    {
      id: "act-23",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subDays(7),
      detailHref: "/developers",
    },
    {
      id: "act-24",
      type: "settlement_initiated",
      title: "Settlement Initiated",
      description: "Settlement of $12,450.00 USDC initiated to GTBank account",
      timestamp: subDays(7.1),
      detailHref: "/settlement",
    },

    // 10 Days Ago
    {
      id: "act-25",
      type: "payment_received",
      title: "Payment Received",
      description: "$90.00 USDC received from GAB...9X2 (Payment Link)",
      timestamp: subDays(10),
      detailHref: "/transactions",
    },
    {
      id: "act-26",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subDays(10),
      detailHref: "/developers",
    },

    // 12 Days Ago
    {
      id: "act-27",
      type: "payment_received",
      title: "Payment Received",
      description: "$2,500.00 USDC received from GDZ...1T5 (API)",
      timestamp: subDays(12),
      detailHref: "/transactions",
    },
    {
      id: "act-28",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subDays(12.01),
      detailHref: "/developers",
    },

    // 14 Days Ago
    {
      id: "act-29",
      type: "settlement_completed",
      title: "Settlement Completed",
      description: "Settlement of $3,400.00 USDC completed to GTBank account",
      timestamp: subDays(14),
      detailHref: "/settlement",
    },

    // 15 Days Ago
    {
      id: "act-30",
      type: "payment_received",
      title: "Payment Received",
      description: "$50.00 USDC received from GCY...8R2 (Payment Link)",
      timestamp: subDays(15),
      detailHref: "/transactions",
    },

    // 18 Days Ago
    {
      id: "act-31",
      type: "payment_received",
      title: "Payment Received",
      description: "$1,100.00 USDC received from GBX...4Q3 (QR Code)",
      timestamp: subDays(18),
      detailHref: "/transactions",
    },
    {
      id: "act-32",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subDays(18.01),
      detailHref: "/developers",
    },

    // 20 Days Ago
    {
      id: "act-33",
      type: "settlement_initiated",
      title: "Settlement Initiated",
      description: "Settlement of $3,400.00 USDC initiated to GTBank account",
      timestamp: subDays(20),
      detailHref: "/settlement",
    },

    // 22 Days Ago
    {
      id: "act-34",
      type: "payment_received",
      title: "Payment Received",
      description: "$400.00 USDC received from GAB...9X2 (Payment Link)",
      timestamp: subDays(22),
      detailHref: "/transactions",
    },

    // 25 Days Ago
    {
      id: "act-35",
      type: "payment_received",
      title: "Payment Received",
      description: "$15.00 USDC received from GCY...8R2 (Payment Link)",
      timestamp: subDays(25),
      detailHref: "/transactions",
    },

    // 28 Days Ago
    {
      id: "act-36",
      type: "settlement_completed",
      title: "Settlement Completed",
      description: "Settlement of $1,800.00 USDC completed to First Bank account",
      timestamp: subDays(28),
      detailHref: "/settlement",
    },

    // 30 Days Ago
    {
      id: "act-37",
      type: "payment_received",
      title: "Payment Received",
      description: "$3,000.00 USDC received from GDZ...1T5 (API)",
      timestamp: subDays(30),
      detailHref: "/transactions",
    },
    {
      id: "act-38",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subDays(30.01),
      detailHref: "/developers",
    },
  ];
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const merchantId = params.id;
  if (!merchantId) {
    return NextResponse.json({ error: "Missing merchant ID" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const limitStr = searchParams.get("limit") || "20";
  const cursor = searchParams.get("cursor");
  const filter = searchParams.get("filter") || "all";

  const limit = parseInt(limitStr, 10);

  const upstreamBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  // Treat any localhost/127.0.0.1 URL as a self-loop to avoid infinite fetch loops
  const isSelfLoop =
    !upstreamBase ||
    upstreamBase.includes('localhost') ||
    upstreamBase.includes('127.0.0.1');

  let events: ActivityEvent[] = [];

  if (!isSelfLoop) {
    // Fetch real merchant events and aggregate them
    const cookie = req.headers.get("cookie") || "";
    
    interface RawPayment {
      id: string;
      amountUsdc?: number;
      payerAddress?: string | null;
      source?: string | null;
      createdAt: string;
    }

    interface RawSettlement {
      id: string;
      status: string;
      amountUsdc?: number;
      bankName?: string | null;
      createdAt: string;
    }

    interface RawWebhook {
      id: string;
      eventType?: string;
      targetUrl?: string;
      timestamp?: string;
      createdAt?: string;
    }

    interface RawSession {
      id: string;
      ipAddress?: string;
      userAgent?: string;
      createdAt?: string;
      lastActiveAt?: string;
    }

    // Define calls
    const fetchPayments = async (): Promise<ActivityEvent[]> => {
      try {
        const res = await fetch(`${upstreamBase}/api/payments`, { headers: { cookie } });
        if (res.ok) {
          const json = await res.json();
          const raw: RawPayment[] = Array.isArray(json) ? json : (json.data || []);
          return raw.map((p) => ({
            id: p.id,
            type: "payment_received" as const,
            title: "Payment Received",
            description: `$${(p.amountUsdc || 0).toFixed(2)} USDC received from ${p.payerAddress ? p.payerAddress.slice(0, 4) + '...' + p.payerAddress.slice(-4) : 'unknown'} (${p.source || 'Payment Link'})`,
            timestamp: p.createdAt,
            detailHref: `/transactions`,
          }));
        }
      } catch (e) {
        console.error("Failed to fetch payments for activity", e);
      }
      return [];
    };

    const fetchSettlements = async (): Promise<ActivityEvent[]> => {
      try {
        const res = await fetch(`${upstreamBase}/api/settlements`, { headers: { cookie } });
        if (res.ok) {
          const json = await res.json();
          const raw: RawSettlement[] = Array.isArray(json) ? json : (json.data || []);
          return raw.map((s) => {
            const isCompleted = s.status === "COMPLETED" || s.status === "completed";
            return {
              id: s.id,
              type: isCompleted ? ("settlement_completed" as const) : ("settlement_initiated" as const),
              title: isCompleted ? "Settlement Completed" : "Settlement Initiated",
              description: `Settlement of $${(s.amountUsdc || 0).toFixed(2)} USDC ${isCompleted ? 'completed' : 'initiated'} to ${s.bankName || 'bank'} account`,
              timestamp: s.createdAt,
              detailHref: `/settlement`,
            };
          });
        }
      } catch (e) {
        console.error("Failed to fetch settlements for activity", e);
      }
      return [];
    };

    const fetchWebhooks = async (): Promise<ActivityEvent[]> => {
      try {
        // Try to fetch from backend webhook endpoints. Fallback to empty array on failure.
        const res = await fetch(`${upstreamBase}/api/webhooks/attempts`, { headers: { cookie } });
        if (res.ok) {
          const json = await res.json();
          const raw: RawWebhook[] = Array.isArray(json) ? json : (json.data || []);
          return raw.map((w) => ({
            id: w.id,
            type: "webhook_delivered" as const,
            title: "Webhook Delivered",
            description: `${w.eventType || 'event'} sent to ${w.targetUrl || 'unknown'}`,
            timestamp: w.timestamp || w.createdAt || new Date().toISOString(),
            detailHref: `/developers`,
          }));
        }
      } catch {
        // ignore
      }
      return [];
    };

    const fetchAuthSessions = async (): Promise<ActivityEvent[]> => {
      try {
        const res = await fetch(`${upstreamBase}/api/auth/sessions`, { headers: { cookie } });
        if (res.ok) {
          const json = await res.json();
          const active: RawSession[] = json.active || [];
          const history: RawSession[] = json.history || [];
          const allSessions = [...active, ...history];
          return allSessions.map((s) => ({
            id: `auth-${s.id}`,
            type: "api_key_used" as const,
            title: "Session Active",
            description: `Session active from IP ${s.ipAddress || 'unknown'} (${s.userAgent || 'unknown'})`,
            timestamp: s.createdAt || s.lastActiveAt || new Date().toISOString(),
            detailHref: `/settings/sessions`,
          }));
        }
      } catch {
        // ignore
      }
      return [];
    };

    const [payments, settlements, webhooks, authEvents] = await Promise.all([
      fetchPayments(),
      fetchSettlements(),
      fetchWebhooks(),
      fetchAuthSessions(),
    ]);

    events = [...payments, ...settlements, ...webhooks, ...authEvents];
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } else {
    // Generate mock events for local/mock flow
    events = generateActivityEvents();
  }

  // Filter based on event types
  if (filter === "payments") {
    events = events.filter((e) => e.type === "payment_received");
  } else if (filter === "settlements") {
    events = events.filter(
      (e) =>
        e.type === "settlement_initiated" || e.type === "settlement_completed"
    );
  } else if (filter === "webhooks") {
    events = events.filter((e) => e.type === "webhook_delivered");
  }

  // Find cursor index
  let startIndex = 0;
  if (cursor) {
    const cursorIndex = events.findIndex((e) => e.id === cursor);
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1;
    }
  }

  // Slice based on pagination limit
  const paginatedEvents = events.slice(startIndex, startIndex + limit);

  // Determine nextCursor
  const hasMore = startIndex + limit < events.length;
  const nextCursor = hasMore ? paginatedEvents[paginatedEvents.length - 1].id : null;

  return NextResponse.json(
    {
      data: paginatedEvents,
      nextCursor,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
