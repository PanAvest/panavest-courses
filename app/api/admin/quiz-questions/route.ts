import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const chapter_id = url.searchParams.get("chapter_id");
  if (!chapter_id) return NextResponse.json({ error: "chapter_id required" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("chapter_quiz_questions")
    .select("*")
    .eq("chapter_id", chapter_id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const body = await req.json();
  const row = {
    id: body.id || undefined,
    chapter_id: String(body.chapter_id ?? ""),
    question: String(body.question ?? ""),
    options: Array.isArray(body.options) ? body.options.map(String) : [],
    correct_index: Number(body.correct_index ?? 0),
  };
  if (!row.chapter_id || !row.question || row.options.length < 2) {
    return NextResponse.json({ error: "chapter_id, question, >=2 options required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("chapter_quiz_questions")
    .upsert(row, { onConflict: "id" })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
