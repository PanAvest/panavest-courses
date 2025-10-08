// app/api/payments/paystack/init/route.ts
import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type MetaCourse = { kind: "course"; user_id: string; course_id: string; slug: string };
type MetaEbook  = { kind: "ebook";  user_id: string; ebook_id:  string; slug: string };
type Meta = MetaCourse | MetaEbook;

type InitBody = {
  email: string;
  amountMinor: number;          // e.g. 30000 for GHS 300.00
  currency?: string;            // default GHS
  meta: Meta;
};

type PaystackInitOk = {
  status: true;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};
type PaystackInitErr = { status: false; message: string };

function getAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; // service role for server routes
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InitBody;

    // Basic validation (no "any" warnings)
    if (!body?.email || typeof body.email !== "string") {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }
    if (
      typeof body.amountMinor !== "number" ||
      !Number.isFinite(body.amountMinor) ||
      body.amountMinor <= 0
    ) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (!body.meta || typeof body.meta !== "object" || !("kind" in body.meta)) {
      return NextResponse.json({ error: "Missing meta" }, { status: 400 });
    }
    if (body.meta.kind === "course") {
      if (!body.meta.user_id || !body.meta.course_id || !body.meta.slug) {
        return NextResponse.json({ error: "Missing course meta" }, { status: 400 });
      }
    } else if (body.meta.kind === "ebook") {
      if (!body.meta.user_id || !body.meta.ebook_id || !body.meta.slug) {
        return NextResponse.json({ error: "Missing ebook meta" }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Invalid meta.kind" }, { status: 400 });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: "PAYSTACK_SECRET_KEY not set" }, { status: 500 });

    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const callback_url = `${origin}/api/payments/paystack/callback`;

    // (Optional) pre-create records so you can track pending states (safe to skip)
    const admin = getAdmin();
    const now = new Date().toISOString();
    if (body.meta.kind === "course") {
      await admin
        .from("enrollments")
        .upsert(
          {
            user_id: body.meta.user_id,
            course_id: body.meta.course_id,
            paid: false,
            gateway: "paystack",
            currency: body.currency ?? "GHS",
            amount_minor: body.amountMinor,
            updated_at: now,
          },
          { onConflict: "user_id,course_id" }
        );
    } else {
      // create/ensure ebook purchase row exists as pending
      await admin
        .from("ebook_purchases")
        .upsert(
          {
            user_id: body.meta.user_id,
            ebook_id: body.meta.ebook_id,
            status: "pending",
            updated_at: now,
          } as Record<string, unknown>,
          { onConflict: "user_id,ebook_id" }
        );
    }

    // Initialize Paystack
    const initPayload = {
      email: body.email,
      amount: body.amountMinor,                    // minor units (pesewas)
      currency: body.currency ?? "GHS",
      callback_url,
      metadata: body.meta,                         // we’ll read this on callback
    };

    const ps = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(initPayload),
    });

    const json = (await ps.json()) as PaystackInitOk | PaystackInitErr;
    if (!ps.ok || json.status !== true) {
      return NextResponse.json({ error: json?.message || "Paystack init failed" }, { status: 400 });
    }

    // Return hosted checkout URL
    return NextResponse.json({
      authorization_url: json.data.authorization_url,
      reference: json.data.reference,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Server error" }, { status: 500 });
  }
}
