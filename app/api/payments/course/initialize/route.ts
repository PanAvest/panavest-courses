import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type InitBody = {
  user_id: string;
  email: string;
  course_id: string;
  slug: string;
  amount: number;
  currency?: string;
};

type EnrollmentUpsert = {
  user_id: string;
  course_id: string;
  paid: boolean;
  intent_currency?: string | null;
  intent_amount_major?: number | null;
};

// Optional: make GET return a friendly message instead of a 400 in console
export async function GET() {
  return NextResponse.json({
    ok: false,
    message: "Use POST with JSON body: { user_id, email, course_id, slug, amount, currency? }",
  });
}

export async function POST(req: Request) {
  try {
    const b = (await req.json()) as Partial<InitBody>;
    const missing: string[] = [];
    if (!b.user_id) missing.push("user_id");
    if (!b.email) missing.push("email");
    if (!b.course_id) missing.push("course_id");
    if (!b.slug) missing.push("slug");
    if (b.amount === undefined || b.amount === null || Number.isNaN(Number(b.amount))) {
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

    const currency = b.currency || "GHS";
    const amountMinor = Math.round(Number(b.amount) * 100);

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      new URL(req.url).origin;

    const callbackUrl = `${origin}/knowledge/${encodeURIComponent(b.slug!)}/enroll?verify=1`;

    // record intent
    const supabase = getSupabaseAdmin();
    const upsertRow: EnrollmentUpsert = {
      user_id: b.user_id!,
      course_id: b.course_id!,
      paid: false,
      intent_currency: currency,
      intent_amount_major: Number(b.amount),
    };
    await supabase.from("enrollments").upsert(upsertRow, { onConflict: "user_id,course_id" });

    const reference = `pv_${b.course_id}_${Date.now()}`;

    const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: b.email,
        amount: amountMinor,
        currency,
        reference,
        callback_url: callbackUrl,
        metadata: { user_id: b.user_id, course_id: b.course_id, slug: b.slug, product: "course" },
      }),
    });

    const initJson = await initRes.json();
    if (!initRes.ok || initJson?.status === false) {
      return NextResponse.json(
        { ok: false, error: initJson?.message || "Paystack init failed", raw: initJson },
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
