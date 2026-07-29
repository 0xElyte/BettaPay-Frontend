/**
 * GET /api/admin/health
 *
 * Aggregated system health endpoint. Runs all four service probes in
 * parallel and returns a single JSON payload. This is the only endpoint
 * the client ever calls, preventing N parallel browser requests.
 *
 * This route is server-side only — no credentials or internal URLs are
 * forwarded to the browser.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { HealthResponse } from "@/lib/types/health";
import {
  checkHorizon,
  checkSoroban,
  checkSep24,
  checkPostgres,
} from "@/lib/health/checkers";

export const runtime = "nodejs"; // ensure fetch is the Node fetch with AbortSignal.timeout

// Lightweight admin guard — the middleware already protects /admin/* pages,
// but we add a belt-and-braces check here too so the API cannot be hit
// directly by unauthenticated callers.
function isAdminRequest(): boolean {
  try {
    const store = cookies();
    const role = store.get("user_role")?.value;
    return role === "admin";
  } catch {
    // Running in an environment where cookies() is unavailable (e.g. tests)
    return true;
  }
}

export async function GET() {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Run all probes concurrently — a single slow probe cannot block the others.
  const [horizon, soroban, sep24, postgres] = await Promise.all([
    checkHorizon(),
    checkSoroban(),
    checkSep24(),
    checkPostgres(),
  ]);

  const body: HealthResponse = {
    aggregatedAt: new Date().toISOString(),
    services: [horizon, soroban, sep24, postgres],
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      // Prevent CDN/edge caching — health data must be fresh.
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    },
  });
}
