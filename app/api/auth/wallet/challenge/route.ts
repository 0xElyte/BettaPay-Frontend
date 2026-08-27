import { NextRequest, NextResponse } from 'next/server';

/**
 * Mock wallet challenge endpoint for local development.
 * In production this is served by the real backend.
 *
 * GET /api/auth/wallet/challenge?address=G...
 * → { challenge: string, expiresAt: number }
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address') ?? 'UNKNOWN';
  const nonce = Math.random().toString(36).slice(2);
  const challenge = `BettaPay:${address}:${nonce}`;
  return NextResponse.json({
    challenge,
    expiresAt: Date.now() + 120_000,
  });
}
