"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

/** ─────────────────────────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────────────────────────── */
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
  completed_at: string; // ISO
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
  price_cedis: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  updated_at?: string | null;
};

type SupaCourse = { id: string; title: string; slug: string; img: string | null };

type CertificateRow = {
  id: string;
  user_id: string;
  course_id: string;
  attempt_id: string | null;
  score_pct: number;
  certificate_no: string;
  issued_at: string;
  courses: SupaCourse | null; // normalized to a single object or null
};

/** ─────────────────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────────────────── */
function pickCourse(c: CourseRow | CourseRow[] | null | undefined): CourseRow | null {
  if (!c) return null;
  return Array.isArray(c) ? (c[0] ?? null) : c;
}
function pickEbook(e: EbookRow | EbookRow[] | null | undefined): EbookRow | null {
  if (!e) return null;
  return Array.isArray(e) ? (e[0] ?? null) : e;
}
function ensureSingleCourse(c: unknown): SupaCourse | null {
  if (!c) return null;
  const arr = Array.isArray(c) ? c : [c];
  const first = arr[0] as Partial<SupaCourse> | undefined;
  if (!first) return null;
  return {
    id: String(first.id ?? ""),
    title: String(first.title ?? ""),
    slug: String(first.slug ?? ""),
    img: (first.img ?? null) as string | null,
  };
}

