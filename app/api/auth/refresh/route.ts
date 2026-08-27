import { NextResponse, NextRequest } from 'next/server';
import { generateCsrfToken, buildCsrfCookieHeader } from '@/lib/utils/csrf';

export async function POST(req: NextRequest) {
  try {
    const existingToken = req.cookies.get('auth_token')?.value;
    const role = req.cookies.get('user_role')?.value || 'merchant';

    // 30 minutes server session expiration
    const expiresIn = 1800; // 1800 seconds = 30 minutes
    const expiresAt = Date.now() + expiresIn * 1000;

    const csrfToken = generateCsrfToken();
    const isProduction = process.env.NODE_ENV === 'production';
    const secureFlag = isProduction ? '; Secure' : '';

    const res = NextResponse.json({
      ok: true,
      expiresAt,
      expiresIn,
    });

    // Refresh auth_token cookie with new 30-minute Max-Age
    if (existingToken) {
      res.headers.set(
        'Set-Cookie',
        `auth_token=${existingToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${expiresIn}${secureFlag}`
      );
      res.headers.append(
        'Set-Cookie',
        `user_role=${role}; Path=/; SameSite=Lax; Max-Age=${expiresIn}${secureFlag}`
      );
      res.headers.append('Set-Cookie', buildCsrfCookieHeader(csrfToken));
    } else {
      res.headers.set('Set-Cookie', buildCsrfCookieHeader(csrfToken));
    }

    return res;
  } catch (error) {
    console.error('Failed to refresh session:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to refresh session' },
      { status: 401 }
    );
  }
}
