"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, Circle, XCircle, AlertTriangle } from "lucide-react";

/** Backend-driven settlement progress — replaces synthetic step timing. */
export type SettlementProgressStatus =
  | "idle"
  | "signing"
  | "submitting"
  | "confirming"
  | "completed"
  | "failed";

interface TransactionProgressProps {
  /** Backend-derived status. When omitted, `currentStep` fallback is used for backwards-compat. */
  status?: SettlementProgressStatus;
  /** Zero-based index (0..2) where failure occurred. Required when status==='failed'. */
  failedStep?: number | null;
  /** @deprecated — prefer `status`. Kept for existing callers migrated incrementally. */
  currentStep?: number;
}

const STEPS: Array<{ label: string; description: string; key: Exclude<SettlementProgressStatus, "idle" | "completed" | "failed"> }> = [
  { key: "signing", label: "Freighter Signing", description: "Sign transaction in your Freighter wallet" },
  { key: "submitting", label: "Horizon Submission", description: "Broadcasting to Stellar network" },
  { key: "confirming", label: "Ledger Confirmation", description: "Waiting for on-chain finality" },
];

const STATUS_TO_INDEX: Record<SettlementProgressStatus, number> = {
  idle: -1,
  signing: 0,
  submitting: 1,
  confirming: 2,
  completed: 3,
  failed: -1, // resolved via failedStep
};

function deriveState(
  status: SettlementProgressStatus | undefined,
  failedStep: number | null | undefined,
  currentStep: number | undefined,
): { activeIndex: number; completedUntil: number; failedIndex: number | null; isCompleted: boolean } {
  // Backwards compat: legacy callers pass only currentStep (0..3)
  if (status === undefined && currentStep !== undefined) {
    // Mirror original semantics: currentStep is the active index, >index = completed
    const active = currentStep;
    const completedUntil = currentStep - 1;
    return { activeIndex: active >= 0 && active < STEPS.length ? active : -1, completedUntil, failedIndex: null, isCompleted: currentStep >= STEPS.length };
  }

  const s = status ?? "idle";
  if (s === "completed") {
    return { activeIndex: -1, completedUntil: STEPS.length - 1, failedIndex: null, isCompleted: true };
  }
  if (s === "failed") {
    const f = typeof failedStep === "number" && failedStep >= 0 && failedStep < STEPS.length ? failedStep : 0;
    return { activeIndex: -1, completedUntil: f - 1, failedIndex: f, isCompleted: false };
  }
  // signing / submitting / confirming / idle — indeterminate spinner on active step, no synthetic auto-advance
  const activeIndex = STATUS_TO_INDEX[s];
  return { activeIndex, completedUntil: activeIndex - 1, failedIndex: null, isCompleted: false };
}

export const TransactionProgress = ({ status, failedStep, currentStep }: TransactionProgressProps) => {
  const { activeIndex, completedUntil, failedIndex, isCompleted } = deriveState(status, failedStep, currentStep);
  return (
    <div className="space-y-6 py-4" role="progressbar" aria-valuemin={0} aria-valuemax={STEPS.length} aria-valuenow={isCompleted ? STEPS.length : Math.max(0, activeIndex + 1)}>
      {STEPS.map((step, index) => {
        const isCompletedStep = isCompleted || index <= completedUntil;
        const isFailed = failedIndex === index;
        const isActive = activeIndex === index && !isFailed && !isCompleted;
        const isPending = !isCompletedStep && !isFailed && !isActive;

        return (
          <div key={step.label} className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500",
                  isFailed && "bg-destructive/15",
                  isCompletedStep && !isFailed && "bg-success/20 dark:bg-success/10",
                  isActive && "bg-primary/20",
                  isPending && "bg-muted"
                )}
                aria-current={isActive ? "step" : undefined}
              >
                {isFailed ? (
                  <XCircle className="w-5 h-5 text-destructive" />
                ) : isCompletedStep ? (
                  <CheckCircle2 className="w-5 h-5 text-success dark:text-emerald-400" />
                ) : isActive ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" aria-label={`${step.label} in progress`} />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/40" />
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-px h-10 mt-1 transition-all duration-500",
                    isCompletedStep && !isFailed ? "bg-success/40 dark:bg-emerald-700" : "bg-border"
                  )}
                />
              )}
            </div>
            <div className="pt-1">
              <p
                className={cn(
                  "text-sm font-semibold transition-colors flex items-center gap-1.5",
                  isFailed && "text-destructive",
                  isCompletedStep && !isFailed && "text-success dark:text-emerald-400",
                  isActive && "text-foreground",
                  isPending && "text-muted-foreground/50"
                )}
              >
                {step.label}
                {isFailed && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
              </p>
              <p
                className={cn(
                  "text-xs mt-0.5 transition-colors",
                  isFailed && "text-destructive/80",
                  isCompletedStep && !isFailed && "text-success/70 dark:text-emerald-400/70",
                  isActive && "text-muted-foreground",
                  isPending && "text-muted-foreground/40"
                )}
              >
                {isFailed ? "Failed — see error below" : step.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
