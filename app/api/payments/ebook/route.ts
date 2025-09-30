// app/api/payments/ebook/route.ts
import { NextResponse } from "next/server";

type InitBody = {
  slug: string;
  amount_cents: number;
  currency: string;
};

export async function POST(req: Request) {
  try {
    const { slug, amount_cents, currency } = (await req.json()) as InitBody;

    // TODO: replace with real gateway session/init
    const demoCheckoutUrl = `/payments/demo-checkout?slug=${encodeURIComponent(
      slug
    )}&amount=${amount_cents}&currency=${currency}`;

    return NextResponse.json({ checkoutUrl: demoCheckoutUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bad Request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
