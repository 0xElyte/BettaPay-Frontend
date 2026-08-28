import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateCsrfToken, buildCsrfCookieHeader } from '@/lib/utils/csrf';

// ─── Simple in-process rate limiter ──────────────────────────────────────────
// 5 requests per IP per 15-minute window. Mirrors the forgot-password route.

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const globalForResetPw = globalThis as typeof globalThis & {
  resetPasswordRateLimits?: Map<string, RateLimitEntry>;
};

const rateLimitStore: Map<string, RateLimitEntry> =
  globalForResetPw.resetPasswordRateLimits ??
  new Map<string, RateLimitEntry>();

globalForResetPw.resetPasswordRateLimits = rateLimitStore;

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

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'uppercase')
    .regex(/[a-z]/, 'lowercase')
    .regex(/[0-9]/, 'number')
    .regex(/[^A-Za-z0-9]/, 'special'),
});

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/reset-password
 *
 * Accepts { token, password } and forwards the reset to the upstream auth
 * service. On success, clears all session cookies (forcing re-login) and
 * rotates the CSRF token. The backend is responsible for:
 *   - Validating the single-use, time-limited token
 *   - Updating the password hash
 *   - Revoking all active sessions for the user
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

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR' },
      { status: 422, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const { token, password } = parsed.data;

  // ── Forward to upstream auth service ─────────────────────────────────────
  try {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

    const upstreamRes = await fetch(`${apiBase}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
      signal: AbortSignal.timeout(10000),
    });

    if (!upstreamRes.ok) {
      const upstreamBody = await upstreamRes.json().catch(() => ({})) as {
        error?: string;
      };

      // Surface token-specific errors so the frontend can show the right message.
      if (upstreamRes.status === 400 || upstreamRes.status === 410) {
        const error = upstreamBody.error ?? 'TOKEN_INVALID';
        return NextResponse.json(
          { error },
          { status: upstreamRes.status, headers: { 'Cache-Control': 'no-store' } },
        );
      }

      return NextResponse.json(
        { error: 'RESET_FAILED' },
        { status: upstreamRes.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'SERVICE_UNAVAILABLE' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // ── Success: clear all session cookies (forces re-login) ─────────────────
  const isProduction = process.env.NODE_ENV === 'production';
  const secureFlag = isProduction ? '; Secure' : '';
  const csrfToken = generateCsrfToken();

  const res = NextResponse.json(
    { ok: true },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );

  // Expire auth cookies — this revokes the current session on this client.
  // The backend has already revoked all server-side sessions for the user.
  res.headers.set(
    'Set-Cookie',
    `auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`,
  );
  res.headers.append(
    'Set-Cookie',
    `user_role=; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`,
  );
  res.headers.append(
    'Set-Cookie',
    `merchant_onboarded=; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`,
  );
  // Rotate CSRF token
  res.headers.append('Set-Cookie', buildCsrfCookieHeader(csrfToken));

  return res;
}
