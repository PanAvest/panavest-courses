// app/api/admin/ebooks/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const Ebook = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  cover_url: z.string().url().nullable().optional(),
  sample_url: z.string().url().nullable().optional(),
  kpf_url: z.string().url().nullable().optional(),
  price_cents: z.number().int().nonnegative(),
  published: z.boolean().default(true)
});

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

// GET: list all (including drafts for admin)
export async function GET() {
  const supabase = sb();
  const { data, error } = await supabase.from("ebooks").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST: upsert by slug (or id)
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = Ebook.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const payload = parsed.data;

  const supabase = sb();
  // Prefer id when present; otherwise upsert by unique slug
  if (payload.id) {
    const { data, error } = await supabase
      .from("ebooks")
      .update({
        slug: payload.slug,
        title: payload.title,
        description: payload.description ?? null,
        cover_url: payload.cover_url ?? null,
        sample_url: payload.sample_url ?? null,
        kpf_url: payload.kpf_url ?? null,
        price_cents: payload.price_cents,
        published: payload.published
      })
      .eq("id", payload.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } else {
    // Upsert by slug
    const { data, error } = await supabase
      .from("ebooks")
      .upsert(
        {
          slug: payload.slug,
          title: payload.title,
          description: payload.description ?? null,
          cover_url: payload.cover_url ?? null,
          sample_url: payload.sample_url ?? null,
          kpf_url: payload.kpf_url ?? null,
          price_cents: payload.price_cents,
          published: payload.published
        },
        { onConflict: "slug" }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }
}
