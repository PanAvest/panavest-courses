"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ProgressBar from "@/components/ProgressBar";

/** Types for anti-copy/auto-end guards on window */
type ExamGuards = {
  onCopy: (e: ClipboardEvent) => void;
  onContext: (e: MouseEvent) => void;
  onKey: (e: KeyboardEvent) => void;
  onBeforeUnload: (e: BeforeUnloadEvent) => void;
  onVisibility: () => void;
};

declare global {
  interface Window {
    __pv_exam_guards__?: ExamGuards;
  }
}


/** ──────────────────────────────────────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────────────────────────────────────── */
type Course = { id: string; slug: string; title: string; img: string | null };

type Chapter = {
  id: string;
  title: string;
  order_index: number;
  intro_video_url: string | null;
};

type Slide = {
  id: string;
  chapter_id: string;
  title: string;
  order_index: number;
  intro_video_url: string | null;
  asset_url: string | null;
  body: string | null;
  // legacy fields support
  video_url?: string | null;
  content?: string | null;
};

// Per-chapter quizzes (unchanged from your build)
type QuizQuestion = {
  id: string;
  chapter_id: string;
  question: string;
  options: string[];
  correct_index: number;
};

type QuizSetting = {
  chapter_id: string;
  time_limit_seconds: number | null;
  num_questions: number | null;
};

// Final exam (course-wide)
type Exam = {
  id: string;
  course_id: string;
  title: string;
  pass_mark: number | null;
  time_limit_minutes?: number | null; // optional
};

type ExamQuestion = {
  id: string;
  exam_id: string;
  prompt: string;
  options: string[];
  correct_index: number;
};

type Attempt = {
  id: string;
  user_id: string;
  exam_id: string;
  score: number;
  passed: boolean;
  created_at: string;
  meta?: Record<string, unknown>;
};

/** ──────────────────────────────────────────────────────────────────────────────
 * Utilities
 * ───────────────────────────────────────────────────────────────────────────── */
