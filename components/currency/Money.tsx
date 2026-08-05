"use client";

import { useCurrency } from "./CurrencyProvider";

type MoneyProps = {
  amountGhs: number;
  showCode?: boolean;
  className?: string;
};

export default function Money({ amountGhs, showCode = true, className = "" }: MoneyProps) {
  const { currency, rates, formatFromGhs } = useCurrency();
  const displayCurrency = rates[currency] == null ? "GHS" : currency;
  return (
    <span className={className} data-base-currency="GHS" data-base-amount={amountGhs}>
      {formatFromGhs(amountGhs)}{showCode ? ` ${displayCurrency}` : ""}
    </span>
  );
}
