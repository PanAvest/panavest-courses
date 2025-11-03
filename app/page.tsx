// app/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/** ===== Brand ===== */
const BRAND = {
  primary: "#b65437",
  lightRing: "var(--color-light)",
};

type Course = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  img: string | null;
  cpd_points: number | null;
  published: boolean | null;
};

type Ebook = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  price_cents: number | null;
  published: boolean | null;
};

export default function HomePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: cData } = await supabase
          .from("courses")
          .select("id, slug, title, description, img, cpd_points, published, created_at")
          .eq("published", true)
          .order("created_at", { ascending: false })
          .limit(6);

        const { data: eData } = await supabase
          .from("ebooks")
          .select("id, slug, title, description, cover_url, price_cents, published, created_at")
          .eq("published", true)
          .order("created_at", { ascending: false })
          .limit(8);

        if (!alive) return;
        setCourses((cData ?? []) as Course[]);
        setEbooks((eData ?? []) as Ebook[]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const featured = useMemo(() => courses.slice(0, 6), [courses]);

  // typed placeholders
  const featuredList: (Course | null)[] = loading
    ? Array.from({ length: 3 }, () => null)
    : featured;

  const ebooksList: (Ebook | null)[] = loading
    ? Array.from({ length: 4 }, () => null)
    : ebooks;

  return (
    <>
      {/* ===== HERO (no bg, no card, no shadow) ===== */}
      <section>
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 grid gap-10 lg:grid-cols-[1.08fr_.92fr] items-center">
          {/* Left copy */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-light)] bg-white/70 px-3 py-1 text-xs">
              <span className="h-2 w-2 rounded-full" style={{ background: BRAND.primary }} />
              KDS is powered by <b>PanAvest International &amp; Partners</b>
            </span>

            <h1 className="mt-4 font-extrabold leading-[1.02] text-[44px] sm:text-[64px]">
              Learn. <span style={{ color: BRAND.primary }}>Assess.</span> Excel.
            </h1>
            <p className="mt-4 text-[16px] sm:text-[18px] text-ink/80 max-w-2xl">
              Certified CPD (CPPD) pathways for modern professionals — industry-aligned modules,
              interactive assessments, and verifiable certificates.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/courses"
                className="rounded-xl text-white px-5 py-3 font-semibold hover:opacity-90 transition"
                style={{ background: BRAND.primary }}
              >
                Explore Knowledge
              </Link>
            </div>

            {/* trust pills */}
            <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-ink/70">
              <span className="inline-flex items-center gap-2 rounded-lg bg-white/70 ring-1 ring-[color:var(--color-light)] px-3 py-1">
                ✅ Certified CPD (CPPD)
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg bg-white/70 ring-1 ring-[color:var(--color-light)] px-3 py-1">
                🧪 Rigorous assessments
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg bg-white/70 ring-1 ring-[color:var(--color-light)] px-3 py-1">
                🔒 Verifiable certificates
              </span>
            </div>

            {/* Nyansakasa quote */}
            <figure className="mt-8">
              <blockquote className="text-[15px] sm:text-[17px] leading-relaxed text-ink/80">
                <span className="block font-semibold text-ink">Nyansakasa by Prof. Douglas Boateng</span>
                <span className="mt-1 block italic">
                  “What you plant in your mind grows in your life.”
                </span>
              </blockquote>
            </figure>
          </div>

          {/* Right visual — plain image only */}
          <div>
            <div className="mx-auto w-full max-w-[620px]">
              <Image
                src="/hero-illustration.png"
                alt="KDS learning preview"
                width={1600}
                height={1200}
                priority
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHAT WE DO ===== */}
      <section className="bg-white py-10 sm:py-14">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold">What we do</h2>
            <Link href="/about" className="text-sm underline decoration-dotted underline-offset-4">
              About KDS
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { emoji: "🎓", title: "Certified CPD (CPPD)", text: "Professional knowledge with verifiable certificates." },
              { emoji: "🧪", title: "Assessments", text: "Rigorous evaluations that prove capability." },
              { emoji: "🏢", title: "Corporate Training", text: "Tailored programs delivered to teams." },
              { emoji: "📈", title: "Career Acceleration", text: "Job-ready, practical skill-building." },
              { emoji: "📚", title: "Publications", text: "Unique compendiums credited by NaCCA." },
            ].map((i) => (
              <div key={i.title} className="rounded-2xl bg-white border border-[color:var(--color-light)] p-5 hover:shadow-sm transition">
                <div className="text-3xl">{i.emoji}</div>
                <div className="mt-3 font-semibold">{i.title}</div>
                <p className="mt-1 text-sm text-ink/70">{i.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURED KNOWLEDGE (3 in a row, 16:9) ===== */}
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold">Featured Knowledge</h2>
            <Link href="/courses" className="text-sm underline decoration-dotted underline-offset-4">
              Browse all knowledge
            </Link>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredList.map((c, idx) => (
              <Link
                key={c ? c.id : `s-${idx}`}
                href={c ? `/courses/${c.slug}` : "#"}
                className="group rounded-2xl bg-white border border-[color:var(--color-light)] hover:shadow-md transition overflow-hidden"
              >
                <div className="relative w-full aspect-video bg-[color:var(--color-light)]/40">
                  {c?.img ? (
                    <Image
                      src={c.img}
                      alt={c.title}
                      fill
                      sizes="(max-width:1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0" />
                  )}
                </div>
                <div className="px-5 py-4">
                  <h3 className="font-semibold text-[17px] text-ink group-hover:opacity-90">
                    {c?.title ?? "Loading…"}
                  </h3>
                  <div className="mt-1 text-xs text-ink/60">
                    CPPD Score: <b>{c?.cpd_points ?? 0}</b>
                  </div>
                  {c?.description && (
                    <p className="mt-2 text-sm text-ink/80 line-clamp-2">
                      {c.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== E-BOOKS (direct links, NaCCA credit) ===== */}
      <section className="bg-white py-10 sm:py-14">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">E-Books</h2>
              <p className="text-sm text-ink/70">
                All books are credited by the{" "}
                <span className="font-semibold">
                  National Council for Curriculum and Assessment (NaCCA) of Ghana
                </span>.
              </p>
            </div>
            <Link href="/ebooks" className="text-sm underline decoration-dotted underline-offset-4">
              View all e-books
            </Link>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ebooksList.map((b, idx) => (
              <Link
                key={b ? b.id : `e-${idx}`}
                href={b ? `/ebooks/${b.slug}` : "#"}
                className="group relative rounded-2xl ring-1 ring-[color:var(--color-light)] bg-white overflow-hidden hover:shadow-lg transition"
              >
                <div className="relative">
                  <div className="relative w-full h-[280px] bg-[color:var(--color-light)]/40">
                    {b?.cover_url ? (
                      <Image
                        src={b.cover_url}
                        alt={b.title}
                        fill
                        sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0" />
                    )}
                  </div>
                  <div
                    className="absolute left-3 top-3 rounded-md px-2 py-1 text-[10px] font-semibold text-white"
                    style={{ background: "rgba(0,0,0,.75)" }}
                  >
                    NaCCA-credited
                  </div>
                </div>
                <div className="p-4">
                  <div className="min-h-[52px]">
                    <h3 className="font-semibold leading-tight">
                      {b?.title ?? "Loading…"}
                    </h3>
                  </div>
                  {typeof b?.price_cents === "number" && (
                    <div className="mt-2 text-sm text-ink/70">
                      ${(b.price_cents / 100).toFixed(2)}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-ink/60">
              * Accreditation and curriculum crediting provided by NaCCA (Ghana).
            </div>
            <div className="text-xs">
              <span
                className="rounded-full bg-white ring-1 ring-[color:var(--color-light)] px-3 py-1"
                style={{ borderColor: BRAND.lightRing }}
              >
                Powered by <b>PanAvest International &amp; Partners</b>
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
