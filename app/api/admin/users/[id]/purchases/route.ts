import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getSupabaseAdmin();

  // Courses via enrollments
  const { data: enr, error: enrErr } = await db
    .from("enrollments")
    .select("course_id, paid, courses ( title )")
    .eq("user_id", id);

  // Ebooks via purchases table
  const { data: eb, error: ebErr } = await db
    .from("ebook_purchases")
    .select("ebook_id, ebooks ( title )")
    .eq("user_id", id);

  if (enrErr || ebErr) {
    return NextResponse.json({ error: enrErr?.message || ebErr?.message || "Failed" }, { status: 500 });
  }

  const courses = (enr ?? [])
    .map((row) => {
      const course_id = String((row as Record<string, unknown>).course_id ?? "");
      const paid = Boolean((row as Record<string, unknown>).paid ?? false);
      const coursesField = (row as Record<string, unknown>).courses;
      const title =
        Array.isArray(coursesField)
          ? (coursesField[0] as { title?: string | null })?.title
          : (coursesField as { title?: string | null } | null | undefined)?.title;
      return course_id ? { course_id, title: title ?? course_id, paid } : null;
    })
    .filter(Boolean);

  const ebooks = (eb ?? [])
    .map((row) => {
      const ebook_id = String((row as Record<string, unknown>).ebook_id ?? "");
      const ebooksField = (row as Record<string, unknown>).ebooks;
      const title =
        Array.isArray(ebooksField)
          ? (ebooksField[0] as { title?: string | null })?.title
          : (ebooksField as { title?: string | null } | null | undefined)?.title;
      return ebook_id ? { ebook_id, title: title ?? ebook_id } : null;
    })
    .filter(Boolean);

  return NextResponse.json({ courses, ebooks });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const kind = String(body.kind ?? "");
  const targetId = String(body.target_id ?? "");
  if (!["course", "ebook"].includes(kind) || !targetId) {
    return NextResponse.json({ error: "kind and target_id required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (kind === "course") {
    const { error } = await db.from("enrollments").delete().eq("user_id", id).eq("course_id", targetId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // also clear progress
    await db.from("user_slide_progress").delete().eq("user_id", id).eq("course_id", targetId);
    await db.from("user_chapter_quiz").delete().eq("user_id", id).eq("course_id", targetId);
    await db.from("attempts").delete().eq("user_id", id).eq("exam_id", targetId);
  } else {
    const { error } = await db.from("ebook_purchases").delete().eq("user_id", id).eq("ebook_id", targetId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
