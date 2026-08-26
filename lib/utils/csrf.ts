/**
 * CSRF token utilities for double-submit cookie pattern.
 *
 * The server sets a `csrf_token` cookie (non-HttpOnly so JS can read it).
 * The frontend reads that cookie and sends it back in the `X-CSRF-Token`
 * header on every state-changing request. The backend is responsible for
 * verifying the header value matches the cookie value.
 *
 * Token lifecycle:
 *   1. GET /api/auth/csrf  — bootstraps the cookie before React hydrates
 *      (called from the root server component; no-ops if a valid token exists)
 *   2. POST /api/auth/session — rotates the token on login
 *   3. POST /api/auth/refresh — rotates the token on access-token refresh
 */

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'X-CSRF-Token';

// ─── Token length ────────────────────────────────────────────────────────────
// 32 random bytes → 64 hex characters. Used to validate tokens read back from
// cookies (quick sanity check before forwarding as a header value).
export const CSRF_TOKEN_BYTE_LENGTH = 32;
export const CSRF_TOKEN_HEX_LENGTH = CSRF_TOKEN_BYTE_LENGTH * 2; // 64

// ─── Generation ──────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random CSRF token.
 *
 * Works in all three runtimes:
 *   - Browser         → Web Crypto API (window.crypto.getRandomValues)
 *   - Node.js (Edge)  → Web Crypto API (globalThis.crypto.getRandomValues)
 *   - Node.js (≥15)   → `node:crypto` randomBytes via dynamic import fallback
 */
export function generateCsrfToken(): string {
  // Web Crypto (browser + Edge runtime + Node ≥ 19)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const array = new Uint8Array(CSRF_TOKEN_BYTE_LENGTH);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Synchronous Node.js fallback (Node 15–18 server runtime without Web Crypto)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require('crypto') as typeof import('crypto');
  return nodeCrypto.randomBytes(CSRF_TOKEN_BYTE_LENGTH).toString('hex');
}

// ─── Cookie reading (client-side) ────────────────────────────────────────────

/**
 * Read the CSRF token from `document.cookie`.
 * Returns `null` when called server-side or when the cookie is absent.
 */
export function getCsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`));

  if (!match) return null;

  const value = decodeURIComponent(match.split('=')[1]);
  // Basic sanity check — reject obviously invalid values before sending as a header.
  return value.length === CSRF_TOKEN_HEX_LENGTH ? value : null;
}

// ─── Cookie attributes helper (server-side) ──────────────────────────────────

/**
 * Returns the standard Set-Cookie string for the CSRF token.
 * Centralised here so all API routes stay in sync.
 */
export function buildCsrfCookieHeader(token: string): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const parts = [
    `${CSRF_COOKIE_NAME}=${token}`,
    'Path=/',
    'SameSite=Strict',
    'Max-Age=86400',
    ...(isProduction ? ['Secure'] : []),
  ];
  return parts.join('; ');
}

// ─── Server-component bootstrap helper ───────────────────────────────────────

/**
 * `ensureCsrfCookie` is meant to be called inside a Next.js **server component**
 * (e.g. the root layout) to guarantee the CSRF cookie is set before the page
 * HTML is streamed to the client.
 *
 * It reads the current cookie store, and if no valid token is present it sets
 * one directly via the `next/headers` cookies API — no extra HTTP round-trip.
 *
 * Usage (app/layout.tsx):
 *
 *   import { ensureCsrfCookie } from '@/lib/utils/csrf';
 *   // Inside the async server component:
 *   await ensureCsrfCookie();
 *
 * @deprecated Calling this from a Server Component layout triggers
 * `Cookies can only be modified in a Server Action or Route Handler` in
 * Next 14.2+. Prefer `ensureCsrfCookieInMiddleware` in `middleware.ts` which
 * uses `NextRequest`/`NextResponse` (allowed). This function is kept for
 * backwards-compat with `GET /api/auth/csrf` route handlers only.
 */
export async function ensureCsrfCookie(): Promise<void> {
  // Dynamic import so this module stays importable in client bundles without
  // pulling in `next/headers` (which throws in browser/Edge contexts).
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const existing = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  // Re-use a valid token to avoid invalidating requests that are already in
  // flight (e.g. during streaming / partial hydration).
  if (existing && existing.length === CSRF_TOKEN_HEX_LENGTH) {
    return;
  }

  const token = generateCsrfToken();
  const isProduction = process.env.NODE_ENV === 'production';

  cookieStore.set(CSRF_COOKIE_NAME, token, {
    path: '/',
    sameSite: 'strict',
    secure: isProduction,
    maxAge: 86400,
    httpOnly: false, // Must be readable by JS for the double-submit header
  });
}

// ─── Middleware helper (NextRequest/NextResponse) ────────────────────────────

/**
 * Middleware-safe CSRF bootstrap. Uses `NextRequest.cookies` (read) and
 * `NextResponse.cookies.set` (write) which are allowed in `middleware.ts`.
 * Call this at the top of `middleware` before any redirects so every
 * response seeds the cookie.
 */
export function ensureCsrfCookieInMiddleware(
  request: { cookies: { get(name: string): { value: string } | undefined } },
  response: { cookies: { set(name: string, value: string, opts: Record<string, unknown>): void } },
): void {
  const existing = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (existing && existing.length === CSRF_TOKEN_HEX_LENGTH) {
    return;
  }
  const token = generateCsrfToken();
  const isProduction = process.env.NODE_ENV === 'production';
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    path: '/',
    sameSite: 'strict',
    secure: isProduction,
    maxAge: 86400,
    httpOnly: false,
  });
}
