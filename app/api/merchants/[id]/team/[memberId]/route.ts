import { NextResponse } from "next/server";
import { z } from "zod";
import { USER_ROLE_COOKIE } from "@/lib/auth/session";
import { changeRole, removeMember } from "@/lib/team/store";
import { MERCHANT_ROLES } from "@/lib/team/types";

export const runtime = "nodejs";

/**
 * `/api/merchants/:id/team/:memberId` (issue #465).
 * PATCH  — change a member's role.
 * DELETE — remove a member (soft-revoke; audited).
 */

function actorFrom(req: Request): string {
  return req.headers.get("x-actor-email") ?? "owner@bettapay.com";
}

function canManage(req: Request): boolean {
  const role = req.headers.get("cookie")?.match(new RegExp(`${USER_ROLE_COOKIE}=([^;]+)`))?.[1];
  return role !== "viewer";
}

const patchSchema = z.object({ role: z.enum(MERCHANT_ROLES) });

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; memberId: string } },
) {
  if (!canManage(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }
  const result = changeRole(params.id, actorFrom(req), params.memberId, parsed.data.role);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({ member: result.member });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; memberId: string } },
) {
  if (!canManage(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const result = removeMember(params.id, actorFrom(req), params.memberId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
