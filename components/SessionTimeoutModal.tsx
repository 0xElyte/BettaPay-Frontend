'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button, Input } from '@/components/ui';
import { announce } from '@/lib/utils/announce';
import { AlertTriangle, Clock, LogOut, RefreshCcw, ShieldCheck, KeyRound } from 'lucide-react';

interface SessionTimeoutModalProps {
  open: boolean;
  secondsRemaining: number;
  isExtending?: boolean;
  onExtend: () => void;
  onLogout: () => void;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Warns the user before session expiration with active countdown and
 * a prominent re-authentication grace prompt in the final minute.
 */
export function SessionTimeoutModal({
  open,
  secondsRemaining,
  isExtending = false,
  onExtend,
  onLogout,
}: SessionTimeoutModalProps) {
  const [reauthPassword, setReauthPassword] = useState('');
  const isFinalMinute = secondsRemaining <= 60 && secondsRemaining > 0;

  useEffect(() => {
    if (open) {
      if (isFinalMinute) {
        announce(`Final minute of session. Re-authenticate now to prevent logout. ${secondsRemaining} seconds left.`);
      } else {
        announce(`Session expiring in ${secondsRemaining} seconds. Stay logged in to continue.`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isFinalMinute]);

  const handleReauthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExtend();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
              {isFinalMinute ? (
                <ShieldCheck className="w-5 h-5 text-warning animate-pulse" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-warning" />
              )}
            </div>
            <div>
              <DialogTitle>
                {isFinalMinute ? 'Re-authenticate Session' : 'Session Expiring'}
              </DialogTitle>
              <DialogDescription>
                {isFinalMinute
                  ? 'Final minute grace window: Confirm activity to prevent automatic logout.'
                  : 'Your session will expire due to inactivity.'}
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
          <p className="text-sm text-muted-foreground mt-2 text-center">
            {isFinalMinute
              ? 'Urgent: Session is about to expire'
              : 'Time remaining before automatic logout'}
          </p>
        </div>

        {isFinalMinute && (
          <form onSubmit={handleReauthSubmit} className="space-y-3 pt-2 border-t border-border/60">
            <div className="space-y-1">
              <label htmlFor="reauth-password" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-muted-foreground" /> Quick Re-auth (Optional)
              </label>
              <Input
                id="reauth-password"
                type="password"
                placeholder="Enter password to verify..."
                value={reauthPassword}
                onChange={(e) => setReauthPassword(e.target.value)}
                autoComplete="current-password"
                className="h-10 text-sm rounded-xl bg-muted border-border"
              />
            </div>
          </form>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onLogout}
            disabled={isExtending}
            className="w-full sm:w-auto rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
          <Button
            type="button"
            onClick={onExtend}
            disabled={isExtending}
            className="w-full sm:w-auto rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${isExtending ? 'animate-spin' : ''}`} />
            {isExtending ? 'Extending...' : isFinalMinute ? 'Re-authenticate & Stay Logged In' : 'Extend Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

