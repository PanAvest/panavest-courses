/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * PanAvest Master Admin — Turbo Drop-in (Prices tab fixed)
 * - Stable data flow for Prices (no re-mount/focus loss)
 * - Dedicated lightweight store for price rows (decoupled from list re-fetches)
 * - Debounced search; rows memoized; keys stable
 * - Mobile-friendly layout polish (tables scroll, controls stack)
 * - No global config changes required
 */

import Image from "next/image";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

/* ╔═══════════════════════════════╗
   ║              Types            ║
   ╚═══════════════════════════════╝ */
type Knowledge = {
  id?: string;
  slug: string;
  title: string;
  description?: string | null;
  level?: string | null;
  price?: number | null; // GH₵
  cpd_points?: number | null;
  img?: string | null;
  accredited?: string[] | null;
  published?: boolean | null;
};

type AdminUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  created_at?: string | null;
  banned?: boolean | null;
};

type Chapter = {
  id?: string;
  course_id: string;
  title: string;
  order_index: number;
  created_at?: string | null;
};

type Slide = {
  id?: string;
  chapter_id: string;
  title: string;
  order_index: number;
  intro_video_url?: string | null;
  asset_url?: string | null;
  body?: string | null;
  created_at?: string | null;
};

type QuizSettings = {
  chapter_id: string;
  time_limit_seconds: number | null;
  num_questions: number | null;
};

type QuizQuestion = {
  id?: string;
  chapter_id: string;
  question: string;
  options: string[];
  correct_index: number;
  created_at?: string | null;
};

type Ebook = {
  id?: string;
  slug: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  sample_url?: string | null;
  kpf_url?: string | null;
  price_cents: number; // pesewas
  published: boolean;
  created_at?: string | null;
};

type Stats = {
  users_total: number;
  users_new_7d: number;
  courses_total: number;
  ebooks_total: number;
  orders_total: number;
  revenue_30d_ghs: number;
  top_courses: Array<{ title: string; sales: number }>;
  top_ebooks: Array<{ title: string; sales: number }>;
};

type Exam = {
  id?: string;
  course_id: string;
  title: string;
  pass_mark: number; // 0–100
  time_limit_minutes: number | null;
  created_at?: string | null;
};

type ExamQuestion = {
  id?: string;
  exam_id: string;
  question: string;
  options: string[];
  correct_index: number;
  created_at?: string | null;
};

/* ╔═══════════════════════════════╗
   ║             Utils             ║
   ╚═══════════════════════════════╝ */

const BRAND = "#0a1156";
const LIGHT = "var(--color-light, #e8ebf0)";
const MUTED = "var(--color-muted, #64748b)";
const INK = "var(--color-ink, #0f172a)";

const isStr = (x: unknown): x is string => typeof x === "string";
const num = (x: unknown, d = 0): number => {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  const n = Number(x);
  return Number.isFinite(n) ? n : d;
};
const toCsv = (v: string[] | null | undefined) => (v ?? []).join(", ");
const fromCsv = (v: string) =>
  v.split(",").map((s) => s.trim()).filter(Boolean);

/** JSON fetcher */
async function fetchJSON<T>(url: string, init?: RequestInit & { signal?: AbortSignal }): Promise<T> {
  const r = await fetch(url, { cache: "no-store", ...init });
  if (!r.ok) {
    const msg = await r.text().catch(() => "");
    throw Object.assign(new Error(msg || `Request failed: ${r.status}`), { status: r.status });
  }
  return (await r.json()) as T;
}

/** Abort helper */
function useAbortRef() {
  const ref = useRef<AbortController | null>(null);
  const next = useCallback(() => {
    ref.current?.abort();
    ref.current = new AbortController();
    return ref.current;
  }, []);
  const clear = useCallback(() => {
    ref.current?.abort();
    ref.current = null;
  }, []);
  useEffect(() => clear, [clear]);
  return { next, clear, ref };
}

/** Defensive parsers */
function asAdminUser(x: unknown): AdminUser {
  const r = x && typeof x === "object" ? (x as Record<string, unknown>) : {};
  return {
    id: String(r["id"] ?? ""),
    email: isStr(r["email"]) ? r["email"] : undefined,
    email_confirmed_at: isStr(r["email_confirmed_at"]) ? r["email_confirmed_at"] : null,
    created_at: isStr(r["created_at"]) ? r["created_at"] : null,
    banned: typeof r["banned"] === "boolean" ? r["banned"] : null,
  };
}
function asKnowledgeArray(x: unknown): Knowledge[] {
  if (!Array.isArray(x)) return [];
  return x.map((k) => {
    const r = k && typeof k === "object" ? (k as Record<string, unknown>) : {};
    return {
      id: isStr(r["id"]) ? r["id"] : undefined,
      slug: String(r["slug"] ?? ""),
      title: String(r["title"] ?? ""),
      description: isStr(r["description"]) ? r["description"] : null,
      level: isStr(r["level"]) ? r["level"] : null,
      price: typeof r["price"] === "number" ? r["price"] : null,
      cpd_points: typeof r["cpd_points"] === "number" ? r["cpd_points"] : null,
      img: isStr(r["img"]) ? r["img"] : null,
      accredited: Array.isArray(r["accredited"]) ? (r["accredited"] as string[]) : null,
      published: typeof r["published"] === "boolean" ? r["published"] : null,
    };
  });
}
function asChapters(x: unknown): Chapter[] {
  if (!Array.isArray(x)) return [];
  return x.map((c) => {
    const r = c && typeof c === "object" ? (c as Record<string, unknown>) : {};
    return {
      id: isStr(r["id"]) ? r["id"] : undefined,
      course_id: String(r["course_id"] ?? ""),
      title: String(r["title"] ?? ""),
      order_index: Number(r["order_index"] ?? 0),
      created_at: isStr(r["created_at"]) ? r["created_at"] : null,
    };
  });
}
function asSlides(x: unknown): Slide[] {
  if (!Array.isArray(x)) return [];
  return x.map((s) => {
    const r = s && typeof s === "object" ? (s as Record<string, unknown>) : {};
    return {
      id: isStr(r["id"]) ? r["id"] : undefined,
      chapter_id: String(r["chapter_id"] ?? ""),
      title: String(r["title"] ?? ""),
      order_index: Number(r["order_index"] ?? 0),
      intro_video_url: isStr(r["intro_video_url"]) ? r["intro_video_url"] : null,
      asset_url: isStr(r["asset_url"]) ? r["asset_url"] : null,
      body: isStr(r["body"]) ? r["body"] : null,
      created_at: isStr(r["created_at"]) ? r["created_at"] : null,
    };
  });
}
function asQuizSettings(x: unknown, chapterId: string): QuizSettings {
  const r = x && typeof x === "object" ? (x as Record<string, unknown>) : {};
  return {
    chapter_id: chapterId,
    time_limit_seconds: typeof r["time_limit_seconds"] === "number" ? r["time_limit_seconds"] : null,
    num_questions: typeof r["num_questions"] === "number" ? r["num_questions"] : null,
  };
}
function asQuizQuestions(x: unknown): QuizQuestion[] {
  if (!Array.isArray(x)) return [];
  return x.map((q) => {
    const r = q && typeof q === "object" ? (q as Record<string, unknown>) : {};
    const opts = Array.isArray(r["options"]) ? (r["options"] as unknown[]).map(String) : [];
    return {
      id: isStr(r["id"]) ? r["id"] : undefined,
      chapter_id: String(r["chapter_id"] ?? ""),
      question: String(r["question"] ?? ""),
      options: opts,
      correct_index: Number(r["correct_index"] ?? 0),
      created_at: isStr(r["created_at"]) ? r["created_at"] : undefined,
    };
  });
}
function asEbooks(x: unknown): Ebook[] {
  if (!Array.isArray(x)) return [];
  return x.map((e) => {
    const r = e && typeof e === "object" ? (e as Record<string, unknown>) : {};
    return {
      id: isStr(r["id"]) ? r["id"] : undefined,
      slug: String(r["slug"] ?? ""),
      title: String(r["title"] ?? ""),
      description: isStr(r["description"]) ? r["description"] : "",
      cover_url: isStr(r["cover_url"]) ? r["cover_url"] : "",
      sample_url: isStr(r["sample_url"]) ? r["sample_url"] : "",
      kpf_url: isStr(r["kpf_url"]) ? r["kpf_url"] : "",
      price_cents: num(r["price_cents"], 0),
      published: Boolean(r["published"] ?? true),
      created_at: isStr(r["created_at"]) ? r["created_at"] : null,
    };
  });
}

/* ╔═══════════════════════════════╗
   ║         UI Primitives         ║
   ╚═══════════════════════════════╝ */

type Tab = "overview" | "catalog" | "content" | "prices" | "media" | "users" | "deploy";

