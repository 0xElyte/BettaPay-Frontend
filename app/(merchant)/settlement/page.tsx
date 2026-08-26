"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Button } from '@/components/ui';
import { NetworkTooltip } from '@/components/ui';
import { CurrencyDisplay } from '@/components/shared';
import { StatusBadge } from '@/components/shared';
import {
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Banknote,
  ChevronRight,
  Receipt,
  ExternalLink,
} from 'lucide-react';
import { getStellarExplorerTxUrl } from '@/lib/utils/explorer';
import { useWalletStore } from '@/lib/store/walletStore';
import { EmptyState, ErrorDisplay, ExportMenu } from '@/components/shared';
import { useOfflineStore } from '@/lib/store/offlineStore';
import { useAuthStore } from '@/lib/store/authStore';
import { SettlementConfirmation } from '@/components/settlement/SettlementConfirmation';
import { InvoiceDownloadButton, BatchInvoiceDownload } from '@/components/settlement/InvoiceGenerator';
import { StatCard } from '@/components/shared';
import { memo } from 'react';
import { useSettlements, useMerchantBankAccount, type ApiSettlement } from '@/lib/api/hooks';

type Settlement = ApiSettlement;

interface SettlementItemProps {
  settlement: Settlement;
}

const SettlementItem = memo(function SettlementItem({ settlement: s }: SettlementItemProps) {
  const network = useWalletStore((s) => s.network);
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-border hover:bg-muted/50 transition-all">
      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
        <Building2 className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{s.bankName ?? 'Bank'} · {s.accountNumber ?? '—'}</p>
        <p className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-foreground"><CurrencyDisplay amount={s.amountUsdc} /></p>
        <p className="text-xs text-muted-foreground">₦{(s.amountNgn ?? 0).toLocaleString()}</p>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={s.status as 'completed' | 'pending' | 'failed'} />
        {s.status.toUpperCase() === 'COMPLETED' && <InvoiceDownloadButton settlement={s} />}
        {s.txHash && (
          <a
            href={getStellarExplorerTxUrl(s.txHash, network)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on Stellar Explorer"
          >
            <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] rounded-lg">
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </a>
        )}
      </div>
    </div>
  );
});

export default function SettlementPage() {
  const { data: settlements, isLoading, error: fetchError, refetch } = useSettlements();
  const [settlementsError, setSettlementsError] = useState(false);
  const { user } = useAuthStore();
  const { data: bankAccount, isLoading: bankLoading } = useMerchantBankAccount(user?.id);
  const isOnline = useOfflineStore((s) => s.isOnline);
  const [settlementOpen, setSettlementOpen] = useState(false);

  // Compute stats from real data
  const available = settlements.filter(s => s.status === 'PENDING').reduce((sum, s) => sum + s.amountUsdc, 0);
  const pending = settlements.filter(s => s.status === 'PROCESSING').reduce((sum, s) => sum + s.amountUsdc, 0);
  const totalSettled = settlements.filter(s => s.status === 'COMPLETED').reduce((sum, s) => sum + s.amountUsdc, 0);
  const availableNgn = settlements.filter(s => s.status === 'PENDING').reduce((sum, s) => sum + (s.amountNgn ?? 0), 0);

  // Export the complete settlement history (no paging on this view), so the
  // CSV contains every row shown by the history list.
  const exportRows = useMemo(
    () =>
      settlements.map((s) => [
        s.createdAt,
        s.bankName,
        s.accountNumber,
        s.amountUsdc,
        s.amountNgn ?? 0,
        s.status,
        s.txHash,
      ]),
    [settlements],
  );

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">Finance</p>
          <h1 className="text-3xl font-bold text-foreground">Settlement</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Convert your USDC balance to Nigerian Naira and settle to your bank account.
          </p>
        </div>
        <NetworkTooltip show={!isOnline}>
          <Button
            disabled={!isOnline}
            aria-disabled={!isOnline}
            onClick={() => setSettlementOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl h-10 px-5 text-sm shadow-button"
          >
            <Banknote className="w-4 h-4 mr-2" />
            Initiate Settlement
          </Button>
        </NetworkTooltip>
        <Button 
          variant="outline" 
          className="rounded-xl h-10 px-5 text-sm font-semibold text-muted-foreground"
          onClick={() => setSettlementsError(!settlementsError)}
        >
          {settlementsError ? "Reset API" : "Simulate Error"}
        </Button>
      </div>

      <SettlementConfirmation
        isOpen={settlementOpen}
        onClose={() => setSettlementOpen(false)}
      />

      {/* Balance summary */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        <StatCard
          title="Available to Settle"
          value={<CurrencyDisplay amount={available} />}
          color="amber"
          trend={{ label: `≈ ₦${availableNgn.toLocaleString()}` }}
        />
        <StatCard
          title="Pending Settlement"
          value={<CurrencyDisplay amount={pending} />}
          trend={{ icon: Clock, label: 'Processing', color: 'text-primary' }}
        />
        <StatCard
          title="Total Settled (30d)"
          value={<CurrencyDisplay amount={totalSettled} />}
          trend={{ icon: CheckCircle2, label: 'All completed', color: 'text-emerald-600' }}
        />
      </div>

      {/* Settlement history */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">Settlement History</CardTitle>
            <CardDescription>All your past USDC → NGN conversions</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <BatchInvoiceDownload settlements={settlements} />
            <NetworkTooltip show={!isOnline}>
              <ExportMenu
                filename="settlements"
                headers={['Date', 'Bank', 'AccountNumber', 'AmountUSDC', 'AmountNGN', 'Status', 'TxHash']}
                rows={exportRows}
                label="Export CSV"
                size="sm"
                disabled={!isOnline}
                className="border-border text-muted-foreground rounded-xl"
              />
            </NetworkTooltip>
          </div>
        </CardHeader>
        <CardContent>
          {settlementsError || fetchError ? (
            <div className="py-12">
              <ErrorDisplay
                message={fetchError ?? 'Failed to load settlement history'}
                onRetry={() => { setSettlementsError(false); refetch(); }}
              />
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : settlements.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No settlements yet"
              description="Your USDC → NGN conversion history will appear here once you initiate a settlement. Set up your bank account in Settings first."
              action={{ label: 'Initiate Settlement', onClick: () => setSettlementOpen(true) }}
            />
          ) : (
            <div className="space-y-3">
              {settlements.map((s) => (
                <SettlementItem key={s.id} settlement={s} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bank account config notice */}
      {!bankLoading && !bankAccount && (
        <Card className="border border-primary/30 bg-primary/10">
          <CardContent className="flex items-start gap-4 p-5">
            <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary">Bank account not configured</p>
              <p className="text-xs text-primary mt-0.5">
                Add your Nigerian bank account in Settings to enable automatic settlements.
              </p>
            </div>
            <Button variant="ghost" className="text-primary hover:bg-primary/20 rounded-xl text-xs h-8 px-3 flex-shrink-0">
              Go to Settings <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}
      {!bankLoading && bankAccount && (
        <Card className="border border-success/30 bg-success/5">
          <CardContent className="flex items-start gap-4 p-5">
            <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-success">Bank account configured</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {bankAccount.bankName} · {'\u2022'.repeat(Math.max(0, bankAccount.accountNumber.length - 4))}{bankAccount.accountNumber.slice(-4)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
