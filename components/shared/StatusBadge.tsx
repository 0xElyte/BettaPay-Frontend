import { Badge } from '@/components/ui';
import { PAYMENT_STATUS, normalizePaymentStatus } from '@/lib/utils/constants';
import { STATUS_TONE_BADGE, type StatusTone } from '@/lib/status/palette';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, XCircle, Loader2, TimerOff } from 'lucide-react';

/** Supported payment statuses: pending, processing, success, and failed. */

interface StatusBadgeProps {
  status: string;
  className?: string;
}

type StatusConfig = {
  label: string;
  icon: React.ElementType;
  tone: StatusTone;
};

/**
 * One source of truth for badge appearance keyed on canonical status values.
 * Tones resolve to the audited `--status-*` palette, so every badge clears
 * WCAG AA in both themes (see `__tests__/status-contrast.test.ts`).
 */
const STATUS_CONFIG: Record<string, StatusConfig> = {
  [PAYMENT_STATUS.COMPLETED]: { label: 'Completed', icon: CheckCircle2, tone: 'ok' },
  [PAYMENT_STATUS.PENDING]: { label: 'Pending', icon: Clock, tone: 'warn' },
  [PAYMENT_STATUS.PROCESSING]: { label: 'Processing', icon: Loader2, tone: 'info' },
  [PAYMENT_STATUS.FAILED]: { label: 'Failed', icon: XCircle, tone: 'down' },
  [PAYMENT_STATUS.EXPIRED]: { label: 'Expired', icon: TimerOff, tone: 'neutral' },
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  // Normalise on display so any legacy or API-variant spelling maps correctly
  const canonical = normalizePaymentStatus(status);
  const config = STATUS_CONFIG[canonical] ?? {
    label: status,
    icon: Clock,
    tone: 'neutral' as StatusTone,
  };

  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn('gap-1 font-semibold', STATUS_TONE_BADGE[config.tone], className)}
    >
      <Icon
        className={cn('w-3 h-3', canonical === PAYMENT_STATUS.PROCESSING && 'animate-spin')}
        aria-hidden="true"
      />
      {config.label}
    </Badge>
  );
};