const Button = memo(function Button({
  children,
  onClick,
  kind = "primary",
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void | Promise<void>;
  kind?: "primary" | "ghost" | "danger" | "neutral";
  disabled?: boolean;
  title?: string;
}) {
  const cls =
    kind === "primary"
      ? `rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50`
      : kind === "danger"
      ? `rounded-lg bg-red-600 text-white px-3 py-1.5 text-sm hover:opacity-90 disabled:opacity-50`
      : kind === "neutral"
      ? `rounded-lg px-3 py-1.5 text-sm ring-1 ring-[${LIGHT}]`
      : `rounded-lg px-4 py-2 ring-1 ring-[${LIGHT}]`;
  return (
    <button className={cls} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
});

const Card = memo(function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white border border-[color:var(--color-light,#e8ebf0)]">
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <h2 className="font-semibold">{title}</h2>
        {right}
      </div>
      <div className="p-5 pt-4">{children}</div>
    </div>
  );
});

const Stat = memo(function Stat({
  label,
  value,
  foot,
}: {
  label: string;
  value: string | number;
  foot?: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-[color:var(--color-light,#e8ebf0)] p-4">
      <div className="text-xs" style={{ color: MUTED }}>
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {foot && (
        <div className="mt-1 text-xs" style={{ color: MUTED }}>
          {foot}
        </div>
      )}
    </div>
  );
});

const Sidebar = memo(function Sidebar({
  tab,
  setTab,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
}) {
  const items: { key: Tab; label: string; hint?: string }[] = [
    { key: "overview", label: "Overview", hint: "Site summary & sales" },
    { key: "catalog", label: "Catalog", hint: "Courses & e-books" },
    { key: "content", label: "Content Builder", hint: "Chapters, slides, quizzes, exam" },
    { key: "prices", label: "Prices", hint: "Quick edit all prices" },
    { key: "media", label: "Media", hint: "Upload images/files" },
    { key: "users", label: "Users", hint: "Manage & actions" },
    { key: "deploy", label: "Deploy", hint: "Trigger Vercel build" },
  ];
  return (
    <aside className="sticky top-4 self-start w-full sm:w-64 lg:w-72 rounded-2xl border border-[color:var(--color-light,#e8ebf0)] bg-white p-3">
      <div className="px-2 py-2">
        <div className="text-lg font-bold">Master Admin</div>
        <div className="text-xs mt-0.5" style={{ color: MUTED }}>
          Pick a section
        </div>
      </div>
      <nav className="mt-2 grid gap-1">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`text-left rounded-xl px-3 py-2.5 ring-1 ring-[${LIGHT}] ${
              tab === item.key ? "bg-[--panavest-brand] text-white" : "bg-white"
            }`}
            style={
              tab === item.key
                ? ({ ["--panavest-brand" as any]: BRAND } as React.CSSProperties)
                : undefined
            }
          >
            <div className="text-sm font-medium">{item.label}</div>
            {item.hint && (
              <div className="text-xs" style={{ color: tab === item.key ? "rgba(255,255,255,.85)" : MUTED }}>
                {item.hint}
              </div>
            )}
          </button>
        ))}
      </nav>
      <div className="mt-3 rounded-xl p-3" style={{ background: "rgba(232,235,240,.35)" }}>
        <div className="text-xs font-semibold">Help</div>
        <ul className="mt-1.5 text-xs list-disc ms-4 space-y-1" style={{ color: MUTED }}>
          <li>
            Use <code>.env.local</code> for <strong>ADMIN_USER/PASS</strong>.
          </li>
          <li>Set Supabase keys/URL before Deploy.</li>
          <li>E-book prices are in GH₵ (stored as pesewas).</li>
        </ul>
      </div>
    </aside>
  );
});

