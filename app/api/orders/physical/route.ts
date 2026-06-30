// app/api/orders/physical/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { validateVoucher, redeemVoucher, normalizeVoucherCode } from "@/lib/vouchers";
import { decrementStock, incrementStock } from "@/lib/stock";
import { sendEmailOnce } from "@/lib/email";
import { physicalOrderInvoiceEmail } from "@/lib/emailTemplates";

export const dynamic = "force-dynamic";

const Body = z.object({
  ebook_slug: z.string().min(1),
  customer_name: z.string().min(1, "Name is required").max(160),
  email: z.string().email("A valid email is required"),
  phone: z.string().min(6, "A valid phone number is required").max(40),
  quantity: z.number().int().positive().max(999),
  fulfillment: z.enum(["delivery", "pickup"]),
  region: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  street: z.string().max(400).optional().nullable(),
  voucher_code: z.string().max(60).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

type EbookRow = {
  id: string;
  slug: string;
  title: string | null;
  price_cents: number | null;
  physical_price_cents?: number | null;
  stock_quantity?: number | null;
};

function makeOrderRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PHY-${ts}-${rand}`;
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request." },
      { status: 400 },
    );
  }
  const body = parsed.data;

  if (body.fulfillment === "delivery") {
    if (!body.region?.trim() || !body.city?.trim() || !body.street?.trim()) {
      return NextResponse.json(
        { error: "Region, city and street are required for delivery." },
        { status: 400 },
      );
    }
  }

  const admin = getSupabaseAdmin();

  // 1) Look up the e-book (select * so missing stock columns degrade gracefully).
  const { data: ebookData, error: ebookErr } = await admin
    .from("ebooks")
    .select("*")
    .eq("slug", body.ebook_slug)
    .maybeSingle();
  if (ebookErr) {
    return NextResponse.json({ error: ebookErr.message }, { status: 500 });
  }
  if (!ebookData) {
    return NextResponse.json({ error: "E-book not found." }, { status: 404 });
  }
  const ebook = ebookData as EbookRow;

  // Physical copies use the dedicated physical price, falling back to the digital price.
  const physical = ebook.physical_price_cents;
  const unitPrice =
    typeof physical === "number" && physical > 0
      ? Math.round(physical)
      : Math.max(0, Math.round(Number(ebook.price_cents ?? 0)));
  const subtotal = unitPrice * body.quantity;

  // 2) Stock enforcement (only when the column exists in the row).
  const stockTracked = typeof ebook.stock_quantity === "number";
  const currentStock = stockTracked ? (ebook.stock_quantity as number) : 0;
  if (stockTracked && currentStock < body.quantity) {
    return NextResponse.json(
      {
        error:
          currentStock <= 0
            ? "This title is currently out of stock."
            : `Only ${currentStock} cop${currentStock === 1 ? "y" : "ies"} left in stock.`,
      },
      { status: 409 },
    );
  }

  // 3) Voucher (optional).
  let discountCents = 0;
  let appliedVoucher: string | null = null;
  if (body.voucher_code && body.voucher_code.trim()) {
    const v = await validateVoucher(admin, body.voucher_code, subtotal);
    if (!v.ok) {
      return NextResponse.json({ error: v.error }, { status: 400 });
    }
    discountCents = v.discountCents;
    appliedVoucher = normalizeVoucherCode(body.voucher_code);
  }

  const total = Math.max(0, subtotal - discountCents);

  // 4) Reserve stock before creating the order (avoids overselling).
  if (stockTracked) {
    const reserved = await decrementStock(admin, ebook.id, body.quantity);
    if (!reserved) {
      return NextResponse.json(
        { error: "Sorry, stock changed while ordering. Please try again." },
        { status: 409 },
      );
    }
  }

  // 5) Create the order. (Voucher is redeemed only AFTER a successful insert.)
  const orderRef = makeOrderRef();
  const { data: order, error: insErr } = await admin
    .from("physical_orders")
    .insert({
      order_ref: orderRef,
      ebook_id: ebook.id,
      ebook_slug: ebook.slug,
      ebook_title: ebook.title,
      customer_name: body.customer_name.trim(),
      email: body.email.trim(),
      phone: body.phone.trim(),
      quantity: body.quantity,
      fulfillment: body.fulfillment,
      region: body.region?.trim() || null,
      city: body.city?.trim() || null,
      street: body.street?.trim() || null,
      unit_price_cents: unitPrice,
      subtotal_cents: subtotal,
      voucher_code: appliedVoucher,
      discount_cents: discountCents,
      total_cents: total,
      status: "new",
      notes: body.notes?.trim() || null,
    })
    .select("id, order_ref, total_cents")
    .maybeSingle();

  if (insErr) {
    // Roll back the reservation by RETURNING the reserved units (relative, race-safe).
    if (stockTracked) {
      await incrementStock(admin, ebook.id, body.quantity);
    }
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  // 6) Redeem the voucher now that the order is committed (best-effort).
  if (appliedVoucher) {
    await redeemVoucher(admin, appliedVoucher);
  }

  // 7) Email the customer their order confirmation / invoice (best-effort, once per order).
  try {
    await sendEmailOnce(
      admin,
      { ref: orderRef, kind: "order_invoice", to: body.email.trim() },
      () =>
        physicalOrderInvoiceEmail({
          orderRef,
          customerName: body.customer_name,
          itemTitle: ebook.title || "Book",
          quantity: body.quantity,
          unitMinor: unitPrice,
          subtotalMinor: subtotal,
          discountMinor: discountCents,
          totalMinor: total,
          voucherCode: appliedVoucher,
          fulfillment: body.fulfillment,
          region: body.region,
          city: body.city,
          street: body.street,
          phone: body.phone,
        }),
    );
  } catch (e) {
    console.error("[orders] invoice email failed:", (e as Error).message);
  }

  return NextResponse.json({
    ok: true,
    order_ref: order?.order_ref ?? orderRef,
    total_cents: total,
    subtotal_cents: subtotal,
    discount_cents: discountCents,
  });
}
