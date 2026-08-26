"use client";

import { useEffect, useState } from 'react';
import { SUPPORTED_CURRENCIES } from '@/lib/utils/constants';
import { apiClient } from '@/lib/api/axios';
import { useNotify } from '@/lib/hooks/useNotify';

interface CurrencySelectorProps {
  value?: string;
  onValueChange?: (value: string) => void;
}

function getAssetCodes(payload: unknown): string[] {
  const response = payload as { data?: unknown; assets?: unknown } | null;
  const assets = Array.isArray(payload)
    ? payload
    : Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.assets)
        ? response.assets
        : [];

  return assets
    .map((asset) => {
      if (typeof asset === 'string') return asset;
      if (asset && typeof asset === 'object') {
        const item = asset as { code?: unknown; asset?: unknown; symbol?: unknown; name?: unknown };
        return [item.code, item.asset, item.symbol, item.name].find(
          (candidate): candidate is string => typeof candidate === 'string'
        );
      }
      return undefined;
    })
    .filter((code): code is string => Boolean(code))
    .map((code) => code.trim())
    .filter((code, index, codes) => codes.indexOf(code) === index);
}

export function CurrencySelector({ value = '', onValueChange }: CurrencySelectorProps) {
  const [assets, setAssets] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { error } = useNotify();

  useEffect(() => {
    let isMounted = true;

    const loadAssets = async () => {
      try {
        const response = await apiClient.get('/api/assets');
        if (isMounted) setAssets(getAssetCodes(response.data));
      } catch {
        if (isMounted) error('Unable to refresh supported currencies');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadAssets();
    const refreshTimer = window.setInterval(loadAssets, 60_000);
    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const options = isLoading ? [...SUPPORTED_CURRENCIES] : assets;
  const isUnsupported = Boolean(value) && !options.includes(value);

  return (
    <div className="space-y-2">
      <label htmlFor="currency" className="text-sm font-medium">Currency</label>
      <select
        id="currency"
        value={value}
        onChange={(event) => onValueChange?.(event.target.value)}
        aria-invalid={isUnsupported}
        className="w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm"
      >
        <option value="">Select currency</option>
        {isUnsupported && <option value={value}>{value} (unsupported)</option>}
        {options.map((asset) => <option key={asset} value={asset}>{asset}</option>)}
      </select>
      {isUnsupported && (
        <p className="text-sm text-destructive">{value} is no longer supported. Select an available currency.</p>
      )}
    </div>
  );
}
