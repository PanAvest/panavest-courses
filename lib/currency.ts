export const BASE_CURRENCY = "GHS" as const;

export const SUPPORTED_CURRENCIES = [
  { code: "GHS", name: "Ghanaian cedi", region: "Ghana" },
  { code: "USD", name: "US dollar", region: "International" },
  { code: "GBP", name: "British pound", region: "International" },
  { code: "EUR", name: "Euro", region: "International" },
  { code: "ZAR", name: "South African rand", region: "Africa" },
  { code: "INR", name: "Indian rupee", region: "International" },
  { code: "NGN", name: "Nigerian naira", region: "Africa" },
  { code: "KES", name: "Kenyan shilling", region: "Africa" },
  { code: "XOF", name: "West African CFA franc", region: "Africa" },
  { code: "XAF", name: "Central African CFA franc", region: "Africa" },
  { code: "CAD", name: "Canadian dollar", region: "International" },
  { code: "AUD", name: "Australian dollar", region: "International" },
  { code: "AED", name: "UAE dirham", region: "International" },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

export const CURRENCY_CODES = SUPPORTED_CURRENCIES.map((currency) => currency.code);

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && CURRENCY_CODES.includes(value as CurrencyCode);
}

const COUNTRIES_BY_CURRENCY: Record<Exclude<CurrencyCode, "GHS">, readonly string[]> = {
  USD: ["US", "EC", "SV", "PA", "TL", "MH", "FM", "PW"],
  GBP: ["GB"],
  EUR: ["AT", "BE", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES"],
  ZAR: ["ZA"],
  INR: ["IN"],
  NGN: ["NG"],
  KES: ["KE"],
  XOF: ["BJ", "BF", "CI", "GW", "ML", "NE", "SN", "TG"],
  XAF: ["CM", "CF", "TD", "CG", "GQ", "GA"],
  CAD: ["CA"],
  AUD: ["AU"],
  AED: ["AE"],
};

export function currencyForCountry(country: string | null | undefined): CurrencyCode {
  const code = country?.trim().toUpperCase();
  if (!code || code === "GH") return BASE_CURRENCY;
  for (const [currency, countries] of Object.entries(COUNTRIES_BY_CURRENCY)) {
    if (countries.includes(code)) return currency as CurrencyCode;
  }
  return "USD";
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: currency === "XOF" || currency === "XAF" ? 0 : 2,
    maximumFractionDigits: currency === "XOF" || currency === "XAF" ? 0 : 2,
  }).format(amount);
}
