// app/api/payments/paystack/verify/route.ts
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
    const now = new Date().toISOString();

    // 2) Minimal, schema-safe writes

    // Courses: only write guaranteed columns
    if (meta?.kind === "course" && meta.user_id && meta.course_id) {
      const up = await supabase
        .from("enrollments")
        .upsert(
          {
            user_id: meta.user_id,
            course_id: meta.course_id,
            paid: true,
            // only set paid_at if your table has it; it's safe to include in most schemas:
            paid_at: data.paid_at || now,
            updated_at: now,
          } as Record<string, unknown>,
          { onConflict: "user_id,course_id" }
        );

      if (up.error) {
        // expose error to help diagnose schema issues
        return Response.json({ ok: false, error: up.error.message }, { status: 500 });
      }

      return Response.json(
        { ok: true, kind: "course", slug: meta.slug, reference },
        { status: 200 }
      );
    }

    // Ebooks: only write guaranteed columns
    if (meta?.kind === "ebook" && meta.user_id && meta.ebook_id) {
      const up = await supabase
        .from("ebook_purchases")
        .upsert(
          {
            user_id: meta.user_id,
            ebook_id: meta.ebook_id,
            status: "paid",
            paid_at: data.paid_at || now, // safe if your table has paid_at
            updated_at: now,
          } as Record<string, unknown>,
          { onConflict: "user_id,ebook_id" }
        );

      if (up.error) {
        return Response.json({ ok: false, error: up.error.message }, { status: 500 });
      }

      return Response.json(
        { ok: true, kind: "ebook", slug: meta.slug, reference },
        { status: 200 }
      );
    }

    return Response.json({ ok: false, error: "Missing or invalid metadata" }, { status: 400 });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message || "Server error" }, { status: 500 });
  }
}
