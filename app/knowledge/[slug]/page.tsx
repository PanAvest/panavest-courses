"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

type Course = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  level: string | null;
  price: number | null;
  cpd_points: number | null;
  img: string | null;
};

type CtaState = "loading" | "signed_out" | "paid" | "unpaid";

export default function KnowledgePage() {
  const params = useParams<{ slug: string }>();
  const slug = useMemo(() => (params?.slug ? String(params.slug) : ""), [params]);

  const [course, setCourse] = useState<Course | null>(null);
  const [isFetchingCourse, setIsFetchingCourse] = useState(true);
  const [cta, setCta] = useState<CtaState>("loading");

  /** Load course once the slug is available */
  useEffect(() => {
    let mounted = true;
    if (!slug) return; // wait until slug is present

    (async () => {
      setIsFetchingCourse(true);
      const { data /*, error*/ } = await supabase
        .from("courses")
        .select("id,slug,title,description,level,price,cpd_points,img")
        .eq("slug", slug)
        .maybeSingle();

      if (!mounted) return;
      setCourse(data ?? null);
      setIsFetchingCourse(false);
    })();

    return () => {
      mounted = false;
    };
  }, [slug]);

  /** Decide CTA based on auth + enrollment; also react to auth changes */
  useEffect(() => {
    let mounted = true;
    if (!course) return;

    const computeCta = async () => {
      setCta("loading");

      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;

      if (!user) {
        setCta("signed_out");
        return;
      }

      const { data: enr } = await supabase
        .from("enrollments")
        .select("paid")
        .eq("user_id", user.id)
        .eq("course_id", course.id)
        .maybeSingle();

      if (!mounted) return;
      setCta(enr?.paid ? "paid" : "unpaid");
    };

    computeCta();

    // live update when user logs in/out
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      computeCta();
    });

    return () => {
      mounted = false;
      sub.subscription?.unsubscribe();
    };
  }, [course]);

  /* ---------- UI helpers ---------- */

  const PriceBadge = ({ price }: { price: number | null }) => (
    <span className="px-2 py-1 rounded-lg bg-white ring-1 ring-[color:var(--color-light)]">
      GH₵ {(price ?? 0).toFixed(2)}
    </span>
  );

  const Skeleton = () => (
    <div className="animate-pulse">
      <div className="h-8 w-64 bg-[color:var(--color-light)] rounded-lg" />
      <div className="mt-3 h-4 w-96 bg-[color:var(--color-light)] rounded" />
      <div className="mt-2 h-4 w-72 bg-[color:var(--color-light)] rounded" />
      <div className="mt-6 flex gap-2">
        <div className="h-9 w-28 bg-[color:var(--color-light)] rounded-lg" />
        <div className="h-9 w-24 bg-[color:var(--color-light)] rounded-lg" />
      </div>
    </div>
  );

  /* ---------- CTA buttons ---------- */
  const renderCTA = () => {
    if (cta === "loading") {
      return (
        <button
          disabled
          className="rounded-lg bg-brand text-white px-5 py-3 font-semibold opacity-70 cursor-wait"
        >
          Checking…
        </button>
      );
    }

    if (cta === "signed_out") {
      const redirect = encodeURIComponent(`/knowledge/${course!.slug}`);
      return (
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/auth/sign-in?redirect=${redirect}`}
            className="rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90"
          >
            Sign in to Enroll
          </Link>
          <Link
            href={`/auth/sign-up?redirect=${redirect}`}
            className="rounded-lg px-5 py-3 ring-1 ring-[color:var(--color-light)] bg-white hover:bg-[color:var(--color-light)]/30"
          >
            Create account
          </Link>
        </div>
      );
    }

    if (cta === "paid") {
      return (
        <Link
          href={`/knowledge/${course!.slug}/dashboard`}
          className="rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90"
        >
          Resume
        </Link>
      );
    }

    // unpaid
    return (
      <Link
        href={`/knowledge/${course!.slug}/enroll`}
        className="rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90"
      >
        Enroll to Begin
      </Link>
    );
  };

  /* ---------- Render ---------- */

  if (isFetchingCourse) {
    return (
      <main className="w-full px-4 md:px-6 py-10">
        <div className="mx-auto max-w-screen-lg grid gap-8 md:grid-cols-5">
          <div className="md:col-span-3"><Skeleton /></div>
          <div className="md:col-span-2">
            <div className="rounded-2xl overflow-hidden bg-white border border-light aspect-[4/3]" />
          </div>
        </div>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="w-full px-4 md:px-6 py-10">
        <div className="mx-auto max-w-screen-sm">
          <div className="rounded-xl border border-light bg-white p-6">
            <div className="text-lg font-semibold">Course not found</div>
            <p className="mt-2 text-sm text-muted">
              The course you’re looking for doesn’t exist or has been moved.
            </p>
            <Link href="/" className="mt-4 inline-block rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)] bg-white hover:bg-[color:var(--color-light)]/30">
              Back to home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-4 md:px-6 py-8 md:py-10">
      <div className="mx-auto max-w-screen-lg grid gap-8 md:grid-cols-5">
        {/* Left column: text & CTA */}
        <div className="md:col-span-3">
          <h1 className="text-3xl sm:text-4xl font-bold">{course.title}</h1>

          <p className="mt-3 text-[15px] text-muted">
            {course.description ?? "No description yet."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {course.level && (
              <span className="px-2 py-1 rounded-lg bg-white ring-1 ring-[color:var(--color-light)]">
                Level: {course.level}
              </span>
            )}
            {typeof course.cpd_points === "number" && (
              <span className="px-2 py-1 rounded-lg bg-white ring-1 ring-[color:var(--color-light)]">
                {course.cpd_points} CPPD
              </span>
            )}
            <PriceBadge price={course.price} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3 items-center">
            {renderCTA()}
            <Link
              href="/"
              className="rounded-lg px-5 py-3 ring-1 ring-[color:var(--color-light)] bg-white hover:bg-[color:var(--color-light)]/30"
            >
              Back
            </Link>
          </div>
        </div>

        {/* Right column: image */}
        <div className="md:col-span-2">
          <div className="rounded-2xl overflow-hidden bg-white border border-light">
            {course.img ? (
              <Image
                src={course.img}
                alt={course.title}
                width={1200}
                height={900}
                priority={false}
                className="w-full h-auto"
                sizes="(max-width: 768px) 100vw, 40vw"
                unoptimized={Boolean(course.img && course.img.startsWith("http"))}
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
