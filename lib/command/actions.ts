import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  FilePlus2,
  Receipt,
  LogOut,
  Compass,
} from "lucide-react";
import { adminNavItems } from "@/lib/navigation/adminNav";
import { merchantNavItems } from "@/lib/navigation/merchantNav";

export type CommandRole = "merchant" | "admin";

export interface CommandContext {
  navigate: (href: string) => void;
  role: CommandRole;
  logout: () => void;
  switchNetwork: () => void;
}

export interface CommandAction {
  id: string;
  title: string;
  /** Extra terms folded into fuzzy search (route path, synonyms). */
  keywords?: string[];
  group: "Navigation" | "Create" | "Account";
  icon: React.ComponentType<{ className?: string }>;
  /** Roles allowed to see this action. Omitted = all roles. */
  roles?: CommandRole[];
  /** Route to navigate to. Mutually exclusive with `run`. */
  href?: string;
  /** Imperative handler for non-navigation actions. */
  run?: (ctx: CommandContext) => void | Promise<void>;
}

function navActions(
  items: readonly { href: string; label: string }[],
  role: CommandRole,
): CommandAction[] {
  return items.map((item) => ({
    id: `nav:${role}:${item.href}`,
    title: `Go to ${item.label}`,
    keywords: [item.label, item.href.replace(/[/-]/g, " ")],
    group: "Navigation" as const,
    icon: Compass as LucideIcon,
    roles: [role],
    href: item.href,
  }));
}

const staticActions: CommandAction[] = [
  {
    id: "create:payment-link",
    title: "Create payment link",
    keywords: ["new", "invoice", "charge", "pay"],
    group: "Create",
    icon: FilePlus2 as LucideIcon,
    roles: ["merchant"],
    href: "/payments?new=1",
  },
  {
    id: "create:quote",
    title: "Request a quote",
    keywords: ["fx", "rate", "conversion", "estimate"],
    group: "Create",
    icon: Receipt as LucideIcon,
    roles: ["merchant"],
    href: "/fx?quote=1",
  },
  {
    id: "account:switch-network",
    title: "Switch network (testnet / mainnet)",
    keywords: ["stellar", "environment", "testnet", "mainnet", "public"],
    group: "Account",
    icon: ArrowLeftRight as LucideIcon,
    run: (ctx) => ctx.switchNetwork(),
  },
  {
    id: "account:logout",
    title: "Log out",
    keywords: ["sign out", "exit"],
    group: "Account",
    icon: LogOut as LucideIcon,
    run: (ctx) => ctx.logout(),
  },
];

/** All actions available to `role`, navigation routes first. */
export function actionsForRole(role: CommandRole): CommandAction[] {
  const nav =
    role === "admin"
      ? navActions(adminNavItems, "admin")
      : navActions(merchantNavItems, "merchant");

  const rest = staticActions.filter((a) => !a.roles || a.roles.includes(role));

  return [...nav, ...rest];
}
