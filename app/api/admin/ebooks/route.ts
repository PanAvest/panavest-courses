// app/api/admin/ebooks/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const EbookSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  cover_url: z.string().url().nullable().optional(),
  sample_url: z.string().url().nullable().optional(),
  kpf_url: z.string().url().nullable().optional(),
  price_cents: z.number().int().nonnegative().default(0),
  published: z.boolean().default(true),
  free_for_logged_in: z.boolean().default(false),
  sku: z.string().nullable().optional(),
  stock_quantity: z.number().int().nonnegative().optional(),
  show_stock: z.boolean().optional(),
  physical_price_cents: z.number().int().nonnegative().nullable().optional(),
});

// Columns that may not exist yet on older databases (before the physical-store migration).
const OPTIONAL_COLUMNS = ["free_for_logged_in", "sku", "stock_quantity", "show_stock", "physical_price_cents"];

function isMissingFreeColumnError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const rec = err as { code?: string; message?: string; details?: string; hint?: string };
  const text = `${rec.message ?? ""} ${rec.details ?? ""} ${rec.hint ?? ""}`.toLowerCase();
  if (!OPTIONAL_COLUMNS.some((c) => text.includes(c))) return false;
  if (rec.code === "42703" || rec.code === "PGRST204") return true;
  return text.includes("does not exist") || text.includes("schema cache") || text.includes("could not find");
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server-side secret
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("ebooks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = adminClient();

  const json = await req.json().catch(() => null);
  const parsed = EbookSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload: Record<string, unknown> = { ...parsed.data };

  // Upsert a SINGLE row (by id if present, otherwise by unique slug).
  // If the DB predates the physical-store migration, progressively drop the
  // optional columns named in the error and retry, so saves still succeed.
  let data: unknown = null;
  let error: { message?: string; details?: string; hint?: string; code?: string } | null = null;
  const attemptPayload: Record<string, unknown> = { ...payload };
  for (let attempt = 0; attempt < OPTIONAL_COLUMNS.length + 1; attempt++) {
    const res = await supabase
      .from("ebooks")
      .upsert(attemptPayload, { onConflict: "slug", ignoreDuplicates: false })
      .select("*")
      .single();
    data = res.data;
    error = res.error;
    if (!error || !isMissingFreeColumnError(error)) break;
    const text = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
    const offending = OPTIONAL_COLUMNS.filter((c) => text.includes(c) && c in attemptPayload);
    if (offending.length === 0) break;
    offending.forEach((c) => delete attemptPayload[c]);
  }


  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? payload); // return what we saved
}
