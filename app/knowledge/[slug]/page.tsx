import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import EnrollCTA from "./EnrollCTA";

/** Next 15: params is a Promise */
export default async function KnowledgePage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data, error } = await supabase
    .from("courses")
    .select("id,slug,title,description,level,price,cpd_points,img")
    .eq("slug", slug)
    .maybeSingle();

  if (error) notFound();
  if (!data) notFound();

  return (
    <main className="w-full px-4 md:px-6 py-10">
      <div className="mx-auto max-w-screen-lg grid gap-8 md:grid-cols-5">
        <div className="md:col-span-3">
          <h1 className="text-3xl sm:text-4xl font-bold">{data.title}</h1>
          <p className="mt-3 text-[15px] text-muted">
            {data.description ?? "No description yet."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {data.level && (
              <span className="px-2 py-1 rounded-lg bg-white ring-1 ring-[color:var(--color-light)]">
                Level: {data.level}
              </span>
            )}
            {typeof data.cpd_points === "number" && (
              <span className="px-2 py-1 rounded-lg bg-white ring-1 ring-[color:var(--color-light)]">
                {data.cpd_points} CPPD
              </span>
            )}
            {typeof data.price === "number" && (
              <span className="px-2 py-1 rounded-lg bg-white ring-1 ring-[color:var(--color-light)]">
                GH₵ {data.price.toFixed(2)}
              </span>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <EnrollCTA courseId={data.id} slug={data.slug} />
            <Link
              href="/"
              className="rounded-lg px-5 py-3 ring-1 ring-[color:var(--color-light)] bg-white hover:bg-[color:var(--color-light)]/30"
            >
              Back
            </Link>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="rounded-2xl overflow-hidden bg-white border border-light">
            {data.img ? (
              <Image
                src={data.img}
                alt={data.title}
                width={1200}
                height={900}
                className="w-full h-auto"
                sizes="(max-width: 768px) 100vw, 40vw"
                priority={false}
                unoptimized={data.img.startsWith("http")}
              />
            ) : (
              <div className="aspect-[4/3] w-full bg-[color:var(--color-light)]" />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
