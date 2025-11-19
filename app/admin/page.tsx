"use client";

type UserAction = "ban" | "unban" | "revoke" | "clear-history" | "delete";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ─────────────────────────────── Types ─────────────────────────────── */
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
  price_cents: number; // USD cents
  published: boolean;
  created_at?: string | null;
};
type FinalExam = {
  id?: string;
  course_id: string;
  title: string;
  pass_mark: number; // %
  time_limit_minutes?: number | null;
  created_at?: string | null;
};
type FinalExamQuestion = {
  id?: string;
  exam_id: string;
  prompt: string;
  options: string[];
  correct_index: number;
  created_at?: string | null;
};

/* ───────────────────────────── Utilities ───────────────────────────── */
const isStr = (x: unknown): x is string => typeof x === "string";
const num = (x: unknown, d = 0): number => {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  const n = Number(x);
  return Number.isFinite(n) ? n : d;
};
const toCsv = (v: string[] | null | undefined) => (v ?? []).join(", ");
const fromCsv = (v: string) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/* Adapters (safe parsing) */
function asAdminUser(x: unknown): AdminUser {
  const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  return {
    id: String(r["id"] ?? ""),
    email: isStr(r["email"]) ? r["email"] : undefined,
    email_confirmed_at: isStr(r["email_confirmed_at"])
      ? r["email_confirmed_at"]
      : null,
    created_at: isStr(r["created_at"]) ? r["created_at"] : null,
    banned: typeof r["banned"] === "boolean" ? r["banned"] : null,
  };
}
function asKnowledgeArray(x: unknown): Knowledge[] {
  if (!Array.isArray(x)) return [];
  return x.map((k) => {
    const r = (k && typeof k === "object" ? k : {}) as Record<string, unknown>;
    return {
      id: isStr(r["id"]) ? r["id"] : undefined,
      slug: String(r["slug"] ?? ""),
      title: String(r["title"] ?? ""),
      description: isStr(r["description"]) ? r["description"] : null,
      level: isStr(r["level"]) ? r["level"] : null,
      price: typeof r["price"] === "number" ? r["price"] : null,
      cpd_points: typeof r["cpd_points"] === "number" ? r["cpd_points"] : null,
      img: isStr(r["img"]) ? r["img"] : null,
      accredited: Array.isArray(r["accredited"])
        ? (r["accredited"] as string[])
        : null,
      published: typeof r["published"] === "boolean" ? r["published"] : null,
    };
  });
}
function asChapters(x: unknown): Chapter[] {
  if (!Array.isArray(x)) return [];
  return x.map((c) => {
    const r = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
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
    const r = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
    return {
      id: isStr(r["id"]) ? r["id"] : undefined,
      chapter_id: String(r["chapter_id"] ?? ""),
      title: String(r["title"] ?? ""),
      order_index: Number(r["order_index"] ?? 0),
      intro_video_url: isStr(r["intro_video_url"])
        ? r["intro_video_url"]
        : null,
      asset_url: isStr(r["asset_url"]) ? r["asset_url"] : null,
      body: isStr(r["body"]) ? r["body"] : null,
      created_at: isStr(r["created_at"]) ? r["created_at"] : null,
    };
  });
}
function asQuizSettings(x: unknown, chapterId: string): QuizSettings {
  const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  return {
    chapter_id: chapterId,
    time_limit_seconds:
      typeof r["time_limit_seconds"] === "number"
        ? r["time_limit_seconds"]
        : null,
    num_questions:
      typeof r["num_questions"] === "number" ? r["num_questions"] : null,
  };
}
function asQuizQuestions(x: unknown): QuizQuestion[] {
  if (!Array.isArray(x)) return [];
  return x.map((q) => {
    const r = (q && typeof q === "object" ? q : {}) as Record<string, unknown>;
    const opts = Array.isArray(r["options"])
      ? (r["options"] as unknown[]).map(String)
      : [];
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
    const r = (e && typeof e === "object" ? e : {}) as Record<string, unknown>;
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
function asFinalExam(x: unknown, course_id: string): FinalExam | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  return {
    id: isStr(r["id"]) ? r["id"] : undefined,
    course_id,
    title: String(r["title"] ?? "Final Exam"),
    pass_mark: num(r["pass_mark"], 50),
    time_limit_minutes:
      typeof r["time_limit_minutes"] === "number"
        ? r["time_limit_minutes"]
        : null,
    created_at: isStr(r["created_at"]) ? r["created_at"] : null,
  };
}
function asFinalExamQuestions(x: unknown): FinalExamQuestion[] {
  if (!Array.isArray(x)) return [];
  return x.map((q) => {
    const r = (q && typeof q === "object" ? q : {}) as Record<string, unknown>;
    const opts = Array.isArray(r["options"])
      ? (r["options"] as unknown[]).map(String)
      : [];
    return {
      id: isStr(r["id"]) ? r["id"] : undefined,
      exam_id: String(r["exam_id"] ?? ""),
      prompt: String(r["prompt"] ?? r["question"] ?? ""),
      options: opts,
      correct_index: Number(r["correct_index"] ?? 0),
      created_at: isStr(r["created_at"]) ? r["created_at"] : undefined,
    };
  });
}

/* ───────────────────────────── UI Helpers ─────────────────────────── */
function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/* ───────────────────────────── Component ──────────────────────────── */
export default function AdminPage() {
  /* Tabs (Overview removed) */
  type Tab = "catalog" | "content" | "prices" | "media" | "users" | "deploy";
  const [tab, setTab] = useState<Tab>("catalog");

  /* ── Catalog (Courses + Ebooks) ── */
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
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

  const refreshKnowledgeAbort = useRef<AbortController | null>(null);
  const refreshKnowledge = useCallback(async () => {
    refreshKnowledgeAbort.current?.abort();
    const ac = new AbortController();
    refreshKnowledgeAbort.current = ac;
    const r = await fetch("/api/admin/knowledge", {
      cache: "no-store",
      signal: ac.signal,
    });
    const d = await r.json();
    setKnowledge(asKnowledgeArray(d));
  }, []);
  useEffect(() => {
    if (tab === "catalog" || tab === "content" || tab === "prices")
      void refreshKnowledge();
  }, [tab, refreshKnowledge]);

  async function saveKnowledge() {
    setSavingK(true);
    const payload: Knowledge = {
      ...kForm,
      accredited: fromCsv(toCsv(kForm.accredited ?? [])),
    };
    const r = await fetch("/api/admin/knowledge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSavingK(false);
    if (!r.ok) return alert("Save failed");
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
  }

  async function deleteCourse(id?: string) {
    if (!id) return;
    if (!confirm("Delete this course and its content?")) return;
    const r = await fetch(`/api/admin/knowledge/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!r.ok) return alert("Delete failed");
    if (selectedCourseId === id) {
      setSelectedCourseId("");
      resetContentState();
    }
    await refreshKnowledge();
  }

  /* ── Content Builder (Course → Chapter → Slide → Quiz) ── */
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const selectedCourse = useMemo(
    () => knowledge.find((k) => (k.id ?? "") === selectedCourseId) ?? null,
    [knowledge, selectedCourseId],
  );

  const emptyChapter = useMemo<Chapter>(
    () => ({ course_id: "", title: "", order_index: 0 }),
    [],
  );
  const emptySlide = useMemo<Slide>(
    () => ({
      chapter_id: "",
      title: "",
      order_index: 0,
      intro_video_url: "",
      asset_url: "",
      body: "",
    }),
    [],
  );

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chForm, setChForm] = useState<Chapter>(emptyChapter);
  const [savingChapter, setSavingChapter] = useState(false);

  const [slides, setSlides] = useState<Slide[]>([]);
  const [slForm, setSlForm] = useState<Slide>(emptySlide);
  const [savingSlide, setSavingSlide] = useState(false);

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
  const [bulkQuizStatus, setBulkQuizStatus] = useState<string>("");

  const chaptersAbort = useRef<AbortController | null>(null);
  const slidesAbort = useRef<AbortController | null>(null);
  const quizAbort = useRef<AbortController | null>(null);

  const refreshChapters = useCallback(
    async (courseId: string) => {
      chaptersAbort.current?.abort();
      const ac = new AbortController();
      chaptersAbort.current = ac;
      if (!courseId) {
        setChapters([]);
        setChForm({ ...emptyChapter, course_id: "" });
        return;
      }
      const r = await fetch(
        `/api/admin/chapters?course_id=${encodeURIComponent(courseId)}`,
        { cache: "no-store", signal: ac.signal },
      );
      const d = await r.json();
      if (courseId !== selectedCourseId) return; // guard
      const rows = asChapters(d);
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
    [selectedCourseId, chForm.id, emptyChapter],
  );

  const refreshSlides = useCallback(
    async (chapterId: string) => {
      slidesAbort.current?.abort();
      const ac = new AbortController();
      slidesAbort.current = ac;
      if (!chapterId) return setSlides([]);
      const r = await fetch(
        `/api/admin/slides?chapter_id=${encodeURIComponent(chapterId)}`,
        { cache: "no-store", signal: ac.signal },
      );
      const d = await r.json();
      if (chapterId !== (chForm.id ?? "")) return;
      setSlides(asSlides(d));
    },
    [chForm.id],
  );

  const refreshQuiz = useCallback(
    async (chapterId: string) => {
      quizAbort.current?.abort();
      const ac = new AbortController();
      quizAbort.current = ac;

      if (!chapterId) {
        setQuizSettings({ chapter_id: "", time_limit_seconds: 120, num_questions: null });
        setQuestions([]);
        setQForm({ chapter_id: "", question: "", options: [], correct_index: 0 });
        return;
      }
      const r1 = await fetch(
        `/api/admin/quiz-settings?chapter_id=${encodeURIComponent(chapterId)}`,
        { cache: "no-store", signal: ac.signal },
      );
      const d1 = r1.ok ? await r1.json() : {};
      if (chapterId === (chForm.id ?? ""))
        setQuizSettings(asQuizSettings(d1 ?? {}, chapterId));

      const r2 = await fetch(
        `/api/admin/quiz-questions?chapter_id=${encodeURIComponent(chapterId)}`,
        { cache: "no-store", signal: ac.signal },
      );
      const d2 = r2.ok ? await r2.json() : [];
      if (chapterId === (chForm.id ?? "")) {
        setQuestions(asQuizQuestions(d2));
        setQForm((f) => ({ ...f, chapter_id: chapterId }));
      }
    },
    [chForm.id],
  );

  const resetContentState = useCallback(() => {
    setChapters([]);
    setChForm({ ...emptyChapter, course_id: "" });
    setSlides([]);
    setSlForm({ ...emptySlide, chapter_id: "" });
    setQuizSettings({ chapter_id: "", time_limit_seconds: 120, num_questions: null });
    setQuestions([]);
    setQForm({ chapter_id: "", question: "", options: [], correct_index: 0 });
    setExam(null);
    setExamQ([]);
    setExamForm({
      course_id: "",
      title: "Final Exam",
      pass_mark: 50,
      time_limit_minutes: 30,
    });
    setExamQForm({
      exam_id: "",
      prompt: "",
      options: [],
      correct_index: 0,
    });
  }, [emptyChapter, emptySlide]);

  async function saveChapter() {
    if (!selectedCourseId || !chForm.title.trim()) return alert("Course & Title required");
    setSavingChapter(true);
    const payload = {
      id: chForm.id,
      course_id: selectedCourseId,
      title: chForm.title.trim(),
      order_index: Number.isFinite(chForm.order_index) ? chForm.order_index : 0,
    };
    const r = await fetch("/api/admin/chapters", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSavingChapter(false);
    if (!r.ok) return alert("Save chapter failed");
    await refreshChapters(selectedCourseId);
  }

  async function deleteChapter(id?: string) {
    if (!id) return;
    if (!confirm("Delete this chapter and its slides?")) return;
    const r = await fetch(`/api/admin/chapters/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!r.ok) return alert("Delete failed");
    await refreshChapters(selectedCourseId);
  }

  async function saveSlide() {
    if (!slForm.chapter_id || !slForm.title.trim()) return alert("Chapter & Title required");
    setSavingSlide(true);
    const payload = {
      id: slForm.id || undefined,
      chapter_id: slForm.chapter_id,
      title: slForm.title.trim(),
      order_index: Number.isFinite(slForm.order_index) ? Number(slForm.order_index) : 0,
      intro_video_url: slForm.intro_video_url?.trim() || null,
      asset_url: slForm.asset_url?.trim() || null,
      body: slForm.body ?? null, // preserve formatting/spacing
    };
    const r = await fetch("/api/admin/slides", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSavingSlide(false);
    if (!r.ok) return alert("Save slide failed");
    await refreshSlides(slForm.chapter_id);
  }

  async function deleteSlide(id?: string) {
    if (!id) return;
    if (!confirm("Delete this slide?")) return;
    const r = await fetch(`/api/admin/slides?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!r.ok) return alert("Delete failed");
    await refreshSlides(chForm.id ?? "");
    if (slForm.id === id) setSlForm({ ...emptySlide, chapter_id: chForm.id ?? "" });
  }

  /* Uploads */
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>("");
  async function uploadToStorage(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", file.name);
    const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
    if (!r.ok) return null;
    const d = await r.json();
    const url =
      d && typeof d === "object"
        ? (d as Record<string, unknown>)["publicUrl"]
        : null;
    return isStr(url) ? url : null;
  }
  async function onPick(file: File, target: "intro" | "asset") {
    setUploading(true);
    const url = await uploadToStorage(file);
    setUploading(false);
    if (!url) return alert("Upload failed");
    if (target === "intro") setSlForm((f) => ({ ...f, intro_video_url: url }));
    if (target === "asset") setSlForm((f) => ({ ...f, asset_url: url }));
    setUploadedUrl(url);
  }

  /* Chapter Quiz */
  const [quizSaving, setQuizSaving] = useState(false);
  async function saveQuizSettings() {
    if (!quizSettings.chapter_id) return alert("Pick a chapter");
    setQuizSaving(true);
    const r = await fetch("/api/admin/quiz-settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(quizSettings),
    });
    setQuizSaving(false);
    if (!r.ok) return alert("Save quiz settings failed");
    const saved = await r.json();
    setQuizSettings(asQuizSettings(saved, quizSettings.chapter_id));
  }

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingQ, setEditingQ] = useState<QuizQuestion | null>(null);

  async function saveQuestion() {
    if (!qForm.chapter_id || !qForm.question.trim()) return alert("Chapter & Question required");
    if ((qForm.options?.length ?? 0) < 2) return alert("At least 2 options");
    if (qForm.correct_index < 0 || qForm.correct_index >= qForm.options.length)
      return alert("Correct index out of range");

    const r = await fetch("/api/admin/quiz-questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(qForm),
    });
    if (!r.ok) return alert("Save question failed");
    await refreshQuiz(qForm.chapter_id);
    setQForm({
      chapter_id: qForm.chapter_id,
      question: "",
      options: [],
      correct_index: 0,
      id: undefined,
    });
  }
  async function deleteQuestion(id?: string) {
    if (!id) return;
    if (!confirm("Delete this question?")) return;
    const r = await fetch(`/api/admin/quiz-questions?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!r.ok) return alert("Delete failed");
    await refreshQuiz(quizSettings.chapter_id);
  }
  async function uploadQuizCsv(file: File) {
    setBulkQuizStatus("Uploading…");
    const text = await file.text();
    const r = await fetch("/api/admin/quiz-questions/bulk", {
      method: "POST",
      headers: { "content-type": "text/csv" },
      body: text,
    });
    const d = await r.json();
    if (r.ok) {
      setBulkQuizStatus(`Uploaded ${d.inserted ?? 0} questions`);
      if (chForm.id) await refreshQuiz(chForm.id);
    } else {
      setBulkQuizStatus(d?.error ? `Failed: ${d.error}` : "Failed");
    }
  }
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
    if (!editingQ.chapter_id || !editingQ.question.trim()) return alert("Chapter & Question required");
    if ((editingQ.options?.length ?? 0) < 2) return alert("At least 2 options");
    if (editingQ.correct_index < 0 || editingQ.correct_index >= editingQ.options.length)
      return alert("Correct index out of range");

    const r = await fetch("/api/admin/quiz-questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editingQ),
    });
    if (!r.ok) return alert("Update failed");
    await refreshQuiz(editingQ.chapter_id);
    setEditingQuestionId(null);
    setEditingQ(null);
  }

  /* ── FINAL EXAM (Course-level) ── */
  const [exam, setExam] = useState<FinalExam | null>(null);
  const [examForm, setExamForm] = useState<FinalExam>({
    course_id: "",
    title: "Final Exam",
    pass_mark: 50,
    time_limit_minutes: 30,
  });
  const [examSaving, setExamSaving] = useState(false);

  const [examQ, setExamQ] = useState<FinalExamQuestion[]>([]);
  const [examQForm, setExamQForm] = useState<FinalExamQuestion>({
    exam_id: "",
    prompt: "",
    options: [],
    correct_index: 0,
  });
  const [editingExamQId, setEditingExamQId] = useState<string | null>(null);
  const [bulkExamStatus, setBulkExamStatus] = useState<string>("");
  const examAbort = useRef<AbortController | null>(null);

  const refreshExamQuestions = useCallback(async (examId: string) => {
    const r = await fetch(
      `/api/admin/exam-questions?exam_id=${encodeURIComponent(examId)}`,
      { cache: "no-store" },
    );
    const d = r.ok ? await r.json() : [];
    setExamQ(asFinalExamQuestions(d));
  }, []);

  const refreshExam = useCallback(async (courseId: string) => {
    examAbort.current?.abort();
    const ac = new AbortController();
    examAbort.current = ac;

    // fetch exam
    const r = await fetch(`/api/admin/exams?course_id=${encodeURIComponent(courseId)}`, {
      cache: "no-store",
      signal: ac.signal,
    });
    if (r.ok) {
      const d = await r.json();
      // API may return single exam or array — normalize:
      const ex =
        Array.isArray(d) ? (d[0] ?? null) : d && typeof d === "object" ? d : null;
      const parsed = ex ? asFinalExam(ex, courseId) : null;
      setExam(parsed);
      if (parsed?.id) {
        void refreshExamQuestions(parsed.id);
        setExamForm(parsed);
        setExamQForm((f) => ({ ...f, exam_id: parsed.id! }));
      } else {
        setExamQ([]);
        setExamForm({
          course_id: courseId,
          title: "Final Exam",
          pass_mark: 50,
          time_limit_minutes: 30,
        });
        setExamQForm({ exam_id: "", prompt: "", options: [], correct_index: 0 });
      }
    } else {
      setExam(null);
      setExamQ([]);
    }
  }, [refreshExamQuestions]);

  // React to course / chapter changes
  useEffect(() => {
    if (!selectedCourseId) {
      resetContentState();
      return;
    }
    void refreshChapters(selectedCourseId);
    void refreshExam(selectedCourseId);
  }, [selectedCourseId, refreshChapters, refreshExam, resetContentState]);

  useEffect(() => {
    const id = chForm.id ?? "";
    void refreshSlides(id);
    void refreshQuiz(id);
    setSlForm((s) => ({ ...s, chapter_id: id }));
  }, [chForm.id, refreshSlides, refreshQuiz]);

  async function saveExam() {
    if (!selectedCourseId) return alert("Pick a course first");
    if (!examForm.title.trim()) return alert("Exam title required");
    const payload: FinalExam = {
      id: exam?.id,
      course_id: selectedCourseId,
      title: examForm.title.trim(),
      pass_mark: Math.max(0, Math.min(100, num(examForm.pass_mark, 50))),
      time_limit_minutes:
        examForm.time_limit_minutes == null
          ? null
          : Math.max(1, Math.floor(num(examForm.time_limit_minutes, 30))),
    };
    setExamSaving(true);
    const r = await fetch("/api/admin/exams", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setExamSaving(false);
    if (!r.ok) return alert("Save exam failed");
    const saved = await r.json();
    const parsed = asFinalExam(saved, selectedCourseId);
    setExam(parsed);
    if (parsed?.id) {
      setExamForm(parsed);
      setExamQForm((f) => ({ ...f, exam_id: parsed.id! }));
      await refreshExamQuestions(parsed.id);
    }
  }

  async function deleteExam() {
    if (!exam?.id) return;
    if (!confirm("Delete the final exam (and its questions)?")) return;
    const r = await fetch(`/api/admin/exams?id=${encodeURIComponent(exam.id)}`, {
      method: "DELETE",
    });
    if (!r.ok) return alert("Delete failed");
    setExam(null);
    setExamQ([]);
    setExamForm({
      course_id: selectedCourseId,
      title: "Final Exam",
      pass_mark: 50,
      time_limit_minutes: 30,
    });
    setExamQForm({ exam_id: "", prompt: "", options: [], correct_index: 0 });
  }

  async function saveExamQuestion() {
    if (!exam?.id) return alert("Create the exam first");
    if (!examQForm.prompt.trim()) return alert("Question is required");
    if ((examQForm.options?.length ?? 0) < 2) return alert("At least 2 options");
    if (examQForm.correct_index < 0 || examQForm.correct_index >= examQForm.options.length)
      return alert("Correct index out of range");

    const payload = { ...examQForm, exam_id: exam.id, question: examQForm.prompt };
    const r = await fetch("/api/admin/exam-questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return alert("Save question failed");
    await refreshExamQuestions(exam.id);
    setExamQForm({ exam_id: exam.id, prompt: "", options: [], correct_index: 0, id: undefined });
    setEditingExamQId(null);
  }

  function startEditExamQuestion(q: FinalExamQuestion) {
    setEditingExamQId(q.id ?? null);
    setExamQForm({
      ...q,
      exam_id: exam?.id ?? q.exam_id ?? "",
      prompt: q.prompt ?? "",
      options: q.options ?? [],
      correct_index: q.correct_index ?? 0,
    });
  }

  function cancelEditExamQuestion() {
    setEditingExamQId(null);
    setExamQForm({ exam_id: exam?.id ?? "", prompt: "", options: [], correct_index: 0, id: undefined });
  }

  async function deleteExamQuestion(id?: string) {
    if (!id || !exam?.id) return;
    if (!confirm("Delete this exam question?")) return;
    const r = await fetch(
      `/api/admin/exam-questions?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    if (!r.ok) return alert("Delete failed");
    await refreshExamQuestions(exam.id);
  }
  async function uploadExamCsv(file: File) {
    setBulkExamStatus("Uploading…");
    const text = await file.text();
    const r = await fetch("/api/admin/exam-questions/bulk", {
      method: "POST",
      headers: { "content-type": "text/csv" },
      body: text,
    });
    const d = await r.json();
    if (r.ok) {
      setBulkExamStatus(`Uploaded ${d.inserted ?? 0} questions`);
      if (exam?.id) await refreshExamQuestions(exam.id);
    } else {
      setBulkExamStatus(d?.error ? `Failed: ${d.error}` : "Failed");
    }
  }

  /* ── Ebooks ── */
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

  const refreshEbooksAbort = useRef<AbortController | null>(null);
  const refreshEbooks = useCallback(async () => {
    refreshEbooksAbort.current?.abort();
    const ac = new AbortController();
    refreshEbooksAbort.current = ac;
    setLoadingEbooks(true);
    try {
      const r = await fetch("/api/admin/ebooks", {
        cache: "no-store",
        signal: ac.signal,
      });
      const d = await r.json();
      setEbooks(asEbooks(d));
    } finally {
      setLoadingEbooks(false);
    }
  }, []);
  useEffect(() => {
    if (tab === "catalog" || tab === "prices") void refreshEbooks();
  }, [tab, refreshEbooks]);

  async function saveEbook() {
    if (!ebookForm.slug.trim() || !ebookForm.title.trim())
      return alert("Slug & Title required");
    setSavingEbook(true);
    const payload: Ebook = {
      ...ebookForm,
      price_cents: num(ebookForm.price_cents, 0),
      cover_url: ebookForm.cover_url?.trim() || null,
      sample_url: ebookForm.sample_url?.trim() || null,
      kpf_url: ebookForm.kpf_url?.trim() || null,
    };
    const r = await fetch("/api/admin/ebooks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSavingEbook(false);
    if (!r.ok) return alert("Save e-book failed");
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
  }
  async function deleteEbook(id?: string) {
    if (!id) return;
    if (!confirm("Delete e-book?")) return;
    const r = await fetch(`/api/admin/ebooks/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!r.ok) return alert("Delete failed");
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
  }
  async function onPickEbook(file: File, field: "cover_url" | "sample_url" | "kpf_url") {
    setUploading(true);
    const url = await uploadToStorage(file);
    setUploading(false);
    if (!url) return alert("Upload failed");
    setEbookForm((f) => ({ ...f, [field]: url }));
  }

  /* ── Users ── */
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedPurchases, setSelectedPurchases] = useState<{
    courses: Array<{ title: string }>;
    ebooks: Array<{ title: string }>;
  } | null>(null);

  const refreshUsersAbort = useRef<AbortController | null>(null);
  const refreshUsers = useCallback(async () => {
    refreshUsersAbort.current?.abort();
    const ac = new AbortController();
    refreshUsersAbort.current = ac;
    setUsersLoading(true);
    try {
      const r = await fetch("/api/admin/users", {
        cache: "no-store",
        signal: ac.signal,
      });
      const d = await r.json();
      const arr = Array.isArray(d?.users) ? d.users : [];
      setUsers(arr.map(asAdminUser));
    } finally {
      setUsersLoading(false);
    }
  }, []);
  useEffect(() => {
    if (tab === "users") void refreshUsers();
  }, [tab, refreshUsers]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.email ?? u.id).toLowerCase().includes(q));
  }, [userQuery, users]);

  async function generateConfirmLink(email?: string) {
    if (!email) return;
    const r = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "generate_confirmation_link", email }),
    });
    const d = await r.json();
    const link =
      d && typeof d === "object" ? (d as Record<string, unknown>)["link"] : null;
    if (isStr(link)) {
      await navigator.clipboard.writeText(link);
      alert("Confirmation link copied");
    } else {
      alert("Could not generate link");
    }
  }
  async function generateResetLink(email?: string) {
    if (!email) return;
    const r = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "generate_reset_link", email }),
    });
    const d = await r.json();
    const link =
      d && typeof d === "object" ? (d as Record<string, unknown>)["link"] : null;
    if (isStr(link)) {
      await navigator.clipboard.writeText(link);
      alert("Reset link copied");
    } else {
      alert("Could not generate reset link");
    }
  }

  const [userActionBusy, setUserActionBusy] = useState<string | null>(null);
  const [courseActionBusy, setCourseActionBusy] = useState<string | null>(null);
  async function act(userId: string, endpoint: UserAction): Promise<void> {
    setUserActionBusy(`${endpoint}:${userId}`);
    const url =
      endpoint === "delete"
        ? `/api/admin/users/${encodeURIComponent(userId)}/delete`
        : `/api/admin/users/${encodeURIComponent(userId)}/${endpoint}`;
    const r = await fetch(url, { method: "POST" });
    setUserActionBusy(null);
    if (!r.ok) return alert(`Failed to ${endpoint.replace("-", " ")}`);
    await refreshUsers();
    if (selectedUser?.id === userId)
      setSelectedUser((u) =>
        u
          ? {
              ...u,
              banned:
                endpoint === "ban" ? true : endpoint === "unban" ? false : (u.banned ?? null),
            }
          : u,
      );
  }
  async function loadPurchases(userId: string) {
    const r = await fetch(
      `/api/admin/users/${encodeURIComponent(userId)}/purchases`,
      { cache: "no-store" },
    );
    if (!r.ok) return setSelectedPurchases({ courses: [], ebooks: [] });
    const d = await r.json();
    const courses = Array.isArray(d?.courses) ? d.courses : [];
    const ebooks = Array.isArray(d?.ebooks) ? d.ebooks : [];
    setSelectedPurchases({ courses, ebooks });
  }

  async function removePurchase(kind: "course" | "ebook", target_id: string) {
    if (!selectedUser?.id) return;
    if (!confirm(`Remove this ${kind} from user?`)) return;
    const r = await fetch(`/api/admin/users/${encodeURIComponent(selectedUser.id)}/purchases`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, target_id }),
    });
    if (!r.ok) return alert("Failed to remove");
    await loadPurchases(selectedUser.id);
  }

  async function unlockCourse(course_id: string) {
    if (!selectedUser?.id) return;
    setCourseActionBusy(`unlock:${course_id}`);
    const r = await fetch(`/api/admin/users/${encodeURIComponent(selectedUser.id)}/complete-course`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ course_id }),
    });
    setCourseActionBusy(null);
    if (!r.ok) return alert("Failed to unlock");
    alert("Course marked complete and final exam unlocked for this user.");
  }

  async function resetCourse(scope: "exam" | "course", course_id: string) {
    if (!selectedUser?.id) return;
    const msg = scope === "course" ? "Reset this course progress for the user?" : "Reset the final exam for this user?";
    if (!confirm(msg)) return;
    setCourseActionBusy(`${scope}:${course_id}`);
    const r = await fetch(`/api/admin/users/${encodeURIComponent(selectedUser.id)}/reset-course`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ course_id, scope }),
    });
    setCourseActionBusy(null);
    if (!r.ok) return alert("Failed to reset. Please try again.");
    if (scope === "course") {
      await loadPurchases(selectedUser.id);
      alert("Course progress reset. The learner can start fresh.");
    } else {
      alert("Final exam reset. The learner can retake it.");
    }
  }

  /* ── Quick Prices ── */
  const [priceSearch, setPriceSearch] = useState("");
  const priceRows = useMemo(() => {
    const rows: Array<{
      kind: "course" | "ebook";
      id: string;
      title: string;
      price: number;
      currency: "GHS" | "USD";
    }> = [];
    knowledge.forEach((k) =>
      rows.push({
        kind: "course",
        id: k.id ?? k.slug,
        title: k.title,
        price: k.price ?? 0,
        currency: "GHS",
      }),
    );
    ebooks.forEach((e) =>
      rows.push({
        kind: "ebook",
        id: e.id ?? e.slug,
        title: e.title,
        price: e.price_cents / 100,
        currency: "USD",
      }),
    );
    const q = priceSearch.trim().toLowerCase();
    return q ? rows.filter((r) => r.title.toLowerCase().includes(q)) : rows;
  }, [knowledge, ebooks, priceSearch]);

  async function savePrice(row: { kind: "course" | "ebook"; id: string; price: number }) {
    if (row.kind === "course") {
      const item = knowledge.find((k) => (k.id ?? k.slug) === row.id);
      if (!item) return;
      const payload = { ...item, price: row.price };
      const r = await fetch("/api/admin/knowledge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) return alert("Save course price failed");
      await refreshKnowledge();
    } else {
      const item = ebooks.find((e) => (e.id ?? e.slug) === row.id);
      if (!item) return;
      const payload = { ...item, price_cents: Math.round(row.price * 100) };
      const r = await fetch("/api/admin/ebooks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) return alert("Save e-book price failed");
      await refreshEbooks();
    }
  }

  /* ── Deploy ── */
  async function triggerDeploy() {
    const r = await fetch("/api/admin/deploy", { method: "POST" });
    const d = await r.json();
    const ok = d && typeof d === "object" ? (d as Record<string, unknown>)["ok"] : null;
    const text = d && typeof d === "object" ? (d as Record<string, unknown>)["text"] : null;
    alert(ok ? "Deploy triggered" : `Failed: ${String(text ?? "Unknown error")}`);
  }

  /* ── Render ── */
  return (
    <div className="mx-auto max-w-screen-2xl px-4 md:px-6 py-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Master Admin</h1>
        <div className="flex flex-wrap gap-2">
          {(["catalog", "content", "prices", "media", "users", "deploy"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-sm transition ${
                tab === t ? "bg-[#0a1156] text-white" : "bg-white hover:bg-slate-50"
              }`}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ───────────── Catalog ───────────── */}
      {tab === "catalog" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Section title="Course (Knowledge) – Create / Edit">
            <div className="grid gap-3">
              {[
                ["slug", "Slug"],
                ["title", "Title"],
                ["description", "Description"],
                ["level", "Level"],
              ].map(([k, label]) => (
                <label key={k} className="grid gap-1">
                  <span className="text-xs text-slate-500">{label}</span>
                  <input
                    value={((kForm as Record<string, unknown>)[k] as string) ?? ""}
                    onChange={(e) =>
                      setKForm((f) => ({ ...f, [k]: (e.target as HTMLInputElement).value }))
                    }
                    className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
                  />
                </label>
              ))}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs text-slate-500">Price (GH₵)</span>
                  <input
                    type="number"
                    value={kForm.price ?? ""}
                    onChange={(e) =>
                      setKForm((f) => ({
                        ...f,
                        price:
                          (e.target as HTMLInputElement).value === ""
                            ? null
                            : Number((e.target as HTMLInputElement).value),
                      }))
                    }
                    className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-slate-500">CPPD Points</span>
                  <input
                    type="number"
                    value={kForm.cpd_points ?? ""}
                    onChange={(e) =>
                      setKForm((f) => ({
                        ...f,
                        cpd_points:
                          (e.target as HTMLInputElement).value === ""
                            ? null
                            : Number((e.target as HTMLInputElement).value),
                      }))
                    }
                    className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
                  />
                </label>
              </div>
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">Image URL</span>
                <input
                  value={kForm.img ?? ""}
                  onChange={(e) => setKForm((f) => ({ ...f, img: (e.target as HTMLInputElement).value }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">Accredited (comma separated)</span>
                <input
                  value={toCsv(kForm.accredited ?? [])}
                  onChange={(e) =>
                    setKForm((f) => ({ ...f, accredited: fromCsv((e.target as HTMLInputElement).value) }))
                  }
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
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
                <button
                  onClick={saveKnowledge}
                  disabled={savingK}
                  className="rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {savingK ? "Saving…" : "Save"}
                </button>
                <button
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
                  className="rounded-lg px-4 py-2 ring-1 ring-slate-200"
                >
                  Reset
                </button>
              </div>
            </div>
          </Section>

          <Section
            title="Courses List"
            right={
              <button onClick={refreshKnowledge} className="px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-sm">
                Refresh
              </button>
            }
          >
            <div className="grid gap-2">
              {knowledge.map((k) => (
                <div
                  key={k.id ?? k.slug}
                  className="flex items-start justify-between gap-3 rounded-lg p-3 ring-1 ring-slate-200"
                >
                  <div className="text-sm">
                    <div className="font-semibold">{k.title}</div>
                    <div className="text-slate-500 text-xs">
                      /{k.slug} · {k.level ?? "—"} · GH₵{k.price ?? 0} · {k.published ? "Published" : "Draft"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setKForm(k)} className="px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-sm">
                      Edit
                    </button>
                    <button
                      onClick={() => void deleteCourse(k.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setSelectedCourseId(k.id ?? "")}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm"
                    >
                      Build
                    </button>
                  </div>
                </div>
              ))}
              {knowledge.length === 0 && <div className="text-slate-500 text-sm">No courses yet.</div>}
            </div>
          </Section>

          <Section title="E-book – Create / Edit">
            <div className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">Slug</span>
                <input
                  value={ebookForm.slug}
                  onChange={(e) => setEbookForm((f) => ({ ...f, slug: (e.target as HTMLInputElement).value }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">Title</span>
                <input
                  value={ebookForm.title}
                  onChange={(e) => setEbookForm((f) => ({ ...f, title: (e.target as HTMLInputElement).value }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">Description</span>
                <textarea
                  value={ebookForm.description ?? ""}
                  onChange={(e) =>
                    setEbookForm((f) => ({ ...f, description: (e.target as HTMLTextAreaElement).value }))
                  }
                  className="min-h-[90px] rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs text-slate-500">Price (USD)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={(ebookForm.price_cents / 100).toString()}
                    onChange={(e) => {
                      const cents = Math.round(Number((e.target as HTMLInputElement).value || 0) * 100);
                      setEbookForm((f) => ({ ...f, price_cents: Number.isFinite(cents) ? cents : 0 }));
                    }}
                    className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
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
                  <span className="text-xs text-slate-500">{label}</span>
                  <input
                    value={((ebookForm as Record<string, unknown>)[field] as string) ?? ""}
                    onChange={(e) => setEbookForm((f) => ({ ...f, [field]: (e.target as HTMLInputElement).value }))}
                    className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
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
                <button
                  onClick={saveEbook}
                  disabled={savingEbook}
                  className="rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {savingEbook ? "Saving…" : "Save E-book"}
                </button>
                <button
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
                  className="rounded-lg px-4 py-2 ring-1 ring-slate-200"
                >
                  Reset
                </button>
              </div>
            </div>
          </Section>

          <Section
            title="E-books List"
            right={
              <button className="px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-sm" onClick={refreshEbooks}>
                {loadingEbooks ? "Refreshing…" : "Refresh"}
              </button>
            }
          >
            <div className="grid gap-2">
              {ebooks.map((e) => (
                <div key={e.id ?? e.slug} className="flex items-start justify-between gap-3 rounded-lg p-3 ring-1 ring-slate-200">
                  <div className="flex items-start gap-3">
                    {e.cover_url ? (
                      <Image
                        src={e.cover_url}
                        alt={e.title}
                        width={56}
                        height={56}
                        className="rounded-md ring-1 ring-slate-200 object-cover"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-md bg-slate-100" />
                    )}
                    <div className="text-sm">
                      <div className="font-semibold">{e.title}</div>
                      <div className="text-xs text-slate-500">
                        /{e.slug} ·{" "}
                        {(e.price_cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD" })} ·{" "}
                        {e.published ? "Published" : "Draft"}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEbookForm(e)} className="px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-sm">
                      Edit
                    </button>
                    <button onClick={() => void deleteEbook(e.id)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {ebooks.length === 0 && <div className="text-slate-500 text-sm">No e-books yet.</div>}
            </div>
          </Section>
        </div>
      )}

      {/* ───────────── Content Builder ───────────── */}
      {tab === "content" && (
        <div className="mt-6 grid gap-6 2xl:grid-cols-[320px_1fr]">
          {/* Picker */}
          <Section title="Pick Course">
            <select
              className="h-10 w-full rounded-lg bg-white px-3 ring-1 ring-slate-200"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId((e.target as HTMLSelectElement).value)}
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
                  <div key={ch.id ?? ch.title} className="flex items-center gap-2">
                    <button
                      onClick={() => setChForm(ch)}
                      className={`flex-1 text-left rounded-lg px-3 py-2 ring-1 ring-slate-200 ${
                        chForm.id === (ch.id ?? "") ? "bg-slate-100" : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-medium">{ch.title}</div>
                      <div className="text-xs text-slate-500">Order: {ch.order_index}</div>
                    </button>
                    <button
                      onClick={() => void deleteChapter(ch.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs"
                      title="Delete chapter"
                    >
                      Delete
                    </button>
                  </div>
                ))}
                {chapters.length === 0 && <div className="text-xs text-slate-500">No chapters yet.</div>}
              </div>
            )}
          </Section>

          {/* Builder */}
          <div className="grid gap-6">
            <Section title="Chapter">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs text-slate-500">Title</span>
                  <input
                    value={chForm.title}
                    onChange={(e) => setChForm((f) => ({ ...f, title: (e.target as HTMLInputElement).value }))}
                    className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-slate-500">Order</span>
                  <input
                    type="number"
                    value={chForm.order_index}
                    onChange={(e) =>
                      setChForm((f) => ({ ...f, order_index: Number((e.target as HTMLInputElement).value || 0) }))
                    }
                    className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
                  />
                </label>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={saveChapter}
                  disabled={!selectedCourseId || !chForm.title.trim() || savingChapter}
                  className="rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {savingChapter ? "Saving…" : "Save Chapter"}
                </button>
                <button
                  onClick={() => setChForm({ ...emptyChapter, course_id: selectedCourseId })}
                  className="rounded-lg px-4 py-2 ring-1 ring-slate-200"
                >
                  New Chapter
                </button>
              </div>
            </Section>

            <Section title="Slides (for this chapter)">
              <div className="grid gap-2">
                {slides.map((s) => (
                  <div key={s.id ?? s.title} className="flex items-center gap-2">
                    <button
                      onClick={() => setSlForm(s)}
                      className={`flex-1 text-left rounded-lg px-3 py-2 ring-1 ring-slate-200 ${
                        slForm.id === (s.id ?? "") ? "bg-slate-100" : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-medium">{s.title}</div>
                      <div className="text-xs text-slate-500">Order: {s.order_index}</div>
                    </button>
                    <button
                      onClick={() => void deleteSlide(s.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs"
                      title="Delete slide"
                    >
                      Delete
                    </button>
                  </div>
                ))}
                {slides.length === 0 && <div className="text-xs text-slate-500">No slides yet.</div>}
              </div>

              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs text-slate-500">Title</span>
                    <input
                      value={slForm.title}
                      onChange={(e) => setSlForm((f) => ({ ...f, title: (e.target as HTMLInputElement).value }))}
                      className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-slate-500">Order</span>
                    <input
                      type="number"
                      value={slForm.order_index}
                      onChange={(e) =>
                        setSlForm((f) => ({ ...f, order_index: Number((e.target as HTMLInputElement).value || 0) }))
                      }
                      className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
                    />
                  </label>
                </div>

                <label className="grid gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Body / Notes (supports rich text)</span>
                    <span className="text-[11px] text-slate-400">Paste with formatting; saved as HTML</span>
                  </div>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    className="min-h-[120px] rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200 text-sm"
                    onInput={(e) =>
                      setSlForm((f) => ({ ...f, body: (e.target as HTMLDivElement).innerHTML }))
                    }
                    dangerouslySetInnerHTML={{ __html: slForm.body ?? "" }}
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs text-slate-500">Intro video URL</span>
                    <input
                      value={slForm.intro_video_url ?? ""}
                      onChange={(e) =>
                        setSlForm((f) => ({ ...f, intro_video_url: (e.target as HTMLInputElement).value }))
                      }
                      className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-slate-500">Asset URL (image/pdf)</span>
                    <input
                      value={slForm.asset_url ?? ""}
                      onChange={(e) => setSlForm((f) => ({ ...f, asset_url: (e.target as HTMLInputElement).value }))}
                      className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
                    />
                  </label>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs text-slate-500">Upload Intro Video</span>
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
                    <span className="text-xs text-slate-500">Upload Asset (image/pdf)</span>
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
                {uploading && <div className="text-xs text-slate-500">Uploading…</div>}
                {!!uploadedUrl && <div className="text-xs break-all">Last upload: {uploadedUrl}</div>}

                <div className="flex gap-2">
                  <button
                    onClick={saveSlide}
                    disabled={!slForm.chapter_id || !slForm.title.trim() || savingSlide}
                    className="rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {savingSlide ? "Saving…" : "Save Slide"}
                  </button>
                  <button
                    onClick={() => setSlForm({ ...emptySlide, chapter_id: chForm.id ?? "" })}
                    className="rounded-lg px-4 py-2 ring-1 ring-slate-200"
                  >
                    New Slide
                  </button>
                </div>
              </div>
            </Section>

            {/* Chapter Quiz */}
            <Section title="Chapter Quiz">
              {chForm.id ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-xs text-slate-500">Time limit (seconds)</span>
                      <input
                        type="number"
                        value={quizSettings.time_limit_seconds ?? ""}
                        onChange={(e) =>
                          setQuizSettings((s) => ({
                            ...s,
                            chapter_id: chForm.id ?? "",
                            time_limit_seconds:
                              (e.target as HTMLInputElement).value === ""
                                ? null
                                : Number((e.target as HTMLInputElement).value),
                          }))
                        }
                        className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs text-slate-500"># randomized questions</span>
                      <input
                        type="number"
                        value={quizSettings.num_questions ?? ""}
                        onChange={(e) =>
                          setQuizSettings((s) => ({
                            ...s,
                            chapter_id: chForm.id ?? "",
                            num_questions:
                              (e.target as HTMLInputElement).value === ""
                                ? null
                                : Number((e.target as HTMLInputElement).value),
                          }))
                        }
                        className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
                      />
                    </label>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={saveQuizSettings}
                      disabled={quizSaving}
                      className="rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                      {quizSaving ? "Saving…" : "Save Settings"}
                    </button>
                    <button
                      onClick={() => void refreshQuiz(chForm.id ?? "")}
                      className="rounded-lg px-4 py-2 ring-1 ring-slate-200"
                    >
                      Refresh
                    </button>
                  </div>

                  <div className="mt-6 grid gap-3">
                    <div className="text-sm font-semibold">Questions</div>
                    <div className="rounded-lg border border-dashed border-slate-300 p-3 text-xs flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-700">Bulk upload (CSV)</span>
                        <a href="/templates/quiz-bulk-template.csv" className="underline text-blue-700" download>
                          Download template
                        </a>
                      </div>
                      <p className="text-slate-500">
                        Columns: <code>chapter_id, question, options, correct_index</code>. Options separated by <code>;</code> or <code>|</code>.
                      </p>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={(e) => {
                          const f = (e.target as HTMLInputElement).files?.[0];
                          if (f) void uploadQuizCsv(f);
                        }}
                      />
                      {bulkQuizStatus && <div className="text-slate-600">{bulkQuizStatus}</div>}
                    </div>
                    <div className="grid gap-2">
                      {questions.map((q, i) => (
                        <div key={q.id ?? i} className="rounded-lg p-3 ring-1 ring-slate-200">
                          {editingQuestionId === (q.id ?? null) && editingQ ? (
                            <div className="grid gap-2">
                              <input
                                value={editingQ.question}
                                onChange={(e) =>
                                  setEditingQ((prev) =>
                                    prev ? { ...prev, question: (e.target as HTMLInputElement).value } : prev,
                                  )
                                }
                                className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200 text-sm"
                              />
                              <input
                                value={toCsv(editingQ.options)}
                                onChange={(e) =>
                                  setEditingQ((prev) =>
                                    prev
                                      ? { ...prev, options: fromCsv((e.target as HTMLInputElement).value) }
                                      : prev,
                                  )
                                }
                                className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200 text-sm"
                                placeholder="Options (comma separated)"
                              />
                              <input
                                type="number"
                                value={editingQ.correct_index}
                                onChange={(e) =>
                                  setEditingQ((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          correct_index: Number((e.target as HTMLInputElement).value || 0),
                                        }
                                      : prev,
                                  )
                                }
                                className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200 text-sm"
                                placeholder="Correct index (0-based)"
                              />
                              <div className="flex gap-2">
                                <button onClick={commitEditQuestion} className="px-3 py-1.5 rounded-lg bg-[#0a1156] text-white text-sm">
                                  Save
                                </button>
                                <button onClick={cancelEditQuestion} className="px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-sm">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="text-sm font-medium">{q.question}</div>
                              <ol className="text-xs text-slate-500 mt-1 list-decimal ms-5">
                                {q.options.map((opt, idx) => (
                                  <li key={idx} className={idx === q.correct_index ? "text-slate-900" : ""}>
                                    {opt}
                                    {idx === q.correct_index ? "  ← correct" : ""}
                                  </li>
                                ))}
                              </ol>
                              <div className="mt-2 flex gap-2">
                                <button onClick={() => startEditQuestion(q)} className="px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-sm">
                                  Edit
                                </button>
                                <button onClick={() => void deleteQuestion(q.id)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm">
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                      {questions.length === 0 && <div className="text-xs text-slate-500">No questions yet.</div>}
                    </div>

                    {/* Quick add new */}
                    <div className="mt-2 grid gap-3">
                      <div className="text-sm font-semibold">Add New Question</div>
                      <label className="grid gap-1">
                        <span className="text-xs text-slate-500">Question</span>
                        <input
                          value={qForm.question}
                          onChange={(e) =>
                            setQForm((f) => ({
                              ...f,
                              chapter_id: chForm.id ?? "",
                              question: (e.target as HTMLInputElement).value,
                            }))
                          }
                          className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs text-slate-500">Options (comma separated)</span>
                        <input
                          value={toCsv(qForm.options)}
                          onChange={(e) =>
                            setQForm((f) => ({
                              ...f,
                              chapter_id: chForm.id ?? "",
                              options: fromCsv((e.target as HTMLInputElement).value),
                            }))
                          }
                          className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs text-slate-500">Correct index (0-based)</span>
                        <input
                          type="number"
                          value={qForm.correct_index}
                          onChange={(e) =>
                            setQForm((f) => ({
                              ...f,
                              chapter_id: chForm.id ?? "",
                              correct_index: Number((e.target as HTMLInputElement).value || 0),
                            }))
                          }
                          className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
                        />
                      </label>
                      <div className="flex gap-2">
                        <button onClick={saveQuestion} className="rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90">
                          Save Question
                        </button>
                        <button
                          onClick={() =>
                            setQForm({
                              chapter_id: chForm.id ?? "",
                              question: "",
                              options: [],
                              correct_index: 0,
                              id: undefined,
                            })
                          }
                          className="rounded-lg px-4 py-2 ring-1 ring-slate-200"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-500">Pick or create a chapter first.</div>
              )}
            </Section>

            {/* FINAL EXAM */}
            <Section title="Final Exam (Course-wide)">
              {!selectedCourseId ? (
                <div className="text-xs text-slate-500">Pick a course to manage its Final Exam.</div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="grid gap-1 sm:col-span-2">
                      <span className="text-xs text-slate-500">Exam title</span>
                      <input
                        value={examForm.title}
                        onChange={(e) =>
                          setExamForm((f) => ({ ...f, course_id: selectedCourseId, title: (e.target as HTMLInputElement).value }))
                        }
                        className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs text-slate-500">Pass mark (%)</span>
                      <input
                        type="number"
                        value={examForm.pass_mark}
                        onChange={(e) =>
                          setExamForm((f) => ({ ...f, course_id: selectedCourseId, pass_mark: Number((e.target as HTMLInputElement).value || 0) }))
                        }
                        className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
                      />
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 mt-3">
                    <label className="grid gap-1">
                      <span className="text-xs text-slate-500">Time limit (minutes)</span>
                      <input
                        type="number"
                        value={examForm.time_limit_minutes ?? ""}
                        onChange={(e) =>
                          setExamForm((f) => ({
                            ...f,
                            course_id: selectedCourseId,
                            time_limit_minutes:
                              (e.target as HTMLInputElement).value === ""
                                ? null
                                : Number((e.target as HTMLInputElement).value),
                          }))
                        }
                        className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
                      />
                    </label>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={saveExam}
                      disabled={examSaving}
                      className="rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                      {examSaving ? "Saving…" : exam?.id ? "Update Exam" : "Create Exam"}
                    </button>
                    {exam?.id && (
                      <button onClick={deleteExam} className="rounded-lg bg-red-600 text-white px-4 py-2 font-semibold">
                        Delete Exam
                      </button>
                    )}
                    {exam?.id && (
                      <button
                        onClick={() => void refreshExamQuestions(exam.id!)}
                        className="rounded-lg px-4 py-2 ring-1 ring-slate-200"
                      >
                        Refresh
                      </button>
                    )}
                  </div>

                  {/* Exam Questions */}
                  {exam?.id ? (
                    <div className="mt-6 grid gap-3">
                      <div className="text-sm font-semibold">Exam Questions</div>
                      <div className="rounded-lg border border-dashed border-slate-300 p-3 text-xs flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-700">Bulk upload (CSV)</span>
                          <a href="/templates/final-exam-bulk-template.csv" className="underline text-blue-700" download>
                            Download template
                          </a>
                        </div>
                        <p className="text-slate-500">
                          Columns: <code>exam_id, prompt, options, correct_index</code>. Options separated by <code>;</code> or <code>|</code>.
                        </p>
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          onChange={(e) => {
                            const f = (e.target as HTMLInputElement).files?.[0];
                            if (f) void uploadExamCsv(f);
                          }}
                        />
                        {bulkExamStatus && <div className="text-slate-600">{bulkExamStatus}</div>}
                      </div>
                      <div className="grid gap-2">
                        {examQ.map((q, i) => (
                          <div key={q.id ?? i} className="rounded-lg p-3 ring-1 ring-slate-200">
                            {editingExamQId === (q.id ?? null) ? (
                              <div className="grid gap-2">
                                <input
                                  value={examQForm.prompt}
                                  onChange={(e) =>
                                    setExamQForm((f) => ({
                                      ...f,
                                      prompt: (e.target as HTMLInputElement).value,
                                      exam_id: exam.id!,
                                      id: q.id,
                                    }))
                                  }
                                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200 text-sm"
                                />
                                <input
                                  value={toCsv(examQForm.options)}
                                  onChange={(e) =>
                                    setExamQForm((f) => ({
                                      ...f,
                                      options: fromCsv((e.target as HTMLInputElement).value),
                                      exam_id: exam.id!,
                                      id: q.id,
                                    }))
                                  }
                                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200 text-sm"
                                  placeholder="Options (comma separated)"
                                />
                                <input
                                  type="number"
                                  value={examQForm.correct_index}
                                  onChange={(e) =>
                                    setExamQForm((f) => ({
                                      ...f,
                                      correct_index: Number((e.target as HTMLInputElement).value || 0),
                                      exam_id: exam.id!,
                                      id: q.id,
                                    }))
                                  }
                                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200 text-sm"
                                  placeholder="Correct index (0-based)"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => void saveExamQuestion()}
                                    className="px-3 py-1.5 rounded-lg bg-[#0a1156] text-white text-sm"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={cancelEditExamQuestion}
                                    className="px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="text-sm font-medium">{q.prompt}</div>
                                <ol className="text-xs text-slate-500 mt-1 list-decimal ms-5">
                                  {q.options.map((opt, idx) => (
                                    <li key={idx} className={idx === q.correct_index ? "text-slate-900" : ""}>
                                      {opt}
                                      {idx === q.correct_index ? "  ← correct" : ""}
                                    </li>
                                  ))}
                                </ol>
                                <div className="mt-2 flex gap-2">
                                  <button
                                    onClick={() => startEditExamQuestion(q)}
                                    className="px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-sm"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => void deleteExamQuestion(q.id)}
                                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                        {examQ.length === 0 && <div className="text-xs text-slate-500">No questions yet.</div>}
                      </div>

                      <div className="mt-2 grid gap-3">
                        <div className="text-sm font-semibold">
                          {examQForm.id ? "Edit Exam Question" : "Add Exam Question"}
                          {examQForm.id && (
                            <span className="ms-2 text-xs text-slate-500">(saving will update this question)</span>
                          )}
                        </div>
                        <label className="grid gap-1">
                          <span className="text-xs text-slate-500">Question</span>
                          <input
                            value={examQForm.prompt}
                            onChange={(e) =>
                              setExamQForm((f) => ({
                                ...f,
                                exam_id: exam.id!,
                                prompt: (e.target as HTMLInputElement).value,
                              }))
                            }
                            className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-xs text-slate-500">Options (comma separated)</span>
                          <input
                            value={toCsv(examQForm.options)}
                            onChange={(e) =>
                              setExamQForm((f) => ({
                                ...f,
                                exam_id: exam.id!,
                                options: fromCsv((e.target as HTMLInputElement).value),
                              }))
                            }
                            className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-xs text-slate-500">Correct index (0-based)</span>
                          <input
                            type="number"
                            value={examQForm.correct_index}
                            onChange={(e) =>
                              setExamQForm((f) => ({
                                ...f,
                                exam_id: exam.id!,
                                correct_index: Number((e.target as HTMLInputElement).value || 0),
                              }))
                            }
                            className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200"
                          />
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={saveExamQuestion}
                            className="rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90"
                          >
                            Save Question
                          </button>
                          <button
                            onClick={() =>
                              setExamQForm({ exam_id: exam.id!, prompt: "", options: [], correct_index: 0 })
                            }
                            className="rounded-lg px-4 py-2 ring-1 ring-slate-200"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </Section>
          </div>
        </div>
      )}

      {/* ───────────── Prices ───────────── */}
      {tab === "prices" && (
        <div className="mt-6 grid gap-6">
          <Section title="Quick Price Editor" right={<span className="text-xs text-slate-500">Courses in GH₵ · E-books in USD</span>}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                placeholder="Search by title…"
                value={priceSearch}
                onChange={(e) => setPriceSearch((e.target as HTMLInputElement).value)}
                className="h-10 rounded-lg bg-white px-3 ring-1 ring-slate-200 w-full sm:w-80"
              />
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
                  {priceRows.map((r) => (
                    <PriceRow key={`${r.kind}-${r.id}`} row={r} onSave={savePrice} />
                  ))}
                  {priceRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-3 text-sm text-slate-500">
                        No items.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      )}

      {/* ───────────── Media ───────────── */}
      {tab === "media" && (
        <div className="mt-6">
          <Section title="Upload to Supabase Storage (public)">
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
                  className="rounded-lg ring-1 ring-slate-200 object-cover"
                />
                <div className="text-sm mt-2">URL:</div>
                <code className="text-xs break-all">{uploadedUrl}</code>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* ───────────── Users ───────────── */}
      {tab === "users" && (
        <div className="mt-6 grid gap-6">
          <Section
            title="Users"
            right={
              <div className="flex items-center gap-2">
                <input
                  placeholder="Search email or id…"
                  value={userQuery}
                  onChange={(e) => setUserQuery((e.target as HTMLInputElement).value)}
                  className="h-9 rounded-lg bg-white px-3 ring-1 ring-slate-200 w-60"
                />
                <button onClick={refreshUsers} className="px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-sm">
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
                    <th className="py-2 pr-3 w-[540px]">Actions</th>
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
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setSelectedPurchases(null);
                              void loadPurchases(u.id);
                            }}
                            className="px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-xs"
                          >
                            View
                          </button>
                          {u.banned ? (
                            <button
                              onClick={() => void act(u.id, "unban")}
                              disabled={userActionBusy === `unban:${u.id}`}
                              className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs disabled:opacity-50"
                            >
                              Unban
                            </button>
                          ) : (
                            <button
                              onClick={() => void act(u.id, "ban")}
                              disabled={userActionBusy === `ban:${u.id}`}
                              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs disabled:opacity-50"
                            >
                              Ban
                            </button>
                          )}
                          <button
                            onClick={() => void act(u.id, "revoke")}
                            disabled={userActionBusy === `revoke:${u.id}`}
                            className="px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-xs disabled:opacity-50"
                          >
                            Revoke Sessions
                          </button>
                          <button
                            onClick={() => void act(u.id, "clear-history")}
                            disabled={userActionBusy === `clear-history:${u.id}`}
                            className="px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-xs disabled:opacity-50"
                          >
                            Clear History
                          </button>
                          <button
                            onClick={() => void act(u.id, "delete")}
                            disabled={userActionBusy === `delete:${u.id}`}
                            className="px-3 py-1.5 rounded-lg bg-red-700 text-white text-xs disabled:opacity-50"
                          >
                            Delete User
                          </button>
                          <button
                            onClick={() => void generateConfirmLink(u.email)}
                            className="px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-xs"
                          >
                            Copy Confirm Link
                          </button>
                          <button
                            onClick={() => void generateResetLink(u.email)}
                            className="px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-xs"
                          >
                            Copy Reset Link
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-3 text-sm text-slate-500">
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
                <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white border border-slate-200 p-5 max-h-[90vh] overflow-auto">
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
                      <span className="text-slate-500">ID:</span> {selectedUser.id}
                    </div>
                    <div>
                      <span className="text-slate-500">Email:</span> {selectedUser.email ?? "—"}
                    </div>
                    <div>
                      <span className="text-slate-500">Created:</span> {selectedUser.created_at ?? "—"}
                    </div>
                    <div>
                      <span className="text-slate-500">Confirmed:</span>{" "}
                      {selectedUser.email_confirmed_at ? "Yes" : "No"}
                    </div>
                    <div>
                      <span className="text-slate-500">Status:</span> {selectedUser.banned ? "Banned" : "Active"}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg p-3 ring-1 ring-slate-200">
                      <div className="font-medium">Courses Purchased</div>
                      <ul className="mt-2 text-sm list-disc ms-5 space-y-1">
                        {(selectedPurchases?.courses ?? []).map((c, i) => {
                          const courseId = (c as { course_id?: string; id?: string }).course_id || (c as { id?: string }).id || "";
                          return (
                            <li key={i} className="flex items-center gap-2">
                              <span>{c.title}</span>
                              {courseId && (
                                <div className="flex flex-wrap gap-1 text-[11px]">
                                  <button
                                    onClick={() => void unlockCourse(courseId)}
                                    disabled={courseActionBusy === `unlock:${courseId}`}
                                    className="rounded bg-green-100 px-2 py-0.5 text-green-800 disabled:opacity-50"
                                  >
                                    {courseActionBusy === `unlock:${courseId}` ? "Unlocking…" : "Unlock final exam"}
                                  </button>
                                  <button
                                    onClick={() => void resetCourse("exam", courseId)}
                                    disabled={courseActionBusy === `exam:${courseId}`}
                                    className="rounded bg-amber-100 px-2 py-0.5 text-amber-800 disabled:opacity-50"
                                  >
                                    {courseActionBusy === `exam:${courseId}` ? "Resetting…" : "Reset exam"}
                                  </button>
                                  <button
                                    onClick={() => void resetCourse("course", courseId)}
                                    disabled={courseActionBusy === `course:${courseId}`}
                                    className="rounded bg-blue-100 px-2 py-0.5 text-blue-800 disabled:opacity-50"
                                  >
                                    {courseActionBusy === `course:${courseId}` ? "Resetting…" : "Reset course"}
                                  </button>
                                  <button
                                    onClick={() => void removePurchase("course", courseId)}
                                    className="rounded bg-red-100 px-2 py-0.5 text-red-800"
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </li>
                          );
                        })}
                        {(selectedPurchases?.courses?.length ?? 0) === 0 && <li className="text-slate-500">None</li>}
                      </ul>
                    </div>
                    <div className="rounded-lg p-3 ring-1 ring-slate-200">
                      <div className="font-medium">E-books Purchased</div>
                      <ul className="mt-2 text-sm list-disc ms-5 space-y-1">
                        {(selectedPurchases?.ebooks ?? []).map((e, i) => {
                          const ebookId = (e as { ebook_id?: string; id?: string }).ebook_id || (e as { id?: string }).id || "";
                          return (
                            <li key={i} className="flex items-center gap-2">
                              <span>{e.title}</span>
                              {ebookId && (
                                <button
                                  onClick={() => void removePurchase("ebook", ebookId)}
                                  className="text-[11px] rounded bg-red-100 px-2 py-0.5 text-red-800"
                                >
                                  Remove
                                </button>
                              )}
                            </li>
                          );
                        })}
                        {(selectedPurchases?.ebooks?.length ?? 0) === 0 && <li className="text-slate-500">None</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* ───────────── Deploy ───────────── */}
      {tab === "deploy" && (
        <div className="mt-6">
          <Section title="Deployment">
            <p className="text-sm text-slate-500">
              Trigger a Vercel rebuild (requires <code>VERCEL_DEPLOY_HOOK_URL</code>).
            </p>
            <button onClick={triggerDeploy} className="mt-3 rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90">
              Trigger Deploy
            </button>
          </Section>
        </div>
      )}
    </div>
  );
}

/* ───────────────────── Subcomponent: PriceRow ───────────────────── */
function PriceRow({
  row,
  onSave,
}: {
  row: { kind: "course" | "ebook"; id: string; title: string; price: number; currency: "GHS" | "USD" };
  onSave: (r: { kind: "course" | "ebook"; id: string; price: number }) => Promise<void>;
}) {
  const [val, setVal] = useState<string>(row.price.toString());
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setVal(row.price.toString());
  }, [row.price]);

  async function handleSave() {
    const p = Number(val);
    if (!Number.isFinite(p) || p < 0) return alert("Enter a valid price");
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
          <span className="text-xs text-slate-500">{row.currency}</span>
          <input
            value={val}
            onChange={(e) => setVal((e.target as HTMLInputElement).value)}
            className="h-9 w-32 rounded-lg bg-white px-3 ring-1 ring-slate-200"
          />
        </div>
      </td>
      <td className="py-2 pr-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg bg-[#0a1156] text-white text-sm hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </td>
    </tr>
  );
}
