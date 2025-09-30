import { NextResponse } from "next/server";

type InitBody = {
  ebookId: string;
  slug: string;
  amount_cents: number;
  currency: string;
};

export async function POST(req: Request) {
  try {
    const { ebookId, slug, amount_cents, currency } = (await req.json()) as InitBody;

    // Redirect user to a demo checkout page in the app
    const checkoutUrl = `/payments/demo-checkout?ebookId=${encodeURIComponent(
      ebookId
    )}&slug=${encodeURIComponent(slug)}&amount=${amount_cents}&currency=${encodeURIComponent(
      currency
    )}`;

    return NextResponse.json({ checkoutUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bad Request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
