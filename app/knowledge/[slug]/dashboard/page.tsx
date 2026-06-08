// app/knowledge/[slug]/dashboard/page.tsx
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageSkeleton from "@/components/PageSkeleton";
import { supabase } from "@/lib/supabaseClient";
import { issueCertificateForCourse, IssueCertificateError } from "@/lib/client/issueCertificate";
import InteractivePlayer from "@/components/InteractivePlayer";
import PdfPageViewer from "@/components/pdf/PdfPageViewer";

/** Types */
type Course = {
  id: string;
  slug: string;
  title: string;
  img: string | null;
  delivery_mode?: string | null;
  interactive_path?: string | null;
  free_for_logged_in?: boolean | null;
};
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
  num_questions?: number | null;
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

type LinkedEbookMeta = {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  free_for_logged_in?: boolean | null;
};
type LinkedEbook = { ebook_id: string; slug: string; title: string; cover_url: string | null; owned: boolean };

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

type InteractiveState = "not_started" | "in_progress" | "completed";

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

function isPdfAsset(url?: string | null) {
  if (!url) return false;
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    if (path.endsWith(".pdf")) return true;
    return u.href.toLowerCase().includes(".pdf");
  } catch {
    const lower = url.toLowerCase();
    return lower.endsWith(".pdf") || lower.includes(".pdf");
  }
}

function shuffleOptionsWithAnswer(options: string[], correctIndex: number) {
  const mapped = options.map((opt, idx) => ({ opt, idx }));
  const shuffled = shuffle(mapped);
  const newOptions = shuffled.map((s) => s.opt);
  const newIndex = Math.max(0, shuffled.findIndex((s) => s.idx === correctIndex));
  return { newOptions, newIndex: newIndex === -1 ? 0 : newIndex };
}

