import { Badge } from '@/components/ui/badge';
import { PAYMENT_STATUS } from '@/lib/utils/constants';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';

/** Supported payment statuses: pending, processing, success, and failed. */

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const normalizedStatus = status.trim().toLowerCase();

  const config: Record<string, { label: string; icon: React.ElementType; className: string }> = {
    [PAYMENT_STATUS.SUCCESS]: {
      label: 'Success',
      icon: CheckCircle2,
      className: 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20',
    },
    [PAYMENT_STATUS.PENDING]: {
      label: 'Pending',
      icon: Clock,
      className: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20',
    },
    [PAYMENT_STATUS.PROCESSING]: {
      label: 'Processing',
      icon: Loader2,
      className: 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20',
    },
    [PAYMENT_STATUS.FAILED]: {
      label: 'Failed',
      icon: XCircle,
      className: 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20',
    },
  };

  const currentConfig = config[normalizedStatus] || {
    label: 'Unknown',
    icon: Clock,
    className: 'bg-muted text-muted-foreground',
  };

  if (!config[normalizedStatus] && process.env.NODE_ENV === 'development') {
    console.warn(`[StatusBadge] Unmapped payment status: "${status}"`);
  }

  const Icon = currentConfig.icon;

  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', currentConfig.className, className)}>
      <Icon className={cn('w-3 h-3', normalizedStatus === PAYMENT_STATUS.PROCESSING && 'animate-spin')} />
      {currentConfig.label}
    </Badge>
  );
};
