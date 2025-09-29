"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

/* ---------------- Types ---------------- */
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
};

type Chapter = {
  id?: string;
  course_id: string;
  title: string;
  order_index: number;
  created_at?: string;
};

type Slide = {
  id?: string;
  chapter_id: string;
  title: string;
  order_index: number;
  intro_video_url?: string | null;
  asset_url?: string | null;
  body?: string | null;
  created_at?: string;
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
  created_at?: string;
};

/* -------------- Small helpers -------------- */
function toCsv(v: string[] | null | undefined) { return (v ?? []).join(", "); }
function fromCsv(v: string) { return v.split(",").map(s => s.trim()).filter(Boolean); }
function isString(x: unknown): x is string { return typeof x === "string"; }

function asAdminUser(x: unknown): AdminUser {
  const r = (x && typeof x === "object") ? (x as Record<string, unknown>) : {};
  return {
    id: String(r["id"] ?? ""),
    email: isString(r["email"]) ? r["email"] : undefined,
    email_confirmed_at: isString(r["email_confirmed_at"]) ? r["email_confirmed_at"] : null,
    created_at: isString(r["created_at"]) ? r["created_at"] : null,
  };
}

function asKnowledgeArray(x: unknown): Knowledge[] {
  if (!Array.isArray(x)) return [];
  return x.map((k) => {
    const r = (k && typeof k === "object") ? (k as Record<string, unknown>) : {};
    return {
      id: isString(r["id"]) ? r["id"] : undefined,
      slug: String(r["slug"] ?? ""),
      title: String(r["title"] ?? ""),
      description: isString(r["description"]) ? r["description"] : null,
      level: isString(r["level"]) ? r["level"] : null,
      price: typeof r["price"] === "number" ? r["price"] : null,
      cpd_points: typeof r["cpd_points"] === "number" ? r["cpd_points"] : null,
      img: isString(r["img"]) ? r["img"] : null,
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
      id: isString(r["id"]) ? r["id"] : undefined,
      course_id: String(r["course_id"] ?? ""),
      title: String(r["title"] ?? ""),
      order_index: Number(r["order_index"] ?? 0),
      created_at: isString(r["created_at"]) ? r["created_at"] : undefined,
    };
  });
}

function asSlides(x: unknown): Slide[] {
  if (!Array.isArray(x)) return [];
  return x.map((s) => {
    const r = (s && typeof s === "object") ? (s as Record<string, unknown>) : {};
    return {
      id: isString(r["id"]) ? r["id"] : undefined,
      chapter_id: String(r["chapter_id"] ?? ""),
      title: String(r["title"] ?? ""),
      order_index: Number(r["order_index"] ?? 0),
      intro_video_url: isString(r["intro_video_url"]) ? r["intro_video_url"] : null,
      asset_url: isString(r["asset_url"]) ? r["asset_url"] : null,
      body: isString(r["body"]) ? r["body"] : null,
      created_at: isString(r["created_at"]) ? r["created_at"] : undefined,
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
      id: isString(r["id"]) ? r["id"] : undefined,
      chapter_id: String(r["chapter_id"] ?? ""),
      question: String(r["question"] ?? ""),
      options: opts,
      correct_index: Number(r["correct_index"] ?? 0),
      created_at: isString(r["created_at"]) ? r["created_at"] : undefined,
    };
  });
}

