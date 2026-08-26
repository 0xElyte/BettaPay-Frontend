"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useTheme } from 'next-themes';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Skeleton } from '@/components/ui';

interface ChartDataItem {
  name: string;
  volume: number;
  fee: number;
}

export default function PlatformVolumeChart({ height = 300 }: { height?: number }) {

  const { data, isLoading, isError } = useQuery<ChartDataItem[]>({
    queryKey: ['platform-volume'],
    queryFn: async () => {
      const response = await axios.get<ChartDataItem[]>('/api/platform-volume');
      return response.data;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full rounded-xl" />;
  }

  if (isError || !data) {
    return <p className="text-destructive font-medium p-4 text-center">Failed to load platform volume data.</p>;
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis
            dataKey="name"
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="left"
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value / 1000}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
            cursor={{ fill: 'var(--accent)' }}
          />
          <Bar yAxisId="left" dataKey="volume" fill="var(--border)" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="left" dataKey="fee" fill="var(--primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

