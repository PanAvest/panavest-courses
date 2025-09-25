import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Database } from "@/lib/types";

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

export async function GET(_req: NextRequest) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("id,slug,title,description,level,price,cpd_points,img,accredited,published")
    .order("title", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  const body = (await req.json()) as Knowledge;
  if (!body.slug || !body.title) {
    return NextResponse.json({ error: "slug and title are required" }, { status: 400 });
  }

  const payload: Database["public"]["Tables"]["courses"]["Insert"] = {
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

  const { data, error } = await supabaseAdmin
    .from("courses")
    .upsert(payload, { onConflict: "slug" })
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? [])[0] ?? null);
}
