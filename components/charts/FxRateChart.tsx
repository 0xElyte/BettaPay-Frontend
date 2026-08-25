"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
// Imported directly (not via the barrel) to keep this lazy-loaded chunk lean.
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";

export interface FxRatePoint {
  date: string;
  rate: number;
}

/** 7 days of USDC/NGN rates — used when the caller does not supply live data. */
const fxHistory: FxRatePoint[] = [
  { date: "Jan 7", rate: 1480 },
  { date: "Jan 8", rate: 1495 },
  { date: "Jan 9", rate: 1510 },
  { date: "Jan 10", rate: 1505 },
  { date: "Jan 11", rate: 1520 },
  { date: "Jan 12", rate: 1545 },
  { date: "Jan 13", rate: 1550 },
];

const formatNgn = (value: number) => `₦${value.toLocaleString()}`;

export interface FxTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

export const FxTooltip = ({ active, payload, label }: FxTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="border rounded-xl p-3 shadow-lg text-sm"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        <p className="font-semibold mb-1" style={{ color: "var(--foreground)" }}>
          {label}
        </p>
        <p className="font-bold" style={{ color: "var(--primary)" }}>
          {formatNgn(payload[0]?.value ?? 0)}
        </p>
      </div>
    );
  }
  return null;
};

interface FxRateChartProps {
  height?: number;
  /** Live rate history. Falls back to 7 days of mock data when omitted. */
  data?: FxRatePoint[];
  /** Set when the caller's rate fetch failed — renders an in-chart error state. */
  error?: string | Error | null;
  onRetry?: () => void;
}

export default function FxRateChart({
  height = 240,
  data,
  error = null,
  onRetry,
}: FxRateChartProps) {
  const [isMobile, setIsMobile] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const chartData = data && data.length > 0 ? data : fxHistory;
  const hasError = Boolean(error) || (data !== undefined && data.length === 0);

  if (hasError) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height }}>
        <ErrorDisplay
          message={
            typeof error === "string"
              ? error
              : "Unable to load FX rate history."
          }
          onRetry={onRetry}
        />
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 4, right: 4, bottom: 0, left: isMobile ? 0 : -10 }}
        >
          <defs>
            <linearGradient id="colorFxRate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={isDark ? 0.4 : 0.25} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={isDark ? 0.05 : 0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <YAxis
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatNgn}
            tick={{ fill: "var(--muted-foreground)" }}
            domain={["auto", "auto"]}
            width={isMobile ? 52 : 64}
          />
          <Tooltip content={<FxTooltip />} />
          <Area
            type="monotone"
            dataKey="rate"
            stroke="var(--primary)"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorFxRate)"
            dot={false}
            activeDot={{
              r: 5,
              fill: "var(--primary)",
              stroke: "var(--card)",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
