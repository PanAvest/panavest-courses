"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

type Ebook = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  kpf_url: string | null;      // the Kindle Package file (provided/hosted by you)
  sample_url: string | null;   // optional: a PNG/PDF for web preview
  price_cents: number;
};

type Purchase = {
  id: string;
  user_id: string;
  ebook_id: string;
  created_at: string;
};

const supabase: SupabaseClient | null =
  typeof window !== "undefined"
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    : null;

export default function EbookDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const router = useRouter();
  const [book, setBook] = useState<Ebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [buying, setBuying] = useState(false);

  const priceLabel = useMemo(
    () =>
      book
        ? (book.price_cents / 100).toLocaleString(undefined, {
            style: "currency",
            currency: "GH",
          })
        : "",
    [book]
  );

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    const init = async () => {
      // session
      const sess = await supabase.auth.getSession();
      const authed = Boolean(sess.data.session);
      if (mounted) setIsAuthed(authed);

      // book
      const { data: b, error } = await supabase
        .from("ebooks")
        .select(
          "id, slug, title, description, cover_url, kpf_url, sample_url, price_cents"
        )
        .eq("slug", params.slug)
        .eq("published", true)
        .single();
      if (error) console.error(error);
      if (mounted) {
        setBook(b);
        setLoading(false);
      }

      // purchased?
      if (authed && b) {
        const { data: user } = await supabase.auth.getUser();
        const userId = user?.user?.id;
        if (userId) {
          const { data: p, error: pErr } = await supabase
            .from("purchases")
            .select("id")
            .eq("ebook_id", b.id)
            .eq("user_id", userId)
            .maybeSingle();
          if (pErr) console.error(pErr);
          if (mounted) setPurchased(Boolean(p));
        }
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, [params.slug]);

  const handleBuy = useCallback(async () => {
    if (!supabase) return;
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      router.push("/auth/sign-in");
      return;
    }
    if (!book) return;

    try {
      setBuying(true);
      const userId = sess.session.user.id;

      // In a real app you'd call your payment provider first.
      // For now we just record the purchase.
      const { error } = await supabase
        .from("purchases")
        .insert({ user_id: userId, ebook_id: book.id });

      if (error) {
        console.error(error);
        setBuying(false);
        return;
      }
      setPurchased(true);
      setBuying(false);

      // Optional: send them to dashboard library
      // router.push("/dashboard?tab=library");
    } catch (e) {
      console.error(e);
      setBuying(false);
    }
  }, [book, router]);

  return (
    <main className="w-full px-4 md:px-6 py-10">
      <div className="mx-auto max-w-screen-md">
        {loading && (
          <div className="rounded-2xl bg-white/70 border border-light p-5">
            <div className="h-64 rounded-lg bg-[color:var(--color-light)]/50 animate-pulse" />
            <div className="mt-4 h-5 w-2/3 rounded bg-[color:var(--color-light)]/60 animate-pulse" />
            <div className="mt-2 h-4 w-4/5 rounded bg-[color:var(--color-light)]/50 animate-pulse" />
          </div>
        )}

        {!loading && book && (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl bg-white border border-light overflow-hidden">
                {book.sample_url ? (
                  // Web preview (sample image or pdf fallback link)
                  <div className="bg-white">
                    {book.sample_url.endsWith(".pdf") ? (
                      <div className="p-4">
                        <a
                          className="underline text-brand"
                          href={book.sample_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open sample PDF preview
                        </a>
                      </div>
                    ) : (
                      <Image
                        src={book.sample_url}
                        alt={`${book.title} sample`}
                        width={1200}
                        height={1600}
                        className="w-full h-auto"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    )}
                  </div>
                ) : book.cover_url ? (
                  <Image
                    src={book.cover_url}
                    alt={`${book.title} cover`}
                    width={1200}
                    height={1600}
                    className="w-full h-auto"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : (
                  <div className="h-64 bg-[color:var(--color-light)]/40" />
                )}

                {/* KPF note */}
                <div className="px-4 py-3 text-xs text-muted border-t border-light">
                  Format: <span className="font-medium">KPF</span>. You can upload the file to a Kindle device/app via Amazon’s Send-to-Kindle.
                </div>
              </div>

              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{book.title}</h1>
                {book.description && (
                  <p className="mt-3 text-muted leading-relaxed">{book.description}</p>
                )}

                <div className="mt-5 flex items-center gap-3">
                  <span className="text-xl font-semibold">{priceLabel}</span>

                  {!purchased ? (
                    <button
                      onClick={handleBuy}
                      disabled={!isAuthed || buying}
                      className="rounded-lg bg-brand text-white px-5 py-3 font-semibold disabled:opacity-60"
                    >
                      {isAuthed ? (buying ? "Processing…" : "Purchase") : "Sign in to buy"}
                    </button>
                  ) : (
                    <>
                      <span className="px-3 py-1 rounded bg-[color:var(--color-light)]/40 text-sm">
                        Purchased
                      </span>
                      {book.kpf_url && (
                        <a
                          href={book.kpf_url}
                          download
                          className="rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)] bg-white hover:bg-[color:var(--color-light)]/30 text-sm"
                        >
                          Download KPF
                        </a>
                      )}
                    </>
                  )}
                </div>

                <div className="mt-3 text-xs text-muted">
                  Purchases appear under <Link className="underline" href="/dashboard">your dashboard</Link>.
                </div>
              </div>
            </div>

            {/* Related grid (like courses) */}
            <RelatedBooks currentId={book.id} />
          </>
        )}
      </div>
    </main>
  );
}

function RelatedBooks({ currentId }: { currentId: string }) {
  // Minimal shape we actually render in the related grid
  type RelatedRow = {
    id: string;
    slug: string;
    title: string;
    cover_url: string | null;
    price_cents: number;
  };

  const [books, setBooks] = useState<Ebook[]>([]);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data, error } = await supabase
        .from("ebooks")
        .select("id, slug, title, cover_url, price_cents")
        .neq("id", currentId)
        .eq("published", true)
        .limit(6);

      if (error) {
        console.error(error);
        return;
      }

      const rows = (data ?? []) as RelatedRow[];

      // Map RelatedRow -> full Ebook to satisfy state type
      const mapped: Ebook[] = rows.map((b) => ({
        id: b.id,
        slug: b.slug,
        title: b.title,
        cover_url: b.cover_url ?? null,
        price_cents: b.price_cents ?? 0,
        description: null,
        kpf_url: null,
        sample_url: null,
      }));

      setBooks(mapped);
    })();
  }, [currentId]);

  if (!books.length) return null;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold">You may also like</h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((b) => (
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
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              ) : (
                <div className="h-40 bg-[color:var(--color-light)]/40" />
              )}
            </div>
            <div className="px-5 py-4">
              <h3 className="font-semibold text-ink group-hover:text-brand">{b.title}</h3>
              <div className="mt-2 text-sm font-semibold">
                {(b.price_cents / 100).toLocaleString(undefined, {
                  style: "currency",
                  currency: "GH",
                })}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
