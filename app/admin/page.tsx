"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/** ---------- Types ---------- */
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

type SupabaseUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  created_at?: string;
};

type UsersListResponse = {
  users?: SupabaseUser[];
  total?: number;
  nextPage?: number;
  lastPage?: number;
};

type UploadResponse = { path: string; publicUrl: string };
type ErrorResponse = { error: string };
type LinkResponse = { link?: string | null };
type DeployResponse = { ok: boolean; text?: string; error?: string };

type SocialLinks = { x?: string; instagram?: string; linkedin?: string; facebook?: string };
type SiteSettings = {
  hero_title?: string | null;
  hero_subtitle?: string | null;
  primary_color?: string | null;
  accent_color?: string | null;
  bg_color?: string | null;
  text_color?: string | null;
  social?: SocialLinks | null;
  footer_copy?: string | null;
};

const colorKeys = ["primary_color","accent_color","bg_color","text_color"] as const;
type ColorKey = typeof colorKeys[number];
const colorLabels: Record<ColorKey,string> = {
  primary_color: "Primary Color",
  accent_color: "Accent Color",
  bg_color: "Background Color",
  text_color: "Text Color",
};
const socialKeys = ["x","instagram","linkedin","facebook"] as const;
type SocialKey = typeof socialKeys[number];

/** ---------- Narrowing helpers (no any) ---------- */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function isSupabaseUser(v: unknown): v is SupabaseUser {
  return isRecord(v) && typeof v.id === "string";
}
function isUsersListResponse(v: unknown): v is UsersListResponse {
  return isRecord(v) && (!("users" in v) || Array.isArray(v.users));
}
function isUploadResponse(v: unknown): v is UploadResponse {
  return isRecord(v) && typeof v.publicUrl === "string" && typeof v.path === "string";
}
function isErrorResponse(v: unknown): v is ErrorResponse {
  return isRecord(v) && typeof v.error === "string";
}
function isLinkResponse(v: unknown): v is LinkResponse {
  return isRecord(v) && (!("link" in v) || typeof v.link === "string" || v.link === null);
}
function isDeployResponse(v: unknown): v is DeployResponse {
  return isRecord(v) && typeof v.ok === "boolean";
}

