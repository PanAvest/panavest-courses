import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type KnowledgePayload = {
  id?: string;
  slug: string;
  title: string;
  description?: string | null;
  level?: string | null;
  price?: number | null;
  cpd_points?: number | null;
  img?: string | null;
  accredited?: string[] | null;
  published?: boolean | null;
};

export async function GET() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("courses")
    .select("id,slug,title,description,level,price,cpd_points,img,accredited,published")
    .order("title", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const b = (await req.json()) as KnowledgePayload;
  if (!b.slug || !b.title) {
    return NextResponse.json({ error: "slug and title are required" }, { status: 400 });
  }
  const payload: KnowledgePayload = {
    id: b.id,
    slug: b.slug,
    title: b.title,
    description: b.description ?? null,
    level: b.level ?? null,
    price: b.price ?? null,
    cpd_points: b.cpd_points ?? null,
    img: b.img ?? null,
    accredited: b.accredited ?? null,
    published: b.published ?? true,
  };

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("courses")
    /* Without generated DB types, supabase-js infers `never`. Cast via unknown to satisfy TS. */
    .upsert([payload] as unknown as never[], { onConflict: "slug" })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? null);
}
