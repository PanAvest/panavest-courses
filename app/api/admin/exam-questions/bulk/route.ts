import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) throw new Error("Empty file");
  const header = lines[0].split(",").map(s => s.trim().toLowerCase());
  const required = ["exam_id", "prompt", "options", "correct_index"];
  for (const h of required) if (!header.includes(h)) throw new Error(`Missing column: ${h}`);

  const rows: Array<{ exam_id: string; prompt: string; options: string[]; correct_index: number }> = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw) continue;
    const cols = raw.split(",");
    const get = (name: string) => cols[header.indexOf(name)]?.trim() ?? "";
    const exam_id = get("exam_id");
    const prompt = get("prompt");
    const options = (get("options") || "").split(/\s*[;|]\s*/).filter(Boolean);
    const correct_index = Number(get("correct_index") || 0);
    if (!exam_id || !prompt || options.length < 2) continue;
    rows.push({ exam_id, prompt, options, correct_index: Number.isFinite(correct_index) ? correct_index : 0 });
  }
  return rows;
}

export async function POST(req: Request) {
  try {
    const text = await req.text();
    const rows = parseCsv(text);
    if (rows.length === 0) return NextResponse.json({ error: "No rows parsed" }, { status: 400 });

    const db = getSupabaseAdmin();
    const { error } = await db.from("questions").upsert(rows, { onConflict: "id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ inserted: rows.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
