"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import * as pdfjs from "pdfjs-dist";

type Ebook = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  sample_url?: string | null;      // Full book PDF (we gate this by ownership)
  price_cents: number;             // minor units (GHS pesewas)
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
type PdfDoc = { numPages: number; getPage(n: number): Promise<PdfPage> };

export default function EbookDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const search = useSearchParams();

  const [ebook, setEbook] = useState<Ebook | null>(null);
  const [slug, setSlug] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const [own, setOwn] = useState<OwnershipState>({ kind: "loading" });
  const [userId, setUserId] = useState<string>("");
  const [email, setEmail] = useState<string>(""); // needed for Paystack init
  const [buying, setBuying] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null); // reference string when verifying

  // Reader state
  const [pdfReady, setPdfReady] = useState(false);
  const [showReader, setShowReader] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);

  const readerWrapRef = useRef<HTMLDivElement | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<PdfDoc | null>(null);

  const dashboardHref = "/dashboard";

  /** Lock copy/print/save */
  useEffect(() => {
    const preventAll = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["p","s","u","c","x","a"].includes(k)) preventAll(e);
    };
    const CAPTURE: AddEventListenerOptions = { capture: true };
    document.addEventListener("contextmenu", preventAll, CAPTURE);
    document.addEventListener("copy", preventAll, CAPTURE);
    document.addEventListener("cut", preventAll, CAPTURE);
    document.addEventListener("paste", preventAll, CAPTURE);
    document.addEventListener("keydown", onKey, CAPTURE);
    window.addEventListener("beforeprint", preventAll, CAPTURE);
    return () => {
      document.removeEventListener("contextmenu", preventAll, CAPTURE);
      document.removeEventListener("copy", preventAll, CAPTURE);
      document.removeEventListener("cut", preventAll, CAPTURE);
      document.removeEventListener("paste", preventAll, CAPTURE);
      document.removeEventListener("keydown", onKey, CAPTURE);
      window.removeEventListener("beforeprint", preventAll, CAPTURE);
    };
  }, []);

  /** PDF worker from /public/vendor */
  useEffect(() => {
  try {
    // This is properly typed in pdfjs-dist and avoids ts-comments
    pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.mjs";
    setPdfReady(true);
  } catch {
    setPdfReady(false);
  }
}, []);


  /** Resolve slug from route params */
  useEffect(() => { (async () => setSlug((await params).slug))(); }, [params]);

  /** Auth (get user + email early) */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserId("");
        setEmail("");
        setOwn({ kind: "signed_out" });  // still allow viewing page, but gated
        return;
      }
      setUserId(user.id);
      setEmail(user.email ?? "");
    })();
  }, []);

  /** Load ebook meta */
  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const r = await fetch(`/api/ebooks/${encodeURIComponent(slug)}`, { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || r.statusText);
        setEbook(j as Ebook);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, [slug]);

  /** Ownership check */
  useEffect(() => {
    (async () => {
      if (!ebook?.id) { setOwn({ kind: "loading" }); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setOwn({ kind: "signed_out" }); return; }
      const { data, error } = await supabase
        .from("ebook_purchases").select("status")
        .eq("user_id", user.id).eq("ebook_id", ebook.id).maybeSingle();
      if (error) { setOwn({ kind: "not_owner" }); return; }
      setOwn(data?.status === "paid" ? { kind: "owner" } : { kind: "not_owner" });
    })();
  }, [ebook?.id]);

  /** If Paystack sent us back with a reference, verify and poll until unlocked */
  useEffect(() => {
    const ref = search.get("reference") || search.get("ref") || null;
    if (!ref || !ebook?.id || !userId) return;

    let stopped = false;
    let tries = 0;
    setVerifying(ref);

    (async () => {
      // 1) Try server-side verify (if route exists)
      try {
        const resp = await fetch(`/api/payments/paystack/verify?reference=${encodeURIComponent(ref)}`, { method: "GET" });
        // ignore failures; we will poll DB anyway
        await resp.json().catch(() => null);
      } catch { /* ignore */ }

      // 2) Poll Supabase for up to ~30s
      while (!stopped && tries < 15) {
        tries += 1;
        try {
          const { data, error } = await supabase
            .from("ebook_purchases").select("status")
            .eq("user_id", userId).eq("ebook_id", ebook.id).maybeSingle();
          const paid = !error && data?.status === "paid";
          if (paid) {
            setOwn({ kind: "owner" });
            setVerifying(null);
            // Clean URL (remove ?reference=…)
            router.replace(`/ebooks/${encodeURIComponent(slug)}`);
            return;
          }
        } catch { /* ignore and keep polling */ }
        await new Promise(r => setTimeout(r, 2000));
      }
      setVerifying(null);
    })();

    return () => { stopped = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, ebook?.id, userId, slug]);

  /** Price text */
  const price = useMemo(
    () => (ebook ? `GH₵ ${(ebook.price_cents / 100).toFixed(2)}` : ""),
    [ebook]
  );

  /** Start Paystack checkout (forces sign-in first) */
  async function handleBuy() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/auth/sign-in?redirect=${encodeURIComponent(`/ebooks/${slug}`)}`);
      return;
    }
    if (!ebook || !email) return;

    setBuying(true);
    try {
      // price_cents are already minor units (GHS pesewas)
      const amountMinor = Math.round(Number(ebook.price_cents));

      const res = await fetch("/api/payments/paystack/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          amountMinor,
          meta: {
            kind: "ebook",
            user_id: user.id,
            ebook_id: ebook.id,
            slug: ebook.slug, // so server can set callback back to this page
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.authorization_url) {
        throw new Error(data?.error || "Failed to initialize payment.");
      }

      // Off to Paystack
      window.location.href = data.authorization_url;
    } catch (e) {
      setErr((e as Error).message || "Payment init failed");
      setBuying(false);
    }
  }

  /** PDF helpers */
  async function ensurePdfDoc(): Promise<PdfDoc | null> {
    if (pdfDocRef.current) return pdfDocRef.current;
    if (!ebook?.sample_url) return null;
    // Secure proxy route on your server
    const doc = await pdfjs.getDocument({ url: `/api/secure-pdf?src=${encodeURIComponent(ebook.sample_url)}` }).promise;
    pdfDocRef.current = doc as unknown as PdfDoc;
    return pdfDocRef.current;
  }

  async function renderPdf() {
    if (!pdfContainerRef.current) return;
    const container = pdfContainerRef.current;
    setRendering(true);
    setRenderError(null);
    try {
      const doc = await ensurePdfDoc();
      if (!doc) throw new Error("PDF not available");
      container.innerHTML = "";

      const width = container.clientWidth * zoom;
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const base = page.getViewport({ scale: 1 });
        const scale = Math.max(0.25, Math.min(width / base.width, 4));
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
      container.scrollTop = 0;
    } catch (e) {
      setRenderError((e as Error).message || "Failed to load PDF");
    } finally {
      setRendering(false);
    }
  }

  function openReader() {
    // Reader is only enabled if own.kind === "owner"
    setShowReader(true);
    queueMicrotask(async () => {
      readerWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (pdfReady && ebook?.sample_url) await renderPdf();
    });
  }

  // Re-render on zoom
  useEffect(() => {
    if (showReader && pdfReady && ebook?.sample_url) { void renderPdf(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // Re-render on resize
  useEffect(() => {
    function onResize() { if (showReader && pdfReady && ebook?.sample_url) void renderPdf(); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showReader, pdfReady, ebook?.sample_url]);

  /** UI states */
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
        {/* LEFT */}
        <aside className="md:col-span-4">
          <div className="md:sticky md:top-20 space-y-4">
            <div className="rounded-2xl bg-white border border-light overflow-hidden">
              {ebook.cover_url ? (
                <Image
                  src={ebook.cover_url}
                  alt={ebook.title}
                  width={1200}
                  height={900}
                  className="w-full h-auto pointer-events-none select-none"
                  priority
                  draggable={false}
                />
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

              <div className="mt-4 grid gap-3">
                {own.kind === "loading" && (
                  <div className="text-sm text-muted">Checking access…</div>
                )}

                {verifying && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                    Verifying payment (ref: {verifying})… You’ll be unlocked automatically once confirmed.
                  </div>
                )}

                {own.kind === "signed_out" && (
                  <>
                    <Link
                      href={`/auth/sign-in?redirect=${encodeURIComponent(`/ebooks/${slug}`)}`}
                      className="inline-flex items-center justify-center rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90 w-full sm:w-auto"
                    >
                      Sign in to buy
                    </Link>
                    <Link
                      href={dashboardHref}
                      className="inline-flex items-center justify-center rounded-lg px-5 py-3 ring-1 ring-[color:var(--color-light)] hover:bg-[color:var(--color-light)]/50 w-full sm:w-auto"
                    >
                      Go to Dashboard
                    </Link>
                  </>
                )}

                {own.kind === "not_owner" && (
                  <>
                    <button
                      onClick={handleBuy}
                      disabled={buying}
                      className="rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90 disabled:opacity-60 w-full sm:w-auto"
                    >
                      {buying ? "Redirecting…" : `Buy • ${price}`}
                    </button>
                    <Link
                      href={dashboardHref}
                      className="inline-flex items-center justify-center rounded-lg px-5 py-3 ring-1 ring-[color:var(--color-light)] hover:bg-[color:var(--color-light)]/50 w-full sm:w-auto"
                    >
                      Go to Dashboard
                    </Link>
                  </>
                )}

                {own.kind === "owner" && (
                  <>
                    <button
                      onClick={openReader}
                      className="rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90 w-full sm:w-auto"
                    >
                      Read now
                    </button>
                    <Link
                      href={dashboardHref}
                      className="inline-flex items-center justify-center rounded-lg px-5 py-3 ring-1 ring-[color:var(--color-light)] hover:bg-[color:var(--color-light)]/50 w-full sm:w-auto"
                    >
                      Go to Dashboard
                    </Link>
                  </>
                )}
              </div>

              {own.kind !== "owner" && (
                <p className="mt-3 text-xs text-muted">Sign in and purchase to unlock reading.</p>
              )}
            </div>
          </div>
        </aside>

        {/* RIGHT: secure reader */}
        <section className="md:col-span-8">
          <div ref={readerWrapRef} className="rounded-2xl bg-white border border-light secure-viewer">
            {own.kind !== "owner" ? (
              <div className="w-full h-[75vh] grid place-items-center bg-[color:var(--color-light)]/40">
                <div className="text-center px-6">
                  <div className="text-lg font-semibold">Access locked</div>
                  <p className="text-sm text-muted mt-1">
                    {own.kind === "signed_out"
                      ? "Sign in and purchase to read the full e-book."
                      : "Purchase to read the full e-book."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative">
                {/* Toolbar */}
                <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-light bg-white/90 px-3 py-2">
                  <button
                    onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 10) / 10))}
                    className="rounded-md px-3 py-1 ring-1 ring-[color:var(--color-light)] hover:bg-[color:var(--color-light)]/50"
                  >
                    −
                  </button>
                  <button
                    onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.1) * 10) / 10))}
                    className="rounded-md px-3 py-1 ring-1 ring-[color:var(--color-light)] hover:bg-[color:var(--color-light)]/50"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setZoom(1)}
                    className="rounded-md px-3 py-1 ring-1 ring-[color:var(--color-light)] hover:bg-[color:var(--color-light)]/50"
                  >
                    Fit width
                  </button>
                  <button
                    onClick={() => setZoom(1.0)}
                    className="rounded-md px-3 py-1 ring-1 ring-[color:var(--color-light)] hover:bg-[color:var(--color-light)]/50"
                  >
                    100%
                  </button>
                  <span className="ml-2 text-sm text-muted">Zoom: {(zoom * 100).toFixed(0)}%</span>
                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={() => {
                        const c = pdfContainerRef.current;
                        if (c) c.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="rounded-md px-3 py-1 ring-1 ring-[color:var(--color-light)] hover:bg-[color:var(--color-light)]/50"
                    >
                      Top
                    </button>
                    <button
                      onClick={() => {
                        const c = pdfContainerRef.current;
                        if (c) c.scrollTo({ top: c.scrollHeight, behavior: "smooth" });
                      }}
                      className="rounded-md px-3 py-1 ring-1 ring-[color:var(--color-light)] hover:bg-[color:var(--color-light)]/50"
                    >
                      Bottom
                    </button>
                  </div>
                </div>

                {/* Fixed-height scrollable frame */}
                <div className="relative z-0 h-[75vh] overflow-auto px-2 py-4">
                  <div ref={pdfContainerRef} aria-label="Secure PDF Reader" />
                  {rendering && (
                    <div className="absolute inset-0 grid place-items-center bg-white/40">
                      <div className="text-sm">Loading pages…</div>
                    </div>
                  )}
                  {renderError && (
                    <div className="p-4 text-sm text-red-600">Error loading PDF: {renderError}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* DESCRIPTION */}
      <section className="mt-10">
        <div className="rounded-2xl bg-white border border-light p-6">
          <h2 className="text-xl font-semibold">About this e-book</h2>
          <p className="mt-3 text-muted whitespace-pre-line">
            {ebook.description ?? "No description provided."}
          </p>
          <div className="mt-6">
            <Link href="/ebooks" className="underline">
              ← Back to E-Books
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