function secondsToClock(s: number) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, "0")}`;
}

/** Local progress key helper (scoped per-user per-course) */
const progressKey = (userId: string, courseId: string) => `pv.progress.${userId}.${courseId}`;

function pickLinkedEbook(e: LinkedEbookMeta | LinkedEbookMeta[] | null | undefined): LinkedEbookMeta | null {
  if (!e) return null;
  return Array.isArray(e) ? e[0] ?? null : e;
}

function isMissingFreeColumnError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const rec = err as { code?: string; message?: string; details?: string; hint?: string };
  const text = `${rec.message ?? ""} ${rec.details ?? ""} ${rec.hint ?? ""}`.toLowerCase();
  if (!text.includes("free_for_logged_in")) return false;
  if (rec.code === "42703" || rec.code === "PGRST204") return true;
  return text.includes("does not exist") || text.includes("schema cache") || text.includes("could not find");
}

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

  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [activeSlide, setActiveSlide] = useState<Slide | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string>("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [interactiveStatus, setInteractiveStatus] = useState<InteractiveState>("not_started");
  const [interactiveLastSeen, setInteractiveLastSeen] = useState<string | null>(null);
  const [includedEbooks, setIncludedEbooks] = useState<LinkedEbook[]>([]);

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
  const [activeExamQuestions, setActiveExamQuestions] = useState<ExamQuestion[]>([]);
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
  const isInteractive = course?.delivery_mode === "interactive";

  /** Auth */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/sign-in"); return; }
      setUserId(user.id);
    })();
  }, [router]);

  /** Load data (includes robust slide progress merge) */
  useEffect(() => {
    if (!userId || !slug) return;

    (async () => {
      setLoading(true);

      // course
      let c: Course | null = null;
      const primary = await supabase
        .from("courses")
        .select("id,slug,title,img,delivery_mode,interactive_path,free_for_logged_in")
        .eq("slug", String(slug))
        .maybeSingle();
      if (!primary.error) {
        c = primary.data as Course | null;
      } else if (isMissingFreeColumnError(primary.error)) {
        const fallback = await supabase
          .from("courses")
          .select("id,slug,title,img,delivery_mode,interactive_path")
          .eq("slug", String(slug))
          .maybeSingle();
        c = fallback.data as Course | null;
      }
      if (!c) { router.push("/knowledge"); return; }
      setCourse(c);

      // 🔒 STRICT PAYWALL: must have an enrollment row with paid === true
      const { data: enr, error: enrErr } = await supabase
        .from("enrollments")
        .select("paid")
        .eq("user_id", userId)
        .eq("course_id", c.id)
        .maybeSingle();

      const hasFreeAccess = c.free_for_logged_in === true;
      const hasPaidAccess = enr?.paid === true;
      if ((enrErr && !hasFreeAccess) || (!hasPaidAccess && !hasFreeAccess)) {
        router.replace(`/knowledge/${c.slug}/enroll`);
        return; // stop here; don't load content
      }
      if (hasFreeAccess && !enr) {
        await supabase
          .from("enrollments")
          .upsert(
            {
              user_id: userId,
              course_id: c.id,
              paid: false,
            } as Record<string, unknown>,
            { onConflict: "user_id,course_id" },
          );
      }

      // Ensure interactive placeholder chapter/slide exists (idempotent)
      if (c.delivery_mode === "interactive") {
        try {
          await fetch("/api/interactive/ensure", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ course_id: c.id }),
          });
          const nowIso = new Date().toISOString();
          const { data: istate } = await supabase
            .from("user_interactive_state")
            .select("status,last_seen_at")
            .eq("user_id", userId)
            .eq("course_id", c.id)
            .maybeSingle();
          const nextStatus = istate?.status === "completed" ? "completed" : "in_progress";
          const { data: upData } = await supabase
            .from("user_interactive_state")
            .upsert(
              {
                user_id: userId,
                course_id: c.id,
                status: nextStatus,
                last_seen_at: nowIso,
              },
              { onConflict: "user_id,course_id" }
            )
            .select("status,last_seen_at")
            .maybeSingle();
          const resolvedState = (upData?.status ?? nextStatus) as InteractiveState;
          setInteractiveStatus(resolvedState);
          setInteractiveLastSeen(upData?.last_seen_at ?? istate?.last_seen_at ?? nowIso);
        } catch {
          // non-blocking
        }
      }

      // Bundled e-books (if this course includes any)
      try {
        const bundlePrimary = await supabase
          .from("program_ebook_links")
          .select("ebook_id, ebooks!inner(id,slug,title,cover_url,free_for_logged_in)")
          .eq("course_id", c.id)
          .eq("active", true);
        let bundleLinks = bundlePrimary.data;
        if (bundlePrimary.error && isMissingFreeColumnError(bundlePrimary.error)) {
          const fallback = await supabase
            .from("program_ebook_links")
            .select("ebook_id, ebooks!inner(id,slug,title,cover_url)")
            .eq("course_id", c.id)
            .eq("active", true);
          bundleLinks = fallback.data as typeof bundleLinks;
        }

        const ebookIds = (bundleLinks ?? [])
          .map((row: { ebook_id?: string | null }) => row.ebook_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0);

        let ownedIds = new Set<string>();
        if (ebookIds.length > 0) {
          const { data: ownedRows } = await supabase
            .from("ebook_purchases")
            .select("ebook_id,status")
            .eq("user_id", userId)
            .in("ebook_id", ebookIds);
          ownedIds = new Set(
            (ownedRows ?? [])
              .map((r: { ebook_id?: string; status?: string | null }) => (r.status === "paid" ? r.ebook_id : null))
              .filter((id): id is string => typeof id === "string" && id.length > 0)
          );
        }

        const mapped = (bundleLinks ?? [])
          .map((row: { ebook_id?: string | null; ebooks?: LinkedEbookMeta | LinkedEbookMeta[] | null }) => {
            const meta = pickLinkedEbook(row.ebooks);
            const id = row.ebook_id || meta?.id;
            if (!meta || !id) return null;
            return {
              ebook_id: id,
              slug: meta.slug,
              title: meta.title,
              cover_url: meta.cover_url ?? null,
              owned: ownedIds.has(id) || meta.free_for_logged_in === true,
            } as LinkedEbook;
          })
          .filter(Boolean) as LinkedEbook[];

        setIncludedEbooks(mapped);
      } catch (err) {
        console.warn("bundled ebooks fetch failed", err);
        setIncludedEbooks([]);
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

      // ✅ slide progress: merge server + localStorage; keep local in sync
      // Active slide is set AFTER progress so we can resume at the first incomplete slide.
      let resolvedCompleted: string[] = [];
      try {
        const { data: prog, error: progErr } = await supabase
          .from("user_slide_progress")
          .select("slide_id")
          .eq("user_id", userId)
          .eq("course_id", c.id);

        if (progErr) {
          resolvedCompleted = JSON.parse(localStorage.getItem(progressKey(userId, c.id)) ?? "[]") as string[];
        } else {
          const fromServer = (prog ?? []).map((p: { slide_id: string }) => p.slide_id);
          const fromLocal = JSON.parse(localStorage.getItem(progressKey(userId, c.id)) ?? "[]") as string[];
          resolvedCompleted = Array.from(new Set([...fromServer, ...fromLocal]));
          localStorage.setItem(progressKey(userId, c.id), JSON.stringify(resolvedCompleted));
        }
      } catch {
        resolvedCompleted = JSON.parse(localStorage.getItem(progressKey(userId, c.id)) ?? "[]") as string[];
      }
      setCompleted(resolvedCompleted);

      // Resume at first incomplete slide; fall back to last slide if all done
      if (!initializedRef.current) {
        const firstIncomplete = slSorted.find(s => !resolvedCompleted.includes(s.id));
        setActiveSlide(firstIncomplete ?? slSorted[slSorted.length - 1] ?? null);
        initializedRef.current = true;
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
          .select("id,course_id,title,pass_mark,time_limit_minutes,num_questions")
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
          setActiveExamQuestions([]);
          setFinalAnswers({});
        } else {
          setFinalExam(null);
          setFinalExamQuestions([]);
          setActiveExamQuestions([]);
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
  const totalSlidesSafe = totalSlides || (isInteractive ? 1 : 0);
  const done = completed.length;
  const pct = totalSlidesSafe === 0 ? 0 : Math.round((done / totalSlidesSafe) * 100);

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

  async function completeInteractiveModule() {
    if (!activeSlide) return;
    await markDone(activeSlide);
    if (course && userId) {
      const nowIso = new Date().toISOString();
      try {
        await supabase
          .from("user_interactive_state")
          .upsert(
            {
              user_id: userId,
              course_id: course.id,
              status: "completed",
              last_seen_at: nowIso,
            },
            { onConflict: "user_id,course_id" }
          );
        setInteractiveStatus("completed");
        setInteractiveLastSeen(nowIso);
      } catch {
        /* non-blocking */
      }
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
    const limitRaw = Number(finalExam?.num_questions ?? 50);
    const limit = Math.max(1, Math.min(randomized.length, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : randomized.length));
    const selected = randomized.slice(0, limit).map((q) => {
      const { newOptions, newIndex } = shuffleOptionsWithAnswer(q.options, q.correct_index);
      return {
        ...q,
        options: newOptions,
        correct_index: newIndex,
      };
    });
    if (selected.length === 0) {
      setNotice("Final exam does not have any questions yet.");
      setTimeout(() => setNotice(""), 1800);
      return;
    }
    const answers: Record<string, number | null> = {};
    selected.forEach((q) => {
      answers[q.id] = null;
    });
    setActiveExamQuestions(selected);
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

    const questionSet = activeExamQuestions.length > 0 ? activeExamQuestions : finalExamQuestions;
    if (questionSet.length === 0) {
      setNotice("Final exam questions not found.");
      setTimeout(() => setNotice(""), 1800);
      return;
    }

    const answered = questionSet.map(q => ({
      id: q.id,
      chosen: finalAnswers[q.id],
      correct: q.correct_index,
    }));

    const total = questionSet.length;
    const correctCount = answered.reduce((acc, a) => acc + (a.chosen === a.correct ? 1 : 0), 0);
    const scorePct = Math.round((correctCount / Math.max(1, total)) * 100);
    const passMark = Number(finalExam.pass_mark ?? 0);
    const passed = scorePct >= passMark;

    let attemptId: string | null = null;

    setFinalExamOpen(false);
    setFinalTimeLeft(0);
    setFinalAnswers({});
    setActiveExamQuestions([]);
    setFinalResult({ scorePct, correct: correctCount, total, passed });
    setResultOpen(true);

    if (passed) {
      try {
        setCertificateNotice({ type: "info", message: "Issuing your certificate…" });
        const result = await issueCertificateForCourse({
          courseId: finalExam.course_id,
          examId: finalExam.id,
          score: scorePct,
          total,
          correctCount,
          autoSubmit: auto,
        });
        attemptId = result.attemptId ?? null;
        setFinalAttemptExists(true);
        setCertificateNotice({ type: "success", message: "Certificate issued! Visit your Dashboard to download it." });
      } catch (err) {
        const code = err instanceof IssueCertificateError ? err.code : (err as { code?: string } | null)?.code ?? null;
        if (code === "NOT_AUTHENTICATED") {
          setCertificateNotice({ type: "error", message: "Please sign in again before issuing your certificate." });
        } else if (code === "MISSING_FULL_NAME") {
          setCertificateNotice({ type: "error", message: "Add your full name on the Dashboard before we can issue your certificate." });
        } else {
          console.error("certificate issue failed", err);
          setCertificateNotice({ type: "error", message: "We could not issue your certificate right now. Please try again or contact support." });
        }
      }
    } else {
      // Record failed attempt for history
      try {
        const { data: attemptRow } = await supabase
          .from("attempts")
          .insert({
            user_id: userId,
            exam_id: finalExam.id,
            score: scorePct,
            passed: false,
            created_at: new Date().toISOString(),
            meta: { autoSubmit: auto, total, correctCount },
          })
          .select("id")
          .single();
        attemptId = attemptRow?.id ?? null;
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
    }
  }

  /** UI helpers */
  function renderMedia(s: Slide) {
    const video = s.video_url ?? s.intro_video_url ?? null;
    const nodes: ReactNode[] = [];
    const assetUrl = s.asset_url || "";
    const isPdf = isPdfAsset(assetUrl);
    const isImg =
      !!assetUrl &&
      !isPdf &&
      [".jpg", ".jpeg", ".png", ".gif", ".webp"].some((ext) =>
        assetUrl.toLowerCase().endsWith(ext)
      );
    const posterUrl = isImg ? assetUrl : undefined;

    if (assetUrl && isPdf) {
      nodes.push(
        <div key="pdf" className="mt-3 w-full overflow-hidden">
          <PdfPageViewer url={assetUrl} />
        </div>
      );
    } else if (assetUrl) {
      if (isImg) {
        nodes.push(
          <div key="img" className="mt-3">
            <Image
              src={assetUrl}
              alt="Slide asset"
              width={1600}
              height={900}
              className="rounded-lg border border-[color:var(--color-light)]/40 shadow-sm w-full h-auto object-contain"
              priority={false}
            />
          </div>
        );
      } else {
        nodes.push(
          <div key="link" className="mt-3 text-sm">
            <a className="underline break-all" href={assetUrl} target="_blank" rel="noreferrer">
              Open slide asset
            </a>
          </div>
        );
      }
    }

    if (video) {
      nodes.push(
        <div key="video" className="mt-3 w-full">
          <VideoPlayer src={video} poster={posterUrl} />
        </div>
      );
    }

    if (nodes.length === 0) return null;
    return <>{nodes}</>;
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

  const BRAND = "#b65437";

  if (loading) return <PageSkeleton variant="dashboard" />;
  if (!course) return (
    <div className="mx-auto max-w-screen-lg px-4 py-16 text-center">
      <p className="text-[color:var(--color-muted)]">Program not found.</p>
      <Link href="/knowledge" className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white" style={{ background: BRAND }}>
        Back to Knowledge
      </Link>
    </div>
  );

  /* ── Inline SVG icons (no emojis) ── */
  const IconCheck = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
    </svg>
  );
  const IconCheckCircle = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-2 14.4-4-4 1.4-1.4 2.6 2.6 6.6-6.6 1.4 1.4-8 8z" />
    </svg>
  );
  const IconCircle = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
    </svg>
  );
  const IconLock = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm3-9H9V6a3 3 0 0 1 6 0v2z" />
    </svg>
  );
  const IconPlay = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
  const IconBack = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
    </svg>
  );
  const IconClock = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z" />
    </svg>
  );
  const IconWifi = () => (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 0 0-6 0zm-4-4 2 2a7.074 7.074 0 0 1 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
    </svg>
  );
  const IconWifiOff = () => (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M22.99 9C19.15 5.16 13.8 3.76 8.84 4.78L11 6.94c3.24-.4 6.63.6 9.14 3.06l2-2zm-2.14 2.14-2.04 2.04C20.2 14.52 21 16.16 21 18h2c0-2.31-.95-4.44-2.15-6.86zM7 6L5.2 4.2C2.44 5.36 0 7.27 0 10c0 2.21.87 4.24 2.27 5.75L4.14 14C3.07 12.85 2 11.5 2 10c0-2.21 2.5-4 5-4zm6 6-2-2H7.85L9.26 11.5A2.99 2.99 0 0 0 9 13c0 1.66 1.34 3 3 3s3-1.34 3-3c0-.83-.34-1.58-.88-2.12L13 12zm5.5 5.5-1.38-1.38A6.965 6.965 0 0 0 16 17H9l-2-2H5.07L1.39 11.32 0 12.71l3 3H2v2h5l2 2h6c1.07 0 2.07-.27 2.93-.75L20.59 21 22 19.59l-3.5-3.45z" />
    </svg>
  );
  const IconWarning = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
    </svg>
  );
  const IconClose = () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
  const IconMenu = () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
    </svg>
  );
  const IconStar = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12 1l3 6 6 .5-4.5 4 1.3 6.5L12 15l-5.8 3.9 1.3-6.5L3 7.5 9 7z" />
    </svg>
  );

  return (
    <div className="flex flex-col bg-[color:var(--color-bg)]" style={{ minHeight: "calc(100dvh - 4rem)" }}>

      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[color:var(--color-light)] shadow-[0_1px_4px_rgba(44,37,34,0.06)]">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 h-13 flex items-center gap-3" style={{ height: "3.25rem" }}>
          {/* Back */}
          <Link
            href="/courses"
            className="flex items-center gap-1.5 text-sm text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] transition flex-shrink-0"
          >
            <IconBack />
            <span className="hidden sm:inline">Knowledge</span>
          </Link>
          <span className="text-[color:var(--color-light)] text-lg select-none flex-shrink-0">/</span>

          {/* Course title */}
          <span className="font-semibold text-[color:var(--color-ink)] truncate flex-1 text-sm">{course.title}</span>

          {/* Progress pill */}
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-[color:var(--color-light)] bg-[color:var(--color-bg)] px-3 py-1 text-xs font-medium text-[color:var(--color-ink)] flex-shrink-0">
            <span className="font-bold">{pct}%</span>
            <span className="text-[color:var(--color-muted)]">· {done}/{totalSlidesSafe}</span>
          </span>

          {/* Final exam CTA */}
          {finalExam && finalExamQuestions.length > 0 && !finalAttemptExists && (
            <button
              type="button"
              onClick={openFinalConfirm}
              disabled={!canTakeFinal}
              className={`hidden sm:flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition flex-shrink-0 ${
                canTakeFinal
                  ? "text-white hover:opacity-90 shadow-sm"
                  : "border border-amber-200 bg-amber-50 text-amber-700 cursor-not-allowed"
              }`}
              style={canTakeFinal ? { background: BRAND } : {}}
            >
              {canTakeFinal ? (
                <><IconStar /> Final Exam</>
              ) : (
                <><IconLock /> Exam locked</>
              )}
            </button>
          )}
          {finalExam && finalAttemptExists && (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-semibold flex-shrink-0">
              <IconCheck /> Exam done
            </span>
          )}

          {/* Mobile outline toggle */}
          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-expanded={mobileNavOpen}
            aria-controls="course-sidebar"
            className="lg:hidden flex items-center gap-1.5 rounded-xl border border-[color:var(--color-light)] bg-white px-3 py-1.5 text-xs font-medium flex-shrink-0"
          >
            <IconMenu />
            <span className="hidden xs:inline">{mobileNavOpen ? "Close" : "Outline"}</span>
          </button>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-1 mx-auto w-full max-w-screen-2xl overflow-hidden">

        {/* ── Sidebar ── */}
        <aside
          id="course-sidebar"
          className={[
            "flex-shrink-0 w-[17rem] xl:w-[18.5rem] bg-white border-r border-[color:var(--color-light)] flex flex-col",
            "lg:sticky lg:top-[3.25rem] lg:h-[calc(100dvh-3.25rem-4rem)] overflow-hidden",
            mobileNavOpen
              ? "fixed inset-0 top-[3.25rem] z-20 w-full sm:w-80 overflow-y-auto shadow-2xl"
              : "hidden lg:flex"
          ].join(" ")}
        >
          {/* Progress */}
          <div className="px-4 pt-4 pb-3 border-b border-[color:var(--color-light)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">Progress</span>
              <span className="text-xs font-bold text-[color:var(--color-ink)]">{pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[color:var(--color-light)]">
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: BRAND }}
              />
            </div>
            <div className="mt-1.5 text-[11px] text-[color:var(--color-muted)]">
              {done} of {totalSlidesSafe} slides completed
            </div>

            {isInteractive && (
              <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-[11px] text-sky-800">
                Interactive course — launch below, then mark complete to unlock the exam.
              </div>
            )}
          </div>

          {/* Chapter + slide list */}
          <div className="flex-1 overflow-y-auto py-2">
            {chapters.map((ch) => {
              const hasQuiz = (quizByChapter[ch.id]?.length ?? 0) > 0;
              const quizDone = completedQuizzes.includes(ch.id);
              const chSlides = slidesByChapter[ch.id] ?? [];
              const chDoneCount = chSlides.filter(s => completed.includes(s.id)).length;
              const chPct = chSlides.length > 0 ? Math.round((chDoneCount / chSlides.length) * 100) : 0;

              return (
                <div key={ch.id} className="mb-1">
                  {/* Chapter header */}
                  <div className="px-4 pt-3 pb-1 flex items-start justify-between gap-2">
                    <span className="text-[12px] font-semibold text-[color:var(--color-ink)] leading-snug flex-1">{ch.title}</span>
                    <div className="flex flex-shrink-0 items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-[color:var(--color-muted)]">{chPct}%</span>
                      {hasQuiz && (
                        <span
                          className={`rounded text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wide ${
                            quizDone ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {quizDone ? "Quiz" : "Quiz"}
                          {quizDone && <span className="ml-0.5">✓</span>}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Slides */}
                  <ul>
                    {chSlides.map((s) => {
                      const isActive = activeSlide?.id === s.id;
                      const isDone = completed.includes(s.id);
                      const isLocked = !canAccessById(s.id);
                      return (
                        <li key={s.id}>
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => trySelectSlide(s)}
                            onKeyDown={(e) => {
                              if ((e.key === "Enter" || e.key === " ") && !isLocked) trySelectSlide(s);
                            }}
                            aria-disabled={isLocked}
                            className={[
                              "w-full flex items-center gap-2.5 py-1.5 pr-4 text-left transition",
                              isActive
                                ? "bg-[color:var(--color-bg)] border-r-2"
                                : "hover:bg-[color:var(--color-bg)]/60",
                              isLocked ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                            ].join(" ")}
                            style={isActive ? { paddingLeft: "0.875rem", borderRightColor: BRAND } : { paddingLeft: "0.875rem" }}
                          >
                            <span
                              className="flex-shrink-0"
                              style={{
                                color: isDone ? "#059669" : isActive ? BRAND : "var(--color-muted)",
                              }}
                            >
                              {isDone ? <IconCheckCircle /> : isLocked ? <IconLock /> : isActive ? <IconPlay /> : <IconCircle />}
                            </span>
                            <span
                              className={`text-[12px] leading-snug line-clamp-2 ${
                                isActive
                                  ? "font-semibold text-[color:var(--color-ink)]"
                                  : isDone
                                  ? "text-[color:var(--color-ink)]/60 line-through decoration-1"
                                  : "text-[color:var(--color-ink)]/75"
                              }`}
                            >
                              {s.title}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}

            {chapters.length === 0 && (
              <div className="px-4 py-6 text-sm text-[color:var(--color-muted)]">
                No content yet.
              </div>
            )}
          </div>

          {/* Bottom: final exam CTA in sidebar */}
          {finalExam && finalExamQuestions.length > 0 && (
            <div className="border-t border-[color:var(--color-light)] p-4">
              {!finalAttemptExists ? (
                <button
                  type="button"
                  onClick={openFinalConfirm}
                  disabled={!canTakeFinal}
                  className={`w-full rounded-xl py-2.5 text-sm font-semibold transition ${
                    canTakeFinal
                      ? "text-white hover:opacity-90 shadow-sm"
                      : "border border-[color:var(--color-light)] bg-[color:var(--color-bg)] text-[color:var(--color-muted)] cursor-not-allowed"
                  }`}
                  style={canTakeFinal ? { background: BRAND } : {}}
                >
                  {canTakeFinal ? "Take Final Exam" : "Complete all slides first"}
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-800">
                  <IconCheck /> Final Exam completed
                </div>
              )}
              {!canTakeFinal && !finalAttemptExists && (
                <p className="mt-2 text-[10px] text-[color:var(--color-muted)] text-center">
                  All slides + chapter quizzes required
                </p>
              )}
            </div>
          )}
        </aside>

        {/* Mobile overlay backdrop */}
        {mobileNavOpen && (
          <div
            className="lg:hidden fixed inset-0 z-10 bg-black/30"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden
          />
        )}

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 flex flex-col pb-20 sm:pb-6">

          {/* Included e-books banner */}
          {includedEbooks.length > 0 && (
            <div className="mx-4 sm:mx-6 mt-4 grid gap-3 sm:grid-cols-2">
              {includedEbooks.map((eb) => (
                <div
                  key={eb.ebook_id}
                  className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-light)] bg-white p-4 shadow-sm"
                >
                  <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-[color:var(--color-light)]">
                    {eb.cover_url ? (
                      <Image src={eb.cover_url} alt={eb.title} width={96} height={120} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-[color:var(--color-muted)]">Book</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">Included E-Book</div>
                    <div className="text-sm font-semibold text-[color:var(--color-ink)] leading-snug line-clamp-1">{eb.title}</div>
                    <div className="mt-2 flex gap-2">
                      <Link
                        href={`/ebooks/${eb.slug}`}
                        className="rounded-lg px-3 py-1 text-xs font-semibold text-white hover:opacity-90 transition"
                        style={{ background: BRAND }}
                      >
                        {eb.owned ? "Open" : "View"}
                      </Link>
                      <Link href="/dashboard" className="rounded-lg border border-[color:var(--color-light)] px-3 py-1 text-xs font-medium hover:bg-[color:var(--color-bg)] transition">
                        Library
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pre-test notice */}
          <div className="mx-4 sm:mx-6 mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-600"><IconWarning /></span>
              <span className="text-xs font-semibold text-amber-800">Before starting any test</span>
              <span
                className={`ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  isOnline ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                {isOnline ? <IconWifi /> : <IconWifiOff />}
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
            <ul className="grid gap-1 text-[11px] text-amber-800">
              <li className="flex items-start gap-1.5"><span className="flex-shrink-0 mt-0.5"><IconCheck /></span>Use a stable internet connection. Close heavy apps/tabs; disable VPNs.</li>
              <li className="flex items-start gap-1.5"><span className="flex-shrink-0 mt-0.5"><IconCheck /></span>Once you start, you <strong>cannot pause</strong>. The timer runs continuously.</li>
              <li className="flex items-start gap-1.5"><span className="flex-shrink-0 mt-0.5"><IconCheck /></span>Do not switch/close the tab — your test will automatically end.</li>
              <li className="flex items-start gap-1.5"><span className="flex-shrink-0 mt-0.5"><IconCheck /></span>Copying and printing are disabled during the test.</li>
            </ul>
          </div>

          {/* Slide content */}
          <div className="flex-1 mx-4 sm:mx-6 mt-4">
            {isInteractive ? (
              <div className="rounded-2xl border border-[color:var(--color-light)] bg-white p-5 sm:p-7 shadow-sm space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-[color:var(--color-ink)]">{course.title}</h2>
                  <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                    Status:{" "}
                    <span className="font-medium text-[color:var(--color-ink)]">
                      {interactiveStatus === "completed" ? "Completed" : interactiveStatus === "in_progress" ? "In progress" : "Not started"}
                    </span>
                    {interactiveLastSeen && ` · Last seen ${new Date(interactiveLastSeen).toLocaleString()}`}
                  </p>
                </div>

                {course.interactive_path ? (
                  <>
                    <InteractivePlayer src={course.interactive_path} title="Interactive course player" />
                    <p className="text-xs text-[color:var(--color-muted)]">
                      If it does not load,{" "}
                      <a className="underline decoration-dotted" href={course.interactive_path} target="_blank" rel="noreferrer">
                        open in a new tab
                      </a>.
                    </p>
                  </>
                ) : (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    Interactive path is not configured for this course.
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => completeInteractiveModule()}
                    disabled={!activeSlide || completed.includes(activeSlide.id)}
                    className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                    style={{ background: BRAND }}
                  >
                    {activeSlide && completed.includes(activeSlide.id) ? "Module completed" : "Mark as completed"}
                  </button>
                  {course.interactive_path && (
                    <a
                      href={course.interactive_path}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-[color:var(--color-light)] bg-white px-5 py-2.5 text-sm font-medium hover:bg-[color:var(--color-bg)] transition"
                    >
                      Open in new tab
                    </a>
                  )}
                </div>

                {!!notice && (
                  <div role="status" aria-live="polite" className="text-sm font-medium" style={{ color: BRAND }}>
                    {notice}
                  </div>
                )}
              </div>
            ) : activeSlide ? (
              <div className="rounded-2xl border border-[color:var(--color-light)] bg-white shadow-sm overflow-hidden">
                {/* Slide header */}
                <div className="flex items-center justify-between gap-3 border-b border-[color:var(--color-light)] px-5 py-4">
                  <h2 className="font-bold text-[16px] sm:text-[18px] text-[color:var(--color-ink)] leading-snug flex-1 min-w-0">
                    {activeSlide.title}
                  </h2>
                  {/* Desktop prev/next */}
                  <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => { if (canGoPrev) setActiveSlide(orderedSlides[activeIndex - 1]); }}
                      disabled={!canGoPrev}
                      aria-label="Previous slide"
                      className={`flex items-center gap-1.5 rounded-xl border border-[color:var(--color-light)] px-3 py-1.5 text-sm font-medium transition ${
                        canGoPrev ? "hover:bg-[color:var(--color-bg)] text-[color:var(--color-ink)]" : "opacity-35 cursor-not-allowed text-[color:var(--color-muted)]"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden><path d="M15.41 16.59 10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (canGoNext) setActiveSlide(orderedSlides[activeIndex + 1]);
                        else setNotice("Complete this slide or the chapter quiz first.");
                      }}
                      disabled={!canGoNext}
                      aria-label="Next slide"
                      className={`flex items-center gap-1.5 rounded-xl border border-[color:var(--color-light)] px-3 py-1.5 text-sm font-medium transition ${
                        canGoNext ? "hover:bg-[color:var(--color-bg)] text-[color:var(--color-ink)]" : "opacity-35 cursor-not-allowed text-[color:var(--color-muted)]"
                      }`}
                    >
                      Next
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden><path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
                    </button>
                  </div>
                </div>

                {/* Slide body */}
                <div className="p-5 sm:p-7">
                  {renderMedia(activeSlide)}

                  {(activeSlide.body ?? activeSlide.content) && (
                    <div
                      className="prose max-w-none mt-5 text-[0.95rem] leading-relaxed text-[color:var(--color-ink)]"
                      dangerouslySetInnerHTML={{ __html: activeSlide.body ?? activeSlide.content ?? "" }}
                    />
                  )}

                  {/* Actions */}
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    {!completed.includes(activeSlide.id) ? (
                      <button
                        type="button"
                        onClick={() => markDone(activeSlide)}
                        className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 shadow-sm"
                        style={{ background: BRAND }}
                      >
                        <IconCheck /> Mark as Done
                      </button>
                    ) : (
                      <span className="flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                        <IconCheckCircle /> Done
                      </span>
                    )}

                    {isLastSlideOfChapter && completed.includes(activeSlide.id) && quizExistsForActiveChapter && !quizDoneForActiveChapter && (
                      <button
                        type="button"
                        onClick={() => beginQuiz(activeSlide.chapter_id)}
                        className="flex items-center gap-2 rounded-xl border border-[color:var(--color-light)] bg-white px-5 py-2.5 text-sm font-semibold hover:bg-[color:var(--color-bg)] transition"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 17.93V18h-2v1.93A8.001 8.001 0 0 1 4.07 13H6v-2H4.07A8.001 8.001 0 0 1 11 4.07V6h2V4.07A8.001 8.001 0 0 1 19.93 11H18v2h1.93A8.001 8.001 0 0 1 13 19.93z"/></svg>
                        Take Chapter Quiz
                      </button>
                    )}

                    {isLastSlideOfChapter && quizExistsForActiveChapter && quizDoneForActiveChapter && (
                      <span className="flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                        <IconCheck /> Chapter quiz done
                      </span>
                    )}
                  </div>

                  {!!notice && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="mt-3 text-sm font-medium"
                      style={{ color: BRAND }}
                    >
                      {notice}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-[color:var(--color-light)] bg-white p-12 text-center shadow-sm">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(182,84,55,0.1)", color: BRAND }}>
                  <IconPlay />
                </div>
                <p className="font-semibold text-[color:var(--color-ink)]">Select a slide to begin</p>
                <p className="mt-1 text-sm text-[color:var(--color-muted)]">Choose from the outline on the left.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Sticky mobile bottom bar ── */}
      {activeSlide && !isInteractive && (
        <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur-sm border-t border-[color:var(--color-light)] shadow-[0_-4px_12px_rgba(44,37,34,0.06)]">
          <div className="grid grid-cols-3 gap-2 px-4 py-3">
            <button
              type="button"
              onClick={() => { if (canGoPrev) setActiveSlide(orderedSlides[activeIndex - 1]); }}
              disabled={!canGoPrev}
              aria-label="Previous slide"
              className={`flex items-center justify-center gap-1.5 rounded-xl border border-[color:var(--color-light)] py-3 text-sm font-medium transition ${
                canGoPrev ? "bg-white active:scale-[0.97]" : "opacity-35 cursor-not-allowed bg-white"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden><path d="M15.41 16.59 10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>
              Prev
            </button>
            <button
              type="button"
              onClick={() => markDone(activeSlide)}
              aria-label="Mark as done"
              className="flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold text-white active:scale-[0.97] transition"
              style={{ background: BRAND }}
            >
              <IconCheck /> Done
            </button>
            <button
              type="button"
              onClick={() => {
                if (canGoNext) setActiveSlide(orderedSlides[activeIndex + 1]);
                else setNotice("Complete this slide or quiz first.");
              }}
              disabled={!canGoNext}
              aria-label="Next slide"
              className={`flex items-center justify-center gap-1.5 rounded-xl border border-[color:var(--color-light)] py-3 text-sm font-medium transition ${
                canGoNext ? "bg-white active:scale-[0.97]" : "opacity-35 cursor-not-allowed bg-white"
              }`}
            >
              Next
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden><path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Chapter Quiz Modal ── */}
      {quizOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setQuizOpen(false)} />
          <div className="relative z-10 w-full max-w-2xl rounded-t-2xl sm:rounded-2xl bg-white border border-[color:var(--color-light)] shadow-2xl max-h-[92vh] overflow-auto">
            {/* Modal header */}
            <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-[color:var(--color-light)] bg-white px-5 py-4 rounded-t-2xl">
              <div>
                <div className="font-bold text-[color:var(--color-ink)]">Chapter Quiz</div>
                <div className="text-xs text-[color:var(--color-muted)]">{quizItems.length} questions</div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-bold ${quizTimeLeft <= 10 ? "border-red-200 bg-red-50 text-red-700" : "border-[color:var(--color-light)] text-[color:var(--color-ink)]"}`}>
                  <IconClock />
                  {secondsToClock(quizTimeLeft)}
                </div>
                <button type="button" onClick={() => setQuizOpen(false)} className="rounded-xl p-1.5 hover:bg-[color:var(--color-bg)] transition text-[color:var(--color-muted)]">
                  <IconClose />
                </button>
              </div>
            </div>

            <div className="p-5 grid gap-4">
              {quizItems.map((q, idx) => (
                <div key={q.id} className="rounded-2xl border border-[color:var(--color-light)] bg-[color:var(--color-bg)] p-4">
                  <div className="font-semibold text-sm text-[color:var(--color-ink)]">{idx + 1}. {q.question}</div>
                  <div className="mt-3 grid gap-2">
                    {q.options.map((opt, i) => {
                      const checked = quizAnswers[q.id] === i;
                      return (
                        <label
                          key={i}
                          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm cursor-pointer transition ${
                            checked ? "border-[color:var(--color-brand)] bg-white shadow-sm" : "border-[color:var(--color-light)] bg-white hover:border-[color:var(--color-soft)]"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q_${q.id}`}
                            checked={checked}
                            onChange={() => setQuizAnswers((a) => ({ ...a, [q.id]: i }))}
                            className="accent-[color:var(--color-brand)]"
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-[color:var(--color-light)] bg-white px-5 py-4">
              <button
                type="button"
                onClick={() => setQuizOpen(false)}
                className="rounded-xl border border-[color:var(--color-light)] px-5 py-2.5 text-sm font-medium hover:bg-[color:var(--color-bg)] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => submitQuiz(false)}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ background: BRAND }}
              >
                Submit Quiz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Final Exam Preflight Modal ── */}
      {startConfirmOpen && finalExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setStartConfirmOpen(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white border border-[color:var(--color-light)] shadow-2xl max-h-[88vh] overflow-auto">
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--color-light)] px-5 py-4">
              <div>
                <div className="font-bold text-[color:var(--color-ink)]">Before you start the Final Exam</div>
                <div className="text-xs text-[color:var(--color-muted)] mt-0.5">
                  {finalExam.time_limit_minutes ?? 60} min · Pass mark: {finalExam.pass_mark ?? 0}% · One attempt
                </div>
              </div>
              <button type="button" onClick={() => setStartConfirmOpen(false)} className="rounded-xl p-1.5 hover:bg-[color:var(--color-bg)] transition text-[color:var(--color-muted)] mt-0.5">
                <IconClose />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {/* Connectivity */}
              <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${isOnline ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>
                {isOnline ? <IconWifi /> : <IconWifiOff />}
                <span className="font-medium">{isOnline ? "You are online — good to go" : "You are offline — reconnect before starting"}</span>
              </div>

              <ul className="grid gap-2 text-sm text-[color:var(--color-ink)]">
                {[
                  "Close other heavy apps/tabs; disable VPNs that may drop your connection.",
                  "Once you start, you cannot pause. The timer runs continuously.",
                  "Do not close or switch the tab — the exam will auto-end.",
                  "Copying and printing are disabled during the exam.",
                  "One attempt only. A retry requires admin approval and a penalty fee.",
                ].map((rule, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 mt-0.5 text-amber-600"><IconWarning /></span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>

              <label className="flex items-start gap-3 rounded-2xl border border-[color:var(--color-light)] bg-[color:var(--color-bg)] px-4 py-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={startConfirmChecked}
                  onChange={(e) => setStartConfirmChecked(e.target.checked)}
                  className="mt-0.5 accent-[color:var(--color-brand)] h-4 w-4 flex-shrink-0"
                />
                <span>I have read and understood all the rules above.</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[color:var(--color-light)] px-5 py-4">
              <button
                type="button"
                onClick={() => setStartConfirmOpen(false)}
                className="rounded-xl border border-[color:var(--color-light)] px-5 py-2.5 text-sm font-medium hover:bg-[color:var(--color-bg)] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!startConfirmChecked || !isOnline}
                onClick={() => { setStartConfirmOpen(false); beginFinalExam(); }}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                  !startConfirmChecked || !isOnline
                    ? "border border-[color:var(--color-light)] bg-[color:var(--color-bg)] text-[color:var(--color-muted)] cursor-not-allowed"
                    : "text-white hover:opacity-90"
                }`}
                style={startConfirmChecked && isOnline ? { background: BRAND } : {}}
              >
                I Agree — Start Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Final Exam Modal ── */}
      {finalExamOpen && finalExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-white border border-[color:var(--color-light)] shadow-2xl max-h-[92vh] overflow-auto">
            {/* Exam header */}
            <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-[color:var(--color-light)] bg-white px-5 py-4 rounded-t-2xl z-10">
              <div>
                <div className="font-bold text-[color:var(--color-ink)]">{finalExam.title || "Final Exam"}</div>
                <div className="text-xs text-[color:var(--color-muted)]">{activeExamQuestions.length} questions · pass {finalExam.pass_mark ?? 0}%</div>
              </div>
              <div className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-bold ${finalTimeLeft <= 60 ? "border-red-200 bg-red-50 text-red-700" : "border-[color:var(--color-light)] text-[color:var(--color-ink)]"}`}>
                <IconClock />
                {secondsToClock(finalTimeLeft)}
              </div>
            </div>

            {!isOnline && (
              <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <IconWifiOff /> You are offline. Reconnect to ensure answers are saved.
              </div>
            )}

            <div className="p-5 grid gap-4">
              {activeExamQuestions.length === 0 ? (
                <div className="rounded-2xl border border-[color:var(--color-light)] bg-[color:var(--color-bg)] p-6 text-center text-sm text-[color:var(--color-muted)]">
                  Preparing questions…
                </div>
              ) : (
                activeExamQuestions.map((q, idx) => (
                  <div key={q.id} className="rounded-2xl border border-[color:var(--color-light)] bg-[color:var(--color-bg)] p-4">
                    <div className="font-semibold text-sm text-[color:var(--color-ink)]">{idx + 1}. {q.prompt}</div>
                    <div className="mt-3 grid gap-2">
                      {q.options.map((opt, i) => {
                        const checked = finalAnswers[q.id] === i;
                        return (
                          <label
                            key={i}
                            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm cursor-pointer transition ${
                              checked ? "border-[color:var(--color-brand)] bg-white shadow-sm" : "border-[color:var(--color-light)] bg-white hover:border-[color:var(--color-soft)]"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`f_${q.id}`}
                              checked={checked}
                              onChange={() => setFinalAnswers((a) => ({ ...a, [q.id]: i }))}
                              className="accent-[color:var(--color-brand)] h-4 w-4 flex-shrink-0"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="sticky bottom-0 flex items-center justify-end border-t border-[color:var(--color-light)] bg-white px-5 py-4">
              <button
                type="button"
                onClick={() => submitFinalExam(false)}
                className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ background: BRAND }}
              >
                Submit Final Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Results Modal ── */}
      {resultOpen && finalResult && finalExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setResultOpen(false)} />
          <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white border border-[color:var(--color-light)] shadow-2xl max-h-[92vh] overflow-auto">
            <div className="flex items-center justify-between gap-3 border-b border-[color:var(--color-light)] px-5 py-4">
              <div className="font-bold text-[color:var(--color-ink)]">Exam Results</div>
              <button type="button" onClick={() => setResultOpen(false)} className="rounded-xl p-1.5 hover:bg-[color:var(--color-bg)] transition text-[color:var(--color-muted)]">
                <IconClose />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Score card */}
              <div className={`rounded-2xl border p-5 text-center ${finalResult.passed ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                <div className={`text-4xl font-extrabold ${finalResult.passed ? "text-green-700" : "text-red-700"}`}>
                  {finalResult.scorePct}%
                </div>
                <div className={`mt-1 text-sm font-semibold ${finalResult.passed ? "text-green-700" : "text-red-700"}`}>
                  {finalResult.passed ? "PASSED" : "NOT PASSED"}
                </div>
                <div className="mt-2 text-xs text-[color:var(--color-muted)]">
                  {finalResult.correct} / {finalResult.total} correct · Pass mark: {finalExam.pass_mark ?? 0}%
                </div>
              </div>

              {/* Certificate notice */}
              {finalResult.passed && certificateNotice && (
                <div
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                    certificateNotice.type === "error"
                      ? "border-red-200 bg-red-50 text-red-800"
                      : certificateNotice.type === "success"
                      ? "border-green-200 bg-green-50 text-green-800"
                      : "border-sky-200 bg-sky-50 text-sky-900"
                  }`}
                >
                  {certificateNotice.type === "success" ? <IconCheck /> : <IconWarning />}
                  <div>
                    <div className="font-semibold">{certificateNotice.message}</div>
                    <div className="mt-0.5 text-xs opacity-75">
                      Need to edit the name on your certificate? Update it in the Dashboard before downloading.
                    </div>
                  </div>
                </div>
              )}

              {/* Chapter quiz scores */}
              {chapterScores.length > 0 && (
                <div className="rounded-2xl border border-[color:var(--color-light)] bg-[color:var(--color-bg)] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[color:var(--color-light)] text-xs font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
                    Chapter Quiz Scores
                  </div>
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="border-b border-[color:var(--color-light)]">
                      <tr className="text-left">
                        <th className="px-4 py-2 font-semibold text-[color:var(--color-muted)]">Chapter</th>
                        <th className="px-4 py-2 font-semibold text-[color:var(--color-muted)]">Score</th>
                        <th className="px-4 py-2 font-semibold text-[color:var(--color-muted)] hidden sm:table-cell">Correct</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--color-light)]">
                      {chapterScores.map((r) => (
                        <tr key={r.chapterId}>
                          <td className="px-4 py-2.5 text-[color:var(--color-ink)]">{r.chapterTitle}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                              style={{ background: (r.scorePct ?? 0) >= 70 ? "#059669" : BRAND }}
                            >
                              {r.scorePct ?? "—"}%
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-[color:var(--color-muted)] hidden sm:table-cell">
                            {r.correctCount ?? "—"}/{r.totalCount ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[color:var(--color-light)] px-5 py-4">
              <Link
                href="/dashboard"
                className="rounded-xl border border-[color:var(--color-light)] px-4 py-2.5 text-sm font-medium hover:bg-[color:var(--color-bg)] transition"
              >
                My Dashboard
              </Link>
              <button
                type="button"
                onClick={() => setResultOpen(false)}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ background: BRAND }}
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
