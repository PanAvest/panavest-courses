import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  const cards = [
    { slug: "leadership-development", title: "Leadership Development", img: "/leadership-development.png", reviews: 1200 },
    { slug: "data-analysis-python", title: "Data Analysis with Python", img: "/data-analysis-with-python.png", reviews: 891 },
    { slug: "intro-marketing", title: "Introduction to Marketing", img: "/introduction-to-marketing.png", reviews: 753 },
    { slug: "project-management-essentials", title: "Project Management Essentials", img: "/project-management.png", reviews: 612 },
  ];

  return (
    <>
      {/* HERO: bigger headline (2 lines), more content, removed "Sign Up" */}
      <section className="py-10 sm:py-16">
        <div className="w-full px-4 md:px-6 grid gap-8 md:grid-cols-2 items-center">
          <div className="animate-fade-up">
            <h1 className="font-bold leading-[1.02] text-[44px] sm:text-[68px]">
              Unlock your
              <br className="hidden sm:block" />
              potential
            </h1>
            <p className="mt-4 text-[16px] sm:text-[18px] text-muted max-w-2xl">
              Certified CPD (CPPD) courses and practical learning pathways for
              modern professionals. Learn with PanAvest through industry-aligned
              modules, assessments, and verifiable certificates.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/courses"
                className="rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90 animate-float"
              >
                Explore Courses
              </Link>
              <Link
                href="/leaderboard"
                className="rounded-lg px-5 py-3 ring-1 ring-[color:var(--color-light)] bg-white hover:bg-[color:var(--color-light)]/30"
              >
                Leaderboard
              </Link>
            </div>
          </div>

          <div className="relative animate-fade-up [animation-delay:120ms]">
            <Image
              src="/hero-illustration.png"
              alt="Learning illustration"
              width={1600}
              height={1200}
              priority
              className="h-auto w-full"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      {/* WHAT WE DO (5 items with icons) */}
      <section className="py-10">
        <div className="w-full px-4 md:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold">What we do</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { emoji: "🎓", title: "Certified CPD (CPPD)", text: "Professional courses with verifiable certificates." },
              { emoji: "🧪", title: "Assessments", text: "Rigorous evaluations that prove capability." },
              { emoji: "🏢", title: "Corporate Training", text: "Tailored programs delivered to teams." },
              { emoji: "📈", title: "Career Acceleration", text: "Job-ready, practical skill-building." },
              { emoji: "📚", title: "Research & Publications", text: "Supply Chain Compendium credited by NaCCA." },
            ].map((i) => (
              <div key={i.title} className="rounded-2xl bg-white/70 border border-light p-5 hover:shadow-sm transition animate-fade-up">
                <div className="text-3xl">{i.emoji}</div>
                <div className="mt-3 font-semibold">{i.title}</div>
                <p className="mt-1 text-sm text-muted">{i.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY YOU NEED US */}
      <section className="py-6">
        <div className="w-full px-4 md:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold">Why you need us</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Recognized certification", text: "All courses are certified CPD (CPPD) with verifiable outcomes." },
              { title: "Practical & applied", text: "Industry-aligned curriculum built around real scenarios." },
              { title: "Unique authority", text: "PanAvest Supply Chain Compendium—only of its kind in the world, credited by NaCCA." },
            ].map((b) => (
              <div key={b.title} className="rounded-2xl bg-white/70 border border-light p-5 animate-fade-up">
                <div className="font-semibold">{b.title}</div>
                <p className="mt-2 text-sm text-muted">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED (smaller images than before) */}
      <section className="py-8">
        <div className="w-full px-4 md:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold">Featured Courses</h2>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {cards.map((c) => (
              <Link
                key={c.slug}
                href={`/courses/${c.slug}`}
                className="group rounded-2xl bg-white border border-light hover:shadow-sm transition overflow-hidden animate-fade-up"
              >
                {/* Reduced visual height */}
                <div className="border-b border-light bg-white">
                  <Image
                    src={c.img}
                    alt={c.title}
                    width={1200}
                    height={900}
                    className="w-full h-auto"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority={false}
                  />
                </div>

                <div className="px-5 py-4">
                  <h3 className="font-semibold text-lg text-ink group-hover:text-brand">{c.title}</h3>
                  <div className="mt-2 flex items-center gap-2 text-[13px] text-muted">
                    <span aria-hidden>⭐️⭐️⭐️⭐️⭐️</span>
                    <span>{c.reviews.toLocaleString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS (3 in a row on desktop) */}
      <section className="py-12">
        <div className="w-full px-4 md:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold">What learners say</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {[
              { name: "Amina K.", role: "Operations Analyst", quote: "PanAvest’s CPPD course gave me the structure and confidence to lead real projects." },
              { name: "Kwame O.", role: "Supply Chain Lead", quote: "The assessments are tough but fair. The certificate is respected by my employer." },
              { name: "Jason T.", role: "Data Associate", quote: "Practical, modern, and easy to apply at work the next day." },
            ].map((t, idx) => (
              <div key={idx} className="rounded-2xl bg-white/70 border border-light p-5 animate-fade-up">
                <div className="flex items-center gap-3">
                  {/* Avatar placeholder (swap with /public/profile-*.png if you have real photos) */}
                  <div className="h-12 w-12 rounded-full bg-[color:var(--color-light)] flex items-center justify-center text-ink/80 font-semibold">
                    {t.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-xs text-muted">{t.role}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-ink/90 leading-relaxed">“{t.quote}”</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
