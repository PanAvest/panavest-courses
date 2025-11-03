// app/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

/** Brand helpers (keeps your #0a1156) */
const BRAND = {
  primary: "#0a1156",
  light: "var(--color-light)",
};

export default function HomePage() {
  /** Featured courses (replace with real slugs/images later) */
  const courses = useMemo(
    () => [
      { slug: "leadership-development", title: "Leadership Development", img: "/leadership-development.png", reviews: 1200 },
      { slug: "data-analysis-python", title: "Data Analysis with Python", img: "/data-analysis-with-python.png", reviews: 891 },
      { slug: "intro-marketing", title: "Introduction to Marketing", img: "/introduction-to-marketing.png", reviews: 753 },
      { slug: "project-management-essentials", title: "Project Management Essentials", img: "/project-management.png", reviews: 612 },
    ],
    [],
  );

  /** E-books grid (add real items) */
  const ebooks = useMemo(
    () => [
      { slug: "boardroom-governance", title: "Boardroom Governance", cover: "/ebooks/boardroom-governance.jpg", priceUsd: 19.99 },
      { slug: "strategic-sourcing-industrialisation", title: "Strategic Sourcing & Industrialisation", cover: "/ebooks/strategic-sourcing.jpg", priceUsd: 24.99 },
      { slug: "negotiations", title: "Negotiations: Practical Playbook", cover: "/ebooks/negotiations.jpg", priceUsd: 14.99 },
      { slug: "supply-chain-dictionary", title: "Supply Chain Compendium", cover: "/ebooks/compendium.jpg", priceUsd: 39.99 },
    ],
    [],
  );

  return (
    <>
      {/* ===== HERO — Gradient, glass cards, subtle motion ===== */}
      <section className="relative overflow-hidden">
        {/* Gradient orbs */}
        <div
          className="pointer-events-none absolute -top-32 -left-20 h-[420px] w-[420px] rounded-full blur-3xl opacity-25"
          style={{ background: `radial-gradient(closest-side, ${BRAND.primary}, transparent)` }}
        />
        <div
          className="pointer-events-none absolute top-24 -right-24 h-[520px] w-[520px] rounded-full blur-3xl opacity-25"
          style={{ background: "radial-gradient(closest-side, #30a0ff, transparent)" }}
        />
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 grid gap-10 lg:grid-cols-[1.08fr_.92fr] items-center">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-light)] bg-white/70 px-3 py-1 text-xs">
              <span className="h-2 w-2 rounded-full" style={{ background: BRAND.primary }} />
              KDS is powered by <b>PanAvest International & Partners</b>
            </span>

            <h1 className="mt-4 font-extrabold leading-[1.02] text-[44px] sm:text-[64px]">
              Learn. <span className="text-[color:#0a1156]">Assess.</span> Excel.
            </h1>
            <p className="mt-4 text-[16px] sm:text-[18px] text-ink/80 max-w-2xl">
              Certified CPD (CPPD) pathways for modern professionals—industry-aligned modules,
              interactive assessments, and verifiable certificates.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/courses"
                className="rounded-xl bg-[color:#0a1156] text-white px-5 py-3 font-semibold hover:opacity-90 transition"
              >
                Explore Knowledge
              </Link>
              <Link
                href="/leaderboard"
                className="rounded-xl px-5 py-3 ring-1 ring-[color:var(--color-light)] bg-white hover:bg-[color:var(--color-light)]/30 transition"
              >
                Leaderboard
              </Link>
            </div>

            {/* Trust bar */}
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
          </div>

          {/* Hero visual — 3D tilt card stack */}
          <div className="relative z-10">
            <div className="group perspective-1000">
              <div className="relative mx-auto w-full max-w-[560px] transform-gpu transition will-change-transform group-hover:-rotate-1">
                {/* Back card */}
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-[#0a1156] via-[#3e7fff] to-[#a1c9ff] opacity-30 blur-2xl" />
                {/* Main glass card */}
                <div className="relative rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-[color:var(--color-light)] shadow-xl">
                  <Image
                    src="/hero-illustration.png"
                    alt="KDS learning preview"
                    width={1600}
                    height={1200}
                    priority
                    className="h-auto w-full rounded-t-3xl"
                  />
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold">Your next milestone</div>
                        <div className="text-xs text-ink/70">Finish an assessment, earn verified points</div>
                      </div>
                      <Link
                        href="/dashboard"
                        className="rounded-lg bg-black text-white px-3 py-1.5 text-xs hover:opacity-90"
                      >
                        Go to Dashboard
                      </Link>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                      {[
                        ["CPPD Points", "+20"],
                        ["Pass Rate", "92%"],
                        ["Issued Certs", "10k+"],
                      ].map(([k, v]) => (
                        <div key={k} className="rounded-xl ring-1 ring-[color:var(--color-light)] bg-white p-3">
                          <div className="text-[10px] uppercase tracking-wide text-ink/60">{k}</div>
                          <div className="text-lg font-bold">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Floating badge */}
                <div className="absolute -right-3 -top-3">
                  <div className="rounded-full bg-white shadow-lg ring-1 ring-[color:var(--color-light)] px-3 py-1.5 text-xs">
                    New courses weekly
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom curve divider */}
        <svg className="block w-full text-white" viewBox="0 0 1440 80" aria-hidden>
          <path fill="currentColor" d="M0,64L1440,0L1440,80L0,80Z"></path>
        </svg>
      </section>

      {/* ===== WHAT WE DO (icon tiles) ===== */}
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

      {/* ===== FEATURED COURSES — clean tiles with rating row ===== */}
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold">Featured Knowledge</h2>
            <Link href="/courses" className="text-sm underline decoration-dotted underline-offset-4">
              Browse all courses
            </Link>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {courses.map((c) => (
              <Link
                key={c.slug}
                href={`/courses/${c.slug}`}
                className="group rounded-2xl bg-white border border-[color:var(--color-light)] hover:shadow-md transition overflow-hidden"
              >
                <div className="border-b border-[color:var(--color-light)] bg-white">
                  <Image
                    src={c.img}
                    alt={c.title}
                    width={1200}
                    height={900}
                    className="w-full h-auto"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
                <div className="px-5 py-4">
                  <h3 className="font-semibold text-lg text-ink group-hover:text-[color:#0a1156]">{c.title}</h3>
                  <div className="mt-2 flex items-center gap-2 text-[13px] text-ink/70">
                    <span aria-hidden>⭐️⭐️⭐️⭐️⭐️</span>
                    <span>{c.reviews.toLocaleString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== E-BOOKS — NaCCA credit + elegant cards ===== */}
      <section className="bg-white py-10 sm:py-14">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">E-Books</h2>
              <p className="text-sm text-ink/70">
                All books are credited by the{" "}
                <span className="font-semibold">National Council for Curriculum and Assessment (NaCCA) of Ghana</span>.
              </p>
            </div>
            <Link href="/ebooks" className="text-sm underline decoration-dotted underline-offset-4">
              View all e-books
            </Link>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ebooks.map((b) => (
              <div
                key={b.slug}
                className="group relative rounded-2xl ring-1 ring-[color:var(--color-light)] bg-white overflow-hidden hover:shadow-lg transition"
              >
                <div className="relative">
                  <Image
                    src={b.cover}
                    alt={b.title}
                    width={800}
                    height={1100}
                    className="h-[280px] w-full object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="absolute left-3 top-3 rounded-md bg-black/80 px-2 py-1 text-[10px] font-semibold text-white">
                    NaCCA-credited
                  </div>
                </div>
                <div className="p-4">
                  <div className="min-h-[52px]">
                    <h3 className="font-semibold leading-tight">{b.title}</h3>
                  </div>
                  <div className="mt-2 text-sm text-ink/70">${b.priceUsd.toFixed(2)}</div>

                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/ebooks/${b.slug}`}
                      className="flex-1 rounded-lg bg-[color:#0a1156] text-white px-3 py-2 text-sm text-center hover:opacity-90"
                    >
                      View
                    </Link>
                    <Link
                      href={`/ebooks/${b.slug}#sample`}
                      className="flex-1 rounded-lg ring-1 ring-[color:var(--color-light)] bg-white px-3 py-2 text-sm text-center hover:bg-[color:var(--color-light)]/30"
                    >
                      Sample
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* NaCCA + Powered by footnote */}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-ink/60">
              * Accreditation and curriculum crediting provided by NaCCA (Ghana).
            </div>
            <div className="text-xs">
              <span className="rounded-full bg-white ring-1 ring-[color:var(--color-light)] px-3 py-1">
                Powered by <b>PanAvest International & Partners</b>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHY KDS — compact 3 reasons with icon stripe ===== */}
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold">Why KDS</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Recognized certification",
                text: "All knowledge is Certified CPD (CPPD) with verifiable outcomes.",
              },
              {
                title: "Practical & applied",
                text: "Industry-aligned curriculum built around real scenarios.",
              },
              {
                title: "Unique authority",
                text: "PanAvest Supply Chain Compendium — only of its kind, credited by NaCCA.",
              },
            ].map((b, i) => (
              <div key={b.title} className="relative rounded-2xl bg-white border border-[color:var(--color-light)] p-5">
                <div className="absolute -left-1 -top-1 h-3 w-16 rounded-br-xl rounded-tl-xl" style={{ background: BRAND.primary }} />
                <div className="font-semibold">{b.title}</div>
                <p className="mt-2 text-sm text-ink/80">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS — simple and clean ===== */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold">What learners say</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {[
              { name: "Amina K.", role: "Operations Analyst", quote: "KDS gave me the structure and confidence to lead real projects." },
              { name: "Kwame O.", role: "Supply Chain Lead", quote: "The assessments are tough but fair. My employer respects the certificate." },
              { name: "Jason T.", role: "Data Associate", quote: "Practical, modern, and easy to apply at work the next day." },
            ].map((t, idx) => (
              <div key={idx} className="rounded-2xl bg-white border border-[color:var(--color-light)] p-5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-[color:var(--color-light)] flex items-center justify-center text-ink/80 font-semibold">
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-xs text-ink/60">{t.role}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-ink/90 leading-relaxed">“{t.quote}”</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-14">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0a1156] to-[#2643a6] p-8 sm:p-10 text-white">
            <div className="max-w-2xl">
              <h3 className="text-2xl sm:text-3xl font-bold">Start your certified journey today</h3>
              <p className="mt-2 text-white/80">
                Join KDS, take an assessment, and earn verifiable credentials that stand out globally.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="rounded-xl bg-white text-black px-5 py-3 font-semibold hover:opacity-90"
                >
                  Create Account
                </Link>
                <Link
                  href="/courses"
                  className="rounded-xl ring-1 ring-white/50 px-5 py-3 font-semibold hover:bg-white/10"
                >
                  Browse Courses
                </Link>
              </div>
            </div>
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          </div>
        </div>
      </section>
    </>
  );
}
