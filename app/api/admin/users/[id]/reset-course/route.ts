import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type ResetScope = "exam" | "course";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const course_id = typeof body.course_id === "string" ? body.course_id.trim() : "";
  const scope: ResetScope = body.scope === "course" ? "course" : "exam";
  if (!id || !course_id) {
    return NextResponse.json({ error: "course_id required" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const errors: string[] = [];

  const { data: exam } = await admin
    .from("exams")
    .select("id")
    .eq("course_id", course_id)
    .maybeSingle();

  if (scope === "course") {
    const { error: slideErr } = await admin
      .from("user_slide_progress")
      .delete()
      .eq("user_id", id)
      .eq("course_id", course_id);
    if (slideErr) errors.push(slideErr.message);

    const { error: quizErr } = await admin
      .from("user_chapter_quiz")
      .delete()
      .eq("user_id", id)
      .eq("course_id", course_id);
    if (quizErr) errors.push(quizErr.message);

    await admin
      .from("enrollments")
      .update({ progress_pct: 0 })
      .eq("user_id", id)
      .eq("course_id", course_id);
  }

  if (exam?.id) {
    const { error: attemptErr } = await admin
      .from("attempts")
      .delete()
      .eq("user_id", id)
      .eq("exam_id", exam.id);
    if (attemptErr) errors.push(attemptErr.message);
  }

  const { error: certErr } = await admin
    .from("certificates")
    .delete()
    .eq("user_id", id)
    .eq("course_id", course_id);
  if (certErr) errors.push(certErr.message);

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 500 });
  }
  return NextResponse.json({ ok: true, scope });
}
