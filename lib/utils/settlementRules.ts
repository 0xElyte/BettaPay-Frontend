import type { ApiSettlement, SettlementEffectiveRule } from '@/lib/api/hooks';

export interface FeeSnapshot {
  bps: number; // base fee in bps, e.g. 100 bps = 1.00%
  baseFeeUsdc: number; // gross * (bps / 10000)
  discountBps?: number; // discount in bps (e.g. 20 bps)
  discountTier?: string; // name/label of discount tier (e.g. "Volume Tier 2 (-20 bps)")
  discountAppliedUsdc: number; // discount amount in USDC
  capAmountUsdc?: number; // max fee cap in USDC
  capApplied: boolean; // whether cap was reached
  effectiveFeeBps: number; // bps after discount
  totalFeeUsdc: number; // final net fee deducted
  feeVersion?: string; // snapshot version, e.g. "v1.2.0"
  ruleSource?: 'merchant' | 'default' | 'governance';
}

export interface CalculateFeeSnapshotOptions {
  feeBps?: number;
  discountBps?: number;
  discountTier?: string;
  capAmountUsdc?: number;
  feeVersion?: string;
  ruleSource?: 'merchant' | 'default' | 'governance';
}

export function calculateFeeSnapshot(
  grossAmountUsdc: number,
  options?: CalculateFeeSnapshotOptions,
): FeeSnapshot {
  const bps = options?.feeBps ?? 100;
  const baseFeeUsdc = (grossAmountUsdc * bps) / 10000;

  const discountBps = Math.min(options?.discountBps ?? 0, bps);
  const discountAppliedUsdc = (grossAmountUsdc * discountBps) / 10000;

  const effectiveFeeBps = bps - discountBps;
  let totalFeeUsdc = Math.max(0, baseFeeUsdc - discountAppliedUsdc);

  let capApplied = false;
  if (options?.capAmountUsdc !== undefined && totalFeeUsdc > options.capAmountUsdc) {
    totalFeeUsdc = options.capAmountUsdc;
    capApplied = true;
  }

  return {
    bps,
    baseFeeUsdc,
    discountBps,
    discountTier: options?.discountTier,
    discountAppliedUsdc,
    capAmountUsdc: options?.capAmountUsdc,
    capApplied,
    effectiveFeeBps,
    totalFeeUsdc,
    feeVersion: options?.feeVersion ?? 'v1.0.0',
    ruleSource: options?.ruleSource ?? 'governance',
  };
}

/**
 * Effective rule fallbacks ordered by precedence:
 * merchant → default → governance
 *
 * The API is expected to return `effectiveRule` already resolved, but we keep
 * a defensive resolver so the UI degrades gracefully when the field is missing
 * (e.g. older mock fixtures or partial responses).
 */
export const DEFAULT_EFFECTIVE_RULE: SettlementEffectiveRule = {
  feeBps: 100,
  autoSettle: false,
  delay: 60,
  source: 'governance',
};

export function getEffectiveRule(settlement: ApiSettlement): SettlementEffectiveRule {
  if (settlement.effectiveRule) return settlement.effectiveRule;
  return DEFAULT_EFFECTIVE_RULE;
}

export function formatFeeBps(feeBps: number): string {
  // 100 bps = 1%
  const pct = feeBps / 100;
  return `${pct}% (${feeBps} bps)`;
}

export function formatDelay(delayMinutes: number): string {
  if (delayMinutes < 60) return `${delayMinutes}m`;
  const hours = Math.floor(delayMinutes / 60);
  const mins = delayMinutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatAutoSettle(autoSettle: boolean): string {
  return autoSettle ? 'on' : 'off';
}
