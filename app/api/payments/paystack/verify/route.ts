import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type VerifyPayload = {
  status?: boolean;
  message?: string;
  data?: {
    status?: string; // "success"
    reference?: string;
    amount?: number; // minor units
    currency?: string;
    metadata?: {
      kind?: "course" | "ebook";
      user_id?: string;
      course_id?: string;
      ebook_id?: string;
      slug?: string;
    } | null;
  };
};

export async function GET(req: NextRequest) {
  const sk = process.env.PAYSTACK_SECRET_KEY;
  if (!sk) {
    return Response.json({ ok: false, error: "Missing PAYSTACK_SECRET_KEY" }, { status: 500 });
  }

  const url = new URL(req.url);
  const reference = url.searchParams.get("reference") || url.searchParams.get("trxref");
  if (!reference) {
    return Response.json({ ok: false, error: "Missing reference" }, { status: 400 });
  }

  const psRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${sk}` } }
  );

  let parsed: VerifyPayload | null = null;
  try { parsed = await psRes.json() as VerifyPayload; } catch {}

  const okFlag = parsed?.status === true;
  const data = parsed?.data || {};
  if (!okFlag || data.status !== "success") {
    return Response.json(
      { ok: false, error: parsed?.message || "Verification failed", data },
      { status: 400 }
    );
  }

  const meta = (data.metadata || {}) as NonNullable<VerifyPayload["data"]>["metadata"];
  const amountMinor = typeof data.amount === "number" ? data.amount : undefined;
  const currency = (data.currency || "GHS").toUpperCase();

  const supabase = getSupabaseAdmin();

  // Courses
  if (meta?.kind === "course" && meta.user_id && meta.course_id) {
    const up = await supabase
      .from("enrollments")
      .upsert(
        {
          user_id: meta.user_id,
          course_id: meta.course_id,
          paid: true,
          updated_at: new Date().toISOString(),
          paystack_reference: reference,
          amount_minor: amountMinor,
          currency,
        },
        { onConflict: "user_id,course_id" }
      );
    if (up.error) {
      return Response.json({ ok: false, error: up.error.message }, { status: 500 });
    }
    return Response.json({ ok: true, slug: meta.slug, reference }, { status: 200 });
  }

  // Ebooks
  if (meta?.kind === "ebook" && meta.user_id && meta.ebook_id) {
    const up = await supabase
      .from("ebook_purchases")
      .upsert(
        {
          user_id: meta.user_id,
          ebook_id: meta.ebook_id,
          status: "paid",
          paid_at: new Date().toISOString(),
          paystack_reference: reference,
          amount_minor: amountMinor,
          currency,
        } as Record<string, unknown>,
        { onConflict: "user_id,ebook_id" }
      );
    if (up.error) {
      return Response.json({ ok: false, error: up.error.message }, { status: 500 });
    }
    return Response.json({ ok: true, slug: meta.slug, reference }, { status: 200 });
  }

  return Response.json({ ok: false, error: "Missing or invalid metadata" }, { status: 400 });
}
