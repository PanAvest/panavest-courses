import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const chapter_id = url.searchParams.get("chapter_id");
  if (!chapter_id) return NextResponse.json({ error: "chapter_id required" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("chapter_quiz_settings")
    .select("*")
    .eq("chapter_id", chapter_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const body = await req.json();
  const row = {
    chapter_id: String(body.chapter_id ?? ""),
    time_limit_seconds: typeof body.time_limit_seconds === "number" ? body.time_limit_seconds : null,
    num_questions: typeof body.num_questions === "number" ? body.num_questions : null,
  };
  if (!row.chapter_id) return NextResponse.json({ error: "chapter_id required" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("chapter_quiz_settings")
    .upsert(row, { onConflict: "chapter_id" })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
