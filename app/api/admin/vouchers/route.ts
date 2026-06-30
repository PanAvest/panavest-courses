// app/api/admin/vouchers/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeVoucherCode } from "@/lib/vouchers";

export const dynamic = "force-dynamic";

const CreateBody = z.object({
  code: z.string().min(2).max(60).optional(),
  discount_type: z.enum(["percent", "fixed"]).default("percent"),
  discount_value: z.number().int().nonnegative(),
  active: z.boolean().default(true),
  max_uses: z.number().int().positive().nullable().optional(),
  min_subtotal_cents: z.number().int().nonnegative().default(0),
  expires_at: z.string().datetime().nullable().optional(),
});

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `PV-${s}`;
}

export async function GET() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("vouchers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    const text = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
    if (text.includes("vouchers") || error.code === "42P01" || text.includes("does not exist")) {
      return NextResponse.json({ vouchers: [], setup_required: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ vouchers: data ?? [] });
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = CreateBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request." }, { status: 400 });
  }
  const body = parsed.data;

  if (body.discount_type === "percent" && (body.discount_value < 1 || body.discount_value > 100)) {
    return NextResponse.json({ error: "Percent discount must be between 1 and 100." }, { status: 400 });
  }
  if (body.discount_type === "fixed" && body.discount_value < 1) {
    return NextResponse.json({ error: "Fixed discount must be greater than zero." }, { status: 400 });
  }

  const code = body.code ? normalizeVoucherCode(body.code) : randomCode();
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("vouchers")
    .insert({
      code,
      discount_type: body.discount_type,
      discount_value: body.discount_value,
      active: body.active,
      max_uses: body.max_uses ?? null,
      min_subtotal_cents: body.min_subtotal_cents,
      expires_at: body.expires_at ?? null,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That code already exists. Try another." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, voucher: data });
}
