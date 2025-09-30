"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type Ebook = {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  price_cents: number;
  description: string | null;
  published?: boolean;
  created_at?: string;
};

const supabase: SupabaseClient | null =
  typeof window !== "undefined"
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    : null;

export default function EbooksPage() {
  const [books, setBooks] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("ebooks")
        .select("id, slug, title, cover_url, price_cents, description, published, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (error) console.error(error);
      if (mounted) {
        setBooks((data as Ebook[]) || []);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="w-full px-4 md:px-6 py-10">
      <div className="mx-auto max-w-screen-xl">
        <h1 className="text-3xl font-bold">E-Books</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Explore professional e-books aligned with our knowledge paths. Signed-in users can purchase
          and save books to their dashboard.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white/70 border border-light p-4">
                <div className="h-48 w-full rounded-lg bg-[color:var(--color-light)]/50 animate-pulse" />
                <div className="mt-3 h-4 w-3/5 rounded bg-[color:var(--color-light)]/60 animate-pulse" />
                <div className="mt-2 h-4 w-4/5 rounded bg-[color:var(--color-light)]/50 animate-pulse" />
              </div>
            ))}

          {!loading &&
            books.map((b) => (
              <Link
                key={b.id}
                href={`/ebooks/${b.slug}`}
                className="group rounded-2xl bg-white border border-light hover:shadow-sm transition overflow-hidden"
              >
                <div className="bg-white border-b border-light">
                  {b.cover_url ? (
                    <Image
                      src={b.cover_url}
                      alt={b.title}
                      width={1200}
                      height={900}
                      className="w-full h-auto"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="h-48 w-full bg-[color:var(--color-light)]/40" />
                  )}
                </div>

                <div className="px-5 py-4">
                  <h3 className="font-semibold text-ink group-hover:text-brand">{b.title}</h3>
                  {b.description && (
                    <div className="mt-1 text-sm text-muted line-clamp-2">{b.description}</div>
                  )}
                  <div className="mt-3 text-sm font-semibold">
                    {(b.price_cents / 100).toLocaleString(undefined, {
                      style: "currency",
                      currency: "USD",
                    })}
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </main>
  );
}