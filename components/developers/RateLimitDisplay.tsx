"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Gauge, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { useRateLimitStore } from "@/lib/store/rateLimitStore";

interface RateLimitStatus {
  limit: number;
  remaining: number;
  resetAt: number;
  unit: string;
}

interface RateLimitDisplayProps {
  endpointPath?: string;
  unit?: string;
  refreshInterval?: number;
}

function formatCountdown(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hours, minutes, secs].map((value) => value.toString().padStart(2, "0")).join(":");
}

function deriveUnitFromHeaderOrPath(headerUnit: string | null, endpointPath?: string, fallbackUnit?: string): string {
  if (fallbackUnit) return fallbackUnit;
  if (headerUnit) return headerUnit;
  if (endpointPath) {
    if (endpointPath.includes("/auth")) return "requests/min";
    if (endpointPath.includes("/payments")) return "requests/min";
  }
  return "requests/min";
}

export function RateLimitDisplay({ endpointPath, unit: customUnit, refreshInterval }: RateLimitDisplayProps) {
  const { rateLimitedUntil, secondsRemaining, endpoint, limit: storeLimit, tick } = useRateLimitStore();
  const [status, setStatus] = useState<RateLimitStatus | null>(null);
  const [secondsUntilReset, setSecondsUntilReset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tick the countdown using store's tick function when rate limited by 429
  useEffect(() => {
    if (rateLimitedUntil === 0) return;
    const timer = window.setInterval(() => {
      tick();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [rateLimitedUntil, tick]);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/rate-limit/status", { cache: "no-store" });
      const limit = Number(response.headers.get("X-RateLimit-Limit"));
      const remaining = Number(response.headers.get("X-RateLimit-Remaining"));
      const resetAt = Number(response.headers.get("X-RateLimit-Reset"));
      const headerUnit = response.headers.get("X-RateLimit-Unit");
      
      if (!response.ok || !Number.isFinite(limit) || !Number.isFinite(remaining) || !Number.isFinite(resetAt)) {
        throw new Error();
      }

      const derivedUnit = deriveUnitFromHeaderOrPath(headerUnit, endpointPath, customUnit);
      setStatus({ limit, remaining, resetAt, unit: derivedUnit });
      setSecondsUntilReset(Math.max(0, resetAt - Math.floor(Date.now() / 1000)));
    } catch {
      setError("Rate limit status is temporarily unavailable.");
    } finally {
      setIsLoading(false);
    }
  }, [endpointPath, customUnit]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  // Periodic refresh interval if specified
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;
    const interval = window.setInterval(() => {
      void loadStatus();
    }, refreshInterval);
    return () => window.clearInterval(interval);
  }, [loadStatus, refreshInterval]);

  // Countdown timer effect
  useEffect(() => {
    if (!status) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, status.resetAt - Math.floor(Date.now() / 1000));
      setSecondsUntilReset(remaining);
      if (remaining === 0) void loadStatus();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loadStatus, status]);

  const usagePercentage = useMemo(() => {
    if (!status || status.limit <= 0) return 0;
    return Math.min(100, Math.max(0, ((status.limit - status.remaining) / status.limit) * 100));
  }, [status]);

  const showWarning = usagePercentage >= 80;
  const is429Active = secondsRemaining > 0;

  return (
    <Card className="border border-border bg-card shadow-sm text-foreground">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Gauge className="h-4 w-4 text-primary" /> API rate limit
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Current request allowance for this API client ({status?.unit || customUnit || "requests/min"}).
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={() => void loadStatus()} disabled={isLoading} aria-label="Refresh rate limit status" className="text-muted-foreground hover:text-foreground">
          <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4" aria-live="polite">
        {is429Active && (
          <div className="rounded-md bg-destructive/10 p-3 border border-destructive/20 text-destructive text-sm space-y-2" data-testid="rate-limit-429-banner">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
              <span>Rate Limit Exceeded (HTTP 429)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-foreground/90">
              <div>
                <span className="text-muted-foreground block font-medium">Countdown Timer:</span>
                <span className="font-mono text-sm font-bold text-destructive tabular-nums">{formatCountdown(secondsRemaining)}</span>
                <span className="text-[11px] text-muted-foreground ml-1">({secondsRemaining}s remaining)</span>
              </div>
              <div>
                <span className="text-muted-foreground block font-medium">Rate-Limited Endpoint:</span>
                <span className="font-mono text-xs font-semibold truncate block" title={endpoint || "All Endpoints"}>{endpoint || "All Endpoints"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block font-medium">Rate Limit Policy:</span>
                <span className="font-semibold text-xs">{storeLimit ? `${storeLimit} max requests / window` : status ? `${status.limit} max requests / window` : "Standard Policy"}</span>
              </div>
            </div>
          </div>
        )}

        {error ? (
          <p className="text-sm text-destructive font-medium">{error}</p>
        ) : status ? (
          <>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-bold tabular-nums text-foreground">{status.remaining.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  requests remaining of {status.limit.toLocaleString()} ({status.unit})
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-semibold tabular-nums text-foreground">{formatCountdown(secondsUntilReset)}</p>
                <p className="text-xs text-muted-foreground">until reset</p>
              </div>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-muted border border-border/40"
              role="progressbar"
              aria-label="API rate limit usage"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(usagePercentage)}
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  showWarning ? "bg-amber-500 dark:bg-amber-400" : "bg-primary"
                }`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">{Math.round(usagePercentage)}% used</span>
              {showWarning && (
                <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" /> Approaching rate limit
                </span>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Loading rate limit status…</p>
        )}
      </CardContent>
    </Card>
  );
}

