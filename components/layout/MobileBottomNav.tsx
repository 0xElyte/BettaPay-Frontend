"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { merchantNavItems } from '@/lib/navigation/merchantNav';
import { useState } from 'react';
import { MoreHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui';

const PRIMARY_HREFS = ['/dashboard', '/payments', '/transactions', '/wallet', '/settings'] as const;
const ADDITIONAL_HREFS = ['/settlement', '/fx', '/developers'] as const;

const primaryNavItems = PRIMARY_HREFS.map((href) => {
  const item = merchantNavItems.find((n) => n.href === href)!;
  return { ...item, label: item.shortLabel || item.label };
});

const additionalNavItems = ADDITIONAL_HREFS.map((href) => {
  const item = merchantNavItems.find((n) => n.href === href)!;
  return { ...item, label: item.label };
});

export const MobileBottomNav = () => {
  const pathname = usePathname();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const isAdditionalActive = ADDITIONAL_HREFS.some(
    (href) => pathname === href || pathname.startsWith(href + '/')
  );

  const handleMoreItemClick = () => {
    setMoreMenuOpen(false);
  };

  return (
    <>
      <div className="fixed bottom-0 md:hidden left-0 right-0 z-40 bg-card border-t border-border px-2 pt-2 pb-safe sm:pb-3 flex items-center justify-around shadow-nav-bottom">
        {primaryNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "flex flex-col items-center justify-center w-[68px] gap-1 py-1.5 rounded-lg transition-all",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
              <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
            </Link>
          );
        })}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMoreMenuOpen(!moreMenuOpen)}
          aria-expanded={moreMenuOpen}
          aria-label="More options"
          className={cn(
            "flex flex-col items-center justify-center w-[68px] gap-1 py-1.5 rounded-lg transition-all min-h-auto h-auto",
            isAdditionalActive
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <MoreHorizontal className={cn("w-5 h-5", isAdditionalActive ? "text-primary" : "text-muted-foreground")} />
          <span className="text-[10px] font-medium tracking-tight">More</span>
        </Button>
      </div>

      {moreMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-30 md:hidden"
            onClick={() => setMoreMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed bottom-20 md:hidden left-0 right-0 z-40 mx-2 rounded-lg bg-card border border-border shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">More routes</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMoreMenuOpen(false)}
                aria-label="Close menu"
                className="min-h-[44px] min-w-[44px]"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="flex flex-col">
              {additionalNavItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleMoreItemClick}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-b border-border last:border-b-0",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </>
  );
};
