// app/api/payments/paystack/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type VerifyApiResponse = {
  status: boolean;
  message: string;
  data?: {
    status: "success" | "failed" | "abandoned" | string;
    reference: string;
    amount: number;
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
};

export async function GET(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "PAYSTACK_SECRET_KEY missing" }, { status: 500 });

  const reference = req.nextUrl.searchParams.get("reference");
  if (!reference) return NextResponse.json({ error: "reference required" }, { status: 400 });

  const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${secret}`, Accept: "application/json" },
    cache: "no-store",
  });
  const data = (await res.json()) as VerifyApiResponse;

  if (!res.ok || !data.status || !data.data) {
    return NextResponse.json({ ok: false, message: data?.message || "Verify failed" }, { status: 400 });
  }

  // Only proceed on success
  if (data.data.status !== "success") {
    return NextResponse.json({ ok: false, message: `Status: ${data.data.status}` }, { status: 400 });
  }

  // Mark the user as paid (course)
  const md = data.data.metadata ?? {};
  const userId = md.user_id as string | undefined;
  const courseId = md.course_id as string | undefined;

  if (userId && courseId) {
    const admin = getSupabaseAdmin();
    await admin.from("enrollments").upsert(
      { user_id: userId, course_id: courseId, paid: true },
      { onConflict: "user_id,course_id" },
    );
  }

  return NextResponse.json({ ok: true });
}
