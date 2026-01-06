import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

type AdminClient = SupabaseClient<Database>;

/**
 * Grant ebook entitlements that are bundled with a course purchase.
 * Fetches active mappings from `program_ebook_links` and upserts `ebook_purchases`.
 * Returns the number of ebook rows touched; logs and continues on errors.
 */
export async function grantBundledEbooks(
  admin: AdminClient,
  {
    courseId,
    userId,
    paidAt,
    reference,
  }: { courseId: string; userId: string; paidAt?: string | null; reference?: string | null }
) {
  const now = new Date().toISOString();

  // 1) Load active links for this course → ebook ids
  const { data: links, error } = await admin
    .from("program_ebook_links")
    .select("ebook_id")
    .eq("course_id", courseId)
    .eq("active", true);

  if (error) {
    console.warn("[bundles] program_ebook_links fetch failed", { courseId, error });
    return { granted: 0, error: error.message };
  }

  const ebookIds = (links ?? [])
    .map((l: { ebook_id?: string | null }) => l.ebook_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (ebookIds.length === 0) return { granted: 0 };

  // 2) Upsert entitlements into ebook_purchases
  const rows = ebookIds.map((ebookId) => ({
    user_id: userId,
    ebook_id: ebookId,
    status: "paid",
    paid_at: paidAt ?? now,
    updated_at: now,
    paystack_reference: reference ?? null,
  })) as Array<Record<string, unknown>>;

  const { error: upsertErr } = await admin
    .from("ebook_purchases")
    .upsert(rows, { onConflict: "user_id,ebook_id" });

  if (upsertErr) {
    console.warn("[bundles] ebook_purchases upsert failed", { courseId, userId, error: upsertErr });
    return { granted: 0, error: upsertErr.message };
  }

  return { granted: ebookIds.length };
}
