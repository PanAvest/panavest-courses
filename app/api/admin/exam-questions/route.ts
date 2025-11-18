export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function basicOk(h: Headers) {
  const auth = h.get("authorization") || "";
  if (!auth.startsWith("Basic ")) return false;
  const dec = Buffer.from(auth.slice(6), "base64").toString("utf8");
  const [u, p] = dec.split(":");
  return u === process.env.ADMIN_USER && p === process.env.ADMIN_PASS;
}
function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth:{ persistSession:false }});
}

// GET /api/admin/exam-questions?exam_id=...
export async function GET(req: Request) {
  if (!basicOk(req.headers)) return new NextResponse("Unauthorized", { status: 401 });
  const { searchParams } = new URL(req.url);
  const exam_id = searchParams.get("exam_id");
  if (!exam_id) return NextResponse.json([], { status: 200 });
  const { data, error } = await sb().from("exam_questions").select("*").eq("exam_id", exam_id).order("created_at",{ascending:true});
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST { exam_id, question, options[], correct_index }
export async function POST(req: Request) {
  if (!basicOk(req.headers)) return new NextResponse("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => ({}));
  const exam_id = String(body.exam_id ?? "");
  const id = body.id ? String(body.id) : undefined;
  const question = String(body.question ?? body.prompt ?? "");
  const options = Array.isArray(body.options) ? body.options.map(String) : [];
  const correct_index = Number(body.correct_index ?? 0);
  if (!exam_id || !question || options.length < 2 || correct_index < 0 || correct_index >= options.length) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const row = { id, exam_id, question, options, correct_index };
  const { data, error } = await sb()
    .from("exam_questions")
    .upsert(row, { onConflict: "id" })
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/admin/exam-questions?id=...
export async function DELETE(req: Request) {
  if (!basicOk(req.headers)) return new NextResponse("Unauthorized", { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await sb().from("exam_questions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
