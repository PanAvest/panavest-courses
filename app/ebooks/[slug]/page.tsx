// app/ebooks/[slug]/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type Ebook = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  sample_url?: string | null; // PDF preview
  kpf_url?: string | null;    // download after purchase
  price_cents: number;
  published: boolean;
};

export default function EbookDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const [ebook, setEbook] = useState<Ebook | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [slug, setSlug] = useState<string>("");

  useEffect(() => {
    (async () => {
      setSlug((await params).slug);
    })();
  }, [params]);

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

  const price = `GH₵ ${(ebook.price_cents / 100).toFixed(2)}`;

  return (
    <main className="mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-10 grid gap-8 md:grid-cols-2">
      <div className="rounded-2xl bg-white border border-light overflow-hidden">
        {ebook.cover_url ? (
          <Image
            src={ebook.cover_url}
            alt={ebook.title}
            width={1200}
            height={900}
            className="w-full h-auto"
          />
        ) : (
          <div className="w-full h-[260px] bg-[color:var(--color-light)]/40 flex items-center justify-center text-muted">
            No cover
          </div>
        )}
        {ebook.sample_url && ebook.sample_url.endsWith(".pdf") && (
          <div className="border-t border-light">
            {/* Inline PDF preview (mobile: give height) */}
            <iframe
              src={ebook.sample_url}
              title="Sample preview"
              className="w-full h-[420px]"
            />
          </div>
        )}
      </div>

      <div>
        <h1 className="text-3xl font-bold">{ebook.title}</h1>
        <p className="mt-3 text-muted whitespace-pre-line">
          {ebook.description ?? ""}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {/* Purchase CTA — your existing purchase flow should gate to signed-in users */}
          <Link
            href={`/checkout/ebook/${encodeURIComponent(ebook.slug)}`}
            className="rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90"
          >
            Buy • {price}
          </Link>

          {/* Fall-back: if KPF is available & the user already owns it, your page can show a download button.
              Leave the ownership gate to your dashboard logic. */}
          {ebook.kpf_url && (
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
          * KPF files open in Kindle Previewer/Kindle apps. PDF preview is provided above.
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
