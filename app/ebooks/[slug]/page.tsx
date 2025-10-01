// app/ebooks/[slug]/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Ebook = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  sample_url?: string | null; // Use this as the FULL book PDF (locked until paid)
  price_cents: number;
  published: boolean;
};

type OwnershipState =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "owner" }
  | { kind: "not_owner" };

export default function EbookDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();
  const [ebook, setEbook] = useState<Ebook | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [slug, setSlug] = useState<string>("");
  const [own, setOwn] = useState<OwnershipState>({ kind: "loading" });
  const [buying, setBuying] = useState(false);

  // Secure reading UI
  const [showReader, setShowReader] = useState(false);
  const [maskActive, setMaskActive] = useState(false);
  const [watermark, setWatermark] = useState<string>("SECURE COPY");
  const readerRef = useRef<HTMLDivElement | null>(null);

  // Global hardening: block printing, copy, right-click, common save/print shortcuts
  useEffect(() => {
    const preventAll = (e: Event): void => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onKey = (e: KeyboardEvent): void => {
      const k = e.key.toLowerCase();
      // Block common shortcuts: print/save/view-source/copy/cut/select-all
      if (
        (e.ctrlKey || e.metaKey) &&
        (k === "p" || k === "s" || k === "u" || k === "c" || k === "x" || k === "a")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
      // Best-effort block of screenshot shortcuts on some platforms (not guaranteed)
      if (e.metaKey && e.shiftKey && (k === "3" || k === "4" || k === "5")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onVisibility = (): void => {
      // Dim the reader when tab not visible (best-effort anti-screenshot)
      setMaskActive(document.hidden);
    };
    const onBlur = (): void => {
      setMaskActive(true);
    };
    const onFocus = (): void => {
      setMaskActive(false);
    };

    const CAPTURE: AddEventListenerOptions = { capture: true };

    document.addEventListener("contextmenu", preventAll, CAPTURE);
    document.addEventListener("copy", preventAll, CAPTURE);
    document.addEventListener("cut", preventAll, CAPTURE);
    document.addEventListener("paste", preventAll, CAPTURE);
    document.addEventListener("keydown", onKey, CAPTURE);
    window.addEventListener("beforeprint", preventAll, CAPTURE);
    document.addEventListener("visibilitychange", onVisibility, CAPTURE);
    window.addEventListener("blur", onBlur, CAPTURE);
    window.addEventListener("focus", onFocus, CAPTURE);

    return () => {
      document.removeEventListener("contextmenu", preventAll, CAPTURE);
      document.removeEventListener("copy", preventAll, CAPTURE);
      document.removeEventListener("cut", preventAll, CAPTURE);
      document.removeEventListener("paste", preventAll, CAPTURE);
      document.removeEventListener("keydown", onKey, CAPTURE);
      window.removeEventListener("beforeprint", preventAll, CAPTURE);
      document.removeEventListener("visibilitychange", onVisibility, CAPTURE);
      window.removeEventListener("blur", onBlur, CAPTURE);
      window.removeEventListener("focus", onFocus, CAPTURE);
    };
  }, []);

  // Load slug
  useEffect(() => {
    (async () => {
      setSlug((await params).slug);
    })();
  }, [params]);

  // Load ebook metadata
  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const r = await fetch(`/api/ebooks/${encodeURIComponent(slug)}`, {
          cache: "no-store",
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || r.statusText);
        setEbook(j as Ebook);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, [slug]);

  // Check auth + ownership + watermark identity
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setOwn({ kind: "signed_out" });
        setWatermark("SECURE COPY");
        return;
      }
      setWatermark(`${user.email ?? user.id} • ${new Date().toISOString()}`);
      if (!ebook?.id) {
        setOwn({ kind: "loading" });
        return;
      }
      const { data, error } = await supabase
        .from("ebook_purchases")
        .select("status")
        .eq("user_id", user.id)
        .eq("ebook_id", ebook.id)
        .maybeSingle();

      if (error) {
        setOwn({ kind: "not_owner" });
        return;
      }
      setOwn(data?.status === "paid" ? { kind: "owner" } : { kind: "not_owner" });
    })();
  }, [ebook?.id]);

  const price = useMemo(
    () => (ebook ? `GH₵ ${(ebook.price_cents / 100).toFixed(2)}` : ""),
    [ebook]
  );

  async function handleBuy() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const redirect = encodeURIComponent(`/ebooks/${slug}`);
      router.push(`/auth/sign-in?redirect=${redirect}`);
      return;
    }
    if (!ebook) return;

    setBuying(true);
    try {
      const r = await fetch("/api/payments/ebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ebookId: ebook.id,
          slug: ebook.slug,
          amount_cents: ebook.price_cents,
          currency: "GHS",
        }),
      });
      const j = await r.json();
      if (!r.ok || !j?.checkoutUrl) throw new Error(j?.error || "Payment init failed");
      window.location.href = j.checkoutUrl;
    } catch (e) {
      setErr((e as Error).message);
      setBuying(false);
    }
  }

  function openReader() {
    setShowReader(true);
    // Scroll reader into view
    queueMicrotask(() => {
      readerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (err) {
    return (
      <main className="mx-auto max-w-screen-md px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold">E-Book</h1>
        <p className="mt-3 text-red-600 text-sm">Error: {err}</p>
        <Link href="/ebooks" className="mt-4 inline-block underline">
          Back to E-Books
        </Link>
      </main>
    );
  }

  if (!ebook) {
    return (
      <main className="mx-auto max-w-screen-md px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-2xl bg-white border border-light p-6 animate-pulse h-[320px]" />
      </main>
    );
  }

  // We use sample_url as the ACTUAL book PDF (no toolbar)
  const bookPdfSrc =
    ebook.sample_url && ebook.sample_url.endsWith(".pdf")
      ? `${ebook.sample_url}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&view=FitH`
      : null;

  return (
    <main
      className="mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-10 grid gap-8 md:grid-cols-2 select-none"
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDragStart={(e) => { e.preventDefault(); }}
    >
      {/* Anti-print & anti-copy CSS (scoped global for this page) */}
      <style jsx global>{`
        @media print {
          body { display: none !important; }
        }
        html, body, main, .secure-viewer, .secure-viewer * {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
        }
      `}</style>

      {/* LEFT: cover + reader area */}
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

        {/* SECURE READER (owner must click "Read securely") */}
        <div ref={readerRef} className="relative border-t border-light secure-viewer">
          {own.kind !== "owner" && (
            <div className="w-full h-[320px] sm:h-[420px] bg-[color:var(--color-light)]/40 grid place-items-center">
              <div className="text-center px-6">
                <div className="text-lg font-semibold">Access locked</div>
                <p className="text-sm text-muted mt-1">
                  {own.kind === "signed_out"
                    ? "Sign in and purchase to read the full e-book."
                    : "Purchase to read the full e-book."}
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  {own.kind === "signed_out" ? (
                    <>
                      <Link
                        href={`/auth/sign-in?redirect=${encodeURIComponent(`/ebooks/${slug}`)}`}
                        className="rounded-lg bg-brand text-white px-4 py-2 font-medium hover:opacity-90"
                      >
                        Sign in
                      </Link>
                      <Link
                        href={`/auth/sign-up?redirect=${encodeURIComponent(`/ebooks/${slug}`)}`}
                        className="rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)] bg-white hover:bg-[color:var(--color-light)]/30"
                      >
                        Create account
                      </Link>
                    </>
                  ) : (
                    <button
                      onClick={handleBuy}
                      disabled={buying || own.kind === "loading"}
                      className="rounded-lg bg-brand text-white px-4 py-2 font-medium hover:opacity-90 disabled:opacity-60"
                    >
                      {buying ? "Redirecting…" : `Buy • ${price}`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {own.kind === "owner" && (
            <div className="p-4">
              {!showReader ? (
                <button
                  onClick={openReader}
                  className="rounded-lg bg-brand text-white px-4 py-2 font-semibold hover:opacity-90"
                >
                  Read securely
                </button>
              ) : bookPdfSrc ? (
                <div className="relative">
                  {/* Watermark overlay (dense, rotated) */}
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute inset-0 z-20 select-none ${maskActive ? "opacity-90" : "opacity-25"}`}
                    style={{ transition: "opacity 120ms ease" }}
                  >
                    <div className="w-full h-full rotate-[-25deg] grid gap-12 opacity-100" style={{ placeItems: "center" }}>
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

                  {/* Secure iframe */}
                  <iframe
                    src={bookPdfSrc}
                    title="E-book reader"
                    className={`w-full h-[70vh] block relative z-10 ${maskActive ? "blur-sm" : ""}`}
                    sandbox="allow-scripts allow-same-origin" /* intentionally no allow-downloads */
                    referrerPolicy="no-referrer"
                    allow="clipboard-read; clipboard-write"
                  />
                  {/* Top gradient to hinder easy OCR of header lines */}
                  <div className="pointer-events-none absolute top-0 left-0 right-0 h-8 z-30 bg-gradient-to-b from-white/70 to-transparent" />
                </div>
              ) : (
                <div className="text-sm text-muted">PDF not available.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: details + CTAs */}
      <div>
        <h1 className="text-3xl font-bold">{ebook.title}</h1>
        <p className="mt-3 text-muted whitespace-pre-line">
          {ebook.description ?? ""}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {own.kind !== "owner" && (
            <button
              onClick={handleBuy}
              disabled={buying || own.kind === "loading"}
              className="rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {buying ? "Redirecting…" : `Buy • ${price}`}
            </button>
          )}
          {own.kind === "owner" && !showReader && (
            <button
              onClick={openReader}
              className="rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90"
            >
              Read securely
            </button>
          )}
          {/* No download/print options ever */}
        </div>

        <div className="mt-6 text-sm text-muted">
          Reading is enabled on this page after purchase. Downloading and printing are disabled. The reader dims when this tab loses focus.
        </div>

        <div className="mt-8">
          <Link href="/ebooks" className="underline">
            ← Back to E-Books
          </Link>
        </div>
      </div>
    </main>
  );
}
