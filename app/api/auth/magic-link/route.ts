import { NextResponse } from "next/server";
import { z } from "zod";
import { canSendMagicLink, issueMagicToken } from "@/lib/auth/magicLink";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email({ message: "Enter a valid email address." }),
});

/**
 * POST /api/auth/magic-link — sends a single-use, time-limited sign-in link
 * (issue #466). Rate-limited to 3 sends per email per hour. Always responds
 * 200 for a well-formed email so the endpoint can't be used to enumerate
 * which addresses have accounts; the link only works for a real user.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid email." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();

  if (!canSendMagicLink(email)) {
    return NextResponse.json(
      { error: "Too many magic links requested. Try again in an hour." },
      { status: 429 },
    );
  }

  const { token, expiresAt } = issueMagicToken(email);

  const origin =
    req.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  const link = `${origin}/auth/magic?token=${token}`;

  // Wire this to the transactional email provider when one is configured.
  // Until then the link is logged so the flow is testable end-to-end.
  console.log(`[magic-link] ${email} -> ${link} (expires ${new Date(expiresAt).toISOString()})`);
  // if (process.env.RESEND_API_KEY) { await sendMagicLinkEmail(email, link); }

  return NextResponse.json({
    ok: true,
    message: "If that email has an account, a sign-in link is on its way.",
    expiresInSeconds: Math.round((expiresAt - Date.now()) / 1000),
  });
}
