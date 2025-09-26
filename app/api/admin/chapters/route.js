import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req) {
  const url = new URL(req.url);
  const courseId = url.searchParams.get("course_id");
  if (!courseId) return NextResponse.json([], { status: 200 });
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("course_chapters")
    .select("id,course_id,title,order_index")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req) {
  const b = await req.json();
  const row = {
    id: b.id ?? undefined,
    course_id: String(b.course_id || ""),
    title: String(b.title || ""),
    order_index: Number(b.order_index ?? 0),
  };
  if (!row.course_id || !row.title) {
    return NextResponse.json({ error: "course_id and title required" }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("course_chapters")
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
  const { error } = await db.from("course_chapters").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
