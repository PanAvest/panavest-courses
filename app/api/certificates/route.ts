import { NextResponse } from "next/server";

import { generateCertificateNumber } from "@/lib/certificates";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseRouteHandlerClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const supabase = getSupabaseRouteHandlerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) {
    return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
  }

  const body = await req
    .json()
    .catch(() => null) as { course_id?: string; attempt_id?: string } | null;

  const course_id = body?.course_id?.trim();
  const attempt_id = body?.attempt_id?.trim();

  if (!course_id) {
    return NextResponse.json({ error: "COURSE_REQUIRED" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Ensure the learner has set a display name (required for the certificate).
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const fullName = (profile?.full_name ?? "").trim();
  if (!fullName) {
    return NextResponse.json({ error: "NAME_REQUIRED", message: "Add your full name on the Dashboard before issuing a certificate." }, { status: 400 });
  }

  // Load the final exam for the course (one exam per course).
  const { data: exam } = await admin
    .from("exams")
    .select("id,course_id,pass_mark")
    .eq("course_id", course_id)
    .maybeSingle();

  if (!exam) {
    return NextResponse.json({ error: "EXAM_NOT_FOUND" }, { status: 400 });
  }

  // Look up the learner's attempt (latest if no attempt_id provided).
  const attemptQuery = admin
    .from("attempts")
    .select("id,user_id,exam_id,score,passed,created_at")
    .eq("exam_id", exam.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const attemptResponse = attempt_id
    ? await attemptQuery.eq("id", attempt_id).maybeSingle()
    : await attemptQuery.limit(1).maybeSingle();

  const attempt = attemptResponse.data;
  if (!attempt) {
    return NextResponse.json({ error: "ATTEMPT_NOT_FOUND" }, { status: 400 });
  }
  if (attempt.user_id !== user.id || attempt.exam_id !== exam.id) {
    return NextResponse.json({ error: "NOT_ELIGIBLE" }, { status: 403 });
  }

  const score = Math.round(Number(attempt.score ?? 0));
  const passMark = Math.round(Number(exam.pass_mark ?? 0));
  if (!attempt.passed || score < passMark) {
    return NextResponse.json({ error: "NOT_ELIGIBLE", message: "Final exam not passed yet." }, { status: 400 });
  }

  const nowIso = new Date().toISOString();

  // Ensure we only issue one certificate per (user, course).
  const { data: existing } = await admin
    .from("certificates")
    .select("id,certificate_no,issued_at,score_pct")
    .eq("user_id", user.id)
    .eq("course_id", course_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, alreadyIssued: true, certificate: existing });
  }

  const certificate_no = generateCertificateNumber();
  const { data: inserted, error: insertErr } = await admin
    .from("certificates")
    .insert({
      user_id: user.id,
      course_id,
      attempt_id: attempt.id,
      score_pct: score,
      certificate_no,
      issued_at: nowIso,
    })
    .select("id,certificate_no,issued_at,score_pct")
    .single();

  if (insertErr || !inserted) {
    return NextResponse.json({ error: "CERT_CREATE_FAILED", details: insertErr?.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, certificate: inserted });
}
