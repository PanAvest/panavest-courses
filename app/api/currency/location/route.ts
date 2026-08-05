import { NextResponse } from "next/server";

import { currencyForCountry } from "@/lib/currency";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const country = request.headers.get("x-vercel-ip-country")?.trim().toUpperCase() || null;
  return NextResponse.json(
    {
      country,
      currency: currencyForCountry(country),
      detected: Boolean(country),
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}
