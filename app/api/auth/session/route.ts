import { NextResponse, NextRequest } from 'next/server';
import { generateCsrfToken, buildCsrfCookieHeader } from '@/lib/utils/csrf';
import { API_URL } from '@/lib/config';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const role = req.cookies.get('user_role')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  // In production, validate the token and fetch real user data.
  // For mock/preview mode, return a session based on the cookie values.
  return NextResponse.json({
    user: {
      id: role === 'admin' ? 'admin-1' : 'GCCHHKNI7GRA5QWC7RCTT3OHO7SKAUMKQA6IBWEQEO2SXI3GF376UHDD',
      email: role === 'admin' ? 'admin@bettapay.com' : 'merchant@bettapay.com',
      name: role === 'admin' ? 'System Admin' : 'Merchant User',
      role: role || 'merchant',
    },
    token,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = body.token;
    const role = body.role || '';

    let revokedSessionCount: number | undefined;
    try {
      const upstreamResponse = await fetch(
        `${API_URL || 'http://localhost:3001'}/api/auth/session`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, role }),
          cache: 'no-store',
        },
      );
      if (upstreamResponse.ok) {
        const upstreamBody = (await upstreamResponse.json()) as {
          revokedSessionCount?: unknown;
        };
        if (typeof upstreamBody.revokedSessionCount === 'number') {
          revokedSessionCount = upstreamBody.revokedSessionCount;
        }
      }
    } catch {
      // Local cookie setup remains available when the auth service is offline.
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const secureFlag = isProduction ? '; Secure' : '';

    // Rotate the CSRF token on every login — this is the primary token rotation
    // point. A fresh token is tied to the new authenticated session.
    const csrfToken = generateCsrfToken();

    const res = NextResponse.json({ ok: true, revokedSessionCount });

    // auth_token: HttpOnly so JS cannot read it (XSS protection)
    res.headers.set(
      'Set-Cookie',
      `auth_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400${secureFlag}`
    );
    // user_role: non-HttpOnly so middleware / server-side can read it
    res.headers.append(
      'Set-Cookie',
      `user_role=${role}; Path=/; SameSite=Lax; Max-Age=86400${secureFlag}`
    );
    // csrf_token: non-HttpOnly (JS must read it), SameSite=Strict
    res.headers.append('Set-Cookie', buildCsrfCookieHeader(csrfToken));

    return res;
  } catch (error) {
    console.error('Failed to set session:', error);
    return NextResponse.json({ ok: false, error: 'Failed to set session' }, { status: 500 });
  }
}

export async function DELETE() {
  const isProduction = process.env.NODE_ENV === 'production';
  const secureFlag = isProduction ? '; Secure' : '';

  const res = NextResponse.json({ ok: true });
  // Expire all three cookies atomically on logout
  res.headers.set(
    'Set-Cookie',
    `auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`
  );
  res.headers.append(
    'Set-Cookie',
    `user_role=; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`
  );
  res.headers.append(
    'Set-Cookie',
    `csrf_token=; Path=/; Max-Age=0; SameSite=Strict${secureFlag}`
  );
  res.headers.append(
    'Set-Cookie',
    `merchant_onboarded=; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`
  );
  return res;
}
