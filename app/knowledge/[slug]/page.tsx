// app/knowledge/[slug]/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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
  coming_soon?: boolean | null;
  delivery_mode?: string | null;
  interactive_path?: string | null;
  free_for_logged_in?: boolean | null;
};

type BundledEbook = { ebook_id: string; slug: string; title: string; cover_url: string | null };

function isMissingFreeColumnError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const rec = err as { code?: string; message?: string; details?: string; hint?: string };
  const text = `${rec.message ?? ""} ${rec.details ?? ""} ${rec.hint ?? ""}`.toLowerCase();
  if (!text.includes("free_for_logged_in")) return false;
  if (rec.code === "42703" || rec.code === "PGRST204") return true;
  return text.includes("does not exist") || text.includes("schema cache") || text.includes("could not find");
}

export default function CoursePreview() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [bundledEbooks, setBundledEbooks] = useState<BundledEbook[]>([]);

  // auth/enrollment state
  const [userId, setUserId] = useState<string | null>(null);
  const [paid, setPaid] = useState<boolean>(false);
  const [started, setStarted] = useState<boolean>(false);

  // 1) Load course (anon)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!slug) return;
      let c: Course | null = null;
      const primary = await supabase
        .from("courses")
        .select("id,slug,title,description,img,price,currency,cpd_points,published,coming_soon,delivery_mode,interactive_path,free_for_logged_in")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (!primary.error) {
        c = primary.data as Course | null;
      } else if (isMissingFreeColumnError(primary.error)) {
        const fallback = await supabase
          .from("courses")
          .select("id,slug,title,description,img,price,currency,cpd_points,published,coming_soon,delivery_mode,interactive_path")
          .eq("slug", slug)
          .eq("published", true)
          .maybeSingle();
        c = fallback.data as Course | null;
      }

      if (mounted) {
        setCourse(c ?? null);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [slug]);

  // 2) Load auth + enrollment/progress (needs course.id)
  useEffect(() => {
    let mounted = true;
    (async () => {
      // get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !course?.id) {
        if (mounted) {
          setUserId(null);
          setPaid(false);
          setStarted(false);
        }
        return;
      }

      if (mounted) setUserId(user.id);

      // Bundled ebooks (active links)
      try {
        const { data: links } = await supabase
          .from("program_ebook_links")
          .select("ebook_id,ebooks!inner(id,slug,title,cover_url)")
          .eq("course_id", course.id)
          .eq("active", true);

        if (mounted) {
          const mapped =
            (links ?? [])
              .map((row: { ebook_id: string; ebooks: { id: string; slug: string; title: string; cover_url: string | null }[] }) => {
                const e = Array.isArray(row.ebooks) ? row.ebooks[0] : (row.ebooks as unknown as { id?: string; slug?: string; title?: string; cover_url?: string | null } | undefined);
                const id = row.ebook_id || e?.id;
                if (!e || !id || !e.slug || !e.title) return null;
                return { ebook_id: id, slug: e.slug, title: e.title, cover_url: e.cover_url ?? null } as BundledEbook;
              })
              .filter(Boolean) as BundledEbook[] || [];
          setBundledEbooks(mapped);
        }
      } catch {
        if (mounted) setBundledEbooks([]);
      }

      // enrollment (is it paid?)
      const { data: enr } = await supabase
        .from("enrollments")
        .select("paid")
        .eq("user_id", user.id)
        .eq("course_id", course.id)
        .maybeSingle();

      if (mounted) setPaid(Boolean(enr?.paid));

      // progress: have they started any slide yet?
      const { data: prog } = await supabase
        .from("user_slide_progress")
        .select("slide_id")
        .eq("user_id", user.id)
        .eq("course_id", course.id)
        .limit(1);

      if (mounted) setStarted((prog?.length ?? 0) > 0);
    })();
    return () => { mounted = false; };
  }, [course?.id]);

  if (loading) {
    return <div className="mx-auto max-w-screen-lg px-4 py-10">Loading…</div>;
  }

  if (!course) {
    return <div className="mx-auto max-w-screen-lg px-4 py-10">Course not found.</div>;
  }

  const priceLabel = Number(course.price ?? 0).toFixed(2);
  const currency = course.currency || "GHS";
  const freeWithLogin = course.free_for_logged_in === true;
  const hasAccess = paid || freeWithLogin;

  // Button logic
  const showEnroll = Boolean(userId) && !hasAccess; // hide if paid or free-with-login
  const primaryPaidText = started ? "Continue Learning" : "Start Course";
  const dashboardHref = `/knowledge/${course.slug}/dashboard`;
  const enrollHref = `/knowledge/${course.slug}/enroll`;

  return (
    <div className="mx-auto max-w-screen-xl px-4 md:px-6 py-10">
      <div className="grid gap-6 md:grid-cols-[1fr_380px]">
        {/* Left: hero + description */}
        <div className="rounded-xl bg-white border border-[color:var(--color-light)]/40 shadow-sm transition-shadow duration-200 hover:shadow-md overflow-hidden">
          <Image
            src={course.img || "/project-management.png"}
            alt={course.title}
            width={1600}
            height={900}
            className="w-full h-auto"
            priority
          />
          <div className="p-5">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{course.title}</h1>
              {course.coming_soon ? (
                <span className="inline-flex items-center rounded-full bg-orange-100 text-orange-700 px-3 py-1 text-xs font-semibold">
                  Coming soon
                </span>
              ) : null}
            </div>
            {course.description && (
              <p className="mt-2 text-muted whitespace-pre-wrap">{course.description}</p>
            )}
          </div>
        </div>

        {/* Right: pricing + actions */}
        <aside className="rounded-xl bg-white border border-[color:var(--color-light)]/40 shadow-sm transition-shadow duration-200 hover:shadow-md p-5 h-max">
          <div className="text-lg">
            {freeWithLogin ? (
              <span className="font-semibold text-[#0a1156]">Free with login</span>
            ) : (
              <span className="font-semibold">
                {currency} {priceLabel}
              </span>
            )}
            <span className="ml-2 text-muted">· {course.cpd_points ?? 0} CPPD</span>
          </div>

          {bundledEbooks.length > 0 && (
            <div className="mt-4 rounded-xl bg-[color:var(--color-light)]/30 border border-[color:var(--color-light)]/40 p-3 shadow-sm">
              <div className="text-xs font-semibold text-[#0a1156] uppercase tracking-wide">Includes e-book</div>
              <div className="mt-2 grid gap-2">
                {bundledEbooks.map((b) => (
                  <Link
                    key={b.ebook_id}
                    href={`/ebooks/${b.slug}`}
                    className="flex items-center gap-3 rounded-xl bg-white border border-[color:var(--color-light)]/40 px-3 py-2 shadow-sm transition-shadow duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                  >
                    <div className="h-12 w-10 rounded-md bg-white overflow-hidden border border-[color:var(--color-light)]/40 shadow-sm">
                      {b.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.cover_url} alt={b.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[10px] text-muted">E-book</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold leading-tight">{b.title}</div>
                      <div className="text-[11px] text-muted truncate">Tap to view details</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-2">
            {/* Coming soon => disable enrollment/continuation */}
            {course.coming_soon ? (
              <div className="inline-flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 px-4 py-2 font-semibold">
                Coming soon – enrollment not yet open
              </div>
            ) : (
              <>
                {/* Not logged in => ask to sign in to enroll */}
                {!userId && (
                  <>
                    <Link
                      href={`/auth/sign-in?redirect=${encodeURIComponent(`/knowledge/${course.slug}`)}`}
                      className="inline-flex items-center justify-center rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90"
                    >
                      {freeWithLogin ? "Sign in to start" : "Sign in to enroll"}
                    </Link>
                    <Link
                      href={dashboardHref}
                      className="inline-flex items-center justify-center rounded-xl px-4 py-2 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                    >
                      Go to Dashboard
                    </Link>
                  </>
                )}

                {/* Logged in + NOT paid => show both Enroll and Dashboard */}
                {userId && showEnroll && (
                  <>
                    <Link
                      href={enrollHref}
                      className="inline-flex items-center justify-center rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90"
                    >
                      Enroll (Mobile Money/Card)
                    </Link>
                    <Link
                      href={dashboardHref}
                      className="inline-flex items-center justify-center rounded-xl px-4 py-2 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                    >
                      Go to Dashboard
                    </Link>
                  </>
                )}

                {/* Logged in + access granted (paid or free-with-login) */}
                {userId && !showEnroll && (
                  <Link
                    href={dashboardHref}
                    className="inline-flex items-center justify-center rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90"
                  >
                    {primaryPaidText}
                  </Link>
                )}
              </>
            )}

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
