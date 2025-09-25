import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type Knowledge = {
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
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("courses")
    .select("id,slug,title,description,level,price,cpd_points,img,accredited,published")
    .order("title", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();
  const body = (await req.json()) as Knowledge;

  if (!body.slug || !body.title) {
    return NextResponse.json({ error: "slug and title are required" }, { status: 400 });
  }
  const payload = {
    slug: body.slug,
    title: body.title,
    description: body.description ?? null,
    level: body.level ?? null,
    price: body.price ?? null,
    cpd_points: body.cpd_points ?? null,
    img: body.img ?? null,
    accredited: body.accredited ?? null,
    published: body.published ?? true,
  };

  // We don't ship generated DB types here; tell TS we expect the next line to be safe.
  // @ts-expect-error - supabase-js generics without Database types
  const { data, error } = await supabase
    .from("courses")
    .upsert(payload, { onConflict: "slug" })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? null);
}
