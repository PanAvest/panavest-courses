"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

type Knowledge = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  level: string | null;
  price: number | null;
  cpd_points: number | null;
  img: string | null;
  accredited: string[] | null;
  published?: boolean | null;
};

const supabase: SupabaseClient | null =
  typeof window !== "undefined"
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
      )
    : null;

export default function KnowledgeDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [k, setK] = useState<Knowledge | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!supabase || !slug) return;

      const { data, error } = await supabase
        .from("courses")
        .select("id, slug, title, description, level, price, cpd_points, img, accredited, published")
        .eq("slug", String(slug))
        .eq("published", true)
        .maybeSingle();

      if (!mounted) return;

      if (error || !data) {
        setK(null);
        setLoading(false);
        return;
      }
      const row = data as Knowledge;
      setK(row);

      const { data: sessionRes } = await supabase.auth.getSession();
      const user = sessionRes?.session?.user;
      if (user) {
        const { data: exist } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("user_id", user.id)
          .eq("course_id", row.id)
          .maybeSingle();
        setEnrolled(Boolean(exist));
      }

      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [slug]);

  const accBadges = useMemo(() => {
    const list = (k?.accredited ?? []).map(String);
    const hasCPD = list.some((x) => /cpd|cppd/i.test(x));
    const hasNaCCA = list.some((x) => /nacca/i.test(x));
    return { hasCPD, hasNaCCA, list };
  }, [k]);

  async function handleEnroll() {
    if (!supabase || !k) return;
    setEnrolling(true);

    const { data: sessionRes } = await supabase.auth.getSession();
    const user = sessionRes?.session?.user;
    if (!user) { router.push("/auth/sign-in"); return; }

    const { data: exist } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("user_id", user.id)
      .eq("course_id", k.id)
      .maybeSingle();

    if (!exist) {
      await supabase.from("enrollments").insert({ user_id: user.id, course_id: k.id });
    }

    setEnrolling(false);
    setEnrolled(true);
    router.push("/dashboard");
  }

  if (loading) {
    return <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-12"><div className="text-muted">Loading knowledge…</div></div>;
  }

  if (!k) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold">Knowledge not found</h1>
        <p className="text-muted mt-2">The item may be unpublished or doesn’t exist.</p>
        <div className="mt-6">
          <Link className="rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)]" href="/courses">Back to knowledge</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid gap-8 md:grid-cols-2 items-start">
        <div className="relative rounded-2xl overflow-hidden ring-1 ring-[color:var(--color-light)] bg-white">
          <Image src={k.img || "/hero-illustration.png"} alt={k.title} width={1600} height={1200} className="w-full h-auto" sizes="(max-width: 768px) 100vw, 50vw" priority />
        </div>

        <div>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{k.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {accBadges.hasCPD && <span className="text-xs rounded-full px-2.5 py-1 bg-brand text-white">Certified CPD (CPPD)</span>}
            {accBadges.hasNaCCA && <span className="text-xs rounded-full px-2.5 py-1 ring-1 ring-[color:var(--color-light)]">Compendium credited by NaCCA</span>}
            {k.level && <span className="text-xs rounded-full px-2.5 py-1 ring-1 ring-[color:var(--color-light)]">Level: {k.level}</span>}
            {Number.isFinite(k.cpd_points ?? 0) && <span className="text-xs rounded-full px-2.5 py-1 ring-1 ring-[color:var(--color-light)]">{k.cpd_points ?? 0} CPPD pts</span>}
          </div>

          <div className="mt-5 flex items-center gap-4">
            {Number.isFinite(k.price ?? NaN) && (
              <div className="text-xl font-semibold">
                GH₵ {Number(k.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            )}
            {enrolled ? (
              <Link href="/dashboard" className="rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90">Go to Dashboard</Link>
            ) : (
              <button onClick={handleEnroll} disabled={enrolling} className="rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90 disabled:opacity-50">
                {enrolling ? "Enrolling…" : "Enroll"}
              </button>
            )}
          </div>

          <ul className="mt-6 space-y-2 text-sm text-ink/90">
            <li>• Knowledge development programme with verifiable certification</li>
            <li>• Practical assessments and real-world application</li>
            <li>• Industry-aligned learning outcomes</li>
          </ul>
        </div>
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <h2 className="text-xl font-semibold">About this knowledge</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink/90">{k.description ?? "No description available yet."}</p>
        </div>
        <aside className="md:col-span-1">
          <div className="rounded-2xl bg-white border border-light p-5">
            <div className="font-semibold">Accreditation</div>
            <ul className="mt-2 text-sm text-muted list-disc list-inside">
              {(k.accredited ?? []).length ? (k.accredited as string[]).map((a, i) => <li key={i}>{a}</li>) : <li>Details available on request</li>}
            </ul>
            <div className="mt-4 text-xs text-muted">
              PanAvest Supply Chain Compendium is the only one of its kind in the world, credited by NaCCA.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
