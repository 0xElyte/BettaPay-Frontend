"use client";

import { useCallback, useState } from "react";
import type { CommandRole } from "@/lib/command/actions";

const MAX_RECENT = 5;
const key = (role: CommandRole) => `bettapay:command:recent:${role}`;

function read(role: CommandRole): string[] {
  try {
    const raw = window.localStorage.getItem(key(role));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Per-role most-recently-used command ids, persisted to localStorage
 * (issue #459). Used to surface a "Recent" group when the search box is empty.
 */
export function useRecentCommands(role: CommandRole) {
  const [recent, setRecent] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : read(role),
  );

  const push = useCallback(
    (id: string) => {
      setRecent((prev) => {
        const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_RECENT);
        try {
          window.localStorage.setItem(key(role), JSON.stringify(next));
        } catch {
          // storage unavailable (private mode / quota) — keep in-memory only
        }
        return next;
      });
    },
    [role],
  );

  return { recent, push };
}
