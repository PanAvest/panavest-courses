import Link from "next/link";
import Image from "next/image";
import { BOARDROOM_BLUR } from "@/app/lib/blur";
import DarkDecor from "@/components/DarkDecor";

const BRAND = "#b65437";

export const metadata = {
  title: "About KDS",
  description:
    "PanAvest Knowledge Development Series — Africa-inspired, globally aligned certified learning from Professor Douglas Boateng.",
};

export default function AboutPage() {
  const principles = [
    {
      title: "Africa-first relevance",
      text: "Solutions must reflect African realities — not borrowed frameworks retrofitted to a different context.",
    },
    {
      title: "Global standards, locally applied",
      text: "Benchmark against the world's best; execute in a way that fits your environment.",
    },
    {
      title: "Impact over information",
      text: "Knowledge is only validated when it drives measurable, real-world results.",
    },
    {
      title: "Ethical stewardship",
      text: "Integrity is non-negotiable — in governance, sourcing, and every professional interaction.",
    },
    {
      title: "Evidence before rhetoric",
      text: "Decisions grounded in truth — not comfortable narratives or convenient assumptions.",
    },
  ];

  const reasons = [
    "Designed for Africa, aligned to global standards",
    "Converts theory into measurable boardroom results",
    "Built on nationally accredited work by Prof. Douglas Boateng",
    "Driven by real boardroom and policy experience",
    "Outcomes that employers and institutions trust",
    "Structured for busy professionals and executives",
    "Internationally verifiable digital certificates",
    "Aligned to the UN SDGs, AfCFTA, and industrialisation pathways",
    "No jargon — practical insights you apply immediately",
    "Knowledge that shapes generational progress",
  ];

  const audiences = [
    "Board Directors",
    "C-Suite Leaders",
    "Public-Sector Executives",
    "Supply-Chain Professionals",
    "Policymakers",
    "Academics",
    "Entrepreneurs",
    "Emerging Talent",
  ];

  const faqs = [
    { q: "Do I receive a certificate?", a: "Yes — issued upon achieving the minimum score in the assessments." },
    { q: "Are credentials verifiable?", a: "Yes — each certificate carries a unique, online-verifiable credential ID." },
    { q: "Is this internationally relevant?", a: "Yes — globally aligned frameworks, delivered with African contextualisation." },
    { q: "How long do courses take?", a: "Days to weeks depending on your pace. All content is self-paced." },
    { q: "Who can enrol?", a: "Anyone — no prior board experience required. Designed for all levels." },
    { q: "Can organisations enrol teams?", a: "Yes — group access and corporate onboarding are available." },
    { q: "Is this only for Africa?", a: "No — the frameworks are globally applicable and useful everywhere." },
    { q: "What devices are supported?", a: "Web (all browsers) plus the KDS iOS app. Android is in progress." },
  ];

  const fadeDelay = (delay: number) => ({ animationDelay: `${delay}ms` });

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative isolate overflow-hidden bg-black">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <Image
            src="/Boardroom.webp"
            alt=""
            fill
            sizes="100vw"
            priority
            placeholder="blur"
            blurDataURL={BOARDROOM_BLUR}
            className="object-cover object-center opacity-40"
          />
        </div>

        {/* dark scrim so the pattern reads clearly over the photo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "linear-gradient(115deg, rgba(24,18,16,0.68) 0%, rgba(24,18,16,0.42) 52%, rgba(24,18,16,0.66) 100%)" }}
        />
        <DarkDecor strong />

        <div className="relative z-10 animate-fade-up mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 2xl:px-20 py-20 sm:py-28 lg:py-32 2xl:py-40">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: BRAND }} />
            PanAvest International &amp; Partners
          </span>

          <h1 className="mt-5 max-w-3xl font-extrabold leading-[1.02] text-[44px] sm:text-[60px] lg:text-[72px] text-white">
            Africa-inspired.<br />
            <span style={{ color: BRAND }}>Globally trusted.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-[17px] sm:text-[19px] leading-relaxed text-white/70">
            PanAvest KDS turns Professor Douglas Boateng&apos;s internationally accredited writings into
            interactive certified learning — built for professionals who demand measurable outcomes.
          </p>

          {/* Stats row */}
          <div className="animate-fade-up mt-12 grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10" style={fadeDelay(120)}>
            {[
              { value: "4", label: "ISO Standards" },
              { value: "CPD", label: "Accredited-Ready" },
              { value: "NaCCA", label: "Ghana Credited" },
              { value: "Global", label: "Reach" },
            ].map((stat, i) => (
              <div key={stat.label} className="animate-fade-up bg-white/5 backdrop-blur-sm px-6 py-5 text-center" style={fadeDelay(180 + i * 50)}>
                <div className="text-2xl sm:text-3xl font-extrabold text-white">{stat.value}</div>
                <div className="mt-1 text-[12px] font-medium text-white/50 uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ORIGIN STORY ── */}
      <section className="bg-white py-16 sm:py-24 2xl:py-36">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 2xl:px-20">
          <div className="grid gap-12 2xl:gap-20 lg:grid-cols-2 lg:items-center">
            <div className="animate-fade-up">
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: BRAND }}>
                Our Story
              </p>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold leading-tight">
                From inconvenient truths to <span style={{ color: BRAND }}>transformative knowledge</span>
              </h2>
              <p className="mt-5 text-base leading-relaxed text-[color:var(--color-ink)]/70">
                Inspired by the thought-leading writings of{" "}
                <a
                  href="https://douglasboateng.com/about-professor-douglas-boateng/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline underline-offset-2 hover:opacity-80 transition"
                  style={{ color: BRAND }}
                >
                  Professor Douglas Boateng
                </a>
                , his nationally accredited and professionally recognised books have evolved into
                the <strong>Knowledge Development Series</strong> — a digital learning ecosystem
                that makes foundational governance, strategy, UN SDGs, negotiation, industrialisation,
                and strategic sourcing knowledge accessible worldwide.
              </p>
              <p className="mt-4 text-base leading-relaxed text-[color:var(--color-ink)]/70">
                <strong>Africa-inspired. Globally aligned. Measurably impactful.</strong> We convert
                the Knowledge Development Series into interactive courses rooted in African realities
                and benchmarked against international standards.
              </p>
              <a
                href="https://panavest.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 shadow-md"
                style={{ background: BRAND }}
              >
                Visit PanAvest International
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                  <path d="M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14V3zM5 5h5V3H5a2 2 0 00-2 2v14c0 1.1.9 2 2 2h14a2 2 0 002-2v-5h-2v5H5V5z" />
                </svg>
              </a>
            </div>

            {/* Quote card */}
            <div className="animate-fade-up relative" style={fadeDelay(100)}>
              <div
                className="rounded-2xl p-8 sm:p-10 text-white shadow-2xl"
                style={{ background: `linear-gradient(135deg, ${BRAND}, #8b3d25)` }}
              >
                <div className="font-serif text-[80px] leading-none text-white/20 select-none" aria-hidden>&ldquo;</div>
                <p className="mt-2 text-[18px] sm:text-[20px] font-medium leading-relaxed italic text-white/90">
                  What you plant in your mind grows in your life.
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/20" />
                  <span className="text-sm font-semibold text-white/70">Prof. Douglas Boateng</span>
                </div>
              </div>
              {/* decorative blobs */}
              <div aria-hidden className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10" style={{ background: BRAND }} />
              <div aria-hidden className="pointer-events-none absolute -bottom-6 -left-6 h-32 w-32 rounded-full opacity-5" style={{ background: BRAND }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── VISION & MISSION ── */}
      <section className="bg-[color:var(--color-bg)] py-16 sm:py-24 2xl:py-36">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 2xl:px-20">
          <div className="animate-fade-up text-center max-w-xl mx-auto">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: BRAND }}>
              Direction
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold">Vision &amp; Mission</h2>
          </div>

          <div className="mt-12 grid gap-6 2xl:gap-10 sm:grid-cols-2">
            {[
              {
                label: "Vision",
                icon: (
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
                    <path d="M12 4c4.7 0 8.7 2.7 10.5 7-1.8 4.3-5.8 7-10.5 7S3.3 15.3 1.5 11C3.3 6.7 7.3 4 12 4zm0 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                  </svg>
                ),
                text: "To be among the world's three most trusted platforms for practical, boardroom-ready knowledge — delivered through clear, actionable perspectives on governance, strategic sourcing, negotiations, and the UN SDGs.",
              },
              {
                label: "Mission",
                icon: (
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
                    <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm1 5v4h4v2h-6V8h2z" />
                  </svg>
                ),
                text: "To accelerate Africa's human-capital transformation through certified learning that bridges classroom theory and boardroom execution — ensuring every learner delivers measurable real-world outcomes.",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="animate-fade-up rounded-2xl border border-[color:var(--color-light)] bg-white p-8 shadow-sm hover:shadow-md transition-shadow"
                style={fadeDelay(item.label === "Vision" ? 60 : 120)}
              >
                <div
                  className="inline-flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-md"
                  style={{ background: BRAND }}
                >
                  {item.icon}
                </div>
                <h3 className="mt-5 text-xl font-bold" style={{ color: BRAND }}>{item.label}</h3>
                <p className="mt-3 text-[color:var(--color-ink)]/70 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>

          {/* Why it matters */}
          <div className="animate-fade-up mt-6 rounded-2xl border border-[color:var(--color-light)] bg-white p-8 shadow-sm" style={fadeDelay(180)}>
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: BRAND }}>
              Why KDS Matters
            </p>
            <p className="text-[color:var(--color-ink)]/70 leading-relaxed max-w-3xl">
              Africa&apos;s competitiveness will be shaped by ethical leadership, supply-chain value retention,
              effective public-sector stewardship, and evidence-led strategy execution.
              KDS provides the capability tools professionals need to get there.
            </p>
          </div>
        </div>
      </section>

      {/* ── GUIDING PRINCIPLES ── */}
      <section className="bg-white py-16 sm:py-24 2xl:py-36">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 2xl:px-20">
          <div className="animate-fade-up max-w-2xl">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: BRAND }}>
              How We Work
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold">Guiding Principles</h2>
            <p className="mt-4 text-base text-[color:var(--color-ink)]/60 leading-relaxed">
              Every course, every assessment, and every certificate is shaped by these five commitments.
            </p>
          </div>

          <div className="mt-10 grid gap-5 2xl:gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {principles.map((p, i) => (
              <div
                key={p.title}
                className="animate-fade-up relative rounded-2xl border border-[color:var(--color-light)] bg-white p-6 shadow-sm hover:shadow-md transition-all hover:border-[color:var(--color-soft)]"
                style={fadeDelay(i * 60)}
              >
                <div
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{ background: BRAND }}
                >
                  {i + 1}
                </div>
                <h3 className="mt-4 font-semibold text-[16px] text-[color:var(--color-ink)]">{p.title}</h3>
                <p className="mt-2 text-sm text-[color:var(--color-ink)]/65 leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO THIS IS FOR ── */}
      <section className="bg-[color:var(--color-bg)] py-16 sm:py-24 2xl:py-36">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 2xl:px-20">
          <div className="animate-fade-up text-center max-w-xl mx-auto">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: BRAND }}>
              Audience
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold">Who This Is For</h2>
            <p className="mt-4 text-base text-[color:var(--color-ink)]/65 leading-relaxed">
              If you are committed to learning that leads to action, KDS Learning is for you.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {audiences.map((a, i) => (
              <span
                key={a}
                className="animate-fade-up rounded-full border border-[color:var(--color-light)] bg-white px-5 py-2.5 text-sm font-semibold text-[color:var(--color-ink)] shadow-sm hover:shadow-md transition-shadow"
                style={fadeDelay(i * 35)}
              >
                {a}
              </span>
            ))}
          </div>

          {/* Certification overview */}
          <div className="mt-12 grid gap-5 2xl:gap-8 sm:grid-cols-2">
            {[
              {
                title: "Certification",
                text: "Issued upon achieving the minimum score in multiple-choice assessments — verifiable, internationally accessible.",
              },
              {
                title: "Digital Credential Verification",
                text: "Each certificate is registered and independently verifiable via a unique credential ID.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="animate-fade-up flex gap-4 rounded-2xl border border-[color:var(--color-light)] bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                style={fadeDelay(item.title === "Certification" ? 80 : 140)}
              >
                <div
                  className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ background: BRAND }}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                    <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-[color:var(--color-ink)]">{item.title}</h3>
                  <p className="mt-1.5 text-sm text-[color:var(--color-ink)]/65 leading-relaxed">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10 REASONS ── */}
      <section className="bg-white py-16 sm:py-24 2xl:py-36">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 2xl:px-20">
          <div className="animate-fade-up text-center max-w-xl mx-auto">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: BRAND }}>
              Why Enrol
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold">10 Reasons to Choose KDS</h2>
          </div>

          <div className="mt-10 grid gap-4 2xl:gap-7 sm:grid-cols-2 lg:grid-cols-5">
            {reasons.map((r, i) => (
              <div
                key={r}
                className="animate-fade-up relative rounded-2xl border border-[color:var(--color-light)] bg-white p-5 shadow-sm hover:shadow-md transition-all hover:border-[color:var(--color-soft)]"
                style={fadeDelay(i * 45)}
              >
                <div
                  className="text-3xl font-extrabold leading-none"
                  style={{ color: `rgba(182,84,55,0.12)` }}
                  aria-hidden
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <p className="mt-3 text-sm font-medium text-[color:var(--color-ink)] leading-snug">{r}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-[color:var(--color-bg)] py-16 sm:py-24 2xl:py-36">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 2xl:px-20">
          <div className="animate-fade-up text-center max-w-xl mx-auto">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: BRAND }}>
              FAQ
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold">Common Questions</h2>
          </div>

          <div className="mt-10 grid gap-4 2xl:gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {faqs.map((f, i) => (
              <div
                key={f.q}
                className="animate-fade-up rounded-2xl border border-[color:var(--color-light)] bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                style={fadeDelay(i * 45)}
              >
                <p className="font-semibold text-[14px] text-[color:var(--color-ink)]">{f.q}</p>
                <p className="mt-2 text-sm text-[color:var(--color-ink)]/65 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative isolate overflow-hidden bg-[color:var(--color-ink)] py-16 sm:py-20 2xl:py-28">
        <DarkDecor />
        <div className="relative z-10 animate-fade-up mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 2xl:px-20 text-center">
          <p className="text-xs font-semibold tracking-widest uppercase text-white/40">
            Start today
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white">
            Ready to invest in your expertise?
          </h2>
          <p className="mt-4 text-base text-white/60 max-w-lg mx-auto leading-relaxed">
            Join professionals across Africa who are building verifiable, boardroom-ready skills with PanAvest KDS.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/courses"
              className="rounded-xl px-7 py-3.5 font-semibold text-[15px] text-white transition hover:opacity-90 shadow-lg"
              style={{ background: BRAND }}
            >
              Explore Knowledge
            </Link>
            <Link
              href="/ebooks"
              className="rounded-xl px-7 py-3.5 font-semibold text-[15px] text-white border border-white/20 hover:bg-white/10 transition"
            >
              Browse E-Books
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
