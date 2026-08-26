'use client';

import { useState } from 'react';
import { AlertTriangle, Clock3, Laptop, MapPin, ShieldCheck } from 'lucide-react';
import { useAuthSessions } from '@/lib/api/hooks';
import { useNotify } from '@/lib/hooks/useNotify';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import type { AuthSession } from '@/lib/types';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function SessionRow({
  session,
  onRevoke,
}: {
  session: AuthSession;
  onRevoke: (session: AuthSession) => void;
}) {
  const isRevoked = session.status === 'revoked';
  const isExpired = session.status === 'expired';

  return (
    <div className="flex flex-col gap-4 border-b border-border p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Laptop className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{session.device}</p>
            {session.isCurrent && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                This device
              </span>
            )}
            {(isRevoked || isExpired) && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {isRevoked ? 'Revoked' : 'Expired'}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {session.ipAddress}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> Last active {formatDate(session.lastActivityAt)}
            </span>
            <span>Expires {formatDate(session.expiresAt)}</span>
            {session.revokedAt && <span>Revoked {formatDate(session.revokedAt)}</span>}
          </div>
        </div>
      </div>

      {!session.isCurrent && !isRevoked && !isExpired && (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onRevoke(session)}
          className="self-start sm:self-auto"
        >
          Revoke session
        </Button>
      )}
    </div>
  );
}

export default function SessionsPage() {
  const { data, isLoading, error, revokeSession, isRevoking } = useAuthSessions();
  const notify = useNotify();
  const [sessionToRevoke, setSessionToRevoke] = useState<AuthSession | null>(null);

  const handleRevoke = async () => {
    if (!sessionToRevoke) return;

    try {
      await revokeSession(sessionToRevoke.id);
      notify.success('Session revoked');
      setSessionToRevoke(null);
    } catch {
      notify.error('Failed to revoke session');
    }
  };

  return (
    <div className="space-y-8 pb-8">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">Account</p>
        <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground">
          <ShieldCheck className="h-7 w-7" aria-hidden="true" /> Sessions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review where your account is signed in and remove access from devices you do not recognize.
        </p>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active sessions</CardTitle>
          <CardDescription>These devices currently have access to your account.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading sessions...</p>
          ) : data.active.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No active sessions found.</p>
          ) : (
            data.active.map((session) => (
              <SessionRow key={session.id} session={session} onRevoke={setSessionToRevoke} />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session history</CardTitle>
          <CardDescription>Revoked and expired sessions are kept here for review.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {data.history.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No revoked or expired sessions.</p>
          ) : (
            data.history.map((session) => (
              <SessionRow key={session.id} session={session} onRevoke={setSessionToRevoke} />
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(sessionToRevoke)} onOpenChange={(open) => !open && setSessionToRevoke(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke this session?</DialogTitle>
            <DialogDescription>
              {sessionToRevoke?.device} will be signed out immediately and will need to authenticate again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSessionToRevoke(null)} disabled={isRevoking}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={isRevoking}>
              {isRevoking ? 'Revoking...' : 'Revoke session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
