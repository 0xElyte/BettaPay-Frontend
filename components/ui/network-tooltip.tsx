'use client';

import { ReactNode } from 'react';

interface NetworkTooltipProps {
  children: ReactNode;
  /** Whether to show the tooltip (i.e. when the action is disabled due to offline) */
  show: boolean;
  message?: string;
}

export function NetworkTooltip({
  children,
  show,
  message = 'Internet connection required',
}: NetworkTooltipProps) {
  if (!show) return <>{children}</>;

  return (
    <div className="relative group/nettooltip inline-block">
      {children}
      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover/nettooltip:opacity-100"
      >
        {message}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </div>
    </div>
  );
}
