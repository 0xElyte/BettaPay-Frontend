import { NextRequest, NextResponse } from 'next/server';

/**
 * Mock wallet verify endpoint for local development.
 * In production this is served by the real backend.
 *
 * POST /api/auth/wallet/verify
 * Body: { address, challenge, signature }
 * → { token: string }
 *
 * The returned token is a structurally valid JWT (HS256 header, correct
 * base64url segments, future exp) so that `decodeJwtPayload` in the client
 * does not reject it. The signature is a dummy string — we cannot sign for
 * real without a secret in this local stub, but the client never verifies
 * signatures; only the server does.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const address: string = body.address ?? 'UNKNOWN';

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 86_400; // 24 hours

  // Build a structurally valid HS256 JWT (header.payload.signature)
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: address,
      id: 'GCCHHKNI7GRA5QWC7RCTT3OHO7SKAUMKQA6IBWEQEO2SXI3GF376UHDD',
      email: 'merchant@bettapay.com',
      name: 'Demo Merchant',
      role: 'merchant',
      iat: now,
      exp,
    }),
  ).toString('base64url');
  // Dummy non-empty signature — passes the client-side `missing_signature` guard
  const signature = 'mock-sig-local-dev-only';

  const token = `${header}.${payload}.${signature}`;

  return NextResponse.json({ token });
}
