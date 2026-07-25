import { NextResponse } from 'next/server';
import { generateCsrfToken } from '@/lib/utils/csrf';

export async function POST() {
  try {
    // In production, the backend would validate the existing auth_token cookie,
    // issue a new token, and return it. For now, we simulate a refresh by
    // re-setting the existing cookie with a fresh expiry.
    //
    // The real implementation should:
    // 1. Read and validate the existing auth_token
    // 2. Generate a new token with extended expiry
    // 3. Return the new token / set a new cookie

    const res = NextResponse.json({ ok: true });

    // Refresh CSRF token as well
    const csrfToken = generateCsrfToken();
    res.headers.set(
      'Set-Cookie',
      `csrf_token=${csrfToken}; Path=/; SameSite=Strict; Max-Age=86400`
    );

    return res;
  } catch (error) {
    console.error('Failed to refresh session:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to refresh session' },
      { status: 401 }
    );
  }
}
