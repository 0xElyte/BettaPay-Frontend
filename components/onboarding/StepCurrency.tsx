"use client";

import { Toggle, Badge } from "@/components/ui";
import { useRates } from "@/lib/api/hooks";
import type { OnboardingData } from "@/app/onboarding/page";

type Props = {
  data: OnboardingData;
  errors: Record<string, string>;
  onChange: (data: Partial<OnboardingData>) => void;
};

const currencies = ["NGN", "USD", "USDC", "GHS", "KES", "ZAR"];

export function StepCurrency({ data, errors, onChange }: Props) {
  const { data: rates, isLoading } = useRates();

  const getExchangeRate = (currency: string): number | null => {
    if (currency === "NGN") return null;
    const rate = rates.find((r) => r.from === currency && r.to === "NGN");
    return rate?.rate ?? null;
  };

  const formatRate = (rate: number | null): string => {
    if (rate === null) return "";
    return rate.toFixed(4);
  };

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Default settlement currency</h2>
        <p className="text-sm text-muted-foreground">
          Choose the currency you want to receive by default.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {currencies.map((currency) => {
          const rate = getExchangeRate(currency);
          const isSelected = data.settlementCurrency === currency;

          return (
            <button
              key={currency}
              type="button"
              onClick={() => onChange({ settlementCurrency: currency })}
              className={`rounded-lg border p-3 text-left transition-colors ${
                isSelected
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/50"
              }`}
              disabled={isLoading}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-medium">{currency}</span>
                {currency === "NGN" && (
                  <Badge variant="default" className="text-xs">
                    Recommended
                  </Badge>
                )}
              </div>

              {currency !== "NGN" && (
                <div className="text-xs text-muted-foreground">
                  {isLoading ? (
                    <span className="animate-pulse">Loading rate...</span>
                  ) : rate ? (
                    <span>1 {currency} = {formatRate(rate)} NGN</span>
                  ) : (
                    <span className="text-muted-foreground/50">Rate unavailable</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {errors.settlementCurrency && (
        <p className="text-sm text-destructive">{errors.settlementCurrency}</p>
      )}

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="font-medium">Auto-convert payments</p>
          <p className="text-sm text-muted-foreground">
            Convert incoming USDC to your default currency automatically.
          </p>
        </div>
        <Toggle
          checked={data.autoConvert}
          label="Auto-convert payments"
          onClick={() => onChange({ autoConvert: !data.autoConvert })}
        />
      </div>
    </section>
  );
}
