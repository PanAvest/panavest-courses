"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

/* ===== Types ===== */
type CourseRow = {
  id: string;
  slug: string;
  title: string;
  img: string | null;
  cpd_points: number | null;
};

type EnrollmentRow = {
  course_id: string;
  progress_pct: number | null;
  courses?: CourseRow | CourseRow[] | null;
};

type EnrolledCourse = {
  course_id: string;
  progress_pct: number;
  title: string;
  slug: string;
  img: string | null;
  cpd_points: number | null;
};

type QuizAttempt = {
  course_id: string;
  chapter_id: string;
  total_count: number;
  correct_count: number;
  score_pct: number;
  completed_at: string; // ISO string
};

type ChapterInfo = {
  id: string;
  title: string;
  order_index: number;
  course_id: string;
};

type EbookRow = {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  price_cents: number;
};

type PurchaseRow = {
  ebook_id: string;
  status: string | null;
  ebooks?: EbookRow | EbookRow[] | null;
};

type PurchasedEbook = {
  ebook_id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  price_cedis: string; // formatted GH₵
};

type AttemptRow = {
  exam_id: string;
  score: number | null;
  passed: boolean | null;
  created_at: string;
};

type ExamRow = {
  id: string;
  course_id: string;
  title: string | null;
  pass_mark: number | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

type CertificateCard = {
  exam_id: string;
  course_id: string;
  course_title: string;
  course_slug: string;
  score_pct: number;
  pass_mark: number;
  passed: boolean;
  attempted_at: string;
  learner_name: string;
};

/* ===== Helpers ===== */
function pickCourse(c: CourseRow | CourseRow[] | null | undefined): CourseRow | null {
  if (!c) return null;
  return Array.isArray(c) ? (c[0] ?? null) : c;
}
function pickEbook(e: EbookRow | EbookRow[] | null | undefined): EbookRow | null {
  if (!e) return null;
  return Array.isArray(e) ? (e[0] ?? null) : e;
}

/* ========================================================================== */

export default function DashboardPage() {
  const [fullName, setFullName] = useState<string>("");
  const [savingName, setSavingName] = useState<boolean>(false);
  const [nameNotice, setNameNotice] = useState<string>("");

  const [enrolled, setEnrolled] = useState<EnrolledCourse[]>([]);
  const [quiz, setQuiz] = useState<QuizAttempt[]>([]);
  const [chaptersById, setChaptersById] = useState<Record<string, ChapterInfo>>({});
  const [ebooks, setEbooks] = useState<PurchasedEbook[]>([]);
  const [certs, setCerts] = useState<CertificateCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        window.location.href = "/auth/sign-in";
        return;
      }

      /* --- Profile (full name) --- */
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", user.id)
          .maybeSingle<ProfileRow>();
        setFullName(prof?.full_name ?? "");
      } catch {
        // ignore
      }

      /* --- Enrollments (joined with courses) --- */
      const { data: enrData } = await supabase
        .from("enrollments")
        .select("course_id, progress_pct, courses!inner(title,slug,img,cpd_points)")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (enrData) {
        const rows = enrData as EnrollmentRow[];
        const mapped: EnrolledCourse[] = rows.map((r) => {
          const c = pickCourse(r.courses) || {
            id: "",
            slug: "",
            title: "",
            img: null,
            cpd_points: null,
          };
          const pct = Number.isFinite(Number(r.progress_pct)) ? Number(r.progress_pct) : 0;
          return {
            course_id: r.course_id,
            progress_pct: Math.max(0, Math.min(100, pct)),
            title: c.title,
            slug: c.slug,
            img: c.img ?? null,
            cpd_points: c.cpd_points ?? null,
          };
        });
        setEnrolled(mapped);
      }

      /* --- Purchased E-Books --- */
      const { data: purRows } = await supabase
        .from("ebook_purchases")
        .select("ebook_id,status,ebooks!inner(id,slug,title,cover_url,price_cents)")
        .eq("user_id", user.id)
        .eq("status", "paid")
        .order("created_at", { ascending: false });

      if (purRows) {
        const items = (purRows as PurchaseRow[])
          .map((p) => {
            const e = pickEbook(p.ebooks);
            if (!e) return null;
            return {
              ebook_id: p.ebook_id,
              slug: e.slug,
              title: e.title,
              cover_url: e.cover_url ?? null,
              price_cedis: `GH₵ ${(e.price_cents / 100).toFixed(2)}`
            } as PurchasedEbook;
          })
          .filter(Boolean) as PurchasedEbook[];
        setEbooks(items);
      }

      /* --- Chapter quiz attempts (for “Your quiz results”) --- */
      const { data: quizRows } = await supabase
        .from("user_chapter_quiz")
        .select("course_id, chapter_id, total_count, correct_count, score_pct, completed_at")
        .eq("user_id", user.id);

      const attempts = (quizRows ?? []) as QuizAttempt[];
      setQuiz(attempts);

      /* --- Chapter metadata (for sorting) --- */
      const chapterIds = Array.from(new Set(attempts.map(a => a.chapter_id)));
      if (chapterIds.length > 0) {
        const { data: chRows } = await supabase
          .from("course_chapters")
          .select("id,title,order_index,course_id")
          .in("id", chapterIds);

        const map: Record<string, ChapterInfo> = {};
        (chRows ?? []).forEach((c) => {
          const row = c as unknown as ChapterInfo;
          map[row.id] = {
            id: row.id,
            title: row.title,
            order_index: Number(row.order_index ?? 0),
            course_id: row.course_id,
          };
        });
        setChaptersById(map);
      }

      /* --- Final exam attempts -> Certificates --- */
      // 1) get all attempts for user (latest-first)
      const { data: attRows } = await supabase
        .from("attempts")
        .select("exam_id, score, passed, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const attemptsAll = (attRows ?? []) as AttemptRow[];
      if (attemptsAll.length === 0) {
        setCerts([]);
        setLoading(false);
        return;
      }

      // keep latest attempt per exam_id
      const byExam: Record<string, AttemptRow> = {};
      for (const a of attemptsAll) {
        if (!byExam[a.exam_id]) byExam[a.exam_id] = a;
      }
      const examIds = Object.keys(byExam);
      // 2) fetch exams
      const { data: exRows } = await supabase
        .from("exams")
        .select("id, course_id, title, pass_mark")
        .in("id", examIds);
      const exams = (exRows ?? []) as ExamRow[];
      const courseIds = Array.from(new Set(exams.map(e => e.course_id)));

      // 3) fetch courses
      const { data: courseRows } = await supabase
        .from("courses")
        .select("id, slug, title")
        .in("id", courseIds);

      const courseMap = new Map<string, { id: string; slug: string; title: string }>();
      (courseRows ?? []).forEach(c => {
        courseMap.set(c.id, { id: c.id, slug: c.slug, title: c.title });
      });

      // 4) assemble certificate cards
      const learner = fullName || "Learner";
      const certCards: CertificateCard[] = exams.map((ex) => {
        const a = byExam[ex.id];
        const c = courseMap.get(ex.course_id);
        const scorePct = Math.round(Number(a.score ?? 0));
        const pm = Math.round(Number(ex.pass_mark ?? 0));
        return {
          exam_id: ex.id,
          course_id: ex.course_id,
          course_title: c?.title ?? (ex.title || "Course"),
          course_slug: c?.slug ?? "",
          score_pct: scorePct,
          pass_mark: pm,
          passed: Boolean(a.passed),
          attempted_at: a.created_at,
          learner_name: learner,
        };
      });

      setCerts(certCards);
      setLoading(false);
    })();
  }, []);

  /* ===== Save full name ===== */
  async function saveFullName() {
    setSavingName(true);
    setNameNotice("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) return;

      await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName,
        updated_at: new Date().toISOString(),
      });
      setNameNotice("Saved ✓");
      setTimeout(() => setNameNotice(""), 1500);
      // also refresh displayed learner_name inside certificate cards
      setCerts(prev => prev.map(c => ({ ...c, learner_name: fullName || "Learner" })));
    } catch {
      setNameNotice("Could not save. Please try again.");
    } finally {
      setSavingName(false);
    }
  }

  /* ===== Group quiz results by course / sort by chapter order ===== */
  const quizByCourse = useMemo(() => {
    const grouped: Record<string, { attempt: QuizAttempt; chapter: ChapterInfo }[]> = {};
    for (const a of quiz) {
      const ch = chaptersById[a.chapter_id];
      if (!ch) continue;
      (grouped[a.course_id] ||= []).push({ attempt: a, chapter: ch });
    }
    for (const k of Object.keys(grouped)) {
      grouped[k].sort((l, r) => (l.chapter.order_index ?? 0) - (r.chapter.order_index ?? 0));
    }
    return grouped;
  }, [quiz, chaptersById]);

  return (
    <div className="mx-auto max-w-screen-lg px-4 md:px-6 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold">Your Dashboard</h1>

      {loading && <p className="mt-4 text-muted">Loading…</p>}

      {!loading && (
        <>
          {/* ===== Profile: Full Name ===== */}
          <section className="mt-6 rounded-xl border border-light bg-white p-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <div className="text-sm text-muted">This name appears on your certificates</div>
                <label className="block text-sm font-medium mt-1">Full name</label>
                <input
                  type="text"
                  placeholder="Enter your full legal name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full sm:w-[420px] rounded-lg border px-3 py-2"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveFullName}
                  disabled={savingName || !fullName.trim()}
                  className={`rounded-lg px-4 py-2 font-semibold ${savingName || !fullName.trim() ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-brand text-white hover:opacity-90"}`}
                >
                  {savingName ? "Saving…" : "Save"}
                </button>
                {!!nameNotice && <div className="text-sm text-[#0a1156]">{nameNotice}</div>}
              </div>
            </div>
          </section>

          {/* ===== Course Certificates (replaces 'Upcoming assessments') ===== */}
          <section className="mt-8">
            <h2 className="text-xl font-semibold">Course Certificates</h2>
            {certs.length === 0 ? (
              <div className="mt-3 rounded-xl border border-light bg-white p-4">
                <p className="text-muted">
                  You don’t have any certificates yet. Complete a course and sit the final exam to earn one.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                {certs.map((c) => (
                  <div key={c.exam_id} className="relative rounded-2xl border border-light bg-white p-5 overflow-hidden">
                    {/* decorative border */}
                    <div className="absolute inset-2 rounded-xl border-2 border-amber-200 pointer-events-none" />
                    {/* header */}
                    <div className="relative z-10 text-center">
                      <div className="text-xs tracking-widest text-amber-700">PanAvest Institute</div>
                      <div className="mt-0.5 text-lg font-semibold">Certificate of Completion</div>
                    </div>
                    {/* name */}
                    <div className="relative z-10 mt-4 text-center">
                      <div className="text-xs text-muted">Awarded to</div>
                      <div className="mt-1 text-xl font-bold">{c.learner_name || "Learner"}</div>
                    </div>
                    {/* course */}
                    <div className="relative z-10 mt-4 text-center">
                      <div className="text-xs text-muted">For successfully completing</div>
                      <div className="mt-1 font-semibold">{c.course_title}</div>
                    </div>
                    {/* result line */}
                    <div className="relative z-10 mt-4 grid place-items-center">
                      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-[color:var(--color-light)]">
                        Final exam: {c.score_pct}% &nbsp;·&nbsp; Pass mark: {c.pass_mark}%
                        <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 ${c.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {c.passed ? "PASSED" : "NOT PASSED"}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-muted">
                        Attempted: {new Date(c.attempted_at).toLocaleString()}
                      </div>
                    </div>
                    {/* message */}
                    <p className="relative z-10 mt-4 text-center text-sm">
                      {c.passed
                        ? "This certifies that the learner has met the requirements for this course."
                        : "This record confirms an attempt was made for the final exam. Pass required for certification."}
                    </p>
                    {/* stamp (pure CSS) */}
                    <div className="pointer-events-none absolute right-3 bottom-3 rotate-[-12deg]">
                      <div className={`select-none rounded-full px-4 py-3 text-xs font-bold ring-2 ${c.passed ? "ring-green-600 text-green-700" : "ring-red-600 text-red-700"} bg-white/80`}>
                        {c.passed ? "PANAVEST CERTIFIED" : "ATTEMPT RECORDED"}
                      </div>
                    </div>
                    {/* footer / actions */}
                    <div className="relative z-10 mt-5 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-muted">
                        CPD: {
                          (enrolled.find(e => e.slug === c.course_slug)?.cpd_points ?? 0) || 0
                        } points
                      </div>
                      {c.course_slug && (
                        <Link
                          href={`/knowledge/${c.course_slug}`}
                          className="text-xs rounded-lg px-3 py-1.5 bg-brand text-white"
                          title="View course"
                        >
                          View course
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ===== Purchased E-Books ===== */}
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Purchased E-Books</h2>
            {ebooks.length === 0 ? (
              <div className="mt-3 rounded-xl border border-light bg-white p-4">
                <p className="text-muted">No purchased e-books yet.</p>
                <Link href="/ebooks" className="mt-2 inline-block rounded-lg bg-brand px-4 py-2 text-white">
                  Browse e-books
                </Link>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {ebooks.map((b) => (
                  <div key={b.ebook_id} className="rounded-xl border border-light bg-white overflow-hidden">
                    <div className="relative w-full h-40">
                      <Image
                        src={b.cover_url || "/project-management.png"}
                        alt={b.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                    <div className="p-4">
                      <div className="font-semibold line-clamp-1">{b.title}</div>
                      <div className="mt-1 text-xs text-muted">Purchased · {b.price_cedis}</div>
                      <Link
                        href={`/ebooks/${b.slug}`}
                        className="mt-3 inline-block rounded-lg bg-brand px-3 py-1.5 text-white"
                      >
                        Read
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ===== Continue learning ===== */}
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Continue learning</h2>
            {enrolled.length === 0 ? (
              <div className="mt-3 rounded-xl border border-light bg-white p-4">
                <p className="text-muted">You haven’t enrolled yet.</p>
                <Link href="/courses" className="mt-2 inline-block rounded-lg bg-brand px-4 py-2 text-white">
                  Browse knowledge
                </Link>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {enrolled.map((c) => (
                  <div key={c.course_id} className="rounded-xl border border-light bg-white overflow-hidden">
                    <div className="relative w-full h-40">
                      <Image
                        src={c.img || "/project-management.png"}
                        alt={c.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                    <div className="p-4">
                      <div className="font-semibold line-clamp-1">{c.title}</div>
                      <div className="mt-2 h-2 w-full bg-[color:var(--color-light)] rounded">
                        <div
                          className="h-2 bg-brand rounded"
                          style={{ width: `${c.progress_pct}%` }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-muted">{Math.round(c.progress_pct)}% complete</div>
                      <Link href={`/courses/${c.slug}`} className="mt-3 inline-block rounded-lg bg-brand px-3 py-1.5 text-white">
                        Resume
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ===== Your quiz results ===== */}
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Your quiz results</h2>
            {Object.keys(quizByCourse).length === 0 ? (
              <p className="mt-3 text-muted">No quiz attempts yet.</p>
            ) : (
              <div className="mt-4 grid gap-4">
                {Object.entries(quizByCourse).map(([courseId, rows]) => {
                  const meta = enrolled.find((e) => e.course_id === courseId);
                  return (
                    <div key={courseId} className="rounded-xl border border-light bg-white p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold">
                          {meta?.title ?? "Course"} {meta?.slug ? <span className="text-muted">· /{meta.slug}</span> : null}
                        </div>
                        {meta?.slug && (
                          <Link href={`/courses/${meta.slug}`} className="text-sm rounded-lg px-3 py-1.5 bg-brand text-white">
                            Go to course
                          </Link>
                        )}
                      </div>

                      <ul className="mt-3 grid gap-2">
                        {rows.map(({ attempt, chapter }) => (
                          <li
                            key={`${attempt.course_id}-${attempt.chapter_id}`}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg ring-1 ring-[color:var(--color-light)] px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="font-medium line-clamp-1">{chapter.title}</div>
                              <div className="text-xs text-muted">
                                {attempt.correct_count}/{attempt.total_count} correct ·{" "}
                                {new Date(attempt.completed_at).toLocaleString()}
                              </div>
                            </div>
                            <div className="shrink-0">
                              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-[color:var(--color-light)]">
                                {attempt.score_pct}%
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
