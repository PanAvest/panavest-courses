// app/knowledge/[slug]/page.tsx
import "server-only";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default async function CoursePreview({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Use anon client like your index page
  const { data: c, error } = await supabase
    .from("courses")
    .select(
      "id,slug,title,description,img,price,currency,cpd_points,published"
    )
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error || !c) {
    return (
      <div className="mx-auto max-w-screen-lg px-4 py-10">
        Course not found.
      </div>
    );
  }

  const price = Number(c.price ?? 0).toFixed(2);
  const currency = c.currency || "GHS";

  return (
    <div className="mx-auto max-w-screen-xl px-4 md:px-6 py-10">
      <div className="grid gap-6 md:grid-cols-[1fr_380px]">
        {/* Left: hero + description */}
        <div className="rounded-2xl bg-white border border-light overflow-hidden">
          <Image
            src={c.img || "/project-management.png"}
            alt={c.title}
            width={1600}
            height={900}
            className="w-full h-auto"
            priority
          />
          <div className="p-5">
            <h1 className="text-2xl font-bold">{c.title}</h1>
            {c.description && (
              <p className="mt-2 text-muted whitespace-pre-wrap">{c.description}</p>
            )}
          </div>
        </div>

        {/* Right: pricing + actions */}
        <aside className="rounded-2xl bg-white border border-light p-5 h-max">
          <div className="text-lg">
            <span className="font-semibold">
              {currency} {price}
            </span>
            <span className="ml-2 text-muted">· {c.cpd_points ?? 0} CPPD</span>
          </div>

          <div className="mt-4 grid gap-2">
            <Link
              href={`/knowledge/${c.slug}/enroll`}
              className="inline-flex items-center justify-center rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90"
            >
              Enroll with Paystack
            </Link>

            <Link
              href={`/knowledge/${c.slug}/dashboard`}
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)] hover:bg-[color:var(--color-light)]/50"
            >
              Go to Dashboard
            </Link>

            <Link
              href="/knowledge"
              className="text-xs text-muted underline justify-self-center mt-1"
            >
              Back to all courses
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
