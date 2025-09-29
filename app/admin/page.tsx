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

/* -------------- Small helpers -------------- */
function toCsv(v: string[] | null | undefined) { return (v ?? []).join(", "); }
function fromCsv(v: string) { return v.split(",").map(s => s.trim()).filter(Boolean); }
function isString(x: unknown): x is string { return typeof x === "string"; }

/* ---------------- Component ---------------- */
export default function AdminPage() {
  const [tab, setTab] = useState<"knowledge"|"structure"|"media"|"users"|"deploy">("knowledge");

  /* ---------- Knowledge ---------- */
  const [list, setList] = useState<Knowledge[]>([]);
  const [form, setForm] = useState<Knowledge>({
    slug: "", title: "", description: "", level: "",
    price: null, cpd_points: null, img: "", accredited: [], published: true
  });
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
    if (r.ok) {
      setForm({
        slug: "", title: "", description: "", level: "",
        price: null, cpd_points: null, img: "", accredited: [], published: true
      });
      await refreshKnowledge();
    } else {
      alert("Save failed");
    }
  }

  /* ---------- Structure: chapters + slides + quizzes ---------- */
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const selectedCourse = useMemo(
    () => list.find(k => (k.id ?? "") === selectedCourseId),
    [list, selectedCourseId]
  );

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chForm, setChForm] = useState<Chapter>({ course_id: "", title: "", order_index: 0 });
  const [savingChapter, setSavingChapter] = useState(false);

  const [slides, setSlides] = useState<Slide[]>([]);
  const [slForm, setSlForm] = useState<Slide>({ chapter_id: "", title: "", order_index: 0, intro_video_url: "", asset_url: "", body: "" });
  const [savingSlide, setSavingSlide] = useState(false);

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

  useEffect(() => {
    void refreshChapters(selectedCourseId);
    // avoid eslint deps warnings by not referencing external consts
    setChForm({ course_id: selectedCourseId, title: "", order_index: 0 });
    setSlForm({ chapter_id: "", title: "", order_index: 0, intro_video_url: "", asset_url: "", body: "" });
    setSlides([]);
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
      try { const j = await r.json(); msg = (j as any)?.error || r.statusText; } catch { msg = await r.text(); }
      alert(`Save chapter failed: ${msg}`);
      return;
    }
    await refreshChapters(selectedCourseId);
    const out = await r.json();
    const updated = Array.isArray(out) ? asChapters(out)[0] : (asChapters([out])[0] ?? payload);
    setChForm(updated);
    setSlForm(f => ({ ...f, chapter_id: updated.id ?? "" }));
    await refreshSlides(updated.id ?? "");
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
      try { const j = await r.json(); msg = (j as any)?.error || r.statusText; } catch { msg = await r.text(); }
      alert(`Save slide failed: ${msg}`);
      return;
    }

    const saved = await r.json();
    setSlForm((prev) => ({ ...prev, ...saved, chapter_id: prev.chapter_id }));
    await refreshSlides(slForm.chapter_id);
  }

  // stubs (delete endpoints can be added later)
  const deleteChapter = (_id?: string) => alert("Delete chapter not wired yet.");
  const deleteSlide   = (_id?: string)   => alert("Delete slide not wired yet.");

  // Uploads → /api/admin/upload (returns { publicUrl })
  async function uploadToStorage(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", file.name);
    const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const d = await r.json();
    const url = d && typeof d === "object" ? (d as Record<string, unknown>)["publicUrl"] : null;
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
    const url = d && typeof d === "object" ? (d as Record<string, unknown>)["publicUrl"] : null;
    if (isString(url)) setUploadedUrl(url); else alert("Upload failed");
  }

  /* ---------- Users ---------- */
  const [users, setUsers] = useState<AdminUser[]>([]);
  async function refreshUsers() {
    const r = await fetch("/api/admin/users", { cache: "no-store" });
    const d = await r.json();
    const usersField = d && typeof d === "object" ? (d as Record<string, unknown>)["users"] : null;
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
    const link = d && typeof d === "object" ? (d as Record<string, unknown>)["link"] : null;
    if (isString(link)) { await navigator.clipboard.writeText(link); alert("Confirmation link copied"); }
    else { alert("Could not generate link"); }
  }

  /* ---------- Deploy ---------- */
  async function triggerDeploy() {
    const r = await fetch("/api/admin/deploy", { method: "POST" });
    const d = await r.json();
    const ok   = d && typeof d === "object" ? (d as Record<string, unknown>)["ok"]   : null;
    const text = d && typeof d === "object" ? (d as Record<string, unknown>)["text"] : null;
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
                    onChange={e=>setForm(f=>({ ...f, [k]: e.target.value }))}
                    className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                  />
                </label>
              ))}
              <label className="grid gap-1">
                <span className="text-sm text-muted">Price (GH₵)</span>
                <input type="number"
                  value={form.price ?? ""}
                  onChange={e=>setForm(f=>({ ...f, price: e.target.value===""?null:Number(e.target.value) }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-muted">CPPD Points</span>
                <input type="number"
                  value={form.cpd_points ?? ""}
                  onChange={e=>setForm(f=>({ ...f, cpd_points: e.target.value===""?null:Number(e.target.value) }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-muted">Image URL</span>
                <input
                  value={form.img ?? ""}
                  onChange={e=>setForm(f=>({ ...f, img: e.target.value }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-muted">Accredited (comma separated)</span>
                <input
                  value={toCsv(form.accredited ?? [])}
                  onChange={e=>setForm(f=>({ ...f, accredited: fromCsv(e.target.value) }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]" />
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={form.published ?? true} onChange={e=>setForm(f=>({ ...f, published: e.target.checked }))} />
                <span className="text-sm">Published</span>
              </label>
              <div className="flex items-center gap-2">
                <button onClick={saveKnowledge} disabled={saving} className="rounded-lg bg-brand text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50">
                  {saving ? "Saving…" : "Save"}
                </button>
                <button onClick={()=>setForm({
                  slug: "", title: "", description: "", level: "",
                  price: null, cpd_points: null, img: "", accredited: [], published: true
                })} className="rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)]">Reset</button>
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
              onChange={(e)=>{ setSelectedCourseId(e.target.value); }}
            >
              <option value="">— Choose —</option>
              {list.map(k => (<option key={k.id ?? k.slug} value={k.id}>{k.title}</option>))}
            </select>

            <h3 className="mt-5 font-semibold">Chapters</h3>
            <div className="mt-2 grid gap-2">
              {chapters.map(ch => (
                <button
                  key={ch.id ?? ch.title}
                  onClick={()=>{ setChForm(ch); setSlForm(s => ({ ...s, chapter_id: ch.id ?? "" })); void refreshSlides(ch.id ?? ""); }}
                  className={`text-left rounded-lg px-3 py-2 ring-1 ring-[color:var(--color-light)] ${slForm.chapter_id===(ch.id??"") ? "bg-[color:var(--color-light)]/40" : "bg-white"}`}
                >
                  <div className="font-medium">{ch.title}</div>
                  <div className="text-xs text-muted">Order: {ch.order_index}</div>
                </button>
              ))}
              {selectedCourse && chapters.length===0 && <div className="text-xs text-muted">No chapters yet.</div>}
            </div>
          </div>

          {/* Middle: chapter form + QUIZ SETTINGS */}
          <div className="rounded-2xl bg-white border border-light p-5">
            <h2 className="font-semibold">Edit / Create Chapter</h2>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1">
                <span className="text-sm text-muted">Title</span>
                <input
                  value={chForm.title}
                  onChange={e=>setChForm(f=>({ ...f, title: e.target.value }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-muted">Order</span>
                <input
                  type="number"
                  value={chForm.order_index}
                  onChange={e=>setChForm(f=>({ ...f, order_index: Number(e.target.value || 0) }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                />
              </label>
              <div className="flex gap-2">
                <button onClick={saveChapter} disabled={savingChapter || !selectedCourseId || !chForm.title} className="rounded-lg bg-brand text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50">
                  {savingChapter ? "Saving…" : "Save Chapter"}
                </button>
                <button onClick={()=>setChForm({ course_id: selectedCourseId, title: "", order_index: 0 })} className="rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)]">Reset</button>
                <button onClick={()=>deleteChapter(chForm.id)} disabled className="rounded-lg px-4 py-2 bg-red-600 text-white disabled:opacity-50" title="Delete endpoint not wired yet">Delete</button>
              </div>

              {/* QUIZ SETTINGS PANEL */}
              <QuizSettingsPanel chapterId={chForm.id ?? ""} />
            </div>
          </div>

          {/* Right: slides list + form + QUIZ QUESTIONS */}
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
                  onChange={e=>setSlForm(f=>({ ...f, title: e.target.value }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-muted">Order</span>
                <input
                  type="number"
                  value={slForm.order_index}
                  onChange={e=>setSlForm(f=>({ ...f, order_index: Number(e.target.value || 0) }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                />
              </label>

              {/* URL inputs */}
              <label className="grid gap-1">
                <span className="text-sm text-muted">Intro video URL (optional)</span>
                <input
                  value={slForm.intro_video_url ?? ""}
                  onChange={e=>setSlForm(f=>({ ...f, intro_video_url: e.target.value }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-muted">Asset URL (slides/files, optional)</span>
                <input
                  value={slForm.asset_url ?? ""}
                  onChange={e=>setSlForm(f=>({ ...f, asset_url: e.target.value }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                />
              </label>

              {/* Direct upload inputs */}
              <div className="grid gap-2">
                <label className="grid gap-1">
                  <span className="text-sm text-muted">Upload intro video (optional)</span>
                  <input type="file" accept="video/*" onChange={e=>{ const f=e.target.files?.[0]; if (f) void onPickVideo(f); }} />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm text-muted">Upload asset (image/pdf/slide, optional)</span>
                  <input type="file" accept="image/*,application/pdf" onChange={e=>{ const f=e.target.files?.[0]; if (f) void onPickAsset(f); }} />
                </label>
              </div>

              <label className="grid gap-1">
                <span className="text-sm text-muted">Body / Notes (optional)</span>
                <textarea
                  value={slForm.body ?? ""}
                  onChange={e=>setSlForm(f=>({ ...f, body: e.target.value }))}
                  className="min-h-[90px] rounded-lg bg-white px-3 py-2 ring-1 ring-[color:var(--color-light)]"
                />
              </label>

              <div className="flex gap-2">
                <button onClick={saveSlide} disabled={savingSlide || !slForm.chapter_id || !slForm.title} className="rounded-lg bg-brand text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50">
                  {savingSlide ? "Saving…" : "Save Slide"}
                </button>
                <button onClick={()=>setSlForm({ chapter_id: slForm.chapter_id, title: "", order_index: 0, intro_video_url: "", asset_url: "", body: "" })} className="rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)]">Reset</button>
                <button onClick={()=>deleteSlide(slForm.id)} disabled className="rounded-lg px-4 py-2 bg-red-600 text-white disabled:opacity-50" title="Delete endpoint not wired yet">Delete</button>
              </div>

              {(slForm.intro_video_url || slForm.asset_url) && (
                <div className="mt-3 grid gap-3">
                  {slForm.intro_video_url && (
                    <div className="text-sm">
                      <div className="mb-1 text-muted">Video preview (if embeddable):</div>
                      <video src={slForm.intro_video_url} controls className="w-full rounded-lg ring-1 ring-[color:var(--color-light)]" />
                    </div>
                  )}
                  {slForm.asset_url && slForm.asset_url.startsWith("http") && (
                    <div className="text-sm">
                      <div className="mb-1 text-muted">Asset preview (image):</div>
                      <Image
                        src={slForm.asset_url}
                        alt="Asset preview"
                        width={640}
                        height={360}
                        className="rounded-lg ring-1 ring-[color:var(--color-light)]"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* QUIZ QUESTIONS PANEL */}
            <ChapterQuizPanel chapterId={slForm.chapter_id} />
          </div>
        </div>
      )}

      {/* Media */}
      {tab==="media" && (
        <div className="mt-8 rounded-2xl bg-white border border-light p-5">
          <h2 className="font-semibold">Upload Image to Storage</h2>
          <p className="text-sm text-muted mt-1">Uploads to Supabase Storage (public). Copy the URL wherever needed.</p>
          <div className="mt-4 flex items-center gap-3">
            <input type="file" accept="image/*" onChange={e=>e.target.files && handleUpload(e.target.files[0])} />
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
                  <button onClick={()=>generateLink(u.email)} className="px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)]" disabled={!u.email}>Confirm Link</button>
                  <button onClick={()=>deleteUser(u.id)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white">Delete</button>
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

/* ---------------- Type-guards & mapping (kept outside component to avoid re-creation) ---------------- */
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

/* ===================== QUIZ PANELS (self-contained, call your admin APIs) ===================== */

function QuizSettingsPanel({ chapterId }: { chapterId: string }) {
  const [timeLimit, setTimeLimit] = useState<number | "">("");
  const [numQuestions, setNumQuestions] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!chapterId) { setTimeLimit(""); setNumQuestions(""); return; }
    (async () => {
      const r = await fetch(`/api/admin/quiz-settings?chapter_id=${encodeURIComponent(chapterId)}`, { cache: "no-store" });
      const d = await r.json();
      const row = Array.isArray(d) ? d[0] : d;
      setTimeLimit(typeof row?.time_limit_seconds === "number" ? row.time_limit_seconds : "");
      setNumQuestions(typeof row?.num_questions === "number" ? row.num_questions : "");
    })();
  }, [chapterId]);

  async function save() {
    if (!chapterId) return;
    setSaving(true);
    const payload = {
      chapter_id: chapterId,
      time_limit_seconds: timeLimit === "" ? null : Number(timeLimit),
      num_questions: numQuestions === "" ? null : Number(numQuestions),
    };
    const r = await fetch("/api/admin/quiz-settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!r.ok) alert("Save failed"); else alert("Quiz settings saved");
  }

  return (
    <div className="mt-6 rounded-xl p-4 ring-1 ring-[color:var(--color-light)] bg-white">
      <div className="font-semibold">Chapter Quiz Settings</div>
      {!chapterId && <div className="mt-2 text-xs text-muted">Select a chapter to edit quiz settings.</div>}
      {chapterId && (
        <div className="mt-3 grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm text-muted">Time limit (seconds)</span>
            <input
              type="number"
              value={timeLimit}
              onChange={e => setTimeLimit(e.target.value === "" ? "" : Number(e.target.value))}
              className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-muted">Number of questions (optional)</span>
            <input
              type="number"
              value={numQuestions}
              onChange={e => setNumQuestions(e.target.value === "" ? "" : Number(e.target.value))}
              className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
            />
          </label>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving || !chapterId} className="rounded-lg bg-brand text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving…" : "Save Quiz Settings"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChapterQuizPanel({ chapterId }: { chapterId: string }) {
  const [list, setList] = useState<Array<{id?:string;question:string;options:string[];correct_index:number}>>([]);
  const [form, setForm] = useState<{id?:string;question:string;optionsCSV:string;correct_index:number}>({
    id: undefined, question: "", optionsCSV: "", correct_index: 1
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!chapterId) { setList([]); setForm({ id: undefined, question: "", optionsCSV: "", correct_index: 1 }); return; }
    (async () => {
      setLoading(true);
      const r = await fetch(`/api/admin/quiz-questions?chapter_id=${encodeURIComponent(chapterId)}`, { cache: "no-store" });
      const d = await r.json();
      setLoading(false);
      const arr = Array.isArray(d) ? d : [];
      setList(arr.map((q: any) => ({
        id: q.id, question: String(q.question ?? ""),
        options: Array.isArray(q.options) ? q.options.map(String) : [],
        correct_index: Number(q.correct_index ?? 0)
      })));
      setForm({ id: undefined, question: "", optionsCSV: "", correct_index: 1 });
    })();
  }, [chapterId]);

  async function save() {
    if (!chapterId) return;
    if (!form.question) return alert("Question is required");
    const opts = form.optionsCSV.split(",").map(s => s.trim()).filter(Boolean);
    if (opts.length < 2) return alert("Provide at least two options (comma separated).");

    setSaving(true);
    const r = await fetch("/api/admin/quiz-questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: form.id,
        chapter_id: chapterId,
        question: form.question,
        options: opts,
        correct_index: Math.max(0, Math.min(opts.length - 1, Number(form.correct_index) - 1)), // 1-based -> 0-based
      }),
    });
    setSaving(false);
    if (!r.ok) {
      alert("Save failed");
      return;
    }
    // reload
    const rr = await fetch(`/api/admin/quiz-questions?chapter_id=${encodeURIComponent(chapterId)}`, { cache: "no-store" });
    const d = await rr.json();
    const arr = Array.isArray(d) ? d : [];
    setList(arr.map((q: any) => ({
      id: q.id, question: String(q.question ?? ""),
      options: Array.isArray(q.options) ? q.options.map(String) : [],
      correct_index: Number(q.correct_index ?? 0)
    })));
    setForm({ id: undefined, question: "", optionsCSV: "", correct_index: 1 });
  }

  return (
    <div className="mt-6">
      <h3 className="font-semibold mt-6">Chapter Quiz</h3>
      {!chapterId && <div className="text-xs text-muted mt-1">Select a chapter to manage its quiz.</div>}

      {chapterId && (
        <>
          <div className="mt-2 grid gap-2">
            {loading && <div className="text-xs text-muted">Loading…</div>}
            {!loading && list.map((q, i) => (
              <button
                key={q.id ?? i}
                onClick={()=>setForm({ id:q.id, question:q.question, optionsCSV:q.options.join(", "), correct_index:(q.correct_index+1) })}
                className="text-left rounded-lg px-3 py-2 ring-1 ring-[color:var(--color-light)] bg-white"
              >
                <div className="font-medium text-sm">{i+1}. {q.question}</div>
                <div className="text-xs text-muted">Options: {q.options.join(" • ")} — Correct: {q.correct_index+1}</div>
              </button>
            ))}
            {!loading && list.length===0 && <div className="text-xs text-muted">No questions yet.</div>}
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm text-muted">Question</span>
              <input
                value={form.question}
                onChange={e=>setForm(f=>({ ...f, question: e.target.value }))}
                className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-muted">Options (comma separated)</span>
              <input
                value={form.optionsCSV}
                onChange={e=>setForm(f=>({ ...f, optionsCSV: e.target.value }))}
                className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-muted">Correct option (1-based)</span>
              <input
                type="number"
                value={form.correct_index}
                onChange={e=>setForm(f=>({ ...f, correct_index: Number(e.target.value || 1) }))}
                className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
              />
            </label>

            <div className="flex gap-2">
              <button onClick={save} disabled={saving || !chapterId} className="rounded-lg bg-brand text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50">
                {saving ? "Saving…" : (form.id ? "Update Question" : "Add Question")}
              </button>
              <button onClick={()=>setForm({ id: undefined, question:"", optionsCSV:"", correct_index: 1 })} className="rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)]">Reset</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
