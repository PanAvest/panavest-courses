// app/api/payments/paystack/init/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InitBody = {
  email: string;
  amountMinor: number; // GH₵ 100.00 => 10000
  meta: {
    kind: "course" | "ebook";
    user_id: string;
    course_id?: string;
    ebook_id?: string;
    slug?: string; // for redirect UX
  };
};

export async function POST(req: Request) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: "PAYSTACK_SECRET_KEY missing" }, { status: 500 });

    const body = (await req.json()) as InitBody;
    if (!body?.email || !body?.amountMinor || !body?.meta?.kind) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // callback URL users will be redirected to by Paystack
    const callback_url = `${new URL(req.url).origin}/api/payments/paystack/verify`;

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: body.email,
        amount: body.amountMinor,
        metadata: body.meta,
        callback_url,
        channels: ["card", "mobile_money"], // adjust to your needs
        currency: "GHS",
      }),
    });

    const data = await res.json();
    if (!res.ok || !data?.status) {
      return NextResponse.json({ error: data?.message || "Initialize failed" }, { status: 400 });
    }

    return NextResponse.json({
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Init error" }, { status: 500 });
  }
}
