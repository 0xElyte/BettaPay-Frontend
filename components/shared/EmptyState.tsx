import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-6 px-4' : 'py-8 sm:py-14 px-4',
        className,
      )}
      role="status"
      aria-label={title}
    >
      <div
        className={cn(
          'rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center',
          compact ? 'w-10 h-10 mb-2' : 'w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4',
        )}
        aria-hidden="true"
      >
        <Icon className={cn('text-primary', compact ? 'w-5 h-5' : 'w-6 h-6 sm:w-8 sm:h-8')} />
      </div>
      <p className={cn('font-semibold text-foreground', compact ? 'text-sm mb-0.5' : 'text-sm sm:text-base mb-1')}>
        {title}
      </p>
      {description && (
        <p className={cn('text-muted-foreground max-w-xs', compact ? 'text-xs' : 'text-xs sm:text-sm')}>
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-2 mt-4">
          {action && (
            <Button
              variant="outline"
              size="sm"
              className="border-primary/40 text-primary hover:bg-primary/10"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
