"use client";

import { CheckCircle2, AlertTriangle, XCircle, type LucideIcon } from "lucide-react";
import type { ComponentStatusLevel, StatusComponent } from "@/lib/status/data";
import { formatLastIncident } from "@/lib/status/time";
import { STATUS_TONE_BADGE, STATUS_TONE_DOT, type StatusTone } from "@/lib/status/palette";
import { useNow } from "@/lib/hooks/useNow";
import { cn } from "@/lib/utils";

interface ComponentStatusProps {
  components: StatusComponent[];
}

const levelConfig: Record<
  ComponentStatusLevel,
  { icon: LucideIcon; tone: StatusTone; label: string }
> = {
  operational: { icon: CheckCircle2, tone: "ok", label: "Operational" },
  degraded: { icon: AlertTriangle, tone: "warn", label: "Degraded" },
  down: { icon: XCircle, tone: "down", label: "Down" },
};

export function ComponentStatusGrid({ components }: ComponentStatusProps) {
  // Drives the "last incident" labels so they age with the page.
  const now = useNow();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {components.map((component) => {
        const config = levelConfig[component.status];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Icon = config.icon as any;

        return (
          <div
            key={component.id}
            className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {component.name}
              </h3>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                  STATUS_TONE_BADGE[config.tone]
                )}
              >
                <Icon className="w-3 h-3" aria-hidden="true" />
                {config.label}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Uptime:{" "}
                <span className="font-semibold text-foreground">
                  {component.uptimePercent}%
                </span>
              </span>
              <span>
                Last incident: {formatLastIncident(component.lastIncident, now)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Exported for reuse by any surface that needs the same dot colour. */
export const statusDotClass = (level: ComponentStatusLevel): string =>
  STATUS_TONE_DOT[levelConfig[level].tone];
