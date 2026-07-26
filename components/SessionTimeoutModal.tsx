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
  onDismiss: () => void;
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
  onDismiss,
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
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Session Expiring</DialogTitle>
          <DialogDescription>
            Your session will expire due to inactivity in{' '}
            <span className="font-semibold text-foreground">
              {secondsRemaining} second{secondsRemaining !== 1 ? 's' : ''}
            </span>
            .
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onDismiss}>Stay Logged In</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
