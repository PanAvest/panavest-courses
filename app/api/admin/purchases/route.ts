import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const isStr = (x: unknown): x is string => typeof x === "string";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get("limit") ?? "2000");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 5000) : 2000;

  const db = getSupabaseAdmin();

  const [enrRes, ebookRes] = await Promise.all([
    db
      .from("enrollments")
      .select(
        "user_id, course_id, paid, paid_at, currency, amount_minor, gateway, paystack_reference, paystack_status, updated_at, created_at, courses ( title )"
      )
      .order("paid_at", { ascending: false })
      .limit(limit),
    db
      .from("ebook_purchases")
      .select(
        "user_id, ebook_id, status, paid_at, updated_at, paystack_reference, ebooks ( title, price_cents )"
      )
      .order("paid_at", { ascending: false })
      .limit(limit),
  ]);

  if (enrRes.error || ebookRes.error) {
    return NextResponse.json(
      { error: enrRes.error?.message || ebookRes.error?.message || "Failed to load purchases" },
      { status: 500 }
    );
  }

  const enrollments = Array.isArray(enrRes.data) ? enrRes.data : [];
  const ebookPurchases = Array.isArray(ebookRes.data) ? ebookRes.data : [];

  const userIds = new Set<string>();
  enrollments.forEach((row) => {
    const id = String((row as Record<string, unknown>).user_id ?? "");
    if (id) userIds.add(id);
  });
  ebookPurchases.forEach((row) => {
    const id = String((row as Record<string, unknown>).user_id ?? "");
    if (id) userIds.add(id);
  });

  const emailById = new Map<string, string | null>();
  if (userIds.size > 0) {
    try {
      const { data: authUsers, error: authErr } = await db
        .schema("auth")
        .from("users")
        .select("id, email")
        .in("id", Array.from(userIds));
      if (!authErr && Array.isArray(authUsers)) {
        authUsers.forEach((u) => {
          const id = String((u as Record<string, unknown>).id ?? "");
          if (!id) return;
          const email = (u as Record<string, unknown>).email;
          emailById.set(id, isStr(email) ? email : null);
        });
      }
    } catch {
      // ignore auth lookup failures
    }
  }

  const purchases = [
    ...enrollments.map((row) => {
      const r = row as Record<string, unknown>;
      const courseId = String(r["course_id"] ?? "");
      const coursesField = r["courses"];
      const title =
        Array.isArray(coursesField)
          ? (coursesField[0] as { title?: string | null })?.title
          : (coursesField as { title?: string | null } | null | undefined)?.title;
      const paidFlag = Boolean(r["paid"] ?? false);
      const paystackStatus = isStr(r["paystack_status"]) ? r["paystack_status"] : null;
      const status = paidFlag ? "paid" : paystackStatus || "pending";
      const isPaid = paidFlag || paystackStatus === "success";
      const amountRaw = r["amount_minor"];
      const amountParsed =
        typeof amountRaw === "number"
          ? amountRaw
          : isStr(amountRaw)
            ? Number(amountRaw)
            : null;
      const amountMinor =
        typeof amountParsed === "number" && Number.isFinite(amountParsed) ? amountParsed : null;
      const currency = isStr(r["currency"]) ? r["currency"] : null;
      const provider = isStr(r["gateway"]) ? r["gateway"] : null;
      const reference = isStr(r["paystack_reference"]) ? r["paystack_reference"] : null;
      const paidAt = isStr(r["paid_at"]) ? r["paid_at"] : null;
      const updatedAt = isStr(r["updated_at"]) ? r["updated_at"] : null;
      const createdAt = isStr(r["created_at"]) ? r["created_at"] : null;
      const effectiveAt = paidAt || updatedAt || createdAt || null;
      const userId = String(r["user_id"] ?? "");
      const refPart = reference || effectiveAt || "course";
      return {
        id: `course:${courseId}:${userId}:${refPart}`,
        kind: "course" as const,
        item_id: courseId,
        item_title: title ?? courseId,
        user_id: userId,
        user_email: emailById.get(userId) ?? null,
        amount_minor: amountMinor,
        currency: currency ?? "GHS",
        status,
        is_paid: isPaid,
        provider,
        reference,
        paid_at: paidAt,
        updated_at: updatedAt,
        created_at: createdAt,
        effective_at: effectiveAt,
      };
    }),
    ...ebookPurchases.map((row) => {
      const r = row as Record<string, unknown>;
      const ebookId = String(r["ebook_id"] ?? "");
      const ebooksField = r["ebooks"];
      const title =
        Array.isArray(ebooksField)
          ? (ebooksField[0] as { title?: string | null })?.title
          : (ebooksField as { title?: string | null } | null | undefined)?.title;
      const priceRaw =
        Array.isArray(ebooksField) && ebooksField.length > 0
          ? (ebooksField[0] as { price_cents?: number | string | null })?.price_cents ?? null
          : (ebooksField as { price_cents?: number | string | null } | null | undefined)
              ?.price_cents ?? null;
      const priceParsed =
        typeof priceRaw === "number" ? priceRaw : isStr(priceRaw) ? Number(priceRaw) : null;
      const status = isStr(r["status"]) ? r["status"] : null;
      const isPaid = status === "paid" || status === "success";
      const reference = isStr(r["paystack_reference"]) ? r["paystack_reference"] : null;
      const paidAt = isStr(r["paid_at"]) ? r["paid_at"] : null;
      const updatedAt = isStr(r["updated_at"]) ? r["updated_at"] : null;
      const effectiveAt = paidAt || updatedAt || null;
      const userId = String(r["user_id"] ?? "");
      const refPart = reference || effectiveAt || "ebook";
      return {
        id: `ebook:${ebookId}:${userId}:${refPart}`,
        kind: "ebook" as const,
        item_id: ebookId,
        item_title: title ?? ebookId,
        user_id: userId,
        user_email: emailById.get(userId) ?? null,
        amount_minor:
          typeof priceParsed === "number" && Number.isFinite(priceParsed) ? priceParsed : null,
        currency: "GHS",
        status,
        is_paid: isPaid,
        provider: reference ? "paystack" : null,
        reference,
        paid_at: paidAt,
        updated_at: updatedAt,
        created_at: null,
        effective_at: effectiveAt,
      };
    }),
  ];

  purchases.sort((a, b) => {
    const ta = a.effective_at ? Date.parse(a.effective_at) : 0;
    const tb = b.effective_at ? Date.parse(b.effective_at) : 0;
    return tb - ta;
  });

  return NextResponse.json({ purchases });
}
