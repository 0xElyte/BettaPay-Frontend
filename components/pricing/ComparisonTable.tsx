import { Check, Minus } from 'lucide-react';
import { COMPARISON_ROWS, PRICING_TIERS } from '@/lib/pricing';
import type { ComparisonRow } from '@/lib/pricing';

function Cell({ value }: { value: ComparisonRow['starter'] }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check aria-label="Included" className="w-4 h-4 text-primary mx-auto" />
    ) : (
      <Minus aria-label="Not included" className="w-4 h-4 text-muted-foreground/40 mx-auto" />
    );
  }
  return <span className="text-sm text-foreground">{value}</span>;
}

export function ComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[640px] text-left">
        <caption className="sr-only">Feature comparison across BettaPay pricing tiers</caption>
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th scope="col" className="p-4 text-sm font-semibold text-foreground w-1/3">
              Features
            </th>
            {PRICING_TIERS.map((tier) => (
              <th
                key={tier.id}
                scope="col"
                className={`p-4 text-sm font-semibold text-center ${
                  tier.highlighted ? 'text-primary' : 'text-foreground'
                }`}
              >
                {tier.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row) => (
            <tr
              key={row.feature}
              className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
            >
              <th scope="row" className="p-4 text-sm font-medium text-muted-foreground">
                {row.feature}
              </th>
              {PRICING_TIERS.map((tier) => (
                <td
                  key={tier.id}
                  className={`p-4 text-center${tier.highlighted ? ' bg-primary/[0.03]' : ''}`}
                >
                  <Cell value={row[tier.id]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
