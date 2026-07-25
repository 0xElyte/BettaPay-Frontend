"use client";

import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const fxHistory = [
  { date: 'Jan 7', rate: 1480 },
  { date: 'Jan 8', rate: 1495 },
  { date: 'Jan 9', rate: 1510 },
  { date: 'Jan 10', rate: 1505 },
  { date: 'Jan 11', rate: 1520 },
  { date: 'Jan 12', rate: 1545 },
  { date: 'Jan 13', rate: 1550 },
];

export interface FxTooltipProps { active?: boolean; payload?: { value: number }[]; label?: string; }
export const FxTooltip = ({ active, payload, label }: FxTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-sm">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        <p className="text-amber-600 font-bold">₦{payload[0]?.value?.toLocaleString()}</p>
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  if (active && payload && payload.length) {
    return (
      <div 
        className="border rounded-xl p-3 shadow-lg text-sm"
        style={{ 
          backgroundColor: isDark ? "var(--card)" : "var(--card)",
          borderColor: isDark ? "var(--border)" : "var(--border)",
        }}
      >
        <p className="font-semibold mb-1" style={{ color: isDark ? "var(--foreground)" : "var(--foreground)" }}>{label}</p>
        <p className="font-bold" style={{ color: isDark ? "var(--primary)" : "var(--primary)" }}>
          ₦{payload[0]?.value?.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export default function FxRateChart({ height = 240 }: { height?: number }) {
  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={fxHistory} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#94A3B8' }} />
          <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${v}`} tick={{ fill: '#94A3B8' }} domain={['auto', 'auto']} />
          <Tooltip content={<FxTooltip />} />
          <Line type="monotone" dataKey="rate" stroke="#F0A500" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#F0A500', stroke: '#fff', strokeWidth: 2 }} />
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
