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
};

export default function CoursePreview() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);

  // auth/enrollment state
  const [userId, setUserId] = useState<string | null>(null);
  const [paid, setPaid] = useState<boolean>(false);
  const [started, setStarted] = useState<boolean>(false);

  // 1) Load course (anon)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!slug) return;
      const { data: c } = await supabase
        .from("courses")
        .select("id,slug,title,description,img,price,currency,cpd_points,published")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();

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

  // Button logic
  const showEnroll = Boolean(userId) && !paid;                // hide if paid
  const primaryPaidText = started ? "Continue Course" : "Start Course";
  const dashboardHref = `/knowledge/${course.slug}/dashboard`;
  const enrollHref = `/knowledge/${course.slug}/enroll`;

  return (
    <div className="mx-auto max-w-screen-xl px-4 md:px-6 py-10">
      <div className="grid gap-6 md:grid-cols-[1fr_380px]">
        {/* Left: hero + description */}
        <div className="rounded-2xl bg-white border border-light overflow-hidden">
          <Image
            src={course.img || "/project-management.png"}
            alt={course.title}
            width={1600}
            height={900}
            className="w-full h-auto"
            priority
          />
          <div className="p-5">
            <h1 className="text-2xl font-bold">{course.title}</h1>
            {course.description && (
              <p className="mt-2 text-muted whitespace-pre-wrap">{course.description}</p>
            )}
          </div>
        </div>

        {/* Right: pricing + actions */}
        <aside className="rounded-2xl bg-white border border-light p-5 h-max">
          <div className="text-lg">
            <span className="font-semibold">
              {currency} {priceLabel}
            </span>
            <span className="ml-2 text-muted">· {course.cpd_points ?? 0} CPPD</span>
          </div>

          <div className="mt-4 grid gap-2">
            {/* Not logged in => ask to sign in to enroll */}
            {!userId && (
              <>
                <Link
                  href="/auth/sign-in"
                  className="inline-flex items-center justify-center rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90"
                >
                  Sign in to enroll
                </Link>
                <Link
                  href={dashboardHref}
                  className="inline-flex items-center justify-center rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)] hover:bg-[color:var(--color-light)]/50"
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
                  Enroll with Paystack
                </Link>
                <Link
                  href={dashboardHref}
                  className="inline-flex items-center justify-center rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)] hover:bg-[color:var(--color-light)]/50"
                >
                  Go to Dashboard
                </Link>
              </>
            )}

            {/* Logged in + PAID => only show Start/Continue */}
            {userId && !showEnroll && (
              <Link
                href={dashboardHref}
                className="inline-flex items-center justify-center rounded-lg bg-[#0a1156] text-white px-4 py-2 font-semibold hover:opacity-90"
              >
                {primaryPaidText}
              </Link>
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
