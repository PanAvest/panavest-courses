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
});

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

  const payload = parsed.data;

  // Upsert a SINGLE row (by id if present, otherwise by unique slug)
  // Important: request a single row back without throwing if zero/multi rows
 // ✅ works with a single object payload
const { data, error } = await supabase
  .from("ebooks")
  .upsert(payload, {
    onConflict: "slug",        // slug must be UNIQUE in the table
    ignoreDuplicates: false,
  })
  .select("*")
  .single();                   // exactly one row expected after upsert


  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? payload); // return what we saved
}
