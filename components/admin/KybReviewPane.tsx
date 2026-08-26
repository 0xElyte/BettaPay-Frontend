"use client";

/**
 * KybReviewPane
 *
 * Slide-in side panel that displays a merchant's KYB profile + documents
 * and lets an admin approve or reject the submission.
 *
 * - Fetches /api/admin/merchants/:id/kyb when a merchant is selected
 * - Posts decision to the same endpoint (POST)
 * - Calls onDecision() so the parent can update its list optimistically
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorDisplay } from "@/components/shared";
import {
  CheckCircle,
  XCircle,
  FileText,
  Building2,
  Globe,
  Phone,
  Mail,
  Hash,
  Calendar,
  X,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_TONE_BADGE, type StatusTone } from "@/lib/status/palette";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KybDocument {
  id: string;
  type: string;
  label: string;
  url: string | null;
  uploadedAt: string;
  verified: boolean;
}

interface MerchantKybProfile {
  merchantId: string;
  businessName: string;
  businessType: string;
  country: string;
  industry: string;
  contactEmail: string;
  phoneNumber: string | null;
  registrationNumber: string | null;
  taxId: string | null;
  websiteUrl: string | null;
  kybStatus: "unverified" | "pending" | "approved" | "rejected";
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  documents: KybDocument[];
}

interface KybReviewPaneProps {
  merchantId: string;
  onClose: () => void;
  onDecision: (merchantId: string, newStatus: "approved" | "rejected") => void;
}

// ─── Helper: status badge ─────────────────────────────────────────────────────

function KybStatusBadge({ status }: { status: MerchantKybProfile["kybStatus"] }) {
  // Tinted-alpha pairings such as `bg-orange-500/15 text-orange-600` sat around
  // 3.5:1 and failed AA. These map onto the audited status tones instead.
  const map: Record<
    MerchantKybProfile["kybStatus"],
    { label: string; tone: StatusTone }
  > = {
    pending: { label: "Pending Review", tone: "warn" },
    unverified: { label: "Unverified", tone: "neutral" },
    approved: { label: "Approved", tone: "ok" },
    rejected: { label: "Rejected", tone: "down" },
  };

  const { label, tone } = map[status] ?? { label: status, tone: "neutral" as StatusTone };
  const className = STATUS_TONE_BADGE[tone];
  return (
    <Badge variant="outline" className={cn("text-xs font-semibold", className)}>
      {label}
    </Badge>
  );
}

// ─── Helper: format date ──────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function PaneSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-32" />
      <div className="grid grid-cols-2 gap-3 mt-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </div>
      <Skeleton className="h-px w-full mt-4" />
      <div className="space-y-2 mt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function KybReviewPane({
  merchantId,
  onClose,
  onDecision,
}: KybReviewPaneProps) {
  const queryClient = useQueryClient();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    decision: "approved" | "rejected" | null;
    note: string;
  }>({ open: false, decision: null, note: "" });

  // ── Fetch KYB profile ──────────────────────────────────────────────────────

  const {
    data: kybData,
    isLoading,
    error: fetchError,
    refetch,
  } = useQuery<MerchantKybProfile>({
    queryKey: ["admin", "kyb", merchantId],
    queryFn: async () => {
      const res = await axios.get<{ data: MerchantKybProfile }>(
        `/api/admin/merchants/${merchantId}/kyb`,
        { withCredentials: true }
      );
      return res.data.data;
    },
    staleTime: 0,
  });

  // ── Post decision ──────────────────────────────────────────────────────────

  const mutation = useMutation({
    mutationFn: async ({
      decision,
      note,
    }: {
      decision: "approved" | "rejected";
      note: string;
    }) => {
      const res = await axios.post<{
        data: { merchantId: string; kybStatus: string };
      }>(
        `/api/admin/merchants/${merchantId}/kyb`,
        { decision, note: note.trim() || null },
        { withCredentials: true }
      );
      return res.data.data;
    },
    onSuccess: (result) => {
      // Refresh cached KYB detail and the KYB list
      void queryClient.invalidateQueries({ queryKey: ["admin", "kyb", merchantId] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "kyb-list"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
      onDecision(merchantId, result.kybStatus as "approved" | "rejected");
      setConfirmDialog({ open: false, decision: null, note: "" });
    },
  });

  // ── Prompt confirmation dialog ─────────────────────────────────────────────

  const openConfirm = (decision: "approved" | "rejected") => {
    setConfirmDialog({ open: true, decision, note: "" });
  };

  const submitDecision = () => {
    if (!confirmDialog.decision) return;
    mutation.mutate({
      decision: confirmDialog.decision,
      note: confirmDialog.note,
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────

  const profile = kybData;
  const alreadyReviewed =
    profile?.kybStatus === "approved" || profile?.kybStatus === "rejected";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div>
          <h2 className="text-lg font-semibold leading-tight">
            {isLoading ? (
              <Skeleton className="h-5 w-40" />
            ) : (
              profile?.businessName ?? "KYB Review"
            )}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Merchant ID: {merchantId}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
          aria-label="Close review pane"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <PaneSkeleton />
        ) : fetchError ? (
          <div className="p-6">
            <ErrorDisplay
              message="Failed to load KYB profile."
              onRetry={() => void refetch()}
            />
          </div>
        ) : !profile ? null : (
          <div className="p-6 space-y-6">
            {/* Status + Submission info */}
            <div className="flex items-center gap-3 flex-wrap">
              <KybStatusBadge status={profile.kybStatus} />
              {profile.submittedAt && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Submitted {fmtDate(profile.submittedAt)}
                </span>
              )}
            </div>

            {/* Rejection reason (shown when rejected) */}
            {profile.kybStatus === "rejected" && profile.rejectionReason && (
              <div className="rounded-lg border border-status-down-border bg-status-down-bg p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-status-down shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-status-down">
                    Rejection reason
                  </p>
                  <p className="text-sm text-status-down mt-0.5">
                    {profile.rejectionReason}
                  </p>
                </div>
              </div>
            )}

            {/* Business Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Business Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <InfoRow
                  icon={<Building2 className="w-3.5 h-3.5" />}
                  label="Business Name"
                  value={profile.businessName}
                />
                <InfoRow
                  icon={<Hash className="w-3.5 h-3.5" />}
                  label="Business Type"
                  value={capitalize(profile.businessType.replace("_", " "))}
                />
                <InfoRow
                  icon={<Globe className="w-3.5 h-3.5" />}
                  label="Country"
                  value={profile.country}
                />
                <InfoRow
                  icon={<Building2 className="w-3.5 h-3.5" />}
                  label="Industry"
                  value={profile.industry}
                />
                <InfoRow
                  icon={<Mail className="w-3.5 h-3.5" />}
                  label="Contact Email"
                  value={profile.contactEmail}
                />
                <InfoRow
                  icon={<Phone className="w-3.5 h-3.5" />}
                  label="Phone Number"
                  value={profile.phoneNumber}
                />
                <InfoRow
                  icon={<Hash className="w-3.5 h-3.5" />}
                  label="Registration No."
                  value={profile.registrationNumber}
                />
                <InfoRow
                  icon={<Hash className="w-3.5 h-3.5" />}
                  label="Tax ID"
                  value={profile.taxId}
                />
                {profile.websiteUrl && (
                  <InfoRow
                    icon={<Globe className="w-3.5 h-3.5" />}
                    label="Website"
                    value={
                      <a
                        href={profile.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline hover:no-underline truncate"
                      >
                        {profile.websiteUrl}
                      </a>
                    }
                  />
                )}
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Submitted Documents ({profile.documents.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {profile.documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No documents uploaded yet.
                  </p>
                ) : (
                  profile.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {doc.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded {fmtDate(doc.uploadedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {doc.url ? (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary underline hover:no-underline"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            No file
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Review history */}
            {profile.reviewedAt && (
              <div className="text-xs text-muted-foreground space-y-0.5 border rounded-lg p-3">
                <p>
                  <span className="font-medium">Reviewed at:</span>{" "}
                  {fmtDate(profile.reviewedAt)}
                </p>
                <p>
                  <span className="font-medium">Reviewed by:</span>{" "}
                  {profile.reviewedBy ?? "—"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action footer — only shown for pending/unverified */}
      {profile && !isLoading && !alreadyReviewed && (
        <div className="shrink-0 border-t px-6 py-4 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-status-down-border text-status-down hover:bg-status-down-bg"
            onClick={() => openConfirm("rejected")}
            disabled={mutation.isPending}
          >
            <XCircle className="w-4 h-4 mr-1.5" />
            Reject
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => openConfirm("approved")}
            disabled={mutation.isPending}
          >
            <CheckCircle className="w-4 h-4 mr-1.5" />
            Approve
          </Button>
        </div>
      )}

      {/* Already-reviewed message */}
      {profile && !isLoading && alreadyReviewed && (
        <div className="shrink-0 border-t px-6 py-3">
          <p className="text-xs text-muted-foreground text-center">
            This merchant has already been{" "}
            <span className="font-medium">{profile.kybStatus}</span>.
          </p>
        </div>
      )}

      {/* Mutation error */}
      {mutation.error && (
        <div className="shrink-0 px-6 pb-3">
          <ErrorDisplay message="Failed to submit decision. Please try again." />
        </div>
      )}

      {/* Confirmation dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog({ open: false, decision: null, note: "" });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.decision === "approved"
                ? "Approve KYB Submission"
                : "Reject KYB Submission"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.decision === "approved"
                ? "This will mark the merchant as KYB-approved and write an audit log entry."
                : "This will reject the merchant's KYB submission. Please provide a reason."}
            </DialogDescription>
          </DialogHeader>

          {confirmDialog.decision === "rejected" && (
            <div className="mt-2">
              <label
                htmlFor="rejection-note"
                className="block text-sm font-medium mb-1.5"
              >
                Rejection reason{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </label>
              <textarea
                id="rejection-note"
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="e.g. Documents are expired or illegible"
                value={confirmDialog.note}
                onChange={(e) =>
                  setConfirmDialog((prev) => ({
                    ...prev,
                    note: e.target.value,
                  }))
                }
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog({ open: false, decision: null, note: "" })
              }
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={submitDecision}
              disabled={mutation.isPending}
              className={
                confirmDialog.decision === "approved"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }
            >
              {mutation.isPending
                ? "Submitting…"
                : confirmDialog.decision === "approved"
                ? "Confirm Approval"
                : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode | string | null | undefined;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground flex items-center gap-1">
        <span className="text-muted-foreground/60">{icon}</span>
        {label}
      </dt>
      <dd className="text-sm font-medium">
        {value != null && value !== "" ? value : (
          <span className="text-muted-foreground italic">—</span>
        )}
      </dd>
    </div>
  );
}

// ─── Capitalize ───────────────────────────────────────────────────────────────

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