function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function secondsToClock(s: number) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, "0")}`;
}

/** ──────────────────────────────────────────────────────────────────────────────
 * Page
 * ───────────────────────────────────────────────────────────────────────────── */
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

  // Per-chapter quiz state (existing)
  const [quizByChapter, setQuizByChapter] = useState<Record<string, QuizQuestion[]>>({});
  const [quizSettings, setQuizSettings] = useState<Record<string, QuizSetting>>({});
  const [completedQuizzes, setCompletedQuizzes] = useState<string[]>([]);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizChapterId, setQuizChapterId] = useState<string | null>(null);
  const [quizItems, setQuizItems] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number | null>>({});
  const [quizTimeLeft, setQuizTimeLeft] = useState<number>(0);
  const quizTickRef = useRef<number | null>(null);

  // Final exam state (NEW)
  const [finalExam, setFinalExam] = useState<Exam | null>(null);
  const [finalExamQuestions, setFinalExamQuestions] = useState<ExamQuestion[]>([]);
  const [finalExamOpen, setFinalExamOpen] = useState(false);
  const [finalAnswers, setFinalAnswers] = useState<Record<string, number | null>>({});
  const [finalTimeLeft, setFinalTimeLeft] = useState<number>(0);
  const finalTickRef = useRef<number | null>(null);
  const [finalAttemptExists, setFinalAttemptExists] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // copy/cheat prevention refs
  const blockHandlersBound = useRef<boolean>(false);

  // set "first slide" only once on initial load
  const initializedRef = useRef(false);

  /** ── Auth ───────────────────────────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/sign-in"); return; }
      setUserId(user.id);
      setUserEmail(user.email ?? "");
    })();
  }, [router]);

  /** ── Load course, content, quizzes, progress, and exam ──────────────────── */
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

      // paywall
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

      // chapters
      const { data: ch } = await supabase
        .from("course_chapters")
        .select("id,title,order_index,intro_video_url")
        .eq("course_id", c.id)
        .order("order_index", { ascending: true });
      setChapters(ch ?? []);
      const chapterIds = (ch ?? []).map(x => x.id);

      // slides
      let sl: Slide[] = [];
      if (chapterIds.length > 0) {
        const { data: slData } = await supabase
          .from("course_slides")
          .select("id,chapter_id,title,order_index,intro_video_url,asset_url,body,video_url,content")
          .in("chapter_id", chapterIds)
          .order("order_index", { ascending: true });
        sl = slData ?? [];
      }

      // sort slides by chapter.order_index then slide.order_index
      const chOrder: Record<string, number> = {};
      (ch ?? []).forEach(chp => { chOrder[chp.id] = chp.order_index ?? 0; });
      const slSorted = [...sl].sort((a, b) => {
        const ca = chOrder[a.chapter_id] ?? 0;
        const cb = chOrder[b.chapter_id] ?? 0;
        if (ca !== cb) return ca - cb;
        return (a.order_index ?? 0) - (b.order_index ?? 0);
      });
      setSlides(slSorted);
      if (!initializedRef.current) {
        setActiveSlide(slSorted[0] ?? null);
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

      // per-chapter questions & settings
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
      try {
        const { data: qprog } = await supabase
          .from("user_chapter_quiz")
          .select("chapter_id")
          .eq("user_id", userId)
          .eq("course_id", c.id);
        setCompletedQuizzes(Array.from(new Set((qprog ?? []).map(r => r.chapter_id))));
      } catch {}

      // FINAL EXAM (get first exam for course)
      try {
        const { data: ex } = await supabase
          .from("exams")
          .select("id,course_id,title,pass_mark,time_limit_minutes")
          .eq("course_id", c.id)
          .limit(1)
          .maybeSingle();
        if (ex) {
          setFinalExam(ex);

          // attempt check (only one allowed unless penalty flow is implemented)
          const { data: atts } = await supabase
            .from("attempts")
            .select("id")
            .eq("user_id", userId)
            .eq("exam_id", ex.id)
            .limit(1);
          setFinalAttemptExists((atts ?? []).length > 0);

          // questions
          const { data: qs } = await supabase
            .from("questions")
            .select("id,exam_id,prompt,options,correct_index")
            .eq("exam_id", ex.id);
          setFinalExamQuestions(
            (qs ?? []).map(q => ({ ...q, options: Array.isArray(q.options) ? q.options : [] }))
          );
        } else {
          setFinalExam(null);
          setFinalExamQuestions([]);
          setFinalAttemptExists(false);
        }
      } catch {}

      setLoading(false);
    })();
  }, [userId, slug, router]);

  /** ── Derived ordering ───────────────────────────────────────────────────── */
  const orderedSlides = useMemo(() => slides, [slides]);
  const orderedIds = useMemo(() => orderedSlides.map(s => s.id), [orderedSlides]);

  const slidesByChapter = useMemo(() => {
    const map: Record<string, Slide[]> = {};
    for (const s of orderedSlides) (map[s.chapter_id] ||= []).push(s);
    return map;
  }, [orderedSlides]);

  const chapterOrder = useMemo(() => {
    return [...chapters].sort((a,b)=> (a.order_index??0)-(b.order_index??0)).map(c=>c.id);
  }, [chapters]);

  const chapterLastSlideIndex: Record<string, number> = useMemo(() => {
    const idx: Record<string, number> = {};
    orderedSlides.forEach((s, i) => { idx[s.chapter_id] = i; });
    return idx;
  }, [orderedSlides]);

  // locking: index of first incomplete slide
  const firstIncompleteIndex = useMemo(() => {
    for (let i = 0; i < orderedIds.length; i++) {
      if (!completed.includes(orderedIds[i])) return i;
    }
    return orderedIds.length - 1; // if all complete
  }, [orderedIds, completed]);

  // extra lock if a chapter's slides done but its quiz not done
  const boundaryLockedIndex = useMemo(() => {
    for (let i = 0; i < chapterOrder.length; i++) {
      const chId = chapterOrder[i];
      const slidesInCh = slidesByChapter[chId] ?? [];
      if (slidesInCh.length === 0) continue;
      const allDone = slidesInCh.every(s => completed.includes(s.id));
      const quizDone = completedQuizzes.includes(chId);
      if (allDone && !quizDone) {
        return chapterLastSlideIndex[chId] ?? firstIncompleteIndex;
      }
    }
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

  /** ── Slide actions ─────────────────────────────────────────────────────── */
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

      // auto-advance (respect gating)
      const idx = orderedIds.indexOf(slide.id);
      if (idx > -1 && idx + 1 < orderedIds.length) {
        const next = orderedSlides[idx + 1];
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

  /** ── Per-chapter quiz (existing) ───────────────────────────────────────── */
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

  useEffect(() => {
    if (!quizOpen) return;
    if (quizTickRef.current) window.clearInterval(quizTickRef.current);
    quizTickRef.current = window.setInterval(() => {
      setQuizTimeLeft(t => {
        if (t <= 1) {
          window.clearInterval(quizTickRef.current!);
          quizTickRef.current = null;
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
  }, [quizOpen]);

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

    try {
      await supabase.from("user_chapter_quiz").insert({
        user_id: userId,
        course_id: course!.id,
        chapter_id: quizChapterId,
        total_count: total,
        correct_count: correctCount,
        score_pct: scorePct,
        completed_at: new Date().toISOString(),
        meta: { autoSubmit: auto },
      });
      setCompletedQuizzes(prev => (prev.includes(quizChapterId) ? prev : [...prev, quizChapterId]));
    } catch {}

    setQuizOpen(false);
    setQuizChapterId(null);
    setQuizItems([]);
    setQuizAnswers({});
    setQuizTimeLeft(0);
    setNotice(`Quiz submitted. Score: ${correctCount}/${total} (${scorePct}%).`);
    setTimeout(() => setNotice(""), 2500);
  }

  /** ── Final exam availability & rules ───────────────────────────────────── */
  const allSlidesDone = useMemo(() => {
    if (orderedIds.length === 0) return false;
    return orderedIds.every(id => completed.includes(id));
  }, [orderedIds, completed]);

  const allChapterQuizzesDone = useMemo(() => {
    // if a chapter has a quiz pool, it must be completed
    return chapters.every(ch => {
      const hasQuiz = (quizByChapter[ch.id]?.length ?? 0) > 0;
      return !hasQuiz || completedQuizzes.includes(ch.id);
    });
  }, [chapters, quizByChapter, completedQuizzes]);

  const canTakeFinal = allSlidesDone && allChapterQuizzesDone && !!finalExam && !!finalExamQuestions.length;

  // Connectivity monitoring
  useEffect(() => {
    const onlineHandler = () => setIsOnline(true);
    const offlineHandler = () => setIsOnline(false);
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, []);

  function bindNoCopyNoLeaveGuards(enable: boolean) {
    if (enable && !blockHandlersBound.current) {
      blockHandlersBound.current = true;

      // Prevent copy/select/context menu
      const onCopy = (e: ClipboardEvent) => e.preventDefault();
      const onContext = (e: MouseEvent) => e.preventDefault();
      const onKey = (e: KeyboardEvent) => {
        // common copy/inspect/print combos
        if ((e.ctrlKey || e.metaKey) && ["c","x","p","s","u"].includes(e.key.toLowerCase())) {
          e.preventDefault();
        }
        // Disable PrintScreen (best-effort, cannot fully block screenshots)
        if (e.key === "PrintScreen") e.preventDefault();
      };
      const onBeforeUnload = (e: BeforeUnloadEvent) => {
        // Auto-end the exam on close/refresh
        void submitFinalExam(true);
        // Show native prompt
        e.preventDefault();
        e.returnValue = "";
      };
      const onVisibility = () => {
        if (document.visibilityState === "hidden") {
          // End exam if user hides/leaves tab (spec requirement)
          void submitFinalExam(true);
        }
      };

      document.addEventListener("copy", onCopy);
      document.addEventListener("contextmenu", onContext);
      document.addEventListener("keydown", onKey);
      window.addEventListener("beforeunload", onBeforeUnload);
      document.addEventListener("visibilitychange", onVisibility);

      // store to window so we can remove later
      window.__pv_exam_guards__ = { onCopy, onContext, onKey, onBeforeUnload, onVisibility };
    }
    if (!enable && blockHandlersBound.current) {
      blockHandlersBound.current = false;
      const g = window.__pv_exam_guards__;
      if (g) {
        document.removeEventListener("copy", g.onCopy);
        document.removeEventListener("contextmenu", g.onContext);
        document.removeEventListener("keydown", g.onKey);
        window.removeEventListener("beforeunload", g.onBeforeUnload);
        document.removeEventListener("visibilitychange", g.onVisibility);
        window.__pv_exam_guards__ = undefined;
      }
    }
  }

  function beginFinalExam() {
    if (!finalExam || finalExamQuestions.length === 0) {
      setNotice("Final exam is not set yet.");
      setTimeout(() => setNotice(""), 1800);
      return;
    }
    if (!navigator.onLine) {
      setNotice("You are offline. Please reconnect to a stable internet connection before starting.");
      setTimeout(() => setNotice(""), 2000);
      return;
    }
    if (finalAttemptExists) {
      setNotice("You have already taken the final exam. Contact admin to pay the penalty to unlock a retry.");
      setTimeout(() => setNotice(""), 2500);
      return;
    }

    // Shuffle questions and init answers
    const randomized = shuffle(finalExamQuestions);
    const answers: Record<string, number | null> = {};
    randomized.forEach(q => { answers[q.id] = null; });
    setFinalAnswers(answers);

    const limitMinutes = Math.max(1, Number(finalExam.time_limit_minutes ?? 30));
    setFinalTimeLeft(limitMinutes * 60);
    setFinalExamOpen(true);
  }

  // Final exam timer + guards
  useEffect(() => {
    if (!finalExamOpen) return;
    // time
    if (finalTickRef.current) window.clearInterval(finalTickRef.current);
    finalTickRef.current = window.setInterval(() => {
      setFinalTimeLeft(t => {
        if (t <= 1) {
          window.clearInterval(finalTickRef.current!);
          finalTickRef.current = null;
          void submitFinalExam(true);
          return 0;
        }
        // soft warning banner can be derived from this value in UI
        return t - 1;
      });
    }, 1000) as unknown as number;

    // guards
    bindNoCopyNoLeaveGuards(true);

    return () => {
      if (finalTickRef.current) {
        window.clearInterval(finalTickRef.current);
        finalTickRef.current = null;
      }
      bindNoCopyNoLeaveGuards(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalExamOpen]);

  async function submitFinalExam(auto = false) {
    if (!finalExamOpen || !finalExam || !userId) return;

    const answered = finalExamQuestions.map(q => ({
      id: q.id,
      chosen: finalAnswers[q.id],
      correct: q.correct_index,
    }));

    const total = finalExamQuestions.length;
    const correctCount = answered.reduce((acc, a) => acc + (a.chosen === a.correct ? 1 : 0), 0);
    const scorePct = Math.round((correctCount / Math.max(1, total)) * 100);
    const passMark = Number(finalExam.pass_mark ?? 0);
    const passed = scorePct >= passMark;

    try {
      await supabase.from("attempts").insert({
        user_id: userId,
        exam_id: finalExam.id,
        score: scorePct,
        passed,
        created_at: new Date().toISOString(),
        meta: { autoSubmit: auto, total, correctCount },
      });
      setFinalAttemptExists(true);
    } catch {}

    setFinalExamOpen(false);
    setFinalTimeLeft(0);
    setFinalAnswers({});
    setNotice(`Final exam submitted. Score: ${correctCount}/${total} (${scorePct}%).`);
    setTimeout(() => setNotice(""), 3000);
  }

  /** ── UI helpers ────────────────────────────────────────────────────────── */
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

  /** ── Render ────────────────────────────────────────────────────────────── */
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

      {/* Pre-exam checklist banner */}
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs md:text-sm">
        <div className="font-semibold mb-1">Before starting any test:</div>
        <ul className="list-disc pl-5 grid gap-1">
          <li>Use a stable internet connection (ethernet or strong Wi-Fi). {isOnline ? "✅ Online" : "⚠️ Offline"}</li>
          <li>Close other heavy apps/tabs. Disable VPN if it causes drops.</li>
          <li>Once you start, you <b>cannot pause</b>. The timer keeps running.</li>
          <li>Do not switch/close the tab or window—your test will automatically end.</li>
          <li>Copying/printing is disabled during the test.</li>
        </ul>
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

          {/* Final Exam CTA block */}
          <div className="mt-6 p-3 rounded-xl border"
               aria-live="polite">
            <div className="text-sm font-semibold mb-1">Final Exam</div>
            {!finalExam && <div className="text-xs text-muted">Not available for this course yet.</div>}
            {finalExam && !finalExamQuestions.length && (
              <div className="text-xs text-muted">Questions not set yet.</div>
            )}
            {finalExam && finalExamQuestions.length > 0 && (
              <>
                <div className="text-xs text-muted mb-2">
                  {finalAttemptExists
                    ? "Attempt used. Contact admin to pay penalty to unlock a retry."
                    : (canTakeFinal
                        ? "All slides and quizzes completed. You can start the final exam."
                        : "Complete all slides and required chapter quizzes to unlock the final exam.")}
                </div>
                <button
                  type="button"
                  disabled={!canTakeFinal || finalAttemptExists}
                  onClick={beginFinalExam}
                  className={[
                    "w-full rounded-lg px-3 py-2 text-sm",
                    (!canTakeFinal || finalAttemptExists)
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-[color:#0a1156] text-white hover:opacity-90"
                  ].join(" ")}
                >
                  {finalAttemptExists ? "Final Exam Locked" : "Start Final Exam"}
                </button>
              </>
            )}
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
                  className="rounded-lg bg-[color:#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90"
                >
                  Mark as Done
                </button>

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

      {/* Chapter Quiz Modal (unchanged apart from styling) */}
      {quizOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          <div className="absolute inset-0 bg-black/40" onClick={() => setQuizOpen(false)} />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white border border-light p-5 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold">Chapter Quiz</div>
              <div className="text-sm font-medium">
                Time left:{" "}
                <span className={quizTimeLeft <= 10 ? "text-red-600" : ""}>
                  {secondsToClock(quizTimeLeft)}
                </span>
              </div>
            </div>

            <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
              Once you start, you cannot pause. Do not close this tab. Copying is disabled.
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
                className="rounded-lg bg-[color:#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90"
              >
                Submit Quiz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Exam Modal (NEW) */}
      {finalExamOpen && finalExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/50" />

          {/* card */}
          <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-white border border-light p-5 max-h-[92vh] overflow-auto">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold">{finalExam.title || "Final Exam"}</div>
              <div className="text-sm font-medium">
                Time left:{" "}
                <span className={finalTimeLeft <= 60 ? "text-red-600" : ""}>
                  {secondsToClock(finalTimeLeft)}
                </span>
              </div>
            </div>

            {/* Warnings */}
            <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
              <ul className="list-disc pl-5 grid gap-1">
                <li>Starting the exam begins the timer. You cannot pause.</li>
                <li>Do not close or switch this tab. Doing so will auto-end the exam.</li>
                <li>Copying/printing is disabled during the exam.</li>
                <li>One attempt only. To retry, you must pay the penalty via admin.</li>
              </ul>
            </div>

            {/* Questions */}
            <div className="mt-4 grid gap-4">
              {finalExamQuestions.map((q, idx) => (
                <div key={q.id} className="rounded-lg p-3 ring-1 ring-[color:var(--color-light)]">
                  <div className="font-medium text-sm">{idx + 1}. {q.prompt}</div>
                  <div className="mt-2 grid gap-2">
                    {q.options.map((opt, i) => {
                      const name = `f_${q.id}`;
                      const checked = finalAnswers[q.id] === i;
                      return (
                        <label key={i} className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name={name}
                            checked={checked}
                            onChange={() => setFinalAnswers(a => ({ ...a, [q.id]: i }))}
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Internet state */}
            {!isOnline && (
              <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
                You are offline. Stay online to ensure your answers are saved.
              </div>
            )}

            {/* Actions */}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => submitFinalExam(false)}
                className="rounded-lg bg-[color:#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90"
              >
                Submit Final Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
