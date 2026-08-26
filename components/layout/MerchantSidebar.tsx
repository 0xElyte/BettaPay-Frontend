"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { merchantNavItems } from "@/lib/navigation/merchantNav";
import { useAuthStore } from "@/lib/store/authStore";
import Image from 'next/image';

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const KYB_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  approved: { label: "Verified", color: "text-success" },
  pending: { label: "Pending Review", color: "text-warning" },
  rejected: { label: "Rejected", color: "text-destructive" },
  none: { label: "Not Verified", color: "text-muted-foreground" },
};

export const MerchantSidebar = () => {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const businessName = user?.businessName ?? user?.name ?? "";
  const initials = businessName ? getInitials(businessName) : "MC";
  const displayName = businessName || "Merchant Corp";
  const kyb = KYB_STATUS_LABEL[user?.kybStatus ?? "none"] ?? KYB_STATUS_LABEL.none;
  const showVerified = user?.kybStatus === "approved" || !isLoggedIn;

  return (
    <aside
      className="flex h-full w-64 flex-col bg-card border-r border-border hidden md:flex"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center p-1 shadow-sm">
            <Image src="/logo.png" alt="BettaPay Logo" width={24} height={24} className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">
            BettaPay
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {merchantNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/30 font-semibold shadow-sm amber:bg-amber-50"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium border border-transparent",
              )}
            >
              <div className="relative flex items-center">
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                {isActive && (
                  <span className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0">
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">
              {displayName}
            </span>
            <span className={cn("text-xs flex items-center gap-1 font-medium", showVerified ? "text-success" : kyb.color)}>
              {showVerified && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              )}
              {showVerified ? "Verified" : kyb.label}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
