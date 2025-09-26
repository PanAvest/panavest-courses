import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const courseId = url.searchParams.get("course_id");
  if (!courseId) return NextResponse.json([], { status: 200 });
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("course_chapters")
    .select("id,course_id,title,position,intro_video_url,summary")
    .eq("course_id", courseId)
    .order("position", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const body = await req.json() as {
    id?: string; course_id: string; title: string; position: number;
    intro_video_url?: string | null; summary?: string | null;
  };
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("course_chapters").upsert([{
    id: body.id ?? undefined,
    course_id: body.course_id,
    title: body.title,
    position: Number(body.position) || 1,
    intro_video_url: body.intro_video_url ?? null,
    summary: body.summary ?? null,
  }], { onConflict: "id" }).select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? null);
}
