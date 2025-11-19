import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
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
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userErr || !user) {
    return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
  }
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
    return NextResponse.json({ error: error?.message ?? "Failed to record attempt" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
