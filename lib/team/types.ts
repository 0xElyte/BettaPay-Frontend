/** Merchant team roles and the capability gates derived from them (issue #465). */

export const MERCHANT_ROLES = ["owner", "finance", "developer", "viewer"] as const;
export type MerchantRole = (typeof MERCHANT_ROLES)[number];

export const ROLE_LABELS: Record<MerchantRole, string> = {
  owner: "Owner",
  finance: "Finance",
  developer: "Developer",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<MerchantRole, string> = {
  owner: "Full access, including billing and team management.",
  finance: "Payments, settlements and payouts. No developer tools.",
  developer: "API keys, webhooks and the dev console. No payout actions.",
  viewer: "Read-only access to dashboards and history.",
};

export type TeamMemberStatus = "pending" | "active" | "revoked";

export interface TeamMember {
  id: string;
  email: string;
  name?: string;
  role: MerchantRole;
  status: TeamMemberStatus;
  invitedAt: string;
  acceptedAt?: string;
  lastActiveAt?: string;
}

export interface TeamAuditEntry {
  id: string;
  at: string;
  actor: string;
  action:
    | "member.invited"
    | "member.accepted"
    | "member.role_changed"
    | "member.removed";
  targetEmail: string;
  detail?: string;
}

/** UI + API capabilities each role is allowed. Server routes enforce these. */
export type TeamCapability =
  | "team.manage"
  | "payouts.execute"
  | "developer.console"
  | "settlement.manage"
  | "reports.view";

const CAPABILITIES: Record<MerchantRole, TeamCapability[]> = {
  owner: [
    "team.manage",
    "payouts.execute",
    "developer.console",
    "settlement.manage",
    "reports.view",
  ],
  finance: ["payouts.execute", "settlement.manage", "reports.view"],
  developer: ["developer.console", "reports.view"],
  viewer: ["reports.view"],
};

/** `can("finance", "developer.console") === false`. Unknown role => no access. */
export function can(role: MerchantRole | null | undefined, capability: TeamCapability): boolean {
  if (!role) return false;
  return CAPABILITIES[role]?.includes(capability) ?? false;
}

export function isMerchantRole(value: unknown): value is MerchantRole {
  return typeof value === "string" && (MERCHANT_ROLES as readonly string[]).includes(value);
}
