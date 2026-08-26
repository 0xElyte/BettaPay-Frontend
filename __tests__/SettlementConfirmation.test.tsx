import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettlementConfirmation } from '@/components/settlement/SettlementConfirmation';
import { calculateFeeSnapshot } from '@/lib/utils/settlementRules';

describe('SettlementConfirmation & Fee Rules (Issue #571)', () => {
  describe('calculateFeeSnapshot()', () => {
    it('calculates base fee correctly with 100 bps (1%) default', () => {
      const snapshot = calculateFeeSnapshot(10000);
      expect(snapshot.bps).toBe(100);
      expect(snapshot.baseFeeUsdc).toBe(100);
      expect(snapshot.discountAppliedUsdc).toBe(0);
      expect(snapshot.totalFeeUsdc).toBe(100);
      expect(snapshot.effectiveFeeBps).toBe(100);
    });

    it('calculates discount tiers and applies discount correctly', () => {
      const snapshot = calculateFeeSnapshot(10000, {
        feeBps: 100,
        discountBps: 25,
        discountTier: 'Tier 2 Volume Discount (-25 bps)',
      });

      expect(snapshot.baseFeeUsdc).toBe(100);
      expect(snapshot.discountAppliedUsdc).toBe(25);
      expect(snapshot.effectiveFeeBps).toBe(75);
      expect(snapshot.totalFeeUsdc).toBe(75);
    });

    it('applies fee cap when total fee exceeds capAmountUsdc', () => {
      const snapshot = calculateFeeSnapshot(100000, {
        feeBps: 100,
        capAmountUsdc: 250,
      });

      expect(snapshot.baseFeeUsdc).toBe(1000);
      expect(snapshot.capApplied).toBe(true);
      expect(snapshot.totalFeeUsdc).toBe(250);
    });
  });

  describe('SettlementConfirmation component', () => {
    it('renders applied fee rule and discount breakdown when expanded', () => {
      const snapshot = calculateFeeSnapshot(5000, {
        feeBps: 100,
        discountBps: 20,
        discountTier: 'Tier 1 (-20 bps)',
        feeVersion: 'v1.2.0',
        ruleSource: 'merchant',
      });

      render(
        <SettlementConfirmation
          isOpen={true}
          onClose={jest.fn()}
          amountUsdc={5000}
          feeSnapshot={snapshot}
        />
      );

      expect(
        screen.getByRole('heading', { name: /confirm settlement/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/0.8% \(80 bps\)/i)).toBeInTheDocument();

      // Expand breakdown
      const breakdownBtn = screen.getByRole('button', {
        name: /fee rule snapshot & breakdown/i,
      });
      fireEvent.click(breakdownBtn);

      expect(screen.getByText('Base Fee Rule')).toBeInTheDocument();
      expect(screen.getByText(/Tier 1 \(-20 bps\)/i)).toBeInTheDocument();
      expect(screen.getByText(/v1.2.0/i)).toBeInTheDocument();
      expect(screen.getByText(/Gross \(5000.00\) - Fee \(40.00\) = Net \(4960.00\)/i)).toBeInTheDocument();
    });
  });
});
