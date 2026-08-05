"use client";

import { useId } from "react";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@/lib/currency";
import { useCurrency } from "./CurrencyProvider";

type CurrencySelectorProps = {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
  showStatus?: boolean;
};

export default function CurrencySelector({
  compact = false,
  inverse = false,
  className = "",
  showStatus = false,
}: CurrencySelectorProps) {
  const { currency, setCurrency, asOf, loading, error } = useCurrency();
  const selectId = useId();

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <label
        htmlFor={selectId}
        className={compact ? "sr-only" : `text-[11px] font-semibold uppercase tracking-[0.12em] ${inverse ? "text-white/60" : "text-muted"}`}
      >
        Display currency
      </label>
      <div className="relative inline-flex items-center">
        <span
          className={`pointer-events-none absolute left-2.5 text-xs font-bold ${inverse ? "text-white/65" : "text-[color:var(--color-brand)]"}`}
          aria-hidden
        >
          FX
        </span>
        <select
          id={selectId}
          value={currency}
          onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
          aria-label="Choose display currency"
          title="Choose the currency used to display prices"
          className={`h-9 appearance-none rounded-lg border pl-9 pr-8 text-xs font-semibold outline-none transition focus:ring-2 focus:ring-[color:var(--color-brand)]/30 ${
            inverse
              ? "border-white/20 bg-white/10 text-white"
              : "border-[color:var(--color-light)] bg-white text-[color:var(--color-ink)] hover:border-[color:var(--color-soft)]"
          } ${compact ? "w-[88px]" : "w-full min-w-[220px]"}`}
        >
          {SUPPORTED_CURRENCIES.map((option) => (
            <option key={option.code} value={option.code} className="text-black">
              {compact ? option.code : `${option.code} — ${option.name}`}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 20 20"
          className={`pointer-events-none absolute right-2 h-4 w-4 ${inverse ? "text-white/60" : "text-muted"}`}
          fill="currentColor"
          aria-hidden
        >
          <path fillRule="evenodd" d="M5.2 7.2a.75.75 0 0 1 1.06 0L10 10.94l3.74-3.74a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.26a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </div>
      {showStatus && (
        <span className={`text-[10px] ${inverse ? "text-white/50" : "text-muted"}`}>
          {error ? "Showing GHS where live rates are unavailable" : loading ? "Loading live rates…" : asOf ? `Frankfurter rates · ${asOf}` : "Frankfurter rates"}
        </span>
      )}
    </div>
  );
}
