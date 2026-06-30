// app/api/vouchers/validate/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { validateVoucher } from "@/lib/vouchers";

export const dynamic = "force-dynamic";

const Body = z.object({
  code: z.string().min(1),
  subtotal_cents: z.number().int().nonnegative(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const { code, subtotal_cents } = parsed.data;
  const admin = getSupabaseAdmin();
  const result = await validateVoucher(admin, code, subtotal_cents);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 200 });
  }

  return NextResponse.json({
    ok: true,
    code: result.voucher.code,
    discount_type: result.voucher.discount_type,
    discount_value: result.voucher.discount_value,
    discount_cents: result.discountCents,
    total_cents: Math.max(0, subtotal_cents - result.discountCents),
    label: result.label,
  });
}
