import { NextResponse } from 'next/server';
import { generateCsrfToken, buildCsrfCookieHeader } from '@/lib/utils/csrf';

export async function POST() {
  try {
    // In production, the backend would validate the existing auth_token cookie,
    // issue a new token, and return it. For now, we simulate a refresh by
    // re-setting the existing cookie with a fresh expiry.
    //
    // The real implementation should:
    // 1. Read and validate the existing auth_token
    // 2. Call the backend refresh endpoint
    // 3. Set the new auth_token cookie with the returned value

    // Rotate the CSRF token on every access-token refresh so a stolen CSRF
    // token from a previous session cannot be replayed after re-auth.
    const csrfToken = generateCsrfToken();

    const res = NextResponse.json({ ok: true });
    res.headers.set('Set-Cookie', buildCsrfCookieHeader(csrfToken));

    return res;
  } catch (error) {
    console.error('Failed to refresh session:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to refresh session' },
      { status: 401 }
    );
  }
}
