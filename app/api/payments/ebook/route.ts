import { NextResponse } from "next/server";
// import your real gateway SDK here

export async function POST(req: Request) {
  try {
    const { ebookId, slug, amount_cents, currency } = await req.json();

    // TODO: insert your gateway session/create-charge logic here.
    // For now we’ll fake a hosted checkout URL and immediately “succeed”.

    // ⚠️ Replace with your own hosted checkout / initializePayment step:
    const demoCheckoutUrl = `/payments/demo-checkout?slug=${encodeURIComponent(
      slug
    )}&amount=${amount_cents}&currency=${currency}`;

    return NextResponse.json({ checkoutUrl: demoCheckoutUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bad Request" }, { status: 400 });
  }
}
