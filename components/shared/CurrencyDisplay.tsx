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

// Tiny residuals (< half a cent) are settlement noise and must not render as -0.00.
const EPSILON = 0.005;

// Values at or above this are abbreviated consistently; below this we render full
// precision. The threshold is deliberately high (1T) so the existing large-value
// tests (e.g. 1,234,567,890.12) keep their full rendering and only truly
// extreme settlement totals are compacted — without a truncation ellipsis.
const ABBREVIATION_THRESHOLD = 1e12;

const formatFiat = (amount: number, currency: string) =>
  currency === 'NGN'
    ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount)
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

function formatAbbreviated(amount: number, currency: string): string | null {
  const abs = Math.abs(amount);
  if (abs < ABBREVIATION_THRESHOLD) return null;

  const sign = amount < 0 ? '-' : '';
  let divisor = 1;
  let suffix = '';

  if (abs >= 1e15) {
    divisor = 1e15;
    suffix = 'Q';
  } else if (abs >= 1e12) {
    divisor = 1e12;
    suffix = 'T';
  } else {
    return null;
  }

  const value = abs / divisor;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  if (currency === 'NGN') {
    return `${sign}₦${formatted}${suffix}`;
  }
  // Non-NGN currencies are rendered with the USDC ticker for consistency with formatCurrency.
  return `${sign}USDC ${formatted}${suffix}`;
}

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

  // Handle zero distinctly from "unavailable" (which is already handled above).
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
        ? `≈ ${formatFiat(0, currency)}`
        : currency === 'NGN'
          ? '₦0'
          : `0 ${currency}`;

    return <span className={cn('font-medium', className)}>{zeroValue}</span>;
  }

  // Abbreviate very large values consistently without an ellipsis truncation marker.
  const abbreviated = formatAbbreviated(normalized, currency);
  if (abbreviated) {
    return <span className={cn('font-medium', className)}>{abbreviated}</span>;
  }

  const formatted = formatCurrency(normalized, currency);

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
