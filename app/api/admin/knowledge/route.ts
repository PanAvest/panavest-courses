import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Database } from "@/lib/types";

type CoursesRow = Database["public"]["Tables"]["courses"]["Row"];
type CoursesInsert = Database["public"]["Tables"]["courses"]["Insert"];

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("id,slug,title,description,level,price,cpd_points,img,accredited,published")
    .order("title", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []) as CoursesRow[]);
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<CoursesInsert>;

  if (!body.slug || !body.title) {
    return NextResponse.json({ error: "slug and title are required" }, { status: 400 });
  }

  const payload: CoursesInsert = {
    id: body.id,                    // optional
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

  const { data, error } = await supabaseAdmin
    .from("courses")
    .upsert([payload] as CoursesInsert[], { onConflict: "slug" })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? null) as CoursesRow | null);
}
