"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Money from "@/components/currency/Money";
import PriceCurrencyControl from "@/components/currency/PriceCurrencyControl";

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
  free_for_logged_in?: boolean;
};

export default function EbooksPage() {
  const [items, setItems] = useState<Ebook[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const visibleItems = useMemo(() => {
    if (!items) return null;
    if (!normalizedQuery) return items;
    return items.filter((ebook) => {
      const haystack = [
        ebook.title ?? "",
        ebook.description ?? "",
        ebook.slug ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [items, normalizedQuery]);

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
    <main className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 2xl:px-20 py-10 2xl:py-16 animate-fade-up">
      <h1 className="text-3xl font-bold">E-Books</h1>
      <p className="mt-2 text-muted max-w-2xl">
        Browse our growing library. Preview PDFs are available; purchases add the title to your dashboard.
      </p>

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:max-w-md">
          <label htmlFor="ebook-search" className="sr-only">
            Search e-books
          </label>
          <div className="relative">
            <input
              id="ebook-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search titles, topics, or keywords"
              className="w-full rounded-lg bg-white px-4 py-2.5 pr-16 text-sm ring-1 ring-[color:var(--color-light)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent-red)]"
              autoComplete="off"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-ink"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        {items && (
          <div className="text-sm text-muted">
            {normalizedQuery
              ? `Showing ${visibleItems?.length ?? 0} of ${items.length}`
              : `${items.length} books`}
          </div>
        )}
      </div>

      <PriceCurrencyControl className="mt-4 md:ml-auto md:max-w-md" />

      {err && <div className="mt-6 text-red-600 text-sm">Error: {err}</div>}

      {!items && !err && (
        <div className="mt-8 grid gap-4 2xl:gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md animate-pulse h-[240px]"
            />
          ))}
        </div>
      )}

      {items && visibleItems && (
        <div className="mt-8 grid gap-6 2xl:gap-9 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {visibleItems.map((b, idx) => (
            <Link
              key={b.id}
              href={`/ebooks/${encodeURIComponent(b.slug)}`}
              className="group rounded-xl bg-white shadow-sm transition-shadow duration-200 hover:shadow-md overflow-hidden flex flex-col animate-fade-up"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="bg-white">
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
                  {b.free_for_logged_in
                    ? "Free with login"
                    : <Money amountGhs={b.price_cents / 100} />}
                </div>
              </div>
            </Link>
          ))}
          {visibleItems.length === 0 && (
            <div className="text-sm text-muted mt-6">
              {normalizedQuery ? `No results for "${query}".` : "No books yet."}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
