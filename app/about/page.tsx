export default function AboutPage() {
  return (
    <main className="w-full px-4 md:px-6 py-12">
      {/* Header */}
      <section className="max-w-5xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#b6543715] px-3 py-1 text-xs font-semibold tracking-wide text-[#b65437] ring-1 ring-[#b6543726]">
          <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>
          </svg>
          Powered by PanAvest International & Partners
        </span>

        <h1 className="mt-4 text-3xl md:text-4xl font-extrabold leading-tight text-[#b65437]">
          About KDS Learning
        </h1>

        <p className="mt-4 max-w-3xl text-sm md:text-base text-muted-foreground/90">
          <strong className="font-semibold">KDS Learning</strong> is a modern, Africa-first learning ecosystem
          built by <strong>PanAvest International &amp; Partners</strong> and inspired by the work of
          <strong> Professor Douglas Boateng</strong>. We transform the <em>Knowledge Development Series (KDS)</em>
          into interactive courses that merge governance, supply chain, industrialisation, and sustainability—
          grounded in African realities yet aligned to global standards.
        </p>
      </section>

      {/* Mission & Why It Matters */}
      <section className="mt-10 max-w-5xl space-y-8">
        <div className="max-w-3xl">
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#b6543715] text-[#b65437] ring-1 ring-[#b6543726]">
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm1 5v4h4v2h-6V8h2z"/>
              </svg>
            </span>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-[#b65437]">Our Mission</h2>
              <p className="mt-2 text-muted-foreground/90">
                Accelerate Africa’s human-capital transformation with certified, practical learning that bridges
                the gap between classroom theory and boardroom execution. Every course drives measurable,
                real-world outcomes.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-3xl">
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#b6543715] text-[#b65437] ring-1 ring-[#b6543726]">
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 7l-9-4-9 4 9 4 9-4zm-9 6l-9-4v8l9 4 9-4v-8l-9 4z"/>
              </svg>
            </span>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-[#b65437]">Why It Matters</h2>
              <p className="mt-2 text-muted-foreground/90">
                Africa’s competitiveness depends on context-aware leadership and governance. KDS Learning
                delivers CPPD-backed pathways with verifiable credentials—trusted by employers, boards,
                and institutions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ground-breaking Features */}
      <section className="mt-12 max-w-5xl">
        <div className="flex items-center gap-2">
          <svg aria-hidden="true" className="h-5 w-5 text-[#b65437]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7zm0 9a2 2 0 100-4 2 2 0 000 4z"/>
          </svg>
          <h2 className="text-xl md:text-2xl font-bold text-[#b65437]">Ground-Breaking Features</h2>
        </div>

        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Feature card */}
          <li className="group rounded-xl p-4 ring-1 ring-[#b6543726] bg-white hover:bg-[#b6543710] transition">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#b6543715] text-[#b65437] ring-1 ring-[#b6543726]">
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 3h18v4H3V3zm0 6h18v12H3V9zm5 3v6h2v-6H8zm6 0v6h2v-6h-2z"/>
                </svg>
              </span>
              <div>
                <h3 className="font-semibold text-[#b65437]">Supabase Cloud</h3>
                <p className="mt-1 text-sm text-muted-foreground/90">
                  Secure auth, progress tracking, and reliable data—real-time and scalable.
                </p>
              </div>
            </div>
          </li>

          <li className="group rounded-xl p-4 ring-1 ring-[#b6543726] bg-white hover:bg-[#b6543710] transition">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#b6543715] text-[#b65437] ring-1 ring-[#b6543726]">
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4l8 4-8 4-8-4 8-4zm0 8l8 4-8 4-8-4 8-4z"/>
                </svg>
              </span>
              <div>
                <h3 className="font-semibold text-[#b65437]">Secure E-Books</h3>
                <p className="mt-1 text-sm text-muted-foreground/90">
                  Encrypted access and protected delivery for licensed learning content.
                </p>
              </div>
            </div>
          </li>

          <li className="group rounded-xl p-4 ring-1 ring-[#b6543726] bg-white hover:bg-[#b6543710] transition">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#b6543715] text-[#b65437] ring-1 ring-[#b6543726]">
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1l3 6 6 .5-4.5 4 1.3 6.5L12 15l-5.8 3.9L7.5 11 3 7.5 9 7z"/>
                </svg>
              </span>
              <div>
                <h3 className="font-semibold text-[#b65437]">CPPD Certificates + QR</h3>
                <p className="mt-1 text-sm text-muted-foreground/90">
                  Each certificate includes a unique ID and QR for instant verification.
                </p>
              </div>
            </div>
          </li>

          <li className="group rounded-xl p-4 ring-1 ring-[#b6543726] bg-white hover:bg-[#b6543710] transition">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#b6543715] text-[#b65437] ring-1 ring-[#b6543726]">
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 3h14v4H5zM3 9h18v12H3z"/>
                </svg>
              </span>
              <div>
                <h3 className="font-semibold text-[#b65437]">Interactive Exams</h3>
                <p className="mt-1 text-sm text-muted-foreground/90">
                  Auto-graded quizzes, instant feedback, and leaderboard-ready scoring.
                </p>
              </div>
            </div>
          </li>

          <li className="group rounded-xl p-4 ring-1 ring-[#b6543726] bg-white hover:bg-[#b6543710] transition">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#b6543715] text-[#b65437] ring-1 ring-[#b6543726]">
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 2h10v2H7V2zM4 6h16v14H4V6zm4 2v10h2V8H8zm6 0v10h2V8h-2z"/>
                </svg>
              </span>
              <div>
                <h3 className="font-semibold text-[#b65437]">Admin Intelligence</h3>
                <p className="mt-1 text-sm text-muted-foreground/90">
                  Live analytics for enrolments, outcomes, and content performance.
                </p>
              </div>
            </div>
          </li>

          <li className="group rounded-xl p-4 ring-1 ring-[#b6543726] bg-white hover:bg-[#b6543710] transition">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#b6543715] text-[#b65437] ring-1 ring-[#b6543726]">
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4a8 8 0 100 16 8 8 0 000-16zm1 5h4v2h-4v4h-2v-4H7V9h4V5h2v4z"/>
                </svg>
              </span>
              <div>
                <h3 className="font-semibold text-[#b65437]">Paystack-Native</h3>
                <p className="mt-1 text-sm text-muted-foreground/90">
                  Cards, bank transfers, and mobile money across Africa—seamless and secure.
                </p>
              </div>
            </div>
          </li>
        </ul>
      </section>

      {/* Mobile App Coming Soon */}
      <section className="mt-12 max-w-5xl">
        <div className="flex items-start gap-3">
          <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#b6543715] text-[#b65437] ring-1 ring-[#b6543726]">
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2zm5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
            </svg>
          </span>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-[#b65437]">Mobile App Coming Soon</h2>
            <p className="mt-2 max-w-3xl text-muted-foreground/90">
              Built with <strong>React + Capacitor</strong>, the KDS mobile app lets you enrol, learn, write
              quizzes, and download verified certificates—on the go and even offline—with secure cloud-synced progress.
            </p>
          </div>
        </div>
      </section>

      {/* PanAvest Link */}
      <section className="mt-12 max-w-5xl">
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

        <p className="mt-3 text-xs text-muted-foreground/90 max-w-3xl">
          KDS Learning and its CPPD pathways are part of PanAvest’s mission to advance ethical leadership,
          industrialisation, and value-chain excellence across Africa.
        </p>
      </section>
    </main>
  );
}
