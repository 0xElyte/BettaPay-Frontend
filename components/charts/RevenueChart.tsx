"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

/** Minimal shape this chart needs from a payment — matches `ApiPayment`. */
export interface RevenuePayment {
  amountUsdc: number;
  createdAt: string;
  status?: string;
}

export interface RevenueChartPoint {
  /** Day label shown on the X axis. */
  name: string;
  /** Revenue received that day. */
  total: number;
  /** Cumulative volume up to and including that day. */
  volume: number;
}

/** Preview data — used only when the parent supplies no payments. */
const mockChartData: RevenueChartPoint[] = [
  { name: "Mon", total: 1200, volume: 1200 },
  { name: "Tue", total: 2100, volume: 3300 },
  { name: "Wed", total: 1800, volume: 5100 },
  { name: "Thu", total: 3200, volume: 8300 },
  { name: "Fri", total: 2800, volume: 11100 },
  { name: "Sat", total: 4100, volume: 15200 },
  { name: "Sun", total: 3800, volume: 19000 },
];

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Buckets payments into calendar days, then walks the days in order to build a
 * running cumulative volume. Failed payments never count towards revenue.
 */
export const aggregatePaymentsByDay = (
  payments: RevenuePayment[]
): RevenueChartPoint[] => {
  const byDay = new Map<string, number>();

  for (const payment of payments) {
    if (!payment?.createdAt) continue;
    if (payment.status?.toLowerCase() === "failed") continue;

    const amount = Number(payment.amountUsdc);
    if (!Number.isFinite(amount)) continue;

    const date = new Date(payment.createdAt);
    if (Number.isNaN(date.getTime())) continue;

    const key = date.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + amount);
  }

  let cumulative = 0;

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, total]) => {
      cumulative += total;
      return {
        name: new Date(`${key}T00:00:00`).toLocaleDateString("en-US", {
          weekday: "short",
        }),
        total: round2(total),
        volume: round2(cumulative),
      };
    });
};

const formatUsd = (value: number) =>
  `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

interface ChartTooltipProps {
  active?: boolean;
  payload?: { value: number; dataKey: string; name?: string }[];
  label?: string;
}

const ChartTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (active && payload && payload.length) {
    const daily = payload.find((p) => p.dataKey === "total")?.value;
    const cumulative = payload.find((p) => p.dataKey === "volume")?.value;

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
          {formatUsd(daily ?? 0)}
        </p>
        {cumulative !== undefined && (
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            Cumulative {formatUsd(cumulative)}
          </p>
        )}
      </div>
    );
  }
  return null;
};

interface RevenueChartProps {
  height?: number;
  /**
   * Payments from `usePayments`, or pre-aggregated chart points. Falls back to
   * mock data when omitted or empty, so the chart still previews.
   */
  data?: RevenuePayment[] | RevenueChartPoint[];
}

const isAggregated = (
  data: RevenuePayment[] | RevenueChartPoint[]
): data is RevenueChartPoint[] =>
  data.length > 0 && (data[0] as RevenueChartPoint).name !== undefined;

export default function RevenueChart({ height = 260, data }: RevenueChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return mockChartData;
    if (isAggregated(data)) return data;

    const aggregated = aggregatePaymentsByDay(data as RevenuePayment[]);
    return aggregated.length > 0 ? aggregated : mockChartData;
  }, [data]);

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 4, right: 4, bottom: 0, left: isMobile ? 0 : -16 }}
        >
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={isDark ? 0.9 : 0.8} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={isDark ? 0.25 : 0.2} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatUsd}
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
          <Bar
            dataKey="total"
            name="Daily revenue"
            fill="url(#colorRevenue)"
            radius={[6, 6, 0, 0]}
            maxBarSize={36}
          />
          <Line
            type="monotone"
            dataKey="volume"
            name="Cumulative volume"
            stroke="var(--primary)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 5,
              fill: "var(--primary)",
              stroke: "var(--card)",
              strokeWidth: 2,
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

