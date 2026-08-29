"use client";

import { useCallback, useEffect, useState } from "react";
import type { MerchantRole, TeamAuditEntry, TeamMember } from "@/lib/team/types";

interface TeamData {
  members: TeamMember[];
  audit: TeamAuditEntry[];
}

async function json<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body;
}

/**
 * Client hook for the merchant team screen (issue #465). Thin wrapper over
 * `/api/merchants/:id/team` — refetches after every mutation so the member
 * list and the audit trail stay in sync.
 */
export function useMerchantTeam(merchantId: string) {
  const base = `/api/merchants/${encodeURIComponent(merchantId)}/team`;
  const [data, setData] = useState<TeamData>({ members: [], audit: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await json<TeamData>(await fetch(base, { cache: "no-store" })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const invite = useCallback(
    async (email: string, role: MerchantRole) => {
      await json(
        await fetch(base, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, role }),
        }),
      );
      await refresh();
    },
    [base, refresh],
  );

  const setRole = useCallback(
    async (memberId: string, role: MerchantRole) => {
      await json(
        await fetch(`${base}/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        }),
      );
      await refresh();
    },
    [base, refresh],
  );

  const remove = useCallback(
    async (memberId: string) => {
      await json(await fetch(`${base}/${memberId}`, { method: "DELETE" }));
      await refresh();
    },
    [base, refresh],
  );

  return { ...data, loading, error, refresh, invite, setRole, remove };
}
