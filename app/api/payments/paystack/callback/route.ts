// app/api/payments/paystack/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PaystackVerifyOk = {
  status: true;
  message: string;
  data: {
    status: "success" | "failed" | "abandoned";
    reference: string;
    currency: string;
    amount: number;
    paid_at: string | null;
    metadata?: {
      kind?: "course" | "ebook";
      user_id?: string;
      course_id?: string;
      ebook_id?: string;
      slug?: string;
    };
  };
};
type PaystackVerifyErr = { status: false; message: string };

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference") || url.searchParams.get("trxref");
  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: "PAYSTACK_SECRET_KEY not set" }, { status: 500 });
    }

    // Verify with Paystack
    const resp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    const json = (await resp.json()) as PaystackVerifyOk | PaystackVerifyErr;
    if (!resp.ok || json.status !== true) {
      return NextResponse.json({ error: (json as PaystackVerifyErr)?.message || "Verify failed" }, { status: 400 });
    }

    const d = (json as PaystackVerifyOk).data;
    const meta = d.metadata || {};
    const kind = meta.kind;
    const now = new Date().toISOString();

    const isPaid = d.status === "success";
    const currency = d.currency || "GHS";
    const amountMinor = typeof d.amount === "number" ? d.amount : null;

    const sb = admin();

    if (kind === "course" && meta.user_id && meta.course_id && meta.slug) {
      // Mark enrollment
      await sb
        .from("enrollments")
        .upsert(
          {
            user_id: meta.user_id,
            course_id: meta.course_id,
            paid: isPaid,
            paid_at: isPaid ? d.paid_at || now : null,
            currency,
            amount_minor: amountMinor,
            gateway: "paystack",
            paystack_reference: d.reference,
            paystack_status: d.status,
            paystack_meta: d as unknown as Record<string, unknown>,
            last_webhook_at: now,
            updated_at: now,
          },
          { onConflict: "user_id,course_id" }
        );

      // Redirect to course dashboard WITH reference so your page logic can react if needed
      return NextResponse.redirect(
        new URL(`/knowledge/${encodeURIComponent(meta.slug)}/dashboard?reference=${encodeURIComponent(reference)}&paid=${isPaid ? "1" : "0"}`, url.origin)
      );
    }

    if (kind === "ebook" && meta.user_id && meta.ebook_id && meta.slug) {
      // Mark ebook purchase
      await sb
        .from("ebook_purchases")
        .upsert(
          {
            user_id: meta.user_id,
            ebook_id: meta.ebook_id,
            status: isPaid ? "paid" : "failed",
            paid_at: isPaid ? d.paid_at || now : null,
            paystack_reference: d.reference,
            updated_at: now,
          } as Record<string, unknown>,
          { onConflict: "user_id,ebook_id" }
        );

      // Redirect back to the ebook page WITH reference to trigger your polling
      return NextResponse.redirect(
        new URL(`/ebooks/${encodeURIComponent(meta.slug)}?reference=${encodeURIComponent(reference)}&paid=${isPaid ? "1" : "0"}`, url.origin)
      );
    }

    // Fallback
    return NextResponse.redirect(new URL("/", url.origin));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Server error" }, { status: 500 });
  }
}
