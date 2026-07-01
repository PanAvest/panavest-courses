// Edge-friendly ISR: cached anon Supabase reads (no cookies) so static/edge is safe.
export const runtime = "edge";
export const revalidate = 60;

import Image from "next/image";
import Link from "next/link";

import PartnersMarquee from "@/components/home/PartnersMarquee";
import HeroVisual from "@/components/home/HeroVisual";
import DarkDecor from "@/components/DarkDecor";
import RecoveryRedirect from "@/components/RecoveryRedirect";
import { getPartnersCached, getPublicCoursesHome, getPublicEbooksHome } from "@/app/lib/public-data";

const BRAND = {
  primary: "#b65437",
};

export default async function HomePage() {
  const [courses, ebooks, partners] = await Promise.all([
    getPublicCoursesHome(6),
    getPublicEbooksHome(4),
    getPartnersCached(),
  ]);

  const featuredList = courses.slice(0, 6);
  const ebooksList = ebooks.slice(0, 4);

  /** ===== Inline SVGs ===== */
  const IconCheck = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
    </svg>
  );
  const IconBeaker = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M9 3v2l-4.6 7.7A5 5 0 0 0 9 22h6a5 5 0 0 0 4.6-9.3L15 5V3H9zm1.7 6h4.6l2.2 3.7A3 3 0 0 1 15 20H9a3 3 0 0 1-2.5-4.6L10.7 9z" />
    </svg>
  );
  const IconShield = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z" />
    </svg>
  );
  const IconCap = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M12 3 2 8l10 5 9-4.5V15h2V8L12 3zm0 13-6-3v4l6 3 6-3v-4l-6 3z" />
    </svg>
  );
  const IconBuilding = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M3 22h18v-2H3v2zM19 2H5v16h14V2zm-9 3h2v2h-2V5zm0 4h2v2h-2V9zm0 4h2v2h-2v-2zm5-8h2v2h-2V5zm0 4h2v2h-2V9zm0 4h2v2h-2v-2z" />
    </svg>
  );
  const IconChart = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M3 3h2v18H3V3zm16 18h2V9h-2v12zM11 21h2V13h-2v8zM7 21h2V7H7v14zM15 21h2V3h-2v18z" />
    </svg>
  );
  const IconBooks = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M4 3h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4V3zm0 16h6a2 2 0 0 1 2 2H6a2 2 0 0 1-2-2zm10-16h6v16h-6a2 2 0 0 0-2 2V5a2 2 0 0 1 2-2z" />
    </svg>
  );
  const IconAward = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM8.5 14l-1.9 7.3L12 19l5.4 2.3L15.5 14A7 7 0 0 1 8.5 14z" />
    </svg>
  );

  const reviews = [
    {
      name: "Dr. Ama Mensah",
      role: "Supply Chain Executive",
      org: "Accra, Ghana",
      quote:
        "PanAvest's practical approach to governance and procurement is filling a real skills gap across Africa.",
    },
    {
      name: "Michael Ofori",
      role: "Director, Corporate Governance",
      org: "Johannesburg, South Africa",
      quote:
        "Prof. Boateng's insights sharpen strategy while grounding teams in measurable execution.",
    },
    {
      name: "Nadia Benali",
      role: "Operations & Projects Lead",
      org: "Casablanca, Morocco",
      quote:
        "The CPPD-aligned learning paths are exactly what our managers needed to level up — fast.",
    },
    {
      name: "Kofi Asiedu",
      role: "Head of Procurement",
      org: "Kumasi, Ghana",
      quote:
        "Clear, rigorous and immediately applicable. We saw better sourcing decisions within weeks.",
    },
  ];

  const offerings = [
    {
      Icon: IconCap,
      color: "#b65437",
      bg: "rgba(182,84,55,0.1)",
      title: "Certified CPD (CPPD)",
      text: "Professional knowledge with verifiable certificates recognised across Africa.",
    },
    {
      Icon: IconBeaker,
      color: "#2563eb",
      bg: "rgba(37,99,235,0.1)",
      title: "Assessments",
      text: "Rigorous evaluations that prove capability — not just completion.",
    },
    {
      Icon: IconBuilding,
      color: "#059669",
      bg: "rgba(5,150,105,0.1)",
      title: "Corporate Training",
      text: "Tailored programs delivered directly to teams and organisations.",
    },
    {
      Icon: IconChart,
      color: "#7c3aed",
      bg: "rgba(124,58,237,0.1)",
      title: "Career Acceleration",
      text: "Job-ready, practical skill-building grounded in real-world practice.",
    },
    {
      Icon: IconBooks,
      color: "#d97706",
      bg: "rgba(217,119,6,0.1)",
      title: "Publications",
      text: "Unique compendiums and e-books credited by NaCCA Ghana.",
    },
    {
      Icon: IconAward,
      color: "#db2777",
      bg: "rgba(219,39,119,0.1)",
      title: "AI Learning Tools",
      text: "Intelligent study aids and personalised learning recommendations.",
    },
  ];

  return (
    <>
      <RecoveryRedirect />

      {/* ===== HERO ===== */}
      <section className="relative isolate overflow-hidden bg-[color:var(--color-bg)]">
        <div
          className="pointer-events-none absolute left-0 top-0 hidden h-full w-full bg-[radial-gradient(circle_at_72%_22%,rgba(245,183,80,0.18),transparent_32%),radial-gradient(circle_at_40%_76%,rgba(182,84,55,0.12),transparent_34%)] xl:block"
          aria-hidden
        />
        {/* hero photo removed — decorative ISO/orbit visual now lives in the right grid column */}

        <div className="relative z-10 mx-auto max-w-[1660px] px-4 sm:px-6 lg:px-8 2xl:px-20">
          <div className="grid gap-7 py-7 sm:gap-9 sm:py-10 lg:py-12 xl:min-h-[790px] xl:grid-cols-[minmax(0,0.52fr)_minmax(0,0.48fr)] xl:items-center xl:py-20 2xl:min-h-[900px] 2xl:py-32">
            <div className="animate-fade-up text-center xl:max-w-[800px] xl:text-left 2xl:max-w-[920px]">
              <div className="mx-auto flex w-full max-w-[330px] flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px] leading-5 text-[color:var(--color-ink)]/70 sm:max-w-none sm:text-[14px] xl:mx-0 xl:flex-nowrap xl:justify-start xl:text-[15px]">
                <span
                  className="h-[2px] w-8 shrink-0 rounded-full sm:w-10"
                  style={{ background: BRAND.primary }}
                  aria-hidden
                />
                <span className="shrink-0">KDS is powered by</span>
                <span
                  className="basis-full break-words text-center font-semibold sm:basis-auto xl:text-left"
                  style={{ color: BRAND.primary }}
                >
                  PanAvest International &amp; Partners
                </span>
              </div>

              <h1 className="mt-5 font-serif text-[38px] font-semibold leading-[0.98] tracking-normal text-[color:var(--color-ink)] min-[390px]:text-[40px] sm:text-[58px] md:text-[70px] lg:text-[56px] xl:mt-7 xl:text-[78px] 2xl:whitespace-nowrap 2xl:text-[80px]">
                <span className="inline-block">Learn.</span>{" "}
                <span className="inline-block" style={{ color: BRAND.primary }}>
                  Assess.
                </span>{" "}
                <span className="block lg:inline xl:inline">Excel.</span>
              </h1>

              <p className="mx-auto mt-5 max-w-[650px] text-[16px] leading-7 text-[color:var(--color-ink)]/75 sm:text-[18px] sm:leading-8 xl:mx-0 xl:mt-7 xl:max-w-[650px] xl:text-[22px] xl:leading-10">
                Certified CPD (CPPD) pathways for modern professionals &mdash;
                industry-aligned modules, interactive assessments, and verifiable certificates.
              </p>

              <div className="mt-6 flex justify-center xl:mt-9 xl:justify-start">
                <Link
                  href="/courses"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-4 rounded-lg px-7 py-3.5 text-[16px] font-semibold text-white shadow-[0_12px_24px_rgba(182,84,55,0.22)] transition hover:opacity-90 sm:w-auto sm:min-w-[218px] xl:min-h-[60px] xl:min-w-[250px] xl:px-8 xl:text-[18px] xl:shadow-[0_20px_42px_rgba(182,84,55,0.28)]"
                  style={{ background: BRAND.primary }}
                >
                  Explore Knowledge
                  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="currentColor" aria-hidden>
                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                  </svg>
                </Link>
              </div>

              <div className="mt-6 grid gap-2 text-left text-[13px] text-[color:var(--color-ink)]/72 sm:grid-cols-3 xl:mt-10 xl:flex xl:flex-wrap xl:text-[15px]">
                <span className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[color:var(--color-light)] bg-white/90 px-3 py-2 shadow-sm backdrop-blur xl:justify-start xl:px-4 xl:shadow-[0_10px_28px_rgba(44,37,34,0.08)]">
                  <IconShield /> Certified CPD (CPPD)
                </span>
                <span className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[color:var(--color-light)] bg-white/90 px-3 py-2 shadow-sm backdrop-blur xl:justify-start xl:px-4 xl:shadow-[0_10px_28px_rgba(44,37,34,0.08)]">
                  <IconBeaker /> Rigorous assessments
                </span>
                <span className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[color:var(--color-light)] bg-white/90 px-3 py-2 shadow-sm backdrop-blur xl:justify-start xl:px-4 xl:shadow-[0_10px_28px_rgba(44,37,34,0.08)]">
                  <IconAward /> Verifiable certificates
                </span>
              </div>

              <figure className="mx-auto mt-6 flex w-full max-w-[560px] items-start justify-center gap-3 xl:mx-0 xl:mt-9 xl:justify-start">
                <span
                  className="shrink-0 select-none font-serif text-[40px] leading-[0.8] xl:text-[50px]"
                  style={{ color: BRAND.primary }}
                  aria-hidden
                >
                  &ldquo;
                </span>
                <div className="min-w-0 pt-1 text-left">
                  <blockquote className="break-words text-[14px] italic leading-6 text-[color:var(--color-ink)]/75 sm:text-[15px] xl:text-[17px]">
                    What you plant in your mind grows in your life.
                  </blockquote>
                  <figcaption className="mt-1 text-sm font-bold text-[color:var(--color-ink)]/85 xl:text-[16px]">
                    &mdash; Prof. Douglas Boateng
                  </figcaption>
                </div>
              </figure>
            </div>

            <div className="animate-fade-up mt-2 xl:mt-0" style={{ animationDelay: "80ms" }}>
              <HeroVisual />
            </div>
          </div>
        </div>
      </section>

      {/* ===== PARTNERS ===== */}
      <div className="bg-[color:var(--color-bg)]">
        <PartnersMarquee partners={partners} />
      </div>

      {/* ===== WHAT WE DO ===== */}
      <section className="bg-white py-16 sm:py-24 2xl:py-36">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 2xl:px-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: BRAND.primary }}>
              Our Offering
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold leading-tight">
              Everything you need to grow professionally
            </h2>
            <p className="mt-4 text-base text-[color:var(--color-ink)]/65 leading-relaxed">
              From individual certifications to corporate training programmes, KDS equips you with the tools and credentials that matter.
            </p>
          </div>

          <div className="mt-12 grid gap-5 2xl:gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {offerings.map((item) => (
              <div
                key={item.title}
                className="group rounded-2xl border border-[color:var(--color-light)] bg-white p-6 2xl:p-8 transition-all duration-200 hover:shadow-md hover:border-[color:var(--color-soft)]"
              >
                <div
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: item.bg, color: item.color }}
                >
                  <item.Icon />
                </div>
                <div className="mt-4 font-semibold text-[16px]">{item.title}</div>
                <p className="mt-2 text-sm text-[color:var(--color-ink)]/65 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== KDS MOBILE ===== */}
      <section className="bg-[color:var(--color-bg)] py-16 sm:py-24 2xl:py-36">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 2xl:px-20">
          <div className="grid gap-16 2xl:gap-24 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
            {/* Left copy */}
            <div className="flex flex-col text-center md:text-left">
              <span className="inline-flex w-fit items-center gap-2 self-center rounded-full border border-[color:var(--color-light)] bg-white px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase text-[color:var(--color-ink)]/70 md:self-start">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: BRAND.primary }} />
                KDS mobile app
              </span>

              <h2 className="mt-5 max-w-xl font-extrabold text-[30px] leading-[1.07] text-[color:var(--color-ink)] sm:text-[40px] lg:text-[48px]">
                Learn anywhere<br className="hidden sm:block" /> with the KDS app.
              </h2>

              <p className="mt-5 max-w-lg text-base leading-7 text-[color:var(--color-ink)]/65 sm:text-lg">
                Access your Knowledge Programs, assessments, and certificates securely from your phone — built for a clean, fast mobile workflow.
              </p>

              <ul className="mt-8 space-y-3 text-left text-sm text-[color:var(--color-ink)] sm:text-base">
                {[
                  "Track your progress, linked programs, and completion status in real time.",
                  "Continue lessons and assessments from a secure mobile learning workspace.",
                  "Review certificates and course activity on the go without losing your place.",
                ].map((text) => (
                  <li
                    key={text}
                    className="flex items-start gap-3 rounded-2xl border border-[color:var(--color-light)] bg-white px-4 py-3.5 shadow-sm"
                  >
                    <span className="mt-0.5 flex-shrink-0 text-green-600">
                      <IconCheck />
                    </span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 md:justify-start">
                <a
                  href="https://apps.apple.com/in/app/panavest-kds/id6755534884"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform duration-200 hover:-translate-y-0.5"
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

                <div className="inline-flex items-center gap-3 rounded-2xl border border-[color:var(--color-light)] bg-white px-5 py-3 text-sm font-medium text-[color:var(--color-ink)]/60 shadow-sm">
                  <Image
                    src="/playstore-svgrepo-com.svg"
                    alt="Google Play"
                    width={24}
                    height={24}
                    className="h-5 w-auto opacity-60"
                  />
                  <span>Android coming soon</span>
                </div>
              </div>

              <p className="mt-3 text-xs text-[color:var(--color-ink)]/50">
                Available now on iPhone. Android is in progress and not live yet.
              </p>
            </div>

            {/* Right visual */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[620px]">
                <Image
                  src="/mobile.png"
                  alt="KDS mobile experience showing the dashboard and course progress views"
                  width={2000}
                  height={2000}
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 48vw, 620px"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURED KNOWLEDGE ===== */}
      <section className="bg-white py-16 sm:py-24 2xl:py-36">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 2xl:px-20">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: BRAND.primary }}>
                Knowledge Programs
              </p>
              <h2 className="mt-2 text-3xl sm:text-4xl font-bold">Featured Knowledge</h2>
            </div>
            <Link
              href="/courses"
              className="self-start sm:self-auto text-sm font-medium underline decoration-dotted underline-offset-4 text-[color:var(--color-ink)]/60 hover:text-[color:var(--color-ink)] transition-colors"
            >
              Browse all knowledge →
            </Link>
          </div>

          <div className="mt-10 grid gap-6 2xl:gap-9 sm:grid-cols-2 lg:grid-cols-3">
            {featuredList.map((c, idx) => (
              <Link
                key={c ? c.id : `s-${idx}`}
                href={c ? `/courses/${c.slug}` : "#"}
                className="group rounded-2xl border border-[color:var(--color-light)] bg-white overflow-hidden transition-all duration-200 hover:shadow-md hover:border-[color:var(--color-soft)]"
              >
                <div className="relative w-full aspect-video bg-[color:var(--color-light)]/30">
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
                <div className="px-5 py-5 2xl:px-7 2xl:py-7">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="rounded-md px-2 py-0.5 text-[11px] font-semibold text-white"
                      style={{ background: BRAND.primary }}
                    >
                      CPPD {c?.cpd_points ?? 0}
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold text-[16px] text-[color:var(--color-ink)] leading-snug group-hover:opacity-80 transition-opacity">
                    {c?.title ?? "Loading…"}
                  </h3>
                  {c?.description && (
                    <p className="mt-2 text-sm text-[color:var(--color-ink)]/60 line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== E-BOOKS ===== */}
      <section className="bg-[color:var(--color-bg)] py-16 sm:py-24 2xl:py-36">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 2xl:px-20">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: BRAND.primary }}>
                Publications
              </p>
              <h2 className="mt-2 text-3xl sm:text-4xl font-bold">E-Books</h2>
              <p className="mt-2 text-sm text-[color:var(--color-ink)]/60 max-w-lg">
                All books are credited by the{" "}
                <span className="font-semibold text-[color:var(--color-ink)]/80">
                  National Council for Curriculum and Assessment (NaCCA) of Ghana
                </span>.
              </p>
            </div>
            <Link
              href="/ebooks"
              className="self-start sm:self-auto text-sm font-medium underline decoration-dotted underline-offset-4 text-[color:var(--color-ink)]/60 hover:text-[color:var(--color-ink)] transition-colors"
            >
              View all e-books →
            </Link>
          </div>

          <div className="mt-10 grid gap-6 2xl:gap-9 sm:grid-cols-2 lg:grid-cols-4">
            {ebooksList.map((b, idx) => (
              <Link
                key={b ? b.id : `e-${idx}`}
                href={b ? `/ebooks/${b.slug}` : "#"}
                className="group relative rounded-2xl border border-[color:var(--color-light)] bg-white overflow-hidden transition-all duration-200 hover:shadow-md hover:border-[color:var(--color-soft)]"
              >
                <div className="relative w-full h-[260px] bg-[color:var(--color-light)]/30">
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
                  <div
                    className="absolute left-3 top-3 rounded-md px-2 py-1 text-[10px] font-semibold text-white"
                    style={{ background: "rgba(0,0,0,.7)" }}
                  >
                    NaCCA-credited
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-[15px] leading-snug text-[color:var(--color-ink)] min-h-[42px]">
                    {b?.title ?? "Loading…"}
                  </h3>
                  {b?.description && (
                    <p className="mt-2 text-sm text-[color:var(--color-ink)]/60 line-clamp-2 leading-relaxed">
                      {b.description}
                    </p>
                  )}
                  {typeof b?.price_cents === "number" && (
                    <div className="mt-3">
                      <span
                        className="inline-block rounded-lg px-2.5 py-1 text-[12px] font-medium"
                        style={{
                          background: "rgba(182,84,55,0.08)",
                          color: BRAND.primary,
                        }}
                      >
                        {b.free_for_logged_in
                          ? "Free with login"
                          : `GH₵ ${(b.price_cents / 100).toFixed(2)}`}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== REVIEWS ===== */}
      <section className="bg-white py-16 sm:py-24 2xl:py-36">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 2xl:px-20">
          <div className="text-center max-w-xl mx-auto">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: BRAND.primary }}>
              Testimonials
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold">What professionals say</h2>
          </div>

          <div className="mt-12 grid gap-6 2xl:gap-9 sm:grid-cols-2 lg:grid-cols-4">
            {reviews.map((r) => (
              <div
                key={r.name}
                className="relative rounded-2xl border border-[color:var(--color-light)] bg-white p-6 2xl:p-8 transition-all duration-200 hover:shadow-md hover:border-[color:var(--color-soft)]"
              >
                {/* Decorative quotation mark */}
                <div
                  className="absolute right-5 top-4 font-serif text-[64px] leading-none select-none pointer-events-none"
                  style={{ color: "rgba(182,84,55,0.1)" }}
                  aria-hidden="true"
                >
                  &ldquo;
                </div>
                <p className="relative text-sm text-[color:var(--color-ink)]/75 leading-relaxed">{r.quote}</p>
                <div className="mt-5 flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: BRAND.primary }}
                  >
                    {r.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[color:var(--color-ink)]">{r.name}</div>
                    <div className="text-[11px] text-[color:var(--color-ink)]/50">{r.role} · {r.org}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative isolate overflow-hidden bg-[color:var(--color-ink)] py-16 sm:py-20 2xl:py-28">
        <DarkDecor />

        <div className="relative z-10 mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 2xl:px-20 text-center">
          <p className="text-xs font-semibold tracking-widest uppercase text-white/40">
            Start today
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white">
            Ready to invest in your expertise?
          </h2>
          <p className="mt-4 text-base text-white/60 max-w-lg mx-auto leading-relaxed">
            Join thousands of professionals across Africa who are building verifiable skills with PanAvest KDS.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/courses"
              className="rounded-xl px-7 py-3.5 font-semibold text-[15px] text-white transition hover:opacity-90 shadow-lg"
              style={{ background: BRAND.primary }}
            >
              Explore Knowledge
            </Link>
            <Link
              href="/about"
              className="rounded-xl px-7 py-3.5 font-semibold text-[15px] text-white border border-white/20 hover:bg-white/10 transition"
            >
              About KDS
            </Link>
          </div>
          <p className="mt-6 text-xs text-white/30">
            Powered by PanAvest International &amp; Partners · Accredited by NaCCA, Ghana
          </p>
        </div>
      </section>
    </>
  );
}
