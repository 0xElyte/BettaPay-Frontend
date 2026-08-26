"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Users,
  ListOrdered,
  Anchor,
  RefreshCcw,
  ShieldAlert,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Navigation config — single source of truth for admin routes
// ---------------------------------------------------------------------------

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: "/overview", label: "Overview", icon: BarChart3 },
  { href: "/merchants", label: "Merchants", icon: Users },
  { href: "/admin/transactions", label: "Transactions", icon: ListOrdered },
  { href: "/anchors", label: "Anchors", icon: Anchor },
  { href: "/fx-management", label: "FX Management", icon: RefreshCcw },
  { href: "/compliance", label: "Compliance", icon: ShieldAlert },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

// ---------------------------------------------------------------------------
// Active-link helper — mirrors MerchantSidebar's exact match + sub-path logic
// ---------------------------------------------------------------------------

function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

const STORAGE_KEY = "bettapay:sidebar:admin:collapsed";
const SIDEBAR_ID = "admin-sidebar";

// ---------------------------------------------------------------------------
// AdminSidebar
// ---------------------------------------------------------------------------

export const AdminSidebar = () => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setCollapsed(stored === "true");
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed, mounted]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  return (
    <aside
      id={SIDEBAR_ID}
      className={cn(
        "h-full flex-col hidden md:flex flex-shrink-0 transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
      style={{
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
      aria-label="Admin navigation"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Logo / Brand header                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div
        className={cn("p-5 flex-shrink-0 flex items-center", collapsed ? "justify-center px-2" : "justify-between gap-2")}
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Link
          href="/overview"
          className={cn("flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded-lg min-w-0", collapsed && "justify-center")}
          aria-label="BettaPay Admin — go to overview"
        >
          {/* Icon mark */}
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background:
                "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              boxShadow: "0 0 12px rgba(124,58,237,0.45)",
            }}
          >
            <ShieldCheck className="w-4 h-4 text-white" aria-hidden="true" />
          </div>

          {/* Wordmark + badge - hidden when collapsed */}
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="font-bold text-base tracking-tight text-white">
                BettaPay
              </span>
              <span
                className="text-[10px] font-semibold tracking-widest uppercase mt-0.5"
                style={{ color: "#a78bfa" }}
              >
                Admin Console
              </span>
            </div>
          )}
        </Link>
        {/* Collapse toggle - communicates expanded state */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls={SIDEBAR_ID}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden md:inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors flex-shrink-0"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" aria-hidden="true" /> : <ChevronLeft className="w-4 h-4" aria-hidden="true" />}
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Navigation links                                                     */}
      {/* ------------------------------------------------------------------ */}
      <nav
        className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto"
        aria-label="Admin menu"
      >
        {navItems.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                // Base styles — match MerchantSidebar spacing/radius/typography
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                collapsed && "justify-center px-2",
                // State variants
                active
                  ? "text-white"
                  : "text-slate-400 hover:text-white"
              )}
              style={
                active
                  ? {
                      background:
                        "linear-gradient(90deg, rgba(124,58,237,0.25) 0%, rgba(79,70,229,0.12) 100%)",
                      border: "1px solid rgba(124,58,237,0.35)",
                      boxShadow: "inset 0 0 0 0 transparent",
                    }
                  : {
                      // Hover handled via Tailwind; keep border slot to avoid layout shift
                      border: "1px solid transparent",
                    }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.04)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "";
                }
              }}
            >
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0",
                  active ? "text-violet-400" : "text-slate-500"
                )}
                aria-hidden="true"
              />
              {!collapsed && item.label}
              {collapsed && <span className="sr-only">{item.label}</span>}

              {/* Active indicator dot - hidden when collapsed to avoid clutter, but keep SR */}
              {active && !collapsed && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: "#7c3aed" }}
                  aria-hidden="true"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Footer — admin user identity                                         */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="p-4 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className={cn("flex items-center gap-3 px-2 py-2", collapsed && "justify-center px-0")}>
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              boxShadow: "0 0 8px rgba(124,58,237,0.4)",
            }}
            aria-hidden="true"
          >
            SA
          </div>

          {/* Identity text - hidden when collapsed */}
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-white truncate">
                System Admin
              </span>
              <span
                className="text-xs flex items-center gap-1 font-medium"
                style={{ color: "#a78bfa" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block bg-violet-400"
                  aria-hidden="true"
                />
                Superuser
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
