// app/api/payments/paystack/verify/route.ts
import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { grantBundledEbooks } from "@/lib/grantBundledEbooks";
import { redeemVoucher } from "@/lib/vouchers";
import { sendPurchaseReceipt } from "@/lib/purchaseEmails";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type VerifyPayload = {
  status?: boolean;
  message?: string;
  data?: {
    status?: string; // "success"
    reference?: string;
    paid_at?: string | null;
    amount?: number;
    currency?: string;
    channel?: string | null;
    customer?: { email?: string | null } | null;
    metadata?: {
      kind?: "course" | "ebook";
      user_id?: string;
      course_id?: string;
      ebook_id?: string;
      slug?: string;
      voucher_code?: string;
    } | null;
  };
};

export async function GET(req: NextRequest) {
  try {
    const sk = process.env.PAYSTACK_SECRET_KEY;
    if (!sk) {
      return Response.json({ ok: false, error: "Missing PAYSTACK_SECRET_KEY" }, { status: 500 });
    }

    const url = new URL(req.url);
    const reference = url.searchParams.get("reference") || url.searchParams.get("trxref");
    if (!reference) {
      return Response.json({ ok: false, error: "Missing reference" }, { status: 400 });
    }

    // 1) Verify with Paystack
    const psRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${sk}` } }
    );

    let parsed: VerifyPayload | null = null;
    try { parsed = (await psRes.json()) as VerifyPayload; } catch {}
    const okFlag = parsed?.status === true;
    const data = parsed?.data || {};
    if (!okFlag || data.status !== "success") {
      return Response.json(
        { ok: false, error: parsed?.message || "Verification failed", data },
        { status: 400 }
      );
    }

    const meta = (data.metadata || {}) as NonNullable<VerifyPayload["data"]>["metadata"];
    const supabase = getSupabaseAdmin();

    // 2) Minimal schema-safe writes: ONLY columns guaranteed to exist in your app logic
    if (meta?.kind === "course" && meta.user_id && meta.course_id) {
      // Check prior state so a voucher is only consumed once (verify can run more than once).
      const priorEnr = await supabase
        .from("enrollments")
        .select("paid")
        .eq("user_id", meta.user_id)
        .eq("course_id", meta.course_id)
        .maybeSingle();
      const wasPaid = Boolean((priorEnr.data as { paid?: boolean } | null)?.paid);

      const up = await supabase
        .from("enrollments")
        .upsert(
          {
            user_id: meta.user_id,
            course_id: meta.course_id,
            paid: true,
          } as Record<string, unknown>,
          { onConflict: "user_id,course_id" }
        );
      if (up.error) return Response.json({ ok: false, error: up.error.message }, { status: 500 });

      if (!wasPaid && meta.voucher_code) {
        await redeemVoucher(supabase, meta.voucher_code);
      }

      // Grant bundled ebooks (if any) alongside the course
      const bundle = await grantBundledEbooks(supabase, {
        courseId: meta.course_id,
        userId: meta.user_id,
        paidAt: data.paid_at || new Date().toISOString(),
        reference,
      });
      if (bundle.error) console.warn("[bundles] verify failed", bundle.error);

      await sendPurchaseReceipt(supabase, {
        kind: "course",
        userId: meta.user_id,
        itemId: meta.course_id,
        reference,
        amountMinor: typeof data.amount === "number" ? data.amount : null,
        currency: data.currency,
        paidAt: data.paid_at,
        channel: data.channel,
        email: data.customer?.email,
        voucherCode: meta.voucher_code,
      });

      return Response.json({ ok: true, kind: "course", slug: meta.slug, reference }, { status: 200 });
    }

    if (meta?.kind === "ebook" && meta.user_id && meta.ebook_id) {
      // Check prior state so a voucher is only consumed once (verify can run more than once).
      const prior = await supabase
        .from("ebook_purchases")
        .select("status")
        .eq("user_id", meta.user_id)
        .eq("ebook_id", meta.ebook_id)
        .maybeSingle();
      const wasPaid = (prior.data as { status?: string } | null)?.status === "paid";

      const up = await supabase
        .from("ebook_purchases")
        .upsert(
          {
            user_id: meta.user_id,
            ebook_id: meta.ebook_id,
            status: "paid",
          } as Record<string, unknown>,
          { onConflict: "user_id,ebook_id" }
        );
      if (up.error) return Response.json({ ok: false, error: up.error.message }, { status: 500 });

      if (!wasPaid && meta.voucher_code) {
        await redeemVoucher(supabase, meta.voucher_code);
      }

      await sendPurchaseReceipt(supabase, {
        kind: "ebook",
        userId: meta.user_id,
        itemId: meta.ebook_id,
        reference,
        amountMinor: typeof data.amount === "number" ? data.amount : null,
        currency: data.currency,
        paidAt: data.paid_at,
        channel: data.channel,
        email: data.customer?.email,
        voucherCode: meta.voucher_code,
      });

      return Response.json({ ok: true, kind: "ebook", slug: meta.slug, reference }, { status: 200 });
    }

    return Response.json({ ok: false, error: "Missing or invalid metadata" }, { status: 400 });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message || "Server error" }, { status: 500 });
  }
}
