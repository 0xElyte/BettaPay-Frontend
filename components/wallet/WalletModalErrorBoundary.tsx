"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui";
import { Button } from "@/components/ui";

interface WalletModalErrorBoundaryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Recreate the dynamically-imported WalletModal so the failed chunk is re-fetched. */
  onRetry: () => void;
  children: ReactNode;
}

interface WalletModalErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches chunk-load failures from the dynamically-imported WalletModal
 * (network error, stale deploy, etc.) and shows a retry prompt instead of
 * leaving WalletModalFallback's skeleton on screen forever.
 */
export class WalletModalErrorBoundary extends Component<
  WalletModalErrorBoundaryProps,
  WalletModalErrorBoundaryState
> {
  state: WalletModalErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WalletModalErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Failed to load wallet modal", error);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    this.props.onRetry();
  };

  render() {
    const { open, onOpenChange, children } = this.props;

    if (!this.state.hasError) return children;
    if (!open) return null;

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              Failed to load wallet modal
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            We couldn&apos;t load the wallet connector. Check your connection and try again.
          </p>

          <DialogFooter>
            <Button onClick={this.handleRetry} className="gap-2">
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              Retry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
}
