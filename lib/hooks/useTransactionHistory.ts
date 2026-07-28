'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWalletStore } from '@/lib/store/walletStore';

const NETWORK_URLS: Record<string, string> = {
  testnet: 'https://horizon-testnet.stellar.org',
  public: 'https://horizon.stellar.org',
};

interface StellarPayment {
  id: string;
  type: 'receive' | 'send';
  label: string;
  amount: number;
  assetCode: string;
  timestamp: string;
  txHash: string;
  counterparty: string;
}

function getNetwork(): 'testnet' | 'public' {
  const val = (process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet').toLowerCase();
  if (val === 'mainnet' || val === 'public') return 'public';
  return 'testnet';
}

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const then = new Date(dateString);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHr > 0) return `${diffHr}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return 'Just now';
}

export function useTransactionHistory(limit = 20) {
  const [transactions, setTransactions] = useState<StellarPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const address = useWalletStore((s) => s.address);
  const network = useWalletStore((s) => s.network);

  const fetchTransactions = useCallback(async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    const horizonUrl = NETWORK_URLS[network] || NETWORK_URLS[getNetwork()];

    try {
      const response = await fetch(
        `${horizonUrl}/accounts/${address}/payments?limit=${limit}&order=desc`
      );

      if (!response.ok) {
        throw new Error(`Horizon error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const payments: StellarPayment[] = data._embedded.records.map(
        (record: {
          id: string;
          from: string;
          to: string;
          amount: string;
          asset_type: string;
          asset_code?: string;
          created_at: string;
          transaction_hash: string;
        }) => {
          const isReceive = record.to === address;
          const assetCode =
            record.asset_type === 'native'
              ? 'XLM'
              : record.asset_code || 'Unknown';
          const counterparty = isReceive ? record.from : record.to;
          const shortAddress = `${counterparty.slice(0, 4)}...${counterparty.slice(-4)}`;

          return {
            id: record.id,
            type: isReceive ? 'receive' : 'send',
            label: `Payment ${isReceive ? 'from' : 'to'} ${shortAddress}`,
            amount: parseFloat(record.amount),
            assetCode,
            timestamp: formatTimeAgo(record.created_at),
            txHash: record.transaction_hash,
            counterparty,
          };
        }
      );

      setTransactions(payments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [address, network, limit]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return { transactions, loading, error, refetch: fetchTransactions };
}
