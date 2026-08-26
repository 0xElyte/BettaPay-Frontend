"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const fxHistory = [
  { date: "Jan 7", rate: 1480 },
  { date: "Jan 8", rate: 1495 },
  { date: "Jan 9", rate: 1510 },
  { date: "Jan 10", rate: 1505 },
  { date: "Jan 11", rate: 1520 },
  { date: "Jan 12", rate: 1545 },
  { date: "Jan 13", rate: 1550 },
];

interface FxTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

const FxTooltip = ({ active, payload, label }: FxTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div 
        className="border rounded-xl p-3 shadow-lg text-sm bg-card border-border text-foreground"
      >
        <p className="font-semibold mb-1 text-foreground">{label}</p>
        <p className="font-bold text-primary">
          ₦{payload[0]?.value?.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

interface FxRateChartProps {
  height?: number;
}

export default function FxRateChart({ height = 240 }: FxRateChartProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={fxHistory}
          margin={{ top: 4, right: 4, bottom: 0, left: isMobile ? 0 : -10 }}
        >
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
            tickFormatter={(v) => `₦${v}`}
            tick={{ fill: "var(--muted-foreground)" }}
            domain={["auto", "auto"]}
          />
          <Tooltip content={<FxTooltip />} />
          <Line
            type="monotone"
            dataKey="rate"
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
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

