// app/knowledge/[slug]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type Course = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  img: string | null;
  price: number | null;
  currency: string | null;
  cpd_points: number | null;
  published: boolean | null;
};

export default async function CoursePreview({
  params,
}: {
  params: { slug: string };
}) {
  const { data: c, error } = await supabase
    .from("courses")
    .select("id,slug,title,description,img,price,currency,cpd_points,published")
    .eq("slug", params.slug)
    .maybeSingle();

  if (error || !c || !c.published) {
    notFound();
  }

  const currency = c.currency || "GHS";
  const amount = Number(c.price ?? 0);
  const price = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

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
              <p className="mt-2 text-muted whitespace-pre-wrap">
                {c.description}
              </p>
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
            {/* Primary action: Enroll (Paystack flow) */}
            <Link
              href={`/knowledge/${c.slug}/enroll`}
              className="inline-flex items-center justify-center rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90"
            >
              Enroll with Paystack
            </Link>

            {/* Secondary: Dashboard. If not paid, your dashboard page will redirect to /enroll */}
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

          <p className="mt-3 text-xs text-muted">
            Already purchased? Use “Go to Dashboard”. If you’re not paid, the
            dashboard will send you back to enrollment.
          </p>
        </aside>
      </div>
    </div>
  );
}
