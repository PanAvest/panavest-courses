// lib/purchaseEmails.ts
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmailOnce } from "@/lib/email";
import { purchaseReceiptEmail } from "@/lib/emailTemplates";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://panavestkds.com";
}

async function lookupEmail(admin: SupabaseClient, userId?: string | null): Promise<string | null> {
  if (!userId) return null;
  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    const email = data?.user?.email;
    return typeof email === "string" && email ? email : null;
  } catch {
    return null;
  }
}

async function lookupName(admin: SupabaseClient, userId?: string | null): Promise<string | null> {
  if (!userId) return null;
  try {
    const { data } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    const n = (data as { full_name?: string | null } | null)?.full_name;
    return typeof n === "string" && n.trim() ? n.trim() : null;
  } catch {
    return null;
  }
}

async function lookupItem(
  admin: SupabaseClient,
  kind: "course" | "ebook",
  itemId: string,
): Promise<{ title: string; priceMinor: number | null }> {
  try {
    if (kind === "ebook") {
      const { data } = await admin
        .from("ebooks")
        .select("title, price_cents")
        .eq("id", itemId)
        .maybeSingle();
      const r = data as { title?: string | null; price_cents?: number | null } | null;
      return { title: r?.title || "E-book", priceMinor: typeof r?.price_cents === "number" ? r.price_cents : null };
    }
    const { data } = await admin
      .from("courses")
      .select("title, price")
      .eq("id", itemId)
      .maybeSingle();
    const r = data as { title?: string | null; price?: number | null } | null;
    // courses.price is stored in major units (GH₵); convert to minor for display math.
    const priceMinor = typeof r?.price === "number" ? Math.round(r.price * 100) : null;
    return { title: r?.title || "Course", priceMinor };
  } catch {
    return { title: kind === "ebook" ? "E-book" : "Course", priceMinor: null };
  }
}

export type PurchaseReceiptArgs = {
  kind: "course" | "ebook";
  userId?: string | null;
  itemId: string;
  reference: string;
  amountMinor: number | null;
  currency?: string | null;
  paidAt?: string | null;
  channel?: string | null;
  email?: string | null;
  customerName?: string | null;
  voucherCode?: string | null;
};

/**
 * Send the purchase receipt + website invoice exactly once for a payment.
 * Safe to call from callback, verify, and webhook — idempotent on the reference.
 * Never throws (purchase flows must not break on email failure).
 */
export async function sendPurchaseReceipt(admin: SupabaseClient, a: PurchaseReceiptArgs): Promise<void> {
  try {
    const email = a.email || (await lookupEmail(admin, a.userId));
    if (!email) {
      console.warn("[purchaseEmails] no email for purchase", a.reference);
      return;
    }
    const [item, name] = await Promise.all([
      lookupItem(admin, a.kind, a.itemId),
      a.customerName ? Promise.resolve(a.customerName) : lookupName(admin, a.userId),
    ]);

    const amount = typeof a.amountMinor === "number" ? a.amountMinor : item.priceMinor;
    // Infer the discount when a voucher was used and we know the list price.
    const discountMinor =
      a.voucherCode && item.priceMinor != null && typeof amount === "number" && item.priceMinor > amount
        ? item.priceMinor - amount
        : 0;

    await sendEmailOnce(
      admin,
      { ref: a.reference, kind: "purchase_receipt", to: email },
      () =>
        purchaseReceiptEmail({
          customerName: name,
          itemTitle: item.title,
          itemKind: a.kind,
          amountMinor: amount ?? null,
          currency: a.currency || "GHS",
          reference: a.reference,
          paidAt: a.paidAt,
          channel: a.channel,
          invoiceNo: a.reference,
          voucherCode: a.voucherCode,
          discountMinor,
          appUrl: appUrl(),
        }),
    );
  } catch (e) {
    console.error("[purchaseEmails] failed:", (e as Error).message);
  }
}
