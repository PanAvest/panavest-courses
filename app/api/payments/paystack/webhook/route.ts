// app/api/payments/paystack/webhook/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readRaw(req: Request) {
  const buf = await req.arrayBuffer();
  return Buffer.from(buf);
}

export async function POST(req: Request) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: "PAYSTACK_SECRET_KEY missing" }, { status: 500 });

    const raw = await readRaw(req);
    const signature = req.headers.get("x-paystack-signature") || "";
    const computed = crypto.createHmac("sha512", secret).update(raw).digest("hex");
    if (computed !== signature) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

    const event = JSON.parse(raw.toString("utf8"));
    if (event.event === "charge.success") {
      const p = event.data;
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
              paystack_ref: p.reference,
              amount_minor: p.amount,
              currency: p.currency,
              gateway: "paystack",
            },
            { onConflict: "user_id,course_id" }
          );
      }

      // (ebook flow to be added later)
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Webhook error" }, { status: 500 });
  }
}
