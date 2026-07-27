"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { adminNavItems } from '@/lib/navigation/adminNav';
import Image from 'next/image';

// ---------------------------------------------------------------------------
// Active-link helper — mirrors MerchantSidebar's exact match + sub-path logic
// ---------------------------------------------------------------------------

function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

// ---------------------------------------------------------------------------
// AdminSidebar
// ---------------------------------------------------------------------------

export const AdminSidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border hidden md:flex" role="navigation" aria-label="Main navigation">
      <div className="p-6">
        <Link href="/overview" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center p-1">
            <Image src="/logo.png" alt="BettaPay Logo" width={24} height={24} className="w-full h-full object-contain" />
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {adminNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                isActive 
                  ? "bg-primary/10 text-sidebar-foreground font-semibold border border-primary/30 shadow-sm" 
                  : "text-muted-foreground hover:bg-sidebar-accent/20 hover:text-sidebar-foreground font-medium border border-transparent"
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
              <div className="relative flex items-center">
                <Icon className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground"
                )} />
                {isActive && (
                  <span className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
              {item.label}

              {/* Active indicator dot */}
              {active && (
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
        <div className="flex items-center gap-3 px-2 py-2">
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

          {/* Identity text */}
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
        </div>
      </div>
    </aside>
  );
};
