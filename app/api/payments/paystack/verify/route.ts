// app/api/payments/paystack/verify/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: "PAYSTACK_SECRET_KEY missing" }, { status: 500 });

    const { searchParams } = new URL(req.url);
    const reference = searchParams.get("reference");
    if (!reference) return NextResponse.json({ error: "Missing reference" }, { status: 400 });

    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok || !data?.status) {
      return NextResponse.json({ error: data?.message || "Verify failed" }, { status: 400 });
    }

    const p = data.data;
    if (p.status !== "success") {
      return NextResponse.json({ ok: false, status: p.status }, { status: 200 });
    }

    const meta = p?.metadata || {};
    const supabaseAdmin = getSupabaseAdmin();

    if (meta.kind === "course" && meta.user_id && meta.course_id) {
      await supabaseAdmin
        .from("enrollments")
        .upsert(
          {
            user_id: meta.user_id,
            course_id: meta.course_id,
            paid: true,
            paystack_ref: reference,
            amount_minor: p.amount,
            currency: p.currency,
            gateway: "paystack",
          },
          { onConflict: "user_id,course_id" }
        );

      // optional: user-friendly redirect back to course page
      const base = process.env.POST_PAY_REDIRECT_BASE || "/knowledge";
      const dest = meta.slug ? `${base}/${meta.slug}` : base;
      return NextResponse.redirect(new URL(dest, new URL(req.url).origin));
    }

    // (ebook flow to be added when you share table/columns)
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Verify error" }, { status: 500 });
  }
}
