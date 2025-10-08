// app/api/payments/paystack/init/route.ts
import { NextRequest, NextResponse } from "next/server";

type InitGenericBody = {
  email: string;
  amount: number;
  currency?: string;
  callbackPath?: string; // e.g. "/knowledge/my-course/enroll?verify=1"
  metadata?: Record<string, unknown>;
};

type PaystackInitApiResponse = {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

export async function POST(req: NextRequest) {
  try {
    const { email, amount, currency = "GHS", callbackPath = "/", metadata = {} }
      = (await req.json()) as unknown as InitGenericBody;

    if (!email || typeof amount !== "number") {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: "PAYSTACK_SECRET_KEY missing" }, { status: 500 });

    const origin = req.nextUrl.origin;
    const amountMinor = Math.round(amount * 100);

    const payload = {
      email,
      amount: amountMinor,
      currency,
      callback_url: `${origin}${callbackPath}`,
      metadata,
    };

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = (await res.json()) as PaystackInitApiResponse;

    if (!res.ok || !data.status || !data.data) {
      return NextResponse.json(
        { error: data?.message || "Failed to create Paystack payment" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
