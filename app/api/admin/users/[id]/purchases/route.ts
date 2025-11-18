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

  const courses = (enr ?? []).map((r: { course_id: string; paid: boolean | null; courses?: { title?: string | null } }) => ({
    course_id: r.course_id,
    title: r.courses?.title ?? r.course_id,
    paid: r.paid,
  }));

  const ebooks = (eb ?? []).map((r: { ebook_id: string; ebooks?: { title?: string | null } }) => ({
    ebook_id: r.ebook_id,
    title: r.ebooks?.title ?? r.ebook_id,
  }));

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
