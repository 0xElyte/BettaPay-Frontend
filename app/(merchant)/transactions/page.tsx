"use client";

import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';
import { Card, CardContent, Input, Button, Skeleton, NetworkTooltip, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { StatusBadge, CopyAddress, CurrencyDisplay, ErrorDisplay, EmptyState, ExportMenu } from '@/components/shared';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { usePayments, type ApiPayment } from '@/lib/api/hooks';
import { formatDate } from '@/lib/utils/format';
import { sanitizeSearchQuery } from '@/lib/utils/sanitize';
import { Search, SearchX, ExternalLink } from 'lucide-react';
import { getStellarExplorerTxUrl } from '@/lib/utils/explorer';
import { useWalletStore } from '@/lib/store/walletStore';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TransactionDrawer } from '@/components/transactions/TransactionDrawer';
import { useOfflineStore } from '@/lib/store/offlineStore';

type Transaction = ApiPayment;

function isTransaction(value: unknown): value is Transaction {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'amountUsdc' in value &&
    'status' in value &&
    'createdAt' in value &&
    typeof (value as Transaction).id === 'string' &&
    typeof (value as Transaction).amountUsdc === 'number' &&
    typeof (value as Transaction).status === 'string' &&
    typeof (value as Transaction).createdAt === 'string'
  );
}

interface TransactionCardProps {
  tx: Transaction;
  onClick: (tx: Transaction) => void;
}

