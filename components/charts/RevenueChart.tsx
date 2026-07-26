"use client";

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Skeleton } from '@/components/ui';

interface ChartDataItem {
  name: string;
  total: number;
  volume: number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

const ChartTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  if (active && payload && payload.length) {
    return (
      <div className="border rounded-xl p-3 shadow-lg text-sm" style={{ backgroundColor: isDark ? 'var(--card)' : 'var(--card)', borderColor: isDark ? 'var(--border)' : 'var(--border)' }}>
        <p className="font-semibold mb-1" style={{ color: isDark ? 'var(--foreground)' : 'var(--foreground)' }}>{label}</p>
        <p className="font-bold" style={{ color: isDark ? 'var(--primary)' : 'var(--primary)' }}>${payload[0]?.value?.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export default function RevenueChart({ height = 260 }: { height?: number }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { data, isLoading, isError } = useQuery<ChartDataItem[]>(
    ['revenue'],
    async () => {
      const res = await axios.get<ChartDataItem[]>('/api/revenue');
      return res.data;
    }
  );

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (isLoading) {
    return <Skeleton className="h-[260px] w-full rounded-xl" />;
  }
  if (isError || !data) {
    return <p className="text-destructive">Failed to load revenue data.</p>;
  }

  return (
    <div className={cn('w-full', height ? `h-[${height}px]` : 'h-64')} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: isMobile ? 0 : -16 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={isDark ? 0.4 : 0.25} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={isDark ? 0.05 : 0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)' }} />
          <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} tick={{ fill: 'var(--muted-foreground)' }} domain={['auto', 'auto']} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" dot={false} activeDot={{ r: 5, fill: 'var(--primary)', stroke: 'var(--card)', strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
