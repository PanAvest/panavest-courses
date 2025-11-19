// app/knowledge/[slug]/dashboard/page.tsx
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { flushSync } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ProgressBar from "@/components/ProgressBar";

/** Types */
type Course = { id: string; slug: string; title: string; img: string | null };
type Chapter = { id: string; title: string; order_index: number; intro_video_url: string | null };

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

/** Final Exam entities (course-wide) */
type Exam = {
  id: string;
  course_id: string;
  title: string | null;
  pass_mark: number | null;
  time_limit_minutes: number | null;
};

type ExamQuestion = {
  id: string;
  exam_id: string;
  prompt: string;
  options: string[];
  correct_index: number;
};

type ChapterQuizScore = {
  chapterId: string;
  chapterTitle: string;
  scorePct: number | null;
  correctCount: number | null;
  totalCount: number | null;
  completedAt: string | null;
};

/** Types for anti-copy/auto-end guards on window */
type ExamGuards = {
  onCopy: (e: ClipboardEvent) => void;
  onContext: (e: MouseEvent) => void;
  onKey: (e: KeyboardEvent) => void;
  onBeforeUnload: (e: BeforeUnloadEvent) => void;
  onVisibility: () => void;
};

type CertificateNotice = {
  type: "success" | "error" | "info";
  message: string;
};

declare global {
  interface Window {
    __pv_exam_guards__?: ExamGuards;
  }
}

/** Utils */
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

/** Local progress key helper (scoped per-user per-course) */
const progressKey = (userId: string, courseId: string) => `pv.progress.${userId}.${courseId}`;

