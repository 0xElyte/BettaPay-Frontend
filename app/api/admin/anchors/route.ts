/**
 * GET  /api/admin/anchors  – List all anchors (enabled + disabled)
 * POST /api/admin/anchors  – Create a new anchor
 *
 * Admin-only. The middleware protects /anchors as an admin route and this
 * route adds a belt-and-braces cookie check.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { anchorStore } from "@/lib/mock/anchors";
import type { Anchor, KycLevel } from "@/lib/types";

export const runtime = "nodejs";

function isAdminRequest(): boolean {
  try {
    const store = cookies();
    const role = store.get("user_role")?.value;
    return role === "admin";
  } catch {
    return true;
  }
}

export async function GET() {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(
    { data: anchorStore },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, code, currency, country, flag, kycLevels, settlementTime, websiteUrl } = body as {
    name?: string;
    code?: string;
    currency?: string;
    country?: string;
    flag?: string;
    kycLevels?: KycLevel[];
    settlementTime?: string;
    websiteUrl?: string | null;
  };

  if (!name || !code || !currency || !country) {
    return NextResponse.json(
      { error: "name, code, currency, and country are required" },
      { status: 400 }
    );
  }

  if (anchorStore.some((a) => a.code === code)) {
    return NextResponse.json(
      { error: `Anchor with code "${code}" already exists` },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const anchor: Anchor = {
    id: `anc_${Date.now()}`,
    name,
    code: code.toUpperCase(),
    currency: currency.toUpperCase(),
    country,
    flag: flag ?? "",
    kycLevels: kycLevels ?? ["basic"],
    settlementTime: settlementTime ?? "Pending",
    websiteUrl: websiteUrl ?? null,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };

  anchorStore.push(anchor);

  return NextResponse.json({ data: anchor }, { status: 201 });
}
