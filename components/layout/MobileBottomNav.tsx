"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { merchantNavItems } from '@/lib/navigation/merchantNav';

const MOBILE_HREFS = ['/dashboard', '/payments', '/transactions', '/wallet', '/settings'] as const;

const mobileNavItems = MOBILE_HREFS.map((href) => {
  const item = merchantNavItems.find((n) => n.href === href)!;
  return { ...item, label: item.shortLabel || item.label };
});

export const MobileBottomNav = () => {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 md:hidden left-0 right-0 z-40 bg-card border-t border-border px-2 pt-2 pb-safe sm:pb-3 flex items-center justify-around shadow-nav-bottom">
      {mobileNavItems.map((item) => {
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
    </div>
  );
};