/* ---------------- Component ---------------- */
export default function AdminPage() {
  const [tab, setTab] = useState<"knowledge"|"structure"|"media"|"users"|"deploy">("knowledge");

  /* ---------- Knowledge ---------- */
  const emptyK: Knowledge = {
    slug: "", title: "", description: "", level: "",
    price: null, cpd_points: null, img: "", accredited: [], published: true
  };
  const [list, setList] = useState<Knowledge[]>([]);
  const [form, setForm] = useState<Knowledge>(emptyK);
  const [saving, setSaving] = useState(false);

  async function refreshKnowledge() {
    const r = await fetch("/api/admin/knowledge", { cache: "no-store" });
    const d = await r.json();
    setList(asKnowledgeArray(d));
  }
  useEffect(() => { void refreshKnowledge(); }, []);

  async function saveKnowledge() {
    setSaving(true);
    const payload: Knowledge = { ...form, accredited: fromCsv(toCsv(form.accredited ?? [])) };
    const r = await fetch("/api/admin/knowledge", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    setSaving(false);
    if (r.ok) { setForm(emptyK); await refreshKnowledge(); } else { alert("Save failed"); }
  }

  /* ---------- Structure: chapters + slides + quiz ---------- */
  const emptyChapter: Chapter = { course_id: "", title: "", order_index: 0 };
  const emptySlide:  Slide   = { chapter_id: "", title: "", order_index: 0, intro_video_url: "", asset_url: "", body: "" };

  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const selectedCourse = useMemo(
    () => list.find(k => (k.id ?? "") === selectedCourseId),
    [list, selectedCourseId]
  );

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chForm, setChForm] = useState<Chapter>(emptyChapter);
  const [savingChapter, setSavingChapter] = useState(false);

  const [slides, setSlides] = useState<Slide[]>([]);
  const [slForm, setSlForm] = useState<Slide>(emptySlide);
  const [savingSlide, setSavingSlide] = useState(false);

  // Quiz state (per selected chapter)
  const [quizSettings, setQuizSettings] = useState<QuizSettings>({ chapter_id: "", time_limit_seconds: null, num_questions: null });
  const [quizSaving, setQuizSaving] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [qForm, setQForm] = useState<QuizQuestion>({ chapter_id: "", question: "", options: [], correct_index: 0 });

  async function refreshChapters(courseId: string) {
    if (!courseId) { setChapters([]); return; }
    const r = await fetch(`/api/admin/chapters?course_id=${encodeURIComponent(courseId)}`, { cache: "no-store" });
    const d = await r.json();
    setChapters(asChapters(d));
  }
  async function refreshSlides(chapterId: string) {
    if (!chapterId) { setSlides([]); return; }
    const r = await fetch(`/api/admin/slides?chapter_id=${encodeURIComponent(chapterId)}`, { cache: "no-store" });
    const d = await r.json();
    setSlides(asSlides(d));
  }
  async function refreshQuiz(chapterId: string) {
    if (!chapterId) {
      setQuizSettings({ chapter_id: "", time_limit_seconds: null, num_questions: null });
      setQuestions([]);
      setQForm({ chapter_id: "", question: "", options: [], correct_index: 0 });
      return;
    }
    // settings
    {
      const r = await fetch(`/api/admin/quiz-settings?chapter_id=${encodeURIComponent(chapterId)}`, { cache: "no-store" });
      const d = r.ok ? await r.json() : {};
      setQuizSettings(asQuizSettings(d ?? {}, chapterId));
    }
    // questions
    {
      const r = await fetch(`/api/admin/quiz-questions?chapter_id=${encodeURIComponent(chapterId)}`, { cache: "no-store" });
      const d = r.ok ? await r.json() : [];
      setQuestions(asQuizQuestions(d));
    }
    setQForm(f => ({ ...f, chapter_id: chapterId }));
  }

  useEffect(() => {
    void refreshChapters(selectedCourseId);
    setChForm({ ...emptyChapter, course_id: selectedCourseId });
    setSlForm({ ...emptySlide, chapter_id: "" });
    setSlides([]);
    // reset quiz when switching course
    setQuizSettings({ chapter_id: "", time_limit_seconds: null, num_questions: null });
    setQuestions([]);
    setQForm({ chapter_id: "", question: "", options: [], correct_index: 0 });
  }, [selectedCourseId]);

  async function saveChapter() {
    if (!selectedCourseId) return;
    if (!chForm.title) { alert("Title is required"); return; }
    setSavingChapter(true);
    const payload = {
      id: chForm.id,
      course_id: selectedCourseId,
      title: chForm.title,
      order_index: Number.isFinite(chForm.order_index) ? chForm.order_index : 0,
    };
    const r = await fetch("/api/admin/chapters", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSavingChapter(false);
    if (!r.ok) {
      let msg = "";
      try { const j = await r.json(); msg = (j as { error?: string })?.error || r.statusText; } catch { msg = await r.text(); }
      alert(`Save chapter failed: ${msg}`);
      return;
    }
    await refreshChapters(selectedCourseId);
    const out = await r.json();
    const updated = Array.isArray(out) ? asChapters(out)[0] : (asChapters([out])[0] ?? payload);
    setChForm(updated);
    const newChapterId = updated.id ?? "";
    setSlForm(f => ({ ...f, chapter_id: newChapterId }));
    await refreshSlides(newChapterId);
    await refreshQuiz(newChapterId);
  }

  async function saveSlide() {
    if (!slForm.chapter_id) { alert("Pick a chapter first"); return; }
    if (!slForm.title) { alert("Title is required"); return; }
    setSavingSlide(true);

    const payload = {
      id: slForm.id || undefined,
      chapter_id: slForm.chapter_id,
      title: slForm.title,
      order_index: Number.isFinite(slForm.order_index) ? Number(slForm.order_index) : 0,
      intro_video_url: slForm.intro_video_url || null,
      asset_url: slForm.asset_url || null,
      body: slForm.body || null,
    };

    const r = await fetch("/api/admin/slides", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSavingSlide(false);

    if (!r.ok) {
      let msg = "";
      try { const j = await r.json(); msg = (j as { error?: string })?.error || r.statusText; } catch { msg = await r.text(); }
      alert(`Save slide failed: ${msg}`);
      return;
    }

    const saved = await r.json();
    setSlForm((prev) => ({ ...prev, ...saved, chapter_id: prev.chapter_id }));
    await refreshSlides(slForm.chapter_id);
  }

  // stubs (delete endpoints can be added later)
  const deleteChapter = () => alert("Delete chapter not wired yet.");
  const deleteSlide   = () => alert("Delete slide not wired yet.");

  // Uploads → /api/admin/upload (returns { publicUrl })
  async function uploadToStorage(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", file.name);
    const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const d = await r.json();
    const url = (d && typeof d === "object") ? (d as Record<string, unknown>)["publicUrl"] : null;
    return isString(url) ? url : null;
  }
  async function onPickVideo(file: File) {
    const url = await uploadToStorage(file);
    if (url) setSlForm(f => ({ ...f, intro_video_url: url }));
    else alert("Video upload failed");
  }
  async function onPickAsset(file: File) {
    const url = await uploadToStorage(file);
    if (url) setSlForm(f => ({ ...f, asset_url: url }));
    else alert("Asset upload failed");
  }

  /* ---------- Quiz: save settings & questions ---------- */
  async function saveQuizSettings() {
    if (!quizSettings.chapter_id) { alert("Pick a chapter first"); return; }
    setQuizSaving(true);
    const payload = {
      chapter_id: quizSettings.chapter_id,
      time_limit_seconds: quizSettings.time_limit_seconds,
      num_questions: quizSettings.num_questions,
    };
    const r = await fetch("/api/admin/quiz-settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setQuizSaving(false);
    if (!r.ok) {
      let msg = "";
      try { const j = await r.json(); msg = (j as { error?: string })?.error || r.statusText; } catch { msg = await r.text(); }
      alert(`Save quiz settings failed: ${msg}`);
      return;
    }
    const saved = await r.json();
    setQuizSettings(asQuizSettings(saved, payload.chapter_id));
    alert("Quiz settings saved");
  }

  async function saveQuestion() {
    if (!qForm.chapter_id) { alert("Pick a chapter first"); return; }
    if (!qForm.question.trim()) { alert("Question text is required"); return; }
    if (qForm.options.length < 2) { alert("At least 2 options required"); return; }
    if (qForm.correct_index < 0 || qForm.correct_index >= qForm.options.length) {
      alert("Correct index out of range"); return;
    }

    const payload = {
      id: qForm.id,
      chapter_id: qForm.chapter_id,
      question: qForm.question,
      options: qForm.options,
      correct_index: Number(qForm.correct_index),
    };

    const r = await fetch("/api/admin/quiz-questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      let msg = "";
      try { const j = await r.json(); msg = (j as { error?: string })?.error || r.statusText; } catch { msg = await r.text(); }
      alert(`Save question failed: ${msg}`);
      return;
    }

    await refreshQuiz(qForm.chapter_id);
    setQForm({ chapter_id: qForm.chapter_id, question: "", options: [], correct_index: 0, id: undefined });
  }

  async function deleteQuestion(id?: string) {
    if (!id) return;
    if (!confirm("Delete this question?")) return;
    const r = await fetch(`/api/admin/quiz-questions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!r.ok) {
      let msg = "";
      try { const j = await r.json(); msg = (j as { error?: string })?.error || r.statusText; } catch { msg = await r.text(); }
      alert(`Delete failed: ${msg}`);
      return;
    }
    await refreshQuiz(quizSettings.chapter_id);
  }

  /* ---------- Media ---------- */
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>("");

  async function handleUpload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", file.name);
    const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
    setUploading(false);
    const d = await r.json();
    const url = (d && typeof d === "object") ? (d as Record<string, unknown>)["publicUrl"] : null;
    if (isString(url)) setUploadedUrl(url); else alert("Upload failed");
  }

  /* ---------- Users ---------- */
  const [users, setUsers] = useState<AdminUser[]>([]);
  async function refreshUsers() {
    const r = await fetch("/api/admin/users", { cache: "no-store" });
    const d = await r.json();
    const usersField = (d && typeof d === "object") ? (d as Record<string, unknown>)["users"] : null;
    const arr = Array.isArray(usersField) ? usersField : [];
    setUsers(arr.map(asAdminUser));
  }
  useEffect(() => { if (tab==="users") void refreshUsers(); }, [tab]);

  async function deleteUser(id: string) {
    if (!confirm("Delete this user?")) return;
    const r = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (r.ok) await refreshUsers(); else alert("Delete failed");
  }
  async function generateLink(email?: string) {
    if (!email) return;
    const r = await fetch("/api/admin/users", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "generate_confirmation_link", email })
    });
    const d = await r.json();
    const link = (d && typeof d === "object") ? (d as Record<string, unknown>)["link"] : null;
    if (isString(link)) { await navigator.clipboard.writeText(link); alert("Confirmation link copied"); }
    else { alert("Could not generate link"); }
  }

  /* ---------- Deploy ---------- */
  async function triggerDeploy() {
    const r = await fetch("/api/admin/deploy", { method: "POST" });
    const d = await r.json();
    const ok   = (d && typeof d === "object") ? (d as Record<string, unknown>)["ok"]   : null;
    const text = (d && typeof d === "object") ? (d as Record<string, unknown>)["text"] : null;
    alert(ok ? "Deploy triggered" : `Failed: ${String(text ?? "Unknown error")}`);
  }

  /* ---------------- Render ---------------- */
  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold">Master Admin Dashboard</h1>
      <p className="text-muted mt-1">Manage knowledge, structure, media, users, and deployments.</p>

      <div className="mt-6 flex gap-2">
        {(["knowledge","structure","media","users","deploy"] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)} className={`px-3 py-2 rounded-lg ring-1 ring-[color:var(--color-light)] ${tab===t?"bg-brand text-white":"bg-white"}`}>
            {t[0].toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {/* Knowledge */}
      {tab==="knowledge" && (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white border border-light p-5">
            <h2 className="font-semibold">Edit / Create Knowledge</h2>
            <div className="mt-4 grid gap-3">
              {[
                ["slug","Slug"],
                ["title","Title"],
                ["description","Description"],
                ["level","Level"],
              ].map(([k,label])=>(
                <label key={k} className="grid gap-1">
                  <span className="text-sm text-muted">{label}</span>
                  <input
                    value={(form as Record<string, unknown>)[k] as string ?? ""}
                    onChange={(e)=>setForm(f=>({ ...f, [k]: (e.target as HTMLInputElement).value }))}
                    className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                  />
                </label>
              ))}
              <label className="grid gap-1">
                <span className="text-sm text-muted">Price (GH₵)</span>
                <input
                  type="number"
                  value={form.price ?? ""}
                  onChange={(e)=>setForm(f=>({ ...f, price: (e.target as HTMLInputElement).value===""?null:Number((e.target as HTMLInputElement).value) }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-muted">CPPD Points</span>
                <input
                  type="number"
                  value={form.cpd_points ?? ""}
                  onChange={(e)=>setForm(f=>({ ...f, cpd_points: (e.target as HTMLInputElement).value===""?null:Number((e.target as HTMLInputElement).value) }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-muted">Image URL</span>
                <input
                  value={form.img ?? ""}
                  onChange={(e)=>setForm(f=>({ ...f, img: (e.target as HTMLInputElement).value }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-muted">Accredited (comma separated)</span>
                <input
                  value={toCsv(form.accredited ?? [])}
                  onChange={(e)=>setForm(f=>({ ...f, accredited: fromCsv((e.target as HTMLInputElement).value) }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]" />
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={form.published ?? true} onChange={(e)=>setForm(f=>({ ...f, published: (e.target as HTMLInputElement).checked }))} />
                <span className="text-sm">Published</span>
              </label>
              <div className="flex items-center gap-2">
                <button onClick={saveKnowledge} disabled={saving} className="rounded-lg bg-brand text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50">
                  {saving ? "Saving…" : "Save"}
                </button>
                <button onClick={()=>setForm(emptyK)} className="rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)]">Reset</button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-light p-5">
            <h2 className="font-semibold">Knowledge List</h2>
            <div className="mt-3 grid gap-3">
              {list.map(k=>(
                <div key={k.id ?? k.slug} className="flex items-start justify-between gap-3 rounded-lg p-3 ring-1 ring-[color:var(--color-light)]">
                  <div className="text-sm">
                    <div className="font-semibold">{k.title}</div>
                    <div className="text-muted">/{k.slug} · {k.level ?? "—"} · {k.cpd_points ?? 0} CPPD</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>setForm(k)} className="px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)]">Edit</button>
                    {/* Knowledge delete exists as /api/admin/knowledge/[id] */}
                  </div>
                </div>
              ))}
              {list.length===0 && <div className="text-muted text-sm">No items yet.</div>}
            </div>
          </div>
        </div>
      )}

      {/* Structure */}
      {tab==="structure" && (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Left: pick knowledge and chapter list */}
          <div className="rounded-2xl bg-white border border-light p-5 lg:col-span-1">
            <h2 className="font-semibold">Select Knowledge</h2>
            <select
              className="mt-3 h-10 w-full rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
              value={selectedCourseId}
              onChange={(e)=>{ setSelectedCourseId((e.target as HTMLSelectElement).value); }}
            >
              <option value="">— Choose —</option>
              {list.map(k => (<option key={k.id ?? k.slug} value={k.id}>{k.title}</option>))}
            </select>

            <h3 className="mt-5 font-semibold">Chapters</h3>
            <div className="mt-2 grid gap-2">
              {chapters.map(ch => (
                <button
                  key={ch.id ?? ch.title}
                  onClick={()=>{
                    setChForm(ch);
                    setSlForm(s => ({ ...s, chapter_id: ch.id ?? "" }));
                    void refreshSlides(ch.id ?? "");
                    void refreshQuiz(ch.id ?? "");
                  }}
                  className={`text-left rounded-lg px-3 py-2 ring-1 ring-[color:var(--color-light)] ${slForm.chapter_id===(ch.id??"") ? "bg-[color:var(--color-light)]/40" : "bg-white"}`}
                >
                  <div className="font-medium">{ch.title}</div>
                  <div className="text-xs text-muted">Order: {ch.order_index}</div>
                </button>
              ))}
              {selectedCourse && chapters.length===0 && <div className="text-xs text-muted">No chapters yet.</div>}
            </div>
          </div>

          {/* Middle: chapter form */}
          <div className="rounded-2xl bg-white border border-light p-5">
            <h2 className="font-semibold">Edit / Create Chapter</h2>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1">
                <span className="text-sm text-muted">Title</span>
                <input
                  value={chForm.title}
                  onChange={(e)=>setChForm(f=>({ ...f, title: (e.target as HTMLInputElement).value }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-muted">Order</span>
                <input
                  type="number"
                  value={chForm.order_index}
                  onChange={(e)=>setChForm(f=>({ ...f, order_index: Number((e.target as HTMLInputElement).value || 0) }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                />
              </label>
              <div className="flex gap-2">
                <button onClick={saveChapter} disabled={savingChapter || !selectedCourseId || !chForm.title} className="rounded-lg bg-brand text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50">
                  {savingChapter ? "Saving…" : "Save Chapter"}
                </button>
                <button onClick={()=>setChForm({ ...emptyChapter, course_id: selectedCourseId })} className="rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)]">Reset</button>
                <button onClick={deleteChapter} disabled className="rounded-lg px-4 py-2 bg-red-600 text-white disabled:opacity-50" title="Delete endpoint not wired yet">Delete</button>
              </div>
            </div>
          </div>

          {/* Right: slides list + form + quiz */}
          <div className="rounded-2xl bg-white border border-light p-5">
            <h2 className="font-semibold">Slides (for selected chapter)</h2>

            <div className="mt-3 grid gap-2">
              {slides.map(s => (
                <button
                  key={s.id ?? s.title}
                  onClick={()=>setSlForm(s)}
                  className={`text-left rounded-lg px-3 py-2 ring-1 ring-[color:var(--color-light)] ${slForm.id===(s.id??"") ? "bg-[color:var(--color-light)]/40" : "bg-white"}`}
                >
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-muted">Order: {s.order_index}</div>
                </button>
              ))}
              {slForm.chapter_id && slides.length===0 && <div className="text-xs text-muted">No slides in this chapter yet.</div>}
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1">
                <span className="text-sm text-muted">Title</span>
                <input
                  value={slForm.title}
                  onChange={(e)=>setSlForm(f=>({ ...f, title: (e.target as HTMLInputElement).value }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-muted">Order</span>
                <input
                  type="number"
                  value={slForm.order_index}
                  onChange={(e)=>setSlForm(f=>({ ...f, order_index: Number((e.target as HTMLInputElement).value || 0) }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                />
              </label>

              {/* URL inputs */}
              <label className="grid gap-1">
                <span className="text-sm text-muted">Intro video URL (optional)</span>
                <input
                  value={slForm.intro_video_url ?? ""}
                  onChange={(e)=>setSlForm(f=>({ ...f, intro_video_url: (e.target as HTMLInputElement).value }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-muted">Asset URL (image/pdf/slide, optional)</span>
                <input
                  value={slForm.asset_url ?? ""}
                  onChange={(e)=>setSlForm(f=>({ ...f, asset_url: (e.target as HTMLInputElement).value }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                />
              </label>

              {/* Direct upload inputs */}
              <div className="grid gap-2">
                <label className="grid gap-1">
                  <span className="text-sm text-muted">Upload intro video (optional)</span>
                  <input type="file" accept="video/*" onChange={(e)=>{ const f=(e.target as HTMLInputElement).files?.[0]; if (f) void onPickVideo(f); }} />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm text-muted">Upload asset (image/pdf/slide, optional)</span>
                  <input type="file" accept="image/*,application/pdf" onChange={(e)=>{ const f=(e.target as HTMLInputElement).files?.[0]; if (f) void onPickAsset(f); }} />
                </label>
              </div>

              <label className="grid gap-1">
                <span className="text-sm text-muted">Body / Notes (optional)</span>
                <textarea
                  value={slForm.body ?? ""}
                  onChange={(e)=>setSlForm(f=>({ ...f, body: (e.target as HTMLTextAreaElement).value }))}
                  className="min-h-[90px] rounded-lg bg-white px-3 py-2 ring-1 ring-[color:var(--color-light)]"
                />
              </label>

              <div className="flex gap-2">
                <button onClick={saveSlide} disabled={savingSlide || !slForm.chapter_id || !slForm.title} className="rounded-lg bg-brand text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50">
                  {savingSlide ? "Saving…" : "Save Slide"}
                </button>
                <button onClick={()=>setSlForm({ ...emptySlide, chapter_id: slForm.chapter_id })} className="rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)]">Reset</button>
                <button onClick={deleteSlide} disabled className="rounded-lg px-4 py-2 bg-red-600 text-white disabled:opacity-50" title="Delete endpoint not wired yet">Delete</button>
              </div>
            </div>

            {/* -------- Quiz editor -------- */}
            <div className="mt-8 pt-6 border-t border-light">
              <h2 className="font-semibold">Quiz (end of chapter)</h2>
              {slForm.chapter_id ? (
                <>
                  {/* Settings */}
                  <div className="mt-3 grid gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="grid gap-1">
                        <span className="text-sm text-muted">Time limit (seconds)</span>
                        <input
                          type="number"
                          value={quizSettings.time_limit_seconds ?? ""}
                          onChange={(e)=>setQuizSettings(s=>({ ...s, chapter_id: slForm.chapter_id, time_limit_seconds: (e.target as HTMLInputElement).value===""?null:Number((e.target as HTMLInputElement).value) }))}
                          className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-sm text-muted"># of randomized questions</span>
                        <input
                          type="number"
                          value={quizSettings.num_questions ?? ""}
                          onChange={(e)=>setQuizSettings(s=>({ ...s, chapter_id: slForm.chapter_id, num_questions: (e.target as HTMLInputElement).value===""?null:Number((e.target as HTMLInputElement).value) }))}
                          className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                        />
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveQuizSettings} disabled={quizSaving || !slForm.chapter_id} className="rounded-lg bg-brand text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50">
                        {quizSaving ? "Saving…" : "Save Settings"}
                      </button>
                      <button onClick={()=>void refreshQuiz(slForm.chapter_id)} className="rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)]">
                        Refresh
                      </button>
                    </div>
                  </div>

                  {/* Questions list */}
                  <div className="mt-6">
                    <div className="text-sm font-semibold mb-2">Questions</div>
                    <div className="grid gap-2">
                      {questions.map((q, i) => (
                        <div key={q.id ?? i} className="rounded-lg p-3 ring-1 ring-[color:var(--color-light)]">
                          <div className="text-sm font-medium">{q.question}</div>
                          <ol className="text-xs text-muted mt-1 list-decimal ms-5">
                            {q.options.map((opt, idx) => (
                              <li key={idx} className={idx===q.correct_index ? "text-ink" : ""}>
                                {opt}{idx===q.correct_index ? "  ← correct" : ""}
                              </li>
                            ))}
                          </ol>
                          <div className="mt-2 flex gap-2">
                            <button onClick={()=>setQForm(q)} className="px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)] text-sm">Edit</button>
                            <button onClick={()=>void deleteQuestion(q.id)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm">Delete</button>
                          </div>
                        </div>
                      ))}
                      {questions.length===0 && <div className="text-xs text-muted">No questions yet.</div>}
                    </div>
                  </div>

                  {/* Question form */}
                  <div className="mt-6 grid gap-3">
                    <div className="text-sm font-semibold">Add / Edit Question</div>
                    <label className="grid gap-1">
                      <span className="text-sm text-muted">Question</span>
                      <input
                        value={qForm.question}
                        onChange={(e)=>setQForm(f=>({ ...f, chapter_id: slForm.chapter_id, question: (e.target as HTMLInputElement).value }))}
                        className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-sm text-muted">Options (comma separated)</span>
                      <input
                        value={toCsv(qForm.options)}
                        onChange={(e)=>setQForm(f=>({ ...f, chapter_id: slForm.chapter_id, options: fromCsv((e.target as HTMLInputElement).value) }))}
                        className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-sm text-muted">Correct index (0-based)</span>
                      <input
                        type="number"
                        value={qForm.correct_index}
                        onChange={(e)=>setQForm(f=>({ ...f, chapter_id: slForm.chapter_id, correct_index: Number((e.target as HTMLInputElement).value || 0) }))}
                        className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                      />
                    </label>
                    <div className="flex gap-2">
                      <button onClick={saveQuestion} className="rounded-lg bg-brand text-white px-4 py-2 font-semibold hover:opacity-90">Save Question</button>
                      <button onClick={()=>setQForm({ chapter_id: slForm.chapter_id, question: "", options: [], correct_index: 0, id: undefined })} className="rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)]">Reset</button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted mt-2">Pick a chapter to edit its quiz.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Media */}
      {tab==="media" && (
        <div className="mt-8 rounded-2xl bg-white border border-light p-5">
          <h2 className="font-semibold">Upload Image to Storage</h2>
          <p className="text-sm text-muted mt-1">Uploads to Supabase Storage (public). Copy the URL wherever needed.</p>
          <div className="mt-4 flex items-center gap-3">
            <input type="file" accept="image/*" onChange={(e)=>{ const f=(e.target as HTMLInputElement).files?.[0]; if (f) { void handleUpload(f); } }} />
            <span>{uploading ? "Uploading…" : ""}</span>
          </div>
          {uploadedUrl && uploadedUrl.startsWith("http") && (
            <div className="mt-4">
              <div className="text-sm mb-2">Preview:</div>
              <Image src={uploadedUrl} alt="Uploaded" width={320} height={180} className="rounded-lg ring-1 ring-[color:var(--color-light)]" />
              <div className="text-sm mt-2">URL:</div>
              <code className="text-xs break-all">{uploadedUrl}</code>
            </div>
          )}
        </div>
      )}

      {/* Users */}
      {tab==="users" && (
        <div className="mt-8 rounded-2xl bg-white border border-light p-5">
          <h2 className="font-semibold">Users</h2>
          <button onClick={refreshUsers} className="mt-3 px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)]">Refresh</button>
          <div className="mt-3 grid gap-3">
            {users.map(u=>(
              <div key={u.id} className="flex items-start justify-between gap-3 rounded-lg p-3 ring-1 ring-[color:var(--color-light)]">
                <div className="text-sm">
                  <div className="font-semibold">{u.email ?? u.id}</div>
                  <div className="text-muted">Created: {u.created_at ?? "—"} · Confirmed: {u.email_confirmed_at ? "yes" : "no"}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>void generateLink(u.email)} className="px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)]" disabled={!u.email}>Confirm Link</button>
                  <button onClick={()=>void deleteUser(u.id)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white">Delete</button>
                </div>
              </div>
            ))}
            {users.length===0 && <div className="text-muted text-sm">No users loaded.</div>}
          </div>
        </div>
      )}

      {/* Deploy */}
      {tab==="deploy" && (
        <div className="mt-8 rounded-2xl bg-white border border-light p-5">
          <h2 className="font-semibold">Deployment</h2>
          <p className="text-sm text-muted">Trigger a Vercel rebuild (requires VERCEL_DEPLOY_HOOK_URL).</p>
          <button onClick={triggerDeploy} className="mt-3 rounded-lg bg-brand text-white px-4 py-2 font-semibold hover:opacity-90">Trigger Deploy</button>
        </div>
      )}
    </div>
  );
}