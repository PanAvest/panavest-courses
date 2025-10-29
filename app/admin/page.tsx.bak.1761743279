/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ============================== Types ============================== */
type Knowledge = {
  id?: string;
  slug: string;
  title: string;
  description?: string | null;
  level?: string | null;
  price?: number | null;
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
  price_cents: number;
  published: boolean;
  created_at?: string | null;
};
type Stats = {
  users_total: number;
  users_new_7d: number;
  courses_total: number;
  ebooks_total: number;
  orders_total: number;
  revenue_30d_usd: number;
  top_courses: Array<{ title: string; sales: number }>;
  top_ebooks: Array<{ title: string; sales: number }>;
};

/* ============================== Utils ============================== */
const isStr = (x: unknown): x is string => typeof x === "string";
const num = (x: unknown, d = 0): number => {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  const n = Number(x);
  return Number.isFinite(n) ? n : d;
};
const toCsv = (v: string[] | null | undefined) => (v ?? []).join(", ");
const fromCsv = (v: string) => v.split(",").map(s => s.trim()).filter(Boolean);

/* ========================== Adapters (safe) ======================== */
function asAdminUser(x: unknown): AdminUser {
  const r = (x && typeof x === "object") ? (x as Record<string, unknown>) : {};
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
    const r = (k && typeof k === "object") ? (k as Record<string, unknown>) : {};
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
    const r = (c && typeof c === "object") ? (c as Record<string, unknown>) : {};
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
    const r = (s && typeof s === "object") ? (s as Record<string, unknown>) : {};
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
  const r = (x && typeof x === "object") ? (x as Record<string, unknown>) : {};
  return {
    chapter_id: chapterId,
    time_limit_seconds: typeof r["time_limit_seconds"] === "number" ? r["time_limit_seconds"] : null,
    num_questions: typeof r["num_questions"] === "number" ? r["num_questions"] : null,
  };
}
function asQuizQuestions(x: unknown): QuizQuestion[] {
  if (!Array.isArray(x)) return [];
  return x.map((q) => {
    const r = (q && typeof q === "object") ? (q as Record<string, unknown>) : {};
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
    const r = (e && typeof e === "object") ? (e as Record<string, unknown>) : {};
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

/* ============================ UI Helpers =========================== */
function StatCard({ label, value, foot }: { label: string; value: string | number; foot?: string }) {
  return (
    <div className="rounded-2xl bg-white border border-light p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {foot && <div className="mt-1 text-xs text-muted">{foot}</div>}
    </div>
  );
}
function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-light p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/* ============================== Component ============================== */
export default function AdminPage() {
  /* ---------------- Tabs ---------------- */
  type Tab = "overview" | "catalog" | "content" | "prices" | "media" | "users" | "deploy";
  const [tab, setTab] = useState<Tab>("overview");

  /* ---------------- Overview (Stats) ---------------- */
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const loadStatsAbort = useRef<AbortController | null>(null);

  const loadStats = useCallback(async () => {
    loadStatsAbort.current?.abort();
    const ac = new AbortController();
    loadStatsAbort.current = ac;
    setStatsError(null);
    try {
      const r = await fetch("/api/admin/stats", { cache: "no-store", signal: ac.signal });
      if (!r.ok) {
        // Graceful: 404 means endpoint not wired yet
        setStats(null);
        if (r.status !== 404) setStatsError(`Stats error: ${r.status}`);
        return;
      }
      const d = (await r.json()) as Partial<Stats>;
      setStats({
        users_total: num(d?.users_total, 0),
        users_new_7d: num(d?.users_new_7d, 0),
        courses_total: num(d?.courses_total, 0),
        ebooks_total: num(d?.ebooks_total, 0),
        orders_total: num(d?.orders_total, 0),
        revenue_30d_usd: num(d?.revenue_30d_usd, 0),
        top_courses: Array.isArray(d?.top_courses) ? d.top_courses : [],
        top_ebooks: Array.isArray(d?.top_ebooks) ? d.top_ebooks : [],
      });
    } catch (e) {
      if ((e as any)?.name !== "AbortError") setStatsError("Failed to load stats");
    }
  }, []);
  useEffect(() => { if (tab === "overview") void loadStats(); }, [tab, loadStats]);

  /* ---------------- Catalog (Courses + Ebooks) ---------------- */
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [kForm, setKForm] = useState<Knowledge>({
    slug: "", title: "", description: "", level: "", price: null, cpd_points: null, img: "", accredited: [], published: true
  });
  const [savingK, setSavingK] = useState(false);

  const refreshKnowledgeAbort = useRef<AbortController | null>(null);
  const refreshKnowledge = useCallback(async () => {
    refreshKnowledgeAbort.current?.abort();
    const ac = new AbortController();
    refreshKnowledgeAbort.current = ac;
    const r = await fetch("/api/admin/knowledge", { cache: "no-store", signal: ac.signal });
    const d = await r.json();
    setKnowledge(asKnowledgeArray(d));
  }, []);
  useEffect(() => {
    if (tab === "catalog" || tab === "content" || tab === "prices") void refreshKnowledge();
  }, [tab, refreshKnowledge]);

  async function saveKnowledge() {
    setSavingK(true);
    const payload: Knowledge = { ...kForm, accredited: fromCsv(toCsv(kForm.accredited ?? [])) };
    const r = await fetch("/api/admin/knowledge", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    setSavingK(false);
    if (r.ok) {
      setKForm({ slug:"", title:"", description:"", level:"", price:null, cpd_points:null, img:"", accredited:[], published:true });
      await refreshKnowledge();
    } else {
      alert("Save failed");
    }
  }

  /* ---------------- Content Builder (Course → Chapter → Slide → Quiz) ---------------- */
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const selectedCourse = useMemo(() => knowledge.find(k => (k.id ?? "") === selectedCourseId) ?? null, [knowledge, selectedCourseId]);

  const emptyChapter: Chapter = { course_id: "", title: "", order_index: 0 };
  const emptySlide: Slide = { chapter_id: "", title: "", order_index: 0, intro_video_url: "", asset_url: "", body: "" };

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chForm, setChForm] = useState<Chapter>(emptyChapter);
  const [savingChapter, setSavingChapter] = useState(false);

  const [slides, setSlides] = useState<Slide[]>([]);
  const [slForm, setSlForm] = useState<Slide>(emptySlide);
  const [savingSlide, setSavingSlide] = useState(false);

  const [quizSettings, setQuizSettings] = useState<QuizSettings>({ chapter_id: "", time_limit_seconds: 120, num_questions: null });
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [qForm, setQForm] = useState<QuizQuestion>({ chapter_id: "", question: "", options: [], correct_index: 0 });

  // For inline edit per-question
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingQ, setEditingQ] = useState<QuizQuestion | null>(null);

  // Abort controllers to prevent races/flicker
  const chaptersAbort = useRef<AbortController | null>(null);
  const slidesAbort = useRef<AbortController | null>(null);
  const quizAbort = useRef<AbortController | null>(null);

  const refreshChapters = useCallback(async (courseId: string) => {
    chaptersAbort.current?.abort();
    const ac = new AbortController();
    chaptersAbort.current = ac;

    if (!courseId) { setChapters([]); setChForm({ ...emptyChapter, course_id: "" }); return; }

    const r = await fetch(`/api/admin/chapters?course_id=${encodeURIComponent(courseId)}`, { cache: "no-store", signal: ac.signal });
    const d = await r.json();
    const rows = asChapters(d);

    // Only apply if this course is still selected
    if (courseId !== selectedCourseId) return;

    setChapters(rows);
    // Keep current selection if still exists; otherwise select first
    const kept = rows.find(c => c.id === chForm.id);
    if (kept) {
      setChForm(kept);
    } else if (rows[0]) {
      setChForm(rows[0]);
    } else {
      setChForm({ ...emptyChapter, course_id: courseId });
      setSlides([]); // clear slides if no chapter
      setQuizSettings({ chapter_id: "", time_limit_seconds: 120, num_questions: null });
      setQuestions([]);
      setQForm({ chapter_id: "", question: "", options: [], correct_index: 0 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId, chForm.id]);

  const refreshSlides = useCallback(async (chapterId: string) => {
    slidesAbort.current?.abort();
    const ac = new AbortController();
    slidesAbort.current = ac;

    if (!chapterId) { setSlides([]); return; }
    const r = await fetch(`/api/admin/slides?chapter_id=${encodeURIComponent(chapterId)}`, { cache: "no-store", signal: ac.signal });
    const d = await r.json();
    // Only apply if this chapter is still active
    if (chapterId !== (chForm.id ?? "")) return;
    setSlides(asSlides(d));
  }, [chForm.id]);

  const refreshQuiz = useCallback(async (chapterId: string) => {
    quizAbort.current?.abort();
    const ac = new AbortController();
    quizAbort.current = ac;

    if (!chapterId) {
      setQuizSettings({ chapter_id: "", time_limit_seconds: 120, num_questions: null });
      setQuestions([]);
      setQForm({ chapter_id: "", question: "", options: [], correct_index: 0 });
      return;
    }
    const r1 = await fetch(`/api/admin/quiz-settings?chapter_id=${encodeURIComponent(chapterId)}`, { cache: "no-store", signal: ac.signal });
    const d1 = r1.ok ? await r1.json() : {};
    if (chapterId === (chForm.id ?? "")) setQuizSettings(asQuizSettings(d1 ?? {}, chapterId));

    const r2 = await fetch(`/api/admin/quiz-questions?chapter_id=${encodeURIComponent(chapterId)}`, { cache: "no-store", signal: ac.signal });
    const d2 = r2.ok ? await r2.json() : [];
    if (chapterId === (chForm.id ?? "")) {
      setQuestions(asQuizQuestions(d2));
      setQForm(f => ({ ...f, chapter_id: chapterId }));
      setEditingQuestionId(null);
      setEditingQ(null);
    }
  }, [chForm.id]);

  // When course changes: clear dependent state first, then fetch
  useEffect(() => {
    if (!selectedCourseId) {
      setChapters([]);
      setChForm({ ...emptyChapter, course_id: "" });
      setSlides([]);
      setSlForm({ ...emptySlide, chapter_id: "" });
      setQuizSettings({ chapter_id: "", time_limit_seconds: 120, num_questions: null });
      setQuestions([]);
      setQForm({ chapter_id: "", question: "", options: [], correct_index: 0 });
      return;
    }
    void refreshChapters(selectedCourseId);
  }, [selectedCourseId, refreshChapters]);

  // When chapter changes: fetch slides + quiz for that chapter, but guard with aborts
  useEffect(() => {
    const id = chForm.id ?? "";
    void refreshSlides(id);
    void refreshQuiz(id);
    setSlForm(s => ({ ...s, chapter_id: id }));
  }, [chForm.id, refreshSlides, refreshQuiz]);

  async function saveChapter() {
    if (!selectedCourseId || !chForm.title.trim()) { alert("Course & Title required"); return; }
    setSavingChapter(true);
    const payload = {
      id: chForm.id,
      course_id: selectedCourseId,
      title: chForm.title.trim(),
      order_index: Number.isFinite(chForm.order_index) ? chForm.order_index : 0,
    };
    const r = await fetch("/api/admin/chapters", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload)
    });
    setSavingChapter(false);
    if (!r.ok) { alert("Save chapter failed"); return; }
    await refreshChapters(selectedCourseId);
  }

  async function saveSlide() {
    if (!slForm.chapter_id || !slForm.title.trim()) { alert("Chapter & Title required"); return; }
    setSavingSlide(true);
    const payload = {
      id: slForm.id || undefined,
      chapter_id: slForm.chapter_id,
      title: slForm.title.trim(),
      order_index: Number.isFinite(slForm.order_index) ? Number(slForm.order_index) : 0,
      intro_video_url: slForm.intro_video_url?.trim() || null,
      asset_url: slForm.asset_url?.trim() || null,
      body: slForm.body?.trim() || null,
    };
    const r = await fetch("/api/admin/slides", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload)
    });
    setSavingSlide(false);
    if (!r.ok) { alert("Save slide failed"); return; }
    await refreshSlides(slForm.chapter_id);
  }

  /* Uploads (Media & Slide helpers) */
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>("");
  async function uploadToStorage(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", file.name);
    const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
    if (!r.ok) return null;
    const d = await r.json();
    const url = (d && typeof d === "object") ? (d as Record<string, unknown>)["publicUrl"] : null;
    return isStr(url) ? url : null;
  }
  async function onPick(file: File, target: "intro" | "asset") {
    setUploading(true);
    const url = await uploadToStorage(file);
    setUploading(false);
    if (!url) { alert("Upload failed"); return; }
    if (target === "intro") setSlForm(f => ({ ...f, intro_video_url: url }));
    if (target === "asset") setSlForm(f => ({ ...f, asset_url: url }));
    setUploadedUrl(url);
  }

  /* Quiz settings + questions (inline editor) */
  const [quizSaving, setQuizSaving] = useState(false);
  async function saveQuizSettings() {
    if (!quizSettings.chapter_id) { alert("Pick a chapter"); return; }
    setQuizSaving(true);
    const r = await fetch("/api/admin/quiz-settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(quizSettings),
    });
    setQuizSaving(false);
    if (!r.ok) { alert("Save quiz settings failed"); return; }
    const saved = await r.json();
    setQuizSettings(asQuizSettings(saved, quizSettings.chapter_id));
  }

  async function saveQuestion() {
    if (!qForm.chapter_id || !qForm.question.trim()) { alert("Chapter & Question required"); return; }
    if ((qForm.options?.length ?? 0) < 2) { alert("At least 2 options"); return; }
    if (qForm.correct_index < 0 || qForm.correct_index >= qForm.options.length) { alert("Correct index out of range"); return; }
    const r = await fetch("/api/admin/quiz-questions", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(qForm)
    });
    if (!r.ok) { alert("Save question failed"); return; }
    await refreshQuiz(qForm.chapter_id);
    setQForm({ chapter_id: qForm.chapter_id, question: "", options: [], correct_index: 0, id: undefined });
  }

  async function deleteQuestion(id?: string) {
    if (!id) return;
    if (!confirm("Delete this question?")) return;
    const r = await fetch(`/api/admin/quiz-questions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!r.ok) { alert("Delete failed"); return; }
    await refreshQuiz(quizSettings.chapter_id);
  }

  // Inline edit handlers
  function startEditQuestion(q: QuizQuestion) {
    setEditingQuestionId(q.id ?? null);
    setEditingQ({ ...q });
  }
  function cancelEditQuestion() {
    setEditingQuestionId(null);
    setEditingQ(null);
  }
  async function commitEditQuestion() {
    if (!editingQ) return;
    if (!editingQ.chapter_id || !editingQ.question.trim()) { alert("Chapter & Question required"); return; }
    if ((editingQ.options?.length ?? 0) < 2) { alert("At least 2 options"); return; }
    if (editingQ.correct_index < 0 || editingQ.correct_index >= editingQ.options.length) { alert("Correct index out of range"); return; }
    const r = await fetch("/api/admin/quiz-questions", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(editingQ)
    });
    if (!r.ok) { alert("Update failed"); return; }
    await refreshQuiz(editingQ.chapter_id);
    setEditingQuestionId(null);
    setEditingQ(null);
  }

  /* ---------------- Ebooks (Catalog) ---------------- */
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [ebookForm, setEbookForm] = useState<Ebook>({
    slug: "", title: "", description: "", cover_url: "", sample_url: "", kpf_url: "", price_cents: 0, published: true
  });
  const [savingEbook, setSavingEbook] = useState(false);
  const [loadingEbooks, setLoadingEbooks] = useState(false);

  const refreshEbooksAbort = useRef<AbortController | null>(null);
  const refreshEbooks = useCallback(async () => {
    refreshEbooksAbort.current?.abort();
    const ac = new AbortController();
    refreshEbooksAbort.current = ac;
    setLoadingEbooks(true);
    try {
      const r = await fetch("/api/admin/ebooks", { cache: "no-store", signal: ac.signal });
      const d = await r.json();
      setEbooks(asEbooks(d));
    } finally { setLoadingEbooks(false); }
  }, []);
  useEffect(() => { if (tab === "catalog" || tab === "prices") void refreshEbooks(); }, [tab, refreshEbooks]);

  async function saveEbook() {
    if (!ebookForm.slug.trim() || !ebookForm.title.trim()) { alert("Slug & Title required"); return; }
    setSavingEbook(true);
    const payload: Ebook = {
      ...ebookForm,
      price_cents: num(ebookForm.price_cents, 0),
      cover_url: ebookForm.cover_url?.trim() || null,
      sample_url: ebookForm.sample_url?.trim() || null,
      kpf_url: ebookForm.kpf_url?.trim() || null,
    };
    const r = await fetch("/api/admin/ebooks", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload)
    });
    setSavingEbook(false);
    if (!r.ok) { alert("Save e-book failed"); return; }
    setEbookForm({ slug:"", title:"", description:"", cover_url:"", sample_url:"", kpf_url:"", price_cents:0, published:true });
    await refreshEbooks();
  }
  async function deleteEbook(id?: string) {
    if (!id) return;
    if (!confirm("Delete e-book?")) return;
    const r = await fetch(`/api/admin/ebooks/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!r.ok) { alert("Delete failed"); return; }
    if (ebookForm.id === id) setEbookForm({ slug:"", title:"", description:"", cover_url:"", sample_url:"", kpf_url:"", price_cents:0, published:true });
    await refreshEbooks();
  }
  async function onPickEbook(file: File, field: "cover_url" | "sample_url" | "kpf_url") {
    setUploading(true);
    const url = await uploadToStorage(file);
    setUploading(false);
    if (!url) { alert("Upload failed"); return; }
    setEbookForm(f => ({ ...f, [field]: url }));
  }

  /* ---------------- Users ---------------- */
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedPurchases, setSelectedPurchases] = useState<{ courses: Array<{ title: string }>; ebooks: Array<{ title: string }> } | null>(null);

  const refreshUsersAbort = useRef<AbortController | null>(null);
  const refreshUsers = useCallback(async () => {
    refreshUsersAbort.current?.abort();
    const ac = new AbortController();
    refreshUsersAbort.current = ac;
    setUsersLoading(true);
    try {
      const r = await fetch("/api/admin/users", { cache: "no-store", signal: ac.signal });
      const d = await r.json();
      const arr = Array.isArray(d?.users) ? d.users : [];
      setUsers(arr.map(asAdminUser));
    } finally { setUsersLoading(false); }
  }, []);
  useEffect(() => { if (tab === "users") void refreshUsers(); }, [tab, refreshUsers]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => (u.email ?? u.id).toLowerCase().includes(q));
  }, [userQuery, users]);

  async function generateConfirmLink(email?: string) {
    if (!email) return;
    const r = await fetch("/api/admin/users", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "generate_confirmation_link", email })
    });
    const d = await r.json();
    const link = (d && typeof d === "object") ? (d as Record<string, unknown>)["link"] : null;
    if (isStr(link)) { await navigator.clipboard.writeText(link); alert("Confirmation link copied"); }
    else { alert("Could not generate link"); }
  }

  const [userActionBusy, setUserActionBusy] = useState<string | null>(null);
  async function act(userId: string, endpoint: "ban" | "unban" | "revoke" | "clear-history") | "delete" {
    setUserActionBusy(`${endpoint}:${userId}`);
    const r = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/${endpoint}`, { method: "POST" });
    setUserActionBusy(null);
    if (!r.ok) { alert(`Failed to ${endpoint.replace("-", " ")}`); return; }
    await refreshUsers();
    if (selectedUser?.id === userId) setSelectedUser(u => (u ? { ...u, banned: endpoint === "ban" ? true : endpoint === "unban" ? false : u.banned ?? null } : u));
  }

  async function loadPurchases(userId: string) {
    const r = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/purchases`, { cache: "no-store" });
    if (!r.ok) { setSelectedPurchases({ courses: [], ebooks: [] }); return; }
    const d = await r.json();
    const courses = Array.isArray(d?.courses) ? d.courses : [];
    const ebooks = Array.isArray(d?.ebooks) ? d.ebooks : [];
    setSelectedPurchases({ courses, ebooks });
  }

  
