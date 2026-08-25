import { Badge } from '@/components/ui';
import { PAYMENT_STATUS, normalizePaymentStatus } from '@/lib/utils/constants';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, XCircle, Loader2, TimerOff } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

type StatusConfig = {
  label: string;
  icon: React.ElementType;
  className: string;
};

/** One source of truth for badge appearance keyed on canonical status values. */
const STATUS_CONFIG: Record<string, StatusConfig> = {
  [PAYMENT_STATUS.COMPLETED]: {
    label: 'Completed',
    icon: CheckCircle2,
    className: 'bg-success/10 text-success hover:bg-success/20 border-success/20',
  },
  [PAYMENT_STATUS.PENDING]: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-warning/10 text-warning hover:bg-warning/20 border-warning/20',
  },
  [PAYMENT_STATUS.PROCESSING]: {
    label: 'Processing',
    icon: Loader2,
    className: 'bg-info/10 text-info hover:bg-info/20 border-info/20',
  },
  [PAYMENT_STATUS.FAILED]: {
    label: 'Failed',
    icon: XCircle,
    className: 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20',
  },
  [PAYMENT_STATUS.EXPIRED]: {
    label: 'Expired',
    icon: TimerOff,
    className: 'bg-muted/60 text-muted-foreground hover:bg-muted border-border',
  },
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  // Normalise on display so any legacy or API-variant spelling maps correctly
  const canonical = normalizePaymentStatus(status);
  const config = STATUS_CONFIG[canonical] ?? {
    label: status,
    icon: Clock,
    className: 'bg-muted text-muted-foreground',
  };

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', config.className, className)}>
      <Icon className={cn('w-3 h-3', canonical === PAYMENT_STATUS.PROCESSING && 'animate-spin')} />
      {config.label}
    </Badge>
  );
};