function VideoPlayer({
  src,
  poster,
  className = "",
  rounded = "rounded-lg",
}: {
  src: string;
  poster?: string | null;
  className?: string;
  rounded?: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Safari sometimes renders a black frame until you “nudge” currentTime.
  const onLoadedMetadata = () => {
    try {
      if (!ref.current) return;
      // Nudge a tiny offset to force first frame render on some webkits
      if (ref.current.currentTime === 0) {
        ref.current.currentTime = 0.001;
      }
    } catch {
      /* ignore */
    }
  };

  const onError = () => {
    setError(
      "The video couldn't load here. Please open it in a new tab using the link below."
    );
  };

  return (
    <div className={`w-full ${rounded} overflow-hidden`}>
      {/* Fixed aspect so it never gets “cut”, and object-contain preserves the full frame */}
      <div className="relative w-full aspect-video bg-black">
        {!error ? (
          <video
            ref={ref}
            className={`absolute inset-0 h-full w-full object-contain ${className}`}
            // Inline playback + best compatibility
            playsInline
            // We don't autoplay; metadata ensures a fast first frame and duration
            preload="metadata"
            // Normal controls; hide download menu on most browsers
            controls
            controlsList="nodownload"
            // Cross-origin allows range requests/thumbnails on some hosts
            crossOrigin="anonymous"
            // Helpful on iOS/Safari
            muted={false}
            poster={poster ?? undefined}
            src={src}
            onLoadedMetadata={onLoadedMetadata}
            onError={onError}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-center text-xs md:text-sm text-white/90">
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Fallback open-in-new-tab */}
      {error && (
        <div className="mt-2 text-xs">
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="underline break-all"
          >
            Open the video in a new tab
          </a>
        </div>
      )}
    </div>
  );
}


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
  const [chapterScores, setChapterScores] = useState<ChapterQuizScore[]>([]);

  // quiz UI state
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizChapterId, setQuizChapterId] = useState<string | null>(null);
  const [quizItems, setQuizItems] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number | null>>({});
  const [quizTimeLeft, setQuizTimeLeft] = useState<number>(0);
  const quizTickRef = useRef<number | null>(null);

  // final exam
  const [finalExam, setFinalExam] = useState<Exam | null>(null);
  const [finalExamQuestions, setFinalExamQuestions] = useState<ExamQuestion[]>([]);
  const [finalExamOpen, setFinalExamOpen] = useState(false);
  const [finalAnswers, setFinalAnswers] = useState<Record<string, number | null>>({});
  const [finalTimeLeft, setFinalTimeLeft] = useState<number>(0);
  const finalTickRef = useRef<number | null>(null);
  const [finalAttemptExists, setFinalAttemptExists] = useState<boolean>(false);

  // preflight confirm
  const [startConfirmOpen, setStartConfirmOpen] = useState(false);
  const [startConfirmChecked, setStartConfirmChecked] = useState(false);

  // results modal
  const [resultOpen, setResultOpen] = useState(false);
  const [finalResult, setFinalResult] = useState<{ scorePct: number; correct: number; total: number; passed: boolean } | null>(null);
  const [certificateNotice, setCertificateNotice] = useState<CertificateNotice | null>(null);

  // misc
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const blockHandlersBound = useRef<boolean>(false);
  const initializedRef = useRef(false);

  /** Auth */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/sign-in"); return; }
      setUserId(user.id);
      setUserEmail(user.email ?? "");
    })();
  }, [router]);

  /** Load data (includes robust slide progress merge) */
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

      // 🔒 STRICT PAYWALL: must have an enrollment row with paid === true
      const { data: enr, error: enrErr } = await supabase
        .from("enrollments")
        .select("paid")
        .eq("user_id", userId)
        .eq("course_id", c.id)
        .maybeSingle();

      if (enrErr || !enr || enr.paid !== true) {
        router.replace(`/knowledge/${c.slug}/enroll`);
        return; // stop here; don't load content
      }

      // chapters (ordered)
      const { data: ch } = await supabase
        .from("course_chapters")
        .select("id,title,order_index,intro_video_url")
        .eq("course_id", c.id)
        .order("order_index", { ascending: true });

      setChapters(ch ?? []);
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

      setSlides(slSorted);
      if (!initializedRef.current) {
        setActiveSlide(slSorted[0] ?? null); // always first slide initially
        initializedRef.current = true;
      }

      // ✅ slide progress: merge server + localStorage; keep local in sync
      try {
        const { data: prog, error: progErr } = await supabase
          .from("user_slide_progress")
          .select("slide_id")
          .eq("user_id", userId)
          .eq("course_id", c.id);

        if (progErr) {
          // server failed → fallback to local only
          const fromLocal = JSON.parse(localStorage.getItem(progressKey(userId, c.id)) ?? "[]") as string[];
          setCompleted(fromLocal);
        } else {
          const fromServer = (prog ?? []).map((p: { slide_id: string }) => p.slide_id);
          const fromLocal = JSON.parse(localStorage.getItem(progressKey(userId, c.id)) ?? "[]") as string[];
          const merged = Array.from(new Set([...fromServer, ...fromLocal]));
          setCompleted(merged);
          localStorage.setItem(progressKey(userId, c.id), JSON.stringify(merged));
        }
      } catch {
        const fromLocal = JSON.parse(localStorage.getItem(progressKey(userId, c.id)) ?? "[]") as string[];
        setCompleted(fromLocal);
      }

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

      // quiz completion + scores (per user per chapter)
      try {
        const { data: qprog } = await supabase
          .from("user_chapter_quiz")
          .select("chapter_id, score_pct, total_count, correct_count, completed_at")
          .eq("user_id", userId)
          .eq("course_id", c.id)
          .order("completed_at", { ascending: false });

        const latestByChapter: Record<string, { score_pct: number | null; total_count: number | null; correct_count: number | null; completed_at: string | null }> = {};
        const completedSet = new Set<string>();
        (qprog ?? []).forEach(r => {
          if (!latestByChapter[r.chapter_id]) {
            latestByChapter[r.chapter_id] = {
              score_pct: r.score_pct ?? null,
              total_count: r.total_count ?? null,
              correct_count: r.correct_count ?? null,
              completed_at: r.completed_at ?? null,
            };
          }
          completedSet.add(r.chapter_id);
        });
        setCompletedQuizzes(Array.from(completedSet));

        const rows: ChapterQuizScore[] = Object.entries(latestByChapter).map(([chapterId, v]) => ({
          chapterId,
          chapterTitle: (ch ?? []).find(cc => cc.id === chapterId)?.title ?? "Chapter",
          scorePct: v.score_pct,
          totalCount: v.total_count,
          correctCount: v.correct_count,
          completedAt: v.completed_at,
        }));
        setChapterScores(rows);
      } catch {}

      // FINAL EXAM (get first exam for course + questions + attempt)
      try {
        const { data: ex } = await supabase
          .from("exams")
          .select("id,course_id,title,pass_mark,time_limit_minutes")
          .eq("course_id", c.id)
          .limit(1)
          .maybeSingle();
        if (ex) {
          setFinalExam(ex);

          // check if user has already attempted
          const { data: atts } = await supabase
            .from("attempts")
            .select("id")
            .eq("user_id", userId)
            .eq("exam_id", ex.id)
            .limit(1);
          setFinalAttemptExists((atts ?? []).length > 0);

          // load questions
          const { data: qs2 } = await supabase
            .from("questions")
            .select("id,exam_id,prompt,options,correct_index")
            .eq("exam_id", ex.id);
          setFinalExamQuestions(
            (qs2 ?? []).map(q => ({ ...q, options: Array.isArray(q.options) ? q.options : [] }))
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

  /** Ordered lists derived from state */
  const orderedSlides = useMemo(() => slides, [slides]);
  const orderedIds = useMemo(() => orderedSlides.map(s => s.id), [orderedSlides]);

  const slidesByChapter = useMemo(() => {
    const map: Record<string, Slide[]> = {};
    for (const s of orderedSlides) (map[s.chapter_id] ||= []).push(s);
    return map;
  }, [orderedSlides]);

  const chapterOrder = useMemo(() => {
    const order: string[] = [...chapters].sort((a,b)=> (a.order_index??0)-(b.order_index??0)).map(c=>c.id);
    return order;
  }, [chapters]);

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
    return Math.max(0, orderedIds.length - 1); // all slides done
  }, [orderedIds, completed]);

  // extra lock at chapter boundaries
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
    return Math.max(0, orderedIds.length - 1);
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

  /** Mark slide as done — UPSERT + local mirror */
  async function markDone(slide: Slide | null) {
    if (!slide || !userId || !course) return;
    try {
      const { error } = await supabase
        .from("user_slide_progress")
        .upsert(
          {
            user_id: userId,
            course_id: course.id,
            slide_id: slide.id,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "user_id,course_id,slide_id" }
        )
        .select("slide_id")
        .single();

      if (error) {
        setNotice(`Could not save progress: ${error.message}`);
        setTimeout(() => setNotice(""), 2500);
        return;
      }

      flushSync(() => {
        setCompleted(prev => (prev.includes(slide.id) ? prev : [...prev, slide.id]));
      });

      // persist locally as well (defensive)
      const key = progressKey(userId, course.id);
      const existing = JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
      const merged = Array.from(new Set([...existing, slide.id]));
      localStorage.setItem(key, JSON.stringify(merged));

      setNotice("Marked as done ✓");

      // Re-check access and move if allowed
      const idx = orderedIds.indexOf(slide.id);
      if (idx > -1 && idx + 1 < orderedIds.length) {
        const next = orderedSlides[idx + 1];
        if (canAccessById(next.id)) {
          setActiveSlide(next);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }

      setTimeout(() => setNotice(""), 1500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setNotice(`Save failed. ${msg}`.trim());
      setTimeout(() => setNotice(""), 2500);
    }
  }

  /** Chapter quiz */
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

  // Quiz timer
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        course_id: course.id,
        chapter_id: quizChapterId,
        total_count: total,
        correct_count: correctCount,
        score_pct: scorePct,
        completed_at: new Date().toISOString(),
        meta: { autoSubmit: auto } as Record<string, unknown>,
      });
      setCompletedQuizzes(prev => (prev.includes(quizChapterId) ? prev : [...prev, quizChapterId]));
      // refresh chapter score table
      setChapterScores(prev => {
        const title = chapters.find(ch => ch.id === quizChapterId)?.title ?? "Chapter";
        const existing = prev.find(p => p.chapterId === quizChapterId);
        const row: ChapterQuizScore = {
          chapterId: quizChapterId!,
          chapterTitle: title,
          scorePct,
          totalCount: total,
          correctCount,
          completedAt: new Date().toISOString(),
        };
        if (!existing) return [...prev, row];
        return prev.map(p => (p.chapterId === quizChapterId ? row : p));
      });
    } catch {}

    setQuizOpen(false);
    setQuizChapterId(null);
    setQuizItems([]);
    setQuizAnswers({});
    setQuizTimeLeft(0);
    setNotice(`Quiz submitted. Score: ${correctCount}/${total} (${scorePct}%).`);
    setTimeout(() => setNotice(""), 2500);
  }

  /** Final exam gating */
  const allSlidesDone = useMemo(() => {
    if (orderedIds.length === 0) return false;
    return orderedIds.every(id => completed.includes(id));
  }, [orderedIds, completed]);

  const allChapterQuizzesDone = useMemo(() => {
    return chapters.every(ch => {
      const hasQuiz = (quizByChapter[ch.id]?.length ?? 0) > 0;
      return !hasQuiz || completedQuizzes.includes(ch.id);
    });
  }, [chapters, quizByChapter, completedQuizzes]);

  const canTakeFinal = allSlidesDone && allChapterQuizzesDone && !!finalExam && !!finalExamQuestions.length;

  /** Connectivity monitoring */
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

  /** Exam guards */
  function bindNoCopyNoLeaveGuards(enable: boolean) {
    if (enable && !blockHandlersBound.current) {
      blockHandlersBound.current = true;

      const onCopy = (e: ClipboardEvent) => e.preventDefault();
      const onContext = (e: MouseEvent) => e.preventDefault();
      const onKey = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && ["c","x","p","s","u"].includes(e.key.toLowerCase())) {
          e.preventDefault();
        }
        if (e.key === "PrintScreen") e.preventDefault();
      };
      const onBeforeUnload = (e: BeforeUnloadEvent) => {
        void submitFinalExam(true);
        e.preventDefault();
        e.returnValue = "";
      };
      const onVisibility = () => {
        if (document.visibilityState === "hidden") {
          void submitFinalExam(true);
        }
      };

      document.addEventListener("copy", onCopy);
      document.addEventListener("contextmenu", onContext);
      document.addEventListener("keydown", onKey);
      window.addEventListener("beforeunload", onBeforeUnload);
      document.addEventListener("visibilitychange", onVisibility);

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

  /** Preflight confirm flow */
  function openFinalConfirm() {
    if (!finalExam || finalExamQuestions.length === 0) {
      setNotice("Final exam is not set yet.");
      setTimeout(() => setNotice(""), 1800);
      return;
    }
    if (!canTakeFinal) {
      setNotice("Complete all slides and chapter quizzes first.");
      setTimeout(() => setNotice(""), 1800);
      return;
    }
    if (finalAttemptExists) {
      setNotice("You have already taken the final exam. Contact admin to pay the penalty to unlock a retry.");
      setTimeout(() => setNotice(""), 2500);
      return;
    }
    setStartConfirmChecked(false);
    setStartConfirmOpen(true);
  }

  function beginFinalExam() {
    if (!navigator.onLine) {
      setNotice("You are offline. Please reconnect to a stable internet connection before starting.");
      setTimeout(() => setNotice(""), 2000);
      return;
    }
    const randomized = shuffle(finalExamQuestions);
    const answers: Record<string, number | null> = {};
    randomized.forEach(q => { answers[q.id] = null; });
    setFinalAnswers(answers);

    const limitMinutes = Math.max(1, Number(finalExam?.time_limit_minutes ?? 60));
    setFinalTimeLeft(limitMinutes * 60);
    setFinalExamOpen(true);
  }

  // Final exam timer + guards
  useEffect(() => {
    if (!finalExamOpen) return;

    if (finalTickRef.current) window.clearInterval(finalTickRef.current);
    finalTickRef.current = window.setInterval(() => {
      setFinalTimeLeft(t => {
        if (t <= 1) {
          window.clearInterval(finalTickRef.current!);
          finalTickRef.current = null;
          void submitFinalExam(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000) as unknown as number;

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
    setCertificateNotice(null);

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

    let attemptId: string | null = null;
    try {
      const res = await fetch(`/api/exams/${encodeURIComponent(finalExam.id)}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ score: scorePct, passed, total, correct: correctCount, autoSubmit: auto }),
      });
      if (res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { id?: string };
        attemptId = payload?.id ?? null;
        setFinalAttemptExists(true);
      } else {
        console.error("attempt insert failed", await res.text());
      }
    } catch (err) {
      console.error("attempt insert failed", err);
    }

    if (!attemptId) {
      try {
        const { data: fallbackRow } = await supabase
          .from("attempts")
          .select("id")
          .eq("user_id", userId)
          .eq("exam_id", finalExam.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        attemptId = fallbackRow?.id ?? null;
      } catch (err) {
        console.error("attempt fallback fetch failed", err);
      }
    }

    setFinalExamOpen(false);
    setFinalTimeLeft(0);
    setFinalAnswers({});
    setFinalResult({ scorePct, correct: correctCount, total, passed });
    setResultOpen(true);

    if (passed) {
      if (!attemptId) {
        setCertificateNotice({
          type: "error",
          message: "We recorded your pass but could not capture the attempt reference. Contact support to issue your certificate.",
        });
        return;
      }

      setCertificateNotice({ type: "info", message: "Issuing your certificate…" });
      try {
        const res = await fetch("/api/certificates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ course_id: finalExam.course_id, attempt_id: attemptId }),
        });
        if (res.ok) {
          setCertificateNotice({ type: "success", message: "Certificate issued! Visit your Dashboard to download it." });
        } else {
          const payload = await res.json().catch(() => ({}));
          if (payload?.error === "NAME_REQUIRED") {
            setCertificateNotice({ type: "error", message: "Add your full name on the Dashboard before we can issue your certificate." });
          } else if (payload?.error === "NOT_ELIGIBLE") {
            setCertificateNotice({ type: "error", message: "We could not verify the attempt. Please contact support." });
          } else {
            setCertificateNotice({ type: "error", message: "We could not issue the certificate automatically. You can retry from the Dashboard." });
          }
        }
      } catch (err) {
        console.error("certificate issue failed", err);
        setCertificateNotice({ type: "error", message: "We could not issue the certificate automatically. You can retry from the Dashboard." });
      }
    }
  }

  /** UI helpers */
  function renderMedia(s: Slide) {
  const video = s.video_url ?? s.intro_video_url ?? null;

  if (video) {
    return (
      <div className="mt-3 w-full">
        <VideoPlayer src={video} poster={null} />
      </div>
    );
  }

  if (s.asset_url) {
    const lower = s.asset_url.toLowerCase();
    const isImg = [".jpg", ".jpeg", ".png", ".gif", ".webp"].some((ext) =>
      lower.endsWith(ext)
    );
    if (isImg) {
      return (
        <div className="mt-3">
          <Image
            src={s.asset_url}
            alt="Slide asset"
            width={1600}
            height={900}
            className="rounded-lg ring-1 ring-[var(--color-light)] w-full h-auto object-contain"
            priority={false}
          />
        </div>
      );
    }
    return (
      <div className="mt-3 text-sm">
        <a
          className="underline break-all"
          href={s.asset_url}
          target="_blank"
          rel="noreferrer"
        >
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

  if (loading) return <div className="mx-auto max-w-screen-lg px-4 py-10">Loading…</div>;
  if (!course) return <div className="mx-auto max-w-screen-lg px-4 py-10">Not found.</div>;

  return (
    <div className="mx-auto max-w-screen-2xl px-4 md:px-6 py-6">
      {/* Header with Final Exam CTA beside title */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-xl md:text-2xl font-semibold">{course.title}</div>
          {finalExam && finalExamQuestions.length > 0 && (
            <>
              {!canTakeFinal && !finalAttemptExists && (
                <span className="text-[11px] md:text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                  Complete all slides & chapter quizzes to unlock Final Exam
                </span>
              )}
              {canTakeFinal && !finalAttemptExists && (
                <button
                  type="button"
                  onClick={openFinalConfirm}
                  className="rounded-lg bg-[color:#0a1156] text-white px-3 py-1.5 text-xs md:text-sm hover:opacity-90"
                  aria-label="Start Final Exam"
                  title={isOnline ? "Start Final Exam" : "You are offline"}
                >
                  Start Final Exam
                </button>
              )}
              {finalAttemptExists && (
                <span className="text-[11px] md:text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                  Final Exam completed
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs md:text-sm text-muted">
          {userEmail && <span className="truncate max-w-[40vw] md:max-w-none">{userEmail}</span>}
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

      {/* Pre-test checklist banner */}
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs md:text-sm">
        <div className="font-semibold mb-1">Before starting any test:</div>
        <ul className="list-disc pl-5 grid gap-1">
          <li>Use a stable internet connection (ethernet or strong Wi-Fi). {isOnline ? "✅ Online" : "⚠️ Offline"}</li>
          <li>Close other heavy apps/tabs; disable VPNs that cause drops.</li>
          <li>Once you start, you <b>cannot pause</b>. The timer runs continuously.</li>
          <li>Do not switch/close the tab — your test will automatically end.</li>
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
                            "w-full text-left text-sm md:text-xs px-3 md:px-2 py-2 md:py-1.5 rounded-md",
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
        <main className="rounded-2xl bg-white border border-light p-4 pb-24 md:pb-4">
          {activeSlide ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="text-base md:text-lg font-semibold">{activeSlide.title}</div>
                <div className="hidden sm:flex gap-2">
                  <button
                    type="button"
                    onClick={() => { if (canGoPrev) setActiveSlide(orderedSlides[activeIndex - 1]); }}
                    disabled={!canGoPrev}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${canGoPrev ? "hover:bg-[color:var(--color-light)]/70" : "opacity-50 cursor-not-allowed"}`}
                    aria-label="Previous slide"
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
                    aria-label="Next slide"
                  >
                    Next
                  </button>
                </div>
              </div>

              {renderMedia(activeSlide)}

              {(activeSlide.body ?? activeSlide.content) && (
                <div
                  className="prose max-w-none mt-4 text-[0.95rem] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: activeSlide.body ?? activeSlide.content ?? "" }}
                />
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => markDone(activeSlide)}
                  className="rounded-xl bg-[color:#0a1156] text-white px-5 py-2.5 font-semibold hover:opacity-90"
                >
                  Mark as Done
                </button>

                {/* chapter-quiz CTA */}
                {isLastSlideOfChapter &&
                  completed.includes(activeSlide.id) &&
                  quizExistsForActiveChapter &&
                  !quizDoneForActiveChapter && (
                  <button
                    type="button"
                    onClick={() => beginQuiz(activeSlide.chapter_id)}
                    className="rounded-xl px-5 py-2.5 ring-1 ring-[var(--color-light)] hover:bg-[color:var(--color-light)]/50"
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

      {/* Sticky mobile action bar */}
      {activeSlide && (
        <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-light">
          <div className="mx-auto max-w-screen-2xl px-4 py-2 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => { if (canGoPrev) setActiveSlide(orderedSlides[activeIndex - 1]); }}
              disabled={!canGoPrev}
              className={`rounded-lg border px-3 py-3 text-sm ${canGoPrev ? "active:scale-[0.98]" : "opacity-50 cursor-not-allowed"}`}
              aria-label="Previous slide"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => markDone(activeSlide)}
              className="rounded-lg bg-[color:#0a1156] text-white px-3 py-3 text-sm font-semibold active:scale-[0.98]"
              aria-label="Mark current slide as done"
            >
              Done
            </button>
            <button
              type="button"
              onClick={() => {
                if (canGoNext) setActiveSlide(orderedSlides[activeIndex + 1]);
                else setNotice("Complete this slide or the chapter quiz first.");
              }}
              disabled={!canGoNext}
              className={`rounded-lg border px-3 py-3 text-sm ${canGoNext ? "active:scale-[0.98]" : "opacity-50 cursor-not-allowed"}`}
              aria-label="Next slide"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Chapter Quiz Modal */}
      {quizOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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

            <div className="mt-4 grid gap-4">
              {quizItems.map((q, idx) => (
                <div key={q.id} className="rounded-lg p-3 ring-1 ring-[var(--color-light)]">
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
                className="rounded-lg px-4 py-2 ring-1 ring-[var(--color-light)]"
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

      {/* Final Exam Preflight Confirmation Modal */}
      {startConfirmOpen && finalExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setStartConfirmOpen(false)} />
          <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white border border-light p-5 max-h-[88vh] overflow-auto">
            <div className="text-lg font-semibold">Before you start the Final Exam</div>
            <div className="mt-3 text-xs md:text-sm">
              <ul className="list-disc pl-5 grid gap-1">
                <li>Use a stable internet connection. Status: {isOnline ? "✅ Online" : "⚠️ Offline"}</li>
                <li>Close other heavy apps/tabs and avoid VPNs that may drop.</li>
                <li>Once you start, you <b>cannot pause</b>. The timer runs continuously.</li>
                <li>Do <b>not</b> close or switch the tab; the exam will auto-end.</li>
                <li>Copying/printing is disabled during the exam.</li>
                <li>One attempt only. To retry, you must pay the penalty via admin.</li>
              </ul>
              <div className="mt-3 text-xs text-muted">
                Time limit: <b>{finalExam.time_limit_minutes ?? 60} minutes</b> • Pass mark: <b>{finalExam.pass_mark ?? 0}%</b>
              </div>
              <label className="mt-4 flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={startConfirmChecked}
                  onChange={(e) => setStartConfirmChecked(e.target.checked)}
                />
                <span>
                  I have read the rules and understand that if I close/switch the tab the exam will automatically end, and copying is disabled.
                </span>
              </label>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setStartConfirmOpen(false)}
                className="rounded-lg px-4 py-2 ring-1 ring-[var(--color-light)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!startConfirmChecked || !isOnline}
                onClick={() => { setStartConfirmOpen(false); beginFinalExam(); }}
                className={`rounded-lg px-4 py-2 font-semibold ${(!startConfirmChecked || !isOnline) ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-[color:#0a1156] text-white hover:opacity-90"}`}
              >
                I Agree — Start Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Exam Modal */}
      {finalExamOpen && finalExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          <div className="absolute inset-0 bg-black/50" />
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

            <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
              <ul className="list-disc pl-5 grid gap-1">
                <li>Timer cannot be paused.</li>
                <li>Do not close or switch this tab. Doing so will auto-end the exam.</li>
                <li>Copying/printing is disabled during the exam.</li>
                <li>One attempt only. To retry, pay the penalty via admin.</li>
              </ul>
            </div>

            {!isOnline && (
              <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
                You are offline. Stay online to ensure your answers are saved.
              </div>
            )}

            <div className="mt-4 grid gap-4">
              {finalExamQuestions.map((q, idx) => (
                <div key={q.id} className="rounded-lg p-3 ring-1 ring-[var(--color-light)]">
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

      {/* Results Modal */}
      {resultOpen && finalResult && finalExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setResultOpen(false)} />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white border border-light p-5 max-h-[92vh] overflow-auto">
            <div className="text-lg font-semibold">Results</div>

            <div className="mt-3 grid gap-2 text-sm">
              <div className="rounded-lg p-3 ring-1 ring-[var(--color-light)]">
                <div className="font-medium">Final Exam</div>
                <div className="mt-1">
                  Score: <b>{finalResult.correct}/{finalResult.total}</b> ({finalResult.scorePct}%)
                  {" · "}Pass mark: <b>{finalExam.pass_mark ?? 0}%</b>
                </div>
                <div className={`mt-1 inline-block px-2 py-0.5 rounded ${finalResult.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {finalResult.passed ? "PASSED" : "NOT PASSED"}
                </div>
              </div>

              <div className="rounded-lg p-3 ring-1 ring-[var(--color-light)]">
                <div className="font-medium mb-2">Chapter Quiz Scores</div>
                {chapterScores.length === 0 ? (
                  <div className="text-xs text-muted">No chapter quiz submissions found.</div>
                ) : (
                  <div className="overflow-auto">
                    <table className="w-full text-xs md:text-sm">
                      <thead>
                        <tr className="text-left">
                          <th className="py-1 pr-2">Chapter</th>
                          <th className="py-1 pr-2">Score</th>
                          <th className="py-1 pr-2">Details</th>
                          <th className="py-1 pr-2">Completed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chapterScores.map((r) => (
                          <tr key={r.chapterId} className="border-t">
                            <td className="py-1 pr-2">{r.chapterTitle}</td>
                            <td className="py-1 pr-2">{r.scorePct ?? "—"}%</td>
                            <td className="py-1 pr-2">
                              {r.correctCount ?? "—"}/{r.totalCount ?? "—"}
                            </td>
                            <td className="py-1 pr-2">{r.completedAt ? new Date(r.completedAt).toLocaleString() : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {finalResult.passed && (
              <div
                className={`mt-4 rounded-lg p-3 text-sm ${
                  certificateNotice?.type === "error"
                    ? "bg-red-50 border border-red-200 text-red-800"
                    : certificateNotice?.type === "success"
                      ? "bg-green-50 border border-green-200 text-green-800"
                      : "bg-blue-50 border border-blue-200 text-blue-900"
                }`}
              >
                {certificateNotice?.message ?? "Visit your Dashboard to download your certificate."}
                <div className="mt-1 text-xs text-muted">
                  Need to edit the name on the certificate? Update it via the Dashboard before downloading.
                </div>
              </div>
            )}

            <div className="mt-5 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setResultOpen(false)}
                className="rounded-lg px-4 py-2 ring-1 ring-[var(--color-light)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