/** ---------- Component ---------- */
export default function AdminPage() {
  const [tab, setTab] = useState<"overview"|"knowledge"|"media"|"users"|"settings"|"deploy">("overview");

  // Overview stats
  const [statKnowledge, setStatKnowledge] = useState(0);
  const [statUsers, setStatUsers] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        const kRes = await fetch("/api/admin/knowledge");
        const k = (await kRes.json()) as unknown;
        setStatKnowledge(Array.isArray(k) ? k.length : 0);

        const uRes = await fetch("/api/admin/users");
        const u = (await uRes.json()) as unknown;
        const total =
          (isUsersListResponse(u) && typeof u.total === "number" && u.total) ||
          (isUsersListResponse(u) && Array.isArray(u.users) ? u.users.length : 0);
        setStatUsers(total);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // Knowledge
  const emptyK: Knowledge = {
    slug:"", title:"", description:"", level:"",
    price:null, cpd_points:null, img:"", accredited:[], published:true
  };
  const [list, setList] = useState<Knowledge[]>([]);
  const [form, setForm] = useState<Knowledge>(emptyK);
  const [saving, setSaving] = useState(false);

  async function refreshKnowledge() {
    const r = await fetch("/api/admin/knowledge", { cache:"no-store" });
    const d = (await r.json()) as unknown;
    setList(Array.isArray(d) ? (d as Knowledge[]) : []);
  }
  useEffect(()=>{ if(tab==="knowledge") void refreshKnowledge(); },[tab]);

  async function saveKnowledge() {
    setSaving(true);
    const payload: Knowledge = { ...form, accredited: (form.accredited ?? []).map(String) };
    const r = await fetch("/api/admin/knowledge", {
      method:"POST",
      headers:{ "content-type":"application/json" },
      body: JSON.stringify(payload)
    });
    setSaving(false);
    if (r.ok) { setForm(emptyK); await refreshKnowledge(); }
    else alert("Save failed");
  }
  async function delKnowledge(id?: string) {
    if (!id || !confirm("Delete this knowledge item?")) return;
    const r = await fetch(`/api/admin/knowledge/${id}`, { method:"DELETE" });
    if (r.ok) await refreshKnowledge(); else alert("Delete failed");
  }

  // Media
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");

  async function handleUpload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", file.name);
    const r = await fetch("/api/admin/upload", { method:"POST", body: fd });
    setUploading(false);
    const d = (await r.json()) as unknown;
    if (r.ok && isUploadResponse(d)) setUploadedUrl(d.publicUrl);
    else if (isErrorResponse(d)) alert(d.error);
    else alert("Upload failed");
  }

  // Users
  const [users, setUsers] = useState<SupabaseUser[]>([]);
  async function refreshUsers() {
    const r = await fetch("/api/admin/users", { cache:"no-store" });
    const d = (await r.json()) as unknown;
    const arr = isUsersListResponse(d) && Array.isArray(d.users) ? d.users.filter(isSupabaseUser) : [];
    setUsers(arr);
  }
  useEffect(()=>{ if(tab==="users") void refreshUsers(); },[tab]);

  async function deleteUser(id: string) {
    if (!confirm("Delete this user?")) return;
    const r = await fetch(`/api/admin/users/${id}`, { method:"DELETE" });
    if (r.ok) await refreshUsers(); else alert("Delete failed");
  }
  async function generateLink(email?: string) {
    if (!email) return;
    const r = await fetch("/api/admin/users", {
      method:"POST",
      headers:{ "content-type":"application/json" },
      body: JSON.stringify({ action:"generate_confirmation_link", email })
    });
    const d = (await r.json()) as unknown;
    if (r.ok && isLinkResponse(d) && typeof d.link === "string" && d.link.length) {
      await navigator.clipboard.writeText(d.link);
      alert("Confirmation link copied.");
    } else if (isErrorResponse(d)) {
      alert(d.error);
    } else {
      alert("Could not generate link");
    }
  }

  // Settings
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  useEffect(()=>{ if(tab==="settings"){ fetch("/api/public/site-settings").then(r=>r.json()).then((s)=>setSettings((s ?? null) as SiteSettings | null)); } },[tab]);
  async function saveSettings() {
    const r = await fetch("/api/admin/site-settings",{
      method:"PUT",
      headers:{ "content-type":"application/json" },
      body: JSON.stringify(settings||{})
    });
    if (r.ok) alert("Settings saved."); else alert("Save failed");
  }

  // Deploy
  async function triggerDeploy() {
    const r = await fetch("/api/admin/deploy", { method:"POST" });
    const d = (await r.json()) as unknown;
    const msg =
      (isDeployResponse(d) && d.ok) ? "Deploy triggered" :
      (isDeployResponse(d) && !d.ok && d.text) ? `Failed: ${d.text}` :
      (isErrorResponse(d)) ? `Failed: ${d.error}` : "Failed";
    alert(msg);
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold">Master Admin</h1>
      <p className="text-muted mt-1">Overview, knowledge, media, users, site settings, deploy.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {(["overview","knowledge","media","users","settings","deploy"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={`px-3 py-2 rounded-lg ring-1 ring-[color:var(--color-light)] ${tab===t?"bg-brand text-white":"bg-white"}`}>{t[0].toUpperCase()+t.slice(1)}</button>
        ))}
      </div>

      {tab==="overview" && (
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-light bg-white p-5">
            <div className="text-sm text-muted">Published knowledge items</div>
            <div className="text-3xl font-bold mt-1">{statKnowledge}</div>
          </div>
          <div className="rounded-2xl border border-light bg-white p-5">
            <div className="text-sm text-muted">Total users</div>
            <div className="text-3xl font-bold mt-1">{statUsers}</div>
          </div>
        </div>
      )}

      {tab==="knowledge" && (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white border border-light p-5">
            <h2 className="font-semibold">Edit / Create Knowledge</h2>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1">
                <span className="text-sm text-muted">Slug</span>
                <input value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value}))} className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-muted">Title</span>
                <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-muted">Description</span>
                <input value={form.description ?? ""} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-muted">Level</span>
                <input value={form.level ?? ""} onChange={e=>setForm(f=>({...f,level:e.target.value}))} className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-muted">Price (GH₵)</span>
                <input type="number" value={form.price ?? ""} onChange={e=>setForm(f=>({...f,price:e.target.value===""?null:Number(e.target.value)}))} className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-muted">CPPD Points</span>
                <input type="number" value={form.cpd_points ?? ""} onChange={e=>setForm(f=>({...f,cpd_points:e.target.value===""?null:Number(e.target.value)}))} className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-muted">Image URL</span>
                <input value={form.img ?? ""} onChange={e=>setForm(f=>({...f,img:e.target.value}))} className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-muted">Accredited (comma separated)</span>
                <input
                  value={(form.accredited ?? []).join(", ")}
                  onChange={e=>setForm(f=>({...f,accredited:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)}))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                />
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={form.published ?? true} onChange={e=>setForm(f=>({...f,published:e.target.checked}))} />
                <span className="text-sm">Published</span>
              </label>
              <div className="flex items-center gap-2">
                <button onClick={saveKnowledge} disabled={saving} className="rounded-lg bg-brand text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50">
                  {saving?"Saving…":"Save"}
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
                    <button onClick={()=>delKnowledge(k.id)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white">Delete</button>
                  </div>
                </div>
              ))}
              {list.length===0 && <div className="text-muted text-sm">No items yet.</div>}
            </div>
          </div>
        </div>
      )}

      {tab==="media" && (
        <div className="mt-8 rounded-2xl bg-white border border-light p-5">
          <h2 className="font-semibold">Upload Image</h2>
          <p className="text-sm text-muted mt-1">Uploads to Supabase Storage (public). Paste the URL into an item’s Image URL.</p>
          <div className="mt-4 flex items-center gap-3">
            <input type="file" accept="image/*" onChange={e=>e.target.files && handleUpload(e.target.files[0])} />
            <span>{uploading ? "Uploading…" : ""}</span>
          </div>
          {uploadedUrl && (
            <div className="mt-4">
              <div className="text-sm">Public URL:</div>
              <code className="text-xs break-all">{uploadedUrl}</code>
              <div className="mt-2 relative w-full max-w-xs h-48">
                <Image src={uploadedUrl} alt="Uploaded" fill className="object-contain rounded-lg border border-light" sizes="(max-width: 768px) 100vw, 384px" />
              </div>
            </div>
          )}
        </div>
      )}

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

      {tab==="settings" && (
        <div className="mt-8 rounded-2xl bg-white border border-light p-5">
          <h2 className="font-semibold">Site Settings</h2>
          {!settings ? <div className="mt-3 text-muted">Loading…</div> : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm text-muted">Hero Title</span>
                <input value={settings.hero_title ?? ""} onChange={e=>setSettings(s=>({ ...(s||{}), hero_title:e.target.value }))} className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-muted">Hero Subtitle</span>
                <input value={settings.hero_subtitle ?? ""} onChange={e=>setSettings(s=>({ ...(s||{}), hero_subtitle:e.target.value }))} className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]" />
              </label>

              {colorKeys.map((k)=>(
                <label key={k} className="grid gap-1">
                  <span className="text-sm text-muted">{colorLabels[k]}</span>
                  <input
                    value={settings?.[k] ?? ""}
                    onChange={e=>setSettings(s=>({ ...(s||{}), [k]: e.target.value } as SiteSettings))}
                    className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                  />
                </label>
              ))}

              <fieldset className="md:col-span-2 grid gap-2">
                <legend className="text-sm text-muted">Social Links</legend>
                {socialKeys.map((key: SocialKey)=>(
                  <label key={key} className="grid gap-1">
                    <span className="text-xs uppercase text-muted">{key}</span>
                    <input
                      value={settings?.social?.[key] ?? ""}
                      onChange={e=>setSettings(s=>({ ...(s||{}), social:{ ...(s?.social||{}), [key]: e.target.value } }))}
                      className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                    />
                  </label>
                ))}
              </fieldset>

              <label className="md:col-span-2 grid gap-1">
                <span className="text-sm text-muted">Footer Copy</span>
                <input
                  value={settings?.footer_copy ?? ""}
                  onChange={e=>setSettings(s=>({ ...(s||{}), footer_copy:e.target.value }))}
                  className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
                />
              </label>

              <div className="md:col-span-2">
                <button onClick={saveSettings} className="rounded-lg bg-brand text-white px-4 py-2 font-semibold hover:opacity-90">Save Settings</button>
              </div>
            </div>
          )}
        </div>
      )}

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