const TransactionCard = memo(function TransactionCard({ tx, onClick }: TransactionCardProps) {
  const network = useWalletStore((s) => s.network);
  return (
    <div
      className="border border-border/50 rounded-lg p-4 space-y-3 cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={() => onClick(tx)}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{formatDate(tx.createdAt)}</span>
        <StatusBadge status={tx.status} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Payer</span>
          <CopyAddress address={tx.payerAddress ?? ''} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Tx Hash</span>
          <div className="flex items-center gap-2">
            <CopyAddress address={tx.txHash ?? ''} />
            {tx.txHash && (
              <a
                href={getStellarExplorerTxUrl(tx.txHash, network)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View on Stellar Explorer"
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] rounded-lg">
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Source</span>
          <span className="text-sm text-muted-foreground">{tx.source ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Amount (USDC)</span>
          <CurrencyDisplay amount={tx.amountUsdc} currency="USDC" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Amount (NGN)</span>
          <CurrencyDisplay amount={tx.amountNgn} currency="NGN" showDecimals={false} />
        </div>
      </div>
    </div>
  );
});

interface TransactionRowProps {
  tx: Transaction;
  translateY: number;
  onClick: (tx: Transaction) => void;
}

// Rendered inline inside virtualItems.map(...) previously — every row got a
// brand-new inline JSX subtree on each parent render (e.g. every keystroke
// in the search input), so React re-rendered the entire visible table body
// even though debouncedSearch hadn't changed yet. Extracting a memoized row
// component gives React a props-based bailout, mirroring TransactionCard.
const TransactionRow = memo(function TransactionRow({ tx, translateY, onClick }: TransactionRowProps) {
  const network = useWalletStore((s) => s.network);
  return (
    <tr
      className="border-border/50 hover:bg-muted/30 cursor-pointer border-b"
      onClick={() => onClick(tx)}
      style={{ transform: `translateY(${translateY}px)` }}
    >
      <td className="text-muted-foreground whitespace-nowrap px-4 py-2 text-sm">
        {formatDate(tx.createdAt)}
      </td>
      <td className="px-4 py-2 text-sm">
        <CopyAddress address={tx.payerAddress ?? ''} />
      </td>
      <td className="px-4 py-2 text-sm">
        <CopyAddress address={tx.txHash ?? ''} />
      </td>
      <td className="text-muted-foreground px-4 py-2 text-sm">
        {tx.source ?? '—'}
      </td>
      <td className="text-right font-medium px-4 py-2 text-sm">
        <CurrencyDisplay amount={tx.amountUsdc} currency="USDC" />
      </td>
      <td className="text-right text-muted-foreground px-4 py-2 text-sm">
        <CurrencyDisplay amount={tx.amountNgn} currency="NGN" showDecimals={false} />
      </td>
      <td className="text-center px-4 py-2 text-sm">
        <StatusBadge status={tx.status} />
      </td>
      <td className="w-[80px] text-center px-4 py-2 text-sm">
        {tx.txHash && (
          <a
            href={getStellarExplorerTxUrl(tx.txHash, network)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on Stellar Explorer"
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] rounded-lg">
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </a>
        )}
      </td>
    </tr>
  );
});

export default function TransactionsPage() {
  const { data: payments, isLoading, error: fetchError, refetch } = usePayments();

  const [searchTerm, setSearchTerm] = useState('');
  const sanitizedOnChange = useCallback(
    (value: string) => setSearchTerm(sanitizeSearchQuery(value)),
    [],
  );
  const [debouncedSearch] = useDebounceValue(searchTerm, 300);

  const [statusFilter, setStatusFilter] = useState('all');
  const [assetFilter, setAssetFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');

  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [txError, setTxError] = useState(false);
  const isOnline = useOfflineStore((s) => s.isOnline);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return payments.filter(tx => {
      const matchesSearch =
        (tx.txHash ?? '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (tx.payerAddress ?? '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (tx.source ?? '').toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        tx.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesAsset =
        assetFilter === 'all' ||
        (assetFilter === 'USDC' && tx.amountUsdc > 0) ||
        (assetFilter === 'NGN' && (tx.amountNgn ?? 0) > 0);

      let matchesDate = true;
      if (dateRangeFilter !== 'all') {
        const txDate = new Date(tx.createdAt);
        const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 3600 * 24);
        if (dateRangeFilter === '7d') matchesDate = diffDays <= 7;
        if (dateRangeFilter === '30d') matchesDate = diffDays <= 30;
      }

      return matchesSearch && matchesStatus && matchesAsset && matchesDate;
    });
  }, [payments, debouncedSearch, statusFilter, assetFilter, dateRangeFilter]);

  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (assetFilter !== 'all' ? 1 : 0) + (dateRangeFilter !== 'all' ? 1 : 0);

  const handleClearFilters = () => {
    setStatusFilter('all');
    setAssetFilter('all');
    setDateRangeFilter('all');
  };

  // Export the FULL filtered dataset — never the virtualized visible slice —
  // so the downloaded CSV matches exactly what the filters/search show.
  const exportRows = useMemo(
    () =>
      filteredTransactions.map((tx) => [
        tx.createdAt,
        tx.payerAddress,
        tx.txHash,
        tx.source,
        tx.amountUsdc,
        tx.amountNgn ?? 0,
        tx.status,
      ]),
    [filteredTransactions],
  );

  const virtualizer = useVirtualizer({
    count: filteredTransactions.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
          <Card className="bg-card border-border/50 shadow-sm">
            <CardContent className="pt-4">
              <TableSkeleton rows={6} columns={7} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
              <p className="text-muted-foreground mt-1">
                View all your incoming payments and settlements.
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by hash, address, or label..."
                  className="w-full pl-9 bg-background/50 border-border/50 focus-visible:ring-ring"
                  value={searchTerm}
                  onChange={(e) => sanitizedOnChange(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
                  <SelectTrigger className="w-[120px] bg-card border-border/50">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={assetFilter} onValueChange={(val) => val && setAssetFilter(val)}>
                  <SelectTrigger className="w-[120px] bg-card border-border/50">
                    <SelectValue placeholder="Asset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assets</SelectItem>
                    <SelectItem value="USDC">USDC</SelectItem>
                    <SelectItem value="NGN">NGN</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateRangeFilter} onValueChange={(val) => val && setDateRangeFilter(val)}>
                  <SelectTrigger className="w-[130px] bg-card border-border/50">
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>

                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={handleClearFilters}
                  >
                    Clear all filters
                  </Button>
                )}

                <NetworkTooltip show={!isOnline}>
                  <ExportMenu
                    id="export-csv-btn"
                    filename="transactions"
                    headers={['Date', 'Payer', 'TxHash', 'Source', 'AmountUSDC', 'AmountNGN', 'Status']}
                    rows={exportRows}
                    disabled={!isOnline}
                    className="border-border/50 bg-card"
                  />
                </NetworkTooltip>

                <Button
                  variant="outline"
                  className="border-border/50 bg-card"
                  onClick={() => setTxError(!txError)}
                >
                  {txError ? "Reset API" : "Simulate Error"}
                </Button>
              </div>
            </div>
          </div>

          <Card className="bg-card border-border/50 shadow-sm">
            <CardContent className="pt-4">
              {txError || fetchError ? (
                <div className="py-12">
                  <ErrorDisplay
                    message={fetchError ?? 'Failed to load transactions'}
                    onRetry={() => { setTxError(false); refetch(); }}
                  />
                </div>
              ) : (
                <>
                  {filteredTransactions.length === 0 ? (
                    <EmptyState
                      icon={SearchX}
                      title={searchTerm || activeFilterCount > 0 ? 'No transactions match filters' : 'No transactions yet'}
                      description={
                        searchTerm || activeFilterCount > 0
                          ? 'Try adjusting your search terms or clearing active filters.'
                          : 'Transactions will appear here once you receive payments through your payment links.'
                      }
                      action={
                        searchTerm || activeFilterCount > 0
                          ? {
                              label: 'Clear filters',
                              onClick: () => {
                                setSearchTerm('');
                                setStatusFilter('all');
                                setAssetFilter('all');
                                setDateRangeFilter('all');
                              }
                            }
                          : undefined
                      }
                    />
                  ) : (
                    <div className="rounded-md border border-border/50 overflow-hidden hidden md:block">
                      <table className="w-full border-collapse">
                        <thead className="bg-muted/50 sticky top-0 z-10">
                          <tr className="border-border/50">
                            <th className="w-[180px] px-4 py-2 text-left text-sm font-medium">Date</th>
                            <th className="px-4 py-2 text-left text-sm font-medium">Payer</th>
                            <th className="px-4 py-2 text-left text-sm font-medium">Tx Hash</th>
                            <th className="px-4 py-2 text-left text-sm font-medium">Source</th>
                            <th className="px-4 py-2 text-right text-sm font-medium">Amount (USDC)</th>
                            <th className="px-4 py-2 text-right text-sm font-medium">Amount (NGN)</th>
                            <th className="px-4 py-2 text-center text-sm font-medium">Status</th>
                            <th className="w-[80px] px-4 py-2 text-center text-sm font-medium">Explorer</th>
                          </tr>
                        </thead>
                      </table>
                      <div
                        ref={tableContainerRef}
                        className="h-[600px] overflow-y-auto border-t border-border/50"
                      >
                        <div style={{ height: `${totalSize}px`, position: 'relative' }}>
                          <table className="w-full border-collapse">
                            <tbody>
                              {virtualItems.map((virtualItem) => {
                                const tx = filteredTransactions[virtualItem.index];
                                return (
                                  <TransactionRow
                                    key={virtualItem.key}
                                    tx={tx}
                                    translateY={virtualItem.start}
                                    onClick={setSelectedTx}
                                  />
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="md:hidden space-y-3">
                    {filteredTransactions.map((tx) => (
                      <TransactionCard
                        key={tx.id}
                        tx={tx}
                        onClick={setSelectedTx}
                      />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <TransactionDrawer
        transaction={selectedTx && isTransaction(selectedTx) ? selectedTx : null}
        isOpen={!!selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </div>
  );
}
