import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default async function KnowledgeDetail({ params }: { params: { slug: string } }) {
  const { data: course } = await supabase
    .from("courses")
    .select("id,slug,title,description,level,price,cpd_points,img,accredited,published")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!course || course.published === false) return notFound();

  const { data: chapters } = await supabase
    .from("course_chapters")
    .select("id,title,position,intro_video_url,summary")
    .eq("course_id", course.id)
    .order("position", { ascending: true });

  return (
    <div className="mx-auto max-w-screen-2xl px-4 md:px-6 py-10">
      <div className="grid gap-8 md:grid-cols-2 items-start">
        <div>
          <Image
            src={course.img || "/project-management.png"}
            alt={course.title}
            width={1600}
            height={1200}
            className="w-full h-auto rounded-2xl border border-light"
            priority
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{course.title}</h1>
          <p className="mt-2 text-muted">{course.description}</p>
          <div className="mt-3 text-sm text-ink/80">
            <div>Level: <span className="font-medium">{course.level ?? "—"}</span></div>
            <div>CPPD Points: <span className="font-medium">{course.cpd_points ?? 0}</span></div>
            <div>Accredited: <span className="font-medium">{(course.accredited ?? []).join(", ") || "—"}</span></div>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <Link href={`/knowledge/${course.slug}/enroll`} className="rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90">
              Enroll & Pay (Mock)
            </Link>
            <div className="text-sm">GH₵{Number(course.price ?? 0).toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-semibold">What to expect</h2>
        <p className="text-sm text-muted mt-1">
          Structured chapters with intro videos and slides. Progress is tracked; complete slides to unlock your certificate.
        </p>
        <div className="mt-4 grid gap-4">
          {(chapters ?? []).map((ch) => (
            <div key={ch.id} className="rounded-2xl bg-white border border-light p-5">
              <div className="font-semibold">{ch.title}</div>
              <div className="text-sm text-muted mt-1">{ch.summary || "—"}</div>
              {ch.intro_video_url && (
                <video className="mt-3 w-full rounded-lg" controls preload="metadata" src={ch.intro_video_url} />
              )}
            </div>
          ))}
          {(chapters ?? []).length === 0 && <div className="text-muted text-sm">Content coming soon.</div>}
        </div>
      </div>
    </div>
  );
}
