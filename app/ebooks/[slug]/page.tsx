// app/ebooks/[slug]/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Ebook = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  sample_url?: string | null; // PDF preview (LOCKED until paid)
  kpf_url?: string | null;    // ignored (no download allowed)
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

  // Global hardening: block printing, copy, right-click, common save/print shortcuts
  useEffect(() => {
    const prevent = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (
        (e.ctrlKey || e.metaKey) &&
        (k === "p" || k === "s" || k === "u" || k === "c" || k === "x" || k === "a")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("contextmenu", prevent, { capture: true });
    document.addEventListener("copy", prevent, { capture: true });
    document.addEventListener("cut", prevent, { capture: true });
    document.addEventListener("paste", prevent, { capture: true });
    document.addEventListener("keydown", onKey, { capture: true });
    window.addEventListener("beforeprint", prevent as EventListener, { capture: true });

    return () => {
      document.removeEventListener("contextmenu", prevent, { capture: true } as any);
      document.removeEventListener("copy", prevent, { capture: true } as any);
      document.removeEventListener("cut", prevent, { capture: true } as any);
      document.removeEventListener("paste", prevent, { capture: true } as any);
      document.removeEventListener("keydown", onKey, { capture: true } as any);
      window.removeEventListener("beforeprint", prevent as EventListener, { capture: true } as any);
    };
  }, []);

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

  // Check auth + ownership
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setOwn({ kind: "signed_out" });
        return;
      }
      if (!ebook?.id) {
        setOwn({ kind: "loading" });
        return;
      }
      // Expect a table: ebook_purchases(user_id uuid, ebook_id uuid, status text)
      // RLS: users can read only their own rows.
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
    // Must be logged in first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const redirect = encodeURIComponent(`/ebooks/${slug}`);
      router.push(`/auth/sign-in?redirect=${redirect}`);
      return;
    }
    if (!ebook) return;

    setBuying(true);
    try {
      // DEMO PAYMENT: call your gateway creator endpoint (already present)
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
      // Redirect to hosted checkout (demo)
      window.location.href = j.checkoutUrl;
    } catch (e) {
      setErr((e as Error).message);
      setBuying(false);
    }
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

  // Secure PDF viewer: hides toolbar; sandbox blocks downloads; print blocked at page level.
  const securePdfSrc =
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
        /* Reduce trivial extraction on this page */
        html, body, main, .secure-viewer, .secure-viewer * {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
        }
      `}</style>

      {/* LEFT: cover + gated sample */}
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

        {/* GATED PDF PREVIEW (read-only on site) */}
        {securePdfSrc && (
          <div className="relative border-t border-light secure-viewer">
            {own.kind === "owner" ? (
              <iframe
                // Hide controls via fragment; sandbox to block downloads & popouts
                src={securePdfSrc}
                title="E-book reader"
                className="w-full h-[420px] block"
                sandbox="allow-scripts allow-same-origin" // intentionally omit allow-downloads
                referrerPolicy="no-referrer"
                allow="clipboard-read; clipboard-write"
              />
            ) : (
              <div className="w-full h-[320px] sm:h-[420px] bg-[color:var(--color-light)]/40 grid place-items-center">
                <div className="text-center px-6">
                  <div className="text-lg font-semibold">Preview locked</div>
                  <p className="text-sm text-muted mt-1">
                    {own.kind === "signed_out"
                      ? "Sign in and purchase to unlock reading."
                      : "Purchase to unlock reading."}
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
          </div>
        )}
      </div>

      {/* RIGHT: details + CTAs */}
      <div>
        <h1 className="text-3xl font-bold">{ebook.title}</h1>
        <p className="mt-3 text-muted whitespace-pre-line">
          {ebook.description ?? ""}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {/* BUY (forces sign-in first) */}
          {own.kind !== "owner" && (
            <button
              onClick={handleBuy}
              disabled={buying || own.kind === "loading"}
              className="rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {buying ? "Redirecting…" : `Buy • ${price}`}
            </button>
          )}

          {/* ⛔️ No download button — even for owners */}
        </div>

        <div className="mt-6 text-sm text-muted">
          Reading is enabled on this page after purchase. Downloading and printing are disabled.
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
