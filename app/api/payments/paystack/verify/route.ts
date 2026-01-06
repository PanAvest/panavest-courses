// app/api/payments/paystack/verify/route.ts
import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { grantBundledEbooks } from "@/lib/grantBundledEbooks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type VerifyPayload = {
  status?: boolean;
  message?: string;
  data?: {
    status?: string; // "success"
    reference?: string;
    paid_at?: string | null;
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

      // Grant bundled ebooks (if any) alongside the course
      const bundle = await grantBundledEbooks(supabase, {
        courseId: meta.course_id,
        userId: meta.user_id,
        paidAt: data.paid_at || new Date().toISOString(),
        reference,
      });
      if (bundle.error) console.warn("[bundles] verify failed", bundle.error);

      return Response.json({ ok: true, kind: "course", slug: meta.slug, reference }, { status: 200 });
    }

    if (meta?.kind === "ebook" && meta.user_id && meta.ebook_id) {
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

      return Response.json({ ok: true, kind: "ebook", slug: meta.slug, reference }, { status: 200 });
    }

    return Response.json({ ok: false, error: "Missing or invalid metadata" }, { status: 400 });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message || "Server error" }, { status: 500 });
  }
}
