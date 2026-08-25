import { NextResponse } from "next/server";

import {
  addSubscriber,
  countSubscribers,
  findSubscriber,
  normalizeEmail,
  subscribeRequestSchema,
} from "@/lib/status/subscribers";

// Status-page subscription endpoint.
//
// POST records a subscription and acknowledges it; the form only reports
// success once this route has confirmed the write. GET is the verification
// path — `?email=` answers whether one address is on the list, and the bare
// call returns the count. Neither GET form returns the subscriber list, so
// the endpoint cannot be used to harvest addresses.

export const dynamic = "force-dynamic";

/** Max subscribe attempts per IP per hour. */
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;

const RATE_KEY = "__bettapayStatusSubscribeRate__";

function getRateMap(): Map<string, number[]> {
  const globalStore = globalThis as typeof globalThis & {
    [RATE_KEY]?: Map<string, number[]>;
  };
  if (!globalStore[RATE_KEY]) {
    globalStore[RATE_KEY] = new Map();
  }
  return globalStore[RATE_KEY]!;
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
}

/** Returns null when allowed, or the seconds to wait when rate limited. */
function checkRateLimit(ip: string): number | null {
  const map = getRateMap();
  const now = Date.now();
  const recent = (map.get(ip) ?? []).filter((t) => t > now - RATE_WINDOW_MS);

  if (recent.length >= RATE_LIMIT) {
    map.set(ip, recent);
    return Math.max(1, Math.ceil((recent[0] + RATE_WINDOW_MS - now) / 1000));
  }

  recent.push(now);
  map.set(ip, recent);
  return null;
}

export async function POST(request: Request) {
  const retryAfter = checkRateLimit(clientIp(request));
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: "Too many subscribe attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const parsed = subscribeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Enter a valid email address." },
      { status: 400 },
    );
  }

  const result = addSubscriber(parsed.data.email);

  if (result.status === "duplicate") {
    return NextResponse.json(
      {
        status: "duplicate",
        message: "That email is already subscribed to status updates.",
        subscribedAt: result.subscriber.createdAt,
      },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      status: "created",
      message: "You're subscribed. We'll email you when a service changes state.",
      id: result.subscriber.id,
      subscribedAt: result.subscriber.createdAt,
    },
    { status: 201 },
  );
}

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email");

  if (email === null) {
    return NextResponse.json({ count: countSubscribers() });
  }

  const normalized = normalizeEmail(email);
  if (normalized === null) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const subscriber = findSubscriber(normalized);
  return NextResponse.json({
    subscribed: subscriber !== null,
    subscribedAt: subscriber?.createdAt ?? null,
  });
}
