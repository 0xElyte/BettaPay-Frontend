import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { USER_ROLE_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";

/**
 * `/api/rate-alerts` (issue #469) — server-backed FX rate alerts per merchant.
 *
 * In-memory store (process-local, same pattern as app/api/newsletter). Swap
 * for a `rate_alerts` table before production; delivery (email / webhook /
 * in-app via feature #38) + trigger dedupe is stubbed with a note where the
 * scheduler would evaluate conditions.
 */

interface StoredAlert {
  id: string;
  pair: string;
  condition: "above" | "below";
  target: number;
  enabled: boolean;
  recurrence: "once" | "recurring";
  channels: ("in_app" | "email" | "webhook")[];
  window?: { start: string; end: string };
  triggered?: boolean;
  triggeredAt?: number;
  createdAt: string;
}

const g = globalThis as unknown as { __bpRateAlerts?: Map<string, StoredAlert[]> };
const store = (g.__bpRateAlerts ??= new Map<string, StoredAlert[]>());

function merchantId(req: Request): string {
  // The session doesn't expose a merchant id to route handlers yet; scope by
  // the readable role cookie as a stand-in so two roles don't share a list.
  const role = req.headers.get("cookie")?.match(new RegExp(`${USER_ROLE_COOKIE}=([^;]+)`))?.[1];
  return `merchant:${role ?? "anon"}`;
}

function listFor(id: string): StoredAlert[] {
  let list = store.get(id);
  if (!list) {
    list = [];
    store.set(id, list);
  }
  return list;
}

export async function GET(req: Request) {
  return NextResponse.json({ alerts: listFor(merchantId(req)) });
}

const createSchema = z.object({
  pair: z.string().min(3),
  condition: z.enum(["above", "below"]),
  target: z.number().positive(),
  recurrence: z.enum(["once", "recurring"]).default("once"),
  channels: z.array(z.enum(["in_app", "email", "webhook"])).min(1).default(["in_app"]),
  window: z.object({ start: z.string(), end: z.string() }).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid alert." },
      { status: 400 },
    );
  }
  const alert: StoredAlert = {
    id: randomUUID(),
    enabled: true,
    triggered: false,
    createdAt: new Date().toISOString(),
    ...parsed.data,
  };
  listFor(merchantId(req)).push(alert);
  return NextResponse.json({ alert }, { status: 201 });
}
