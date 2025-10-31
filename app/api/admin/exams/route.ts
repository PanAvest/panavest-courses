/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

function basicOk(h: Headers) {
  const auth = h.get("authorization") || "";
  if (!auth.startsWith("Basic ")) return false;
  const dec = Buffer.from(auth.slice(6), "base64").toString("utf8");
  const [u, p] = dec.split(":");
  return u === process.env.ADMIN_USER && p === process.env.ADMIN_PASS;
}
function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/** GET /api/admin/exams?course_id=... 
 * Prefer the "Final" exam if present, else the latest by created_at.
 */
export async function GET(req: Request) {
  if (!basicOk(await headers())) return new NextResponse("Unauthorized", { status: 401 });
  const { searchParams } = new URL(req.url);
  const course_id = searchParams.get("course_id");
  if (!course_id) return NextResponse.json(null, { status: 200 });

  // Fetch all exams for the course; choose "Final" first, else newest.
  const { data, error } = await sb()
    .from("exams")
    .select("*")
    .eq("course_id", course_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = Array.isArray(data) ? data : [];
  const best = rows
    .toSorted((a: any, b: any) => {
      const aFinal = String(a?.title ?? "").toLowerCase().includes("final") ? 1 : 0;
      const bFinal = String(b?.title ?? "").toLowerCase().includes("final") ? 1 : 0;
      if (bFinal !== aFinal) return bFinal - aFinal; // Final first
      const at = a?.created_at ? Date.parse(a.created_at) : 0;
      const bt = b?.created_at ? Date.parse(b.created_at) : 0;
      return bt - at; // then newest
    })[0] ?? null;

  return NextResponse.json(best);
}

/** POST /api/admin/exams
 * Body: { course_id, title, pass_mark, time_limit_minutes }
 * Upserts on course_id to ensure only one exam per course once a unique index exists.
 */
export async function POST(req: Request) {
  if (!basicOk(await headers())) return new NextResponse("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => ({}));
  const course_id = String(body.course_id ?? "");
  const title = String(body.title ?? "Final Exam");
  const pass_mark = Number(body.pass_mark ?? 60);
  const time_limit_minutes = (body.time_limit_minutes === null || body.time_limit_minutes === undefined)
    ? null
    : Number(body.time_limit_minutes);

  if (!course_id) {
    return NextResponse.json({ error: "course_id required" }, { status: 400 });
  }

  const { data, error } = await sb()
    .from("exams")
    .upsert(
      { course_id, title, pass_mark, time_limit_minutes },
      { onConflict: "course_id" }
    )
    .select()
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
