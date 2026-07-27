import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

/**
 * How a zero amount should be rendered:
 * - `zero`   → `0 USDC` / `₦0`   (default — a real balance of nothing)
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

const formatFiat = (amount: number, currency: string) =>
  currency === 'NGN'
    ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount)
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export const CurrencyDisplay = ({
  amount,
  currency = 'USDC',
  className,
  showDecimals = true,
  zeroDisplay = 'zero',
}: CurrencyDisplayProps) => {
  const isMissing = amount === null || amount === undefined || Number.isNaN(amount);

  if (isMissing || (amount === 0 && zeroDisplay === 'dash')) {
    return (
      <span
        className={cn('font-medium text-muted-foreground', className)}
        aria-label="No amount"
      >
        {EM_DASH}
      </span>
    );
  }

  if (amount === 0) {
    const zeroValue =
      zeroDisplay === 'approx'
        ? `≈ ${formatFiat(0, currency)}`
        : currency === 'NGN'
          ? '₦0'
          : `0 ${currency}`;

    return <span className={cn('font-medium', className)}>{zeroValue}</span>;
  }

  const formatted = formatCurrency(amount, currency);

  // If not showing decimals for USDC/USD, we can strip them
  const displayValue = !showDecimals && currency !== 'NGN' && formatted.endsWith('.00')
    ? formatted.replace('.00', '')
    : formatted;

  return (
    <span className={cn('font-medium', className)}>
      {displayValue}
    </span>
  );
};
