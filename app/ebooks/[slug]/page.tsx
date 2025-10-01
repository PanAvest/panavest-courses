// app/ebooks/[slug]/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import * as pdfjs from "pdfjs-dist"; // local, typed import

type Ebook = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  sample_url?: string | null; // FULL book PDF (locked until paid)
  price_cents: number;
  published: boolean;
};

type OwnershipState =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "owner" }
  | { kind: "not_owner" };

type PdfPage = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void> };
};

export default function EbookDetailPage({
  params
}: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const [ebook, setEbook] = useState<Ebook | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [own, setOwn] = useState<OwnershipState>({ kind: "loading" });
  const [buying, setBuying] = useState(false);

  // Reader state
  const [pdfReady, setPdfReady] = useState(false);
  const [showReader, setShowReader] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [maskActive, setMaskActive] = useState(false);
  const [watermark, setWatermark] = useState("SECURE COPY");

  const readerWrapRef = useRef<HTMLDivElement | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);

  // Hardening (block print/copy/etc.)
  useEffect(() => {
    const preventAll = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["p","s","u","c","x","a"].includes(k)) preventAll(e);
      if (e.metaKey && e.shiftKey && ["3","4","5"].includes(k)) preventAll(e);
    };
    const onVis = () => setMaskActive(document.hidden);
    const onBlur = () => setMaskActive(true);
    const onFocus = () => setMaskActive(false);
    const CAPTURE: AddEventListenerOptions = { capture: true };
    document.addEventListener("contextmenu", preventAll, CAPTURE);
    document.addEventListener("copy", preventAll, CAPTURE);
    document.addEventListener("cut", preventAll, CAPTURE);
    document.addEventListener("paste", preventAll, CAPTURE);
    document.addEventListener("keydown", onKey, CAPTURE);
    window.addEventListener("beforeprint", preventAll, CAPTURE);
    document.addEventListener("visibilitychange", onVis, CAPTURE);
    window.addEventListener("blur", onBlur, CAPTURE);
    window.addEventListener("focus", onFocus, CAPTURE);
    return () => {
      document.removeEventListener("contextmenu", preventAll, CAPTURE);
      document.removeEventListener("copy", preventAll, CAPTURE);
      document.removeEventListener("cut", preventAll, CAPTURE);
      document.removeEventListener("paste", preventAll, CAPTURE);
      document.removeEventListener("keydown", onKey, CAPTURE);
      window.removeEventListener("beforeprint", preventAll, CAPTURE);
      document.removeEventListener("visibilitychange", onVis, CAPTURE);
      window.removeEventListener("blur", onBlur, CAPTURE);
      window.removeEventListener("focus", onFocus, CAPTURE);
    };
  }, []);

  // Setup module worker from /public (same origin, no nosniff)
  useEffect(() => {
    try {
      const worker = new Worker("/vendor/pdf.worker.min.mjs", { type: "module" });
      pdfjs.GlobalWorkerOptions.workerPort = worker;
      setPdfReady(true);
    } catch {
      setPdfReady(false);
    }
  }, []);

  // Slug
  useEffect(() => { (async () => setSlug((await params).slug))(); }, [params]);

  // Load ebook
  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const r = await fetch(`/api/ebooks/${encodeURIComponent(slug)}`, { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || r.statusText);
        setEbook(j as Ebook);
      } catch (e) { setErr((e as Error).message); }
    })();
  }, [slug]);

  // Auth/ownership + watermark
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setOwn({ kind: "signed_out" }); setWatermark("SECURE COPY"); return; }
      setWatermark(`${user.email ?? user.id} • ${new Date().toISOString()}`);
      if (!ebook?.id) { setOwn({ kind: "loading" }); return; }
      const { data, error } = await supabase
        .from("ebook_purchases").select("status")
        .eq("user_id", user.id).eq("ebook_id", ebook.id).maybeSingle();
      if (error) { setOwn({ kind: "not_owner" }); return; }
      setOwn(data?.status === "paid" ? { kind: "owner" } : { kind: "not_owner" });
    })();
  }, [ebook?.id]);

  const price = useMemo(
    () => (ebook ? `GH₵ ${(ebook.price_cents / 100).toFixed(2)}` : ""),
    [ebook]
  );

  async function handleBuy() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push(`/auth/sign-in?redirect=${encodeURIComponent(`/ebooks/${slug}`)}`); return; }
    if (!ebook) return;
    setBuying(true);
    try {
      const r = await fetch("/api/payments/ebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ebookId: ebook.id, slug: ebook.slug, amount_cents: ebook.price_cents, currency: "GHS" }),
      });
      const j = await r.json();
      if (!r.ok || !j?.checkoutUrl) throw new Error(j?.error || "Payment init failed");
      window.location.href = j.checkoutUrl;
    } catch (e) { setErr((e as Error).message); setBuying(false); }
  }

  async function renderPdf() {
    if (!ebook?.sample_url || !pdfContainerRef.current) return;
    setRendering(true);
    setRenderError(null);
    try {
      const container = pdfContainerRef.current;
      container.innerHTML = "";

      const proxied = `/api/secure-pdf?src=${encodeURIComponent(ebook.sample_url)}`;
      const doc = await pdfjs.getDocument({ url: proxied }).promise;

      const width = container.clientWidth || 820;
      for (let i = 1; i <= doc.numPages; i++) {
        const page = (await doc.getPage(i)) as unknown as PdfPage;
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(width / base.width, 2.0);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = "100%";
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        canvas.style.display = "block";

        if (ctx) await page.render({ canvasContext: ctx, viewport }).promise;
        container.appendChild(canvas);
      }
    } catch (e) {
      setRenderError((e as Error).message || "Failed to load PDF");
    } finally { setRendering(false); }
  }

  function openReader() {
    setShowReader(true);
    queueMicrotask(() => {
      readerWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (pdfReady && ebook?.sample_url) void renderPdf();
    });
  }

  useEffect(() => {
    if (showReader && pdfReady && ebook?.sample_url) void renderPdf();
    const onResize = () => { if (showReader && pdfReady && ebook?.sample_url) void renderPdf(); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showReader, pdfReady, ebook?.sample_url]);

  if (err) {
    return (
      <main className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold">E-Book</h1>
        <p className="mt-3 text-red-600 text-sm">Error: {err}</p>
        <Link href="/ebooks" className="mt-4 inline-block underline">Back to E-Books</Link>
      </main>
    );
  }

  if (!ebook) {
    return (
      <main className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-2xl bg-white border border-light p-6 animate-pulse h-[320px]" />
      </main>
    );
  }

  return (
    <main
      className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-10 select-none"
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDragStart={(e) => { e.preventDefault(); }}
    >
      <style jsx global>{`
        @media print { body { display: none !important; } }
        html, body, main, .secure-viewer, .secure-viewer * { user-select: none !important; }
      `}</style>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <aside className="md:col-span-4">
          <div className="md:sticky md:top-20 space-y-4">
            <div className="rounded-2xl bg-white border border-light overflow-hidden">
              {ebook.cover_url ? (
                <Image src={ebook.cover_url} alt={ebook.title} width={1200} height={900}
                  className="w-full h-auto pointer-events-none select-none" priority draggable={false} />
              ) : (
                <div className="w-full h-[260px] bg-[color:var(--color-light)]/40 flex items-center justify-center text-muted">
                  No cover
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white border border-light p-4">
              <h1 className="text-2xl font-bold">{ebook.title}</h1>
              <div className="mt-2 text-sm text-muted">Price</div>
              <div className="text-xl font-semibold">{price}</div>

              <div className="mt-4 flex flex-wrap gap-3">
                {own.kind !== "owner" ? (
                  <button onClick={handleBuy} disabled={buying || own.kind === "loading"}
                    className="rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90 disabled:opacity-60 w-full sm:w-auto">
                    {buying ? "Redirecting…" : `Buy • ${price}`}
                  </button>
                ) : (
                  <button onClick={openReader}
                    className="rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90 w-full sm:w-auto">
                    Read securely
                  </button>
                )}
              </div>

              {own.kind !== "owner" && (
                <p className="mt-3 text-xs text-muted">Sign in and purchase to unlock reading.</p>
              )}
            </div>
          </div>
        </aside>

        <section className="md:col-span-8">
          <div ref={readerWrapRef} className="relative rounded-2xl bg-white border border-light secure-viewer">
            {own.kind !== "owner" ? (
              <div className="w-full h-[50vh] sm:h-[60vh] grid place-items-center bg-[color:var(--color-light)]/40">
                <div className="text-center px-6">
                  <div className="text-lg font-semibold">Access locked</div>
                  <p className="text-sm text-muted mt-1">
                    {own.kind === "signed_out" ? "Sign in and purchase to read the full e-book." : "Purchase to read the full e-book."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative">
                {showReader ? (
                  <>
                    <div
                      aria-hidden
                      className={`pointer-events-none absolute inset-0 z-20 select-none ${maskActive ? "opacity-90" : "opacity-25"}`}
                      style={{ transition: "opacity 120ms ease" }}
                    >
                      <div className="w-full h-full rotate-[-25deg] grid gap-12" style={{ placeItems: "center" }}>
                        {Array.from({ length: 6 }).map((_, r) => (
                          <div key={`r-${r}`} className="flex gap-16">
                            {Array.from({ length: 4 }).map((__, c) => (
                              <span key={`c-${c}`} className="text-2xl font-bold tracking-wide text-black/60">
                                {watermark}
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={`relative z-10 ${maskActive ? "blur-sm" : ""}`}>
                      <div ref={pdfContainerRef} className="max-h-[75vh] min-h-[50vh] overflow-auto px-2 py-4" />
                      <div className="pointer-events-none absolute top-0 left-0 right-0 h-8 z-30 bg-gradient-to-b from-white/70 to-transparent" />
                      {rendering && (
                        <div className="absolute inset-0 grid place-items-center bg-white/40 z-30">
                          <div className="text-sm">Loading pages…</div>
                        </div>
                      )}
                      {renderError && (
                        <div className="p-4 text-sm text-red-600">Error loading PDF: {renderError}</div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="w-full h-[40vh] sm:h-[52vh] grid place-items-center">
                    <button onClick={openReader} className="rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90">
                      Read securely
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="mt-10">
        <div className="rounded-2xl bg-white border border-light p-6">
          <h2 className="text-xl font-semibold">About this e-book</h2>
          <p className="mt-3 text-muted whitespace-pre-line">{ebook.description ?? "No description provided."}</p>
          <div className="mt-6"><Link href="/ebooks" className="underline">← Back to E-Books</Link></div>
        </div>
      </section>
    </main>
  );
}
