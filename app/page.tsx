// Edge-friendly ISR: cached anon Supabase reads (no cookies) so static/edge is safe.
export const runtime = "edge";
export const revalidate = 60;

import Image from "next/image";
import Link from "next/link";

import PartnersMarquee from "@/components/home/PartnersMarquee";
import { getPartnersCached, getPublicCoursesHome, getPublicEbooksHome } from "@/app/lib/public-data";
import { BOARDROOM_BLUR } from "@/app/lib/blur";

/** ===== Brand ===== */
const BRAND = {
  primary: "#b65437",
  lightRing: "var(--color-light)",
};

export default async function HomePage() {
  const [courses, ebooks, partners] = await Promise.all([
    getPublicCoursesHome(6),
    getPublicEbooksHome(8),
    getPartnersCached(),
  ]);

  const featuredList = courses.slice(0, 6);
  const ebooksList = ebooks;

  /** ===== Inline SVGs (no emojis) ===== */
  const IconCheck = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
    </svg>
  );
  const IconBeaker = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M9 3v2l-4.6 7.7A5 5 0 0 0 9 22h6a5 5 0 0 0 4.6-9.3L15 5V3H9zm1.7 6h4.6l2.2 3.7A3 3 0 0 1 15 20H9a3 3 0 0 1-2.5-4.6L10.7 9z" />
    </svg>
  );
  const IconShield = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z" />
    </svg>
  );
  const IconCap = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
      <path d="M12 3 2 8l10 5 9-4.5V15h2V8L12 3zm0 13-6-3v4l6 3 6-3v-4l-6 3z" />
    </svg>
  );
  const IconBuilding = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
      <path d="M3 22h18v-2H3v2zM19 2H5v16h14V2zm-9 3h2v2h-2V5zm0 4h2v2h-2V9zm0 4h2v2h-2v-2zm5-8h2v2h-2V5zm0 4h2v2h-2V9zm0 4h2v2h-2v-2z" />
    </svg>
  );
  const IconChart = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
      <path d="M3 3h2v18H3V3zm16 18h2V9h-2v12zM11 21h2V13h-2v8zM7 21h2V7H7v14zM15 21h2V3h-2v18z" />
    </svg>
  );
  const IconBooks = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
      <path d="M4 3h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4V3zm0 16h6a2 2 0 0 1 2 2H6a2 2 0 0 1-2-2zm10-16h6v16h-6a2 2 0 0 0-2 2V5a2 2 0 0 1 2-2z" />
    </svg>
  );

  /** Reviews (structure only — replace with verified quotes/names later) */
  const reviews = [
    {
      name: "Dr. Ama Mensah",
      role: "Supply Chain Executive",
      org: "Accra, Ghana",
      quote:
        "PanAvest’s practical approach to governance and procurement is filling a real skills gap across Africa.",
    },
    {
      name: "Michael Ofori",
      role: "Director, Corporate Governance",
      org: "Johannesburg, South Africa",
      quote:
        "Prof. Boateng’s insights sharpen strategy while grounding teams in measurable execution.",
    },
    {
      name: "Nadia Benali",
      role: "Operations & Projects Lead",
      org: "Casablanca, Morocco",
      quote:
        "The CPPD-aligned learning paths are exactly what our managers needed to level up—fast.",
    },
    {
      name: "Kofi Asiedu",
      role: "Head of Procurement",
      org: "Kumasi, Ghana",
      quote:
        "Clear, rigorous and immediately applicable. We saw better sourcing decisions within weeks.",
    },
  ];

  return (
    <>
      {/* ===== HERO (no bg, no card, no shadow) ===== */}
      <section className="relative isolate overflow-hidden bg-white md:bg-black">
        <div aria-hidden="true" className="absolute inset-0 -z-10 hidden md:block animate-fade-up">
          <Image
            src="/Boardroom.webp"
            alt=""
            fill
            sizes="100vw"
            placeholder="blur"
            blurDataURL={BOARDROOM_BLUR}
            className="object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-0 bg-black/40" />
        </div>

        <div className="relative z-10 mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 grid gap-10 lg:grid-cols-[1.08fr_.92fr] items-center text-[color:var(--color-ink)] md:text-white">
          {/* Left copy */}
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs text-[color:var(--color-ink)] shadow-sm md:bg-white/10 md:text-white md:shadow-[0_6px_18px_rgba(0,0,0,0.18)]">
              <span className="h-2 w-2 rounded-full" style={{ background: BRAND.primary }} />
              KDS is powered by <b>PanAvest International &amp; Partners</b>
            </span>

            <h1 className="mt-4 font-extrabold leading-[1.02] text-[44px] sm:text-[64px] text-[color:var(--color-ink)] md:text-white">
              Learn. <span style={{ color: BRAND.primary }}>Assess.</span> Excel.
            </h1>
            <p className="mt-4 text-[16px] sm:text-[18px] max-w-2xl">
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

            {/* trust pills (SVGs, no emojis) */}
            <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-[color:var(--color-ink)]/80 md:text-white/80">
              <span className="inline-flex items-center gap-2 rounded-lg bg-white/70 px-3 py-1 shadow-sm md:bg-white/10 md:shadow-[0_6px_18px_rgba(0,0,0,0.18)]">
                <IconCheck /> Certified CPD (CPPD)
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg bg-white/70 px-3 py-1 shadow-sm md:bg-white/10 md:shadow-[0_6px_18px_rgba(0,0,0,0.18)]">
                <IconBeaker /> Rigorous assessments
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg bg-white/70 px-3 py-1 shadow-sm md:bg-white/10 md:shadow-[0_6px_18px_rgba(0,0,0,0.18)]">
                <IconShield /> Verifiable certificates
              </span>
            </div>

            {/* Nyansakasa quote */}
            <figure className="mt-8">
              <blockquote className="text-[15px] sm:text-[17px] leading-relaxed text-[color:var(--color-ink)] md:text-white/90">
                <span className="mt-1 block italic">
                  “What you plant in your mind grows in your life.”
                </span>
                <span className="block font-semibold text-[color:var(--color-ink)] md:text-white"> - Prof. Douglas Boateng</span>
              </blockquote>
            </figure>
          </div>

          {/* Right visual — plain image only */}
          <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
            <div className="mx-auto w-full max-w-[620px]">
              <Image
                src="/hero-illustration.webp"
                alt="KDS learning preview"
                width={1600}
                height={1200}
                priority
                sizes="(min-width: 1280px) 50vw, 100vw"
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      </section>

      <PartnersMarquee partners={partners} animate />

      {/* ===== WHAT WE DO ===== */}
      <section className="bg-white py-10 sm:py-14 animate-fade-up">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold">What we do</h2>
            <Link href="/about" className="text-sm underline decoration-dotted underline-offset-4">
              About KDS
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { Icon: IconCap, title: "Certified CPD (CPPD)", text: "Professional knowledge with verifiable certificates." },
              { Icon: IconBeaker, title: "Assessments", text: "Rigorous evaluations that prove capability." },
              { Icon: IconBuilding, title: "Corporate Training", text: "Tailored programs delivered to teams." },
              { Icon: IconChart, title: "Career Acceleration", text: "Job-ready, practical skill-building." },
              { Icon: IconBooks, title: "Publications", text: "Unique compendiums credited by NaCCA." },
            ].map((i) => (
              <div
                key={i.title}
                className="rounded-xl bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md"
              >
                <div className="text-3xl text-ink/80"><i.Icon /></div>
                <div className="mt-3 font-semibold">{i.title}</div>
                <p className="mt-1 text-sm text-ink/70">{i.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== KDS MOBILE (matches hero + theme) ===== */}
      <section className="py-10 sm:py-14 animate-fade-up">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl bg-white shadow-sm px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14 grid gap-10 md:grid-cols-[1.05fr_.95fr] items-center transition-shadow duration-200 hover:shadow-md">
            {/* Left copy */}
            <div className="flex flex-col gap-4 text-center md:text-left">
              {/* pill matches hero style */}
              <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] sm:text-xs shadow-sm">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: BRAND.primary }}
                />
                <span className="font-medium">
                  KDS mobile app · Learn anywhere
                </span>
              </span>

              <h2 className="font-extrabold text-[28px] sm:text-[34px] lg:text-[40px] leading-tight text-[color:var(--color-ink)]">
                Learn anywhere with the KDS mobile app.
              </h2>

              <p className="text-sm sm:text-base text-[color:var(--color-ink)]/75 max-w-xl mx-auto md:mx-0">
                Access your Knowledge Programs, assessments, and certificates securely from your phone — the same PanAvest KDS experience, optimized for mobile.
              </p>

              <ul className="mt-2 space-y-2 text-sm sm:text-base text-[color:var(--color-ink)] max-w-xl mx-auto md:mx-0">
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-green-600">
                    <IconCheck />
                  </span>
                  <span>Track your progress in real time</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-green-600">
                    <IconCheck />
                  </span>
                  <span>Take assessments from secure mobile browser</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-green-600">
                    <IconCheck />
                  </span>
                  <span>View earned CPD/CPPD certificates on the go</span>
                </li>
              </ul>

              <div className="mt-6 flex flex-wrap items-center justify-center md:justify-start gap-4">
                {/* App Store button – real link, hover animation */}
                <a
                  href="https://apps.apple.com/in/app/panavest-kds/id6755534884"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-transform transition-shadow duration-200"
                >
                  <Image
                    src="/appstore-svgrepo-com.svg"
                    alt="Download on the App Store"
                    width={24}
                    height={24}
                    className="h-5 w-auto"
                  />
                  <span>Download on the App Store</span>
                </a>

                {/* Play Store badge – coming soon */}
                <div className="inline-flex items-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-medium text-[color:var(--color-ink)]/80 opacity-75 cursor-default shadow-sm">
                  <Image
                    src="/playstore-svgrepo-com.svg"
                    alt="Play Store"
                    width={24}
                    height={24}
                    className="h-5 w-auto"
                  />
                  <span>Play Store · coming soon</span>
                </div>
              </div>
            </div>

            {/* Right visual */}
            <div className="flex justify-center">
              <div className="w-full max-w-[420px] md:max-w-[460px] lg:max-w-[520px]">
                <Image
                  src="/mobile.png"
                  alt="KDS Mobile preview"
                  width={1040}
                  height={1040}
                  className="w-full h-auto object-contain drop-shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURED KNOWLEDGE (3 in a row, 16:9) ===== */}
      <section className="py-10 sm:py-14 animate-fade-up">
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
                className="group rounded-xl bg-white shadow-sm transition-shadow duration-200 hover:shadow-md overflow-hidden animate-fade-up"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="relative w-full aspect-video bg-[color:var(--color-light)]/40">
                  {c ? (
                    <Image
                      src={c.img ?? "/project-management.png"}
                      alt={c.title ?? "Course cover"}
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
                className="group relative rounded-xl bg-white shadow-sm transition-shadow duration-200 hover:shadow-md overflow-hidden animate-fade-up"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="relative">
                  <div className="relative w-full h-[280px] bg-[color:var(--color-light)]/40">
                    {b ? (
                      <Image
                        src={b.cover_url ?? "/project-management.png"}
                        alt={b.title ?? "E-book cover"}
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

                  {/* NEW: description visible */}
                  {b?.description && (
                    <p className="mt-2 text-sm text-ink/80 line-clamp-3">
                      {b.description}
                    </p>
                  )}

                  {/* NEW: GH₵ price in code style */}
                  {typeof b?.price_cents === "number" && (
                    <div className="mt-3">
                      <code className="rounded-md bg-[color:var(--color-light)]/40 px-2 py-1 text-[12px]">
                        GH₵ {(b.price_cents / 100).toFixed(2)}
                      </code>
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
                className="rounded-full bg-white px-3 py-1 shadow-sm"
                style={{ borderColor: BRAND.lightRing }}
              >
                Powered by <b>PanAvest International &amp; Partners</b>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== REVIEWS (added; layout kept simple and consistent) ===== */}
      <section className="py-10 sm:py-14 animate-fade-up">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold">What professionals say</h2>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {reviews.map((r, idx) => (
              <div
                key={r.name}
                className="rounded-xl bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md animate-fade-up"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <p className="text-sm text-ink/80 leading-relaxed">“{r.quote}”</p>
                <div className="mt-4 text-sm font-semibold text-ink">{r.name}</div>
                <div className="text-xs text-ink/60">{r.role} • {r.org}</div>
              </div>
            ))}
          </div>
          {/* NOTE: Replace placeholder quotes/names with verified testimonials when available. */}
        </div>
      </section>
    </>
  );
}
