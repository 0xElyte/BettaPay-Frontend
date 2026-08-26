'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWalletStore } from '@/lib/store/walletStore';
import { formatRelativeTime, formatDate } from '@/lib/utils/format';

const NETWORK_URLS: Record<string, string> = {
  testnet: 'https://horizon-testnet.stellar.org',
  public: 'https://horizon.stellar.org',
};

export interface StellarPayment {
  id: string;
  type: 'receive' | 'send';
  label: string;
  amount: number;
  assetCode: string;
  timestamp: string;
  formattedDate?: string;
  txHash: string;
  counterparty: string;
}

function getNetwork(): 'testnet' | 'public' {
  const val = (process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet').toLowerCase();
  if (val === 'mainnet' || val === 'public') return 'public';
  return 'testnet';
}

export function useTransactionHistory(limit = 20, explicitAddress?: string | null) {
  const [transactions, setTransactions] = useState<StellarPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const storeAddress = useWalletStore((s) => s.address);
  const network = useWalletStore((s) => s.network);

  const address = explicitAddress || storeAddress;

  const fetchTransactions = useCallback(async () => {
    if (!address) {
      setTransactions([]);
      setLoading(false);
      return;
    }

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
      const records = data._embedded?.records || [];
      const payments: StellarPayment[] = records.map(
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
              : record.asset_code || 'USDC';
          const counterparty = isReceive ? record.from : record.to;
          const shortAddress = counterparty
            ? `${counterparty.slice(0, 4)}...${counterparty.slice(-4)}`
            : '—';

          return {
            id: record.id,
            type: isReceive ? 'receive' : 'send',
            label: `Payment ${isReceive ? 'from' : 'to'} ${shortAddress}`,
            amount: parseFloat(record.amount),
            assetCode,
            timestamp: formatRelativeTime(record.created_at) || 'Just now',
            formattedDate: formatDate(record.created_at),
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
