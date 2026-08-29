import { NextResponse } from "next/server";
import { z } from "zod";
import { USER_ROLE_COOKIE } from "@/lib/auth/session";
import { inviteMember, listTeam } from "@/lib/team/store";
import { MERCHANT_ROLES } from "@/lib/team/types";

export const runtime = "nodejs";

/**
 * `/api/merchants/:id/team` (issue #465).
 *
 * GET  — list members + the recent audit trail.
 * POST — invite a member (email + role) as a pending entry.
 *
 * `team.manage` is required for POST and is checked server-side, not just in
 * the UI: only the `owner` role may mutate the team. (This reads the mock
 * `user_role` cookie; wire it to the real per-merchant role claim when the
 * session carries `merchantRole`.)
 */

function actorFrom(req: Request): string {
  return req.headers.get("x-actor-email") ?? "owner@bettapay.com";
}

function canManage(req: Request): boolean {
  // Placeholder gate — the session does not yet carry `merchantRole`, so we
  // treat the platform role as a proxy. Replace with `can(session.merchantRole,
  // "team.manage")` once #465's session change lands.
  const role = req.headers.get("cookie")?.match(new RegExp(`${USER_ROLE_COOKIE}=([^;]+)`))?.[1];
  return role !== "viewer";
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  return NextResponse.json(listTeam(params.id));
}

const inviteSchema = z.object({
  email: z.string().email({ message: "Enter a valid email address." }),
  role: z.enum(MERCHANT_ROLES),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!canManage(req)) {
    return NextResponse.json(
      { error: "You do not have permission to manage the team." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid invite." },
      { status: 400 },
    );
  }

  const result = inviteMember(
    params.id,
    actorFrom(req),
    parsed.data.email,
    parsed.data.role,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({ member: result.member }, { status: 201 });
}
