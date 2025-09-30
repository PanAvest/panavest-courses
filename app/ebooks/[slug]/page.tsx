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
  kpf_url?: string | null;    // download after purchase (LOCKED until paid)
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
        // treat as not owned if no row
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
      // DEMO PAYMENT: call your gateway creator endpoint
      // Replace this POST with your real gateway code.
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

  const showLocked = own.kind === "not_owner" || own.kind === "signed_out";

  return (
    <main className="mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-10 grid gap-8 md:grid-cols-2">
      {/* LEFT: cover + gated sample */}
      <div className="rounded-2xl bg-white border border-light overflow-hidden">
        {ebook.cover_url ? (
          <Image
            src={ebook.cover_url}
            alt={ebook.title}
            width={1200}
            height={900}
            className="w-full h-auto"
            priority
          />
        ) : (
          <div className="w-full h-[260px] bg-[color:var(--color-light)]/40 flex items-center justify-center text-muted">
            No cover
          </div>
        )}

        {/* GATED PDF PREVIEW */}
        {ebook.sample_url && ebook.sample_url.endsWith(".pdf") && (
          <div className="relative border-t border-light">
            {own.kind === "owner" ? (
              <iframe
                src={ebook.sample_url}
                title="Sample preview"
                className="w-full h-[420px]"
              />
            ) : (
              <div className="w-full h-[320px] sm:h-[420px] bg-[color:var(--color-light)]/40 grid place-items-center">
                <div className="text-center px-6">
                  <div className="text-lg font-semibold">Preview locked</div>
                  <p className="text-sm text-muted mt-1">
                    {own.kind === "signed_out"
                      ? "Sign in and purchase to unlock the PDF preview."
                      : "Purchase to unlock the PDF preview."}
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

          {/* DOWNLOAD KPF — only if owner */}
          {ebook.kpf_url && own.kind === "owner" && (
            <a
              href={ebook.kpf_url}
              className="rounded-lg px-5 py-3 ring-1 ring-[color:var(--color-light)] bg-white hover:bg-[color:var(--color-light)]/30"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download KPF
            </a>
          )}
        </div>

        <div className="mt-6 text-sm text-muted">
          * KPF files open in Kindle Previewer/Kindle apps. PDF preview is available after purchase.
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
