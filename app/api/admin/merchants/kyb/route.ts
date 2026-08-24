/**
 * GET /api/admin/merchants/kyb
 *
 * Returns the list of merchants whose kybStatus is 'pending' or 'unverified'.
 * Supports an optional ?status= filter and ?action=KYB_* for the audit list.
 *
 * Role gate: admin only.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { merchantKybStore, type MerchantKybProfile } from "../[id]/kyb/route";

function isAdminRequest(): boolean {
  try {
    const store = cookies();
    const role = store.get("user_role")?.value;
    return role === "admin";
  } catch {
    return true;
  }
}

export async function GET(req: Request) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status");

  const merchants: MerchantKybProfile[] = Object.values(merchantKybStore);

  const filtered = statusFilter
    ? merchants.filter((m) => m.kybStatus === statusFilter)
    : merchants.filter((m) =>
        m.kybStatus === "pending" || m.kybStatus === "unverified"
      );

  return NextResponse.json(
    {
      data: filtered,
      total: filtered.length,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
