"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  BASE_CURRENCY,
  formatCurrency,
  isCurrencyCode,
  type CurrencyCode,
} from "@/lib/currency";

type Rates = Partial<Record<CurrencyCode, number>>;

type CurrencyContextValue = {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  rates: Rates;
  asOf: string | null;
  loading: boolean;
  error: boolean;
  formatFromGhs: (amountGhs: number) => string;
};

type CachedRates = {
  rates: Rates;
  asOf: string | null;
  savedAt: number;
};

const PREFERENCE_KEY = "panavest-display-currency";
const RATES_KEY = "panavest-frankfurter-rates";
const CACHE_LIFETIME_MS = 12 * 60 * 60 * 1000;

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export default function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(BASE_CURRENCY);
  const [rates, setRates] = useState<Rates>({ GHS: 1 });
  const [asOf, setAsOf] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let hasFreshCache = false;
    const savedCurrency = window.localStorage.getItem(PREFERENCE_KEY);
    if (isCurrencyCode(savedCurrency)) setCurrencyState(savedCurrency);

    try {
      const rawCache = window.localStorage.getItem(RATES_KEY);
      if (rawCache) {
        const cached = JSON.parse(rawCache) as CachedRates;
        if (Date.now() - cached.savedAt < CACHE_LIFETIME_MS && cached.rates?.GHS === 1) {
          hasFreshCache = true;
          setRates(cached.rates);
          setAsOf(cached.asOf);
          setLoading(false);
        }
      }
    } catch {
      window.localStorage.removeItem(RATES_KEY);
    }

    const controller = new AbortController();
    fetch("/api/currency/rates", { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as { rates?: Rates; asOf?: string | null };
        if (!response.ok || !payload.rates) throw new Error("Rates unavailable");
        const nextRates = { ...payload.rates, GHS: 1 };
        setRates(nextRates);
        setAsOf(payload.asOf ?? null);
        setError(false);
        window.localStorage.setItem(
          RATES_KEY,
          JSON.stringify({ rates: nextRates, asOf: payload.asOf ?? null, savedAt: Date.now() }),
        );
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError(!hasFreshCache);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const setCurrency = useCallback((nextCurrency: CurrencyCode) => {
    setCurrencyState(nextCurrency);
    window.localStorage.setItem(PREFERENCE_KEY, nextCurrency);
  }, []);

  const formatFromGhs = useCallback(
    (amountGhs: number) => {
      const rate = rates[currency];
      if (rate == null) return formatCurrency(amountGhs, BASE_CURRENCY);
      return formatCurrency(amountGhs * rate, currency);
    },
    [currency, rates],
  );

  const value = useMemo(
    () => ({ currency, setCurrency, rates, asOf, loading, error, formatFromGhs }),
    [currency, setCurrency, rates, asOf, loading, error, formatFromGhs],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("useCurrency must be used inside CurrencyProvider");
  return context;
}
