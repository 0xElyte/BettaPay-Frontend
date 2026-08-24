import {
  BarChart3,
  Users,
  ListOrdered,
  Anchor,
  RefreshCcw,
  ShieldAlert,
  Settings,
  Activity,
  ClipboardCheck,
} from "lucide-react";
import type { NavItem } from "./types";

export const adminNavItems: NavItem[] = [
  { href: "/overview", label: "Platform Overview", icon: BarChart3 },
  { href: "/admin/performance", label: "Performance", icon: Activity },
  { href: "/merchants", label: "Merchants", icon: Users },
  { href: "/merchants/kyb", label: "KYB Review", icon: ClipboardCheck },
  { href: "/admin/transactions", label: "Transactions", icon: ListOrdered },
  { href: "/anchors", label: "Anchors (SEP-24)", icon: Anchor },
  { href: "/fx-management", label: "FX Management", icon: RefreshCcw },
  { href: "/compliance", label: "Compliance", icon: ShieldAlert },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];
