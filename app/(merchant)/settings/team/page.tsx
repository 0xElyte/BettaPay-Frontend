"use client";

import { useMemo, useState } from "react";
import { Loader2, UserPlus, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui";
import { useAuthStore } from "@/lib/store/authStore";
import { useMerchantTeam } from "@/lib/hooks/useMerchantTeam";
import {
  MERCHANT_ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  can,
  isMerchantRole,
  type MerchantRole,
  type TeamMemberStatus,
} from "@/lib/team/types";

const STATUS_STYLES: Record<TeamMemberStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  revoked: "bg-muted text-muted-foreground line-through",
};

export default function TeamSettingsPage() {
  const user = useAuthStore((s) => s.user);
  // The session doesn't carry `merchantRole` yet (issue #465 follow-up), so
  // derive the manager gate from the platform user for now.
  const merchantRole: MerchantRole = "owner";
  const merchantId = (user as { merchantId?: string } | null)?.merchantId ?? "me";
  const canManage = can(merchantRole, "team.manage");

  const { members, audit, loading, error, invite, setRole, remove } =
    useMerchantTeam(merchantId);

  const [email, setEmail] = useState("");
  const [role, setInviteRole] = useState<MerchantRole>("viewer");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const activeMembers = useMemo(
    () => members.filter((m) => m.status !== "revoked"),
    [members],
  );

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    try {
      await invite(email.trim(), role);
      setEmail("");
      setInviteRole("viewer");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not send invite");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Team &amp; roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite collaborators with scoped access. Role changes are recorded in the
          audit log below.
        </p>
      </header>

      {/* Invite */}
      {canManage ? (
        <form
          onSubmit={submitInvite}
          className="rounded-xl border border-border bg-card p-4 space-y-3"
        >
          <p className="text-sm font-medium text-foreground">Invite a team member</p>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <select
              value={role}
              onChange={(e) =>
                isMerchantRole(e.target.value) && setInviteRole(e.target.value)
              }
              className="h-10 rounded-lg border border-border bg-background px-2 text-sm"
              aria-label="Role"
            >
              {MERCHANT_ROLES.filter((r) => r !== "owner").map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={busy} className="h-10">
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="mr-1.5 h-4 w-4" /> Invite
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
          {formError && (
            <p className="text-xs text-destructive" role="alert">
              {formError}
            </p>
          )}
        </form>
      ) : (
        <p className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Your role ({ROLE_LABELS[merchantRole]}) can view the team but not change it.
        </p>
      )}

      {/* Members */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">
          Members ({activeMembers.length})
        </h2>
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading team…
          </p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-3 p-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {m.name ?? m.email}
                  </p>
                  {m.name && (
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {m.status === "active" && m.lastActiveAt
                      ? `Last active ${new Date(m.lastActiveAt).toLocaleDateString()}`
                      : m.status === "pending"
                        ? `Invited ${new Date(m.invitedAt).toLocaleDateString()}`
                        : "Removed"}
                  </p>
                </div>

                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[m.status]}`}
                >
                  {m.status}
                </span>

                {m.role === "owner" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" /> Owner
                  </span>
                ) : (
                  <select
                    value={m.role}
                    disabled={!canManage || m.status === "revoked"}
                    onChange={(e) =>
                      isMerchantRole(e.target.value) &&
                      void setRole(m.id, e.target.value)
                    }
                    className="h-8 rounded-lg border border-border bg-background px-2 text-xs disabled:opacity-50"
                    aria-label={`Role for ${m.email}`}
                  >
                    {MERCHANT_ROLES.filter((r) => r !== "owner").map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                )}

                {canManage && m.role !== "owner" && m.status !== "revoked" && (
                  <button
                    type="button"
                    onClick={() => void remove(m.id)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${m.email}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Audit */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Membership audit log</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">No membership changes yet.</p>
        ) : (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {audit.map((a) => (
              <li key={a.id} className="flex flex-wrap gap-x-2">
                <span className="text-foreground/70">
                  {new Date(a.at).toLocaleString()}
                </span>
                <span className="font-medium text-foreground">{a.actor}</span>
                <span>{a.action.replace("member.", "").replace("_", " ")}</span>
                <span className="text-foreground">{a.targetEmail}</span>
                {a.detail && <span>({a.detail})</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
