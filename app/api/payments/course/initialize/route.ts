import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type InitBody = {
  user_id: string;
  email: string;
  course_id: string;
  slug: string;
  amount: number;        // major units (e.g., 300 for GHS 300.00)
  currency?: string;     // default "GHS"
};

type EnrollmentUpsert = {
  user_id: string;
  course_id: string;
  paid: boolean;
  intent_currency?: string | null;
  intent_amount_major?: number | null;
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

    const missing: string[] = [];
    if (!user_id) missing.push("user_id");
    if (!email) missing.push("email");
    if (!course_id) missing.push("course_id");
    if (!slug) missing.push("slug");
    if (amount === undefined || amount === null || Number.isNaN(Number(amount))) {
      missing.push("amount");
    }
    if (missing.length) {
      return NextResponse.json(
        { ok: false, error: `Missing or invalid fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET) {
      return NextResponse.json(
        { ok: false, error: "Server missing PAYSTACK_SECRET_KEY env var" },
        { status: 500 }
      );
    }

    const amountMinor = Math.round(Number(amount) * 100);

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      new URL(req.url).origin;

    const callbackUrl = `${origin}/knowledge/${encodeURIComponent(
      slug!
    )}/enroll?verify=1`;

    const supabase = getSupabaseAdmin();

    // upsert pending enrollment (typed object; no `any`)
    const upsertRow: EnrollmentUpsert = {
      user_id: user_id!,
      course_id: course_id!,
      paid: false,
      intent_currency: currency ?? null,
      intent_amount_major: Number.isFinite(Number(amount)) ? Number(amount) : null,
    };
    await supabase
      .from("enrollments")
      .upsert(upsertRow, { onConflict: "user_id,course_id" });

    const reference = `pv_${course_id}_${Date.now()}`;

    const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountMinor,
        currency,
        reference,
        callback_url: callbackUrl,
        metadata: { user_id, course_id, slug, product: "course" },
      }),
    });

    const initJson = await initRes.json();
    if (!initRes.ok || initJson?.status === false) {
      return NextResponse.json(
        {
          ok: false,
          error: initJson?.message || `Paystack init failed (${initRes.status})`,
          raw: initJson,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      authorization_url: initJson.data.authorization_url as string,
      access_code: initJson.data.access_code as string,
      reference: initJson.data.reference as string,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Malformed request body or server error" },
      { status: 400 }
    );
  }
}
