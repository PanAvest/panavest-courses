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
      {/* HERO (wide, bigger artwork) */}
      <section className="py-10 sm:py-16">
        <div className="mx-auto max-w-screen-2xl px-6 md:px-8 2xl:px-10 grid gap-10 md:grid-cols-2 items-center">
          <div>
            <h1 className="text-[36px] sm:text-[56px] leading-[1.05] font-bold">
              Unlock your potential
            </h1>
            <p className="mt-4 text-[16px] sm:text-[17px] text-muted max-w-prose">
              Develop new skills and advance your career with our diverse range of courses.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/courses"
                className="rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90"
              >
                Join Now
              </Link>
              <Link
                href="/auth/sign-up"
                className="rounded-lg px-5 py-3 ring-1 ring-[color:var(--color-light)] bg-white hover:bg-[color:var(--color-light)]/30"
              >
                Sign Up
              </Link>
            </div>
          </div>

          {/* Larger, illustrative hero image */}
          <div className="relative">
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

      {/* FEATURED (2 cols, larger images, lighter stroke) */}
      <section className="pb-16">
        <div className="mx-auto max-w-screen-2xl px-6 md:px-8 2xl:px-10">
          <h2 className="text-2xl sm:text-3xl font-bold">Featured Courses</h2>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {cards.map((c) => (
          <Link
  key={c.slug}
  href={`/courses/${c.slug}`}
  className="group rounded-2xl bg-white border border-light hover:shadow-sm transition overflow-hidden"
>
  {/* Lighter stroke under the image and no cropping */}
  <div className="border-b border-light bg-white">
    <Image
      src={c.img}
      alt={c.title}
      width={1600}
      height={1200}
      className="w-full h-auto"   // object-contain behavior with fixed aspect
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
    </>
  );
}
