// @ts-nocheck
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("courses")
    .select("id,slug,title,description,level,price,cpd_points,img,accredited,published")
    .order("title", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const db = getSupabaseAdmin();
  const body = await req.json();

  if (!body?.slug || !body?.title) {
    return NextResponse.json({ error: "slug and title are required" }, { status: 400 });
  }

  const payload = {
    id: body.id,
    slug: body.slug ?? null,
    title: body.title ?? null,
    description: body.description ?? null,
    level: body.level ?? null,
    price: body.price ?? null,
    cpd_points: body.cpd_points ?? null,
    img: body.img ?? null,
    accredited: body.accredited ?? null,
    published: body.published ?? true,
    created_at: body.created_at ?? null,
  };

  const { data, error } = await db
    .from("courses")
    .upsert(payload, { onConflict: "slug" })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? null);
}
