"use client";

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui';
import { CheckCircle2, Circle, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboardingChecklist, getDismissed, setDismissed } from '@/lib/hooks/useOnboardingChecklist';
import Link from 'next/link';

export function OnboardingChecklist() {
  const { items, completedCount, totalCount, isComplete, isLoading } = useOnboardingChecklist();
  const [dismissed, setLocalDismissed] = useState(false);

  useEffect(() => {
    setLocalDismissed(getDismissed());
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setLocalDismissed(true);
  }, []);

  // handleRestore is available for future use (e.g. a "show again" button)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRestore = useCallback(() => {
    setDismissed(false);
    setLocalDismissed(false);
  }, []);

  if (isLoading || dismissed || isComplete) {
    return null;
  }

  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 to-card shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">
            Getting Started
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Complete these steps to start accepting payments
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Dismiss onboarding checklist"
        >
          <X className="w-4 h-4" />
        </button>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            {completedCount}/{totalCount}
          </span>
        </div>

        {/* Items */}
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl transition-colors',
                item.completed
                  ? 'bg-success/5 border border-success/20'
                  : 'bg-card border border-border hover:border-border hover:bg-muted/30',
              )}
            >
              <div className="flex-shrink-0">
                {item.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-success" aria-label="Completed" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/40" aria-label="Not completed" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium',
                    item.completed ? 'text-success line-through decoration-success/30' : 'text-foreground',
                  )}
                >
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
              </div>
              <Link href={item.href} className="flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'text-xs min-h-[36px] px-2',
                    item.completed
                      ? 'text-muted-foreground hover:text-foreground'
                      : 'text-primary hover:bg-primary/10',
                  )}
                >
                  {item.ctaLabel}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function OnboardingRestoreBanner() {
  const [dismissed, setLocalDismissed] = useState(false);

  useEffect(() => {
    setLocalDismissed(getDismissed());
  }, []);

  const handleRestore = useCallback(() => {
    setDismissed(false);
    setLocalDismissed(false);
    window.location.reload();
  }, []);

  if (!dismissed) return null;

  return (
    <button
      onClick={handleRestore}
      className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors"
    >
      Show onboarding checklist
    </button>
  );
}
