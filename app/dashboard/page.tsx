"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

/** ===== Domain Types ===== */
type UserSummary = { id: string; email: string; full_name?: string | null };

type EnrollmentsSelect = {
  progress_pct: number | null;
  course_id: string;
  courses: {
    title: string;
    slug: string;
    img: string | null;
    cpd_points: number | null;
  } | null;
};

type EnrolledCourse = {
  course_id: string;
  title: string;
  slug: string;
  img: string | null;
  cpd_points: number | null;
  progress_pct: number; // 0..100
};

type AssessmentsDueRow = {
  id: string;
  user_id: string;
  title: string;
  due_at: string;
  status: "due" | "submitted" | "graded" | null;
  course_slug: string;
  course_title: string;
};

type AssessmentDue = {
  id: string;
  course_slug: string;
  course_title: string;
  title: string;
  due_at: string;
  status: "due" | "submitted" | "graded";
};

type CertificateRow = {
  id: string;
  course_title: string;
  issued_at: string;
  url: string;
};

type Announcement = { id: string; title: string; body: string; created_at: string };

/** ===== Supabase client (browser only) ===== */
const supabase: SupabaseClient | null =
  typeof window !== "undefined"
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
      )
    : null;

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<UserSummary | null>(null);
  const [enrolled, setEnrolled] = useState<EnrolledCourse[]>([]);
  const [assessments, setAssessments] = useState<AssessmentDue[]>([]);
  const [certs, setCerts] = useState<CertificateRow[]>([]);
  const [ann, setAnn] = useState<Announcement[]>([]);

  const stats = useMemo(() => {
    const coursesInProgress = enrolled.length;
    const cpdEarned = Math.round(
      enrolled.reduce((sum, c) => sum + (c.cpd_points ?? 0) * (c.progress_pct / 100), 0)
    );
    const certCount = certs.length;
    return { coursesInProgress, cpdEarned, certCount };
  }, [enrolled, certs]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!supabase) return;

      const { data: sessionRes } = await supabase.auth.getSession();
      const user = sessionRes?.session?.user;
      if (!user) {
        router.replace("/auth/sign-in");
        return;
      }

      const profile: UserSummary = {
        id: user.id,
        email: user.email ?? "",
        full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
      };

      // Enrollments + joined courses
      const { data: enrData } = await supabase
        .from("enrollments")
        .select("progress_pct, course_id, courses:courses!inner(title, slug, img, cpd_points)")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      const enrRows = (enrData ?? []) as EnrollmentsSelect[];
      const enrolledRows: EnrolledCourse[] = enrRows.map((r) => ({
        course_id: r.course_id,
        progress_pct: Number(r.progress_pct ?? 0),
        title: r.courses?.title ?? "Course",
        slug: r.courses?.slug ?? "",
        img: r.courses?.img ?? null,
        cpd_points: r.courses?.cpd_points ?? null,
      }));

      // Upcoming assessments (view)
      const { data: dueData } = await supabase
        .from("assessments_due_view")
        .select("*")
        .eq("user_id", user.id)
        .lte("due_at", new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString())
        .order("due_at", { ascending: true });

      const dueRows = (dueData ?? []) as AssessmentsDueRow[];
      const upcoming: AssessmentDue[] = dueRows.map((r) => ({
        id: String(r.id),
        course_slug: r.course_slug,
        course_title: r.course_title,
        title: r.title,
        due_at: r.due_at,
        status: (r.status ?? "due") as AssessmentDue["status"],
      }));

      // Certificates
      const { data: certData } = await supabase
        .from("certificates")
        .select("id, course_title, issued_at, url")
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false });

      const certRows = (certData ?? []) as CertificateRow[];

      // Announcements
      const { data: annData } = await supabase
        .from("announcements")
        .select("id, title, body, created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      if (!mounted) return;
      setMe(profile);
      setEnrolled(enrolledRows);
      setAssessments(upcoming);
      setCerts(certRows);
      setAnn((annData ?? []) as Announcement[]);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="animate-fade-up text-muted">Loading your dashboard…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Greeting + quick stats */}
      <section className="animate-fade-up">
        <h1 className="text-2xl sm:text-3xl font-bold">
          Welcome{me?.full_name ? `, ${me.full_name}` : ""} 👋
        </h1>
        <p className="text-muted mt-1">Track your certified CPD (CPPD) progress, assessments and certificates.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="CPPD credits earned" value={stats.cpdEarned} suffix="pts" />
          <StatCard label="Courses in progress" value={stats.coursesInProgress} />
          <StatCard label="Certificates" value={stats.certCount} />
        </div>
      </section>

      {/* Continue learning */}
      <section className="animate-fade-up">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Continue learning</h2>
          <Link href="/courses" className="text-sm text-muted hover:text-ink">Browse all</Link>
        </div>
        {enrolled.length === 0 ? (
          <EmptyCard text="You haven’t enrolled yet. Explore our programs to get started." ctaHref="/courses" ctaLabel="Explore courses" />
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {enrolled.map((c) => (
              <div key={c.course_id} className="rounded-2xl bg-white border border-light p-4 flex gap-4">
                <div className="relative h-20 w-28 shrink-0 rounded-lg overflow-hidden ring-1 ring-[color:var(--color-light)] bg-white">
                  <Image src={c.img || "/next.svg"} alt={c.title} fill className="object-contain p-2" sizes="112px" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/courses/${c.slug}`} className="font-semibold hover:text-brand line-clamp-1">
                    {c.title}
                  </Link>
                  <div className="mt-2 h-2 w-full rounded-full bg-[color:var(--color-light)]/60">
                    <div className="h-2 rounded-full bg-brand" style={{ width: `${Math.min(100, Math.max(0, c.progress_pct))}%` }} />
                  </div>
                  <div className="mt-1 text-xs text-muted">{Math.round(c.progress_pct)}% complete · {c.cpd_points ?? 0} CPPD pts</div>
                  <div className="mt-3">
                    <Link href={`/courses/${c.slug}`} className="text-sm rounded-lg px-3 py-1.5 bg-brand text-white hover:opacity-90">
                      Resume
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming assessments + Announcements */}
      <section className="grid gap-6 md:grid-cols-2">
        <div className="animate-fade-up">
          <h2 className="text-xl font-semibold">Upcoming assessments</h2>
          {assessments.length === 0 ? (
            <EmptyCard text="No assessments due soon." />
          ) : (
            <ul className="mt-3 space-y-3">
              {assessments.slice(0, 5).map((a) => (
                <li key={a.id} className="rounded-xl border border-light bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium line-clamp-1">{a.title}</div>
                      <div className="text-xs text-muted line-clamp-1">{a.course_title}</div>
                    </div>
                    <span className="text-xs rounded-full px-2 py-1 ring-1 ring-[color:var(--color-light)]">
                      {new Date(a.due_at).toLocaleDateString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="animate-fade-up">
          <h2 className="text-xl font-semibold">Announcements</h2>
          {ann.length === 0 ? (
            <EmptyCard text="No announcements right now." />
          ) : (
            <ul className="mt-3 space-y-3">
              {ann.map((n) => (
                <li key={n.id} className="rounded-xl border border-light bg-white p-4">
                  <div className="font-medium">{n.title}</div>
                  <p className="text-sm text-muted mt-1">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Certificates */}
      <section className="animate-fade-up">
        <h2 className="text-xl font-semibold">Certificates</h2>
        {certs.length === 0 ? (
          <EmptyCard text="You don’t have certificates yet." />
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {certs.map((c) => (
              <a
                key={c.id}
                href={c.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-light bg-white p-4 hover:shadow-sm transition"
              >
                <div className="font-medium line-clamp-1">{c.course_title}</div>
                <div className="text-xs text-muted mt-1">Issued {new Date(c.issued_at).toLocaleDateString()}</div>
                <div className="mt-3 inline-flex items-center gap-2 text-sm text-brand">
                  View certificate
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                    <path d="M7 17l7-7m0 0H8m6 0v6" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/** ===== Small UI helpers ===== */
function StatCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-2xl bg-white border border-light p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold">
        {value}
        {suffix ? <span className="text-base font-semibold text-muted"> {suffix}</span> : null}
      </div>
    </div>
  );
}

function EmptyCard({ text, ctaHref, ctaLabel }: { text: string; ctaHref?: string; ctaLabel?: string }) {
  return (
    <div className="mt-3 rounded-2xl border border-light bg-white p-5 text-sm text-muted">
      <div>{text}</div>
      {ctaHref && ctaLabel ? (
        <div className="mt-3">
          <Link href={ctaHref} className="rounded-lg px-3 py-1.5 bg-brand text-white text-sm hover:opacity-90">
            {ctaLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
