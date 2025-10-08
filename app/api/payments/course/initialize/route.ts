// app/api/payments/course/initialize/route.ts
import { NextRequest, NextResponse } from "next/server";

type InitBody = {
  user_id: string;
  email: string;
  course_id: string;
  slug: string;
  amount: number;           // major units (e.g., 120.50 GHS)
  currency?: string;        // default "GHS"
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
    const {
      user_id,
      email,
      course_id,
      slug,
      amount,
      currency = "GHS",
    } = (await req.json()) as unknown as InitBody;

    if (!user_id || !email || !course_id || !slug)
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: "PAYSTACK_SECRET_KEY missing" }, { status: 500 });
    }

    // Paystack wants the amount in the **smallest** currency unit.
    const amountMinor = Math.round(Number(amount) * 100);
    const origin = req.nextUrl.origin; // e.g. https://panavest-courses.vercel.app

    const payload = {
      email,
      amount: amountMinor,
      currency,
      callback_url: `${origin}/knowledge/${slug}/enroll?verify=1`,
      metadata: {
        user_id,
        course_id,
        slug,
        purchase_type: "course",
      } as Record<string, unknown>,
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
