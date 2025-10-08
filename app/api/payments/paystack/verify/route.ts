import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type VerifyPayload = {
  status?: boolean;
  message?: string;
  data?: {
    status?: string;                // "success" | ...
    reference?: string;
    amount?: number;                // minor units
    currency?: string;
    customer?: { email?: string | null } | null;
    metadata?: Record<string, unknown> | null;
  };
};

export async function GET(req: NextRequest) {
  const sk = process.env.PAYSTACK_SECRET_KEY;
  if (!sk) {
    return Response.json({ ok: false, error: "Missing PAYSTACK_SECRET_KEY" }, { status: 500 });
  }

  const url = new URL(req.url);
  // Paystack sometimes returns both; handle either.
  const reference =
    url.searchParams.get("reference") || url.searchParams.get("trxref");

  if (!reference) {
    return Response.json({ ok: false, error: "Missing reference" }, { status: 400 });
  }

  // Verify with Paystack
  const psRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${sk}` } }
  );

  let parsed: unknown = null;
  try {
    parsed = await psRes.json();
  } catch {
    // ignore parse errors; leave parsed as null
  }

  const obj = (parsed && typeof parsed === "object" ? parsed : {}) as VerifyPayload;

  const okFlag = obj.status === true;
  const data = obj.data ?? {};

  const psStatus = data.status || "";
  const amountMinor = typeof data.amount === "number" ? data.amount : undefined;
  const currency = (data.currency || "GHS")!.toUpperCase();
  const meta = (data.metadata && typeof data.metadata === "object"
    ? (data.metadata as Record<string, unknown>)
    : {}) as Record<string, unknown>;

  const user_id = typeof meta.user_id === "string" ? meta.user_id : null;
  const course_id = typeof meta.course_id === "string" ? meta.course_id : null;
  const slug = typeof meta.slug === "string" ? meta.slug : null;

  if (!okFlag || psStatus !== "success") {
    return Response.json(
      { ok: false, error: obj.message || "Verification failed", data: obj.data },
      { status: 400 }
    );
  }

  if (!user_id || !course_id || !slug) {
    return Response.json(
      { ok: false, error: "Missing metadata (user_id, course_id, slug)" },
      { status: 400 }
    );
  }

  // Mark enrollment as paid (idempotent)
  const supabase = getSupabaseAdmin();
  const upsert = await supabase
    .from("enrollments")
    .upsert(
      {
        user_id,
        course_id,
        paid: true,
        updated_at: new Date().toISOString(),
        paystack_reference: reference,
        amount_minor: amountMinor,
        currency,
      },
      { onConflict: "user_id,course_id" }
    )
    .select("user_id");

  if (upsert.error) {
    return Response.json(
      { ok: false, error: `DB error: ${upsert.error.message}` },
      { status: 500 }
    );
  }

  return Response.json({ ok: true, slug, reference }, { status: 200 });
}
