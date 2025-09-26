import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req) {
  const url = new URL(req.url);
  const chapterId = url.searchParams.get("chapter_id");
  if (!chapterId) return NextResponse.json([], { status: 200 });
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("course_slides")
    .select("id,chapter_id,title,order_index,intro_video_url,asset_url,body")
    .eq("chapter_id", chapterId)
    .order("order_index", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req) {
  const b = await req.json();
  const row = {
    id: b.id ?? undefined,
    chapter_id: String(b.chapter_id || ""),
    title: String(b.title || ""),
    order_index: Number(b.order_index ?? 0),
    intro_video_url: b.intro_video_url ?? null,
    asset_url: b.asset_url ?? null,
    body: b.body ?? null,
  };
  if (!row.chapter_id || !row.title) {
    return NextResponse.json({ error: "chapter_id and title required" }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("course_slides")
    .upsert([row])
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? null);
}

export async function DELETE(req) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = getSupabaseAdmin();
  const { error } = await db.from("course_slides").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
