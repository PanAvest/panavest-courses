"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

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

function toCsv(v: string[] | null | undefined) { return (v ?? []).join(", "); }
function fromCsv(v: string) { return v.split(",").map(s => s.trim()).filter(Boolean); }

function asAdminUser(x: unknown): AdminUser {
  const r = (x && typeof x === "object") ? (x as Record<string, unknown>) : {};
  return {
    id: String(r["id"] ?? ""),
    email: typeof r["email"] === "string" ? r["email"] : undefined,
    email_confirmed_at: typeof r["email_confirmed_at"] === "string" ? r["email_confirmed_at"] : null,
    created_at: typeof r["created_at"] === "string" ? r["created_at"] : null,
  };
}

export default function AdminPage() {
  const [tab, setTab] = useState<"knowledge"|"media"|"users"|"deploy">("knowledge");

  // Knowledge
  const emptyK: Knowledge = {
    slug: "", title: "", description: "", level: "",
    price: null, cpd_points: null, img: "", accredited: [], published: true
  };
  const [list, setList] = useState<Knowledge[]>([]);
  const [form, setForm] = useState<Knowledge>(emptyK);
  const [saving, setSaving] = useState(false);

  async function refreshKnowledge() {
    const r = await fetch("/api/admin/knowledge", { cache: "no-store" });
    const d: unknown = await r.json();
    const arr = Array.isArray(d) ? d as Knowledge[] : [];
    setList(arr);
  }
  useEffect(() => { refreshKnowledge(); }, []);

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
  async function delKnowledge(id?: string) {
    if (!id) return;
    if (!confirm("Delete this item?")) return;
    const r = await fetch(`/api/admin/knowledge/${id}`, { method: "DELETE" });
    if (r.ok) await refreshKnowledge(); else alert("Delete failed");
  }

  // Media
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>("");

  async function handleUpload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", file.name);
    const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
    setUploading(false);
    const d: unknown = await r.json();
    const url = (d && typeof d === "object") ? (d as Record<string, unknown>)["publicUrl"] : null;
    if (r.ok && typeof url === "string") setUploadedUrl(url); else alert("Upload failed");
  }

  // Users
  const [users, setUsers] = useState<AdminUser[]>([]);
  async function refreshUsers() {
    const r = await fetch("/api/admin/users", { cache: "no-store" });
    const d: unknown = await r.json();
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
    const d: unknown = await r.json();
    const link = (d && typeof d === "object") ? (d as Record<string, unknown>)["link"] : null;
    if (r.ok && typeof link === "string") {
      await navigator.clipboard.writeText(link);
      alert("Confirmation link copied to clipboard");
    } else {
      alert("Could not generate link");
    }
  }

  // Deploy
  async function triggerDeploy() {
    const r = await fetch("/api/admin/deploy", { method: "POST" });
    const d: unknown = await r.json();
    const ok   = (d && typeof d === "object") ? (d as Record<string, unknown>)["ok"]   : null;
    const text = (d && typeof d === "object") ? (d as Record<string, unknown>)["text"] : null;
    alert(ok ? "Deploy triggered" : `Failed: ${String(text ?? "Unknown error")}`);
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold">Master Admin Dashboard</h1>
      <p className="text-muted mt-1">Manage knowledge, media, users, and deployments.</p>

      <div className="mt-6 flex gap-2">
        {(["knowledge","media","users","deploy"] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)} className={`px-3 py-2 rounded-lg ring-1 ring-[color:var(--color-light)] ${tab===t?"bg-brand text-white":"bg-white"}`}>
            {t[0].toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

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
          <h2 className="font-semibold">Upload Image to Storage</h2>
          <p className="text-sm text-muted mt-1">Uploads to Supabase Storage (public). Copy the URL into the knowledge “Image URL”.</p>
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
