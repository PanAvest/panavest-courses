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

/* ===== E-Books ===== */
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
  price_cedis: string; // formatted price
};

/* ===== Profile / Certificates ===== */
type ProfileRow = {
  id: string;
  full_name: string | null;
};

type CertificateRow = {
  exam_id: string;
  course_id: string;
  learner_name: string | null;
  score_pct: number | null;
  pass_mark: number | null;
  issued_at: string; // ISO
  courses?:
    | { title: string; slug: string }
    | { title: string; slug: string }[]
    | null;
};

type CertificateCard = {
  exam_id: string;
  course_id: string;
  course_title: string;
  course_slug: string;
  learner_name: string;
  score_pct: number;
  pass_mark: number;
  issued_at: string;
};

function pickCourse(c: CourseRow | CourseRow[] | null | undefined): CourseRow | null {
  if (!c) return null;
  return Array.isArray(c) ? (c[0] ?? null) : c;
}
function pickEbook(e: EbookRow | EbookRow[] | null | undefined): EbookRow | null {
  if (!e) return null;
  return Array.isArray(e) ? (e[0] ?? null) : e;
}

export default function DashboardPage() {
  const [userId, setUserId] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");

  // Name display + edit controls
  const [fullName, setFullName] = useState<string>("");
  const [editingName, setEditingName] = useState<boolean>(false);
  const [pendingFullName, setPendingFullName] = useState<string>("");
  const [savingName, setSavingName] = useState<boolean>(false);
  const [nameNotice, setNameNotice] = useState<string>("");

  const [enrolled, setEnrolled] = useState<EnrolledCourse[]>([]);
  const [quiz, setQuiz] = useState<QuizAttempt[]>([]);
  const [chaptersById, setChaptersById] = useState<Record<string, ChapterInfo>>({});
  const [ebooks, setEbooks] = useState<PurchasedEbook[]>([]);
  const [certs, setCerts] = useState<CertificateCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Friendly display name for greeting
  const displayName = fullName || userEmail || "there";

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/auth/sign-in";
        return;
      }
      setUserId(user.id);
      setUserEmail(user.email ?? "");

      /* --- Profile (full name) --- */
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", user.id)
          .maybeSingle<ProfileRow>();
        const name = prof?.full_name ?? "";
        setFullName(name);
        setPendingFullName(name);
      } catch {
        // ignore; UI still works
      }

      /* --- Enrollments + courses --- */
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

      /* --- Quiz attempts --- */
      const { data: quizRows } = await supabase
        .from("user_chapter_quiz")
        .select("course_id, chapter_id, total_count, correct_count, score_pct, completed_at")
        .eq("user_id", user.id);
      const attempts = (quizRows ?? []) as QuizAttempt[];
      setQuiz(attempts);

      /* --- Chapter metadata (for ordering quiz results) --- */
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

      /* --- Certificates (passed) --- */
      const { data: certRows } = await supabase
        .from("certificates")
        .select("exam_id, course_id, learner_name, score_pct, pass_mark, issued_at, courses!inner(title,slug)")
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false });

      const cards: CertificateCard[] = (certRows ?? [])
        .filter((r) => (r.score_pct ?? 0) >= (r.pass_mark ?? 0))
        .map((r) => {
          const c = (Array.isArray(r.courses) ? r.courses[0] : r.courses) as { title: string; slug: string } | null;
          return {
            exam_id: r.exam_id,
            course_id: r.course_id,
            course_title: c?.title ?? "Course",
            course_slug: c?.slug ?? "",
            learner_name: ((r.learner_name ?? fullName) || userEmail || "Learner") as string,
            score_pct: Math.round(Number(r.score_pct ?? 0)),
            pass_mark: Math.round(Number(r.pass_mark ?? 0)),
            issued_at: r.issued_at,
          };
        });

      setCerts(cards);
      setLoading(false);
    })();
  }, []);

  /* ===== Save/Edit full name ===== */
  async function saveFullName() {
    setSavingName(true);
    setNameNotice("");
    try {
      if (!userId) return;

      const clean = pendingFullName.trim();

      // Save to profiles table
      await supabase.from("profiles").upsert({
        id: userId,
        full_name: clean,
        updated_at: new Date().toISOString(),
      });

      setFullName(clean);
      setEditingName(false);
      setNameNotice("Saved ✓");

      // Keep certificates consistent with the new name
      await supabase
        .from("certificates")
        .update({ learner_name: clean })
        .eq("user_id", userId);

      // update local view immediately
      setCerts(prev => prev.map(c => ({ ...c, learner_name: clean })));

      // clear notice
      setTimeout(() => setNameNotice(""), 1500);
    } catch {
      setNameNotice("Could not save name. Please try again.");
    } finally {
      setSavingName(false);
    }
  }

  /* ===== Quiz results grouped by course ===== */
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
      {/* Welcome heading */}
      <h1 className="text-2xl sm:text-3xl font-bold">
        Welcome{displayName ? `, ${displayName}` : ""} 👋
      </h1>
      {!fullName && (
        <p className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
          Add your full name below to appear on your certificates.
        </p>
      )}

      {loading && <p className="mt-4 text-muted">Loading…</p>}

      {!loading && (
        <>
          {/* ===== Profile: Name (permanent view with edit) ===== */}
          <section className="mt-6 rounded-xl border border-light bg-white p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-sm text-muted">Name on certificates</div>
                {!editingName ? (
                  <div className="mt-1 text-lg font-semibold">{fullName || "—"}</div>
                ) : (
                  <input
                    type="text"
                    autoFocus
                    value={pendingFullName}
                    onChange={(e) => setPendingFullName(e.target.value)}
                    placeholder="Enter your full legal name"
                    className="mt-1 w-full sm:w-[420px] rounded-lg border px-3 py-2"
                  />
                )}
              </div>

              <div className="flex items-center gap-2">
                {!editingName ? (
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className="rounded-lg px-4 py-2 bg-brand text-white"
                  >
                    {fullName ? "Edit name" : "Add name"}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={saveFullName}
                      disabled={savingName || !pendingFullName.trim()}
                      className={`rounded-lg px-4 py-2 font-semibold ${
                        savingName || !pendingFullName.trim()
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-brand text-white hover:opacity-90"
                      }`}
                    >
                      {savingName ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingName(false);
                        setPendingFullName(fullName);
                      }}
                      className="rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)]"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {!!nameNotice && <div className="text-sm text-[#0a1156]">{nameNotice}</div>}
              </div>
            </div>
          </section>

          {/* ===== Course Certificates ===== */}
          <section className="mt-8">
            <h2 className="text-xl font-semibold">Course Certificates</h2>
            {certs.length === 0 ? (
              <div className="mt-3 rounded-xl border border-light bg-white p-4">
                <p className="text-muted">
                  No certificates yet. Finish a course and pass the final exam to earn one.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                {certs.map((c) => (
                  <div
                    key={c.exam_id}
                    className="relative rounded-2xl border border-light bg-white p-5 overflow-hidden"
                    aria-label={`Certificate for ${c.course_title}`}
                  >
                    <div className="absolute inset-2 rounded-xl border-2 border-amber-200 pointer-events-none" />
                    <div className="relative z-10 text-center">
                      <div className="text-xs tracking-widest text-amber-700">PanAvest Institute</div>
                      <div className="mt-0.5 text-lg font-semibold">Certificate of Completion</div>
                    </div>

                    <div className="relative z-10 mt-4 text-center">
                      <div className="text-xs text-muted">Awarded to</div>
                      <div className="mt-1 text-xl font-bold">{c.learner_name}</div>
                    </div>

                    <div className="relative z-10 mt-4 text-center">
                      <div className="text-xs text-muted">For successfully completing</div>
                      <div className="mt-1 font-semibold">{c.course_title}</div>
                    </div>

                    <div className="relative z-10 mt-4 grid place-items-center">
                      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-[color:var(--color-light)]">
                        Final exam: {c.score_pct}% · Pass mark: {c.pass_mark}%
                        <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 bg-green-100 text-green-800">
                          PASSED
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-muted">
                        Issued: {new Date(c.issued_at).toLocaleString()}
                      </div>
                    </div>

                    <p className="relative z-10 mt-4 text-center text-sm">
                      This certifies that the learner has met the requirements for this course.
                    </p>

                    {/* Stamp */}
                    <div className="pointer-events-none absolute right-3 bottom-3 rotate-[-12deg]">
                      <div className="select-none rounded-full px-4 py-3 text-xs font-bold ring-2 ring-green-600 text-green-700 bg-white/80">
                        PANAVEST CERTIFIED
                      </div>
                    </div>

                    <div className="relative z-10 mt-5 flex items-center justify-between gap-2">
                      {c.course_slug ? (
                        <Link
                          href={`/knowledge/${c.course_slug}`}
                          className="text-xs rounded-lg px-3 py-1.5 bg-brand text-white"
                          title="View course"
                        >
                          View course
                        </Link>
                      ) : <span />}
                      <span className="text-[11px] text-muted">Certificate ID: {c.exam_id.slice(0, 8)}…</span>
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
                        <div className="h-2 bg-brand rounded" style={{ width: `${c.progress_pct}%` }} />
                      </div>
                      <div className="mt-2 text-xs text-muted">{Math.round(c.progress_pct)}% complete</div>
                      <Link href={`/knowledge/${c.slug}`} className="mt-3 inline-block rounded-lg bg-brand px-3 py-1.5 text-white">
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
                          <Link href={`/knowledge/${meta.slug}`} className="text-sm rounded-lg px-3 py-1.5 bg-brand text-white">
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
