// app/api/payments/paystack/init/route.ts
import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { validateVoucher, normalizeVoucherCode } from "@/lib/vouchers";

type MetaCourse = { kind: "course"; user_id: string; course_id: string; slug: string; voucher_code?: string };
type MetaEbook  = { kind: "ebook";  user_id: string; ebook_id:  string; slug: string; voucher_code?: string };
type Meta = MetaCourse | MetaEbook;

type InitBody = {
  email: string;
  amountMinor: number;          // e.g. 30000 for GHS 300.00
  voucherCode?: string;         // optional discount voucher
  meta: Meta;
};

const PAYSTACK_CURRENCY = "GHS" as const;

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

function isMissingFreeColumnError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const rec = err as { code?: string; message?: string; details?: string; hint?: string };
  const text = `${rec.message ?? ""} ${rec.details ?? ""} ${rec.hint ?? ""}`.toLowerCase();
  if (!text.includes("free_for_logged_in")) return false;
  if (rec.code === "42703" || rec.code === "PGRST204") return true;
  return text.includes("does not exist") || text.includes("schema cache") || text.includes("could not find");
}

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
    // ⬇️ Route back to a PAGE, not an API
    const callback_url = `${origin}/api/payments/paystack/callback`;
    // (Optional) pre-create records so you can track pending states (safe to skip)
    const admin = getAdmin();
    let serverPriceMinor: number | null = null; // authoritative price from the DB (ebooks)
    if (body.meta.kind === "course") {
      const { data: course, error: courseErr } = await admin
        .from("courses")
        .select("free_for_logged_in, price")
        .eq("id", body.meta.course_id)
        .maybeSingle();
      if (courseErr) {
        if (!isMissingFreeColumnError(courseErr)) {
          return NextResponse.json({ error: courseErr.message }, { status: 500 });
        }
        const { data: priceRow } = await admin
          .from("courses")
          .select("price")
          .eq("id", body.meta.course_id)
          .maybeSingle();
        const p = (priceRow as { price?: number | null } | null)?.price;
        if (typeof p === "number" && Number.isFinite(p) && p > 0) serverPriceMinor = Math.round(p * 100);
      }
      if (course?.free_for_logged_in === true) {
        return NextResponse.json(
          { error: "This program is free for logged-in users. No payment is required." },
          { status: 409 },
        );
      }
      const p = (course as { price?: number | null } | null)?.price;
      if (typeof p === "number" && Number.isFinite(p) && p > 0) serverPriceMinor = Math.round(p * 100);
    } else {
      const { data: ebook, error: ebookErr } = await admin
        .from("ebooks")
        .select("free_for_logged_in, price_cents")
        .eq("id", body.meta.ebook_id)
        .maybeSingle();
      if (ebookErr) {
        if (!isMissingFreeColumnError(ebookErr)) {
          return NextResponse.json({ error: ebookErr.message }, { status: 500 });
        }
        // free_for_logged_in column missing — fetch price on its own so we keep authoritative pricing.
        const { data: priceRow } = await admin
          .from("ebooks")
          .select("price_cents")
          .eq("id", body.meta.ebook_id)
          .maybeSingle();
        const p = (priceRow as { price_cents?: number | null } | null)?.price_cents;
        if (typeof p === "number" && Number.isFinite(p) && p > 0) serverPriceMinor = Math.round(p);
      } else {
        if (ebook?.free_for_logged_in === true) {
          return NextResponse.json(
            { error: "This e-book is free for logged-in users. No payment is required." },
            { status: 409 },
          );
        }
        const p = (ebook as { price_cents?: number | null } | null)?.price_cents;
        if (typeof p === "number" && Number.isFinite(p) && p > 0) serverPriceMinor = Math.round(p);
      }
    }

    // Use the authoritative server price when we have it (never trust the client amount blindly).
    const baseAmount = Math.round(serverPriceMinor ?? body.amountMinor);
    if (!Number.isInteger(baseAmount) || baseAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Apply an optional discount voucher (re-validated server-side).
    let amountToCharge = baseAmount;
    const metaForPaystack: Meta = { ...body.meta };
    if (body.voucherCode && body.voucherCode.trim()) {
      const v = await validateVoucher(admin, body.voucherCode, baseAmount);
      if (!v.ok) {
        return NextResponse.json({ error: v.error }, { status: 400 });
      }
      const discounted = Math.max(0, baseAmount - v.discountCents);
      if (discounted <= 0) {
        return NextResponse.json(
          { error: "This voucher cannot be applied to this item (it would reduce the price to zero)." },
          { status: 400 },
        );
      }
      amountToCharge = discounted;
      metaForPaystack.voucher_code = normalizeVoucherCode(body.voucherCode);
    }

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
            currency: PAYSTACK_CURRENCY,
            amount_minor: amountToCharge,
            updated_at: now,
          },
          { onConflict: "user_id,course_id" },
        );
    } else {
      // Create/ensure the e-book purchase row exists as pending.
      await admin
        .from("ebook_purchases")
        .upsert(
          {
            user_id: body.meta.user_id,
            ebook_id: body.meta.ebook_id,
            status: "pending",
            updated_at: now,
          } as Record<string, unknown>,
          { onConflict: "user_id,ebook_id" },
        );
    }

    // Initialize Paystack
    const initPayload = {
      email: body.email,
      amount: amountToCharge,                       // minor units (pesewas)
      currency: PAYSTACK_CURRENCY,
      callback_url,
      metadata: metaForPaystack,                    // we’ll read this on callback
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
