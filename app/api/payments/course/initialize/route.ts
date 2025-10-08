import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // avoid caching in dev

export async function POST(req: Request) {
  try {
    const { user_id, email, course_id, slug, amount, currency = "GHS" } = await req.json();

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: "PAYSTACK_SECRET_KEY missing" }, { status: 500 });
    }
    if (!process.env.APP_URL) {
      return NextResponse.json({ error: "APP_URL missing" }, { status: 500 });
    }
    if (!user_id || !email || !course_id || !slug) {
      return NextResponse.json({ error: "Missing user_id, email, course_id or slug" }, { status: 400 });
    }

    const amountInMinor = Math.round(Number(amount) * 100);

    // ✅ callback goes to the slug's enroll page
    const callback_url = `${process.env.APP_URL}/knowledge/${encodeURIComponent(slug)}/enroll?verify=1`;

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountInMinor,
        currency,
        callback_url,
        metadata: {
          user_id,
          course_id,
          slug,
          kind: "course",
        },
      }),
    });

    const data = await res.json();
    if (!res.ok || !data?.status) {
      return NextResponse.json({ error: data?.message || "Paystack init failed" }, { status: 400 });
    }

    return NextResponse.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
      access_code: data.data.access_code,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Init error" }, { status: 500 });
  }
}
