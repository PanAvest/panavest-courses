import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const course_id = String(body.course_id ?? "").trim();
  if (!course_id) return NextResponse.json({ error: "course_id required" }, { status: 400 });

  const db = getSupabaseAdmin();

  // Ensure enrollment exists
  await db.from("enrollments").upsert({ user_id: id, course_id, paid: true });

  // Load chapters + slides
  const { data: chapters } = await db
    .from("course_chapters")
    .select("id")
    .eq("course_id", course_id);
  const chapterIds = (chapters ?? []).map((c) => c.id);

  if (chapterIds.length > 0) {
    await db
      .from("course_slides")
      .select("id, chapter_id")
      .in("chapter_id", chapterIds)
      .then(async ({ data }) => {
        const slides = data ?? [];
        if (slides.length > 0) {
          const payload = slides.map((s) => ({ user_id: id, course_id, slide_id: s.id }));
          await db.from("user_slide_progress").upsert(payload, { onConflict: "user_id,slide_id" });
        }
      });

    const quizRows = chapterIds.map((cid) => ({
      user_id: id,
      course_id,
      chapter_id: cid,
      score_pct: 100,
      total_count: 1,
      correct_count: 1,
      completed_at: new Date().toISOString(),
    }));
    await db.from("user_chapter_quiz").upsert(quizRows, { onConflict: "user_id,chapter_id" });
  }

  return NextResponse.json({ ok: true });
}
