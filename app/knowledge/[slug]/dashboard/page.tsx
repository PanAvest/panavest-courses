"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ProgressBar from "@/components/ProgressBar";

type Course = { id: string; slug: string; title: string; img: string | null };
type Chapter = { id: string; title: string; order_index: number; intro_video_url: string | null };

// Slides
type Slide = {
  id: string;
  chapter_id: string;
  title: string;
  order_index: number;
  intro_video_url: string | null;
  asset_url: string | null;
  body: string | null;
  // legacy
  video_url?: string | null;
  content?: string | null;
};

// Quizzes
type QuizQuestion = {
  id: string;
  chapter_id: string;
  question: string;
  options: string[];     // stored as json[] in DB
  correct_index: number; // 0-based
};

type QuizSetting = {
  chapter_id: string;
  time_limit_seconds: number | null; // per chapter; default 120 if null
  num_questions: number | null;      // optional (null = all)
};

export default function CourseDashboard() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState<string>("");

  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [activeSlide, setActiveSlide] = useState<Slide | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string>("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // quizzes
  const [quizByChapter, setQuizByChapter] = useState<Record<string, QuizQuestion[]>>({});
  const [quizSettings, setQuizSettings] = useState<Record<string, QuizSetting>>({});
  const [completedQuizzes, setCompletedQuizzes] = useState<string[]>([]);

  // quiz UI state
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizChapterId, setQuizChapterId] = useState<string | null>(null);
  const [quizItems, setQuizItems] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number | null>>({});
  const [quizTimeLeft, setQuizTimeLeft] = useState<number>(0);
  const quizTickRef = useRef<number | null>(null);

  // set "first slide" only once on initial load
  const initializedRef = useRef(false);

  // auth
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/sign-in"); return; }
      setUserId(user.id);
      setUserEmail(user.email ?? "");
    })();
  }, [router]);

  // load data
  useEffect(() => {
    if (!userId || !slug) return;
    (async () => {
      setLoading(true);

      // course
      const { data: c } = await supabase
        .from("courses")
        .select("id,slug,title,img")
        .eq("slug", String(slug))
        .maybeSingle();
      if (!c) { router.push("/knowledge"); return; }
      setCourse(c);

      // soft paywall
      try {
        const { data: enr } = await supabase
          .from("enrollments")
          .select("paid")
          .eq("user_id", userId).eq("course_id", c.id)
          .maybeSingle();
        if (enr && enr.paid === false) {
          router.push(`/knowledge/${c.slug}/enroll`);
          return;
        }
      } catch {}

      // chapters (ordered)
      const { data: ch } = await supabase
        .from("course_chapters")
        .select("id,title,order_index,intro_video_url")
        .eq("course_id", c.id)
        .order("order_index", { ascending: true });

      const chapterIds = (ch ?? []).map(x => x.id);

      // slides (ordered within each chapter)
      let sl: Slide[] = [];
      if (chapterIds.length > 0) {
        const { data: slData } = await supabase
          .from("course_slides")
          .select("id,chapter_id,title,order_index,intro_video_url,asset_url,body,video_url,content")
          .in("chapter_id", chapterIds)
          .order("order_index", { ascending: true });
        sl = slData ?? [];
      }

      // linear order sorted by chapter.order_index then slide.order_index
      const chOrder: Record<string, number> = {};
      (ch ?? []).forEach(chp => { chOrder[chp.id] = chp.order_index ?? 0; });
      const slSorted = [...sl].sort((a, b) => {
        const ca = chOrder[a.chapter_id] ?? 0;
        const cb = chOrder[b.chapter_id] ?? 0;
        if (ca !== cb) return ca - cb;
        return (a.order_index ?? 0) - (b.order_index ?? 0);
      });

      setChapters(ch ?? []);
      setSlides(slSorted);

      if (!initializedRef.current) {
        setActiveSlide(slSorted[0] ?? null); // always first slide initially
        initializedRef.current = true;
      }

      // slide progress
      try {
        const { data: prog } = await supabase
          .from("user_slide_progress")
          .select("slide_id")
          .eq("user_id", userId)
          .eq("course_id", c.id);
        setCompleted((prog ?? []).map((p: { slide_id: string }) => p.slide_id));
      } catch {}

      // quiz questions
      try {
        if (chapterIds.length > 0) {
          const { data: qq } = await supabase
            .from("chapter_quiz_questions")
            .select("id,chapter_id,question,options,correct_index")
            .in("chapter_id", chapterIds);
          const map: Record<string, QuizQuestion[]> = {};
          (qq ?? []).forEach((q) => {
            (map[q.chapter_id] ||= []).push({
              ...q,
              options: Array.isArray(q.options) ? q.options : [],
            });
          });
          setQuizByChapter(map);
        }
      } catch {}

      // quiz settings
      try {
        if (chapterIds.length > 0) {
          const { data: qs } = await supabase
            .from("chapter_quiz_settings")
            .select("chapter_id,time_limit_seconds,num_questions")
            .in("chapter_id", chapterIds);
          const map: Record<string, QuizSetting> = {};
          (qs ?? []).forEach((s) => { map[s.chapter_id] = s; });
          setQuizSettings(map);
        }
      } catch {}

      // quiz completion (per user per chapter)
      try {
        const { data: qprog } = await supabase
          .from("user_chapter_quiz")
          .select("chapter_id")
          .eq("user_id", userId)
          .eq("course_id", c.id);
        setCompletedQuizzes(Array.from(new Set((qprog ?? []).map(r => r.chapter_id))));
      } catch {}

      setLoading(false);
    })();
  }, [userId, slug, router]);

  // ordered lists derived from state
  const orderedSlides = useMemo(() => slides, [slides]);
  const orderedIds = useMemo(() => orderedSlides.map(s => s.id), [orderedSlides]);

  // chapters helper maps
  const slidesByChapter = useMemo(() => {
    const map: Record<string, Slide[]> = {};
    for (const s of orderedSlides) (map[s.chapter_id] ||= []).push(s);
    return map;
  }, [orderedSlides]);

  const chapterOrder = useMemo(() => {
    const order: string[] = [...chapters].sort((a,b)=> (a.order_index??0)-(b.order_index??0)).map(c=>c.id);
    return order;
  }, [chapters]);

  const chapterFirstSlideIndex: Record<string, number> = useMemo(() => {
    const idx: Record<string, number> = {};
    orderedSlides.forEach((s, i) => {
      if (!(s.chapter_id in idx)) idx[s.chapter_id] = i;
    });
    return idx;
  }, [orderedSlides]);

  const chapterLastSlideIndex: Record<string, number> = useMemo(() => {
    const idx: Record<string, number> = {};
    orderedSlides.forEach((s, i) => { idx[s.chapter_id] = i; });
    return idx;
  }, [orderedSlides]);

  // locking: first slide not completed
  const firstIncompleteIndex = useMemo(() => {
    for (let i = 0; i < orderedIds.length; i++) {
      if (!completed.includes(orderedIds[i])) return i;
    }
    return orderedIds.length - 1; // all slides done
  }, [orderedIds, completed]);

  // extra lock at chapter boundaries: if an entire chapter's slides are done but its quiz isn't completed,
  // block the first slide of the *next* chapter.
  const boundaryLockedIndex = useMemo(() => {
    // find first chapter for which all slides are complete but quiz not completed
    for (let i = 0; i < chapterOrder.length; i++) {
      const chId = chapterOrder[i];
      const slidesInCh = slidesByChapter[chId] ?? [];
      if (slidesInCh.length === 0) continue;

      const allDone = slidesInCh.every(s => completed.includes(s.id));
      const quizDone = completedQuizzes.includes(chId);

      if (allDone && !quizDone) {
        // lock at last slide of this chapter (so next chapter is blocked)
        return chapterLastSlideIndex[chId] ?? firstIncompleteIndex;
      }
    }
    // no boundary lock
    return orderedIds.length - 1;
  }, [chapterOrder, slidesByChapter, completed, completedQuizzes, chapterLastSlideIndex, orderedIds.length, firstIncompleteIndex]);

  const maxAccessibleIndex = Math.min(firstIncompleteIndex, boundaryLockedIndex);

  const canAccessById = useCallback((slideId: string) => {
    const idx = orderedIds.indexOf(slideId);
    if (idx === -1) return false;
    return idx <= maxAccessibleIndex;
  }, [orderedIds, maxAccessibleIndex]);

  const totalSlides = orderedSlides.length;
  const done = completed.length;
  const pct = totalSlides === 0 ? 0 : Math.round((done / totalSlides) * 100);

  async function markDone(slide: Slide | null) {
    if (!slide || !userId || !course) return;
    try {
      await supabase
        .from("user_slide_progress")
        .upsert(
          { user_id: userId, course_id: course.id, slide_id: slide.id },
          { onConflict: "user_id,slide_id" }
        );
      setCompleted(prev => (prev.includes(slide.id) ? prev : [...prev, slide.id]));
      setNotice("Marked as done ✓");

      // auto-advance to next slide (if allowed)
      const idx = orderedIds.indexOf(slide.id);
      if (idx > -1 && idx + 1 < orderedIds.length) {
        const next = orderedSlides[idx + 1];
        // respect gating
        if (canAccessById(next.id)) {
          setActiveSlide(next);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
      setTimeout(() => setNotice(""), 1500);
    } catch {
      setNotice("Could not save progress. Try again.");
      setTimeout(() => setNotice(""), 2000);
    }
  }

  // quiz helpers
  function shuffle<T>(arr: T[]) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function beginQuiz(chId: string) {
    const pool = quizByChapter[chId] ?? [];
    if (pool.length === 0) {
      setNotice("No quiz is set for this chapter yet.");
      setTimeout(() => setNotice(""), 1500);
      return;
    }
    const settings = quizSettings[chId];
    const num = Math.max(1, Math.min(pool.length, Number(settings?.num_questions ?? pool.length)));
    const randomized = shuffle(pool).slice(0, num);
    const answers: Record<string, number | null> = {};
    randomized.forEach(q => { answers[q.id] = null; });

    setQuizChapterId(chId);
    setQuizItems(randomized);
    setQuizAnswers(answers);
    setQuizTimeLeft(Math.max(10, Number(settings?.time_limit_seconds ?? 120)));
    setQuizOpen(true);
  }

  // quiz timer
  useEffect(() => {
    if (!quizOpen) return;
    if (quizTickRef.current) window.clearInterval(quizTickRef.current);
    quizTickRef.current = window.setInterval(() => {
      setQuizTimeLeft(t => {
        if (t <= 1) {
          window.clearInterval(quizTickRef.current!);
          quizTickRef.current = null;
          // auto-submit on time up
          void submitQuiz(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000) as unknown as number;

    return () => {
      if (quizTickRef.current) {
        window.clearInterval(quizTickRef.current);
        quizTickRef.current = null;
      }
    };
  }, [quizOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submitQuiz(auto = false) {
    if (!quizOpen || !quizChapterId || !course || !userId) return;

    const answered = quizItems.map(q => ({
      id: q.id,
      chosen: quizAnswers[q.id],
      correct: q.correct_index,
    }));

    const total = quizItems.length;
    const correctCount = answered.reduce((acc, a) => acc + (a.chosen === a.correct ? 1 : 0), 0);
    const scorePct = Math.round((correctCount / Math.max(1, total)) * 100);

    // persist attempt
    try {
      await supabase.from("user_chapter_quiz").insert({
        user_id: userId,
        course_id: course.id,
        chapter_id: quizChapterId,
        total_count: total,
        correct_count: correctCount,
        score_pct: scorePct,
        completed_at: new Date().toISOString(),
        meta: { autoSubmit: auto },
      });
      setCompletedQuizzes(prev => (prev.includes(quizChapterId) ? prev : [...prev, quizChapterId]));
    } catch {
      // ignore write failure to keep UX smooth
    }

    setQuizOpen(false);
    setQuizChapterId(null);
    setQuizItems([]);
    setQuizAnswers({});
    setQuizTimeLeft(0);
    setNotice(`Quiz submitted. Score: ${correctCount}/${total} (${scorePct}%).`);
    setTimeout(() => setNotice(""), 2500);
  }

  // UI helpers
  function renderMedia(s: Slide) {
    const video = s.video_url ?? s.intro_video_url ?? null;
    if (video) {
      return (
        <div className="mt-3 w-full">
          <div className="w-full overflow-hidden rounded-lg">
            <video className="block w-full h-auto" controls preload="metadata" src={video} />
          </div>
        </div>
      );
    }
    if (s.asset_url) {
      const lower = s.asset_url.toLowerCase();
      const isImg = [".jpg",".jpeg",".png",".gif",".webp"].some(ext => lower.endsWith(ext));
      if (isImg) {
        return (
          <div className="mt-3">
            <Image
              src={s.asset_url}
              alt="Slide asset"
              width={1600}
              height={900}
              className="rounded-lg ring-1 ring-[color:var(--color-light)] w-full h-auto object-contain"
            />
          </div>
        );
      }
      return (
        <div className="mt-3 text-sm">
          <a className="underline break-all" href={s.asset_url} target="_blank" rel="noreferrer">
            Open slide asset
          </a>
        </div>
      );
    }
    return null;
  }

  const trySelectSlide = (s: Slide) => {
    if (canAccessById(s.id)) {
      setActiveSlide(s);
      setMobileNavOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setNotice("Complete the previous slide or chapter quiz first.");
      setTimeout(() => setNotice(""), 1500);
    }
  };

  const activeIndex = activeSlide ? orderedIds.indexOf(activeSlide.id) : -1;
  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex > -1 && (activeIndex + 1) <= maxAccessibleIndex;

  // is this the last slide of its chapter?
  const isLastSlideOfChapter = useMemo(() => {
    if (!activeSlide) return false;
    const lastIdx = chapterLastSlideIndex[activeSlide.chapter_id];
    return typeof lastIdx === "number" && activeIndex === lastIdx;
  }, [activeSlide, chapterLastSlideIndex, activeIndex]);

  const quizExistsForActiveChapter = useMemo(() => {
    if (!activeSlide) return false;
    const pool = quizByChapter[activeSlide.chapter_id] ?? [];
    return pool.length > 0;
  }, [quizByChapter, activeSlide]);

  const quizDoneForActiveChapter = useMemo(() => {
    if (!activeSlide) return false;
    return completedQuizzes.includes(activeSlide.chapter_id);
  }, [completedQuizzes, activeSlide]);

  if (loading) return <div className="mx-auto max-w-screen-lg px-4 py-10">Loading…</div>;
  if (!course) return <div className="mx-auto max-w-screen-lg px-4 py-10">Not found.</div>;

  return (
    <div className="mx-auto max-w-screen-2xl px-4 md:px-6 py-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-xl md:text-2xl font-semibold">{course.title}</div>
        <div className="flex items-center gap-2 text-xs md:text-sm text-muted">
          {userEmail && <span className="truncate max-w-[50vw] md:max-w-none">{userEmail}</span>}
          <button
            type="button"
            className="md:hidden rounded-lg border px-3 py-1.5"
            onClick={() => setMobileNavOpen(v => !v)}
            aria-expanded={mobileNavOpen}
            aria-controls="course-sidebar"
          >
            {mobileNavOpen ? "Hide Menu" : "Show Menu"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Sidebar */}
        <aside
          id="course-sidebar"
          className={[
            "rounded-2xl bg-white border border-light p-4 h-max lg:sticky lg:top-4",
            "md:max-h-[80vh] md:overflow-auto",
            mobileNavOpen ? "block" : "hidden md:block"
          ].join(" ")}
        >
          <div className="text-sm">Progress</div>
          <div className="mt-1"><ProgressBar value={pct} /></div>
          <div className="mt-1 text-xs text-muted">{done} / {totalSlides} slides completed</div>

          <div className="mt-4">
            {chapters.map((ch) => (
              <div key={ch.id} className="mb-3">
                <div className="font-semibold text-sm flex items-center justify-between">
                  <span>{ch.title}</span>
                  {/* tiny chip if quiz exists / done */}
                  {(quizByChapter[ch.id]?.length ?? 0) > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${completedQuizzes.includes(ch.id) ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                      {completedQuizzes.includes(ch.id) ? "Quiz done" : "Quiz"}
                    </span>
                  )}
                </div>
                <ul className="mt-2 grid gap-1">
                  {(slidesByChapter[ch.id] ?? []).map((s) => {
                    const isActive = activeSlide?.id === s.id;
                    const isDone = completed.includes(s.id);
                    const isLocked = !canAccessById(s.id);
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          disabled={isLocked}
                          className={[
                            "w-full text-left text-xs px-2 py-1.5 rounded-md",
                            isActive ? "bg-[color:var(--color-light)]" : "hover:bg-[color:var(--color-light)]/70",
                            isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                          ].join(" ")}
                          onClick={() => trySelectSlide(s)}
                          onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !isLocked) trySelectSlide(s); }}
                          aria-disabled={isLocked}
                        >
                          {isDone ? "✅ " : (isLocked ? "🔒 " : "")}{s.title}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {chapters.length === 0 && <div className="text-sm text-muted">No content yet.</div>}
          </div>
        </aside>

        {/* Main */}
        <main className="rounded-2xl bg-white border border-light p-4">
          {activeSlide ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="text-base md:text-lg font-semibold">{activeSlide.title}</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { if (canGoPrev) setActiveSlide(orderedSlides[activeIndex - 1]); }}
                    disabled={!canGoPrev}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${canGoPrev ? "hover:bg-[color:var(--color-light)]/70" : "opacity-50 cursor-not-allowed"}`}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (canGoNext) setActiveSlide(orderedSlides[activeIndex + 1]);
                      else setNotice("Complete this slide or the chapter quiz first.");
                    }}
                    disabled={!canGoNext}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${canGoNext ? "hover:bg-[color:var(--color-light)]/70" : "opacity-50 cursor-not-allowed"}`}
                  >
                    Next
                  </button>
                </div>
              </div>

              {renderMedia(activeSlide)}

              {(activeSlide.body ?? activeSlide.content) && (
                <div className="prose max-w-none mt-4 text-sm whitespace-pre-wrap">
                  {activeSlide.body ?? activeSlide.content}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => markDone(activeSlide)}
                  className="rounded-lg bg-brand text-white px-4 py-2 font-semibold hover:opacity-90"
                >
                  Mark as Done
                </button>

                {/* chapter-quiz CTA:
                    show on last slide of chapter, after that slide is done, quiz exists, and not yet completed */}
                {isLastSlideOfChapter &&
                  completed.includes(activeSlide.id) &&
                  quizExistsForActiveChapter &&
                  !quizDoneForActiveChapter && (
                  <button
                    type="button"
                    onClick={() => beginQuiz(activeSlide.chapter_id)}
                    className="rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)] hover:bg-[color:var(--color-light)]/50"
                  >
                    Take Chapter Quiz
                  </button>
                )}

                {/* show a tiny badge if quiz has been done */}
                {isLastSlideOfChapter && quizExistsForActiveChapter && quizDoneForActiveChapter && (
                  <span className="inline-flex items-center text-xs px-2 py-1 rounded-lg bg-green-100 text-green-800">
                    Chapter quiz completed
                  </span>
                )}
              </div>

              {!!notice && (
                <div role="status" aria-live="polite" className="mt-3 text-xs md:text-sm text-[#0a1156]">
                  {notice}
                </div>
              )}
            </>
          ) : (
            <div className="text-muted">Select a slide to begin.</div>
          )}
        </main>
      </div>

      {/* Quiz Modal */}
      {quizOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setQuizOpen(false)} />
          {/* card */}
          <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white border border-light p-5 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold">Chapter Quiz</div>
              <div className="text-sm font-medium">
                Time left:{" "}
                <span className={quizTimeLeft <= 10 ? "text-red-600" : ""}>
                  {Math.floor(quizTimeLeft / 60)}:{String(quizTimeLeft % 60).padStart(2, "0")}
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              {quizItems.map((q, idx) => (
                <div key={q.id} className="rounded-lg p-3 ring-1 ring-[color:var(--color-light)]">
                  <div className="font-medium text-sm">{idx + 1}. {q.question}</div>
                  <div className="mt-2 grid gap-2">
                    {q.options.map((opt, i) => {
                      const name = `q_${q.id}`;
                      const checked = quizAnswers[q.id] === i;
                      return (
                        <label key={i} className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name={name}
                            checked={checked}
                            onChange={() => setQuizAnswers(a => ({ ...a, [q.id]: i }))}
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuizOpen(false)}
                className="rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => submitQuiz(false)}
                className="rounded-lg bg-brand text-white px-4 py-2 font-semibold hover:opacity-90"
              >
                Submit Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
