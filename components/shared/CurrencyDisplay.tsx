import { formatApproxFiat, formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

/**
 * How a zero amount should be rendered:
 * - `zero`   → `USDC 0.00` / `₦0`   (default — a real balance of nothing)
 * - `dash`   → `—`               (nothing to show at all)
 * - `approx` → `≈ $0.00`         (a fiat conversion that rounds to nothing)
 *
 * `null` / `undefined` / `NaN` amounts always render `—`, regardless of this prop.
 */
export type ZeroDisplay = 'zero' | 'dash' | 'approx';

interface CurrencyDisplayProps {
  amount: number | null | undefined;
  currency?: string;
  className?: string;
  showDecimals?: boolean;
  zeroDisplay?: ZeroDisplay;
}

const EM_DASH = '—';

// Tiny residuals (< half a cent) are settlement noise and must not render as -0.00.
const EPSILON = 0.005;

/**
 * Thin display wrapper around the shared `formatCurrency` / `formatApproxFiat`
 * pipeline so every surface (dashboard, wallet, tables, charts) renders the
 * same amount identically for a given locale.
 */
export const CurrencyDisplay = ({
  amount,
  currency = 'USDC',
  className,
  showDecimals = true,
  zeroDisplay = 'zero',
}: CurrencyDisplayProps) => {
  const isMissing = amount === null || amount === undefined || Number.isNaN(amount);

  if (isMissing) {
    return (
      <span
        className={cn('font-medium text-muted-foreground', className)}
        aria-label="No amount"
      >
        {EM_DASH}
      </span>
    );
  }

  // Normalize tiny magnitudes to precise zero to avoid floating-point residuals
  // like -0.0000001 rendering as "-USDC 0.00" / "-0.00".
  const normalized = Math.abs(amount as number) < EPSILON ? 0 : (amount as number);

  if (normalized === 0) {
    if (zeroDisplay === 'dash') {
      return (
        <span
          className={cn('font-medium text-muted-foreground', className)}
          aria-label="No amount"
        >
          {EM_DASH}
        </span>
      );
    }

    const zeroValue =
      zeroDisplay === 'approx'
        ? formatApproxFiat(0, currency)
        : formatCurrency(0, currency, { showDecimals });

    return <span className={cn('font-medium', className)}>{zeroValue}</span>;
  }

  const displayValue = formatCurrency(normalized, currency, { showDecimals });

  return (
    <span className={cn('font-medium', className)}>
      {displayValue}
    </span>
  );
};
