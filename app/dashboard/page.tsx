"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

/* ========= Types ========= */
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

type ProfileRow = {
  id: string;
  full_name: string | null;
};

type CertificateRow = {
  id: string;
  user_id: string;
  course_id: string;
  exam_id: string;
  learner_name: string;
  score_pct: number;
  pass_mark: number;
  issued_at: string;
  courses?: CourseRow | CourseRow[] | null;
};

type CertificateCard = {
  id: string;
  course_id: string;
  slug: string;
  course_title: string;
  learner_name: string;
  score_pct: number;
  pass_mark: number;
  issued_at: string;
  img: string | null;
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

/* ========= Helpers ========= */
function pickCourse(c: CourseRow | CourseRow[] | null | undefined): CourseRow | null {
  if (!c) return null;
  return Array.isArray(c) ? (c[0] ?? null) : c;
}

function pickEbook(e: EbookRow | EbookRow[] | null | undefined): EbookRow | null {
  if (!e) return null;
  return Array.isArray(e) ? (e[0] ?? null) : e;
}

/* ========= Page ========= */
export default function DashboardPage() {
  const [userId, setUserId] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");

  // Profile / name edit
  const [profileName, setProfileName] = useState<string>("");
  const [editingName, setEditingName] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>("");

  // Main collections
  const [enrolled, setEnrolled] = useState<EnrolledCourse[]>([]);
  const [quiz, setQuiz] = useState<QuizAttempt[]>([]);
  const [chaptersById, setChaptersById] = useState<Record<string, ChapterInfo>>({});
  const [ebooks, setEbooks] = useState<PurchasedEbook[]>([]);
  const [certs, setCerts] = useState<CertificateCard[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [savingName, setSavingName] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>("");

  /* ---- Auth ---- */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) {
        window.location.href = "/auth/sign-in";
        return;
      }
      setUserId(user.id);
      setUserEmail(user.email ?? "");
    })();
  }, []);

  /* ---- Load everything ---- */
  useEffect(() => {
    if (!userId) return;

    (async () => {
      setLoading(true);

      // Profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", userId)
        .maybeSingle();

      const fullName = (prof as ProfileRow | null)?.full_name ?? "";

      setProfileName(fullName || "");
      setNameInput(fullName || "");

      // Enrollments (joined with courses)
      const { data: enrData } = await supabase
        .from("enrollments")
        .select("course_id, progress_pct, courses!inner(title,slug,img,cpd_points)")
        .eq("user_id", userId)
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
          const pctNum = Number(r.progress_pct);
          const pct = Number.isFinite(pctNum) ? pctNum : 0;
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

      // Purchased E-Books
      const { data: purRows } = await supabase
        .from("ebook_purchases")
        .select("ebook_id,status,ebooks!inner(id,slug,title,cover_url,price_cents)")
        .eq("user_id", userId)
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

      // Quiz attempts
      const { data: quizRows } = await supabase
        .from("user_chapter_quiz")
        .select("course_id, chapter_id, total_count, correct_count, score_pct, completed_at")
        .eq("user_id", userId);

      const attempts = (quizRows ?? []) as QuizAttempt[];
      setQuiz(attempts);

      // Chapter metadata for ordering
      const chapterIds = Array.from(new Set(attempts.map(a => a.chapter_id)));
      if (chapterIds.length > 0) {
        const { data: chRows } = await supabase
          .from("course_chapters")
          .select("id,title,order_index,course_id")
          .in("id", chapterIds);

        const map: Record<string, ChapterInfo> = {};
        (chRows ?? []).forEach((c: any) => {
          map[c.id] = {
            id: c.id,
            title: c.title,
            order_index: Number(c.order_index ?? 0),
            course_id: c.course_id,
          };
        });
        setChaptersById(map);
      }

      // Certificates (join with courses)
      const { data: certRows } = await supabase
        .from("certificates")
        .select("id,user_id,course_id,exam_id,learner_name,score_pct,pass_mark,issued_at,courses!inner(id,slug,title,img)")
        .eq("user_id", userId)
        .order("issued_at", { ascending: false });

      if (certRows) {
        const list: CertificateCard[] = (certRows as CertificateRow[]).map((r) => {
          const c = pickCourse(r.courses);
          return {
            id: r.id,
            course_id: r.course_id,
            slug: c?.slug ?? "",
            course_title: c?.title ?? "Course",
            learner_name: r.learner_name,
            score_pct: r.score_pct,
            pass_mark: r.pass_mark,
            issued_at: r.issued_at,
            img: c?.img ?? null,
          };
        });
        setCerts(list);
      }

      setLoading(false);
    })();
  }, [userId]);

  /* ---- Derived ---- */
  const displayName = useMemo(() => {
    if (profileName && profileName.trim().length > 0) return profileName.trim();
    if (userEmail && userEmail.trim().length > 0) return userEmail.trim();
    return "Learner";
  }, [profileName, userEmail]);

  // Group quiz results by course and sort chapters by order_index
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

  /* ---- Actions ---- */
  async function saveName() {
    if (!userId) return;
    const value = (nameInput || "").trim();
    if (value.length < 2) {
      setNotice("Please enter at least 2 characters.");
      setTimeout(() => setNotice(""), 1600);
      return;
    }
    setSavingName(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, full_name: value }, { onConflict: "id" });

    setSavingName(false);

    if (error) {
      setNotice("Could not save your name. Try again.");
      setTimeout(() => setNotice(""), 1800);
      return;
    }
    setProfileName(value);
    setEditingName(false);
    setNotice("Name updated.");
    setTimeout(() => setNotice(""), 1200);
  }

  return (
    <div className="mx-auto max-w-screen-lg px-4 md:px-6 py-8">
      {/* Greeting + profile name */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Welcome, {displayName}</h1>
          <p className="text-sm text-muted mt-1">This is your PanAvest dashboard.</p>
          {!!notice && <div className="mt-2 text-sm text-[#0a1156]">{notice}</div>}
        </div>

        <div className="shrink-0">
          {!editingName ? (
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 text-sm"
              onClick={() => { setEditingName(true); setNameInput(profileName || ""); }}
            >
              Edit name
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                className="rounded-lg border px-3 py-1.5 text-sm"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your full name"
                aria-label="Your full name"
              />
              <button
                type="button"
                className="rounded-lg bg-[color:#0a1156] text-white px-3 py-1.5 text-sm disabled:opacity-60"
                onClick={saveName}
                disabled={savingName}
              >
                {savingName ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="rounded-lg border px-3 py-1.5 text-sm"
                onClick={() => { setEditingName(false); setNameInput(profileName || ""); }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {loading && <p className="mt-6 text-muted">Loading…</p>}

      {!loading && (
        <>
          {/* Course Certificates */}
          <section className="mt-8">
            <h2 className="text-xl font-semibold">Course Certificates</h2>

            {certs.length === 0 ? (
              <div className="mt-3 rounded-xl border border-light bg-white p-4">
                <p className="text-muted">
                  No certificates yet. Complete a course and <b>pass the final exam</b> to earn one.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {certs.map((c) => (
                  <div key={c.id} className="relative overflow-hidden rounded-2xl border bg-white">
                    {/* Certificate header / banner */}
                    <div className="relative w-full h-28">
                      <Image
                        src={c.img || "/project-management.png"}
                        alt={c.course_title}
                        fill
                        className="object-cover opacity-80"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm text-muted">Certificate of Completion</div>
                          <div className="text-lg font-semibold">{c.course_title}</div>
                        </div>
                        {/* Stamp */}
                        <div className="text-center">
                          <Image
                            src="/certificate-stamp.png"
                            alt="Certified Stamp"
                            width={64}
                            height={64}
                            className="opacity-90"
                          />
                          <div className="text-[10px] text-muted mt-1">PanAvest Certified</div>
                        </div>
                      </div>

                      <div className="mt-3 text-sm">
                        Awarded to <span className="font-semibold">{c.learner_name}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        Issued: {new Date(c.issued_at).toLocaleString()}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-[color:var(--color-light)]">
                          Final Score: {c.score_pct}%
                        </span>
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-green-100 text-green-800">
                          Pass Mark: {c.pass_mark}%
                        </span>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        {c.slug ? (
                          <Link
                            href={`/courses/${c.slug}`}
                            className="rounded-lg px-3 py-1.5 text-sm bg-[color:#0a1156] text-white"
                          >
                            View course
                          </Link>
                        ) : null}
                        {/* Simple print button (prints the page; you can wire a dedicated cert page later) */}
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="rounded-lg px-3 py-1.5 text-sm border"
                        >
                          Print
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Purchased E-Books */}
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Purchased E-Books</h2>
            {ebooks.length === 0 ? (
              <div className="mt-3 rounded-xl border border-light bg-white p-4">
                <p className="text-muted">No purchased e-books yet.</p>
                <Link href="/ebooks" className="mt-2 inline-block rounded-lg bg-[color:#0a1156] px-4 py-2 text-white">
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
                        className="mt-3 inline-block rounded-lg bg-[color:#0a1156] px-3 py-1.5 text-white"
                      >
                        Read
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Continue learning */}
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Continue learning</h2>
            {enrolled.length === 0 ? (
              <div className="mt-3 rounded-xl border border-light bg-white p-4">
                <p className="text-muted">You haven’t enrolled yet.</p>
                <Link href="/courses" className="mt-2 inline-block rounded-lg bg-[color:#0a1156] px-4 py-2 text-white">
                  Browse courses
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
                          className="h-2 bg-[color:#0a1156] rounded"
                          style={{ width: `${c.progress_pct}%` }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-muted">{Math.round(c.progress_pct)}% complete</div>
                      <Link href={`/courses/${c.slug}`} className="mt-3 inline-block rounded-lg bg-[color:#0a1156] px-3 py-1.5 text-white">
                        Resume
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Your quiz results */}
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
                          <Link href={`/courses/${meta.slug}`} className="text-sm rounded-lg px-3 py-1.5 bg-[color:#0a1156] text-white">
                            Go to course
                          </Link>
                        )}
                      </div>

                      <ul className="mt-3 grid gap-2">
                        {rows.map(({ attempt, chapter }) => (
                          <li
                            key={`${attempt.course_id}-${attempt.chapter_id}-${attempt.completed_at}`}
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
