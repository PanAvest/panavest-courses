import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("courses")
    .select("id,slug,title,description,level,price,cpd_points,img,accredited,published,created_at")
    .order("title", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req) {
  const body = await req.json();
  const payload = {
    id: body.id ?? undefined,
    slug: String(body.slug || ""),
    title: String(body.title || ""),
    description: body.description ?? null,
    level: body.level ?? null,
    price: body.price ?? null,
    cpd_points: body.cpd_points ?? null,
    img: body.img ?? null,
    accredited: Array.isArray(body.accredited) ? body.accredited.map(String) : null,
    published: typeof body.published === "boolean" ? body.published : true,
  };
  if (!payload.slug || !payload.title) {
    return NextResponse.json({ error: "slug and title are required" }, { status: 400 });
  }
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("courses")
    .upsert([payload], { onConflict: "slug" })
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? null);
}
