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
    purchase_type?: "course" | "ebook"; // optional legacy
    ebook_id?: string;
    book_slug?: string;
    kind?: "course" | "ebook";          // may exist if you mirror init metadata
  } | null;
};

type WebhookEnvelope = {
  event: string;                  // "charge.success", etc.
  data: ChargeSuccessData;
};

export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "PAYSTACK_SECRET_KEY missing" }, { status: 500 });

  const raw = await req.text(); // raw body for signature
  const signature = req.headers.get("x-paystack-signature");
  const expected = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  if (!signature || signature !== expected) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(raw) as WebhookEnvelope;

  if (payload.event === "charge.success" && payload.data?.status === "success") {
    const md = payload.data.metadata ?? {};
    const userId = md.user_id as string | undefined;

    const admin = getSupabaseAdmin();

    // COURSES
    const courseId = md.course_id as string | undefined;
    if (userId && courseId) {
      await admin.from("enrollments").upsert(
        { user_id: userId, course_id: courseId, paid: true },
        { onConflict: "user_id,course_id" },
      );
    }

    // EBOOKS
    const ebookId =
      (md.ebook_id as string | undefined) ||
      undefined;
    const kind = (md.kind as "course" | "ebook" | undefined) || (md.purchase_type as "course" | "ebook" | undefined);

    if (userId && ebookId) {
      await admin.from("ebook_purchases").upsert(
        { user_id: userId, ebook_id: ebookId, status: "paid", paid_at: new Date().toISOString() },
        { onConflict: "user_id,ebook_id" },
      );
    }
  }

  return NextResponse.json({ received: true });
}