/** ─────────────────────────────────────────────────────────────────────────────
 * Component
 * ──────────────────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [loading, setLoading] = useState<boolean>(true);

  // Profile (for persistent welcome name)
  const [userId, setUserId] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameDraft, setNameDraft] = useState<string>("");

  // Courses / progress
  const [enrolled, setEnrolled] = useState<EnrolledCourse[]>([]);

  // Chapter quiz results
  const [quiz, setQuiz] = useState<QuizAttempt[]>([]);
  const [chaptersById, setChaptersById] = useState<Record<string, ChapterInfo>>({});

  // Purchased ebooks
  const [ebooks, setEbooks] = useState<PurchasedEbook[]>([]);

  // Certificates (normalized)
  const [certs, setCerts] = useState<CertificateRow[]>([]);

  // Load everything
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        window.location.href = "/auth/sign-in";
        return;
      }
      setUserId(user.id);

      // Profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name, updated_at")
        .eq("id", user.id)
        .maybeSingle();

      const p = (prof as unknown as ProfileRow) || null;
      const initialName = (p?.full_name ?? "").trim();
      setFullName(initialName);
      setNameDraft(initialName);

      // Enrollments
      const { data: enrData } = await supabase
        .from("enrollments")
        .select("course_id, progress_pct, courses!inner(title,slug,img,cpd_points)")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (enrData) {
        const rows = (enrData as unknown as EnrollmentRow[]) ?? [];
        const mapped: EnrolledCourse[] = rows.map((r) => {
          const c = pickCourse(r.courses) || {
            id: "",
            slug: "",
            title: "",
            img: null,
            cpd_points: null,
          };
          const rawPct = Number(r.progress_pct ?? 0);
          const pct = Number.isFinite(rawPct) ? rawPct : 0;
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

      // Ebooks (paid)
      const { data: purRows } = await supabase
        .from("ebook_purchases")
        .select("ebook_id,status,ebooks!inner(id,slug,title,cover_url,price_cents)")
        .eq("user_id", user.id)
        .eq("status", "paid")
        .order("created_at", { ascending: false });

      if (purRows) {
        const items = (purRows as unknown as PurchaseRow[])
          .map((p) => {
            const e = pickEbook(p.ebooks);
            if (!e) return null;
            return {
              ebook_id: p.ebook_id,
              slug: e.slug,
              title: e.title,
              cover_url: e.cover_url ?? null,
              price_cedis: `GH₵ ${((e.price_cents ?? 0) / 100).toFixed(2)}`,
            } as PurchasedEbook;
          })
          .filter((x): x is PurchasedEbook => Boolean(x));
        setEbooks(items);
      }

      // Quiz attempts
      const { data: quizRows } = await supabase
        .from("user_chapter_quiz")
        .select("course_id, chapter_id, total_count, correct_count, score_pct, completed_at")
        .eq("user_id", user.id);

      const attempts = (quizRows as unknown as QuizAttempt[]) ?? [];
      setQuiz(attempts);

      // Chapter metadata
      const chapterIds = Array.from(new Set(attempts.map((a) => a.chapter_id))).filter(Boolean);
      if (chapterIds.length > 0) {
        const { data: chRows } = await supabase
          .from("course_chapters")
          .select("id,title,order_index,course_id")
          .in("id", chapterIds);

        const map: Record<string, ChapterInfo> = {};
        (chRows as unknown as ChapterInfo[] | null | undefined)?.forEach((row) => {
          map[row.id] = {
            id: row.id,
            title: row.title,
            order_index: Number(row.order_index ?? 0),
            course_id: row.course_id,
          };
        });
        setChaptersById(map);
      }

      // Certificates (try embedded join; fallback if PostgREST complains)
      const certSelect =
        "id,user_id,course_id,attempt_id,score_pct,certificate_no,issued_at,courses(id,title,slug,img)";
      let certData: CertificateRow[] = [];

      {
        const { data, error } = await supabase
          .from("certificates")
          .select(certSelect)
          .eq("user_id", user.id)
          .order("issued_at", { ascending: false });

        if (!error && data) {
          // normalize courses shape
          const normalized = (data as unknown[]).map((row) => {
            const r = row as Record<string, unknown>;
            return {
              id: String(r.id),
              user_id: String(r.user_id),
              course_id: String(r.course_id),
              attempt_id: r.attempt_id ? String(r.attempt_id) : null,
              score_pct: Number(r.score_pct ?? 0),
              certificate_no: String(r.certificate_no ?? ""),
              issued_at: String(r.issued_at ?? new Date().toISOString()),
              courses: ensureSingleCourse(r.courses ?? null),
            } satisfies CertificateRow;
          });
          certData = normalized;
        } else {
          // Fallback: fetch certs only, then hydrate courses in a second query
          const { data: simple, error: simpleErr } = await supabase
            .from("certificates")
            .select("id,user_id,course_id,attempt_id,score_pct,certificate_no,issued_at")
            .eq("user_id", user.id)
            .order("issued_at", { ascending: false });

          const simpleRows = (simple as unknown[] | null) ?? [];
          if (!simpleErr && simpleRows.length > 0) {
            const courseIds = Array.from(
              new Set(
                simpleRows.map((r) => String((r as any).course_id)).filter(Boolean)
              )
            );
            let courseMap: Record<string, SupaCourse> = {};
            if (courseIds.length > 0) {
              const { data: courseRows } = await supabase
                .from("courses")
                .select("id,title,slug,img")
                .in("id", courseIds);
              (courseRows as unknown[] | null)?.forEach((cr) => {
                const c = cr as SupaCourse;
                courseMap[c.id] = {
                  id: c.id,
                  title: c.title,
                  slug: c.slug,
                  img: c.img ?? null,
                };
              });
            }
            certData = simpleRows.map((r) => {
              const rr = r as Record<string, unknown>;
              const cid = String(rr.course_id);
              return {
                id: String(rr.id),
                user_id: String(rr.user_id),
                course_id: cid,
                attempt_id: rr.attempt_id ? String(rr.attempt_id) : null,
                score_pct: Number(rr.score_pct ?? 0),
                certificate_no: String(rr.certificate_no ?? ""),
                issued_at: String(rr.issued_at ?? new Date().toISOString()),
                courses: courseMap[cid] ?? null,
              } satisfies CertificateRow;
            });
          }
        }
      }

      setCerts(certData);
      setLoading(false);
    })();
  }, []);

  // Name save
  async function saveName() {
    const trimmed = nameDraft.trim();
    if (!userId) return;
    if (!trimmed) return;
    await supabase
      .from("profiles")
      .upsert({ id: userId, full_name: trimmed, updated_at: new Date().toISOString() });
    setFullName(trimmed);
    setIsEditingName(false);
  }

  // Group quiz results by course & sort by chapter order
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
      {/* Welcome header with persistent name */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold">
          {fullName ? `Welcome, ${fullName}` : "Welcome"}
        </h1>

        {!isEditingName ? (
          <button
            type="button"
            onClick={() => setIsEditingName(true)}
            className="rounded-lg border px-3 py-1.5 text-sm"
          >
            {fullName ? "Edit name" : "Add name"}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              className="rounded-md border px-3 py-1.5 text-sm"
              placeholder="Your full name"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
            />
            <button
              type="button"
              onClick={saveName}
              className="rounded-lg bg-[color:#0a1156] text-white px-3 py-1.5 text-sm"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditingName(false);
                setNameDraft(fullName);
              }}
              className="rounded-lg border px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {loading && <p className="mt-4 text-muted">Loading…</p>}

      {!loading && (
        <>
          {/* Purchased E-Books */}
          <section className="mt-8">
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

          {/* Course Certificates */}
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Course Certificates</h2>
            {certs.length === 0 ? (
              <p className="mt-3 text-muted">
                No certificates yet. Complete a course and pass the final exam to earn one.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {certs.map((c) => {
                  const courseTitle = c.courses?.title ?? "Course";
                  const courseSlug = c.courses?.slug ?? "";
                  const bg = c.courses?.img ?? "/project-management.png";
                  return (
                    <div key={c.id} className="rounded-xl border border-light bg-white overflow-hidden">
                      <div className="relative w-full h-36">
                        <Image src={bg} alt={courseTitle} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold line-clamp-1">{courseTitle}</div>
                          {courseSlug && (
                            <Link href={`/courses/${courseSlug}`} className="text-xs rounded-md px-2 py-1 bg-[color:var(--color-light)]">
                              View course
                            </Link>
                          )}
                        </div>

                        <div className="mt-2 text-sm">
                          <div><span className="font-medium">Issued to:</span> {fullName || "—"}</div>
                          <div className="text-muted text-xs">Certificate No: {c.certificate_no}</div>
                          <div className="text-muted text-xs">Issued: {new Date(c.issued_at).toLocaleString()}</div>
                        </div>

                        <div className="mt-3 rounded-lg border border-dashed p-3">
                          <div className="text-[13px]">This certifies that</div>
                          <div className="text-lg font-semibold">{fullName || "Your Name"}</div>
                          <div className="text-sm">
                            has successfully completed <span className="font-medium">{courseTitle}</span> with a final score of{" "}
                            <span className="font-semibold">{c.score_pct}%</span>.
                          </div>
                          <div className="mt-2 inline-flex items-center gap-2 text-xs">
                            <span className="inline-flex h-6 items-center rounded-full px-2.5 bg-green-100 text-green-800 border border-green-200">
                              ✅ Verified
                            </span>
                            <span className="inline-flex h-6 items-center rounded-full px-2.5 bg-indigo-100 text-indigo-800 border border-indigo-200">
                              🕮 PanAvest
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <Link
                            href={`/api/secure-pdf?cert_id=${encodeURIComponent(c.id)}`}
                            className="rounded-lg bg-[color:#0a1156] text-white px-3 py-1.5 text-sm"
                          >
                            View / Download
                          </Link>
                          <div className="text-xs text-muted">Final score: {c.score_pct}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Quiz results */}
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Your quiz results</h2>
            {Object.keys(quizByCourse).length === 0 ? (
              <p className="mt-3 text-muted">No quiz attempts yet.</p>
            ) : (
              <div className="mt-4 grid gap-4">
                {Object.entries(quizByCourse).map(([courseId, rows]) => (
                  <div key={courseId} className="rounded-xl border border-light bg-white p-4">
                    <div className="font-semibold">Course {courseId.slice(0, 8)}…</div>
                    <ul className="mt-3 grid gap-2">
                      {rows.map(({ attempt, chapter }) => (
                        <li
                          key={`${attempt.course_id}-${attempt.chapter_id}-${attempt.completed_at}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg ring-1 ring-[color:var(--color-light)] px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="font-medium line-clamp-1">{chapter.title}</div>
                            <div className="text-xs text-muted">
                              {attempt.correct_count}/{attempt.total_count} correct · {new Date(attempt.completed_at).toLocaleString()}
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
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
