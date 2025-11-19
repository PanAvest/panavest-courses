 
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */
function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Minimal row shape to keep types tidy (optional) */
type ExamRow = {
  id: string;
  course_id: string;
  title: string;
  pass_mark: number;
  time_limit_minutes: number | null;
  num_questions: number | null;
  created_at: string | null;
};

/* ──────────────────────────────────────────────────────────────
   GET /api/admin/exams?course_id=...
   - Returns the "best" exam for a course:
     1) Prefer a title containing "final" (case-insensitive)
     2) Otherwise the newest by created_at
   - Returns null if none.
   ────────────────────────────────────────────────────────────── */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const course_id = searchParams.get("course_id");
  if (!course_id) return NextResponse.json(null, { status: 200 });

  const { data, error } = await sb()
    .from("exams")
    .select("*")
    .eq("course_id", course_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (Array.isArray(data) ? data : []) as ExamRow[];

  const best =
    [...rows]
      .sort((a, b) => {
        const aFinal = (a.title ?? "").toLowerCase().includes("final") ? 1 : 0;
        const bFinal = (b.title ?? "").toLowerCase().includes("final") ? 1 : 0;
        if (bFinal !== aFinal) return bFinal - aFinal; // "Final" first
        const at = a.created_at ? Date.parse(a.created_at) : 0;
        const bt = b.created_at ? Date.parse(b.created_at) : 0;
        return bt - at; // then newest
      })[0] ?? null;

  return NextResponse.json(best);
}

/* ──────────────────────────────────────────────────────────────
   POST /api/admin/exams
   Body: { course_id, title?, pass_mark?, time_limit_minutes? }
   - Upserts on course_id (so you effectively keep a single exam
     per course once the unique index exists).
   - Returns the saved row.
   ────────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const course_id = String(body.course_id ?? "").trim();
  const title = String(body.title ?? "Final Exam").trim();

  // Bound pass_mark to 0–100 for sanity.
  const pass_mark_raw = Number(body.pass_mark ?? 60);
  const pass_mark = Math.max(0, Math.min(100, Number.isFinite(pass_mark_raw) ? pass_mark_raw : 60));

  // Allow null (no limit) or a non-negative integer.
  let time_limit_minutes: number | null;
  if (body.time_limit_minutes === null || body.time_limit_minutes === undefined || body.time_limit_minutes === "") {
    time_limit_minutes = null;
  } else {
    const tl = Number(body.time_limit_minutes);
    time_limit_minutes = Number.isFinite(tl) && tl >= 0 ? Math.floor(tl) : null;
  }

  if (!course_id) {
    return NextResponse.json({ error: "course_id required" }, { status: 400 });
  }

  let num_questions: number | null;
  if (body.num_questions === null || body.num_questions === undefined || body.num_questions === "") {
    num_questions = null;
  } else {
    const nq = Number(body.num_questions);
    num_questions = Number.isFinite(nq) && nq > 0 ? Math.floor(nq) : null;
  }

  const { data, error } = await sb()
    .from("exams")
    .upsert(
      { course_id, title, pass_mark, time_limit_minutes, num_questions },
      { onConflict: "course_id" }
    )
    .select()
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/* ──────────────────────────────────────────────────────────────
   (Optional but recommended one-time SQL in Supabase)
   Ensures one exam per course (matches onConflict above):
   ----------------------------------------------
   create unique index if not exists uq_exams_course_id
     on public.exams(course_id);
   ----------------------------------------------
   ────────────────────────────────────────────────────────────── */
