# create/replace slides route
cat > app/api/admin/slides/route.ts <<'TS'
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
export const runtime = "nodejs";

type SlideBody = {
  id?: string;
  chapter_id?: string;
  title?: string;
  order_index?: number | string;
  intro_video_url?: string | null; // preferred
  video_url?: string | null;       // synonym -> intro_video_url
  asset_url?: string | null;
  body?: string | null;            // preferred
  content?: string | null;         // synonym -> body
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const chapter_id = url.searchParams.get("chapter_id");
  if (!chapter_id) return NextResponse.json({ error: "chapter_id required" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("course_slides")
    .select("*")
    .eq("chapter_id", chapter_id)
    .order("order_index", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const body = (await req.json()) as SlideBody;

  if (!body.chapter_id || !body.title) {
    return NextResponse.json({ error: "chapter_id and title are required" }, { status: 400 });
  }

  const row = {
    id: body.id || undefined,
    chapter_id: body.chapter_id,
    title: body.title,
    order_index: Number(body.order_index ?? 0),
    intro_video_url: body.intro_video_url ?? body.video_url ?? null,
    asset_url: body.asset_url ?? null,
    body: body.body ?? body.content ?? null,
  };

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("course_slides")
    .upsert([row], { onConflict: "id" })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") || req.url.split("/").pop() || "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { error } = await db.from("course_slides").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
TS
