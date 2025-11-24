import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { Database } from "@/lib/types";

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    console.warn("/api/exams/attempt: no session", {
      cookieKeys: req.headers.get("cookie")?.split(";").map((c) => c.split("=")[0].trim()).slice(0, 5),
      origin: req.headers.get("origin"),
      referer: req.headers.get("referer"),
    });
    return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const exam_id = typeof body.exam_id === "string" ? body.exam_id.trim() : "";
  if (!exam_id) {
    return NextResponse.json({ error: "exam_id required" }, { status: 400 });
  }
  const score = Math.round(Number(body.score ?? 0));
  const passed = Boolean(body.passed);
  const total = Math.max(0, Math.floor(Number(body.total ?? 0)));
  const correctCount = Math.max(0, Math.floor(Number(body.correct ?? body.correctCount ?? 0)));
  const autoSubmit = Boolean(body.autoSubmit);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("attempts")
    .insert({
      user_id: user.id,
      exam_id,
      score,
      passed,
      created_at: new Date().toISOString(),
      meta: { autoSubmit, total, correctCount },
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("/api/exams/attempt insert failed", {
      user_id: user.id,
      exam_id,
      error: error?.message,
      code: (error as { code?: string } | null)?.code,
    });
    return NextResponse.json({ error: error?.message ?? "Failed to record attempt" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
