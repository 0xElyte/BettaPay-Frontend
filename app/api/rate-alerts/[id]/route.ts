import { NextResponse } from "next/server";
import { z } from "zod";
import { USER_ROLE_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";

interface StoredAlert {
  id: string;
  enabled: boolean;
  recurrence: "once" | "recurring";
  target: number;
  condition: "above" | "below";
  triggered?: boolean;
  triggeredAt?: number;
  [k: string]: unknown;
}

const g = globalThis as unknown as { __bpRateAlerts?: Map<string, StoredAlert[]> };
const store = (g.__bpRateAlerts ??= new Map<string, StoredAlert[]>());

function key(req: Request): string {
  const role = req.headers.get("cookie")?.match(new RegExp(`${USER_ROLE_COOKIE}=([^;]+)`))?.[1];
  return `merchant:${role ?? "anon"}`;
}

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  target: z.number().positive().optional(),
  condition: z.enum(["above", "below"]).optional(),
  recurrence: z.enum(["once", "recurring"]).optional(),
  triggered: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const list = store.get(key(req)) ?? [];
  const alert = list.find((a) => a.id === params.id);
  if (!alert) return NextResponse.json({ error: "Alert not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }
  Object.assign(alert, parsed.data);
  if (parsed.data.triggered === false) alert.triggeredAt = undefined;
  return NextResponse.json({ alert });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const k = key(req);
  const list = store.get(k) ?? [];
  const next = list.filter((a) => a.id !== params.id);
  if (next.length === list.length) {
    return NextResponse.json({ error: "Alert not found." }, { status: 404 });
  }
  store.set(k, next);
  return NextResponse.json({ ok: true });
}