/** Generate password reset link and copy to clipboard */
async function generateResetLink(email?: string) {
  if (!email) return;
  const r = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "generate_reset_link", email })
  });
  const d = await r.json();
  const link = (d && typeof d === "object") ? (d as Record<string, unknown>)["link"] : null;
  if (typeof link === "string") {
    await navigator.clipboard.writeText(link);
    alert("Reset link copied");
  } else {
    alert("Could not generate reset link");
  }
}

/* ---------------- Quick Prices ---------------- */
  const [priceSearch, setPriceSearch] = useState("");
  const priceRows = useMemo(() => {
    const rows: Array<{ kind: "course" | "ebook"; id: string; title: string; price: number; currency: "GHS" | "USD" }> = [];
    knowledge.forEach(k => rows.push({ kind: "course", id: k.id ?? k.slug, title: k.title, price: k.price ?? 0, currency: "GHS" }));
    ebooks.forEach(e => rows.push({ kind: "ebook", id: e.id ?? e.slug, title: e.title, price: (e.price_cents / 100), currency: "USD" }));
    const q = priceSearch.trim().toLowerCase();
    return q ? rows.filter(r => r.title.toLowerCase().includes(q)) : rows;
  }, [knowledge, ebooks, priceSearch]);

  async function savePrice(row: { kind: "course" | "ebook"; id: string; price: number }) {
    if (row.kind === "course") {
      const item = knowledge.find(k => (k.id ?? k.slug) === row.id);
      if (!item) return;
      const payload = { ...item, price: row.price };
      const r = await fetch("/api/admin/knowledge", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload)
      });
      if (!r.ok) { alert("Save course price failed"); return; }
      await refreshKnowledge();
    } else {
      const item = ebooks.find(e => (e.id ?? e.slug) === row.id);
      if (!item) return;
      const payload = { ...item, price_cents: Math.round(row.price * 100) };
      const r = await fetch("/api/admin/ebooks", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload)
      });
      if (!r.ok) { alert("Save e-book price failed"); return; }
      await refreshEbooks();
    }
  }

  /* ---------------- Deploy ---------------- */
  async function triggerDeploy() {
    const r = await fetch("/api/admin/deploy", { method: "POST" });
    const d = await r.json();
    const ok   = (d && typeof d === "object") ? (d as Record<string, unknown>)["ok"]   : null;
    const text = (d && typeof d === "object") ? (d as Record<string, unknown>)["text"] : null;
    alert(ok ? "Deploy triggered" : `Failed: ${String(text ?? "Unknown error")}`);
  }

  /* ============================== Render ============================== */
  return (
    <div className="mx-auto max-w-screen-2xl px-4 md:px-6 py-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Master Admin</h1>
        <div className="flex flex-wrap gap-2">
          {(["overview","catalog","content","prices","media","users","deploy"] as const).map(t => (
            <button
              key={t}
              onClick={()=>setTab(t)}
              className={`px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)] text-sm ${tab===t?"bg-[color:#0a1156] text-white":"bg-white"}`}
            >
              {t[0].toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ================= Overview ================= */}
      {tab==="overview" && (
        <div className="mt-6 grid gap-6">
          {!stats && !statsError && (
            <div className="text-sm text-muted">Loading stats…</div>
          )}
          {statsError && (
            <div className="text-sm text-red-600">Stats unavailable. If you haven’t created <code>/api/admin/stats</code>, the page will still work without it.</div>
          )}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
            <StatCard label="Total Users" value={stats?.users_total ?? "—"} foot={`+${stats?.users_new_7d ?? 0} in last 7 days`} />
            <StatCard label="Courses" value={stats?.courses_total ?? "—"} />
            <StatCard label="E-Books" value={stats?.ebooks_total ?? "—"} />
            <StatCard label="Orders" value={stats?.orders_total ?? "—"} />
            <StatCard label="Revenue (30d)" value={`$${(stats?.revenue_30d_usd ?? 0).toLocaleString()}`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Top Courses (by sales)">
              <div className="grid gap-2">
                {(stats?.top_courses ?? []).map((c, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg p-3 ring-1 ring-[color:var(--color-light)]">
                    <div className="text-sm">{c.title}</div>
                    <div className="text-xs text-muted">{c.sales} sales</div>
                  </div>
                ))}
                {(stats?.top_courses?.length ?? 0) === 0 && <div className="text-sm text-muted">No data.</div>}
              </div>
            </Section>
            <Section title="Top E-Books (by sales)">
              <div className="grid gap-2">
                {(stats?.top_ebooks ?? []).map((e, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg p-3 ring-1 ring-[color:var(--color-light)]">
                    <div className="text-sm">{e.title}</div>
                    <div className="text-xs text-muted">{e.sales} sales</div>
                  </div>
                ))}
                {(stats?.top_ebooks?.length ?? 0) === 0 && <div className="text-sm text-muted">No data.</div>}
              </div>
            </Section>
          </div>
        </div>
      )}

      {/* ================= Catalog ================= */}
      {tab==="catalog" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Section title="Course (Knowledge) – Create / Edit">
            <div className="grid gap-3">
              {[
                ["slug","Slug"],
                ["title","Title"],
                ["description","Description"],
                ["level","Level"],
              ].map(([k,label])=>(
                <label key={k} className="grid gap-1">
                  <span className="text-xs text-muted">{label}</span>
                  <input
                    value={(kForm as Record<string, unknown>)[k] as string ?? ""}
                    onChange={(e)=>setKForm(f=>({ ...f, [k]: (e.target as HTMLInputElement).value }))}
                    className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                  />
                </label>
              ))}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs text-muted">Price (GH₵)</span>
                  <input
                    type="number"
                    value={kForm.price ?? ""}
                    onChange={(e)=>setKForm(f=>({ ...f, price: (e.target as HTMLInputElement).value===""?null:Number((e.target as HTMLInputElement).value) }))}
                    className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]" />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-muted">CPPD Points</span>
                  <input
                    type="number"
                    value={kForm.cpd_points ?? ""}
                    onChange={(e)=>setKForm(f=>({ ...f, cpd_points: (e.target as HTMLInputElement).value===""?null:Number((e.target as HTMLInputElement).value) }))}
                    className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]" />
                </label>
              </div>
              <label className="grid gap-1">
                <span className="text-xs text-muted">Image URL</span>
                <input
                  value={kForm.img ?? ""}
                  onChange={(e)=>setKForm(f=>({ ...f, img: (e.target as HTMLInputElement).value }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-muted">Accredited (comma separated)</span>
                <input
                  value={toCsv(kForm.accredited ?? [])}
                  onChange={(e)=>setKForm(f=>({ ...f, accredited: fromCsv((e.target as HTMLInputElement).value) }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]" />
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={kForm.published ?? true} onChange={(e)=>setKForm(f=>({ ...f, published: (e.target as HTMLInputElement).checked }))} />
                <span className="text-sm">Published</span>
              </label>
              <div className="flex items-center gap-2">
                <button onClick={saveKnowledge} disabled={savingK} className="rounded-lg bg-[color:#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50">
                  {savingK ? "Saving…" : "Save"}
                </button>
                <button onClick={()=>setKForm({ slug:"", title:"", description:"", level:"", price:null, cpd_points:null, img:"", accredited:[], published:true })} className="rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)]">Reset</button>
              </div>
            </div>
          </Section>

          <Section title="Courses List" right={<button onClick={refreshKnowledge} className="px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)] text-sm">Refresh</button>}>
            <div className="grid gap-2">
              {knowledge.map(k=>(
                <div key={k.id ?? k.slug} className="flex items-start justify-between gap-3 rounded-lg p-3 ring-1 ring-[color:var(--color-light)]">
                  <div className="text-sm">
                    <div className="font-semibold">{k.title}</div>
                    <div className="text-muted text-xs">/{k.slug} · {k.level ?? "—"} · GH₵{k.price ?? 0} · {k.published ? "Published" : "Draft"}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>setKForm(k)} className="px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)] text-sm">Edit</button>
                  </div>
                </div>
              ))}
              {knowledge.length===0 && <div className="text-muted text-sm">No courses yet.</div>}
            </div>
          </Section>

          <Section title="E-book – Create / Edit">
            <div className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs text-muted">Slug</span>
                <input value={ebookForm.slug} onChange={(e)=>setEbookForm(f=>({ ...f, slug: (e.target as HTMLInputElement).value }))} className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"/>
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-muted">Title</span>
                <input value={ebookForm.title} onChange={(e)=>setEbookForm(f=>({ ...f, title: (e.target as HTMLInputElement).value }))} className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"/>
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-muted">Description</span>
                <textarea value={ebookForm.description ?? ""} onChange={(e)=>setEbookForm(f=>({ ...f, description: (e.target as HTMLTextAreaElement).value }))} className="min-h-[90px] rounded-lg bg-white px-3 py-2 ring-1 ring-[color:var(--color-light)]"/>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs text-muted">Price (USD)</span>
                  <input
                    type="number" step="0.01"
                    value={(ebookForm.price_cents/100).toString()}
                    onChange={(e)=> {
                      const cents = Math.round(Number((e.target as HTMLInputElement).value || 0) * 100);
                      setEbookForm(f=>({ ...f, price_cents: Number.isFinite(cents)?cents:0 }));
                    }}
                    className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                  />
                </label>
                <label className="inline-flex items-center gap-2 mt-6 sm:mt-0">
                  <input type="checkbox" checked={ebookForm.published} onChange={(e)=>setEbookForm(f=>({ ...f, published: (e.target as HTMLInputElement).checked }))}/>
                  <span className="text-sm">Published</span>
                </label>
              </div>

              {[
                ["cover_url","Cover URL","image/*"] as const,
                ["sample_url","Sample URL (image/pdf)","image/*,application/pdf"] as const,
                ["kpf_url","KPF URL",".kpf,application/octet-stream"] as const,
              ].map(([field,label,accept])=>(
                <div key={field} className="grid gap-1">
                  <span className="text-xs text-muted">{label}</span>
                  <input
                    value={(ebookForm as Record<string, unknown>)[field] as string ?? ""}
                    onChange={(e)=>setEbookForm(f=>({ ...f, [field]: (e.target as HTMLInputElement).value }))}
                    className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                  />
                  <input type="file" accept={accept} onChange={(e)=>{ const file=(e.target as HTMLInputElement).files?.[0]; if (file) void onPickEbook(file, field as "cover_url"|"sample_url"|"kpf_url"); }} />
                </div>
              ))}
              <div className="flex items-center gap-2">
                <button onClick={saveEbook} disabled={savingEbook} className="rounded-lg bg-[color:#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50">
                  {savingEbook ? "Saving…" : "Save E-book"}
                </button>
                <button onClick={()=>setEbookForm({ slug:"", title:"", description:"", cover_url:"", sample_url:"", kpf_url:"", price_cents:0, published:true })} className="rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)]">Reset</button>
              </div>
            </div>
          </Section>

          <Section title="E-books List" right={<button onClick={refreshEbooks} className="px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)] text-sm">{loadingEbooks ? "Refreshing…" : "Refresh"}</button>}>
            <div className="grid gap-2">
              {ebooks.map(e=>(
                <div key={e.id ?? e.slug} className="flex items-start justify-between gap-3 rounded-lg p-3 ring-1 ring-[color:var(--color-light)]">
                  <div className="flex items-start gap-3">
                    {e.cover_url ? <Image src={e.cover_url} alt={e.title} width={56} height={56} className="rounded-md ring-1 ring-[color:var(--color-light)] object-cover"/> : <div className="h-14 w-14 rounded-md bg-[color:var(--color-light)]/40" />}
                    <div className="text-sm">
                      <div className="font-semibold">{e.title}</div>
                      <div className="text-xs text-muted">/{e.slug} · {(e.price_cents/100).toLocaleString(undefined,{style:"currency",currency:"USD"})} · {e.published ? "Published" : "Draft"}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>setEbookForm(e)} className="px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)] text-sm">Edit</button>
                    <button onClick={()=>void deleteEbook(e.id)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm">Delete</button>
                  </div>
                </div>
              ))}
              {ebooks.length===0 && <div className="text-muted text-sm">No e-books yet.</div>}
            </div>
          </Section>
        </div>
      )}

      {/* ================= Content Builder ================= */}
      {tab==="content" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[320px_1fr]">
          {/* Picker */}
          <Section title="Pick Course">
            <select
              className="h-10 w-full rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
              value={selectedCourseId}
              onChange={(e)=>setSelectedCourseId((e.target as HTMLSelectElement).value)}
            >
              <option value="">— Choose a course —</option>
              {knowledge.map(k=>(<option key={k.id ?? k.slug} value={k.id}>{k.title}</option>))}
            </select>

            {selectedCourse && (
              <div className="mt-4 grid gap-2">
                <div className="text-sm font-semibold">Chapters</div>
                {chapters.map(ch => (
                  <button
                    key={ch.id ?? ch.title}
                    onClick={()=>setChForm(ch)}
                    className={`text-left rounded-lg px-3 py-2 ring-1 ring-[color:var(--color-light)] ${chForm.id===(ch.id??"")?"bg-[color:var(--color-light)]/40":"bg-white"}`}
                  >
                    <div className="font-medium">{ch.title}</div>
                    <div className="text-xs text-muted">Order: {ch.order_index}</div>
                  </button>
                ))}
                {chapters.length===0 && <div className="text-xs text-muted">No chapters yet.</div>}
              </div>
            )}
          </Section>

          {/* Builder */}
          <div className="grid gap-6">
            <Section title="Chapter">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs text-muted">Title</span>
                  <input value={chForm.title} onChange={(e)=>setChForm(f=>({ ...f, title: (e.target as HTMLInputElement).value }))} className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"/>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-muted">Order</span>
                  <input type="number" value={chForm.order_index} onChange={(e)=>setChForm(f=>({ ...f, order_index: Number((e.target as HTMLInputElement).value||0) }))} className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"/>
                </label>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={saveChapter} disabled={!selectedCourseId || !chForm.title.trim() || savingChapter} className="rounded-lg bg-[color:#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50">
                  {savingChapter ? "Saving…" : "Save Chapter"}
                </button>
                <button onClick={()=>setChForm({ ...emptyChapter, course_id: selectedCourseId })} className="rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)]">New Chapter</button>
              </div>
            </Section>

            <Section title="Slides (for this chapter)">
              <div className="grid gap-2">
                {slides.map(s=>(
                  <button key={s.id ?? s.title} onClick={()=>setSlForm(s)} className={`text-left rounded-lg px-3 py-2 ring-1 ring-[color:var(--color-light)] ${slForm.id===(s.id??"")?"bg-[color:var(--color-light)]/40":"bg-white"}`}>
                    <div className="font-medium">{s.title}</div>
                    <div className="text-xs text-muted">Order: {s.order_index}</div>
                  </button>
                ))}
                {slides.length===0 && <div className="text-xs text-muted">No slides yet.</div>}
              </div>

              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs text-muted">Title</span>
                    <input value={slForm.title} onChange={(e)=>setSlForm(f=>({ ...f, title: (e.target as HTMLInputElement).value }))} className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"/>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-muted">Order</span>
                    <input type="number" value={slForm.order_index} onChange={(e)=>setSlForm(f=>({ ...f, order_index: Number((e.target as HTMLInputElement).value||0) }))} className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"/>
                  </label>
                </div>

                <label className="grid gap-1">
                  <span className="text-xs text-muted">Body / Notes (optional)</span>
                  <textarea value={slForm.body ?? ""} onChange={(e)=>setSlForm(f=>({ ...f, body: (e.target as HTMLTextAreaElement).value }))} className="min-h-[100px] rounded-lg bg-white px-3 py-2 ring-1 ring-[color:var(--color-light)]"/>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs text-muted">Intro video URL</span>
                    <input value={slForm.intro_video_url ?? ""} onChange={(e)=>setSlForm(f=>({ ...f, intro_video_url: (e.target as HTMLInputElement).value }))} className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"/>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-muted">Asset URL (image/pdf)</span>
                    <input value={slForm.asset_url ?? ""} onChange={(e)=>setSlForm(f=>({ ...f, asset_url: (e.target as HTMLInputElement).value }))} className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"/>
                  </label>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs text-muted">Upload Intro Video</span>
                    <input type="file" accept="video/*" onChange={(e)=>{ const f=(e.target as HTMLInputElement).files?.[0]; if (f) void onPick(f,"intro"); }} />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-muted">Upload Asset (image/pdf)</span>
                    <input type="file" accept="image/*,application/pdf" onChange={(e)=>{ const f=(e.target as HTMLInputElement).files?.[0]; if (f) void onPick(f,"asset"); }} />
                  </label>
                </div>
                {uploading && <div className="text-xs text-muted">Uploading…</div>}
                {!!uploadedUrl && <div className="text-xs break-all">Last upload: {uploadedUrl}</div>}

                <div className="flex gap-2">
                  <button onClick={saveSlide} disabled={!slForm.chapter_id || !slForm.title.trim() || savingSlide} className="rounded-lg bg-[color:#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50">
                    {savingSlide ? "Saving…" : "Save Slide"}
                  </button>
                  <button onClick={()=>setSlForm({ ...emptySlide, chapter_id: chForm.id ?? "" })} className="rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)]">New Slide</button>
                </div>
              </div>
            </Section>

            <Section title="Chapter Quiz">
              {chForm.id ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-xs text-muted">Time limit (seconds)</span>
                      <input type="number" value={quizSettings.time_limit_seconds ?? ""} onChange={(e)=>setQuizSettings(s=>({ ...s, chapter_id: chForm.id ?? "", time_limit_seconds: (e.target as HTMLInputElement).value===""?null:Number((e.target as HTMLInputElement).value) }))} className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"/>
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs text-muted"># randomized questions</span>
                      <input type="number" value={quizSettings.num_questions ?? ""} onChange={(e)=>setQuizSettings(s=>({ ...s, chapter_id: chForm.id ?? "", num_questions: (e.target as HTMLInputElement).value===""?null:Number((e.target as HTMLInputElement).value) }))} className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"/>
                    </label>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={saveQuizSettings} disabled={quizSaving} className="rounded-lg bg-[color:#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50">
                      {quizSaving ? "Saving…" : "Save Settings"}
                    </button>
                    <button onClick={()=>void refreshQuiz(chForm.id ?? "")} className="rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)]">
                      Refresh
                    </button>
                  </div>

                  <div className="mt-6 grid gap-3">
                    <div className="text-sm font-semibold">Questions</div>
                    <div className="grid gap-2">
                      {questions.map((q, i)=>(
                        <div key={q.id ?? i} className="rounded-lg p-3 ring-1 ring-[color:var(--color-light)]">
                          {editingQuestionId === (q.id ?? null) && editingQ ? (
                            <div className="grid gap-2">
                              <input
                                value={editingQ.question}
                                onChange={(e)=>setEditingQ(prev => prev ? ({ ...prev, question: (e.target as HTMLInputElement).value }) : prev)}
                                className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)] text-sm"
                              />
                              <input
                                value={toCsv(editingQ.options)}
                                onChange={(e)=>setEditingQ(prev => prev ? ({ ...prev, options: fromCsv((e.target as HTMLInputElement).value) }) : prev)}
                                className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)] text-sm"
                                placeholder="Options (comma separated)"
                              />
                              <input
                                type="number"
                                value={editingQ.correct_index}
                                onChange={(e)=>setEditingQ(prev => prev ? ({ ...prev, correct_index: Number((e.target as HTMLInputElement).value||0) }) : prev)}
                                className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)] text-sm"
                                placeholder="Correct index (0-based)"
                              />
                              <div className="flex gap-2">
                                <button onClick={commitEditQuestion} className="px-3 py-1.5 rounded-lg bg-[color:#0a1156] text-white text-sm">Save</button>
                                <button onClick={cancelEditQuestion} className="px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)] text-sm">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="text-sm font-medium">{q.question}</div>
                              <ol className="text-xs text-muted mt-1 list-decimal ms-5">
                                {q.options.map((opt, idx)=>(
                                  <li key={idx} className={idx===q.correct_index ? "text-ink" : ""}>
                                    {opt}{idx===q.correct_index ? "  ← correct" : ""}
                                  </li>
                                ))}
                              </ol>
                              <div className="mt-2 flex gap-2">
                                <button onClick={()=>startEditQuestion(q)} className="px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)] text-sm">Edit</button>
                                <button onClick={()=>void deleteQuestion(q.id)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm">Delete</button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                      {questions.length===0 && <div className="text-xs text-muted">No questions yet.</div>}
                    </div>

                    {/* Quick add new */}
                    <div className="mt-2 grid gap-3">
                      <div className="text-sm font-semibold">Add New Question</div>
                      <label className="grid gap-1">
                        <span className="text-xs text-muted">Question</span>
                        <input value={qForm.question} onChange={(e)=>setQForm(f=>({ ...f, chapter_id: chForm.id ?? "", question: (e.target as HTMLInputElement).value }))} className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"/>
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs text-muted">Options (comma separated)</span>
                        <input value={toCsv(qForm.options)} onChange={(e)=>setQForm(f=>({ ...f, chapter_id: chForm.id ?? "", options: fromCsv((e.target as HTMLInputElement).value) }))} className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"/>
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs text-muted">Correct index (0-based)</span>
                        <input type="number" value={qForm.correct_index} onChange={(e)=>setQForm(f=>({ ...f, chapter_id: chForm.id ?? "", correct_index: Number((e.target as HTMLInputElement).value||0) }))} className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"/>
                      </label>
                      <div className="flex gap-2">
                        <button onClick={saveQuestion} className="rounded-lg bg-[color:#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90">Save Question</button>
                        <button onClick={()=>setQForm({ chapter_id: chForm.id ?? "", question: "", options: [], correct_index: 0, id: undefined })} className="rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)]">Reset</button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted">Pick or create a chapter first.</div>
              )}
            </Section>
          </div>
        </div>
      )}

      {/* ================= Quick Prices ================= */}
      {tab==="prices" && (
        <div className="mt-6 grid gap-6">
          <Section title="Quick Price Editor">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                placeholder="Search by title…"
                value={priceSearch}
                onChange={(e)=>setPriceSearch((e.target as HTMLInputElement).value)}
                className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)] w-full sm:w-80"
              />
              <div className="text-xs text-muted">Courses in GH₵ · E-books in USD</div>
            </div>
            <div className="mt-4 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">Price</th>
                    <th className="py-2 pr-3 w-32">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {priceRows.map((r)=>(
                    <PriceRow key={`${r.kind}-${r.id}`} row={r} onSave={savePrice} />
                  ))}
                  {priceRows.length===0 && (
                    <tr><td colSpan={4} className="py-3 text-sm text-muted">No items.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      )}

      {/* ================= Media ================= */}
      {tab==="media" && (
        <div className="mt-6">
          <Section title="Upload to Supabase Storage (public)">
            <div className="flex items-center gap-3 flex-wrap">
              <input type="file" accept="image/*" onChange={(e)=>{ const f=(e.target as HTMLInputElement).files?.[0]; if (f) { void (async()=>{ setUploading(true); const url = await uploadToStorage(f); setUploading(false); if (url) setUploadedUrl(url); })(); } }} />
              <span className="text-sm">{uploading ? "Uploading…" : ""}</span>
            </div>
            {uploadedUrl && uploadedUrl.startsWith("http") && (
              <div className="mt-4">
                <div className="text-sm mb-2">Preview:</div>
                <Image src={uploadedUrl} alt="Uploaded" width={320} height={180} className="rounded-lg ring-1 ring-[color:var(--color-light)] object-cover" />
                <div className="text-sm mt-2">URL:</div>
                <code className="text-xs break-all">{uploadedUrl}</code>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* ================= Users ================= */}
      {tab==="users" && (
        <div className="mt-6 grid gap-6">
          <Section
            title="Users"
            right={
              <div className="flex items-center gap-2">
                <input
                  placeholder="Search email or id…"
                  value={userQuery}
                  onChange={(e)=>setUserQuery((e.target as HTMLInputElement).value)}
                  className="h-9 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)] w-60"
                />
                <button onClick={refreshUsers} className="px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)] text-sm">
                  {usersLoading ? "Refreshing…" : "Refresh"}
                </button>
              </div>
            }
          >
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Created</th>
                    <th className="py-2 pr-3">Confirmed</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3 w-[460px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u=>(
                    <tr key={u.id} className="border-t">
                      <td className="py-2 pr-3">{u.email ?? u.id}</td>
                      <td className="py-2 pr-3">{u.created_at ?? "—"}</td>
                      <td className="py-2 pr-3">{u.email_confirmed_at ? "Yes" : "No"}</td>
                      <td className="py-2 pr-3">{u.banned ? "Banned" : "Active"}</td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={()=>{ setSelectedUser(u); setSelectedPurchases(null); void loadPurchases(u.id); }} className="px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)] text-xs">View</button>
                          <button onClick={()=>void generateConfirmLink(u.email)} disabled={!u.email} className="px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)] text-xs">Confirm Link</button> <button onClick={()=>void generateResetLink(selectedUser.email)} disabled={!selectedUser.email} className="px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)] text-sm disabled:opacity-50">Reset PW</button> <button onClick={()=>void act(selectedUser.id,"delete")} disabled={userActionBusy === `delete:${selectedUser.id}`} className="px-3 py-1.5 rounded-lg bg-red-700 text-white text-sm disabled:opacity-50">Delete</button> <button onClick={()=>void generateResetLink(u.email)} disabled={!u.email} className="px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)] text-xs">Reset PW</button> <button onClick={()=>void act(u.id,"delete")} disabled={userActionBusy === `delete:${u.id}`} className="px-3 py-1.5 rounded-lg bg-red-700 text-white text-xs">Delete</button>
                          {u.banned ? (
                            <button onClick={()=>void act(u.id,"unban")} disabled={userActionBusy === `unban:${u.id}`} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs disabled:opacity-50">Unban</button>
                          ) : (
                            <button onClick={()=>void act(u.id,"ban")} disabled={userActionBusy === `ban:${u.id}`} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs disabled:opacity-50">Ban</button>
                          )}
                          <button onClick={()=>void act(u.id,"revoke")} disabled={userActionBusy === `revoke:${u.id}`} className="px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)] text-xs disabled:opacity-50">Revoke Sessions</button>
                          <button onClick={()=>void act(u.id,"clear-history")} disabled={userActionBusy === `clear-history:${u.id}`} className="px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)] text-xs disabled:opacity-50">Clear History</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length===0 && (
                    <tr><td colSpan={5} className="py-3 text-sm text-muted">No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Drawer / Modal for selected user */}
            {selectedUser && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/40" onClick={()=>{ setSelectedUser(null); setSelectedPurchases(null); }} />
                <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white border border-light p-5 max-h-[90vh] overflow-auto">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">User Details</div>
                    <button onClick={()=>{ setSelectedUser(null); setSelectedPurchases(null); }} className="text-sm">Close</button>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm">
                    <div><span className="text-muted">ID:</span> {selectedUser.id}</div>
                    <div><span className="text-muted">Email:</span> {selectedUser.email ?? "—"}</div>
                    <div><span className="text-muted">Created:</span> {selectedUser.created_at ?? "—"}</div>
                    <div><span className="text-muted">Confirmed:</span> {selectedUser.email_confirmed_at ? "Yes" : "No"}</div>
                    <div><span className="text-muted">Status:</span> {selectedUser.banned ? "Banned" : "Active"}</div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg p-3 ring-1 ring-[color:var(--color-light)]">
                      <div className="font-medium">Courses Purchased</div>
                      <ul className="mt-2 text-sm list-disc ms-5">
                        {(selectedPurchases?.courses ?? []).map((c, i)=>(<li key={i}>{c.title}</li>))}
                        {(selectedPurchases?.courses?.length ?? 0)===0 && <li className="text-muted">None</li>}
                      </ul>
                    </div>
                    <div className="rounded-lg p-3 ring-1 ring-[color:var(--color-light)]">
                      <div className="font-medium">E-books Purchased</div>
                      <ul className="mt-2 text-sm list-disc ms-5">
                        {(selectedPurchases?.ebooks ?? []).map((e, i)=>(<li key={i}>{e.title}</li>))}
                        {(selectedPurchases?.ebooks?.length ?? 0)===0 && <li className="text-muted">None</li>}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedUser.banned
                      ? <button onClick={()=>void act(selectedUser.id,"unban")} disabled={userActionBusy === `unban:${selectedUser.id}`} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm disabled:opacity-50">Unban</button>
                      : <button onClick={()=>void act(selectedUser.id,"ban")} disabled={userActionBusy === `ban:${selectedUser.id}`} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm disabled:opacity-50">Ban</button>}
                    <button onClick={()=>void act(selectedUser.id,"revoke")} disabled={userActionBusy === `revoke:${selectedUser.id}`} className="px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)] text-sm disabled:opacity-50">Revoke Sessions</button>
                    <button onClick={()=>void act(selectedUser.id,"clear-history")} disabled={userActionBusy === `clear-history:${selectedUser.id}`} className="px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)] text-sm disabled:opacity-50">Clear History</button>
                    <button onClick={()=>void generateConfirmLink(selectedUser.email)} disabled={!selectedUser.email} className="px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)] text-sm disabled:opacity-50">Confirm Link</button> <button onClick={()=>void generateResetLink(selectedUser.email)} disabled={!selectedUser.email} className="px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)] text-sm disabled:opacity-50">Reset PW</button> <button onClick={()=>void act(selectedUser.id,"delete")} disabled={userActionBusy === `delete:${selectedUser.id}`} className="px-3 py-1.5 rounded-lg bg-red-700 text-white text-sm disabled:opacity-50">Delete</button> <button onClick={()=>void generateResetLink(u.email)} disabled={!u.email} className="px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)] text-xs">Reset PW</button> <button onClick={()=>void act(u.id,"delete")} disabled={userActionBusy === `delete:${u.id}`} className="px-3 py-1.5 rounded-lg bg-red-700 text-white text-xs">Delete</button>
                  </div>
                </div>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* ================= Deploy ================= */}
      {tab==="deploy" && (
        <div className="mt-6">
          <Section title="Deployment">
            <p className="text-sm text-muted">Trigger a Vercel rebuild (requires <code>VERCEL_DEPLOY_HOOK_URL</code>).</p>
            <button onClick={triggerDeploy} className="mt-3 rounded-lg bg-[color:#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90">Trigger Deploy</button>
          </Section>
        </div>
      )}
    </div>
  );
}

/* ====================== Subcomponent: PriceRow ====================== */
function PriceRow({
  row,
  onSave
}: {
  row: { kind: "course" | "ebook"; id: string; title: string; price: number; currency: "GHS" | "USD" };
  onSave: (r: { kind: "course" | "ebook"; id: string; price: number }) => Promise<void>;
}) {
  const [val, setVal] = useState<string>(row.price.toString());
  const [saving, setSaving] = useState(false);
  useEffect(() => { setVal(row.price.toString()); }, [row.price]);

  async function handleSave() {
    const p = Number(val);
    if (!Number.isFinite(p) || p < 0) { alert("Enter a valid price"); return; }
    setSaving(true);
    await onSave({ kind: row.kind, id: row.id, price: p });
    setSaving(false);
  }

  return (
    <tr className="border-t">
      <td className="py-2 pr-3 capitalize">{row.kind}</td>
      <td className="py-2 pr-3">{row.title}</td>
      <td className="py-2 pr-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">{row.currency}</span>
          <input
            value={val}
            onChange={(e)=>setVal((e.target as HTMLInputElement).value)}
            className="h-9 w-32 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
          />
        </div>
      </td>
      <td className="py-2 pr-3">
        <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 rounded-lg bg-[color:#0a1156] text-white text-sm hover:opacity-90 disabled:opacity-50">
          {saving ? "Saving…" : "Save"}
        </button>
      </td>
    </tr>
  );
}
