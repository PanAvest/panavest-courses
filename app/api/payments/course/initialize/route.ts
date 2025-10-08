import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type InitBody = {
  user_id: string;
  email: string;
  course_id: string;
  slug: string;
  amount: number;        // major units (e.g. 300 for GHS 300.00)
  currency?: string;     // default "GHS"
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<InitBody>;
    const {
      user_id,
      email,
      course_id,
      slug,
      amount,
      currency = "GHS",
    } = body;

    // Validate inputs with helpful messages
    const missing: string[] = [];
    if (!user_id)  missing.push("user_id");
    if (!email)    missing.push("email");
    if (!course_id) missing.push("course_id");
    if (!slug)     missing.push("slug");
    if (amount === undefined || amount === null || Number.isNaN(Number(amount)))
      missing.push("amount");

    if (missing.length) {
      return NextResponse.json(
        { ok: false, error: `Missing or invalid fields: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET) {
      return NextResponse.json(
        { ok: false, error: "Server is missing PAYSTACK_SECRET_KEY env var" },
        { status: 500 },
      );
    }

    // Prepare amounts in minor units (Paystack requirement)
    const amountMinor = Math.round(Number(amount) * 100);

    // Build redirect back to your enroll page to trigger verification
    const origin = process.env.NEXT_PUBLIC_SITE_URL
      || process.env.NEXT_PUBLIC_BASE_URL
      || new URL(req.url).origin;

    const callbackUrl = `${origin}/knowledge/${encodeURIComponent(
      slug!,
    )}/enroll?verify=1`;

    // Optional: pre-create/mark an enrollment row as "pending"
    const supabase = getSupabaseAdmin();
    await supabase
      .from("enrollments")
      .upsert(
        {
          user_id: user_id!,
          course_id: course_id!,
          paid: false,
          // optionally record intent details for debugging
          intent_currency: currency,
          intent_amount_major: Number(amount),
        } as any,
        { onConflict: "user_id,course_id" },
      );

    // Generate a unique reference you can also store if you want
    const reference = `pv_${course_id}_${Date.now()}`;

    // Initialize Paystack
    const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountMinor,
        currency,               // e.g. "GHS"
        reference,
        callback_url: callbackUrl,
        metadata: {
          user_id,
          course_id,
          slug,
          product: "course",
        },
      }),
    });

    const initJson = await initRes.json();
    if (!initRes.ok || initJson?.status === false) {
      // Paystack error bubble up for easier debugging
      return NextResponse.json(
        {
          ok: false,
          error:
            initJson?.message ||
            `Paystack init failed with ${initRes.status}`,
          raw: initJson,
        },
        { status: 400 },
      );
    }

    // Success
    return NextResponse.json({
      ok: true,
      authorization_url: initJson.data.authorization_url as string,
      access_code: initJson.data.access_code as string,
      reference: initJson.data.reference as string, // usually same as we sent
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: "Malformed request body or server error" },
      { status: 400 },
    );
  }
}
