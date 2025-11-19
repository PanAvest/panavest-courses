import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: exam_id } = await params;
  if (!exam_id) {
    return NextResponse.json({ error: "exam_id required" }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const score = Number(body.score ?? body.scorePct ?? 0);
  const passed = Boolean(body.passed);
  const total = Number(body.total ?? 0);
  const correctCount = Number(body.correct ?? body.correctCount ?? 0);
  const autoSubmit = Boolean(body.autoSubmit ?? false);

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
      meta: { total, correctCount, autoSubmit },
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to insert attempt" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
