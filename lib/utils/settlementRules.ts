import type { ApiSettlement, SettlementEffectiveRule } from '@/lib/api/hooks';

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
