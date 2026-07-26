'use client';

import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui';
import { announce } from '@/lib/utils/announce';

interface SessionTimeoutModalProps {
  open: boolean;
  secondsRemaining: number;
  onExtend: () => void;
  onLogout: () => void;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Purely presentational — all countdown/timer logic lives in useSessionTimeout;
 * this component only renders whatever `secondsRemaining` it's given. Focus
 * trapping and Escape-to-dismiss come for free from the shared Dialog
 * primitive, matching every other modal in the app.
 */
export function SessionTimeoutModal({
  open,
  secondsRemaining,
  onExtend,
  onLogout,
}: SessionTimeoutModalProps) {
  // Explicitly announce the warning once when it appears — Dialog already
  // moves focus and exposes the title/description via aria-labelledby/
  // aria-describedby, but this mirrors the codebase's announce() convention
  // (see useNotify) so the warning is reliably read out even if focus
  // handling alone doesn't trigger it in a given screen reader.
  useEffect(() => {
    if (open) {
      announce(`Session expiring in ${secondsRemaining} seconds. Stay logged in to continue.`);
    }
    // Only announce on the open transition, not on every countdown tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <DialogTitle>Session Expiring</DialogTitle>
              <DialogDescription>
                Your session will expire due to inactivity.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <Clock className="w-12 h-12 text-warning/60 absolute" />
            <span className="text-2xl font-bold text-foreground z-10">
              {formatCountdown(secondsRemaining)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Time remaining before automatic logout
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onLogout}
            className="w-full sm:w-auto rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
          <Button
            onClick={onExtend}
            className="w-full sm:w-auto rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Extend Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
