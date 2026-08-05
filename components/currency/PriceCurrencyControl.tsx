"use client";

import CurrencySelector from "./CurrencySelector";
import { useCurrency } from "./CurrencyProvider";

export default function PriceCurrencyControl({ className = "" }: { className?: string }) {
  const { currency, rates } = useCurrency();
  const displayCurrency = rates[currency] == null ? "GHS" : currency;
  return (
    <div className={`flex flex-col gap-2 rounded-xl border border-[color:var(--color-light)] bg-white p-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div>
        <div className="text-xs font-semibold text-[color:var(--color-ink)]">Prices shown in {displayCurrency}</div>
        <div className="mt-0.5 text-[11px] text-muted">Display estimate only · checkout is securely charged in GHS</div>
      </div>
      <CurrencySelector compact />
    </div>
  );
}
