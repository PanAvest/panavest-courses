// app/ebooks/page.tsx
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
  sample_url?: string | null;
  kpf_url?: string | null;
  price_cents: number;
  published: boolean;
};

export default function EbooksPage() {
  const [items, setItems] = useState<Ebook[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/ebooks", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || r.statusText);
        setItems(Array.isArray(j) ? j : []);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, []);

  return (
    <main className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold">E-Books</h1>
      <p className="mt-2 text-muted max-w-2xl">
        Browse our growing library. Preview PDFs are available; purchases add the title to your dashboard.
      </p>

      {err && <div className="mt-6 text-red-600 text-sm">Error: {err}</div>}

      {!items && !err && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white border border-light p-4 animate-pulse h-[240px]"
            />
          ))}
        </div>
      )}

      {items && (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((b) => (
            <Link
              key={b.id}
              href={`/ebooks/${encodeURIComponent(b.slug)}`}
              className="group rounded-2xl bg-white border border-light hover:shadow-sm transition overflow-hidden flex flex-col"
            >
              <div className="bg-white border-b border-light">
                {b.cover_url ? (
                  <Image
                    src={b.cover_url}
                    alt={b.title}
                    width={800}
                    height={600}
                    className="w-full h-[180px] object-cover"
                  />
                ) : (
                  <div className="w-full h-[180px] bg-[color:var(--color-light)]/40 flex items-center justify-center text-muted">
                    No cover
                  </div>
                )}
              </div>
              <div className="px-5 py-4 flex-1 flex flex-col">
                <h3 className="font-semibold text-lg text-ink group-hover:text-brand">
                  {b.title}
                </h3>
                <p className="mt-2 text-sm text-muted line-clamp-3">
                  {b.description ?? "No description yet."}
                </p>
                <div className="mt-auto pt-3 text-sm font-medium">
                  GH₵ {(b.price_cents / 100).toFixed(2)}
                </div>
              </div>
            </Link>
          ))}
          {items.length === 0 && (
            <div className="text-sm text-muted mt-6">No books yet.</div>
          )}
        </div>
      )}
    </main>
  );
}
