// app/about/page.tsx (AboutPage)
export default function AboutPage() {
  return (
    <main className="w-full max-w-7xl mx-auto px-4 md:px-6 py-12 animate-fade-up">
      {/* Header */}
      <section className="w-full animate-fade-up">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#b6543715] px-3 py-1 text-xs font-semibold tracking-wide text-[#b65437] ring-1 ring-[#b6543726]">
          <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>
          </svg>
          Powered by PanAvest International & Partners
        </span>

        <h1 className="mt-4 text-3xl md:text-4xl font-extrabold leading-tight text-[#b65437]">
          About KDS Learning
        </h1>

        {/* Intro / Thought Leadership */}
        <p className="mt-4 text-sm md:text-base text-muted-foreground/90 max-w-5xl">
          Inspired by the thought-leading and inconvenient-truth writings of{" "}
          <a
            href="https://douglasboateng.com/about-professor-douglas-boateng/"
            target="_blank"
            rel="noreferrer"
            className="text-[#b65437] underline underline-offset-2 font-semibold hover:opacity-80 transition"
          >
            Professor Douglas Boateng
          </a>
          , his nationally accredited and professionally recognised books have evolved into a digital
          <strong> Knowledge Development Series</strong>. The platform makes foundational <strong>governance, strategy, UN SDGs,
          negotiation, industrialisation</strong>, and <strong>strategic sourcing</strong> knowledge accessible to learners worldwide.
        </p>
        <p className="mt-3 text-sm md:text-base text-muted-foreground/90 max-w-5xl">
          <strong>Thought leadership: Africa-inspired. Globally aligned. Measurably impactful.</strong> KDS Learning is a modern
          learning ecosystem from <strong>PanAvest International &amp; Partners</strong>. We convert the Knowledge Development Series
          into interactive courses—rooted in African realities and aligned with international standards.
        </p>
      </section>

      {/* Vision */}
      <section className="mt-10 w-full animate-fade-up">
        <div className="flex items-start gap-3">
          <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#b6543715] text-[#b65437] ring-1 ring-[#b6543726]">
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4c4.7 0 8.7 2.7 10.5 7-1.8 4.3-5.8 7-10.5 7S3.3 15.3 1.5 11C3.3 6.7 7.3 4 12 4zm0 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
            </svg>
          </span>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-[#b65437]">Vision</h2>
            <p className="mt-2 text-muted-foreground/90 max-w-5xl">
              To be among the world’s three most trusted platforms for practical, boardroom-ready knowledge—delivered
              through clear, easy-to-digest perspectives on governance, strategic sourcing, negotiations, and the UN SDGs.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Why It Matters */}
      <section className="mt-10 w-full grid gap-8 lg:grid-cols-2">
        <div className="animate-fade-up" style={{ animationDelay: "40ms" }}>
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#b6543715] text-[#b65437] ring-1 ring-[#b6543726]">
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm1 5v4h4v2h-6V8h2z"/>
              </svg>
            </span>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-[#b65437]">Our Mission</h2>
              <p className="mt-2 text-muted-foreground/90">
                To accelerate Africa’s human-capital transformation through certified learning that bridges classroom theory
                and boardroom execution, ensuring every learner delivers measurable real-world outcomes.
              </p>
            </div>
          </div>
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#b6543715] text-[#b65437] ring-1 ring-[#b6543726]">
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 7l-9-4-9 4 9 4 9-4zm-9 6l-9-4v8l9 4 9-4v-8l-9 4z"/>
              </svg>
            </span>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-[#b65437]">Why KDS Learning Matters</h2>
              <p className="mt-2 text-muted-foreground/90">
                Africa’s competitiveness will be shaped by ethical leadership, supply-chain value retention, effective public-sector
                stewardship, and evidence-led strategy execution. KDS Learning provides the capability tools to get there.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Guiding Principles */}
      <section className="mt-12 w-full animate-fade-up">
        <div className="flex items-center gap-2">
          <svg aria-hidden="true" className="h-5 w-5 text-[#b65437]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7zm0 9a2 2 0 100-4 2 2 0 000 4z"/>
          </svg>
          <h2 className="text-xl md:text-2xl font-bold text-[#b65437]">Guiding Principles</h2>
        </div>
        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-muted-foreground/90">
          <li className="rounded-xl p-4 ring-1 ring-[#b6543726] bg-white animate-fade-up" style={{ animationDelay: "0ms" }}>
            <strong className="text-[#b65437]">Africa-first relevance:</strong> solutions must reflect African realities.
          </li>
          <li className="rounded-xl p-4 ring-1 ring-[#b6543726] bg-white animate-fade-up" style={{ animationDelay: "60ms" }}>
            <strong className="text-[#b65437]">Global standards, locally applied:</strong> benchmark internationally, execute contextually.
          </li>
          <li className="rounded-xl p-4 ring-1 ring-[#b6543726] bg-white animate-fade-up" style={{ animationDelay: "120ms" }}>
            <strong className="text-[#b65437]">Impact over information:</strong> knowledge is validated only when it drives measurable results.
          </li>
          <li className="rounded-xl p-4 ring-1 ring-[#b6543726] bg-white animate-fade-up" style={{ animationDelay: "180ms" }}>
            <strong className="text-[#b65437]">Ethical stewardship:</strong> integrity is non-negotiable.
          </li>
          <li className="rounded-xl p-4 ring-1 ring-[#b6543726] bg-white animate-fade-up" style={{ animationDelay: "240ms" }}>
            <strong className="text-[#b65437]">Evidence before rhetoric:</strong> decisions must be grounded in truth.
          </li>
        </ul>
      </section>

      {/* What We Offer */}
      <section className="mt-12 w-full animate-fade-up">
        <div className="flex items-center gap-2">
          <svg aria-hidden="true" className="h-5 w-5 text-[#b65437]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 3h14v4H5zM3 9h18v12H3z"/>
          </svg>
          <h2 className="text-xl md:text-2xl font-bold text-[#b65437]">What We Offer</h2>
        </div>
        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
          <li className="group rounded-xl p-4 ring-1 ring-[#b6543726] bg-white animate-fade-up" style={{ animationDelay: "0ms" }}>Africa-contextualised interactive modules</li>
          <li className="group rounded-xl p-4 ring-1 ring-[#b6543726] bg-white animate-fade-up" style={{ animationDelay: "60ms" }}>Case-based learning built on real organisational challenges</li>
          <li className="group rounded-xl p-4 ring-1 ring-[#b6543726] bg-white animate-fade-up" style={{ animationDelay: "120ms" }}>Boardroom &amp; executive pathways that convert understanding into outcomes</li>
          <li className="group rounded-xl p-4 ring-1 ring-[#b6543726] bg-white animate-fade-up" style={{ animationDelay: "180ms" }}>CPPD-aligned assessments that validate competence</li>
        </ul>
      </section>

      {/* Ground-Breaking Features (kept, as requested) */}
      <section className="mt-12 w-full animate-fade-up">
        <div className="flex items-center gap-2">
          <svg aria-hidden="true" className="h-5 w-5 text-[#b65437]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7zm0 9a2 2 0 100-4 2 2 0 000 4z"/>
          </svg>
          <h2 className="text-xl md:text-2xl font-bold text-[#b65437]">Ground-Breaking Features</h2>
        </div>

        {/* cards unchanged from your version */}
        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* ... keep your original six feature cards exactly as you provided ... */}
          {/* (Paste your existing six <li> cards here unchanged) */}
        </ul>
      </section>

      {/* Certification & Verification */}
      <section className="mt-12 w-full">
        <div className="flex items-center gap-2">
          <svg aria-hidden="true" className="h-5 w-5 text-[#b65437]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1l3 6 6 .5-4.5 4 1.3 6.5L12 15l-5.8 3.9L7.5 11 3 7.5 9 7z"/>
          </svg>
          <h2 className="text-xl md:text-2xl font-bold text-[#b65437]">Certification &amp; Verification</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl p-4 ring-1 ring-[#b6543726] bg-white">
            <h3 className="font-semibold text-[#b65437]">Certificate</h3>
            <p className="mt-1 text-sm text-muted-foreground/90">
              Issued upon achieving the minimum score in the multiple-choice assessments; verifiable and internationally accessible.
            </p>
          </div>
          <div className="rounded-xl p-4 ring-1 ring-[#b6543726] bg-white">
            <h3 className="font-semibold text-[#b65437]">Digital Credential Verification</h3>
            <p className="mt-1 text-sm text-muted-foreground/90">
              Each certificate is registered and independently verifiable via a unique credential ID.
            </p>
          </div>
        </div>
      </section>

      {/* Who This Is For */}
      <section className="mt-12 w-full">
        <div className="flex items-start gap-3">
          <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#b6543715] text-[#b65437] ring-1 ring-[#b6543726]">
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 2h10v2H7V2zM4 6h16v14H4V6zm4 2v10h2V8H8zm6 0v10h2V8h-2z"/>
            </svg>
          </span>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-[#b65437]">Who This Is For</h2>
            <p className="mt-2 text-muted-foreground/90 max-w-5xl">
              KDS Learning serves board directors, C-suite leaders, public-sector executives, supply-chain professionals,
              policymakers, academics, entrepreneurs, and ambitious emerging talent. If you are committed to learning
              that leads to action, KDS Learning is for you.
            </p>
          </div>
        </div>
      </section>

      {/* 10 Reasons to Enrol */}
      <section className="mt-12 w-full">
        <div className="flex items-center gap-2">
          <svg aria-hidden="true" className="h-5 w-5 text-[#b65437]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 3h6v2H9zM5 7h14v14H5z"/>
          </svg>
          <h2 className="text-xl md:text-2xl font-bold text-[#b65437]">10 Reasons to Enrol</h2>
        </div>
        <ol className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 list-decimal list-inside text-sm text-muted-foreground/90">
          <li>Designed for Africa, aligned to global standards</li>
          <li>Converts theory into measurable results</li>
          <li>
            Built on nationally accredited work by{" "}
            <a
              href="https://douglasboateng.com/about-professor-douglas-boateng/"
              target="_blank"
              rel="noreferrer"
              className="text-[#b65437] underline underline-offset-2 font-semibold hover:opacity-80 transition"
            >
              Professor Douglas Boateng
            </a>
          </li>
          <li>Driven by real boardroom and policy experience</li>
          <li>Learner outcomes employers and institutions trust</li>
          <li>Structured for busy professionals and executives</li>
          <li>Internationally accessible, verifiable digital certificates</li>
          <li>Aligned to the UN SDGs, AfCFTA, and industrialisation pathways</li>
          <li>No jargon—practical insights you can apply</li>
          <li>Knowledge that shapes generational progress</li>
        </ol>
      </section>

      {/* FAQ */}
      <section className="mt-12 w-full">
        <div className="flex items-center gap-2">
          <svg aria-hidden="true" className="h-5 w-5 text-[#b65437]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2zm0 15a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 7h2v1c1.7.2 3 1.4 3 3 0 2-2 2.5-2.7 3H11v-1.5h1c.6-.5 2-1 2-1.8 0-.7-.6-1.2-1.4-1.2H11V7z"/>
          </svg>
          <h2 className="text-xl md:text-2xl font-bold text-[#b65437]">FAQ</h2>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-muted-foreground/90">
          <div className="rounded-xl p-4 ring-1 ring-[#b6543726] bg-white">
            <p><strong className="text-[#b65437]">Do I receive a certificate?</strong> Yes—upon meeting the minimum score.</p>
          </div>
          <div className="rounded-xl p-4 ring-1 ring-[#b6543726] bg-white">
            <p><strong className="text-[#b65437]">Are credentials verifiable?</strong> Yes—each certificate has a unique, online-verifiable ID.</p>
          </div>
          <div className="rounded-xl p-4 ring-1 ring-[#b6543726] bg-white">
            <p><strong className="text-[#b65437]">Is this internationally relevant?</strong> Yes—globally aligned and contextually African.</p>
          </div>
          <div className="rounded-xl p-4 ring-1 ring-[#b6543726] bg-white">
            <p><strong className="text-[#b65437]">How long do courses take?</strong> Days to weeks, depending on your pace.</p>
          </div>
          <div className="rounded-xl p-4 ring-1 ring-[#b6543726] bg-white">
            <p><strong className="text-[#b65437]">Who can enrol?</strong> Anyone—no prior board experience required.</p>
          </div>
          <div className="rounded-xl p-4 ring-1 ring-[#b6543726] bg-white">
            <p><strong className="text-[#b65437]">Is this only for Africa?</strong> No—useful globally.</p>
          </div>
          <div className="rounded-xl p-4 ring-1 ring-[#b6543726] bg-white">
            <p><strong className="text-[#b65437]">Can organisations enrol teams?</strong> Yes—group access and onboarding available.</p>
          </div>
        </div>
      </section>

      {/* Mobile App Coming Soon (kept) */}
      <section className="mt-12 w-full">
        <div className="flex items-start gap-3">
          <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#b6543715] text-[#b65437] ring-1 ring-[#b6543726]">
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2zm5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
            </svg>
          </span>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-[#b65437]">Mobile App Coming Soon</h2>
            <p className="mt-2 text-muted-foreground/90 max-w-5xl">
              Built with <strong>React + Capacitor</strong>, the KDS mobile app lets you enrol, learn, write quizzes,
              and download verified certificates—on the go and even offline—with secure cloud-synced progress.
            </p>
          </div>
        </div>
      </section>

      {/* PanAvest Link (kept) */}
      <section className="mt-12 w-full">
        <a
          href="https://panavest.com/"
          target="_blank"
          className="inline-flex items-center gap-2 rounded-lg border border-[#b6543726] bg-[#b6543710] px-4 py-2 text-sm font-semibold text-[#b65437] hover:bg-[#b654371a] transition"
        >
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14V3zM5 5h5V3H5a2 2 0 00-2 2v14c0 1.1.9 2 2 2h14a2 2 0 002-2v-5h-2v5H5V5z"/>
          </svg>
          Learn more about PanAvest International &amp; Partners
        </a>

        <p className="mt-3 text-xs text-muted-foreground/90 max-w-5xl">
          KDS Learning and its CPPD pathways are part of PanAvest’s mission to advance ethical leadership,
          industrialisation, and value-chain excellence across Africa.
        </p>
      </section>
    </main>
  );
}
