// app/api/payments/paystack/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type ChargeSuccessData = {
  status: string;                 // "success"
  reference: string;
  amount: number;                 // minor units
  currency: string;
  metadata?: {
    user_id?: string;
    course_id?: string;
    slug?: string;
    purchase_type?: "course" | "ebook";
    ebook_id?: string;
    book_slug?: string;
  } | null;
  customer?: { email?: string } | null;
};

type WebhookEnvelope = {
  event: string;                  // "charge.success", etc.
  data: ChargeSuccessData;
};

export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "PAYSTACK_SECRET_KEY missing" }, { status: 500 });

  const raw = await req.text(); // important: raw body for signature
  const signature = req.headers.get("x-paystack-signature");

  const expected = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  if (!signature || signature !== expected) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(raw) as WebhookEnvelope;

  if (payload.event === "charge.success" && payload.data?.status === "success") {
    const md = payload.data.metadata ?? {};
    const userId = md.user_id as string | undefined;
    const courseId = md.course_id as string | undefined;

    if (userId && courseId) {
      const admin = getSupabaseAdmin();
      await admin.from("enrollments").upsert(
        { user_id: userId, course_id: courseId, paid: true },
        { onConflict: "user_id,course_id" },
      );
    }
    // (You can add ebook handling here if needed)
  }

  return NextResponse.json({ received: true });
}
