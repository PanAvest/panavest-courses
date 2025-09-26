import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const chapterId = url.searchParams.get("chapter_id");
  if (!chapterId) return NextResponse.json([], { status: 200 });
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("course_slides")
    .select("id,chapter_id,title,position,video_url,content")
    .eq("chapter_id", chapterId)
    .order("position", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const body = await req.json() as {
    id?: string; chapter_id: string; title: string; position: number;
    video_url?: string | null; content?: string | null;
  };
  const db = getSupabaseAdmin();
  // @ts-expect-error: see note in chapters route
  const { data, error } = await db.from("course_slides").upsert([{
    id: body.id ?? undefined,
    chapter_id: body.chapter_id,
    title: body.title,
    position: Number(body.position) || 1,
    video_url: body.video_url ?? null,
    content: body.content ?? null,
  }], { onConflict: "id" }).select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? null);
}
