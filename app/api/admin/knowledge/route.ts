import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("courses")
    .select("id,slug,title,description,level,price,cpd_points,img,accredited,published,created_at")
    .order("title", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();
  const body = await req.json();

  if (!body?.slug || !body?.title) {
    return NextResponse.json({ error: "slug and title are required" }, { status: 400 });
  }

  const payload = {
    id: body.id ?? undefined,
    slug: String(body.slug),
    title: String(body.title),
    description: body.description ?? null,
    level: body.level ?? null,
    price:
      body.price === null || body.price === undefined ? null : Number(body.price),
    cpd_points:
      body.cpd_points === null || body.cpd_points === undefined
        ? null
        : Number(body.cpd_points),
    img: body.img ?? null,
    accredited: Array.isArray(body.accredited)
      ? body.accredited
      : typeof body.accredited === "string"
      ? body.accredited.split(",").map((s: string) => s.trim()).filter(Boolean)
      : null,
    published: body.published ?? true,
  };

  const { data, error } = await supabase
    .from("courses")
    .upsert([payload], { onConflict: "slug" })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
