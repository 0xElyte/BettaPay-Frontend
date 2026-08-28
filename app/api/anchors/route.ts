/**
 * GET /api/anchors
 *
 * Public endpoint returning only enabled anchors. Used by the
 * merchant-facing fiat-settlements page so it always reflects the
 * current registry instead of a static array.
 */

import { NextResponse } from "next/server";
import { anchorStore } from "@/lib/mock/anchors";

export const runtime = "nodejs";

export async function GET() {
  const enabled = anchorStore.filter((a) => a.enabled);

  return NextResponse.json(
    { data: enabled },
    { status: 200, headers: { "Cache-Control": "public, max-age=60" } }
  );
}
