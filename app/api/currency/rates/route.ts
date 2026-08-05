import { NextResponse } from "next/server";

import { BASE_CURRENCY, CURRENCY_CODES, type CurrencyCode } from "@/lib/currency";

type FrankfurterRate = {
  date: string;
  base: string;
  quote: string;
  rate: number;
};

export const revalidate = 21_600;

export async function GET() {
  const quotes = CURRENCY_CODES.filter((code) => code !== BASE_CURRENCY).join(",");
  const url = new URL("https://api.frankfurter.dev/v2/rates");
  url.searchParams.set("base", BASE_CURRENCY);
  url.searchParams.set("quotes", quotes);

  try {
    const response = await fetch(url, { next: { revalidate } });
    if (!response.ok) {
      throw new Error(`Frankfurter returned ${response.status}`);
    }

    const data = (await response.json()) as FrankfurterRate[];
    const rates = data.reduce<Partial<Record<CurrencyCode, number>>>((result, item) => {
      if (
        CURRENCY_CODES.includes(item.quote as CurrencyCode) &&
        typeof item.rate === "number" &&
        Number.isFinite(item.rate) &&
        item.rate > 0
      ) {
        result[item.quote as CurrencyCode] = item.rate;
      }
      return result;
    }, { GHS: 1 });

    const missing = CURRENCY_CODES.filter((code) => rates[code] == null);
    if (missing.length > 0) {
      throw new Error(`Frankfurter did not return rates for: ${missing.join(", ")}`);
    }

    const dates = data.map((item) => item.date).filter(Boolean).sort();
    return NextResponse.json(
      {
        base: BASE_CURRENCY,
        rates,
        // Different central banks can publish on adjacent days; report the
        // oldest effective date in the complete set so freshness is not overstated.
        asOf: dates[0] ?? null,
        provider: "Frankfurter",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Exchange rates are temporarily unavailable." },
      { status: 502 },
    );
  }
}
