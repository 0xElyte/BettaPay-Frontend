"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  CurrencyDisplay,
  EmptyState,
  ErrorDisplay,
  StatusBadge,
} from "@/components/shared";
import {
  useSettlements,
  useSettlementBulkAction,
  type SettlementAction,
  type SettlementBulkActionResponse,
  type SettlementActionResult,
  type ApiSettlement,
} from "@/lib/api/hooks";
import {
  getEffectiveRule,
  formatFeeBps,
  formatDelay,
  formatAutoSettle,
} from "@/lib/utils/settlementRules";
import { useNotify } from "@/lib/hooks/useNotify";
import { formatDate } from "@/lib/utils/format";
import { CheckCircle2, XCircle, Pause, RefreshCcw, AlertCircle, Building2 } from "lucide-react";

function isPending(s: ApiSettlement) {
  return s.status.toUpperCase() === "PENDING";
}

export default function SettlementActionsPage() {
  const router = useRouter();
  const { data: settlements, isLoading, error, refetch } = useSettlements();
  const notify = useNotify();
  const bulk = useSettlementBulkAction();

  const pending = useMemo(
    () => settlements.filter(isPending),
    [settlements]
  );

  // Selection persists across refetch — keyed by stable `id`, not index.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [lastResponse, setLastResponse] = useState<SettlementBulkActionResponse | null>(null);

  // Prune ids that are no longer pending (e.g. after they were approved),
  // but otherwise keep the set intact across background refetches.
  // Stable row ids: selection keyed by settlement.id survives data refetch.
  useEffect(() => {
    const pendingIds = new Set(pending.map((s) => s.id));
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set<string>();
      let changed = false;
      prev.forEach((id) => {
        if (pendingIds.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [pending]);

  const allSelected = pending.length > 0 && pending.every((s) => selectedIds.has(s.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(pending.map((s) => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [pending]);

  const resultById = useMemo(() => {
    if (!lastResponse) return new Map<string, SettlementActionResult>();
    return new Map<string, SettlementActionResult>(lastResponse.results.map((r) => [r.id, r]));
  }, [lastResponse]);

  const handleAction = useCallback(async (action: SettlementAction) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      const res = await bulk.mutateAsync({ action, settlementIds: ids });
      setLastResponse(res);
      const { requested, succeeded, failed } = res.summary;
      // N of M reporting — never all-or-nothing
      const summaryText = `${succeeded} of ${requested} ${action === "approve" ? "approved" : action === "reject" ? "rejected" : "held"}`;
      if (failed === 0) {
        notify.success(summaryText);
      } else if (succeeded === 0) {
        notify.error(`${summaryText} — all failed`);
      } else {
        notify.info(`${summaryText}, ${failed} failed — see per-item results`);
      }
      // Keep failed ids selected so user can retry; clear succeeded ones
      if (failed > 0) {
        const failedIds = new Set(res.results.filter((r) => !r.success).map((r) => r.id));
        setSelectedIds(failedIds);
      } else {
        setSelectedIds(new Set());
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Bulk action failed";
      notify.error(msg);
    }
  }, [bulk, notify, selectedIds]);

  const actionDisabled = selectedIds.size === 0 || bulk.isPending;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">Finance · Settlement</p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settlement Actions</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review pending settlements, inspect the effective settlement rule, and approve, reject or hold in bulk.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => router.push("/settlement")}
            >
              Back to Settlement
            </Button>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
              className="rounded-xl"
              aria-label="Refresh settlements"
            >
              <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Pending Settlements</CardTitle>
            <CardDescription>
              {pending.length} pending · {selectedIds.size} selected
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => handleAction("approve")}
              disabled={actionDisabled}
              className="rounded-xl bg-success hover:bg-success/90 text-success-foreground"
              aria-label="Approve selected settlements"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve
            </Button>
            <Button
              onClick={() => handleAction("reject")}
              disabled={actionDisabled}
              variant="destructive"
              className="rounded-xl"
              aria-label="Reject selected settlements"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </Button>
            <Button
              onClick={() => handleAction("hold")}
              disabled={actionDisabled}
              variant="outline"
              className="rounded-xl"
              aria-label="Hold selected settlements"
            >
              <Pause className="w-4 h-4" />
              Hold
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Bulk summary — N of M, partial success clearly visible */}
          {lastResponse && (
            <div
              role="status"
              aria-live="polite"
              className={`mb-4 rounded-xl border p-4 flex flex-col gap-2 ${
                lastResponse.summary.failed === 0
                  ? "border-success/30 bg-success/5 text-success"
                  : lastResponse.summary.succeeded === 0
                  ? "border-destructive/30 bg-destructive/5 text-destructive"
                  : "border-warning/30 bg-warning/5 text-warning"
              }`}
            >
              <p className="text-sm font-semibold">
                {lastResponse.summary.succeeded} of {lastResponse.summary.requested} succeeded, {lastResponse.summary.failed} failed
              </p>
              <p className="text-xs opacity-80">
                Requested {lastResponse.summary.requested} · Succeeded {lastResponse.summary.succeeded} · Failed {lastResponse.summary.failed}
              </p>
              {/* Per-item results list */}
              <ul className="mt-2 space-y-1">
                {lastResponse.results.map((r) => (
                  <li key={r.id} className="text-xs flex items-center gap-2">
                    {r.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-destructive" />
                    )}
                    <span className="font-mono">{r.id}</span>
                    <span className="text-muted-foreground">→ {r.status}</span>
                    {r.error && <span className="text-destructive">· {r.error}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error ? (
            <ErrorDisplay message={error} onRetry={() => refetch()} />
          ) : isLoading ? (
            <div className="space-y-3" aria-busy="true">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : pending.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No pending settlements"
              description="All settlements have been reviewed. New pending settlements will appear here."
              action={{ label: "Refresh", onClick: () => refetch() }}
            />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          aria-label="Select all pending settlements"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected;
                          }}
                          onChange={(e) => toggleAll(e.target.checked)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 focus:ring-2"
                        />
                      </TableHead>
                      <TableHead>Settlement</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Settlement Rule</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pending.map((s) => {
                      const rule = getEffectiveRule(s);
                      const perItem = resultById.get(s.id);
                      const checked = selectedIds.has(s.id);
                      return (
                        <TableRow
                          key={s.id}
                          data-state={checked ? "selected" : undefined}
                          className="hover:bg-muted/30"
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              aria-label={`Select settlement ${s.id}`}
                              checked={checked}
                              onChange={(e) => toggleOne(s.id, e.target.checked)}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 focus:ring-2"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-mono font-semibold text-foreground">{s.id}</span>
                              <span className="text-xs text-muted-foreground">
                                {(s.bankName ?? "Bank") + " · " + (s.accountNumber ?? "—")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-semibold"><CurrencyDisplay amount={s.amountUsdc} /></span>
                              <span className="text-xs text-muted-foreground">₦{(s.amountNgn ?? 0).toLocaleString()}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={s.status} />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-xs">
                              <span className="font-medium text-foreground">
                                Fee {formatFeeBps(rule.feeBps)}
                              </span>
                              <span className="text-muted-foreground">
                                auto_settle {formatAutoSettle(rule.autoSettle)} · delay {formatDelay(rule.delay)}
                              </span>
                              <Badge
                                variant={rule.source === "merchant" ? "default" : rule.source === "default" ? "secondary" : "outline"}
                                className="w-fit text-[10px] px-1.5 py-0"
                              >
                                {rule.source}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(s.createdAt)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {perItem ? (
                              perItem.success ? (
                                <span className="inline-flex items-center gap-1 text-success">
                                  <CheckCircle2 className="w-3 h-3" /> {perItem.status}
                                </span>
                              ) : (
                                <span className="inline-flex flex-col gap-0.5 text-destructive">
                                  <span className="inline-flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {perItem.status}
                                  </span>
                                  {perItem.error && <span className="text-[11px]">{perItem.error}</span>}
                                </span>
                              )
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between p-3 border-t bg-muted/20 text-xs text-muted-foreground">
                <span>{selectedIds.size} of {pending.length} selected</span>
                <span className="hidden sm:inline">Selection persists across refetch · stable row ids: settlement.id</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
