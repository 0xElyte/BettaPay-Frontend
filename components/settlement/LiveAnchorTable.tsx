"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/axios";
import { RefreshCcw } from "lucide-react";
import type { Anchor } from "@/lib/types";

interface AnchorListResponse {
  data: Anchor[];
}

function usePublicAnchors() {
  return useQuery<AnchorListResponse, Error>({
    queryKey: ["public", "anchors"],
    queryFn: async () => {
      const res = await apiClient.get<AnchorListResponse>("/api/anchors");
      return res.data ?? { data: [] };
    },
    staleTime: 60_000,
  });
}

export default function LiveAnchorTable() {
  const { data, isLoading, error, refetch } = usePublicAnchors();
  const anchors = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-8 flex items-center justify-center">
          <RefreshCcw className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading supported anchors...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Unable to load anchor data.{" "}
            <button
              onClick={() => void refetch()}
              className="text-primary hover:underline font-medium"
            >
              Retry
            </button>
          </p>
        </div>
      </div>
    );
  }

  if (anchors.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No anchors are currently available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-4 px-6 font-semibold">Country</th>
              <th className="py-4 px-6 font-semibold">Currency</th>
              <th className="py-4 px-6 font-semibold">Licensed Anchor</th>
              <th className="py-4 px-6 font-semibold">KYC Level</th>
              <th className="py-4 px-6 font-semibold">Settlement Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {anchors.map((anchor) => (
              <tr
                key={anchor.id}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="py-4 px-6 font-medium text-foreground flex items-center gap-3">
                  <span className="text-xl">{anchor.flag}</span>
                  {anchor.country}
                </td>
                <td className="py-4 px-6 font-mono font-bold text-primary">
                  {anchor.currency}
                </td>
                <td className="py-4 px-6 text-foreground font-medium">
                  {anchor.name}
                </td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border">
                    {anchor.kycLevels
                      .map((l) => l.charAt(0).toUpperCase() + l.slice(1))
                      .join(", ")}
                  </span>
                </td>
                <td className="py-4 px-6 font-medium text-emerald-600 dark:text-emerald-400">
                  {anchor.settlementTime}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
