"use client";

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from './axios';
import type { MerchantProfile } from '../types';
import { getErrorMessage } from '../utils/apiError';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiPayment {
  id: string;
  txHash: string | null;
  payerAddress: string | null;
  merchantId: string;
  amountUsdc: number;
  amountNgn: number | null;
  fxRate: number | null;
  status: string;
  source: string | null;
  createdAt: string;
  stellarOpId?: string | null;
  url?: string;
  clicks?: number;
}

export interface ApiSettlement {
  id: string;
  merchantId: string;
  amountUsdc: number;
  amountNgn: number | null;
  status: string;
  createdAt: string;
  txHash: string | null;
  bankName: string | null;
  accountNumber: string | null;
}

export interface ApiRate {
  from: string;
  to: string;
  rate: number;
  change: number;
  trend: 'up' | 'down';
}

// Response envelopes used by the backend. Both shapes are accepted so
// the hooks tolerate response drift between `data: T[]` and a bare array.
interface RatesResponse {
  rates: ApiRate[];
  usdcNgn?: number;
}

interface ListEnvelope<T> {
  data: T[];
}

interface ItemEnvelope<T> {
  data: T;
}

// Unified public shape: keeps existing consumers happy while delegating
// network plumbing to React Query (which provides dedup + caching). The
// `refetch` contract is intentionally a parameter-bare `() => void` so it
// can be passed straight to DOM `onClick` handlers (React Query's native
// refetch takes optional options and returns a `Promise<QueryObserverResult>`,
// which is awkward to assign to event handlers — and no caller in this
// codebase uses the returned promise anyway).
interface HookShape<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function mapQuery<T>(
  result: UseQueryResult<T, Error>,
  fallback: T,
): HookShape<T> {
  return {
    data: (result.data ?? fallback) as T,
    isLoading: result.isLoading,
    error: result.isError ? getErrorMessage(result.error) : null,
    refetch: () => {
      // Fire-and-forget: the underlying call is already deduped by RQ.
      void result.refetch();
    },
  };
}

// Query keys are exported so callers can prefetch or invalidate caches
// without relearning the underlying structure.
export const queryKeys = {
  payments: ['payments'] as const,
  settlements: ['settlements'] as const,
  rates: ['rates'] as const,
  merchant: (id?: string) => ['merchant', id ?? null] as const,
};

// ─── usePayments ──────────────────────────────────────────────────────────────

export function usePayments(): HookShape<ApiPayment[]> {
  const query = useQuery<ApiPayment[], Error>({
    queryKey: queryKeys.payments,
    queryFn: async () => {
      const res = await apiClient.get<ListEnvelope<ApiPayment> | ApiPayment[]>(
        '/api/payments',
      );
      const payload = res.data;
      if (Array.isArray(payload)) return payload;
      return (payload as ListEnvelope<ApiPayment> | undefined)?.data ?? [];
    },
  });
  return mapQuery(query, []);
}

// ─── useSettlements ───────────────────────────────────────────────────────────

export function useSettlements(): HookShape<ApiSettlement[]> {
  const query = useQuery<ApiSettlement[], Error>({
    queryKey: queryKeys.settlements,
    queryFn: async () => {
      const res = await apiClient.get<ListEnvelope<ApiSettlement> | ApiSettlement[]>(
        '/api/settlements',
      );
      const payload = res.data;
      if (Array.isArray(payload)) return payload;
      return (payload as ListEnvelope<ApiSettlement> | undefined)?.data ?? [];
    },
  });
  return mapQuery(query, []);
}

// ─── useRates ─────────────────────────────────────────────────────────────────

export interface UseRatesResult extends HookShape<ApiRate[]> {
  primaryRate: number | null;
}

export function useRates(): UseRatesResult {
  const query = useQuery<RatesResponse, Error>({
    queryKey: queryKeys.rates,
    queryFn: async () => {
      const res = await apiClient.get<RatesResponse>('/api/rates');
      return res.data ?? { rates: [] };
    },
  });

  const rates: ApiRate[] = query.data?.rates ?? [];
  const primaryRate =
    query.data?.usdcNgn ??
    rates.find((r) => r.from === 'USDC' && r.to === 'NGN')?.rate ??
    null;

  return {
    data: rates,
    isLoading: query.isLoading,
    error: query.isError ? getErrorMessage(query.error) : null,
    refetch: () => {
      void query.refetch();
    },
    primaryRate,
  };
}

// ─── useMerchantProfile ───────────────────────────────────────────────────────

export function useMerchantProfile(
  merchantId: string | undefined,
): HookShape<MerchantProfile | null> {
  const query = useQuery<MerchantProfile | null, Error>({
    queryKey: queryKeys.merchant(merchantId),
    enabled: Boolean(merchantId),
    queryFn: async () => {
      const res = await apiClient.get<ItemEnvelope<MerchantProfile> | MerchantProfile>(
        `/api/merchants/${merchantId}`,
      );
      const payload = res.data;
      if (payload && !Array.isArray(payload) && 'businessName' in payload) {
        return payload as MerchantProfile;
      }
      return (payload as ItemEnvelope<MerchantProfile> | undefined)?.data ?? null;
    },
  });

  // React Query v5 already reports isLoading=false for disabled queries
  // (no fetch in flight), so we just forward `query.isLoading` directly.
  const isLoading = query.isLoading;

  return {
    data: query.data ?? null,
    isLoading,
    error: query.isError ? getErrorMessage(query.error) : null,
    refetch: () => {
      void query.refetch();
    },
  };
}