/* ╔═══════════════════════════════╗
   ║           Component           ║
   ╚═══════════════════════════════╝ */

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [isPending, startTransition] = useTransition();

  /** ---------- OVERVIEW (lazy) ---------- */
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsErr, setStatsErr] = useState<string | null>(null);
  const statsAbort = useAbortRef();

  const loadStats = useCallback(async () => {
    const ac = statsAbort.next();
    setStatsErr(null);
    try {
      const d = await fetchJSON<Partial<Stats & { revenue_30d_usd?: number }>>("/api/admin/stats", {
        signal: ac.signal,
      });
      setStats({
        users_total: num(d?.users_total, 0),
        users_new_7d: num(d?.users_new_7d, 0),
        courses_total: num(d?.courses_total, 0),
        ebooks_total: num(d?.ebooks_total, 0),
        orders_total: num(d?.orders_total, 0),
        revenue_30d_ghs: num(d?.revenue_30d_ghs ?? d?.revenue_30d_usd, 0),
        top_courses: Array.isArray(d?.top_courses) ? d.top_courses : [],
        top_ebooks: Array.isArray(d?.top_ebooks) ? d.top_ebooks : [],
      });
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      if (e?.status === 404) {
        setStats(null);
        setStatsErr("Stats endpoint not found. You can keep using the dashboard without it.");
      } else setStatsErr("Failed to load stats.");
    }
  }, [statsAbort]);

  useEffect(() => {
    if (tab === "overview") void loadStats();
  }, [tab, loadStats]);

  /** ---------- CATALOG / CONTENT shared data ---------- */
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const knowledgeAbort = useAbortRef();

  const refreshKnowledge = useCallback(async () => {
    const ac = knowledgeAbort.next();
    const d = await fetchJSON<unknown>("/api/admin/knowledge", { signal: ac.signal });
    setKnowledge(asKnowledgeArray(d));
  }, [knowledgeAbort]);

  useEffect(() => {
    if (tab === "catalog" || tab === "content" || tab === "prices") {
      void refreshKnowledge();
    }
  }, [tab, refreshKnowledge]);

  /** ---------- CATALOG: course + ebook forms ---------- */
  const [kForm, setKForm] = useState<Knowledge>({
    slug: "",
    title: "",
    description: "",
    level: "",
    price: null,
    cpd_points: null,
    img: "",
    accredited: [],
    published: true,
  });
  const [savingK, setSavingK] = useState(false);

  const saveKnowledge = useCallback(async () => {
    if (!kForm.slug.trim() || !kForm.title.trim()) {
      alert("Slug & Title required");
      return;
    }
    setSavingK(true);
    try {
      const payload: Knowledge = { ...kForm, accredited: fromCsv(toCsv(kForm.accredited ?? [])) };
      await fetchJSON("/api/admin/knowledge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      setKForm({
        slug: "",
        title: "",
        description: "",
        level: "",
        price: null,
        cpd_points: null,
        img: "",
        accredited: [],
        published: true,
      });
      await refreshKnowledge();
    } catch {
      alert("Save failed");
    } finally {
      setSavingK(false);
    }
  }, [kForm, refreshKnowledge]);

  /** ---------- CONTENT BUILDER ---------- */
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const selectedCourse = useMemo(
    () => knowledge.find((k) => (k.id ?? "") === selectedCourseId) ?? null,
    [knowledge, selectedCourseId]
  );

  const emptyChapter: Chapter = { course_id: "", title: "", order_index: 0 };
  const emptySlide: Slide = {
    chapter_id: "",
    title: "",
    order_index: 0,
    intro_video_url: "",
    asset_url: "",
    body: "",
  };

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chForm, setChForm] = useState<Chapter>(emptyChapter);

  const [slides, setSlides] = useState<Slide[]>([]);
  const [slForm, setSlForm] = useState<Slide>(emptySlide);

  const [quizSettings, setQuizSettings] = useState<QuizSettings>({
    chapter_id: "",
    time_limit_seconds: 120,
    num_questions: null,
  });
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [qForm, setQForm] = useState<QuizQuestion>({
    chapter_id: "",
    question: "",
    options: [],
    correct_index: 0,
  });

  const [exam, setExam] = useState<Exam | null>(null);
  const [examForm, setExamForm] = useState<Exam>({
    course_id: "",
    title: "Final Exam",
    pass_mark: 60,
    time_limit_minutes: 30,
  });
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [eqForm, setEqForm] = useState<ExamQuestion>({
    exam_id: "",
    question: "",
    options: [],
    correct_index: 0,
  });

  const chaptersAbort = useAbortRef();
  const slidesAbort = useAbortRef();
  const quizAbort = useAbortRef();
  const examAbort = useAbortRef();

  const refreshChapters = useCallback(
    async (courseId: string) => {
      const ac = chaptersAbort.next();
      if (!courseId) {
        setChapters([]);
        setChForm({ ...emptyChapter, course_id: "" });
        return;
      }
      const d = await fetchJSON<unknown>(`/api/admin/chapters?course_id=${encodeURIComponent(courseId)}`, {
        signal: ac.signal,
      });
      const rows = asChapters(d);
      if (courseId !== selectedCourseId) return; // stale
      setChapters(rows);
      const kept = rows.find((c) => c.id === chForm.id);
      if (kept) setChForm(kept);
      else if (rows[0]) setChForm(rows[0]);
      else {
        setChForm({ ...emptyChapter, course_id: courseId });
        setSlides([]);
        setQuizSettings({ chapter_id: "", time_limit_seconds: 120, num_questions: null });
        setQuestions([]);
        setQForm({ chapter_id: "", question: "", options: [], correct_index: 0 });
      }
    },
    [chaptersAbort, selectedCourseId, chForm.id]
  );

  const refreshSlides = useCallback(
    async (chapterId: string) => {
      const ac = slidesAbort.next();
      if (!chapterId) {
        setSlides([]);
        return;
      }
      const d = await fetchJSON<unknown>(`/api/admin/slides?chapter_id=${encodeURIComponent(chapterId)}`, {
        signal: ac.signal,
      });
      if (chapterId !== (chForm.id ?? "")) return;
      setSlides(asSlides(d));
    },
    [slidesAbort, chForm.id]
  );

  const refreshQuiz = useCallback(
    async (chapterId: string) => {
      const ac = quizAbort.next();
      if (!chapterId) {
        setQuizSettings({ chapter_id: "", time_limit_seconds: 120, num_questions: null });
        setQuestions([]);
        setQForm({ chapter_id: "", question: "", options: [], correct_index: 0 });
        return;
      }
      const d1 = await fetch(`/api/admin/quiz-settings?chapter_id=${encodeURIComponent(chapterId)}`, {
        cache: "no-store",
        signal: ac.signal,
      });
      const js1 = d1.ok ? await d1.json() : {};
      if (chapterId === (chForm.id ?? "")) setQuizSettings(asQuizSettings(js1 ?? {}, chapterId));

      const d2 = await fetch(`/api/admin/quiz-questions?chapter_id=${encodeURIComponent(chapterId)}`, {
        cache: "no-store",
        signal: ac.signal,
      });
      const js2 = d2.ok ? await d2.json() : [];
      if (chapterId === (chForm.id ?? "")) {
        setQuestions(asQuizQuestions(js2));
        setQForm((f) => ({ ...f, chapter_id: chapterId }));
      }
    },
    [quizAbort, chForm.id]
  );

  const refreshExam = useCallback(
    async (courseId: string) => {
      const ac = examAbort.next();
      if (!courseId) {
        setExam(null);
        setExamQuestions([]);
        return;
      }
      try {
        const d = await fetchJSON<Partial<Exam> | null>(`/api/admin/exams?course_id=${encodeURIComponent(courseId)}`, {
          signal: ac.signal,
        });
        if (courseId !== selectedCourseId) return;
        if (d && d.course_id) {
          const ex: Exam = {
            id: isStr((d as any).id) ? (d as any).id : undefined,
            course_id: String((d as any).course_id),
            title: isStr((d as any).title) ? (d as any).title : "Final Exam",
            pass_mark: num((d as any).pass_mark, 60),
            time_limit_minutes: typeof (d as any).time_limit_minutes === "number" ? (d as any).time_limit_minutes : 30,
            created_at: isStr((d as any).created_at) ? (d as any).created_at : null,
          };
          setExam(ex);
          setExamForm(ex);

          const qs = await fetchJSON<unknown>(`/api/admin/exam-questions?exam_id=${encodeURIComponent(ex.id ?? "")}`, {
            signal: ac.signal,
          });
          const arr: ExamQuestion[] = Array.isArray(qs)
            ? (qs as any[]).map((q) => ({
                id: isStr(q.id) ? q.id : undefined,
                exam_id: String(q.exam_id ?? ""),
                question: String(q.question ?? ""),
                options: Array.isArray(q.options) ? q.options.map(String) : [],
                correct_index: num(q.correct_index, 0),
                created_at: isStr(q.created_at) ? q.created_at : undefined,
              }))
            : [];
          setExamQuestions(arr);
          setEqForm((f) => ({ ...f, exam_id: ex.id ?? "" }));
        } else {
          setExam(null);
          setExamQuestions([]);
          setExamForm({ course_id: courseId, title: "Final Exam", pass_mark: 60, time_limit_minutes: 30 });
          setEqForm({ exam_id: "", question: "", options: [], correct_index: 0 });
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setExam(null);
        setExamQuestions([]);
      }
    },
    [examAbort, selectedCourseId]
  );

  useEffect(() => {
    if (tab !== "content") return;
    if (!selectedCourseId) {
      setChapters([]);
      setChForm({ ...emptyChapter, course_id: "" });
      setSlides([]);
      setSlForm({ ...emptySlide, chapter_id: "" });
      setQuizSettings({ chapter_id: "", time_limit_seconds: 120, num_questions: null });
      setQuestions([]);
      setQForm({ chapter_id: "", question: "", options: [], correct_index: 0 });
      setExam(null);
      setExamQuestions([]);
      setExamForm({ course_id: "", title: "Final Exam", pass_mark: 60, time_limit_minutes: 30 });
      setEqForm({ exam_id: "", question: "", options: [], correct_index: 0 });
      return;
    }
    void refreshChapters(selectedCourseId);
    void refreshExam(selectedCourseId);
  }, [tab, selectedCourseId, refreshChapters, refreshExam]);

  useEffect(() => {
    const id = chForm.id ?? "";
    if (!id) return;
    void refreshSlides(id);
    void refreshQuiz(id);
    setSlForm((s) => ({ ...s, chapter_id: id }));
  }, [chForm.id, refreshSlides, refreshQuiz]);

  const saveChapter = useCallback(async () => {
    if (!selectedCourseId || !chForm.title.trim()) {
      alert("Course & Title required");
      return;
    }
    await fetchJSON("/api/admin/chapters", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: chForm.id,
        course_id: selectedCourseId,
        title: chForm.title.trim(),
        order_index: Number.isFinite(chForm.order_index) ? chForm.order_index : 0,
      }),
    });
    await refreshChapters(selectedCourseId);
  }, [selectedCourseId, chForm, refreshChapters]);

  const saveSlide = useCallback(async () => {
    if (!slForm.chapter_id || !slForm.title.trim()) {
      alert("Chapter & Title required");
      return;
    }
    await fetchJSON("/api/admin/slides", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: slForm.id || undefined,
        chapter_id: slForm.chapter_id,
        title: slForm.title.trim(),
        order_index: Number.isFinite(slForm.order_index) ? Number(slForm.order_index) : 0,
        intro_video_url: slForm.intro_video_url?.trim() || null,
        asset_url: slForm.asset_url?.trim() || null,
        body: slForm.body?.trim() || null,
      }),
    });
    await refreshSlides(slForm.chapter_id);
  }, [slForm, refreshSlides]);

  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>("");

  const uploadToStorage = useCallback(async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", file.name);
    const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
    if (!r.ok) return null;
    const d = (await r.json()) as Record<string, unknown>;
    const url = d?.["publicUrl"];
    return isStr(url) ? url : null;
  }, []);

  const onPick = useCallback(
    async (file: File, target: "intro" | "asset") => {
      setUploading(true);
      const url = await uploadToStorage(file);
      setUploading(false);
      if (!url) {
        alert("Upload failed");
        return;
      }
      if (target === "intro") setSlForm((f) => ({ ...f, intro_video_url: url }));
      else setSlForm((f) => ({ ...f, asset_url: url }));
      setUploadedUrl(url);
    },
    [uploadToStorage]
  );

  const [quizSaving, setQuizSaving] = useState(false);
  const saveQuizSettings = useCallback(async () => {
    if (!quizSettings.chapter_id) {
      alert("Pick a chapter");
      return;
    }
    setQuizSaving(true);
    try {
      const saved = await fetchJSON<unknown>("/api/admin/quiz-settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(quizSettings),
      });
      setQuizSettings(asQuizSettings(saved, quizSettings.chapter_id));
    } finally {
      setQuizSaving(false);
    }
  }, [quizSettings]);

  const saveQuestion = useCallback(async () => {
    if (!qForm.chapter_id || !qForm.question.trim()) {
      alert("Chapter & Question required");
      return;
    }
    if ((qForm.options?.length ?? 0) < 2) {
      alert("At least 2 options");
      return;
    }
    if (qForm.correct_index < 0 || qForm.correct_index >= qForm.options.length) {
      alert("Correct index out of range");
      return;
    }
    await fetchJSON("/api/admin/quiz-questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(qForm),
    });
    await refreshQuiz(qForm.chapter_id);
    setQForm({ chapter_id: qForm.chapter_id, question: "", options: [], correct_index: 0, id: undefined });
  }, [qForm, refreshQuiz]);

  const deleteQuestion = useCallback(
    async (id?: string) => {
      if (!id) return;
      if (!confirm("Delete this question?")) return;
      await fetchJSON(`/api/admin/quiz-questions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await refreshQuiz(quizSettings.chapter_id);
    },
    [quizSettings.chapter_id, refreshQuiz]
  );

  const saveExam = useCallback(async () => {
    if (!selectedCourseId) return;
    await fetchJSON("/api/admin/exams", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...examForm, course_id: selectedCourseId }),
    });
    await refreshExam(selectedCourseId);
  }, [selectedCourseId, examForm, refreshExam]);

  const saveExamQuestion = useCallback(
    async (examId?: string) => {
      if (!examId) return;
      if (!eqForm.question.trim() || (eqForm.options?.length ?? 0) < 2) {
        alert("Provide question + at least 2 options");
        return;
      }
      if (eqForm.correct_index < 0 || eqForm.correct_index >= eqForm.options.length) {
        alert("Correct index out of range");
        return;
      }
      await fetchJSON("/api/admin/exam-questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...eqForm, exam_id: examId }),
      });
      await refreshExam(selectedCourseId);
      setEqForm({ exam_id: examId, question: "", options: [], correct_index: 0, id: undefined });
    },
    [eqForm, selectedCourseId, refreshExam]
  );

  const deleteExamQuestion = useCallback(
    async (q: ExamQuestion) => {
      if (!q.id) return;
      if (!confirm("Delete this question?")) return;
      await fetchJSON(`/api/admin/exam-questions?id=${encodeURIComponent(q.id)}`, { method: "DELETE" });
      await refreshExam(selectedCourseId);
    },
    [selectedCourseId, refreshExam]
  );

  /** ---------- EBOOKS ---------- */
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [ebookForm, setEbookForm] = useState<Ebook>({
    slug: "",
    title: "",
    description: "",
    cover_url: "",
    sample_url: "",
    kpf_url: "",
    price_cents: 0,
    published: true,
  });
  const [savingEbook, setSavingEbook] = useState(false);
  const [loadingEbooks, setLoadingEbooks] = useState(false);
  const ebooksAbort = useAbortRef();

  const refreshEbooks = useCallback(async () => {
    const ac = ebooksAbort.next();
    setLoadingEbooks(true);
    try {
      const d = await fetchJSON<unknown>("/api/admin/ebooks", { signal: ac.signal });
      setEbooks(asEbooks(d));
    } finally {
      setLoadingEbooks(false);
    }
  }, [ebooksAbort]);

  useEffect(() => {
    if (tab === "catalog" || tab === "prices") void refreshEbooks();
  }, [tab, refreshEbooks]);

  const saveEbook = useCallback(async () => {
    if (!ebookForm.slug.trim() || !ebookForm.title.trim()) {
      alert("Slug & Title required");
      return;
    }
    setSavingEbook(true);
    try {
      const payload: Ebook = {
        ...ebookForm,
        price_cents: Math.round(num(ebookForm.price_cents, 0)),
        cover_url: ebookForm.cover_url?.trim() || null,
        sample_url: ebookForm.sample_url?.trim() || null,
        kpf_url: ebookForm.kpf_url?.trim() || null,
      } as unknown as Ebook;
      await fetchJSON("/api/admin/ebooks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      setEbookForm({
        slug: "",
        title: "",
        description: "",
        cover_url: "",
        sample_url: "",
        kpf_url: "",
        price_cents: 0,
        published: true,
      });
      await refreshEbooks();
    } catch {
      alert("Save e-book failed");
    } finally {
      setSavingEbook(false);
    }
  }, [ebookForm, refreshEbooks]);

  const deleteEbook = useCallback(
    async (id?: string) => {
      if (!id) return;
      if (!confirm("Delete e-book?")) return;
      await fetchJSON(`/api/admin/ebooks/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (ebookForm.id === id)
        setEbookForm({
          slug: "",
          title: "",
          description: "",
          cover_url: "",
          sample_url: "",
          kpf_url: "",
          price_cents: 0,
          published: true,
        });
      await refreshEbooks();
    },
    [ebookForm.id, refreshEbooks]
  );

  const onPickEbook = useCallback(
    async (file: File, field: "cover_url" | "sample_url" | "kpf_url") => {
      setUploading(true);
      const url = await uploadToStorage(file);
      setUploading(false);
      if (!url) {
        alert("Upload failed");
        return;
      }
      setEbookForm((f) => ({ ...f, [field]: url }));
    },
    [uploadToStorage]
  );

  /** ---------- USERS ---------- */
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedPurchases, setSelectedPurchases] = useState<{
    courses: Array<{ title: string }>;
    ebooks: Array<{ title: string }>;
  } | null>(null);
  const usersAbort = useAbortRef();

  const refreshUsers = useCallback(async () => {
    const ac = usersAbort.next();
    setUsersLoading(true);
    try {
      const d = await fetchJSON<any>("/api/admin/users", { signal: ac.signal });
      const arr = Array.isArray(d?.users) ? d.users : [];
      setUsers(arr.map(asAdminUser));
    } finally {
      setUsersLoading(false);
    }
  }, [usersAbort]);

  useEffect(() => {
    if (tab === "users") void refreshUsers();
  }, [tab, refreshUsers]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.email ?? u.id).toLowerCase().includes(q));
  }, [userQuery, users]);

  const generateConfirmLink = useCallback(async (email?: string) => {
    if (!email) return;
    const d = await fetchJSON<Record<string, unknown>>("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "generate_confirmation_link", email }),
    });
    const link = d?.["link"];
    if (isStr(link)) {
      await navigator.clipboard.writeText(link);
      alert("Confirmation link copied");
    } else {
      alert("Could not generate link");
    }
  }, []);

  const generateResetLink = useCallback(async (email?: string) => {
    if (!email) return;
    const d = await fetchJSON<Record<string, unknown>>("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "generate_reset_link", email }),
    });
    const link = d?.["link"];
    if (isStr(link)) {
      await navigator.clipboard.writeText(link);
      alert("Reset link copied");
    } else {
      alert("Could not generate link");
    }
  }, []);

  type UserAction = "ban" | "unban" | "revoke" | "clear-history" | "delete";
  const [userActionBusy, setUserActionBusy] = useState<string | null>(null);

  const act = useCallback(
    async (userId: string, endpoint: UserAction) => {
      if (endpoint === "delete" && !confirm("Permanently delete this user?")) return;
      setUserActionBusy(`${endpoint}:${userId}`);
      try {
        const url = `/api/admin/users/${encodeURIComponent(userId)}/${endpoint}`;
        const r = await fetch(url, { method: "POST" });
        if (!r.ok) {
          const msg = await r.text().catch(() => "");
          throw new Error(msg || `Failed to ${endpoint.replace("-", " ")}`);
        }
        await refreshUsers();
        if (selectedUser?.id === userId && (endpoint === "ban" || endpoint === "unban")) {
          setSelectedUser((su) => (su ? { ...su, banned: endpoint === "ban" } : su));
        }
        if (endpoint === "delete" && selectedUser?.id === userId) {
          setSelectedUser(null);
          setSelectedPurchases(null);
        }
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : "Action failed");
      } finally {
        setUserActionBusy(null);
      }
    },
    [refreshUsers, selectedUser]
  );

  const loadPurchases = useCallback(async (userId: string) => {
    const r = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/purchases`, { cache: "no-store" });
    if (!r.ok) {
      setSelectedPurchases({ courses: [], ebooks: [] });
      return;
    }
    const d = (await r.json()) as Record<string, unknown>;
    const courses = Array.isArray(d?.["courses"]) ? (d["courses"] as any[]) : [];
    const ebooks = Array.isArray(d?.["ebooks"]) ? (d["ebooks"] as any[]) : [];
    setSelectedPurchases({ courses, ebooks });
  }, []);

  /** ---------- PRICES (FIXED) ---------- */
  // We keep a local “store” of price rows that only updates when upstream data actually changes,
  // avoiding re-mounts while typing or focusing inputs.

  type PriceRowT = { kind: "course" | "ebook"; id: string; title: string; price: number; currency: "GHS" };

  const [priceSearch, setPriceSearch] = useState("");
  const [priceRowsStore, setPriceRowsStore] = useState<PriceRowT[]>([]);

  // Build canonical rows when knowledge/ebooks change (tab enter or refresh)
  const canonicalRows = useMemo<PriceRowT[]>(() => {
    const rows: PriceRowT[] = [];
    for (const k of knowledge) {
      rows.push({
        kind: "course",
        id: (k.id ?? k.slug) || k.slug,
        title: k.title,
        price: k.price ?? 0,
        currency: "GHS",
      });
    }
    for (const e of ebooks) {
      rows.push({
        kind: "ebook",
        id: (e.id ?? e.slug) || e.slug,
        title: e.title,
        price: (e.price_cents ?? 0) / 100,
        currency: "GHS",
      });
    }
    return rows;
  }, [knowledge, ebooks]);

  // Sync store only when canonical values change (deep-ish compare by id+price)
  useEffect(() => {
    setPriceRowsStore((prev) => {
      const mapPrev = new Map(prev.map((r) => [r.kind + ":" + r.id, r]));
      const next: PriceRowT[] = canonicalRows.map((r) => {
        const key = r.kind + ":" + r.id;
        const old = mapPrev.get(key);
        // preserve current edited value (if user was typing) by preferring old.price
        return old ? { ...r, price: old.price } : r;
      });
      return next;
    });
  }, [canonicalRows]);

  // Debounced search query (smooth typing)
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(priceSearch.trim().toLowerCase()), 120);
    return () => clearTimeout(t);
  }, [priceSearch]);

  const visibleRows = useMemo(() => {
    if (!debouncedQ) return priceRowsStore;
    return priceRowsStore.filter((r) => r.title.toLowerCase().includes(debouncedQ));
  }, [priceRowsStore, debouncedQ]);

  const mutateRowPrice = useCallback((key: string, nextVal: number | null) => {
    setPriceRowsStore((rows) =>
      rows.map((r) => (r.kind + ":" + r.id === key ? { ...r, price: nextVal ?? r.price } : r))
    );
  }, []);

  const savePrice = useCallback(
    async (row: PriceRowT) => {
      if (row.kind === "course") {
        const item = knowledge.find((k) => (k.id ?? k.slug) === row.id);
        if (!item) return;
        const payload = { ...item, price: row.price };
        await fetchJSON("/api/admin/knowledge", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        await refreshKnowledge(); // upstream sync (store preserves current inputs)
      } else {
        const item = ebooks.find((e) => (e.id ?? e.slug) === row.id);
        if (!item) return;
        const payload = { ...item, price_cents: Math.round(row.price * 100) };
        await fetchJSON("/api/admin/ebooks", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        await refreshEbooks(); // upstream sync
      }
    },
    [knowledge, ebooks, refreshKnowledge, refreshEbooks]
  );

  /** ---------- DEPLOY ---------- */
  const triggerDeploy = useCallback(async () => {
    const r = await fetch("/api/admin/deploy", { method: "POST" });
    const d = (await r.json()) as Record<string, unknown>;
    const ok = d?.["ok"];
    const text = d?.["text"];
    alert(ok ? "Deploy triggered" : `Failed: ${String(text ?? "Unknown error")}`);
  }, []);

  /* ╔═══════════════════════════════╗
     ║             Render            ║
     ╚═══════════════════════════════╝ */

  return (
    <div className="mx-auto max-w-screen-2xl px-4 md:px-6 py-6 grid gap-6 sm:grid-cols-[minmax(220px,280px)_1fr]">
      <Sidebar tab={tab} setTab={(t) => startTransition(() => setTab(t))} />

      <main className="grid gap-6">
        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="grid gap-6">
            {!stats && !statsErr && (
              <div className="text-sm" style={{ color: MUTED }}>
                Loading stats…
              </div>
            )}
            {statsErr && <div className="text-sm text-red-600">{statsErr}</div>}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
              <Stat label="Total Users" value={stats?.users_total ?? "—"} foot={`+${stats?.users_new_7d ?? 0} in last 7 days`} />
              <Stat label="Courses" value={stats?.courses_total ?? "—"} />
              <Stat label="E-Books" value={stats?.ebooks_total ?? "—"} />
              <Stat label="Orders" value={stats?.orders_total ?? "—"} />
              <Stat label="Revenue (30d)" value={`GH₵${(stats?.revenue_30d_ghs ?? 0).toLocaleString()}`} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Top Courses (by sales)">
                <div className="grid gap-2">
                  {(stats?.top_courses ?? []).map((c, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg p-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]">
                      <div className="text-sm">{c.title}</div>
                      <div className="text-xs" style={{ color: MUTED }}>
                        {c.sales} sales
                      </div>
                    </div>
                  ))}
                  {(stats?.top_courses?.length ?? 0) === 0 && (
                    <div className="text-sm" style={{ color: MUTED }}>
                      No data.
                    </div>
                  )}
                </div>
              </Card>
              <Card title="Top E-Books (by sales)">
                <div className="grid gap-2">
                  {(stats?.top_ebooks ?? []).map((e, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg p-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]">
                      <div className="text-sm">{e.title}</div>
                      <div className="text-xs" style={{ color: MUTED }}>
                        {e.sales} sales
                      </div>
                    </div>
                  ))}
                  {(stats?.top_ebooks?.length ?? 0) === 0 && (
                    <div className="text-sm" style={{ color: MUTED }}>
                      No data.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* CATALOG */}
        {tab === "catalog" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Course — Create / Edit" right={<span className="text-xs" style={{ color: MUTED }}>All fields can be edited later</span>}>
              <div className="grid gap-3">
                {[
                  ["slug", "Slug (unique, URL-safe)"],
                  ["title", "Title"],
                  ["description", "Description"],
                  ["level", "Level"],
                ].map(([k, label]) => (
                  <label key={k} className="grid gap-1">
                    <span className="text-xs" style={{ color: MUTED }}>{label}</span>
                    <input
                      value={(kForm as Record<string, unknown>)[k] as string | undefined ?? ""}
                      onChange={(e) => setKForm((f) => ({ ...f, [k]: (e.target as HTMLInputElement).value }))}
                      className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                    />
                  </label>
                ))}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs" style={{ color: MUTED }}>Price (GH₵)</span>
                    <input
                      type="number"
                      value={kForm.price ?? ""}
                      onChange={(e) =>
                        setKForm((f) => ({
                          ...f,
                          price: (e.target as HTMLInputElement).value === "" ? null : Number((e.target as HTMLInputElement).value),
                        }))
                      }
                      className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs" style={{ color: MUTED }}>CPPD Points</span>
                    <input
                      type="number"
                      value={kForm.cpd_points ?? ""}
                      onChange={(e) =>
                        setKForm((f) => ({
                          ...f,
                          cpd_points: (e.target as HTMLInputElement).value === "" ? null : Number((e.target as HTMLInputElement).value),
                        }))
                      }
                      className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                    />
                  </label>
                </div>
                <label className="grid gap-1">
                  <span className="text-xs" style={{ color: MUTED }}>Image URL (cover)</span>
                  <input
                    value={kForm.img ?? ""}
                    onChange={(e) => setKForm((f) => ({ ...f, img: (e.target as HTMLInputElement).value }))}
                    className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs" style={{ color: MUTED }}>Accredited (comma separated)</span>
                  <input
                    value={toCsv(kForm.accredited ?? [])}
                    onChange={(e) => setKForm((f) => ({ ...f, accredited: fromCsv((e.target as HTMLInputElement).value) }))}
                    className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                  />
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={kForm.published ?? true}
                    onChange={(e) => setKForm((f) => ({ ...f, published: (e.target as HTMLInputElement).checked }))}
                  />
                  <span className="text-sm">Published</span>
                </label>
                <div className="flex items-center gap-2">
                  <Button onClick={() => startTransition(saveKnowledge)} disabled={savingK}>
                    {savingK ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    kind="neutral"
                    onClick={() =>
                      setKForm({
                        slug: "",
                        title: "",
                        description: "",
                        level: "",
                        price: null,
                        cpd_points: null,
                        img: "",
                        accredited: [],
                        published: true,
                      })
                    }
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </Card>

            <Card title="Courses List" right={<Button kind="neutral" onClick={() => void refreshKnowledge()}>Refresh</Button>}>
              <div className="grid gap-2">
                {knowledge.map((k) => (
                  <div key={k.id ?? k.slug} className="flex items-start justify-between gap-3 rounded-lg p-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]">
                    <div className="text-sm">
                      <div className="font-semibold">{k.title}</div>
                      <div className="text-xs" style={{ color: MUTED }}>
                        /{k.slug} · {k.level ?? "—"} · GH₵{k.price ?? 0} · {k.published ? "Published" : "Draft"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button kind="neutral" onClick={() => setKForm(k)}>Edit</Button>
                    </div>
                  </div>
                ))}
                {knowledge.length === 0 && (
                  <div className="text-sm" style={{ color: MUTED }}>
                    No courses yet.
                  </div>
                )}
              </div>
            </Card>

            <Card title="E-book — Create / Edit (GH₵)">
              <div className="grid gap-3">
                <label className="grid gap-1">
                  <span className="text-xs" style={{ color: MUTED }}>Slug</span>
                  <input
                    value={ebookForm.slug}
                    onChange={(e) => setEbookForm((f) => ({ ...f, slug: (e.target as HTMLInputElement).value }))}
                    className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs" style={{ color: MUTED }}>Title</span>
                  <input
                    value={ebookForm.title}
                    onChange={(e) => setEbookForm((f) => ({ ...f, title: (e.target as HTMLInputElement).value }))}
                    className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs" style={{ color: MUTED }}>Description</span>
                  <textarea
                    value={ebookForm.description ?? ""}
                    onChange={(e) => setEbookForm((f) => ({ ...f, description: (e.target as HTMLTextAreaElement).value }))}
                    className="min-h-[90px] rounded-lg bg-white px-3 py-2 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs" style={{ color: MUTED }}>Price (GH₵)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={(ebookForm.price_cents / 100).toString()}
                      onChange={(e) => {
                        const cents = Math.round(Number((e.target as HTMLInputElement).value || 0) * 100);
                        setEbookForm((f) => ({ ...f, price_cents: Number.isFinite(cents) ? cents : 0 }));
                      }}
                      className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                    />
                  </label>
                  <label className="inline-flex items-center gap-2 mt-6 sm:mt-0">
                    <input
                      type="checkbox"
                      checked={ebookForm.published}
                      onChange={(e) => setEbookForm((f) => ({ ...f, published: (e.target as HTMLInputElement).checked }))}
                    />
                    <span className="text-sm">Published</span>
                  </label>
                </div>

                {([
                  ["cover_url", "Cover URL", "image/*"] as const,
                  ["sample_url", "Sample URL (image/pdf)", "image/*,application/pdf"] as const,
                  ["kpf_url", "KPF URL", ".kpf,application/octet-stream"] as const,
                ]).map(([field, label, accept]) => (
                  <div key={field} className="grid gap-1">
                    <span className="text-xs" style={{ color: MUTED }}>{label}</span>
                    <input
                      value={(ebookForm as Record<string, unknown>)[field] as string | undefined ?? ""}
                      onChange={(e) => setEbookForm((f) => ({ ...f, [field]: (e.target as HTMLInputElement).value }))}
                      className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                    />
                    <input
                      type="file"
                      accept={accept}
                      onChange={(e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) void onPickEbook(file, field as "cover_url" | "sample_url" | "kpf_url");
                      }}
                    />
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Button onClick={() => startTransition(saveEbook)} disabled={savingEbook}>
                    {savingEbook ? "Saving…" : "Save E-book"}
                  </Button>
                  <Button
                    kind="neutral"
                    onClick={() =>
                      setEbookForm({
                        slug: "",
                        title: "",
                        description: "",
                        cover_url: "",
                        sample_url: "",
                        kpf_url: "",
                        price_cents: 0,
                        published: true,
                      })
                    }
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </Card>

            <Card title="E-books List" right={<Button kind="neutral" onClick={() => void refreshEbooks()}>{loadingEbooks ? "Refreshing…" : "Refresh"}</Button>}>
              <div className="grid gap-2">
                {ebooks.map((e) => (
                  <div key={e.id ?? e.slug} className="flex items-start justify-between gap-3 rounded-lg p-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]">
                    <div className="flex items-start gap-3">
                      {e.cover_url ? (
                        <Image
                          src={e.cover_url}
                          alt={e.title}
                          width={56}
                          height={56}
                          className="rounded-md ring-1 ring-[color:var(--color-light,#e8ebf0)] object-cover"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-md" style={{ background: "rgba(232,235,240,.4)" }} />
                      )}
                      <div className="text-sm">
                        <div className="font-semibold">{e.title}</div>
                        <div className="text-xs" style={{ color: MUTED }}>
                          /{e.slug} · GH₵{(e.price_cents / 100).toLocaleString()} · {e.published ? "Published" : "Draft"}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button kind="neutral" onClick={() => setEbookForm(e)}>Edit</Button>
                      <Button kind="danger" onClick={() => void deleteEbook(e.id)}>Delete</Button>
                    </div>
                  </div>
                ))}
                {ebooks.length === 0 && (
                  <div className="text-sm" style={{ color: MUTED }}>
                    No e-books yet.
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* CONTENT (Final Exam included) */}
        {tab === "content" && (
          <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
            {/* Picker */}
            <Card title="Pick Course">
              <select
                className="h-10 w-full rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                value={selectedCourseId}
                onChange={(e) => startTransition(() => setSelectedCourseId((e.target as HTMLSelectElement).value))}
              >
                <option value="">— Choose a course —</option>
                {knowledge.map((k) => (
                  <option key={k.id ?? k.slug} value={k.id}>
                    {k.title}
                  </option>
                ))}
              </select>

              {selectedCourse && (
                <div className="mt-4 grid gap-2">
                  <div className="text-sm font-semibold">Chapters</div>
                  {chapters.map((ch) => (
                    <button
                      key={ch.id ?? ch.title}
                      onClick={() => setChForm(ch)}
                      className={`text-left rounded-lg px-3 py-2 ring-1 ring-[color:var(--color-light,#e8ebf0)] ${
                        chForm.id === (ch.id ?? "") ? "bg-[rgba(232,235,240,.4)]" : "bg-white"
                      }`}
                    >
                      <div className="font-medium">{ch.title}</div>
                      <div className="text-xs" style={{ color: MUTED }}>
                        Order: {ch.order_index}
                      </div>
                    </button>
                  ))}
                  {chapters.length === 0 && (
                    <div className="text-xs" style={{ color: MUTED }}>
                      No chapters yet.
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Builder */}
            <div className="grid gap-6">
              <Card title="Chapter">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs" style={{ color: MUTED }}>Title</span>
                    <input
                      value={chForm.title}
                      onChange={(e) => setChForm((f) => ({ ...f, title: (e.target as HTMLInputElement).value }))}
                      className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs" style={{ color: MUTED }}>Order</span>
                    <input
                      type="number"
                      value={chForm.order_index}
                      onChange={(e) =>
                        setChForm((f) => ({ ...f, order_index: Number((e.target as HTMLInputElement).value || 0) }))
                      }
                      className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                    />
                  </label>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button onClick={() => void saveChapter()}>Save Chapter</Button>
                  <Button kind="neutral" onClick={() => setChForm({ ...emptyChapter, course_id: selectedCourseId || "" })}>
                    New Chapter
                  </Button>
                </div>
              </Card>

              <Card title="Slides (for this chapter)">
                <div className="grid gap-2">
                  {slides.map((s) => (
                    <button
                      key={s.id ?? s.title}
                      onClick={() => setSlForm(s)}
                      className={`text-left rounded-lg px-3 py-2 ring-1 ring-[color:var(--color-light,#e8ebf0)] ${
                        slForm.id === (s.id ?? "") ? "bg-[rgba(232,235,240,.4)]" : "bg-white"
                      }`}
                    >
                      <div className="font-medium">{s.title}</div>
                      <div className="text-xs" style={{ color: MUTED }}>
                        Order: {s.order_index}
                      </div>
                    </button>
                  ))}
                  {slides.length === 0 && (
                    <div className="text-xs" style={{ color: MUTED }}>
                      No slides yet.
                    </div>
                  )}
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-xs" style={{ color: MUTED }}>Title</span>
                      <input
                        value={slForm.title}
                        onChange={(e) => setSlForm((f) => ({ ...f, title: (e.target as HTMLInputElement).value }))}
                        className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs" style={{ color: MUTED }}>Order</span>
                      <input
                        type="number"
                        value={slForm.order_index}
                        onChange={(e) =>
                          setSlForm((f) => ({ ...f, order_index: Number((e.target as HTMLInputElement).value || 0) }))
                        }
                        className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                      />
                    </label>
                  </div>

                  <label className="grid gap-1">
                    <span className="text-xs" style={{ color: MUTED }}>Body / Notes (optional)</span>
                    <textarea
                      value={slForm.body ?? ""}
                      onChange={(e) => setSlForm((f) => ({ ...f, body: (e.target as HTMLTextAreaElement).value }))}
                      className="min-h-[100px] rounded-lg bg-white px-3 py-2 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-xs" style={{ color: MUTED }}>Intro video URL</span>
                      <input
                        value={slForm.intro_video_url ?? ""}
                        onChange={(e) => setSlForm((f) => ({ ...f, intro_video_url: (e.target as HTMLInputElement).value }))}
                        className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs" style={{ color: MUTED }}>Asset URL (image/pdf)</span>
                      <input
                        value={slForm.asset_url ?? ""}
                        onChange={(e) => setSlForm((f) => ({ ...f, asset_url: (e.target as HTMLInputElement).value }))}
                        className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                      />
                    </label>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-xs" style={{ color: MUTED }}>Upload Intro Video</span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const f = (e.target as HTMLInputElement).files?.[0];
                          if (f) void onPick(f, "intro");
                        }}
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs" style={{ color: MUTED }}>Upload Asset (image/pdf)</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          const f = (e.target as HTMLInputElement).files?.[0];
                          if (f) void onPick(f, "asset");
                        }}
                      />
                    </label>
                  </div>
                  {uploading && <div className="text-xs" style={{ color: MUTED }}>Uploading…</div>}
                  {!!uploadedUrl && <div className="text-xs break-all">Last upload: {uploadedUrl}</div>}

                  <div className="flex gap-2">
                    <Button onClick={() => void saveSlide()}>Save Slide</Button>
                    <Button kind="neutral" onClick={() => setSlForm({ ...emptySlide, chapter_id: chForm.id ?? "" })}>
                      New Slide
                    </Button>
                  </div>
                </div>
              </Card>

              <Card title="Chapter Quiz">
                {chForm.id ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="text-xs" style={{ color: MUTED }}>Time limit (seconds)</span>
                        <input
                          type="number"
                          value={quizSettings.time_limit_seconds ?? ""}
                          onChange={(e) =>
                            setQuizSettings((s) => ({
                              ...s,
                              chapter_id: chForm.id ?? "",
                              time_limit_seconds: (e.target as HTMLInputElement).value === "" ? null : Number((e.target as HTMLInputElement).value),
                            }))
                          }
                          className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs" style={{ color: MUTED }}># randomized questions</span>
                        <input
                          type="number"
                          value={quizSettings.num_questions ?? ""}
                          onChange={(e) =>
                            setQuizSettings((s) => ({
                              ...s,
                              chapter_id: chForm.id ?? "",
                              num_questions: (e.target as HTMLInputElement).value === "" ? null : Number((e.target as HTMLInputElement).value),
                            }))
                          }
                          className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                        />
                      </label>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button onClick={() => startTransition(saveQuizSettings)} disabled={quizSaving}>
                        {quizSaving ? "Saving…" : "Save Settings"}
                      </Button>
                      <Button kind="neutral" onClick={() => void refreshQuiz(chForm.id ?? "")}>
                        Refresh
                      </Button>
                    </div>

                    <div className="mt-6 grid gap-3">
                      <div className="text-sm font-semibold">Questions</div>
                      <div className="grid gap-2">
                        {questions.map((q, i) => (
                          <div key={q.id ?? i} className="rounded-lg p-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]">
                            <div className="text-sm font-medium">{q.question}</div>
                            <ol className="text-xs mt-1 list-decimal ms-5" style={{ color: MUTED }}>
                              {q.options.map((opt, idx) => (
                                <li key={idx} style={idx === q.correct_index ? { color: INK } : undefined}>
                                  {opt}
                                  {idx === q.correct_index ? "  ← correct" : ""}
                                </li>
                              ))}
                            </ol>
                            <div className="mt-2 flex gap-2">
                              <Button kind="neutral" onClick={() => setQForm(q)}>Edit in form</Button>
                              <Button kind="danger" onClick={() => void deleteQuestion(q.id)}>Delete</Button>
                            </div>
                          </div>
                        ))}
                        {questions.length === 0 && (
                          <div className="text-xs" style={{ color: MUTED }}>
                            No questions yet.
                          </div>
                        )}
                      </div>

                      {/* Quick add new */}
                      <div className="mt-2 grid gap-3">
                        <div className="text-sm font-semibold">Add New Question</div>
                        <label className="grid gap-1">
                          <span className="text-xs" style={{ color: MUTED }}>Question</span>
                          <input
                            value={qForm.question}
                            onChange={(e) => setQForm((f) => ({ ...f, chapter_id: chForm.id ?? "", question: (e.target as HTMLInputElement).value }))}
                            className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-xs" style={{ color: MUTED }}>Options (comma separated)</span>
                          <input
                            value={toCsv(qForm.options)}
                            onChange={(e) => setQForm((f) => ({ ...f, chapter_id: chForm.id ?? "", options: fromCsv((e.target as HTMLInputElement).value) }))}
                            className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-xs" style={{ color: MUTED }}>Correct index (0-based)</span>
                          <input
                            type="number"
                            value={qForm.correct_index}
                            onChange={(e) => setQForm((f) => ({ ...f, chapter_id: chForm.id ?? "", correct_index: Number((e.target as HTMLInputElement).value || 0) }))}
                            className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                          />
                        </label>
                        <div className="flex gap-2">
                          <Button onClick={() => void saveQuestion()}>Save Question</Button>
                          <Button
                            kind="neutral"
                            onClick={() => setQForm({ chapter_id: chForm.id ?? "", question: "", options: [], correct_index: 0, id: undefined })}
                          >
                            Reset
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-xs" style={{ color: MUTED }}>
                    Pick or create a chapter first.
                  </div>
                )}
              </Card>

              <Card title="Final Exam (Course-wide)">
                {!selectedCourseId ? (
                  <div className="text-xs" style={{ color: MUTED }}>
                    Pick a course first.
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="grid gap-1">
                        <span className="text-xs" style={{ color: MUTED }}>Title</span>
                        <input
                          value={examForm.title}
                          onChange={(e) => setExamForm((f) => ({ ...f, course_id: selectedCourseId, title: (e.target as HTMLInputElement).value }))}
                          className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs" style={{ color: MUTED }}>Pass Mark (%)</span>
                        <input
                          type="number"
                          value={examForm.pass_mark}
                          onChange={(e) => setExamForm((f) => ({ ...f, course_id: selectedCourseId, pass_mark: Number((e.target as HTMLInputElement).value || 0) }))}
                          className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs" style={{ color: MUTED }}>Time Limit (minutes)</span>
                        <input
                          type="number"
                          value={examForm.time_limit_minutes ?? ""}
                          onChange={(e) =>
                            setExamForm((f) => ({
                              ...f,
                              course_id: selectedCourseId,
                              time_limit_minutes: (e.target as HTMLInputElement).value === "" ? null : Number((e.target as HTMLInputElement).value),
                            }))
                          }
                          className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                        />
                      </label>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button onClick={() => startTransition(saveExam)}>{exam?.id ? "Update Exam" : "Create Exam"}</Button>
                      <Button
                        kind="neutral"
                        onClick={() => {
                          setExam(null);
                          setExamForm({ course_id: selectedCourseId, title: "Final Exam", pass_mark: 60, time_limit_minutes: 30 });
                          setExamQuestions([]);
                        }}
                      >
                        Reset
                      </Button>
                    </div>

                    <div className="mt-6 grid gap-3">
                      <div className="text-sm font-semibold">Exam Questions</div>
                      {!exam?.id && (
                        <div className="text-xs" style={{ color: MUTED }}>
                          Create the exam first, then add questions.
                        </div>
                      )}
                      {exam?.id && (
                        <>
                          <div className="grid gap-2">
                            {examQuestions.map((q, i) => (
                              <div key={q.id ?? i} className="rounded-lg p-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]">
                                <div className="text-sm font-medium">{q.question}</div>
                                <ol className="text-xs mt-1 list-decimal ms-5" style={{ color: MUTED }}>
                                  {q.options.map((opt, idx) => (
                                    <li key={idx} style={idx === q.correct_index ? { color: INK } : undefined}>
                                      {opt}
                                      {idx === q.correct_index ? "  ← correct" : ""}
                                    </li>
                                  ))}
                                </ol>
                                <div className="mt-2 flex gap-2">
                                  <Button kind="neutral" onClick={() => setEqForm(q)}>Edit in form</Button>
                                  <Button kind="danger" onClick={() => void deleteExamQuestion(q)}>Delete</Button>
                                </div>
                              </div>
                            ))}
                            {examQuestions.length === 0 && (
                              <div className="text-xs" style={{ color: MUTED }}>
                                No questions yet.
                              </div>
                            )}
                          </div>

                          {/* Quick add new */}
                          <div className="mt-2 grid gap-3">
                            <div className="text-sm font-semibold">Add New Question</div>
                            <label className="grid gap-1">
                              <span className="text-xs" style={{ color: MUTED }}>Question</span>
                              <input
                                value={eqForm.question}
                                onChange={(e) => setEqForm((f) => ({ ...f, exam_id: exam.id!, question: (e.target as HTMLInputElement).value }))}
                                className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                              />
                            </label>
                            <label className="grid gap-1">
                              <span className="text-xs" style={{ color: MUTED }}>Options (comma separated)</span>
                              <input
                                value={toCsv(eqForm.options)}
                                onChange={(e) => setEqForm((f) => ({ ...f, exam_id: exam.id!, options: fromCsv((e.target as HTMLInputElement).value) }))}
                                className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                              />
                            </label>
                            <label className="grid gap-1">
                              <span className="text-xs" style={{ color: MUTED }}>Correct index (0-based)</span>
                              <input
                                type="number"
                                value={eqForm.correct_index}
                                onChange={(e) => setEqForm((f) => ({ ...f, exam_id: exam.id!, correct_index: Number((e.target as HTMLInputElement).value || 0) }))}
                                className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
                              />
                            </label>
                            <div className="flex gap-2">
                              <Button onClick={() => void saveExamQuestion(exam.id)}>Save Question</Button>
                              <Button
                                kind="neutral"
                                onClick={() => setEqForm({ exam_id: exam.id!, question: "", options: [], correct_index: 0, id: undefined })}
                              >
                                Reset
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* PRICES (stable & mobile-friendly) */}
        {tab === "prices" && (
          <div className="grid gap-6">
            <Card title="Quick Price Editor (GH₵)">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <input
                  placeholder="Search by title…"
                  value={priceSearch}
                  onChange={(e) => setPriceSearch((e.target as HTMLInputElement).value)}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)] w-full sm:w-80"
                />
                <div className="text-xs" style={{ color: MUTED }}>
                  All amounts in GH₵ (e-books stored as pesewas)
                </div>
              </div>

              <div className="mt-4 overflow-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="text-left border-b">
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Title</th>
                      <th className="py-2 pr-3">Price</th>
                      <th className="py-2 pr-3 w-32">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((r) => (
                      <PriceRow
                        key={`${r.kind}:${r.id}`}
                        row={r}
                        onEdit={(next) => mutateRowPrice(`${r.kind}:${r.id}`, next)}
                        onSave={savePrice}
                      />
                    ))}
                    {visibleRows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-3 text-sm" style={{ color: MUTED }}>
                          No items.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* MEDIA */}
        {tab === "media" && (
          <div className="grid gap-6">
            <Card title="Upload to Supabase Storage (public)">
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = (e.target as HTMLInputElement).files?.[0];
                    if (f) {
                      void (async () => {
                        setUploading(true);
                        const url = await uploadToStorage(f);
                        setUploading(false);
                        if (url) setUploadedUrl(url);
                      })();
                    }
                  }}
                />
                <span className="text-sm">{uploading ? "Uploading…" : ""}</span>
              </div>
              {uploadedUrl && uploadedUrl.startsWith("http") && (
                <div className="mt-4">
                  <div className="text-sm mb-2">Preview:</div>
                  <Image
                    src={uploadedUrl}
                    alt="Uploaded"
                    width={320}
                    height={180}
                    className="rounded-lg ring-1 ring-[color:var(--color-light,#e8ebf0)] object-cover"
                  />
                  <div className="text-sm mt-2">URL:</div>
                  <code className="text-xs break-all">{uploadedUrl}</code>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* USERS */}
        {tab === "users" && (
          <div className="grid gap-6">
            <Card
              title="Users"
              right={
                <div className="flex items-center gap-2">
                  <input
                    placeholder="Search email or id…"
                    value={userQuery}
                    onChange={(e) => setUserQuery((e.target as HTMLInputElement).value)}
                    className="h-9 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)] w-60"
                  />
                  <Button kind="neutral" onClick={() => void refreshUsers()}>
                    {usersLoading ? "Refreshing…" : "Refresh"}
                  </Button>
                </div>
              }
            >
              <div className="overflow-auto">
                <table className="w-full text-sm min-w-[760px]">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3">Created</th>
                      <th className="py-2 pr-3">Confirmed</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3 w-[520px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-t">
                        <td className="py-2 pr-3">{u.email ?? u.id}</td>
                        <td className="py-2 pr-3">{u.created_at ?? "—"}</td>
                        <td className="py-2 pr-3">{u.email_confirmed_at ? "Yes" : "No"}</td>
                        <td className="py-2 pr-3">{u.banned ? "Banned" : "Active"}</td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              kind="neutral"
                              onClick={() => {
                                setSelectedUser(u);
                                setSelectedPurchases(null);
                                void loadPurchases(u.id);
                              }}
                            >
                              View
                            </Button>
                            <Button kind="neutral" onClick={() => void generateConfirmLink(u.email)} disabled={!u.email}>
                              Confirm Link
                            </Button>
                            <Button kind="neutral" onClick={() => void generateResetLink(u.email)} disabled={!u.email}>
                              Reset PW
                            </Button>
                            <Button kind="danger" onClick={() => void act(u.id, "delete")} disabled={userActionBusy === `delete:${u.id}`}>
                              Delete
                            </Button>
                            {u.banned ? (
                              <Button kind="primary" onClick={() => void act(u.id, "unban")} disabled={userActionBusy === `unban:${u.id}`}>
                                Unban
                              </Button>
                            ) : (
                              <Button kind="danger" onClick={() => void act(u.id, "ban")} disabled={userActionBusy === `ban:${u.id}`}>
                                Ban
                              </Button>
                            )}
                            <Button kind="neutral" onClick={() => void act(u.id, "revoke")} disabled={userActionBusy === `revoke:${u.id}`}>
                              Revoke Sessions
                            </Button>
                            <Button kind="neutral" onClick={() => void act(u.id, "clear-history")} disabled={userActionBusy === `clear-history:${u.id}`}>
                              Clear History
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-3 text-sm" style={{ color: MUTED }}>
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Drawer */}
              {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
                  <div
                    className="absolute inset-0 bg-black/40"
                    onClick={() => {
                      setSelectedUser(null);
                      setSelectedPurchases(null);
                    }}
                  />
                  <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white border border-[color:var(--color-light,#e8ebf0)] p-5 max-h-[90vh] overflow-auto">
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-semibold">User Details</div>
                      <button
                        onClick={() => {
                          setSelectedUser(null);
                          setSelectedPurchases(null);
                        }}
                        className="text-sm"
                      >
                        Close
                      </button>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm">
                      <div>
                        <span style={{ color: MUTED }}>ID:</span> {selectedUser.id}
                      </div>
                      <div>
                        <span style={{ color: MUTED }}>Email:</span> {selectedUser.email ?? "—"}
                      </div>
                      <div>
                        <span style={{ color: MUTED }}>Created:</span> {selectedUser.created_at ?? "—"}
                      </div>
                      <div>
                        <span style={{ color: MUTED }}>Confirmed:</span> {selectedUser.email_confirmed_at ? "Yes" : "No"}
                      </div>
                      <div>
                        <span style={{ color: MUTED }}>Status:</span> {selectedUser.banned ? "Banned" : "Active"}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg p-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]">
                        <div className="font-medium">Courses Purchased</div>
                        <ul className="mt-2 text-sm list-disc ms-5">
                          {(selectedPurchases?.courses ?? []).map((c, i) => (
                            <li key={i}>{c.title}</li>
                          ))}
                          {(selectedPurchases?.courses?.length ?? 0) === 0 && <li style={{ color: MUTED }}>None</li>}
                        </ul>
                      </div>
                      <div className="rounded-lg p-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]">
                        <div className="font-medium">E-books Purchased</div>
                        <ul className="mt-2 text-sm list-disc ms-5">
                          {(selectedPurchases?.ebooks ?? []).map((e, i) => (
                            <li key={i}>{e.title}</li>
                          ))}
                          {(selectedPurchases?.ebooks?.length ?? 0) === 0 && <li style={{ color: MUTED }}>None</li>}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedUser.banned ? (
                        <Button kind="primary" onClick={() => void act(selectedUser.id, "unban")} disabled={userActionBusy === `unban:${selectedUser.id}`}>
                          Unban
                        </Button>
                      ) : (
                        <Button kind="danger" onClick={() => void act(selectedUser.id, "ban")} disabled={userActionBusy === `ban:${selectedUser.id}`}>
                          Ban
                        </Button>
                      )}
                      <Button kind="neutral" onClick={() => void act(selectedUser.id, "revoke")} disabled={userActionBusy === `revoke:${selectedUser.id}`}>
                        Revoke Sessions
                      </Button>
                      <Button kind="neutral" onClick={() => void act(selectedUser.id, "clear-history")} disabled={userActionBusy === `clear-history:${selectedUser.id}`}>
                        Clear History
                      </Button>
                      <Button kind="neutral" onClick={() => void generateConfirmLink(selectedUser.email)} disabled={!selectedUser.email}>
                        Confirm Link
                      </Button>
                      <Button kind="neutral" onClick={() => void generateResetLink(selectedUser.email)} disabled={!selectedUser.email}>
                        Reset PW
                      </Button>
                      <Button kind="danger" onClick={() => void act(selectedUser.id, "delete")} disabled={userActionBusy === `delete:${selectedUser.id}`}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* DEPLOY */}
        {tab === "deploy" && (
          <div className="grid gap-6">
            <Card title="Deployment">
              <p className="text-sm" style={{ color: MUTED }}>
                Trigger a Vercel rebuild (requires <code>VERCEL_DEPLOY_HOOK_URL</code> in your env).
              </p>
              <div className="mt-3">
                <Button onClick={() => void triggerDeploy()}>Trigger Deploy</Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

/* ╔═══════════════════════════════╗
   ║         Price Row Cell        ║
   ╚═══════════════════════════════╝ */
const PriceRow = memo(function PriceRow({
  row,
  onEdit,
  onSave,
}: {
  row: { kind: "course" | "ebook"; id: string; title: string; price: number; currency: "GHS" };
  onEdit: (nextPrice: number | null) => void;
  onSave: (r: { kind: "course" | "ebook"; id: string; title: string; price: number; currency: "GHS" }) => Promise<void>;
}) {
  // local input state mirrors row.price, but never causes parent list to rebuild
  const [val, setVal] = useState<string>(() => row.price.toString());
  const [saving, setSaving] = useState(false);

  // Keep input in sync if upstream price changes externally (e.g., after refresh)
  useEffect(() => {
    setVal(row.price.toString());
  }, [row.price]);

  // On change, update local and inform store (so scrolling/focus stays intact)
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = (e.target as HTMLInputElement).value;
      setVal(v);
      const p = Number(v);
      if (Number.isFinite(p)) onEdit(p);
      else onEdit(null);
    },
    [onEdit]
  );

  const handleSave = useCallback(async () => {
    const p = Number(val);
    if (!Number.isFinite(p) || p < 0) {
      alert("Enter a valid price");
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...row, price: p });
    } finally {
      setSaving(false);
    }
  }, [val, row, onSave]);

  return (
    <tr className="border-t">
      <td className="py-2 pr-3 capitalize">{row.kind}</td>
      <td className="py-2 pr-3">{row.title}</td>
      <td className="py-2 pr-3">
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: MUTED }}>
            {row.currency}
          </span>
          <input
            value={val}
            onChange={onChange}
            className="h-9 w-32 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light,#e8ebf0)]"
            inputMode="decimal"
          />
        </div>
      </td>
      <td className="py-2 pr-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg text-sm bg-[#0a1156] text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </td>
    </tr>
  );
});
