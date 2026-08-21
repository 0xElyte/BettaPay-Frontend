import { cn } from '@/lib/utils';
import {
  formatCurrency,
  truncateAddress,
  formatDate,
  formatNumber,
  getActiveLocale,
} from '@/lib/utils/format';

describe('utils/format', () => {
  describe('cn()', () => {
    it('merges tailwind classes using twMerge (conflicting utilities)', () => {
      const result = cn('text-sm', 'text-lg');
      // twMerge should keep the last conflicting class
      expect(result.split(' ')).toContain('text-lg');
      expect(result.split(' ')).not.toContain('text-sm');
    });

    it('removes falsy/conditional classes via clsx', () => {
      const result = cn('p-2', false && 'p-4', undefined, 0, 'm-1');
      expect(result.split(' ')).toContain('p-2');
      expect(result.split(' ')).toContain('m-1');
      expect(result).not.toContain('p-4');
    });
  });

  describe('formatCurrency()', () => {
    it('formats USDC (default) and prefixes output with “USDC ”', () => {
      expect(formatCurrency(100, 'USDC')).toBe('USDC 100.00');
    });

    it('formats NGN (Intl keeps fractional digits because maxFractionDigits is not set)', () => {
      expect(formatCurrency(1234.56, 'NGN')).toBe('₦1,234.56');
    });

    it('handles zero', () => {
      expect(formatCurrency(0, 'USDC')).toBe('USDC 0.00');
      expect(formatCurrency(0, 'NGN')).toBe('₦0');
    });

    it('handles negative values', () => {
      expect(formatCurrency(-50, 'USDC')).toBe('-USDC 50.00');
      expect(formatCurrency(-50, 'NGN')).toBe('-₦50');
    });

    it('handles large numbers', () => {
      expect(formatCurrency(1234567890.12, 'USDC')).toBe('USDC 1,234,567,890.12');
    });
  });

  describe('truncateAddress()', () => {
    it('returns short addresses as-is', () => {
      expect(truncateAddress('123456789')).toBe('123456789'); // length 9
    });

    it('truncates long addresses to first 6 + ... + last 4', () => {
      const addr = 'GABCD1234567890XYZ';
      // first 6: GABCD1, last 4: YZ?? (computed by substring)
      expect(truncateAddress(addr)).toBe(`${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`);
    });

    it('returns empty string as-is', () => {
      expect(truncateAddress('')).toBe('');
    });

    it('returns null/undefined unchanged (runtime)', () => {
      expect(truncateAddress(null as unknown as string)).toBe(null);
      expect(truncateAddress(undefined as unknown as string)).toBe(undefined);
    });
  });

  describe('formatDate()', () => {
    it('formats a string input', () => {
      const input = '2024-01-02T03:04:00.000Z';
      const expected = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(input));

      expect(formatDate(input)).toBe(expected);
    });

    it('formats a Date input', () => {
      const d = new Date('2024-06-15T10:20:00.000Z');
      const expected = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(d);

      expect(formatDate(d)).toBe(expected);
    });
  });

  describe('active-locale formatting (AC4)', () => {
    afterEach(() => {
      // Reset so locale-dependent tests never leak into the default-locale ones.
      document.documentElement.lang = '';
    });

    it('formatCurrency USDC renders numbers in an explicit locale', () => {
      const value = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(1234.56);
      expect(formatCurrency(1234.56, 'USDC', 'fr')).toBe(`USDC ${value}`);
    });

    it('formatCurrency NGN renders numbers in an explicit locale', () => {
      const expected = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
      }).format(1234.56);
      expect(formatCurrency(1234.56, 'NGN', 'pt')).toBe(expected);
    });

    it('formatDate renders in an explicit locale', () => {
      const input = '2024-01-02T03:04:00.000Z';
      const expected = new Intl.DateTimeFormat('pt-BR', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(input));
      expect(formatDate(input, 'pt')).toBe(expected);
    });

    it('formatNumber renders in an explicit locale', () => {
      const expected = new Intl.NumberFormat('fr-FR').format(1234567.89);
      expect(formatNumber(1234567.89, 'fr')).toBe(expected);
    });

    it('uses document.documentElement.lang when no locale is passed', () => {
      document.documentElement.lang = 'fr';
      const value = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(1234.56);
      expect(formatCurrency(1234.56, 'USDC')).toBe(`USDC ${value}`);
    });

    it('falls back to en (en-US) for an unsupported document lang', () => {
      document.documentElement.lang = 'de';
      expect(formatCurrency(100, 'USDC')).toBe('USDC 100.00');
      expect(formatDate('2024-01-02T03:04:00.000Z')).toBe(
        new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }).format(new Date('2024-01-02T03:04:00.000Z')),
      );
    });
  });

  describe('getActiveLocale()', () => {
    afterEach(() => {
      document.documentElement.lang = '';
    });

    it('returns the supported document language', () => {
      document.documentElement.lang = 'pt';
      expect(getActiveLocale()).toBe('pt');
    });

    it('falls back to en for an empty or unsupported language', () => {
      document.documentElement.lang = '';
      expect(getActiveLocale()).toBe('en');
      document.documentElement.lang = 'xx';
      expect(getActiveLocale()).toBe('en');
    });
  });
});

