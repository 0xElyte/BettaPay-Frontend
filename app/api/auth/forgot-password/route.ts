import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ─── Simple in-process rate limiter ──────────────────────────────────────────
// 5 requests per IP per 15-minute window. Prevents account-existence probing
// and brute-force enumeration. In a multi-instance deployment this should be
// backed by Redis; for a single-instance / preview setup this is sufficient.

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const globalForForgotPw = globalThis as typeof globalThis & {
  forgotPasswordRateLimits?: Map<string, RateLimitEntry>;
};

const rateLimitStore: Map<string, RateLimitEntry> =
  globalForForgotPw.forgotPasswordRateLimits ??
  new Map<string, RateLimitEntry>();

globalForForgotPw.forgotPasswordRateLimits = rateLimitStore;

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

// ─── Input schema ─────────────────────────────────────────────────────────────

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/forgot-password
 *
 * Accepts { email } and triggers a password-reset email via the upstream auth
 * service. Always returns the same 200 response regardless of whether the
 * email is registered — this prevents account-existence enumeration.
 *
 * Rate-limited to 5 requests per IP per 15 minutes.
 */
export async function POST(req: NextRequest) {
  // ── Rate limiting ────────────────────────────────────────────────────────
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { allowed, retryAfterSeconds } = checkRateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      { error: 'TOO_MANY_REQUESTS' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  // ── Input validation ─────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'INVALID_JSON' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'INVALID_EMAIL' },
      { status: 422, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const { email } = parsed.data;

  // ── Forward to upstream auth service ─────────────────────────────────────
  // Fire-and-forget: we do not surface whether the upstream call succeeded or
  // whether the email is registered. The client always sees a 200 so that an
  // attacker cannot enumerate accounts by timing differences.
  try {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

    await fetch(`${apiBase}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      // Short timeout — we must not stall the 200 response
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // Intentionally swallowed — see note above.
  }

  // ── Always return the same success envelope ───────────────────────────────
  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
